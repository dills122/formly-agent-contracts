# `@formly-contract/workspace`

Repository-aware discovery, deterministic artifact generation, and the
`formly-contracts` command-line interface.

This package is prepared for public release alongside the schema, compiler,
and Angular runtime-host package. See the
[installation guide](../../apps/docs/src/content/docs/start/installation.md).

## Why this package exists

The compiler can project one known field tree, but a real repository needs to
answer additional questions: which projects participate, which sources own
forms, which policy applies, where artifacts are written, and whether generated
output is current. This package owns that trusted orchestration boundary.

Use it to:

- define and validate root, project, source, form, profile, and effect
  configuration;
- load TypeScript or JavaScript configuration in trusted local/CI execution;
- discover project descriptors without guessing form roots;
- isolate project config and factory execution in disposable workers;
- generate content-addressed contracts and publish `workspace-index.json` last;
- run a non-mutating byte-for-byte artifact check;
- optionally index the supported direct-root-call source convention; and
- create bounded dynamic-semantics context packs and score provider-neutral
  proposal outputs; and
- invoke the `formly-contracts list`, `generate`, `check`, and read-only
  `author-factory-inputs` commands.

`list` retains healthy inventory when another project config fails to load and
returns safe per-config failure records. An exact workspace-relative
`--project-config` selection avoids importing known browser-only siblings.
Selected generation/check indexes live under a deterministic
`scopes/projects/<selection-hash>/` directory and never replace the complete
workspace index.

Trusted compositions can select worker execution. All workers inventory first,
so cross-project duplicates fail before any form factory runs. With
`continueOnProjectError`, failed projects are skipped and returned as safe
`projectFailures`; healthy projects still produce a deterministic index. A
single-writer lock spans generation through index-last publication, and the
selected pnpm lockfile is rechecked immediately before commit.

Configuration and form factories are executable application code. Run this
package only against trusted workspaces. Generated artifacts are the portable,
strictly validated boundary intended for downstream consumers.

## What it does not own

- Contract DTOs and canonical serialization belong to
  [`@formly-contract/schema`](../schema/README.md).
- Formly semantic projection belongs to
  [`@formly-contract/compiler`](../compiler/README.md).
- It does not prove route reachability, render Angular, launch a browser, or
  execute arbitrary source-usage call arguments.
- It does not currently expose an MCP server or automatic Playwright workflow.
- It never calls an LLM during `generate` or `check`; dynamic-semantics
  candidates belong to a separate proposal-only review workflow.

## Consumer entry points

The package root exports configuration helpers, discovery, the programmatic
workspace runner, index parsing, and related types. The installed binary is
`formly-contracts`.

```ts
import {
  checkWorkspace,
  defineConfig,
  defineFormContractProject,
  defineFormContractSource,
  inspectWorkspaceFactoryInputs,
  parseWorkspaceContractIndex,
  runWorkspace,
} from '@formly-contract/workspace';
```

For a complete adoption path, use the
[workspace configuration reference](../../docs/workspace-configuration.md) and
[maintained examples](../../apps/docs/src/content/docs/reference/examples.md).
The [workspace API reference](../../apps/docs/src/content/docs/reference/api.md#workspace)
groups the supported configuration, discovery, authoring, generation/checking,
and index-parsing functions; the [CLI reference](../../apps/docs/src/content/docs/reference/cli-api.md)
documents every command and option.

## Contributor map

| Area | Primary files |
| --- | --- |
| Configuration contracts | `src/config.ts`, `src/source.ts` |
| Trusted config loading | `src/config-loader.ts`, `src/load-config.ts` |
| Discovery | `src/discover-projects.ts` |
| Generation and checking | `src/run-workspace.ts`, `src/workspace-index.ts` |
| Worker/runtime-host protocol | `src/project-worker.ts`, `src/runtime-host/` |
| Dynamic-semantics evidence/evals | `src/dynamic-semantics.ts` |
| Static direct-call indexing | `src/source-program.ts`, `src/source-usage.ts` |
| CLI | `src/cli.ts`, `src/cli-main.ts` |

Run focused tests and the package build from the repository root:

```sh
pnpm exec vitest run packages/workspace/src
pnpm --filter @formly-contract/workspace build
```
