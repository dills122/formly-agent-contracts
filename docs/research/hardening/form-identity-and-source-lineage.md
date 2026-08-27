# RH-01: Form Identity, Source Lineage, and Usage Context

- **Scoped status:** Decision-ready research; production implementation not
  started
- **Decision owner:** Formly Contract maintainers
- **Research date:** 2026-08-27
- **Repository commit:** `d4ffdb517d0d506ed7cd55074c4eac720a145f8b`
- **Branch:** `codex/rh-01-form-lineage-research`
- **Authorized output:** This research artifact and the isolated experiment at
  [`scripts/research/form-lineage/symbol-resolution-experiment.mjs`](../../../scripts/research/form-lineage/symbol-resolution-experiment.mjs)
- **Prohibited in this work item:** Production behavior and changes to shared
  architecture, specification, decision, or implementation-plan files

## Decision question

Can an exported form factory or class be connected deterministically to its
generated contract and to direct application usage sites across a distributed
Angular/Nx monorepo, so an agent encountering a call such as
`IndexingFormConfig(...)`, `NigoAddFormConfig(...)`, or
`new OrderEntryStepperForm(...)` can find the correct contract and safely known
page, route, or step context without guessing?

The comparison criteria are determinism, explicit authority, distributed
workspace fit, alias and re-export support, ambiguity safety, privacy,
staleness detection, incremental adoption, and separation from application
execution. Research stops at a recommended contract and feasibility gates. It
does not authorize implementation.

## Executive conclusion

**Conditional yes for direct symbol usages; no for complete automatic journey
reconstruction.** A TypeScript checker can connect a direct call or constructor
to an explicitly anchored form root across renamed imports, barrel re-exports,
and namespace imports. The repository experiment also resolves all four direct
factory calls in the Angular monorepo fixture to exactly one current form ID.
This is deterministic only when the source catalog declares which symbol is a
form root. Types, names, Angular metadata, route membership, or runtime capture
must not create that authority.

The recommended design combines:

1. an optional explicit `lineage.rootSymbol` on a typed form definition, with a
   compatible zero-argument direct `create` symbol serving as the
   zero-boilerplate equivalent;
2. a build-time TypeScript source index that canonicalizes aliases and records
   all direct call and constructor sites;
3. conservative component and route analysis that emits candidates and
   unknowns rather than inferred journeys; and
4. an optional versioned source annotation immediately attached to an actual
   usage when one root symbol backs multiple form IDs or business journey/step
   context matters.

An unannotated call with two candidate form IDs is **ambiguous**, not “best
match.” Wrapper factories, conditional aliases, generic higher-order calls,
dynamic routes, reusable components, and business steps remain derived,
ambiguous, or unknown until a validated explicit usage annotation is present. Runtime
capture can corroborate a visited route/component/form tuple but cannot prove
inventory or usage completeness.

Confidence is **high** for direct call/constructor resolution inside one
correctly configured TypeScript program, **medium** for distributed leaf-program
joining, and **low** for automatic journey/step inference. A representative
real workplace project-reference and lazy-route gate is required before the
design is approved for production.

## Acceptance and traceability

| Requirement | Decision/evidence | Verification | Status |
| --- | --- | --- | --- |
| `RH01-R1` Separate facts, observations, inferences, and unknowns | Evidence ledger below | Manual label review | Satisfied |
| `RH01-R2` Compare options and recommend API/index/query/evidence behavior | Options and recommended design below | Design review | Satisfied; approval pending |
| `RH01-R3` Prove or disprove aliases, re-exports, direct calls, constructors, and ambiguity | TypeScript experiment and repository fixture run | `node scripts/research/form-lineage/symbol-resolution-experiment.mjs` | Passed |
| `RH01-R4` Cover wrappers, multiple IDs, many usages, fragments, lazy ownership, route/page/step bounds | Edge-case and context matrices below | Experiment plus source review | Satisfied with explicit unknowns |
| `RH01-R5` State consequences and ordered tasks without production changes | Implementation consequences below | `git status --short` and scoped diff review | Satisfied |

## Method and source index

### Repository sources

The authority chain used for this packet is:

1. [Architecture overview](../../architecture-overview.md), especially the
   form registry, source-indexer boundary, three evidence views, and journey
   contract;
2. [ADR 0007](../../decisions/0007-distributed-workspace-discovery.md), which
   makes typed project sources authoritative and rejects arbitrary static
   scanning as form inventory;
3. [workspace-discovery implementation plan](../../planning/workspace-discovery/implementation-plan.md),
   especially Tasks 4–6B, future Angular/Nx phases, runtime-capture limits, and
   path/privacy risks;
4. [Scalable Form Discovery and Registration](../form-discovery-dx.md), which
   compares typed sources, Angular providers, Nx discovery, static scanning,
   and runtime capture;
5. the current [`FormContractDefinition` and `FormContractSource`](../../../packages/workspace/src/source.ts),
   [workspace index](../../../packages/workspace/src/workspace-index.ts), and
   [workspace runner](../../../packages/workspace/src/run-workspace.ts); and
6. the [Angular monorepo fixture source](../../../fixtures/angular-monorepo/libs/feature-lib/src/lib/claims-feature.source.ts),
   [direct page usage](../../../fixtures/angular-monorepo/libs/feature-lib/src/lib/claim-intake-page.component.ts),
   [multi-form gallery usage](../../../fixtures/angular-monorepo/libs/feature-lib/src/lib/scenario-gallery-page.component.ts),
   and [shared inline adapters](../../../fixtures/angular-monorepo/libs/forms-kit/src/lib/shared-forms.source.ts).

### Official sources

