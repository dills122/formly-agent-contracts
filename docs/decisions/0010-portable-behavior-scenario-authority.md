# ADR 0010: Define Portable Behavior and Scenario Authority

- Status: Proposed
- Date: 2026-08-27
- Decision owner: Repository maintainers
- Work item: `BHV-0`
- Evidence baseline: `158e458`

## Context

Form Contract `0.4.0` already carries the semantic form tree, declared and
resolved field facts, reviewed field-type interaction profiles, explicit
cross-field effects, diagnostics, and a canonical content hash. It is an
implemented compatibility boundary, not an open container for the broader
agent-context work.

Behavior needed by an E2E planner spans three different claims:

1. a portable semantic claim that one condition or event affects a target;
2. a trusted compilation claim that a named scenario reached a state; and
3. a runtime/browser claim that one visited execution observed a state or
   transition.

Those claims do not have equal authority. A scenario delta or browser trace can
show that a state was reached, but cannot prove why it was reached, whether an
option change was a load or a filter, or whether unvisited behavior is absent.
Likewise, a reviewed field profile can authorize how to operate a repeater or
wrapper without declaring a business effect between fields.

The current implementation makes several relevant boundaries concrete:

- the cross-field registry accepts exactly five semantic kinds and only
  declared, transparent, JSON-safe effects;
- the compiler resolves effect endpoints, target capabilities, condition IDs,
  readiness, and cycles before projecting an effect;
- field and wrapper profiles retain reviewed operations, parts, capabilities,
  readiness, and ordered activation preconditions;
- a Formly array template has stable contract structure and wildcard model
  paths, while runtime rows do not have durable contract identity; and
- the current workspace scenario surface has a trusted `create()` callback but
  no portable replay contract or case-specific evidence identity.

Without a retained authority decision, a later schema could accidentally make
scenario observations causal, flatten access prerequisites into business
effects, treat one global completeness bit as proof of independence, or mutate
`0.4.0` in place.

## Proposed decision

If accepted, this ADR establishes the authority and ownership boundary for the
`BHV-1` through `BHV-4` implementation slices. It does not approve a public DTO
name or implement a schema.

The decision has eight parts:

1. Portable behavior/scenario definitions, trusted resolved scenario evidence,
   and runtime/browser observations are strict sibling artifacts. Every one is
   bound to the exact `{ schemaVersion: "0.4.0", formId, contentHash }` of its
   basis Form Contract.
2. Portable causal edges, acausal target states, and access prerequisites are
   disjoint record families. Evidence cannot change one family into another.
3. Only a validated application declaration or a closed normalized rule with
   an exact witnessed case may be primary evidence for a causal edge. Scenario
   and observed evidence may corroborate such an edge but may not create one.
4. The five implemented v0.4 effect kinds map losslessly. Reset-on-hide remains
   a separate value-reset fact and is never inferred from visibility alone or
   relabeled as the v0.4 `clears` kind.
5. Scenario cases distinguish JSON-safe E2E replay from trusted compile-only
   setup. Resolved scenario states are acausal and case-scoped.
6. Profile, wrapper, driver, and repeater declarations jointly own access
   authority. Runtime repeater items are represented by transient execution
   handles, never persisted as contract node IDs.
7. Completeness is keyed by facet, scope, exact basis, and applicable producer.
   Edge absence proves only bounded independence, and only when every applicable
   producer is complete and the coordinate is free of conflicts and relevant
   unknowns.
8. Schema names, schema IDs, literal union spellings, and stable diagnostic
   codes are deferred to `BHV-1`, after `CTX-0A` establishes the
   schema-addressed artifact-set envelope.

Because the status is **Proposed**, none of these normative choices should be
treated as maintainer approval until the decision owner accepts the ADR.

## The two operational answers

### What may create an executable causal edge?

A portable edge may have causal authority only when all of the following hold:

1. its exact Form Contract `0.4.0` basis is present and hash-valid;
2. its source/condition, target node, target facet, and evidence references all
   resolve in that basis;
3. its primary evidence is either:
   - a validated application declaration, including a projected v0.4 explicit
     cross-field effect; or
   - a fully normalized rule in the approved closed grammar, with every emitted
     branch backed by exact JSON-safe domain, declaration-case, or scenario-case
     input witnesses;
