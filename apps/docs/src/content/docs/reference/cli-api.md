---
title: CLI reference
description: Discover, author, generate, and check Formly Contract workspaces from the command line.
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
  --project <id>           Select a project ID; may be repeated
  --project-config <path>  Select an exact project config; may be repeated
  --form-id <id>           Select a stable form ID; author-factory-inputs only
  --explain                Print bounded local failure causes and workspace-relative frames
  -h, --help               Show this help
```

Use repeatable `--fail-on` flags to select both severities. `list` rejects
`--output` and `--fail-on` because it does not generate contracts.
`author-factory-inputs` also rejects those write-oriented options and accepts a
repeatable `--form-id` filter instead.

`--explain` is available for `list`, `generate`, and `check`. Default output
shows stable project failure codes and phases but withholds underlying causes.
The opt-in view prints at most three single-line cause summaries and five stack
frames that resolve inside the workspace. It does not expose raw worker stderr,
and explanation data is never written into contracts, indexes, or hashes.
Treat it as local diagnostic output because bounded cause messages can still
contain application identifiers.

```sh
pnpm exec formly-contracts-angular list \
  --project-config libs/forms-kit/formly-contracts.project.ts \
  --explain
```

Use repeatable `--project` for IDs when the whole project-config inventory is
Node-loadable. If a browser-only project config fails during import, select the
healthy workspace-relative path directly:

```sh
pnpm exec formly-contracts generate \
  --project-config libs/forms-kit/formly-contracts.project.ts
```

The two selector forms cannot be combined. Selected runs place their index and
source-usage catalog under a deterministic `scopes/projects/<selection-hash>/`
directory, leaving the complete workspace index untouched. `list` reports
healthy inventory and safe per-config failures together, returning a non-zero
status when any matched config was unavailable.

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
mutually exclusive generated, explicit, ambiguous, and unsupported property
counts. It also prints overall grammar coverage and an
`unattributedAmbiguity` flag because some unsupported flows cannot safely be
assigned to one input property.

The command prints each local review diagnostic after the summary, including
safe bounded property, type-path, ambiguity-reason, and reviewed-storage
context. Type/storage paths are limited before projection; unsafe paths are
redacted or treated as unsupported storage rather than copied from source.

Each property contributes to at most one count. Final unsupported
materialization has precedence over flow ambiguity so a type hazard cannot be
hidden by an alias or other ambiguous use. Direct `eval()` is refused as
unattributed reflection; the command never parses or executes its string.
Any type-analysis truncation also blocks every generated helper for that input
object; a partial property view is never treated as safe enough to automate.

This is a local, read-only authoring aid. It does not call source `list()`
functions or application factories, subscribe to Observables, access Angular
views, write the suggested file, or add the draft to portable contracts. Copy
and review the output beside the definition if it is useful. Explicit business
values and bindings still require an author; unsupported or ambiguous inputs
remain visible instead of receiving invented values.

Missing IDs, duplicate registrations, unsupported roots, tooling-only roots,
overlapping application Programs, and a workspace with no actionable targets
produce stable non-zero diagnostics. They never degrade to a successful empty
authoring run.

## Programmatic use

The [public API reference](../api/) documents workspace discovery,
factory-input inspection, generation/checking, portable parsers, direct
compiler APIs, and the pure agent-context query core. Use the CLI for normal
repository adoption unless another trusted build tool needs typed results.

:::note[Command authority]
The installed binary's `--help` output and
[`packages/workspace/src/cli.ts`](https://github.com/dills122/formly-contract/blob/main/packages/workspace/src/cli.ts)
are authoritative. The documentation check keeps this page's command block
under review, but the binary remains the final source for accepted options.
:::
