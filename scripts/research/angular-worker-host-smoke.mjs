import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  checkAngularWorkspace,
  discoverAngularWorkspace,
} from '../../packages/angular/dist/jit.js';

const fixtureRoot = resolve('fixtures/angular-monorepo');
const angularCli = resolve('packages/angular/dist/cli-main.js');

function runFailingAngularCheck(configPath, explain = false) {
  const result = spawnSync(
    process.execPath,
    [
      angularCli,
      'check',
      '--workspace-root',
      fixtureRoot,
      '--config',
      configPath,
      ...(explain ? ['--explain'] : []),
    ],
    { encoding: 'utf8' },
  );
  if (result.error !== undefined) throw result.error;
  if (result.status !== 1 || result.stdout !== '') {
    throw new Error(
      `Expected fail-closed Angular check for ${configPath}; received status ${result.status}.`,
    );
  }
  return result.stderr;
}

const browserBarrel = await discoverAngularWorkspace({
  workspaceRoot: fixtureRoot,
  rootConfigPath: 'formly-contracts.angular-jit-proof.config.ts',
});
if (
  browserBarrel.inventory.projects.length !== 1 ||
  browserBarrel.inventory.projects[0]?.projectId !== 'fixture-angular-jit-proof'
) {
  throw new Error('Angular worker did not inventory the browser-barrel proof project.');
}
process.stdout.write('PASS Angular worker preloads the compiler before a browser barrel\n');

const golden = JSON.parse(
  await readFile(
    resolve(fixtureRoot, 'goldens/workspace-index.golden.json'),
    'utf8',
  ),
);
const isolated = await checkAngularWorkspace({
  workspaceRoot: fixtureRoot,
  rootConfigPath: 'formly-contracts.angular-jit-isolation.config.ts',
  continueOnProjectError: true,
  explain: true,
  runtimeProvenance: golden.runtimeProvenance,
});
if (
  isolated.projectFailures?.length !== 1 ||
  isolated.projectFailures[0]?.configPath !== 'angular-jit-bad.project.ts' ||
  isolated.projectFailures[0]?.code !== 'PROJECT_CONFIG_LOAD_FAILED' ||
  isolated.projectFailures[0]?.phase !== 'inventory' ||
  isolated.projectFailures[0]?.explanation?.causes[1]?.message !==
    'Intentional retained project-isolation failure.' ||
  isolated.projectFailures[0]?.explanation?.frames.some(({ path }) =>
    path.startsWith('/'),
  ) ||
  isolated.indexPath !== 'dist/formly-contracts/workspace-index.json'
) {
  throw new Error('Angular worker did not isolate and report the bad project.');
}
process.stdout.write('PASS one bad Angular project is isolated and reported\n');

const defaultInventoryFailure = runFailingAngularCheck(
  'formly-contracts.angular-jit-isolation.config.ts',
);
if (
  !defaultInventoryFailure.includes(
    'Check failed [PROJECT_CONFIG_LOAD_FAILED] phase=inventory config="angular-jit-bad.project.ts"',
  ) ||
  defaultInventoryFailure.includes('Intentional retained project-isolation failure.') ||
  defaultInventoryFailure.includes('Explanation (local only):')
) {
  throw new Error('Default Angular CLI output did not preserve safe inventory classification.');
}

const explainedInventoryFailure = runFailingAngularCheck(
  'formly-contracts.angular-jit-isolation.config.ts',
  true,
);
if (
  !explainedInventoryFailure.includes(
    'Check failed [PROJECT_CONFIG_LOAD_FAILED] phase=inventory config="angular-jit-bad.project.ts"',
  ) ||
  !explainedInventoryFailure.includes(
    'Cause 2: TypeError: Intentional retained project-isolation failure.',
  ) ||
  !explainedInventoryFailure.includes('at angular-jit-bad.project.ts:1:116') ||
  explainedInventoryFailure.includes(fixtureRoot)
) {
  throw new Error('Explained Angular CLI output lost inventory diagnostics.');
}

const explainedCompileFailure = runFailingAngularCheck(
  'formly-contracts.angular-jit-compile-failure.config.ts',
  true,
);
if (
  !explainedCompileFailure.includes(
    'Check failed [PROJECT_COMPILE_FAILED] phase=compile config="angular-jit-compile-bad.project.ts"',
  ) ||
  !explainedCompileFailure.includes(
    'TypeError: Intentional retained Angular compile failure.',
  ) ||
  !explainedCompileFailure.includes('at angular-jit-compile-bad.project.ts:') ||
  explainedCompileFailure.includes(fixtureRoot)
) {
  throw new Error('Explained Angular CLI output lost compile diagnostics.');
}
process.stdout.write('PASS fail-closed Angular CLI preserves inventory and compile diagnostics\n');

const checked = await checkAngularWorkspace({
  workspaceRoot: fixtureRoot,
  rootConfigPath: 'formly-contracts.config.ts',
  runtimeProvenance: golden.runtimeProvenance,
});
if (checked.artifactPaths.length !== 6) {
  throw new Error(`Expected six compiled contracts, received ${checked.artifactPaths.length}.`);
}
process.stdout.write('PASS Angular workers compile all retained fixture contracts in check mode\n');
