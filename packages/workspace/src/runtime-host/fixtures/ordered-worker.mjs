import { setTimeout } from 'node:timers';

const protocolVersion = '1';
let currentRequest;

function projectId(configPath) {
  return configPath.includes('alpha') ? 'alpha' : 'beta';
}

function delay(request) {
  const reverse = request.rootPolicy?.plugins?.[0]?.options?.reverse === true;
  const alpha = projectId(request.configPath) === 'alpha';
  return reverse === alpha ? 35 : 5;
}

process.on('message', (message) => {
  if (message?.protocolVersion !== protocolVersion) process.exit(2);
  if (message.kind === 'initialize') {
    currentRequest = message.request;
    setTimeout(() => {
      process.send?.({
        protocolVersion,
        kind: 'inventory',
        requestId: currentRequest.requestId,
        inventory: {
          projectId: projectId(currentRequest.configPath),
          sourceIds: [],
          formIds: [],
        },
      });
    }, delay(currentRequest));
    return;
  }
  if (message.kind === 'approve') {
    setTimeout(() => {
      const id = projectId(currentRequest.configPath);
      process.send?.({
        protocolVersion,
        kind: 'result',
        requestId: message.requestId,
        result: {
          project: {
            schemaVersion: '0.2.0',
            configPath: currentRequest.configPath,
            projectId: id,
            sourceIds: [],
            outputDirectory: 'dist/formly-contracts',
            testIdAttributes: ['data-testid'],
            failOn: ['error'],
            effectCyclePolicy: 'error',
            plugins: [
              {
                id: 'fixture/order',
                version: '1',
                configSchemaVersion: '1',
              },
            ],
          },
          forms: [],
        },
      });
    }, delay(currentRequest));
    return;
  }
  if (message.kind === 'abort') process.exit(0);
});
