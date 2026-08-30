# Post-Remediation Implementation Review 1 — Codex

- Reviewer: fresh Codex task with no inherited implementation history
- Review boundary: `fd5e77c` through clean commit `6d7c27b`
- Initial verdict: **Not ready — two P1 and one P2 finding**
- Disposition: all three findings accepted and reconciled

## Findings and dispositions

### P1 — Class options-container diagnostics could generate helpers

**Accepted.** Container safety nodes covered interfaces and type aliases but
not class declarations. A class with an invalid generic constraint or heritage
clause could therefore retain complete coverage and a generated callback.

Reconciliation:

- Class names, type parameters, and heritage clauses now enter the same
  TypeScript diagnostic/suppression gate as interfaces.
- Focused class regressions cover `extends`, `implements`, and a generic
  constraint. Unsafe containers return no actionable properties.

### P1 — Only one property declaration was checked

**Accepted.** Property safety selected a single value/first declaration. A
merged interface or accessor pair could place the TypeScript error on another
declaration while the safe callback declaration still generated a helper.

Reconciliation:

- Safety now checks every unique symbol declaration plus a distinct value
  declaration before assigning `safe`.
- Scaffold regressions prove that merged properties and accessor pairs retain
  incomplete coverage, generate no helper, and remain unsupported.

### P2 — Top-level callable complements were not diagnosed

**Accepted.** Specialized call-signature analysis skipped the complete
descriptor traversal. Construct signatures and attached members on the same
callable could contain hazards while coverage remained complete and the
unsupported property had no explanation.

Reconciliation:

- After specialized call handling, the analyzer traverses the remaining
  top-level descriptor branches, including construct signatures, members, type
  arguments, and constraints.
- Direct canonical Observables remain governed by their specialized emission
  analysis rather than expanding inherited RxJS implementation members.
- A hybrid callable regression proves canonical diagnostic paths for both a
  constructor `any` and attached-member `unknown`.

## Residual-risk clarification

Recognized Angular view handles intentionally allow an unavailable-view helper
despite an opaque generic argument such as `TemplateRef<unknown>`. The helper
does not manufacture or inspect a value and throws if used. Declaration
diagnostics/suppressions still take precedence, and same-spelled application
types remain unrecognized. The research design now states this narrow exception
instead of implying that every generic `unknown` has identical materialization.

Focused TDD and final repository-gate evidence are recorded in `progress.md`.
