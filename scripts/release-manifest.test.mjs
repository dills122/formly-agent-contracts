import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  loadReleaseManifest,
  npmTagForVersion,
} from './release-manifest.mjs';

const REPOSITORY_URL =
  'git+https://github.com/dills122/formly-contract.git';
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function writePackage(rootDirectory, directory, manifest) {
  const packageDirectory = join(rootDirectory, directory);
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(
    join(packageDirectory, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

async function createReleaseWorkspace(overrides = {}) {
  const rootDirectory = await mkdtemp(
    join(tmpdir(), 'formly-agent-release-manifest-'),
  );
  temporaryDirectories.push(rootDirectory);
  const version = overrides.version ?? '0.4.0';

  await mkdir(join(rootDirectory, 'apps'), { recursive: true });

  await writePackage(rootDirectory, '.', {
    name: 'formly-contract',
    version: '0.0.0',
    private: true,
  });
  await writePackage(rootDirectory, 'packages/contract-schema', {
    name: '@formly-contract/contract-schema',
    version,
    description: 'Contract schema.',
    license: 'MIT',
    files: ['dist'],
    exports: {
      '.': {
        types: './dist/index.d.ts',
        default: './dist/index.js',
      },
    },
    repository: {
      type: 'git',
      url: REPOSITORY_URL,
      directory: 'packages/contract-schema',
    },
    publishConfig: {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    },
    ...overrides.contractSchema,
  });
  await writePackage(rootDirectory, 'packages/formly-adapter', {
    name: '@formly-contract/formly-adapter',
    version,
    description: 'Formly adapter.',
    license: 'MIT',
    files: ['dist'],
    exports: {
      '.': {
        types: './dist/index.d.ts',
        default: './dist/index.js',
      },
    },
    repository: {
      type: 'git',
      url: REPOSITORY_URL,
      directory: 'packages/formly-adapter',
    },
    publishConfig: {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    },
    dependencies: {
      '@formly-contract/contract-schema': 'workspace:*',
    },
    peerDependencies: {
      '@ngx-formly/core': '>=6.0.0 <7.0.0',
    },
    ...overrides.formlyAdapter,
  });
  await writePackage(rootDirectory, 'fixtures/synthetic-form', {
    name: '@formly-contract/synthetic-form',
    version: '0.0.0',
    private: overrides.syntheticFormPrivate ?? true,
  });

  return rootDirectory;
}

describe('loadReleaseManifest', () => {
  it('returns the synchronized public package release', async () => {
    const rootDirectory = await createReleaseWorkspace();

    const release = await loadReleaseManifest({
      rootDirectory,
      tag: 'v0.4.0',
    });

    expect(release).toEqual({
      version: '0.4.0',
      npmTag: 'latest',
      packages: [
        {
          directory: 'packages/contract-schema',
          name: '@formly-contract/contract-schema',
          version: '0.4.0',
        },
        {
          directory: 'packages/formly-adapter',
          name: '@formly-contract/formly-adapter',
          version: '0.4.0',
        },
      ],
    });
  });

  it('rejects package versions that are not synchronized', async () => {
    const rootDirectory = await createReleaseWorkspace({
      formlyAdapter: { version: '0.4.1' },
    });

    await expect(loadReleaseManifest({ rootDirectory })).rejects.toThrow(
      'Published package versions must match',
    );
  });

  it('rejects a tag that does not match the synchronized version', async () => {
    const rootDirectory = await createReleaseWorkspace();

    await expect(
      loadReleaseManifest({ rootDirectory, tag: 'v0.4.1' }),
    ).rejects.toThrow('Release tag v0.4.1 must equal v0.4.0');
  });

  it('rejects incomplete public package metadata', async () => {
    const rootDirectory = await createReleaseWorkspace({
      contractSchema: {
        publishConfig: { access: 'restricted' },
      },
    });

    await expect(loadReleaseManifest({ rootDirectory })).rejects.toThrow(
      'packages/contract-schema must publish publicly to the npm registry',
    );
  });

  it('rejects an adapter without the supported Formly 6.x peer range', async () => {
    const rootDirectory = await createReleaseWorkspace({
      formlyAdapter: {
        peerDependencies: { '@ngx-formly/core': '6.1.8' },
      },
    });

    await expect(loadReleaseManifest({ rootDirectory })).rejects.toThrow(
      'packages/formly-adapter must declare the supported Formly 6.x peer range',
    );
  });

  it('rejects unlisted workspace packages that are not private', async () => {
    const rootDirectory = await createReleaseWorkspace({
      syntheticFormPrivate: false,
    });

    await expect(loadReleaseManifest({ rootDirectory })).rejects.toThrow(
      'fixtures/synthetic-form must remain private',
    );
  });
});

describe('npmTagForVersion', () => {
  it('uses latest for stable versions', () => {
    expect(npmTagForVersion('1.2.3')).toBe('latest');
  });

  it('uses next for prerelease versions', () => {
    expect(npmTagForVersion('1.2.3-rc.1')).toBe('next');
  });
});
