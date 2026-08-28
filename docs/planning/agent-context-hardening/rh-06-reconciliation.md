# RH-06: Agent Context Hardening Reconciliation

- Status: Approved planning baseline; implementation pending
- Date: 2026-08-27
- Baseline: `552e580309f68ab8c87a7eb4c845513b249c42ff`
- Inputs: RH-01 through RH-05

## Purpose

This document reconciles the five hardening research packets into one delivery
architecture. It is the common contract for subsequent planning and
implementation. The research packets remain the detailed evidence record; this
document decides how their conclusions compose.

The target user journey is:

1. an agent starts from a bug report, source file, page, route, component, form
   ID, or journey step;
2. generated source and usage evidence identifies the applicable form contract
   without name guessing;
3. bounded queries return the smallest complete context needed for the test;
4. a typed intent is validated entirely against pinned semantic and execution
   authority; and
5. a trusted driver compiles the validated plan to Playwright operations
   without accepting model-invented selectors or modules.

## Decision

Proceed, but through a serialized shared-contract checkpoint before parallel
producer implementation.

The research supports the overall architecture with high confidence for its
deterministic core:

- direct TypeScript symbol-to-form resolution when a form root is explicitly
  anchored;
- static Formly semantic projection, declared profiles, explicit effects, and
  strict unknowns;
- Angular AOT authoring and browser observation on a pinned application target;
- pure artifact queries and typed intent validation; and
- exact driver execution selected only from reviewed registries.

It does not support these broader claims yet:

- complete automatic journey or step inference;
- authoritative interpretation of arbitrary callbacks, RxJS, or hooks;
- safe application-factory execution in an ordinary child process;
- automatic semantic approval of custom fields from rendered DOM alone; or
- workplace-scale coverage before the retained topology and value pilots pass.

## Compatibility boundary

Form Contract `0.4.0` remains the implemented semantic compatibility boundary.
RH-06 does not silently add source paths, journeys, browser observations, or
driver modules to that artifact. New capabilities begin as strict sibling
record families. A later version may fold stable semantic facts into the core
contract only through an explicit schema decision.

Existing v0.4 behavior remains authoritative:

- the form/node tree and constraints;
- value-domain metadata and honest static/dynamic/unknown distinctions;
- field-type profiles and exact locator/interaction parts;
- explicit cross-field effects and ordering; and
- evidence, confidence, diagnostics, and canonical hashes.

## Identity model

Four identities must not be collapsed:

| Identity | Meaning | Authority | Stability |
| --- | --- | --- | --- |
| Form ID | One semantic form definition and its generated contract | Project-owned form definition | Durable across builds when semantics remain the same |
| Root anchor ID | The exported function, callable `const`, or class that creates the application form | Validated definition anchor plus TypeScript symbol identity | Durable while the public declaration identity remains stable |
| Usage ID or callsite key | One source invocation of an anchored form | Explicit usage annotation for durable IDs; checker-derived callsite key otherwise | Durable only when explicitly declared; generated callsite keys are build-scoped |
| Journey/step ID | Business navigation and step membership | Project-owned journey catalog or validated source annotation | Durable application metadata; never inferred from array order or names |

One root may map to several forms and one form may have several roots or usages.
Those are many-to-many relations, not errors by themselves. An unannotated
usage whose root maps to several form IDs is ambiguous and must not be selected
by score or naming similarity.

## Artifact topology

The delivery system uses a reference graph, not one monolithic document.

| Artifact or record family | Primary owner | Contains | Must not contain or imply |
| --- | --- | --- | --- |
| Form Contract `0.4.0` | `@formly-contract/schema` and compiler | Semantic form tree, profiles, domains, locators, effects, unknowns | Workspace paths, application journeys, runtime driver modules |
| Workspace contract index | `@formly-contract/workspace` | Project/form inventory and contract hashes | TypeScript or Angular execution during agent queries |
| Source-lineage index | Workspace source indexer | Root anchors, direct usages, program coverage, path/privacy mode, staleness inputs | Semantic form truth or inferred business journeys |
| Journey catalog | Project authoring plus workspace validation | Entry, step, action, outcome, and exact transition records | Step inference from source order, labels, or route order |
| Behavior/scenario evidence | Schema semantics; workspace/Angular producers | Normalized conditions, exact causal edges, access prerequisites, replay cases, scoped completeness | Automatic business verbs derived from arbitrary code |
| Angular authoring report | Future `@formly-contract/angular` | Registration inventory, rendered roles/parts, coverage, observations, review scaffolds | Automatic approval of a field profile or whole-process sandbox claims |
| Driver registry manifest | Future `@formly-contract/playwright` plus application registries | Reviewed driver IDs, versions, supported operations, registry hash | Agent-supplied module paths, selectors, or executable callbacks |
| Agent context artifact set and owner references | Schema plus pure assembly/query layer | Open schema-addressed content references plus owner-specific usage, form, scenario, journey, and driver selections | A second copy of all source artifacts, one generic logical-ID grammar, or unpinned “latest” lookups |