4. its transition is no stronger than that evidence permits: only explicit
   declarations may supply the business verbs `loads`, `filters`, `clears`,
   `controls-state`, and `toggles`; a normalized rule may supply only the exact
   witnessed state relationship it proves;
5. it is not in an unresolved semantic conflict and every required access,
   operation, driver, timing, and readiness capability validates; and
6. scenario or observed evidence, if present, is corroborating only.

A causal edge can remain semantically valid while the overall behavior
inventory is partial. That permits a known positive flow to be planned. A
browser-executable plan still refuses if the selected operation, access path,
timing, readiness, or cycle convergence needed by that flow is unknown.

### When does edge absence prove independence?

For an exact source, target, facet, scope, and Form Contract basis, absence may
prove **direct, scoped independence** only when:

- the applicable producer inventory is explicitly closed;
- every applicable producer reports complete coverage for that same coordinate;
- no localized unknown can affect it;
- no basis, identity, semantic, evidence, or cycle conflict affects it; and
- no accepted edge or normalized rule for that coordinate references the
  proposed source in its trigger or condition.

If any condition fails, the result is `unknown`, not independent. A form-wide
claim, a different facet, a different scenario axis, or a different Form
Contract hash requires its own completeness proof. Transitive independence
additionally requires a complete, conflict-free graph for every facet/scope
coordinate traversed; direct edge absence alone is not a transitive proof.

## Artifact graph and hash binding

The logical artifact graph is:

```text
Form Contract 0.4.0 { formId, contentHash }
        |
        +--> portable behavior/scenario definitions
        |       - normalized conditions and witnessed cases
        |       - declared/derived edges and declared states
        |       - profile-owned access prerequisites
        |       - scenario axes, replay metadata, completeness, unknowns
        |
        +--> trusted resolved scenario evidence
        |       - exact portable axis/case reference when applicable
        |       - compiler/host identity and resolved artifact hash
        |       - acausal case-local states and structural deltas
        |
        +--> runtime/browser observation evidence
                - exact selected case/step references when applicable
                - observer identity/environment and visited states

All validated content hashes --> schema-addressed context artifact set
                                --> pure context/intent validation
                                --> reviewed Playwright driver execution
```

“Sibling” means that none of these records is added to or hidden inside Form
Contract `0.4.0`. A sibling may reference another sibling when its meaning
depends on it, but only by an exact schema/version/content-hash reference. It
does not mean the artifacts are unrelated.

Every sibling artifact must:

- use a strict, versioned schema and reject unknown keys and non-JSON content;
- carry and validate the exact basis tuple
  `{ schemaVersion: "0.4.0", formId, contentHash }`;
- compute its own canonical, non-self-referential content hash;
- carry exact upstream content hashes for any portable scenario definition,
  producer configuration, or resolved artifact it references;
- refuse a missing, stale, mixed-form, mixed-version, or mixed-hash join; and
- never resolve an unpinned “latest” artifact during query or planning.

The Form Contract hash already covers the form ID and all v0.4 semantic
content, including projected effect/profile identities. Carrying `formId` as
well as `contentHash` keeps diagnostics and referential integrity explicit; a
consumer must validate both rather than assuming one from the other.

The schema-addressed context artifact set references these independent hashes.
It does not rehash copies of their payloads, assign them new authority, or
participate in their hash inputs.

## Semantic record topology

The following names describe responsibilities; they are not final public DTO
names.

### Causal edge

A causal edge records a trigger or closed rule, a target node and facet, a
transition, optional guard/expected state, timing/readiness, ordering, and
primary/corroborating evidence.

An edge must have causal primary evidence. A scenario delta, runtime event, or
browser trace without independently authoritative causality is never serialized
or projected as an edge.

The minimum facet model must keep visibility, required, readonly, enabled,
options, value, validity, touched, and reachability distinct. `BHV-1` decides
the exact public spellings and whether additional facets are required; it must
not collapse readonly into enabled, validation into required, touched into
validity, or reachability into visibility.

For this authority decision, a rule is closed only when all syntax normalizes
without partial fallback to:

- operands that are resolved same-contract node values, allowlisted form-state
  paths, or JSON literals;
- strict equality/inequality, supported ordered scalar comparisons, membership
  in a literal list, `present`, `empty`, `not`, `and`, and `or`; and
- a supported target facet and state under pinned JavaScript/Formly evaluation
  semantics.

