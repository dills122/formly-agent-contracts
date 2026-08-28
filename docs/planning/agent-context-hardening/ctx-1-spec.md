# CTX-1 Specification: Pure Progressive Query Core

- Status: frozen for implementation
- Schema version: `0.1.0`
- Evolution: unreleased `0.1.0` reopened for review reconciliation
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
dataset type.

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
9. the union of authority step node memberships exactly equals the complete
   selected Form Contract node set, including nested children and array
   templates;
10. authority action `(id, kind, outcomeIds)`, outcome `(id, kind)`, and full
    transition tuples exactly project the selected journey; and
11. every selected schema-addressed reference occurs in the artifact set.

Hash equality is necessary but does not replace these logical-identity and
basis checks.

## Query operations

All inputs use `schemaVersion: "0.1.0"` and one closed `operation`
discriminant.

| Operation | Purpose | Pageable collection | Atomic secondary data |
| --- | --- | --- | --- |
| `search-form-usages` | Resolve bounded source/text/form/route/step/capability evidence within an exact multi-catalog scope | `candidates` | exact owner, match evidence, and complete exact-selection handoffs |
| `get-form-context` | Return `summary`, `diagnostics`, or an atomic `journey` for a pinned selection | `steps` or `diagnostics`; journey is not pageable | identity, freshness, and non-primary summary facts |
| `find-form-nodes` | Find nodes by exact ID/path or bounded presentation/capability filters | `nodes` | each node record and selected detail aspects |
| `get-e2e-slice` | Return one exact step's focus and complete prerequisite/effect closure | none | the entire slice |

Source paths are confined workspace-relative paths: no absolute paths, URI
schemes, traversal segments, backslashes, control characters, or glob
metacharacters. Model paths are typed, bounded segments. Set-like filters,
includes, focus IDs, candidates, and result identities are duplicate-free and
canonical.

Every usage-search result repeats its exact scope and aggregate freshness.
Each candidate names its exact source-usage catalog owner. A resolved declared
candidate carries a non-empty, complete `selectionHandoffs` collection of
fully pinned selections; each handoff must match the candidate usage/form,
catalog owner, artifact set, and workspace index. Callsite candidates cannot
claim an exact declared selection. `matchReasons` and `selectionHandoffs` use
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

Complete and ambiguous node results additionally carry the exact selected
`AgentContextExecutionAuthority`, which provides the executable interaction,
readiness, commit, validation, assertion, repeater, and usage authority facts
without executable modules or selectors invented by CTX-1.

The journey view is atomic `{ identity, execution }`: the selected source
journey identity plus the complete `AgentContextUsageExecutionAuthority`
entry, steps, actions, outcomes, and transitions. The E2E slice is atomic and
contains the exact selected execution authority plus complete concrete
`focusNodes`, `closureNodes`, `prerequisites`, and `effects` collections. Each
prerequisite carries an exact closure node plus one resolved cause: a concrete
trigger effect, selected-authority readiness record, or included wrapper
precondition. Focus and prerequisite nodes must be exact subsets of the
closure; closure nodes must belong to the named authority step. No nested
collection uses a cursor or truncation marker.

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
- step-scope mismatch;
- exact cross-step prerequisite required, transition unavailable, or
  transition ambiguity;
- prerequisite cycle; and
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
| `context-summary` | usage-search roles plus journey, form, and execution authority |
| `context-diagnostics` | all roles |
| `context-journey` | artifact set, workspace index, source-usage catalog, journey catalog |
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
`now >= expiresAt`.

## Published bounds

| Item | Bound |
| --- | ---: |
| Input object graph depth | 128 |
| Input object graph nodes/properties | 100,000 |
| Dataset owner entries per owner family | 10,000 |
| Query/result collection entries | 10,000 |
| Atomic secondary collection entries | 10,000 |
| Page limit | 1–200 |
| Identifier | 256 UTF-16 code units |
| Search/presentation text | 4,096 UTF-16 code units |
| Workspace-relative path | 1,024 UTF-16 code units |
| Model-path segments | 128 |
| Cursor text | 8,192 ASCII characters |
| Signing material | 16–4,096 UTF-8 bytes |
| Cursor TTL | 1–86,400,000 milliseconds |

Counts are checked before allocating normalized output. Numeric inputs must be
finite safe integers; negative zero is normalized only where zero is legal.

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
- make repository revision a freshness or mixed-context proof; or
- page atomic journeys, E2E closures, secondary metadata, or nested records.

## Implementation packets

1. **CTX-1A — contract primitives:** freeze this specification; implement
   strict dataset, selection, query, and result DTO parsing; implement
   role-scoped freshness and HMAC cursor primitives.
2. **CTX-1B — progressive projections:** implement usage candidates, context
   summary/diagnostics/journey, and node projections over the validated
   dataset, including deterministic named-list pagination.
3. **CTX-1C — atomic slice:** implement fixed-point same-step prerequisite
   closure, exact transition refusals, cycles, and atomic size caps.
4. **CTX-1D — walkthrough/scale gate:** prove both CTX-0D walkthroughs and one
   measured large-form case without loading a whole contract.

Later packets may add projection fields only through a versioned contract
change; they must not weaken the selection, freshness, or cursor invariants.

## Verification

CTX-1A retains tests for strict canonical round-trips, unknown-key/version
refusal, unsafe graph bounds, getter/proxy safety (including the freshness
wrapper), owner-valid rehash/repin selection drift, full result projections,
every operation/status/view/reason/page/result variant, malformed result
relations, not-found non-truncation, canonical reasons, aggregate and selected
freshness precedence, revision-only unknown status, fixed-input cursor
determinism, cross-query/context/search-scope/disclosure replay refusal,
tamper/expiry refusal, explicit-time behavior, and bounded payload/signing
material.

Required commands:

```sh
pnpm exec vitest run packages/schema/src/agent-context-query.test.ts packages/schema/src/agent-context-query-result.test.ts packages/schema/src/agent-context-query-cursor.test.ts
pnpm --filter @formly-contract/schema typecheck
pnpm exec eslint packages/schema/src/agent-context-query.ts packages/schema/src/agent-context-query.test.ts packages/schema/src/agent-context-query-result.test.ts packages/schema/src/agent-context-query-cursor.ts packages/schema/src/agent-context-query-cursor.test.ts
git diff --check
```
