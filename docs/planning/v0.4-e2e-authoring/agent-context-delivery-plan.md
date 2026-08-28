# Agent Context and Deterministic E2E Delivery Plan

**Status:** Reconciled with RH-06; `RH06-DOC` and `CTX-0A` through `CTX-0D`
are complete. `CTX-1` and `DRV-0` are ready. `LIN-0` is blocked on
representative workplace evidence, and `BHV-0` awaits explicit approval of ADR
0010.

**Decision:** Conditional go for a bounded contract/query/validator pilot

**Decision owner:** Repository maintainer

## Purpose

This document turns the completed RH-05 research into a concise consumer
delivery plan under the approved
[RH-06 reconciliation](../agent-context-hardening/rh-06-reconciliation.md).
The
[agent-context hardening execution index](../agent-context-hardening/execution-index.md)
is the canonical cross-plan scheduler. This plan covers the path from an
imprecise request such as
“add positive and negative tests for order entry step one” to validated,
deterministic Playwright execution without agent-invented selectors, values,
navigation, readiness waits, or application behavior.

RH-06 is an approved planning baseline, not a claim that the implementation or
a workplace pilot is ready. Detailed wire-shape proposals, evidence,
walkthroughs, alternatives, diagnostics, and review reconciliations remain in
[RH-05: Agent-to-Contract-to-Playwright Context Flow](../../research/hardening/agent-to-e2e-context-flow.md).

## Planning decision

Proceed incrementally with the shared contracts and refusal path first:

1. land `CTX-0A` through `CTX-0D`: shared strict schemas followed by explicitly
   synthetic walkthrough fixtures;
2. prove progressive in-memory discovery over immutable artifacts;
3. prove a strict typed-intent validator can produce a lossless plan or a
   precise refusal, with the positive/negative synthetic proof as the `CTX-2`
   exit gate; and
4. run the real representative producer/workplace `CTX-GATE` only after the
   canonical producer artifacts exist, before adding MCP transport or
   Playwright execution.

The pilot is successful only if it reduces guessing and review effort on a
representative form. The simpler fallback—source reading plus ordinary
hand-written Playwright—remains the correct path for one-off simple forms and
for any form the contract cannot safely operate.

Current confidence is high enough to begin the bounded pilot, not high enough
to claim production readiness. RH-05 estimates technical feasibility at
`0.88` and near-term net value at `0.72`; the latter must be replaced with
measured evidence from the pilot.

## Compatibility boundary

Form Contract `0.4.0` is the implemented compatibility boundary. The source,
journey, behavior/scenario, context-manifest, and driver-registry capabilities
in this plan begin as strict sibling record families; they are not new optional
fields on the v0.4 contract. Folding a stable subset into a later Form Contract
version requires a separate schema decision.

The v0.4 form tree, domains, profiles, locators, explicit effects, unknowns,
diagnostics, and canonical hashes remain authoritative within their existing
scope. This plan joins them by exact ID and hash rather than copying them into a
second aggregate contract.

## Evidence and review status

The plan is based on the current v0.4 schema/compiler/workspace implementation,
the Angular monorepo fixture and goldens, the approved E2E metadata
specification, and the completed field-profile, cross-field-effect,
source-lineage, locator, RH-04, and RH-05 research. RH-06 reconciles those
inputs and supersedes conflicting package, scenario, authority, and delivery
ownership statements in the individual research reports.

RH-05 underwent several independent-review cycles. The final retained
correction addressed the last accepted findings about cross-step authority,
typed ambiguity retries, and slice ownership. The final corrected artifact
passed repository checks and a focused contract audit, but it did not receive
another independent verdict after the configured review limit was exhausted.
That is sufficient evidence for the reversible shared-schema and synthetic
consumer work in `CTX-0A` through `CTX-2`; it is not evidence that the proposed
contracts work in production or that real producer artifacts are available.

## What the repository already provides

- deterministic form artifacts and a workspace index with stable form and node
  identities, content hashes, project/source provenance, and diagnostics;
- model paths, labels, constraints, options, value-domain completeness, and
  explicit unknowns;
