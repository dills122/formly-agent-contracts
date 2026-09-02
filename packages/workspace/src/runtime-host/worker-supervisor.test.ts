import { describe, expect, it } from 'vitest';

import {
  createProjectWorkerEnvironment,
  ProjectWorkerSupervisorError,
  spawnProjectWorker,
} from './worker-supervisor.js';

const fixtureWorker = new URL('./fixtures/echo-worker.mjs', import.meta.url).href;

function request(fixture?: string, explain = false) {
  return {
    protocolVersion: '1' as const,
    requestId: 'fixture:worker',
    operation: 'generate' as const,
    workspaceRoot: process.cwd(),
    rootConfigPath: 'formly-contracts.config.ts',
    configPath: 'fixtures/project.ts',
    projectRoot: 'fixtures',
    runtimeResolutionBase: 'fixtures',
    rootPolicy: fixture === undefined ? {} : { fixture },
    ...(explain ? { explain: true } : {}),
  };
}

describe('project worker supervisor', () => {
  it('scrubs credentials and loader overrides from the worker environment', () => {
    expect(
      createProjectWorkerEnvironment({
        PATH: '/bin',
        HOME: '/secret/home',
        NODE_OPTIONS: '--import=surprise',
        NPM_TOKEN: 'secret',
      }),
    ).toEqual({
      LANG: 'C',
      LC_ALL: 'C',
      PATH: '/bin',
      TZ: 'UTC',
    });
  });

  it('keeps one child alive across inventory and approved compilation', async () => {
    const session = await spawnProjectWorker(request(), {
      workerModuleUrl: fixtureWorker,
      timeoutMs: 2_000,
    });

    expect(session.inventory).toEqual({
      projectId: 'fixture',
      sourceIds: ['fixture/forms'],
      formIds: ['fixture.form'],
    });
    await expect(session.approve()).resolves.toEqual({ artifacts: [] });
  });

  it('classifies malformed, crashed, and timed-out workers', async () => {
    await expect(
      spawnProjectWorker(request('malformed'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_MESSAGE_INVALID',
    } satisfies Partial<ProjectWorkerSupervisorError>);
    await expect(
      spawnProjectWorker(request('crash'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_CRASHED',
      configPath: 'fixtures/project.ts',
      workerFailurePhase: 'inventory',
    } satisfies Partial<ProjectWorkerSupervisorError>);
    await expect(
      spawnProjectWorker(request('timeout'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 25,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_TIMEOUT',
      configPath: 'fixtures/project.ts',
      workerFailurePhase: 'inventory',
    } satisfies Partial<ProjectWorkerSupervisorError>);
  });

  it('preserves validated worker failure code, phase, and opted-in details', async () => {
    await expect(
      spawnProjectWorker(request('failure', true), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_FAILURE',
      configPath: 'fixtures/project.ts',
      workerFailureCode: 'PROJECT_CONFIG_LOAD_FAILED',
      workerFailurePhase: 'inventory',
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
    } satisfies Partial<ProjectWorkerSupervisorError>);

    await expect(
      spawnProjectWorker(request('failure'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({
      workerFailureCode: 'PROJECT_CONFIG_LOAD_FAILED',
      workerFailurePhase: 'inventory',
      explanation: undefined,
    });

    await expect(
      spawnProjectWorker(request('unsolicited-failure'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({
      workerFailureCode: 'PROJECT_CONFIG_LOAD_FAILED',
      workerFailurePhase: 'inventory',
      explanation: undefined,
    });

    const session = await spawnProjectWorker(
      request('compile-failure', true),
      {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      },
    );
    await expect(session.approve()).rejects.toMatchObject({
      code: 'WORKER_FAILURE',
      workerFailureCode: 'PROJECT_COMPILE_FAILED',
      workerFailurePhase: 'compile',
      explanation: {
        causes: [
          { name: 'Error', message: 'Factory failed during compilation' },
        ],
        frames: [],
      },
    } satisfies Partial<ProjectWorkerSupervisorError>);
  });
});