Calls, assignments, coercive equality, computed/dynamic paths, getters,
template evaluation, nested functions, aliases, helpers, imports, and partial
parse results are not closed. Each positive or negative branch is authorized
independently and only when its exact inputs have valid witnesses; one witnessed
branch does not authorize its complement.

### Acausal target state

A state records a target node/facet and a JSON-safe value, or a JSON-safe
discriminator for `undefined` or node absence. It has no trigger and makes no
causal claim.

Declared static state can be an actionable, basis-bound assertion. A closed
witnessed rule can carry its exact expected branch state. A trusted scenario
state has scenario-local authority only. An observed state has observation-only
authority. The primary evidence category is structural and cannot be upgraded
by adding higher-confidence corroboration.

### Access prerequisite

An access prerequisite records how a stable semantic node or wildcard array
template becomes operable. It contains ordered wrapper activation and/or an
exact repeater access plan, its driver/part authority, and the resulting access
readiness boundary.

Access is not a business effect. Clicking a wrapper, adding a repeater item, or
expanding an existing item does not imply `loads`, `toggles`, or another
cross-field verb. A separate declared/derived edge is required when activation
also has business semantics relevant to the plan.

The three record families are mutually exclusive. A validator must reject a
record that mixes their required fields or attempts to use evidence to switch
its family.

## Evidence and authority matrix

Evidence origin, confidence, materialization state, and execution authority are
separate axes. Confidence never raises authority.

| Primary evidence | Causal edge authority | State authority | Access authority | Permitted execution use | Completeness contribution |
| --- | --- | --- | --- | --- | --- |
| Validated application behavior declaration, including a v0.4 explicit effect | Yes, exactly as declared and reference-validated | Yes, for an explicitly declared state | No, unless it is separately a profile/access declaration | May order a plan after operation/access/readiness validation | Only for the declared producer/facet/scope when its coverage claim and every record validate |
| Closed normalized rule with exact branch witnesses | Yes, only for the normalized condition, witnessed inputs, target facet, and expected state | Yes, for that witnessed branch | No | May generate only the witnessed branch steps; never a business verb | Only for the closed grammar and analyzed producer scope; an unwitnessed branch stays unknown |
| Declared static Form Contract field fact | No causal relationship by itself | Yes, for the exact basis and initial/static scope | No | May supply an initial assertion | Contributes only to the static producer coordinate |
| Validated field, wrapper, repeater, and driver declarations | No business edge | Only state/readiness facts explicitly declared by the profile | Yes, jointly and only after exact composition validation | May supply wrapper/repeater access and a supported operation | Contributes only to profile/repeater reachability and readiness coordinates |
| Trusted resolved scenario case | No; may corroborate an existing edge | Scenario-local acausal state | No; may supply a required existing-item witness but cannot invent an access sequence | A replayable case may supply validated UI inputs and case-local expectations; a compile-only case supplies no browser steps | Only within an explicitly declared-complete scenario-axis scope; never global form/node completeness |
| Runtime or browser observation | No; corroboration or drift evidence only | Observation-only, for the visited path | No; may corroborate a declared access plan | May verify conformance of a selected plan; cannot originate plan operations or expectations | None for semantic inventory completeness |
| Callback/hook/validator/RxJS scaffold or opaque diagnostic | No | No, except an independently produced state record | No | Review queue only | Makes the affected producer/facet/scope partial or unknown |

Only the first two causal rows receive bounded edge actionability. Profile and
wrapper declarations receive bounded access actionability, not causal
actionability. Scenario replay inputs are portable declarations; the resolved
scenario outcome remains acausal evidence.

## Lossless Form Contract 0.4.0 effect mapping

Every projected v0.4 effect retains the exact Form Contract basis, effect
registry schema/ID/version/content hash, form-scoped effect ID/version, trigger
node/event, target node/property, timing/readiness, condition rule reference,
ordering, declared evidence, and transparent opacity. Projection must not
silently coalesce two effect identities or reconstruct missing values.

