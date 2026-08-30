---
title: Workspace configuration
description: Root and project ownership, trusted config loading, discovery, and deterministic policy.
---

Workspace configuration has two ownership levels.

## Root configuration

The root owns discovery and repository-wide policy:

```ts
import { defineConfig } from "@formly-contract/workspace";

export default defineConfig({
  projectConfigs: ["apps/**/formly-contracts.project.ts", "libs/**/formly-contracts.project.ts"],
  excludeProjectConfigs: ["apps/legacy/**"],
  tsconfigPath: "tsconfig.base.json",
  sourceUsage: {
    convention: "direct-root-call-v1",
    tsconfigPath: "apps/claims/tsconfig.app.json",
  },
  output: { directory: "dist/formly-contracts" },
  locators: { testIdAttributes: ["data-testid", "data-cy"] },
  diagnostics: { failOn: ["error"] },
  effects: { cyclePolicy: "error" },
});
```

`projectConfigs` is required. Other settings have validated defaults:

- `output.directory` defaults to `dist/formly-contracts`
- `locators.testIdAttributes` defaults to `['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-pw']`
- `diagnostics.failOn` defaults to `['error']`
- `effects.cyclePolicy` defaults to `'error'`

`sourceUsage` is optional. When enabled, root `tsconfigPath` is required as the
project-config resolver configuration. The current `direct-root-call-v1` pilot
uses those options for a project-config-only authority Program, compares its
traversed authority imports and re-exports with the exact Jiti config runtime,
and accepts one leaf application `sourceUsage.tsconfigPath` for direct `call`
and `new` references to explicitly registered form-root symbols. Exact linkage
requires both Programs and Jiti to resolve the same registered chain. It is intentionally incomplete:
it does not prove routes, rendering, wrapper control flow, or runtime
reachability.

All discovered project configs must use `.ts`, `.mts`, or `.cts` for this
pilot. `.mjs` and `.cjs` remain valid when source indexing is disabled, but an
opted-in run rejects them with
`SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED` instead of changing the leaf
program's `allowJs` boundary.

Configured paths and workspace-owned program roots and sources, including
declaration files, must resolve inside the workspace. TypeScript-classified
external-library declarations remain allowed. Output must not resolve through
a symlink.

## Project configuration

A project owns local sources, field profiles, effects, and supported policy
overrides:

```ts
import { defineFormContractProject } from "@formly-contract/workspace";
import { CLAIMS_SOURCE } from "./src/contracts.js";

export default defineFormContractProject({
  projectId: "claims/forms",
  sources: [CLAIMS_SOURCE],
});
```

Every project that owns an indexed source file needs a discovered project
config. A feature library that only consumes a form may therefore use a
source-empty config:

```ts
export default defineFormContractProject({
  projectId: "claims/feature",
  sources: [],
});
```

This explicit ownership keeps source matches deterministic; it does not make
the feature library a form source.

Project and source IDs are validated globally before form factories execute.
Projects are ordered deterministically by normalized config path and ID.

## Config loading

The loader uses Jiti for ESM, CommonJS, and TypeScript. TypeScript aliases are
disabled unless `tsconfigPath` is explicit. Imports resolve from the consuming
workspace, not from the linked Formly Contract checkout.

Stable loader errors are:

- `CONFIG_NOT_FOUND`
- `CONFIG_LOAD_FAILED`
- `CONFIG_EXPORT_INVALID`

Start with `formly-contracts list`. If loading fails, confirm the TypeScript
config and move discovery exports out of Angular browser barrels.

Use the [workspace API reference](./api.md#workspace) for programmatic
discovery, generation, checking, authoring inspection, and index parsing. Use
the [CLI reference](./cli-api.md) for command options and refusal behavior.

:::note[Canonical reference]
The complete option, validation, trust, provenance, and publication semantics
live in [workspace-configuration.md](https://github.com/dills122/formly-contract/blob/main/docs/workspace-configuration.md).
:::
