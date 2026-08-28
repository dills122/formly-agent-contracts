# CTX-0B Specification: Source Usage and Journey Records

- Status: Complete
- Depends on: `CTX-0A`
- Implements: `CTX-0B` in the [execution index](execution-index.md)
- Architecture: [RH-06 reconciliation](rh-06-reconciliation.md)

## Assumptions

1. Form Contract `0.4.0` remains unchanged. CTX-0B adds sibling record
   families; it does not add optional fields to a Form Contract or the workspace
   index.
2. A source-usage catalog and a journey catalog have independent schemas and
   content hashes. Either may be present without the other in the open CTX-0A
   artifact set.
3. A declared usage ID is durable and versioned. A checker-derived callsite key
   is build-scoped and includes its consuming project ID in every reference.
4. Journey catalogs contain authored semantic membership and transitions only.
   Drivers, commit mechanics, validation/value/state assertion surfaces, and
   repeater capture authority remain CTX-0C concerns.
5. A journey may reference only an exactly resolved usage. Ambiguous and
   unresolved usages remain useful discovery evidence, but cannot silently
   become journey authority.
6. Source paths are optional disclosure. Path, module-only, and opaque source
   locations are distinct variants; none accepts an absolute path or source
   text.
7. Final producer configuration and path-disclosure defaults are later
   workspace decisions. They do not block the dependency-free schema slice.

## Objective

Add two dependency-light schema-owned artifacts that let future producers and
consumers describe where a form is used and how an application-authored journey
connects usages, forms, steps, actions, outcomes, and transitions without name,
route-order, step-order, or first-candidate guessing.

Success means:

- form, root-anchor, usage/callsite, journey, and step identities remain
  distinct;
- a usage records its consuming project and source invocation, plus exact,
  ambiguous, or unresolved form/root resolution;
- source-inventory coverage is mandatory and an incomplete inventory carries
  at least one reason;
- a journey has one exact entry usage and landing step, ordered step membership,
  actions, outcomes, and exact from/action/outcome/to transitions;
- every internal and cross-catalog reference is validated exactly;
- both artifacts have deterministic non-self-referential SHA-256 identities;
  and
- strict parsing rejects non-data input, unknown keys or versions, invalid and
  duplicate identities, non-canonical full artifacts, broken references, and
  content-hash mutations.

## Non-goals

- TypeScript program construction, source indexing, symbol resolution, route or
  Angular metadata inference, or workspace discovery.
- Live freshness comparison, query behavior, pagination, consumer diagnostics,
  typed intent, or canonical execution plans.
- Scenario semantics or resolution, field-profile authoring, driver manifests,
  execution authority, Angular hosts, MCP, Playwright, or browser conformance.
- Synthetic RH-05 walkthrough fixtures; CTX-0D owns them.
- Source snippets, absolute paths, callback text, model values, environment
  data, timestamps, process IDs, or machine-local provenance.

## Tech stack

- TypeScript and ESM under the existing schema-package configuration.
- Node `crypto` SHA-256 plus the existing `canonicalStringify` helper.
- Vitest small unit tests; no filesystem, subprocess, network, Angular, or
  browser use.
- No new dependency.

## Proposed public contract

The implementation exposes two versioned artifacts:

```ts
export const AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID = "agent-context.source-usage" as const;
export const AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION = "0.1.0" as const;
export const AGENT_CONTEXT_JOURNEY_SCHEMA_ID = "agent-context.journey" as const;
export const AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION = "0.1.0" as const;

export interface AgentContextSourceUsageCatalogDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly coverage: AgentContextSourceUsageCoverage;
  readonly usages: readonly AgentContextSourceUsage[];
}

export interface AgentContextSourceUsageCatalog extends AgentContextSourceUsageCatalogDraft {
  readonly contentHash: Sha256Digest;
}

export interface AgentContextJourneyCatalogDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly journeys: readonly AgentContextJourney[];
}

export interface AgentContextJourneyCatalog extends AgentContextJourneyCatalogDraft {
  readonly contentHash: Sha256Digest;
}
```

The public operations mirror CTX-0A:

```ts
parseAgentContextSourceUsageCatalog(input: unknown): AgentContextSourceUsageCatalog;
canonicalizeAgentContextSourceUsageCatalog(input: unknown): string;
computeAgentContextSourceUsageCatalogHash(input: unknown): Sha256Digest;
createAgentContextSourceUsageCatalog(
  draft: AgentContextSourceUsageCatalogDraft,
): AgentContextSourceUsageCatalog;

parseAgentContextJourneyCatalog(input: unknown): AgentContextJourneyCatalog;
canonicalizeAgentContextJourneyCatalog(input: unknown): string;
computeAgentContextJourneyCatalogHash(input: unknown): Sha256Digest;
createAgentContextJourneyCatalog(
  draft: AgentContextJourneyCatalogDraft,
): AgentContextJourneyCatalog;

validateAgentContextUsageJourneyReferences(
  usageCatalog: unknown,
  journeyCatalog: unknown,
): void;
```

`parse` requires canonical order and verifies `contentHash`. `compute` and
`create` accept drafts in any insertion order and normalize all set-like
collections. `canonicalize` accepts a full verified artifact and includes its
hash. All returned artifacts are detached ordinary data.

## Source-usage records

Each usage has:

- an identity discriminated as either
  `{ kind: 'declared', usageId, version }` or
  `{ kind: 'callsite', projectId, callsiteKey }`;
- a consuming `projectId`;
- one source invocation containing a privacy-safe location, source-symbol
  identity, `call | construct` syntax, a closed structural syntax token, and a
  source-file hash;
- an exact, ambiguous, or unresolved root/form resolution;
- zero or more component, route, or catalog context claims; and
- evidence references.

An exact or ambiguous candidate retains both:

```ts
{
  root: { projectId, rootAnchorId },
  form: { projectId, formId, contractHash },
  evidenceRefs,
}
```

An ambiguous result has at least two distinct candidates. An unresolved result
has at least one reason. Candidate and reason order is canonical; neither parser
nor consumer may select the first candidate.

The syntax token cannot carry source text, arguments, values, labels, or an
open string. Its complete wire shape is:

```ts
interface AgentContextInvocationSyntaxToken {
  readonly kind: "ast-call-shape";
  readonly version: 1;
  readonly calleeForm: "identifier" | "property-access" | "element-access";
  readonly argumentCount: number;
  readonly typeArgumentCount: number;
  readonly optionalCall: boolean;
}
```

Together with the exact source span, symbol identity, syntax kind, and
source-file hash, this preserves deterministic differentiation and causal hash
changes without retaining arbitrary code or argument text.

Source locations are a closed union:

- `path`: a literal workspace- or project-relative POSIX path plus a positive,
  ordered source span. Absolute, drive-relative, URI, traversal, backslash, and
  glob forms are invalid;
- `module`: a bounded bare lowercase package module specifier plus optional
  exported symbol. Absolute, relative, URI, traversal, glob, whitespace, and
  source-like forms are invalid; or
- `opaque`: a stable opaque file ID.

Coverage is a required discriminated union over an explicit scope of sorted
project IDs, included purposes, and excluded purposes:

- `complete` has no reasons; or
- `incomplete` has a non-empty canonical reason set.

An incomplete catalog may retain positive usages, but its wire shape can never
represent an authoritative negative claim. CTX-1 later owns query semantics.

## Journey records

Each journey has a stable `id` and positive integer `version`, one entry, and
closed collections of steps, actions, outcomes, and transitions.

- The entry names an exact usage identity and `landingStepId`.
- Steps have unique non-negative ordinals, optional labels, exact form
  references, exact usage references, and action IDs.
- Actions have an ID, one semantic kind, and exact outcome IDs.
- Outcomes have an ID and semantic kind. `step-changed` is distinct from
  `remains-on-step`, `navigation`, and `message`.
- A transition has a stable ID/version and exact `fromStepId`, `actionId`,
  `outcomeId`, and `toStepId`.

Internal integrity requires:

1. the entry landing step exists;
2. the entry usage is a member of that step;
3. every declared action belongs to exactly one step and every step action
   exists;
4. every declared outcome belongs to exactly one action and every action
   outcome exists;
5. every transition source/destination/action/outcome exists;
6. the transition action belongs to its source step;
7. the transition outcome belongs to its action and is `step-changed`;
8. source and destination differ; and
9. every transition identity and from/action/outcome tuple is unique; and
10. every `step-changed` outcome has exactly one transition.

Cross-catalog integrity additionally requires identical workspace-index bases,
every step/entry usage reference to resolve exactly one source-usage record,
every referenced usage to have `resolution.status === 'exact'`, and that exact
usage form to be one of the step's exact form references.

## Identity, bounds, and canonical order

- Workspace project IDs mirror the workspace grammar: lowercase ASCII letters,
  digits, `.`, `_`, `/`, or `-`, with no empty, `.`, or `..` path segment.
