import { describe, expect, it } from 'vitest';

import { verifyPackedPackage } from './pack-release.mjs';

const releasePackage = {
  directory: 'packages/formly-adapter',
  name: '@formly-contract/formly-adapter',
  version: '0.4.0',
};

function createPackedManifest(overrides = {}) {
  return {
    name: releasePackage.name,
    version: releasePackage.version,
    description: 'Formly adapter.',
    license: 'MIT',
    type: 'module',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        default: './dist/index.js',
      },
    },
    files: ['dist'],
    dependencies: {
      '@formly-contract/contract-schema': '0.4.0',
    },
    peerDependencies: {
      '@ngx-formly/core': '>=6.0.0 <7.0.0',
    },
    repository: {
      type: 'git',
      url: 'git+https://github.com/dills122/formly-contract.git',
      directory: releasePackage.directory,
    },
    publishConfig: {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    },
    ...overrides,
  };
}

const packedFiles = [
  { path: 'LICENSE' },
  { path: 'README.md' },
  { path: 'dist/extract-form.d.ts' },
  { path: 'dist/extract-form.js' },
  { path: 'dist/index.d.ts' },
  { path: 'dist/index.js' },
  { path: 'package.json' },
];

describe('verifyPackedPackage', () => {
  it('accepts a complete package with rewritten workspace dependencies', () => {
    expect(() =>
      verifyPackedPackage({
        packedFiles,
        packedManifest: createPackedManifest(),
        releasePackage,
      }),
    ).not.toThrow();
  });

  it('rejects a workspace protocol left in the packed manifest', () => {
    const packedManifest = createPackedManifest({
      dependencies: {
        '@formly-contract/contract-schema': 'workspace:*',
      },
    });

    expect(() =>
      verifyPackedPackage({
        packedFiles,
        packedManifest,
        releasePackage,
      }),
    ).toThrow('must not contain workspace: dependency ranges');
  });

  it('rejects a packed adapter without the supported Formly 6.x peer range', () => {
    const packedManifest = createPackedManifest({
      peerDependencies: { '@ngx-formly/core': '6.1.8' },
    });

    expect(() =>
      verifyPackedPackage({
        packedFiles,
        packedManifest,
        releasePackage,
      }),
    ).toThrow('must retain the supported Formly 6.x peer range');
  });

  it('rejects a tarball without consumer documentation', () => {
    expect(() =>
      verifyPackedPackage({
        packedFiles: packedFiles.filter(({ path }) => path !== 'README.md'),
        packedManifest: createPackedManifest(),
        releasePackage,
      }),
    ).toThrow('is missing README.md');
  });

  it('rejects source and test files from the tarball', () => {
    expect(() =>
      verifyPackedPackage({
        packedFiles: [...packedFiles, { path: 'src/extract-form.test.ts' }],
        packedManifest: createPackedManifest(),
        releasePackage,
      }),
    ).toThrow('contains unexpected file src/extract-form.test.ts');
  });

  it('rejects a tarball identity that differs from the release manifest', () => {
    expect(() =>
      verifyPackedPackage({
        packedFiles,
        packedManifest: createPackedManifest({ version: '0.4.1' }),
        releasePackage,
      }),
    ).toThrow('must be @formly-contract/formly-adapter@0.4.0');
  });

  it('rejects packed metadata that cannot establish npm provenance', () => {
    const packedManifest = createPackedManifest({
      repository: {
        type: 'git',
        url: 'git+https://github.com/example/fork.git',
        directory: releasePackage.directory,
      },
    });

    expect(() =>
      verifyPackedPackage({
        packedFiles,
        packedManifest,
        releasePackage,
      }),
    ).toThrow('has invalid repository or npm publish metadata');
  });
});
