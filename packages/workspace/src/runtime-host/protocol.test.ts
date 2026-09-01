import { describe, expect, it } from 'vitest';

import {
  parseProjectExecutionRequest,
  parseRuntimeHostModuleDescriptor,
  parseRuntimeHostParentMessage,
  parseRuntimeHostWorkerMessage,
} from './protocol.js';

function descriptor() {
  return {
    protocolVersion: '1' as const,
    id: '@formly-contract/angular-jit',
    version: '0.1.0',
    moduleUrl: 'file:///workspace/node_modules/angular-host.js',
    exportName: 'createWorkspaceRuntimeHost' as const,
    options: { strict: true },
  };
}

function request() {
  return {
    protocolVersion: '1' as const,
    requestId: 'project:claims',
    operation: 'generate' as const,
    workspaceRoot: '/workspace',
    rootConfigPath: 'formly-contracts.config.ts',
    configPath: 'apps/claims/formly-contracts.project.ts',
    projectRoot: 'apps/claims',
    runtimeResolutionBase: 'apps/claims',
    tsconfigPath: 'apps/claims/tsconfig.json',
    rootPolicy: { failOn: ['error'] },
    cliOverrides: { outputDirectory: 'dist/contracts' },
    runtimeHost: descriptor(),
  };
}

describe('runtime-host protocol', () => {
  it('round-trips strict host descriptors and project execution requests', () => {
    expect(parseRuntimeHostModuleDescriptor(descriptor())).toEqual(descriptor());
    expect(parseProjectExecutionRequest(request())).toEqual(request());
    expect(
      parseRuntimeHostParentMessage({
        protocolVersion: '1',
        kind: 'initialize',
        request: request(),
      }),
    ).toEqual({
      protocolVersion: '1',
      kind: 'initialize',
      request: request(),
    });
  });

  it('accepts inventory and JSON-safe result messages', () => {
    expect(
      parseRuntimeHostWorkerMessage({
        protocolVersion: '1',
        kind: 'inventory',
        requestId: 'project:claims',
        inventory: {
          projectId: 'claims',
          sourceIds: ['claims/forms'],
          formIds: ['claims.intake'],
        },
      }),
    ).toMatchObject({ kind: 'inventory' });
    expect(
      parseRuntimeHostWorkerMessage({
        protocolVersion: '1',
        kind: 'result',
        requestId: 'project:claims',
        result: { artifacts: [] },
      }),
    ).toMatchObject({ kind: 'result' });
  });

  it.each([
    [{ ...descriptor(), protocolVersion: '2' }, 'protocolVersion'],
    [{ ...descriptor(), moduleUrl: 'https://example.test/host.js' }, 'moduleUrl'],
    [{ ...descriptor(), moduleUrl: 'file:///host.js?variant=1' }, 'moduleUrl'],
    [{ ...descriptor(), exportName: 'loadArbitraryCode' }, 'exportName'],
    [{ ...descriptor(), token: 'secret' }, 'token'],
  ])('rejects malformed or expanded host descriptors', (value, message) => {
    expect(() => parseRuntimeHostModuleDescriptor(value)).toThrow(message);
  });

  it('rejects traversal, executable values, and malformed phase messages', () => {
    expect(() =>
      parseProjectExecutionRequest({ ...request(), configPath: '../escape.ts' }),
    ).toThrow('request.configPath');
    expect(() =>
      parseProjectExecutionRequest({
        ...request(),
        rootPolicy: { callback: () => true },
      }),
    ).toThrow('request.rootPolicy');
    expect(() =>
      parseRuntimeHostWorkerMessage({
        protocolVersion: '1',
        kind: 'failure',
        requestId: 'project:claims',
        code: 'UNKNOWN',
        phase: 'compile',
      }),
    ).toThrow('workerMessage.code');
  });
});
