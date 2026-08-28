# CTX-1 Specification: Pure Progressive Query Core

- Status: complete
- Schema version: `0.1.0`
- Evolution: initial public surface at `0.1.0`; incompatible changes require a schema-version bump
- Owner: `@formly-contract/schema`
- Research basis: RH-05, reconciled by RH-06
- Prerequisite: `CTX-0D`

## Objective

CTX-1 provides a deterministic, browser-free and application-runtime-free
boundary for querying already validated agent-context artifacts. It accepts a
general dataset assembled from schema-addressed owners, validates one exact
pinned selection, exposes four progressive read operations, reports live
freshness without treating repository revision as proof, and supports bounded
pagination with opaque HMAC-protected cursors.

The pure boundary lives in `@formly-contract/schema`; CTX-1 does not introduce
another package. Production APIs accept the general query dataset below. The
synthetic RH-05 fixture wrapper is test input from CTX-0D, not a production
dataset type. CTX-1A establishes the unreleased DTO, validation, freshness, and
cursor source modules. CTX-1B adds the unreleased pure executor source module.
CTX-1D publishes the reviewed query and cursor surface from the schema barrel
and records the package-level change in a Changeset. Internal parsed-dataset
validators, E2E-slice resolution/overflow seams, and their private atomic-bound
constants remain source-module implementation details.

## Invariants

- Inputs and outputs are detached ordinary JSON data. Unknown keys,
  unsupported versions, sparse or exotic arrays, accessors, symbol keys,
  proxies, cycles, non-finite numbers, and graphs beyond the published bounds
  are rejected before semantic reads.
- Parsing never invokes a caller-owned getter or proxy trap.
- Every owner used by a selection is named by its exact schema ID, schema
  version, and content hash. There is no unpinned `latest` lookup.
- The artifact-set identity is its schema version and canonical content hash.
  `repositoryRevision` remains bounded provenance and is never a freshness
  substitute. CTX-1 adds no arbitrary `buildId`.
- Ambiguity is returned with stable identities. Array order, labels, and text
  ranking never become selection authority.
- Pageable results page one named primary collection. Atomic records and
  prerequisite/journey closures are complete or refused, never truncated.
- CTX-1 labels stale or unknown results. CTX-2, not CTX-1, decides whether an
  intent or execution must be refused.

## Dataset boundary

`AgentContextQueryDataset` is a versioned collection of:

- one parsed CTX-0A artifact set;
- schema-addressed source-usage catalog owners;
- schema-addressed journey catalog owners;
- schema-addressed declared or resolved Form Contract owners; and
- schema-addressed execution-authority owners.

Each owner entry is `{ reference, artifact }`. The reference must use the
owner's exact schema ID/version, its hash must equal the parsed artifact's
content hash, and the exact reference must occur in the artifact set. Known
owner references inventoried by the artifact set must occur exactly once in
the dataset. Unknown future artifact-set references remain legal and opaque.
Every source-usage and journey catalog must use the artifact set's exact
workspace-index reference. Owner arrays are duplicate-free and canonically
ordered by schema ID, version, then content hash.

## Search scope and pinned selection

`AgentContextUsageSearchScope` pins pre-selection discovery to the exact
artifact-set identity, workspace-index reference, and a non-empty canonical
set of exact source-usage catalog references. The set permits multi-catalog
workspaces without an unpinned aggregate lookup. The search query, every
search result variant, aggregate search freshness, and a search continuation
cursor all repeat or authenticate this exact scope.

`validateAgentContextUsageSearchScope(dataset, scope)` is the production
dataset boundary: it requires exact artifact-set and workspace-index equality
and exact canonical equality to the dataset's complete source-usage owner set.
A self-asserted subset, superset, reordered set, or owner substitution is not
a valid production scope. Cursor creation remains structural because it has no
dataset parameter; callers and the CTX-1B query core must run the dataset scope
validator before creating or continuing a production search cursor.

`AgentContextQuerySelection` contains:

