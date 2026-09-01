#!/usr/bin/env node

import { runWorkspaceCli } from '@formly-contract/workspace/cli';

import {
  checkAngularWorkspace,
  discoverAngularWorkspace,
  runAngularWorkspace,
} from './jit.js';

process.exitCode = await runWorkspaceCli(process.argv.slice(2), {
  generate: runAngularWorkspace,
  check: checkAngularWorkspace,
  list: discoverAngularWorkspace,
});
