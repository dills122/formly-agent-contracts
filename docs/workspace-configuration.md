# Workspace Configuration

Status: experimental; deterministic project discovery, project-owned field-type
profile and cross-field effect registries, programmatic workspace artifact
generation, and the pilot `generate` CLI are implemented. Effect resolution
against generated nodes and the `list` and `check` commands remain planned.

`@formly-contract/workspace` is the framework-neutral configuration
layer for repository-aware Formly Contract tooling. It provides trusted config
loading, strict root/project descriptors, source catalogs, deterministic policy
resolution, stable plugin identities, and serializable custom-field interaction
profiles and form relationships.

For a copyable private-repository evaluation path, start with the
[workplace pilot guide](workplace-pilot.md). This document is the detailed API
and policy reference.

Angular, Formly, Nx, Playwright, and application-specific packages should build
convenience helpers and presets on these contracts. They must not create
parallel configuration systems. A convenience helper may hide routine wiring,
but its result must still resolve through the same validation, provenance, and
identity rules described here.

## Trust boundary

Configuration files are trusted local or CI build code. The workspace package
uses Jiti's asynchronous import API to support ESM, CommonJS, and TypeScript.
TypeScript path aliases are disabled unless the caller supplies an explicit
`tsconfigPath`. Jiti is anchored to the configuration file being evaluated so
bare packages resolve from the consuming workspace. The loader also converts
exact, non-wildcard `paths` entries into Jiti aliases because Jiti 2.7 does not
resolve that shape consistently; wildcard and fallback resolution remains with
Jiti's native `tsconfigPaths` support. MCP requests and other untrusted runtime
inputs must never load configuration or select executable plugins.

The loader returns stable error codes:

- `CONFIG_NOT_FOUND` when the requested path is not a file;
- `CONFIG_LOAD_FAILED` when evaluation or import resolution fails; and
- `CONFIG_EXPORT_INVALID` when the default export is not an object.

This follows Jiti's documented async `import` and opt-in `tsconfigPaths`
interfaces: <https://github.com/unjs/jiti>.

Project discovery expands only the root config's declared project patterns. It
does not follow directory symlinks, and a matching project-config symlink is
rejected with `PROJECT_CONFIG_SYMLINK_UNSUPPORTED`. This keeps configuration
identity and exclusion behavior independent of filesystem aliases.

Discovery also prunes dependency trees (`node_modules`), Git metadata (`.git`),
and the root config's artifact output directory (or `dist/formly-contracts` when
no output is configured) before matching files or checking for config symlinks.
Other directories named `dist` are not implicitly excluded because they may
contain project-owned source; exclude them explicitly when appropriate.

## Root and project ownership

The root config owns repository-wide discovery and policy:

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

A project config owns its local source catalogs and may override supported
generation policy:

```ts
import {
  defineFormContractProject,
  defineFormContractSource,
} from '@formly-contract/workspace';

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

Each definition factory returns a fresh, framework-neutral declared instance:
`fields` is an array of configuration objects, with optional `model` and
`formState` records. Application adapters normalize their registries or factory
maps to that shape. Scalar field entries and arbitrary opaque instance return
types are not part of the source contract; Formly-specific structural handling
belongs to the compiler during artifact generation.

The root and project descriptors can be loaded as one deterministic inventory:

```ts
import { discoverWorkspaceProjects } from '@formly-contract/workspace';

const discovered = await discoverWorkspaceProjects({
  workspaceRoot: process.cwd(),
  rootConfigPath: 'formly-contracts.config.ts',
});
```

Projects are ordered by normalized config path and project ID. Duplicate
project or source IDs fail during discovery, before a source list or form
factory is executed. The inventory contains plugin identity (`id`, `version`,
and `configSchemaVersion`) but intentionally omits plugin options; execution
still receives options through the trusted loaded root configuration.

`sources` is optional. Applications and infrastructure libraries may declare a
project boundary now and add sources later, or contribute future profile and
integration configuration without pretending to own form roots:

```ts
export default defineFormContractProject({
  projectId: 'claims/formly-kit',
});
```

The source interface is intentionally framework-neutral. Angular and Formly
integrations can produce source descriptors around application-specific
factories while the workspace runner continues to operate on stable source and
form identities.

## Generate a workspace artifact set

The trusted build-time runner discovers every configured project, inventories
all source definitions, validates globally unique form IDs, extracts each form,
and writes a deterministic workspace index after its form artifacts succeed:

```ts
import { runWorkspace } from '@formly-contract/workspace';

