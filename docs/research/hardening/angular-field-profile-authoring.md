# RH-03: Angular/Formly Field-Profile Authoring and Conformance Bridge

**Status:** production design recommended; implementation not authorized by this
artifact

**Inference — decision:** proceed in phases with workspace-aware Formly inventory and
review-required scaffolds. Add rendered conformance only as a separate,
optional verification lane. Keep the reviewed project-owned profile registry as
the sole semantic authority.

**Repository baseline:** `d4ffdb517d0d506ed7cd55074c4eac720a145f8b`

**Research date:** 2026-08-27

## Executive decision

**Inference — feasibility:** The retained spike can be hardened into a useful
authoring bridge without inventing selectors or interaction semantics. The
production-safe boundary is narrower than the earlier research implied:
Angular's stable `reflectComponentType` API is suitable for shallow runtime
metadata, but `@angular/compiler` template AST APIs are explicitly unstable.
Template analysis must therefore be optional, version-gated, and unable to
authorize a profile.

**Inference — value:** The bridge should materially reduce mechanical setup for
a workplace custom-field corpus by discovering loaded aliases, ownership gaps,
effective components, inheritance, wrappers, default surfaces, component
metadata, props candidates, and review TODOs. It cannot remove the substantive
review needed for model codecs, action sequences, overlay scope, dynamic states,
or driver choice. Whether the reduction is material in the target workplace is
still a pilot gate, not a proven result.

**Inference — decision:** Use a four-part design:

1. a Node-safe project config points to a separate trusted Angular authoring
   entry and supplies the exact tsconfig and source roots;
2. isolated Angular workers build one application-equivalent root or explicitly
   named feature scope at a time and inventory the public Formly registry;
3. an optional, Angular-version-gated source analyzer emits derived evidence and
   review scaffolds with explicit unknowns; and
4. optional TestBed and browser conformance compares reviewed declarations with
   scenario observations, emits drift diagnostics, and never rewrites the
   registry.

**Inference — decision:** Do not ship private-Ivy inspection, automatic profile approval,
automatic action probing, a bare-Node assumption for partial-compiled
libraries, or a claim that one root injector is a complete lazy-feature
inventory.

## Evidence classification

Every material conclusion below uses one of these labels:

- **Documented fact:** supported by a repository contract or an official
  Angular, Formly, TypeScript, Angular Material/CDK, Playwright, or Nx source.
- **Repository observation:** directly observed in the pinned repository,
  installed declarations/build output, focused tests, or the local synthetic
  fixtures.
- **Inference:** a design conclusion drawn from documented facts and repository
  observations.
- **Unknown:** evidence is insufficient; the design preserves the uncertainty
  or defines a gate.

Observed and derived evidence do not outrank a reviewed declaration. A mismatch
is a diagnostic against the declaration, not permission to replace it.

## Decision question and constraints

Can Angular/Formly introspection materially reduce the manual work required to
author reliable profiles for workplace custom types—including button toggles,
autocomplete, text editors, information panels, overlay single/multi-select,
table selection, date range, expansion/repeater controls, wrappers, and lazy
`FormlyModule.forChild` registrations—while remaining honest, deterministic,
and workspace-aware?

The design must:

- preserve project ownership of the serializable profile registry;
- avoid one duplicated central list of every custom type;
- distinguish configured scope coverage from workspace completeness;
- use no private Ivy definitions or instruction disassembly;
- keep Angular/application execution outside schema, compiler, MCP, and routine
  query processes;
- retain no live Angular type, injector, component, field tree, model, callback,
  or credential in an artifact;
- generate review-required candidates, never approved profiles;
- keep declared, derived, and observed evidence separate; and
- leave production packages and canonical plans/specifications unchanged in
  this research unit.

## What the retained spike proves—and does not prove

### Proven by the current spike

**Repository observation:**
`apps/formly-test-app/src/app/formly-types/custom-field-introspection.spike.ts`
and its focused tests prove the following on Angular `20.3.29`, Formly `6.1.8`,
and TypeScript `5.9.3`:

- `FormlyConfig.types` can be enumerated and the raw declaration retained before
  effective resolution;
- `getType()` resolves an inherited alias to an effective component and wrapper
  surface;
- controlled merging exposes inherited default-option and prop keys in this
  Formly version;
- stable Angular reflection exposes selector, standalone status, inputs,
  outputs, and content selectors;
- TypeScript source inspection finds literal component metadata and `props.*`
  reads;
- an explicit resource loader supports a literal external `templateUrl`;
- template AST analysis can propose narrow native-backed candidates;
- opaque children, parse errors, missing model binding, multiple actions,
  overlays, autocomplete, table selection, and repeaters remain non-actionable;
  and
- a declared role can be compared with an observed role multiset to produce a
  stable mismatch.

**Repository observation:** The real Formly integration test proves inventory
against the configured registry, including `rating-compact` inheriting the
`RatingFieldComponent`, wrapper, and default prop keys from its base type.

**Repository observation:** The schema/compiler implementation already owns a
strict, canonical, project-supplied profile registry with exact type
registrations, named variants, wrapper composition, explicit unknowns, stable
driver identities, content hashing, and unmapped diagnostics. This research
does not propose moving that authority into Angular.

### Not proven by the current spike

**Unknown:** The retained spike does not prove:

- a Node-safe workspace API for Angular imports/providers/source roots;
- isolated root versus feature-scope inventory;
- completeness across unloaded lazy injectors;
- safe joining of runtime component classes to source declarations in every
  build layout;
- component-level default options that require an instantiated component;
- props API extraction across re-exports, generic base classes, declaration-
  only packages, or dynamic indexed access;
