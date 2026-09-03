import { Buffer } from 'node:buffer';

const protocolVersion = '1';

function capture(name, value) {
  return `${name}/${Buffer.from(value ?? 'absent').toString('base64url')}`;
}

process.on('message', (message) => {
  if (message?.protocolVersion !== protocolVersion) process.exit(2);
  if (message.kind === 'initialize') {
    const { request } = message;
    process.send?.({
      protocolVersion,
      kind: 'inventory',
      requestId: request.requestId,
      inventory: {
        projectId: 'captured',
        sourceIds: [
          capture('root-config', request.rootConfigPath),
          capture('config', request.configPath),
          capture('project-root', request.projectRoot),
          capture('runtime-base', request.runtimeResolutionBase),
          capture('tsconfig', request.tsconfigPath),
        ],
        formIds: [],
      },
    });
    return;
  }
  if (message.kind === 'abort') process.exit(0);
});
