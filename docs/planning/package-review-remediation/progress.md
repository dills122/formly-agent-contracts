# Progress: Package Review Remediation

## 2026-08-25

- Accepted all five package-level findings from independent review instance 1
  of 3.
- Created branch `codex/package-review-remediation` from `main` at `e74f5ae`.
- Mapped each finding to its existing requirement boundary, implementation
  task, and required failing regression.
- Selected diagnostic fallback for `RegExp` patterns to avoid an unnecessary
  public schema revision.
- Localized the root causes: generic rule-value serialization, shallow
  `formState` copying, string-only pattern projection, and inconsistent numeric
  key filtering. IR-005 is coverage-only because cycle rejection already
  exists, so its new tests are expected to pass before implementation changes.
- Chose target-specific resolved projection, structured cloning for both
  scenario inputs, diagnostic fallback for unsupported patterns/keys, and
  positional identity for invalid numeric keys.
- Added regressions before changing production code. The focused red run
  produced six expected adapter failures covering IR-001 through IR-004;
  29 tests passed, including all new IR-005 cycle-rejection proofs.
- Implemented target-aware rule projection. Resolved options now reuse the
  public option projector, supported state/presentation/locator targets retain
  only their contract shapes, and unsupported targets remain declared with a
  stable diagnostic.
- Structured-cloned scenario form state, diagnosed unsupported `RegExp`
  patterns, and converted invalid numeric keys to diagnosed positional nodes.
- Focused tests are green (35/35), the real Formly compatibility fixture is
  green (2/2), package type checks pass, and the full unit suite is green
  (56/56).
- Updated the README, semantics specification, and relevant ADRs with the
  remediated behavior and explicit boundaries.
- Passed `pnpm check` in the implementation worktree: lint, 56 tests, all
  package/application builds, demo smoke, and 35-file documentation checks.
- Applied the exact staged patch to a fresh local clone, installed with
  `pnpm install --frozen-lockfile`, and passed `pnpm check` there as well.
- Completed the five-axis merge-quality review with no required findings: the
  patch remains within package ownership, adds no dependencies or dead code,
  bounds retained resolved data to existing contract projections, and has no
  unbounded work beyond the form tree already traversed by extraction.
- Independent review instance 2 returned `Not ready` with one P2 finding:
  clone validation ran after `createFields()`. Accepted the finding after the
  reviewer reproduced one factory call and zero builder calls for invalid form
  state.
- Added red call-count regressions for both invalid model and form state, then
  moved both clones ahead of `createFields()`. The focused adapter suite is
  green (19/19), proving neither application-controlled entry point runs on
  either failure path.
- Re-ran `pnpm check` after the instance-2 remediation: lint, all 57 tests,
  package/application builds, Angular production build, demo smoke, and
  documentation checks passed.
- Independent review instance 3 found no code defects and independently passed
  the frozen offline install, focused Formly tests (21/21), full `pnpm check`
  (57 tests), and `git diff --check` from an isolated clone.
- Instance 3 returned `Not ready` only because `task_plan.md` had not recorded
  IR2-001 or the completed review sequence. Accepted and directly corrected the
  retained-plan finding. This closes the configured three-instance review loop;
  no additional reviewer will be started.
