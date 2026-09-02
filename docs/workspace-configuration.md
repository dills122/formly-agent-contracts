# Workspace Configuration

Status: experimental; deterministic project discovery, project-owned field-type
profile and cross-field effect registries, resolved effect projection,
programmatic workspace artifact generation, opt-in static direct-root usage
indexing, and the generic `list`, `generate`, and non-mutating `check` CLI
commands are implemented. A read-only `author-factory-inputs` command and
`inspectWorkspaceFactoryInputs` API also reuse exact source lineage to print
local typed factory-input drafts without running the registered factory or
writing artifacts.

Form Contract `0.4.0` and workspace index `0.2.0` remain the implemented output
boundary. The source-usage catalog and pure agent-context artifact/query schemas
are implemented sibling records; journeys, behavior/scenario evidence, Angular
authoring reports, and driver registries described below remain planned. Their
canonical ownership and dependency order are defined by the
[RH-06 reconciliation](planning/agent-context-hardening/rh-06-reconciliation.md)
and [execution index](planning/agent-context-hardening/execution-index.md).

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

Workspace configuration is the project-aware discovery and policy bedrock. It
does not make one registry own every kind of truth: semantic form definitions,
source usages, business journeys, portable behavior, Angular observations, and
driver execution each retain distinct authority and join through pinned IDs and
hashes.

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

Trusted execution is split by purpose:

| Mode                         | Workspace responsibility                                                                                  | Status and limit                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Config/JIT worker            | Resolve the project runtime base, validate a parent-selected host, and carry JSON-safe results/provenance | Generic trusted config loading exists; Angular scenario compilation remains a separate planned host and is not an untrusted-code sandbox      |
| AOT authoring browser worker | Point a future Angular integration at an application-owned build target and configured authoring scopes   | Planned; browser isolation and interception improve determinism but are not OS containment                                                    |
| Rootless OCI factory runner  | Stage a code-free registration sidecar and receive only allowlisted, structurally bound output            | Blocked until `oci-rootless-v1` conformance, a runner-owned violation ledger, structural identity checks, and retained negative controls pass |

These modes must not be collapsed into “load whatever the project imports.”
The generic loader evaluates trusted workspace configuration; it does not
authorize arbitrary application-factory execution. Angular JIT resolution and
AOT observation produce different evidence, and an ordinary child process is
not the containment boundary required by the factory runner.

## Root and project ownership

The root config owns repository-wide discovery and policy:

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

`sourceUsage` is optional and does not change Form Contract or workspace-index
schema versions. When enabled, the root `tsconfigPath` is required and remains
the resolver configuration used to load project configs. The runner creates a
narrow authority Program from that config's compiler/module-resolution options
and roots it only at discovered project configs. It also resolves every
authority import or re-export used by the registered chain through the same
Jiti runtime and options as config evaluation. `direct-root-call-v1` accepts
one separate literal, workspace-relative leaf TypeScript config for the
application Program. An exact usage exists only when both Programs resolve the
same project/source/definition/root chain and the authority Program agrees with
Jiti on the canonical runtime module paths. This lets a Node-safe definition
and its Angular consumer share symbol identity without importing tooling
descriptors into the browser graph while divergent aliases or resolver-only
features fail closed. Missing, invalid, empty, or outside-workspace configs fail closed with
`SOURCE_USAGE_INDEX_FAILED`; omitting root `tsconfigPath` is `CONFIG_INVALID` at
`root.tsconfigPath`.

The current source-usage pilot requires every discovered project config to be
TypeScript (`.ts`, `.mts`, or `.cts`). JavaScript project configs remain a
supported workspace-loader surface when `sourceUsage` is disabled. When it is
enabled, `.mjs` and `.cjs` configs fail deterministically with
`SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED`; the runner does not override the
leaf program's `allowJs` boundary.

A project config owns its local source catalogs and may override supported
generation policy:

