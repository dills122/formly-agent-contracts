import {
  RUNTIME_HOST_PROTOCOL_VERSION,
  type WorkspaceRuntimeHost,
} from '@formly-contract/workspace/runtime-host';

import {
  ANGULAR_AUTHORING_RUNTIME_HOST_ID,
  ANGULAR_AUTHORING_RUNTIME_HOST_VERSION,
} from './authoring.js';

/** Stable refusal until the distinct browser/AOT authoring host is implemented. */
export function createWorkspaceRuntimeHost(): WorkspaceRuntimeHost {
  return {
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    id: ANGULAR_AUTHORING_RUNTIME_HOST_ID,
    version: ANGULAR_AUTHORING_RUNTIME_HOST_VERSION,
    beforeConfigLoad() {
      throw new TypeError(
        'The Angular browser authoring runtime host is reserved but unavailable.',
      );
    },
  };
}
