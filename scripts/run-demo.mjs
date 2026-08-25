import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const build = spawnSync(pnpmCommand, ['build:demo'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});

if (build.error !== undefined) {
  throw build.error;
}
if (build.status !== 0) {
  process.stderr.write(build.stdout);
  process.stderr.write(build.stderr);
  process.exit(build.status ?? 1);
}

const demo = spawnSync(process.execPath, ['apps/demo-cli/dist/index.js'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});

if (demo.error !== undefined) {
  throw demo.error;
}
if (demo.status !== 0) {
  process.stderr.write(demo.stdout);
  process.stderr.write(demo.stderr);
  process.exit(demo.status ?? 1);
}

process.stdout.write(demo.stdout);