Exact public DTO names are finalized in the first shared schema slice. Whatever
names are selected must preserve these ownership and dependency directions.

## Join and freshness rules

CTX-0A first pins a structured workspace-index reference, repository-revision
provenance, and schema-addressed sibling content hashes. Its set content hash is
the canonical inventory identity; it does not invent an arbitrary build ID or
claim a closed dirty-worktree input digest.

Every later executable context pins at least:

- workspace-index schema version and content hash;
- selected usage ID/version or build-scoped callsite identity;
- form ID and Form Contract hash;
- journey catalog hash when journey authority is used;
- scenario artifact ID/hash and its basis contract hash when resolved behavior
  is used; and
- driver-registry hash.

Owner-specific schemas bind those logical selections to their exact basis
hashes. CTX-1 compares the pinned records with available live inputs and emits
the freshness status; CTX-2 validates basis compatibility and emits stable
blocking diagnostics. Assembly fails closed when those checks show a mixed
context, a scenario produced from another contract, incomplete source coverage
for an authoritative negative answer, or a changed driver registry. Staleness
is a blocking result for compilation, not a warning followed by a best-effort
fallback.

Sibling artifacts compute their own canonical non-self-referential content
hashes. The context manifest references those hashes; it does not participate
in their hash inputs. This avoids cycles and permits optional evidence to be
absent with an explicit capability/unknown result.

## Authority and evidence rules

Evidence origin, confidence, resolution cardinality, and execution authority
are separate concepts.

- Declared and reviewed application metadata may authorize semantic behavior
  or execution.
- Bounded deterministic analysis may produce derived evidence only for the
  grammar and scope it actually proves.
- Browser or runtime observation may corroborate a declaration and identify
  drift, but one observation does not prove inventory completeness.
- Ambiguous or unresolved evidence never becomes executable because it has a
  high confidence score.

For effects and behavior specifically:

- v0.4 explicit effects remain authoritative for application/business verbs
  such as `loads`, `filters`, `clears`, `controls-state`, or `toggles`;
- a closed normalized rule, witnessed against its pinned evaluation semantics,
  may authorize only the exact state edge it proves, such as visibility or
  required state under a condition; and
- arbitrary callbacks, imported helpers, lifecycle hooks, and RxJS pipelines
  remain opaque or scaffold-only unless an application declaration supplies
  the missing semantics.

## Scenario ownership

The word “scenario” currently spans three concerns. RH-06 assigns them
explicitly:

1. RH-04 owns the portable JSON-safe semantics for conditions, causal edges,
   access prerequisites, replay cases, scoped completeness, and unknowns.
2. Angular Task 8 owns trusted scenario compilation and produces resolved
   artifacts bound to a specific form-contract hash.
3. RH-03 AOT authoring owns rendered observations and conformance evidence; it
   may corroborate a reviewed scenario but cannot invent its business meaning.
4. RH-05 owns references, projections, validation, and execution planning over
   those artifacts. It is not a scenario producer.

In scheduler terms, `ANG-3` is only Task 7C's guarded JIT host capability.
`BHV-4` is Task 8's resolved-scenario producer and depends on that host plus
the `ANG-2P` provider/project descriptor, `BHV-1`, `CTX-0C`, and `CTX-0D` for
publication. Task 8 is never mapped onto both sides of its own dependency.

## Custom Angular/Formly field path

Interactive custom types such as `button-toggle`, `autocomplete`,
`text-editor`, composite date ranges, and table selectors use a two-source
model:

- reviewed field-type profiles declare semantic roles, operations, named
  parts, value codecs, readiness, and stable locator targets; and
