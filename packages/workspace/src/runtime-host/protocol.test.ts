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
    explain: true,
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

  it('treats protocol 1 as a strict package-lockstep schema', () => {
    expect(() =>
      parseProjectExecutionRequest({
        ...request(),
        futureCapability: true,
      }),
    ).toThrow('request.futureCapability');
    expect(() =>
      parseRuntimeHostWorkerMessage({
        protocolVersion: '1',
        kind: 'failure',
        requestId: 'project:claims',
        code: 'PROJECT_CONFIG_LOAD_FAILED',
        phase: 'inventory',
        futureDetail: {},
      }),
    ).toThrow('workerMessage.futureDetail');
    expect(() =>
      parseProjectExecutionRequest({ ...request(), protocolVersion: '2' }),
    ).toThrow('request.protocolVersion');
  });

  it.each([
    {
      message: {
        protocolVersion: '1',
        kind: 'inventory',
        requestId: 'project:claims',
        inventory: {
          projectId: 'claims',
          sourceIds: ['claims/forms'],
          formIds: ['claims.intake'],
        },
        explanation: {
          causes: [{ name: 'Error', message: 'must not be ignored' }],
          frames: [],
        },
      },
      rejectedPath: 'workerMessage.explanation',
    },
    {
      message: {
        protocolVersion: '1',
        kind: 'result',
        requestId: 'project:claims',
        result: { artifacts: [] },
        code: 'PROJECT_COMPILE_FAILED',
        phase: 'compile',
      },
      rejectedPath: 'workerMessage.code',
    },
    {
      message: {
        protocolVersion: '1',
        kind: 'failure',
        requestId: 'project:claims',
        code: 'PROJECT_COMPILE_FAILED',
        phase: 'compile',
        result: { artifacts: [] },
      },
      rejectedPath: 'workerMessage.result',
    },
  ])(
    'rejects fields from another worker-message variant',
    ({ message, rejectedPath }) => {
      expect(() => parseRuntimeHostWorkerMessage(message)).toThrow(
        rejectedPath,
      );
    },
  );

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
    expect(
      parseRuntimeHostWorkerMessage({
        protocolVersion: '1',
        kind: 'failure',
        requestId: 'project:claims',
        code: 'PROJECT_CONFIG_LOAD_FAILED',
        phase: 'inventory',
        explanation: {
          causes: [
            {
              name: 'ReferenceError',
              message: "Cannot access 'NumberComponent' before initialization",
            },
          ],
          frames: [
            {
              path: 'libs/forms-kit/src/lib/number.component.ts',
              line: 12,
              column: 7,
            },
          ],
        },
      }),
    ).toMatchObject({
      kind: 'failure',
      code: 'PROJECT_CONFIG_LOAD_FAILED',
      phase: 'inventory',
    });
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
      parseProjectExecutionRequest({ ...request(), explain: 'yes' }),
    ).toThrow('request.explain');
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

  it.each([
    {
      causes: [{ name: 'Error', message: 'forged\nline' }],
      frames: [],
    },
    {
      causes: [{ name: 'Error', message: 'safe' }],
      frames: [{ path: '/private/file.ts', line: 1, column: 1 }],
    },
    {
      causes: Array.from({ length: 4 }, () => ({
        name: 'Error',
        message: 'safe',
      })),
      frames: [],
    },
  ])('rejects malformed or over-broad failure explanations', (explanation) => {
    expect(() =>
      parseRuntimeHostWorkerMessage({
        protocolVersion: '1',
        kind: 'failure',
        requestId: 'project:claims',
        code: 'PROJECT_CONFIG_LOAD_FAILED',
        phase: 'inventory',
        explanation,
      }),
    ).toThrow('workerMessage.explanation');
  });
});
