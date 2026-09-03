# Workplace Pilot Feedback Record — 2026-09-02

- Status: investigation complete; worker diagnostics follow-up implemented on
  `codex/document-workplace-feedback`; profile alias, four-package pilot
  bundle, and scheduler reconciliation follow-ups implemented on
  `codex/project-fixup-continuation`
- Repository baseline: `7242045145a77590b87ed8243a194d63a721ec3b`
- Baseline relationship: local `main` and `origin/main` were identical before
  this record was created
- Privacy boundary: application and organization identifiers from the source
  report are intentionally replaced with representative names

## Purpose and evidence boundary

This document retains the findings from a workplace-laptop pilot report and a
code-level re-audit of the corresponding Formly Contract implementation. The
report is evidence and feedback, not an instruction source. Repository code,
tests, accepted decisions, and current package surfaces determine each
disposition below.

The report described eight historical shortcomings. Some statements were
accurate at the current baseline, some described consumer work that remains to
be completed outside this repository, and some became stale after
[PR #119](https://github.com/dills122/formly-agent-contracts/pull/119) and
[PR #120](https://github.com/dills122/formly-agent-contracts/pull/120).

## Assessment summary

| Reported area | Current disposition | Recommended action |
| --- | --- | --- |
| One bad project prevents all workspace discovery (historical shortcoming #2) | Resolved by PR #119. Import-free discovery continues across a rejected project, exact `--project` and `--project-config` selection isolate a run, and selected output is scoped by a stable selection hash. | Retain the failure-isolation tests; do not reopen this as a product gap. |
| Angular browser barrels cannot be loaded (historical #1) | Narrowed, not universally solved. PR #120 supplies a guarded Angular worker and preloads the selected project's compiler. The reported `Cannot access ... before initialization` failure is now an application module-graph temporal-dead-zone failure, not the earlier missing-JIT-compiler failure. | Give contract discovery its own Node-safe import graph. Repair genuine Angular self-reference defects, but do not require the contract tool to evaluate the complete browser barrel. |
| Project failures hide their cause | Confirmed and addressed on this branch. The worker, supervisor, workspace result, and CLI now preserve stable code/phase data. | Use the redacted default for normal runs and opt into bounded local `--explain` output during diagnosis; never put explanation data in artifacts. |
| Phone, date, number, stepper, and other custom types remain unmapped (historical #3/#4) | Compact authoring primitives now exist in PR #120: typed input, choice, autocomplete, row selection, repeater, and stepper. The consuming repository still has to adopt them for its actual type names. | Migrate the application's type catalog to the compact presets and verify every registration with generated-contract and Angular conformance tests. |
| Many Formly aliases cannot share one authored profile (historical #5) | Addressed on this branch. `aliasContractedFormlyType` snapshots reviewed semantics under another exact name; registry lowering deduplicates identical profiles and rejects identity conflicts. | Retain exact positive, negative, and input-order tests; migrate consuming aliases without weakening profile review. |
| Dynamic option domains are not enumerable (historical #6) | Confirmed product-value gap for declared-only workspace output. The low-level scenario compiler can resolve synchronous options, but workspace generation does not execute `definition.scenarios`. | Implement the planned portable named-case and trusted resolved-scenario producer instead of subscribing generically to arbitrary application streams. |
| Function-valued expressions are not actionable (historical #7) | Partly overstated. Supported declared function expressions are retained as `dynamicRules`; `UNSUPPORTED_RULE` is emitted when a target or construct is outside the supported grammar. The remaining gap is causal, portable rule meaning. | Inspect exact warning node IDs/source paths, use named cases for outcomes, and add a closed declared rule AST before making causal execution claims. |
| Consumption depends on a sibling checkout (historical #8) | Addressed on this branch for the supported pilot packages. `pnpm pilot:pack` includes schema, compiler, workspace, and Angular with a checked install manifest. | Retain install/import/bin smoke tests; use a registry release as the durable distribution path. |

## Detailed findings

### Project isolation is already shipped

PR #119 separates import-free inventory from selected project execution. A
healthy project remains visible when another project config fails, and
`--project-config <path>` can select a known-good project without evaluating a
broken sibling. The report itself observed this behavior. This historical
shortcoming should stay closed unless a new reproduction violates the retained
isolation tests.

The safe default output intentionally reports a stable failure classification
without a stack. That privacy choice is separate from the loss of useful
diagnostic classification discussed below.

### Angular JIT support does not make every browser barrel Node-safe

PR #120's Angular host solves the framework-level prerequisite: the disposable
worker reserves the selected project's `@angular/compiler` before it evaluates
partially compiled Angular modules. The retained Angular smoke proves that this
works for a compatible browser barrel.

The new workplace symptom is different. A barrel evaluation reaches a
component decorator whose provider metadata refers to the component before
the JavaScript class binding is initialized. Angular documents
[`forwardRef`](https://angular.dev/api/core/forwardRef) for references that are
not yet defined, including a component referring to itself in `providers`.
Where the application currently has the equivalent of this:

```ts
@Component({
  providers: [
    { provide: FORM_FIELD_CONTROL, useExisting: NumberComponent },
  ],
})
export class NumberComponent {}
```

the intrinsic Angular repair is:

```ts
import { Component, forwardRef } from '@angular/core';

@Component({
  providers: [
    {
      provide: FORM_FIELD_CONTROL,
      useExisting: forwardRef(() => NumberComponent),
    },
  ],
})
export class NumberComponent {}
```

That repair is worthwhile, but it addresses one temporal-dead-zone edge. It
does not make a browser package's complete dependency graph a reliable Node
contract surface. The next eager re-export could load a browser-only global,
Apollo/NgRx initialization, an application provider, or another cycle.

The durable boundary is therefore stronger: the contract definition's entire
runtime dependency closure must be Node-safe. A type-only import helps only
when TypeScript erases it. It does not help when the form factory implementation
itself imports the browser barrel at runtime.

### Failure classification and safe explanations are now retained

The audit found that the runtime protocol permitted a worker failure to carry a
stable `code` and `phase`, but the useful data was then lost at three
boundaries:

1. [`project-worker.ts`](../../packages/workspace/src/project-worker.ts)
   catches config loading and inventory together and emits
   `PROJECT_INVENTORY_FAILED`; all caught exceptions are discarded.
2. [`worker-supervisor.ts`](../../packages/workspace/src/runtime-host/worker-supervisor.ts)
   receives the structured worker failure but converts every one to
   `WORKER_FAILURE` without retaining its code or phase.
3. [`run-workspace.ts`](../../packages/workspace/src/run-workspace.ts)
   converts every rejected project spawn to `PROJECT_CONFIG_LOAD_FAILED` in
   continue-on-error inventory.

This explained the observed generic output: the presentation layer could not
show the real phase because the parent no longer had it. The implemented
diagnostic slice now:

- split config-load, inventory, and compile catches;
- preserve the validated worker failure code and phase on the supervisor error;
- map those values to the existing safe workspace failure record;
- add `--explain` as an opt-in local view that prints a bounded, sanitized cause
  summary and workspace-relative frames;
- keep default output redacted, never serialize raw causes into deterministic
  artifacts, and do not stream unrestricted child stderr;
- test default redaction, explain output, path normalization, cause limits,
  worker crash/timeout behavior, and failure isolation.

This yields useful pilot output such as `PROJECT_INVENTORY_FAILED
(phase=inventory)` by default and a local explanation such as `ReferenceError:
Cannot access component before initialization` only when the operator requests
it. Explanation payloads are protocol-validated, limited to three cause
summaries and five workspace-relative frames, and remain runtime-only. The
worker's stdout/stderr stay suppressed. This does not turn the child into an
untrusted-code sandbox.

The first independent review found two last-mile gaps in that implementation:
fail-closed Angular `generate`/`check` wrapped the typed supervisor error before
the CLI could render it, and common `path=...`, Windows, and quoted paths with
spaces escaped the cause-message sanitizer. Both are now covered by retained
regressions. Built Angular CLI checks exercise inventory and compile failures
without `continueOnProjectError`; privacy-negative unit cases cover key/value,
quoted, labeled, POSIX, Windows-backslash, Windows-forward-slash, and file-URL
forms. Protocol version `1` is documented and tested as a strict
package-lockstep IPC shape: custom workers must target the exact workspace
package version rather than assuming unknown additive fields are accepted.

The second independent review found two non-blocking hardening gaps: UNC and
Windows namespace paths were not recognized by the cause-message sanitizer,
and the worker parser used one union-wide key allowlist that accepted fields
from the wrong discriminated message variant. The follow-up redacts those path
families, validates exact keys per worker message kind, and extends the built
Angular CLI smoke from `check` to fail-closed `generate` while asserting that no
output directory is published.

### Compact profiles exist; application adoption remains

[`field-type-authoring.ts`](../../packages/schema/src/field-type-authoring.ts)
now includes compact builders for typed inputs, choice controls, autocomplete,
row selection, repeaters, and steppers. These lower to the versioned schema;
they do not inspect or approve application components automatically.

The consuming application should map each exact Formly type name to a reviewed
profile and register the same profile with Angular. Clearing an
`UNMAPPED_FIELD_TYPE` warning is valid only after the profile's role, parts,
value codec, and interaction behavior match the rendered component.

### Alias authoring reuses only identical reviewed semantics

[`buildFieldTypeProfileRegistry`](../../packages/schema/src/field-type-authoring.ts)
now accepts duplicate profile identities only when independently lowered
profiles are identical. `aliasContractedFormlyType` supplies the compact path
for applications whose exact Formly names share reviewed behavior.

The safe rule is content-addressed reuse:

- allow multiple Formly type names to reference one `id@version` only when
  their lowered profiles canonicalize identically;
- emit the profile once and a registration for every exact type name;
- fail closed when the same identity lowers to different semantics;
- provide a compact alias helper so the author does not duplicate behavior
  input merely to name aliases.

### Dynamic options need an explicit scenario producer

Declared extraction correctly reports callback-, expression-, or
Observable-backed options as dynamic with no invented values. The intent
validator also correctly rejects a requested value that is not present in an
enumerated domain.

[`compileFormContractScenario`](../../packages/compiler/src/extract-form.ts)
can produce scenario-resolved values for a supplied synchronous instance. But
[`project-execution.ts`](../../packages/workspace/src/project-execution.ts)
currently calls declared `extractFormContract`, and the `scenarios` field in
[`source.ts`](../../packages/workspace/src/source.ts) is not a workspace
generation lane.

The correct follow-up remains `BHV-1` through `BHV-4` in the
[agent-context hardening index](./agent-context-hardening/execution-index.md):
portable JSON-safe named cases, fresh trusted Angular execution, exact declared
contract hashes, separate resolved artifacts, scenario-local completeness, and
explicit unknown/timeout results. A generic promise/Observable subscriber
would not know which application providers, fixtures, upstream model branch,
or settling policy are authoritative and could accidentally depend on private
or production data.

### Function rules are visible, but causal semantics are bounded

[`extract-form.ts`](../../packages/compiler/src/extract-form.ts) retains
supported declared `hide`, `required`, `readonly`, and `disabled` function
expressions as dynamic rules. It emits `UNSUPPORTED_RULE` for an unsupported
resolved target or construct; therefore the exact warnings must be triaged by
contract `nodeId` and `sourcePath` before assigning a single root cause.

Named scenarios can record that a state occurred in a particular case. They
cannot prove why it occurred. Portable causal behavior requires the closed
condition/effect grammar planned by ADR 0010; model-generated callback
interpretations remain review proposals, not executable authority.

### The pilot bundle now covers Angular use

[`pack-pilot.mjs`](../../scripts/pack-pilot.mjs) requires
`@formly-contract/schema`, `@formly-contract/compiler`,
`@formly-contract/workspace`, and `@formly-contract/angular`. It validates the
Angular tarball like other public packages, then uses a temporary consumer to
install the manifest arguments, import `@formly-contract/angular/jit`, and run
`formly-contracts-angular --help`. Publishing to a registry remains the normal
long-term distribution mechanism.

### Scheduler state is reconciled against exit gates

The continuation promotes `HOST-3` to complete and makes `HOST-4` ready.
Trusted-local worker spawning, permission guardrails, lifecycle IPC, failure
timing, host identity, deterministic completion order, and packed-consumer
coverage now pass; `HOST-4` retains the full publication fault matrix. Angular status does not advance: `ANG-0` and
`ANG-1` compatibility artifacts are absent, `ANG-2` lacks the retained peer
install matrix, and `ANG-3` lacks Task 7C's complete resolver/private-copy
matrix. Existing worker and JIT paths are retained partial evidence, not
grounds to bypass scheduler dependencies.

## Recommended delivery order

1. Preserve worker failure code/phase and add safe `--explain` output.
   **Completed on this branch.**
2. Establish the consumer-owned Node-safe contracts entry point described
   below.
3. Add profile alias reuse and migrate the application's custom types to the
   compact presets. **Alias reuse completed on this branch; consumer migration
   remains.**
4. Include Angular in the pilot tarball bundle and its install smoke.
   **Completed on this branch.**
5. Reconcile `HOST-*` and `ANG-*` scheduler statuses against their exit gates.
   **Completed on this branch.**
6. Approve ADR 0010's authority model, then implement the portable named-case
   and trusted resolved-scenario producer for dynamic domains.
7. Add closed causal rule authoring only after the scenario/evidence boundary
   is fixed.

The order puts operability and repeatable integration ahead of new semantic
claims. Items 1, 3, 4, and 5 are repository changes. Item 2 primarily changes
the consuming application. Items 6 and 7 are roadmap slices with versioned
schema and authority implications.

## Deep dive: a proper Node-safe contracts setup

This section expands recommendation 2 above. Its purpose is to make contract
generation depend on form semantics without making Node initialize the whole
Angular application.

### Required import topology

```text
Browser application
  -> @work/forms-kit
     -> Angular modules/components/providers/browser integrations
     -> pure form factories

Formly Contract worker
  -> formly-contracts.project.ts
     -> @work/forms-kit/contracts
        -> contract definitions and reviewed profile data
        -> pure form factories
        -> type-only model/Formly imports

Forbidden tool edge
  @work/forms-kit/contracts -X-> @work/forms-kit browser barrel
```

The important property is the missing edge, not the filename. Importing
`@work/forms-kit/contracts` must never evaluate `@work/forms-kit`.

### Representative file layout

```text
libs/forms-kit/
  formly-contracts.project.ts
  src/
    index.ts                         # browser entry point
    forms.ts                         # browser-safe factory entry point
    contracts.ts                     # Node-safe contract entry point
    lib/
      rate-exception.fields.ts       # pure Formly factory
      rate-exception.contract.ts     # Node-only descriptor
      field-type-profiles.ts         # schema data only
      number.component.ts            # Angular component
      forms-kit.module.ts            # Angular registration
```

Names are representative and deliberately contain no workplace identifiers.
The repository's maintained Nx fixture uses this same three-entry-point shape.

### 1. Make the form factory's runtime closure pure

```ts
// libs/forms-kit/src/lib/rate-exception.fields.ts
import type { FormlyFieldConfig } from '@ngx-formly/core';

export interface RateExceptionModel {
  amount?: number;
  reason?: string;
}

export function createRateExceptionFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'amount',
      type: 'application-number',
      props: { label: 'Amount', required: true },
    },
    {
      key: 'reason',
      type: 'application-select',
      props: {
        label: 'Reason',
        options: [
          { label: 'Correction', value: 'correction' },
          { label: 'Exception', value: 'exception' },
        ],
      },
    },
  ];
}
```

This file must not import the library's `index.ts`, Angular components,
GraphQL clients, NgRx stores, browser globals, or service instances. Shared
types must be imported with `import type` or moved to a data-only module. If a
real factory needs services or streams, keep `lineage.rootSymbol` pointed at
that real factory and provide a truthful Node-safe `create` adapter with
explicit synthetic inputs; do not fabricate application behavior.

### 2. Put descriptors and profiles behind the contracts entry point

Keep reviewed custom-field semantics in a data-only module. The exact behavior
must match the application's rendered controls; these representative presets
describe a numeric input and a native-style single select:

```ts
// libs/forms-kit/src/lib/field-type-profiles.ts
import {
  buildFieldTypeProfileRegistry,
  choiceControl,
  defineContractedFormlyType,
  typedInput,
} from '@formly-contract/schema/field-type-authoring';

export const FORMS_KIT_FIELD_TYPE_PROFILES =
  buildFieldTypeProfileRegistry({
    id: 'claims.forms-kit-fields',
    version: 1,
    types: [
      defineContractedFormlyType({
        name: 'application-number',
        profile: { id: 'claims.application-number', version: 1 },
        behavior: typedInput({
          semanticType: 'number',
          role: 'spinbutton',
        }),
      }),
      defineContractedFormlyType({
        name: 'application-select',
        profile: { id: 'claims.application-select', version: 1 },
        behavior: choiceControl({ presentation: 'select' }),
      }),
    ],
  });
```

```ts
// libs/forms-kit/src/lib/rate-exception.contract.ts
import {
  defineFormContractDefinition,
  defineFormContractSource,
} from '@formly-contract/workspace';

import { createRateExceptionFields } from './rate-exception.fields';

export const RATE_EXCEPTION_CONTRACT = defineFormContractDefinition({
  id: 'claims.rate-exception',
  create: () => ({
    fields: createRateExceptionFields(),
    model: {},
  }),
  lineage: { rootSymbol: createRateExceptionFields },
});

export const FORMS_KIT_CONTRACT_SOURCE = defineFormContractSource({
  sourceId: 'claims/forms-kit',
  list: () => [RATE_EXCEPTION_CONTRACT],
});
```

```ts
// libs/forms-kit/src/contracts.ts
export { FORMS_KIT_CONTRACT_SOURCE } from './lib/rate-exception.contract';
export { FORMS_KIT_FIELD_TYPE_PROFILES } from './lib/field-type-profiles';
```

Do not export `contracts.ts` from the browser `index.ts`; it imports the
Node-side workspace authoring API. The browser may instead import the pure
factory through `forms.ts`:

```ts
// libs/forms-kit/src/forms.ts
export { createRateExceptionFields } from './lib/rate-exception.fields';
export type { RateExceptionModel } from './lib/rate-exception.fields';
```

### 3. Give the subpaths exact TypeScript identities

For an Nx monorepo that consumes source directly, add explicit paths to the
root TypeScript config:

```json
{
  "compilerOptions": {
    "paths": {
      "@work/forms-kit": ["libs/forms-kit/src/index.ts"],
      "@work/forms-kit/forms": ["libs/forms-kit/src/forms.ts"],
      "@work/forms-kit/contracts": ["libs/forms-kit/src/contracts.ts"]
    }
  }
}
```

If the library is packed or published, expose the same names as actual package
secondary entry points and test their packed contents. A TypeScript-only alias
is enough for the in-repository pilot only when the selected runtime resolver
can resolve it from the configured `tsconfigPath`.

### 4. Import only the contracts subpath from project config

```ts
// libs/forms-kit/formly-contracts.project.ts
import { defineFormContractProject } from '@formly-contract/workspace';
import {
  FORMS_KIT_CONTRACT_SOURCE,
  FORMS_KIT_FIELD_TYPE_PROFILES,
} from '@work/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'claims-forms-kit',
  sources: [FORMS_KIT_CONTRACT_SOURCE],
  fieldTypeProfiles: FORMS_KIT_FIELD_TYPE_PROFILES,
});
```

The root config must select the TypeScript config that owns those aliases:

```ts
// formly-contracts.config.ts
import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: ['libs/**/formly-contracts.project.ts'],
  tsconfigPath: 'tsconfig.base.json',
  output: { directory: 'dist/formly-contracts' },
  diagnostics: { failOn: ['error'] },
});
```

The project config must not import `@work/forms-kit`, `FormsKitModule`, or a
feature barrel that re-exports them.

### 5. Keep Angular registration in the browser graph

```ts
// libs/forms-kit/src/lib/forms-kit.module.ts
import { NgModule } from '@angular/core';
import { FormlyModule } from '@ngx-formly/core';

import { NumberComponent } from './number.component';

@NgModule({
  imports: [
    FormlyModule.forChild({
      types: [
        { name: 'application-number', component: NumberComponent },
      ],
    }),
  ],
})
export class FormsKitModule {}
```

The authored profile and Angular registration share the exact Formly type name,
but they live on opposite sides of the runtime boundary. A browser/AOT
conformance test is what proves the declared profile matches the component; a
Node import does not instantiate the component.

### 6. Verify the boundary before broad generation

Run the smallest selected project first:

```sh
pnpm exec formly-contracts-angular list \
  --project-config libs/forms-kit/formly-contracts.project.ts

pnpm exec formly-contracts-angular generate \
  --project-config libs/forms-kit/formly-contracts.project.ts

pnpm exec formly-contracts-angular check \
  --project-config libs/forms-kit/formly-contracts.project.ts
```

The consumer should also retain tests that prove:

- importing `@work/forms-kit/contracts` under plain Node does not evaluate a
  browser-barrel sentinel;
- the selected Angular CLI run inventories and compiles the real factory;
- the ordinary Angular application build still succeeds;
- a deliberately broken sibling project is isolated and safely reported;
- generated contracts contain the expected form ID, nodes, profile IDs, and
  diagnostics.

### Temporary shim when the library cannot yet expose a subpath

A committed tool-only shim can unblock the pilot while library ownership is
coordinated:

```ts
// tools/formly-contract/forms-kit.contracts.ts
export { createRateExceptionFields } from
  '../../libs/forms-kit/src/lib/rate-exception.fields';
export { FORMS_KIT_FIELD_TYPE_PROFILES } from
  '../../libs/forms-kit/src/lib/field-type-profiles';
```

Point a dedicated `tsconfig.formly-contracts.json` alias at that shim and set
the root `tsconfigPath` accordingly. Preserve every required alias explicitly,
because TypeScript `paths` from an extending config are not merged key by key.

The shim is acceptable as an explicit pilot adapter. It is not the durable
architecture: it reaches into implementation files, can drift during
refactors, and is not a packaged consumer surface. Give it an owner and removal
condition: delete it after `@work/forms-kit/contracts` is available and passes
the same Node-import and generation tests.

## Verification evidence at the audited baseline

The following checks passed against the synchronized baseline during this
investigation:

- dependency installation with the frozen lockfile;
- demo build;
- focused schema/compiler/workspace/runtime-host tests: 103 tests passed;
- synthetic Angular/Formly compatibility tests: 2 tests passed;
- example suite: 19 tests passed;
- `pnpm test:angular-jit-host`, including compiler preload, broken-project
  isolation, and retained fixture contract checks;
- `pnpm release:check`, covering the four public packages;
- `pnpm pilot:pack`, confirming the current manifest contains only schema,
  compiler, and workspace.

That last bullet records the audited baseline. The follow-up on
`codex/project-fixup-continuation` now verifies a checksummed four-package
bundle through a temporary install, Angular JIT import, and Angular CLI help
smoke.

The report's exact application artifacts were not available in this repository.
Before changing rule support or profiles, retain the relevant sanitized
contract nodes with `nodeId`, `sourcePath`, diagnostic code, and declared value
domain so each consumer warning can be matched to the correct implementation
path.
