import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { analyzeFactoryInputTypes } from "./factory-input-analysis.js";
import type { WorkspaceSourceUsageProgramDescriptor } from "./source-usage.js";

const WORKSPACE_ROOT = "/factory-input-workspace";
const FIXTURE_PATH = `${WORKSPACE_ROOT}/indexing-form.ts`;
const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

const FIXTURE_SOURCE = `
  import type { Observable } from 'rxjs';
  import { Subject } from 'rxjs';

  interface Field { readonly key: string; }
  interface Option<T> { readonly label: string; readonly value: T; }
  type WorkflowState = 'open' | 'closed';
  type ProductOptions = Observable<readonly Option<WorkflowState>[]>;

  class LocalOptionSubject extends Subject<Option<number>> {}

  interface IndexingFormConfigOptions {
    readonly reviewFn: () => boolean;
    readonly productChangeFn: (field: Field) => void;
    readonly productOptionsFn: (field: Field) => ProductOptions;
    readonly loading$: Observable<boolean>;
    readonly subject$: Subject<Option<boolean>>;
    readonly subclass$: LocalOptionSubject;
    readonly union$: Observable<Option<'left'>> | Observable<Option<'right'>>;
    readonly nestedAny$: Observable<{ readonly payload: any }>;
    readonly opaqueUnknown: unknown;
    readonly unsafeAny: any;
    readonly observableLike: { subscribe(next: (value: string) => void): void };
  }

  export function IndexingFormConfig(
    options: IndexingFormConfigOptions,
  ): readonly object[] {
    return [options];
  }
`;

