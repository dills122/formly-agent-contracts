# RH-03: Angular/Formly Field-Profile Authoring and Conformance Bridge

**Status:** candidate production design; implementation is blocked on the
retained compilation/linking/resource compatibility gate defined below

**Inference — decision:** proceed to a retained build-substrate compatibility
gate, then—only if it passes—workspace-aware Formly inventory and
review-required scaffolds. Add rendered conformance only as a separate,
optional verification lane. Keep the reviewed project-owned profile registry as
the sole semantic authority.

**Repository baseline:** `d4ffdb517d0d506ed7cd55074c4eac720a145f8b`

**Research date:** 2026-08-27

## Executive decision

**Inference — feasibility:** The retained spike makes a useful authoring bridge
plausible without inventing selectors or interaction semantics, but it does not
yet prove the production execution substrate. The safe boundary is narrower
than the earlier research implied:
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

1. a Node-safe project config points to an application-owned Angular
   application build target, separate trusted authoring entry, exact tsconfig,
   and source roots;
2. the Angular CLI/Nx application build performs normal AOT resource resolution
   and partial-library linking, after which fresh browser workers build one
   application-equivalent root or explicitly named feature scope at a time and
   inventory the public Formly registry;
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
  installed declarations/build output, or a retained test/fixture that another
  checkout can inspect or rerun.
- **Author testimony:** observed during this research run but not reproducible
  from the retained commit, such as a removed experiment or bounded manual
  browser session. It may motivate a gate but cannot satisfy a retained-proof
  claim.
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

**Author testimony:** Passed, 1 file and 4 tests in the author worktree. The
test file was removed and these results are not retained, so an independent
checkout cannot rerun them. The reported test cases were:

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
environments. The reported mutation result is consistent with Formly's shared
configuration and Angular's injector model, but it remains unverified retained
evidence until the compatibility gate includes the lazy-scope case. Sequentially
loading every feature into one injector risks losing scope boundaries and
making alias conflicts order-dependent.

### Bounded rendered observations

The existing local fixture galleries were served with:

```text
pnpm --filter @formly-contract/formly-test-app serve
pnpm --filter @formly-contract/angular-monorepo-fixture serve
```

The in-app browser then used role/name locators against
`http://127.0.0.1:4200/` and `http://127.0.0.1:4300/`.

**Author testimony:** The bounded browser accessibility snapshot exposed:

- `radiogroup "Synthetic toggle choice"` with `radio "Alpha mode"` and
  `radio "Beta mode"`;
- `button "Synthetic overlay choice"`, followed after activation by option
  names `East team` and `West team`;
- `combobox "Synthetic autocomplete"` and `option "Amber record"`;
- `grid "Synthetic row selector"`, named rows, and named selection checkboxes;
- repeater groups and add/expand buttons;
- wrapper button `Expand Preferred contact method`; and
- `group "Coverage period"` with named `Start` and `End` textbox parts.

**Author testimony:** The following actions produced the following model values:

| Action | Observed model result |
| --- | --- |
| Click `Beta mode` | `interaction.toggle = "beta"` and `aria-checked = true` |
| Open overlay and click `East team` | `interaction.overlay = "east"` |
| Fill `am`, click `Amber record` | `interaction.autocomplete = {"id":"amber"}` |
| Check `Select Synthetic row B` | `interaction.selectedRows = ["row-b"]` |
| Fill `Start`/`End` with ISO dates | `coveragePeriod = {"start":"2026-01-01","end":"2026-01-31"}` |

**Author testimony:** A global `option` locator also returned unrelated
native-select options while the custom overlay was open. A role/name pair does
not establish node or popup scope. A retained browser scenario must reproduce
this ambiguity before the browser lane is considered implemented.

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

