# ADR 0011: Use Named Formly Environments and Contracted Field Adapters

- Status: Proposed for the full architecture; bounded MVP slice accepted
- Date: 2026-08-27
- MVP decision date: 2026-08-29

## Context

Form Contract `0.4.0` already has a strict, hashable
`FieldTypeProfileRegistry`. The compiler resolves exact Formly type names,
wrappers, variants, semantic parts, operations, value domains, and driver
identities from that registry. This is a useful canonical compiler input and
artifact boundary.

The current workspace authoring model, however, asks each project to provide
that verbose registry directly through `project.fieldTypeProfiles`. That does
not match how most Angular/Formly monorepos own custom fields. A base Formly or
UI library normally registers a custom type once, while many application and
feature projects consume the same environment. Repeating the expanded registry
per project creates drift and makes users maintain schema mechanics that the
tool can generate deterministically.

The planned Angular authoring lane currently inventories real registrations
and emits review-only profile scaffolds. That closes part of the evidence gap,
but it still leaves maintainers hand-copying a scaffold into the expanded
registry and does not make a real Formly environment the unit of inventory,
conformance, or reuse.

Two authority boundaries must remain intact:

1. Angular metadata, source/template analysis, and rendered observations cannot
   infer business meaning or silently authorize interaction.
2. Arbitrary TypeScript discovery cannot decide which factories are complete
   semantic forms. Explicit `FormContractDefinition` records remain the form
   inventory authority; fragments remain lineage dependencies unless separately
   registered as semantic forms.

## Accepted bounded MVP decision

The maintainer has accepted `AUTH-PILOT`, a deliberately smaller public MVP
slice, so workplace testing can begin without waiting for the full
named-environment and Angular-conformance architecture:

- `@formly-contract/schema/field-type-authoring` may expose the data-only
  `defineContractedFormlyType`, `radioChoice`,
  `toFormlyTypeRegistration`, and deterministic registry-lowering helpers;
- one reviewed radio-choice declaration may own the exact Formly registration
  name and canonical profile reference;
- the definition helper must snapshot and runtime-freeze its validated data so
  registration and profile generation cannot drift through later mutation;
- the generated canonical registry may be attached through the existing
  project `fieldTypeProfiles` input for the MVP; and
- the narrow helper is a stable `0.x` product surface, not a generated scaffold
  or inferred semantic claim.

This acceptance does **not** approve named environments, registration/scope
inventory, other behavior presets, browser conformance, environment bundles,
legacy-input removal, or whole-workspace actionability. Those remain governed
by `AUTH-0` and the approval gates below. The bounded form-definition and
source-usage pilot is recorded separately as `LIN-PILOT`; it does not make the
broader custom-field architecture part of this ADR's accepted slice.

## Proposed decision

Keep `FieldTypeProfileRegistry` as the canonical generated compiler input, but
replace raw project-level registries as the primary human authoring experience.

### 1. Name application Formly environments at the workspace boundary

The root workspace configuration owns a set of stable named Formly
environments. An environment identifies one application-equivalent Formly
registration graph and its explicit root or lazy-feature scopes. It carries
only Node-safe pointers to the application target, authoring entry, tsconfig,
scope inventory, and contracted-adapter catalog.

Projects that produce Formly contracts select one exact environment identity.
They do not redefine its field profiles. The first version supports one
environment per project and no inheritance, merging, or project override.

### 2. Author compact contracted field adapters beside field ownership

A reusable custom-field library supplies a compact, JSON-safe contracted
adapter once through the same public catalog/helper path that production uses
to register the Formly type. The contracted contribution must feed the real
registration; it is not a second manually synchronized inventory. For a
third-party type whose registration cannot consume that contribution, the
environment provides an explicit reviewed binding adapter and conformance must
prove its exact type/component/wrapper/scope join. The adapter declares only
irreducible semantic intent, using a small typed behavior vocabulary such as
choice, autocomplete, composite, repeater, display-only, or
application-driver.

The adapter declaration may name stable semantic parts, value codecs,
operations, readiness, and an exact driver identity. It does not embed Angular
components, callbacks, selectors, or executable driver modules in portable
configuration. Complex controls may pair the declaration with a typed
executable driver/harness and controlled examples inside the Angular or
application package; portable artifacts retain only stable IDs, versions, and
capabilities.

### 3. Generate the canonical registry deterministically

The Angular authoring host inventories the configured real Formly environment,
aggregates its library/application adapter contributions, and joins them by
exact type, component, wrapper, variant, and scope identity. A pure lowering
step compiles reviewed adapter declarations into the existing canonical
`FieldTypeProfileRegistry`.

“Generated” here means deterministic compilation of reviewed declarations. It
does not mean inferring interaction semantics from a component name, template,
DOM role, event handler, or observed state transition.

The environment build emits a separate manifest that pins at least:

- environment ID and version;
- configured scope inventory and its hash;
- adapter-catalog hash;
- generated canonical registry hash;
- Angular/Formly/tool compatibility identity;
- conformance result hashes;
- omissions, conflicts, unsupported controls, and incomplete coverage.

### 4. Keep evidence and authority distinct