- Angular authoring inventory supplies registration/source/template evidence,
  rendered observations, configured-scope coverage, and review scaffolds.

Generated scaffolds are suggestions. A project owner reviews and accepts the
profile before it can authorize generic E2E interaction. Exact
application-specific drivers remain available for behavior that is not safely
generic.

Display/assertion-only components such as application information panels do
not inherit interaction authority from that model. They require an explicit
authoring disposition and remain non-executable/unknown until the schema owner
approves a non-interactive or no-driver profile branch and its assertion
surface.

The Angular lane is internally serialized:

1. schema-owned host compatibility result;
2. retained pinned application-target compatibility gate;
3. optional `@formly-contract/angular` package and Node-safe workspace
   descriptors;
4. isolated AOT browser host and inventory/source joins;
5. review scaffolds and workplace value pilot; and
6. optional exact registry-bound conformance.

The existing guarded JIT/config worker remains a separate trusted execution
mode for config and scenario compilation. It is not the Angular AOT authoring
host.

## Factory and dynamic values

Factory parameters are classified rather than filled with plausible-looking
objects:

- inert scalar or JSON-like values may be supplied by strict declared fixtures;
- functions, services, streams, templates, and other capabilities use opaque
  bindings and are projected as dynamic/unknown unless a reviewed resolver
  exists;
- static options are enumerated when the semantic compiler can prove them;
- mixed or runtime options retain their known subset, completeness, provider
  identity, readiness, and a safe selection strategy only when declared; and
- no provider is executed merely to make the metadata look complete.

The safe first factory work is inert DTOs, binding validation, a pure projector,
and synthetic fixtures. Executing application factories is blocked until the
code-free sidecar, runner-owned violation ledger, structural identity gate,
rootless OCI `oci-rootless-v1` conformance, and retained negative controls pass.
A trusted local child process is not that boundary.

## Execution profiles

The project deliberately keeps three execution profiles distinct:

| Profile | Purpose | Trust and containment statement |
| --- | --- | --- |
| Trusted config/JIT worker | Load project config and approved Angular/Formly scenario entries | Executes trusted repository code in a short-lived worker with policy/time/output controls; not an untrusted-code sandbox |
| AOT authoring browser worker | Build and observe real Angular components through a pinned application target | Executes trusted application code in isolated browser contexts; request/WebSocket interception improves determinism but is not an OS sandbox |
| Rootless OCI factory runner | Future application-factory execution | Required containment profile for code whose side effects must be constrained; blocked until conformance and negative controls pass |

## Agent-to-E2E consumer sequence

The consumer path remains intentionally pure until the browser boundary:

1. define the schema-addressed artifact-set envelope, then the owner-specific
   usage/journey and execution-authority records plus minimal synthetic
   walkthrough fixtures;
2. implement artifact-only usage/context/node/E2E-slice queries;
3. implement the typed intent schema, pure validator, canonical validated plan,
   exhaustive diagnostics, and hash;
4. prove the positive and negative synthetic walkthroughs inside CTX-2;
5. join the required real lineage/journey, behavior/scenario, Angular, and
   driver-registry producers into one redacted current context and run
   `CTX-GATE`;
6. expose the proven query and validation semantics through MCP;
7. add one native Playwright vertical;
8. add resolved custom/dynamic behavior; and
9. add repeater, browser-parity, and change-analysis coverage.

Steps 2 through 4 may run against synthetic Slice-0 records while real source,
Angular, behavior, and driver producers are implemented. MCP and Playwright do
not begin until `CTX-GATE` passes with the exact producer dependencies named in
the execution index. Factory execution is not a gate for this pilot and remains
separately blocked on its OCI contract.

Package ownership follows accepted ADR 0008:

- shared DTOs, runtime schemas, canonical serialization, hashes, intent types,
  and diagnostic policy: `@formly-contract/schema`;
- semantic extraction and trusted projection: `@formly-contract/compiler`;
- distributed discovery, generation, source indexing, and artifact assembly:
  `@formly-contract/workspace`;
- Angular-specific authoring and host integration: future
  `@formly-contract/angular`;
- progressive transport: future `@formly-contract/mcp`; and
- validated-plan compilation and drivers: future
  `@formly-contract/playwright`.

No separate `test-intent` package is planned.

## Dependency graph