```ts
import {
  defineFormContractDefinition,
  defineFormContractProject,
  defineFormContractSource,
} from "@formly-contract/workspace";

const CLAIM_FORM_CONTRACT = defineFormContractDefinition({
  id: "claims.create",
  create: () => ({ fields: createClaimFields() }),
  lineage: { rootSymbol: createClaimFields },
});

const claimsSource = defineFormContractSource({
  sourceId: "claims/forms",
  list: () => [CLAIM_FORM_CONTRACT],
});

export default defineFormContractProject({
  projectId: "claims/forms",
  sources: [claimsSource],
  diagnostics: { failOn: ["error", "warning"] },
});
```

For source indexing, authority begins in the discovered project config. Its
default export must be a direct canonical `defineFormContractProject(...)`
registration whose literal `projectId` matches discovery and whose `sources`
array directly references the canonical `defineFormContractSource(...)`
descriptor. The helper-created definition—or a direct reference to its
helper-created `const`—must then be a direct element of the source's
expression-bodied `list: () => [...]`. Literal source and runtime inventory IDs
must agree. A same-ID descriptor elsewhere is not authority; wrapped, dynamic,
spread, or unreturned flows fail closed with no exact link.

Each definition factory returns a fresh, framework-neutral declared instance:
`fields` is an array of configuration objects, with optional `model` and
`formState` records. Application adapters normalize their registries or factory
maps to that shape. Scalar field entries and arbitrary opaque instance return
types are not part of the source contract; Formly-specific structural handling
belongs to the compiler during artifact generation.

This implemented no-argument `create` path is a trusted declaration boundary,
not a general solution for real constructors or functions whose parameters are
services, streams, callbacks, templates, or business data. Do not make such a
factory appear compilable by duplicating it elsewhere and supplying plausible
synthetic objects. Planned factory-input support classifies inert values and
opaque capability bindings first; executing the application factory is a
separate, currently blocked OCI mode.

When `lineage` is omitted, source indexing treats `create` as an implicit root
only when TypeScript proves a zero-argument-compatible call signature. An
explicit `lineage.rootSymbol` may instead anchor a real required-argument
factory while `create` remains a deliberate Node-safe no-argument adapter for
declared generation.

The root and project descriptors can be loaded as one deterministic inventory:

```ts
import { discoverWorkspaceProjects } from "@formly-contract/workspace";

const discovered = await discoverWorkspaceProjects({
  workspaceRoot: process.cwd(),
  rootConfigPath: "formly-contracts.config.ts",
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
  projectId: "claims/formly-kit",
});
```

The source interface is intentionally framework-neutral. Angular and Formly
integrations can produce source descriptors around application-specific
factories while the workspace runner continues to operate on stable source and
form identities.

Register one definition for each complete form root. Reusable fragments, field
groups, and wizard steps are dependencies/lineage of that root; they do not
become standalone form contracts unless a project deliberately registers them
as independently generated forms.

For source indexing, every callsite must be under exactly one discovered
project-config directory. A consuming feature/view library that owns no form
sources may therefore need a source-empty project config as an explicit MVP
ownership anchor. Direct calls and constructor calls through resolved import
aliases, namespaces, and re-export barrels are supported. Wrapped, optional,
callback, dynamic-dispatch, and cross-program flows remain unsupported and do
not produce an exact actionable link. Some out-of-grammar callsites remain
unindexed without a per-call diagnostic; reported coverage is intentionally
incomplete.

Configured paths and workspace-owned program roots and sources, including
declaration files, must resolve inside the workspace. TypeScript-classified
external-library declarations remain allowed.

Workspace-contained project configs, source descriptors, definitions, root
declarations, and authority aliases traversed between them are validated by
comparing each TypeScript Program snapshot with the final file bytes read for
catalog
materialization. A mismatch or unreadable authority file suppresses every exact
usage that depends on it. In a nested consumer root, only the exact canonical
`@formly-contract/workspace` package-export chain may be external to establish
helper identity; unrelated external aliases fail closed. This is a static
source-integrity check, not a complete runtime module snapshot.

Descriptor authority diagnostics are fail-closed:

