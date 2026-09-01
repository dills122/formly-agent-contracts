# Agent Context Hardening Execution Index

- Status: Active
- Canonical decision: [RH-06 reconciliation](rh-06-reconciliation.md)
- Detailed evidence: RH-01 through RH-05 under `docs/research/hardening/`

## How to use this index

This file is the stable cross-plan scheduler. Research task numbers remain in
their original reports for evidence traceability, while implementation uses the
IDs below. A task may begin only when every dependency is complete and its exit
gate has a named verification command or retained evidence artifact.
Dependencies and readiness in this index are normative: supporting plans map
their historical task numbers to these IDs and must not add hidden scheduler
prerequisites. If mapping prose disagrees, this index must be corrected first.

Status values are `complete`, `ready`, `blocked`, and `pending`. “Blocked” names
a real unsatisfied gate; “pending” simply means a predecessor is not complete.

## Foundation

| ID         | Scope                                                                        | Primary owner              | Depends on          | Status   | Exit gate                                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------- | -------------------------- | ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RH06-DOC` | Reconcile canonical architecture and plans                                   | Documentation/architecture | RH-01 through RH-05 | complete | Canonical docs agree; review instance 3 returned ready with non-blocking follow-ups; final repository checks pass                                                                                    |
| `CTX-0A`   | Schema-addressed artifact-set envelope and structured workspace-index anchor | `packages/schema`          | `RH06-DOC`          | complete | 60 focused tests, schema build/lint, fresh review, package Changeset, and full `pnpm check` pass                                                                                                     |
| `CTX-0B`   | Source-usage and journey records                                             | `packages/schema`          | `CTX-0A`            | complete | 48 focused tests, schema typecheck/lint, privacy/identity plus bounded-input and numeric-normalization regressions, and focused post-fix review                                                      |
| `CTX-0C`   | Scenario refs and exact execution-authority records                          | `packages/schema`          | `CTX-0A`            | complete | 51 focused tests, schema typecheck/lint, authority mutation plus bounded-input and numeric-normalization regressions, and focused post-fix review                                                    |
| `CTX-0D`   | Minimal synthetic positive/negative walkthrough fixtures                     | Schema test fixtures       | `CTX-0B`, `CTX-0C`  | complete | 31 focused and 190 integrated `CTX-0A`–`CTX-0D` tests, bounded exact synthetic-boundary and cross-family projection validation, schema typecheck/lint, and three-pass independent-review remediation |

`CTX-0A` through `CTX-0D` are one shared-contract checkpoint and must land in
that dependency order. They add no runtime execution.

## Form and custom-field authoring authority

| ID           | Scope                                                                                                                                                               | Primary owner                         | Depends on           | Status   | Exit gate                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH-PILOT` | Bounded public radio-choice contracted adapter, real-registration binding, immutable declaration snapshot, and canonical registry lowering                         | `packages/schema`                     | `CTX-0A`             | complete | [ADR 0011 bounded MVP decision](../../decisions/0011-named-formly-environments-and-contracted-field-adapters.md#accepted-bounded-mvp-decision) plus `PILOT-2`/`PILOT-4` verification pass |
| `AUTH-0`     | Approve named Formly environments, broader contracted field adapters, generated canonical profile registries, conformance-based actionability, and legacy migration | Schema/workspace/Angular architecture | `RH06-DOC`           | ready    | [ADR 0011](../../decisions/0011-named-formly-environments-and-contracted-field-adapters.md) is fully accepted and the supporting plans agree |
| `AUTH-MIG-1` | Confirm removal of legacy project `fieldTypeProfiles` at workspace-config `1.0.0`, or amend ADR 0011 with measured extension evidence                               | Architecture/maintainer               | `AUTH-0`, `ANG-GATE` | pending  | Default removal stands, or one explicit evidence-backed ADR amendment names a replacement deadline                                     |

`AUTH-PILOT` is an explicit maintainer-approved exception for the narrow,
tested `radioChoice()` authoring surface. It does not authorize named
environments, additional behavior families, or conformance claims. `AUTH-0`
changes the future custom-field authoring source of truth, not the
implemented Form Contract `0.4.0` registry/compiler boundary or the already
settled semantic-form/source/root-symbol/fragment distinction. `CTX-0B`,
`CTX-0C`, and the lineage lane do not depend on this decision. Angular
environment, adapter, registry-generation, and conformance implementation may
not begin until it is accepted.

## Pure consumers

| ID         | Scope                                                                                                            | Primary owner                                                                        | Depends on                                  | Status  | Exit gate                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CTX-1`    | Pure progressive usage/context/node/E2E-slice query core, including live freshness comparison/status             | Schema-backed pure module boundary selected in this task                             | `CTX-0D`                                    | complete | Both CTX-0D slices, complete-or-refuse projections, bounded pagination, staleness/ambiguity, package publication, and a measured 512-node progressive-disclosure gate pass |
| `CTX-2`    | Typed intent, pure validator, canonical plan, and exhaustive stable diagnostic DTO/policy                        | `packages/schema`; see the [CTX-2 task packet](ctx-2-spec.md)                         | `CTX-1`                                     | MVP complete; aggregate in progress | Both synthetic walkthroughs validate and bind exact trusted calls after revalidation; no driver invocation or browser execution |
| `DRV-0`    | Hash-addressed driver-registry manifest and native/application registration inventory, without browser execution | `packages/schema` plus private experimental `@formly-contract/playwright`            | `CTX-0C`                                    | ready   | Exact driver IDs, versions, capabilities, registry hash, duplicate/refusal, and no agent-selected modules                                                                 |
| `CTX-GATE` | Real representative producer/workplace context pilot                                                             | Maintainer/research                                                                  | `CTX-2`, `LIN-4`, `BHV-4`, `ANG-5`, `DRV-0` | pending | One redacted current pinned context proves exact usage/journey selection, complete-or-refuse planning, payload/remediation value, and retained producer coverage evidence |
| `MCP-1`    | Read-only MCP transport adapter                                                                                  | future `@formly-contract/mcp`                                                        | `CTX-GATE` go                               | pending | Transport exactly preserves pure query/validation semantics                                                                                                               |
| `PW-1`     | Native positive/negative Playwright vertical                                                                     | future `@formly-contract/playwright`                                                 | `MCP-1`, `CTX-GATE` go                      | pending | No raw selectors; exact revalidation and stable browser tests                                                                                                             |
| `PW-2`     | Custom/dynamic vertical                                                                                          | future `@formly-contract/playwright` plus app registry                               | `PW-1`, Angular/behavior producer evidence  | pending | Required metadata removals produce exact blockers                                                                                                                         |
| `PW-3`     | Repeater, parity, and change-analysis vertical                                                                   | future `@formly-contract/playwright`                                                 | `PW-2`, browser conformance                 | pending | Exact created-item capture and scoped expansion survive DOM/count changes                                                                                                 |

`DRV-0A/B` and the private-package `DRV-0C1` implementation inventory are
complete. `CTX-2D1` now completes the bounded DRV-0C2 binding for every current
validated-plan step after full semantic revalidation. Aggregate `DRV-0`
intentionally remains `ready`, not `complete`, until `CTX-2D2` can produce and
prove the fifth reserved capability, `activate-wrapper`. The `ready` aggregate
status records that its implemented packets are usable while preserving that
remaining dependency.

## Source lineage producer

| ID          | Scope                                                                    | Primary owner                                         | Depends on                            | Status   | Exit gate                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIN-PILOT` | Bounded direct exported root anchor, dual-Program source-usage index, exact contract/hash query, and fail-closed diagnostics | `packages/workspace`                                  | `CTX-0B`, maintainer MVP authorization | complete | [Workplace MVP pilot](../workplace-mvp-pilot/execution-index.md) acceptance demo, focused adversarial tests, Nx AOT, and packed-consumer checks pass |
| `LIN-0`     | Representative workplace topology, scale, privacy, and convention gate   | `packages/workspace` fixtures/research                | `RH06-DOC`                            | blocked  | [Harness and public rehearsal pass](../../research/hardening/lin-0-workplace-gate.md), but the retained decision is `inconclusive` until the sanitized representative workplace evidence is measured |
| `LIN-1`     | General typed form definition/root anchor beyond the bounded pilot grammar | `packages/workspace`                                 | `CTX-0A`, `LIN-0` go                  | pending  | Direct function/class/callable-const anchors and negative grammar fixtures across representative workplace topology                                                                                  |
| `LIN-2`     | General per-leaf TypeScript index and aggregate source-lineage artifact  | `packages/workspace`                                  | `CTX-0B`, `LIN-1`                     | pending  | Exact/ambiguous/unresolved, overlap, coverage, staleness, privacy tests across the approved general scope                                                                                            |
| `LIN-3`     | Compact artifact-only lineage queries                                    | pure query layer                                      | `LIN-2`, `CTX-1`                      | pending  | Exact, stale, incomplete, ambiguous, paged outcomes; no source execution at request time                                                                                                             |
| `LIN-4`     | Bounded component/route enrichment and reviewed usage/journey attachment | workspace/Angular contributors plus project authoring | `LIN-2`, journey schema from `CTX-0B` | pending  | One exact real usage/journey can be selected; dynamic cases remain unknown; attachments pass strict integrity tests                                                                                  |

`LIN-PILOT` authorizes the current direct-call workplace MVP only. It neither
satisfies the representative `LIN-0` scale/topology gate nor promotes the
general `LIN-1` through `LIN-4` roadmap.

## Framework-neutral workspace runtime host

These IDs make the workspace execution substrate an explicit producer
prerequisite instead of hiding it inside the Angular task graph. Historical
workspace task numbers remain unchanged; Task 7A.1 is already complete and is
the portable provenance foundation consumed by `HOST-1`.

| ID       | Workspace-plan mapping | Scope                                                                         | Primary owner        | Depends on         | Status  | Exit gate                                                                                                            |
| -------- | ---------------------- | ----------------------------------------------------------------------------- | -------------------- | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `HOST-1` | Task 7A.2              | Framework-neutral runtime-host protocol and public/private package boundaries | `packages/workspace` | `CTX-0A`           | ready   | Strict IPC/host DTOs, Angular-free public composition, packed private worker, and non-hoisted consumer checks pass   |
| `HOST-2` | Task 7B.1              | Discovery and inventory before project evaluation                             | `packages/workspace` | `HOST-1`           | pending | Import-free discovery, parent-selected host requests, duplicate rejection, and list-without-factory tests pass       |
| `HOST-3` | Task 7B.2              | Trusted-local worker lifecycle                                                | `packages/workspace` | `HOST-2`           | pending | Scrubbed spawn, validated IPC, bounded teardown, failure controls, and no-publication authority tests pass           |
| `HOST-4` | Task 7B.3              | Failure-safe aggregation and publication                                      | `packages/workspace` | `HOST-3`, `CTX-0A` | pending | Parent revalidation, deterministic aggregation, atomic index-last publication, fault injection, and rerun tests pass |

## Angular custom-field and scenario producer

| ID         | Scope                                                                                                                                                      | Primary owner                                                 | Depends on                                               | Status  | Exit gate                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANG-0`    | Schema-owned Angular host compatibility result                                                                                                             | `packages/schema`                                             | `CTX-0A`                                                 | ready   | Strict pass/fail result, environment identity, canonical/refinement tests                                                                                                             |
| `ANG-1`    | Retained Angular CLI/Nx application-target compatibility gate                                                                                              | fixtures/research                                             | `ANG-0`                                                  | pending | Partial library, resources, standalone/NgModule, scopes, popup/model/teardown cases pass                                                                                              |
| `ANG-2`    | Task 7A.3 dependency-light Angular package shell                                                                                                           | future `@formly-contract/angular`                             | `ANG-1` go, `HOST-1`                                     | pending | Node-safe `./jit` and `./authoring` package entry points build; generic discovery stays Angular-free                                                                                  |
| `ANG-2P`   | Task 7D Angular source-group providers plus Node-safe named-environment descriptors and exact project selection                                            | future `@formly-contract/angular`; workspace config           | `ANG-2`, `CTX-0A`, `AUTH-0` accepted                     | pending | Provider catalogs and confined environment/catalog pointers validate without importing Angular from generic discovery                                                                 |
| `ANG-2R`   | Task 8B.1 schema-owned environment, compact adapter/preset, generated-registry manifest, report, scaffold, and conformance contracts                       | `packages/schema`                                             | `CTX-0A`, `ANG-1` go, `AUTH-0` accepted                  | pending | Strict schemas, dispositions, exact references, evidence, coverage, canonicalization, conformance states, and mutation tests pass                                                     |
| `ANG-3`    | Task 7C guarded trusted config/JIT host capability only                                                                                                    | Angular/workspace worker                                      | `ANG-2`, `HOST-4`                                        | pending | Short-lived policy/time/output controls and deterministic teardown; no scenario semantics or publication                                                                              |
| `ANG-4`    | Task 8B.2 isolated AOT authoring browser host and exact named-environment/Formly scope inventory                                                           | future `@formly-contract/angular`                             | `ANG-2`, `ANG-2P`, `ANG-2R`                              | pending | Fresh contexts, public APIs, exact registration/scope coverage, explicit refusals                                                                                                     |
| `ANG-5`    | Deterministic adapter aggregation and lowering, controlled-example conformance, generated canonical registry publication, and optional migration scaffolds | future `@formly-contract/angular` plus pure compiler lowering | `ANG-4`; `LIN-2` only for optional source/template joins | pending | Exact environment bundle and registry hashes, required actionability conformance, fail-closed gaps/conflicts, stable optional scaffolds, and no observation-based authority promotion |
| `ANG-GATE` | Workplace custom-field value pilot                                                                                                                         | maintainer/research                                           | `ANG-5`                                                  | pending | Coverage, configuration effort, ambiguity, review time, and saved work measured                                                                                                       |
| `ANG-6`    | Optional expanded registry-bound drift and browser-parity conformance beyond the required adapter publication gate                                         | future `@formly-contract/angular`                             | `ANG-GATE` go, `BHV-4`                                   | pending | Reviewed parts/roles/codecs/scenarios match rendered behavior without authority promotion                                                                                             |

## Behavior and scenario semantics

| ID         | Scope                                                                     | Primary owner            | Depends on                                     | Status  | Exit gate                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BHV-0`    | Approve portable behavior/scenario artifact topology and authority matrix | schema/architecture      | `RH06-DOC`                                     | ready   | [ADR 0010](../../decisions/0010-portable-behavior-scenario-authority.md) is proposed; explicit effects, derived state edges, observations, and completeness have disjoint rules |
| `BHV-1`    | Closed normalized-condition and behavior schemas                          | `packages/schema`        | `CTX-0A`, `BHV-0`                              | pending | Strict validators, relative path semantics, facet/scope completeness, unknown tests                                                                                             |
| `BHV-2`    | Lossless v0.4 effect/profile/repeater projections                         | compiler/workspace       | `BHV-1`                                        | pending | Current explicit effects retain IDs, parts, ordering, readiness, and wildcard targets                                                                                           |
| `BHV-3`    | Bounded static rule derivation and conservative callback/hook scaffolds   | compiler/workspace       | `BHV-2`                                        | pending | Differential tests for accepted grammar; helpers/imports/pipelines refuse                                                                                                       |
| `BHV-4`    | Replay scenario authoring and trusted resolved evidence                   | workspace/Angular Task 8 | `BHV-1`, `CTX-0C`, `CTX-0D`, `ANG-3`, `ANG-2P` | pending | JSON-safe cases remain separate from trusted callbacks; exact basis hashes, resolved hashes, and deltas                                                                         |
| `BHV-GATE` | Redacted workplace construct-frequency and scaffold-acceptance pilot      | maintainer/research      | `BHV-3`, `BHV-4`                               | pending | Evidence supports or narrows AST coverage before expansion                                                                                                                      |

## Factory and dynamic-value producer

| ID      | Scope                                                                      | Primary owner               | Depends on | Status  | Exit gate                                                                       |
| ------- | -------------------------------------------------------------------------- | --------------------------- | ---------- | ------- | ------------------------------------------------------------------------------- |
| `FAC-1` | Inert binding DTOs, validation, value-domain semantics, and pure projector | schema/compiler             | `CTX-0A`   | ready   | Synthetic fixtures classify values/capabilities without application execution   |
| `FAC-2` | Code-free sidecar and structural identity gate                             | workspace/compiler          | `FAC-1`    | pending | Runner receives no executable config; form identity remains exact               |
| `FAC-3` | Rootless OCI provider conformance and retained negative controls           | external execution provider | `FAC-2`    | blocked | `oci-rootless-v1`, catch-resistant ledger, isolation and negative controls pass |
| `FAC-4` | Opt-in application factory execution                                       | workspace provider          | `FAC-3` go | pending | Deterministic bounded artifacts; all violations owned and reported by runner    |

## Nx integration

Nx is an optional enumerator, scheduler, cache, and affected-execution layer.
It can advance after the generic/Angular producer APIs stabilize. It never
defines semantic form IDs, source-use identity, journey meaning, or behavior
authority. The existing Nx fixture remains valuable as compatibility and
topology evidence before a public Nx package is necessary.

## Immediate dispatch rule

`CTX-0A` through `CTX-1` are complete. `CTX-2` is in progress under its
[traceable task packet](ctx-2-spec.md); it also supplies the validated
plan/call ABI now completed by `CTX-2D1`/`DRV-0C2`. The task packet
records the discovered value-semantics authority gap rather than permitting
the validator to infer codecs, runtime enumeration, or invalid-value
construction. Its CTX-2A/B/C MVP checkpoint is complete; executable wrapper
preconditions, CTX-2V/2D2, and browser/runtime parity are explicit fast
follows, with no pivot currently required. Hostile-input hardening for the
standalone plan-hash helper is complete and preserves valid canonical hashes
while keeping revalidation as the semantic authority boundary. `HOST-1`,
`ANG-0`, and `FAC-1` are also
dependency-ready, but they remain separate producer task packets and must not
freeze named-environment or adapter-authority APIs beyond the accepted
`AUTH-PILOT` surface before `AUTH-0` is accepted. `LIN-PILOT` is complete;
`LIN-0` remains blocked on its representative workplace run. `BHV-0` and the
full `AUTH-0` remain ready for explicit maintainer approval of ADRs 0010 and
0011. MCP and Playwright remain pending their named context and producer gates.