const result = await runWorkspace({
  workspaceRoot: process.cwd(),
  rootConfigPath: 'formly-contracts.config.ts',
});

console.log(result.indexPath);
console.log(result.artifactPaths);
```

Artifacts use content-addressed project/form paths beneath the resolved output
directories. The aggregate `workspace-index.json` contains workspace-relative
paths, contract hashes, source/project IDs, declared evidence, diagnostic
provenance, and configuration, plugin, and profile-registry identities. Plugin
options participate in configuration hashes but are not emitted. Model values,
form state, callbacks, timestamps, absolute paths, and full profile registries
are also excluded from the index.

The runner performs discovery, source inventory, extraction, diagnostic-policy
checks, and output-path preflight before publishing. Form artifacts are written
atomically and the aggregate index is written last, so a failed run never
advertises a partially generated artifact set. Existing content-addressed
artifacts must already contain identical canonical bytes; the runner does not
silently overwrite a hash-addressed contract with different content.

Failures are reported as `WorkspaceGenerationError` with a stable `code`,
`phase`, and safe project/source/form/output provenance. The original error is
retained as `cause` for trusted build tooling but is not serialized into the
workspace index. When discovery wraps a configuration import failure, the CLI
prints a generic hint to check `tsconfigPath` and Node-safe contract entry
points without exposing private paths, package names, or stack traces.

### Generate from the pilot CLI

After building or linking the workspace package, run the same boundary through
the `formly-contracts` binary:

```sh
pnpm exec formly-contracts generate
pnpm exec formly-contracts generate \
  --workspace-root ../claims-workspace \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot
```

Successful generation prints the contract count and workspace-relative index
path. Usage failures exit with status `2`; generation failures exit with status
`1` and print stable phase/project/source/form provenance without a stack trace
or underlying callback error. `--fail-on warning` and `--fail-on error` may be
repeated to override diagnostic policy.

This is intentionally the first pilot slice of the generic CLI. `list` and
`check` remain part of Task 6A and are not accepted commands yet.

## Project-owned custom-field profiles

A project may declare a versioned `fieldTypeProfiles` registry. The registry
maps an exact Formly type string, such as `cool-radio-btn-grp`, to reviewed
semantic parts, ARIA roles, an interaction operation, a possible-value domain,
and a stable driver identity. Named variants and wrapper profiles are explicit;
there is no fuzzy matching or silent last-write-wins behavior.

```ts
import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';
import { defineFormContractProject } from '@formly-contract/workspace';

const fieldTypeProfiles: FieldTypeProfileRegistry = {
  schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  id: 'claims.field-types',
  version: 1,
  profiles: [
    {
      identity: { id: 'claims.radio-group', version: 1 },
      semanticType: 'single-choice',
      valueShape: 'scalar',
      evidence: 'declared',
      parts: [
        {
          name: 'option',
          role: 'radio',
          cardinality: 'many',
          evidence: 'declared',
        },
      ],
      interaction: {
        kind: 'choice',
        operation: 'check',
        optionPart: 'option',
      },
      valueDomain: {
        kind: 'projected',
        source: 'adapter',
        completeness: 'complete',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
        evidence: 'declared',
      },
      driver: {
        kind: 'generic',
        id: 'generic.choice',
        version: 1,
        capabilities: ['check'],
      },
      unknowns: [],
    },
  ],
  registrations: [
    {
      formlyType: 'cool-radio-btn-grp',
      defaultProfile: { id: 'claims.radio-group', version: 1 },
      variants: [],
    },
  ],
  wrappers: [],
};

export default defineFormContractProject({
  projectId: 'claims/forms',
  fieldTypeProfiles,
});
```

The resolved project configuration carries a canonical registry copy plus its
schema version, registry ID/version, and content hash. Reordering set-like
registry input does not change that identity; changing semantic content or a
profile version does. Registry data cannot contain Angular components,
callbacks, Playwright locators, or executable drivers.

`resolveFieldTypeProfile` in `@formly-contract/compiler` resolves an exact
type/default or named variant and composes explicitly requested wrapper parts
in request order. An unmapped custom type remains an explicit diagnostic, not
an invitation to guess how its DOM works.

The normal compiler extraction APIs accept the resolved registry bundle
directly. This keeps `@formly-contract/compiler` independent of the workspace
package while allowing the runner to pass project configuration without
translating identity claims:

```ts
const resolvedProject = resolveWorkspaceProjectConfig(root, project);
const definition = (await project.sources?.[0]?.list())?.[0];
const instance = definition?.create();

