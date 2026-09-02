import {
  defineRuntimeHostModuleDescriptor,
  RUNTIME_HOST_PROTOCOL_VERSION,
  type RuntimeHostModuleDescriptor,
} from '@formly-contract/workspace/runtime-host';

export const ANGULAR_AUTHORING_RUNTIME_HOST_ID =
  '@formly-contract/angular-authoring' as const;
export const ANGULAR_AUTHORING_RUNTIME_HOST_VERSION = '0.1.0' as const;

/** Reserved descriptor for the separate future AOT browser authoring host. */
export function angularAuthoringRuntimeHost(): RuntimeHostModuleDescriptor {
  return defineRuntimeHostModuleDescriptor({
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    id: ANGULAR_AUTHORING_RUNTIME_HOST_ID,
    version: ANGULAR_AUTHORING_RUNTIME_HOST_VERSION,
    moduleUrl: new URL('./authoring-host.js', import.meta.url).href,
    exportName: 'createWorkspaceRuntimeHost',
  });
}
