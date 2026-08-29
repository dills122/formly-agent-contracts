import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  FactoryInputScaffoldError,
  generateFactoryInputScaffold,
} from "./factory-input-scaffold.js";
import type { WorkspaceSourceUsageProgramDescriptor } from "./source-usage.js";

const WORKSPACE_ROOT = "/factory-scaffold-workspace";
const FORM_PATH = `${WORKSPACE_ROOT}/libs/forms/indexing-form.ts`;
const DEFINITION_PATH = "libs/forms/contracts/indexing-form.contract.ts";
const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

const FORM_SOURCE = `
  import type { TemplateRef } from '@angular/core';
  import type { Observable } from 'rxjs';

  interface Field { readonly key: string; }
  interface Option { readonly label: string; readonly value: string; }

  export interface IndexingFormOptions {
    readonly mode: 'create' | 'review';
    readonly staticOptions: readonly Option[];
    readonly service: { readonly load: () => readonly string[] };
    readonly reviewFn: () => boolean;
    readonly productChangeFn: (field: Field) => void;
    readonly productOptionsFn: (field: Field) => Observable<readonly Option[]>;
    readonly loading$: Observable<boolean>;
    readonly templateRef: TemplateRef<unknown>;
    readonly unsafeAny: any;
  }

  const privateCustomerLiteral = 'CUSTOMER-4711-DO-NOT-EMIT';

  export function IndexingFormConfig(
    options: IndexingFormOptions,
  ): readonly object[] {
    const filtered = options.staticOptions.filter(Boolean);
    const loaded = options.service.load();
    return [{
      props: {
        filtered,
        loaded,
        loading$: options.loading$,
        header: options.templateRef,
        change: (field: Field) => options.productChangeFn(field),
        privateCustomerLiteral,
      },
      expressions: {
        'props.readonly': () => options.reviewFn(),
        'props.options': (field: Field) => options.productOptionsFn(field),
        'props.mode': () => options.mode,
        'props.unsafe': () => options.unsafeAny,
      },
    }];
  }
`;

