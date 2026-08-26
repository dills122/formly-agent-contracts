# Workspace Configuration

Status: experimental configuration bedrock; discovery and artifact generation
are not implemented yet

`@formly-agent-contracts/workspace` is the framework-neutral configuration
layer for repository-aware Formly Contract tooling. It provides trusted config
loading, strict root/project descriptors, source catalogs, deterministic policy
resolution, and stable plugin identities.

Angular, Formly, Nx, Playwright, and application-specific packages should build
convenience helpers and presets on these contracts. They must not create
parallel configuration systems. A convenience helper may hide routine wiring,
but its result must still resolve through the same validation, provenance, and
identity rules described here.

## Trust boundary

Configuration files are trusted local or CI build code. The workspace package
uses Jiti's asynchronous import API to support ESM, CommonJS, and TypeScript.
TypeScript path aliases are disabled unless the caller supplies an explicit
`tsconfigPath`. MCP requests and other untrusted runtime inputs must never load
configuration or select executable plugins.

The loader returns stable error codes:

- `CONFIG_NOT_FOUND` when the requested path is not a file;
- `CONFIG_LOAD_FAILED` when evaluation or import resolution fails; and
- `CONFIG_EXPORT_INVALID` when the default export is not an object.

This follows Jiti's documented async `import` and opt-in `tsconfigPaths`
interfaces: <https://github.com/unjs/jiti>.

## Root and project ownership

The root config owns repository-wide discovery and policy:

```ts
import { defineConfig } from '@formly-agent-contracts/workspace';

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
  plugins: [
    {
      id: 'workspace/angular',
      version: '1.0.0',
      configSchemaVersion: '1',
      options: {
        bootstrap: 'claims-app',
        includeLazyFeatures: false,
      },
    },
  ],
});
```

A project config owns its local source catalogs and may override supported
generation policy:

```ts
import {
  defineFormContractProject,
  defineFormContractSource,
} from '@formly-agent-contracts/workspace';

const claimsSource = defineFormContractSource({
  sourceId: 'claims/forms',
  list: () => [
    {
      id: 'claims.create',
      create: () => ({ fields: createClaimFields() }),
    },
  ],
});

export default defineFormContractProject({
  projectId: 'claims/forms',
  sources: [claimsSource],
  diagnostics: { failOn: ['error', 'warning'] },
});
```

`sources` is optional. Applications and infrastructure libraries may declare a
project boundary now and add sources later, or contribute future profile and
integration configuration without pretending to own form roots:

```ts
export default defineFormContractProject({
  projectId: 'claims/formly-kit',
});
```

The source interface is intentionally framework-neutral. A later Angular or
Formly integration can produce a source descriptor around application-specific
factories while the workspace runner continues to operate on stable source and
form identities.

### Keep discovery entry points out of browser barrels

Angular libraries should expose browser runtime code and trusted discovery code
through separate entry points. A project config may import a Node-oriented
`contracts` entry point, while Angular modules import only the normal runtime
barrel:

```text
@acme/forms-kit            -> Angular module and components
@acme/forms-kit/forms      -> framework data/factories safe in either graph
@acme/forms-kit/contracts  -> source descriptors for trusted tooling
```

This prevents the config loader from booting Angular just to enumerate forms
and prevents Node-only loader dependencies from entering the browser bundle.
The deep consumer fixture under `fixtures/angular-monorepo` exercises this
boundary with TypeScript path aliases and a six-form interaction matrix. The
separate `fixtures/nx-workspace` anchor proves the same configuration approach
inside a real four-project Nx graph without making Nx a prerequisite for the
generic workspace package.

## Resolution and replacement rules

Supported policy resolves in this order:

```text
defaults < root config < project config < explicit CLI override
```

Objects are not implicitly deep-merged. When a higher-precedence layer supplies
`testIdAttributes` or `failOn`, that array replaces the lower-precedence array.
Order-sensitive locator attributes retain their declared order. Unordered
inventory such as project globs, plugin identities, and source IDs is sorted in
the resolved JSON-safe representation.

The initial defaults are:

- output directory: `dist/formly-contracts`;
- locator attributes: `data-testid`, `data-test-id`, `data-test`, `data-cy`,
  and `data-pw`; and
- diagnostic failure threshold: `error`.

Runtime validation rejects unknown keys, duplicate plugin/source IDs, invalid
globs and attribute names, absolute, globbed, or parent-traversing literal
paths, malformed sources, non-JSON-safe plugin options, and unsupported
diagnostic severities. Plugin options let future convenience packages retain
reviewable preset inputs without placing executable callbacks in resolved
configuration.

## Current boundary

This first slice does not discover project configs, execute source catalogs,
write contract artifacts, define value domains, or register custom-field
profiles and effects. Those layers will use the same project descriptor after
their versioned contracts are implemented.
