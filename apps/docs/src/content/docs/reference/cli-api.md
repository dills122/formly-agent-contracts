---
title: CLI and API
description: Discover, author, generate, and check Formly Contract workspaces from the command line or programmatically.
---

## CLI

```text
Usage: formly-contracts <command> [options]

Commands:
  generate  Write deterministic Form Contract artifacts
  list      List configured projects and sources without running form factories
  check     Verify generated artifacts are current without writing them
  author-factory-inputs  Print read-only typed factory-input drafts for review

Options:
  --workspace-root <path>  Workspace root (default: current directory)
  --config <path>          Root config path (default: formly-contracts.config.ts)
  --output <path>          Override output for generate or check
  --fail-on <severity>     Fail on warning or error; generate or check only
  --form-id <id>           Select a stable form ID; author-factory-inputs only
  -h, --help               Show this help
```

Use repeatable `--fail-on` flags to select both severities. `list` rejects
`--output` and `--fail-on` because it does not generate contracts.
`author-factory-inputs` also rejects those write-oriented options and accepts a
repeatable `--form-id` filter instead.

## Review factory inputs locally

```sh
pnpm exec formly-contracts author-factory-inputs \
  --workspace-root . \
  --config formly-contracts.config.ts \
  --form-id claims.indexing
```

The command follows the existing project, source, definition, and
`lineage.rootSymbol` chain to the real factory declaration. It does not require
a second file/symbol registry. For supported direct-use patterns it prints a
typed `Partial<Options>` draft, a workspace-relative suggested path, and
separate generated, explicit, ambiguous, and unsupported counts.

This is a local, read-only authoring aid. It does not call source `list()`
functions or application factories, subscribe to Observables, access Angular
views, write the suggested file, or add the draft to portable contracts. Copy
and review the output beside the definition if it is useful. Explicit business
values and bindings still require an author; unsupported or ambiguous inputs
remain visible instead of receiving invented values.

## Programmatic workspace API

```ts
import {
  checkWorkspace,
  discoverWorkspaceProjects,
  inspectWorkspaceFactoryInputs,
  runWorkspace,
} from "@formly-contract/workspace";

const options = {
  workspaceRoot: process.cwd(),
  rootConfigPath: "formly-contracts.config.ts",
};

const discovered = await discoverWorkspaceProjects(options);
const authoring = await inspectWorkspaceFactoryInputs({
  ...options,
  formIds: ["claims.indexing"],
});
const generated = await runWorkspace(options);
const checked = await checkWorkspace(options);
```

The runner returns `indexPath` and contract-only `artifactPaths`. When optional
root `sourceUsage` is enabled, it also returns `sourceUsageCatalogPath` and
typed `sourceUsageDiagnostics`; the CLI prints both the path and stable
diagnostic codes. The checker returns current state plus exact missing/stale
differences for the catalog as well as contract artifacts.

`inspectWorkspaceFactoryInputs` requires the same opt-in `sourceUsage`
configuration as exact source linkage. Its result is intentionally local and
ephemeral: drafts contain authoring code and review metadata, while diagnostics
identify missing, ambiguous, unsupported, or disabled roots without exposing
absolute paths or source initializers.

## Parse generated data

```ts
import { parseFormContract } from "@formly-contract/schema";
import { parseWorkspaceContractIndex } from "@formly-contract/workspace";

const index = parseWorkspaceContractIndex(indexJson);
const contract = parseFormContract(contractJson);
```

Always parse untrusted or stored JSON before using it as test context.

## Agent-context query core

`executeAgentContextQuery` is a pure schema API that can query a caller-
assembled artifact set, including searching source usages by source path or
form ID. No CLI query command or MCP transport currently loads and assembles
those artifacts for you; generation and query execution remain separate steps.

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
