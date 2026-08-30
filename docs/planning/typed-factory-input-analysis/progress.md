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

### Production implementation start

- Preserved the reviewed research packet as commit `267badf` before changing
  production code.
- Began `TFI-MVP-1` with the reviewed workspace/compiler ownership boundary:
  workspace owns ephemeral TypeScript descriptors beside the authoritative
  source-linkage Program; compiler and the portable schema remain unchanged.
- Added acceptance IDs `TFI1-AC-01` through `TFI1-AC-06` to the execution index.
- Next: commit a failing workspace compatibility test before implementing the
  normalized descriptor and canonical RxJS analysis.

### `TFI-MVP-1` implementation evidence

- Added a workspace-private analyzer that accepts the existing
  `WorkspaceSourceUsageProgramDescriptor` and a declaration owned by that exact
  Program. A foreign Program declaration is refused.
- Added bounded normalized descriptors for primitives, literals, arrays,
  tuples, unions/intersections, workspace object properties, call/construct
  signatures, generic arguments, and explicit hazards.
- Added canonical RxJS symbol recovery for direct imports and workspace
  barrels, plus Subject, subclass, alias, union, and callback-return emission
  types. Same-spelled application types are refused.
- Observable results remain `type-only`; no factory is invoked and no stream is
  subscribed.
- Added deterministic fail-closed diagnostics for `any`, `unknown`, unresolved
  generics, recursion, truncation, unsupported signatures, foreign Programs,
  relevant TypeScript errors, and suppression directives.
- Focused evidence: 15 analyzer tests pass; all 13 workspace test files and 257
  workspace tests pass; workspace type-check and focused ESLint pass.
- Corrected one verification command typo (`docs:check` to this repository's
  `check:docs`). The first full check later reached the packed-consumer install
  and hit the expected sandbox pnpm-store `EPERM`; the authorized rerun outside
  that restriction passed.
- `TFI-MVP-1` is complete. Final verification: `pnpm check` passes with 56 test
  files and 1,020 tests, every package/application/fixture build, linked and
  packed workspace consumers, release/pack/demo checks, documentation checks,
  and the docs-site build.

### `TFI-MVP-2` implementation start

- Accepted `TFI2-AC-01` through `TFI2-AC-06` before production changes.
- The slice remains workspace-private and static. It classifies uses inside the
  declared factory body and combines them with `TFI-MVP-1` type evidence; it
  does not invoke a factory, inspect live services, subscribe, generate a
  scaffold, or alter portable artifacts.

### `TFI-MVP-2` implementation evidence

- Added a workspace-private use analyzer for function bodies and class
  constructors with one identifier options parameter. It reuses the exact
  Program/declaration boundary already enforced by `TFI-MVP-1`.
- Direct construction reads/calls, direct returned escapes, reviewed Formly
  callback storage, immediate IIFEs, synchronous array callbacks, and
  ambiguous nested flow receive deterministic classifications.
- Materialization combines use and type evidence. Supported callables in
  reviewed deferred storage become `captured-callback`; canonical property
  Observables that escape directly become `inert-observable`; recognized
  Angular view handles become `unavailable-view`; construction data remains
  explicit; hazards and unsupported capabilities fail closed.
- Adversarial coverage refuses destructuring, parameter/property aliases,
  mutable aliases, computed access, getters, unknown callback consumers,
  unreviewed custom callback slots, same-spelled non-RxJS streams, shadowed
  parameter names, and foreign Program declarations.
- Focused evidence: 7 usage-classifier tests pass; all 14 workspace test files
  and 264 workspace tests pass; workspace type-check, focused ESLint, Prettier,
  and `git diff --check` pass.
- The first full gate exposed a reproducible pnpm 10 smoke-fixture defect:
  transitive local tarball overrides were still generated under
  `package.json#pnpm`, so the packed consumer tried the public registry. A
  focused regression moved those temporary-project overrides to the root
  `pnpm-workspace.yaml`; the real linked/packed consumer smoke then passed.
- `TFI-MVP-2` is complete. Final verification: `pnpm check` passes with 57 test
  files and 1,027 tests, every package/application/fixture build, linked and
  packed workspace consumers, release/pack/demo checks, documentation checks,
  and the docs-site build.

### `TFI-MVP-3` implementation evidence

- Accepted `TFI3-AC-01` through `TFI3-AC-06` before production changes and
  retained the workspace/compiler ownership split from the reviewed design.
- Added a workspace-private, ephemeral renderer that reuses the exact
  `TFI-MVP-2` Program and declaration. It derives the real named exported
  options type, a relative module specifier, and a suggested generated path
  beside the registered definition source.
- The draft uses indexed-access types and `satisfies Partial<TOptions>`.
  Required captured callbacks, canonical Observables, and recognized Angular
  view handles receive generated helper calls; construction values and other
  bindings stay in a typed explicit `Pick`, optional capability inputs stay
  explicit, and unsupported properties remain visible but unassigned.
