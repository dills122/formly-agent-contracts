---
title: Public API reference
description: Choose the supported Formly Contract entry point for schema data, Formly compilation, workspace orchestration, or custom-field authoring.
---

Formly Contract is pre-release. This page documents the supported package entry
points on the current default branch; generated TypeScript declarations remain
the exhaustive authority for overloads and types.

## Choose an entry point

- **`@formly-contract/schema`** — Node build/test tooling for portable DTOs,
  strict parsers, canonical JSON, hashes, registries, pure agent-context
  queries, and typed-intent validation.
- **`@formly-contract/schema/field-type-authoring`** — Angular browser code or
  Node tooling for compact custom-field declarations shared by Formly
  registration and profile generation.
- **`@formly-contract/compiler`** — trusted Node or Angular build/test tooling
  for declared Formly projection and controlled scenario compilation.
- **`@formly-contract/workspace`** — trusted Node tooling for configuration,
  discovery, source definitions, artifact generation, checking, source
  linkage, and local factory-input inspection.
- **`@formly-contract/playwright`** — private experiment for reviewed
  driver-implementation binding only; it does not execute Playwright or launch
  a browser.

Do not import package-internal files. The package roots and the one documented
schema subpath are the compatibility boundary.

## Schema

### Form Contracts and canonical data

| API | Purpose |
| --- | --- |
| `parseFormContract(value)` | Strictly validate unknown or stored JSON as a `FormContract`. |
| `createFormContract(draft)` | Validate, canonicalize, and hash a contract draft. |
| `canonicalStringify(value)` | Serialize supported contract data deterministically. |
| `computeContentHash(value)` | Compute the canonical SHA-256 digest used by portable artifacts. |
| `verifyContentHash(value)` | Verify that a hashed value still matches its canonical content. |

```ts
import {
  canonicalStringify,
  parseFormContract,
  verifyContentHash,
} from '@formly-contract/schema';

const contract = parseFormContract(JSON.parse(serialized));
if (!verifyContentHash(contract)) throw new Error('Contract hash mismatch.');
const canonical = canonicalStringify(contract);
```

### Portable registries and agent context

The schema root also owns strict `parse*`, canonicalization, hash, validation,
and type surfaces for:

- field-type profile and cross-field effect registries;
- runtime provenance and workspace-linked agent-context artifact sets;
- source-usage and journey catalogs;
- execution authority and driver registry manifests; and
- bounded agent-context queries and signed pagination cursors.

Primary entry points include `parseFieldTypeProfileRegistry`,
`parseCrossFieldEffectRegistry`, `parseRuntimeProvenance`,
`parseAgentContextArtifactSet`, `parseAgentContextSourceUsageCatalog`,
`parseAgentContextJourneyCatalog`, `parseAgentContextExecutionAuthority`,
`parseAgentContextDriverRegistryManifest`, `parseAgentContextQuery`,
`executeAgentContextQuery`, `parseAgentContextTestIntent`,
`validateAgentContextTestIntent`, and
`revalidateAgentContextExecutionPlan`.

`executeAgentContextQuery` is pure. The caller must first assemble and validate
the complete dataset; no CLI command or MCP transport currently performs that
assembly.

### Typed intent and canonical plans

| API | Purpose |
| --- | --- |
| `parseAgentContextTestIntent(value)` | Strictly parse the closed semantic operation union; raw selectors and unknown operations are rejected. |
| `parseAgentContextIntentDiagnostic(value)` | Enforce the schema-owned code, severity, blocking, exact code-specific location fields, and remediation policy. |
| `validateAgentContextTestIntent(input)` | Purely join intent to one pinned current CTX-1 E2E slice and return either a canonical plan or blocking diagnostics. |
| `parseAgentContextValidatedExecutionPlan(value)` | Strictly parse the closed plan union and reject unreviewed authority fields. |
| `computeAgentContextTestIntentHash(value)` | Compute the canonical source-intent content identity retained by a validated plan. |
| `computeAgentContextValidatedPlanHash(value)` | Compute canonical content identity for an already parsed or validated plan; this helper is not an untrusted-input parser, and the hash does not grant semantic authority. |
| `revalidateAgentContextExecutionPlan(input)` | Require the exact source intent, verify intent/plan hashes, rerun validation against current authority, require a complete E2E slice, and compare the rebuilt plan exactly. |

