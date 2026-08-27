#!/usr/bin/env node

import { runWorkspaceCli } from './cli.js';

process.exitCode = await runWorkspaceCli(process.argv.slice(2));