**Documented fact:** Angular CLI application targets use the application build
system, and Angular CLI integrates the linker automatically for partial-Ivy
dependencies. Angular Architect targets are explicit `project:target` or
`project:target:configuration` build inputs. Sources:
[Creating libraries—consuming partial-Ivy code](https://angular.dev/tools/libraries/creating-libraries#consuming-partial-ivy-code-outside-the-angular-cli)
and [Angular CLI builders](https://angular.dev/tools/cli/cli-builder).

**Documented fact:** Angular 20's `@angular/build:unit-test` Vitest integration
uses the application build system but is explicitly experimental. It is useful
as an exact-version TestBed compatibility lane, not a durable cross-version
execution contract. Source:
[Angular 20 experimental unit testing](https://v20.angular.dev/guide/testing/unit-tests).

**Repository observation:** The installed Angular `20.3.29` declaration exports
`parseTemplate`, the template AST classes used by the spike, and public stable
runtime reflection. It exports component resource resolution only under an
`ɵ`-prefixed private name.

**Inference — decision:** The primary runtime substrate is an
application-owned Angular CLI `@angular/build:application` or Nx
`@nx/angular:application` AOT browser target. That target compiles a small
authoring browser entry that imports the trusted entry; it performs the normal
application resource resolution and partial-library linking. The generic Node
orchestrator may schedule and serve that target, but it never imports Angular
application code. Angular 20's unit-test builder may provide a secondary
TestBed lane only after the same exact-version compatibility gate passes.
Runtime inventory may then depend on stable reflection. Source-template
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
    runtime: {
      kind: 'angular-application-target',
      buildTarget: 'claims:formly-authoring:production',
      // Optional developer convenience; CI serves the confined build output.
      serveTarget: 'claims:serve-formly-authoring:development',
    },
    tsconfigPath: 'apps/claims/tsconfig.app.json',
    sourceRoots: [
      'apps/claims/src',
      'libs/forms-kit/src',
      'libs/workplace-fields/src',
    ],
    typeDispositions: [
      {
        formlyType: 'add-nigo-info-panel',
        disposition: 'intentionally-non-interactive',
        classification: 'display-only',
        reason: 'Renders reviewed case guidance; it does not mutate the model.',
      },
    ],
  },
});
```

Required validation:

- paths are literal, workspace-relative, realpath-confined, and deterministic;
- `entry` and `tsconfigPath` are files;
- `buildTarget` resolves to the supported Angular CLI or Nx application
  executor, its effective tsconfig matches `tsconfigPath`, and its browser entry
  is the application-owned authoring shell that imports `entry`;
- `serveTarget`, when present, resolves to the same application build target;
- source roots are non-overlapping after normalization or duplicates collapse
  canonically;
- each `typeDispositions` item has a unique exact Formly alias, one of the
  closed dispositions, and a non-empty review reason;
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
        return {
          imports: [feature.ClaimsIntakeAuthoringModule],
          providers: [provideClaimsIntakeAuthoringData()],
        };
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

- `imports`: public Angular `ImportProvidersSource` values—NgModules,
  `ModuleWithProviders`, or standalone components—accepted by
  `importProvidersFrom`;
- `providers`: ordinary or environment providers needed to reproduce the
  controlled application configuration;
- explicit feature-scope loaders corresponding to real lazy ownership
  boundaries;
- synthetic scenario factories that return fresh fields/model/form state and
  stable IDs; and
- optional explicit harness bindings.

The authoring browser entry is a small application entry point compiled by the
configured target. It bootstraps only the authoring shell and imports the
trusted definition above. The target may share normal application styles,
polyfills, file replacements, and provider modules, but it must not bootstrap
the production router or start network/authentication workflows. The
compatibility gate validates that the effective target really consumes the
declared entry and tsconfig; target-name inference alone is insufficient.

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
the retained tests/builds cover Angular `20.3.29` with Formly `6.1.8`, while the
application-target host claim remains blocked on the retained gate.

### Chosen compilation/loading substrate and retained gate

**Inference — decision:** Do not implement the host API or worker protocol until
a retained fixture proves the application-target substrate. The fixture is a
normal consuming Angular application with:

- an application-owned authoring browser entry and configured
  `@angular/build:application` target;
- one source NgModule type and one standalone type;
- one installed fixture library built in partial compilation mode;
- one component from that library with an external template and style;
- root and explicitly loaded `FormlyModule.forChild` registrations; and
- one opaque child and one deliberately missing external resource for refusal
  behavior.

The exact gate command must build the partial library, run the authoring
application target, start its confined static output, and use a real browser to
request root and feature-scope inventory. The retained assertions must prove:

1. the application target linked the partial library and rendered/reflected its
   component without a private-Ivy read;
2. the external template/resource was resolved by the application build;
3. NgModule and standalone imports both load;
4. root and feature registries are observed in fresh browser contexts without
   cross-scope contamination;
5. opaque and missing-resource cases produce stable refusal diagnostics; and
6. the emitted result passes the minimal compatibility-result schema and
   canonical round trip.

The minimal gate schema is implemented before the gate fixture and is not the
full authoring report:

```ts
type AngularHostCompatibilityCaseId =
  | 'entry-and-tsconfig'
  | 'partial-library-and-external-resource'
  | 'ngmodule-composition'
  | 'standalone-composition'
  | 'root-scope'
  | 'feature-scope-isolation'
  | 'opaque-child-refusal'
  | 'missing-resource-refusal'
  | 'network-denial';

type AngularHostCompatibilityCase =
  | { readonly id: AngularHostCompatibilityCaseId; readonly status: 'pass' }
  | {
      readonly id: AngularHostCompatibilityCaseId;
      readonly status: 'fail';
      readonly diagnosticCode: string;
    };

interface AngularHostCompatibilityResult {
  readonly schemaVersion: '0.1.0';
  readonly environment: {
    readonly builder: '@angular/build:application' | '@nx/angular:application';
    readonly buildTarget: string;
    readonly angularVersion: string;
    readonly formlyVersion: string;
    readonly typescriptVersion: string;
    readonly playwrightVersion: string;
    readonly targetConfigurationHash: string;
    readonly partialFixturePackageHash: string;
  };
  readonly cases: readonly AngularHostCompatibilityCase[];
}
```

Its runtime schema rejects unknown keys, requires every case exactly once in
the declared order, requires a diagnostic for failure and none for pass, and
requires all cases to pass before the tuple is supported. It exists solely to
prove the host substrate; full coverage/scaffold schemas follow only after this
gate succeeds.

The gate records the effective builder/executor, Angular/Formly/TypeScript
versions, target configuration hash, and fixture-library package hash. Failure
blocks the package shell and worker tasks. It is not deferred to the broad
control-family acceptance matrix.

**Inference — decision:** A successful application build may be reused across
scopes, but each scope runs in a fresh browser context/page that creates a fresh
Angular platform and injector. The Node parent serves only the confined build
output, selects a configured scope ID, reads one strict JSON result, then closes
the context. It does not evaluate application source or parse console logs as
the report protocol.

### Exact browser-host lifecycle and network boundary

**Documented fact:** `bootstrapApplication` bootstraps a standalone root
component and returns an `ApplicationRef`. `importProvidersFrom` collects
providers from NgModules, `ModuleWithProviders`, and standalone components for
an application/environment injector. `ApplicationRef.whenStable()` and
`destroy()` are public lifecycle APIs. Sources:
[bootstrapApplication](https://angular.dev/api/platform-browser/bootstrapApplication),
[importProvidersFrom](https://angular.dev/api/core/importProvidersFrom), and
[ApplicationRef](https://angular.dev/api/core/ApplicationRef).

**Inference — decision:** The pinned host uses exactly this public lifecycle:

1. Before navigation, the Node orchestrator creates a new Playwright browser
   context with service workers blocked, installs the deny-by-default request
   route, and registers a one-shot `page.exposeBinding` result bridge.
2. It navigates to the confined authoring origin with one validated configured
   `scopeId`. The compiled authoring main statically imports the trusted
   definition and rejects an unknown/duplicate scope before Angular bootstrap.
3. It awaits the selected feature loader, if any, and constructs one provider
   list: `importProvidersFrom(...root.imports, ...feature.imports)`, followed by
   the reviewed root and feature providers in declared order.
4. It calls `bootstrapApplication(AuthoringShellComponent, { providers })`.
   `AuthoringShellComponent` is a package-owned standalone component with no
   router, network service, template outlet, or application bootstrap side
   effect. Bootstrap/provider/initializer failure becomes
   `ANGULAR_HOST_BOOTSTRAP_FAILED`.
5. After bootstrap resolves, it awaits `appRef.whenStable()` with the scope
   timeout, then reads `FormlyConfig` from `appRef.injector`, inventories the
   configured scope, and submits exactly one discriminated success/failure
   envelope through the exposed binding. Node schema-validates the value; no
   console or DOM text is parsed as protocol.
6. In `finally`, the shell calls `appRef.destroy()` when created. The
   orchestrator closes the page and context and treats a second result, late
   callback, pending navigation, or teardown error as a stable gate failure.

This lifecycle composes the root plus one feature into a fresh application
environment injector; it does not claim to recreate the production router's
lazy child injector. Scope ownership is established by separate root-only and
root-plus-feature runs and their explicit scope IDs. If that representation
does not reproduce the registered Formly surface in the retained gate, the host
design fails rather than silently claiming lazy parity.

**Documented fact:** Playwright browser contexts can route requests and abort
them, route WebSockets separately, block service workers so they do not bypass
routing, and expose an explicit host binding to browser code. Sources:
[Playwright network](https://playwright.dev/docs/network) and
[BrowserContext.routeWebSocket](https://playwright.dev/docs/api/class-browsercontext#browser-context-route-web-socket),
and [page.exposeBinding](https://playwright.dev/docs/api/class-page#page-expose-binding).

**Inference — decision:** Network denial is installed before `page.goto`:

- allow only `GET`/`HEAD` requests to the exact random loopback authoring origin
  and confined build-output path prefix;
- create the context without storage state, HTTP credentials, client
  certificates, or an upstream proxy;
- abort every unmatched HTTP(S), beacon, EventSource, and other routed request;
  install `routeWebSocket` before page creation and immediately close every
  unmocked WebSocket; record `OUTBOUND_NETWORK_BLOCKED` and fail the scope even
  when the application catches the browser error; and
- permit reviewed mocks only as exact method + URL bindings that fulfill a
  local static/JSON response. Mocks never pass through, contain no credentials,
  have stable IDs/hashes, and are reported as configuration evidence.

The Task 2 fixture includes an initializer that attempts an external request
and must produce the stable denial case without reaching the test server.

## Process boundaries

```text
generic workspace process
  validates Node-safe paths/target/policy only
          |
          v