- reviewed application-owned field interaction profiles for interactive custom
  controls, with driver identity, operations, semantic parts, wrapper
  prerequisites, readiness capabilities, and custom value projection;
- evidence-tagged node-local locators; and
- explicit cross-field effects with ordering, timing, readiness, endpoint, and
  completeness information.

These facts cover the middle of the journey. They do not yet prove which page,
route, component usage, or step a bug refers to; which trusted scenario is
current; how validation or value commitment becomes observable; or how a typed
intent becomes an executable, validator-approved driver plan.

## Required additions

The pilot requires the following metadata. It should not duplicate these facts
elsewhere or replace them with inferred browser behavior.

| Area | Minimum required authority | Owner |
| --- | --- | --- |
| Usage and lineage | Stable usage ID; form/project/source join; source path/span and symbol; consuming page/component; route/catalog evidence | `CTX-0B` schema; workspace/source-lineage producer |
| Journey | Exact entry and landing step; ordered step membership; action/outcome IDs; exact from/action/outcome/to transitions | `CTX-0B` schema; project authoring and workspace validation |
| Artifact pinning | Open schema-addressed inventory refs `{ schemaId, schemaVersion, contentHash }`; artifact-set `contentHash`; structured workspace-index anchor `{ schemaVersion, contentHash }` | `CTX-0A` schema-addressed envelope only |
| Live freshness | Compare the pinned owner references and basis hashes required by a query; report current/stale/unknown without treating repository revision as integrity proof | `CTX-1` pure query core |
| Scenario semantics | Portable JSON-safe conditions, causal edges, access prerequisites, replay cases, scoped completeness, and unknowns | RH-04; future sibling behavior/scenario schemas |
| Resolved scenario | Scenario ID/version; synthetic-input provenance; basis and resolved hashes; diagnostics; resolved node/domain/profile/state evidence | `BHV-4` / workspace Task 8 trusted producer; `CTX-0C` reference schema |
| Interaction | Exact reviewed profile/driver/version; operation; semantic part and target; codec; wrapper/readiness prerequisites; explicit disposition/unknown for display/assertion-only components until no-driver support is approved | Existing v0.4 profile authority plus reviewed producers |
| Commit and assertions | One commit authority; exact physical operation when explicit; post-commit value surface; validation activation and assertion surface; state assertion surface | `CTX-0C` schema, then node/usage producers |
| Repeater | Separate add and expand authority; exact item context for expand; exactly-one-created-item capture authority for add | `CTX-0C` schema, then profile/node producers |
| Unknowns and refusals | Stable code, phase, severity, blocking policy, typed location, and bounded remediation | `CTX-2` exhaustive consumer policy |

Useful later but not required for the pilot include ownership tags, change
history, broad scenario matrices, generated witness suggestions, observed
parity history, and coverage dashboards. Raw AST dumps, arbitrary source
snippets, callback source, customer values, inferred operational verbs,
agent-selected package paths, and heuristic selectors are not execution
authority.

Every executable context must pin those identities together. The artifact-set
envelope inventories open schema-addressed references rather than a closed
artifact-kind union or generic `id` field, and owns its own canonical
non-self-referential `contentHash`. The workspace index is a structured
`{ schemaVersion, contentHash }` anchor. Repository revision is required,
bounded, non-authoritative provenance; it is not freshness or mixed-context
integrity evidence.
`CTX-2` later fails closed when required owner references or basis hashes do
not agree, authoritative source coverage is incomplete, live freshness from
`CTX-1` is unknown where current evidence is required, or the driver registry
changed.

## Behavior and scenario ownership

The consumer flow does not create portable behavior semantics or resolved
scenarios:

1. RH-04 owns portable JSON-safe condition, behavior, access-prerequisite,
   replay-case, scoped-completeness, and unknown semantics in sibling record
   families.
