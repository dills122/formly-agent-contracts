# CTX-2 Specification: Typed Intent and Pure Validation

- Status: in progress
- Schema version: `0.1.0`
- Semantic policy version: `0.1.0`
- Owner: `@formly-contract/schema`
- Research basis: RH-05, reconciled by RH-06
- Prerequisite: `CTX-1`

## Objective

CTX-2 turns one exact, current CTX-1 selection and an agent-authored typed test
intent into either a deterministic validated execution plan or a closed set of
machine-actionable diagnostics. It is a pure, browser-free boundary. It never
loads Angular, Formly, an application registry, a driver implementation, or a
DOM, and it never accepts selectors, executable callbacks, module paths, or
free-form diagnostic policy.

This packet keeps the first implementation in `@formly-contract/schema` beside
the existing CTX-0/CTX-1 DTOs and pure query core. Splitting a separate public
package before the DTO and semantic boundary settle would add packaging work
without adding an ownership boundary.

## Authority chain

The implementation follows this exact chain:

1. RH-05 defines the typed-intent, diagnostic, and lossless-plan invariants.
2. RH-06 and the execution index schedule CTX-2 after CTX-1.
3. The CTX-0 artifact set and CTX-1 `AgentContextQuerySelection` pin every
   workspace, usage, form, scenario, and execution-authority owner.
4. The driver-registry manifest pins the trusted driver identities and
   capability allowlist without exposing implementation code.
5. CTX-2 selects only records present in the pinned context and serializes
   every selected fact into the plan.
6. Later driver-call and Playwright work may rehydrate exact IDs but may not
   repair, infer, reorder, or add plan authority.

## Initial supported intent

The `agent-context.test-intent@0.1.0` wire contract contains:

- one exact context reference composed from a CTX-1 query selection and a
  driver-registry content hash;
- one stable case identity, title, and positive/negative polarity; and
- a closed operation union for `openUsage`, `set`, `addItem`, `expandItem`,
  `expectState`, `expectValue`, `commitValue`, `invokeUsageAction`,
  `activateValidation`, `expectValidation`, and `expectOutcome`.

The first executable gate covers both current RH-05 synthetic cases using
`openUsage`, `set`, `expectState`, `commitValue`, `activateValidation`,
`expectValue`, and `expectValidation`. The remaining wire variants are included
only when their full source-to-plan invariants are implemented and tested; an
accepted intent operation may never disappear into a no-op.

## Value policy and discovered prerequisite

Current CTX-0 execution authority carries domains through the resolved Form
Contract and carries interaction/readiness/commit/assertion authority through
the execution-authority artifact. It does **not** yet contain an explicit value
codec record, a stable runtime-enumeration record, or a reviewed
constraint-violation constructor.

Therefore CTX-2 v0.1 may approve only:

- `domain-value` when its canonical JSON value is present in the selected
  resolved enumerated domain;
- `literal` when all relevant projected constraints are understood by the
  closed pure classifier and the expected classification matches; and
- `candidate`, `runtime-policy`, or `constraint-violation` only after a future
  versioned authority record supplies the exact value/capability reference.

Until that authority exists, the richer variants remain parseable proposals
and validation returns `VALUE_CLASSIFICATION_UNKNOWN`. The validator must not
use defaults, labels, Formly type names, current model values, array order, or
driver names as substitute authority. This is a deliberate fail-closed
amendment to the earlier claim that CTX-2 was dependency-complete.

Pattern-constrained literals also return `VALUE_CLASSIFICATION_UNKNOWN` in
v0.1. A projected pattern string alone does not version the runtime anchoring,
empty-value, or regular-expression semantics required to classify it safely.
That support belongs in a future explicit value-semantics policy rather than a
best-effort JavaScript regular-expression guess.

The v0.1 length classifier follows the pinned Angular validator rule that an
empty optional value is valid for `minLength`; a separate projected `required`
constraint makes the same empty value invalid. This narrow rule is covered by
both optional and required regression cases rather than inferred from a live
validator callback.

## Context and freshness

Validation receives four explicit inputs:

- the untrusted typed-intent input;
- the untrusted CTX-1 query dataset;
- the untrusted CTX-1 live-owner state; and
- the untrusted driver-registry manifest.

All four cross their existing strict parsers. The intent's context reference
must equal the exact query selection and registry hash. CTX-2 invokes the pure
CTX-1 E2E-slice query for the exact current step and target nodes. `stale` or
`unknown` freshness blocks plan creation; CTX-2 never treats repository
revision, timestamps, or caller assertions as freshness proof.