| Input or artifact | Role | May authorize execution? |
| --- | --- | --- |
| Reviewed contracted adapter | Human-owned semantic declaration | Semantic authority, but not independently actionable; yes only inside an exact conformant actionable environment bundle |
| Generated `FieldTypeProfileRegistry` | Canonical compiler IR and compatibility boundary | Yes, when its environment bundle is actionable |
| Formly registration inventory | Exact configured type/component/wrapper/scope evidence | No; it validates bindings and coverage |
| Source/template analysis | Derived review assistance | No |
| Controlled render/browser observation | Conformance or drift evidence | No independent authority |
| Generated scaffold | Legacy migration/review aid | No, until reviewed as an adapter declaration |

Missing, ambiguous, conflicting, or unverifiable behavior fails closed. No
precedence rule silently chooses one duplicate contribution, and no observation
rewrites an adapter or registry.

### 5. Make conformance part of actionability

An environment inventory may be published as incomplete evidence, but an
environment bundle is actionable only when every profile required by the
selected context:

- resolves to one exact configured registration and adapter contribution;
- lowers to a valid canonical profile and exact driver capability;
- passes required static binding checks; and
- passes its required controlled-example/component conformance.

Broader application journey or browser-parity tests remain separate. One
passing example never proves whole-workspace completeness.

Display/assertion-only components require an explicit non-interactive
disposition. They never receive a fake interaction or driver merely to satisfy
the current profile shape; the schema must first support their intended
assertion surface.

### Compatibility clarification: preserve explicit semantic form registration

Each explicitly supported semantic form ID has one lightweight
`FormContractDefinition`. A domain or Nx project may group many definitions in
one `FormContractSource`, and an adapter may reuse an existing application form
registry. Angular multi providers contribute source groups beside feature
ownership; they do not eliminate the stable form ID/factory anchor.

“One integration per boundary” means no root/project-config entry per form. It
does not mean one definition represents many unrelated semantic forms. Root
symbol identities remain separate many-to-many lineage anchors. Fragments are
tracked as dependencies and are not promoted to standalone contracts unless a
maintainer explicitly registers them as semantic forms.

## Compatibility and migration

- Form Contract `0.4.0`, its field-profile registry schema, compiler resolution,
  canonical bytes, and hashes remain the initial compatibility boundary.
- Workspace configuration `0.3.0` introduces named environments while retaining
  `project.fieldTypeProfiles` as an explicit deprecated legacy input for that
  one pre-1.0 transition.
- The next breaking workspace-configuration schema, targeted as `1.0.0`,
  removes the legacy input unless the named `AUTH-MIG-1` checkpoint records
  workplace evidence and an explicit ADR amendment extending it. Silence or
  incomplete adoption does not extend the window automatically.
- A project may select a named environment or provide a legacy raw registry,
  never both. The implementation does not merge them or silently choose one.
- Legacy registries normalize internally to project-scoped synthetic
  environment provenance without changing their canonical registry bytes.
- A non-mutating migration report may group identical legacy registry hashes
  and suggest a shared environment. It never auto-hoists or deduplicates them,
  because matching bytes do not prove common ownership.
- Existing `FormContractSource.list()` remains compatible. New authoring may add
  typed definition helpers and static definition collections without changing
  current factory execution semantics.

## Consequences

- Custom-field semantics are authored once near library ownership and reused by
  every project selecting the same real Formly environment.
- Users do not maintain schema versions, registry hashes, or expanded nested
  profile DTOs as the normal workflow.
- The existing compiler remains deterministic and framework-neutral because it
  still consumes only the canonical registry.
- Angular-specific inventory and conformance remain outside generic workspace
  discovery and the root orchestrator.
- Environment generation becomes a producer prerequisite for actionable
  contract contexts rather than a detached report-only feature.
- Raw registries remain supported long enough for migration but no longer define
  the intended product UX.
- The adapter vocabulary and profile schema must explicitly settle
  non-interactive controls and complex typed operations before those control
  families can be claimed as generally executable.

## Alternatives rejected

### Keep project-owned raw registries as the primary interface

This preserves the current implementation but duplicates global Formly
configuration across projects and exposes verbose generated structure as human
authoring surface.

### Infer profiles from Angular metadata or rendered DOM

This can produce useful evidence and scaffolds, but it cannot reliably prove
overlays, codecs, child-component DOM, multi-step behavior, business meaning,
or completeness. Treating it as authority recreates selector and interaction
guessing.

### Boot the application and use runtime registrations directly at query time

That would make agent queries execute trusted application code, couple results
to mutable runtime state, and collapse producer and consumer trust boundaries.

### Let every project override or merge an environment

This makes effective authority order-dependent and complicates hashing,
coverage, and conformance. The first version uses one exact environment or one
legacy registry.

## Approval and implementation gates

The full architecture in this ADR becomes Accepted when maintainers approve:

1. named workspace environments and one-environment-per-project selection;
2. reviewed compact adapters as semantic authoring authority;
3. deterministic lowering to the existing canonical registry;
4. fail-closed conformance as the actionability gate;
5. legacy-registry/environment mutual exclusion and migration policy; and
6. the `0.3.0` to `1.0.0` legacy migration/removal gate above.

The remaining implementation is then split into schema identity, workspace
environment selection, additional compact adapter lowering, Angular
inventory/catalog aggregation, controlled conformance, and environment-bundle
publication. Runtime-host, Angular-authoring, factory-binding, context-gate,
and custom Playwright tasks must reference the settled identities rather than
inventing parallel models.
