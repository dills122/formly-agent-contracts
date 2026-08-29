# Typed Factory Input Analysis Research Plan

- Status: Research and three-round independent review complete
- Branch: `codex/typed-factory-input-research`
- Base: `origin/main` at `fd5e77c`
- Decision owner: maintainer
- Canonical predecessor:
  [Factory harness and value semantics](../../research/hardening/factory-harness-and-value-semantics.md)
- Related implementation plan:
  [Workspace discovery implementation plan](../workspace-discovery/implementation-plan.md)

## Objective

Decide whether a TypeScript-powered input analyzer can remove most handwritten
factory stubs for parameterized Formly factories while preserving the
repository's fail-closed evidence model. Give special attention to what can be
known about values emitted by a well-typed RxJS `Observable<T>`.

This is a research and planning slice. It may add retained experiment fixtures
and scripts, but it must not add production factory execution, subscribe to an
application Observable, weaken `FAC-3`, or publish new contract evidence.

## Decision questions

1. Can the TypeScript compiler API recover the complete expected input shape of
   a factory, including anonymous callback signatures at real callsites?
2. Can it reliably extract the value type `T` from RxJS
   `Observable<T>`/`Subject<T>`-shaped inputs across aliases, subclasses,
   unions, and common operator pipelines?
3. Which Observable creation expressions, if any, prove an exact finite
   emission set by static analysis alone?
4. What evidence vocabulary keeps emission _types_, exact finite emissions,
   partial observations, and runtime-unknown streams distinct?
5. Which inputs can be auto-materialized as inert capabilities, and which must
   remain explicitly supplied because they affect construction?
6. What is the smallest MVP implementation sequence that improves workplace
   usability without creating a hidden Formly/Angular execution harness?

## Constraints

- The existing RH-02 boundary remains authoritative: subscribing is execution,
  arbitrary application factory execution remains blocked by `FAC-3`, and
  resolved Formly/Observable evidence belongs to the separate Task 8 lane.
- Types may prove shape, assignability, and callback signatures. They do not by
  themselves prove concrete runtime values, completion, timing, side effects,
  or domain completeness.
- `any`, unresolved generics, ambiguous unions, and structurally compatible but
  semantically unknown observable-like objects fail closed.
- Static expression recognition must be an allowlist over symbol-resolved
  operators and literal inputs, not spelling-based inference.
- A type-derived emission descriptor must not be projected into `options` or an
  enumerated `valueDomain`.
- All research claims are labeled fact, observation, inference, or unknown and
  link to primary sources or retained experiments.

## Phases

### Phase A — Baseline and design

- Reconcile this proposal with RH-02, `REQ-FACTORY-01`, `FAC-1`–`FAC-4`, and the
  completed workplace MVP pilot.
- Freeze an experiment matrix and explicit success/refusal criteria.
- Define the provisional analyzer output without changing public schemas.

### Phase B — Static TypeScript experiments

- Recover factory parameter object properties and call signatures.
- Recover contextual types for anonymous callbacks at invocation sites.
- Extract Observable emission types through aliases, subclasses, unions,
  generic functions, and representative RxJS operators.
- Demonstrate a direct-use classification grammar for construction-time reads,
  directly stored function values, escaping values, and ambiguous uses. Treat
  destructuring, aliases, computed access, getters, and unknown higher-order
  consumers as explicit refusal cases until production acceptance tests exist.

### Phase C — Observable value experiments

- Test a strict static allowlist for `of(...)`, `from(readonly literal tuple)`,
  and immediately constructed `BehaviorSubject(literal)`.
- Retain negatives for imported values, functions, promises, iterables,
  subjects, schedulers, operators with callbacks, non-completing streams, and
  side-effecting producers.
- Demonstrate why controlled subscription requires explicit finite/settling
  protocol authority and remains outside the declared analyzer.

### Phase D — Decision and implementation plan

- Record what the MVP can generate automatically, what it can only describe,
  and what still requires explicit values or later scenario authority.
- Amend the canonical roadmap without weakening existing safety gates.
- Produce an ordered implementation slice with acceptance tests and diagnostics.

### Phase E — Independent review

- Round 1: fresh-context engineering review of plan, claims, experiments, and
  decision.
- Round 2: fresh Claude review after round-1 reconciliation.
- Round 3: final fresh-context engineering review after Claude reconciliation.
- Reconcile valid findings between rounds and retain each review packet and
  disposition.

## Completion criteria

- Every decision question has a supported answer or a named unresolved gate.
- Retained experiments distinguish type recovery from concrete-value recovery.
- The plan contains no implicit subscription or application import fallback.
- The MVP proposal explains the workplace `createIndexingContractOptions()`
  case and emits deterministic diagnostics for unsupported inputs.
- Three independent review rounds are complete, including one Claude round,
  with all valid findings reconciled.
- Focused experiments and documentation checks pass.

## Current outcome

Phases A through E are complete in the decision-ready research packet. The
retained TypeScript/RxJS experiment passes five focused tests covering type
recovery, adversarial usage, safe-static sources, object-key/prototype
refusals, and runtime subscription behavior. Three independent review rounds,
including Claude round 2, are reconciled. Final verification is recorded in
`progress.md`.
