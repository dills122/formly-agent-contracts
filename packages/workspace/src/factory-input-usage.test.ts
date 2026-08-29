import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { analyzeFactoryInputUsages } from "./factory-input-usage.js";
import type { WorkspaceSourceUsageProgramDescriptor } from "./source-usage.js";

const WORKSPACE_ROOT = "/factory-usage-workspace";
const FIXTURE_PATH = `${WORKSPACE_ROOT}/form.ts`;
const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

function createProgram(
  source: string,
  additionalSources: Readonly<Record<string, string>> = {},
  optionOverrides: Readonly<ts.CompilerOptions> = {}
): ts.Program {
  const sources = new Map<string, string>([
    [FIXTURE_PATH, source],
    ...Object.entries(additionalSources),
  ]);
  const options: ts.CompilerOptions = {
    baseUrl: REPOSITORY_ROOT,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    paths: {
      "@angular/core": [
        "apps/formly-test-app/node_modules/@angular/core/index.d.ts",
      ],
      rxjs: ["apps/formly-test-app/node_modules/rxjs/dist/types/index.d.ts"],
    },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    ...optionOverrides,
  };
  const host = ts.createCompilerHost(options, true);
  const fallbackFileExists = host.fileExists.bind(host);
  const fallbackReadFile = host.readFile.bind(host);
  const fallbackDirectoryExists = host.directoryExists?.bind(host);
  host.getCurrentDirectory = () => WORKSPACE_ROOT;
  host.fileExists = (fileName) =>
    sources.has(fileName) || fallbackFileExists(fileName);
  host.readFile = (fileName) =>
    sources.get(fileName) ?? fallbackReadFile(fileName);
  host.directoryExists = (directoryName) =>
    [...sources.keys()].some((fileName) =>
      fileName.startsWith(`${directoryName.replace(/\/$/u, "")}/`)
    ) || fallbackDirectoryExists?.(directoryName) === true;
  host.getSourceFile = (fileName, languageVersion, onError) => {
    const virtualSource = sources.get(fileName);
    if (virtualSource !== undefined) {
      return ts.createSourceFile(
        fileName,
        virtualSource,
        languageVersion,
        true
      );
    }
    const contents = fallbackReadFile(fileName);
    if (contents === undefined) {
      onError?.(`Cannot read ${fileName}`);
      return undefined;
    }
    return ts.createSourceFile(fileName, contents, languageVersion, true);
  };
  return ts.createProgram({ host, options, rootNames: [FIXTURE_PATH] });
}

function factoryDeclaration(
  program: ts.Program,
  name: string
): ts.FunctionDeclaration | ts.ClassDeclaration {
  const declaration = program
    .getSourceFile(FIXTURE_PATH)
    ?.statements.find(
      (statement): statement is ts.FunctionDeclaration | ts.ClassDeclaration =>
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement)) &&
        statement.name?.text === name
    );
  if (declaration === undefined) {
    throw new Error(`Expected the ${name} factory declaration.`);
  }
  return declaration;
}

function descriptor(
  program: ts.Program
): WorkspaceSourceUsageProgramDescriptor {
  return { programId: "application", purpose: "application", program };
}

