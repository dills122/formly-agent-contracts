---
title: CLI and API
description: Discover, generate, and check Formly Contract workspaces from the command line or programmatically.
---

## CLI

```text
Usage: formly-contracts <command> [options]

Commands:
  generate  Write deterministic Form Contract artifacts
  list      List configured projects and sources without running form factories
  check     Verify generated artifacts are current without writing them

Options:
  --workspace-root <path>  Workspace root (default: current directory)
  --config <path>          Root config path (default: formly-contracts.config.ts)
  --output <path>          Override output for generate or check
  --fail-on <severity>     Fail on warning or error; generate or check only
  -h, --help               Show this help
```

Use repeatable `--fail-on` flags to select both severities. `list` rejects
`--output` and `--fail-on` because it does not generate contracts.

## Programmatic workspace API

```ts
import {
  checkWorkspace,
  discoverWorkspaceProjects,
  runWorkspace,
} from '@formly-contract/workspace';

const options = {
  workspaceRoot: process.cwd(),
  rootConfigPath: 'formly-contracts.config.ts',
};

const discovered = await discoverWorkspaceProjects(options);
const generated = await runWorkspace(options);
const checked = await checkWorkspace(options);
```

The runner returns `indexPath` and `artifactPaths`. The checker returns current
state plus exact missing/stale differences.

## Parse generated data

```ts
import { parseFormContract } from '@formly-contract/schema';
import { parseWorkspaceContractIndex } from '@formly-contract/workspace';

const index = parseWorkspaceContractIndex(indexJson);
const contract = parseFormContract(contractJson);
```

Always parse untrusted or stored JSON before using it as test context.

## Direct compiler API

`extractFormContract` performs declared projection from a fresh Formly field
tree. `compileFormContractScenario` performs controlled scenario compilation
with caller-supplied, trusted Formly build dependencies. Use the workspace
runner for multi-project generation unless a focused tool genuinely owns a
single form instance.

:::note[Canonical source]
The public exports in
[`packages/workspace/src/index.ts`](https://github.com/dills122/formly-contract/blob/main/packages/workspace/src/index.ts)
and [`packages/schema/src/index.ts`](https://github.com/dills122/formly-contract/blob/main/packages/schema/src/index.ts)
are authoritative.
:::
