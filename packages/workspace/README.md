# `@formly-contract/workspace`

Repository-aware discovery, deterministic artifact generation, and the
`formly-contracts` command-line interface.

This package is currently private. Evaluations may link it from a sibling
Formly Contract checkout or install the retained tarball produced by
`pnpm pilot:pack`. See the
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
- generate content-addressed contracts and publish `workspace-index.json` last;
- run a non-mutating byte-for-byte artifact check;
- optionally index the supported direct-root-call source convention; and
- invoke the `formly-contracts list`, `generate`, `check`, and read-only
  `author-factory-inputs` commands.

`list` retains healthy inventory when another project config fails to load and
returns safe per-config failure records. An exact workspace-relative
`--project-config` selection avoids importing known browser-only siblings.
Selected generation/check indexes live under a deterministic
`scopes/projects/<selection-hash>/` directory and never replace the complete
workspace index.

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
| Static direct-call indexing | `src/source-program.ts`, `src/source-usage.ts` |
| CLI | `src/cli.ts`, `src/cli-main.ts` |

Run focused tests and the package build from the repository root:

```sh
pnpm exec vitest run packages/workspace/src
pnpm --filter @formly-contract/workspace build
```
