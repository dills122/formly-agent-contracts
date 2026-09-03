import { realpath } from 'node:fs/promises';
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
  WorkspaceRuntimeHostLoadError,
} from './runtime-host/bootstrap.js';
import { createRuntimeHostFailureExplanation } from './runtime-host/failure-explanation.js';
import {
  parseRuntimeHostParentMessage,
  RUNTIME_HOST_PROTOCOL_VERSION,
  type ProjectExecutionRequest,
  type RuntimeHostFailureCode,
} from './runtime-host/protocol.js';
import { canonicalWorkspaceRelativePath } from './workspace-paths.js';

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

function failure(code: RuntimeHostFailureCode, cause?: unknown): never {
  const explanation =
    request?.explain === true
      ? createRuntimeHostFailureExplanation(cause, request.workspaceRoot)
      : undefined;
  send({
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    kind: 'failure',
    requestId: request?.requestId ?? 'worker:uninitialized',
    code,
    phase,
    ...(explanation === undefined ? {} : { explanation }),
  });
  process.disconnect();
  process.exit(1);
}

async function initialize(nextRequest: ProjectExecutionRequest): Promise<void> {
  request = nextRequest;
  try {
    const workspaceRoot = await realpath(resolve(nextRequest.workspaceRoot));
    const [
      rootConfigPath,
      configPath,
      projectRoot,
      runtimeResolutionBase,
      tsconfigPath,
    ] = await Promise.all([
      canonicalWorkspaceRelativePath(
        workspaceRoot,
        nextRequest.rootConfigPath,
      ),
      canonicalWorkspaceRelativePath(workspaceRoot, nextRequest.configPath),
      canonicalWorkspaceRelativePath(workspaceRoot, nextRequest.projectRoot),
      canonicalWorkspaceRelativePath(
        workspaceRoot,
        nextRequest.runtimeResolutionBase,
      ),
      nextRequest.tsconfigPath === undefined
        ? undefined
        : canonicalWorkspaceRelativePath(
            workspaceRoot,
            nextRequest.tsconfigPath,
          ),
    ]);
    request = {
      ...nextRequest,
      workspaceRoot,
      rootConfigPath,
      configPath,
      projectRoot,
      runtimeResolutionBase,
      ...(tsconfigPath === undefined ? {} : { tsconfigPath }),
    };
  } catch (error) {
    failure('PROTOCOL_INVALID', error);
  }
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
  } catch (error) {
    failure(
      error instanceof WorkspaceRuntimeHostLoadError
        ? error.code
        : 'HOST_LOAD_FAILED',
      error,
    );
  }

  phase = 'inventory';
  let rootConfig: ReturnType<typeof parseRootConfig>;
  try {
    rootConfig = parseRootConfig(request.rootPolicy);
  } catch (error) {
    failure('PROJECT_INVENTORY_FAILED', error);
  }
  let projectConfig: Awaited<ReturnType<typeof loadWorkspaceProjectConfig>>;
  try {
    projectConfig = await loadWorkspaceProjectConfig(
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
  } catch (error) {
    failure('PROJECT_CONFIG_LOAD_FAILED', error);
  }
  try {
    project = await inventoryProjectExecution({
      configPath: request.configPath,
      rootConfig,
      projectConfig,
      ...(request.cliOverrides === undefined
        ? {}
        : { cliOverrides: request.cliOverrides as WorkspaceCliOverrides }),
    });
  } catch (error) {
    failure('PROJECT_INVENTORY_FAILED', error);
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
  } catch (error) {
    failure('PROJECT_COMPILE_FAILED', error);
  }
}

process.on('message', (message) => {
  void handle(message);
});

process.on('disconnect', () => process.exit(0));
