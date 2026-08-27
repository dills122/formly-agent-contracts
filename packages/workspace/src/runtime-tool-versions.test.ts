import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { readRuntimeToolVersions } from './runtime-tool-versions.js';

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'runtime tool versions '));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`);
}

async function seedResolvedPackage(
  root: string,
  directory: string,
  name: string,
  version: string,
): Promise<string> {
  const packageRoot = join(root, directory);
  const entryPath = join(packageRoot, 'dist/index.js');
  await writeJson(join(packageRoot, 'package.json'), { name, version });
  await mkdir(dirname(entryPath), { recursive: true });
  await writeFile(entryPath, 'export {};\n');
  return pathToFileURL(entryPath).href;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('runtime tool versions', () => {
  it('reads the resolved package manifests instead of dependency declarations', async () => {
    const root = await createTemporaryDirectory();
    const workspaceManifestPath = join(root, 'workspace/package.json');
    await writeJson(workspaceManifestPath, {
      name: '@formly-contract/workspace',
      version: '0.1.0',
      dependencies: {
        '@formly-contract/compiler': '0.4.0',
        '@formly-contract/schema': '0.4.0',
        jiti: '2.7.0',
      },
    });
    const resolvedEntries = new Map([
      [
        '@formly-contract/compiler',
        await seedResolvedPackage(
          root,
          'resolved/compiler',
          '@formly-contract/compiler',
          '9.1.0',
        ),
      ],
      [
        '@formly-contract/schema',
        await seedResolvedPackage(
          root,
          'resolved/schema',
          '@formly-contract/schema',
          '9.2.0',
        ),
      ],
      [
        'jiti',
        await seedResolvedPackage(root, 'resolved/jiti', 'jiti', '9.3.0'),
      ],
    ]);

    await expect(
      readRuntimeToolVersions({
        workspaceManifestUrl: pathToFileURL(workspaceManifestPath),
        resolveModule: (name) => {
          const entry = resolvedEntries.get(name);
          if (entry === undefined) {
            throw new Error(`Unexpected module ${name}`);
          }
          return entry;
        },
      }),
    ).resolves.toEqual({
      workspaceVersion: '0.1.0',
      compilerVersion: '9.1.0',
      schemaVersion: '9.2.0',
      jitiVersion: '9.3.0',
    });
  });
});