- computed accessible names, overlay document-root scope, model codecs, or
  operation effects in automated CI;
- a no-interaction/display-only profile branch;
- a compound date-range operation/codec;
- multi-select close/toggle semantics;
- reuse of application CDK harnesses;
- partial-compiled workplace libraries under the proposed worker; or
- a measurable workplace author-time reduction.

**Documented fact — correction to the earlier research:** `parseTemplate` is exported by the
installed `@angular/compiler` entry point, but Angular's own compiler entry
source states that compiler APIs are experimental and private. It is viable as
a pinned optional implementation detail, not a stable public foundation.

## Focused evidence packet

### Environment

| Item | Observed value |
| --- | --- |
| Commit | `d4ffdb517d0d506ed7cd55074c4eac720a145f8b` |
| OS | macOS, Darwin arm64 |
| Node | `22.22.1` |
| pnpm | `10.23.0` |
| Angular CLI/core/compiler/compiler-cli | `20.3.29` |
| Formly | `6.1.8` |
| TypeScript | `5.9.3` |
| Nx fixture | `23.1.1` |

### Exact commands and results

```text
pnpm install --frozen-lockfile
```

**Repository observation:** Passed from the lockfile with 1,029 packages. The
expected pre-build warnings noted that workspace CLI bins did not yet exist.

```text
pnpm exec vitest run \
  apps/formly-test-app/src/app/formly-types/custom-field-introspection.spike.test.ts \
  apps/formly-test-app/src/app/formly-integration.test.ts
```

**Repository observation:** Passed, 2 files and 18 tests.

```text
pnpm --filter @formly-contract/formly-test-app build
pnpm --filter @formly-contract/angular-monorepo-fixture build
pnpm --filter @formly-contract/nx-workspace-fixture build
```

**Repository observation:** All three production builds passed. The first two
used Angular CLI application builds; the Nx fixture successfully ran
`fixture-nx-app:build:production` through Nx.

### Temporary host-risk experiment

The experiment was intentionally removed after execution so this delivery
retains only this decision artifact. It was run with:

```text
pnpm exec vitest run \
  apps/formly-test-app/src/app/formly-types/angular-host-risk.spike.test.ts
```

**Repository observation:** Passed, 1 file and 4 tests. The exact test cases
were:

1. Configure a root TestBed with `FormlyModule.forRoot` and verify a lazy alias
   is absent; create a feature NgModule containing `FormlyModule.forChild` with
   public `createNgModule`; verify the alias appears and both scopes reference
   the same `FormlyConfig` instance.
2. Call `reflectComponentType(FormlyField)` against the installed
   partial-compiled Formly package and verify the public selector/type mirror.
3. Define a JIT component with external `templateUrl`; verify reflection throws
   an unresolved-resource error, then load and analyze the same literal resource
   through the spike's explicit source loader.
4. Analyze a custom information-panel component with `role="status"` and no
   model write/action; verify the scaffold has no candidate operation and keeps
   `interaction-operation` unknown.

**Inference:** Feature scopes must run in fresh workers or fresh test
environments. Creating a feature module mutates the root Formly registry, so
sequentially loading every feature into one injector would lose scope
boundaries and make alias conflicts order-dependent.

### Bounded rendered observations

The existing local fixture galleries were served with:

```text
pnpm --filter @formly-contract/formly-test-app serve
pnpm --filter @formly-contract/angular-monorepo-fixture serve
```

The in-app browser then used role/name locators against
`http://127.0.0.1:4200/` and `http://127.0.0.1:4300/`.

**Repository observation:** The browser accessibility snapshot exposed:

- `radiogroup "Synthetic toggle choice"` with `radio "Alpha mode"` and
  `radio "Beta mode"`;
- `button "Synthetic overlay choice"`, followed after activation by option
  names `East team` and `West team`;
- `combobox "Synthetic autocomplete"` and `option "Amber record"`;
- `grid "Synthetic row selector"`, named rows, and named selection checkboxes;
- repeater groups and add/expand buttons;
- wrapper button `Expand Preferred contact method`; and
- `group "Coverage period"` with named `Start` and `End` textbox parts.

**Repository observation:** The following actions produced the following model
values:

| Action | Observed model result |
| --- | --- |
| Click `Beta mode` | `interaction.toggle = "beta"` and `aria-checked = true` |
| Open overlay and click `East team` | `interaction.overlay = "east"` |
| Fill `am`, click `Amber record` | `interaction.autocomplete = {"id":"amber"}` |
| Check `Select Synthetic row B` | `interaction.selectedRows = ["row-b"]` |
| Fill `Start`/`End` with ISO dates | `coveragePeriod = {"start":"2026-01-01","end":"2026-01-31"}` |

**Repository observation:** A global `option` locator also returned unrelated
native-select options while the custom overlay was open. A role/name pair does
not establish node or popup scope.

**Inference:** Generic execution and conformance must resolve each declared part
inside a node-local root, a declared popup root, or the document root for a
portal. Global role queries are not deterministic enough.

**Inference:** Date range is a compound two-part object codec. It should use an
application driver in the current vocabulary; a future generic compound-fill
branch requires schema and driver review.

## Official technical constraints

### Angular runtime, DI, and compilation