| Actual v0.4 kind | Allowed v0.4 target | Portable transition | Required preservation and refusal behavior |
| --- | --- | --- | --- |
| `loads` | `options` | `loads` | Preserve the declaration and readiness. Do not synthesize an option value, provider, or expected collection. |
| `filters` | `options` | `filters` | Preserve the declaration and readiness. Do not infer the predicate, source collection, or resulting options. |
| `clears` | `value` | `clears` | Preserve the declared business verb. Include an expected clear value only if separate declared codec/state evidence supplies it. |
| `controls-state` | `enabled`, `required`, or `visibility` | `controls-state` | Preserve the optional condition reference. Do not infer polarity or convert it into an unconditional set operation. |
| `toggles` | `enabled`, `required`, or `visibility` | `toggles` | Preserve its non-idempotent meaning. Do not convert it to `controls-state` or a fixed expected state. |

These are the five kinds implemented by
[`CrossFieldEffectKind`](../../packages/schema/src/cross-field-effect.ts).
There is no sixth v0.4 effect kind.

Reset-on-hide is separate:

- a visibility edge records visibility only;
- a value-reset causal claim requires the effective field/global reset policy,
  the applicable hide branch, stable target scope, and an exact witness to be
  proven in the same basis;
- when those facts are closed, a successor record may express the separate
  value-reset relationship and expected `undefined`/absence state;
- otherwise the value consequence is unknown; and
- the successor relationship is never relabeled as the application-declared
  v0.4 `clears` kind.

The exact successor transition spelling for reset-on-hide is a `BHV-1` schema
choice; its semantic separation is decided here if this ADR is accepted. Any
automatic reset relationship uses the same bounded derived-rule authority and
witness requirements above.

## Portable and trusted scenario rules

The scenario topology separates portable case meaning from trusted execution.

### Portable scenario definition

A portable axis/case definition is JSON-safe and versioned. It identifies its
axis and case, its declared coverage, and one of two replay modes:

| Case mode | Portable content | Browser use | Trusted compiler use |
| --- | --- | --- | --- |
| E2E-replayable | Ordered, schema-validated node operations and JSON values, with exact value/witness evidence | May generate only those validated operations after profile/access validation | May also be used to reproduce the case |
| Compile-only | Stable case identity and a JSON-safe reason/disposition; no invented UI equivalent | Generates no browser operation | May reference trusted provider, fixture, model, or form-state setup outside the serialized artifact |

The executable workspace/Angular `create()` callback remains trusted build
code and is never copied, stringified, interpreted, or returned through the
context/query boundary. A case is not replayable merely because its callback
returned JSON.

Scenario input witnesses must resolve to the same exact Form Contract basis and
to an operation allowed by the selected node profile. Scenario-case evidence
must resolve to a replayable case, must not depend on a compile-only case for a
UI operation, and must form an acyclic dependency graph.

### Trusted resolved scenario evidence

A trusted resolver produces a separately hashed artifact for an exact portable
axis/case and Form Contract basis. It records the producer/host identity, the
case identity, the resolved artifact hash, bounded settling/disposition
metadata, acausal states, structural deltas, and localized unknowns.

Values must be canonical JSON or JSON-safe discriminators for `undefined` and
node absence. Functions, class instances, Observables, services, DOM nodes,
Angular injectors, and other capabilities are rejected from the artifact.

A resolved state says “this exact case reached this state.” It does not say:

- which input caused the state when several inputs/providers/time changed;
- that an options delta was a load rather than a filter;
- that an added/removed node is a normal property transition;
- that another case or unvisited branch behaves the same; or
- that the case is browser-replayable.

Added or removed nodes remain structural deltas with localized unknowns. They
are not fabricated as ordinary node-property effects. A scenario observation
may corroborate a causal edge only by an exact evidence reference; it never
becomes the edge's primary evidence.

### Runtime/browser observation

An observation artifact records the exact basis, observer ID/version,
environment identity, selected scenario/step when present, visited target
state, and trace ordering needed for conformance. It may report agreement or
drift against a declaration or scenario expectation.

Observation cannot:

- create a causal edge, semantic verb, access sequence, readiness contract, or
  replay operation;
- upgrade scenario or declared coverage;
- close an unvisited branch;
- override a declaration by confidence, recency, or event count; or
- prove that no other producer affects the target.

## Profile, wrapper, and repeater authority

The v0.4 form artifact already carries the participating field-profile registry
identity/hash, the selected profile ID/version, composed parts, interaction,
driver ID/version/capabilities, effect capabilities, ordered wrapper
preconditions, unknowns, and provenance. The successor projection must retain
the exact authoring origins needed for access authority rather than treating a
flattened string as sufficient evidence.

For each access prerequisite:

1. the exact field-profile registry schema/ID/version/content hash and selected
   profile ID/version must resolve;
2. every contributing wrapper must resolve to its exact wrapper profile
   ID/version in that same registry, with its source position and requested
   order retained;
3. wrapper preconditions compose in declaration/request order, and every
   contributing declaration is jointly authoritative;
4. the declared part role/cardinality and operation must pass the same strict
   surface validation as v0.4 (`click` uses one button; `check` uses one
   checkbox/radio; generic operations retain their required roles and
   cardinalities);
5. blocking profile/wrapper unknowns, duplicate wrappers, part conflicts, stale
   profile references, or missing driver capabilities refuse the runnable
   prerequisite; and
6. scenario/observed evidence may corroborate the access path but cannot repair
   or replace a missing declaration.

The current v0.4 node projection flattens wrapper preconditions and retains
wrapper names in provenance. `BHV-2` therefore must project exact wrapper
identity from the validated registry/bundle and source composition, not pretend
that the current provenance string alone is a complete wrapper evidence
reference. This adds no property to the `0.4.0` contract.

Repeater access follows this closed policy:

1. `interaction.operation` is the preferred operation. Other driver
   capabilities are eligibility evidence, not interchangeable plans.
2. The preferred operation must be in the exact selected driver capability
   set. A generic executor retains its named action part and `itemPart`; an
   application executor retains only its allowlisted driver ID/version and the
   semantic operation it implements.
3. `add-item` binds the newly created item returned by the validated driver.
4. `expand-item` requires an explicit, versioned existing-item witness, such as
   a scenario-local item index. The existence of an `expandPart` does not select
   a row. A future durable item-key witness requires its own schema decision.
5. The persistent semantic target is the Form Contract array node and its
   stable wildcard array-template node. Runtime row indices, DOM IDs, locators,
   elements, and driver objects are never persisted as semantic endpoints.
6. Driver execution returns a transient item handle scoped to the validated
   execution/capture step. A serialized plan may identify the reviewed capture
   slot, but the runtime handle itself is never serialized, reused as a node ID,
   or accepted from an agent.
7. Nested child operations resolve the stable wildcard child node relative to
   that transient handle.

If any gate fails, the result is a localized reachability/access unknown and no
runnable access prerequisite.

## Completeness model and negative inference

Completeness is a coordinate, not a form-wide boolean. Every completeness claim
is bounded by all of the following:

| Coordinate | Required meaning |
| --- | --- |
| Basis | Exact Form Contract schema version, form ID, and content hash, plus the exact producer configuration/normalizer/scenario artifact hashes that affect the claim |
| Facet | One semantic facet, such as visibility, required, options, value, validity, touched, or reachability |
| Scope | Exact form, node, wildcard template, or versioned scenario-axis scope; scenario-axis scope may optionally narrow to a node |
| Producer inventory | The explicitly closed set of applicable static, rule, cross-field, lifecycle, profile/repeater, and scenario producers for that coordinate |
| Producer status | Complete, partial, or unknown for each applicable producer, including a complete producer that found zero records |
| Conflict state | Whether an identity, semantic, basis, evidence, access, or cycle conflict affects the coordinate |

`BHV-1` chooses the final DTO representation, but it must preserve every
coordinate above. Consumers may not reconstruct the applicable producer
inventory from records that happened to be emitted. A zero-record complete
producer must be represented explicitly; a missing producer entry is not a
zero.

An aggregate is complete only when:

1. the applicable producer inventory is itself explicit and closed;
2. every applicable producer is complete for the exact facet/scope/basis;
3. every referenced declaration, rule, witness, profile, scenario case, and
   artifact validates;
4. no localized unknown can affect the coordinate; and
5. the coordinate has no unresolved conflict or unconverged effect cycle.

Additional constraints apply:

- a v0.4 `coverage: "complete"` application claim can close only the
  cross-field producer after all declared effects validate and no opaque
  surface can affect the coordinate;
- an opaque callback, hook, validator, parser, dynamic expression, or unresolved
  target blocks only the facets/scopes it may affect, except an unresolved
  target with unknown facets blocks every form-facet coordinate it could reach;
- scenario coverage can be complete only inside the matching, explicitly
  declared-complete versioned axis and only when every case produced the exact
  referenced artifact;
- compile coverage and browser replay coverage are separate; compile-only cases
  can close a compile axis but cannot close replay coverage;
