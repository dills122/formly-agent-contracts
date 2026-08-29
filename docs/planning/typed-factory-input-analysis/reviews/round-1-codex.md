# Round 1 of 3 — Codex Independent Review

- Reviewer: fresh ephemeral Codex task
- Review boundary: `origin/main` at `fd5e77c` through the staged working tree
- Initial verdict: **Not ready**
- Disposition: all five findings accepted

## Findings and dispositions

### P1 — Fail-closed usage analysis was overclaimed

**Accepted.** The original execution index marked `TFI-1` complete although the
spike only labeled a few direct property accesses and emitted no coverage or
refusal diagnostics.

Reconciliation:

- `TFI-1` now says research complete and production classifier pending.
- The experiment emits `complete-demonstrated-direct-grammar` or `incomplete`
  plus deterministic refusal diagnostics.
- Tests now retain destructuring, parameter/property aliases, reassignment,
  computed access, IIFE, synchronous collection callback, unknown higher-order
  callback consumer, getter, and escaping/stored cases.
- The design no longer promises destructuring or alias support in the first
  production slice.

### P1 — Lexical function nesting was not a sound deferred boundary

**Accepted.** A nested function can be an IIFE or a callback consumed
synchronously. `deferred` was misleading.

Reconciliation:

- The retained classifications are now `stored-function`, `construction`, and
  `lexically-nested-ambiguous`.
- IIFEs and allowlisted synchronous collection callbacks classify as
  construction; unknown consumers and getters remain ambiguous.
- The plan requires a reviewed Formly storage position before generating an
  inert captured callback. Lexical nesting alone grants no authority.

### P2 — Nested `any`/`unknown` was broader than the evidence

**Accepted.** The original walk reached unions and generic arguments but not
application-owned object properties.

Reconciliation:

- Added `Observable<{ readonly payload: any }>` and a focused assertion.
- Added bounded application-owned property traversal with depth 8 and a
  256-type budget.
- A reached bound emits `analysis-truncated`; all claims and gates now say
  “bounded traversed graph,” not arbitrary hidden nesting.

### P2 — Package ownership and artifact lifecycle were unresolved

**Accepted.** The design now assigns the full normalized descriptor to
`packages/compiler` as ephemeral state. The MVP recomputes it every run and
does not persist, cache, hash, or pass it to workspace. Only bounded,
canonically ordered, privacy-filtered reports and generated scaffolds may leave
the compiler. Any future portable descriptor requires a separate versioned
schema decision.

### P3 — Verification count was stale

**Accepted.** Fixed counts were removed from evergreen plan text. The current
check results are refreshed in `progress.md` immediately before each review
freeze.

## Additional reviewer observations

- The reviewer confirmed that the broad direction preserves RH-02, Task 8,
  `FAC-3`/`FAC-4`, and the distinction between emission type and value evidence.
- NIGO improvement was illustrative rather than retained evidence. It is now
  labeled a hypothesis pending the `TFI-MVP-5` sanitized fixture and metrics.
- The round-one reviewer could not execute Vitest in its read-only sandbox
  because Vite attempted to write `.vite-temp`; it did independently run the
  experiment, focused no-cache lint, documentation checks, and diff checks.

## Post-reconciliation verification

Focused Vitest: 1 file, 4 tests passed. The complete lint/docs/diff evidence is
refreshed before review round 2.
