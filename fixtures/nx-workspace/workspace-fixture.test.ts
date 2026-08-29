import { mkdtemp, readFile, rm } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadWorkspaceConfigModule,
  parseProjectConfig,
  parseRootConfig,
  resolveWorkspaceProjectConfig,
  runWorkspace,
} from "@formly-contract/workspace";
import { extractFormContract } from "@formly-contract/compiler";
import {
  AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  canonicalizeFieldTypeProfileRegistry,
  computeFieldTypeProfileRegistryHash,
  createAgentContextArtifactSet,
  createAgentContextUsageSearchScopeLiveOwners,
  executeAgentContextQuery,
  parseAgentContextSourceUsageCatalog,
  type AgentContextArtifactReference,
  type AgentContextSearchUsageFilters,
  type FieldTypeProfileRegistry,
  type RuntimeProvenance,
} from "@formly-contract/schema";
import { describe, expect, it } from "vitest";

const fixtureRoot = fileURLToPath(new URL("./", import.meta.url));
const fixtureTsconfig = resolve(fixtureRoot, "tsconfig.json");
const fixtureRuntimeProvenance: RuntimeProvenance = {
  schemaVersion: "1.0.0",
  worker: {
    id: "@formly-contract/workspace/in-process",
    version: "0.1.0",
    protocolVersion: "1",
  },
  adapter: {
    id: "@formly-contract/compiler/declared",
    version: "0.4.0",
    mode: "declared",
  },
  tools: [
    { name: "@formly-contract/compiler", version: "0.4.0" },
    { name: "@formly-contract/schema", version: "0.4.0" },
    { name: "@formly-contract/workspace", version: "0.1.0" },
  ],
  loader: {
    id: "jiti",
    version: "2.7.0",
    options: {
      fsCache: false,
      interopDefault: false,
      moduleCache: false,
      tsconfigPaths: {
        rootConfig: "configured",
        projectConfigs: "configured",
      },
      nativeModules: [],
    },
  },
  node: { version: "22.22.1", platform: "linux", architecture: "x64" },
  executionProfile: {
    id: "trusted-local-v1",
    version: "1",
    network: "not-enforced",
  },
  dependencySnapshot: {
    kind: "pnpm-lock",
    workspaceRelativePath: "pnpm-lock.yaml",
    sha256: `sha256:${"a".repeat(64)}`,
  },
  runtimePackages: [],
};

