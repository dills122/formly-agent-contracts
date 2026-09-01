import { canonicalStringify } from '@formly-contract/schema';
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  discoverWorkspaceProjects,
  WorkspaceDiscoveryError,
} from './discover-projects.js';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const temporaryDirectories: string[] = [];

async function createTemporaryWorkspace(): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), 'formly workspace discovery '),
  );
  temporaryDirectories.push(directory);
  return directory;
}

async function writeModule(
  workspaceRoot: string,
  relativePath: string,
  source: string,
): Promise<void> {
  const path = join(workspaceRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('workspace project discovery', () => {
  it('expands includes and exclusions into a provenance-rich sorted inventory', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default {
        projectConfigs: [
          'packages/**/formly-contracts.project.ts',
          'libs/**/formly-contracts.project.ts',
          'apps/**/formly-contracts.project.ts'
        ],
        excludeProjectConfigs: ['apps/excluded/**'],
        plugins: [
          { id: 'z/plugin', version: '2', configSchemaVersion: '1' },
          { id: 'a/plugin', version: '1', configSchemaVersion: '1', options: { enabled: true } }
        ]
      };`,
    );
    await writeModule(
      workspaceRoot,
      'apps/zeta/formly-contracts.project.ts',
      `export default {
        projectId: 'zeta',
        sources: [
          { sourceId: 'zeta/two', list: () => [] },
          { sourceId: 'zeta/one', list: () => [] }
        ]
      };`,
    );
    await writeModule(
      workspaceRoot,
      'apps/excluded/formly-contracts.project.ts',
      `throw new Error('excluded configs must not be imported');`,
    );
    await writeModule(
      workspaceRoot,
      'libs/with spaces/formly-contracts.project.ts',
      `export default { projectId: 'alpha' };`,
    );
    await writeModule(
      workspaceRoot,
      'packages/tools/formly-contracts.project.ts',
      `export default { projectId: 'tools' };`,
    );

    const discovered = await discoverWorkspaceProjects({
      workspaceRoot,
      rootConfigPath: 'formly-contracts.config.ts',
    });

    expect(discovered.inventory).toEqual({
      schemaVersion: '0.2.0',
      rootConfigPath: 'formly-contracts.config.ts',
      plugins: [
        {
          id: 'a/plugin',
          version: '1',
          configSchemaVersion: '1',
        },
        { id: 'z/plugin', version: '2', configSchemaVersion: '1' },
      ],
      projects: [
        {
          configPath: 'apps/zeta/formly-contracts.project.ts',
          projectId: 'zeta',
          sourceIds: ['zeta/one', 'zeta/two'],
        },
        {
          configPath: 'libs/with spaces/formly-contracts.project.ts',
          projectId: 'alpha',
          sourceIds: [],
        },
        {
          configPath: 'packages/tools/formly-contracts.project.ts',
          projectId: 'tools',
          sourceIds: [],
        },
      ],
    });
    expect(discovered.projects.map(({ configPath }) => configPath)).toEqual(
      discovered.inventory.projects.map(({ configPath }) => configPath),
    );
    expect(discovered.root.config.plugins?.[1]?.options).toEqual({
      enabled: true,
    });
  });

  it('accepts an empty workspace and produces identical canonical inventories', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default { projectConfigs: ['apps/**/formly-contracts.project.ts'] };`,
    );

    const first = await discoverWorkspaceProjects({
      workspaceRoot,
      rootConfigPath: 'formly-contracts.config.ts',
    });
    const second = await discoverWorkspaceProjects({
      workspaceRoot,
      rootConfigPath: 'formly-contracts.config.ts',
    });

    expect(first.inventory.projects).toEqual([]);
    expect(canonicalStringify(first.inventory)).toBe(
      canonicalStringify(second.inventory),
    );
  });

  it.each([
    ['a dependency', '', 'apps/valid/node_modules'],
    ['VCS metadata', '', 'apps/valid/.git'],
    ['the default output', '', 'dist/formly-contracts'],
    [
      'a configured output',
      `, output: { directory: 'generated/contracts' }`,
      'generated/contracts',
    ],
  ] as const)(
    'does not inspect %s tree',
    async (_description, outputConfig, internalDirectoryPath) => {
      const workspaceRoot = await createTemporaryWorkspace();
      await writeModule(
        workspaceRoot,
        'formly-contracts.config.ts',
        `export default {
          projectConfigs: ['**/formly-contracts.project.ts']${outputConfig}
        };`,
      );
      await writeModule(
        workspaceRoot,
        'apps/valid/formly-contracts.project.ts',
        `export default { projectId: 'valid' };`,
      );

      const internalDirectory = join(workspaceRoot, internalDirectoryPath);
      await mkdir(internalDirectory, { recursive: true });
      await chmod(internalDirectory, 0o000);

      try {
        await expect(
          discoverWorkspaceProjects({
            workspaceRoot,
            rootConfigPath: 'formly-contracts.config.ts',
          }),
        ).resolves.toMatchObject({
          inventory: {
            projects: [{ projectId: 'valid' }],
          },
        });
      } finally {
        await chmod(internalDirectory, 0o700);
      }
    },
  );

  it('keeps project-owned dist directories discoverable', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default { projectConfigs: ['**/formly-contracts.project.ts'] };`,
    );
    await writeModule(
      workspaceRoot,
      'apps/dist/formly-contracts.project.ts',
      `export default { projectId: 'project-owned-dist' };`,
    );

    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
      }),
    ).resolves.toMatchObject({
      inventory: {
        projects: [{ projectId: 'project-owned-dist' }],
      },
    });
  });

  it.each([
    [
      'project',
      'DUPLICATE_PROJECT_ID',
      `export default { projectId: 'duplicate', sources: [{ sourceId: 'one', list: () => { throw new Error('source list executed'); } }] };`,
      `export default { projectId: 'duplicate', sources: [{ sourceId: 'two', list: () => { throw new Error('source list executed'); } }] };`,
    ],
    [
      'source',
      'DUPLICATE_SOURCE_ID',
      `export default { projectId: 'one', sources: [{ sourceId: 'duplicate/source', list: () => { throw new Error('source list executed'); } }] };`,
      `export default { projectId: 'two', sources: [{ sourceId: 'duplicate/source', list: () => { throw new Error('source list executed'); } }] };`,
    ],
  ] as const)(
    'rejects duplicate %s IDs before any source list executes',
    async (_kind, expectedCode, firstProject, secondProject) => {
      const workspaceRoot = await createTemporaryWorkspace();
      await writeModule(
        workspaceRoot,
        'formly-contracts.config.ts',
        `export default { projectConfigs: ['projects/**/formly-contracts.project.ts'] };`,
      );
      await writeModule(
        workspaceRoot,
        'projects/b/formly-contracts.project.ts',
        secondProject,
      );
      await writeModule(
        workspaceRoot,
        'projects/a/formly-contracts.project.ts',
        firstProject,
      );

      await expect(
        discoverWorkspaceProjects({
          workspaceRoot,
          rootConfigPath: 'formly-contracts.config.ts',
        }),
      ).rejects.toMatchObject({
        name: 'WorkspaceDiscoveryError',
        code: expectedCode,
        configPaths: [
          'projects/a/formly-contracts.project.ts',
          'projects/b/formly-contracts.project.ts',
        ],
      });
    },
  );

  it('rejects an external project-config leaf symlink without traversing it', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    const outsideRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default { projectConfigs: ['apps/**/formly-contracts.project.ts'] };`,
    );
    await writeModule(
      outsideRoot,
      'formly-contracts.project.ts',
      `export default { projectId: 'outside' };`,
    );
    await mkdir(join(workspaceRoot, 'apps', 'linked'), { recursive: true });
    await symlink(
      join(outsideRoot, 'formly-contracts.project.ts'),
      join(workspaceRoot, 'apps', 'linked', 'formly-contracts.project.ts'),
    );

    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
      }),
    ).rejects.toMatchObject({
      name: 'WorkspaceDiscoveryError',
      code: 'PROJECT_CONFIG_SYMLINK_UNSUPPORTED',
      configPaths: ['apps/linked/formly-contracts.project.ts'],
    });
  });

  it('does not let an in-workspace symlink bypass project-config exclusions', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default {
        projectConfigs: ['apps/**/formly-contracts.project.ts'],
        excludeProjectConfigs: ['apps/excluded/**']
      };`,
    );
    await writeModule(
      workspaceRoot,
      'apps/excluded/formly-contracts.project.ts',
      `export default { projectId: 'must-remain-excluded' };`,
    );
    await mkdir(join(workspaceRoot, 'apps', 'included'), { recursive: true });
    await symlink(
      join(workspaceRoot, 'apps', 'excluded', 'formly-contracts.project.ts'),
      join(workspaceRoot, 'apps', 'included', 'formly-contracts.project.ts'),
    );

    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
      }),
    ).rejects.toMatchObject({
      name: 'WorkspaceDiscoveryError',
      code: 'PROJECT_CONFIG_SYMLINK_UNSUPPORTED',
      configPaths: ['apps/included/formly-contracts.project.ts'],
    });
  });

  it('does not inspect an excluded directory containing a matching symlink', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    const outsideRoot = await createTemporaryWorkspace();
    const excludedDirectory = join(workspaceRoot, 'apps', 'excluded');
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default {
        projectConfigs: ['apps/**/formly-contracts.project.ts'],
        excludeProjectConfigs: ['apps/excluded/**']
      };`,
    );
    await writeModule(
      outsideRoot,
      'formly-contracts.project.ts',
      `throw new Error('excluded symlink target was imported');`,
    );
    await mkdir(excludedDirectory, { recursive: true });
    await symlink(
      join(outsideRoot, 'formly-contracts.project.ts'),
      join(excludedDirectory, 'formly-contracts.project.ts'),
    );
    await chmod(excludedDirectory, 0o000);

    try {
      await expect(
        discoverWorkspaceProjects({
          workspaceRoot,
          rootConfigPath: 'formly-contracts.config.ts',
        }),
      ).resolves.toMatchObject({ inventory: { projects: [] } });
    } finally {
      await chmod(excludedDirectory, 0o700);
    }
  });

  it('does not traverse a symlinked directory while looking for project configs', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    const outsideRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default { projectConfigs: ['apps/**/formly-contracts.project.ts'] };`,
    );
    await writeModule(
      outsideRoot,
      'nested/formly-contracts.project.ts',
      `throw new Error('external symlink directory was traversed');`,
    );
    await mkdir(join(workspaceRoot, 'apps'), { recursive: true });
    await symlink(
      join(outsideRoot, 'nested'),
      join(workspaceRoot, 'apps', 'external'),
    );

    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
      }),
    ).resolves.toMatchObject({ inventory: { projects: [] } });
  });

  it.each(['relative', 'absolute'] as const)(
    'rejects an %s root config path outside the workspace before importing it',
    async (pathKind) => {
      const workspaceRoot = await createTemporaryWorkspace();
      const outsideRoot = await createTemporaryWorkspace();
      const outsideConfigPath = join(outsideRoot, 'outside.config.ts');
      await writeFile(
        outsideConfigPath,
        `throw new Error('outside root config was imported');`,
      );
      const rootConfigPath =
        pathKind === 'absolute'
          ? outsideConfigPath
          : relative(workspaceRoot, outsideConfigPath);

      await expect(
        discoverWorkspaceProjects({ workspaceRoot, rootConfigPath }),
      ).rejects.toMatchObject({
        name: 'WorkspaceDiscoveryError',
        code: 'CONFIG_PATH_OUTSIDE_WORKSPACE',
      });
    },
  );

  it('retains the stable loader error for a missing root config', async () => {
    const workspaceRoot = await createTemporaryWorkspace();

    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'missing.config.ts',
      }),
    ).rejects.toMatchObject({
      name: 'WorkspaceConfigLoadError',
      code: 'CONFIG_NOT_FOUND',
    });
  });

  it('reports project-local load failures while retaining healthy inventory', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default { projectConfigs: ['projects/*.project.ts'] };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/broken.project.ts',
      `throw new Error('private Angular loader detail');`,
    );
    await writeModule(
      workspaceRoot,
      'projects/healthy.project.ts',
      `export default { projectId: 'healthy', sources: [{ sourceId: 'healthy/forms', list: () => [] }] };`,
    );

    const discovered = await discoverWorkspaceProjects({
      workspaceRoot,
      rootConfigPath: 'formly-contracts.config.ts',
      continueOnProjectError: true,
    });

    expect(discovered.inventory.projects).toEqual([
      {
        configPath: 'projects/healthy.project.ts',
        projectId: 'healthy',
        sourceIds: ['healthy/forms'],
      },
    ]);
    expect(discovered.failures).toEqual([
      {
        code: 'PROJECT_CONFIG_LOAD_FAILED',
        configPath: 'projects/broken.project.ts',
      },
    ]);
    expect(canonicalStringify(discovered.failures)).not.toContain(
      'private Angular loader detail',
    );
  });

  it('loads only explicitly selected project-config paths', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default { projectConfigs: ['projects/*.project.ts'] };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/broken.project.ts',
      `throw new Error('must not be imported');`,
    );
    await writeModule(
      workspaceRoot,
      'projects/healthy.project.ts',
      `export default { projectId: 'healthy' };`,
    );

    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
        selectedProjectConfigPaths: ['projects/healthy.project.ts'],
      }),
    ).resolves.toMatchObject({
      inventory: { projects: [{ projectId: 'healthy' }] },
    });
  });

  it('selects loaded projects by stable ID and rejects unknown selections', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default { projectConfigs: ['projects/*.project.ts'] };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/alpha.project.ts',
      `export default { projectId: 'alpha' };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/beta.project.ts',
      `export default { projectId: 'beta' };`,
    );

    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
        selectedProjectIds: ['beta'],
      }),
    ).resolves.toMatchObject({
      inventory: { projects: [{ projectId: 'beta' }] },
    });
    await expect(
      discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
        selectedProjectIds: ['missing'],
      }),
    ).rejects.toMatchObject({
      code: 'PROJECT_CONFIG_NOT_FOUND',
      identity: 'missing',
    });
  });

  it('rejects mixed project ID and config-path selection', async () => {
    await expect(
      discoverWorkspaceProjects({
        workspaceRoot: '/unused',
        rootConfigPath: 'formly-contracts.config.ts',
        selectedProjectIds: ['healthy'],
        selectedProjectConfigPaths: ['projects/healthy.project.ts'],
      }),
    ).rejects.toMatchObject({ code: 'PROJECT_SELECTION_INVALID' });
  });

  it.each(['angular-monorepo', 'nx-workspace'])(
    'discovers the %s consumer fixture through its declared tsconfig aliases',
    async (fixtureName) => {
      const workspaceRoot = resolve(repositoryRoot, 'fixtures', fixtureName);

      const discovered = await discoverWorkspaceProjects({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.config.ts',
        rootLoaderOptions: {
          tsconfigPath: resolve(workspaceRoot, 'tsconfig.json'),
        },
      });

      expect(discovered.projects).toHaveLength(4);
      expect(
        discovered.inventory.projects.map(({ configPath }) => configPath),
      ).toEqual([
        'apps/test-app/formly-contracts.project.ts',
        'libs/feature-lib/formly-contracts.project.ts',
        'libs/formly-kit/formly-contracts.project.ts',
        'libs/forms-kit/formly-contracts.project.ts',
      ]);
      expect(discovered.inventory.plugins).toHaveLength(1);
    },
    20_000,
  );

  it('exposes a typed discovery error', () => {
    const error = new WorkspaceDiscoveryError(
      'DUPLICATE_PROJECT_ID',
      'Duplicate project ID "claims".',
      ['apps/a/project.ts', 'apps/b/project.ts'],
      'claims',
    );

    expect(error).toMatchObject({
      name: 'WorkspaceDiscoveryError',
      code: 'DUPLICATE_PROJECT_ID',
      identity: 'claims',
      configPaths: ['apps/a/project.ts', 'apps/b/project.ts'],
    });
  });
});
