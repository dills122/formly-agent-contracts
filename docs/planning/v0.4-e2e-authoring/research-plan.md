# v0.4 E2E Authoring Research Plan

**Status:** In progress — field-type adapter and field-effects spikes complete;
choice-domain spike pending

## Executive recommendation

Run three bounded spikes before approving the v0.4 public schema:

1. determine which finite value domains can be known at declared, controlled
   build, and rendered-browser boundaries;
2. prototype the smallest application-owned field-type adapter that can
   describe interaction profiles and repeater access; and
3. determine which cross-field dependencies and effects can be surfaced
   without parsing or executing opaque function source.

Do not spike static option extraction or basic locator-ID provenance. Static
options are already proven by v0.3, and declared-vs-generated ID provenance is
a focused pre/post-build comparison with straightforward regression coverage.

The decision owner is the repository maintainer. Each spike is read-only or
prototype-only and does not authorize a public schema change.

## Shared boundaries

- Use only public synthetic fixtures in this repository.
- Do not copy workplace forms, labels, values, selectors, or business rules.
- Do not make network calls from form evaluation or subscribe to real remote
  providers.
- Do not parse `Function.prototype.toString()` or evaluate agent-supplied code.
- Prefer current official Formly, Angular, ARIA/APG, and Playwright sources,
  followed by controlled repository experiments.
- Record facts, observations, inferences, and unknowns separately.
- Stop when the decision criteria are met; do not turn a spike into production
  implementation.

## Spike 1: Choice-domain resolution boundary

### Decision question

Which possible values can v0.4 honestly label as complete, scenario-specific,
runtime-enumerable, or unknown at each compiler boundary?

### Why it matters

This decides whether `valueDomain` is sound and prevents a controlled initial
build from claiming that a dynamic option list is globally complete.

### Method

Build a synthetic matrix covering:

- non-empty and empty static options;
- custom `labelProp` and `valueProp`;
- disabled and duplicate-valued options;
- expression-driven options materialized by `FormlyFormBuilder`;
- Observable-like and promise-like sources;
- lifecycle- or component-populated options;
- options that change after another field value changes; and
- boolean controls and unmapped custom types.

Compare declared extraction, controlled scenario output, and—only where the
existing synthetic test app supports it—the rendered option set. No remote
service is used.

### Decision criteria

- Every category maps to one non-overlapping completeness state.
- No callback is executed in declared extraction.
- Scenario output cannot be mistaken for global completeness.
- The representation handles a deliberately empty list differently from an
  unresolved list.
- Canonical duplicate-value behavior is decided.

### Stop condition and artifact

Stop when the matrix has deterministic tests and every row has a recommended
contract state. Retain `docs/research/v0.4-choice-resolution.md` and a minimal
synthetic experiment. Expected size: one focused session.

## Spike 2: Field-type adapter and interaction profile

### Decision question

What is the smallest deterministic adapter API that can describe how a Formly
type renders and is operated without coupling the schema package to Angular,
Material, or Playwright?

### Why it matters

Type names such as `button-toggle`, `autocomplete`, and `table-select` do not
reliably imply ARIA roles, model codecs, or interaction verbs. The architecture
already assigns those semantics to a field-type adapter registry, but no
concrete public API exists.

### Method

Prototype metadata for public synthetic representatives of:

- native text, checkbox, select, and radio controls;
- a toggle rendered as a radio group;
- an overlay-style select;
- type-then-pick autocomplete;
- a composite row selector; and
- a repeater whose nested controls require add/expand activation.

The prototype describes metadata only; it does not add a Playwright driver.
Compare type-level registration with a narrow field-level override and record
how adapter identity contributes to deterministic output and hashing.

### Decision criteria

- Core schema DTOs remain framework-independent data.
- The adapter input never receives an agent-controlled executable path.
- Composite targets, roles, operations, finite domains, and repeater access can
  be expressed without application-specific fields leaking into the contract.
- Precedence between built-in, type-level, and field-level metadata is explicit.
- The adapter registry has deterministic identity or a deterministic hash.