```text
RH-06 canonical reconciliation
             |
             v
CTX-0A schema-addressed artifact-set envelope
        |
        +--> CTX-0B usage/journey records
        +--> CTX-0C execution-authority records
                    |
                 CTX-0D synthetic fixtures
                    |
             CTX-1 queries -> CTX-2 synthetic validator proof
                    |                     |
                    |    LIN-4 + BHV-4 + ANG-5 + DRV-0
                    |_____________________|
                              |
                    CTX-GATE real context pilot
                              |
                   MCP -> native Playwright -> custom/repeater
```

The Angular producer branch has its own compatibility-first ordering. The
factory execution branch remains blocked after safe inert projection until its
OCI gate passes. Nx may enumerate projects and schedule/cached targets, but it
does not define form, usage, journey, or behavior authority.

## First implementation checkpoint

The first production checkpoint is `CTX-0`, split into reviewable schema-first
packets but landed in dependency order:

1. an open schema-addressed artifact-set envelope, structured workspace-index
   anchor, repository-revision provenance, canonical set hash, and package
   Changeset;
2. source-usage and journey record schemas;
3. scenario references and exact execution-authority records for commit,
   assertion, transition, and repeater capture; and
4. minimal synthetic records for the RH-05 positive and negative walkthroughs.

Live freshness comparison/status and the query module boundary belong to
CTX-1. Stable diagnostic codes, phases, severity, typed locations, blocking
policy, remediation, and mixed-context validation belong to CTX-2. CTX-0A does
not freeze those later contracts.

It introduces no TypeScript source indexer, Angular host, MCP server, or
Playwright execution. Its exit test is strict validation, canonical
round-tripping, referential integrity, mutation rejection, and deterministic
fixture identity.

## Gates before broader implementation

- The shared schema must be dependency-free from TypeScript, Angular, MCP, and
  Playwright.
- Every selected ID must have exact referential-integrity tests.
- Unknown keys and unsupported versions must fail validation.
- Synthetic fixtures must be clearly labeled and cannot be reported as source,
  runtime, or workplace evidence.
- Source-lineage production waits for the representative leaf-tsconfig,
  project-reference, alias/barrel, lazy-route, privacy, and scale gate.
- Angular production waits for the schema-owned compatibility result and
  retained application-target fixture gate.
- Runtime factory execution waits for the rootless OCI conformance and negative
  controls.
- MCP and Playwright wait for the real `CTX-GATE`, which itself requires CTX-2,
  LIN-4, BHV-4, ANG-5, and DRV-0 evidence in one current pinned context.

## Decisions still requiring measured evidence

- exact cold/incremental time, memory, and artifact-size budgets for source
  indexing in a representative workplace topology;
- the default path disclosure mode for local versus remote consumers;
- the prevalence of export-list-only form factories and wrapper usages;
- workplace custom-field scaffold acceptance and authoring-time savings;
- the scenario sidecar's final public name and whether any stable subset enters
  a future Form Contract version; and
- the observed pilot threshold at which this system is more useful than a
  conventional hand-written Playwright test.

These are explicit gates, not reasons to block the shared pure foundation.

## Research traceability

| Research packet | Adopted decision | Deferred or rejected claim |
| --- | --- | --- |
| RH-01 source lineage | Direct anchored symbol index, sibling artifact, coverage/staleness/privacy, explicit usage/journey authority | Automatic complete journey inference |
| RH-02 factory/value semantics | Inert DTO/projector first, explicit dynamic unknowns, OCI gate for execution | Ordinary child process as containment; arbitrary provider execution |
| RH-03 Angular authoring | Compatibility-first AOT host, inventory/observations/scaffolds, reviewed profiles | DOM observation as semantic approval; browser interception as OS sandbox |
| RH-04 behavior/effects | Explicit business effects, bounded witnessed state rules, portable replay evidence | General callback/RxJS semantic interpretation |
| RH-05 agent-to-E2E | Fixture-first pure query/validator, pilot before transport/browser, exact execution records | Raw-selector/model module authority; package layout that conflicts with ADR 0008 |

## Completion criteria for RH-06

RH-06 is complete when the architecture, implementation plan,
workspace-discovery plan, v0.4 metadata spec, agent-context delivery plan, and
execution index all express this same ownership and dependency model; a
fresh-context review finds no contradictory executable sequence; repository
checks pass; and the first CTX-0 implementation packet has a bounded task
contract.