- `SOURCE_DESCRIPTOR_UNSUPPORTED` means the discovered project config, direct
  source registration, source descriptor, or definition list is outside the
  canonical direct grammar or disagrees with runtime identity. No same-ID
  fallback is attempted.
- `SOURCE_DESCRIPTOR_CONFLICT` means multiple canonical registrations claim the
  same project/source authority. None is selected by path or declaration order.
- `SOURCE_FILE_SNAPSHOT_MISMATCH` means final bytes differ from the Program
  snapshot. Every exact usage depending on that file is suppressed, not only
  callsites physically located in it.
- `SOURCE_RUNTIME_RESOLUTION_MISMATCH` means TypeScript and the actual Jiti
  config runtime selected different canonical files for a traversed authority
  import or re-export. The registered chain is non-actionable until the
  resolver configuration agrees.

Coverage is deliberately incomplete. An unsupported out-of-grammar callsite is
not guaranteed to produce a per-call diagnostic.

### Form, root, usage, and journey authority

Project-aware configuration provides the discovery path, but it does not merge
four distinct identities:

| Record          | What it identifies                                                      | Where authority comes from                                                                                    |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Form definition | The semantic form and its Form Contract ID                              | Current typed project source                                                                                  |
| Root anchor     | The exported function, callable `const`, or class that creates the form | Implemented optional `lineage.rootSymbol`, preferably declared beside or re-exported with the form definition |
| Usage           | One supported direct call or constructor site                           | Implemented opt-in TypeScript source-usage index with `static-convention` evidence                            |
| Journey/step    | Page entry, business step, actions, transitions, and outcomes           | Planned project-owned journey catalog or validated attached annotation                                        |

Co-location is encouraged without coupling browser code to the tooling loader.
A form library can keep the application factory and its declarative contract
descriptor in the same source area and re-export the descriptor from a
Node-safe `contracts` entry point. The root anchor refers to the canonical
TypeScript symbol, so the opt-in source index can connect calls such as
`IndexingFormConfig(...)` or `new OrderEntryStepperForm(...)` to generated
contracts without executing or serializing those application callsites or their
arguments.

One root may map to several form IDs and one form may have several usages. The
source catalog preserves all exact candidates. If one root maps to several
forms, the usage remains ambiguous rather than selecting by name, route, label,
or source order. Journey membership is never inferred merely because a call
occurs in a page component.

## Generate a workspace artifact set

The trusted build-time runner discovers every configured project, inventories
all source definitions, validates globally unique form IDs, extracts each form,
and writes a deterministic workspace index after its form artifacts succeed:

```ts
import { runWorkspace } from "@formly-contract/workspace";

const result = await runWorkspace({
  workspaceRoot: process.cwd(),
  rootConfigPath: "formly-contracts.config.ts",
});

console.log(result.indexPath);
console.log(result.artifactPaths);
console.log(result.sourceUsageCatalogPath);
console.log(result.sourceUsageDiagnostics);
```

Generation and checking select `pnpm-lock.yaml` at the canonical
`workspaceRoot`, hash its exact bytes, and record that relative path/digest as
declared dependency provenance. A missing root lock fails with
`DEPENDENCY_SNAPSHOT_UNAVAILABLE`; the runner does not search parent or sibling
directories. A trusted runtime-host parent may instead pass a validated
`runtimeProvenance` DTO through the programmatic API. Root/project config data
and the generic CLI cannot supply that override.

Default provenance resolves the module entries actually used for the compiler,
schema, and Jiti packages and reads the owning package manifests for their exact
versions. Dependency declarations are not treated as executed-package
identities. Loader provenance records `tsconfigPaths` separately for the root
config loader and project config loaders because the programmatic root loader
option and the root config's project-loader option can differ.

Artifacts use content-addressed project/form paths beneath the resolved output
directories. The aggregate `workspace-index.json` contains workspace-relative
paths, contract hashes, source/project IDs, declared evidence, diagnostic
provenance, configuration/plugin/profile-registry identities, and strict
runtime provenance for the parent and each project. Runtime provenance schema
`1.0.0` includes exact worker/adapter/tool/Jiti/Node/execution-profile/package
identities, canonical stage-specific loader options, platform/architecture, and
the selected lock digest. Plugin options participate in configuration hashes
but are not emitted. Model values, form state, callbacks, timestamps, absolute
paths, module URLs, PIDs, timings, environment values, temporary directories,
and full profile registries are excluded from the index.

