# Task Plan: Package Review Remediation

Goal: close every accepted package-level finding from independent review
instance 1 without expanding the public contract beyond its existing v0.3
requirements.

## Traceability

| Finding | Requirement boundary | Implementation task | Regression evidence | Status |
| --- | --- | --- | --- | --- |
| IR-001 | Resolved compilation uses the same allowlist as declared extraction | Allowlist resolved rule targets and use target-specific projection | Adversarial option and custom-target tests | Complete |
| IR-002 | Synthetic scenario inputs do not alias caller-owned mutable data | Deep-clone `formState` with explicit failure behavior | Nested mutation and clone-failure tests | Complete |
| IR-003 | Unsupported form behavior is explicit | Diagnose Formly `RegExp` patterns until a versioned representation exists | RegExp diagnostic test | Complete |
| IR-004 | Type-valid unsupported keys fail safely and deterministically | Diagnose invalid numeric key segments and use structural identity | Negative/fractional scalar and array-key tests | Complete |
| IR-005 | Canonical JSON cycle rejection is executable evidence | Add proof tests for existing guards | Canonicalizer and contract-value cycle tests | Complete |
| IR2-001 | Invalid scenario inputs fail before application-controlled code runs | Clone model and form state before `createFields()` | Model/form-state call-count failure tests | Complete |

## Phases

- [x] Record red regressions for IR-001 through IR-004 and proof coverage for
  the already-implemented IR-005 cycle guards.
- [x] Implement the smallest package fixes and make focused tests green.
- [x] Update contract/usage documentation and retained traceability.
- [x] Run package checks, `pnpm check`, and clean-clone verification.
- [x] Complete code-quality review and independent review instance 2 of 3.
- [x] Remediate the instance-2 clone-order finding and rerun repository and
  clean-clone gates.
- [x] Complete final independent review instance 3 of 3 and directly reconcile
  its retained-plan documentation finding.
- [ ] Publish and merge only after all review blockers are closed.

## Scope

In scope:

- `packages/contract-schema/`
- `packages/formly-adapter/`
- package-facing specifications, plans, and README guidance
- focused synthetic integration evidence only where the trusted builder is
  required

Out of scope:

- MCP implementation
- browser-observed locator capture
- locator execution
- schema support for serializing `RegExp` objects

## Decisions

- IR-003 will emit a stable diagnostic rather than introduce schema v0.4.
- IR-004 will preserve extraction with structural fallback rather than throw.
- Review instance 2 is mandatory because IR-001 and IR-002 change trusted
  scenario compilation behavior.
- Instance 2's clone-order remediation materially changed reviewed boundary
  behavior, so instance 3 completed the configured review loop. Its only
  finding was this plan's stale state; no fourth review may be started.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| New matcher-array assertion violated `no-unsafe-return` | First lint run | Replaced it with typed per-index containment assertions; lint then passed. |
| Interactive-shell startup printed `(eval):5: parse error near end` in the clean clone | Clean-clone command | The command itself exited successfully; frozen install and every `pnpm check` stage passed, so this was an unrelated shell-startup warning. |