- the exact artifact-set `{ schemaVersion, contentHash }` identity;
- the exact workspace-index reference;
- exact schema-addressed owner references for the source-usage catalog,
  journey catalog, declared Form Contract, resolved scenario artifact, and
  execution-authority artifact;
- one exact declared usage `{ kind, usageId, version }`;
- one journey `{ id, version }`;
- one form `{ projectId, formId, contractHash }`;
- one scenario `{ id, version, artifactHash, basis }`; and
- one execution-authority logical identity `{ usageId, usageVersion, basis }`.

Selection validation resolves every owner exactly once and proves these joins:

1. the artifact-set and workspace-index identities equal the dataset owners;
2. the usage exists exactly once, has an exact form resolution, and that form
   equals the selected project/form/contract identity;
3. the journey exists exactly once, its entry selects the usage, and at least
   one step contains that exact usage and form;
4. the declared Form Contract equals the selected form and basis;
5. the scenario artifact equals the scenario artifact hash and form ID;
6. the execution-authority content hash, usage identity, form basis, and
   scenario identity/basis equal the selection;
7. the authority usage entry ID and landing step exactly project the selected
   journey entry;
8. every journey step for the selected usage includes the selected form, and
   the authority step IDs, ordinals, and action memberships exactly project
   those steps;
9. the flattened scenario-artifact node IDs exactly equal both the complete
   selected declared Form Contract node set and the union of authority step
   node memberships, including nested children and array templates;
10. authority action `(id, kind, outcomeIds)`, outcome `(id, kind)`, and full
    transition tuples exactly project only the selected-usage subgraph: its
    relevant steps are exactly the journey steps containing the selected usage
    and form, actions are derived from those step memberships, outcomes are
    derived from those actions, and transitions have both endpoints plus their
    action and outcome inside that subgraph; unrelated usage records in the
    same journey are ignored; and
11. every selected schema-addressed reference occurs in the artifact set.

Hash equality is necessary but does not replace these logical-identity and
basis checks.

## Query operations

All inputs use `schemaVersion: "0.1.0"` and one closed `operation`
discriminant.

| Operation | Purpose | Pageable collection | Atomic secondary data |
| --- | --- | --- | --- |
| `search-form-usages` | Resolve bounded source/text/form/route/step/capability evidence within an exact multi-catalog scope | `candidates` | exact owner, match evidence, and complete exact-selection handoffs |
| `get-form-context` | Return `summary`, `diagnostics`, or an atomic `journey` for a pinned selection | summary pages `steps`; diagnostics pages `diagnostics`; journey is not pageable | identity, freshness, and non-primary summary/evidence facts |
| `find-form-nodes` | Find nodes by exact ID/path or bounded presentation/capability filters | `nodes` | each node record and selected detail aspects |
| `get-e2e-slice` | Return one exact step's focus and complete prerequisite/effect closure | none | the entire slice |

Source paths are confined workspace-relative paths: no absolute paths, URI
schemes, traversal segments, backslashes, control characters, or glob
metacharacters. Model paths are typed, bounded segments. Set-like filters,
includes, focus IDs, candidates, and result identities are duplicate-free and
canonical.

Every usage-search result repeats its exact scope and aggregate freshness.
Each candidate names its exact source-usage catalog owner. A resolved declared
candidate carries a complete `selectionHandoffs` collection of fully pinned
selections; each handoff must match the candidate usage/form, catalog owner,
artifact set, and workspace index. An empty collection means that the exact
usage and form are known but no complete pinned selection can be assembled;
CTX-1 adds no separate selection-availability flag. Callsite candidates cannot
carry handoffs and their identity `projectId` must equal the candidate
`projectId`. A candidate without a matching resolved form also has no
handoffs. Dataset-aware result validation additionally proves the candidate
identity, project, optional form, and every handoff against the named
source-usage owner.
`matchReasons` and `selectionHandoffs` use
`{ complete: true, items }`; they are bounded atomic secondary collections,
not independently pageable.

