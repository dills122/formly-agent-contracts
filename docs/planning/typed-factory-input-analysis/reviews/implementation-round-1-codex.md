# Production Implementation Review 1 of 3 — Codex

- Reviewer: fresh Codex task with no inherited implementation history
- Review boundary: `origin/main` at `fd5e77c` through implementation commit `39ed002`
- Initial verdict: **Not ready — two P1 and three P2 findings**
- Disposition: all five findings accepted and reconciled

## Findings and dispositions

### P1 — Authoring-target failures were discarded

**Accepted.** The source index previously emitted a target only for the happy
path and discarded why other registered roots could not become authoring
targets. Unfiltered runs could therefore report success with no drafts, while
filtered runs collapsed distinct failures into a generic not-found result.

Reconciliation:

- The source index now emits deterministic private target diagnostics for a
  duplicate definition, unavailable root, missing application Program, and
  multiple application Programs.
- The public read-only inspector translates those causes into stable,
  privacy-safe authoring diagnostics.
- An unfiltered run with no targets and no more specific cause now returns a
  dedicated no-target diagnostic and the CLI exits unsuccessfully.

### P1 — Whole-options escapes could still generate capability helpers

**Accepted.** Passing, returning, or otherwise escaping the complete options
parameter leaves every property potentially consumed, so property-local
evidence is insufficient.

Reconciliation:

- Unattributed options-parameter escapes now produce a deterministic global
  `parameter-escape` ambiguity.
- Global ambiguity blocks generated callback, Observable, and view helpers for
  all otherwise supported properties; their drafts require explicit values or
  bindings instead.
- Unsupported type hazards remain unsupported rather than being softened by
  the global ambiguity.

### P2 — Direct callable storage bypassed the reviewed allowlist

**Accepted.** A direct callable reference stored under an arbitrary property
was previously treated as reviewed deferred storage.

Reconciliation:

- Direct and wrapped callable storage now share the same reviewed Formly-slot
  allowlist.
- Unreviewed slots produce `FACTORY_INPUT_STORAGE_UNREVIEWED` and remain
  explicit.

### P2 — Metrics overlapped and omitted global ambiguity

**Accepted.** A property could contribute to multiple review categories, and
an unkeyed ambiguity was invisible in the summary.

Reconciliation:

- Generated, explicit, ambiguous, and unsupported are now mutually exclusive
  property counts.
- Draft metrics and CLI output now include `coverage` plus
  `unattributedAmbiguity`, so incomplete or globally ambiguous analysis cannot
  be presented as complete.

### P2 — Documentation claimed runtime materialization

**Accepted.** The compiler currently exports a type-only authoring contract;
it does not materialize callbacks, Observables, or Angular view handles.

Reconciliation:

- Research, workspace planning, CLI reference, README, and pilot guidance now
  describe the current output as a typed local draft.
- Runtime materialization and contained harness execution remain deferred
  behind the existing FAC-3/FAC-4 boundary.

## Added evidence

Focused regressions cover every accepted finding, including all target-failure
translations, zero-target refusal, complete-options escape, unreviewed direct
callable storage, exclusive metrics, and global ambiguity. The Nx workplace
fixture also arms execution sentinels inside both registered adapter functions
without violating the source descriptor's required static literal-list grammar.

The reconciled repository passes `pnpm check` with 60 test files and 1,060
tests, all package/application/fixture builds, linked and packed consumers,
release and demo checks, documentation validation, and the production docs-site
build.
