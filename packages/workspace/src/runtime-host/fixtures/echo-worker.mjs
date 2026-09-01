const protocolVersion = '1';

process.on('message', (message) => {
  if (message?.protocolVersion !== protocolVersion) process.exit(2);
  if (message.kind === 'initialize') {
    const { request } = message;
    if (request.rootPolicy?.fixture === 'malformed') {
      process.send?.({ protocolVersion, kind: 'unexpected' });
      return;
    }
    if (request.rootPolicy?.fixture === 'timeout') return;
    process.send?.({
      protocolVersion,
      kind: 'inventory',
      requestId: request.requestId,
      inventory: {
        projectId: 'fixture',
        sourceIds: ['fixture/forms'],
        formIds: ['fixture.form'],
      },
    });
    return;
  }
  if (message.kind === 'approve') {
    process.send?.({
      protocolVersion,
      kind: 'result',
      requestId: message.requestId,
      result: { artifacts: [] },
    });
    return;
  }
  if (message.kind === 'abort') process.exit(0);
});
