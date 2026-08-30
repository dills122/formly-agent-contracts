# Author Explanation: Typed Factory Input Analysis

Read this only after completing the preliminary independent inspection from
`review-bootstrap.md`.

## Goal

The workplace MVP can link an Angular view/form usage to the exact generated
contract, but a required-argument Formly factory still needs a zero-argument
declared `create()` adapter. Hand-authoring dozens of synthetic callbacks,
streams, templates, and service-shaped values is unacceptable. This change asks
how much of that adapter can be generated from the real TypeScript options type,
with special attention to what can truthfully be known about
`Observable<T>`.

## Approach

- Reconciled the proposal with RH-02 and kept automatic application execution
  behind existing `FAC-3`/`FAC-4` gates.
- Added a work-shaped TypeScript 5.9.3/RxJS 7.8.2 fixture and executable
  compiler-API experiment.
- Recovered property/callback/contextual types and canonical RxJS emission
  types, including a bounded application-object nested-hazard case.
- Demonstrated a narrow direct-use grammar: direct construction/escape,
  directly stored functions, immediate IIFEs and synchronous collection
  callbacks, ambiguous unknown callback consumers/getters, and deterministic
  refusal for destructuring/aliases/reassignment/computed access.
- Added exact-symbol static enumeration only for `of(safe-static literals)` and
  `from(inline safe-static literal array)`. Object keys exclude numeric and
  `__proto__` semantics; adversarial positives/refusals are retained.
- Added a runtime probe showing why subscription is execution and does not
  imply completion or domain completeness.
- Assigned full normalized type analysis to ephemeral workspace state beside
  the existing authoritative leaf Program. Workspace emits only a bounded
  canonical report and typed application scaffold; the scaffold references
  compiler-owned inert authoring helpers. Public schemas and production
  execution remain deferred.

## Intended decision

Proceed with workspace-private typed analysis, the bounded direct-use/refusal
classifier, and generated inert scaffolding. Treat Observable emission types as
type-only metadata. Keep exact runtime emissions in the controlled scenario
lane. Make finite static Observable enumeration optional after the main MVP.

## Primary files

- `docs/research/hardening/typed-factory-input-analysis.md`
- `docs/research/hardening/factory-harness-and-value-semantics.md`
- `docs/planning/workspace-discovery/implementation-plan.md`
- `docs/planning/typed-factory-input-analysis/`
- `scripts/research/typed-factory-inputs/`

## Current focused verification

```text
pnpm exec vitest run scripts/research/typed-factory-inputs/experiment.test.mjs
  1 file, 5 tests passed
```

The complete pre-review freeze is recorded in `progress.md` after all checks are
rerun.

## Known limitations

- The retained analyzer is feasibility evidence, not production compiler code.
- `typeToString()` is diagnostic display only; the production design requires
  a bounded normalized descriptor.
- Only the direct-use grammar is demonstrated. Destructuring and aliases are
  currently refusals, not implemented conveniences.
- Types do not prove concrete emitted values or runtime availability.
- Compiler API and RxJS declaration behavior require a pinned compatibility
  matrix.
- The NIGO outcome is a hypothesis until `TFI-MVP-5` retains a sanitized
  executable fixture and measured authoring counts.