2. `BHV-4` (workspace/Angular Task 8) owns trusted scenario compilation and
   produces a resolved artifact pinned to its basis Form Contract hash. It
   depends on guarded JIT-host capability `ANG-3`, the `ANG-2P`
   provider/project descriptor, portable behavior schema `BHV-1`, and
   publication of `CTX-0C` plus `CTX-0D`; `ANG-3` is capability, not a scenario
   producer.
3. Angular authoring and browser observations may corroborate a reviewed record
   or report drift, but cannot invent business meaning.
4. RH-05 and this plan own only references, projections, validation, planning,
   and later execution over those producer artifacts.

Effect authority is similarly narrow. Existing v0.4 explicit effects may
authorize named application/business verbs such as `loads`, `filters`,
`clears`, `toggles`, or `controls-state`. A closed normalized rule with a
witness pinned to the same evaluation semantics may authorize only the exact
derived state edge it proves, such as visibility or required state under one
condition. Callback, helper, hook, and RxJS scaffolds remain non-executable
evidence. No consumer may promote an observed delta or inferred dependency into
a business verb.

## Target flow

```text
bug text / source file / route / component / step
                         |
                  usage discovery
                         |
            explicit candidates + evidence
                         |
               pinned context summary
                         |
          focused nodes + prerequisite closure
                         |
                  typed test intent
                         |
          strict validation: plan or refusal
                         |
          trusted compilation and execution
                         |
              parity-safe result/diagnostic
```

Progressive disclosure is mandatory. Search returns compact candidates;
summary returns identity, freshness, and blockers; focused queries return only
the requested nodes and their complete executable prerequisite closure. Atomic
closures are complete or refused, never silently truncated.

## Non-negotiable invariants

- The agent supplies semantic IDs and typed values or policies, never CSS,
  XPath, raw Playwright locators, callbacks, or driver module paths.
- Queries read validated immutable artifacts and do not load Angular, form
  factories, scenarios, configuration modules, or driver code.
- Every selected driver, target, commit, wrapper operation, readiness action,
  repeater item, state/validation assertion, journey action, outcome, and
  transition survives validation as an exact versioned plan reference.
- A plan hash is content identity, not approval. Compilation reruns complete
  semantic validation against the pinned context before any registry lookup.
- Journey state starts at the exact declared landing step and changes only
  through an exact declared transition.
- Ambiguity produces stable candidate IDs that a legal typed retry can select;
  no consumer chooses the first candidate or defaults to row zero.
- Dynamic values, hidden branches, async readiness, and incomplete effect
  coverage remain blocked unless a trusted declared or resolved capability
  supports them.
- Explicit v0.4 effects authorize business verbs. A witnessed closed normalized
  rule authorizes only its exact state edge; opaque code and observations never
  acquire broader effect authority.
- DOM value alone does not prove model commitment. Tests require the declared
  commit authority and a post-commit assertion surface.
- Diagnostics use one exhaustive, versioned policy. Producer-chosen severity,
  blocking behavior, messages, or remediation are not accepted on the wire.
- Presentation strings and runtime artifacts are untrusted and potentially
  sensitive. Results, traces, screenshots, and network data require bounded,
  project-owned retention and redaction policy.

## Delivery sequence

```text
RH06-DOC
   |
CTX-0A schema-addressed artifact-set envelope/workspace-index anchor
   |-----------------------|
CTX-0B usage/journey       CTX-0C scenario refs/execution authority
   |_______________________|
              |
CTX-0D explicitly synthetic walkthrough fixtures
              |
CTX-1 pure projection/query core
              |
CTX-2 typed intent and pure validator
    (synthetic positive/negative proof) ----------------\
                                                        +-> CTX-GATE real context
LIN-4 + BHV-4 + ANG-5 + DRV-0 ------------------------/
                                                                  |
               MCP-1 -> PW-1 native -> PW-2 custom/dynamic -> PW-3 repeater/parity
```

This is only a consumer-spine summary. The
[execution index](../agent-context-hardening/execution-index.md) is normative
for every producer dependency and readiness state.

### `CTX-0A` through `CTX-0D` — Shared-contract checkpoint

Land the checkpoint as four reviewable packets:

1. `CTX-0A` defines only the open schema-addressed pinned artifact-set envelope,
   its own set `contentHash`, and the structured workspace-index
   `{ schemaVersion, contentHash }` anchor. Its references are
   `{ schemaId, schemaVersion, contentHash }`; it also includes the required
   schema package Changeset. It does not define execution authority, live
   freshness status, diagnostic policy, or the query module boundary.
2. `CTX-0B`, after `CTX-0A`, defines source-usage and journey records.
3. `CTX-0C`, after `CTX-0A`, defines scenario references and exact execution
   authority for commits, assertions, actions, transitions, and repeater
   capture.
4. `CTX-0D`, after both `CTX-0B` and `CTX-0C`, adds only the minimum positive
   and negative RH-05 walkthrough records. Every such record is explicitly
   marked synthetic.

This checkpoint adds schemas and synthetic evidence, not a TypeScript indexer,
Angular host, real usage/scenario producer, MCP server, validator, or
Playwright driver.

**Exit gate:** strict validation, canonical round-tripping, version and
unknown-key refusal, hash-mutation rejection, exact referential integrity, and
deterministic synthetic fixture identity pass. The fixtures must not be
reported as source, runtime, or workplace evidence.

### `CTX-1` — Pure progressive query core

Implement in-memory projections for usage search, context summary, node search,
and a single-step E2E slice over validated fixture JSON. The core owns strict
input/output schemas, path confinement, bounded projections, collection-named
cursors, complete-or-refuse atomic closures, the pure query module-boundary
selection, and live freshness comparison/status over pinned owner references
and basis hashes. It has no MCP or application runtime dependency.

**Exit gate:** both walkthroughs obtain all required context without loading a
whole contract. Pagination is deterministic and resumable for one named
collection at a time; secondary records are complete atomic metadata; oversized
atomic records and closures refuse without partial payloads; cross-step focus,
cycles, stale context, and ambiguity produce exact diagnostics.

### `CTX-2` — Typed intent and pure validator

Define the strict intent DTO, canonical validated-plan DTO, exhaustive
diagnostic policy, and pure semantic validator. Valid intent produces a
lossless hashable plan; blocked intent produces diagnostics and no plan. This
slice returns no Playwright code and uses the Slice 1 core directly rather than
MCP transport.

**Exit gate:** the positive and negative walkthrough intents round-trip through
runtime schemas and canonical serialization. All selected execution authority
is present in the plan. Staleness, ordering, unknown values, missing scenarios,
unsupported profiles/targets/commits/assertions/transitions, hidden fields,
repeater ambiguity, and caller-rehashed mutations fail with their exact policy
before any registry lookup. This is the synthetic positive/negative proof; it
is not deferred to `CTX-GATE`.

### `CTX-GATE` — Real representative producer/workplace context gate

Run only after `CTX-2`, `LIN-4`, `BHV-4`, `ANG-5`, and `DRV-0` have produced
the required canonical artifacts and joined them into one current pinned
representative context. Stop and review before transport or browser execution.
Measure:

- ambiguity and refusal rates, including whether remediation is actionable;
- query payload size and number of progressive requests;
- exact valid/refusal results and canonical-plan stability on the real
  representative context;
- metadata authoring and review time plus first-run success against a real
  usage; and
- comparison with an ordinary hand-written Playwright test and the provisional
  70-percent target for nodes that validate without a new application-specific
  driver.

Synthetic records prove consumer semantics at `CTX-2`; they cannot satisfy
this gate. The 70-percent threshold remains an unmeasured hypothesis until this
gate replaces it with observed data.

### `MCP-1` — MCP transport adapter

Expose the already-proven Slice 1 query semantics and Slice 2 validation
through read-only MCP tools. Transport does not change the schemas, select
records, or execute trusted application code. It begins only after a
`CTX-GATE` go decision. `MCP-1` is a required scheduler predecessor for
`PW-1`, even though both may share the same pure semantic core internally.

**Exit gate:** tool results conform to the same runtime output schemas,
pagination/cursor pinning remains deterministic, and transport adds no new
authority or data exposure.

### `PW-1` — Native Playwright vertical

