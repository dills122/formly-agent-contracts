import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { URL } from 'node:url';

const chromePath =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputRoot = resolve(
  process.argv[2] ??
    'scripts/research/angular-field-authoring/.generated/render-host/browser',
);

const mimeTypes = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.map', 'application/json'],
]);

async function createStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      const candidate = resolve(outputRoot, normalize(relative));
      if (!candidate.startsWith(`${outputRoot}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const file = await readFile(candidate);
      response.writeHead(200, {
        'content-type': mimeTypes.get(extname(candidate)) ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(file);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolveListen) =>
    server.listen(0, '127.0.0.1', resolveListen),
  );
  const address = server.address();
  if (address == null || typeof address === 'string') {
    throw new Error('Static server did not expose a TCP address.');
  }
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

class CdpSession {
  #id = 0;
  #pending = new Map();

  constructor(socket) {
    this.socket = socket;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id == null) return;
      const pending = this.#pending.get(message.id);
      if (pending == null) return;
      this.#pending.delete(message.id);
      if (message.error != null) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  command(method, params = {}) {
    const id = ++this.#id;
    return new Promise((resolveCommand, rejectCommand) => {
      this.#pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function connectSocket(url) {
  const socket = new globalThis.WebSocket(url);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });
  return socket;
}

async function waitForFile(path, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await stat(path);
      return;
    } catch {
      await delay(50);
    }
  }
  throw new Error(`Timed out waiting for ${path}.`);
}

async function evaluate(session, expression) {
  const result = await session.command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails != null) {
    throw new Error(result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitForOutcome(session) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const result = await evaluate(
      session,
      `({ready: window.__RH03_READY__ ?? null, error: window.__RH03_ERROR__ ?? null})`,
    );
    if (result.error != null) return { kind: 'error', error: result.error };
    if (result.ready != null) return { kind: 'ready', ready: result.ready };
    await delay(50);
  }
  throw new Error('Timed out waiting for the Angular authoring shell.');
}

async function runScope(origin, scope, expectedError) {
  const temporary = await mkdtemp(join(tmpdir(), `rh03-chrome-${scope}-`));
  const activePortPath = join(temporary, 'DevToolsActivePort');
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${temporary}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let chromeError = '';
  chrome.stderr.on('data', (chunk) => {
    chromeError += String(chunk);
  });

  try {
    await waitForFile(activePortPath);
    const [port] = (await readFile(activePortPath, 'utf8')).trim().split('\n');
    const target = await globalThis.fetch(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(
        `${origin}/?scope=${scope}`,
      )}`,
      { method: 'PUT' },
    ).then((response) => response.json());
    const socket = await connectSocket(target.webSocketDebuggerUrl);
    const session = new CdpSession(socket);
    await session.command('Runtime.enable');
    const outcome = await waitForOutcome(session);
    if (expectedError != null) {
      if (outcome.kind !== 'error' || !outcome.error.includes(expectedError)) {
        throw new Error(
          `Expected ${expectedError}, received ${JSON.stringify(outcome)}.`,
        );
      }
      socket.close();
      return { expectedFailure: expectedError, observed: outcome.error };
    }
    if (outcome.kind === 'error') throw new Error(outcome.error);
    const ready = outcome.ready;

    let observation;
    if (scope === 'root') {
      observation = await evaluate(
        session,
        `(async () => {
          const input = document.querySelector('[role="textbox"]');
          input.value = 'linked external template';
          input.dispatchEvent(new Event('input', {bubbles: true}));
          await new Promise(resolve => setTimeout(resolve, 0));
          return {
            opaqueChild: document.querySelector('[data-opaque-child="true"]')?.textContent,
            externalStyle: getComputedStyle(document.querySelector('research-partial-external-field')).borderInlineStartWidth,
            snapshot: window.__RH03_SNAPSHOT__(),
          };
        })()`,
      );
    } else if (scope === 'feature-overlay') {
      observation = await evaluate(
        session,
        `(async () => {
          const trigger = document.querySelector('[role="combobox"]');
          trigger.click();
          await new Promise(resolve => setTimeout(resolve, 0));
          const popup = document.querySelector('[role="listbox"]');
          const association = trigger.getAttribute('aria-controls') === popup.id;
          const documentRoot = popup.parentElement === document.body;
          [...popup.querySelectorAll('[role="option"]')].find(element => element.textContent.trim() === 'South').click();
          await new Promise(resolve => setTimeout(resolve, 0));
          return {association, documentRoot, snapshot: window.__RH03_SNAPSHOT__()};
        })()`,
      );
    } else {
      observation = await evaluate(
        session,
        `({
          statusCount: document.querySelectorAll('[role="status"]').length,
          interactiveCount: document.querySelectorAll('button,input,select,textarea,[role="combobox"]').length,
          snapshot: window.__RH03_SNAPSHOT__(),
        })`,
      );
    }

    const teardown = await evaluate(
      session,
      `(() => {
        const result = window.__RH03_DESTROY__();
        return {
          ...result,
          scenarioRootCount: document.querySelectorAll('[data-rh03-scenario-root]').length,
          popupCount: document.querySelectorAll('[role="listbox"]').length,
        };
      })()`,
    );
    socket.close();
    return { ready, observation, teardown };
  } catch (error) {
    throw new Error(`${error.message}\nChrome stderr:\n${chromeError}`, {
      cause: error,
    });
  } finally {
    chrome.kill('SIGTERM');
    await new Promise((resolveExit) => chrome.once('exit', resolveExit));
    await rm(temporary, { recursive: true, force: true });
  }
}

await stat(join(outputRoot, 'index.html'));
const { server, origin } = await createStaticServer();
try {
  const results = {};
  for (const scope of ['root', 'feature-overlay', 'feature-display']) {
    results[scope] = await runScope(origin, scope);
  }
  results['standalone-import-negative'] = await runScope(
    origin,
    'standalone-import-negative',
    'NG0800',
  );
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
