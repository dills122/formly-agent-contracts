import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers';

const protocolVersion = '1';
let currentRequest;

function projectId(configPath) {
  return configPath.includes('alpha') ? 'alpha' : 'beta';
}

function delay(request) {
  const reverse =
    request.rootPolicy?.plugins?.[0]?.options?.reverse === true ||
    existsSync(resolve(request.workspaceRoot, '.ordered-worker-reverse'));
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
    const id = projectId(currentRequest.configPath);
    const options = currentRequest.rootPolicy?.plugins?.[0]?.options;
    const compileDelay = options?.slowProject === id ? 2_000 : delay(currentRequest);
    setTimeout(() => {
      if (options?.lateFailureProject === id) {
        process.send?.({
          protocolVersion,
          kind: 'failure',
          requestId: message.requestId,
          code: 'PROJECT_COMPILE_FAILED',
          phase: 'compile',
        });
        return;
      }
      const mismatchProject = options?.mismatchProject;
      process.send?.({
        protocolVersion,
        kind: 'result',
        requestId: message.requestId,
        result: {
          project: {
            schemaVersion: '0.2.0',
            configPath: currentRequest.configPath,
            projectId: mismatchProject === id ? `${id}.mismatch` : id,
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
    }, compileDelay);
    return;
  }
  if (message.kind === 'abort') process.exit(0);
});