- Form IDs mirror the Form Contract grammar: they begin with an ASCII letter or
  digit and may additionally contain `.`, `_`, `:`, `[`, `]`, `*`, `%`, or `-`.
- Usage, callsite, root, journey, entry, step, action, outcome, transition,
  context, reason, and evidence IDs are 1–256 character agent-context ASCII
  identifiers beginning with a letter or digit and containing only letters,
  digits, `.`, `_`, `:`, or `-`.
- Versions are positive safe integers.
- Hashes match `sha256:[a-f0-9]{64}`.
- Source paths are literal relative POSIX paths, at most 1,024 characters, with
  no URI/drive prefix, glob metacharacter, empty, `.`, or `..` segment, or
  backslash.
- User-facing step labels are bounded printable strings, not identities.
- Each top-level collection accepts at most 10,000 records; nested set-like
  collections accept at most 10,000 entries.
- Every public create, compute, parse, and canonicalize operation performs an
  iterative descriptor-only preflight before recursive detachment or native
  structured cloning. The root is depth zero, each property or array-element
  value advances depth by one, and a graph has maximum depth 128 and at most
  100,000 visited value occurrences. A shared value is counted once per graph
  occurrence; cycles remain invalid. Exceeding either bound raises a
  path-specific `TypeError`, never a recursive `RangeError`, and preflight must
  not invoke accessors or proxy traps.
- Accepted non-negative integer fields normalize IEEE-754 negative zero to
  positive zero. This applies to journey step ordinals and invocation argument
  and type-argument counts, so canonical output and content hashes have one
  numeric representation.
- Usages sort by discriminant, ID fields, and numeric version; journeys and
  transitions sort by ID then numeric version; actions, outcomes, and contexts
  by ID; steps by ordinal then ID; candidates by form then root identity; and
  every ID/reason/evidence set by code-unit order. Numeric version ordering
  places version 2 before version 10.
- Duplicate identities and set entries are invalid. A full parsed artifact must
  already be canonical, while `compute` and `create` normalize drafts.
- Every object is closed and every array is dense, ordinary, symbol-free,
  descriptor-safe data. After descriptor-safe traversal, the caller graph must
  structured-clone to an identical ordinary data graph.

## Commands

From the repository root:

```text
Focused RED/GREEN: pnpm exec vitest run packages/schema/src/agent-context-usage.test.ts
Schema typecheck:   pnpm --filter @formly-contract/schema typecheck
Scoped lint:        pnpm exec eslint packages/schema/src/agent-context-usage.ts packages/schema/src/agent-context-usage.test.ts
Diff safety:        git diff --check
```

## Project structure