The first validator slice covers the maintained synthetic positive/negative
path. Pattern-constrained literals, rich runtime value policies, repeaters,
usage actions, outcomes, and browser execution remain fail-closed follow-up
work. The supported pure length classifier follows Angular's optional-empty
`minLength` behavior and relies on a separate `required` constraint for empty
value invalidity. Declared wrapper activation preconditions also fail closed
until lossless wrapper-plan expansion is implemented. These APIs never load
Angular, Formly, driver implementations,
or the DOM, and their strict parsers reject accessor/coercion-based input rather
than executing caller code.

The intent and plan hashes are deterministic content identities, not
signatures or authorization tokens. A trusted caller must retain the exact
intent beside its plan and supply current validated context inputs whenever it
revalidates.

### Browser-safe field-type authoring

Production Angular registration must use the dedicated subpath rather than the
Node-oriented schema root:

| API | Purpose |
| --- | --- |
| `radioChoice(options?)` | Declare the shipped radio-choice behavior preset and option projection paths. |
| `defineContractedFormlyType(definition)` | Validate and freeze one compact Formly type declaration. |
| `toFormlyTypeRegistration(type, component)` | Bind the same declared type name to the real Angular component registration. |
| `buildFieldTypeProfileRegistry(input)` | Lower reviewed declarations into the canonical profile registry consumed by generation. |

```ts
import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
  toFormlyTypeRegistration,
} from '@formly-contract/schema/field-type-authoring';

export const COOL_RADIO = defineContractedFormlyType({
  name: 'cool-radio-btn-grp',
  profile: { id: 'claims.cool-radio', version: 1 },
  behavior: radioChoice(),
});

export const fieldTypeProfiles = buildFieldTypeProfileRegistry({
  id: 'claims.field-types',
  version: 1,
  types: [COOL_RADIO],
});

const formlyRegistration = toFormlyTypeRegistration(
  COOL_RADIO,
  CoolRadioComponent,
);
```

`radioChoice()` is the only compact behavior preset currently shipped. The
helper validates declared intent; it does not inspect the component template or
invent interaction semantics.

## Compiler

| API | Purpose |
| --- | --- |
| `extractFormContract(input)` | Project a supplied Formly field tree without executing callbacks. |
| `compileFormContractScenario(input)` | Build one trusted synthetic Formly scenario, then apply the same allowlisted projection. |
| `prepareFieldTypeProfileRegistry(registry)` | Validate and index a portable field-profile registry for resolution. |
| `resolveFieldTypeProfile(request)` | Resolve one Formly type/variant or return explicit unknown evidence. |
| `prepareCrossFieldEffectExtractionRegistry(registry)` | Prepare declared cross-field effects for extraction. |
| `resolveCrossFieldEffects(input)` | Resolve supported effect targets and cycle diagnostics against one form. |

### Declared extraction

```ts
import { extractFormContract } from '@formly-contract/compiler';

const { contract, diagnostics } = extractFormContract({
  formId: 'claims.create',
  fields: createClaimFields(),
});
```

Declared extraction does not invoke expressions, hooks, validators, option
functions, or Observables. Unsupported behavior remains diagnostic evidence.

### Controlled scenario compilation

```ts
import type { FormlyFormBuilder } from '@ngx-formly/core';
import { compileFormContractScenario } from '@formly-contract/compiler';

export function compileClaimsScenario(builder: FormlyFormBuilder) {
  return compileFormContractScenario({
    formId: 'claims.create',
    builder,
    createFields: () => createClaimFields(),
    model: { contactMethod: 'email' },
    formState: { readonly: false },
  });
}
```

Pass the `FormlyFormBuilder` from an Angular-owned injection context. This path
executes trusted application/Formly code. Keep it in a controlled build or test
host, use synthetic scenario data, and publish only the validated portable
result.

The compiler also exports the type-only `FactoryInputAuthoringHarness` used by
local generated drafts. It has no runtime implementation or factory-execution
authority.

## Workspace

### Configuration and sources

| API | Purpose |
| --- | --- |
| `defineConfig(config)` | Validate and preserve the root workspace descriptor. |
| `defineFormContractProject(config)` | Declare project ownership, sources, profiles, and effects. |
| `defineFormContractSource(source)` | Group one or more explicitly registered complete form roots. |
| `defineFormContractDefinition(definition)` | Assign a stable form ID, fresh factory, scenarios, and optional root lineage. |
| `parseRootConfig(value)` / `parseProjectConfig(value)` | Strictly validate unknown configuration values. |