Add one usage-entry driver and the smallest built-in fill/select/check,
commit, value, validation, and state assertion implementations. Compile only a
resubmitted plan that passes full semantic revalidation against the pinned
context. Per the execution index, it schedules only after both a `CTX-GATE` go
decision and `MCP-1`. Its implementation may consume the proven pure core
internally, but that is not an alternate scheduler edge and MCP transport is
not semantic execution authority.

**Exit gate:** one positive and one negative native fixture test pass repeatedly
without raw selectors in intent or generated source. Immediate, explicit-blur,
and usage-action commit modes are covered; assertions prove post-commit state;
and a shared physical blur used for commit and validation activation executes
exactly once.

### `PW-2` — Resolved custom/dynamic vertical

Consume trusted resolved scenario and behavior artifacts produced by `BHV-4`
(workspace/Angular Task 8) and the RH-04 behavior lane. Add exact custom-part
targets, runtime value/readiness capabilities, wrapper prerequisites, and
application drivers for the conditional custom-field walkthrough. This
consumer slice does not generate scenario semantics or resolved artifacts.
It begins only after `PW-1` and the required Angular/behavior producer evidence.

**Exit gate:** the custom/dynamic negative walkthrough passes, and removal of
each required metadata item produces the expected blocker. Unsafe or unsettled
dynamic providers remain blocked.

### `PW-3` — Repeaters, parity, and change analysis

Implement browser conformance for already-versioned add/capture/expand
contracts, then add observed role/locator/state parity, source-to-contract
change impact, and privacy-safe failure artifacts.
It begins only after `PW-2` and the browser-conformance prerequisite.

**Exit gate:** a representative repeater remains deterministic as row count and
DOM structure change; add captures exactly one created item, expand is scoped
to one exact existing or created item, and parity failures name the responsible
contract/profile without exposing sensitive values.

## Package ownership

| Concern | Primary owner | Must not own |
| --- | --- | --- |
| Versioned DTOs, runtime schemas, canonical serialization, hashes, intent types, and diagnostic policy | `@formly-contract/schema` | TypeScript, Angular, MCP, or Playwright dependencies |
| Semantic extraction and trusted form projection | `@formly-contract/compiler` | Distributed discovery, agent transport, or browser execution |
| Distributed discovery, source indexing, generation, and artifact assembly | `@formly-contract/workspace` | Business-journey inference or query-time application execution |
| Angular-specific authoring and host integration | future `@formly-contract/angular` | Automatic semantic approval or whole-process sandbox claims |
| Progressive read-only transport | future `@formly-contract/mcp` | Config/scenario loading, semantic selection, or drivers |
| Exact validated-plan compilation and browser operations | future `@formly-contract/playwright` | Query/discovery authority or agent-selected modules |

There is no separate `@formly-contract/test-intent` package and no
`@formly-contract/playwright-driver` package. `CTX-1` selects the smallest
schema-backed pure module boundary for query behavior without inventing another
published package; `CTX-2` adds validation against that boundary. This follows
[ADR 0008](../../decisions/0008-package-rename.md).

When a slice spans owners, land the shared schema and failing contract tests
before producer or consumer behavior. Each future task should leave the
workspace buildable and should avoid unrelated public-interface changes.

## Findings carried into the plan