- The [TypeScript Compiler API guide](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#type-checker-apis)
  documents `Program`, `SourceFile`, `Symbol`, `getSymbolAtLocation`, and the
  type checker as the supported basis for semantic source analysis.
- The [TypeScript Language Service API guide](https://github.com/microsoft/TypeScript/wiki/Using-the-Language-Service-API#reference-resolution-in-the-language-service)
  states that a program starts from root files and follows imports and
  references; the public language-service surface includes reference queries.
- The [TypeScript module-resolution reference](https://www.typescriptlang.org/docs/handbook/modules/reference#the-moduleresolution-compiler-option)
  explains that `moduleResolution` controls how specifiers resolve to files,
  and the [`paths` reference](https://www.typescriptlang.org/tsconfig/paths.html)
  explains alias remapping. The index must therefore load the consumer's actual
  `tsconfig`, not invent module resolution.
- The [TypeScript project-references guide](https://www.typescriptlang.org/docs/handbook/project-references)
  documents that referenced projects may be consumed through declaration
  output. This is why cross-program declaration-to-source joining remains a
  feasibility gate rather than a proven result here.
- Angular's [route-definition guide](https://angular.dev/guide/routing/define-routes)
  documents literal `component`, `loadComponent`, and `loadChildren` route
  forms and notes that loader functions can be arbitrary. Static route analysis
  must therefore recognize a bounded grammar and preserve dynamic cases as
  unknown.
- Angular's [AOT compiler guide](https://angular.dev/tools/cli/aot-compiler#how-aot-works)
  describes Angular metadata as instructions for constructing and interacting
  with Angular-managed classes. It does not define application Formly root
  identity or enumerate ordinary factory call sites.
- The [Nx mental model](https://nx.dev/docs/concepts/mental-model#the-project-graph)
  documents project discovery and dependency analysis from filesystem,
  configuration, source, and TypeScript data. Nx is useful for project
  ownership and incremental scheduling, not form semantic authority.

### Adversarial review

Three bounded fresh-context doubt cycles reviewed only this artifact, its
acceptance contract, and the isolated experiment. Substantive findings were
reconciled into stricter singleton/full-search assertions, per-program coverage,
semantic-resolution probes, query outcomes, root compatibility and creation
provenance, usage/journey validation, canonical ordering, privacy variants, and
the normative route grammar. The third cycle was the configured stop bound;
its remaining findings were reconciled before final verification. Cross-model
review was skipped because this was a non-interactive delegated work item.

## Evidence ledger

### Documented facts

**`FACT-01` — TypeScript semantic identity is program-scoped.** A TypeScript
`Program` owns source files and a type checker; symbols describe declared
entities and can be obtained from syntax locations. Import resolution depends
on the active compiler options and project roots. Sources: TypeScript Compiler
API, module-resolution, and project-reference documentation linked above.

**`FACT-02` — Reference coverage depends on program coverage.** A compiler or
language-service query cannot report a usage from a source file that is absent
from its program or search set. Project references may expose declarations
rather than implementation source. Source: TypeScript Language Service and
project-reference documentation linked above.

**`FACT-03` — Angular routes have statically simple and arbitrarily dynamic
forms.** Literal `path` plus direct `component` is statically tractable;
`loadComponent` and `loadChildren` accept functions and can contain arbitrary
logic. Source: Angular route-definition guide linked above.

**`FACT-04` — Angular metadata is not a Formly root catalog.** Angular AOT
metadata describes Angular-decorated types, templates, and construction. It
does not state that an ordinary function/class is a complete Formly form, which
contract ID it owns, or every application call site. Source: Angular AOT guide
linked above.

**`FACT-05` — Nx ownership and affected analysis are project-level evidence.**
Nx builds and updates a project graph from repository configuration and source
dependencies. It can bound and schedule indexing per project, but a dependency
edge does not prove that a symbol is a form root. Source: Nx mental model linked
above.

### Repository observations

**`OBS-01` — Current form definitions have runtime identity but no retained
source identity.** [`FormContractDefinition`](../../../packages/workspace/src/source.ts)
contains `id`, `create`, and optional scenarios. The
[`WorkspaceIndexForm`](../../../packages/workspace/src/workspace-index.ts)
retains `projectId`, `sourceId`, `formId`, artifact path/hash, evidence, and
diagnostics. It does not retain a declaration symbol, direct usage, component,
route, or journey/step claim.

**`OBS-02` — Current path handling already establishes a safe baseline.** The
workspace index accepts normalized relative paths and rejects absolute,
backslash, globbed, empty, dot, and parent segments. The runner resolves output
paths under the real workspace root and rejects escapes and symlink traversal.
Source lineage should reuse the relative-path grammar and never emit host
absolute paths.

**`OBS-03` — Current contracts are content-addressed, but source usage is not.**
Form artifacts and the workspace index carry content hashes and configuration
hashes. There is no hash over source files, tsconfig inheritance, TypeScript
version, or call-site inputs, so a future source index needs its own staleness
manifest.

**`OBS-04` — Direct repository fixture usages resolve exactly in the configured
fixture search set.** Under `fixtures/angular-monorepo/tsconfig.json`,
TypeScript 5.9.3 loaded 46 root files with zero pre-emit diagnostics. The
experiment discovered both literal sources only through the canonical
`defineFormContractSource` helper from the current workspace package, then
scanned every non-declaration fixture file in that program. It asserted that
the complete matched-call set for those recognized, directly anchored source
definitions was exactly four singleton results:

| Usage | Contract ID | Result |
| --- | --- | --- |
| `createClaimIntakeForm()` in `claim-intake-page.component.ts` | `claims.intake` | Exact |
| `createClaimsAssignmentForm()` in `scenario-gallery-page.component.ts` | `claims.assignment` | Exact |
| `createCustomerOnboardingForm()` in `scenario-gallery-page.component.ts` | `customers.onboarding` | Exact |
| `createIncidentForm()` in `scenario-gallery-page.component.ts` | `operations.incident` | Exact |

**`OBS-05` — Inline adapters expose the missing-explicit-anchor case.** The two shared
definitions in `shared-forms.source.ts` use inline arrow `create` callbacks that
invoke fragment factories. The definition syntax has no direct `create` symbol
or explicit `lineage.rootSymbol`; the experiment does not claim that deeper body
analysis could never find a candidate. Treating a nested fragment call as an
authoritative form root would collapse the architecture's root/fragment
distinction.

**`OBS-06` — The bounded synthetic experiment passed all assertions.** It
exercised the proposed definition-helper shape, implicit direct `create`
anchors for a compatible zero-argument factory, explicit `lineage.rootSymbol`
for argument-requiring factories and a constructor, explicit-anchor precedence
over a direct exported adapter, a separately declared fragment role, and a
near-miss object not passed to a recognized helper. Renamed
imports, a barrel alias, namespace access, and a constructor alias canonicalized
to the declared symbol. One symbol mapped to two form IDs returned both
candidates. Wrapper calls, conditional aliases, and a higher-order parameter
did not falsely resolve as direct usages. Route objects were considered only
under a recognized `provideRouter` entry point: repeated and nested literal
component routes were retained, an unrelated `{path, component}` object and a
redirect were ignored, and lazy/dynamic cases remained unknown. Four invocations
inside descriptor creation expressions/adapters were separately classified as
definition-creation provenance, and report sorting uses code-unit rather than
locale-sensitive ordering.

### Inferences

**`INF-01` — An explicit descriptor-to-symbol edge is sufficient authority.**
If a form definition directly names a stable exported factory, or explicitly
names a separate root symbol, the index can join that canonical symbol to the
already-authoritative `formId`. Static analysis then discovers usages of the
authority; it does not create the authority.

**`INF-02` — Alias canonicalization is reliable only inside the configured
program.** Renamed imports and barrel aliases can be collapsed through the
checker. A text search cannot do this safely. Across distinct leaf programs,
the index must join through a stable declaration/module identity rather than
compare in-memory `ts.Symbol` objects.

**`INF-03` — Component context is safer than page semantics.** The enclosing
class of a direct call is syntactically exact. If that class has statically
recognizable Angular component metadata, “enclosing component” is a supported
claim. Calling it a page is an inference unless it is a route target or an
explicit annotation; reusable components can appear on several pages.

**`INF-04` — Route context is a candidate relation.** A literal route whose
`component` symbol is the enclosing component provides a derived route
candidate. Parent route composition, redirects, guards, lazy loaders, dynamic
imports, and reuse can produce zero, one, or many candidates. Even one route
candidate does not prove the user journey or authenticated navigation needed
to reach it.

**`INF-05` — Step and journey semantics need declarations.** An arbitrary
literal such as `'review'` passed near a factory call has no generic Angular or
TypeScript meaning. Business steps, prerequisites, fixtures, and outcomes need
an explicit usage/journey annotation or the separate journey contract.

### Unknowns

**`UNK-01` — Workplace compilation topology.** The target workspace's leaf
tsconfigs, project references, declaration maps, generated files, path aliases,
and build-tool overlays were not available. Cross-program source/declaration
joining is unproven against the real topology.

**`UNK-02` — Target factory conventions.** It is not known how often the target
names are direct exported symbols versus object methods, bound functions,
dependency-injected services, wrapper factories, inherited static methods, or
generated registries.

**`UNK-03` — Route composition conventions.** The frequency of literal route
arrays, custom route builders, lazy route indirection, module federation, and
dynamic component outlets is unknown.

**`UNK-04` — Scale budget.** The experiment covers 46 fixture roots and a small
synthetic graph. Memory, cold-start time, incremental time, and index size for
the workplace monorepo remain unmeasured.

**`UNK-05` — Acceptable source disclosure.** The maintainers have not approved
whether workspace-relative paths, component names, and route templates may be
returned over the eventual MCP surface in every deployment.

## Controlled experiment

### Environment and command

```text
commit:     d4ffdb517d0d506ed7cd55074c4eac720a145f8b
OS/host:    macOS local Codex worktree
Node.js:    v22.22.1
pnpm:       10.23.0
TypeScript: 5.9.3
date:       2026-08-27
```

Dependencies were restored from the local pnpm store only:

```sh
pnpm install --frozen-lockfile --offline
```

Result: 1,029 packages linked from cache; command succeeded. pnpm reported
expected missing-bin warnings because `packages/workspace/dist/cli-main.js` had
not been built, plus its normal ignored-build-scripts notice. No lockfile or
manifest changed.

Experiment command:

```sh
node scripts/research/form-lineage/symbol-resolution-experiment.mjs
```

Result: exit 0. It asserted TypeScript `5.9.3`, type-checked the proposed
definition shape, passed every reported synthetic assertion plus explicit
anchor-precedence/near-miss checks, loaded exactly 46 Angular-fixture roots with
zero pre-emit diagnostics, recognized two canonical fixture sources, asserted
the complete recognized-anchor match set of four singleton direct usages, and
reported two inline definitions without an explicit root anchor.

### Experiment interpretation

The experiment proves direct checker-based symbol-to-callsite resolution for
the tested syntax and repository fixture. It does **not** prove arbitrary
wrapper evaluation, full language-service find-references parity, Angular
template/component graph traversal, distributed project-reference joining,
lazy-route completeness, or workplace-scale performance.

## Options comparison

| Option | Authority and precision | Strengths | Failure modes | Recommendation |
| --- | --- | --- | --- | --- |
| Explicit colocated symbol anchor in each form definition | Exact form-root authority | Typed, reviewable, deterministic; naturally binds `formId` to factory/class | One migration touch; programmatic definitions may hide literal IDs; symbol moves require regeneration | **Use as authority**; direct `create` symbol is the zero-boilerplate case |
| Source-side comment/JSDoc marker | Precise location if parsed and symbol-validated | No runtime dependency or client-visible business IDs | Untyped at edit time, erased by transforms, easy to copy or orphan | **Use only for exceptional usage/journey declarations**, with a versioned literal grammar and hard generation validation |
| TypeScript compiler symbol index | Exact for direct supported syntax inside the program | Handles aliases, barrels, namespace access, calls, and `new`; gives declaration and enclosure | Missing programs/files, cross-program identity, wrappers, dynamic flow, compiler API version coupling | **Use as resolution engine**, never inventory authority |
| Angular decorator/compiler metadata | Exact Angular component identity for recognized source | Can validate enclosing component and template metadata | No Formly root ID; no ordinary callsite catalog; compiler-version coupling | Optional component enrichment only |
| Route/component analysis | Derived context for bounded literal route grammar | Useful page/route candidates and lazy-feature import ownership | Dynamic loaders/builders, parent composition, reused components, guards, outlets, route aliases | Emit candidates plus unknowns; never manufacture journey authority |
| Runtime capture | Observed route/component/form tuple for one run | Sees actual rendered state and runtime-only composition | Visited states only, privacy risk, unstable ID without declaration, cannot prove completeness | Corroboration/migration evidence only |
| Runtime identity wrapper around a usage | Precise location and TypeScript-shaped metadata | Can be generic and easy to validate statically | Ships business IDs/objects unless transformed; runtime dependency, allocation, bundle/cycle/privacy impact | Reject for the first slice; reconsider only after a bundle/privacy gate |
| Layered anchors + symbol index + bounded context + validated source annotation | Exact roots/direct usages; explicit exceptions | Lowest routine boilerplate while preserving unknowns and ambiguity | More than one artifact/evidence class; requires staleness and privacy policy | **Recommended** |

## Recommended design

### 1. Keep source lineage outside the semantic form schema

The form contract remains the versioned semantic artifact. A sibling
`source-lineage` artifact belongs to the workspace layer because it contains
workspace paths, TypeScript compiler inputs, projects, source declarations, and
application usages. The semantic compiler and future MCP server consume it but
`@formly-contract/schema` does not need Angular, Nx, or TypeScript dependencies.

The lineage artifact must bind to the workspace index content hash and every
form candidate must reference an existing indexed `formId`. It may be absent;
absence means source usage is unavailable, not that a form has no usages.

### 2. Add the smallest generic definition anchor

The common case needs no redundant marker only when `create` is a direct
exported zero-argument symbol assignable to the existing
`() => DeclaredFormContractInstance` contract. Application factories such as
the target examples commonly require arguments; their descriptor uses a safe
synthetic adapter for `create` and names the actual application factory/class
through `lineage.rootSymbol`. The opt-in definition helper makes both forms
recognizable:

```ts
type FormRootProduct =
  | DeclaredFormContractInstance
  | readonly object[];

type FormRootSymbol =
  | ((...args: never[]) => FormRootProduct)
  | (abstract new (...args: never[]) => DeclaredFormContractInstance);

interface FormContractDefinition<TScenario = unknown> {
  readonly id: string;
  readonly create: () => DeclaredFormContractInstance;
  readonly scenarios?: readonly FormContractScenario<TScenario>[];
  readonly lineage?: {
    readonly rootSymbol: FormRootSymbol;
  };
}

export const ORDER_ENTRY = defineFormContractDefinition({
  id: 'orders.entry',
  create: () => new OrderEntryStepperForm({ synthetic: true }),
  lineage: { rootSymbol: OrderEntryStepperForm },
});

export const INDEXING = defineFormContractDefinition({
  id: 'indexing.primary',
  create: () => IndexingFormConfig(safeSyntheticInput),
  lineage: { rootSymbol: IndexingFormConfig },
});
```

Rules:

- `defineFormContractDefinition` is a typed identity helper, like the existing
  root/project/source helpers.
- A direct identifier/property access in `create` is the implicit root anchor
  only when no explicit `lineage.rootSymbol` exists. Explicit lineage always
  takes precedence; a conflicting direct adapter is retained as creation
  provenance but never silently replaces root authority.
- An argument-requiring factory, inline callback, wrapper, constructor adapter,
  or programmatically built definition needs `lineage.rootSymbol` for exact
  source lineage. The helper's real `FormContractDefinition` constraint must
  type-check the zero-argument `create`; an unconstrained identity helper is not
  sufficient.
- The allowed `rootSymbol` syntax is exactly an identifier or property access
  that the checker resolves to a named, exported function or class declaration.
  Inline expressions, local/unexported declarations, `.bind`, `.call`,
  `.apply`, computed access, and conditional expressions fail with
  `UNSTABLE_SOURCE_SYMBOL` or `UNEXPORTED_SOURCE_SYMBOL`.
- The checker must find a call or construct signature whose result is assignable
  to the approved form-root product. A stable but unrelated function/class fails
  `INCOMPATIBLE_SOURCE_SYMBOL`. This type check prevents obvious false anchors;
  the descriptor remains the explicit author declaration that the compatible
  symbol is the same logical form as `create`, not a proof by return type alone.
- `rootSymbol` is trusted build-time input and is never serialized as a
  function. The definition must live in the existing Node-oriented contract
  source entry point, separate from the browser/runtime entry point; a bundle
  and package-cycle gate must prove it is not retained by application builds.
  The source index serializes only its resolved declaration identity.
- Root status comes only from a validated form definition. A function returning
  `FormlyFieldConfig[]`, a naming suffix, or being called by a root does not
  make a fragment a form root.
- A single symbol may intentionally back several form IDs. The index preserves
  the many-to-many relation.
- Calls/constructors inside the descriptor's `create` expression or the body of
  its explicitly named creation adapter are `definition-creation` provenance,
  not application usage. They are retained on the anchor for explanation and
  excluded from `find_form_usages` unless creation provenance is explicitly
  requested. A call to the adapter from application code is a wrapper usage and
  follows the wrapper/annotation rules.

### 3. Add an optional exact source annotation only when needed

Direct calls with one candidate need no source change. Ambiguous roots and
business context use a versioned source-only annotation immediately before the
statement containing the actual call:

```ts
/** @formlyContractUsage {"schemaVersion":"0.1.0","usageId":"orders.new.stepper","formId":"orders.entry","journeyId":"orders.new","stepId":"entry"} */
const instance = new OrderEntryStepperForm(input);
```

The initial grammar is intentionally strict: one JSON object with only
allowlisted literal string keys; no variables, spreads, computed properties,
duplicate keys, extra keys, or multiple annotated invocations in the attached
statement. The marker attaches only to the immediately following non-empty
statement. The indexer must resolve exactly one nested direct invocation and
verify that its candidate set contains the declared `formId`; mismatch,
orphaning, copying onto a different symbol, and duplicate `usageId` are hard
generation errors. The marker never overrides contradictory symbol evidence.

All IDs use the repository's stable-ID grammar, a bounded length, and reject
empty strings, control characters, and non-normalized Unicode. `stepId` requires
`journeyId`. When journey fields are present, generation must resolve the
`journeyId` in the versioned journey registry, prove the `stepId` belongs to
that journey, and prove that the selected form is allowed by that step. If no
approved journey registry exists yet, journey/step keys are unsupported rather
than accepted as unchecked metadata. A form-only usage marker remains valid.

This is less editor-friendly than a typed helper, but it emits no runtime
object, business ID, allocation, import, or call into an application bundle.
A runtime identity helper is deferred unless a separate bundle-size,
tree-shaking, cycle, and client-visible metadata privacy gate approves it.

### 4. Build one index per leaf TypeScript program, then join

Use the exact leaf tsconfig and compiler options selected by the owning project.
Do not create a guessed workspace-wide program. Nx may enumerate project roots,
dependencies, and affected inputs; non-Nx workspaces may use discovered project
configs. Each leaf index records canonical declarations and public export
aliases. A workspace aggregation phase joins records by a versioned portable
declaration identity, not by in-memory `ts.Symbol` object identity.

Candidate portable identity, subject to the cross-program gate:

```text
projectId + declaration source/module identity + exported name + declaration kind
```

When source is redirected to `.d.ts`, the join must use an explicit project
reference/declaration-map relation or a declared public module/export anchor.
It must not match merely on symbol text. If two declarations satisfy the same
portable key, aggregation fails with `AMBIGUOUS_SOURCE_SYMBOL`.

### 5. Proposed source-lineage artifact

The following is illustrative and intentionally separate from production DTO
approval:

```ts
interface SourceLineageIndex {
  readonly schemaVersion: '0.1.0';
  readonly workspaceIndexHash: string;
  readonly compiler: {
    readonly typescriptVersion: string;
    readonly programConfigsHash: string;
    readonly resolutionManifestHash: string;
  };
  readonly coverage: 'complete' | 'incomplete';
  readonly programs: readonly SourceProgramCoverage[];
  readonly anchors: readonly SourceAnchor[];
  readonly usages: readonly FormUsage[];
  readonly diagnostics: readonly SourceLineageDiagnostic[];
  readonly contentHash: string;
}

interface SourceAnchor {
  readonly anchorId: string;
  readonly projectId: string;
  readonly programIds: readonly string[];
  readonly role: 'form-root' | 'fragment';
  readonly declaration: SourceLocation;
  readonly exportNames: readonly ModuleExportName[];
  readonly formIds: readonly string[];
  readonly evidence: readonly EvidenceClaim[];
  readonly creationSites: readonly DefinitionCreationSite[];
  readonly sourceFileHash: string;
}

interface FormUsage {
  readonly usageId?: string; // present only when explicitly declared
  readonly callsiteKey: string; // generation-scoped, not a durable public ID
  readonly projectId: string;
  readonly programIds: readonly string[];
  readonly invocation: {
    readonly location: SourceLocation;
    readonly syntaxKind: 'call' | 'construct';
    readonly syntaxFingerprint: string;
  };
  readonly anchorId?: string;
  readonly resolution:
    | { readonly status: 'exact'; readonly formId: string }
    | { readonly status: 'ambiguous'; readonly candidateFormIds: readonly string[] }
    | { readonly status: 'unresolved'; readonly reasons: readonly string[] };
  readonly enclosingSymbol?: SourceSymbolRef;
  readonly contexts: readonly UsageContextClaim[];
  readonly sourceFileHash: string;
}

interface SourceProgramCoverage {
  readonly programId: string;
  readonly projectId: string;
  readonly purpose: 'application' | 'library' | 'test' | 'tooling' | 'other';
  readonly configIdentity: string;
  readonly rootSetHash: string;
  readonly programSemanticsHash: string;
  readonly resolutionManifestHash: string;
  readonly coverage: 'complete' | 'incomplete' | 'excluded';
  readonly reasons: readonly string[];
}

interface DefinitionCreationSite {
  readonly location: SourceLocation;
  readonly syntaxKind: 'call' | 'construct';
  readonly programIds: readonly string[];
}

type SourceLocation =
  | { readonly kind: 'path'; readonly pathMode: 'workspace-relative' | 'project-relative'; readonly path: string; readonly line: number; readonly column: number }
  | { readonly kind: 'module'; readonly module: string; readonly exportName?: string }
  | { readonly kind: 'opaque'; readonly fileId: string };
```

Path locations use an allowlisted relative POSIX path and 1-based line/column.
`module-only` disclosure uses module or opaque variants and cannot accept a
live source-path query. Line/column is not stable identity. A local syntax
fingerprint plus file hash detects drift; an explicit `usageId` is the only
durable usage key. `programId` is unique per normalized config path, purpose,
resolved root-set identity, and `programSemanticsHash`. The semantics hash
includes normalized compiler-option overrides, resolution conditions,
case-sensitivity and realpath behavior, and compiler/build-host overlay
identity. Several application/test/build configs in one project are separate
programs even when they share a tsconfig path.

Program relevance is conservative. For a form query, relevant programs are the
anchor-owning program plus every program whose complete import/project graph can
reach the anchor's project. If any graph needed to compute that closure is
incomplete, every workspace program is potentially relevant. A policy exclusion
removes a program only from an explicitly named query scope when the program's
purpose and non-overlap prove it cannot contribute to that scope—for example, a
test-only program in a `production` query. Otherwise an excluded potential
consumer forces `incomplete`. Every relevant program must be `complete` for an
empty result to mean “no usages.” An incomplete query may return explicitly
partial positive results, but never an authoritative negative. An `ok([])`
response always names its coverage scope and excluded purposes.

Overlapping programs deduplicate the same physical source observation by an
internal portable file identity, file hash, syntax fingerprint, and source
span. Identical candidate/context claims merge their program evidence. If two
programs resolve the same observation differently, aggregation emits
`OVERLAPPING_PROGRAM_CONFLICT` and marks affected queries incomplete; it does
not manufacture `AMBIGUOUS_SOURCE_SYMBOL`.

`programIds` on anchors, creation sites, and usages makes that merge/conflict
evidence reproducible from the serialized artifact and lets queries compute
coverage against the exact contributing programs.

`contentHash` is computed over the canonical draft with the `contentHash` field
omitted, matching the workspace index's non-self-referential pattern.

Canonical ordering is part of the DTO: programs by `programId`; anchors by
`anchorId`; usages by project, retained/opaque location key, span, syntax kind,
and `usageId`; diagnostics by code then provenance; aliases and IDs by code-unit
order; evidence and contexts by their discriminant then stable identity; and
reasons by code-unit order. Duplicate program, anchor, usage, form, alias, and
diagnostic identities fail validation unless the overlap rule above proves the
same observation. Pagination follows this canonical usage order. Parallel or
filesystem discovery order never enters serialization or hashing.

### 6. Evidence, confidence, and resolution are independent

Every claim records both origin and strength:

| Evidence | Meaning |
| --- | --- |
| `descriptor` | Validated form definition explicitly connected `formId` and root symbol |
| `usage-annotation` | Versioned source annotation declared form/journey/step IDs and passed strict grammar plus symbol validation |
| `typescript` | Type checker resolved declaration, alias, enclosure, or direct reference |
| `angular-metadata` | Bounded Angular decorator/template analysis supplied component evidence |
| `route-analysis` | Bounded route grammar supplied a candidate route relation |
| `runtime-observed` | A named capture run observed the tuple; coverage remains scoped to that run |

| Confidence | Meaning |
| --- | --- |
| `exact` | Direct declared edge or checker identity under the recorded program inputs |
| `derived` | Deterministic bounded analysis, but the claim is not application-declared semantics |
| `candidate` | One of several safe possibilities; no selection is authorized |
| `unknown` | Required evidence is absent, dynamic, stale, excluded, or unsupported |

Resolution cardinality remains a separate `exact`, `ambiguous`, or `unresolved`
status. For example, TypeScript may give `exact` symbol confidence while the
symbol-to-form relation is `ambiguous` because it backs two form IDs.

### 7. Query surface

Expose compact read-only queries over generated artifacts; never run TypeScript,
Angular, or application factories from an MCP request:

```text
QueryResult<T> = ok(T) | stale(reasons[]) |
  incomplete(partial?: T, programs[], reasons[])

resolve_form_usage(workspaceRelativeSourcePath, line, column, scope)
  -> QueryResult<exact | ambiguous(candidateFormIds[]) | unresolved(reasons[])>

find_form_usages(formId, scope, projectId?, contextKind?, includeCreationProvenance=false)
  -> QueryResult<paged usage summaries with evidence/confidence>

explain_form_usage(callsiteKey | usageId)
  -> QueryResult<anchor chain, candidate contracts,
     component/route/journey claims, diagnostics, and unknowns>

find_source_anchors(formId)
  -> QueryResult<root declarations, public aliases, related form IDs,
     coverage, and input hashes>
```

The live-path query is available only to a local deployment retaining path
locations. Its input must pass the same normalization, containment, symlink,
project-root, and indexed-file checks used at generation. Module-only/opaque
deployments query by stable `usageId`, `callsiteKey`, form ID, or anchor ID.
Every query returns its named coverage scope and excluded purposes and has
top-level stale and incomplete outcomes; an incomplete relevant program
prevents an authoritative negative answer. Definition-creation sites are
available for explanation but excluded from ordinary application-usage results.

Suggested resources are
`form://source-lineage/{contentHash}/form/{formId}` and
`form://source-lineage/{contentHash}/usage/{usageId-or-callsiteKey}`. Responses
must always include the lineage index hash and workspace index hash. A query
against mismatched hashes returns `STALE_SOURCE_INDEX`; it does not return old
locations with a warning.

### 8. Ambiguity behavior

- **One symbol, one form ID:** a direct call is exact.
- **One symbol, several form IDs:** return sorted candidates and
  `AMBIGUOUS_FORM_SYMBOL`; require a validated source annotation to select one.
- **Several symbols, one form ID:** retain all aliases/root adapters. A call to
  any explicitly anchored symbol can resolve to that form.
- **Many call sites:** retain every call site. Do not collapse to “primary
  usage”; no call site outranks another without a declared usage role.
- **Duplicate stable `usageId`:** fail generation before writing a successful
  aggregate index.
- **Stale source:** return top-level stale; **excluded or failed relevant
  program:** return top-level incomplete. Never fall back to text-name matching
  and never turn incomplete coverage into an empty usage list.
- **Wrapper or conditional flow:** record a derived candidate edge only if it
  matches an approved bounded grammar; otherwise require annotation. Derived
  wrapper evidence cannot silently become exact form selection.

## Required edge-case behavior

| Case | Safe result | Required evidence or action |
| --- | --- | --- |
| Renamed import | Canonicalize to declaration | TypeScript checker exact |
| Barrel re-export | Canonicalize through alias chain; retain public alias | TypeScript checker exact |
| Namespace import/property call | Canonicalize property symbol | TypeScript checker exact |
| Direct factory call | Map declaration to all anchored form IDs | Descriptor + TypeScript |
| Direct constructor | Same as call | Explicit class `rootSymbol` + TypeScript |
| Simple wrapper factory | At most derived candidate | Bounded body grammar or usage annotation |
| Conditional wrapper/alias | Ambiguous candidate set or unknown | Usage annotation for exact selection |
| Higher-order parameter call | Unknown at function body; call-edge candidates may be separate | Interprocedural analysis is out of initial scope |
| Bound/call/apply/reflection | Unknown | Explicit usage annotation |
| One symbol, multiple form IDs | Ambiguous | Validated adjacent usage annotation with exact `formId` |
| Many calls to one symbol | Preserve each usage | No additional annotation unless stable usage/journey IDs are needed |
| Fragment used inside root | Fragment relation only; never a form contract | Explicit `role: fragment`; root definition remains authority |
| Inline form assembled from fragments | Exact only with a definition root anchor | Add stable wrapper/root symbol or `lineage.rootSymbol` |
| Lazy feature | Project ownership from project config; route import is context evidence | Explicitly index lazy leaf project; do not rely on root DI |
| Generated source | Exclude by default or label generated | Generator input/output policy and stable source maps |
| JavaScript/no declarations | Parse if included by tsconfig, otherwise unknown | Project-specific inclusion gate |

## Page, route, and step boundary

| Context claim | Safely derivable? | Maximum claim without annotation |
| --- | --- | --- |
| Enclosing TypeScript class/function | Yes for a direct AST usage | Exact enclosing symbol |
| Enclosing Angular component | Usually, for a decorated class in indexed source | Exact component symbol; metadata evidence |
| “Page” | Sometimes | Derived only when the component is a recognized route target; otherwise component, not page |
| Literal eager route | Yes under bounded route-object grammar | Derived route candidate, including parent composition only when all segments are literal |
| Literal lazy `loadComponent`/`loadChildren` | Sometimes | Derived candidate when the dynamic import/export chain matches the approved grammar |
| Custom route builders or conditional loaders | No generically | Unknown with unsupported/dynamic reason |
| Route ownership | Partly | Project owning the route source and imported lazy target; not business ownership |
| Component embedded in several routes/pages | Yes as multiplicity | Candidate set; never choose one |
| Formly wizard/step node | Sometimes from the semantic contract | Contract UI node/step identity if already declared there; not application journey position |
| Business journey step/prerequisites/outcome | No | Requires `journeyId`/`stepId` annotation or journey contract |
| Runtime current route | Yes for one capture | Observed route for that run only |

The initial normative route grammar is deliberately smaller than Angular's
full executable surface:

1. A route graph is authoritative input only when its value reaches a canonical
   `@angular/router` `provideRouter` call, `RouterModule.forRoot/forChild` call,
   or another explicitly allowlisted router registration API. A variable merely
   typed `Routes`, or an object with `path`/`component`, is not enough unless a
   bounded const-reference chain reaches registration.
2. The first slice follows literal arrays, direct `const` identifiers, and
   spreads of already resolved literal/const route arrays with cycle and
   duplicate detection. Function calls, getters, mutation, computed keys, and
   custom route builders are unknown.
3. A supported route object uses literal `path`, direct component symbols,
   literal `children`, `redirectTo`, and/or a supported lazy loader. A route may
   have both `component` and `children`; record the component candidate and
   recurse into the child graph. Preserve pathless parents as context but do not
   invent text for custom `matcher` routes.
4. The only initially supported lazy forms are
   `() => import('literal').then(m => m.ExportedComponent)` for `loadComponent`
   and the equivalent exported literal route-array/module forms approved by the
   Angular compatibility fixture for `loadChildren`. Conditionals, injected
   loaders, computed module/export names, and arbitrary promise transforms are
   unknown.
5. Compose a route template only while every contributing segment is literal;
   preserve every route for reused components. Guards, resolvers, outlets,
   redirects, and route parameters remain navigation/context facts and never
   imply a journey or reachable authenticated state.

The retained experiment proves only canonical direct registration, eager
literal components, a reused component, a parent containing both component and
children, nested literal composition, redirect/lookalike rejection, and unknown
lazy/dynamic handling. The lazy grammar above remains a feasibility gate, not
an experiment result.

Route strings can contain structure that some consumers consider sensitive.
Their retention and disclosure must be independently configurable; suppressing
a route does not suppress the exact form-to-component relation.

## Path and privacy rules

1. Retain usage/declaration records only for files included by an approved
   project tsconfig and project source roots. Exclude `node_modules`, build
   outputs, caches, generated code, tests, and fixtures from disclosed records
   by default unless a project opts them in. Exclusion from disclosure does not
   exclude a file from the semantic-resolution hash closure.
2. Never retain host absolute paths, home directories, repository remote URLs,
   usernames, source text, arbitrary comments, call arguments, model/form-state
   values, environment values, credentials, or runtime object snapshots. A
   usage marker contributes only its allowlisted stable ID fields after parsing;
   the raw comment is not retained.
3. Normalize retained paths to safe POSIX paths and reuse the workspace index's
   containment grammar. Symlink escapes fail generation.
4. Root policy chooses `workspace-relative`, `project-relative`, or
   `module-only` disclosure. `workspace-relative` is useful for a local coding
   agent; `module-only` is the strict deployment mode. Hashes are not a privacy
   substitute for sensitive source strings.
5. Route template retention is opt-in independently of source locations.
   Dynamic route parameters and observed URL values are never retained.
6. Query responses apply the active disclosure policy even if a more detailed
   local artifact exists. A caller cannot request a weaker privacy mode.
7. Diagnostics use stable codes and IDs. They do not echo arbitrary source
   snippets or exception messages from application code.

## Staleness detection

The lineage index is valid only for its exact compiler and semantic resolution
inputs:

- hash TypeScript version, normalized semantic compiler options, tsconfig files
  including inherited/reference configs, and project identity into
  `programConfigsHash`;
- use an instrumented compiler/module-resolution host to hash the complete
  semantic resolution closure into `resolutionManifestHash`: every source and
  declaration file read, generated declaration/source redirect, relevant
  `package.json` exports/imports/type metadata, symlink target identity,
  lockfile/tool identity, and declared build-tool host overlay; the manifest
  also records negative `fileExists`/`directoryExists` probes, directory
  enumerations, case-sensitivity mode, and realpath results so creating a
  previously absent nearer module or package boundary invalidates the index;
- record a per-file digest on every anchor and usage;
- bind the artifact to the current `workspaceIndexHash`; and
- compute the lineage `contentHash` over the canonical allowlisted draft with
  `contentHash` omitted.

If the active compiler host cannot expose a hermetic resolution closure, the
program is `incomplete`; hard-staleness and authoritative negative queries are
unavailable for it. Generated or dependency files may be hashed without their
paths or contents being disclosed in public lineage records.

A generation check recomputes all hashes. A location query against a live file
first compares that file digest, then the resolution, program, and
workspace-index hashes.
Any mismatch returns `STALE_SOURCE_INDEX`. Line/column relocation, fuzzy symbol
name matching, or using the last known unique candidate is prohibited.

Nx inputs should include the owning project sources, tsconfig chain, referenced
public declarations/sources, project config, root config, lockfile slice/tool
versions, and the workspace index dependency. Nx affected/caching can schedule
rebuilds, but the artifact hashes remain the correctness mechanism.

## Failure modes and mitigations

| Failure mode | Consequence | Required behavior |
| --- | --- | --- |
| Wrong, missing, or incomplete leaf program | Missed usages appear absent | Record per-program incomplete coverage; every relevant query returns incomplete rather than an authoritative empty result |
| Relevance graph is incomplete or exclusion is unproven | Missing consumer is incorrectly considered irrelevant | Treat every workspace program as potentially relevant; exclude only from a named scope with purpose/non-overlap proof |
| Overlapping tsconfigs see the same call differently | Duplicate or contradictory usage | Deduplicate identical portable observations; conflict marks affected queries incomplete |
| Project-reference declaration loses source identity | Cross-project join fails | Use declaration maps/source redirect or explicit module/export anchor; gate before release |
| Resolution input changes outside retained sources | Old alias/declaration relation appears current | Hash the instrumented semantic resolution closure or fail the program closed as incomplete |
| Compiler API changes | Index behavior drifts across TypeScript versions | Pin supported versions, record version, run compatibility fixtures |
| Programmatic descriptor hides literal form ID/root | Cannot establish exact anchor | Require explicit typed definition/lineage sidecar; emit `UNANCHORED_FORM_DEFINITION` |
| `rootSymbol` is inline, local, bound, or unexported | Portable identity is false | Reject unsupported AST/declaration grammar; keep contract source Node-only and bundle-isolated |
| `rootSymbol` has no compatible call/construct result | Unrelated stable symbol becomes form authority | Reject with `INCOMPATIBLE_SOURCE_SYMBOL`; type compatibility is necessary but descriptor declaration remains authoritative |
| Descriptor adapter invokes its root | Synthetic creation appears as a page usage | Retain `definition-creation` provenance on the anchor and exclude it from ordinary usage queries |
| Wrapper body grows dynamic | Previously derived edge becomes unsafe | Version bounded grammar, downgrade to unknown, require annotation |
| Usage marker is copied, malformed, nonliteral, or orphaned | Wrong business context attaches to a call | Strict versioned JSON grammar plus adjacent singleton symbol validation; fail generation |
| Journey/step ID is missing, stale, or unrelated to form | Explicit-looking false context | Validate stable ID grammar and referential membership against the versioned journey registry, or reject journey keys |
| Unrelated object resembles a route | False page/route context | Analyze only recognized Angular router entry points/type origins and registered route graphs |
| Same component/route hosts several forms | Context mistaken as identity | Keep form resolution and context relations separate |
| Same root symbol backs multiple contracts | Wrong contract silently chosen | Sorted ambiguity, no default, annotation required |
| Reusable fragment called directly | Fragment treated as page form | Explicit root/fragment role; no type/name inference |
| Lazy project absent from root program | Usage missing | Index leaf projects explicitly from workspace ownership |
| Route/component reused | One route incorrectly selected | Return all candidates with evidence |
| Source changed after generation | Agent navigates stale location | Hash mismatch is a hard stale result |
| Absolute path or source value leaks | Workspace/privacy disclosure | Strict allowlist, relative paths, no source text/arguments/values |
| Runtime capture mistaken as complete | Missing usages appear absent | Separate observed evidence and explicit coverage scope |

## Feasibility and stop gates

Production work may start only after maintainers approve the API direction and
the following gates pass on a sanitized representative workplace slice:

| Gate | Pass condition | Stop condition |
| --- | --- | --- |
| `GATE-SYM-01` Direct identity | 100% of enumerated direct calls/constructors for at least the three target conventions resolve to the expected compatible anchored symbol across local, path-alias, barrel, and namespace imports; same-named helpers/lookalikes are ignored and descriptor adapter calls are creation provenance | Any wrong unique match, incompatible root accepted, helper matched by name/path text rather than canonical identity, or creation call reported as application usage |
| `GATE-PROG-01` Distributed programs | At least three leaf projects, one project reference, one declaration-output consumer, and one cross-project alias join to one portable anchor identity | Join depends on symbol spelling, absolute host path, or comparing `ts.Symbol` objects across programs |
| `GATE-COVERAGE-01` Relevance and overlap | Multiple configs/options/hosts in one project, overlapping app/test roots, scope exclusions, an incomplete dependency graph, and conflicting resolution prove unique program IDs, conservative relevance, deduplication, retained contributor IDs, and incomplete-query behavior | Missing or unproven-excluded program produces an unscoped empty result, or overlap becomes false ambiguity/duplicate usage |
| `GATE-AMB-01` Ambiguity | Multiple form IDs, multiple routes, and conditional wrappers always return sorted ambiguity/unknown and never a guessed exact result | Any input-order-dependent or first-match selection |
| `GATE-ROUTE-01` Context | Recognized `provideRouter`/`RouterModule`/registered `Routes` inputs plus eager, literal lazy, nested, reused, redirect, unrelated-object, and dynamic fixtures produce the specified claims | Unregistered lookalike object becomes a route, dynamic route is exact, or journey/step is inferred without declaration |
| `GATE-STALE-01` Staleness | Editing a source, declaration dependency, package export map, symlink target, generated declaration, tsconfig, anchor, tool/host overlay, or workspace index makes the old index stale or the program incomplete before a location is returned | Old location returned with only a warning, or untracked semantic input permits an authoritative result |
| `GATE-PRIV-01` Privacy | Golden scan contains no absolute path, source text, arguments, model/form state, environment data, or observed URL values; strict mode emits module-only locations | Any disallowed value in artifact or diagnostic |
| `GATE-BUNDLE-01` Authoring isolation | Contract-only `rootSymbol` metadata is absent from application bundles and introduces no runtime package cycle; usage annotations emit no runtime metadata | Root anchor or business IDs appear in browser output, or authoring imports create a cycle |
| `GATE-JOURNEY-01` Annotation references | Form-only markers validate; journey/step markers resolve stable IDs, membership, and form allowance against a versioned journey registry | Unchecked, malformed, stale, or unrelated journey/step ID enters exact evidence |
| `GATE-CANON-01` Canonical index | Reordered filesystem discovery, parallel leaf completion, overlapping identical observations, and reordered input arrays produce byte-identical output and pagination | Hash/order changes without semantic change, or duplicate stable identity is accepted silently |
| `GATE-SCALE-01` Scale | Maintainer-approved cold/incremental time, peak memory, and artifact-size budgets pass on the representative monorepo; measurements are retained | Budget missed or measurement unavailable; partition/index incrementally before broad rollout |
| `GATE-DX-01` Adoption | Common direct definitions need no redundant usage marker; ambiguous/wrapper cases produce actionable diagnostics and one local annotation | Routine form requires duplicate central registry entry or application execution |

Stop the initial implementation at direct symbol resolution plus explicit
annotations if wrapper/interprocedural analysis cannot be specified as a small,
sound grammar. Do not broaden the first slice into general TypeScript data-flow
analysis, Angular application bootstrapping, or journey inference.

## Implementation consequences and ordered tasks

These are proposed follow-up units, not changes authorized by RH-01:

1. **`RH01-T1` — Approve source-lineage contract.** Decide artifact ownership,
   evidence vocabulary, portable anchor identity, path modes, strict usage
   marker grammar, and contract-source bundle isolation. Output: approved
   spec/ADR update.
2. **`RH01-T2` — Run workplace topology gate.** Add sanitized fixtures for leaf
   tsconfigs, project references, declaration maps, path aliases, barrels, and
   lazy features. Measure cold/incremental resource use. Output: retained gate
   evidence; no public API yet.
3. **`RH01-T3` — Add typed definition anchors.** Add
   `defineFormContractDefinition` and optional `lineage.rootSymbol` in the
   workspace authoring boundary with explicit precedence, exported
   call/construct compatibility, creation-provenance classification, bundle
   isolation, and no artifact function serialization. Output: anchored
   definition tests.
4. **`RH01-T4` — Build direct source index.** Create per-leaf TypeScript programs,
   canonicalize alias chains, index direct calls/constructors, preserve
   root/fragment roles, contributing program IDs, overlap rules, and many-to-many
   mappings, and emit deterministically ordered diagnostics. Output: versioned
   source-lineage artifact.
5. **`RH01-T5` — Add coverage, staleness, and privacy.** Record every leaf
   program's complete/incomplete/excluded status, bind the instrumented semantic
   resolution closure and workspace hashes, reuse safe path validation, add
   privacy goldens, and integrate non-mutating `check`. Output: coverage,
   hard-stale, and disclosure-policy tests.
6. **`RH01-T6` — Add query surface.** Implement compact read-only source/usage
   queries over artifacts only. Output: exact/ambiguous/unresolved schema and
   pagination tests.
7. **`RH01-T7` — Add bounded Angular/route context.** Recognize approved component
   and literal route grammars, retain candidate multiplicity, and keep dynamic
   cases unknown. Output: eager/lazy/nested/reuse/dynamic fixtures.
8. **`RH01-T8` — Add optional usage annotation.** Parse the strict versioned
   adjacent source marker for multiple-ID and journey/step cases and validate
   singleton nested symbol/form agreement plus journey/step membership when a
   journey registry exists. Output: malformed, orphaned, copied, stale-journey,
   ambiguity-resolution, privacy, and duplicate-usage tests.
9. **`RH01-T9` — Reconcile runtime evidence later.** Join declared/static usages
   with explicitly scoped runtime capture without upgrading observed coverage
   to completeness. Dependency: runtime-capture decision and privacy approval.

Architecture consequences if approved:

- `packages/workspace` owns authoring anchors, lineage validation, aggregation,
  hashing, and CLI generation/check behavior.
- A TypeScript-dependent internal indexer may live in `workspace` initially or
  a later optional package; it must not enter schema, semantic projection, MCP
  request execution, or browser runtime dependency surfaces.
- Future Nx integration supplies project enumeration, inputs, scheduling, and
  affected execution. It does not change form identity rules.
- Future Angular integration supplies component/template/route evidence. It
  does not change form-root authority.
- MCP and agent consumers must handle `exact`, `ambiguous`, `unresolved`,
  `stale`, and `incomplete` as first-class results.

## Confidence, limitations, and unresolved decisions

| Claim | Confidence | Limitation / evidence that would change it |
| --- | --- | --- |
| Direct aliases, barrels, namespace calls, and constructors can resolve to an anchored symbol | High | A representative build-tool transform that makes the consumer tsconfig resolve a different declaration would require a new supported identity path |
| Current direct Angular-fixture usages can map to contracts | High | Reproduced with four exact matches and zero diagnostics |
| One source index can cover a distributed workplace monorepo through leaf aggregation | Medium | Cross-program declaration/source joining and scale are not yet reproduced |
| Literal component routes can enrich usage context | Medium | Custom builders, nested lazy composition, and component reuse reduce completeness |
| Page/journey/step can be inferred generically | Low / rejected as authority | Only an explicit annotation or journey contract would raise confidence |
| Runtime capture can fill missing declared inventory | Low / rejected as completeness | It can only add scoped observed evidence |

Maintainer decisions still required:

1. Is `lineage.rootSymbol` acceptable as trusted function/class-valued authoring
   metadata, or must the anchor be a module/export string validated by the
   indexer?
2. Is the strict adjacent source comment acceptable for exceptional exact
   usage/journey declarations, or must those declarations live in project-owned
   sidecars at the cost of weaker callsite precision? A runtime helper is
   deferred unless separately approved after the bundle/privacy gate.
3. Which path disclosure mode is the default for local coding agents and for a
   remotely exposed MCP server?
4. Which workplace tsconfigs/project references and lazy-route conventions form
   the minimum representative gate?
5. What cold time, incremental time, peak memory, and artifact-size budgets are
   acceptable?
6. Are test/storybook/demo usages indexed by default, separately categorized,
   or excluded?

## Recommended next action

Approve or reject the layered direction and choose the root-anchor,
exceptional-usage-annotation, and path-disclosure policies above. If approved,
execute only `RH01-T2` next: a sanitized workplace topology and scale gate. Do
not begin production DTOs or query APIs until portable cross-program symbol
identity, staleness, coverage, authoring isolation, and disclosure behavior pass
that gate.