- scenario-axis completeness never closes global form/node behavior
  completeness; and
- observation is outside the semantic completeness inventory and never raises
  it.

The negative-answer rule is deterministic:

| Evidence at the exact coordinate | Permitted answer |
| --- | --- |
| A validated, conflict-free causal edge exists | The bounded relationship may be used even if unrelated producers are partial |
| No edge exists and every applicable producer is complete and conflict-free | The proposed direct relationship is independent for only that facet/scope/basis |
| No edge exists but any producer is partial/unknown, the inventory is open, a relevant unknown exists, or a conflict exists | `unknown`; independence and unreachability must be refused |
| Only scenario or observation evidence is absent | `unknown`; unobserved is not independent |

## Deterministic conflict and refusal policy

No confidence score, source order, registry order, scenario order, observation
timestamp, or “latest version” lookup resolves a conflict.

| Conflict or invalidity | Required result |
| --- | --- |
| Unsupported schema/version, unknown key, non-JSON value, or content-hash mismatch | Reject the artifact before joining it |
| Missing or mismatched Form Contract basis | Refuse the entire owner-specific join; do not emit a partially executable view |
| Duplicate logical identity, including two active versions of one form-scoped effect/case | Reject or quarantine the owning artifact scope; never choose the highest version implicitly |
| Dangling node, rule, profile, wrapper, case, witness, readiness, or artifact reference | Omit the invalid executable record, emit a stable localized diagnostic, and make the affected completeness coordinate non-complete |
| Two equally authoritative primary records require mutually exclusive states or order for the same exact case/target/facet | Retain evidence for review, refuse both from executable planning, and mark the coordinate conflicted |
| Declared/derived primary evidence disagrees with a scenario or observation | Do not rewrite the primary semantic claim; report drift, refuse the affected selected conformance/assertion path, and do not raise completeness |
| Different states occur in different explicitly identified scenario cases | Keep both case-scoped states; this is variation, not a conflict |
| Preferred repeater operation is unsupported, wrapper composition conflicts, or an existing-item witness is absent | Emit no runnable access prerequisite and localize a reachability unknown |
| A causal SCC has no declared convergence/ordering policy sufficient for the requested plan | Retain deterministic SCC evidence, refuse execution through the affected cycle, and keep the affected coordinate non-complete |
| Unsupported expression, callback, helper, import, hook, validator, parser, or RxJS pipeline | Emit only an opaque diagnostic/review scaffold; never a partial edge |

Diagnostics and conflict sets must be emitted in canonical order derived from
stable basis, facet/scope, producer, and logical record identity. Exact code and
location DTO names are deferred to `BHV-1`/`CTX-2`.

## Ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| `packages/schema` (`BHV-1`, after `CTX-0A`) | Strict portable DTOs, evidence/authority matrix, normalized-condition grammar contract, canonical serialization/hashes, referential validation, completeness coordinates, conflict/refusal policy, and schema-owned diagnostics | TypeScript/Angular execution, application callbacks, browser drivers, or project discovery |
| `packages/compiler` (`BHV-2`/`BHV-3`) | Lossless v0.4 effect/profile/wrapper/repeater projection, stable path-to-node normalization, bounded closed-rule derivation, witnessed branch production, and conservative review scaffolds | Whole-program callback/RxJS interpretation, scenario host execution, or authority promotion from observations |
| `packages/workspace` | Project-owned portable declaration/scenario discovery, trusted-host orchestration, basis joins, deterministic artifact assembly/publication, and producer coverage inventory | Reinterpreting declarations, inventing DTO authority, or executing trusted code during queries |
| Future `packages/angular` and the guarded Angular host (`BHV-4`) | Formly/Angular-specific trusted scenario compilation on a pinned target, fresh case isolation, resolved artifact production, and Angular authoring/browser observation production | Portable schema policy, business-verb inference, global completeness, or automatic profile approval |
| Context slices (`CTX-0A`/`CTX-0C`/`CTX-1`/`CTX-2`) | Schema-addressed references, exact scenario/execution selections, pure artifact joins, freshness/basis/conflict validation, complete-or-refuse queries, and validated plan records | Producing scenarios, resolving callbacks, choosing “latest,” creating causal edges, or repairing producer conflicts |
| Future `packages/playwright` | Compile a fully validated plan through reviewed driver registries and keep transient runtime handles inside execution | Accept agent-supplied selectors/modules/handles or add semantic behavior absent from the validated artifacts |