Node candidates are bounded flattened projections with node identity, kind,
model path, evidence, optional Formly/semantic/presentation/state facts,
child/template identities, capabilities, and an exact `included` set.
`details` has one legal key per include aspect and must have a key if and only
if that aspect is included:

- `constraints`: complete `ContractConstraint` records;
- `domain`: complete `ContractOption` records plus optional exact option source
  and value domain;
- `interaction`: the existing schema-owned interaction profile, when known;
- `locators`: complete `ContractLocator` records;
- `effects`: complete `DeclaredCrossFieldEffect` records; and
- `unknowns`: complete `ContractDiagnostic` records.

All node basics and requested details come from the selected resolved scenario
artifact. The declared Form Contract remains the selected identity/basis owner
but is not a substitute projection source. The interaction-profile parser may
use a fixed internal registry identity solely as a validation scaffold; that
synthetic identity is never emitted as result data or diagnostic evidence.

Complete and ambiguous node results carry an
`AgentContextExecutionAuthorityProjection`, not the full authority artifact.
The projection names the exact execution-authority owner and wraps every
secondary record family in `{ complete: true, items }`. It contains the exact
entry and relevant complete step/action/outcome/transition records required
for referential integrity, but physical operation, readiness, interaction,
commit, validation, assertion, and repeater records are filtered to the
candidate nodes. The entry landing step is retained when needed to keep the
projection independently valid. Full unrelated authority payload is illegal
at the dataset-aware result boundary.

The summary view has a dedicated, non-pageable `summary` projection. It
contains exact usage-entry identity and `open-usage` capability, selected form
identity and flattened node count, warning/error diagnostic evidence counts,
the complete canonical executable-capability set, the exact scenario ID set,
reported-or-not-reported effect-analysis state, and categorized raw unknown
evidence counts. Form identity and basis remain declared-owner facts; node,
diagnostic, capability, scenario, effect-analysis, and unknown facts come from
the resolved scenario artifact and selected authority. These are evidence
facts, not CTX-2 blocker policy. `steps` is the summary view's only pageable
primary list.

The diagnostics view carries dedicated owner-addressed raw evidence variants:
an existing `ContractDiagnostic` or an existing `ContractEffectAnalysis`.
Complete diagnostic results cannot carry query overflow/failure reasons and
do not add severity, phase, blocking, or remediation fields beyond the raw
schema-owned record. Evidence is the canonical union of only the selected
declared Form Contract and resolved scenario artifact owners; identical
owner-addressed records are deduplicated, and evidence from any unrelated form
owner is illegal. The `diagnostics` page controls this evidence list.

The journey view is atomic `{ identity, authority }`: the selected source
journey identity plus an exact-owner authority projection containing the
complete selected usage entry, steps, actions, outcomes, transitions, and all
referentially complete authority records for that usage. The E2E slice is
atomic and contains a filtered exact-owner authority projection for its entry,
step/closure nodes, operations, and exact applicable transitions/actions/
outcomes, plus complete concrete `focusNodes`, `closureNodes`, `prerequisites`,
and `effects` collections. Each
prerequisite carries an exact closure node plus one resolved cause: a concrete
trigger effect, selected-authority readiness record, or included wrapper
precondition. Focus and prerequisite nodes must be exact subsets of the
closure; both endpoints of every slice effect must be in that closure, and
closure nodes must belong to the named authority step. No nested collection
uses a cursor or truncation marker. CTX-1C must source slice nodes, node
details, and effect records from the selected resolved scenario artifact.

Every complete or refused E2E-slice result echoes the exact canonical request
as `request: { withinStepId, nodeIds, goal, includeOutgoingEffects }`. This is
the dataset-aware recomputation boundary; `goal` is echoed and does not add
CTX-2 planning or refusal policy. Complete slice nodes carry the full canonical
include set (`constraints`, `domain`, `effects`, `interaction`, `locators`, and
`unknowns`). Focus and closure nodes sort by node ID, effects by identity ID
then version, and prerequisites by canonical JSON.

