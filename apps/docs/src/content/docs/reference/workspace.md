---
title: Workspace configuration
description: Root and project ownership, trusted config loading, discovery, and deterministic policy.
---

Workspace configuration has two ownership levels.

## Root configuration

The root owns discovery and repository-wide policy:

```ts
import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: [
    'apps/**/formly-contracts.project.ts',
    'libs/**/formly-contracts.project.ts',
  ],
  excludeProjectConfigs: ['apps/legacy/**'],
  tsconfigPath: 'tsconfig.base.json',
  output: { directory: 'dist/formly-contracts' },
  locators: { testIdAttributes: ['data-testid', 'data-cy'] },
  diagnostics: { failOn: ['error'] },
  effects: { cyclePolicy: 'error' },
});
```

`projectConfigs` is required. Other settings have validated defaults. Paths
must stay inside the workspace and output must not resolve through a symlink.

## Project configuration

A project owns local sources, field profiles, effects, and supported policy
overrides:

```ts
import { defineFormContractProject } from '@formly-contract/workspace';
import { CLAIMS_SOURCE } from './src/contracts.js';

export default defineFormContractProject({
  projectId: 'claims/forms',
  sources: [CLAIMS_SOURCE],
});
```

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

:::note[Canonical reference]
The complete option, validation, trust, provenance, and publication semantics
live in [workspace-configuration.md](https://github.com/dills122/formly-contract/blob/main/docs/workspace-configuration.md).
:::
