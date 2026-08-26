# Research: Scalable Form Discovery and Registration

Status: recommendation ready for owner decision; no implementation authorized

Decision owner: project maintainer

Research date: 2026-08-25

## Decision question

How should Formly Agent Contracts discover and compile more than 100 forms that
are distributed across Angular applications, feature modules, libraries, and
packages in a large Nx monorepo, without requiring one central hand-written
entry per form?

## Executive conclusion

Adopt a **distributed source catalog with optional Nx discovery** as the primary
integration model:

1. Add a typed, optional root `formly-contracts.config.ts` that controls
   workspace discovery, shared locator settings, outputs, diagnostics, and
   explicitly imported integration plugins.
2. Define a framework-neutral `FormContractSource` interface that can list and
   create form definitions with stable IDs and synthetic scenarios.
3. Let an Angular integration package collect source catalogs through a multi
   provider, so an NgModule or standalone feature can contribute a whole group
   of forms locally.
4. Let an optional Nx plugin detect one conventional config marker per Nx
   project, infer a cacheable `form-contracts` target, and run only affected
   projects in CI.
5. Allow a project config to adapt an existing application registry, factory
   map, or module-level form collection. Do not require applications with an
   existing catalog to restate every form.
6. Offer a dev/test-only Formly extension as a migration and coverage tool. It
   can capture contracts for forms that are actually built, but it must not be
   treated as the complete authoritative inventory.

This changes the expected adoption cost from one central registration per form
to roughly one integration per library/product boundary. When an application
already has a form registry or consistent factory exports, one source adapter
can expose many forms at once.

Fully automatic discovery of arbitrary TypeScript should not be the default.
Formly field trees may be component properties, factory results, shared
fragments, DI-dependent values, or runtime data. Static analysis cannot safely
decide which values are complete form roots or construct all required contexts.

## Scope and method

The research compared:

- central and distributed explicit registries;
- Angular multi-provider registration;
- convention-based workspace and Nx project discovery;
- arbitrary TypeScript source scanning;
- Formly extension-based runtime capture; and
- replacing or decorating `FormlyFormBuilder`.

Criteria:

- initial and ongoing adoption effort;
- support for Nx libraries, packages, applications, and lazy features;
- deterministic and complete inventory;
- ability to supply synthetic scenarios and application-equivalent providers;
- security and privacy boundaries;
- compatibility with the current Angular 20/Formly 6.1 package slice; and
- incremental adoption without forcing a workplace-wide refactor.

No workplace code or data was accessed. No implementation was performed.

## Evidence

### Documented facts

1. Angular `InjectionToken` multi providers allow multiple providers spread
   across files to contribute values under one token. NgModules and application
   configuration can register providers. Angular injectors are hierarchical,
   and lazy-loaded modules may have child injectors, so a root-only enumeration
   cannot assume it can see providers that exist only in an unloaded lazy
   feature.
2. Formly extensions are a public cross-cutting hook. Their `prePopulate`,
   `onPopulate`, and `postPopulate` methods run while Formly constructs fields.
3. Formly 6.1 module configuration registers types, wrappers, validators,
   messages, presets, extensions, and extras. It does not register application
   form definitions as an enumerable catalog.
4. Nx plugins can detect conventional files with a glob and infer project
   targets. Nx tasks can declare inputs and outputs for caching, run across many
   projects, and use the project graph plus Git history to run only affected
   projects.
5. Nx project configuration can carry project metadata and targets, but metadata
   alone cannot contain executable Formly factories. A loadable project config
   or source module is still required.
6. Typed root configuration files with a `defineConfig(...)` helper and explicit
   plugin imports are established patterns in Playwright, Vite, and Vitest.
   Vite's plugin model requires plugins to be installed and imported by the
   consumer rather than discovered and executed implicitly.
7. Native TypeScript execution is enabled by default only in Node 22.18 and
   later. Native type stripping ignores `tsconfig.json`, does not resolve
   TypeScript `paths`, and accepts only erasable TypeScript syntax without a
   transform. The repository's current engine range starts at Node 22.13, so a
   native-only `.ts` config loader would not satisfy the declared range.
