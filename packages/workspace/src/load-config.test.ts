import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import {
  loadWorkspaceProjectConfig,
  loadWorkspaceRootConfig,
} from './load-config.js';

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'formly-workspace-load-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('typed workspace config loading', () => {
  it('loads and validates root and project config files', async () => {
    const workspaceRoot = await createTemporaryDirectory();
    const rootConfigPath = join(workspaceRoot, 'formly-contracts.config.ts');
    const projectConfigPath = join(
      workspaceRoot,
      'apps',
      'claims',
      'formly-contracts.project.ts',
    );
    await mkdir(join(workspaceRoot, 'apps', 'claims'), { recursive: true });
    await writeFile(
      rootConfigPath,
      `export default { projectConfigs: ['apps/**/formly-contracts.project.ts'] };`,
    );
    await writeFile(
      projectConfigPath,
      `export default { projectId: 'claims', sources: [{ sourceId: 'claims/forms', list: () => [] }] };`,
    );

    await expect(loadWorkspaceRootConfig(rootConfigPath)).resolves.toEqual({
      projectConfigs: ['apps/**/formly-contracts.project.ts'],
    });
    await expect(
      loadWorkspaceProjectConfig(projectConfigPath),
    ).resolves.toEqual(expect.objectContaining({ projectId: 'claims' }));
  });

  it('retains stable runtime-validation errors from loaded config files', async () => {
    const workspaceRoot = await createTemporaryDirectory();
    const configPath = join(workspaceRoot, 'formly-contracts.config.ts');
    await writeFile(
      configPath,
      `export default { projectConfigs: ['../outside/project.ts'] };`,
    );

    await expect(loadWorkspaceRootConfig(configPath)).rejects.toMatchObject({
      name: 'WorkspaceConfigValidationError',
      code: 'CONFIG_INVALID',
      path: 'root.projectConfigs[0]',
    });
  });
});