The descriptive terms in this ADR are not exported API names. `BHV-1` begins
only after `CTX-0A` has landed, and it must propose the exact schema IDs,
versions, record/interface names, union literals, hash fields, and diagnostics
for review. This ordering prevents BHV-0 from pre-empting the shared artifact
envelope or making CTX-0A depend on a not-yet-approved behavior DTO.

## Alternatives considered

| Alternative | Why not selected |
| --- | --- |
| Add behavior, scenarios, and observations directly to Form Contract `0.4.0` | Strict v0.4 validators and hashes make this a compatibility change; it would also mix portable semantics with workspace/browser concerns |
| Put all evidence in one monolithic behavior document | It obscures producer ownership, makes independent freshness impossible, and invites scenario/observation authority promotion |
| Allow only explicit declarations and reject every derived rule | Safe but unnecessarily discards the bounded, differential-testable value of a closed witnessed condition grammar |
| Infer business effects from callback names/bodies, RxJS pipelines, scenario deltas, or browser traces | These surfaces do not prove source, semantic verb, timing, readiness, or completeness and would create false executable edges |
| Treat every resolved scenario as replayable | Provider/form-state setup often has no declared UI equivalent; callback output does not prove a browser path |
| Let observations override declarations by confidence or recency | One visited trace cannot establish semantics or inventory completeness; disagreement is drift requiring review |
| Reconstruct repeater access from available driver capabilities or persist row IDs | Capabilities are not equivalent plans, and runtime row identity changes across add/remove/render cycles |
| Retain one form-wide `complete | incomplete` flag | It cannot distinguish one facet/scope/producer from another and makes negative answers unsound |

## Consequences

Positive consequences:

- a maintainer can identify exactly which evidence may create a causal edge;
- positive paths remain usable even when unrelated behavior is incomplete;
- negative independence answers have a precise, auditable proof boundary;
- v0.4 declarations and profiles migrate without semantic loss or duplicate
  authoring;
- scenario compilation and browser conformance become useful without being
  promoted into business truth; and
- repeaters remain stable semantically while runtime item binding stays inside
  reviewed execution.

Costs and trade-offs:

- more sibling artifacts and exact hash joins must be produced and retained;
- applications must explicitly declare business verbs, readiness, replay
  inputs, and repeater item witnesses where static evidence is insufficient;
- many real callbacks/hooks will remain scaffold-only or unknown;
- the compiler must retain producer inventories even when they emit zero
  records;
- exact wrapper authority requires joining back to the validated profile
  registry because v0.4 flattened preconditions do not carry wrapper identity;
  and
- deterministic refusal can block a test that might happen to work through an
  ad hoc selector, delay, or observed row index.

## Non-goals

This decision does not:

- change Form Contract `0.4.0`, its validators, or its content hash;
- name or implement a behavior/scenario DTO;
- add source lineage, journeys, MCP, Playwright, or browser execution;
- interpret arbitrary callbacks, imports, helpers, validators, hooks, services,
  RxJS pipelines, or function source;
- infer business verbs, readiness, or convergence from names or timing;
- claim complete automatic journey/scenario discovery;
- make browser observation a semantic approval mechanism;
- assign stable semantic IDs to runtime repeater rows; or
- settle a future stable business-key witness, full async error/retry
  vocabulary, or workplace coverage threshold.

## Decision and implementation gates

No implementation task should treat BHV-0 as complete until maintainers
explicitly approve all normative choices in this ADR, especially:

1. the strict sibling topology and exact Form Contract basis tuple;
2. the edge/state/access-prerequisite separation;
3. the evidence/authority matrix and executable causal-edge rule;
4. the lossless five-kind mapping and separate reset-on-hide semantics;
5. replayable versus compile-only cases and acausal resolved states;
6. exact profile/wrapper/repeater authority and transient handles;
7. the facet/scope/basis/producer completeness and independence rule;
8. deterministic conflict, drift, and cycle refusal; and
9. package/context ownership plus deferral of public DTO naming.

After acceptance, implementation remains gated in the execution-index order:

1. `CTX-0A` lands the schema-addressed artifact-set envelope.
2. `BHV-1` proposes exact schema names/versions and implements strict closed
   condition/behavior validation with mutation/refusal tests.
