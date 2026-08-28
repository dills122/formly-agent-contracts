#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildGateReport, canonicalJson } from './lib.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/research/form-lineage/lin-0/run-gate.mjs --input <input.json>',
    '    [--output <report.json>] [--check <expected-report.json>]',
  ].join('\n');
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (
      value === undefined ||
      (flag !== '--input' && flag !== '--output' && flag !== '--check')
    ) {
      throw new TypeError(usage());
    }
    const key = flag.slice(2);
    if (options[key] !== undefined) {
      throw new TypeError(`Duplicate ${flag}.\n${usage()}`);
    }
    options[key] = value;
  }
  if (options.input === undefined) throw new TypeError(usage());
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const report = await buildGateReport(resolve(options.input));
  const serialized = canonicalJson(report);

  if (options.check !== undefined) {
    const expected = await readFile(resolve(options.check), 'utf8');
    if (expected !== serialized) {
      throw new Error('LIN-0 retained report differs from the reproduced report.');
    }
  }
  if (options.output !== undefined) {
    await writeFile(resolve(options.output), serialized);
  }
  if (options.output === undefined && options.check === undefined) {
    process.stdout.write(serialized);
  }
}

try {
  await main();
} catch {
  console.error(
    'LIN-0 gate failed. Review the input contract and declared local evidence.',
  );
  process.exitCode = 1;
}