Slice closure is normative:

1. the named authority step must exist; every focus ID must exist in the
   resolved scenario and belong to that step;
2. only a resolved-scenario effect with `ordering: "source-before-target"`
   creates the reverse prerequisite edge from its target to its trigger;
   conditions are retained conservatively and never evaluated, while
   `ordering: "none"` creates no prerequisite edge;
3. incoming same-step prerequisite edges are followed to a fixed point;
4. when `includeOutgoingEffects` is true, one outgoing phase adds every
   explicit same-step target from the prerequisite closure snapshot, after
   which incoming closure repeats to a fixed point without another outgoing
   pass; cross-step outgoing effects are omitted;
5. iterative strongly connected component detection refuses the canonical
   first prerequisite cycle without recursion or fallback inference;
6. an included asynchronous effect must join its timing readiness ID to
   exactly one selected-authority readiness record for the exact target node;
7. readiness for closure nodes and interaction-profile wrapper preconditions
   are complete prerequisites; wrapper preconditions carry their exact
   zero-based `preconditionIndex`, preserving declaration order and legal
   duplicate records; and
8. the authority projection contains only the exact entry, closure step(s),
   operations, readiness, and referentially required action/outcome/transition
   records.

An incoming cross-step prerequisite refuses rather than fabricating a
multi-step closure. `CrossStepWitness` carries the exact effect identity plus
trigger `{ nodeId, stepId }` and target `{ nodeId, stepId }`. The canonical
first witness is paired with zero, one, or multiple exact authority transitions
whose endpoints equal the witness steps: zero yields
`cross-step-transition-unavailable`, one yields
`cross-step-prerequisite-required` with the full transition, and multiple
yield `cross-step-transition-ambiguous` with the complete canonical transition
set. The other slice refusals are `step-absent`,
`slice-focus-node-absent`, `step-scope-mismatch`,
`prerequisite-readiness-unavailable`, and `prerequisite-cycle`, followed by
the size refusals. Step absence is evaluated before focus absence, which is
evaluated before step-scope mismatch; cross-step evidence, cycles, and exact
readiness are then evaluated in that order.

`validateAgentContextQueryResult(dataset, result)` is the production result
boundary. It revalidates the search scope or pinned selection, then proves
candidate handoffs, summaries, step summaries, diagnostic evidence, node
fields and requested details, journey authority, and slice authority/effects
against the exact named owners. Structurally valid but owner-drifted entry or
driver records, partial projections with omitted dependencies, and projections
inflated with unrelated authority records fail this validation.

The source module exposes internal parsed-dataset validation seams for scope,
selection, and result validation. The executor parses and detaches the dataset
once, then uses those seams while enumerating handoffs and validating its final
result; it must not reparse the complete dataset once per plausible handoff.
These seams remain source-module APIs until the deliberate CTX-1D publication
review.

### Pure execution API

CTX-1B defines this browser- and application-runtime-free source entry point:

```ts
executeAgentContextQuery(
  datasetInput: unknown,
  queryInput: unknown,
  liveInput: unknown,
  paginationInput?: unknown,
): AgentContextQueryResult
```

Its exported pagination runtime is exactly
`{ now: number; ttlMs: number; signingMaterial: string }`. All four inputs are
strictly parsed and detached before execution. The flat pagination object also
rejects missing or unknown fields, symbols, accessors, proxies, exotic
prototypes, unsafe time arithmetic, and out-of-bound signing material without
invoking caller code. Pagination is required for usage search, context summary
or diagnostics, and node search; it is prohibited for the atomic journey and
E2E-slice operations. Time and signing material are always caller-supplied.

CTX-1C implements `get-e2e-slice` as the atomic closure above. It prohibits a
pagination runtime, computes `e2e-slice` freshness from every pinned owner
role, and runs the same dataset-aware result validator used for caller-supplied
results before returning.

