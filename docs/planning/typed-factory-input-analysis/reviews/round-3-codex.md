# Round 3 of 3 — Final Codex Independent Review

- Reviewer: fresh ephemeral Codex task, read-only sandbox
- Review boundary: `origin/main` at `fd5e77c` through the staged working tree
- Initial verdict: **Not ready as worded — two localized blockers**
- Disposition: all four findings accepted and reconciled

## Findings and dispositions

### Blocking — Static object literal reconstruction was not exact for all accepted keys

**Accepted.** `Object.fromEntries()` does not reproduce object-literal
`__proto__` semantics, and raw numeric-token text is not a sufficient model of
JavaScript property-key canonicalization.

Reconciliation:

- The accepted safe-static object grammar now permits only unique identifier or
  string keys other than `__proto__`.
- All numeric, computed, accessor, method, shorthand, spread, duplicate, and
  prototype-sensitive keys are refused.
- Retained tests cover identifier/string `__proto__`, numeric/exponent keys,
  and numeric/string duplicate-key equivalence.
- Exact finite-emission claims are explicitly scoped to this narrower grammar.

### Blocking — Privacy gate conflated local scaffold and portable artifacts

**Accepted.** A useful typed scaffold necessarily contains application
identifiers and module references, contradicting the former blanket “no source
text” gate.

Reconciliation:

- Private/local authoring output may contain only the selected identifiers,
  privacy-safe relative module specifiers, bounded type summaries, diagnostics,
  and generated helper calls needed for review.
- It is printed locally or written to a realpath-confined authoring directory
  inside the consumer workspace, is excluded from portable bundles, and is
  committed only by explicit author choice.
- Portable artifacts contain no local scaffold/report text, application
  property/interface/import names, module specifiers, or type summaries unless
  a future versioned schema separately authorizes them.
- Acceptance tests must cover location/symlink confinement, portable absence,
  source-snippet/literal/comment/path redaction, and deterministic ordering.

### Non-blocking — Status text was stale

**Accepted.** The main decision and execution index now record all three
reviews as reconciled and complete.

### Non-blocking — Prettier reported changed-file formatting drift

**Accepted.** The changed research/planning/script files are formatted before
final verification.

## Reviewer-confirmed conclusions

The final reviewer independently confirmed that:

- typed canonical RxJS Observables usually reveal emission shape but not actual
  values, timing, completion, or availability;
- subscription remains execution and cannot establish completeness by timeout;
- the workspace-owned single Program and compiler-owned inert binding split is
  consistent with package dependencies;
- the bounded direct-use/refusal grammar and scalar/callback distinction are
  retained and appropriately scoped;
- NIGO remains a measured-pilot hypothesis; and
- no production implementation is required to complete this research slice.

## Reviewer verification

The executable report, focused no-cache ESLint, and diff check passed. Vitest
could not start in the reviewer's enforced read-only sandbox because Vite tried
to create `.vite-temp`; the author reruns the focused test and full repository
checks after reconciliation. The reviewer also surfaced the formatting drift
that is corrected in this disposition.
