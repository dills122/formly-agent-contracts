import { describe, expect, it } from 'vitest';

import {
  createProjectWorkerEnvironment,
  ProjectWorkerSupervisorError,
  spawnProjectWorker,
} from './worker-supervisor.js';

const fixtureWorker = new URL('./fixtures/echo-worker.mjs', import.meta.url).href;

function request(fixture?: string) {
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

  it('terminates malformed and timed-out workers', async () => {
    await expect(
      spawnProjectWorker(request('malformed'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_MESSAGE_INVALID',
    } satisfies Partial<ProjectWorkerSupervisorError>);
    await expect(
      spawnProjectWorker(request('timeout'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 25,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_TIMEOUT',
    } satisfies Partial<ProjectWorkerSupervisorError>);
  });
});