**Documented fact:** Angular marks `reflectComponentType` and its
`ComponentMirror` as stable. The mirror exposes selector, type, inputs, outputs,
content selectors, and standalone status—not template contents or rendered DOM.
Sources: [reflectComponentType](https://angular.dev/api/core/reflectComponentType)
and [ComponentMirror](https://angular.dev/api/core/ComponentMirror).

**Documented fact:** TestBed accepts NgModule-like imports and providers, which
supports an application-equivalent authoring host without bootstrapping the
production application. Source:
[Angular testing utility APIs](https://angular.dev/guide/testing/utility-apis).

**Documented fact:** Angular flattens reachable NgModule imports into a module
injector, while lazy NgModules create child injector hierarchies. Source:
[Angular hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection).

**Documented fact:** Angular Package Format libraries are published in partial
compilation mode and are linked during the consuming application build. A
non-CLI pipeline must integrate the Angular linker. Published full-Ivy
instructions are not public API and can change between patch releases. Sources:
[Angular Package Format](https://angular.dev/tools/libraries/angular-package-format)
and [Creating libraries](https://angular.dev/tools/libraries/creating-libraries).

**Documented fact:** Angular's compiler entry source labels compiler APIs
experimental/private even though `parseTemplate` is exported. Source:
[Angular compiler entry point](https://github.com/angular/angular/blob/main/packages/compiler/src/compiler.ts).

**Repository observation:** The installed Angular `20.3.29` declaration exports
`parseTemplate`, the template AST classes used by the spike, and public stable
runtime reflection. It exports component resource resolution only under an
`ɵ`-prefixed private name.

**Inference — decision:** Runtime inventory may depend on stable reflection. Source-template
analysis may depend on `parseTemplate` only behind an exact compatibility
adapter and focused tests. No implementation may read `ɵcmp`, `ɵmod`,
`ɵinj`, `ɵfac`, or any private resource-resolution API.

### Formly registration and props

**Documented fact:** Formly `6.1.8` exposes `FormlyConfig`, `getType`, and a
`TypeOption` surface containing `name`, `component`, `defaultOptions`, `extends`,
and `wrappers`; `FormlyModule` exposes `forRoot` and `forChild`. Source:
[Formly v6 core API](https://v6.formly.dev/docs/api/core/).

**Documented fact:** Formly custom types associate a component with an alias,
and `props` is intentionally template-specific. Wrappers compose in declared
order. Sources:
[custom type](https://v6.formly.dev/docs/guide/custom-formly-field/),
[properties/options](https://formly.dev/docs/guide/properties-options/), and
[custom wrapper](https://v6.formly.dev/docs/guide/custom-formly-wrapper/).

**Repository observation:** `FormlyConfig.types` is a public property in the
installed declaration. `getMergedField` is declared but annotated `@ignore`, and
component-instance defaults may require a view container and injector.

**Inference — decision:** Inventory reads the raw public registry and uses public `getType`
for the effective component/wrapper. It must not make `getMergedField` a
cross-version contract. Effective runtime defaults are observed by building a
minimal synthetic field through the configured `FormlyFormBuilder`; raw default
objects and inheritance chains remain separately reported.

### TypeScript and workspace resolution

**Documented fact:** A TypeScript `Program` represents a project and supplies
source files and a type checker. Compiler APIs can change and should be version
tested. Source:
[Using the TypeScript compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API).

**Documented fact:** TypeScript module resolution must match the host runtime or
bundler; `paths` describes another tool's mapping and does not rewrite runtime
imports. Source:
[TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference).

**Documented fact:** `rootDir` does not decide which files belong to a program.
Source: [TypeScript rootDir](https://www.typescriptlang.org/tsconfig/rootDir.html).

**Inference — decision:** The project must supply the application tsconfig and explicit
source roots. Source roots constrain inventory/reporting; the tsconfig supplies
the actual program, aliases, files, references, and compiler options.

### Angular Material/CDK and Playwright

**Documented fact:** CDK component harnesses are component-author-owned test
APIs. `TestbedHarnessEnvironment` supplies loaders, including a document-root
loader for overlay content. A different execution environment requires a
`HarnessEnvironment` implementation. Source:
[Angular CDK testing overview](https://material.angular.dev/cdk/testing/overview).

**Documented fact:** Playwright recommends role, label, and explicit contract
locators; role locators include accessible names and retry/actionability
behavior. Sources: [Playwright locators](https://playwright.dev/docs/locators)
and [auto-waiting](https://playwright.dev/docs/actionability).

**Documented fact:** Current Playwright component testing uses an
application-owned story gallery served by the application's build pipeline.
Components run in a real browser, and scenarios own their providers and mock
data. Source:
[Playwright component testing](https://playwright.dev/docs/test-components).

**Inference — decision:** Reuse registered CDK harnesses inside TestBed where available, but
do not infer operations from harness method names. Use an application-owned
Angular gallery plus normal Playwright locators for browser conformance. Do not
build a Playwright CDK `HarnessEnvironment` in the first slice.

### Nx and Angular CLI configuration

**Documented fact:** Nx project configuration exposes project roots/source
roots and build targets; Angular build targets expose a `tsConfig`, and Nx can
run Angular builders/executors. Sources:
[Nx project configuration](https://nx.dev/docs/reference/project-configuration),
[executors/configurations](https://nx.dev/docs/kb/executors-and-configurations),
and [Angular executors](https://nx.dev/docs/technologies/angular/executors).

**Inference — decision:** An Nx integration may suggest the application build target,
tsconfig, and source roots, but the resolved authoring configuration records the
exact values. Nx discovery is a convenience, not an alternate authority or a
requirement of the Angular package.

## Proposed authoring API

The following is a design candidate, not an approved public interface.

### Node-safe project configuration

The generic project config keeps Angular types out of ordinary workspace
discovery. It points to a separate trusted entry:

```ts
export default defineFormContractProject({
  projectId: 'claims/forms',
  sources: [CLAIMS_SOURCE],
  fieldTypeProfiles: CLAIMS_FIELD_TYPE_PROFILES,
  angularAuthoring: {
    entry: './formly-contracts.angular.ts',
    tsconfigPath: 'apps/claims/tsconfig.app.json',
    sourceRoots: [
      'apps/claims/src',
      'libs/forms-kit/src',
      'libs/workplace-fields/src',
    ],
  },
});
```

Required validation:

- paths are literal, workspace-relative, realpath-confined, and deterministic;
- `entry` and `tsconfigPath` are files;
- source roots are non-overlapping after normalization or duplicates collapse
  canonically;
- the Angular entry is not imported by generic `list`, MCP, or schema/compiler
  code; and
- resolved paths and file hashes contribute to authoring-run identity, while
  Angular objects do not enter workspace artifacts.

### Trusted Angular entry

```ts
export default defineAngularFieldAuthoring({
  root: {
    imports: [ClaimsFormlyAuthoringModule],
    providers: [...claimsApplicationConfig.providers],
  },
  featureScopes: [
    defineAngularFeatureScope({
      id: 'claims-intake-lazy',
      load: async () => {
        const feature = await import('./src/app/claims/claims.routes');
        return { imports: [feature.ClaimsIntakeAuthoringModule] };
      },
    }),
  ],
  scenarios: [
    claimsButtonToggleScenario,
    claimsOverlaySelectScenario,
    claimsAutocompleteScenario,
  ],
  harnessBindings: [claimsOverlayHarnessBinding],
});
```

The entry accepts:

- `imports`: NgModules and standalone declarables accepted by TestBed;
- `providers`: ordinary or environment providers needed to reproduce the
  controlled application configuration;
- explicit feature-scope loaders corresponding to real lazy ownership
  boundaries;
- synthetic scenario factories that return fresh fields/model/form state and
  stable IDs; and
- optional explicit harness bindings.

It does not accept a second list of Formly type registrations. The imported
application modules/providers execute their existing `forRoot`, `forChild`, or
standalone Formly registration.

**Inference:** A small application-owned authoring composition module may still
be required when the production `AppModule` has bootstrap, routing, network, or
authentication side effects. That module should re-export/import the same
Formly configuration modules, not copy individual type entries.

### Standalone compatibility

**Inference — decision:** The host API is neutral between NgModule and standalone
composition. For Formly 6 it can import `FormlyModule.forRoot/forChild` through
an application module. For newer Formly versions it can accept the application's
standalone providers. Support is claimed only for tested Angular/Formly pairs;
the current evidence proves Angular `20.3.29` with Formly `6.1.8`.

## Process boundaries

```text
generic workspace process
  reads Node-safe paths/policy only
          |
          v
isolated Angular worker (one root or feature scope)
  imports trusted entry, creates fresh TestBed, inventories Formly
          |
          +----> JSON-safe raw/effective inventory
          |
optional source worker (TypeScript Program + version adapter)
  reads configured sources/templates, emits derived candidates/unknowns
          |
          v
coverage report + review scaffold
  no Angular objects; never accepted as a profile registry
          |
          v
maintainer-owned reviewed FieldTypeProfileRegistry
          |
          +----> optional TestBed harness conformance
          |
          +----> optional AOT gallery + Playwright conformance
```

Each Angular scope runs in a new child process or equivalent hard-isolated
worker. The parent receives strict JSON on stdout or an IPC channel, enforces a
time/memory limit, and converts crashes into stable scope diagnostics. Worker
logs and underlying callback exceptions do not enter canonical artifacts.

## Inventory and evidence model

### Evidence record

Every report fact uses a common envelope:

```ts
interface AuthoringEvidence<T> {
  readonly source:
    | 'formly-registry'
    | 'angular-reflection'
    | 'typescript-source'
    | 'template-ast'
    | 'reviewed-profile'
    | 'testbed-observation'
    | 'browser-observation';
  readonly evidence: 'declared' | 'derived' | 'observed';
  readonly scopeId: string;
  readonly scenarioId?: string;
  readonly value?: T;
  readonly status: 'known' | 'unknown' | 'error';
  readonly reason?: string;
}
```

Rules:

- missing evidence is `unknown`, never `false`;
- `declared` Formly registration proves registration shape, not semantics;
- `declared` reviewed profile owns semantics;
- source/template facts remain `derived` even when confidence is high;
- browser/TestBed facts remain scenario-scoped `observed`;
- disagreements are retained as parallel facts plus a diagnostic; and
- values must pass the repository's canonical JSON constraints.

### Type inventory coverage

For every alias in every configured scope, report:

- scope ID and raw registration presence;
- alias and raw declaration order-independent fingerprint;
- raw component reference status, `extends`, wrappers, and JSON-safe default
  keys/values;
- full inheritance chain with cycle/missing-base errors;
- effective component and wrapper sequence from the configured Formly instance;
- effective defaults observed through a controlled builder scenario, kept
  separate from raw defaults;
- matched reviewed registration/profile/variant/wrapper identities;
- stable reflection metadata;
- source declaration join status and source/template resource status;
- declared/observed props keys and type strings when safely available;
- child selectors and whether their sources are in-program or opaque;
- scaffold disposition and explicit unknowns; and
- conformance status if a scenario exists.

### Component/source joins

Runtime constructor names are diagnostic hints, not stable identities. The
source worker should:

1. build a TypeScript Program from the configured tsconfig;
2. index literal Formly registrations and component symbols under the declared
   source roots;
3. index component decorators by source path, export symbol, selector, and
   class name;
4. join runtime aliases to source symbols only when the match is unique; and
5. emit `ambiguous-component-source`, `source-outside-roots`, or
   `declaration-only-component` otherwise.

An explicit trusted source hint may resolve an exceptional ambiguous join. The
hint is build input and evidence; it is not semantic profile data.

### Templates and opaque children

- Literal inline templates may be parsed.
- Literal external URLs resolve relative to the containing source file through
  a confined, read-only loader.
- Const indirection may resolve only through the TypeScript checker when the
  value is a single literal.
- Dynamic URLs, loaders, template outlets, dynamically created components, and
  parse failures remain unknown.
- Child component selectors are reported. The analyzer may recursively index a
  child whose source is in-program, but it may not flatten the child's DOM into
  the parent or infer an operation across the boundary.
- Package/declaration-only children remain `opaque-child-component`.

### Props API

The source worker may report:

- keys read as `props.foo` or literal `props['foo']`;
- keys in a resolvable `FieldTypeConfig<Props>` interface/type;
- optionality, readonly status, and a bounded printable type string;
- raw/default prop keys from Formly; and
- scenario-observed prop keys explicitly approved for reporting.

It must not claim a complete props API when it sees index signatures, computed
keys, `any`, getters with effects, runtime spreads, declaration-only bases, or
unresolved generic substitution.

### Lazy and feature coverage

The report distinguishes:

- `configured-and-loaded`: observed in the named scope;
- `configured-load-failed`: scope exists but did not build;
- `static-only-registration-candidate`: a literal source registration was not
  observed in any configured scope;
- `runtime-only-registration`: observed but not joined to configured source;
- `unconfigured-feature-candidate`: source evidence suggests a feature boundary
  absent from the manifest; and
- `unknown-dynamic-registration`: static analysis cannot enumerate it.

No summary field may be named `workspaceComplete`. The strongest initial claim
is `configuredScopeCoverage: complete | incomplete | unknown`.

## Serializable report and scaffold formats

### Coverage report

```ts
interface AngularFieldAuthoringReport {
  readonly schemaVersion: '0.1.0';
  readonly run: {
    readonly projectId: string;
    readonly configurationHash: string;
    readonly angularVersion: string;
    readonly formlyVersion: string;
    readonly typescriptVersion: string;
  };
  readonly scopes: readonly ScopeCoverage[];
  readonly types: readonly TypeCoverage[];
  readonly wrappers: readonly WrapperCoverage[];
  readonly diagnostics: readonly AuthoringDiagnostic[];
  readonly summary: {
    readonly registeredAliases: number;
    readonly reviewed: number;
    readonly missingProfile: number;
    readonly intentionallyNonInteractive: number;
    readonly scaffolded: number;
    readonly conformancePassed: number;
    readonly conformanceFailed: number;
    readonly conformanceUnverified: number;
  };
}
```

The report is canonical JSON. Ordering is by stable scope/alias/profile IDs.
Absolute workspace paths are normalized to workspace-relative paths. It contains
no source text, template text, model values, functions, Angular types, or
injectors.

### Review scaffold

The scaffold is deliberately not a `FieldTypeProfileRegistry`:

```ts
interface FieldProfileReviewScaffold {
  readonly schemaVersion: '0.1.0';
  readonly projectId: string;
  readonly formlyType: string;
  readonly scopeIds: readonly string[];
  readonly review: { readonly status: 'required' };
  readonly suggestions: {
    readonly classification?:
      | 'interactive'
      | 'assertion-only'
      | 'display-only';
    readonly semanticType?: string;
    readonly valueShape?: 'scalar' | 'array' | 'object';
    readonly parts: readonly SuggestedPart[];
    readonly interaction?: SuggestedInteraction;
    readonly valueDomain?: SuggestedValueDomain;
    readonly driver?: SuggestedDriver;
  };
  readonly evidence: readonly AuthoringEvidence<unknown>[];
  readonly unknowns: readonly ReviewUnknown[];
  readonly requiredDecisions: readonly string[];
}
```

The production profile parser rejects this shape. Promotion requires an
explicit maintainer edit into the project-owned registry followed by normal
schema validation and versioning.

## Conservative scaffold rules

### Universal rules

1. Never infer semantics from the Formly alias, class name, selector, CSS class,
   or file name.
2. A literal native role/input/event may suggest a part or operation only as
   `derived` evidence.
3. A writable candidate requires explicit Formly/form-control binding or a
   visible reviewed setter path; `[value]` alone is not a write contract.
4. More than one plausible action, a custom child, overlay/portal, dynamic role,
   dynamic template, runtime option source, or opaque codec blocks an actionable
   generic candidate.
5. Possible labels never prove model values. DOM `value` never proves the
   application model codec.
6. Unknowns that block a generic driver remain blocking after review unless the
   reviewer supplies a declaration or application driver.
7. Wrappers are scaffolded separately and composed only by reviewed wrapper
   profiles in declared order.

### Workplace acceptance matrix

| Type family | Safe scaffold | Required review / default disposition |
| --- | --- | --- |
| `button-toggle` | Literal group/option roles and bound options may suggest a choice profile | Confirm scalar/array codec, option projection, disabled state, name source, and click/check semantics before generic choice |
| `autocomplete` | Suggest query/popup/option parts when visible | Keep sequence, async readiness, structured codec, free-text policy, and overlay scope unknown; application driver unless all are declared |
| `text-editor` | Native textarea with Formly binding may suggest fill | `contenteditable`, iframe, toolbar, rich document codec, paste policy, or opaque editor child requires application driver |
| `add-nigo-info-panel` | Literal status/region/text can suggest display/assertion parts | No operation. Reviewer declares display-only/assertion-only; current profile schema needs a no-driver branch or authoring disposition |
| overlay select | Suggest trigger/popup/option parts | Confirm document/node scope, opening/closing, focus, option codec, readiness, and disabled behavior |
| overlay multi-select | Same parts plus array-shaped candidate | Generic choice is not approved until toggle/close/idempotence and array codec are represented; otherwise application driver |
| table selection | Suggest grid/row/selection parts | Row label-to-ID projection and single/multi selection remain unknown until declared |
| date range | Suggest group/start/end parts | Current vocabulary cannot express two-part object fill; use an application driver or add a reviewed compound-fill schema branch |
| expansion/repeater | Suggest add/item/expand parts | Multiple actions, index identity, child rendering, and remove/reorder semantics block automatic operation selection |
| wrapper | Suggest wrapper part and possible activation event | Activation order, scope change, modal/overlay behavior, and conflicts require a reviewed wrapper profile |
| lazy `forChild` | Report alias only in explicitly loaded feature scope | Never promote root absence to workspace absence |

### Display-only and non-interactive types

**Repository observation:** The compiler already supports template-only display
nodes, but the field-profile schema requires an interaction and driver for a
mapped custom Formly type.

**Inference — decision:** The authoring report immediately supports an
`intentionallyNonInteractive` disposition so coverage does not pressure authors
to invent a driver. Production actionability should later add a reviewed
`display-only`/`assertion-only` profile branch with no executable driver. Until
that schema change is approved, such a custom type remains non-actionable and
must not be forced into an interactive profile.

## Review workflow and ownership

1. The project owner adds one Node-safe Angular authoring pointer and one
   application-equivalent composition entry.
2. `formly-contracts angular inventory --project <id>` runs isolated configured
   scopes and writes only the report.
3. `formly-contracts angular scaffold --project <id>` writes review scaffolds
   for missing aliases and changed evidence. Existing reviewed profiles are not
   regenerated.
4. A maintainer reviews semantic type, value shape, parts, codec/value domain,
   operation, wrapper preconditions, driver ID/version, and every unknown.
5. The maintainer edits the existing project-owned
   `FieldTypeProfileRegistry`, increments appropriate identities, and runs the
   normal schema/config checks.
6. The authoring tool rereads the registry and reports coverage. It may print a
   diff but may not write the registry.
7. Optional conformance scenarios verify the declaration. Mismatches fail or
   warn under explicit policy and remain in the observed report.
8. CI checks the committed reviewed registry and, optionally, a reviewed
   coverage baseline. Generated source/template dumps are never committed.

One reviewed profile may serve multiple aliases only through explicit
registrations. One alias may select named variants only through the repository's
existing declared variant mechanism.

## Conformance design

### Inputs

Conformance receives:

- the reviewed resolved profile registry;
- a stable synthetic scenario ID and fresh factory;
- the configured root/feature scope;
- a node-local scenario root locator/host anchor;
- optional reviewed action vectors and expected model values; and
- optional explicit CDK harness or application-driver binding.

Scenario inputs are trusted executable build inputs but are never serialized.
Reports contain scenario IDs and allowlisted observations only.

### TestBed lane

TestBed conformance is fast and suitable for:

- component creation and provider availability;
- part presence/count and literal attributes;
- Formly control/model updates;
- wrapper activation and child insertion;
- component-authored CDK harnesses; and
- external-template behavior when the application test build has resolved
  resources.

It is not authoritative for computed browser accessibility, layout, focus,
portal behavior across the real application build, or browser event quirks.

### Browser lane

The application owns an AOT-built field-scenario gallery. Playwright mounts or
navigates to one named scenario and scopes all operations to its root. For each
declared part it records:

- role and computed accessible name;
- cardinality and visible/enabled/selected/expanded state;
- node-root, popup-root, or document-root scope;
- declared action outcome;
- allowlisted visible option labels; and
- an explicitly approved JSON-safe model sink for codec vectors.

Overlay checks first activate the declared trigger, then resolve the popup in
the declared scope. A portal may live outside the scenario root, but its popup
and options must still be uniquely associated with the scenario by a reviewed
contract. Global option enumeration is forbidden.

### Names, codecs, and actions

The current profile DTO records roles but not scenario-specific expected names.
The conformance scenario therefore supplies exact or patterned name
expectations for each part. A later schema may add a reviewed naming source if
execution needs it, but browser observations may not invent one.

Codec checks use reviewed vectors:

```ts
{
  intent: { optionLabel: 'Amber record' },
  expectedModelValue: { id: 'amber' },
}
```

The runner executes only the reviewed generic/application driver or explicit
harness binding. It never clicks every option to reverse-engineer the domain.

### CDK harness reuse

A harness binding is explicit:

```ts
defineHarnessBinding({
  profile: { id: 'claims.overlay-select', version: 2 },
  harness: ClaimsOverlayHarness,
  verify: verifyClaimsOverlayProfile,
});
```

The tool does not map arbitrary harness method names to contract operations.
TestBed uses the normal fixture loader and document-root loader for overlays.
The first slice does not attempt to run CDK harnesses through Playwright.

### Drift and authority

Conformance outcomes are `pass`, `fail`, or `inconclusive` per scenario/fact.
Stable diagnostics include:

- `DECLARED_PART_NOT_OBSERVED`;
- `DECLARED_ROLE_MISMATCH`;
- `DECLARED_NAME_MISMATCH`;
- `DECLARED_CARDINALITY_MISMATCH`;
- `OVERLAY_SCOPE_AMBIGUOUS`;
- `CODEC_VECTOR_MISMATCH`;
- `DRIVER_OPERATION_FAILED`;
- `SCENARIO_NOT_CONFIGURED`; and
- `OBSERVATION_INCONCLUSIVE`.

A failure never edits semantic data. Fixes require an application change, a
scenario correction, or a reviewed profile/driver version change.

## Partial compilation, JIT, and version policy

### Supported path

- Runtime inventory executes the consuming application's source/configuration
  under an exact tested Angular/Formly pair.
- Browser conformance uses the application's Angular CLI/Nx AOT build, which
  performs normal resource resolution and partial-library linking.
- Stable reflection is the only runtime metadata dependency.
- Optional template AST support is implemented by an adapter keyed to an exact
  supported Angular minor and guarded by fixture tests.

### Unsupported assumptions

- Bare Node cannot import arbitrary partial-compiled workplace libraries and be
  assumed to have linked them correctly.
- A JIT decorator with unresolved external resources cannot be synchronously
  reflected/rendered without a supported resource-resolution build/test path.
- Source templates are not guaranteed in a published Angular package.
- Angular compiler AST shapes are not semver-stable public contracts.
- A library compiled with a newer Angular version than the consuming app is not
  a supported compatibility claim.

### Version gate

Before supporting a pair, CI must prove:

1. stable reflection against source and a partial-compiled library;
2. NgModule and standalone host composition;
3. root and explicit feature-scope Formly registration;
4. inline/external template source analysis;
5. opaque-child and parse-failure refusal;
6. application production build/linking;
7. TestBed creation and browser gallery render; and
8. no private-Ivy imports/property reads in the package.

Template analysis disables itself with `UNSUPPORTED_ANGULAR_COMPILER_VERSION`
when no exact adapter exists. Runtime inventory and manual review remain usable.

## Option comparison

| Option | Constraints fit | Value | Failure modes | Reversibility | Confidence | Evidence that would change recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| Manual profiles only | Highest honesty; no Angular coupling | Low mechanical reduction | Missed aliases, drift, repetitive discovery | Immediate | High | Workplace corpus shows authoring is already cheap and coverage is maintained |
| Formly runtime inventory only | Public registry boundary; requires configured host | Good ownership/gap coverage | No roles, props API, codec, template, or operations; lazy scopes incomplete | High; optional package | High | Formly removes/publicly hides registry surface in supported version |
| Inventory + version-gated source scaffolds | Fits if derived-only and exact-version tested | Highest likely boilerplate reduction | AST churn, source unavailable, ambiguous joins, false confidence | High; analyzer can disable | Medium-high | Pilot finds few useful candidates or maintenance breaks each patch |
| One cumulative TestBed loading all features | Simple implementation | Broad union inventory | Registry mutation loses scope/alias conflict provenance; side effects accumulate | Medium | Low | A public Formly scope snapshot API appears and proves isolation |
| Fresh worker per declared root/feature scope | Honest lazy ownership and deterministic failures | High | More startup cost; explicit scope manifest required | High | High | Startup cost is prohibitive and a safe reusable isolated host is proven |
| JIT TestBed as sole conformance | Fast and harness-friendly | Medium | External resources, partial linking, accessibility/overlay/browser gaps | High | Medium-low | Representative workplace controls prove browser parity across all required facts |
| AOT application gallery + Playwright, optional TestBed/CDK | Real build/browser behavior and computed accessibility | High assurance | Heavier setup; scenario-specific; gallery drift | Medium-high; optional target | High | Build integration cannot isolate providers/data or provides little additional signal |
| Private Ivy metadata mining | Could expose compiled template internals | Superficially high | Patch breakage, unsupported API, still no semantic truth | Low | High reject | No evidence should reverse this under current constraints |

**Inference — recommendation:** Fresh-scope Formly inventory plus optional version-gated
source scaffolds is the first production slice. Add TestBed/CDK conformance
next, then an opt-in AOT browser gallery for profiles that justify the cost.

## Feasibility, value, and confidence

| Conclusion | Classification | Confidence | Basis / limit |
| --- | --- | --- | --- |
| Public runtime inventory is production-feasible on the pinned pair | Inference | High (0.90) | Existing integration test, lazy probe, production builds, official APIs |
| Source scaffolding is feasible as an optional exact-version adapter | Inference | Medium-high (0.80) | Existing matrix works; compiler API instability creates maintenance risk |
| Fresh feature scopes honestly cover lazy `forChild` registrations | Inference | High (0.90) | Official injector model and focused mutation probe; manifest completeness remains unknown |
| Browser conformance can validate roles, names, parts, overlay behavior, and reviewed codecs | Inference | High (0.88) | Rendered observations and official Playwright model; CI automation not yet retained |
| TestBed can reuse explicit CDK harness bindings | Inference | Medium (0.70) | Official supported pattern; repository has no retained CDK example |
| The bridge will materially reduce workplace manual setup | Inference | Medium (0.65) | Strong mechanical value, but no workplace corpus/time measurement |
| Automatic semantic profile generation is safe | Inference | Very low; reject (0.05) | Codec, overlay, opaque-child, compound control, and operation boundaries remain intrinsic |

## Failure and stop gates

Stop or narrow productionization when any gate fails:

1. **Private API gate:** if inventory or rendering requires reading `ɵ` metadata,
   stop that approach.
2. **Duplication gate:** if the authoring entry must repeat most individual
   Formly registrations instead of importing existing composition modules,
   redesign the host boundary.
3. **Isolation gate:** if representative feature imports trigger real network,
   authentication, persistence, or irreversible workflows that synthetic
   providers cannot replace, do not run TestBed inventory for that scope; use an
   application-owned gallery or manual declaration.
4. **Lazy honesty gate:** if configured scopes cannot be distinguished, report
   incomplete coverage and do not publish a union as complete.
5. **Compiler maintenance gate:** if an Angular minor breaks the source adapter
   without a small localized fix and focused tests, disable template analysis
   for that version rather than couple to Ivy.
6. **Partial-build gate:** if a library can be loaded only as unlinked partial
   output in bare Node, move the observation into the consuming Angular build.
7. **Conformance safety gate:** if verifying a codec requires indiscriminate
   clicking or real business effects, require reviewed synthetic vectors or
   leave it unverified.
8. **False-confidence gate:** if an unknown is required to authorize a generic
   driver, the scaffold remains non-actionable.
9. **Value gate:** run a workplace pilot. Continue source scaffolding only if it
   produces useful non-semantic evidence for a substantial share of custom
   types and saves more review time than the host/scenario upkeep costs. Record
   elapsed setup/review time rather than claiming a percentage in advance.
10. **Drift-noise gate:** if browser scenarios fail frequently for unrelated
    layout/content changes, narrow expectations to contract-relevant
    role/name/part/codec facts instead of weakening mismatch policy.

## Ordered implementation tasks

1. **Approve authoring contracts.** Review report/scaffold DTOs, evidence tags,
   diagnostics, configured-scope terminology, and artifact privacy rules.
2. **Resolve schema gaps.** Decide whether v0.4.x adds explicit
   display/assertion-only profiles, compound fill/date range, and multi-select
   semantics. Until approved, keep those non-generic.
3. **Add the optional Angular package shell and compatibility matrix.** Pin the
   first Angular/Formly pair and add a private-Ivy lint/grep gate.
4. **Add Node-safe workspace pointers.** Validate entry/tsconfig/source-root
   paths without importing Angular during generic discovery.
5. **Implement isolated host workers.** Support NgModule and standalone
   composition, timeouts, clean stdout JSON, and fresh root/feature scope runs.
6. **Implement Formly inventory.** Preserve raw/effective registration,
   inheritance, defaults, wrappers, scope provenance, alias conflicts, and
   profile coverage.
7. **Implement the TypeScript source index.** Join registrations/components,
   collect props candidates, and handle inline/external templates through an
   exact Angular adapter with refusal tests.
8. **Implement canonical coverage/scaffold output.** No registry writes; add
   stable diffs and explicit unknowns.
9. **Run the workplace value pilot.** Measure configuration effort, custom-type
   coverage, review time, ambiguous joins, and saved mechanical work without
   retaining workplace source.
10. **Add TestBed conformance.** Verify parts, wrapper gates, reviewed action
    vectors, model sinks, and explicit CDK harness bindings.
11. **Add the AOT gallery/browser lane.** Reuse the application build target;
    verify computed roles/names, popup scope, overlays, and codecs with normal
    Playwright locators.
12. **Retain a full synthetic acceptance matrix.** Include native and Material-
    like button toggles, autocomplete, text editor, display-only info panel,
    overlay single/multi-select, table selection, date range, expandable
    repeater, wrapper, opaque child, external template, inheritance, standalone,
    partial library, and lazy `forChild` cases.
13. **Document review and CI workflows.** Explain authority, version increments,
    optional conformance, failure policy, and unsupported-version behavior.
14. **Require independent review before Checkpoint B.** Review security/trusted
    execution, determinism, public API use, schema fit, and workplace value
    evidence.

## Acceptance traceability

| Acceptance criterion | Evidence / design location | Status |
| --- | --- | --- |
| 1. Distinguish spike proof from unproven work | “What the retained spike proves—and does not prove”; focused packet | Satisfied |
| 2. Workspace/Angular API, process boundaries, evidence model, report/scaffold, conformance | Proposed API; process diagram; evidence/report/scaffold; conformance sections | Satisfied as production design |
| 3. Lazy, external template, opaque child, overlay, display-only, partial/JIT risks | Four-test temporary probe; browser observations; template/opaque rules; partial/JIT policy | Satisfied for design decision; automated browser CI and CDK reuse remain implementation gates |
| 4. Options, feasibility/value, confidence, stop gates, ordered tasks | Final four decision sections | Satisfied |

## Residual unknowns

- **Unknown:** The number and distribution of workplace custom types and lazy
  feature scopes.
- **Unknown:** Whether workplace Angular libraries are consumed from source,
  linked partial distributions, or both.
- **Unknown:** Whether existing custom fields ship CDK harnesses.
- **Unknown:** Whether application build targets can host a synthetic gallery
  without authentication/network side effects.
- **Unknown:** The smallest generic operation vocabulary that covers the
  workplace multi-select, text editor, date range, and expansion controls.
- **Unknown:** Whether exact accessible names belong in the semantic profile or
  only in scenario conformance expectations.
- **Unknown:** Measured author-time savings and ongoing scenario maintenance
  cost.

These unknowns do not block the inventory/scaffold slice. They block broad
value claims, generic-driver approval for the affected families, and any claim
of workspace-complete conformance.

## Recommended next action

Approve a short implementation spike for Tasks 1–6 only: authoring DTO review,
Node-safe pointer, isolated root/lazy workers, public Formly inventory, and the
canonical coverage report. Run it against the two existing fixtures and a
metadata-only workplace census. Do not implement template heuristics or browser
conformance until the report proves that scope-aware inventory removes enough
mechanical work to justify the optional complexity.
