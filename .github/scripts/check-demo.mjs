import { spawnSync } from 'node:child_process';

import {
  parseFormContract,
  verifyContentHash,
} from '../../packages/schema/dist/index.js';

function runCompiledDemo() {
  const result = spawnSync(process.execPath, ['apps/demo-cli/dist/index.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

const firstOutput = runCompiledDemo();
const secondOutput = runCompiledDemo();
if (secondOutput !== firstOutput) {
  throw new Error('Two golden demo runs must be byte-for-byte identical.');
}

const contract = parseFormContract(JSON.parse(firstOutput));
const diagnosticCodes = new Set(
  contract.diagnostics.map(({ code }) => code),
);

if (!verifyContentHash(contract)) {
  throw new Error('Golden contract content hash is invalid.');
}
if (contract.formId !== 'demo.golden-form' || contract.nodes.length !== 4) {
  throw new Error('Golden contract does not contain the expected root nodes.');
}
if (!contract.nodes.some(({ kind }) => kind === 'display')) {
  throw new Error('Golden contract must contain its display-only node.');
}
if (
  !contract.nodes.some(
    ({ optionSource }) => optionSource?.kind === 'dynamic',
  )
) {
  throw new Error('Golden contract must expose its dynamic option source.');
}
if (
  !contract.nodes.some((node) =>
    [node, ...node.children].some(({ locators }) =>
      locators.some(({ strategy }) => strategy === 'testId'),
    ),
  )
) {
  throw new Error('Golden contract must expose an exact test locator.');
}
if (!diagnosticCodes.has('OPAQUE_FUNCTION')) {
  throw new Error('Golden contract must expose its opaque behavior.');
}

console.log('Demo smoke check passed.');