- Added the compiler-owned type-only `FactoryInputAuthoringHarness` contract.
  It has no runtime implementation, so this slice cannot execute an application
  factory, callback, subscription, or view capability and does not weaken the
  separate FAC-3/FAC-4 containment gate.
- The renderer accepts only bounded stable identifiers and normalized
  workspace-relative TypeScript paths. It refuses unexported/external option
  types and unsafe authoring context, copies no source snippets, values,
  comments, absolute paths, or diagnostic paths, writes no files, and remains
  absent from the workspace package barrel and portable schemas/artifacts.
- Focused evidence: 14 scaffold/index tests pass, including a semantic
  TypeScript check of the generated module; the combined compiler/workspace
  suite passes with 20 test files and 357 tests; both package builds, focused
  ESLint, documentation checks/site build, and `git diff --check` pass.
- Final repository verification: `pnpm check` passes with 58 test files and
  1,041 tests, every package/application/fixture build, linked and packed
  workspace consumers, release/pack/demo checks, documentation validation, and
  the production docs-site build.
- Next: `TFI-MVP-5` adds sanitized Indexing- and NIGO-shaped fixtures and the
  explicit checkout workflow, then measures generated, explicit, ambiguous,
  and unsupported authoring burden before making workplace-value claims.

### `TFI-MVP-5` implementation start

- Accepted `TFI5-AC-01` through `TFI5-AC-06` before fixture or production
  changes. The pilot must exercise the real Nx checkout and existing
  definition/lineage relationship rather than accept a second authoring target
  registry.
- The only planned user input is the existing workspace/config pair plus an
  optional stable form-ID filter. The workflow is read-only and local: no
  application factory invocation, source listing, Observable subscription,
  Angular view access, scaffold write, or portable artifact publication is in
  scope.

### `TFI-MVP-5` implementation evidence

- Added sanitized Indexing- and NIGO-shaped factory roots to the retained Nx
  workspace. Each has a colocated stable definition, both definitions share one
  domain source, and an Angular feature component calls the real factories.
- Added `inspectWorkspaceFactoryInputs` plus the read-only
  `author-factory-inputs` command. The only target inputs are the existing
  workspace/config pair and optional stable form IDs; target discovery reuses
  the exact project/source/definition/`lineage.rootSymbol` relationship from
  source usage and introduces no second path or symbol registry.
- The accepted authoring-burden measurements are:

  | Form shape | Total | Generated | Explicit | Ambiguous | Unsupported | Coverage                   | Unattributed ambiguity |
  | ---------- | ----: | --------: | -------: | --------: | ----------: | -------------------------- | ---------------------- |
  | Indexing   |    12 |         6 |        5 |         0 |           1 | incomplete                 | false                  |
  | NIGO       |     8 |         2 |        6 |         0 |           0 | complete-supported-grammar | false                  |

- Generated values are limited to typed captured callbacks, canonical inert
  Observables, and unavailable Angular view handles. Construction data and
  service bindings remain explicit. The Indexing fixture's `any` input remains
  unsupported, proving that the workflow does not trade lower authoring burden
  for invented values.
- Repeated inspection is deterministic, produces only relative suggested
  paths, excludes an embedded privacy sentinel and absolute workspace paths,
  and leaves every suggested path absent. Registered-adapter and root-factory
  execution sentinels stay armed during the complete inspection call without
  firing. The source descriptor retains the statically required literal-array
  `list` body; its non-execution is established by that grammar and source
  inspection rather than an executable sentinel inside the function.
- Missing, duplicate, unsupported, tooling-only, and overlapping application
  roots fail closed through dedicated authoring-target diagnostics. The
  workflow performs no Observable subscription, Angular view access, or
  scaffold write.
- Final repository verification: `pnpm check` passes with 59 test files and
  1,052 tests, every package/application/fixture build, linked and packed
  workspace consumers, release/pack/demo checks, documentation validation, and
  the production docs-site build.

### Production independent review instance 1 reconciliation

- A fresh Codex reviewer inspected the complete production implementation and
  plan. Its initial verdict was not ready, with two P1 and three P2 findings;
  all five were accepted.
- Authoring-target discovery now preserves stable refusal causes for duplicate
  definitions, unavailable roots, missing application Programs, and ambiguous
  application Programs. Public inspection translates those causes without
  leaking paths or source text, and an empty unsafe run cannot report success.
- Whole-options escapes create global unattributed ambiguity and block all
  otherwise generated capability helpers. Direct callable storage now uses the
  same reviewed-slot allowlist as wrapped storage.
- Review metrics are mutually exclusive property counts and expose both
  coverage and unattributed ambiguity. Documentation now consistently states
  that the compiler surface is type-only; runtime capability materialization
  remains deferred.
- TDD evidence began with five failing focused regressions and now covers all
  accepted cases, including the new public inspector refusal matrix and Nx
  adapter execution sentinels.
- Final reconciled verification: `pnpm check` passes with 60 test files and
  1,060 tests, every package/application/fixture build, linked and packed
  workspace consumers, release/pack/demo checks, documentation validation, and
  the production docs-site build. A sandboxed run reached only the packed
  consumer install before DNS refusal; the authorized network-enabled rerun of
  the exact command passed.

