import {
  canonicalStringify,
  parseAgentContextSourceUsageCatalog,
  type RuntimeProvenance,
} from "@formly-contract/schema";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkWorkspace,
  runWorkspace,
  WorkspaceGenerationError,
} from "./run-workspace.js";

const outputRenameFault = vi.hoisted(() => ({
  workspaceIndexFailuresRemaining: 0,
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>(
    "node:fs/promises"
  );
  return {
    ...actual,
    rename: async (...args: Parameters<typeof actual.rename>) => {
      if (
        outputRenameFault.workspaceIndexFailuresRemaining > 0 &&
        String(args[1]).endsWith("/workspace-index.json")
      ) {
        outputRenameFault.workspaceIndexFailuresRemaining -= 1;
        throw Object.assign(
          new Error("injected workspace-index rename failure"),
          {
            code: "EACCES",
          }
        );
      }
      return actual.rename(...args);
    },
  };
});

const temporaryDirectories: string[] = [];

async function createTemporaryWorkspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "formly workspace runner "));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeModule(
  workspaceRoot: string,
  relativePath: string,
  source: string
): Promise<void> {
  const path = join(workspaceRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}

async function seedRoot(workspaceRoot: string, extra = ""): Promise<void> {
  await writeModule(
    workspaceRoot,
    "pnpm-lock.yaml",
    "lockfileVersion: '9.0'\n"
  );
  await writeModule(
    workspaceRoot,
    "formly-contracts.config.mjs",
    `export default {
      projectConfigs: ['projects/*.project.mjs']
      ${extra}
    };`
  );
}

async function seedSourceUsageWorkspace(
  workspaceRoot: string,
  options: {
    readonly mutateRootDuringCreate?: boolean;
    readonly mutateRootDuringList?: boolean;
  } = {}
): Promise<void> {
  await writeModule(
    workspaceRoot,
    "node_modules/@formly-contract/workspace/package.json",
    JSON.stringify({
      name: "@formly-contract/workspace",
      type: "module",
      exports: { ".": "./index.js" },
    })
  );
  await writeModule(
    workspaceRoot,
    "node_modules/@formly-contract/workspace/index.js",
    `export const defineFormContractDefinition = (definition) => definition;
export const defineFormContractSource = (source) => source;
export const defineFormContractProject = (project) => project;
`
  );
  await writeModule(
    workspaceRoot,
    "node_modules/@formly-contract/workspace/index.d.ts",
    `export declare function defineFormContractDefinition<const T>(definition: T): T;
export declare function defineFormContractSource<const T>(source: T): T;
export declare function defineFormContractProject<const T>(project: T): T;
`
  );
  await writeModule(
    workspaceRoot,
    "pnpm-lock.yaml",
    "lockfileVersion: '9.0'\n"
  );
  await writeModule(
    workspaceRoot,
    "formly-contracts.config.mjs",
    `export default {
      projectConfigs: ['projects/*.project.ts'],
      tsconfigPath: 'tsconfig.json',
      sourceUsage: {
        convention: 'direct-root-call-v1',
        tsconfigPath: 'tsconfig.json'
      }
    };`
  );
  await writeModule(
    workspaceRoot,
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        target: "ES2022",
      },
      files: ["projects/claim-page.ts"],
    })
  );
  await writeModule(
    workspaceRoot,
    "projects/claim.form.ts",
    `export function createClaimForm(_input?: unknown) {
      return [{ key: 'name', type: 'input' }];
    }`
  );
  await writeModule(
    workspaceRoot,
    "projects/claim-page.ts",
    `import { createClaimForm } from './claim.form.js';
    export const fields = createClaimForm({ live: true });`
  );
  await writeModule(
    workspaceRoot,
    "projects/forms.project.ts",
    `${
      options.mutateRootDuringCreate === true ||
      options.mutateRootDuringList === true
        ? "import { appendFileSync } from 'node:fs';\nimport { fileURLToPath } from 'node:url';\n"
        : ""
    }import {
      defineFormContractDefinition,
      defineFormContractProject,
      defineFormContractSource
    } from '@formly-contract/workspace';
    import { createClaimForm } from './claim.form.js';

    export const claimDefinition = defineFormContractDefinition({
      id: 'claims.form',
      create: () => {
        ${
          options.mutateRootDuringCreate === true
            ? "appendFileSync(fileURLToPath(new URL('./claim.form.ts', import.meta.url)), '\\n');"
            : ""
        }
        return { fields: createClaimForm() };
      },
      lineage: { rootSymbol: createClaimForm }
    });

    export const claimSource = defineFormContractSource({
      sourceId: 'forms',
      list: (${
        options.mutateRootDuringList === true
          ? "_snapshotMutation = appendFileSync(fileURLToPath(new URL('./claim.form.ts', import.meta.url)), '\\n')"
          : ""
      }) => [claimDefinition]
    });

    export default defineFormContractProject({
      projectId: 'forms',
      sources: [claimSource]
    });`
  );
}

function runnerOptions(workspaceRoot: string) {
  return {
    workspaceRoot,
    rootConfigPath: "formly-contracts.config.mjs",
  } as const;
}

function runtimeProvenance(
  overrides: {
    readonly workerVersion?: string;
    readonly lockHash?: string;
  } = {}
): RuntimeProvenance {
  return {
    schemaVersion: "1.0.0",
    worker: {
      id: "@formly-contract/workspace/in-process",
      version: overrides.workerVersion ?? "0.1.0",
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
          rootConfig: "disabled",
          projectConfigs: "disabled",
        },
        nativeModules: [],
      },
    },
    node: {
      version: "22.22.1",
      platform: "linux",
      architecture: "x64",
    },
    executionProfile: {
      id: "trusted-local-v1",
      version: "1",
      network: "not-enforced",
    },
    dependencySnapshot: {
      kind: "pnpm-lock",
      workspaceRelativePath: "pnpm-lock.yaml",
      sha256: overrides.lockHash ?? `sha256:${"a".repeat(64)}`,
    },
    runtimePackages: [],
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