8. Jiti exposes an asynchronous programmatic import API for TypeScript, ESM,
   and CommonJS, supports optional `tsconfig` path resolution, and has no
   external runtime dependencies. A broader configuration framework such as
   c12 additionally enables remote extension, environment loading, and deep
   merging that this project does not currently need.

### Repository observations

Environment:

- repository commit `445fcf4daa1af0d726b154f3b9cdaacf9ed66d9e`;
- Node.js `22.22.1`;
- pnpm `10.23.0`;
- Angular `20.3.29`; and
- Formly `6.1.8`.

The existing test application already proves a distributed Angular
multi-provider pattern. Three feature modules contribute arrays of definitions;
one catalog flattens and sorts them, rejects duplicate IDs, returns fresh form
instances, and builds all twelve forms with the configured `FormlyFormBuilder`.

Verification command:

```sh
pnpm exec vitest run \
  apps/formly-test-app/src/app/form-registry/form-registry.test.ts \
  apps/formly-test-app/src/app/formly-integration.test.ts
```

Result: two test files and eight tests passed.

Inspection of the installed Formly 6.1.8 package confirms that
`FormlyFormBuilder` invokes all configured extensions for the root and
descendant field nodes during a build. This makes passive build capture
technically feasible, but a build hook receives a runtime field tree rather
than a stable application form ID or a factory capable of recreating all
scenarios.

### Inferences

- Angular multi providers solve distributed contribution, but Angular DI alone
  is not a workspace inventory system. A controlled compiler would need to
  import every relevant feature module, including lazy features, before their
  providers could be enumerated.
- Nx config-file discovery is a better outer inventory boundary for a
  monorepo. It can locate relevant projects without bootstrapping the production
  application or navigating routes.
- A source abstraction lets different products reuse their current ownership
  model. One product may adapt an existing registry, another may use a factory
  map, and a newer library may use colocated form descriptors.
- Runtime capture is valuable for bootstrapping a legacy inventory and finding
  coverage gaps. It cannot prove completeness because unvisited routes, hidden
  branches, or unexercised scenarios remain unseen.

### Unknowns

- The workplace Nx version range is not known. Nx plugin APIs have compatibility
  differences across major versions and must be selected after inspecting that
  workspace.
- The workplace form-definition patterns are not known. The amount of truly
  automatic adaptation depends on whether forms already use registries, factory
  maps, naming conventions, base classes, or route metadata.
- Some form factories may require browser-only services, authenticated data, or
  non-serializable context. Those will still need explicit synthetic adapters or
  remain runtime-observed only.

## Option comparison

| Option | Adoption effort | Completeness | Nx/module fit | Main failure mode | Decision |
| --- | --- | --- | --- | --- | --- |
| One central entry per form | High | High when maintained | Poor at 100+ forms; central ownership bottleneck | Registry drift and merge contention | Keep as lowest-level fallback only |
| Angular multi-provider catalogs | Low to medium; one contribution per feature | High for imported modules | Good for module ownership; weak for unloaded lazy features | Root compiler misses child-injector-only providers | Productize as an Angular bridge |
| Conventional config per Nx project plus inferred target | Low; one marker per project, often adapting many forms | High for marked projects | Excellent across packages and apps | Requires Nx-version support and a loadable source config | Recommended outer discovery layer |
| Colocated descriptor in every form file | Medium for legacy migration; low ongoing | High | Good and decentralized | Still touches every legacy form once | Supported authoring option, not mandatory migration path |
| Scan arbitrary TypeScript for `FormlyFieldConfig` | Apparently low | Low | Cross-project scan is possible | Confuses fragments with roots and cannot safely execute context | Reject as authoritative discovery |
| Runtime Formly extension capture | Very low initial wiring | Only forms/states actually built | Works across rendered features | Missing unvisited forms; real-data and stable-ID concerns | Optional migration/coverage mode |
| Replace/decorate `FormlyFormBuilder` | Low application wiring | Only built forms | Sensitive to provider scope and Formly internals | Provider conflicts and version fragility | Reject; use the public extension hook |

## Recommended architecture

### 1. Typed workspace configuration

Use an optional root config as the package's control plane. The following API is
illustrative and must be specified before it becomes public:

