# Agent Context and Deterministic E2E Delivery Plan

**Status:** High-level planning ready; implementation tasks not yet dispatched

**Decision:** Conditional go for a bounded contract/query/validator pilot

**Decision owner:** Repository maintainer

## Purpose

This document turns the completed RH-05 research into a concise delivery plan.
It is the planning entry point for moving from an imprecise request such as
“add positive and negative tests for order entry step one” to validated,
deterministic Playwright execution without agent-invented selectors, values,
navigation, readiness waits, or application behavior.

This is not a production implementation authorization and does not assign work
to individual agents. Detailed wire-shape proposals, evidence, walkthroughs,
alternatives, diagnostics, and review reconciliations remain in
[RH-05: Agent-to-Contract-to-Playwright Context Flow](../../research/hardening/agent-to-e2e-context-flow.md).

## Planning decision

Proceed incrementally with the contract and refusal path first:

1. define the missing source-authority records and fixture evidence;
2. prove progressive in-memory discovery over immutable artifacts;
3. prove a strict typed-intent validator can produce a lossless plan or a
   precise refusal; and
4. measure that pilot before adding MCP transport or Playwright execution.

The pilot is successful only if it reduces guessing and review effort on a
representative form. The simpler fallback—source reading plus ordinary
hand-written Playwright—remains the correct path for one-off simple forms and
for any form the contract cannot safely operate.

Current confidence is high enough to begin the bounded pilot, not high enough
to claim production readiness. RH-05 estimates technical feasibility at
`0.88` and near-term net value at `0.72`; the latter must be replaced with
measured evidence from the pilot.

## Evidence and review status

The plan is based on the current v0.4 schema/compiler/workspace implementation,
the Angular monorepo fixture and goldens, the approved E2E metadata
specification, and the completed field-profile, cross-field-effect,
source-lineage, locator, and RH-05 research.

RH-05 underwent several independent-review cycles. The final retained
correction addressed the last accepted findings about cross-step authority,
typed ambiguity retries, and slice ownership. The final corrected artifact
passed repository checks and a focused contract audit, but it did not receive
another independent verdict after the configured review limit was exhausted.
That is sufficient evidence to start a reversible experimental pilot; it is
not evidence that the proposed contracts work in production.

## What the repository already provides

- deterministic form artifacts and a workspace index with stable form and node
  identities, content hashes, project/source provenance, and diagnostics;
- model paths, labels, constraints, options, value-domain completeness, and
  explicit unknowns;
- application-owned field interaction profiles with driver identity,
  operations, semantic parts, wrapper prerequisites, readiness capabilities,
  and custom value projection;
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
| Usage and lineage | Stable usage ID; form/project/source join; source path/span and symbol; consuming page/component; route/catalog evidence | Workspace/compiler artifact producer |
| Journey | Exact entry and landing step; ordered step membership; action/outcome IDs; exact from/action/outcome/to transitions | Usage/journey schema and producer |
| Freshness | Schema version; build ID; repository revision; source-input digest; form, usage, scenario, and registry hashes | Shared schema and artifact envelope |
| Scenario | Scenario ID/version; synthetic-input provenance; basis and resolved hashes; diagnostics; resolved node/domain/profile/effect state | Trusted generation boundary |
| Interaction | Exact profile/driver/version; operation; semantic part and target; codec; wrapper/readiness prerequisites | Node/profile projection |
| Commit and assertions | One commit authority; exact physical operation when explicit; post-commit value surface; validation activation and assertion surface; state assertion surface | Shared schema, then node/usage producer |
| Repeater | Separate add and expand authority; exact item context for expand; exactly-one-created-item capture authority for add | Profile/node producer |
| Unknowns and refusals | Stable code, phase, severity, blocking policy, typed location, and bounded remediation | Shared diagnostic policy |

Useful later but not required for the pilot include ownership tags, change
history, broad scenario matrices, generated witness suggestions, observed
parity history, and coverage dashboards. Raw AST dumps, arbitrary source
snippets, callback source, customer values, inferred operational verbs,
agent-selected package paths, and heuristic selectors are not execution
authority.

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
- DOM value alone does not prove model commitment. Tests require the declared
  commit authority and a post-commit assertion surface.
- Diagnostics use one exhaustive, versioned policy. Producer-chosen severity,
  blocking behavior, messages, or remediation are not accepted on the wire.
- Presentation strings and runtime artifacts are untrusted and potentially
  sensitive. Results, traces, screenshots, and network data require bounded,
  project-owned retention and redaction policy.

## Delivery sequence

```text
planning approval
       |
Slice 0: source-authority schemas and fixture records
       |
Slice 1: pure projection/query core
       |
Slice 2: typed intent and pure validator
       |
Pilot decision gate
       |
MCP transport adapter
       |
Slice 3: native positive/negative Playwright vertical
       |
Slice 4: resolved scenario and custom/dynamic vertical
       |
Slice 5: repeaters, rendered parity, and change analysis
```

### Slice 0 — Source-authority foundation

Define strict, versioned DTOs and runtime validation for the artifact envelope,
usage/source join, journey entry and transitions, scenario references,
freshness, driver-registry identity, commit operations, value/validation/state
assertion surfaces, and repeater capture. Add only the minimum synthetic
records needed by the two RH-05 walkthroughs.