This is an intentional compatibility break for derived workspace output:
workspace configuration and index schemas are `0.2.0`, and readers reject
`0.1.0` indexes. Regenerate the index rather than editing or upgrading it in
place. The Form Contract schema remains `0.4.0`; form artifact bytes and
content-addressed paths remain unchanged by this migration.

The runner performs discovery, source inventory, extraction, diagnostic-policy
checks, optional source indexing, and output-path preflight before publishing.
Form artifacts and the optional `source-usage-catalog.json` are written
atomically and the aggregate index is written last, so a failed run never
advertises a partially generated artifact set. Existing content-addressed
artifacts must already contain identical canonical bytes; the runner does not
silently overwrite a hash-addressed contract with different content.

Run generation and checking against a quiescent checkout. Discovery must load
trusted root/project configuration before the source-usage Programs can be
created; the authority and application Programs are then created before source
lists or form factories execute. The final-byte checks detect changes after
those snapshots and suppress dependent exact usages, but the MVP does not claim
complete Jiti/runtime module snapshotting and retains that short
config-loading-to-Program boundary.

Failures are reported as `WorkspaceGenerationError` with a stable `code`,
`phase`, and safe project/source/form/output provenance. The original error is
retained as `cause` for trusted build tooling but is not serialized into the
workspace index. When discovery wraps a configuration import failure, the CLI
prints a generic hint to check `tsconfigPath` and Node-safe contract entry
points without exposing private paths, package names, or stack traces.

### Sibling records and pinned assembly

The opt-in runner now publishes an independent source-usage catalog. Later
workspace contributors publish journey, behavior/scenario, Angular-authoring,
and driver-registry record families. They do not mutate Form Contract `0.4.0`
or turn the current workspace index into one monolithic document. Each family
owns its strict schema, canonical
non-self-referential hash, identity rules, coverage and unknowns, and safe
path/privacy policy.

The first shared agent-context record is a narrow artifact-set envelope. It has
one structured workspace-index reference, an open collection of
schema-addressed content references, and its own `contentHash`. It does not
define one universal artifact-kind list, artifact ID grammar, build ID, or input
digest. Each artifact-owning schema validates its own identity and contents.
Later source-usage, journey, scenario, and driver records pin the exact hashes
needed for an operation.

Live assembly and freshness comparison belong to the pure query layer, not the
envelope parser. They fail closed for incompatible sets, stale lineage, a
scenario based on a different contract, ambiguous usage, incomplete configured
coverage where an authoritative negative answer is required, or a changed
driver registry. Exact execution authority is a separate schema record, and
the pure validator owns exhaustive stable consumer diagnostics.

Scenario responsibilities are explicit: the portable behavior schema owns
conditions, exact edges, access prerequisites, replay cases, scoped
completeness, and unknowns; trusted Angular scenario compilation produces a
resolved artifact tied to one form-contract hash; AOT authoring contributes
observations; the future context/query layer references and validates those
artifacts but does not produce them.

The current `runWorkspace`, `generate`, and `check` commands publish and verify
the source-usage sibling only when `sourceUsage` is configured. They do not yet
assemble the complete sibling graph. Callers can assemble a hash-pinned
artifact set and use the pure agent-context query API; no CLI query command or
production MCP transport is included.

### Use the generic pilot CLI

After building or linking the workspace package, run the same boundary through
the `formly-contracts` binary:

```sh
pnpm exec formly-contracts list
pnpm exec formly-contracts generate
pnpm exec formly-contracts generate \
  --workspace-root ../claims-workspace \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot
pnpm exec formly-contracts generate \
  --project-config libs/forms-kit/formly-contracts.project.ts
pnpm exec formly-contracts check \
  --workspace-root ../claims-workspace \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot
```