```ts
// formly-contracts.config.ts
import { defineConfig } from '@formly-agent-contracts/config';
import angular from '@formly-agent-contracts/angular';
import nx from '@formly-agent-contracts/nx';

export default defineConfig({
  projectConfigs: [
    'apps/**/formly-contracts.project.ts',
    'libs/**/formly-contracts.project.ts',
    'packages/**/formly-contracts.project.ts',
  ],
  output: {
    directory: 'dist/formly-contracts',
  },
  locators: {
    testIdAttributes: ['data-testid', 'data-test-id', 'data-cy'],
  },
  diagnostics: {
    failOn: ['error'],
  },
  plugins: [
    angular(),
    nx({ targetName: 'form-contracts' }),
  ],
});
```

The config should be optional for the simple package API and required only for
workspace discovery. It should cover:

- project/source config globs and exclusions;
- artifact directory and aggregation behavior;
- locator attribute order and deterministic derivation plugins;
- diagnostic policy;
- scenario defaults such as locale or named synthetic contexts;
- Angular provider/module bootstrap adapters;
- optional Nx, browser-capture, or custom-type integrations; and
- privacy policy such as disallowing model values in generated artifacts.

Design constraints:

- A TypeScript config is trusted executable build configuration. Loading it must
  remain a local/CI operation and must never be exposed to an MCP request.
- Plugins must be explicitly installed and imported in the config. Do not accept
  untrusted package names from an agent request and dynamically execute them.
- Every plugin needs a stable name, version, and config-schema version recorded
  in generation metadata.
- Hash resolved JSON-safe configuration and plugin identities. Do not hash
  `Function.prototype.toString()` or silently depend on process-local function
  identity.
- Define a small, deterministic precedence model for defaults, root config,
  project config, and CLI flags. Avoid implicit deep merges.
- Environment-dependent values that affect output must be explicit Nx task
  inputs or recorded scenario metadata; secrets must not enter contracts.
- Core schema and extraction packages must not depend on Angular or Nx. Those
  remain optional integration packages/plugins.

This root file does not claim to discover arbitrary forms by itself. It tells
the system where project-level sources live and how to process them consistently
across a monorepo.

#### Config-loader recommendation

Use Jiti's asynchronous import API for the first workspace runner, with an
explicit project `tsconfig` option for path aliases. Keep JavaScript/MJS configs
supported as a lowest-common-denominator fallback.

Do not rely exclusively on Node's native type stripping while the package
supports Node 22.13-22.17. Do not adopt a general layered configuration loader
for the MVP: remote config extension, automatic `.env` loading, and generic deep
merging enlarge the security and determinism surface without helping form
discovery.

The implementation must still begin with a controlled compatibility spike that
loads ESM, CommonJS, TypeScript, and an Nx-style path-aliased config. If Jiti
cannot load representative Angular factory imports without application-specific
transforms, retain it for root/project descriptors and require source adapters
to expose compiled or directly loadable modules.

### 2. Framework-neutral source contract

The adapter should consume sources rather than requiring one global array:

```ts
interface FormContractSource {
  readonly sourceId: string;
  list(): readonly FormContractDefinition[] | Promise<readonly FormContractDefinition[]>;
}

interface FormContractDefinition {
  readonly id: string;
  create(): FormContractInstance;
  readonly scenarios?: readonly FormContractScenario[];
}
```

The exact public DTO needs a specification before implementation. Required
properties should remain small: stable identity, fresh creation, and optional
synthetic scenarios. Routes, owners, and tags can be optional metadata.

### 3. Angular feature contribution

Provide an Angular helper that contributes a complete source or definition
group through a multi token:

```ts
@NgModule({
  providers: [provideFormContractSource(CLAIMS_FORM_SOURCE)],
})
export class ClaimsFormsModule {}
```

Standalone applications should be able to use the same provider helper in
application or route configuration. The compiler catalog must flatten sources,
sort by stable IDs, and reject duplicates deterministically.

This is the public version of the pattern already proven by the synthetic test
application. It removes the root registry file and keeps ownership beside each
feature. It does not by itself load every lazy feature.

### 4. Nx project discovery

An optional `@formly-agent-contracts/nx` plugin should detect a conventional
project marker such as:

```text
libs/claims/forms/formly-contracts.config.ts
libs/customers/forms/formly-contracts.config.ts
apps/admin/formly-contracts.config.ts
```

Each config exports one source, a collection of sources, or an adapter for an
existing application registry. The plugin infers a `form-contracts` target with
declared inputs and per-project artifact outputs.

