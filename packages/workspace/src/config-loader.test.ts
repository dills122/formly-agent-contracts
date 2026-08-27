import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  loadWorkspaceConfigModule,
  WorkspaceConfigLoadError,
} from './config-loader.js';

const fixtureDirectory = fileURLToPath(
  new URL('../../../fixtures/workspace-config-loader/', import.meta.url),
);
const temporaryDirectories: string[] = [];

function fixturePath(relativePath: string): string {
  return resolve(fixtureDirectory, relativePath);
}

async function writeModule(path: string, source: string): Promise<void> {
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

describe('loadWorkspaceConfigModule', () => {
  it.each([
    ['ESM JavaScript', 'configs/esm.mjs', 'esm'],
    ['CommonJS', 'configs/commonjs.cjs', 'commonjs'],
    ['TypeScript', 'configs/typescript.ts', 'typescript'],
  ])('loads %s default exports', async (_label, path, expectedFormat) => {
    const result = await loadWorkspaceConfigModule(fixturePath(path));

    expect(result).toEqual({ format: expectedFormat });
  });

  it('resolves TypeScript path aliases only with an explicit tsconfig', async () => {
    const configPath = fixturePath('configs/aliased.ts');

    await expect(loadWorkspaceConfigModule(configPath)).rejects.toMatchObject({
      code: 'CONFIG_LOAD_FAILED',
    });

    await expect(
      loadWorkspaceConfigModule(configPath, {
        tsconfigPath: fixturePath('tsconfig.json'),
      }),
    ).resolves.toEqual({ format: 'path-alias' });
  });

  it('resolves packages from the consuming workspace instead of the loader installation', async () => {
    const workspaceRoot = await mkdtemp(
      join(tmpdir(), 'formly-linked-consumer-'),
    );
    temporaryDirectories.push(workspaceRoot);
    const packageRoot = join(
      workspaceRoot,
      'node_modules',
      '@consumer',
      'forms-ui-kit',
    );
    await writeModule(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@consumer/forms-ui-kit',
        type: 'module',
        exports: './index.js',
      }),
    );
    await writeModule(
      join(packageRoot, 'index.js'),
      `export const consumerValue = 'consumer-package';`,
    );
    const configPath = join(
      workspaceRoot,
      'apps',
      'claims',
      'formly-contracts.project.ts',
    );
    await writeModule(
      configPath,
      `import { consumerValue } from '@consumer/forms-ui-kit';
       export default { format: consumerValue };`,
    );

    await expect(loadWorkspaceConfigModule(configPath)).resolves.toEqual({
      format: 'consumer-package',
    });
  });

  it('resolves exact scoped aliases from a consuming workspace tsconfig', async () => {
    const workspaceRoot = await mkdtemp(
      join(tmpdir(), 'formly-scoped-alias-consumer-'),
    );
    temporaryDirectories.push(workspaceRoot);
    const tsconfigPath = join(workspaceRoot, 'tsconfig.base.json');
    await writeModule(
      tsconfigPath,
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          module: 'esnext',
          moduleResolution: 'node',
          paths: {
            '@consumer/forms-ui-kit': [
              'libs/forms-ui-kit/src/contracts-shim.ts',
            ],
            '@consumer/utils': ['libs/utils/src/contracts-shim.ts'],
          },
        },
      }),
    );
    await writeModule(
      join(workspaceRoot, 'libs', 'utils', 'src', 'contracts-shim.ts'),
      `export const utilityValue = 'scoped-alias';`,
    );
    await writeModule(
      join(
        workspaceRoot,
        'libs',
        'forms-ui-kit',
        'src',
        'contracts-shim.ts',
      ),
      `export { utilityValue as consumerValue } from '@consumer/utils';`,
    );
    const configPath = join(
      workspaceRoot,
      'apps',
      'claims',
      'formly-contracts.project.ts',
    );
    await writeModule(
      configPath,
      `import { consumerValue } from '@consumer/forms-ui-kit';
       export default { format: consumerValue };`,
    );

    await expect(
      loadWorkspaceConfigModule(configPath, { tsconfigPath }),
    ).resolves.toEqual({ format: 'scoped-alias' });
  });

  it('reports a stable error for a missing config file', async () => {
    const configPath = fixturePath('configs/missing.ts');

    await expect(loadWorkspaceConfigModule(configPath)).rejects.toEqual(
      expect.objectContaining({
        name: 'WorkspaceConfigLoadError',
        code: 'CONFIG_NOT_FOUND',
        configPath,
      }),
    );
  });

  it('reports a stable error for a malformed default export', async () => {
    const configPath = fixturePath('configs/malformed.ts');

    await expect(loadWorkspaceConfigModule(configPath)).rejects.toEqual(
      expect.objectContaining({
        name: 'WorkspaceConfigLoadError',
        code: 'CONFIG_EXPORT_INVALID',
        configPath,
      }),
    );
  });

  it('requires an explicit default export from ESM configs', async () => {
    const configPath = fixturePath('configs/named-only.mjs');

    await expect(loadWorkspaceConfigModule(configPath)).rejects.toEqual(
      expect.objectContaining({
        code: 'CONFIG_EXPORT_INVALID',
        configPath,
      }),
    );
  });

  it('exposes a typed load error without leaking loader internals', () => {
    const error = new WorkspaceConfigLoadError(
      'CONFIG_LOAD_FAILED',
      '/workspace/formly-contracts.config.ts',
      'Unable to load workspace config.',
    );

    expect(error).toMatchObject({
      name: 'WorkspaceConfigLoadError',
      code: 'CONFIG_LOAD_FAILED',
      configPath: '/workspace/formly-contracts.config.ts',
      message: 'Unable to load workspace config.',
    });
  });
});