Search filters are conjunctive. Identity, path/location, model path, scenario,
semantic type, and capability values use exact equality; text and label use a
case-sensitive UTF-16 substring. Capability arrays require every supplied
capability, and model-path plus label must match the same resolved-scenario
node. Handoff-dependent filters require at least one complete matching handoff;
an unavailable downstream fact does not match. The bounded text corpus is
limited to usage/project facts; invocation location, symbol, syntax-kind, and
syntax-token facts; form/context IDs; journey/step identity and labels;
scenario identity; resolved-node identity/type/model path/presentation; and
capabilities. Content hashes and raw evidence are excluded.

Candidates sort by source owner reference and canonical usage, handoffs by
canonical selection JSON, reasons lexically, steps by ordinal then ID,
diagnostics by canonical evidence JSON, and nodes by ID. Zero matches is
`not-found`, one is `complete`, and more than one is `ambiguous`, based on the
total unpaged match set. An ambiguity reason carries the bounded
`totalMatches` and exactly the page-local candidate/node identities, so a
limit-one first page remains ambiguous. Usage absence is authoritative only
when every scoped catalog reports complete coverage and no potential
source-level match was excluded solely because downstream handoff evidence was
unavailable.

### Result variants and reasons

Results repeat the operation and use only variants legal for it:

- usage search: `complete`, `ambiguous`, `not-found`, or `refused`;
- context: `complete` or `refused`, additionally discriminated by the exact
  requested view;
- node search: `complete`, `ambiguous`, `not-found`, or `refused`; and
- E2E slice: `complete` or `refused`.

Failure/ambiguity reasons are closed data discriminants, not diagnostics:

- usage ambiguity and authoritative versus non-authoritative usage absence;
- node ambiguity and node absence;
- absent step, absent focus node, or step-scope mismatch;
- exact cross-step prerequisite required, transition unavailable, or
  transition ambiguity;
- unavailable exact target readiness or prerequisite cycle; and
- atomic record or atomic view overflow.

Reasons may carry only the bounded stable identities needed to understand or
retry the query. They do not contain CTX-2 phase, severity, blocking,
location, remediation, or execution-refusal policy.

## Live freshness

Freshness input is a versioned set of optional, role-addressed live references
plus optional repository-revision provenance. Roles are `artifact-set`,
`workspace-index`, `source-usage-catalog`, `source-usage-catalog-set`,
`journey-catalog`, `form-contract`, `scenario-artifact`, and
`execution-authority`. The source-catalog-set role is a non-empty canonical
exact reference set used only by aggregate usage search; selection views use
the singular selected catalog role. Form, scenario, and authority roles carry
the same exact logical identities and bases as the selection, not only a
content hash.

Required roles are view-specific:

| View | Required live roles |
| --- | --- |
| `usage-search` | artifact set, workspace index, exact source-usage catalog set |
| `context-summary` | artifact set, workspace index, selected source-usage catalog, journey, form, scenario, and execution authority |
| `context-diagnostics` | all roles |
| `context-journey` | artifact set, workspace index, selected source-usage catalog, journey catalog, and execution authority |
| `node-search` | artifact set, workspace index, source-usage catalog, form, scenario, execution authority |
| `e2e-slice` | all roles |

Evaluation order is normative:

1. if any supplied required live role differs from its pinned reference,
   identity, or basis, return `stale`;
2. otherwise, if any required role is missing, return `unknown`;
3. otherwise return `current`.

Thus a known stale role outranks an unknown role. Missing irrelevant roles do
not affect a view. A matching repository revision with no required live owner
references remains `unknown`.

## Opaque cursor contract

Only `candidates`, `steps`, `diagnostics`, and `nodes` can page. Cursor creation
and continuation require caller-supplied signing material, explicit epoch time,
and explicit TTL; no operation reads the wall clock.

The implementation canonicalizes the strict query after removing its current
cursor. The authenticated cursor binding includes:

- the single collection name;
- the normalized cursor-free query;
- its pinned context selection, or its exact usage-search scope;
- the operation's fixed sort order;
- its disclosure/view scope;
- the canonical node-detail include scope; and
- the continuation position and expiry.