const EXPECTED_NX_RADIO_REGISTRY: FieldTypeProfileRegistry = {
  schemaVersion: "0.4.0",
  id: "fixture.nx-fields",
  version: 1,
  profiles: [
    {
      identity: { id: "fixture.nx-cool-radio", version: 1 },
      semanticType: "single-choice",
      valueShape: "scalar",
      evidence: "declared",
      parts: [
        {
          name: "group",
          role: "radiogroup",
          cardinality: "one",
          evidence: "declared",
        },
        {
          name: "option",
          role: "radio",
          cardinality: "many",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "choice",
        operation: "check",
        optionPart: "option",
      },
      valueDomain: {
        kind: "projected",
        source: "adapter",
        completeness: "complete",
        collectionPath: "props.options",
        labelPath: "label",
        valuePath: "value",
        evidence: "declared",
      },
      driver: {
        kind: "generic",
        id: "generic.choice",
        version: 1,
        capabilities: ["check"],
      },
      effectCapabilities: { targetProperties: ["options"], readiness: [] },
      unknowns: [],
    },
  ],
  registrations: [
    {
      formlyType: "cool-radio-btn-grp",
      defaultProfile: { id: "fixture.nx-cool-radio", version: 1 },
      variants: [],
    },
  ],
  wrappers: [],
};

interface NxProjectJson {
  readonly name: string;
  readonly targets?: {
    readonly build?: { readonly executor?: string };
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function parseNxProjectJson(text: string): NxProjectJson {
  const value = JSON.parse(text) as unknown;
  const targets = isRecord(value) ? value.targets : undefined;
  const build = isRecord(targets) ? targets.build : undefined;
  if (!isRecord(value) || typeof value.name !== "string") {
    throw new Error("Invalid Nx fixture project configuration.");
  }

  return {
    name: value.name,
    ...(isRecord(build) && typeof build.executor === "string"
      ? { targets: { build: { executor: build.executor } } }
      : {}),
  };
}

describe("Nx workspace consumer fixture", () => {
  it("links the consuming claim component to the exact generated contract without evaluating call arguments", async () => {
    const temporaryDirectory = await mkdtemp(
      resolve(fixtureRoot, ".workspace-runner-")
    );

    try {
      const result = await runWorkspace({
        workspaceRoot: fixtureRoot,
        rootConfigPath: "formly-contracts.config.ts",
        rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
        cliOverrides: {
          outputDirectory: relative(fixtureRoot, temporaryDirectory),
        },
        runtimeProvenance: fixtureRuntimeProvenance,
      });
      const catalogPath = result.sourceUsageCatalogPath;

      expect(catalogPath).toBeDefined();
      if (catalogPath === undefined) {
        throw new Error("Expected the source-usage catalog to be generated.");
      }

      const catalogBytes = await readFile(
        resolve(fixtureRoot, catalogPath),
        "utf8"
      );
      const catalog = parseAgentContextSourceUsageCatalog(
        JSON.parse(catalogBytes) as unknown
      );
      const indexedForm = result.index.forms.find(
        ({ formId }) => formId === "nx.claims.intake"
      );
      const usage = catalog.usages.find(
        (candidate) =>
          candidate.resolution.status === "exact" &&
          candidate.resolution.candidate.form.formId === "nx.claims.intake"
      );

      expect(indexedForm).toBeDefined();
      expect(result.sourceUsageDiagnostics).toEqual([]);
      expect(usage).toBeDefined();
      expect(catalog.workspaceIndex.contentHash).toBe(result.index.contentHash);
      expect(usage).toMatchObject({
        projectId: "fixture-nx-feature-lib",
        invocation: {
          location: {
            kind: "path",
            pathMode: "workspace-relative",
            path: "libs/feature-lib/src/lib/claim-page.component.ts",
          },
          symbol: { id: "createNxClaimForm", kind: "function" },
          syntaxKind: "call",
          syntaxToken: {
            kind: "ast-call-shape",
            version: 1,
            calleeForm: "identifier",
            argumentCount: 1,
            typeArgumentCount: 0,
            optionalCall: false,
          },
        },
        resolution: {
          status: "exact",
          candidate: {
            form: {
              projectId: "fixture-nx-feature-lib",
              formId: "nx.claims.intake",
              contractHash: indexedForm?.contentHash,
            },
          },
        },
      });
      expect(
        usage?.contexts.some(
          ({ kind, id }) => kind === "component" && id === "ClaimPageComponent"
        )
      ).toBe(true);
      expect(usage?.invocation).not.toHaveProperty("arguments");
      expect(catalogBytes).not.toContain(fixtureRoot);
      expect(catalogBytes).not.toContain("window.location.pathname");
      expect(catalogBytes).not.toContain("const instance = createNxClaimForm");

      const sourceUsageReference: AgentContextArtifactReference = {
        schemaId: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
        schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
        contentHash: catalog.contentHash,
      };
      const artifactSet = createAgentContextArtifactSet({
        schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
        repositoryRevision: "fixture-nx-workspace",
        workspaceIndex: catalog.workspaceIndex,
        artifacts: [sourceUsageReference],
      });
      const scope = {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        artifactSet: {
          schemaVersion: artifactSet.schemaVersion,
          contentHash: artifactSet.contentHash,
        },
        workspaceIndex: catalog.workspaceIndex,
        sourceUsageCatalogs: [sourceUsageReference],
      } as const;
      const dataset = {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        artifactSet,
        sourceUsageCatalogs: [
          { reference: sourceUsageReference, artifact: catalog },
        ],
        journeyCatalogs: [],
        formContracts: [],
        executionAuthorities: [],
      } as const;
      const live = {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextUsageSearchScopeLiveOwners(scope),
      } as const;
      const search = (filters: AgentContextSearchUsageFilters) => {
        const queryResult = executeAgentContextQuery(
          dataset,
          {
            schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
            operation: "search-form-usages",
            scope,
            filters,
            page: { collection: "candidates", limit: 10 },
          },
          live,
          {
            now: 1_000,
            ttlMs: 60_000,
            signingMaterial: "fixture-signing-material",
          }
        );
        if (
          queryResult.operation !== "search-form-usages" ||
          queryResult.status !== "complete"
        ) {
          throw new Error("Expected one complete source-usage query match.");
        }
        return queryResult.candidates;
      };
      const bySourcePath = search({
        sourcePath: "libs/feature-lib/src/lib/claim-page.component.ts",
      });
      const byFormId = search({ formId: "nx.claims.intake" });

      for (const candidates of [bySourcePath, byFormId]) {
        expect(candidates).toHaveLength(1);
        expect(candidates[0]?.form).toEqual({
          projectId: "fixture-nx-feature-lib",
          formId: "nx.claims.intake",
          contractHash: indexedForm?.contentHash,
        });
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("uses one explicit claim definition for contract creation and source lineage", async () => {
    const project = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "libs/feature-lib/formly-contracts.project.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const definitions = (await project.sources?.[0]?.list()) ?? [];

    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatchObject({
      id: "nx.claims.intake",
    });
    expect(definitions[0]?.lineage?.rootSymbol).toBe(definitions[0]?.create);
  });

  it("lowers one compact radio declaration to the independently authored canonical registry", async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "formly-contracts.config.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const project = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "libs/forms-kit/formly-contracts.project.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const generated = resolveWorkspaceProjectConfig(root, project)
      .fieldTypeProfiles?.registry;

    expect(generated).toBeDefined();
    expect(canonicalizeFieldTypeProfileRegistry(generated)).toBe(
      canonicalizeFieldTypeProfileRegistry(EXPECTED_NX_RADIO_REGISTRY)
    );
    expect(computeFieldTypeProfileRegistryHash(generated)).toBe(
      computeFieldTypeProfileRegistryHash(EXPECTED_NX_RADIO_REGISTRY)
    );
  }, 20_000);

  it("is a real Nx workspace with four independently owned projects", async () => {
    const nxConfig = JSON.parse(
      await readFile(resolve(fixtureRoot, "nx.json"), "utf8")
    ) as {
      readonly cli?: { readonly cache?: { readonly enabled?: boolean } };
      readonly targetDefaults?: Readonly<Record<string, unknown>>;
    };
    const projectPaths = [
      "apps/test-app/project.json",
      "libs/formly-kit/project.json",
      "libs/forms-kit/project.json",
      "libs/feature-lib/project.json",
    ];
    const projects = await Promise.all(
      projectPaths.map(async (path) =>
        parseNxProjectJson(await readFile(resolve(fixtureRoot, path), "utf8"))
      )
    );

    expect(nxConfig.targetDefaults?.build).toEqual(
      expect.objectContaining({ cache: true })
    );
    expect(nxConfig.cli?.cache?.enabled).toBe(false);
    expect(projects.map((project) => project.name).sort()).toEqual([
      "fixture-nx-app",
      "fixture-nx-feature-lib",
      "fixture-nx-formly-kit",
      "fixture-nx-forms-kit",
    ]);
    expect(projects[0]?.targets?.build?.executor).toBe(
      "@nx/angular:application"
    );
  });

  it("loads the root config and representative local source catalogs", async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "formly-contracts.config.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const formsProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "libs/forms-kit/formly-contracts.project.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const featureProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "libs/feature-lib/formly-contracts.project.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const definitions = [
      ...((await formsProject.sources?.[0]?.list()) ?? []),
      ...((await featureProject.sources?.[0]?.list()) ?? []),
    ];

    expect(root.projectConfigs).toEqual([
      "apps/**/formly-contracts.project.ts",
      "libs/**/formly-contracts.project.ts",
    ]);
    expect(definitions.map((definition) => definition.id).sort()).toEqual([
      "nx.claims.intake",
      "nx.shared.contact-preferences",
    ]);
    expect(
      definitions.flatMap((definition) => {
        const instance = definition.create() as {
          readonly fields: readonly { readonly type?: unknown }[];
        };
        return instance.fields.map((field) => field.type);
      })
    ).toContain("cool-radio-btn-grp");
  }, 20_000);

  it("shares one canonical radio profile across source-owning projects", async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "formly-contracts.config.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const formsProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "libs/forms-kit/formly-contracts.project.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const featureProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, "libs/feature-lib/formly-contracts.project.ts"),
        { tsconfigPath: fixtureTsconfig }
      )
    );
    const formsKit = resolveWorkspaceProjectConfig(root, formsProject);
    const feature = resolveWorkspaceProjectConfig(root, featureProject);

    expect(formsKit.fieldTypeProfiles).toBeDefined();
    expect(feature.fieldTypeProfiles).toEqual(formsKit.fieldTypeProfiles);
    expect(
      formsKit.fieldTypeProfiles?.registry.registrations.map(
        ({ formlyType }) => formlyType
      )
    ).toEqual(["cool-radio-btn-grp"]);

    if (
      formsKit.fieldTypeProfiles === undefined ||
      feature.fieldTypeProfiles === undefined
    ) {
      return;
    }
    const projects = [
      { config: formsProject, fieldTypeProfiles: formsKit.fieldTypeProfiles },
      { config: featureProject, fieldTypeProfiles: feature.fieldTypeProfiles },
    ];
    const extracted = await Promise.all(
      projects.map(async ({ config, fieldTypeProfiles }) => {
        const definition = (await config.sources?.[0]?.list())?.[0];
        if (definition === undefined) {
          throw new Error("Expected one fixture form definition.");
        }
        const instance = definition.create();
        return extractFormContract({
          formId: definition.id,
          fields: instance.fields,
          fieldTypeProfiles,
        });
      })
    );

    for (const result of extracted) {
      const radio = result.contract.nodes.find(
        ({ formlyType }) => formlyType === "cool-radio-btn-grp"
      );
      expect(radio).toMatchObject({
        semanticType: "single-choice",
        valueDomain: {
          kind: "enumerated",
          values: ["email", "phone"],
        },
        interactionProfile: {
          profile: { id: "fixture.nx-cool-radio", version: 1 },
        },
      });
    }
    expect(extracted[0]?.contract.fieldTypeProfileRegistry).toEqual(
      extracted[1]?.contract.fieldTypeProfileRegistry
    );
  }, 20_000);
});