describe("analyzeFactoryInputUsages", () => {
  it("keeps supported direct storage complete while requiring explicit scalar values", () => {
    const program = createProgram(`
      import type { Observable } from 'rxjs';
      interface Options {
        readonly mode: boolean;
        readonly change: (value: string) => void;
        readonly values$: Observable<readonly string[]>;
      }
      export function CompleteForm(options: Options): readonly object[] {
        return [{
          props: {
            change: options.change,
            values$: options.values$,
          },
          expressions: {
            'props.disabled': () => options.mode,
          },
        }];
      }
    `);

    const analysis = analyzeFactoryInputUsages({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "CompleteForm"),
    });

    expect(analysis.coverage).toBe("complete-supported-grammar");
    expect(
      analysis.properties.map(({ key, materialization }) => ({
        key,
        materialization,
      }))
    ).toEqual([
      { key: "change", materialization: "captured-callback" },
      { key: "mode", materialization: "explicit-value-required" },
      { key: "values$", materialization: "inert-observable" },
    ]);
    expect(analysis.diagnostics).toEqual([
      { code: "FACTORY_INPUT_VALUE_REQUIRED", propertyKey: "mode" },
    ]);
    expect(analysis.typeDiagnostics).toEqual([]);
  });

  it("combines Indexing-shaped direct uses with types into a fail-closed binding plan", () => {
    const program = createProgram(`
      import type { TemplateRef } from '@angular/core';
      import type { Observable } from 'rxjs';

      interface Field { readonly key: string; }
      interface Option { readonly label: string; readonly value: string; }
      interface Options {
        readonly mode: 'create' | 'review';
        readonly staticOptions: readonly Option[];
        readonly service: { readonly load: () => readonly string[] };
        readonly reviewFn: () => boolean;
        readonly productChangeFn: (field: Field) => void;
        readonly productOptionsFn: (field: Field) => Observable<readonly Option[]>;
        readonly loading$: Observable<boolean>;
        readonly templateRef: TemplateRef<unknown>;
        readonly reactiveFlag: boolean;
        readonly unusedRequired: string;
        readonly unsafeAny: any;
      }

      export function IndexingFormConfig(options: Options): readonly object[] {
        const label = options.mode === 'review' ? 'Review' : 'Create';
        const filtered = options.staticOptions.filter(Boolean);
        const loaded = options.service.load();
        return [{
          props: {
            label,
            filtered,
            loaded,
            loading$: options.loading$,
            header: options.templateRef,
            change: (field: Field) => options.productChangeFn(field),
          },
          expressions: {
            'props.readonly': () => options.reviewFn(),
            'props.options': (field: Field) => options.productOptionsFn(field),
            'props.reactiveFlag': () => options.reactiveFlag,
            'props.unsafe': () => options.unsafeAny,
          },
        }];
      }
    `);

    const input = {
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "IndexingFormConfig"),
    } as const;
    const analysis = analyzeFactoryInputUsages(input);
    const properties = Object.fromEntries(
      analysis.properties.map((property) => [property.key, property])
    );
    const property = (key: string) => {
      const result = properties[key];
      if (result === undefined) throw new Error(`Missing property: ${key}`);
      return result;
    };

    expect(analysis.coverage).toBe("incomplete");
    expect(property("mode")).toMatchObject({
      materialization: "explicit-value-required",
      uses: [{ kind: "construction-read" }],
    });
    expect(property("staticOptions")).toMatchObject({
      materialization: "explicit-value-required",
      uses: [{ kind: "construction-call" }],
    });
    expect(property("service")).toMatchObject({
      materialization: "explicit-binding-required",
      uses: [{ kind: "construction-call" }],
    });
    expect(property("productChangeFn")).toMatchObject({
      materialization: "captured-callback",
      uses: [
        {
          kind: "inside-stored-function",
          reviewedStorage: true,
          storagePath: "props.change",
        },
      ],
    });
    expect(property("productOptionsFn")).toMatchObject({
      materialization: "captured-callback",
      uses: [
        {
          kind: "inside-stored-function",
          reviewedStorage: true,
          storagePath: 'expressions["props.options"]',
        },
      ],
    });
    expect(property("loading$")).toMatchObject({
      materialization: "inert-observable",
      uses: [
        {
          kind: "direct-escape",
          reviewedStorage: true,
          storagePath: "props.loading$",
        },
      ],
    });
    expect(property("templateRef")).toMatchObject({
      materialization: "unavailable-view",
    });
    expect(property("reactiveFlag")).toMatchObject({
      materialization: "explicit-value-required",
      uses: [expect.objectContaining({ kind: "inside-stored-function" })],
    });
    expect(property("unusedRequired")).toMatchObject({
      materialization: "explicit-value-required",
      uses: [],
    });
    expect(property("unsafeAny").materialization).toBe("unsupported");
    expect(analysis.diagnostics).toContainEqual({
      code: "FACTORY_INPUT_VALUE_REQUIRED",
      propertyKey: "mode",
    });
    expect(analysis.diagnostics).toContainEqual({
      code: "FACTORY_INPUT_CAPABILITY_UNSUPPORTED",
      propertyKey: "service",
    });
    expect(analysis.typeDiagnostics).toContainEqual({
      code: "FACTORY_INPUT_TYPE_ANY",
      path: "unsafeAny",
      propertyKey: "unsafeAny",
    });
    expect(analyzeFactoryInputUsages(input)).toEqual(analysis);
  });

  it("fails closed for aliases, destructuring, computed access, getters, and unknown callback consumers", () => {
    const program = createProgram(`
      interface Options {
        readonly mode: boolean;
        readonly onChange: (value: string) => void;
        readonly search: (value: string) => readonly string[];
      }
      declare function keep<T>(callback: T): T;

      export function AdversarialForm(options: Options): object {
        const { mode } = options;
        const parameterAlias = options;
        let mutableAlias = options;
        mutableAlias = parameterAlias;
        const callbackAlias = options.onChange;
        const key: keyof Options = 'mode';
        const computed = options[key];
        const immediate = (() => options.onChange('now'))();
        const synchronous = ['x'].map((value) => options.onChange(value));
        const unknownConsumer = keep((value: string) => options.search(value));
        const holder = { get value() { return options.mode; } };
        return {
          mode,
          parameterAlias,
          mutableAlias,
          callbackAlias,
          computed,
          immediate,
          synchronous,
          unknownConsumer,
          holder,
          props: { customDriver: (value: string) => options.onChange(value) },
        };
      }
    `);

    const analysis = analyzeFactoryInputUsages({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "AdversarialForm"),
    });

    expect(analysis.coverage).toBe("incomplete");
    expect(analysis.diagnostics).toEqual(
      expect.arrayContaining([
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "computed-access",
        },
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "destructured-parameter",
        },
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "mutable-parameter-alias",
        },
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "parameter-alias",
        },
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          propertyKey: "onChange",
          reason: "property-alias",
        },
        {
          code: "FACTORY_INPUT_STORAGE_UNREVIEWED",
          propertyKey: "onChange",
          storagePath: "props.customDriver",
        },
      ])
    );
    const onChange = analysis.properties.find(({ key }) => key === "onChange");
    const search = analysis.properties.find(({ key }) => key === "search");
    expect(onChange?.materialization).toBe("explicit-binding-required");
    expect(onChange?.uses).toContainEqual({ kind: "construction-call" });
    expect(onChange?.uses).toContainEqual(
      expect.objectContaining({ kind: "inside-stored-function" })
    );
    expect(search).toMatchObject({
      materialization: "explicit-binding-required",
      uses: [expect.objectContaining({ kind: "ambiguous" })],
    });
  });

  it("supports constructor bodies and refuses same-spelled streams and unreviewed callback storage", () => {
    const fakeRxjsPath = `${WORKSPACE_ROOT}/fake-rxjs.ts`;
    const program = createProgram(
      `
        import type { Observable } from 'rxjs';
        interface Options {
          readonly values$: Observable<string>;
          readonly custom: () => string;
        }
        export class OrderForm {
          readonly fields: readonly object[];
          constructor(options: Options) {
            this.fields = [{
              props: {
                values$: options.values$,
                customDriver: () => options.custom(),
              },
            }];
          }
        }
      `,
      {
        [fakeRxjsPath]: `
          export interface Observable<T> {
            subscribe(next: (value: T) => void): void;
          }
        `,
      },
      { baseUrl: WORKSPACE_ROOT, paths: { rxjs: ["fake-rxjs.ts"] } }
    );

    const analysis = analyzeFactoryInputUsages({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "OrderForm"),
    });

    expect(analysis.properties).toEqual([
      expect.objectContaining({
        key: "custom",
        materialization: "explicit-binding-required",
      }),
      expect.objectContaining({
        key: "values$",
        materialization: "explicit-binding-required",
      }),
    ]);
    expect(analysis.diagnostics).toEqual(
      expect.arrayContaining([
        {
          code: "FACTORY_INPUT_STORAGE_UNREVIEWED",
          propertyKey: "custom",
          storagePath: "props.customDriver",
        },
        {
          code: "FACTORY_INPUT_CAPABILITY_UNSUPPORTED",
          propertyKey: "values$",
        },
      ])
    );
  });

  it("refuses a destructured factory parameter instead of matching by property spelling", () => {
    const program = createProgram(`
      export function DestructuredForm(
        { mode }: { readonly mode: boolean },
      ): readonly object[] {
        return [{ props: { disabled: mode } }];
      }
    `);

    const analysis = analyzeFactoryInputUsages({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "DestructuredForm"),
    });

    expect(analysis).toMatchObject({
      coverage: "incomplete",
      properties: [],
      diagnostics: [
        {
          code: "FACTORY_INPUT_USE_AMBIGUOUS",
          reason: "destructured-parameter",
        },
      ],
    });
  });

  it("uses parameter symbol identity instead of matching a shadowed name", () => {
    const program = createProgram(`
      interface Options { readonly change: (value: string) => void; }
      export function ShadowedForm(options: Options): readonly object[] {
        const unrelated = (options: string) => options.length;
        return [{
          props: {
            labelLength: unrelated('label'),
            change: (value: string) => options.change(value),
          },
        }];
      }
    `);

    const analysis = analyzeFactoryInputUsages({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "ShadowedForm"),
    });

    expect(analysis).toMatchObject({
      coverage: "complete-supported-grammar",
      diagnostics: [],
      properties: [
        {
          key: "change",
          materialization: "captured-callback",
          uses: [
            {
              kind: "inside-stored-function",
              reviewedStorage: true,
              storagePath: "props.change",
            },
          ],
        },
      ],
    });
  });

  it("preserves the exact Program refusal without manufacturing a usage diagnosis", () => {
    const authoritativeProgram = createProgram(`
      export function ProgramForm(options: { readonly mode: boolean }): object {
        return { props: { disabled: options.mode } };
      }
    `);
    const foreignProgram = createProgram(`
      export function ProgramForm(options: { readonly mode: boolean }): object {
        return { props: { disabled: options.mode } };
      }
    `);

    const analysis = analyzeFactoryInputUsages({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(authoritativeProgram),
      factoryDeclaration: factoryDeclaration(foreignProgram, "ProgramForm"),
    });

    expect(analysis).toMatchObject({
      coverage: "incomplete",
      diagnostics: [],
      properties: [],
      typeDiagnostics: [{ code: "FACTORY_INPUT_PROGRAM_MISMATCH" }],
    });
  });
});
