import { describe, expect, it } from 'vitest';

import {
  RUNTIME_PROVENANCE_SCHEMA_VERSION,
  canonicalizeRuntimeProvenance,
  computeRuntimeProvenanceHash,
  parseRuntimeProvenance,
  type RuntimeProvenance,
} from './runtime-provenance.js';

const HASH_A = `sha256:${'a'.repeat(64)}`;

function createProvenance(): RuntimeProvenance {
  return {
    schemaVersion: RUNTIME_PROVENANCE_SCHEMA_VERSION,
    worker: {
      id: '@formly-contract/workspace/in-process',
      version: '0.1.0',
      protocolVersion: '1',
    },
    adapter: {
      id: '@formly-contract/compiler/declared',
      version: '0.4.0',
      mode: 'declared',
    },
    tools: [
      { name: '@formly-contract/workspace', version: '0.1.0' },
      { name: '@formly-contract/schema', version: '0.4.0' },
      { name: '@formly-contract/compiler', version: '0.4.0' },
    ],
    loader: {
      id: 'jiti',
      version: '2.7.0',
      options: {
        fsCache: false,
        interopDefault: false,
        moduleCache: false,
        tsconfigPaths: 'configured',
        nativeModules: [],
      },
    },
    node: {
      version: '22.22.1',
      platform: 'linux',
      architecture: 'x64',
    },
    executionProfile: {
      id: 'trusted-local-v1',
      version: '1',
      network: 'not-enforced',
    },
    dependencySnapshot: {
      kind: 'pnpm-lock',
      workspaceRelativePath: 'pnpm-lock.yaml',
      sha256: HASH_A,
    },
    runtimePackages: [
      { name: '@ngx-formly/core', version: '6.1.8' },
      { name: '@angular/compiler', version: '20.3.29' },
      { name: '@angular/core', version: '20.3.29' },
    ],
  };
}

describe('runtime provenance', () => {
  it('strictly parses exact portable runtime, toolchain, and dependency identities', () => {
    const provenance = createProvenance();

    expect(parseRuntimeProvenance(structuredClone(provenance))).toEqual(
      provenance,
    );
  });

  it('canonicalizes unordered identity collections and hashes every causal identity', () => {
    const provenance = createProvenance();
    const reordered = {
      ...provenance,
      tools: [...provenance.tools].reverse(),
      runtimePackages: [...provenance.runtimePackages].reverse(),
      loader: {
        ...provenance.loader,
        options: {
          ...provenance.loader.options,
          nativeModules: ['@angular/core', '@angular/compiler'],
        },
      },
    };
    const reorderedAgain = {
      ...reordered,
      tools: [...reordered.tools].reverse(),
      runtimePackages: [...reordered.runtimePackages].reverse(),
      loader: {
        ...reordered.loader,
        options: {
          ...reordered.loader.options,
          nativeModules: [...reordered.loader.options.nativeModules].reverse(),
        },
      },
    };

    expect(canonicalizeRuntimeProvenance(reordered)).toBe(
      canonicalizeRuntimeProvenance(reorderedAgain),
    );
    expect(computeRuntimeProvenanceHash(reordered)).toBe(
      computeRuntimeProvenanceHash(reorderedAgain),
    );

    const baselineHash = computeRuntimeProvenanceHash(provenance);
    const causalChanges: RuntimeProvenance[] = [
      {
        ...provenance,
        worker: { ...provenance.worker, version: '0.1.1' },
      },
      {
        ...provenance,
        adapter: { ...provenance.adapter, version: '0.4.1' },
      },
      {
        ...provenance,
        tools: provenance.tools.map((tool) =>
          tool.name === '@formly-contract/schema'
            ? { ...tool, version: '0.4.1' }
            : tool,
        ),
      },
      {
        ...provenance,
        loader: { ...provenance.loader, version: '2.7.1' },
      },
      {
        ...provenance,
        node: { ...provenance.node, version: '22.22.2' },
      },
      {
        ...provenance,
        executionProfile: {
          ...provenance.executionProfile,
          version: '2',
        },
      },
      {
        ...provenance,
        dependencySnapshot: {
          ...provenance.dependencySnapshot,
          sha256: `sha256:${'b'.repeat(64)}`,
        },
      },
      {
        ...provenance,
        runtimePackages: provenance.runtimePackages.map((runtimePackage) =>
          runtimePackage.name === '@angular/core'
            ? { ...runtimePackage, version: '20.3.30' }
            : runtimePackage,
        ),
      },
    ];

    for (const changed of causalChanges) {
      expect(computeRuntimeProvenanceHash(changed)).not.toBe(baselineHash);
    }
  });

  it.each([
    '/private/pnpm-lock.yaml',
    '../pnpm-lock.yaml',
    './pnpm-lock.yaml',
    'C:\\repo\\pnpm-lock.yaml',
    'file:///repo/pnpm-lock.yaml',
  ])('rejects non-portable dependency paths: %s', (workspaceRelativePath) => {
    const provenance = createProvenance();

    expect(() =>
      parseRuntimeProvenance({
        ...provenance,
        dependencySnapshot: {
          ...provenance.dependencySnapshot,
          workspaceRelativePath,
        },
      }),
    ).toThrow(/workspaceRelativePath.*workspace-relative path/u);
  });

  it.each([
    ['moduleUrl', 'file:///private/worker.mjs'],
    ['pid', 1234],
    ['durationMs', 42],
    ['temporaryDirectory', '/private/tmp/worker'],
    ['environment', { TOKEN: 'secret' }],
  ])('rejects machine-local observation %s', (key, value) => {
    const provenance = createProvenance();

    expect(() =>
      parseRuntimeProvenance({ ...provenance, [key]: value }),
    ).toThrow(new RegExp(`runtimeProvenance\\.${key}.*not supported`, 'u'));
  });

  it('rejects prior schemas, malformed hashes, duplicate identities, and dishonest execution claims', () => {
    const provenance = createProvenance();

    expect(() =>
      parseRuntimeProvenance({ ...provenance, schemaVersion: '0.1.0' }),
    ).toThrow(/schemaVersion.*must be 1\.0\.0/u);
    expect(() =>
      parseRuntimeProvenance({
        ...provenance,
        dependencySnapshot: {
          ...provenance.dependencySnapshot,
          sha256: 'sha256:not-a-digest',
        },
      }),
    ).toThrow(/sha256.*sha256 digest/u);
    expect(() =>
      parseRuntimeProvenance({
        ...provenance,
        tools: [provenance.tools[0], provenance.tools[0]],
      }),
    ).toThrow(/duplicates tool name/u);
    expect(() =>
      parseRuntimeProvenance({
        ...provenance,
        tools: provenance.tools.filter(
          ({ name }) => name !== '@formly-contract/compiler',
        ),
      }),
    ).toThrow(/must record required tool.*compiler/u);
    expect(() =>
      parseRuntimeProvenance({
        ...provenance,
        adapter: { ...provenance.adapter, mode: 'jit' },
        runtimePackages: [],
      }),
    ).toThrow(/must record JIT runtime package.*angular\/compiler/u);
    expect(() =>
      parseRuntimeProvenance({
        ...provenance,
        executionProfile: {
          ...provenance.executionProfile,
          network: 'enforced',
        },
      }),
    ).toThrow(/trusted-local-v1.*not-enforced/u);
  });
});