Angular CLI/Nx application build target
  links partial libraries, resolves resources, emits authoring browser shell
          |
          v
fresh browser worker (one root or feature scope)
  loads compiled trusted entry, creates fresh platform/injector, inventories Formly
          |
          +----> strict JSON raw/effective inventory
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

Each Angular scope runs in a fresh browser context/page or an equivalently
proven hard-isolated application-build worker. The parent receives a value that
passes the strict report schema through an explicit browser bridge, enforces a
time limit and output-size limit, and converts build, navigation, bootstrap,
schema, and timeout failures into stable scope diagnostics. Console logs and
underlying callback exceptions do not enter canonical artifacts. A secondary
TestBed worker may use the exact-version Angular unit-test builder, but it is
not a fallback for a failed application-target compatibility gate.

## Inventory and evidence model

### Evidence record

Every report fact uses a common envelope:

```ts
type JsonPrimitive = null | boolean | number | string;
type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
interface JsonObject { readonly [key: string]: JsonValue }

type AuthoringEvidence<T extends JsonValue = JsonValue> = {
  readonly id: string;
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
} & (
  | { readonly status: 'known'; readonly value: T }
  | { readonly status: 'unknown'; readonly reason: string }
  | { readonly status: 'error'; readonly reason: string }
);
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

All-alias inventory includes the schema-owned built-in allowlist. Custom-profile
coverage is the subset whose exact alias is not built-in-exempt. The compiler
and authoring validators consume the same versioned allowlist contract so a
standard alias cannot drift into `missingProfile` or scaffold output.

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

The first implementation must turn these TypeScript sketches into schema-owned
strict runtime validators before emitting artifacts. All object schemas reject
unknown keys; every referenced type below is closed and JSON-safe.

```ts
type ConfiguredScopeCoverageStatus = 'complete' | 'incomplete' | 'unknown';
type ScopeLoadStatus =
  | 'loaded'
  | 'build-failed'
  | 'navigation-failed'
  | 'bootstrap-failed'
  | 'timed-out'
  | 'invalid-output';
type ConformanceStatus = 'pass' | 'fail' | 'inconclusive' | 'not-configured';

interface ConfiguredScopeCoverage {
  readonly status: ConfiguredScopeCoverageStatus;
  readonly configuredScopeIds: readonly string[];
  readonly loadedScopeIds: readonly string[];
  readonly failedScopeIds: readonly string[];
  readonly reasons: readonly string[];
}

interface ScopeCoverage {
  readonly id: string;
  readonly kind: 'root' | 'feature';
  readonly loadStatus: ScopeLoadStatus;
  readonly registrationCount: number;
  readonly typeCoverageIds: readonly string[];
  readonly diagnosticIds: readonly string[];
}

type ComponentIdentity =
  | {
      readonly status: 'known';
      readonly selector: string;
      readonly sourceRecordId: string;
      readonly exportName: string;
    }
  | { readonly status: 'runtime-opaque'; readonly selector?: string }
  | { readonly status: 'missing' }
  | { readonly status: 'ambiguous'; readonly candidateSourceRecordIds: readonly string[] };

type JsonDefaultOptionsProjection =
  | { readonly status: 'json'; readonly value: JsonObject }
  | {
      readonly status: 'partially-omitted';
      readonly jsonValue: JsonObject;
      readonly omittedKeyPaths: readonly string[];
      readonly unknownId: string;
    }
  | {
      readonly status: 'non-json';
      readonly omittedKeyPaths: readonly string[];
      readonly unknownId: string;
    };

interface RawRegistrationProjection {
  readonly formlyType: string;
  readonly extends?: string;
  readonly component: ComponentIdentity;
  readonly wrappers: readonly string[];
  readonly defaultOptions: JsonDefaultOptionsProjection;
}

interface RawRegistrationCoverage {
  readonly projection: RawRegistrationProjection;
  readonly fingerprint: string;
}

interface EffectiveRegistrationCoverage {
  readonly status: 'resolved' | 'missing-base' | 'cycle' | 'error';
  readonly inheritanceChain: readonly string[];
  readonly component: ComponentIdentity;
  readonly wrappers: readonly string[];
  readonly jsonSafeDefaultOptions?: JsonObject;
}

