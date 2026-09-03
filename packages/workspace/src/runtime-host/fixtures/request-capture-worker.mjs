import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const protocolVersion = '1';

process.on('message', async (message) => {
  if (message?.protocolVersion !== protocolVersion) process.exit(2);
  if (message.kind === 'initialize') {
    const { request } = message;
    await writeFile(
      resolve(request.workspaceRoot, '.captured-project-request.json'),
      JSON.stringify(request),
    );
    process.send?.({
      protocolVersion,
      kind: 'inventory',
      requestId: request.requestId,
      inventory: {
        projectId: 'captured',
        sourceIds: [],
        formIds: [],
      },
    });
    return;
  }
  if (message.kind === 'abort') process.exit(0);
});