### Production independent review instance 2 reconciliation

- A second fresh Codex reviewer inspected the exact clean `fd5e77c..2e23e81`
  snapshot with the required blind-first protocol. Its initial verdict was not
  ready, with three P1, two P2, and one P3 finding; all six were accepted.
- The reviewer reproduced two fail-closed defects with the repository's exact
  TypeScript 5.9.3 dependency: an unresolved inherited options base and direct
  `eval()` could both yield complete coverage and a generated callback plan.
- Options analysis now checks named container and recursively traversed base
  declarations for relevant TypeScript errors/suppressions. Direct `eval()` is
  a syntactic unattributed-reflection refusal that blocks all generated
  helpers without inspecting or executing the string.
- Empty explicit form filters normalize to unfiltered selection, unsupported
  materialization has metric precedence over ambiguity, and scaffold review
  diagnostics preserve bounded reasons and storage paths.
- Added the required minor compiler changeset and refreshed stale research
  work-item statuses. Focused TDD evidence is 4 files and 48 tests, including
  all five behavioral findings; workspace/compiler typechecks, lint, changeset
  status, documentation, and diff checks pass.
- Final reconciled repository verification: `pnpm check` passes with 60 test
  files and 1,064 tests, every package/application/fixture build, linked and
  packed workspace consumers, release/pack/demo checks, validation of 119
  documentation files, and the production docs-site build.

### Production independent review instance 3 reconciliation

- The final reviewer in the original three-instance production cycle returned
  one P1 and two P2 fail-closed findings plus two documentation drifts. All were
  accepted without an architecture change.
- Property analysis now carries explicit TypeScript safety evidence. A semantic
  error or suppression forces unsupported materialization before callback,
  Observable, or Angular-view helper selection.
- Descriptor diagnostics now traverse bounded call/construct parameters and
  returns plus generic constraints, so nested `any`/`unknown` hazards prevent
  complete coverage using stable canonical paths.
- Omitted form selection remains unfiltered, while explicit `formIds: []`
  refuses before discovery even when the workspace contains valid targets.
- The research design now distinguishes the implemented TypeScript/canonical
  RxJS evidence from a deferred cross-version matrix, and the current compiler
  type-only interface from future runtime validation/materialization ownership.
- TDD began with three failing reproductions. Reconciled focused evidence is 3
  files and 41 tests; the complete workspace suite passes with 16 files and 299
  tests, and workspace type-check plus focused lint pass.
- A quick author review found no additional correctness, readability,
  architecture, security, or performance blockers. The safety gate precedes
  every helper special case, traversal reuses existing bounded descriptors, no
  dependency or portable contract changed, and explicit-empty refusal occurs
  before workspace loading.
- Final reconciled repository verification: `pnpm check` passes with 60 test
  files and 1,067 tests, every package/application/fixture build, linked and
  packed workspace consumers, release/pack/demo checks, validation of 120
  documentation files, and the production docs-site build.
- The maintainer explicitly authorized a distinct post-remediation independent
  review cycle. Its first blind-first fresh-context instance will inspect the
  clean commit produced from this reconciliation.

### Post-remediation independent review instance 1 reconciliation

- The first reviewer in the separately authorized post-remediation cycle
  returned two P1 and one P2 localized analyzer findings. All were reproduced
  directly and accepted; no package boundary or architecture change is needed.
- Class option containers now contribute their name, type parameters, and
  heritage clauses to the same declaration safety gate used by interfaces.
- Property safety checks every unique symbol/value declaration, closing merged
  interface and accessor-pair paths that previously trusted only one node.
- Callable properties retain specialized call/Observable analysis while the
  remaining normalized descriptor branches diagnose construct/member hazards.
  Direct canonical Observables do not expand inherited RxJS implementation
  internals.
- The Angular unavailable-view exception is now explicit: recognized view
  identity may retain an opaque generic argument because the helper supplies no
  value and throws if invoked; declaration errors still refuse first.
- TDD began with four failing focused regressions. Reconciled focused evidence
  is 2 files and 40 tests; the complete workspace package suite passes with 16
  files and 305 tests, and workspace type-check plus focused lint pass.
- The first full repository run reached 1,072 passing tests before the existing
  semantic-compilation test exceeded Vitest's shared 5-second default under
  full-suite contention. The unchanged assertion passed three isolated runs in
  1.7–1.8 seconds and the full 19-test file at 1.5 seconds. That intentionally
  compiler-heavy test now has a local 10-second budget; its assertions and the
  production implementation are unchanged.
- Final reconciled repository verification: `pnpm check` passes with 60 test
  files and 1,073 tests, every package/application/fixture build, linked and
  packed workspace consumers, release/pack/demo checks, validation of 121
  documentation files, and the production docs-site build.
- The maintainer requested one last fresh-context review, so this new cycle is
  capped at two instances. No additional reviewer will be started after the
  final pass; any non-blocking residuals will be recorded as fast follows.