type ReviewedProfileCoverage =
  | {
      readonly status: 'reviewed';
      readonly registryReference: {
        readonly formlyType: string;
        readonly variant?: string;
        readonly profileId: string;
        readonly profileVersion: number;
      };
    }
  | { readonly status: 'missing' }
  | {
      readonly status: 'intentionally-non-interactive';
      readonly disposition: {
        readonly source: 'project-angular-authoring-config';
        readonly classification: 'display-only' | 'assertion-only';
        readonly reason: string;
        readonly configurationHash: string;
      };
    }
  | {
      readonly status: 'built-in-exempt';
      readonly policyReference: {
        readonly policyVersion: 'formly-built-ins-v1';
        readonly formlyType: BuiltInFormlyType;
        readonly policyHash: string;
      };
    };

type BuiltInFormlyType =
  | 'checkbox'
  | 'formly-template'
  | 'input'
  | 'radio'
  | 'select'
  | 'textarea';

type SourceJoinResult =
  | { readonly status: 'joined'; readonly sourceRecordId: string }
  | { readonly status: 'ambiguous'; readonly candidateSourceRecordIds: readonly string[] }
  | { readonly status: 'outside-roots'; readonly sourceRecordId: string }
  | { readonly status: 'declaration-only'; readonly sourceRecordId: string }
  | { readonly status: 'missing' };

interface SourceJoinCoverage {
  readonly join: SourceJoinResult;
  readonly template: 'inline' | 'external' | 'dynamic' | 'unavailable' | 'parse-error';
  readonly childSelectors: readonly string[];
  readonly opaqueChildSelectors: readonly string[];
  readonly propCandidates: readonly string[];
}

interface TypeConformanceCoverage {
  readonly scenarioReferenceIds: readonly string[];
  readonly status: ConformanceStatus;
  readonly diagnosticIds: readonly string[];
}

interface TypeCoverage {
  readonly id: string; // canonical `${scopeId}\u0000${formlyType}`
  readonly scopeId: string;
  readonly formlyType: string;
  readonly raw: RawRegistrationCoverage;
  readonly effective: EffectiveRegistrationCoverage;
  readonly reviewedProfile: ReviewedProfileCoverage;
  readonly reflectionEvidenceIds: readonly string[];
  readonly source: SourceJoinCoverage;
  readonly evidenceIds: readonly string[];
  readonly unknownIds: readonly string[];
  readonly scaffoldArtifactId?: string;
  readonly conformance: TypeConformanceCoverage;
}

interface WrapperCoverage {
  readonly id: string;
  readonly wrapperName: string;
  readonly scopeIds: readonly string[];
  readonly source: SourceJoinCoverage;
  readonly reviewedProfile?: {
    readonly profileId: string;
    readonly profileVersion: number;
  };
  readonly evidenceIds: readonly string[];
  readonly unknownIds: readonly string[];
}

interface AuthoringDiagnostic {
  readonly id: string;
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'information';
  readonly scopeId?: string;
  readonly typeCoverageId?: string;
  readonly scenarioReferenceId?: string;
  readonly message: string;
  readonly evidenceIds: readonly string[];
}

type SourceRecord =
  | {
      readonly id: string;
      readonly kind: 'workspace-source' | 'workspace-template';
      readonly workspaceRelativePath: string;
      readonly contentHash: string;
      readonly exportName?: string;
    }
  | {
      readonly id: string;
      readonly kind: 'package-declaration';
      readonly packageName: string;
      readonly exportName: string;
      readonly declarationHash: string;
    };

interface ScaffoldArtifactReference {
  readonly id: string;
  readonly formlyType: string;
  readonly workspaceRelativePath: string;
  readonly contentHash: string;
}

interface BuiltInTypePolicy {
  readonly version: 'formly-built-ins-v1';
  readonly formlyTypes: readonly BuiltInFormlyType[];
  readonly policyHash: string;
}

interface ScenarioReference {
  readonly id: string;
  readonly scopeId: string;
  readonly formlyType: string;
  readonly expectationHash: string;
}