The cursor is an opaque, canonical base64url envelope authenticated with
HMAC-SHA-256. Fixed inputs produce the same cursor. Continuation verifies the
HMAC with constant-time comparison and recomputes the entire binding. A cursor
presented for another collection, query, context, sort, view/disclosure, or
include scope is replay and fails closed. Malformed, non-canonical, tampered,
expired, or version-unknown cursors also fail closed. Expiry occurs when
`now >= expiresAt`. Each successful non-final continuation issues its next
cursor with a fresh lease ending at that call's explicit `now + ttlMs`; it does
not mutate or extend the cursor that was consumed. Thus an old cursor still
expires at its authenticated expiry while the newly issued cursor remains
valid only through its own authenticated expiry. A supplied cursor is
authenticated before an output-size refusal can be returned.

## Published bounds

| Item | Bound |
| --- | ---: |
| Input object graph depth | 128 |
| Input object graph nodes/properties | 100,000 |
| Dataset owner entries per owner family | 10,000 |
| Query/result collection entries | 10,000 |
| Atomic secondary collection entries | 10,000 |
| One atomic record data graph | 10,000 nodes/properties |
| One atomic result data graph | 100,000 nodes/properties |
| Page limit | 1–200 |
| Identifier | 256 UTF-16 code units |
| Search/presentation text | 4,096 UTF-16 code units |
| Workspace-relative path | 1,024 UTF-16 code units |
| Model-path segments | 128 |
| Cursor text | 8,192 ASCII characters |
| Signing material | 16–4,096 UTF-8 bytes |
| Cursor TTL | 1–86,400,000 milliseconds |

Data-graph counts include the root plus every enumerable data-property value;
an array's non-enumerable `length` is excluded. Every individual collection
is capped at 10,000 entries. An individual record is checked before its
enclosing atomic result: a record above 10,000 yields
`atomic-record-too-large`, while an atomic result above 100,000 yields
`atomic-view-too-large` where that result variant permits it. Implementations
must not substitute summed collection lengths for this graph count. Counts are
enforced before an output is returned. The echoed slice request and a semantic
refusal reason are individual records. Semantic refusals are classified before
return, so a large transition-ambiguity reason is replaced by the exact
record-before-view overflow reason. Dataset-aware validation recomputes the
would-be complete or semantic-refusal result and accepts an overflow reason
only when that same classification produces it. Numeric inputs must be finite safe
integers; negative zero is normalized only where zero is legal.

## Non-goals

CTX-1 does not:

- accept the synthetic fixture wrapper as its production input;
- assemble owners from disk, execute TypeScript/Angular/Formly/configuration or
  scenario callbacks, inspect a browser, or load a driver registry;
- expose MCP tools or choose transport-level errors;
- infer journeys, transitions, prerequisite edges, selectors, driver modules,
  values, or execution authority;
- define CTX-2 diagnostic policy, typed intent, validated plans, compilation,
  or stale/unknown execution refusal;
- make repository revision a freshness or mixed-context proof;
- page atomic journeys, E2E closures, secondary metadata, or nested records;
  and
- avoid loading the validated dataset into the current in-memory executor or
  provide the later indexed-provider API.

## Implementation packets

1. **CTX-1A — contract primitives:** freeze this specification; implement
   strict dataset, selection, query, and result DTO parsing; implement
   role-scoped freshness and HMAC cursor primitives.
2. **CTX-1B — progressive projections:** implement usage candidates, context
   summary/diagnostics/journey, and node projections over the validated
   dataset, including deterministic named-list pagination; parse the dataset
   once per execution and fail closed for the still-unimplemented E2E slice.
3. **CTX-1C — atomic slice:** implement fixed-point same-step prerequisite
   closure, exact transition refusals, cycles, and atomic size caps.
4. **CTX-1D — walkthrough/scale/publication gate (complete):** prove both
   CTX-0D walkthroughs and one measured large-form case without delivering a
   whole contract to the consumer, then deliberately publish the reviewed
   query/cursor modules from the schema barrel and add the Changeset.

