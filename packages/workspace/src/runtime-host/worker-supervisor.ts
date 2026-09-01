import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { JsonValue } from '@formly-contract/schema';

import {
  parseProjectExecutionRequest,
  parseRuntimeHostWorkerMessage,
  RUNTIME_HOST_PROTOCOL_VERSION,
  type ProjectExecutionRequest,
  type RuntimeHostProjectInventory,
  type RuntimeHostWorkerMessage,
} from './protocol.js';

export type ProjectWorkerSupervisorErrorCode =
  | 'WORKER_ABORTED'
  | 'WORKER_CRASHED'
  | 'WORKER_FAILURE'
  | 'WORKER_MESSAGE_INVALID'
  | 'WORKER_REQUEST_MISMATCH'
  | 'WORKER_TIMEOUT';

export class ProjectWorkerSupervisorError extends Error {
  readonly code: ProjectWorkerSupervisorErrorCode;
  readonly requestId: string;

  constructor(
    code: ProjectWorkerSupervisorErrorCode,
    requestId: string,
    cause?: unknown,
  ) {
    super(`Project worker failed [${code}].`,
      cause === undefined ? undefined : { cause });
    this.name = 'ProjectWorkerSupervisorError';
    this.code = code;
    this.requestId = requestId;
  }
}

export interface SpawnProjectWorkerOptions {
  readonly workerModuleUrl: string;
  readonly timeoutMs?: number;
  readonly execPath?: string;
  readonly spawnProcess?: typeof spawn;
}

export interface ProjectWorkerSession {
  readonly request: ProjectExecutionRequest;
  readonly inventory: RuntimeHostProjectInventory;
  approve(): Promise<JsonValue>;
  abort(): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const ALLOWED_ENVIRONMENT_KEYS = [
  'ComSpec',
  'LANG',
  'LC_ALL',
  'PATH',
  'SystemRoot',
  'TEMP',
  'TMP',
  'TMPDIR',
] as const;

export function createProjectWorkerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    LANG: 'C',
    LC_ALL: 'C',
    TZ: 'UTC',
  };
  for (const key of ALLOWED_ENVIRONMENT_KEYS) {
    const value = source[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

function workerPath(moduleUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(moduleUrl);
  } catch {
    throw new TypeError('workerModuleUrl must be an absolute file URL.');
  }
  if (parsed.protocol !== 'file:' || parsed.search || parsed.hash) {
    throw new TypeError('workerModuleUrl must be an unmodified file URL.');
  }
  return fileURLToPath(parsed);
}

function send(child: ChildProcess, value: object): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!child.connected) {
      reject(new Error('Worker IPC channel is not connected.'));
      return;
    }
    child.send(value, (error) => (error == null ? resolve() : reject(error)));
  });
}

async function terminate(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    const force = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }, 1_000);
    force.unref();
    child.once('exit', () => {
      clearTimeout(force);
      resolve();
    });
  });
}

class WorkerChannel {
  readonly child: ChildProcess;
  readonly request: ProjectExecutionRequest;
  readonly timeoutMs: number;
  #settled = false;

  constructor(
    child: ChildProcess,
    request: ProjectExecutionRequest,
    timeoutMs: number,
  ) {
    this.child = child;
    this.request = request;
    this.timeoutMs = timeoutMs;
  }

  async next(expectedKind: RuntimeHostWorkerMessage['kind']): Promise<RuntimeHostWorkerMessage> {
    if (this.#settled) {
      throw new ProjectWorkerSupervisorError(
        'WORKER_ABORTED',
        this.request.requestId,
      );
    }
    return new Promise((resolve, reject) => {
      let completed = false;
      const finish = (
        outcome:
          | { readonly ok: true; readonly message: RuntimeHostWorkerMessage }
          | { readonly ok: false; readonly error: ProjectWorkerSupervisorError },
      ) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeout);
        this.child.off('message', onMessage);
        this.child.off('exit', onExit);
        this.child.off('error', onError);
        if (outcome.ok) resolve(outcome.message);
        else reject(outcome.error);
      };
      const fail = (
        code: ProjectWorkerSupervisorErrorCode,
        cause?: unknown,
      ) => {
        this.#settled = true;
        finish({
          ok: false,
          error: new ProjectWorkerSupervisorError(
            code,
            this.request.requestId,
            cause,
          ),
        });
        void terminate(this.child);
      };
      const onMessage = (input: unknown) => {
        let message: RuntimeHostWorkerMessage;
        try {
          message = parseRuntimeHostWorkerMessage(input);
        } catch (error) {
          fail('WORKER_MESSAGE_INVALID', error);
          return;
        }
        if (message.requestId !== this.request.requestId) {
          fail('WORKER_REQUEST_MISMATCH');
          return;
        }
        if (message.kind === 'failure') {
          fail('WORKER_FAILURE');
          return;
        }
        if (message.kind !== expectedKind) {
          fail('WORKER_MESSAGE_INVALID');
          return;
        }
        finish({ ok: true, message });
      };
      const onExit = () => fail('WORKER_CRASHED');
      const onError = (error: Error) => fail('WORKER_CRASHED', error);
      const timeout = setTimeout(() => fail('WORKER_TIMEOUT'), this.timeoutMs);
      timeout.unref();
      this.child.once('message', onMessage);
      this.child.once('exit', onExit);
      this.child.once('error', onError);
    });
  }

  async approve(): Promise<JsonValue> {
    await send(this.child, {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'approve',
      requestId: this.request.requestId,
    });
    const message = await this.next('result');
    this.#settled = true;
    await terminate(this.child);
    if (message.kind !== 'result') {
      throw new ProjectWorkerSupervisorError(
        'WORKER_MESSAGE_INVALID',
        this.request.requestId,
      );
    }
    return message.result;
  }

  async abort(): Promise<void> {
    if (this.#settled) return;
    this.#settled = true;
    try {
      await send(this.child, {
        protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
        kind: 'abort',
        requestId: this.request.requestId,
      });
    } finally {
      await terminate(this.child);
    }
  }
}

export async function spawnProjectWorker(
  input: ProjectExecutionRequest,
  options: SpawnProjectWorkerOptions,
): Promise<ProjectWorkerSession> {
  const request = parseProjectExecutionRequest(input);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('timeoutMs must be a positive safe integer.');
  }
  const spawnProcess = options.spawnProcess ?? spawn;
  const child = spawnProcess(
    options.execPath ?? process.execPath,
    [workerPath(options.workerModuleUrl)],
    {
      cwd: request.workspaceRoot,
      env: createProjectWorkerEnvironment(),
      shell: false,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    },
  );
  const channel = new WorkerChannel(child, request, timeoutMs);
  try {
    await send(child, {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'initialize',
      request,
    });
    const message = await channel.next('inventory');
    if (message.kind !== 'inventory') {
      throw new ProjectWorkerSupervisorError(
        'WORKER_MESSAGE_INVALID',
        request.requestId,
      );
    }
    return {
      request,
      inventory: message.inventory,
      approve: () => channel.approve(),
      abort: () => channel.abort(),
    };
  } catch (error) {
    await terminate(child);
    throw error;
  }
}
