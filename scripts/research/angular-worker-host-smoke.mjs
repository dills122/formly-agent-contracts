import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  checkAngularWorkspace,
  discoverAngularWorkspace,
} from '../../packages/angular/dist/jit.js';

const fixtureRoot = resolve('fixtures/angular-monorepo');

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
  runtimeProvenance: golden.runtimeProvenance,
});
if (
  isolated.projectFailures?.length !== 1 ||
  isolated.projectFailures[0]?.configPath !== 'angular-jit-bad.project.ts' ||
  isolated.indexPath !== 'dist/formly-contracts/workspace-index.json'
) {
  throw new Error('Angular worker did not isolate and report the bad project.');
}
process.stdout.write('PASS one bad Angular project is isolated and reported\n');

const checked = await checkAngularWorkspace({
  workspaceRoot: fixtureRoot,
  rootConfigPath: 'formly-contracts.config.ts',
  runtimeProvenance: golden.runtimeProvenance,
});
if (checked.artifactPaths.length !== 6) {
  throw new Error(`Expected six compiled contracts, received ${checked.artifactPaths.length}.`);
}
process.stdout.write('PASS Angular workers compile all retained fixture contracts in check mode\n');