**Exit gate:** source path, component symbol, form ID, route/catalog, and step
queries resolve the correct usage or an explicit ambiguity. Every executable
commit, assertion, transition, and repeater capture resolves by exact ID. No
validator or driver code is introduced.

### Slice 1 — Pure progressive query core

Implement in-memory projections for usage search, context summary, node search,
and a single-step E2E slice over validated fixture JSON. The core owns strict
input/output schemas, path confinement, bounded projections, collection-named
cursors, and complete-or-refuse atomic closures. It has no MCP or application
runtime dependency.

**Exit gate:** both walkthroughs obtain all required context without loading a
whole contract. Pagination is deterministic and resumable for one named
collection at a time; secondary records are complete atomic metadata; oversized
atomic records and closures refuse without partial payloads; cross-step focus,
cycles, stale context, and ambiguity produce exact diagnostics.

### Slice 2 — Typed intent and pure validator

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
before any registry lookup.

### Pilot decision gate

Stop and review before transport or browser execution. Measure:

- percentage of targeted nodes that validate without a new
  application-specific driver;
- metadata authoring and review time per usage and custom field;
- ambiguity and refusal rates, including whether remediation is actionable;
- query payload size and number of progressive requests;
- first-run plan success on the two walkthroughs; and
- expected effort compared with an ordinary hand-written Playwright test.

The provisional coverage threshold is about 70 percent, but this is an
unmeasured planning hypothesis. Replace it with an observed threshold during
the pilot review.

### MCP transport adapter

Expose the already-proven Slice 1 query semantics and Slice 2 validation
through read-only MCP tools. Transport does not change the schemas, select
records, or execute trusted application code.

**Exit gate:** tool results conform to the same runtime output schemas,
pagination/cursor pinning remains deterministic, and transport adds no new
authority or data exposure.

### Slice 3 — Native Playwright vertical

Add one usage-entry driver and the smallest built-in fill/select/check,
commit, value, validation, and state assertion implementations. Compile only a
resubmitted plan that passes full semantic revalidation against the pinned
context.

**Exit gate:** one positive and one negative native fixture test pass repeatedly
without raw selectors in intent or generated source. Immediate, explicit-blur,
and usage-action commit modes are covered; assertions prove post-commit state;
and a shared physical blur used for commit and validation activation executes
exactly once.

### Slice 4 — Resolved custom/dynamic vertical

Generate and index trusted scenario artifacts, add exact custom-part targets,
runtime value/readiness capabilities, wrapper prerequisites, and application
drivers for the conditional custom-field walkthrough.

**Exit gate:** the custom/dynamic negative walkthrough passes, and removal of
each required metadata item produces the expected blocker. Unsafe or unsettled
dynamic providers remain blocked.

### Slice 5 — Repeaters, parity, and change analysis

Implement browser conformance for already-versioned add/capture/expand
contracts, then add observed role/locator/state parity, source-to-contract
change impact, and privacy-safe failure artifacts.

**Exit gate:** a representative repeater remains deterministic as row count and
DOM structure change; add captures exactly one created item, expand is scoped
to one exact existing or created item, and parity failures name the responsible
contract/profile without exposing sensitive values.

## Package ownership

| Concern | Primary owner | Must not own |
| --- | --- | --- |
| Versioned DTOs, runtime schemas, canonical form, hashes, diagnostic policy | `packages/schema/` | Angular, MCP, or Playwright execution |
| Trusted form/usage/scenario projection and registry resolution | `packages/compiler/` and `packages/workspace/` | Agent-facing selector generation or browser execution |
| Progressive read-only transport | `apps/mcp-server/` | Config/scenario loading, semantic selection, or drivers |
| Intent validation and plan construction | `packages/test-intent/` | Browser I/O or fallback guesses |
| Exact trusted plan compilation and browser operations | `packages/playwright-driver/` | Query/discovery authority or agent-selected modules |

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
| Slice ownership mismatch | Slice 0 owns all source-authority schemas/fixtures, Slice 1 owns pure queries, Slice 2 owns validation, and transport follows the pilot. |

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

The design is intentionally reversible. Slices 0–2 can still provide useful
discovery and early refusal even if broad Playwright compilation does not earn
its maintenance cost.

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
contract expansion before Slice 0.

## Task-dispatch readiness

Do not send implementation tasks until the maintainer approves this conditional
go and confirms the initial public synthetic usage. After approval, prepare
task packets one slice at a time. Each packet must state:

- the exact contract and package owner;
- dependencies and base commit;
- in-scope and prohibited changes;
- acceptance criteria and expected refusal cases;
- focused and repository-wide verification;
- migration and compatibility implications; and
- evidence required at the next stop/go gate.

The first task packet should cover only Slice 0 contract/source-authority work.
Do not combine it with MCP transport, Playwright, or workplace integration.

## Planning acceptance

High-level planning is ready when the maintainer agrees to:

- the conditional Slices 0–2 pilot rather than full implementation approval;
- the package ownership and dependency order above;
- the no-selector, no-guess, complete-or-refuse, and privacy invariants;
- one public synthetic positive/negative walkthrough as the first target; and
- a measured pilot review before MCP transport or browser-driver expansion.

Once those points are approved, Slice 0 can be decomposed into independently
reviewable implementation tasks.