Expected commands:

```sh
nx run-many -t form-contracts
nx affected -t form-contracts
```

A workspace aggregation step can then create a deterministic index and detect
duplicate form IDs across project boundaries. The contract compiler remains
usable without Nx; Nx is an integration layer, not a dependency of the schema
or Formly adapter packages.

### 5. Multiple source adapters

Support these adoption paths behind the same source contract:

- adapt an existing application form registry or factory map once;
- contribute an array owned by an Angular feature module;
- export a colocated `defineFormContract(...)` descriptor from new form files;
- use a generated barrel for files following a project-specific convention; or
- write a workplace-only source adapter for an existing base class or metadata
  convention.

The open-source package should not encode one company's folder names, test-ID
scheme, or form construction conventions.

### 6. Runtime capture for migration and audit

Provide an explicitly enabled dev/test Formly extension that projects any root
field tree built by the application. Its output must be labeled resolved or
observed according to the actual capture boundary and must never silently merge
with declared inventory.

Appropriate uses:

- find rendered forms missing from the declared source catalog;
- bootstrap candidate contracts during a legacy migration;
- compare a declared contract with forms exercised by component or E2E tests;
- identify routes and scenarios that still lack coverage.

Required safeguards:

- disabled in production builds by default;
- immediate allowlist projection rather than retaining live field objects;
- no model values or credentials in artifacts;
- explicit generated IDs and diagnostics when no stable form ID is available;
- deterministic deduplication; and
- a coverage report that says capture is incomplete rather than implying every
  application form was discovered.

## Expected developer experience

The workspace is configured once at its root. Each Nx project with forms then
adds one project marker that can expose many forms:

```ts
// libs/claims/forms/formly-contracts.project.ts
import { defineFormContractProject } from '@formly-agent-contracts/config';

export default defineFormContractProject({
  projectId: 'claims-forms',
  source: CLAIMS_FORM_SOURCE,
});
```

For a product that already exposes a form registry, adoption should be close to
one file per Nx project:

```ts
export default defineFormContractProject({
  source: adaptRegistry(existingFormRegistry),
});
```

For a feature module that owns a form collection:

```ts
export const CLAIMS_FORM_SOURCE = defineFormContractSource({
  sourceId: 'claims',
  definitions: CLAIM_FORM_DEFINITIONS,
});
```

For isolated legacy forms with no reusable factory, the migration recorder can
surface the form and report that it still needs a stable source definition.

## Package boundaries

Keep the initial ecosystem to five public packages, including the two that
already exist:

```text
@formly-agent-contracts/contract-schema
                    |
@formly-agent-contracts/formly-adapter
                    |
@formly-agent-contracts/workspace   (typed config, discovery, runner, CLI)
                 /       \
@formly-agent-contracts/angular   @formly-agent-contracts/nx
```

- `contract-schema` remains framework-independent contract data, validation,
  canonical serialization, and hashing.
- `formly-adapter` remains the Formly projection and controlled scenario API.
- `workspace` owns `defineConfig`, source/project descriptors, config loading,
  deterministic aggregation, artifact output, and the CLI binary. Keeping these
  together initially avoids separate `config`, `runner`, and `cli` packages
  before their APIs justify independent releases.
- `angular` owns multi-provider helpers, application-equivalent builder setup,
  and the future dev/test capture extension. It carries Angular peer
  dependencies without adding them to the workspace runner.
- `nx` owns project-config detection, inferred targets, executor/generator
  integration, cache inputs/outputs, and affected execution. Nx remains an
  optional dependency.

Future MCP, test-intent, and Playwright packages remain separate milestones and
should not be pulled into this discovery increment.

## Level-of-effort estimate

This is a medium-sized integration feature, not a rewrite of the extractor or
contract schema. Estimates assume one focused maintainer, the existing test
harness, and no need to support multiple Nx major versions in the first pilot.

