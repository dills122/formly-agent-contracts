import { setImmediate, setTimeout } from 'node:timers';

const protocolVersion = '1';
let currentRequest;

process.on('message', (message) => {
  if (message?.protocolVersion !== protocolVersion) process.exit(2);
  if (message.kind === 'initialize') {
    const { request } = message;
    currentRequest = request;
    if (request.rootPolicy?.fixture === 'malformed') {
      process.send?.({ protocolVersion, kind: 'unexpected' });
      return;
    }
    if (request.rootPolicy?.fixture === 'crash') process.exit(3);
    if (request.rootPolicy?.fixture === 'timeout') return;
    if (request.rootPolicy?.fixture === 'cross-variant') {
      process.send?.({
        protocolVersion,
        kind: 'inventory',
        requestId: request.requestId,
        inventory: {
          projectId: 'fixture',
          sourceIds: ['fixture/forms'],
          formIds: ['fixture.form'],
        },
        explanation: {
          causes: [{ name: 'Error', message: 'must not be accepted' }],
          frames: [],
        },
      });
      return;
    }
    if (
      request.rootPolicy?.fixture === 'failure' ||
      request.rootPolicy?.fixture === 'unsolicited-failure'
    ) {
      const includeExplanation =
        request.explain === true ||
        request.rootPolicy?.fixture === 'unsolicited-failure';
      process.send?.({
        protocolVersion,
        kind: 'failure',
        requestId: request.requestId,
        code: 'PROJECT_CONFIG_LOAD_FAILED',
        phase: 'inventory',
        ...(includeExplanation
          ? {
              explanation: {
                causes: [
                  {
                    name: 'ReferenceError',
                    message:
                      "Cannot access 'NumberComponent' before initialization",
                  },
                ],
                frames: [
                  {
                    path: 'libs/forms-kit/src/lib/number.component.ts',
                    line: 12,
                    column: 7,
                  },
                ],
              },
            }
          : {}),
      });
      return;
    }
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
    if (request.rootPolicy?.fixture === 'late-failure') {
      setTimeout(() => {
        process.send?.({
          protocolVersion,
          kind: 'failure',
          requestId: request.requestId,
          code: 'PROJECT_COMPILE_FAILED',
          phase: 'compile',
        });
      }, 10);
    }
    if (request.rootPolicy?.fixture === 'early-result') {
      setImmediate(() => {
        process.send?.({
          protocolVersion,
          kind: 'result',
          requestId: request.requestId,
          result: { artifacts: [] },
        });
      });
    }
    if (request.rootPolicy?.fixture === 'exit-after-inventory') {
      setImmediate(() => process.exit(4));
    }
    return;
  }
  if (message.kind === 'approve') {
    if (currentRequest?.rootPolicy?.fixture === 'compile-failure') {
      process.send?.({
        protocolVersion,
        kind: 'failure',
        requestId: message.requestId,
        code: 'PROJECT_COMPILE_FAILED',
        phase: 'compile',
        ...(currentRequest.explain === true
          ? {
              explanation: {
                causes: [
                  {
                    name: 'Error',
                    message: 'Factory failed during compilation',
                  },
                ],
                frames: [],
              },
            }
          : {}),
      });
      return;
    }
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
