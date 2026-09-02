import {
  checkWorkspace,
  discoverWorkspaceProjectsInWorkers,
  runWorkspace,
  type DiscoveredWorkspace,
  type RunWorkspaceOptions,
  type WorkspaceCheckResult,
  type WorkspaceRunResult,
} from '@formly-contract/workspace';
import {
  defineRuntimeHostModuleDescriptor,
  RUNTIME_HOST_PROTOCOL_VERSION,
  type RuntimeHostModuleDescriptor,
} from '@formly-contract/workspace/runtime-host';

export const ANGULAR_JIT_RUNTIME_HOST_ID =
  '@formly-contract/angular-jit' as const;
export const ANGULAR_JIT_RUNTIME_HOST_VERSION = '0.1.0' as const;

/**
 * Returns a Node-safe descriptor. Angular is resolved only inside the selected
 * project worker after runtime preflight.
 */
export function angularJitRuntimeHost(
  options?: RuntimeHostModuleDescriptor['options'],
): RuntimeHostModuleDescriptor {
  return defineRuntimeHostModuleDescriptor({
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    id: ANGULAR_JIT_RUNTIME_HOST_ID,
    version: ANGULAR_JIT_RUNTIME_HOST_VERSION,
    moduleUrl: new URL('./project-host.js', import.meta.url).href,
    exportName: 'createWorkspaceRuntimeHost',
    ...(options === undefined ? {} : { options }),
  });
}

/** Runs generation with every project config and form factory isolated in a disposable worker. */
export function runAngularWorkspace(
  options: RunWorkspaceOptions,
): Promise<WorkspaceRunResult> {
  return runWorkspace({
    ...options,
    projectExecution: {
      kind: 'workers',
      runtimeHost: angularJitRuntimeHost(),
      ...(options.projectExecution?.timeoutMs === undefined
        ? {}
        : { timeoutMs: options.projectExecution.timeoutMs }),
      ...(options.projectExecution?.workerModuleUrl === undefined
        ? {}
        : { workerModuleUrl: options.projectExecution.workerModuleUrl }),
    },
  });
}

/** Checks committed artifacts through the same isolated Angular runtime path. */
export function checkAngularWorkspace(
  options: RunWorkspaceOptions,
): Promise<WorkspaceCheckResult> {
  return checkWorkspace({
    ...options,
    projectExecution: {
      kind: 'workers',
      runtimeHost: angularJitRuntimeHost(),
      ...(options.projectExecution?.timeoutMs === undefined
        ? {}
        : { timeoutMs: options.projectExecution.timeoutMs }),
      ...(options.projectExecution?.workerModuleUrl === undefined
        ? {}
        : { workerModuleUrl: options.projectExecution.workerModuleUrl }),
    },
  });
}

/** Inventories Angular-backed project configs without invoking form factories. */
export function discoverAngularWorkspace(
  options: RunWorkspaceOptions,
): Promise<Pick<DiscoveredWorkspace, 'inventory' | 'failures'>> {
  return discoverWorkspaceProjectsInWorkers({
    ...options,
    projectExecution: {
      kind: 'workers',
      runtimeHost: angularJitRuntimeHost(),
      ...(options.projectExecution?.timeoutMs === undefined ? {} : { timeoutMs: options.projectExecution.timeoutMs }),
      ...(options.projectExecution?.workerModuleUrl === undefined ? {} : { workerModuleUrl: options.projectExecution.workerModuleUrl }),
    },
  });
}