function createProgram(
  source = FORM_SOURCE,
  additionalSources: Readonly<Record<string, string>> = {}
): ts.Program {
  const sources = new Map<string, string>([
    [FORM_PATH, source],
    [
      `${WORKSPACE_ROOT}/${DEFINITION_PATH}`,
      "export const INDEXING_FORM_CONTRACT = {};",
    ],
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
      "@formly-contract/compiler": ["packages/compiler/src/index.ts"],
      "@formly-contract/schema": ["packages/schema/src/index.ts"],
      rxjs: ["apps/formly-test-app/node_modules/rxjs/dist/types/index.d.ts"],
    },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    typeRoots: [resolve(REPOSITORY_ROOT, "node_modules/@types")],
    types: ["node"],
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
  return ts.createProgram({
    host,
    options,
    rootNames: [...sources.keys()],
  });
}

function factoryDeclaration(program: ts.Program): ts.FunctionDeclaration {
  const declaration = program
    .getSourceFile(FORM_PATH)
    ?.statements.find(
      (statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === "IndexingFormConfig"
    );
  if (declaration === undefined) {
    throw new Error("Expected the IndexingFormConfig declaration.");
  }
  return declaration;
}

function descriptor(
  program: ts.Program
): WorkspaceSourceUsageProgramDescriptor {
  return { programId: "application", purpose: "application", program };
}

function generate(program = createProgram()) {
  return generateFactoryInputScaffold({
    workspaceRoot: WORKSPACE_ROOT,
    descriptor: descriptor(program),
    factoryDeclaration: factoryDeclaration(program),
    definitionFilePath: DEFINITION_PATH,
    formId: "case.indexing",
    scaffoldName: "IndexingContract",
  });
}

function semanticErrorsForGeneratedModule(
  generatedPath: string,
  generatedCode: string,
  source = FORM_SOURCE
): readonly ts.Diagnostic[] {
  const program = createProgram(source, {
    [`${WORKSPACE_ROOT}/${generatedPath}`]: generatedCode,
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter(({ category }) => category === ts.DiagnosticCategory.Error);
}

describe("generateFactoryInputScaffold", () => {
  it("renders a deterministic typed draft with auto, explicit, and blocked inputs", () => {
    const generated = generate();

    expect(generate()).toEqual(generated);
    expect(generated.suggestedPath).toBe(
      "libs/forms/contracts/indexing-form.contract.factory-input.generated.ts"
    );
    expect(generated.review).toEqual({
      formId: "case.indexing",
      coverage: "incomplete",
      generated: [
        { helper: "inertObservable", key: "loading$" },
        { helper: "capturedCallback", key: "productChangeFn" },
        { helper: "capturedCallback", key: "productOptionsFn" },
        { helper: "capturedCallback", key: "reviewFn" },
        { helper: "unavailableView", key: "templateRef" },
      ],
      explicit: [
        { key: "mode", requirement: "value" },
        { key: "service", requirement: "binding" },
        { key: "staticOptions", requirement: "value" },
      ],
      unsupported: ["unsafeAny"],
      diagnostics: [
        { code: "FACTORY_INPUT_VALUE_REQUIRED", propertyKey: "mode" },
        {
          code: "FACTORY_INPUT_CAPABILITY_UNSUPPORTED",
          propertyKey: "service",
        },
        {
          code: "FACTORY_INPUT_VALUE_REQUIRED",
          propertyKey: "staticOptions",
        },
        {
          code: "FACTORY_INPUT_TYPE_UNKNOWN",
          propertyKey: "templateRef",
        },
        { code: "FACTORY_INPUT_TYPE_ANY", propertyKey: "unsafeAny" },
      ],
    });
    expect(generated.code).toContain(
      'import type { IndexingFormOptions } from "../indexing-form.js";'
    );
    expect(generated.code).toContain('IndexingFormOptions["productOptionsFn"]');
    expect(generated.code).toContain(
      ") satisfies Partial<IndexingFormOptions>;"
    );
    expect(generated.code).not.toContain("CUSTOMER-4711-DO-NOT-EMIT");
    expect(generated.code).not.toContain(WORKSPACE_ROOT);
    expect(generated.code).not.toContain("privateCustomerLiteral");
    expect(generated.code).not.toContain('"unsafeAny": h.');
    for (const property of generated.review.generated) {
      expect(generated.code).toContain(`h.${property.helper}<`);
      expect(generated.code).toContain(
        `IndexingFormOptions[${JSON.stringify(property.key)}]`
      );
    }
  });

  it("produces TypeScript that semantically checks against the real options export", () => {
    const generated = generate();

    expect(
      semanticErrorsForGeneratedModule(
        generated.suggestedPath,
        generated.code
      ).map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      )
    ).toEqual([]);
  });

  it("fails closed when the real options type is not exported", () => {
    const program = createProgram(
      FORM_SOURCE.replace(
        "export interface IndexingFormOptions",
        "interface IndexingFormOptions"
      )
    );

    expect(() => generate(program)).toThrowError(
      expect.objectContaining<Partial<FactoryInputScaffoldError>>({
        code: "FACTORY_INPUT_SCAFFOLD_OPTIONS_TYPE_UNEXPORTED",
      })
    );
  });

  it("keeps optional auto-capability candidates explicit so presence is not invented", () => {
    const program = createProgram(`
      import type { Observable } from 'rxjs';
      export interface IndexingFormOptions {
        readonly optionalChange?: (value: string) => void;
        readonly optionalValues$?: Observable<readonly string[]>;
      }
      export function IndexingFormConfig(
        options: IndexingFormOptions,
      ): readonly object[] {
        return [{
          props: {
            change: options.optionalChange,
            values$: options.optionalValues$,
          },
        }];
      }
    `);

    expect(generate(program).review).toMatchObject({
      generated: [],
      explicit: [
        { key: "optionalChange", requirement: "binding" },
        { key: "optionalValues$", requirement: "binding" },
      ],
      unsupported: [],
    });
  });

  it("keeps a nullable Observable explicit and preserves its exact property type", () => {
    const source = `
      import type { Observable } from 'rxjs';
      export interface IndexingFormOptions {
        readonly values$: Observable<readonly string[]> | null;
      }
      export function IndexingFormConfig(
        options: IndexingFormOptions,
      ): readonly object[] {
        return [{ props: { values$: options.values$ } }];
      }
    `;
    const generated = generate(createProgram(source));

    expect(generated.review).toMatchObject({
      generated: [],
      explicit: [{ key: "values$", requirement: "binding" }],
    });
    expect(
      semanticErrorsForGeneratedModule(
        generated.suggestedPath,
        generated.code,
        source
      ).map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      )
    ).toEqual([]);
  });

  it("refuses non-identifier option keys instead of embedding arbitrary source names", () => {
    const program = createProgram(`
      export interface IndexingFormOptions {
        readonly "not-a-stable-key": string;
      }
      export function IndexingFormConfig(
        options: IndexingFormOptions,
      ): readonly object[] {
        return [{ props: { value: options["not-a-stable-key"] } }];
      }
    `);

    expect(() => generate(program)).toThrowError(
      expect.objectContaining<Partial<FactoryInputScaffoldError>>({
        code: "FACTORY_INPUT_SCAFFOLD_CONTEXT_INVALID",
      })
    );
  });

  it.each([
    { definitionFilePath: "/private/contracts.ts" },
    { definitionFilePath: "../outside/contracts.ts" },
    { definitionFilePath: "C:/private/contracts.ts" },
    { definitionFilePath: "libs/forms/contracts.js" },
    { definitionFilePath: "libs/forms/missing.ts" },
    { formId: "customer id with spaces" },
    { scaffoldName: "not-valid-name!" },
    { scaffoldName: "class" },
  ])("rejects unsafe authoring context %#", (override) => {
    const program = createProgram();

    expect(() =>
      generateFactoryInputScaffold({
        workspaceRoot: WORKSPACE_ROOT,
        descriptor: descriptor(program),
        factoryDeclaration: factoryDeclaration(program),
        definitionFilePath: DEFINITION_PATH,
        formId: "case.indexing",
        scaffoldName: "IndexingContract",
        ...override,
      })
    ).toThrowError(
      expect.objectContaining<Partial<FactoryInputScaffoldError>>({
        code: "FACTORY_INPUT_SCAFFOLD_CONTEXT_INVALID",
      })
    );
  });
});
