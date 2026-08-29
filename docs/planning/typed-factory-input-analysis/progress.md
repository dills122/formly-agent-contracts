# Typed Factory Input Analysis Progress

## 2026-08-29

- Created a clean worktree from merged `origin/main` at `fd5e77c` on
  `codex/typed-factory-input-research`.
- Read the canonical RH-02 factory-harness/value-semantics research and the
  `REQ-FACTORY-01`/`FAC-*` roadmap boundaries.
- Confirmed the workplace MVP deliberately left inferred runtime factory inputs
  out of scope.
- Narrowed the Observable question into type recovery, finite static-source
  recognition, and controlled-subscription protocol boundaries.
- Recorded primary RxJS and TypeScript sources for the first evidence pass.
- Next: add retained work-shaped TypeScript/RxJS fixtures and execute `TFI-1`
  plus `OBS-1`–`OBS-3`.

### Research completion

- Added retained work-shaped TypeScript/RxJS fixtures, analyzer, runtime probe,
  executable report, and three focused tests.
- Recovered callback/contextual types, Observable emissions through representative
  aliases/subclasses/generics/unions/operators, and nested `any` hazards.
- Proved a strict static `of`/`from(literal array)` allowlist and retained
  refusal cases, including barrel identity and same-spelling negatives.
- Demonstrated subscription side effects, current hot state, synchronous and
  asynchronous completion, error, and non-completion.
- Wrote the decision-ready design and mapped it additively to RH-02 and the
  canonical workspace plan.
- Verification at the first freeze: 3 focused tests passed; focused ESLint,
  documentation checks, and `git diff --check` passed.
- Independent review round 1 returned five actionable findings and a
  `not ready` verdict. All five were accepted.
- Round-1 reconciliation: renamed lexical nesting to exact stored/ambiguous
  dispositions; added IIFE, synchronous collection callback, unknown
  higher-order consumer, getter, destructuring, alias, reassignment, and
  computed-access cases; added bounded object-property hazard traversal; made
  compiler ownership and no-cache lifecycle explicit; split blind-review and
  author packets; and narrowed NIGO claims to hypotheses pending a fixture.
- Verification after round-one reconciliation: 4 focused tests pass; focused
  no-cache ESLint passes; documentation checks pass for 114 files; and
  `git diff --check` passes.
- Claude review round 2 independently reproduced all four tests, the executable
  report, lint, documentation, and diff checks. It found that assigning the
  descriptor to compiler conflicted with the existing workspace-owned leaf
  Program, plus two missing adversarial distinctions.
- Round-2 reconciliation: workspace now owns the ephemeral descriptor beside
  the single authoritative Program; its generated application scaffold
  references compiler-owned inert authoring helpers. Added a typed scalar read
  inside a stored function and an immediate service method call. Use-site
  classification is now explicitly combined with the input property's own type
  before materialization. The RxJS fixture path pin is documented.
- Verification after round-two reconciliation: 4 focused tests pass; focused
  no-cache ESLint passes; documentation checks pass for 115 files; and
  `git diff --check` passes.
- Final Codex review round 3 confirmed the Observable conclusion, subscription
  boundary, direct-use model, workspace/compiler split, prior reconciliations,
  and MVP scope. It found two localized blockers: unsafe object-key edge cases
  in the static literal grammar and an ambiguous privacy gate for generated
  scaffolds.
- Round-3 reconciliation: the safe-static grammar now rejects `__proto__` and
  all numeric object keys, with parser-level prototype/numeric/exponent/
  duplicate-equivalence adversarial tests. Private/local authoring output and
  portable artifacts now have separate permitted/prohibited content, location,
  redaction, and acceptance rules. Stale status text was refreshed and all
  changed research files were formatted.
- The requested three-review cycle is complete. No fourth independent review is
  authorized or required; final local verification follows this reconciliation.
- Final focused verification: 5 tests pass; focused no-cache ESLint passes;
  changed-file Prettier check passes; documentation checks pass for 116 files;
  and `git diff --check` passes.
- Final repository verification: `pnpm check` passes end to end—55 test files
  and 1,005 tests, all package/application/fixture builds, linked and packed
  workspace consumers, release/pack/demo checks, documentation validation, and
  the production docs-site build.