Strict parsing treats both public API envelopes and their complete
own-property graphs as hostile. Required fields must be own enumerable data
properties; inherited properties never satisfy the schema. Proxies, accessors,
symbol keys, non-enumerable data, cycles, excessive depth/size, and closed-enum
violations are rejected without invoking caller coercion hooks.

## Diagnostics

`agent-context.intent-diagnostic@0.1.0` uses the closed RH-05 code vocabulary.
Every code fixes its phase, severity, blocking disposition, exact required and
optional location fields, and remediation shape in one schema-owned runtime
policy table. The exported diagnostic type is a code-discriminated union and
the runtime parser rejects fields that belong to the same broad location kind
but not to that exact code. Callers provide only bounded code-specific fields.
The v0.1 `sourceDiagnostics` slot is reserved and
must be empty until a standalone strict evidence-projection parser can validate
its owner and payload; the validator never accepts arbitrary JSON as evidence.
Callers provide only bounded, kind-specific location fields and typed
remediation fields. They cannot provide a `message`, override severity,
downgrade a blocker, or introduce an unknown remediation.

The implementation is staged without weakening this contract:

- `CTX-2A` publishes the complete code/policy vocabulary and strict runtime
  diagnostic parser;
- `CTX-2B` maps the CTX-1 and first semantic-validator refusals used by the two
  synthetic gates;
- later mappings may activate already reserved codes, but no validator may
  emit a code outside the fixed policy table.

## Validated plan

`agent-context.validated-plan@0.1.0` is canonical JSON with:

- the exact context reference and case ID;
- the SHA-256 content identity of the exact source intent;
- the semantic-policy version;
- a closed plan-step union;
- stable plan-step IDs based on canonical intent order, never labels;
- the source authorization for every resolved value, including the expected
  valid/invalid classification for literal values;
- exact source record IDs, versions, driver identities, capabilities, parts,
  locator-target references, item contexts, physical operations, transitions,
  and assertion authority needed by each step; and
- origins that preserve the responsible intent step indexes, including
  coalesced node operations.

A coalesced operation may consume an adjacent intent step only when that
step's own node and item context match the exact physical authority. Otherwise
the step is validated independently and blocks when unsupported.

For the v0.1 supported subset, declared `source-before-target` effects apply to
every intent operation on the target node, not only its first `set`. A
`committed-model-value` assertion that depends on an explicit node-local commit
must follow that exact `commitValue` step. Readiness bindings select the exact
declared `{ partRef, locatorTargetRef }` tuple; sharing a locator target across
multiple parts cannot change the serialized purpose. Wrapper activation
preconditions are retained by CTX-1 but are not executable in this checkpoint,
so a targeted node carrying one returns `UNSUPPORTED_INTERACTION` and no plan.
The validator never drops the precondition.

Its `planHash` and `intentHash` are SHA-256 content identities only; neither is
a signature or authorization token. The pure revalidator requires the exact
source intent beside the plan, reparses both, verifies their hashes and the
separately submitted context, and reruns the canonical validator against the
current dataset, live-owner state, and driver manifest. Revalidation succeeds
only when the current CTX-1 E2E slice is complete and the rebuilt plan is
exactly equal to the submitted plan. A deleted/reordered step, changed literal
classification, current-but-refused slice, or other caller-rehashed semantic
mutation returns `PLAN_SEMANTIC_INVALID`; a byte/hash mismatch returns
`PLAN_HASH_MISMATCH`.

## Work breakdown

| Task | Scope | Depends on | Acceptance |
| --- | --- | --- | --- |
| `CTX-2A` | Strict intent DTO, context reference, complete diagnostic vocabulary/policy, and strict parsers | `CTX-1` | Round-trip, unknown-key/version, proxy/accessor/non-enumerable/cycle/depth/size, closed-enum, policy parity, and no-message tests pass |
| `CTX-2B` | Pure single-step validator for exact-domain/safely classified values and the two synthetic operation subsets | `CTX-2A` | Positive and negative synthetic intents produce complete plans; reversed ordering, stale context, missing authority, hidden-state, mismatched coalescing, pattern, and value failures produce exact blockers and no plan |
| `CTX-2C` | Canonical plan parser/hash, source-intent binding, and complete semantic revalidation | `CTX-2B` | Canonical hashes reproduce; context/hash/deletion/classification mutations and current refused slices fail before any executable lookup |
| `CTX-2V` | Rich value-semantics authority for runtime enumeration, codecs, candidates, and constraint-violation construction | separate schema decision | `first-enabled` and constructed invalid values execute only from exact versioned authority; otherwise fail closed |
| `CTX-2D1` | Lossless current-plan call ABI and DRV-0C2 trusted implementation binding, without invocation | `CTX-2C`, `DRV-0C1` | Complete: exact positive/negative calls bind only after revalidation; lookup/refusal/no-invocation gates pass |
| `CTX-2D2` | Remaining repeater/action/transition/outcome plan gates | `CTX-2D1`, relevant source authority | Exact capture/current-step/transition bindings pass the remaining RH-05 losslessness gates |