`list` prints the deterministic configured project/source inventory without
executing source lists or form factories. Successful generation prints the
contract count, workspace-relative index path, and optional source-usage path
and diagnostics. `check` executes the same trusted source inventory, factories,
extraction, hashing, and optional source indexing as generation, but only reads
and exact-compares expected bytes; it never repairs or rewrites output. Missing
or stale output returns status `1`.

Project selection is repeatable. `--project <id>` filters after every matched
project config has loaded. When another project cannot be imported at all, use
the exact workspace-relative `--project-config <path>` selector; discovery then
loads only those matched configs. The two selector forms cannot be combined.
Selected generation/check runs publish their index and optional source-usage
catalog beneath `scopes/projects/<selection-hash>/` rather than replacing the
complete workspace index. Content-addressed form artifacts retain their normal
paths.

`list` continues across project-local config-load failures, prints every healthy
project, reports only safe config-path failure records, and exits `1` when any
matched project was unavailable. An exact healthy `--project-config` selection
can therefore list or generate without importing a known browser-only sibling.

Usage failures exit with status `2`; discovery, generation, and check failures
exit with status `1` and omit stack traces and underlying callback errors.
`--fail-on warning` and `--fail-on error` may be repeated for `generate` or
`check` to override diagnostic policy. `list` does not accept output or
diagnostic overrides because it never generates contracts.

## Custom-field profile authoring

[ADR 0011](decisions/0011-named-formly-environments-and-contracted-field-adapters.md)
proposes the intended product model: the root workspace declares named Formly
environments, reusable field libraries contribute compact reviewed adapters
once through the same catalog/helper used by production registration, and each
Formly-producing project selects one exact environment. Third-party types use
an explicit reviewed binding adapter. The Angular authoring host inventories
the real registrations/scopes, runs required controlled conformance, and
deterministically emits the existing canonical `FieldTypeProfileRegistry` for
the compiler. Missing or conflicting adapters, registrations, codecs, drivers,
examples, or scopes remain non-actionable.

The compact authoring slice now covers radio and other single/multi choice
presentations, typed inputs, autocomplete, row selection, repeaters, steppers,
and reviewed wrapper activation. Each declaration supplies the exact Formly
type or wrapper name and lowers to the existing canonical registry DTO. It does
not inspect Angular templates or infer behavior from a component name.

The `fieldTypeProfiles` example below documents the currently implemented
legacy input. It remains useful for migration and preserves the current v0.4
registry bytes and compiler behavior, but it is not the intended normal
authoring UX. Proposed workspace-config `0.3.0` retains it for one deprecated
pre-1.0 transition; the next breaking schema, targeted as `1.0.0`, removes it
unless `AUTH-MIG-1` records measured evidence and an explicit ADR amendment.
When named environments land, a project will select an environment or provide
this legacy registry, never both; no merge or precedence fallback is planned.

### Compact field and wrapper authoring

Keep the contracted descriptor data-only beside the custom field library:

```ts
import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
} from "@formly-contract/schema/field-type-authoring";

export const COOL_RADIO_TYPE = defineContractedFormlyType({
  name: "cool-radio-btn-grp",
  profile: { id: "claims.cool-radio", version: 1 },
  behavior: radioChoice(),
});

export const CLAIMS_FIELD_TYPE_PROFILES = buildFieldTypeProfileRegistry({
  id: "claims.field-types",
  version: 1,
  types: [COOL_RADIO_TYPE],
});
```

Bind the Angular component only in the runtime module:

```ts
import { toFormlyTypeRegistration } from "@formly-contract/schema/field-type-authoring";

FormlyModule.forChild({
  types: [toFormlyTypeRegistration(COOL_RADIO_TYPE, CoolRadioComponent)],
});
```

`radioChoice()` defaults to `props.options` with `label` and `value` paths. Its
optional collection, label, value, disabled, and completeness settings accept
only validated data paths and closed values. Lowering is deterministic and
rejects duplicate type names or profile identities. The definition helper
snapshots and runtime-freezes validated data, so later caller-side mutation
cannot drift the registration name from the generated profile. Projects still attach the
generated registry through `fieldTypeProfiles`; that repeated attachment is a
transitional MVP constraint until named environments aggregate shared field
libraries once.

