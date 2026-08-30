import { createHash } from "node:crypto";
import {
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

import {
  indexWorkspaceSourceUsages,
  runtimeResolutionMatchesTypeScript,
  type IndexWorkspaceSourceUsagesInput,
  type WorkspaceSourceUsageProgramDescriptor,
} from "./source-usage.js";

const WORKSPACE_ROOT = "/source-usage-workspace";
const INDEX_HASH = `sha256:${"a".repeat(64)}` as const;
const CLAIMS_HASH = `sha256:${"b".repeat(64)}` as const;
const SHARED_ONE_HASH = `sha256:${"c".repeat(64)}` as const;
const SHARED_TWO_HASH = `sha256:${"d".repeat(64)}` as const;
const ORDER_HASH = `sha256:${"e".repeat(64)}` as const;
const UNREGISTERED_HASH = `sha256:${"f".repeat(64)}` as const;
const OVERLOADED_HASH = `sha256:${"0".repeat(64)}` as const;
const DEFAULT_INITIALIZER_HASH = `sha256:${"1".repeat(64)}` as const;
const IMPLICIT_REQUIRED_HASH = `sha256:${"2".repeat(64)}` as const;
const IMPLICIT_TUPLE_REST_HASH = `sha256:${"3".repeat(64)}` as const;
const IMPLICIT_GENERIC_TUPLE_REST_HASH = `sha256:${"4".repeat(64)}` as const;
const runtimeResolutionRoots: string[] = [];

afterEach(() => {
  for (const root of runtimeResolutionRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function createRuntimeResolutionFixture(
  specifier: string,
  targetSource?: string,
) {
  const root = mkdtempSync(join(tmpdir(), "formly-source-resolution-"));
  runtimeResolutionRoots.push(root);
  const importerPath = join(root, "importer.ts");
  const targetPath = join(root, "target.ts");
  const importerSource =
    `import { target } from ${JSON.stringify(specifier)};\nexport { target };\n`;
  writeFileSync(
    importerPath,
    importerSource,
  );
  if (targetSource !== undefined) {
    writeFileSync(targetPath, targetSource);
  }
  const program = ts.createProgram({
    rootNames: [importerPath, ...(targetSource === undefined ? [] : [targetPath])],
    options: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const sourceFile = ts.createSourceFile(
    importerPath,
    importerSource,
    ts.ScriptTarget.ES2022,
    true,
  );
  const importDeclaration = sourceFile.statements.find(ts.isImportDeclaration);
  const namedBindings = importDeclaration?.importClause?.namedBindings;
  const declaration =
    namedBindings !== undefined && ts.isNamedImports(namedBindings)
      ? namedBindings.elements[0]
      : undefined;
  if (declaration === undefined) {
    throw new Error("Expected an import declaration fixture.");
  }
  return { declaration, importerPath, program, root, targetPath };
}

const sourceEntries = {
  [`${WORKSPACE_ROOT}/node_modules/@formly-contract/workspace/index.d.ts`]: `
    export interface Definition {
      readonly id: string;
      readonly create: () => { readonly fields: readonly object[] };
      readonly lineage?: {
        readonly rootSymbol:
          | ((...args: never[]) => readonly object[] | { readonly fields: readonly object[] })
          | (abstract new (...args: never[]) => { readonly fields: readonly object[] });
      };
    }
    export interface Source {
      readonly sourceId: string;
      readonly list: () => readonly Definition[];
    }
    export interface Project {
      readonly projectId: string;
      readonly sources?: readonly Source[];
    }
    export declare function defineFormContractDefinition<const T extends Definition>(value: T): T;
    export declare function defineFormContractSource<const T extends Source>(value: T): T;
    export declare function defineFormContractProject<const T extends Project>(value: T): T;
  `,
  [`${WORKSPACE_ROOT}/node_modules/@angular/core/index.d.ts`]: `
    export declare function Component(metadata: object): ClassDecorator;
  `,
  [`${WORKSPACE_ROOT}/libs/forms/src/forms.ts`]: `
    export function createClaimIntakeForm(input: object): readonly object[] {
      return [input];
    }

    export function createSharedForm(input: object): readonly object[] {
      return [input];
    }

    export class OrderEntryForm {
      readonly fields: readonly object[];
      constructor(input: object) { this.fields = [input]; }
    }

    export const createArrowForm = (input: object): readonly object[] => [input];

    export function createOverloadedForm(kind: 'form'): readonly object[];
    export function createOverloadedForm(kind: 'count'): number;
    export function createOverloadedForm(kind: 'labels'): readonly string[];
    export function createOverloadedForm(
      kind: 'form' | 'count' | 'labels',
    ): readonly object[] | readonly string[] | number {
      return kind === 'form' ? [{}] : kind === 'labels' ? ['label'] : 1;
    }

    export function createDefaultInitializerForm(input: object): readonly object[] {
      return [input];
    }

    export function createImplicitRequiredForm(input: object): readonly object[] {
      return [input];
    }

    export function createImplicitTupleRestForm(
      ...args: [input: object]
    ): readonly object[] {
      return args;
    }

    export function createImplicitGenericTupleRestForm<
      T extends [input: object],
    >(...args: T): readonly object[] {
      return args;
    }

    const exportListOnlyForm = (input: object): readonly object[] => [input];
    export { exportListOnlyForm };

    export function incompatibleRoot(): number { return 42; }

    export function createClaimDefinitionAdapter() {
      return { fields: createClaimIntakeForm({ privateSyntheticValue: 'definition-only' }) };
    }

    export function createClaimWrapper() {
      return createClaimIntakeForm({ privateRuntimeValue: 'wrapper-only' });
    }
  `,
  [`${WORKSPACE_ROOT}/libs/forms/src/forms.barrel.ts`]: `
    export {
      OrderEntryForm,
      createArrowForm,
      createClaimDefinitionAdapter,
      createClaimIntakeForm as ClaimFactory,
      createClaimWrapper,
      createDefaultInitializerForm,
      createImplicitRequiredForm,
      createImplicitGenericTupleRestForm,
      createImplicitTupleRestForm,
      createOverloadedForm,
      createSharedForm,
      exportListOnlyForm,
      incompatibleRoot,
    } from './forms';
  `,
  [`${WORKSPACE_ROOT}/libs/forms/src/catalog.ts`]: `
    import {
      defineFormContractDefinition as defineForm,
      defineFormContractSource as defineSource,
    } from '@formly-contract/workspace';
    import {
      OrderEntryForm,
      createArrowForm,
      createClaimDefinitionAdapter,
      createClaimIntakeForm,
      createDefaultInitializerForm,
      createImplicitRequiredForm,
      createImplicitGenericTupleRestForm,
      createImplicitTupleRestForm,
      createOverloadedForm,
      createSharedForm,
      exportListOnlyForm,
      incompatibleRoot,
    } from './forms';

    export const claimsDefinition = defineForm({
      id: 'claims.intake',
      create: createClaimDefinitionAdapter,
      lineage: { rootSymbol: createClaimIntakeForm },
    });

    export const source = defineSource({
      sourceId: 'forms',
      list: () => [
        claimsDefinition,
        defineForm({
          id: 'shared.one',
          create: () => ({ fields: createSharedForm({ synthetic: 'one' }) }),
          lineage: { rootSymbol: createSharedForm },
        }),
        defineForm({
          id: 'shared.two',
          create: () => ({ fields: createSharedForm({ synthetic: 'two' }) }),
          lineage: { rootSymbol: createSharedForm },
        }),
        defineForm({
          id: 'orders.entry',
          create: () => new OrderEntryForm({ synthetic: 'order' }),
          lineage: { rootSymbol: OrderEntryForm },
        }),
        defineForm({
          id: 'arrow.form',
          create: () => ({ fields: createArrowForm({ synthetic: 'arrow' }) }),
          lineage: { rootSymbol: createArrowForm },
        }),
        defineForm({
          id: 'overloaded.form',
          create: () => ({ fields: createOverloadedForm('form') }),
          lineage: { rootSymbol: createOverloadedForm },
        }),
        defineForm({
          id: 'default-initializer.form',
          create: (((
            fields = createDefaultInitializerForm({ defaultInitializerOnly: true })
          ) => ({ fields })) as () => { readonly fields: readonly object[] }),
          lineage: { rootSymbol: createDefaultInitializerForm },
        }),
        defineForm({
          id: 'implicit.required',
          create: createImplicitRequiredForm,
        }),
        defineForm({
          id: 'implicit.tuple-rest',
          create: createImplicitTupleRestForm,
        }),
        defineForm({
          id: 'implicit.generic-tuple-rest',
          create: createImplicitGenericTupleRestForm,
        }),
        defineForm({
          id: 'unsupported.unanchored',
          create: () => ({
            fields: createClaimIntakeForm({ unanchoredDefinitionOnly: true }),
          }),
        }),
        defineForm({
          ...{ id: 'unsupported.spread' },
          create: () => ({
            fields: createClaimIntakeForm({ spreadDefinitionOnly: true }),
          }),
        }),
        defineForm({
          id: 'unsupported.export-list',
          create: () => ({ fields: exportListOnlyForm({}) }),
          lineage: { rootSymbol: exportListOnlyForm },
        }),
        defineForm({
          id: 'unsupported.incompatible',
          create: () => ({ fields: [] }),
          lineage: { rootSymbol: incompatibleRoot },
        }),
      ],
    });
  `,
  [`${WORKSPACE_ROOT}/libs/forms/formly-contracts.project.ts`]: `
    import { defineFormContractProject } from '@formly-contract/workspace';
    import { source } from './src/catalog';

    export default defineFormContractProject({
      projectId: 'forms-lib',
      sources: [source],
    });
  `,
  [`${WORKSPACE_ROOT}/apps/claims/src/fake-angular.ts`]: `
    export function Component(metadata: object): ClassDecorator {
      return () => void metadata;
    }
  `,
  [`${WORKSPACE_ROOT}/apps/claims/formly-contracts.project.ts`]: `
    import { defineFormContractProject } from '@formly-contract/workspace';

    export default defineFormContractProject({ projectId: 'claims-app' });
  `,
  [`${WORKSPACE_ROOT}/apps/claims/src/page.ts`]: `
    import { Component as NgComponent } from '@angular/core';
    import {
      ClaimFactory as LocalClaimFactory,
      OrderEntryForm as LocalOrderEntryForm,
      createClaimWrapper,
      createSharedForm,
    } from '../../../libs/forms/src/forms.barrel';
    import * as Forms from '../../../libs/forms/src/forms.barrel';

    declare const condition: boolean;

    @NgComponent({})
    export class ClaimPageComponent {
      readonly form = LocalClaimFactory({ secretArgument: 'must-not-escape' });
      readonly namespaceForm = Forms.ClaimFactory({ otherSecret: 'also-private' });
      readonly shared = createSharedForm({});
      readonly order = new LocalOrderEntryForm({});
      readonly wrapper = createClaimWrapper();
      readonly optional = LocalClaimFactory?.({});
      readonly computed = Forms['ClaimFactory']({});
      readonly dynamic = (condition ? LocalClaimFactory : createSharedForm)({});
    }
  `,
  [`${WORKSPACE_ROOT}/apps/claims/src/fake-page.ts`]: `
    import { Component } from './fake-angular';
    import { ClaimFactory } from '../../../libs/forms/src/forms.barrel';

    @Component({})
    export class FakePageComponent {
      readonly form = ClaimFactory({});
    }
  `,
  [`${WORKSPACE_ROOT}/apps/claims/src/overloads.ts`]: `
    import { createOverloadedForm } from '../../../libs/forms/src/forms';

    export const form = createOverloadedForm('form');
    export const count = createOverloadedForm('count');
    export const labels = createOverloadedForm('labels');
  `,
  [`${WORKSPACE_ROOT}/apps/claims/src/implicit-required.ts`]: `
    import {
      createImplicitRequiredForm,
      createImplicitGenericTupleRestForm,
      createImplicitTupleRestForm,
    } from '../../../libs/forms/src/forms';

    export const form = createImplicitRequiredForm({ application: true });
    export const tupleRestForm = createImplicitTupleRestForm({ application: true });
    export const genericTupleRestForm = createImplicitGenericTupleRestForm({ application: true });
  `,
} as const;

function createVirtualProgram(
  entries: Readonly<Record<string, string>> = sourceEntries,
  rootNames: readonly string[] = Object.keys(entries),
  optionOverrides: Readonly<ts.CompilerOptions> = {}
): ts.Program {
  const sources = new Map(Object.entries(entries));
  const virtualSource = (fileName: string): string | undefined =>
    sources.get(fileName) ??
    sources.get(
      fileName.startsWith("/") ? fileName : `${WORKSPACE_ROOT}/${fileName}`
    );
  const options: ts.CompilerOptions = {
    experimentalDecorators: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
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
    virtualSource(fileName) !== undefined || fallbackFileExists(fileName);
  host.readFile = (fileName) =>
    virtualSource(fileName) ?? fallbackReadFile(fileName);
  host.directoryExists = (directoryName) =>
    directoryName === WORKSPACE_ROOT ||
    directoryName === "." ||
    [...sources.keys()].some((fileName) =>
      fileName.startsWith(
        `${
          directoryName.startsWith("/")
            ? directoryName
            : `${WORKSPACE_ROOT}/${directoryName}`
        }/`
      )
    ) ||
    fallbackDirectoryExists?.(directoryName) === true;
  host.getSourceFile = (fileName, languageVersion, onError) => {
    const source = virtualSource(fileName);
    if (source !== undefined) {
      return ts.createSourceFile(fileName, source, languageVersion, true);
    }
    const fallback = fallbackReadFile(fileName);
    if (fallback === undefined) {
      onError?.(`Cannot read ${fileName}`);
      return undefined;
    }
    return ts.createSourceFile(fileName, fallback, languageVersion, true);
  };
  return ts.createProgram({
    rootNames: [...rootNames],
    options,
    host,
  });
}

function selectSources(
  paths: readonly (keyof typeof sourceEntries)[]
): Readonly<Record<string, string>> {
  return Object.fromEntries(paths.map((path) => [path, sourceEntries[path]]));
}

function input(
  overrides: Partial<IndexWorkspaceSourceUsagesInput> = {}
): IndexWorkspaceSourceUsagesInput {
  return {
    workspaceRoot: WORKSPACE_ROOT,
    workspaceIndex: {
      schemaVersion: "0.2.0",
      contentHash: INDEX_HASH,
    },
    projects: [
      {
        projectId: "claims-app",
        projectRoot: "apps/claims",
        projectConfigPath: "apps/claims/formly-contracts.project.ts",
      },
      {
        projectId: "forms-lib",
        projectRoot: "libs/forms",
        projectConfigPath: "libs/forms/formly-contracts.project.ts",
      },
    ],
    programs: [
      {
        programId: "claims.application",
        purpose: "application",
        program: createVirtualProgram(),
      },
    ],
    indexedForms: [
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "claims.intake",
        contractHash: CLAIMS_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "shared.one",
        contractHash: SHARED_ONE_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "shared.two",
        contractHash: SHARED_TWO_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "orders.entry",
        contractHash: ORDER_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "unregistered.form",
        contractHash: UNREGISTERED_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "overloaded.form",
        contractHash: OVERLOADED_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "default-initializer.form",
        contractHash: DEFAULT_INITIALIZER_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "implicit.required",
        contractHash: IMPLICIT_REQUIRED_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "implicit.tuple-rest",
        contractHash: IMPLICIT_TUPLE_REST_HASH,
      },
      {
        projectId: "forms-lib",
        sourceId: "forms",
        formId: "implicit.generic-tuple-rest",
        contractHash: IMPLICIT_GENERIC_TUPLE_REST_HASH,
      },
    ],
    readSourceFile: (fileName) => {
      const source = sourceEntries[fileName as keyof typeof sourceEntries];
      if (source === undefined) {
        throw new Error(`Unexpected source read: ${fileName}`);
      }
      return Buffer.from(source);
    },
    ...overrides,
  };
}

function pageUsages(result: ReturnType<typeof indexWorkspaceSourceUsages>) {
  return result.catalog.usages.filter(
    ({ invocation }) =>
      invocation.location.kind === "path" &&
      invocation.location.path === "apps/claims/src/page.ts"
  );
}

describe("runtimeResolutionMatchesTypeScript", () => {
  it("accepts an exact runtime and TypeScript module-resolution match", () => {
    const fixture = createRuntimeResolutionFixture(
      "./target",
      "export const target = true;\n",
    );
    const calls: [string, string][] = [];

    expect(
      runtimeResolutionMatchesTypeScript(
        {
          programId: "runtime-parity",
          purpose: "tooling",
          program: fixture.program,
          resolveRuntimeModule: (specifier, importerPath) => {
            calls.push([specifier, importerPath]);
            return realpathSync(fixture.targetPath);
          },
        },
        fixture.declaration,
      ),
    ).toBe(true);
    expect(calls).toEqual([["./target", fixture.importerPath]]);
  });

  it("rejects a runtime resolver that points at a different module", () => {
    const fixture = createRuntimeResolutionFixture(
      "./target",
      "export const target = true;\n",
    );

    expect(
      runtimeResolutionMatchesTypeScript(
        {
          programId: "runtime-mismatch",
          purpose: "tooling",
          program: fixture.program,
          resolveRuntimeModule: () => realpathSync(fixture.importerPath),
        },
        fixture.declaration,
      ),
    ).toBe(false);
  });

  it("fails closed before consulting runtime resolution when TypeScript cannot resolve the import", () => {
    const fixture = createRuntimeResolutionFixture("./missing");
    let resolverCalls = 0;

    expect(
      runtimeResolutionMatchesTypeScript(
        {
          programId: "runtime-unresolved",
          purpose: "tooling",
          program: fixture.program,
          resolveRuntimeModule: () => {
            resolverCalls += 1;
            return fixture.importerPath;
          },
        },
        fixture.declaration,
      ),
    ).toBe(false);
    expect(resolverCalls).toBe(0);
  });

  it("fails closed when the runtime resolver throws", () => {
    const fixture = createRuntimeResolutionFixture(
      "./target",
      "export const target = true;\n",
    );

    expect(
      runtimeResolutionMatchesTypeScript(
        {
          programId: "runtime-error",
          purpose: "tooling",
          program: fixture.program,
          resolveRuntimeModule: () => {
            throw new Error("runtime resolution failed");
          },
        },
        fixture.declaration,
      ),
    ).toBe(false);
  });

  it("does not ask the runtime loader to resolve the workspace helper package", () => {
    const fixture = createRuntimeResolutionFixture(
      "@formly-contract/workspace",
    );

    expect(
      runtimeResolutionMatchesTypeScript(
        {
          programId: "workspace-helper",
          purpose: "tooling",
          program: fixture.program,
          resolveRuntimeModule: () => {
            throw new Error("workspace helper resolution must be bypassed");
          },
        },
        fixture.declaration,
      ),
    ).toBe(true);
  });
});

describe("indexWorkspaceSourceUsages", () => {
  it("reports one application-program factory target through the existing definition lineage", () => {
    const targets: Parameters<
      NonNullable<IndexWorkspaceSourceUsagesInput["onFactoryInputAuthoringTarget"]>
    >[0][] = [];
    const configured = input();

    indexWorkspaceSourceUsages({
      ...configured,
      onFactoryInputAuthoringTarget: (target) => void targets.push(target),
    });

    const claim = targets.find(({ formId }) => formId === "claims.intake");
    expect(claim).toMatchObject({
      projectId: "forms-lib",
      sourceId: "forms",
      formId: "claims.intake",
      definitionFilePath: "libs/forms/src/catalog.ts",
      factorySymbol: "createClaimIntakeForm",
    });
    expect(claim?.descriptor).toBe(configured.programs[0]);
    expect(claim?.factoryDeclaration.getSourceFile().fileName).toBe(
      `${WORKSPACE_ROOT}/libs/forms/src/forms.ts`,
    );
  });

  it("does not choose a tooling-only or overlapping application Program for authoring", () => {
    const program = createVirtualProgram();
    const toolingTargets: unknown[] = [];
    const overlappingTargets: unknown[] = [];

    const tooling = indexWorkspaceSourceUsages(
      input({
        programs: [{ programId: "claims.tooling", purpose: "tooling", program }],
        onFactoryInputAuthoringTarget: (target) =>
          void toolingTargets.push(target),
      }),
    );
    const overlapping = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application.a",
            purpose: "application",
            program,
          },
          {
            programId: "claims.application.b",
            purpose: "application",
            program,
          },
        ],
        onFactoryInputAuthoringTarget: (target) =>
          void overlappingTargets.push(target),
      }),
    );

    expect(toolingTargets).toEqual([]);
    expect(overlappingTargets).toEqual([]);
    expect(tooling.factoryInputAuthoringDiagnostics).toContainEqual({
      code: "APPLICATION_PROGRAM_UNAVAILABLE",
      formId: "claims.intake",
      projectId: "forms-lib",
    });
    expect(overlapping.factoryInputAuthoringDiagnostics).toContainEqual({
      code: "APPLICATION_PROGRAM_AMBIGUOUS",
      formId: "claims.intake",
      projectId: "forms-lib",
    });
  });

  it("links direct aliases, barrels, namespace calls, and constructors to exact indexed contract hashes", () => {
    const result = indexWorkspaceSourceUsages(input());
    const usages = pageUsages(result);
    const exactForms = usages.flatMap((usage) =>
      usage.resolution.status === "exact"
        ? [{ usage, form: usage.resolution.candidate.form }]
        : []
    );

    expect(
      exactForms
        .map(({ form }) => [form.formId, form.contractHash])
        .sort(([left], [right]) =>
          left! < right! ? -1 : left! > right! ? 1 : 0
        )
    ).toEqual([
      ["claims.intake", CLAIMS_HASH],
      ["claims.intake", CLAIMS_HASH],
      ["orders.entry", ORDER_HASH],
    ]);
    expect(
      exactForms.map(({ usage }) => usage.invocation.symbol.id).sort()
    ).toEqual([
      "OrderEntryForm",
      "createClaimIntakeForm",
      "createClaimIntakeForm",
    ]);
    expect(result.catalog.workspaceIndex).toEqual(input().workspaceIndex);
    expect(result.catalog.coverage).toMatchObject({
      status: "incomplete",
      reasons: ["bounded-programs-mvp"],
      scope: {
        includedPurposes: ["application"],
        projectIds: ["claims-app", "forms-lib"],
      },
    });
  });

  it("allows only the canonical helper package export chain to live outside a nested consumer workspace", () => {
    const helperPath = `${WORKSPACE_ROOT}/node_modules/@formly-contract/workspace/index.d.ts`;
    const externalHelperIndex = "/canonical-workspace-package/index.d.ts";
    const externalHelperDeclarations =
      "/canonical-workspace-package/helpers.d.ts";
    const entries: Record<string, string> = {
      ...sourceEntries,
      [externalHelperIndex]: "export * from './helpers';\n",
      [externalHelperDeclarations]: sourceEntries[helperPath],
    };
    delete entries[helperPath];
    const program = createVirtualProgram(entries, Object.keys(entries), {
      baseUrl: WORKSPACE_ROOT,
      paths: {
        "@formly-contract/workspace": [externalHelperIndex],
      },
    });
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program,
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName];
          if (source === undefined) {
            throw new Error(`Unexpected source read: ${fileName}`);
          }
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).filter(
        ({ resolution }) => resolution.status === "exact"
      )
    ).toHaveLength(3);
    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "SOURCE_DESCRIPTOR_UNSUPPORTED" })
    );
  });

  it("rejects an unrelated out-of-workspace alias in front of the canonical helper package", () => {
    const helperPath = `${WORKSPACE_ROOT}/node_modules/@formly-contract/workspace/index.d.ts`;
    const externalHelperIndex = "/canonical-workspace-package/index.d.ts";
    const externalHelperDeclarations =
      "/canonical-workspace-package/helpers.d.ts";
    const externalAlias = "/unrelated-project-helper/index.d.ts";
    const formsProjectPath = `${WORKSPACE_ROOT}/libs/forms/formly-contracts.project.ts`;
    const entries: Record<string, string> = {
      ...sourceEntries,
      [externalHelperIndex]: "export * from './helpers';\n",
      [externalHelperDeclarations]: sourceEntries[helperPath],
      [externalAlias]:
        "export { defineFormContractProject } from '@formly-contract/workspace';\n",
      [formsProjectPath]: sourceEntries[formsProjectPath].replace(
        "from '@formly-contract/workspace'",
        "from 'unrelated-project-helper'"
      ),
    };
    delete entries[helperPath];
    const program = createVirtualProgram(entries, Object.keys(entries), {
      baseUrl: WORKSPACE_ROOT,
      paths: {
        "@formly-contract/workspace": [externalHelperIndex],
        "unrelated-project-helper": [externalAlias],
      },
    });
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program,
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName];
          if (source === undefined) {
            throw new Error(`Unexpected source read: ${fileName}`);
          }
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "SOURCE_DESCRIPTOR_UNSUPPORTED",
        projectId: "forms-lib",
      })
    );
  });

  it("emits an ambiguous non-actionable resolution when one root backs two form IDs", () => {
    const result = indexWorkspaceSourceUsages(input());
    const usage = pageUsages(result).find(
      ({ resolution }) => resolution.status === "ambiguous"
    );

    expect(usage?.resolution).toMatchObject({
      status: "ambiguous",
      candidates: [
        { form: { formId: "shared.one", contractHash: SHARED_ONE_HASH } },
        { form: { formId: "shared.two", contractHash: SHARED_TWO_HASH } },
      ],
    });
  });

  it("excludes definition creation and fails closed for wrappers, optional calls, computed access, and dynamic aliases", () => {
    const result = indexWorkspaceSourceUsages(input());
    const page = pageUsages(result);

    expect(page).toHaveLength(4);
    expect(
      result.catalog.usages.some(
        ({ invocation }) =>
          invocation.location.kind === "path" &&
          invocation.location.path === "libs/forms/src/catalog.ts"
      )
    ).toBe(false);
    expect(
      result.diagnostics.filter(
        ({ code, location }) =>
          code === "SOURCE_USAGE_UNSUPPORTED" &&
          location?.path === "apps/claims/src/page.ts"
      )
    ).toHaveLength(2);
  });

  it("excludes root calls from default parameter initializers anywhere inside an inline create callback", () => {
    const result = indexWorkspaceSourceUsages(input());

    expect(
      result.catalog.usages.some(
        ({ invocation }) =>
          invocation.location.kind === "path" &&
          invocation.location.path === "libs/forms/src/catalog.ts"
      )
    ).toBe(false);
  });

  it("validates the resolved overload signature before emitting an exact usage", () => {
    const result = indexWorkspaceSourceUsages(input());
    const usages = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        invocation.location.path === "apps/claims/src/overloads.ts"
    );

    expect(usages).toHaveLength(1);
    expect(usages[0]?.resolution).toMatchObject({
      status: "exact",
      candidate: {
        form: {
          formId: "overloaded.form",
          contractHash: OVERLOADED_HASH,
        },
      },
    });
    expect(
      result.diagnostics.some(
        ({ code, location }) =>
          code === "SOURCE_USAGE_UNSUPPORTED" &&
          location?.path === "apps/claims/src/overloads.ts"
      )
    ).toBe(true);
  });

  it("fails closed only at TypeScript-invalid root invocations", () => {
    const invalidInvocationPath =
      `${WORKSPACE_ROOT}/apps/claims/src/invalid-invocations.ts` as const;
    const entries = {
      ...sourceEntries,
      [invalidInvocationPath]: `
        import { createClaimIntakeForm } from '../../../libs/forms/src/forms';

        export const valid = createClaimIntakeForm({ valid: true });
        export const wrongType = createClaimIntakeForm('not-an-object');
        export const wrongArity = createClaimIntakeForm();
        export const invalidConstructor = new createClaimIntakeForm({});
        export const unrelatedTypeError: number = 'not-a-number';
      `,
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries, Object.keys(entries), {
              noImplicitAny: false,
              strict: false,
            }),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );
    const usages = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        invocation.location.path === "apps/claims/src/invalid-invocations.ts"
    );
    const unsupported = result.diagnostics.filter(
      ({ code, location }) =>
        code === "SOURCE_USAGE_UNSUPPORTED" &&
        location?.path === "apps/claims/src/invalid-invocations.ts"
    );

    expect(usages).toHaveLength(1);
    expect(usages[0]?.invocation.syntaxKind).toBe("call");
    expect(usages[0]?.invocation.syntaxToken.argumentCount).toBe(1);
    expect(usages[0]?.invocation.location).toMatchObject({
      kind: "path",
      span: { start: { line: 4 } },
    });
    expect(unsupported).toHaveLength(3);
    expect(
      unsupported.map(({ location }) => location?.span.start.line)
    ).toEqual([5, 6, 7]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("not-an-object");
    expect(serialized).not.toContain("not-a-number");
  });

  it("never treats unchecked JavaScript-family callsites as exact usages", () => {
    const uncheckedSources = [
      "apps/claims/src/unchecked.js",
      "apps/claims/src/unchecked.jsx",
      "apps/claims/src/unchecked.mjs",
      "apps/claims/src/unchecked.cjs",
    ] as const;
    const entries: Record<string, string> = { ...sourceEntries };
    for (const relativePath of uncheckedSources) {
      entries[`${WORKSPACE_ROOT}/${relativePath}`] = `
        import { createClaimIntakeForm } from '../../../libs/forms/src/forms';
        export const unchecked = createClaimIntakeForm('private-js-value');
      `;
    }
    entries[`${WORKSPACE_ROOT}/apps/claims/src/ordinary-valid.ts`] = `
      import { createClaimIntakeForm } from '../../../libs/forms/src/forms';
      export const valid = createClaimIntakeForm({ valid: true });
    `;
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries, Object.keys(entries), {
              allowJs: true,
              checkJs: false,
            }),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );
    const uncheckedPaths = new Set(uncheckedSources);
    const uncheckedUsages = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        uncheckedPaths.has(
          invocation.location.path as typeof uncheckedSources[number]
        )
    );
    const unsupported = result.diagnostics.filter(
      ({ code, location }) =>
        code === "SOURCE_USAGE_UNSUPPORTED" &&
        location !== undefined &&
        uncheckedPaths.has(location.path as typeof uncheckedSources[number])
    );
    const validUsages = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        invocation.location.path === "apps/claims/src/ordinary-valid.ts"
    );

    expect(uncheckedUsages).toEqual([]);
    expect(unsupported).toHaveLength(4);
    expect(validUsages).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("private-js-value");
  });

  it("fails closed for actual TypeScript suppression comments without matching string literals", () => {
    const suppressedSources = [
      "apps/claims/src/nocheck.ts",
      "apps/claims/src/ignore.ts",
      "apps/claims/src/expect-error.ts",
    ] as const;
    const entries: Record<string, string> = {
      ...sourceEntries,
      [`${WORKSPACE_ROOT}/apps/claims/src/nocheck.ts`]: `
        // @ts-nocheck private-nocheck-comment
        import { createClaimIntakeForm } from '../../../libs/forms/src/forms';
        export const unchecked = createClaimIntakeForm();
      `,
      [`${WORKSPACE_ROOT}/apps/claims/src/ignore.ts`]: `
        import { createClaimIntakeForm } from '../../../libs/forms/src/forms';
        // @ts-ignore private-ignore-comment
        export const ignored = createClaimIntakeForm();
      `,
      [`${WORKSPACE_ROOT}/apps/claims/src/expect-error.ts`]: `
        import { createClaimIntakeForm } from '../../../libs/forms/src/forms';
        // @ts-expect-error private-expect-error-comment
        export const expected = createClaimIntakeForm();
      `,
      [`${WORKSPACE_ROOT}/apps/claims/src/directive-string.ts`]: `
        import { createClaimIntakeForm } from '../../../libs/forms/src/forms';
        export const harmlessText = '@ts-nocheck private-string-value';
        export const valid = createClaimIntakeForm({ valid: true });
      `,
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );
    const suppressedPaths = new Set(suppressedSources);
    const suppressedUsages = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        suppressedPaths.has(
          invocation.location.path as typeof suppressedSources[number]
        )
    );
    const unsupported = result.diagnostics.filter(
      ({ code, location }) =>
        code === "SOURCE_USAGE_UNSUPPORTED" &&
        location !== undefined &&
        suppressedPaths.has(location.path as typeof suppressedSources[number])
    );
    const stringLiteralUsages = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        invocation.location.path === "apps/claims/src/directive-string.ts"
    );

    expect(suppressedUsages).toEqual([]);
    expect(unsupported).toHaveLength(3);
    expect(stringLiteralUsages).toHaveLength(1);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("private-nocheck-comment");
    expect(serialized).not.toContain("private-ignore-comment");
    expect(serialized).not.toContain("private-expect-error-comment");
    expect(serialized).not.toContain("private-string-value");
  });

  it("does not bind an indexed runtime form to a helper definition that its matching source list does not return", () => {
    const catalogPath = `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
    const entries = {
      ...sourceEntries,
      [catalogPath]: sourceEntries[catalogPath].replace(
        "claimsDefinition,",
        `{
          id: 'claims.intake',
          create: createClaimDefinitionAdapter,
          lineage: { rootSymbol: createClaimIntakeForm },
        },`
      ),
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_DEFINITION_MISSING",
        projectId: "forms-lib",
        formId: "claims.intake",
      })
    );
  });

  it("requires the proven source-list ID to match the indexed runtime source ID", () => {
    const base = input();
    const result = indexWorkspaceSourceUsages({
      ...base,
      indexedForms: base.indexedForms.map((form) =>
        form.formId === "claims.intake"
          ? { ...form, sourceId: "other/forms" }
          : form
      ),
    });

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_DEFINITION_MISSING",
        projectId: "forms-lib",
        formId: "claims.intake",
      })
    );
  });

  it("binds definitions only through the exact source descriptor registered by the project config", () => {
    const catalogPath = `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
    const entries = {
      ...sourceEntries,
      [catalogPath]: `${sourceEntries[catalogPath].replace(
        "claimsDefinition,",
        ""
      )}

        export const replacementSource = defineSource({
          sourceId: 'forms',
          list: () => [claimsDefinition],
        });
      `,
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_DEFINITION_MISSING",
        projectId: "forms-lib",
        formId: "claims.intake",
      })
    );
  });

  it("fails closed when two registered descriptors claim the same project source ID", () => {
    const catalogPath = `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
    const projectConfigPath =
      `${WORKSPACE_ROOT}/libs/forms/formly-contracts.project.ts` as const;
    const entries = {
      ...sourceEntries,
      [catalogPath]: `${sourceEntries[catalogPath]}

        export const replacementSource = defineSource({
          sourceId: 'forms',
          list: () => [claimsDefinition],
        });
      `,
      [projectConfigPath]: sourceEntries[projectConfigPath]
        .replace(
          "import { source } from './src/catalog';",
          "import { replacementSource, source } from './src/catalog';"
        )
        .replace("sources: [source]", "sources: [source, replacementSource]"),
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "SOURCE_DESCRIPTOR_CONFLICT",
        projectId: "forms-lib",
      })
    );
  });

  it("diagnoses a non-direct configured source reference and emits no exact links for it", () => {
    const projectConfigPath =
      `${WORKSPACE_ROOT}/libs/forms/formly-contracts.project.ts` as const;
    const entries = {
      ...sourceEntries,
      [projectConfigPath]: sourceEntries[projectConfigPath]
        .replace("import { source }", "import { source as selectedSource }")
        .replace(
          "export default defineFormContractProject",
          "declare const condition: boolean;\nexport default defineFormContractProject"
        )
        .replace(
          "sources: [source]",
          "sources: [condition ? selectedSource : selectedSource]"
        ),
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).some(({ resolution }) => resolution.status === "exact")
    ).toBe(false);
    expect(
      result.diagnostics.some(
        ({ code, projectId, location }) =>
          code === "SOURCE_DESCRIPTOR_UNSUPPORTED" &&
          projectId === "forms-lib" &&
          location?.path === "libs/forms/formly-contracts.project.ts"
      )
    ).toBe(true);
  });

  it.each(["project sources", "source list"] as const)(
    "invalidates the whole registered %s when any array element is a spread",
    (arrayKind) => {
      const catalogPath =
        `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
      const projectConfigPath =
        `${WORKSPACE_ROOT}/libs/forms/formly-contracts.project.ts` as const;
      const entries = {
        ...sourceEntries,
        [catalogPath]:
          arrayKind === "source list"
            ? sourceEntries[catalogPath].replace(
                "list: () => [",
                "list: () => [...[],"
              )
            : sourceEntries[catalogPath],
        [projectConfigPath]:
          arrayKind === "project sources"
            ? sourceEntries[projectConfigPath].replace(
                "sources: [source]",
                "sources: [source, ...[]]"
              )
            : sourceEntries[projectConfigPath],
      };
      const result = indexWorkspaceSourceUsages(
        input({
          programs: [
            {
              programId: "claims.application",
              purpose: "application",
              program: createVirtualProgram(entries),
            },
          ],
          readSourceFile: (fileName) => {
            const source = entries[fileName as keyof typeof entries];
            if (source === undefined) {
              throw new Error(`Unexpected source read: ${fileName}`);
            }
            return Buffer.from(source);
          },
        })
      );

      expect(
        pageUsages(result).some(
          ({ resolution }) =>
            resolution.status === "exact" &&
            resolution.candidate.form.formId === "claims.intake"
        )
      ).toBe(false);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "SOURCE_DESCRIPTOR_UNSUPPORTED",
          projectId: "forms-lib",
        })
      );
    }
  );

  it.each(["let", "var"] as const)(
    "fails closed for a reassigned %s reference to a helper-created definition",
    (bindingKind) => {
      const catalogPath =
        `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
      const entries = {
        ...sourceEntries,
        [catalogPath]: sourceEntries[catalogPath]
          .replace(
            "export const claimsDefinition = defineForm",
            `export ${bindingKind} claimsDefinition = defineForm`
          )
          .replace(
            "export const source = defineSource",
            `claimsDefinition = {
            id: 'claims.intake',
            create: createClaimDefinitionAdapter,
            lineage: { rootSymbol: createClaimIntakeForm },
          };

          export const source = defineSource`
          ),
      };
      const result = indexWorkspaceSourceUsages(
        input({
          programs: [
            {
              programId: "claims.application",
              purpose: "application",
              program: createVirtualProgram(entries),
            },
          ],
          readSourceFile: (fileName) => {
            const source = entries[fileName as keyof typeof entries];
            if (source === undefined) {
              throw new Error(`Unexpected source read: ${fileName}`);
            }
            return Buffer.from(source);
          },
        })
      );

      expect(
        pageUsages(result).some(
          ({ resolution }) =>
            resolution.status === "exact" &&
            resolution.candidate.form.formId === "claims.intake"
        )
      ).toBe(false);
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "FORM_DEFINITION_MISSING",
          projectId: "forms-lib",
          formId: "claims.intake",
        })
      );
    }
  );

  it("fails source usages closed when read bytes no longer match the Program snapshot", () => {
    const pagePath = `${WORKSPACE_ROOT}/apps/claims/src/page.ts` as const;
    const result = indexWorkspaceSourceUsages(
      input({
        readSourceFile: (fileName) => {
          const source = sourceEntries[fileName as keyof typeof sourceEntries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(fileName === pagePath ? `${source}\n` : source);
        },
      })
    );

    expect(pageUsages(result)).toEqual([]);
    expect(
      result.diagnostics.some(
        ({ code, programId, location }) =>
          code === "SOURCE_FILE_SNAPSHOT_MISMATCH" &&
          programId === "claims.application" &&
          location?.path === "apps/claims/src/page.ts"
      )
    ).toBe(true);
  });

  it.each([
    "libs/forms/formly-contracts.project.ts",
    "libs/forms/src/catalog.ts",
    "libs/forms/src/forms.barrel.ts",
    "libs/forms/src/forms.ts",
  ] as const)(
    "invalidates every dependent candidate when the authorizing %s snapshot changes",
    (changedPath) => {
      const absoluteChangedPath = `${WORKSPACE_ROOT}/${changedPath}`;
      const result = indexWorkspaceSourceUsages(
        input({
          readSourceFile: (fileName) => {
            const source =
              sourceEntries[fileName as keyof typeof sourceEntries];
            if (source === undefined) {
              throw new Error(`Unexpected source read: ${fileName}`);
            }
            return Buffer.from(
              fileName === absoluteChangedPath ? `${source}\n` : source
            );
          },
        })
      );

      expect(
        pageUsages(result).some(
          ({ resolution }) =>
            resolution.status === "exact" &&
            resolution.candidate.form.formId === "claims.intake"
        )
      ).toBe(false);
      expect(
        result.diagnostics.some(
          ({ code, location }) =>
            code === "SOURCE_FILE_SNAPSHOT_MISMATCH" &&
            location?.path === changedPath
        )
      ).toBe(true);
    }
  );

  it("snapshots workspace-contained helper declarations that authorize exact candidates", () => {
    const helperPath =
      `${WORKSPACE_ROOT}/node_modules/@formly-contract/workspace/index.d.ts` as const;
    const result = indexWorkspaceSourceUsages(
      input({
        readSourceFile: (fileName) => {
          const source = sourceEntries[fileName as keyof typeof sourceEntries];
          if (source === undefined) {
            throw new Error(`Unexpected source read: ${fileName}`);
          }
          return Buffer.from(fileName === helperPath ? `${source}\n` : source);
        },
      })
    );

    expect(
      pageUsages(result).some(({ resolution }) => resolution.status === "exact")
    ).toBe(false);
    expect(
      result.diagnostics.some(
        ({ code, location }) =>
          code === "SOURCE_FILE_SNAPSHOT_MISMATCH" &&
          location?.path ===
            "node_modules/@formly-contract/workspace/index.d.ts"
      )
    ).toBe(true);
  });

  it("requires a genuinely zero-argument compatible signature for an implicit create anchor only", () => {
    const result = indexWorkspaceSourceUsages(input());
    const implicitRequiredUsages = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        invocation.location.path === "apps/claims/src/implicit-required.ts"
    );

    expect(implicitRequiredUsages).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_ROOT_INCOMPATIBLE",
        projectId: "forms-lib",
        formId: "implicit.required",
      })
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_ROOT_INCOMPATIBLE",
        projectId: "forms-lib",
        formId: "implicit.tuple-rest",
      })
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_ROOT_INCOMPATIBLE",
        projectId: "forms-lib",
        formId: "implicit.generic-tuple-rest",
      })
    );
    expect(
      pageUsages(result).filter(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toHaveLength(2);
  });

  it("reads a source snapshot once and hashes the accepted UTF-8 BOM bytes", () => {
    const pagePath = `${WORKSPACE_ROOT}/apps/claims/src/page.ts` as const;
    const pageBytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(sourceEntries[pagePath], "utf8"),
    ]);
    let pageReads = 0;
    const result = indexWorkspaceSourceUsages(
      input({
        readSourceFile: (fileName) => {
          const source = sourceEntries[fileName as keyof typeof sourceEntries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          if (fileName !== pagePath) return Buffer.from(source);
          pageReads += 1;
          return pageBytes;
        },
      })
    );
    const usages = pageUsages(result);
    const expectedHash = `sha256:${createHash("sha256")
      .update(pageBytes)
      .digest("hex")}`;

    expect(pageReads).toBe(1);
    expect(usages).toHaveLength(4);
    expect(
      usages.every(
        ({ invocation }) => invocation.sourceFileHash === expectedHash
      )
    ).toBe(true);
  });

  it("decodes TypeScript-compatible UTF-16LE BOM bytes and hashes the raw snapshot", () => {
    const pagePath = `${WORKSPACE_ROOT}/apps/claims/src/page.ts` as const;
    const pageBytes = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from(sourceEntries[pagePath], "utf16le"),
    ]);
    const result = indexWorkspaceSourceUsages(
      input({
        readSourceFile: (fileName) => {
          const source = sourceEntries[fileName as keyof typeof sourceEntries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return fileName === pagePath ? pageBytes : Buffer.from(source);
        },
      })
    );
    const usages = pageUsages(result);
    const expectedHash = `sha256:${createHash("sha256")
      .update(pageBytes)
      .digest("hex")}`;

    expect(usages).toHaveLength(4);
    expect(
      usages.every(
        ({ invocation }) => invocation.sourceFileHash === expectedHash
      )
    ).toBe(true);
  });

  it("decodes TypeScript-compatible UTF-16BE BOM bytes and hashes the raw snapshot", () => {
    const pagePath = `${WORKSPACE_ROOT}/apps/claims/src/page.ts` as const;
    const body = Buffer.from(sourceEntries[pagePath], "utf16le");
    for (let index = 0; index < body.length; index += 2) {
      const first = body[index]!;
      body[index] = body[index + 1]!;
      body[index + 1] = first;
    }
    const pageBytes = Buffer.concat([Buffer.from([0xfe, 0xff]), body]);
    const result = indexWorkspaceSourceUsages(
      input({
        readSourceFile: (fileName) => {
          const source = sourceEntries[fileName as keyof typeof sourceEntries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return fileName === pagePath ? pageBytes : Buffer.from(source);
        },
      })
    );
    const usages = pageUsages(result);
    const expectedHash = `sha256:${createHash("sha256")
      .update(pageBytes)
      .digest("hex")}`;

    expect(usages).toHaveLength(4);
    expect(
      usages.every(
        ({ invocation }) => invocation.sourceFileHash === expectedHash
      )
    ).toBe(true);
  });

  it("removes earlier observations when an overlapping Program has a mismatched snapshot", () => {
    const pagePath = `${WORKSPACE_ROOT}/apps/claims/src/page.ts` as const;
    const staleEntries = {
      ...sourceEntries,
      [pagePath]: `${sourceEntries[pagePath]}\n`,
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.current",
            purpose: "application",
            program: createVirtualProgram(),
          },
          {
            programId: "claims.stale",
            purpose: "tooling",
            program: createVirtualProgram(staleEntries),
          },
        ],
      })
    );

    expect(pageUsages(result)).toEqual([]);
    expect(
      result.diagnostics.some(
        ({ code, programId, location }) =>
          code === "SOURCE_FILE_SNAPSHOT_MISMATCH" &&
          programId === "claims.stale" &&
          location?.path === "apps/claims/src/page.ts"
      )
    ).toBe(true);
  });

  it("removes earlier observations when a later Program has a mismatched root-authority snapshot", () => {
    const formsPath = `${WORKSPACE_ROOT}/libs/forms/src/forms.ts` as const;
    const staleEntries = {
      [formsPath]: `
        export function createClaimIntakeForm(input: object): readonly object[] {
          return [input];
        }
      `,
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.current",
            purpose: "application",
            program: createVirtualProgram(),
          },
          {
            programId: "claims.stale",
            purpose: "tooling",
            program: createVirtualProgram(staleEntries),
          },
        ],
      })
    );

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(
      result.diagnostics.some(
        ({ code, programId, location }) =>
          code === "SOURCE_FILE_SNAPSHOT_MISMATCH" &&
          programId === "claims.stale" &&
          location?.path === "libs/forms/src/forms.ts"
      )
    ).toBe(true);
  });

  it("fails closed when the same definition site resolves to different roots across Programs", () => {
    const formsPath = `${WORKSPACE_ROOT}/libs/forms/src/forms.ts` as const;
    const alternateFormsPath =
      `${WORKSPACE_ROOT}/libs/forms/src/alternate.ts` as const;
    const catalogPath = `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
    const entries = {
      ...sourceEntries,
      [alternateFormsPath]: sourceEntries[formsPath],
      [catalogPath]: sourceEntries[catalogPath].replace(
        "} from './forms';",
        "} from '@selected/forms';"
      ),
    };
    const program = (
      programId: string,
      selectedPath: string
    ): WorkspaceSourceUsageProgramDescriptor => ({
      programId,
      purpose: "application",
      program: createVirtualProgram(entries, Object.keys(entries), {
        baseUrl: WORKSPACE_ROOT,
        paths: { "@selected/forms": [selectedPath] },
      }),
    });
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          program("claims.a-alternate", "libs/forms/src/alternate.ts"),
          program("claims.z-canonical", "libs/forms/src/forms.ts"),
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined) {
            throw new Error(`Unexpected source read: ${fileName}`);
          }
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "OVERLAPPING_PROGRAM_CONFLICT",
        programId: "claims.z-canonical",
        projectId: "forms-lib",
        formId: "claims.intake",
      })
    );
  });

  it("invalidates a definition site when another Program resolves it to an incompatible root", () => {
    const formsPath = `${WORKSPACE_ROOT}/libs/forms/src/forms.ts` as const;
    const alternateFormsPath =
      `${WORKSPACE_ROOT}/libs/forms/src/incompatible.ts` as const;
    const catalogPath = `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
    const entries = {
      ...sourceEntries,
      [alternateFormsPath]: sourceEntries[formsPath].replace(
        `export function createClaimIntakeForm(input: object): readonly object[] {
      return [input];
    }`,
        `export function createClaimIntakeForm(_input: object): number {
      return 42;
    }`
      ),
      [catalogPath]: sourceEntries[catalogPath].replace(
        "} from './forms';",
        "} from '@selected/forms';"
      ),
    };
    const program = (
      programId: string,
      selectedPath: string
    ): WorkspaceSourceUsageProgramDescriptor => ({
      programId,
      purpose: "application",
      program: createVirtualProgram(entries, Object.keys(entries), {
        baseUrl: WORKSPACE_ROOT,
        paths: { "@selected/forms": [selectedPath] },
      }),
    });
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          program("claims.a-incompatible", "libs/forms/src/incompatible.ts"),
          program("claims.z-canonical", "libs/forms/src/forms.ts"),
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined) {
            throw new Error(`Unexpected source read: ${fileName}`);
          }
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_ROOT_INCOMPATIBLE",
        programId: "claims.a-incompatible",
        projectId: "forms-lib",
        formId: "claims.intake",
      })
    );
  });

  it("adds component context only when the canonical Angular Component decorator is proven", () => {
    const result = indexWorkspaceSourceUsages(input());
    const canonical = pageUsages(result);
    const fake = result.catalog.usages.filter(
      ({ invocation }) =>
        invocation.location.kind === "path" &&
        invocation.location.path === "apps/claims/src/fake-page.ts"
    );

    expect(
      canonical.every(
        ({ contexts }) => contexts[0]?.id === "ClaimPageComponent"
      )
    ).toBe(true);
    expect(fake).toHaveLength(1);
    expect(fake[0]?.contexts).toEqual([]);
  });

  it("reports unsupported roots deterministically without producing exact links", () => {
    const result = indexWorkspaceSourceUsages(input());

    expect(
      result.diagnostics.map(({ code, formId }) => [code, formId])
    ).toEqual(
      expect.arrayContaining([
        ["FORM_ROOT_INCOMPATIBLE", "unsupported.incompatible"],
        ["FORM_ROOT_MISSING", "unsupported.unanchored"],
        ["FORM_ROOT_UNEXPORTED", "unsupported.export-list"],
        ["FORM_NOT_INDEXED", "arrow.form"],
        ["FORM_DEFINITION_MISSING", "unregistered.form"],
      ])
    );
    expect(
      result.catalog.usages.some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId.startsWith("unsupported.")
      )
    ).toBe(false);
  });

  it("never serializes source text, call arguments, or absolute paths", () => {
    const result = indexWorkspaceSourceUsages(input());
    const portable = JSON.stringify(result);

    expect(portable).not.toContain(WORKSPACE_ROOT);
    expect(portable).not.toContain("must-not-escape");
    expect(portable).not.toContain("also-private");
    expect(portable).not.toContain("definition-only");
    expect(portable).not.toContain("wrapper-only");
    expect(
      result.catalog.usages.every(({ invocation }) => {
        if (invocation.location.kind !== "path") return false;
        const expected =
          sourceEntries[
            `${WORKSPACE_ROOT}/${invocation.location.path}` as keyof typeof sourceEntries
          ];
        return (
          invocation.sourceFileHash ===
          `sha256:${createHash("sha256")
            .update(expected ?? "")
            .digest("hex")}`
        );
      })
    ).toBe(true);
  });

  it("canonicalizes project, program, and indexed-form discovery order", () => {
    const firstInput = input({
      programs: [
        {
          programId: "claims.zeta",
          purpose: "tooling",
          program: createVirtualProgram(),
        },
        {
          programId: "claims.alpha",
          purpose: "application",
          program: createVirtualProgram(),
        },
      ],
    });
    const first = indexWorkspaceSourceUsages(firstInput);
    const second = indexWorkspaceSourceUsages({
      ...firstInput,
      projects: [...firstInput.projects].reverse(),
      programs: [...firstInput.programs].reverse(),
      indexedForms: [...firstInput.indexedForms].reverse(),
    });

    expect(second).toEqual(first);
  });

  it("joins a Node-only definition program to a separate application usage program by portable declaration identity", () => {
    const formsPath = `${WORKSPACE_ROOT}/libs/forms/src/forms.ts` as const;
    const barrelPath =
      `${WORKSPACE_ROOT}/libs/forms/src/forms.barrel.ts` as const;
    const application = createVirtualProgram(
      selectSources([
        `${WORKSPACE_ROOT}/node_modules/@angular/core/index.d.ts`,
        formsPath,
        barrelPath,
        `${WORKSPACE_ROOT}/apps/claims/src/page.ts`,
      ])
    );
    const definitions = createVirtualProgram(
      selectSources([
        `${WORKSPACE_ROOT}/node_modules/@formly-contract/workspace/index.d.ts`,
        formsPath,
        barrelPath,
        `${WORKSPACE_ROOT}/libs/forms/formly-contracts.project.ts`,
        `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts`,
      ])
    );
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: application,
          },
          {
            programId: "claims.contract-authoring",
            purpose: "tooling",
            program: definitions,
          },
        ],
      })
    );

    expect(
      pageUsages(result).filter(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toHaveLength(2);
    expect(result.catalog.coverage.scope.includedPurposes).toEqual([
      "application",
      "tooling",
    ]);
  });

  it("resolves relative Program source filenames against the explicit workspace root", () => {
    const relativeRootNames = Object.keys(sourceEntries).map((fileName) =>
      fileName.slice(`${WORKSPACE_ROOT}/`.length)
    );
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(sourceEntries, relativeRootNames),
          },
        ],
      })
    );

    expect(
      pageUsages(result).filter(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toHaveLength(2);
  });

  it("recognizes the exact definition helper through a local re-export barrel", () => {
    const catalogPath = `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
    const helperBarrelPath =
      `${WORKSPACE_ROOT}/libs/forms/src/workspace-helper.ts` as const;
    const entries = {
      ...sourceEntries,
      [helperBarrelPath]: `
        export {
          defineFormContractDefinition,
          defineFormContractSource,
        } from '@formly-contract/workspace';
      `,
      [catalogPath]: sourceEntries[catalogPath].replace(
        "from '@formly-contract/workspace'",
        "from './workspace-helper'"
      ),
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );

    expect(
      pageUsages(result).filter(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toHaveLength(2);
    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "DEFINITION_HELPER_NOT_FOUND" })
    );
  });

  it("fails a form closed when a second helper registration for its ID is malformed", () => {
    const catalogPath = `${WORKSPACE_ROOT}/libs/forms/src/catalog.ts` as const;
    const entries = {
      ...sourceEntries,
      [catalogPath]: sourceEntries[catalogPath].replace(
        "],",
        `
          defineForm({
            id: 'claims.intake',
            create: createClaimDefinitionAdapter,
            lineage: { rootSymbol: createClaimIntakeForm.bind(null) },
          }),
        ],`
      ),
    };
    const result = indexWorkspaceSourceUsages(
      input({
        programs: [
          {
            programId: "claims.application",
            purpose: "application",
            program: createVirtualProgram(entries),
          },
        ],
        readSourceFile: (fileName) => {
          const source = entries[fileName as keyof typeof entries];
          if (source === undefined)
            throw new Error(`Unexpected source read: ${fileName}`);
          return Buffer.from(source);
        },
      })
    );

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "FORM_DEFINITION_DUPLICATE",
        projectId: "forms-lib",
        formId: "claims.intake",
      })
    );
    expect(result.factoryInputAuthoringDiagnostics).toContainEqual({
      code: "FORM_DEFINITION_DUPLICATE",
      formId: "claims.intake",
      projectId: "forms-lib",
    });
    expect(
      pageUsages(result).some(
        ({ resolution }) =>
          resolution.status === "exact" &&
          resolution.candidate.form.formId === "claims.intake"
      )
    ).toBe(false);
  });
});