| Slice | Deliverable | Focused effort |
| --- | --- | --- |
| API/spec gate | Root/project config contract, source API, merge rules, plugin lifecycle | 0.5-1 day |
| Workspace MVP | New workspace package, typed config loading, glob discovery, source catalogs, artifact runner, CLI, multi-package fixture | 2-3 days |
| Angular bridge | Multi-provider helpers, NgModule/standalone composition, controlled builder integration, eager/lazy tests | 1-2 days |
| Nx integration | Config-marker detection, inferred target/executor, cache inputs/outputs, generator, affected-workspace fixture | 2-3 days |
| Migration capture | Dev/test Formly extension, stable-ID handshake, redaction, deduplication, incomplete-coverage reporting | 2-3 days |
| Release/documentation hardening | Package publishing, consumer examples, compatibility evidence, independent review | 1-2 days distributed across the slices |

Delivery bands:

- **First testable pilot: 2-3 days.** Root config, project-config discovery,
  bulk source adapters, and a generic CLI can work in an Nx directory layout
  before the dedicated Nx plugin exists.
- **Workplace-ready Angular/Nx path: 5-8 days.** Add Angular providers and the
  Nx inferred target with one confirmed workplace Nx major version.
- **Full recommended ecosystem: 8-12 focused days.** Include migration capture,
  compatibility hardening, publishing, and complete documentation.

The largest uncertainties are TypeScript config loading across consumer module
formats, lazy-feature provider composition, Nx major-version compatibility, and
how many workplace forms already share a registry or factory convention. A
workplace repository inspection could reduce or increase the adapter portion of
the estimate without changing the package architecture.

## Implementation consequences

If approved, implementation should be split into independently releasable
slices:

1. Specify and implement the framework-neutral source/catalog API in the Formly
   adapter package, reusing the existing deterministic catalog behavior.
2. Specify the typed root/project configuration contract, deterministic merge
   rules, and plugin lifecycle. Implement a generic config runner that works
   without Angular or Nx.
3. Add an Angular multi-provider bridge and prove eager, lazy-feature harness,
   NgModule, and standalone composition behavior.
4. Build the Nx plugin only after confirming the workplace Nx version range;
   infer targets from project config markers and test caching/affected inputs.
5. Add the runtime capture extension as an explicitly experimental migration
   tool, with privacy and incomplete-coverage diagnostics.
6. Add a workspace aggregation/index command and an end-to-end example with
   multiple apps and libraries.

The governing architecture and MVP documents should be updated only after the
maintainer approves this direction because automatic project discovery and new
public integration packages expand the current MVP scope.

## Confidence and next gate

Confidence: high that the hybrid architecture fits Angular/Formly and Nx
ownership boundaries; medium on the exact workplace migration effort until its
form organization and Nx version are inspected.

Next gate: maintainer approval of the hybrid direction, followed by a small
proof of concept with three Nx projects:

- one feature library using a module-level catalog;
- one library adapting an existing registry; and
- one lazy feature captured only by the migration extension.

The proof should demonstrate project discovery, duplicate detection, contract
generation, Nx caching, and affected execution before the public API is frozen.

## Primary sources

- Angular, [Defining dependency providers](https://angular.dev/guide/di/defining-dependency-providers)
- Angular, [Hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection)
- Angular, [NgModules](https://angular.dev/guide/ngmodules/overview)
- Formly v6, [Custom extensions](https://v6.formly.dev/docs/guide/custom-formly-extension/)
- Formly v6.1.8 installed package, `FormlyFormBuilder`, `FormlyModule`, and
  `FormlyExtension` public declarations
- Nx, [Extending the project graph](https://nx.dev/docs/extending-nx/project-graph-plugins)
- Nx, [Project configuration](https://nx.dev/docs/reference/project-configuration)
- Nx, [Run tasks](https://nx.dev/docs/features/run-tasks)
- Nx, [Run only tasks affected by a PR](https://nx.dev/docs/features/ci-features/affected)
- Nx, [CreateNodes API compatibility](https://nx.dev/docs/kb/createnodes-compatibility)
- Nx, [Local generators](https://nx.dev/docs/kb/local-generators)
- Playwright, [Configuration](https://playwright.dev/docs/test-configuration)
- Vite, [Plugin API](https://vite.dev/guide/api-plugin)
- Vitest, [Test projects](https://vitest.dev/guide/projects.html)
- Node.js, [Modules: TypeScript](https://nodejs.org/api/typescript.html)
- Jiti, [Runtime TypeScript and ESM support](https://github.com/unjs/jiti)
- c12, [Smart configuration loader](https://github.com/unjs/c12)
