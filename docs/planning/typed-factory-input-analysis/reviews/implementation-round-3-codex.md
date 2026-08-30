# Production Implementation Review 3 of 3 — Codex

- Reviewer: fresh Codex task with no inherited implementation history
- Review boundary: `origin/main` at `fd5e77c` through remediation commit
  `c96393f`
- Initial verdict: **Not ready — one P1, two P2 findings, and two documentation drifts**
- Disposition: all findings and drifts accepted and reconciled

## Findings and dispositions

### P1 — Unsafe property declarations could still generate helpers

**Accepted.** Property-level TypeScript semantic errors or suppressions were
diagnosed, but the normal property type was still passed to usage
materialization. A callback, canonical Observable, or Angular view property
could therefore receive a generated helper despite untrusted declaration
evidence.

Reconciliation:

- Every analyzed property now carries an explicit safety disposition.
- TypeScript diagnostics and suppressions force `unsupported` materialization
  before Angular-view or capability special cases.
- Scaffold-level regressions cover erroneous callbacks, Observables, Angular
  views, and a suppression housed in a separate options module.

### P2 — Nested callable hazards were omitted from coverage

**Accepted.** Normalization retained hazards in call/construct signatures, but
diagnostic traversal did not descend into their parameters, returns, or generic
constraints. An application service with an `any` method parameter could thus
report complete supported coverage even though materialization refused it.

Reconciliation:

- Bounded diagnostic traversal now visits call and construct parameters and
  returns plus generic constraints using canonical paths.
- Nested callable `any` and constructor `unknown` regressions prove that these
  hazards make coverage incomplete.

### P2 — Explicit empty selection widened to every form

**Accepted.** `formIds: []` was normalized to an omitted filter. In a populated
workspace, that changed an explicit empty selection into an all-target
authoring request.

Reconciliation:

- Omitted `formIds` retains unfiltered discovery.
- An explicitly empty array returns
  `FACTORY_INPUT_AUTHORING_NO_TARGETS` before workspace discovery.
- The regression uses a populated target set, so it distinguishes refusal from
  accidental unfiltered discovery.

## Documentation reconciliation

- The design now states the implemented compatibility evidence precisely: the
  internal analysis records the active TypeScript version and canonical RxJS
  symbol availability, while a cross-version compatibility matrix remains a
  future release gate.
- Compiler ownership now distinguishes the current type-only authoring
  interface from any future runtime validation/materialization API and the
  separately deferred contained runner.

Focused TDD and final repository-gate evidence are recorded in `progress.md`.