const result = extractFormContract({
  formId: definition!.id,
  fields: instance!.fields,
  fieldTypeProfiles: resolvedProject.fieldTypeProfiles,
});
```

Named variants are selected only by root-level field metadata such as
`formlyContract: { profileVariant: 'portal' }`. Every string wrapper declared
on a mapped field is resolved in order. Until an explicit transparent-wrapper
contract exists, an unregistered wrapper blocks interaction projection instead
of being silently ignored.

Projected collection paths are read through own data properties only. Missing,
accessor-backed, partial, non-JSON, duplicate-value, or ambiguous-label
mappings cannot authorize a generic driver. Declared function, string, async,
or expression-backed collections remain dynamic without being executed; a
trusted resolved collection is enumerated with scenario completeness.

## Project-owned cross-field effects

A project may declare one versioned `crossFieldEffects` registry beside its
source and field-profile registries. The registry owns explicit relationships
for stable form and node IDs. It never accepts callbacks, services, readiness
executors, observed deltas, or candidate authority.

```ts
import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  type CrossFieldEffectRegistry,
} from '@formly-contract/schema';
import { defineFormContractProject } from '@formly-contract/workspace';

const crossFieldEffects: CrossFieldEffectRegistry = {
  schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  id: 'claims.cross-field-effects',
  version: 1,
  forms: [
    {
      formId: 'claims.intake',
      effects: [
        {
          identity: {
            id: 'claims.product-filters-case-type',
            version: 1,
          },
          trigger: {
            nodeId: 'claims.intake::path:s_product',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'claims.intake::path:s_caseType',
            property: 'options',
          },
          kind: 'filters',
          timing: {
            mode: 'async',
            readinessId: 'claims.case-type-options-ready',
          },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
      ],
    },
  ],
};

export default defineFormContractProject({
  projectId: 'claims/forms',
  sources: [claimsSource],
  crossFieldEffects,
});
```

Registry and effect identities are versioned. Form and effect arrays are
canonicalized by stable identity before hashing, so declaration order does not
change the resolved registry hash. Effect IDs are logical identities scoped to
one form registration; only one version of an effect ID may be active in that
form, while another form may use the same logical ID without colliding. Async
effects require a serializable
`readinessId`; sync and explicitly unknown timing reject readiness metadata.
Semantic kinds are checked against their target property: `loads` and
`filters` target options, `clears` targets value, and `toggles` or
`controls-state` target visibility, enabled, or required state.

Root configuration owns `effects.cyclePolicy`, which is `error` by default and
may be reduced to `warning`. The current slice validates and resolves the
registry as configuration only. Task 5A will resolve endpoint existence,
condition rules, target/readiness capabilities, and strongly connected
components before effects are allowed into form artifacts or the workspace
index. Until then, configuring an effect does not make it actionable output.

Dependency strings, opaque handlers, controlled scenario deltas, and future
browser observations remain separate non-authoritative evidence. They cannot
be parsed as `CrossFieldEffectRegistry` and are never promoted to `loads`,
`filters`, `clears`, or `toggles` automatically.

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
- effect-cycle diagnostic severity: `error`.

Runtime validation rejects unknown keys, duplicate plugin/source IDs, invalid
globs and attribute names, absolute, globbed, or parent-traversing literal
paths, malformed sources, non-JSON-safe plugin options, and unsupported
diagnostic severities. Plugin options let future convenience packages retain
reviewable preset inputs without placing executable callbacks in resolved
configuration.

## Current boundary

The programmatic runner and pilot `generate` command execute trusted source
catalogs and declared form factories, resolve project field-type profile
registries, and write the deterministic artifact set. Application driver
identities remain data and do not execute code. Cross-field effect registries
are strict configuration data, but endpoint/profile/readiness/cycle resolution
and artifact projection remain the next vertical slice. The CLI `list`/`check`
commands, Angular-assisted inventory, and observed runtime capture remain later
increments on the same configuration bedrock.

The [workplace pilot guide](workplace-pilot.md) turns this reference into a
single operational checklist and includes the expected artifact layout,
troubleshooting table, privacy boundary, and feedback template.