afterEach(async () => {
  outputRenameFault.workspaceIndexFailuresRemaining = 0;
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("runWorkspace", () => {
  it("records the exact in-process toolchain, Node runtime, and selected root lockfile", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default { projectId: 'forms' };`
    );

    const result = await runWorkspace(runnerOptions(workspaceRoot));
    const lockBytes = "lockfileVersion: '9.0'\n";

    expect(result.index.runtimeProvenance).toEqual({
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
            rootConfig: "disabled",
            projectConfigs: "disabled",
          },
          nativeModules: [],
        },
      },
      node: {
        version: process.versions.node,
        platform: process.platform,
        architecture: process.arch,
      },
      executionProfile: {
        id: "trusted-local-v1",
        version: "1",
        network: "not-enforced",
      },
      dependencySnapshot: {
        kind: "pnpm-lock",
        workspaceRelativePath: "pnpm-lock.yaml",
        sha256: `sha256:${createHash("sha256")
          .update(lockBytes)
          .digest("hex")}`,
      },
      runtimePackages: [],
    });
    expect(result.index.projects[0]?.runtimeProvenance).toEqual(
      result.index.runtimeProvenance
    );
  });

  it.each([
    {
      label: "neither loader stage",
      rootConfigured: false,
      projectsConfigured: false,
    },
    {
      label: "only the root-config loader",
      rootConfigured: true,
      projectsConfigured: false,
    },
    {
      label: "only the project-config loaders",
      rootConfigured: false,
      projectsConfigured: true,
    },
    {
      label: "both loader stages",
      rootConfigured: true,
      projectsConfigured: true,
    },
  ])(
    "records effective tsconfig-path use for $label",
    async ({ rootConfigured, projectsConfigured }) => {
      const workspaceRoot = await createTemporaryWorkspace();
      await seedRoot(
        workspaceRoot,
        projectsConfigured ? `, tsconfigPath: 'project-tsconfig.json'` : ""
      );
      await writeModule(
        workspaceRoot,
        "projects/forms.project.mjs",
        `export default { projectId: 'forms' };`
      );
      await writeModule(workspaceRoot, "root-tsconfig.json", `{}`);
      await writeModule(workspaceRoot, "project-tsconfig.json", `{}`);

      const result = await runWorkspace({
        ...runnerOptions(workspaceRoot),
        ...(rootConfigured
          ? {
              rootLoaderOptions: {
                tsconfigPath: join(workspaceRoot, "root-tsconfig.json"),
              },
            }
          : {}),
      });

      expect(
        result.index.runtimeProvenance.loader.options.tsconfigPaths
      ).toEqual({
        rootConfig: rootConfigured ? "configured" : "disabled",
        projectConfigs: projectsConfigured ? "configured" : "disabled",
      });
    }
  );

  it("fails generation when the workspace-root dependency lock is unavailable", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      "formly-contracts.config.mjs",
      `export default { projectConfigs: ['projects/*.project.mjs'] };`
    );
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default { projectId: 'forms' };`
    );

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
      expect.objectContaining({
        code: "DEPENDENCY_SNAPSHOT_UNAVAILABLE",
        phase: "inventory",
      })
    );
  });

  it("deterministically inventories unordered bulk sources and emits byte-identical consecutive runs", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/zeta.project.mjs",
      `export default {
        projectId: 'zeta/forms',
        sources: [{
          sourceId: 'zeta/source',
          list: async () => [
            { id: 'zeta.second', create: () => ({ fields: [{ key: 'second', type: 'input' }] }) },
            { id: 'zeta.first', create: () => ({ fields: [{ key: 'first', type: 'input' }] }) }
          ]
        }]
      };`
    );
    await writeModule(
      workspaceRoot,
      "projects/alpha.project.mjs",
      `export default {
        projectId: 'alpha/forms',
        sources: [{
          sourceId: 'alpha/source',
          list: () => [{ id: 'alpha.only', create: () => ({ fields: [{ key: 'only', type: 'checkbox' }] }) }]
        }]
      };`
    );

    const first = await runWorkspace(runnerOptions(workspaceRoot));
    const firstIndexBytes = await readFile(
      join(workspaceRoot, first.indexPath),
      "utf8"
    );
    const firstArtifactBytes = await Promise.all(
      first.artifactPaths.map((path) =>
        readFile(join(workspaceRoot, path), "utf8")
      )
    );
    const second = await runWorkspace(runnerOptions(workspaceRoot));

    expect(first.artifactPaths).toEqual([...first.artifactPaths].sort());
    expect(first.index.forms.map(({ formId }) => formId)).toEqual([
      "alpha.only",
      "zeta.first",
      "zeta.second",
    ]);
    expect(first.indexPath).toBe("dist/formly-contracts/workspace-index.json");
    expect(first.index).toEqual(second.index);
    expect(await readFile(join(workspaceRoot, second.indexPath), "utf8")).toBe(
      firstIndexBytes
    );
    await expect(
      Promise.all(
        second.artifactPaths.map((path) =>
          readFile(join(workspaceRoot, path), "utf8")
        )
      )
    ).resolves.toEqual(firstArtifactBytes);
    expect(firstIndexBytes).toBe(`${canonicalStringify(first.index)}\n`);
  });

  it("generates an exact selected config without importing a broken sibling project", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/broken.project.mjs",
      `throw new Error('Angular browser barrel must not be imported');`
    );
    await writeModule(
      workspaceRoot,
      "projects/healthy.project.mjs",
      `export default {
        projectId: 'healthy/forms',
        sources: [{
          sourceId: 'healthy/source',
          list: () => [{
            id: 'healthy.form',
            create: () => ({ fields: [{ key: 'name', type: 'input' }] })
          }]
        }]
      };`
    );

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toMatchObject({
      code: "WORKSPACE_DISCOVERY_FAILED",
      phase: "inventory",
    });
    await expect(
      runWorkspace({
        ...runnerOptions(workspaceRoot),
        continueOnProjectError: true,
      })
    ).rejects.toMatchObject({
      code: "WORKSPACE_DISCOVERY_FAILED",
      phase: "inventory",
    });

    const options = {
      ...runnerOptions(workspaceRoot),
      selectedProjectConfigPaths: ["projects/healthy.project.mjs"],
    } as const;
    const first = await runWorkspace(options);
    const second = await runWorkspace(options);

    expect(first.index.projects.map(({ projectId }) => projectId)).toEqual([
      "healthy/forms",
    ]);
    expect(first.index.forms.map(({ formId }) => formId)).toEqual([
      "healthy.form",
    ]);
    expect(first.indexPath).toMatch(
      /^dist\/formly-contracts\/scopes\/projects\/[a-f0-9]{64}\/workspace-index\.json$/u
    );
    expect(second.indexPath).toBe(first.indexPath);
    expect(second.index.contentHash).toBe(first.index.contentHash);
    expect(first.indexPath).not.toBe(
      "dist/formly-contracts/workspace-index.json"
    );
  });

  it("publishes and checks an opted-in source-usage catalog as a separate deterministic artifact", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot);

    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    expect(catalogPath).toBe("dist/formly-contracts/source-usage-catalog.json");
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }
    expect(generated.artifactPaths).toHaveLength(1);
    expect(generated.artifactPaths).not.toContain(catalogPath);
    expect(generated.sourceUsageDiagnostics).toEqual([]);

    const catalogBytes = await readFile(
      join(workspaceRoot, catalogPath),
      "utf8"
    );
    const catalog = parseAgentContextSourceUsageCatalog(
      JSON.parse(catalogBytes) as unknown
    );
    expect(catalog.workspaceIndex.contentHash).toBe(
      generated.index.contentHash
    );
    expect(catalog.usages).toHaveLength(1);
    expect(catalog.usages[0]).toMatchObject({
      invocation: { symbol: { id: "createClaimForm" } },
      resolution: {
        status: "exact",
        candidate: {
          form: {
            projectId: "forms",
            formId: "claims.form",
            contractHash: generated.index.forms[0]?.contentHash,
          },
        },
      },
    });

    await expect(
      checkWorkspace(runnerOptions(workspaceRoot))
    ).resolves.toMatchObject({
      sourceUsageCatalogPath: catalogPath,
      sourceUsageDiagnostics: [],
      differences: [],
    });

    await writeModule(
      workspaceRoot,
      "projects/claim-page.ts",
      `import { createClaimForm } from './claim.form.js';
      export const fields = createClaimForm({ live: false });`
    );
    const regenerated = await runWorkspace(runnerOptions(workspaceRoot));
    const regeneratedCatalogBytes = await readFile(
      join(workspaceRoot, catalogPath),
      "utf8"
    );
    expect(regenerated.sourceUsageCatalogPath).toBe(catalogPath);
    expect(regeneratedCatalogBytes).not.toBe(catalogBytes);
    await expect(
      checkWorkspace(runnerOptions(workspaceRoot))
    ).resolves.toMatchObject({
      sourceUsageCatalogPath: catalogPath,
      differences: [],
    });

    await writeFile(join(workspaceRoot, catalogPath), "stale catalog\n");
    await expect(
      checkWorkspace(runnerOptions(workspaceRoot))
    ).resolves.toMatchObject({
      differences: [{ path: catalogPath, status: "stale" }],
    });

    await rm(join(workspaceRoot, catalogPath));
    await expect(
      checkWorkspace(runnerOptions(workspaceRoot))
    ).resolves.toMatchObject({
      differences: [{ path: catalogPath, status: "missing" }],
    });
  }, 15_000);

  it("suppresses exact links when runtime and application tsconfigs resolve a registered root differently", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "formly-contracts.config.mjs",
      `export default {
        projectConfigs: ['projects/*.project.ts'],
        tsconfigPath: 'runtime-tsconfig.json',
        sourceUsage: {
          convention: 'direct-root-call-v1',
          tsconfigPath: 'application-tsconfig.json'
        }
      };`
    );
    await writeModule(
      workspaceRoot,
      "runtime-tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          baseUrl: ".",
          paths: {
            "@workspace/claim-root": ["projects/runtime-claim.form.ts"],
          },
        },
        files: [],
      })
    );
    await writeModule(
      workspaceRoot,
      "application-tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          baseUrl: ".",
          paths: {
            "@workspace/claim-root": ["projects/application-claim.form.ts"],
          },
        },
        files: ["projects/claim-page.ts"],
      })
    );
    await writeModule(
      workspaceRoot,
      "projects/runtime-claim.form.ts",
      `export function createClaimForm(_input?: unknown) {
        return [{ key: 'runtime-name', type: 'input' }];
      }`
    );
    await writeModule(
      workspaceRoot,
      "projects/application-claim.form.ts",
      `export function createClaimForm(_input?: unknown) {
        return [{ key: 'application-name', type: 'input' }];
      }`
    );
    await writeModule(
      workspaceRoot,
      "projects/claim-page.ts",
      `import { createClaimForm } from '@workspace/claim-root';
      export const fields = createClaimForm({ live: true });`
    );
    await writeModule(
      workspaceRoot,
      "projects/forms.project.ts",
      `import {
        defineFormContractDefinition,
        defineFormContractProject,
        defineFormContractSource
      } from '@formly-contract/workspace';
      import { createClaimForm } from '@workspace/claim-root';

      export const claimDefinition = defineFormContractDefinition({
        id: 'claims.form',
        create: () => ({ fields: createClaimForm() }),
        lineage: { rootSymbol: createClaimForm }
      });

      export const claimSource = defineFormContractSource({
        sourceId: 'forms',
        list: () => [claimDefinition]
      });

      export default defineFormContractProject({
        projectId: 'forms',
        sources: [claimSource]
      });`
    );

    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }
    const catalog = parseAgentContextSourceUsageCatalog(
      JSON.parse(
        await readFile(join(workspaceRoot, catalogPath), "utf8")
      ) as unknown
    );

    expect(
      catalog.usages.some(({ resolution }) => resolution.status === "exact")
    ).toBe(false);
    expect(generated.sourceUsageDiagnostics).toContainEqual(
      expect.objectContaining({
        code: "OVERLAPPING_PROGRAM_CONFLICT",
        programId: "workspace.authority",
        projectId: "forms",
        formId: "claims.form",
      })
    );
    const serializedDiagnostics = JSON.stringify(
      generated.sourceUsageDiagnostics
    );
    expect(serializedDiagnostics).not.toContain(workspaceRoot);
    expect(serializedDiagnostics).not.toContain("runtime-name");
    expect(serializedDiagnostics).not.toContain("application-name");
    await expect(
      checkWorkspace(runnerOptions(workspaceRoot))
    ).resolves.toMatchObject({
      differences: [],
      sourceUsageDiagnostics: generated.sourceUsageDiagnostics,
    });
  });

  it("suppresses exact links when TypeScript module suffix resolution disagrees with the Jiti config runtime", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot);
    const tsconfig = JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        moduleSuffixes: [".runtime", ""],
        target: "ES2022",
      },
      files: ["projects/claim-page.ts"],
    });
    await writeModule(workspaceRoot, "tsconfig.json", tsconfig);
    await writeModule(
      workspaceRoot,
      "projects/claim.form.runtime.ts",
      `export function createClaimForm(_input?: unknown) {
        return [{ key: 'runtime-name', type: 'input' }];
      }`
    );

    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }
    const catalog = parseAgentContextSourceUsageCatalog(
      JSON.parse(
        await readFile(join(workspaceRoot, catalogPath), "utf8")
      ) as unknown
    );

    expect(
      catalog.usages.some(({ resolution }) => resolution.status === "exact")
    ).toBe(false);
    expect(generated.sourceUsageDiagnostics).toContainEqual(
      expect.objectContaining({
        code: "SOURCE_RUNTIME_RESOLUTION_MISMATCH",
        programId: "workspace.authority",
        projectId: "forms",
      })
    );
    const serializedDiagnostics = JSON.stringify(
      generated.sourceUsageDiagnostics
    );
    expect(serializedDiagnostics).not.toContain(workspaceRoot);
    expect(serializedDiagnostics).not.toContain("runtime-name");
  });

  it("reports an obsolete source-usage catalog and retires it on generation after the feature is disabled", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot);

    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    expect(catalogPath).toBe("dist/formly-contracts/source-usage-catalog.json");
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }

    await writeModule(
      workspaceRoot,
      "formly-contracts-disabled.config.mjs",
      `export default {
        projectConfigs: ['projects/*.project.ts'],
        tsconfigPath: 'tsconfig.json'
      };`
    );
    const disabledOptions = {
      workspaceRoot,
      rootConfigPath: "formly-contracts-disabled.config.mjs",
    } as const;

    const checked = await checkWorkspace(disabledOptions);

    expect(checked.sourceUsageCatalogPath).toBeUndefined();
    expect(checked.differences).toContainEqual({
      path: catalogPath,
      status: "stale",
    });
    expect(await pathExists(join(workspaceRoot, catalogPath))).toBe(true);

    const regenerated = await runWorkspace(disabledOptions);

    expect(regenerated.sourceUsageCatalogPath).toBeUndefined();
    expect(await pathExists(join(workspaceRoot, catalogPath))).toBe(false);
    await expect(checkWorkspace(disabledOptions)).resolves.toMatchObject({
      differences: [],
    });
  });

  it("restores the previous source-usage catalog when the final index publication fails", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot);
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }
    const previousCatalog = await readFile(join(workspaceRoot, catalogPath));
    const previousIndex = await readFile(
      join(workspaceRoot, generated.indexPath)
    );
    await writeModule(
      workspaceRoot,
      "projects/claim.form.ts",
      `export function createClaimForm(_input?: unknown) {
        return [{ key: 'name', type: 'input', props: { label: 'Changed' } }];
      }`
    );
    outputRenameFault.workspaceIndexFailuresRemaining = 1;

    await expect(
      runWorkspace(runnerOptions(workspaceRoot))
    ).rejects.toMatchObject({
      code: "OUTPUT_WRITE_FAILED",
      phase: "output",
      outputPath: generated.indexPath,
    });

    await expect(readFile(join(workspaceRoot, catalogPath))).resolves.toEqual(
      previousCatalog
    );
    await expect(
      readFile(join(workspaceRoot, generated.indexPath))
    ).resolves.toEqual(previousIndex);
  });

  it("restores a retired source-usage catalog when the final index publication fails", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot);
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }
    const previousCatalog = await readFile(join(workspaceRoot, catalogPath));
    const previousIndex = await readFile(
      join(workspaceRoot, generated.indexPath)
    );
    await writeModule(
      workspaceRoot,
      "formly-contracts-disabled.config.mjs",
      `export default {
        projectConfigs: ['projects/*.project.ts'],
        tsconfigPath: 'tsconfig.json'
      };`
    );
    outputRenameFault.workspaceIndexFailuresRemaining = 1;

    await expect(
      runWorkspace({
        workspaceRoot,
        rootConfigPath: "formly-contracts-disabled.config.mjs",
      })
    ).rejects.toMatchObject({
      code: "OUTPUT_WRITE_FAILED",
      phase: "output",
      outputPath: generated.indexPath,
    });

    await expect(readFile(join(workspaceRoot, catalogPath))).resolves.toEqual(
      previousCatalog
    );
    await expect(
      readFile(join(workspaceRoot, generated.indexPath))
    ).resolves.toEqual(previousIndex);
  });

  it("snapshots source authority before form factories execute and fails closed when a factory mutates it", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot, {
      mutateRootDuringCreate: true,
    });

    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }
    const catalog = parseAgentContextSourceUsageCatalog(
      JSON.parse(
        await readFile(join(workspaceRoot, catalogPath), "utf8")
      ) as unknown
    );

    expect(catalog.usages).toEqual([]);
    expect(
      generated.sourceUsageDiagnostics?.some(
        (diagnostic) =>
          diagnostic.code === "SOURCE_FILE_SNAPSHOT_MISMATCH" &&
          diagnostic.location?.path === "projects/claim.form.ts"
      )
    ).toBe(true);
  });

  it("snapshots source authority before source inventory and fails closed when a source list mutates it", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedSourceUsageWorkspace(workspaceRoot, {
      mutateRootDuringList: true,
    });

    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const catalogPath = generated.sourceUsageCatalogPath;
    if (catalogPath === undefined) {
      throw new Error("Expected a source-usage catalog path.");
    }
    const catalog = parseAgentContextSourceUsageCatalog(
      JSON.parse(
        await readFile(join(workspaceRoot, catalogPath), "utf8")
      ) as unknown
    );

    expect(catalog.usages).toEqual([]);
    expect(
      generated.sourceUsageDiagnostics?.some(
        (diagnostic) =>
          diagnostic.code === "SOURCE_FILE_SNAPSHOT_MISMATCH" &&
          diagnostic.location?.path === "projects/claim.form.ts"
      )
    ).toBe(true);
  });

  it("rejects JavaScript project configs with a stable source-usage MVP boundary", async () => {
    for (const extension of ["mjs", "cjs"] as const) {
      const workspaceRoot = await createTemporaryWorkspace();
      await seedSourceUsageWorkspace(workspaceRoot);
      await writeModule(
        workspaceRoot,
        "formly-contracts.config.mjs",
        `export default {
          projectConfigs: ['projects/*.project.${extension}'],
          tsconfigPath: 'tsconfig.json',
          sourceUsage: {
            convention: 'direct-root-call-v1',
            tsconfigPath: 'tsconfig.json'
          }
        };`
      );
      await writeModule(
        workspaceRoot,
        `projects/forms.project.${extension}`,
        extension === "mjs"
          ? "export default { projectId: 'forms', sources: [] };\n"
          : "module.exports = { projectId: 'forms', sources: [] };\n"
      );

      await expect(
        runWorkspace(runnerOptions(workspaceRoot))
      ).rejects.toMatchObject({
        code: "SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED",
        phase: "extraction",
        projectId: "forms",
      });
    }
  });

  it("reports generated artifacts as current without rewriting them", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`
    );
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const indexPath = join(workspaceRoot, generated.indexPath);
    const artifactPath = join(workspaceRoot, generated.artifactPaths[0]!);
    const indexBytes = await readFile(indexPath, "utf8");
    const artifactBytes = await readFile(artifactPath, "utf8");

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked).toEqual({
      indexPath: generated.indexPath,
      artifactPaths: generated.artifactPaths,
      differences: [],
    });
    expect(await readFile(indexPath, "utf8")).toBe(indexBytes);
    expect(await readFile(artifactPath, "utf8")).toBe(artifactBytes);
  });

  it("changes project/root configuration hashes for host or lock provenance without changing form artifacts", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`
    );

    const first = await runWorkspace({
      ...runnerOptions(workspaceRoot),
      runtimeProvenance: runtimeProvenance(),
    });
    const firstArtifactBytes = await readFile(
      join(workspaceRoot, first.artifactPaths[0]!),
      "utf8"
    );
    const lockChanged = await runWorkspace({
      ...runnerOptions(workspaceRoot),
      runtimeProvenance: runtimeProvenance({
        lockHash: `sha256:${"b".repeat(64)}`,
      }),
    });
    const hostChanged = await runWorkspace({
      ...runnerOptions(workspaceRoot),
      runtimeProvenance: runtimeProvenance({ workerVersion: "0.1.1" }),
    });

    expect(lockChanged.index.projects[0]?.configurationHash).not.toBe(
      first.index.projects[0]?.configurationHash
    );
    expect(lockChanged.index.configurationHash).not.toBe(
      first.index.configurationHash
    );
    expect(hostChanged.index.projects[0]?.configurationHash).not.toBe(
      first.index.projects[0]?.configurationHash
    );
    expect(hostChanged.index.configurationHash).not.toBe(
      first.index.configurationHash
    );
    expect(lockChanged.artifactPaths).toEqual(first.artifactPaths);
    expect(hostChanged.artifactPaths).toEqual(first.artifactPaths);
    expect(
      await readFile(join(workspaceRoot, hostChanged.artifactPaths[0]!), "utf8")
    ).toBe(firstArtifactBytes);
  });

  it("normalizes set-like provenance before project and root configuration hashing", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default { projectId: 'forms' };`
    );
    const provenance: RuntimeProvenance = {
      ...runtimeProvenance(),
      tools: [
        { name: "@formly-contract/workspace", version: "0.1.0" },
        { name: "@formly-contract/compiler", version: "0.4.0" },
        { name: "@formly-contract/schema", version: "0.4.0" },
      ],
      loader: {
        ...runtimeProvenance().loader,
        options: {
          ...runtimeProvenance().loader.options,
          nativeModules: ["@angular/core", "@angular/compiler"],
        },
      },
      runtimePackages: [
        { name: "@ngx-formly/core", version: "6.1.8" },
        { name: "@angular/core", version: "20.3.29" },
      ],
    };
    const reordered: RuntimeProvenance = {
      ...provenance,
      tools: [...provenance.tools].reverse(),
      loader: {
        ...provenance.loader,
        options: {
          ...provenance.loader.options,
          nativeModules: [...provenance.loader.options.nativeModules].reverse(),
        },
      },
      runtimePackages: [...provenance.runtimePackages].reverse(),
    };

    const first = await runWorkspace({
      ...runnerOptions(workspaceRoot),
      runtimeProvenance: provenance,
    });
    const second = await runWorkspace({
      ...runnerOptions(workspaceRoot),
      runtimeProvenance: reordered,
    });

    expect(second.index.runtimeProvenance).toEqual(
      first.index.runtimeProvenance
    );
    expect(second.index.projects[0]?.configurationHash).toBe(
      first.index.projects[0]?.configurationHash
    );
    expect(second.index.configurationHash).toBe(first.index.configurationHash);
    expect(second.index.contentHash).toBe(first.index.contentHash);
  });

  it("reports missing artifacts without creating output", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`
    );

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked.differences).toEqual([
      { path: checked.artifactPaths[0], status: "missing" },
      { path: checked.indexPath, status: "missing" },
    ]);
    expect(await pathExists(join(workspaceRoot, "dist"))).toBe(false);
  });

  it("reports stale artifact bytes without replacing them", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`
    );
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const artifactPath = join(workspaceRoot, generated.artifactPaths[0]!);
    await writeFile(artifactPath, "stale artifact bytes\n");

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked.differences).toEqual([
      { path: generated.artifactPaths[0], status: "stale" },
    ]);
    expect(await readFile(artifactPath, "utf8")).toBe("stale artifact bytes\n");
  });

  it("reports distinct invalid UTF-8 bytes as stale without replacing them", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({
            fields: [{ key: 'name', type: 'input', props: { label: '\uFFFD' } }]
          })
        }] }]
      };`
    );
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const artifactPath = join(workspaceRoot, generated.artifactPaths[0]!);
    const artifactBytes = await readFile(artifactPath);
    const replacementCharacter = Buffer.from("\uFFFD");
    const replacementOffset = artifactBytes.indexOf(replacementCharacter);
    expect(replacementOffset).toBeGreaterThanOrEqual(0);
    const corruptedBytes = Buffer.concat([
      artifactBytes.subarray(0, replacementOffset),
      Buffer.from([0xff]),
      artifactBytes.subarray(replacementOffset + replacementCharacter.length),
    ]);
    await writeFile(artifactPath, corruptedBytes);

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked.differences).toEqual([
      { path: generated.artifactPaths[0], status: "stale" },
    ]);
    expect(await readFile(artifactPath)).toEqual(corruptedBytes);

    await expect(
      runWorkspace(runnerOptions(workspaceRoot))
    ).rejects.toMatchObject({
      code: "OUTPUT_WRITE_FAILED",
      phase: "output",
      outputPath: generated.artifactPaths[0],
    });
    await expect(
      checkWorkspace(runnerOptions(workspaceRoot))
    ).resolves.toMatchObject({
      differences: [{ path: generated.artifactPaths[0], status: "stale" }],
    });
    expect(await readFile(artifactPath)).toEqual(corruptedBytes);
  });

  it("rejects globally duplicate form IDs before invoking any factory or writing output", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [
          { sourceId: 'one', list: () => [{ id: 'duplicate.form', create: () => { throw new Error('factory must not run'); } }] },
          { sourceId: 'two', list: () => [{ id: 'duplicate.form', create: () => { throw new Error('factory must not run'); } }] }
        ]
      };`
    );

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
      expect.objectContaining({
        name: "WorkspaceGenerationError",
        code: "DUPLICATE_FORM_ID",
        phase: "inventory",
        formId: "duplicate.form",
      })
    );
    expect(await pathExists(join(workspaceRoot, "dist"))).toBe(false);
  });

  it.each([
    {
      label: "source listing",
      code: "SOURCE_LIST_FAILED",
      source: `{ sourceId: 'forms', list: () => { throw new Error('private list failure'); } }`,
    },
    {
      label: "form factory",
      code: "FORM_FACTORY_FAILED",
      source: `{ sourceId: 'forms', list: () => [{ id: 'claims.form', create: () => { throw new Error('private factory failure'); } }] }`,
    },
    {
      label: "diagnostic policy",
      code: "DIAGNOSTIC_POLICY_FAILED",
      rootExtra: `, diagnostics: { failOn: ['warning'] }`,
      source: `{ sourceId: 'forms', list: () => [{ id: 'claims.form', create: () => ({ fields: [{}] }) }] }`,
    },
  ])(
    "publishes no index when $label fails",
    async ({ code, rootExtra, source }) => {
      const workspaceRoot = await createTemporaryWorkspace();
      await seedRoot(workspaceRoot, rootExtra);
      await writeModule(
        workspaceRoot,
        "projects/forms.project.mjs",
        `export default { projectId: 'forms', sources: [${source}] };`
      );

      let captured: unknown;
      try {
        await runWorkspace(runnerOptions(workspaceRoot));
      } catch (error) {
        captured = error;
      }
      expect(captured).toEqual(
        expect.objectContaining({
          name: "WorkspaceGenerationError",
          code,
        })
      );
      expect(captured).toBeInstanceOf(WorkspaceGenerationError);
      expect((captured as Error).message).not.toContain("private");
      expect(
        await pathExists(
          join(workspaceRoot, "dist/formly-contracts/workspace-index.json")
        )
      ).toBe(false);
    }
  );

  it("preserves the prior successful index when a later generation fails", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{ id: 'stable.form', create: () => ({ fields: [{ key: 'name', type: 'input' }] }) }] }]
      };`
    );
    const successful = await runWorkspace(runnerOptions(workspaceRoot));
    const indexPath = join(workspaceRoot, successful.indexPath);
    const successfulBytes = await readFile(indexPath, "utf8");

    await writeModule(
      workspaceRoot,
      "formly-contracts.failed.config.mjs",
      `export default { projectConfigs: ['projects/failed.project.mjs'] };`
    );
    await writeModule(
      workspaceRoot,
      "projects/failed.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{ id: 'stable.form', create: () => { throw new Error('later failure'); } }] }]
      };`
    );

    await expect(
      runWorkspace({
        workspaceRoot,
        rootConfigPath: "formly-contracts.failed.config.mjs",
      })
    ).rejects.toEqual(expect.objectContaining({ code: "FORM_FACTORY_FAILED" }));
    expect(await readFile(indexPath, "utf8")).toBe(successfulBytes);
  });

  it("indexes only profile identity and enriches unmapped diagnostics with formly type provenance", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(
      workspaceRoot,
      `, plugins: [{
        id: 'fixture/plugin', version: '1.0.0', configSchemaVersion: '1',
        options: { forbiddenPluginSecret: 'do-not-emit' }
      }]`
    );
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        fieldTypeProfiles: {
          schemaVersion: '0.4.0', id: 'fixture.profiles', version: 1,
          profiles: [{
            identity: { id: 'fixture.text', version: 1 },
            semanticType: 'text', valueShape: 'scalar', evidence: 'declared',
            parts: [{ name: 'control', role: 'textbox', cardinality: 'one', evidence: 'declared' }],
            interaction: { kind: 'fill', operation: 'fill', controlPart: 'control' },
            valueDomain: { kind: 'not-applicable', evidence: 'declared' },
            driver: { kind: 'generic', id: 'generic.fill', version: 1, capabilities: ['fill'] },
            effectCapabilities: { targetProperties: [], readiness: [] },
            unknowns: []
          }],
          registrations: [{ formlyType: 'known-text', defaultProfile: { id: 'fixture.text', version: 1 }, variants: [] }],
          wrappers: []
        },
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'unmapped.form',
          create: () => ({
            fields: [{ key: 'mystery', type: 'cool-unregistered' }],
            model: { forbiddenModelSecret: 'do-not-emit' },
            formState: { forbiddenStateSecret: 'do-not-emit' }
          })
        }] }]
      };`
    );

    const result = await runWorkspace(runnerOptions(workspaceRoot));
    const serializedOutputs = (
      await Promise.all(
        [result.indexPath, ...result.artifactPaths].map((path) =>
          readFile(join(workspaceRoot, path), "utf8")
        )
      )
    ).join("\n");
    const project = result.index.projects[0];
    const profileIdentity = project?.fieldTypeProfileRegistry;
    const diagnostic = result.index.forms[0]?.diagnostics.find(
      ({ code }) => code === "UNMAPPED_FIELD_TYPE"
    );

    expect(profileIdentity?.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(profileIdentity).toEqual({
      schemaVersion: "0.4.0",
      id: "fixture.profiles",
      version: 1,
      contentHash: profileIdentity?.contentHash,
    });
    expect(diagnostic).toMatchObject({
      code: "UNMAPPED_FIELD_TYPE",
      formlyType: "cool-unregistered",
    });
    expect(result.index.plugins).toEqual([
      {
        id: "fixture/plugin",
        version: "1.0.0",
        configSchemaVersion: "1",
      },
    ]);
    expect(serializedOutputs).not.toContain("forbiddenModelSecret");
    expect(serializedOutputs).not.toContain("forbiddenStateSecret");
    expect(serializedOutputs).not.toContain("forbiddenPluginSecret");
  });

  it("resolves configured effects into artifacts and indexes their full semantics", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/effects.project.mjs",
      `export default {
        projectId: 'claims',
        crossFieldEffects: {
          schemaVersion: '0.4.0', id: 'fixture.claim-effects', version: 1,
          forms: [{
            formId: 'claims.intake', coverage: 'complete', effects: [{
              identity: { id: 'fixture.product-controls-details', version: 1 },
              trigger: { nodeId: 'claims.intake::path:s_product', event: 'selectionChanged' },
              target: { nodeId: 'claims.intake::path:s_details', property: 'visibility' },
              kind: 'controls-state', timing: { mode: 'sync' },
              ordering: 'source-before-target', evidence: 'declared', opacity: 'transparent'
            }]
          }]
        },
        sources: [{ sourceId: 'claims/forms', list: () => [{
          id: 'claims.intake',
          create: () => ({ fields: [
            { key: 'product', type: 'select', props: { options: [{ label: 'Auto', value: 'auto' }] } },
            { key: 'details', type: 'textarea' }
          ] })
        }] }]
      };`
    );

    const result = await runWorkspace(runnerOptions(workspaceRoot));
    const artifact = JSON.parse(
      await readFile(join(workspaceRoot, result.artifactPaths[0]!), "utf8")
    ) as Record<string, unknown>;

    expect(result.index.projects[0]?.crossFieldEffectRegistry).toMatchObject({
      schemaVersion: "0.4.0",
      id: "fixture.claim-effects",
      version: 1,
    });
    expect(result.index.forms[0]).toMatchObject({
      declaredEffects: [
        {
          identity: { id: "fixture.product-controls-details", version: 1 },
          trigger: {
            nodeId: "claims.intake::path:s_product",
            event: "selectionChanged",
          },
          target: {
            nodeId: "claims.intake::path:s_details",
            property: "visibility",
          },
          kind: "controls-state",
          timing: { mode: "sync" },
          ordering: "source-before-target",
          evidence: "declared",
          opacity: "transparent",
        },
      ],
      effectAnalysis: { completeness: "complete", reasons: [] },
    });
    expect(artifact).toMatchObject({
      declaredEffects: [
        {
          identity: {
            id: "fixture.product-controls-details",
            version: 1,
          },
        },
      ],
      effectAnalysis: { completeness: "complete", reasons: [] },
    });
  });

  it("honors CLI warning policy overrides", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        diagnostics: { failOn: [] },
        sources: [{ sourceId: 'forms', list: () => [{ id: 'warning.form', create: () => ({ fields: [{}] }) }] }]
      };`
    );

    await expect(
      runWorkspace({
        ...runnerOptions(workspaceRoot),
        cliOverrides: { failOn: ["warning"] },
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "DIAGNOSTIC_POLICY_FAILED",
        phase: "extraction",
        formId: "warning.form",
      })
    );
  });

  it("hashes plugin options without emitting their keys or values", async () => {
    const firstWorkspace = await createTemporaryWorkspace();
    const secondWorkspace = await createTemporaryWorkspace();
    for (const [workspaceRoot, optionValue] of [
      [firstWorkspace, "private-alpha"],
      [secondWorkspace, "private-beta"],
    ] as const) {
      await seedRoot(
        workspaceRoot,
        `, plugins: [{
          id: 'fixture/plugin', version: '1.0.0', configSchemaVersion: '1',
          options: { privateOptionKey: '${optionValue}' }
        }]`
      );
      await writeModule(
        workspaceRoot,
        "projects/forms.project.mjs",
        `export default {
          projectId: 'forms',
          sources: [{ sourceId: 'forms', list: () => [{
            id: 'stable.form',
            create: () => ({ fields: [{ key: 'name', type: 'input' }] })
          }] }]
        };`
      );
    }

    const first = await runWorkspace(runnerOptions(firstWorkspace));
    const second = await runWorkspace(runnerOptions(secondWorkspace));
    const serializedOutputs = (
      await Promise.all([
        ...[first.indexPath, ...first.artifactPaths].map((path) =>
          readFile(join(firstWorkspace, path), "utf8")
        ),
        ...[second.indexPath, ...second.artifactPaths].map((path) =>
          readFile(join(secondWorkspace, path), "utf8")
        ),
      ])
    ).join("\n");

    expect(first.index.configurationHash).not.toBe(
      second.index.configurationHash
    );
    expect(first.index.projects[0]?.configurationHash).not.toBe(
      second.index.projects[0]?.configurationHash
    );
    expect(serializedOutputs).not.toContain("privateOptionKey");
    expect(serializedOutputs).not.toContain("private-alpha");
    expect(serializedOutputs).not.toContain("private-beta");
  });

  it("keeps project output paths contained within the workspace", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        output: { directory: '../outside' },
        sources: [{ sourceId: 'forms', list: () => [] }]
      };`
    );

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
      expect.objectContaining({
        name: "WorkspaceGenerationError",
        code: "OUTPUT_PATH_OUTSIDE_WORKSPACE",
      })
    );
  });

  it("canonicalizes safe output-directory spellings before hashing and indexing", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(
      workspaceRoot,
      `, output: { directory: './dist//contracts/' }`
    );
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`
    );

    const result = await runWorkspace(runnerOptions(workspaceRoot));

    expect(result.indexPath).toBe("dist/contracts/workspace-index.json");
    expect(result.index.projects[0]?.outputDirectory).toBe("dist/contracts");
    expect(result.artifactPaths[0]).toMatch(/^dist\/contracts\/projects\//u);
  });

  it.each([
    ["", "WORKSPACE_DISCOVERY_FAILED"],
    ["./", "WORKSPACE_DISCOVERY_FAILED"],
    ["././", "WORKSPACE_DISCOVERY_FAILED"],
    [".\\", "WORKSPACE_DISCOVERY_FAILED"],
    ["dist/**", "WORKSPACE_DISCOVERY_FAILED"],
    ["dist/../other", "WORKSPACE_DISCOVERY_FAILED"],
    ["../outside", "OUTPUT_PATH_OUTSIDE_WORKSPACE"],
    ["/outside", "OUTPUT_PATH_OUTSIDE_WORKSPACE"],
  ])(
    "classifies invalid root output directory %j as %s",
    async (outputDirectory, code) => {
      const workspaceRoot = await createTemporaryWorkspace();
      await seedRoot(
        workspaceRoot,
        `, output: { directory: ${JSON.stringify(outputDirectory)} }`
      );

      await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
        expect.objectContaining({
          name: "WorkspaceGenerationError",
          code,
          phase: "inventory",
        })
      );
    }
  );

  it("rejects symlinked output components without writing through them", async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    const outside = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      "projects/forms.project.mjs",
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{ id: 'claims.form', create: () => ({ fields: [{ key: 'name', type: 'input' }] }) }] }]
      };`
    );
    await mkdir(join(workspaceRoot, "dist"), { recursive: true });
    await symlink(outside, join(workspaceRoot, "dist/formly-contracts"));

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
      expect.objectContaining({
        code: "OUTPUT_SYMLINK_UNSUPPORTED",
        phase: "output",
      })
    );
    expect(await readdir(outside)).toEqual([]);
  });
});