`CTX-2A` through `CTX-2C` are the MVP checkpoint. `CTX-2V`, `CTX-2D1`, and `CTX-2D2` are
required before aggregate CTX-2 is marked complete unless their authority is
deliberately removed from the v0.1 public intent union in a reviewed schema
decision.

## Traceability and acceptance

| Requirement | Implementation task | Verification | Status |
| --- | --- | --- | --- |
| `CTX-2-REQ-01` strict typed wire boundary | `CTX-2A` | strict parse/round-trip/hostile-input tests | MVP complete |
| `CTX-2-REQ-02` closed diagnostic policy | `CTX-2A` | exhaustive code-policy parity and wrong-tuple/no-message tests | MVP complete |
| `CTX-2-REQ-03` exact pinned current context | `CTX-2B` | mismatch/stale/unknown owner and missing-authority tests | MVP complete for the current refusal matrix |
| `CTX-2-REQ-04` no guessed values | `CTX-2B`, `CTX-2V` | domain/literal/opaque/runtime-policy/violation tests | Partial: exact domain/literal supported; rich authority pending |
| `CTX-2-REQ-05` exact execution authority | `CTX-2B`, `CTX-2D1`, `CTX-2D2` | binding/ordering/state/commit/validation/call/repeater/transition tests | Partial: current synthetic operation and call binding complete; repeater/transition pending |
| `CTX-2-REQ-06` lossless canonical plan | `CTX-2B`, `CTX-2C` | plan/intent round-trip, stable hashes, origin, value-classification, and authority equality tests | MVP complete for supported subset |
| `CTX-2-REQ-07` revalidation before executable lookup | `CTX-2C`, `CTX-2D1` | exact-intent replay plus hash/context/deletion/classification/current-refusal mutation tests with an implementation-binding access trap | Complete for current validated-plan binding |
| `CTX-2-REQ-08` synthetic proof | `CTX-2B`, `CTX-2C` | both RH-05 fixture cases validate or refuse exactly | MVP complete |

The implemented checkpoint remains deliberately narrower than aggregate
`CTX-2`: all public wire variants parse, but variants without complete source
authority return a stable blocker and never disappear into a plan.

## Fast follows and pivot status

The final MVP review found no architecture or scope condition requiring a
pivot. The following work is intentionally outside the checkpoint and remains
fail closed until implemented:

- execute declared wrapper activation preconditions as lossless plan
  expansions instead of returning `UNSUPPORTED_INTERACTION`;
- make the standalone public plan-hash helper preflight hostile values, or
  narrow its API to an already parsed plan brand; callers must currently hash
  only parser/validator output;
- complete `CTX-2V` rich runtime value, codec, candidate, and constructed
  violation authority;
- complete `CTX-2D2` repeater, action, transition, outcome, and executable
  wrapper plan gates; and
- prove trusted-driver and browser/runtime parity in the downstream driver and
  Playwright lanes.

These are tracked as fast follows. None may be inferred, emulated, or promoted
to authority by the v0.1 validator.

## Verification commands

```text
pnpm exec vitest run packages/schema/src/agent-context-test-intent.test.ts
pnpm exec vitest run packages/schema/src/agent-context-intent-validator.test.ts
pnpm exec tsc --project packages/schema/tsconfig.json
pnpm exec eslint packages/schema/src/agent-context-test-intent.ts packages/schema/src/agent-context-test-intent.test.ts packages/schema/src/agent-context-intent-validator.ts packages/schema/src/agent-context-intent-validator.test.ts
node .github/scripts/check-docs.mjs
pnpm check
```

## Boundaries

- Always: strict parse before semantic reads; exact version/hash/ID equality;
  deterministic canonical ordering; blocker means no plan; warnings never
  grant missing authority.
- Ask first: introduce a new public package, change an existing CTX-0/CTX-1
  schema version, execute a callback, or widen the trusted input boundary.
- Never: synthesize selectors, choose the first driver/profile/row, inspect a
  live DOM, load Angular/Formly, execute source code, use labels as values, or
  treat a matching hash as semantic approval.
