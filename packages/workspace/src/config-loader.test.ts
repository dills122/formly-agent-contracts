import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadWorkspaceConfigModule,
  WorkspaceConfigLoadError,
} from './config-loader.js';

const fixtureDirectory = fileURLToPath(
  new URL('../../../fixtures/workspace-config-loader/', import.meta.url),
);

function fixturePath(relativePath: string): string {
  return resolve(fixtureDirectory, relativePath);
}

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
