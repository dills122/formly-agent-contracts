# Production Implementation Review 2 of 3 — Codex

- Reviewer: fresh Codex task with no inherited implementation history
- Review boundary: `origin/main` at `fd5e77c` through remediation commit
  `2e23e81`
- Initial verdict: **Not ready — three P1, two P2, and one P3 finding**
- Disposition: all six findings accepted and reconciled

## Findings and dispositions

### P1 — Options-container TypeScript errors were missed

**Accepted.** Semantic diagnostics on a named options container's heritage or
type-level declaration could sit outside both the factory and individual
property declaration ranges. An unresolved interface base therefore produced
complete coverage and a generated callback helper.

Reconciliation:

- Named interface heritage/type parameters and named type-alias declarations
  now pass the same TypeScript diagnostic and suppression gate before any
  property can become actionable.
- An unresolved options-interface base refuses the whole analysis with
  incomplete coverage and no properties.

### P1 — Direct reflection bypassed use tracking

**Accepted.** A string passed to direct `eval()` has no symbol-visible options
access for the bounded AST visitor to classify.

Reconciliation:

- A syntactic direct `eval()` call anywhere in the factory body produces an
  unattributed `reflective-access` ambiguity.
- Global ambiguity makes coverage incomplete and prevents every generated
  capability helper. No attempt is made to parse or execute the string.

### P1 — Published compiler API lacked a changeset

**Accepted.** The new type-only `FactoryInputAuthoringHarness` is a public
compiler-package API even though it has no runtime implementation.

Reconciliation:

- Added a minor `@formly-contract/compiler` changeset describing the new
  type-only authoring interface.

### P2 — Explicitly empty form selection succeeded silently

**Accepted.** `formIds: []` entered filtered mode, selected nothing, and
returned neither drafts nor diagnostics.

Reconciliation:

- An empty explicit array now normalizes to the same unfiltered selection as
  an omitted filter, so a workspace with no safe targets returns the stable
  no-target diagnostic.

### P2 — Ambiguity hid an unsupported property in metrics

**Accepted.** The initial exclusive-count implementation gave keyed ambiguity
precedence over final unsupported materialization.

Reconciliation:

- Final unsupported materialization has first precedence in summary metrics.
  Ambiguous counts include only non-unsupported properties, so hazards remain
  visible while every property still contributes to at most one category.

### P3 — Draft review diagnostics dropped cause details

**Accepted.** The scaffold review retained only diagnostic code and property,
collapsing distinct bounded ambiguity reasons or storage locations.

Reconciliation:

- Review diagnostics now preserve deterministic `reason` and `storagePath`
  fields and include them in canonical deduplication and ordering.

## Additional reconciliation

The stale research work-item statuses now distinguish the completed production
type analyzer/classifier from the earlier research spikes. Public guidance
defines unsupported-first metric precedence and names direct `eval()` as a
bounded-grammar refusal rather than implying reflective analysis.

Focused TDD evidence covers each accepted behavior. Final repository-gate
evidence is recorded in `progress.md` after this reconciliation.