| Review theme | Planning resolution |
| --- | --- |
| Lossy validator-to-compiler handoff | Use a closed plan-step union with exact bindings and complete semantic revalidation before registry lookup. |
| Blur/commit false positives | Model commit and validation activation as separate approved authorities, allow one linked physical operation, and require post-commit assertions. |
| Incomplete diagnostics | Own one exhaustive schema-backed policy with fixed phase, severity, blocking, location, and remediation for every exposed code. |
| Ambiguous or unusable pagination | Page one named collection per request; repeat bounded secondary metadata atomically; complete or refuse atomic views and oversized records. |
| Cross-step ambiguity | Pin entry landing, current-step bindings, and exact from/action/outcome/to transitions; reject cross-step focus without declared authority. |
| Repeater guessing | Split add from expand, require exact row context for expand, and make one capture record authoritative for a newly added item. |
| No legal ambiguity retry | Carry optional exact assertion, capture, and transition IDs in typed intent; omission succeeds only for one compatible record. |
| Slice ownership mismatch | `CTX-0A` owns only the artifact-set envelope/workspace-index anchor; `CTX-0B`–`CTX-0C` own semantic schemas; `CTX-0D` owns explicitly synthetic fixtures; `CTX-1` owns pure queries and live freshness status; `CTX-2` owns validation and exhaustive consumer diagnostics. Real producers remain separate, and transport follows the real-context gate. |
| Scenario ownership ambiguity | RH-04 owns portable semantics; workspace/Angular Task 8 owns resolved production; RH-05 consumes exact references and never produces scenarios. |
| Over-broad derived-effect authority | v0.4 declarations retain business verbs; witnessed normalized rules authorize only exact state edges; opaque or observed evidence remains non-executable. |

## Stop or narrow conditions

Stop the broad flow, retain the safe pieces, and use ordinary Playwright where
appropriate if the pilot shows any of the following:

- usage/step metadata materially duplicates routing or page structure and
  drifts faster than it can be reviewed;
- scenario generation requires production data, unrestricted network access,
  or non-deterministic providers;
- most target nodes remain blocked without bespoke drivers;
- agents or maintainers routinely seek raw-selector escape hatches;
- first-run success and review effort do not materially improve; or
- privacy controls cannot prevent customer values, secrets, option payloads,
  screenshots, traces, or network bodies from entering model context or
  retained artifacts.

The design is intentionally reversible. `CTX-0A` through `CTX-2` can still
provide useful discovery and early refusal even if broad Playwright compilation
does not earn its maintenance cost.

## Open pilot questions

- What usage and journey metadata can be derived from existing registered
  application configuration, and what must remain explicitly maintained?
- Can trusted scenario generation settle async options without production data
  or remote services, including cancellation, empty, and error states?
- What percentage of native and custom fields can use shared drivers?
- How stable are exact custom-part locators and accessible roles under real UI
  library changes?
- What redaction and retention policy is required for screenshots, video,
  traces, and runtime-selected values?
- Does progressive disclosure save enough model context and review time on a
  large form to justify its query complexity?

These are measurement questions for the pilot, not reasons for more paper
contract expansion before `CTX-0A`.

## Task-dispatch readiness

The approved RH-06 planning baseline first made `CTX-0A` eligible. The complete
shared checkpoint now comprises `CTX-0A` through `CTX-0D`; `CTX-1` and `DRV-0`
are the independently ready next packets. Each packet must state:

- the exact contract and package owner;
- dependencies and base commit;
- in-scope and prohibited changes;
- acceptance criteria and expected refusal cases;
- focused and repository-wide verification;
- migration and compatibility implications; and
- evidence required at the next stop/go gate.

The completed shared checkpoint preserves its ownership boundaries: `CTX-0A`
owns the open schema-addressed pinned artifact-set envelope; `CTX-0B` owns
source-usage/journey records; `CTX-0C` owns scenario/execution-authority
records; and `CTX-0D` owns only deterministic, explicitly synthetic RH-05
fixtures. It includes no producer runtime code, MCP, Playwright, or workplace
evidence.

## Planning acceptance

High-level planning is reconciled when the maintainer agrees to:

- the conditional `CTX-0A` through `CTX-2` pilot rather than full
  implementation approval;
- ADR 0008 package ownership and the execution-index dependency order above;
- the no-selector, no-guess, complete-or-refuse, and privacy invariants;
- one public synthetic positive/negative walkthrough as the first target; and
- the real representative `CTX-GATE`, requiring `CTX-2`, `LIN-4`, `BHV-4`,
  `ANG-5`, and `DRV-0`, before MCP transport or browser-driver expansion.

Those points are now represented in RH-06. `CTX-0A` through `CTX-0D` are
complete; dispatch `CTX-1` and `DRV-0` independently, while all other tasks
remain governed by the execution index.