### Legacy project-owned registry input

A project may declare a versioned `fieldTypeProfiles` registry. The registry
maps an exact Formly type string, such as `cool-radio-btn-grp`, to reviewed
semantic parts, ARIA roles, an interaction operation, a possible-value domain,
and a stable driver identity. Named variants and wrapper profiles are explicit;
there is no fuzzy matching or silent last-write-wins behavior.

This reviewed registry remains the semantic and execution authority for
interactive custom types. A future Angular authoring contributor may inventory
configured Formly registrations, effective components and wrappers, public
component metadata, bounded source/template candidates, rendered roles and
parts, configured-scope coverage, and drift. That evidence can prefill review
scaffolds and explain an unknown custom type, but it cannot approve a profile,
choose a value codec, register a driver, or claim workspace-wide completeness
from one injector or browser state. Display/assertion-only fields and
components require an explicit non-interactive disposition and remain
non-executable or unknown until the schema defines a no-driver/non-interactive
profile branch. Declared and observed facts remain separate, and a mismatch is
a diagnostic rather than an automatic registry rewrite.

```ts
import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  type FieldTypeProfileRegistry,
} from "@formly-contract/schema";
import { defineFormContractProject } from "@formly-contract/workspace";

const fieldTypeProfiles: FieldTypeProfileRegistry = {
  schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  id: "claims.field-types",
  version: 1,
  profiles: [
    {
      identity: { id: "claims.radio-group", version: 1 },
      semanticType: "single-choice",
      valueShape: "scalar",
      evidence: "declared",
      parts: [
        {
          name: "option",
          role: "radio",
          cardinality: "many",
          evidence: "declared",
        },
      ],
      interaction: {
        kind: "choice",
        operation: "check",
        optionPart: "option",
      },
      valueDomain: {
        kind: "projected",
        source: "adapter",
        completeness: "complete",
        collectionPath: "props.options",
        labelPath: "label",
        valuePath: "value",
        evidence: "declared",
      },
      driver: {
        kind: "generic",
        id: "generic.choice",
        version: 1,
        capabilities: ["check"],
      },
      effectCapabilities: {
        targetProperties: ["options"],
        readiness: [
          {
            id: "claims.case-type-options-ready",
            targetProperty: "options",
            evidence: "declared",
          },
        ],
      },
      unknowns: [],
    },
  ],
  registrations: [
    {
      formlyType: "cool-radio-btn-grp",
      defaultProfile: { id: "claims.radio-group", version: 1 },
      variants: [],
    },
  ],
  wrappers: [],
};

export default defineFormContractProject({
  projectId: "claims/forms",
  fieldTypeProfiles,
});
```

The resolved project configuration carries a canonical registry copy plus its
schema version, registry ID/version, and content hash. Reordering set-like
registry input does not change that identity; changing semantic content or a
profile version does. Registry data cannot contain Angular components,
callbacks, Playwright locators, or executable drivers.
Every profile declares an `effectCapabilities` block. Empty arrays explicitly
mean that the profile contributes no custom effect target or readiness
capabilities beyond the compiler's conservative built-in control baseline.

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

The revised Angular authoring lane is compatibility-first: schema-owned
compatibility result, retained application-target gate, Node-safe named
environment, isolated AOT inventory, deterministic adapter lowering, required
controlled conformance, and generated registry/environment-bundle publication.
Source/template joins and scaffolds are optional migration aids. The lane is
separate from the trusted JIT scenario compiler. Exact application-specific
drivers remain available when a custom field cannot be made safely generic.

## Project-owned cross-field effects

A project may declare one versioned `crossFieldEffects` registry beside its
source and field-profile registries. The registry owns explicit relationships
for stable form and node IDs. It never accepts callbacks, services, readiness
executors, observed deltas, or candidate authority.