### Stop condition and artifact

Stop after one API shape covers the matrix and one rejected alternative is
documented. Retain `docs/research/v0.4-field-type-adapter.md` and, if the result
changes architecture, a proposed ADR. Expected size: one to two focused
sessions.

## Spike 3: Cross-field dependency and effect representation

### Decision question

Which useful dependency and change-effect facts can be extracted from public
Formly configuration, and which must be explicitly declared by the
application?

### Why it matters

An agent needs ordering facts such as “choose A before B” and “changing B
loads C,” but guessing relationships from field proximity or function source
would make the contract untrustworthy.

### Method

Exercise synthetic cases for:

- string expressions that reference model or form-state paths;
- function expressions whose dependency is intentionally opaque;
- `props.change` or equivalent declared handlers;
- an option list filtered by another field;
- visibility/required/disabled state driven by another field; and
- an explicitly adapter-declared `loads`, `filters`, `clears`, or `toggles`
  relationship.

Compare three approaches: conservative string-reference extraction, handler
existence only, and explicit application metadata. Function-source parsing is
prohibited.

### Decision criteria

- Every edge identifies source, target, effect category, evidence, and opacity.
- An opaque handler can be surfaced without a fabricated target.
- False dependencies are not created from labels, keys, or structural
  adjacency.
- Cycles and unresolved paths have deterministic validation behavior.
- The result can later support three-valued reachability in typed test intent.

### Stop condition and artifact

Stop when the three approaches have been compared against the synthetic cases
and the ownership split is clear. Retain
`docs/research/v0.4-cross-field-effects.md` and a proposed rule-graph DTO if
warranted. Expected size: one to two focused sessions.

**Execution status:** `RS-EFFECTS-01` is complete and reconciled after
single-model and Claude adversarial review. The result is a go for explicit
application-declared effects, a conditional go for conservative string/scenario
authoring evidence, and a no-go for automatic semantic-effect inference. See
`docs/research/v0.4-cross-field-effects.md`.

## Direct implementation after the spikes

The following items do not need separate research:

- distinguish author-declared field IDs from IDs introduced by a controlled
  build;
- retain static option order, labels, values, and disabled state;
- expose the complete boolean domain for the existing built-in boolean
  semantic type; and
- preserve explicit unknowns when no trustworthy domain or interaction
  profile exists.

They still require contract review, failing tests first, and full repository
verification.

## Proposed delivery sequence

1. Complete the choice-domain decision gate and review all spike artifacts
   together.
2. Complete workspace Tasks 1–3 so typed root/project configuration exists as
   the trusted ownership boundary.
3. Approve the normalized v0.4 DTOs, profile precedence, and migration policy.
4. Complete workspace Tasks 3A–3B so project-owned field profiles are strict,
   deterministic configuration inputs.
5. Ship value-domain completeness plus static/resolved/dynamic coverage.
6. Ship interaction profiles, adapter provenance, repeater access, and ID
   provenance.
7. Ship only strict application-declared cross-field effects in the first
   slice. Keep direct-string scaffolds, opaque signals, scenario deltas, and
   browser traces as separate non-authoritative follow-on producers.
8. Add Angular-assisted inventory/scaffolding through workspace Task 8B and
   automated rendered conformance as a later acceptance slice.
9. Add the future typed test-intent policy after the contract can distinguish
   enumerated values from runtime-only choices.

`first-available` should be modeled as a test-intent selection policy rather
than a claim about the form itself. The contract should expose that choices are
runtime-enumerable while their concrete values are unknown; a consumer may
then deliberately choose `first-available` for an appropriate test.

## Gate to implementation

Implementation begins only after the maintainer approves:

- the spike conclusions;
- additive versus normalized v0.4 migration;
- adapter ownership and precedence;
- the explicit-effect DTO, endpoint/capability/readiness validation, cycle
  policy, and separation from non-authoritative evidence; and
- the placement of selection policy outside the semantic contract.
