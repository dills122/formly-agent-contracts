import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createProjectWorkerEnvironment,
  ProjectWorkerSupervisorError,
  spawnProjectWorker,
} from './worker-supervisor.js';

const fixtureWorker = new URL('./fixtures/echo-worker.mjs', import.meta.url).href;
const permissionProbeWorker = new URL(
  './fixtures/permission-probe-worker.mjs',
  import.meta.url,
).href;
const temporaryDirectories: string[] = [];

function request(
  fixture?: string,
  explain = false,
  workspaceRoot = process.cwd(),
) {
  return {
    protocolVersion: '1' as const,
    requestId: 'fixture:worker',
    operation: 'generate' as const,
    workspaceRoot,
    rootConfigPath: 'formly-contracts.config.ts',
    configPath: 'fixtures/project.ts',
    projectRoot: 'fixtures',
    runtimeResolutionBase: 'fixtures',
    rootPolicy: fixture === undefined ? {} : { fixture },
    ...(explain ? { explain: true } : {}),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

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

  it('uses direct Node spawning with read-only permission guardrails', async () => {
    let invocation:
      | {
          readonly command: string;
          readonly args: readonly string[];
          readonly options: SpawnOptions;
          readonly child: ChildProcess;
        }
      | undefined;
    const captureSpawn = ((
      command: string,
      args: readonly string[],
      options: SpawnOptions,
    ) => {
      const child = spawn(command, [...args], options);
      invocation = { command, args, options, child };
      return child;
    }) as typeof spawn;

    const session = await spawnProjectWorker(request(), {
      workerModuleUrl: fixtureWorker,
      timeoutMs: 2_000,
      spawnProcess: captureSpawn,
    });
    await session.abort();

    expect(invocation).toBeDefined();
    expect(invocation?.command).toBe(process.execPath);
    expect(invocation?.args[0]).toBe('--permission');
    expect(
      invocation?.args.some((argument) =>
        argument.startsWith('--allow-fs-read='),
      ),
    ).toBe(true);
    expect(
      invocation?.args.some(
        (argument) =>
          argument.startsWith('--allow-fs-write=') ||
          argument === '--allow-child-process' ||
          argument === '--allow-worker',
      ),
    ).toBe(false);
    expect(invocation?.options.shell).toBe(false);
    expect(invocation?.options.stdio).toEqual([
      'ignore',
      'ignore',
      'ignore',
      'ipc',
    ]);
    expect(
      invocation?.child.exitCode !== null ||
        invocation?.child.signalCode !== null,
    ).toBe(true);
  });

  it.each([
    'permission-write',
    'permission-child',
    'permission-worker',
  ] as const)('denies the %s capability inside trusted-local workers', async (fixture) => {
    const workspaceRoot = await mkdtemp(
      join(tmpdir(), 'formly worker permission '),
    );
    temporaryDirectories.push(workspaceRoot);
    const session = await spawnProjectWorker(
      request(fixture, false, workspaceRoot),
      {
        workerModuleUrl: permissionProbeWorker,
        timeoutMs: 2_000,
      },
    );

    expect(session.inventory.projectId).toBe('denied');
    await session.abort();
    await expect(
      access(join(workspaceRoot, 'permission-probe-output')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails closed before spawn when isolated CI is unavailable', async () => {
    const spawnProcess = vi.fn() as typeof spawn;
    await expect(
      spawnProjectWorker(request(), {
        workerModuleUrl: fixtureWorker,
        executionProfile: 'isolated-ci-v1',
        spawnProcess,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_ISOLATION_UNAVAILABLE',
      workerFailurePhase: 'inventory',
    } satisfies Partial<ProjectWorkerSupervisorError>);
    expect(spawnProcess).not.toHaveBeenCalled();
  });

  it.each([
    ['late-failure', 'WORKER_FAILURE'],
    ['early-result', 'WORKER_MESSAGE_INVALID'],
    ['exit-after-inventory', 'WORKER_CRASHED'],
  ] as const)(
    'retains a terminal %s event between inventory and approval',
    async (fixture, code) => {
      const session = await spawnProjectWorker(request(fixture), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      });
      await new Promise((resolve) => setTimeout(resolve, 40));

      await expect(session.approve()).rejects.toMatchObject({
        code,
        workerFailurePhase: 'compile',
      });
    },
  );

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
      spawnProjectWorker(request('cross-variant'), {
        workerModuleUrl: fixtureWorker,
        timeoutMs: 2_000,
      }),
    ).rejects.toMatchObject({
      code: 'WORKER_MESSAGE_INVALID',
      configPath: 'fixtures/project.ts',
      workerFailurePhase: 'inventory',
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