function createProgram(
  source = FIXTURE_SOURCE,
  optionOverrides: Readonly<ts.CompilerOptions> = {},
  additionalSources: Readonly<Record<string, string>> = {}
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
  name = "IndexingFormConfig"
): ts.FunctionDeclaration | ts.ClassDeclaration {
  const sourceFile = program.getSourceFile(FIXTURE_PATH);
  const declaration = sourceFile?.statements.find(
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
  return {
    programId: "application",
    purpose: "application",
    program,
  };
}

describe("analyzeFactoryInputTypes", () => {
  it("normalizes typed options and canonical RxJS emissions without executing the factory", () => {
    const program = createProgram();
    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program),
    });
    const properties = Object.fromEntries(
      analysis.properties.map((property) => [property.key, property])
    );
    const property = (key: string) => {
      const result = properties[key];
      if (result === undefined) throw new Error(`Missing property: ${key}`);
      return result;
    };

    expect(analysis).toMatchObject({
      factorySymbolId:
        "application:indexing-form.ts:IndexingFormConfig:function",
      signatureKind: "call",
      coverage: "incomplete",
    });
    expect(analysis.properties.map(({ key }) => key)).toEqual([
      "loading$",
      "nestedAny$",
      "observableLike",
      "opaqueUnknown",
      "productChangeFn",
      "productOptionsFn",
      "reviewFn",
      "subclass$",
      "subject$",
      "union$",
      "unsafeAny",
    ]);
    const reviewSignature =
      property("reviewFn").expectedType.callSignatures?.[0];
    expect(reviewSignature?.parameters).toEqual([]);
    expect(reviewSignature?.returnType).toMatchObject({ kind: "boolean" });
    const productOptionsObservable =
      property("productOptionsFn").observables[0];
    expect(
      property("productOptionsFn").expectedType.callSignatures?.[0]?.returnType
        .hazards
    ).toEqual([]);
    expect(productOptionsObservable).toMatchObject({
      location: { kind: "call-return", signatureIndex: 0 },
      precision: "exact-type",
      values: { kind: "type-only" },
    });
    expect(productOptionsObservable?.emissionType).toMatchObject({
      display: "readonly Option<WorkflowState>[]",
      kind: "array",
    });
    const loadingObservable = property("loading$").observables[0];
    expect(loadingObservable).toMatchObject({
      location: { kind: "property" },
      precision: "exact-type",
    });
    expect(loadingObservable?.emissionType).toMatchObject({ kind: "boolean" });
    expect(property("subject$").observables[0]?.emissionType.display).toBe(
      "Option<boolean>"
    );
    expect(property("subclass$").observables[0]?.emissionType.display).toBe(
      "Option<number>"
    );
    expect(property("union$").observables[0]?.emissionType).toMatchObject({
      kind: "union",
      members: [
        expect.objectContaining({ display: 'Option<"left">' }),
        expect.objectContaining({ display: 'Option<"right">' }),
      ],
    });
    expect(property("nestedAny$").observables[0]).toMatchObject({
      precision: "contains-any",
      values: { kind: "type-only" },
    });
    expect(property("observableLike").observables).toEqual([]);
    expect(analysis.diagnostics).toEqual([
      {
        code: "FACTORY_INPUT_TYPE_ANY",
        path: "nestedAny$.emission.payload",
        propertyKey: "nestedAny$",
      },
      {
        code: "FACTORY_INPUT_TYPE_UNKNOWN",
        path: "opaqueUnknown",
        propertyKey: "opaqueUnknown",
      },
      {
        code: "FACTORY_INPUT_TYPE_ANY",
        path: "unsafeAny",
        propertyKey: "unsafeAny",
      },
    ]);

    expect(
      analyzeFactoryInputTypes({
        workspaceRoot: WORKSPACE_ROOT,
        descriptor: descriptor(program),
        factoryDeclaration: factoryDeclaration(program),
      })
    ).toEqual(analysis);
  });

  it("refuses a declaration created by a different TypeScript Program", () => {
    const authoritativeProgram = createProgram();
    const foreignProgram = createProgram();

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(authoritativeProgram),
      factoryDeclaration: factoryDeclaration(foreignProgram),
    });

    expect(analysis).toMatchObject({
      coverage: "incomplete",
      diagnostics: [
        {
          code: "FACTORY_INPUT_PROGRAM_MISMATCH",
        },
      ],
      properties: [],
    });
  });

  it("supports a class constructor and keeps type-only Observable evidence", () => {
    const program = createProgram(`
      import type { Observable } from 'rxjs';

      interface OrderOptions {
        readonly mode: 'create' | 'review';
        readonly loading$: Observable<boolean>;
      }

      export class OrderEntryForm {
        readonly fields: readonly object[];
        constructor(options: OrderOptions) {
          this.fields = [options];
        }
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "OrderEntryForm"),
    });

    expect(analysis).toMatchObject({
      factorySymbolId: "application:indexing-form.ts:OrderEntryForm:class",
      signatureKind: "construct",
      coverage: "complete-supported-grammar",
      diagnostics: [],
    });
    expect(analysis.properties.map(({ key }) => key)).toEqual([
      "loading$",
      "mode",
    ]);
    expect(analysis.properties[0]?.observables[0]).toMatchObject({
      emissionType: { kind: "boolean" },
      precision: "exact-type",
      values: { kind: "type-only" },
    });
  });

  it("does not trust a same-spelled Observable mapped to application code", () => {
    const fakeRxjsPath = `${WORKSPACE_ROOT}/fake-rxjs.ts`;
    const program = createProgram(
      `
        import type { Observable } from 'rxjs';

        export function FakeStreamForm(
          options: { readonly values$: Observable<string> },
        ): readonly object[] {
          return [options];
        }
      `,
      {
        baseUrl: WORKSPACE_ROOT,
        paths: { rxjs: ["fake-rxjs.ts"] },
      },
      {
        [fakeRxjsPath]: `
          export interface Observable<T> {
            subscribe(next: (value: T) => void): void;
          }
        `,
      }
    );

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "FakeStreamForm"),
    });

    expect(analysis.compatibility.rxjs).toBe("unavailable");
    expect(analysis.properties[0]?.observables).toEqual([]);
  });

  it("keeps canonical RxJS identity through a workspace barrel", () => {
    const barrelPath = `${WORKSPACE_ROOT}/reactive-types.ts`;
    const program = createProgram(
      `
        import type { Observable } from './reactive-types';

        export function BarrelForm(
          options: { readonly values$: Observable<readonly string[]> },
        ): readonly object[] {
          return [options];
        }
      `,
      {},
      {
        [barrelPath]: `export type { Observable } from 'rxjs';`,
      }
    );

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "BarrelForm"),
    });

    expect(analysis.compatibility.rxjs).toBe("canonical-symbol");
    expect(analysis.properties[0]?.observables[0]).toMatchObject({
      emissionType: { display: "readonly string[]", kind: "array" },
      precision: "exact-type",
      values: { kind: "type-only" },
    });
  });

  it("does not hide unsafe callback parameters behind a typed Observable return", () => {
    const program = createProgram(`
      import type { Observable } from 'rxjs';

      interface SearchOptions {
        readonly search: (query: any) => Observable<readonly string[]>;
      }

      export function SearchForm(options: SearchOptions): readonly object[] {
        return [options];
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "SearchForm"),
    });

    expect(analysis.properties[0]?.observables).toHaveLength(1);
    expect(analysis.coverage).toBe("incomplete");
    expect(analysis.diagnostics).toContainEqual({
      code: "FACTORY_INPUT_TYPE_ANY",
      path: "search.call[0].parameter[0]",
      propertyKey: "search",
    });
  });

  it("fails closed when only part of a union is a canonical Observable", () => {
    const program = createProgram(`
      import type { Observable } from 'rxjs';

      interface NullableStreamOptions {
        readonly values$: Observable<string> | null;
        readonly load: () => Observable<string> | undefined;
      }

      export function NullableStreamForm(
        options: NullableStreamOptions,
      ): readonly object[] {
        return [options];
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "NullableStreamForm"),
    });

    expect(
      analysis.properties.every(({ observables }) => observables.length === 0)
    ).toBe(true);
    expect(analysis.coverage).toBe("incomplete");
    expect(analysis.diagnostics).toEqual([
      {
        code: "FACTORY_OBSERVABLE_TYPE_UNRESOLVED",
        path: "load.call[0].return",
        propertyKey: "load",
      },
      {
        code: "FACTORY_OBSERVABLE_TYPE_UNRESOLVED",
        path: "values$",
        propertyKey: "values$",
      },
    ]);
  });

  it("reports unresolved generic input properties instead of materializing them", () => {
    const program = createProgram(`
      export function GenericForm<T>(options: { readonly value: T }): readonly object[] {
        return [options];
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "GenericForm"),
    });

    expect(analysis.coverage).toBe("incomplete");
    expect(analysis.diagnostics).toContainEqual({
      code: "FACTORY_INPUT_GENERIC_UNRESOLVED",
      path: "value",
      propertyKey: "value",
    });
  });

  it("fails closed for recursive, any, and non-object input boundaries", () => {
    const recursiveProgram = createProgram(`
      interface RecursiveValue { readonly self: RecursiveValue; }
      export function RecursiveForm(
        options: { readonly value: RecursiveValue },
      ): readonly object[] {
        return [options];
      }
    `);
    const recursive = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(recursiveProgram),
      factoryDeclaration: factoryDeclaration(recursiveProgram, "RecursiveForm"),
    });
    expect(recursive.coverage).toBe("incomplete");
    expect(recursive.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FACTORY_INPUT_TYPE_RECURSIVE",
        propertyKey: "value",
      })
    );

    const anyProgram = createProgram(`
      export function AnyInputForm(options: any): readonly object[] {
        return [options];
      }
    `);
    const anyInput = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(anyProgram),
      factoryDeclaration: factoryDeclaration(anyProgram, "AnyInputForm"),
    });
    expect(anyInput).toMatchObject({
      coverage: "incomplete",
      diagnostics: [{ code: "FACTORY_INPUT_TYPE_ANY", path: "$input" }],
      properties: [],
    });

    const scalarProgram = createProgram(`
      export function ScalarInputForm(options: string): readonly object[] {
        void options;
        return [];
      }
    `);
    const scalarInput = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(scalarProgram),
      factoryDeclaration: factoryDeclaration(scalarProgram, "ScalarInputForm"),
    });
    expect(scalarInput).toMatchObject({
      coverage: "incomplete",
      diagnostics: [{ code: "FACTORY_INPUT_SIGNATURE_UNSUPPORTED" }],
      properties: [],
    });
  });

  it("makes bounded-depth truncation explicit", () => {
    const program = createProgram(`
      interface L10 { readonly value: string; }
      interface L9 { readonly next: L10; }
      interface L8 { readonly next: L9; }
      interface L7 { readonly next: L8; }
      interface L6 { readonly next: L7; }
      interface L5 { readonly next: L6; }
      interface L4 { readonly next: L5; }
      interface L3 { readonly next: L4; }
      interface L2 { readonly next: L3; }
      interface L1 { readonly next: L2; }

      export function DeepForm(options: { readonly nested: L1 }): readonly object[] {
        return [options];
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "DeepForm"),
    });

    expect(analysis.coverage).toBe("incomplete");
    expect(analysis.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FACTORY_TYPE_ANALYSIS_TRUNCATED",
        propertyKey: "nested",
      })
    );
  });

  it("caps top-level properties and display strings with explicit truncation", () => {
    const propertyLines = Array.from(
      { length: 65 },
      (_, index) => `readonly p${String(index).padStart(2, "0")}: string;`
    ).join("\n");
    const longLiteral = "x".repeat(300);
    const program = createProgram(`
      interface LargeOptions {
        ${propertyLines}
        readonly longLiteral: '${longLiteral}';
      }

      export function LargeForm(options: LargeOptions): readonly object[] {
        return [options];
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "LargeForm"),
    });

    expect(analysis.properties).toHaveLength(64);
    expect(analysis.coverage).toBe("incomplete");
    expect(analysis.diagnostics).toContainEqual({
      code: "FACTORY_TYPE_ANALYSIS_TRUNCATED",
      path: "$input",
    });

    const literalProgram = createProgram(`
      export function LiteralForm(
        options: { readonly value: '${longLiteral}' },
      ): readonly object[] {
        return [options];
      }
    `);
    const literalAnalysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(literalProgram),
      factoryDeclaration: factoryDeclaration(literalProgram, "LiteralForm"),
    });

    expect(
      literalAnalysis.properties[0]?.expectedType.display.length
    ).toBeLessThanOrEqual(240);
    expect(literalAnalysis.properties[0]?.expectedType.literal).toBeUndefined();
    expect(literalAnalysis.diagnostics).toContainEqual({
      code: "FACTORY_TYPE_ANALYSIS_TRUNCATED",
      path: "value",
      propertyKey: "value",
    });
  });

  it("refuses a factory whose declaration intersects a TypeScript error", () => {
    const program = createProgram(`
      export function BrokenForm(options: { readonly mode: string }): readonly object[] {
        const invalid: number = 'not-a-number';
        return [options, invalid];
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "BrokenForm"),
    });

    expect(analysis).toMatchObject({
      coverage: "incomplete",
      diagnostics: [{ code: "FACTORY_TYPESCRIPT_DIAGNOSTIC" }],
      properties: [],
    });
  });

  it("reports TypeScript errors in the imported options declaration", () => {
    const optionsPath = `${WORKSPACE_ROOT}/options.ts`;
    const program = createProgram(
      `
        import type { BrokenOptions } from './options';

        export function ImportedOptionsForm(
          options: BrokenOptions,
        ): readonly object[] {
          return [options];
        }
      `,
      {},
      {
        [optionsPath]: `
          export interface BrokenOptions {
            readonly missing: MissingApplicationType;
          }
        `,
      }
    );

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "ImportedOptionsForm"),
    });

    expect(analysis.coverage).toBe("incomplete");
    expect(analysis.diagnostics).toContainEqual({
      code: "FACTORY_TYPESCRIPT_DIAGNOSTIC",
      path: "missing",
      propertyKey: "missing",
    });
  });

  it("refuses suppression directives that could hide relevant type errors", () => {
    const program = createProgram(`
      export function SuppressedForm(
        options: { readonly mode: string },
      ): readonly object[] {
        // @ts-ignore intentional fixture
        const invalid: number = 'not-a-number';
        return [options, invalid];
      }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "SuppressedForm"),
    });

    expect(analysis).toMatchObject({
      coverage: "incomplete",
      diagnostics: [{ code: "FACTORY_TYPESCRIPT_SUPPRESSION" }],
      properties: [],
    });
  });

  it("refuses factories outside the one-options-object signature grammar", () => {
    const program = createProgram(`
      export function NoOptionsForm(): readonly object[] { return []; }
    `);

    const analysis = analyzeFactoryInputTypes({
      workspaceRoot: WORKSPACE_ROOT,
      descriptor: descriptor(program),
      factoryDeclaration: factoryDeclaration(program, "NoOptionsForm"),
    });

    expect(analysis).toMatchObject({
      coverage: "incomplete",
      diagnostics: [{ code: "FACTORY_INPUT_SIGNATURE_UNSUPPORTED" }],
      properties: [],
    });
  });
});