```ts
import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  type CrossFieldEffectRegistry,
} from "@formly-contract/schema";
import { defineFormContractProject } from "@formly-contract/workspace";

const crossFieldEffects: CrossFieldEffectRegistry = {
  schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  id: "claims.cross-field-effects",
  version: 1,
  forms: [
    {
      formId: "claims.intake",
      coverage: "complete",
      effects: [
        {
          identity: {
            id: "claims.product-filters-case-type",
            version: 1,
          },
          trigger: {
            nodeId: "claims.intake::path:s_product",
            event: "selectionChanged",
          },
          target: {
            nodeId: "claims.intake::path:s_caseType",
            property: "options",
          },
          kind: "filters",
          timing: {
            mode: "async",
            readinessId: "claims.case-type-options-ready",
          },
          ordering: "source-before-target",
          evidence: "declared",
          opacity: "transparent",
        },
      ],
    },
  ],
};

export default defineFormContractProject({
  projectId: "claims/forms",
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
may be reduced to `warning`. Workspace generation resolves endpoint existence,
stable condition-rule IDs, target/readiness capabilities, and strongly
connected components before carrying an effect into the form artifact and
workspace index. Error-policy cycles and invalid effects are diagnosed and
omitted. Warning-policy cycles remain visible with warning diagnostics and an
`effect-cycle` reason that keeps analysis incomplete. Existing non-effect
diagnostics retain their extraction order; deterministic effect diagnostics
are appended without reordering unrelated evidence.

Each form registration must declare `coverage: 'complete' | 'partial'`.
Complete is an application-owned claim, and the compiler still downgrades the
artifact's `effectAnalysis` to incomplete when opaque dynamic rules or
diagnostics show that undeclared behavior may remain. Effect conditions may
reference serialized string conditions, not opaque dynamic-rule IDs. The
workspace index carries the full validated effect DTO, not only its identity,
so an index-only consumer retains trigger, target, timing, and ordering data.
Consequently, a missing edge is never treated as proof of independence while
analysis is incomplete.

Dependency strings, opaque handlers, controlled scenario deltas, and future
browser observations remain separate non-authoritative evidence. They cannot
be parsed as `CrossFieldEffectRegistry` and are never promoted to `loads`,
`filters`, `clears`, or `toggles` automatically.

These explicit v0.4 effects remain authoritative for application/business
verbs. A future closed normalized rule, witnessed against pinned evaluation
semantics, may authorize only the exact state edge it proves, such as
visibility or required state for one condition. Portable behavior records own
that narrower condition/state evidence, replay cases, access prerequisites, and
facet/scope-local completeness; they do not reinterpret callbacks, imported
helpers, lifecycle hooks, or RxJS pipelines as business effects.

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

The user-facing [Node-safe Angular libraries
guide](../apps/docs/src/content/docs/reference/node-safe-angular-libraries.md)
provides the complete factory, profile, source, path-alias, project-config,
selected-command, and temporary-shim setup.

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

The programmatic runner and `generate`/`check` commands execute trusted source
catalogs and declared form factories, resolve project field-type profiles and
explicit cross-field effects, and derive deterministic contracts and the
workspace index. With `sourceUsage` configured, they also resolve supported
direct root calls into a privacy-safe, hash-pinned source-usage catalog.
`generate` publishes these bytes; `check` compares them without writes.

The pure schema package can assemble an agent-context artifact set and query
the catalog by source path or form ID. The runner does not yet publish that
assembled envelope, and the CLI has no query command. Application driver
identities remain data and do not execute code. Journeys, Angular-assisted
inventory, observed runtime capture, MCP transport, and Playwright execution
remain later increments on the same configuration bedrock.

The real representative producer/workplace `CTX-GATE` additionally requires
current `LIN-4`, `BHV-4`, `ANG-5`, and `DRV-0` artifacts. It blocks MCP and
Playwright, and the first Playwright vertical schedules only after the MCP
adapter. Neither layer accepts agent-supplied selectors, callbacks, or module
paths.

The [workplace pilot guide](workplace-pilot.md) turns this reference into a
single operational checklist and includes the expected artifact layout,
troubleshooting table, privacy boundary, and feedback template.
