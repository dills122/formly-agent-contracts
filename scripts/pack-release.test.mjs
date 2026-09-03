import { describe, expect, it } from 'vitest';

import {
  getPackedPackageSmokeImports,
  verifyPackedPackage,
} from './pack-release.mjs';

const releasePackage = {
  directory: 'packages/compiler',
  name: '@formly-contract/compiler',
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
      '@formly-contract/schema': '0.4.0',
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

const schemaReleasePackage = {
  directory: 'packages/schema',
  name: '@formly-contract/schema',
  version: '0.4.0',
};

const schemaAuthoringExport = {
  types: './dist/field-type-authoring.d.ts',
  default: './dist/field-type-authoring.js',
};

function createSchemaPackedManifest(overrides = {}) {
  return createPackedManifest({
    name: schemaReleasePackage.name,
    repository: {
      type: 'git',
      url: 'git+https://github.com/dills122/formly-contract.git',
      directory: schemaReleasePackage.directory,
    },
    exports: {
      '.': {
        types: './dist/index.d.ts',
        default: './dist/index.js',
      },
      './field-type-authoring': schemaAuthoringExport,
    },
    ...overrides,
  });
}

const schemaPackedFiles = [
  ...packedFiles,
  { path: 'dist/field-type-authoring.d.ts' },
  { path: 'dist/field-type-authoring.js' },
];

const workspaceReleasePackage = {
  directory: 'packages/workspace',
  name: '@formly-contract/workspace',
  version: '0.1.0',
};

function createWorkspacePackedManifest(overrides = {}) {
  return createPackedManifest({
    name: workspaceReleasePackage.name,
    version: workspaceReleasePackage.version,
    repository: {
      type: 'git',
      url: 'git+https://github.com/dills122/formly-contract.git',
      directory: workspaceReleasePackage.directory,
    },
    exports: {
      '.': {
        types: './dist/index.d.ts',
        default: './dist/index.js',
      },
      './runtime-host': {
        types: './dist/runtime-host/index.d.ts',
        default: './dist/runtime-host/index.js',
      },
      './cli': {
        types: './dist/cli.d.ts',
        default: './dist/cli.js',
      },
    },
    ...overrides,
  });
}

const workspacePackedFiles = [
  ...packedFiles,
  { path: 'dist/project-worker.js' },
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
        '@formly-contract/schema': 'workspace:*',
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
    ).toThrow('must be @formly-contract/compiler@0.4.0');
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

  it('pins the schema authoring subpath and both packed targets', () => {
    expect(() =>
      verifyPackedPackage({
        packedFiles: schemaPackedFiles,
        packedManifest: createSchemaPackedManifest(),
        releasePackage: schemaReleasePackage,
      }),
    ).not.toThrow();

    expect(() =>
      verifyPackedPackage({
        packedFiles: schemaPackedFiles,
        packedManifest: createSchemaPackedManifest({
          exports: {
            '.': {
              types: './dist/index.d.ts',
              default: './dist/index.js',
            },
          },
        }),
        releasePackage: schemaReleasePackage,
      }),
    ).toThrow('must expose ./field-type-authoring');

    expect(() =>
      verifyPackedPackage({
        packedFiles: schemaPackedFiles.filter(
          ({ path }) => path !== 'dist/field-type-authoring.d.ts',
        ),
        packedManifest: createSchemaPackedManifest(),
        releasePackage: schemaReleasePackage,
      }),
    ).toThrow('is missing dist/field-type-authoring.d.ts');
  });

  it('includes the workspace worker without exporting its private entry', () => {
    expect(() =>
      verifyPackedPackage({
        packedFiles: workspacePackedFiles,
        packedManifest: createWorkspacePackedManifest(),
        releasePackage: workspaceReleasePackage,
      }),
    ).not.toThrow();

    expect(() =>
      verifyPackedPackage({
        packedFiles,
        packedManifest: createWorkspacePackedManifest(),
        releasePackage: workspaceReleasePackage,
      }),
    ).toThrow('is missing dist/project-worker.js');

    expect(() =>
      verifyPackedPackage({
        packedFiles: workspacePackedFiles,
        packedManifest: createWorkspacePackedManifest({
          exports: {
            ...createWorkspacePackedManifest().exports,
            './project-worker': './dist/project-worker.js',
          },
        }),
        releasePackage: workspaceReleasePackage,
      }),
    ).toThrow('must not export its private worker');
  });
});

describe('getPackedPackageSmokeImports', () => {
  it('checks the schema root and compact authoring public subpath', () => {
    expect(getPackedPackageSmokeImports('@formly-contract/schema')).toEqual([
      {
        specifier: '@formly-contract/schema',
        requiredExports: ['parseFormContract'],
        forbiddenExports: [
          'aliasContractedFormlyType',
          'buildFieldTypeProfileRegistry',
          'defineContractedFormlyWrapper',
          'defineContractedFormlyType',
          'stepper',
          'radioChoice',
          'toFormlyTypeRegistration',
        ],
      },
      {
        specifier: '@formly-contract/schema/field-type-authoring',
        requiredExports: [
          'aliasContractedFormlyType',
          'buildFieldTypeProfileRegistry',
          'defineContractedFormlyWrapper',
          'defineContractedFormlyType',
          'radioChoice',
          'stepper',
          'toFormlyTypeRegistration',
        ],
      },
    ]);
  });

  it('checks the public workspace root and runtime-host subpath', () => {
    expect(getPackedPackageSmokeImports('@formly-contract/workspace')).toEqual([
      {
        specifier: '@formly-contract/workspace',
        requiredExports: ['runWorkspace'],
      },
      {
        specifier: '@formly-contract/workspace/runtime-host',
        requiredExports: ['defineRuntimeHostModuleDescriptor'],
      },
    ]);
  });

  it('checks the Angular root and guarded JIT subpath', () => {
    expect(getPackedPackageSmokeImports('@formly-contract/angular')).toEqual([
      {
        specifier: '@formly-contract/angular',
        requiredExports: ['runAngularWorkspace'],
      },
      {
        specifier: '@formly-contract/angular/jit',
        requiredExports: ['angularJitRuntimeHost', 'runAngularWorkspace'],
      },
    ]);
  });
});
