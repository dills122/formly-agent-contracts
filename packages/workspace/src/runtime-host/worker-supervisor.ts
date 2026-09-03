import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { JsonValue } from '@formly-contract/schema';

import {
  parseProjectExecutionRequest,
  parseRuntimeHostWorkerMessage,
  RUNTIME_HOST_PROTOCOL_VERSION,
  type ProjectExecutionRequest,
  type RuntimeHostFailureCode,
  type RuntimeHostFailureExplanation,
  type RuntimeHostFailurePhase,
  type RuntimeHostProjectInventory,
  type RuntimeHostWorkerMessage,
} from './protocol.js';

export type ProjectWorkerSupervisorErrorCode =
  | 'WORKER_ABORTED'
  | 'WORKER_CRASHED'
  | 'WORKER_FAILURE'
  | 'WORKER_ISOLATION_UNAVAILABLE'
  | 'WORKER_MESSAGE_INVALID'
  | 'WORKER_REQUEST_MISMATCH'
  | 'WORKER_TIMEOUT';

export class ProjectWorkerSupervisorError extends Error {
  readonly code: ProjectWorkerSupervisorErrorCode;
  readonly requestId: string;
  readonly configPath?: string;
  readonly workerFailureCode?: RuntimeHostFailureCode;
  readonly workerFailurePhase?: RuntimeHostFailurePhase;
  readonly explanation?: RuntimeHostFailureExplanation;

  constructor(
    code: ProjectWorkerSupervisorErrorCode,
    requestId: string,
    cause?: unknown,
    context: {
      readonly configPath?: string;
      readonly workerFailure?: Extract<
        RuntimeHostWorkerMessage,
        { readonly kind: 'failure' }
      >;
      readonly phase?: RuntimeHostFailurePhase;
    } = {},
  ) {
    super(`Project worker failed [${code}].`,
      cause === undefined ? undefined : { cause });
    this.name = 'ProjectWorkerSupervisorError';
    this.code = code;
    this.requestId = requestId;
    if (context.configPath !== undefined) {
      this.configPath = context.configPath;
    }
    if (context.workerFailure !== undefined) {
      this.workerFailureCode = context.workerFailure.code;
      this.workerFailurePhase = context.workerFailure.phase;
      if (context.workerFailure.explanation !== undefined) {
        this.explanation = context.workerFailure.explanation;
      }
    } else if (context.phase !== undefined) {
      this.workerFailurePhase = context.phase;
    }
  }
}

export interface SpawnProjectWorkerOptions {
  readonly workerModuleUrl: string;
  readonly timeoutMs?: number;
  readonly executionProfile?: ProjectWorkerExecutionProfile;
  readonly spawnProcess?: typeof spawn;
}

export type ProjectWorkerExecutionProfile =
  | 'trusted-local-v1'
  | 'isolated-ci-v1';

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

function nearestContainingPath(
  startPath: string,
  marker: string,
): string | undefined {
  let current = dirname(startPath);
  const root = parse(current).root;
  for (;;) {
    if (existsSync(resolve(current, marker))) return current;
    if (current === root) return undefined;
    current = dirname(current);
  }
}

function trustedReadRoots(
  request: ProjectExecutionRequest,
  modulePath: string,
): readonly string[] {
  const modulePaths = [
    modulePath,
    ...(request.runtimeHost === undefined
      ? []
      : [fileURLToPath(request.runtimeHost.moduleUrl)]),
  ];
  const roots = new Set<string>([realpathSync(request.workspaceRoot)]);
  for (const path of modulePaths) {
    const realPath = realpathSync(path);
    roots.add(nearestContainingPath(realPath, 'package.json') ?? dirname(realPath));
    const workspaceRoot = nearestContainingPath(realPath, 'pnpm-workspace.yaml');
    if (workspaceRoot !== undefined) roots.add(workspaceRoot);
  }
  return [...roots].sort();
}

