import { describe, expect, it } from 'vitest';

import type {
  RuntimePackageResolution,
  WorkspaceRuntimeBootstrapContext,
} from '@formly-contract/workspace/runtime-host';

import { createWorkspaceRuntimeHost } from './project-host.js';

function context(versions: Readonly<Record<string, string>>): {
  readonly runtime: WorkspaceRuntimeBootstrapContext;
  readonly aliasAssertions: string[][];
  readonly imports: string[];
} {
  const resolutions = new Map<string, RuntimePackageResolution>();
  for (const name of ['@angular/compiler', '@angular/core', '@ngx-formly/core']) {
    resolutions.set(name, {
      specifier: name,
      entryUrl: `file:///runtime/${encodeURIComponent(name)}.js`,
      packageJsonUrl: `file:///runtime/${encodeURIComponent(name)}/package.json`,
    });
  }
  const aliasAssertions: string[][] = [];
  const imports: string[] = [];
  return {
    aliasAssertions,
    imports,
    runtime: {
      configPath: '/workspace/formly-contracts.project.ts',
      runtimeResolutionBase: '/workspace',
      resolveRuntimePackage: (name) => Promise.resolve(resolutions.get(name)),
      readRuntimePackageMetadata: ({ specifier }) => Promise.resolve({
        name: specifier,
        version: versions[specifier],
      }),
      importResolvedRuntime: ({ specifier }) => {
        imports.push(specifier);
        return Promise.resolve({});
      },
      assertRuntimePackageAliasesAbsent: (specifiers) => {
        aliasAssertions.push([...specifiers]);
      },
    },
  };
}

describe('Angular JIT project host', () => {
  it('reserves matching project-local Angular runtimes before config loading', async () => {
    const stub = context({ '@angular/compiler': '20.3.29', '@angular/core': '20.3.29', '@ngx-formly/core': '6.1.8' });
    const result = await createWorkspaceRuntimeHost().beforeConfigLoad(stub.runtime);
    expect(stub.aliasAssertions).toEqual([['@angular/compiler', '@angular/core']]);
    expect(stub.imports).toEqual(['@angular/compiler']);
    expect(result).toEqual({
      nativeModules: ['@angular/compiler', '@angular/core'],
      runtimePackages: [
        { name: '@angular/compiler', version: '20.3.29' },
        { name: '@angular/core', version: '20.3.29' },
        { name: '@ngx-formly/core', version: '6.1.8' },
      ],
    });
  });

  it('rejects mismatched Angular core and compiler versions before import', async () => {
    const stub = context({ '@angular/compiler': '20.3.28', '@angular/core': '20.3.29', '@ngx-formly/core': '6.1.8' });
    await expect(createWorkspaceRuntimeHost().beforeConfigLoad(stub.runtime)).rejects.toThrow(/exact supported version pair/u);
    expect(stub.imports).toEqual([]);
  });
});
