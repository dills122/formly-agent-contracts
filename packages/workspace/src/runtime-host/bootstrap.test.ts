import { describe, expect, it } from 'vitest';

import {
  loadWorkspaceRuntimeHost,
  WorkspaceRuntimeHostLoadError,
} from './bootstrap.js';

const moduleUrl = new URL('./fixtures/runtime-host.mjs', import.meta.url).href;

function descriptor(mode?: 'mismatch' | 'throw') {
  return {
    protocolVersion: '1' as const,
    id: '@formly-contract/fixture-host',
    version: '1.0.0',
    moduleUrl,
    exportName: 'createWorkspaceRuntimeHost' as const,
    ...(mode === undefined ? {} : { options: { mode } }),
  };
}

describe('workspace runtime-host loading', () => {
  it('loads an exact descriptor identity', async () => {
    await expect(loadWorkspaceRuntimeHost(descriptor())).resolves.toMatchObject(
      {
        protocolVersion: '1',
        id: '@formly-contract/fixture-host',
        version: '1.0.0',
      },
    );
  });

  it('classifies descriptor identity mismatch separately from load failure', async () => {
    await expect(
      loadWorkspaceRuntimeHost(descriptor('mismatch')),
    ).rejects.toMatchObject({
      name: 'WorkspaceRuntimeHostLoadError',
      code: 'HOST_IDENTITY_MISMATCH',
    } satisfies Partial<WorkspaceRuntimeHostLoadError>);
    await expect(
      loadWorkspaceRuntimeHost(descriptor('throw')),
    ).rejects.toMatchObject({
      name: 'WorkspaceRuntimeHostLoadError',
      code: 'HOST_LOAD_FAILED',
    } satisfies Partial<WorkspaceRuntimeHostLoadError>);
  });
});