interface AngularFieldAuthoringReport {
  readonly schemaVersion: '0.1.0';
  readonly run: {
    readonly projectId: string;
    readonly configurationHash: string;
    readonly angularVersion: string;
    readonly formlyVersion: string;
    readonly typescriptVersion: string;
    readonly playwrightVersion: string;
    readonly builder: '@angular/build:application' | '@nx/angular:application';
    readonly buildTarget: string;
    readonly targetConfigurationHash: string;
    readonly profileRegistryHash: string;
    readonly builtInTypePolicy: BuiltInTypePolicy;
  };
  readonly configuredScopeCoverage: ConfiguredScopeCoverage;
  readonly scopes: readonly ScopeCoverage[];
  readonly types: readonly TypeCoverage[];
  readonly wrappers: readonly WrapperCoverage[];
  readonly sources: readonly SourceRecord[];
  readonly scaffoldArtifacts: readonly ScaffoldArtifactReference[];
  readonly scenarios: readonly ScenarioReference[];
  readonly evidence: readonly AuthoringEvidence[];
  readonly unknowns: readonly ReviewUnknown[];
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

`configuredScopeCoverage.status` is computed, not authored:

- `complete` means every configured scope has exactly one `loaded` record and a
  schema-valid result;
- `incomplete` means at least one configured scope has a terminal failure;
- `unknown` means the configured scope set itself cannot be validated or a
  result cannot be attributed to exactly one configured scope.

It never means workspace completeness. The configured/loaded/failed arrays are
sorted unique sets; their union and intersection invariants are runtime-schema
refinements. Every scope, type, evidence, unknown, diagnostic, source,
scaffold-artifact, and scenario ID must resolve exactly once in its
report-owned collection. Wrapper scope IDs and every nested reference obey the
same rule. Summary counts are derived from the `types` and `conformance`
records, never supplied by a worker.
`intentionallyNonInteractive` counts only exact aliases with a valid persisted
project-config disposition and never counts an inferred display candidate.

The built-in policy is a schema-owned, versioned allowlist aligned with the
compiler's built-in Formly exemption. Its six values are `checkbox`,
`formly-template`, `input`, `radio`, `select`, and `textarea`. A type record
whose exact alias is in that allowlist has `built-in-exempt` coverage. Built-ins
remain visible in all-alias inventory but are excluded from `missingProfile`
and `scaffolded`; only non-built-in aliases participate in custom-profile
coverage. The policy array is sorted, its hash is verified, and a retained
invariant test must exercise every built-in plus one missing custom alias.
Implementation moves the existing exact list into one schema-owned exported
contract consumed by both compiler and authoring code; it must not create a
second independently maintained built-in list.

`RawRegistrationCoverage.fingerprint` hashes only the canonical
`RawRegistrationProjection`. Component constructors/functions never enter the
projection. A uniquely joined component uses stable source-record/export
identity; an unjoined runtime component uses only the `runtime-opaque` status
and allowlisted stable reflection selector when present. Default options are
recursively projected to canonical JSON. Function, symbol, class-instance,
accessor, cyclic, and otherwise non-JSON values are omitted, their sorted key
paths are recorded, and one blocking unknown explains the omission. The hash
therefore attests the explicit projection, not the original live object.

The report is canonical JSON. Arrays with set semantics sort by stable
scope/type/profile/evidence IDs; declaration-order arrays such as wrappers and
inheritance chains preserve their declared order. Absolute workspace paths are
normalized to workspace-relative paths. The report contains no source text,
template text, model values, functions, Angular types, injectors, secrets, or
timestamps. Configuration, target, and registration fingerprints use the
repository's canonical hash conventions.

`ScaffoldArtifactReference` is a cross-artifact contract, not a dangling ID.
The report owns the reference, workspace-relative path, and canonical content
hash; `TypeCoverage.scaffoldArtifactId` resolves into that collection. The
scaffold's own `id`, project ID, and Formly alias must match the reference and
type record when read. Reviewed registry references use the repository's real
identity: exact `formlyType` plus optional declared variant and resolved profile
ID/version. They resolve against the reviewed registry snapshot identified by
`profileRegistryHash`; wrapper profile references use the same external
snapshot. No synthetic registration ID is introduced. Scenario references are
report-owned and attest the canonical reviewed expectation hash without
embedding executable factories.

### Review scaffold

The scaffold is deliberately not a `FieldTypeProfileRegistry`:

```ts
interface SuggestedPart {
  readonly id: string;
  readonly role?: string;
  readonly cardinality?: 'one' | 'many';
  readonly candidateScope?: 'scenario-root' | 'popup-root' | 'document-root';
  readonly evidenceIds: readonly string[];
}

interface SuggestedInteraction {
  readonly operation?: string;
  readonly partIds: readonly string[];
  readonly readinessCandidate?: string;
  readonly evidenceIds: readonly string[];
}

interface SuggestedValueDomainItem {
  readonly label: string;
  readonly modelValue?: JsonValue;
  readonly evidenceIds: readonly string[];
}

interface SuggestedValueDomain {
  readonly kind: 'static' | 'scenario-observed' | 'unknown';
  readonly items: readonly SuggestedValueDomainItem[];
}

interface SuggestedDriver {
  readonly kind: 'generic-candidate' | 'application-required';
  readonly id?: string;
  readonly version?: number;
  readonly evidenceIds: readonly string[];
}

interface ReviewUnknown {
  readonly id: string;
  readonly code: string;
  readonly blocking: boolean;
  readonly message: string;
  readonly evidenceIds: readonly string[];
}

interface FieldProfileReviewScaffold {
  readonly schemaVersion: '0.1.0';
  readonly id: string;
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
  readonly evidence: readonly AuthoringEvidence[];
  readonly unknowns: readonly ReviewUnknown[];
  readonly requiredDecisions: readonly string[];
}
```

Scaffold parts, evidence, unknowns, and decisions sort by ID/code. All evidence
references resolve exactly once. A suggested interaction or generic driver is
omitted when any blocking unknown affects its operation, codec, scope, or
action sequence. A `display-only` suggestion alone does not increment the
non-interactive summary; only the persisted exact-type disposition does.

The production profile parser rejects this shape and unknown keys. Promotion
requires an explicit maintainer edit into the project-owned registry followed
by normal schema validation and versioning.

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

**Inference — decision:** The Node-safe `angularAuthoring.typeDispositions`
array is the reviewed, committed authority for authoring-coverage treatment
until the profile schema gains a no-interaction branch. Each entry names one
exact Formly alias, classifies it as display-only or assertion-only, and records
a non-empty review reason. It is hashed with project configuration and cannot
be sourced from a scaffold suggestion or component/template heuristic.

This disposition affects only authoring coverage: the type is counted as
`intentionallyNonInteractive`, receives no driver candidate, and remains
non-actionable in compiled contracts. It does not create display semantics in
the profile registry. Production actionability may later add a reviewed
`display-only`/`assertion-only` profile branch with no executable driver; after
that schema exists, the registry replaces the temporary authoring disposition.
Until one of those explicit inputs exists, the alias remains `missingProfile`,
not intentionally non-interactive.

## Review workflow and ownership

1. The project owner adds one Node-safe Angular authoring pointer, its proven
   application build target, one application-equivalent composition entry, and
   any reviewed exact-type non-interactive dispositions.
2. `formly-contracts angular inventory --project <id>` runs isolated configured
   scopes and writes only the report.
3. `formly-contracts angular scaffold --project <id>` writes review scaffolds
   for missing aliases and changed evidence. Existing reviewed profiles are not
   regenerated.
4. A maintainer reviews semantic type, value shape, parts, codec/value domain,
   operation, wrapper preconditions, driver ID/version, every unknown, and any
   non-interactive disposition or browser scenario expectation.
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

Conformance receives a trusted executable factory and a separate strict,
serializable reviewed expectation. The expectation is configuration input, not
an observed output:

```ts
type NameExpectation =
  | { readonly kind: 'exact'; readonly value: string }
  | { readonly kind: 'pattern'; readonly source: string; readonly flags: '' | 'i' };

interface PartExpectation {
  readonly id: string;
  readonly role: string;
  readonly name: NameExpectation;
  readonly root:
    | 'scenario-root'
    | 'document-root'
    | { readonly popupPartId: string };
  readonly cardinality: { readonly min: number; readonly max: number };
  readonly testId?: string; // explicit application-owned contract only
}

type PopupAssociation =
  | {
      readonly id: string;
      readonly kind: 'aria-controls' | 'aria-owns';
      readonly triggerPartId: string;
      readonly popupPartId: string;
    }
  | {
      readonly id: string;
      readonly kind: 'scenario-contract-id';
      readonly triggerPartId: string;
      readonly popupPartId: string;
      readonly attribute: 'data-formly-contract-popup';
      readonly value: string;
    }
  | {
      readonly id: string;
      readonly kind: 'harness-binding';
      readonly triggerPartId: string;
      readonly popupPartId: string;
      readonly bindingId: string;
    };

interface OpenPopupStep {
  readonly id: string;
  readonly kind: 'open-popup';
  readonly triggerPartId: string;
  readonly associationId: string;
  readonly driverBindingId: string;
  readonly operation: 'open';
  readonly intent: JsonObject;
  readonly postOpen: {
    readonly popupPartId: string;
    readonly readiness: 'attached' | 'visible' | 'enabled';
  };
}

interface InteractionStep {
  readonly id: string;
  readonly kind: 'interaction';
  readonly partId: string;
  readonly driverBindingId: string;
  readonly operation: string;
  readonly intent: JsonObject;
  readonly expectedModelValue: JsonValue;
}

type ReviewedScenarioStep = OpenPopupStep | InteractionStep;

interface ReviewedNetworkMock {
  readonly id: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly url: string;
  readonly status: number;
  readonly jsonBody?: JsonValue;
}

interface ScenarioNetworkPolicy {
  readonly mode: 'deny-external';
  readonly mocks: readonly ReviewedNetworkMock[];
}

interface BrowserScenarioExpectation {
  readonly schemaVersion: '0.1.0';
  readonly id: string;
  readonly scopeId: string;
  readonly formlyType: string;
  readonly profile: { readonly id: string; readonly version: number };
  readonly scenarioRootTestId: string;
  readonly parts: readonly PartExpectation[];
  readonly popupAssociations: readonly PopupAssociation[];
  readonly steps: readonly ReviewedScenarioStep[];
  readonly networkPolicy: ScenarioNetworkPolicy;
}

defineAngularFieldScenario({
  expectation: claimsOverlaySelectExpectation,
  create: createFreshClaimsOverlayFieldState,
});
```

The expectation validator requires unique part/association/step/mock IDs,
exactly one scenario root anchor, every popup-root reference and association to
resolve, and every `document-root` popup to have exactly one reviewed
association.
Non-popup parts may not declare `document-root`. `aria-controls`/`aria-owns`
must resolve the trigger's attribute to the observed popup element immediately
after the associated `open-popup` step. `scenario-contract-id` requires the
trigger and popup to share the exact committed value; the runner never invents
it. A harness binding must be registered under the exact ID and profile
version. Test IDs are allowed only when supplied by the application in this
reviewed contract.

`steps` is a declaration-order sequence. Every `PopupAssociation` is referenced
by exactly one earlier-or-current `OpenPopupStep`; the step's trigger and
`postOpen.popupPartId` must equal the association's trigger and popup. The
runner executes that binding/operation, waits for the declared post-open state,
resolves the association, and only then advances. An interaction whose part is
inside a popup is invalid unless its popup's open step precedes it. Multiple
overlays require distinct association/open-step pairs. The runner neither
reorders steps nor guesses that an arbitrary activation opened a popup.

Part names are mandatory and exact/pattern expectations are validated before
the browser runs. Option parts must use `{ popupPartId }`, never
`document-root` directly. Multiple or missing matching popups yield
`OVERLAY_SCOPE_AMBIGUOUS`; the runner does not choose the first match.

The executable factory, providers, model sink, and harness callbacks are
trusted build inputs but are never serialized. Reports contain the expectation
ID, binding IDs, step IDs, network-mock IDs, allowlisted observations, and
diagnostics only. Network mocks are exact reviewed inputs; unmatched requests
remain denied.

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
- scenario-root, associated-popup-root, or popup-only document-root scope;
- declared action outcome;
- allowlisted visible option labels; and
- an explicitly approved JSON-safe model sink for codec vectors.

Overlay checks execute the ordered `open-popup` step against the declared
trigger, wait for its post-open state, then resolve and validate that step's
configured `PopupAssociation`. A portal may live outside the scenario root,
but its popup and option parts are scoped through the associated popup part.
Global option enumeration and unassociated document-root popup queries are
forbidden.

### Names, codecs, and actions

The current profile DTO records roles but not scenario-specific expected names.
The conformance scenario therefore supplies exact or patterned name
expectations for each part. A later schema may add a reviewed naming source if
execution needs it, but browser observations may not invent one.

Codec checks use reviewed vectors:

```ts
{
  id: 'choose-amber',
  kind: 'interaction',
  partId: 'option',
  driverBindingId: 'claims-autocomplete-driver-v1',
  operation: 'choose',
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

- `ANGULAR_HOST_BOOTSTRAP_FAILED`;
- `OUTBOUND_NETWORK_BLOCKED`;
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

- Runtime inventory and browser conformance execute only from the configured
  application-owned Angular CLI/Nx AOT application target under an exact tested
  Angular/Formly pair. That build performs normal resource resolution and
  partial-library linking.
- The authoring target compiles a small browser shell that imports the trusted
  entry. The Node process schedules/serves the build and opens fresh browser
  contexts; it does not import Angular source or partial output.
- TestBed/CDK conformance may additionally use an exact-version Angular
  unit-test target after the retained compatibility gate passes; the Angular 20
  experimental unit-test builder is not the primary substrate.
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

Before implementing the host API for the first pair—and before supporting every
later pair—CI must retain and prove:

1. the application-owned target consumes the declared authoring entry and
   effective tsconfig;
2. its normal AOT build links a partial-compiled fixture library and resolves
   an external component template/resource;
3. stable reflection works for source and linked partial-library components;
4. NgModule and standalone host composition both load;
5. root and explicit feature-scope Formly registrations remain isolated across
   fresh browser contexts;
6. inline/external template source analysis and opaque/missing-resource refusal
   produce schema-valid deterministic output;
7. the minimal compatibility result passes canonical serialization and rejects
   missing, duplicate, malformed, or contradictory cases;
8. the optional TestBed target and AOT browser scenario render when those lanes
   are enabled; and
9. no private-Ivy imports/property reads occur in the package or fixture gate.

Template analysis disables itself with `UNSUPPORTED_ANGULAR_COMPILER_VERSION`
when no exact adapter exists. Runtime inventory and manual review remain usable.

## Option comparison

| Option | Constraints fit | Value | Failure modes | Reversibility | Confidence | Evidence that would change recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| Manual profiles only | Highest honesty; no Angular coupling | Low mechanical reduction | Missed aliases, drift, repetitive discovery | Immediate | High | Workplace corpus shows authoring is already cheap and coverage is maintained |
| Formly runtime inventory only | Public registry boundary; requires configured host | Good ownership/gap coverage | No roles, props API, codec, template, or operations; lazy scopes incomplete | High; optional package | High | Formly removes/publicly hides registry surface in supported version |
| Inventory + version-gated source scaffolds | Fits if derived-only and exact-version tested | Highest likely boilerplate reduction | AST churn, source unavailable, ambiguous joins, false confidence | High; analyzer can disable | Medium-high | Pilot finds few useful candidates or maintenance breaks each patch |
| One cumulative TestBed loading all features | Simple implementation | Broad union inventory | Registry mutation loses scope/alias conflict provenance; side effects accumulate | Medium | Low | A public Formly scope snapshot API appears and proves isolation |
| Fresh browser worker per declared root/feature scope | Honest lazy ownership and deterministic failures if the retained gate passes | High | More startup cost; explicit scope manifest and proven application target required | High | Medium | Retained gate fails to isolate scopes, or startup cost is prohibitive and a safe reusable host is proven |
| JIT TestBed as sole conformance | Fast and harness-friendly | Medium | External resources, partial linking, accessibility/overlay/browser gaps | High | Medium-low | Representative workplace controls prove browser parity across all required facts |
| AOT application gallery + Playwright, optional TestBed/CDK | Real build/browser behavior and computed accessibility | High assurance | Heavier setup; scenario-specific; gallery drift | Medium-high; optional target | Medium | Retained gallery checks fail to associate overlays or isolate providers/data, or provide little additional signal |
| Private Ivy metadata mining | Could expose compiled template internals | Superficially high | Patch breakage, unsupported API, still no semantic truth | Low | High reject | No evidence should reverse this under current constraints |

**Inference — recommendation:** First retain the minimal schema and application-
target compatibility gate. If it passes, fresh-scope Formly inventory is the
first production slice; optional version-gated source scaffolds follow only
after the inventory/value gate. Add TestBed/CDK and browser conformance later
for profiles that justify the cost.

## Feasibility, value, and confidence

| Conclusion | Classification | Confidence | Basis / limit |
| --- | --- | --- | --- |
| Application-target runtime inventory is plausible on the pinned pair, not yet production-proven | Inference | Medium (0.60) | Retained integration tests/builds and official build/linker model; author-only lazy/partial/resource probe; required retained gate not yet implemented |
| Source scaffolding is feasible as an optional exact-version adapter | Inference | Medium (0.70) | Retained spike matrix works; compiler API instability creates maintenance risk |
| Fresh feature scopes can honestly cover configured lazy `forChild` registrations | Inference | Medium (0.65) | Official injector model plus author testimony; retained isolation gate and manifest completeness remain open |
| Browser conformance can validate reviewed roles, names, parts, overlay associations, and codecs | Inference | Medium (0.65) | Official Playwright model plus author testimony; retained scenario and CI checks do not yet exist |
| TestBed can reuse explicit CDK harness bindings | Inference | Medium-low (0.55) | Official supported pattern; repository has no retained CDK example and Angular 20 unit-test builder is experimental |
| The bridge will materially reduce workplace manual setup | Inference | Medium-low (0.55) | Likely mechanical value, but no workplace corpus/time measurement |
| Automatic semantic profile generation is safe | Inference | Very low; reject (0.05) | Codec, overlay, opaque-child, compound control, and operation boundaries remain intrinsic |

## Failure and stop gates

Stop or narrow productionization when any gate fails:

1. **Substrate gate:** if the retained application target cannot link the
   partial fixture library, resolve its external resource, isolate root/feature
   registries, and emit strict canonical output, do not implement the host API.
2. **Private API gate:** if inventory or rendering requires reading `ɵ` metadata,
   stop that approach.
3. **Duplication gate:** if the authoring entry must repeat most individual
   Formly registrations instead of importing existing composition modules,
   redesign the host boundary.
4. **Isolation gate:** if representative feature imports trigger real network,
   authentication, persistence, or irreversible workflows that synthetic
   providers cannot replace, do not run automated inventory/conformance for
   that scope; use a side-effect-free application-owned gallery or manual
   declaration.
5. **Network-boundary gate:** if deny-by-default routing and service-worker
   blocking cannot be installed before navigation, or an unmatched outbound
   request is not observable as a stable failure, do not execute trusted
   application providers in the worker.
6. **Lazy honesty gate:** if configured scopes cannot be distinguished, report
   incomplete coverage and do not publish a union as complete.
7. **Report-contract gate:** if worker output cannot pass strict schemas,
   reference invariants, derived-count checks, and canonical round trips, retain
   a scope failure rather than emitting a partial report.
8. **Disposition-authority gate:** if a display/assertion-only alias lacks an
   exact reviewed config disposition or future no-interaction profile, count it
   as missing rather than non-interactive.
9. **Compiler maintenance gate:** if an Angular minor breaks the source adapter
   without a small localized fix and focused tests, disable template analysis
   for that version rather than couple to Ivy.
10. **Partial-build gate:** if a library can be loaded only as unlinked partial
   output in bare Node, move the observation into the consuming Angular build.
11. **Overlay-association gate:** if a reviewed popup association is missing,
    invalid, or non-unique, emit `OVERLAY_SCOPE_AMBIGUOUS`; do not search the
    document globally or select the first match.
12. **Conformance safety gate:** if verifying a codec requires indiscriminate
   clicking or real business effects, require reviewed synthetic vectors or
   leave it unverified.
13. **False-confidence gate:** if an unknown is required to authorize a generic
   driver, the scaffold remains non-actionable.
14. **Value gate:** run a workplace pilot. Continue source scaffolding only if it
   produces useful non-semantic evidence for a substantial share of custom
   types and saves more review time than the host/scenario upkeep costs. Record
   elapsed setup/review time rather than claiming a percentage in advance.
15. **Drift-noise gate:** if browser scenarios fail frequently for unrelated
    layout/content changes, narrow expectations to contract-relevant
    role/name/part/codec facts instead of weakening mismatch policy.

## Ordered implementation tasks

1. **Implement the minimal compatibility-result contract.** Add the strict
   `AngularHostCompatibilityResult` validator, canonical serializer, exact-case
   refinement, environment identity/hash checks, and pass/fail diagnostic
   union. This schema has no dependency on the future full authoring report.
2. **Retain the application-target compatibility gate.** Before a package shell
   or host API, add the consuming application fixture, partial-compiled fixture
   library, authoring browser entry, external resource, NgModule/standalone
   cases, exact public host lifecycle, denied-network case, isolated root/lazy
   scopes, opaque/missing-resource refusals, minimal result validation, and
   exact Angular CLI/Nx build commands described above. Stop if normal
   application linking/resource resolution cannot support them without private
   Ivy or the public lifecycle/network boundary fails.
3. **Approve complete authoring contracts.** Move the closed report/scaffold,
   evidence, unknown, diagnostic, configured-scope, disposition, and scenario
   expectation shapes into schema-owned strict validators. Add canonical
   round-trip, unknown-key rejection, ID-reference, set-ordering, count, and
   configured-scope refinement tests, including built-in exemption and raw
   projection/fingerprint fixtures.
4. **Resolve schema gaps.** Decide whether v0.4.x adds explicit
   display/assertion-only profiles, compound fill/date range, and multi-select
   semantics. Until approved, keep those non-generic. Implement and validate
   the exact-type authoring disposition as the temporary coverage authority.
5. **Add the optional Angular package shell.** Pin the first
   Angular/Formly/TypeScript and builder/executor tuple, schedule only the proven
   application target, and add a private-Ivy import/property lint gate.
6. **Add Node-safe workspace pointers.** Validate build/serve target,
   entry/tsconfig/source-root paths, and exact-type dispositions without
   importing Angular during generic discovery.
7. **Implement isolated browser workers.** Serve the confined AOT authoring
   output, use the proven `bootstrapApplication`/`importProvidersFrom`
   lifecycle, enforce deny-by-default routing plus time/output limits, validate
   the one-shot browser bridge, and create fresh root/feature scope contexts.
8. **Implement Formly inventory.** Preserve raw/effective registration,
   inheritance, defaults, wrappers, scope provenance, alias conflicts, and
   profile coverage.
9. **Implement the TypeScript source index.** Join registrations/components,
   collect props candidates, and handle inline/external templates through an
   exact Angular adapter with refusal tests.
10. **Implement canonical coverage/scaffold output.** No registry writes; add
   stable diffs and explicit unknowns.
11. **Run the workplace value pilot.** Measure configuration effort, custom-type
   coverage, review time, ambiguous joins, and saved mechanical work without
   retaining workplace source.
12. **Add TestBed conformance.** Through the exact-version application-backed
    unit-test target, verify parts, wrapper gates, reviewed scenario steps,
    model sinks, and explicit CDK harness bindings.
13. **Add the reviewed browser-conformance contract.** Implement strict
    scenario expectation, ordered open-step/popup-association, and reviewed
    network-mock validation, then use the proven AOT authoring target to verify
    computed roles/names, overlay association, popup-local options, and reviewed
    codecs with normal Playwright locators.
14. **Expand the retained synthetic acceptance matrix.** The gate in Task 2
    already owns external-template, partial-library, standalone/NgModule,
    opaque/refusal, and lazy-scope cases. Add native and Material-
    like button toggles, autocomplete, text editor, display-only info panel,
    overlay single/multi-select, table selection, date range, expandable
    repeater, wrapper, inheritance, dynamic-name, and ambiguous-overlay cases.
15. **Document review and CI workflows.** Explain authority, version increments,
    optional conformance, failure policy, and unsupported-version behavior.
16. **Require independent review before Checkpoint B.** Review security/trusted
    execution, determinism, public API use, schema fit, and workplace value
    evidence.

## Acceptance traceability

| Acceptance criterion | Evidence / design location | Status |
| --- | --- | --- |
| 1. Distinguish spike proof from unproven work | “What the retained spike proves—and does not prove”; focused packet | Satisfied |
| 2. Workspace/Angular API, process boundaries, evidence model, report/scaffold, conformance | Proposed API; process diagram; evidence/report/scaffold; conformance sections | Satisfied as a candidate production design; runtime validators remain implementation work |
| 3. Lazy, external template, opaque child, overlay, display-only, partial/JIT risks | Author testimony identifies risks; selected application target/lifecycle; retained gate; strict disposition, ordered popup, and network contracts; template/opaque rules; partial/JIT policy | Satisfied as a bounded design with explicit unknowns; production feasibility remains blocked until retained Task 2 checks pass |
| 4. Options, feasibility/value, confidence, stop gates, ordered tasks | Final four decision sections | Satisfied |

## Residual unknowns

- **Unknown:** The number and distribution of workplace custom types and lazy
  feature scopes.
- **Unknown:** Whether workplace Angular libraries are consumed from source,
  linked partial distributions, or both.
- **Unknown:** Whether the selected application-target substrate passes the
  retained partial-library, external-resource, and isolated-scope gate without
  application-specific side effects.
- **Unknown:** Whether existing custom fields ship CDK harnesses.
- **Unknown:** Whether application build targets can host a synthetic gallery
  without authentication/network side effects.
- **Unknown:** The smallest generic operation vocabulary that covers the
  workplace multi-select, text editor, date range, and expansion controls.
- **Unknown:** Whether exact accessible names belong in the semantic profile or
  only in scenario conformance expectations.
- **Unknown:** Measured author-time savings and ongoing scenario maintenance
  cost.

The substrate unknown blocks the package shell and inventory/scaffold slice
until Task 2 passes. The remaining unknowns block broad value claims,
generic-driver approval for the affected families, and any claim of
workspace-complete conformance.

## Recommended next action

Authorize Tasks 1–2 only: first implement the minimal compatibility-result
schema, then retain the application-owned authoring entry, public browser-host
lifecycle, network-denial case, partial-compiled fixture library, external
resource, root/lazy isolation, and strict compatibility gate under the selected
Angular CLI/Nx application target. If it passes, approve Tasks 3–8 as the first
inventory slice. Do not implement source heuristics, TestBed/CDK, or browser
conformance until the substrate and full report contracts are retained and
independently reviewable.
