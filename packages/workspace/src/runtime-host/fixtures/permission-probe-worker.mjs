import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';

const protocolVersion = '1';

function accessDenied(error) {
  return error?.code === 'ERR_ACCESS_DENIED';
}

function probe(request) {
  const capability = request.rootPolicy?.fixture;
  try {
    if (capability === 'permission-write') {
      writeFileSync(
        resolve(request.workspaceRoot, 'permission-probe-output'),
        'unexpected write',
      );
      return false;
    }
    if (capability === 'permission-child') {
      return accessDenied(
        spawnSync(process.execPath, ['--version'], { encoding: 'utf8' }).error,
      );
    }
    if (capability === 'permission-worker') {
      const worker = new Worker('', { eval: true });
      void worker.terminate();
      return false;
    }
  } catch (error) {
    return accessDenied(error);
  }
  return false;
}

process.on('message', (message) => {
  if (message?.protocolVersion !== protocolVersion) process.exit(2);
  if (message.kind === 'initialize') {
    process.send?.({
      protocolVersion,
      kind: 'inventory',
      requestId: message.request.requestId,
      inventory: {
        projectId: probe(message.request) ? 'denied' : 'allowed',
        sourceIds: [],
        formIds: [],
      },
    });
    return;
  }
  if (message.kind === 'abort') process.exit(0);
});