These descriptors are trusted executable configuration. Complete forms are
registered explicitly; fragments remain lineage/dependencies unless they are
deliberately exposed as standalone roots.

### Discovery, generation, and checking

| API | Purpose |
| --- | --- |
| `discoverWorkspaceProjects(options)` | Resolve root policy and inventory project/source IDs without executing source lists or form factories. |
| `runWorkspace(options)` | Execute trusted factories, validate contracts, and publish content-addressed artifacts plus the workspace index. |
| `checkWorkspace(options)` | Regenerate expected canonical bytes in memory and report missing or stale artifacts without writing. |
| `parseWorkspaceContractIndex(value)` | Strictly validate stored workspace index JSON. |

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

### Read-only factory-input authoring

`inspectWorkspaceFactoryInputs(options)` follows the existing
project/source/definition/root-symbol chain and inspects supported direct uses
in the configured TypeScript Programs. It returns local draft text, review
metrics, and stable diagnostics. It does not call source lists, application
factories, callbacks, Observables, Angular views, or write the suggested file.

```ts
import { inspectWorkspaceFactoryInputs } from '@formly-contract/workspace';

const result = await inspectWorkspaceFactoryInputs({
  workspaceRoot: process.cwd(),
  rootConfigPath: 'formly-contracts.config.ts',
  formIds: ['claims.indexing'],
});
```

See the [CLI reference](./cli-api.md) for the matching
`author-factory-inputs` command and its refusal behavior.

## Private Playwright experiment

`@formly-contract/playwright` currently exports
`createAgentContextDriverImplementationRegistry`,
`bindAgentContextDriverImplementationRegistry`, and
`bindAgentContextValidatedPlanDriverCalls` plus their related types. The
package binds schema-validated driver identities to reviewed trusted-local
implementations and can lower an already validated plan into an all-or-nothing
batch of exact trusted driver-call bindings.

The plan binder accepts only the exact frozen implementation-binding result
returned by `bindAgentContextDriverImplementationRegistry`. An internal class
with an ECMAScript private field prevents ordinary TypeScript object spread or
resolver replacement from preserving the nominal result type. Private runtime
provenance separately rejects cloned and proxied objects; a content-hash match
alone does not authenticate executable state.

```ts
import {
  bindAgentContextDriverImplementationRegistry,
  bindAgentContextValidatedPlanDriverCalls,
  createAgentContextDriverImplementationRegistry,
} from '@formly-contract/playwright';

const implementationBinding =
  bindAgentContextDriverImplementationRegistry(registry, manifest);

const calls = bindAgentContextValidatedPlanDriverCalls(
  {
    intent,
    contextRef: validated.contextRef,
    plan: validated.plan,
    planHash: validated.planHash,
    dataset,
    liveOwners,
    driverRegistryManifest: manifest,
  },
  implementationBinding,
);
```

The binder repeats complete semantic revalidation before the first resolver
lookup. Every call contains the exact approved plan step, driver identity, and
required capabilities; there is no secondary selector or argument bag. The
result exposes callable identities but never invokes them and never returns a
partial call batch.

It is private, versioned `0.0.0`, and does not depend on Playwright, launch a
browser, generate Playwright source, or execute interactions. Do not treat the
package name as a shipped E2E API.

## API authority and stability

- Parse stored or untrusted JSON before using it.
- Treat diagnostics and unknowns as part of the result.
- Keep compiler/workspace roots out of Angular browser bundles.
- Import the browser-safe authoring subpath only for production registration.
- Do not import `src/` files or generated `dist/` files directly.
- Package versions and schema versions are independent compatibility signals.

For exhaustive current exports, read the package entry points for
[`schema`](https://github.com/dills122/formly-contract/blob/main/packages/schema/src/index.ts),
[`schema/field-type-authoring`](https://github.com/dills122/formly-contract/blob/main/packages/schema/src/field-type-authoring.ts),
[`compiler`](https://github.com/dills122/formly-contract/blob/main/packages/compiler/src/index.ts),
[`workspace`](https://github.com/dills122/formly-contract/blob/main/packages/workspace/src/index.ts),
and the private
[`playwright` experiment](https://github.com/dills122/formly-contract/blob/main/packages/playwright/src/index.ts).