Later packets may add projection fields only through a versioned contract
change; they must not weaken the selection, freshness, or cursor invariants.

## Verification

CTX-1A retains tests for strict canonical round-trips, unknown-key/version
refusal, unsafe graph bounds, getter/proxy safety (including the freshness
wrapper), exact multi-catalog scope validation, owner-valid rehash/repin
selection drift, valid multi-usage selected-subgraph comparison, exact-owner
filtered authority projections, dedicated summary and raw diagnostic evidence,
dataset-aware result drift, every operation/status/view/reason/page/result
variant, malformed result relations, not-found non-truncation, aggregate and
selected freshness precedence, revision-only unknown status, fixed-input
cursor determinism, cross-query/context/search-scope/disclosure replay refusal,
tamper/expiry refusal, explicit-time behavior, and bounded payload/signing
material.

CTX-1B additionally retains a matrix for two-catalog ordering, every search
filter and conjunctive combinations, complete and empty handoffs, ambiguous
limit-one continuation with total match counts, coverage-sensitive absence,
summary step pages, selected-owner diagnostic union/deduplication, atomic
journey, nested/array node discovery, every node include and capability
filter, page-specific authority, current/stale/unknown freshness, deterministic
continuation and refreshed expiry, replay/out-of-range refusal, unsafe runtime
objects, exact graph overflow, scenario-only facts, declared-only projection
rejection, and scenario node-set drift.

CTX-1C additionally retains the CTX-0D positive supplier/currency/total slice
with supplier readiness; the negative product/case-type/other-details closure
with both effects, effect-source prerequisites, and case-type readiness;
outgoing phase and incoming fixed-point boundaries; every goal;
step/focus/scope refusals;
conditioned and unordered effects; deterministic cycles; zero/one/multiple
cross-step transitions with exact witnesses; exact and mismatched async target
readiness; duplicate indexed wrapper preconditions; canonical order
invariance; resolved-scenario effect ownership and declared-owner substitution
refusal; recomputation rejection for omitted/inflated projections; current,
unknown, and stale freshness; getter/proxy and missing-endpoint fail-closed
behavior; and exact record, semantic-refusal, collection, and view overflow
boundaries.

CTX-1D adds a package-barrel-only consumer test. It preserves the existing
driver-registry export as a compatibility sentinel, executes and validates both
exact CTX-0D E2E slices, and measures a 512-node resolved Form Contract with at
least 512 ASCII metadata bytes per node. The canonical full-contract baseline
is 458,115 bytes. Usage search, context summary, node page one, and node page
two total 64,626 canonical bytes, or 14.11% of the baseline. Both node pages
contain two disjoint records, remain truncated with authenticated
continuations, report all 512 matches, exclude metadata from an unrequested
node, and reproduce byte-for-byte with fixed inputs.

CTX-1 proves that the consumer never receives or serializes the whole contract
in this progressive flow. It does not claim that the in-memory executor lazily
avoids loading the validated dataset. True provider-side lazy loading is a
later indexed-provider API.

Required commands:

```sh
pnpm exec vitest run packages/schema/src/agent-context-query.test.ts packages/schema/src/agent-context-query-result.test.ts packages/schema/src/agent-context-query-cursor.test.ts packages/schema/src/agent-context-query-core.test.ts packages/schema/src/agent-context-query-public.test.ts
pnpm --filter @formly-contract/schema typecheck
pnpm exec eslint packages/schema/src/agent-context-query.ts packages/schema/src/agent-context-query.test.ts packages/schema/src/agent-context-query-result.test.ts packages/schema/src/agent-context-query-cursor.ts packages/schema/src/agent-context-query-cursor.test.ts packages/schema/src/agent-context-query-core.ts packages/schema/src/agent-context-query-core.test.ts packages/schema/src/agent-context-query-public.test.ts packages/schema/src/index.ts
git diff --check
```
