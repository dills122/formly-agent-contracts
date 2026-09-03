export function createWorkspaceRuntimeHost(options) {
  if (options?.mode === 'throw') {
    throw new Error('intentional host factory failure');
  }
  return {
    protocolVersion: '1',
    id:
      options?.mode === 'mismatch'
        ? '@formly-contract/mismatched-host'
        : '@formly-contract/fixture-host',
    version: '1.0.0',
    async beforeConfigLoad() {},
  };
}
