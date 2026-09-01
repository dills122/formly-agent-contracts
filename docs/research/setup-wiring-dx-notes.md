# Research Notes: Setup and Wiring Developer Experience

Status: working notes from the end-to-end documentation vertical; not an
accepted API or roadmap commitment

Recorded: 2026-08-31

## Why these notes exist

Building and independently reviewing the maintained Formly walkthrough exposed
places where the current configuration is correct but harder to connect than it
needs to be. These notes preserve that evidence separately from the PR's narrow
documentation fixes. Any API change still requires contract-first design,
compatibility analysis, and its own implementation plan.

## Observed friction

### One custom control has two registrations

Angular/Formly maps the application alias to a component, while Formly Contract
maps the same alias to a semantic profile. The verbose registry also repeats the
profile identity. A missing or misspelled contract-side mapping produces an
explicit `UNMAPPED_FIELD_TYPE`, but the relationship is easy to miss during
initial setup.

The current compact `defineContractedFormlyType(...)` path fixes this for the
narrow `radioChoice()` case by sharing one type declaration between
`toFormlyTypeRegistration(...)` and
`buildFieldTypeProfileRegistry(...)`. It does not yet cover other control
families or wrapper profiles.

### Wrappers form a second semantic join

A Formly wrapper is registered with Angular, named on a field, and independently
described in the contract registry when it contributes parts, preconditions, or
unknowns. This separation is necessary because visual wrappers are not always
operational, but the current setup gives authors no single view of whether all
three names agree.

### The Node-safe boundary is important but surprising

The source and project graph must be evaluable in Node, while Angular components
and browser-only modules stay in the application graph. A dedicated `contracts`
entry point is a small solution, but new adopters must understand why a normal
feature barrel may fail during discovery.

### Root, project, source, and definition each add one useful boundary

The layers provide deterministic discovery and ownership at monorepo scale, but
the first-form experience requires several files before the payoff is visible.
Most values are conventional and could be scaffolded without weakening explicit
IDs or authority boundaries.

### Formly version examples create setup branches

The maintained workspace currently demonstrates Formly 6 NgModule registration,
while new Formly 7 applications commonly use standalone providers. The contract
mapping is the same, but documentation and generators need to select the right
Angular registration shape rather than mixing both into one copy/paste path.

### Static examples can drift from maintained evidence

The documentation specimen is intentionally presentational, yet its first
version accidentally attributed sample model and expanded-wrapper state to a
fixture that starts empty and collapsed. Examples should make the boundary
between fixture evidence and illustrative application state mechanically or
visually difficult to blur.

## Candidate improvements

### Near-term documentation and tooling

1. Add an `explain` or `doctor` command that traces one field through:
   Formly type → contract registration → profile → wrapper profile → generated
   node, and gives the smallest repair for missing joins.
2. Add an `init` scaffold for root config, project config, Node-safe contracts
   entry point, source descriptor, and one definition. Defaults should remain
   explicit in generated files so adopters can review stable IDs and paths.
3. Make the CLI's `list` output show profile and wrapper coverage counts before
   factories run; reserve generation for the deeper semantic result.
4. Add maintained snippet checks or fixture-derived examples for IDs, hashes,
   aliases, and default model state that are currently copied into Markdown.
5. Give the docs separate Formly 6 NgModule and Formly 7 standalone tabs or
   paths, selected early in setup.

### Authoring API direction

1. Extend the contracted-type catalog beyond `radioChoice()` only after each
   control family has an explicit reviewed behavior model; do not infer semantics
   from component names or templates.
2. Explore a contracted-wrapper declaration that can produce both the Formly
   wrapper registration input and canonical wrapper profile while preserving the
   distinction between visual-only and operational wrappers.
3. Assemble one named Formly environment from contracted types, wrappers, and
   explicit legacy adapters, then lower it to the existing canonical registry.
   This follows ADR 0011 rather than creating a parallel configuration system.
4. Detect duplicate or divergent alias declarations at authoring/build time and
   report both source locations.

### First-form workflow to validate

A useful target experience is:

```text
formly-contracts init
  -> choose Angular registration style
  -> create explicit root/project/source files
  -> add or adapt one form factory

formly-contracts doctor shared.contact-preferences
  -> verify source and project ownership
  -> trace each custom type and wrapper mapping
  -> explain unknown or unsupported behavior

formly-contracts generate
  -> write deterministic artifacts

formly-contracts check
  -> fail when source, profile, or generated evidence drifts
```

This is a research target, not current CLI behavior.

## Constraints that improvements must preserve

- Do not infer operational semantics from an Angular component, template, DOM,
  type name, or installed UI package.
- Do not import Angular/browser-only code into the Node-safe discovery graph.
- Do not hide stable form, source, project, profile, wrapper, or driver identity.
- Do not load plugins or application modules from untrusted agent input.
- Do not make scaffolding the only supported path; existing registries and
  factory catalogs must remain adaptable.
- Keep canonical `FieldTypeProfileRegistry` output as the compiler and contract
  compatibility boundary.

## Follow-up questions

- Which setup errors dominate a real workplace pilot: discovery, Node-safe
  imports, aliases, profile mappings, wrappers, or stale output?
- Should `doctor` stop at static registry joins, or may it run controlled
  compilation when explicitly requested?
- Can wrapper authoring share a declaration safely without implying that every
  Formly wrapper is operational?
- Which generated scaffold values can be inferred from the workspace without
  turning convention into hidden authority?
- What migration report best helps a large existing registry adopt contracted
  types incrementally?
