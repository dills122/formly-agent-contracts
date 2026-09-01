import { resolve } from 'node:path';

import { parseRootConfig, type WorkspaceCliOverrides } from './config.js';
import { loadWorkspaceProjectConfig } from './load-config.js';
import {
  inventoryProjectExecution,
  type InventoriedProjectExecution,
} from './project-execution.js';
import {
  createWorkspaceRuntimeBootstrapContext,
  loadWorkspaceRuntimeHost,
} from './runtime-host/bootstrap.js';
import {
  parseRuntimeHostParentMessage,
  RUNTIME_HOST_PROTOCOL_VERSION,
  type ProjectExecutionRequest,
  type RuntimeHostFailureCode,
} from './runtime-host/protocol.js';

let request: ProjectExecutionRequest | undefined;
let project: InventoriedProjectExecution | undefined;
let phase: 'bootstrap' | 'inventory' | 'compile' = 'bootstrap';
let busy = false;
let runtimePackages:
  | readonly { readonly name: string; readonly version: string }[]
  | undefined;

function send(message: object): void {
  if (process.send === undefined) process.exit(2);
  process.send(message);
}

function failure(code: RuntimeHostFailureCode): never {
  send({
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    kind: 'failure',
    requestId: request?.requestId ?? 'worker:uninitialized',
    code,
    phase,
  });
  process.disconnect();
  process.exit(1);
}

async function initialize(nextRequest: ProjectExecutionRequest): Promise<void> {
  request = nextRequest;
  let nativeModules: readonly string[] | undefined;
  try {
    if (request.runtimeHost !== undefined) {
      const host = await loadWorkspaceRuntimeHost(request.runtimeHost);
      const bootstrap = await host.beforeConfigLoad(
        createWorkspaceRuntimeBootstrapContext({
          configPath: resolve(request.workspaceRoot, request.configPath),
          runtimeResolutionBase: resolve(
            request.workspaceRoot,
            request.runtimeResolutionBase,
          ),
          ...(request.tsconfigPath === undefined
            ? {}
            : {
                tsconfigPath: resolve(
                  request.workspaceRoot,
                  request.tsconfigPath,
                ),
              }),
        }),
      );
      nativeModules = bootstrap?.nativeModules;
      runtimePackages = bootstrap?.runtimePackages;
    }
  } catch {
    failure('HOST_LOAD_FAILED');
  }

  phase = 'inventory';
  try {
    const rootConfig = parseRootConfig(request.rootPolicy);
    const projectConfig = await loadWorkspaceProjectConfig(
      resolve(request.workspaceRoot, request.configPath),
      {
        ...(request.tsconfigPath === undefined
          ? {}
          : {
              tsconfigPath: resolve(
                request.workspaceRoot,
                request.tsconfigPath,
              ),
            }),
        ...(nativeModules === undefined ? {} : { nativeModules }),
        moduleCache: true,
      },
    );
    project = await inventoryProjectExecution({
      configPath: request.configPath,
      rootConfig,
      projectConfig,
      ...(request.cliOverrides === undefined
        ? {}
        : { cliOverrides: request.cliOverrides as WorkspaceCliOverrides }),
    });
  } catch {
    failure('PROJECT_INVENTORY_FAILED');
  }
  send({
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    kind: 'inventory',
    requestId: request.requestId,
    inventory: project.inventory,
  });
}

async function handle(input: unknown): Promise<void> {
  if (busy) failure('PROTOCOL_INVALID');
  busy = true;
  let message;
  try {
    message = parseRuntimeHostParentMessage(input);
  } catch {
    failure('PROTOCOL_INVALID');
  }
  if (message.kind === 'initialize') {
    if (request !== undefined) failure('PROTOCOL_INVALID');
    await initialize(message.request);
    busy = false;
    return;
  }
  if (
    request === undefined ||
    project === undefined ||
    message.requestId !== request.requestId
  ) {
    failure('PROTOCOL_INVALID');
  }
  if (message.kind === 'abort') failure('WORKER_ABORTED');

  phase = 'compile';
  try {
    const compiled = project.compile();
    const result = {
      ...compiled,
      ...(runtimePackages === undefined ? {} : { runtimePackages }),
    };
    send({
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'result',
      requestId: request.requestId,
      result,
    });
    process.disconnect();
  } catch {
    failure('PROJECT_COMPILE_FAILED');
  }
}

process.on('message', (message) => {
  void handle(message);
});

process.on('disconnect', () => process.exit(0));