3. `BHV-2` proves lossless v0.4 effect/profile/wrapper/repeater projection,
   including all five kinds, ordered parts/preconditions, readiness,
   capabilities, wildcard targets, and transient binding rules.
4. `BHV-3` proves the closed rule grammar and refusal boundary with
   differential tests against pinned Formly semantics.
5. `BHV-4` versions portable scenario cases and produces exact-hash trusted
   resolved evidence without conflating replay and compilation.
6. `BHV-GATE` measures workplace construct frequency and scaffold acceptance
   before the grammar expands.
7. `CTX-GATE` proves one current, exact, conflict-free producer context before
   MCP or Playwright execution begins.

`BHV-1` must still decide the exact DTO/schema/diagnostic names, JavaScript
normal-form details, relative and repeated-row path semantics, readiness error
vocabulary, and whether a future stable item-key witness is in its initial
scope. Those decisions may narrow automation but must not weaken this authority
matrix or negative-inference boundary without revising this ADR.

## Evidence and verification

### Documented repository facts

| Fact | Retained evidence |
| --- | --- |
| Form Contract `0.4.0` is the implemented compatibility boundary and successor behavior/scenario records are siblings | [v0.4 E2E authoring metadata specification](../v0.4-e2e-authoring-metadata-spec.md) and [RH-06 reconciliation](../planning/agent-context-hardening/rh-06-reconciliation.md) |
| The current effect schema has exactly five kinds, strict kind/target compatibility, declared evidence, transparent opacity, and canonical hashing | [`cross-field-effect.ts`](../../packages/schema/src/cross-field-effect.ts) and [`cross-field-effect.test.ts`](../../packages/schema/src/cross-field-effect.test.ts) |
| Compiler projection validates endpoints, target/readiness capabilities, condition IDs, and deterministic SCC diagnostics, and incomplete coverage does not invent edges | [`resolve-effects.ts`](../../packages/compiler/src/resolve-effects.ts) and [`resolve-effects.test.ts`](../../packages/compiler/src/resolve-effects.test.ts) |
| Current profiles validate exact operations, parts, driver capabilities, readiness, wrapper activation, generic repeater surfaces, and ordered preconditions | [`field-type-profile.ts`](../../packages/schema/src/field-type-profile.ts), [`field-type-interaction-validation.ts`](../../packages/schema/src/field-type-interaction-validation.ts), and [`field-type-profile.test.ts`](../../packages/schema/src/field-type-profile.test.ts) |
| v0.4 emits array-template structure with wildcard model paths and does not advertise repeated-template DOM IDs as stable locators | [`extract-form.ts`](../../packages/compiler/src/extract-form.ts) and [`extract-form.test.ts`](../../packages/compiler/src/extract-form.test.ts) |
| Trusted scenario compilation is separated from declared extraction; the current workspace case surface contains an executable callback but no portable replay metadata | [ADR 0005](0005-trusted-scenario-resolution.md), [`source.ts`](../../packages/workspace/src/source.ts), and [`extract-form.ts`](../../packages/compiler/src/extract-form.ts) |
| Closed rules, scenario-local states, observation limits, transient repeater binding, and localized completeness were researched with retained experiments | [RH-04 behavior/effects research](../research/hardening/form-behavior-and-effects.md) and [v0.4 cross-field-effects research](../research/v0.4-cross-field-effects.md) |

### Inferences retained by this decision

- Exact sibling hashes are necessary to prevent a scenario or observation from
  being joined to a semantically different form.
- Scenario and observed states must remain acausal because their inputs and
  visited paths do not prove a unique source relationship.
- A producer-aware completeness coordinate is necessary for any sound negative
  independence claim.
- Exact profile/wrapper declaration sets and transient repeater handles preserve
  access authority without inventing runtime semantic identity.

These are proposed architecture decisions derived from the documented facts;
they are not claims that the successor schemas already exist.

### Verification record

The ADR was prepared against repository commit `158e458`. Verification on
2026-08-27 produced:

```text
pnpm check:docs
  Documentation checks passed for 79 files.

git diff --check
  exited 0 with no whitespace errors.

git diff --no-index --check /dev/null \
  docs/decisions/0010-portable-behavior-scenario-authority.md
  emitted no whitespace diagnostics (exit 1 is the expected file-diff status).
```

No product schema, code, test, existing documentation, or Form Contract
artifact was changed by this decision packet.