| File                                              | Responsibility                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/schema/src/agent-context-usage.ts`      | Both DTO families, strict parsers, canonicalization, hashing, creation, and cross-catalog reference validation |
| `packages/schema/src/agent-context-usage.test.ts` | Focused positive, integrity, mutation, and adversarial tests                                                   |
| `packages/schema/src/index.ts`                    | Public exports, integrated by the parent task                                                                  |
| `.changeset/<generated-name>.md`                  | Public schema release note, integrated by the parent task                                                      |
| This specification                                | Requirements and traceability                                                                                  |

No workspace, compiler, Angular, MCP, Playwright, fixture, or producer file
belongs in CTX-0B.

## Code style

Use readonly discriminated DTOs and path-specific failures:

```ts
type AgentContextUsageResolution =
  | { readonly status: "exact"; readonly candidate: AgentContextFormRootCandidate }
  | { readonly status: "ambiguous"; readonly candidates: readonly AgentContextFormRootCandidate[] }
  | { readonly status: "unresolved"; readonly reasons: readonly string[] };

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}
```

Reject input rather than dropping unknown content. Hash the canonical draft with
`contentHash` omitted, then verify the supplied full-artifact hash.

## Testing strategy

Follow retained RED/GREEN TDD with small Vitest tests.

Positive tests prove:

- create/parse/canonical round trips for both minimal artifacts;
- insertion-order-independent hash identity and detached results;
- exact, ambiguous, and unresolved usage records;
- path/module/opaque disclosure variants and context claims;
- incomplete coverage with retained positive results;
- a multi-step journey with entry, actions, outcomes, and transitions; and
- exact cross-catalog validation for declared and callsite usage identities.

Negative and mutation tests prove:

- unsupported versions, unknown/missing keys, invalid IDs/hashes/paths/spans,
  duplicates, non-canonical full artifacts, and causal hash mutation;
- drive-relative, URI, traversal, glob, absolute, and source-like location
  payloads, plus legacy raw syntax fingerprints and open syntax-token fields;
- compatibility across lowercase slash-delimited workspace project IDs and
  Form Contract IDs containing `[]*%`, with cross-domain ID rejection;
- numeric version ordering for usage, journey, and transition identities;
- ambiguous resolution with fewer than two candidates and unresolved resolution
  without reasons;
- incomplete coverage without reasons and conflicting scope purposes;
- missing landing step/entry usage/action/outcome/transition references,
  multiply owned actions/outcomes, invalid transition kinds/destinations, and
  duplicate transition tuples;
- missing, ambiguous, unresolved, or form-mismatched journey usage joins and
  mixed workspace-index bases; and
- accessors, symbols, sparse or exotic arrays, exotic objects,
  prototype-disguised built-ins, detectable proxies, cycles, and caller mutation.

Tests assert public input/output behavior and precise paths, not private helper
calls. No test is skipped.

## Boundaries

Always:

- write and observe failing tests before production implementation;
- keep runtime schema code independent of TypeScript, Angular, MCP, and
  Playwright;
- preserve exact identity/reference distinctions and fail closed; and
- keep canonical bytes deterministic across caller insertion order.

Ask first:

- changing Form Contract `0.4.0` or CTX-0A;
- adding a dependency or package;
- moving ownership outside `@formly-contract/schema`; or
- adding a source-indexer, query, diagnostic, producer, or execution concern.

Never:

- infer a journey, form, route, or transition from names, ordinals, or order;
- serialize functions, classes, component types, selectors, module paths chosen
  by an agent, source text, customer values, or absolute paths;
- treat ambiguous/unresolved usage or incomplete coverage as exact authority; or
- execute a producer while parsing, hashing, or validating either artifact.

## Tasks

- [x] `CTX-0B.1` — Write and review this bounded specification.
- [x] `CTX-0B.2` — Add focused RED tests for both artifact families and
      cross-catalog reference integrity.
- [x] `CTX-0B.3` — Implement minimal DTO/parser/canonical/hash/create behavior.
- [x] `CTX-0B.4` — Run focused tests, schema typecheck, scoped lint, and diff
      safety; integrate exports, Changeset, full checks, and review.
- [x] `CTX-0B.5` — Reconcile cross-review privacy, ID-domain compatibility,
      canonical numeric-version ordering, and schema-ID findings test-first.

## Verification evidence

Retained TDD evidence on 2026-08-28:

- RED: `pnpm exec vitest run packages/schema/src/agent-context-usage.test.ts`
  failed before production code with
  `Cannot find module './agent-context-usage.js'`; no test imported.
- Cross-review RED: after adding the six regression groups, the focused command
  ran 44 tests with 6 expected failures covering schema IDs, location privacy,
  syntax-token privacy, identifier domains, and numeric version ordering.
- Independent-review remediation RED: the focused suite grew to 48 tests with
  four expected failures covering deep-input `RangeError`, missing total-node
  refusal, and retained negative-zero arity/ordinal values.
- GREEN: the final focused command passed one file and all 48 tests.
- The original and post-cross-review package-wide
  `pnpm --filter @formly-contract/schema typecheck` runs passed. An equivalent
  strict isolated typecheck over the owned module and test also passed while
  CTX-0D was landing concurrently.
- Scoped ESLint over the source and test files passed with no diagnostics.
- No-index whitespace checks over each of the three owned, untracked files
  passed.

Parent integration is complete: the package barrel and public Changeset are in
place, the combined `CTX-0A` through `CTX-0D` suite passes 190 tests, and the
post-fix review found no actionable findings.

## Success criteria

- Both artifact families and the cross-catalog validator behave as specified.
- Focused tests prove strict data-only parsing, deterministic identity,
  ambiguity/coverage preservation, exact transition integrity, reference
  integrity, mutation resistance, and refusal behavior.
- Schema typecheck, scoped lint, and diff safety pass.
- No file outside this specification and the two owned schema files changes.
- CTX-0C and real source/journey producers can reference these artifacts without
  changing their identity or importing runtime framework code.

## Open questions deferred to later slices

- project-specific path-disclosure defaults and source-program coverage detail;
- producer configuration and source annotation parsing;
- live freshness and authoritative-negative query behavior;
- execution drivers for journey entry/actions/outcomes;
- whether a mature subset later enters a successor Form Contract; and
- workplace coverage and authoring-effort measurements.