function workerArguments(
  request: ProjectExecutionRequest,
  modulePath: string,
): readonly string[] {
  if (!process.allowedNodeEnvironmentFlags.has('--permission')) {
    return [modulePath];
  }
  return [
    '--permission',
    ...trustedReadRoots(request, modulePath).map(
      (path) => `--allow-fs-read=${path}`,
    ),
    modulePath,
  ];
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
  #phase: RuntimeHostFailurePhase = 'inventory';
  #terminalError: ProjectWorkerSupervisorError | undefined;
  #termination: Promise<void> | undefined;
  #pending:
    | {
        readonly expectedKind: 'inventory' | 'result';
        readonly resolve: (message: RuntimeHostWorkerMessage) => void;
        readonly reject: (error: ProjectWorkerSupervisorError) => void;
        readonly timeout: NodeJS.Timeout;
      }
    | undefined;

  constructor(
    child: ChildProcess,
    request: ProjectExecutionRequest,
    timeoutMs: number,
  ) {
    this.child = child;
    this.request = request;
    this.timeoutMs = timeoutMs;
    this.child.on('message', this.#onMessage);
    this.child.once('exit', this.#onExit);
    this.child.once('error', this.#onError);
  }

  #cleanup(): void {
    this.child.off('message', this.#onMessage);
    this.child.off('exit', this.#onExit);
    this.child.off('error', this.#onError);
    if (this.#pending !== undefined) {
      clearTimeout(this.#pending.timeout);
      this.#pending = undefined;
    }
  }

  #terminate(): Promise<void> {
    this.#termination ??= terminate(this.child);
    return this.#termination;
  }

  #fail(
    code: ProjectWorkerSupervisorErrorCode,
    cause?: unknown,
    workerFailure?: Extract<
      RuntimeHostWorkerMessage,
      { readonly kind: 'failure' }
    >,
  ): void {
    if (this.#settled) return;
    const error = new ProjectWorkerSupervisorError(
      code,
      this.request.requestId,
      cause,
      {
        configPath: this.request.configPath,
        ...(workerFailure === undefined ? {} : { workerFailure }),
        phase: this.#phase,
      },
    );
    this.#terminalError = error;
    this.#settled = true;
    const pending = this.#pending;
    this.#cleanup();
    pending?.reject(error);
    void this.#terminate();
  }

  #onMessage = (input: unknown): void => {
    if (this.#settled) return;
    let message: RuntimeHostWorkerMessage;
    try {
      message = parseRuntimeHostWorkerMessage(input);
    } catch (error) {
      this.#fail('WORKER_MESSAGE_INVALID', error);
      return;
    }
    if (message.requestId !== this.request.requestId) {
      this.#fail('WORKER_REQUEST_MISMATCH');
      return;
    }
    if (message.kind === 'failure') {
      this.#fail(
        'WORKER_FAILURE',
        undefined,
        this.request.explain === true
          ? message
          : {
              protocolVersion: message.protocolVersion,
              kind: message.kind,
              requestId: message.requestId,
              code: message.code,
              phase: message.phase,
            },
      );
      return;
    }
    const pending = this.#pending;
    if (pending === undefined) {
      this.#fail('WORKER_MESSAGE_INVALID');
      return;
    }
    if (message.kind !== pending.expectedKind) {
      this.#fail('WORKER_MESSAGE_INVALID');
      return;
    }
    clearTimeout(pending.timeout);
    this.#pending = undefined;
    if (message.kind === 'inventory') {
      this.#phase = 'compile';
    } else {
      this.#settled = true;
      this.#cleanup();
    }
    pending.resolve(message);
  };

  #onExit = (): void => this.#fail('WORKER_CRASHED');

  #onError = (error: Error): void => this.#fail('WORKER_CRASHED', error);

  next(expectedKind: 'inventory' | 'result'): Promise<RuntimeHostWorkerMessage> {
    if (this.#terminalError !== undefined) {
      return Promise.reject(this.#terminalError);
    }
    if (this.#settled || this.#pending !== undefined) {
      return Promise.reject(
        new ProjectWorkerSupervisorError(
          'WORKER_ABORTED',
          this.request.requestId,
        ),
      );
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => this.#fail('WORKER_TIMEOUT'),
        this.timeoutMs,
      );
      timeout.unref();
      this.#pending = { expectedKind, resolve, reject, timeout };
    });
  }

  async approve(): Promise<JsonValue> {
    const result = this.next('result');
    try {
      await send(this.child, {
        protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
        kind: 'approve',
        requestId: this.request.requestId,
      });
    } catch (error) {
      this.#fail('WORKER_CRASHED', error);
    }
    let message: RuntimeHostWorkerMessage;
    try {
      message = await result;
    } catch (error) {
      await this.#terminate();
      throw error;
    }
    await this.#terminate();
    if (message.kind !== 'result') {
      throw new ProjectWorkerSupervisorError(
        'WORKER_MESSAGE_INVALID',
        this.request.requestId,
        undefined,
        {
          configPath: this.request.configPath,
          phase: 'compile',
        },
      );
    }
    return message.result;
  }

  async abort(): Promise<void> {
    if (this.#settled) {
      await this.#termination;
      return;
    }
    const pending = this.#pending;
    this.#settled = true;
    this.#cleanup();
    pending?.reject(
      new ProjectWorkerSupervisorError(
        'WORKER_ABORTED',
        this.request.requestId,
        undefined,
        {
          configPath: this.request.configPath,
          phase: this.#phase,
        },
      ),
    );
    try {
      await send(this.child, {
        protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
        kind: 'abort',
        requestId: this.request.requestId,
      });
    } finally {
      await this.#terminate();
    }
  }
}

export async function spawnProjectWorker(
  input: ProjectExecutionRequest,
  options: SpawnProjectWorkerOptions,
): Promise<ProjectWorkerSession> {
  const request = parseProjectExecutionRequest(input);
  const executionProfile = options.executionProfile ?? 'trusted-local-v1';
  if (executionProfile === 'isolated-ci-v1') {
    throw new ProjectWorkerSupervisorError(
      'WORKER_ISOLATION_UNAVAILABLE',
      request.requestId,
      undefined,
      { configPath: request.configPath, phase: 'inventory' },
    );
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('timeoutMs must be a positive safe integer.');
  }
  const spawnProcess = options.spawnProcess ?? spawn;
  const modulePath = workerPath(options.workerModuleUrl);
  const child = spawnProcess(
    process.execPath,
    [...workerArguments(request, modulePath)],
    {
      cwd: request.workspaceRoot,
      env: createProjectWorkerEnvironment(),
      shell: false,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    },
  );
  const channel = new WorkerChannel(child, request, timeoutMs);
  try {
    const inventory = channel.next('inventory');
    await send(child, {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'initialize',
      request,
    });
    const message = await inventory;
    if (message.kind !== 'inventory') {
      throw new ProjectWorkerSupervisorError(
        'WORKER_MESSAGE_INVALID',
        request.requestId,
        undefined,
        { configPath: request.configPath, phase: 'inventory' },
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
