# CTX-0C Specification: Scenario-Pinned Execution Authority

- Status: Complete
- Depends on: `CTX-0A`
- Implements: `CTX-0C` in the [execution index](execution-index.md)
- Architecture: [RH-06 reconciliation](rh-06-reconciliation.md)

## Assumptions

1. Form Contract `0.4.0` and the CTX-0A artifact-set envelope remain
   unchanged. CTX-0C is a strict sibling artifact with its own initial schema
   version and content hash.
2. One execution-authority artifact is bound to one form basis and one resolved
   scenario reference. The scenario artifact has its own hash; CTX-0C neither
   embeds nor interprets scenario values, conditions, behavior, or diagnostics.
3. Usage entry, step, action, outcome, and transition records in CTX-0C are
   execution projections. CTX-0B remains the owner of source usage and journey
   authoring records.
4. A semantic operation name is never authority by itself. An executable node
   operation is admitted only with an exact profile, versioned driver, semantic
   part/locator-target mapping, step ownership, and resolved readiness links.
5. Referenced locator targets, constraints, profiles, and driver implementations
   are validated against their hash-pinned owner artifacts by CTX-2 and later
   consumers. CTX-0C validates every ID and equality it owns without importing
   those producers or registries.
6. Exact public names may be adjusted by the parent during integration, when
   the owned module is exported and the package Changeset is added.

## Objective

Add one dependency-light, schema-owned record family that preserves every
source-selected execution decision required by later intent validation and
browser compilation without loading Angular, drivers, scenarios, or source.

Success means:

- a required scenario reference pins scenario ID/version/artifact hash and an
  exact form ID/Form Contract hash basis;
- the scenario and usage bases equal the artifact basis;
- node interactions retain the exact profile, driver kind/ID/version,
  operation, step, purpose-to-part-to-locator-target mapping, and readiness
  IDs;
- commits, validation activation/assertion surfaces, value assertions, state
  assertions, usage entry/actions/outcomes/transitions, and created-item
  capture records all have stable IDs and closed operation-specific shapes;
- shared node-local mechanics use one immutable physical-operation record, so
  a blur approved for both commit and validation cannot silently acquire two
  different targets;
- every physical-operation record is selected by at least one commit or
  validation activation, while validation activation retains independent
  physical-target authority;
- readiness ownership is explicit and disjoint between one exact interaction
  and one exact repeater capture, with bidirectional owner/list agreement;
- usage-action commits and validation activations resolve to an action owned by
  the same step as their node;
- transitions preserve an exact versioned
  `fromStepId/actionId/outcomeId/toStepId` tuple and validate that the outcome
  belongs to the action and has kind `step-changed`;
- a repeater capture owns the exact `add-item` operation, profile, driver,
  distinct add/item targets, readiness IDs, and literal
  `exactly-one-created-item`/`driver-returned-item-scope` guarantees; and
- parsing is strict, data-only, detached, canonical, content-hash verified, and
  fail-closed for unsupported versions, unknown keys, duplicates, ambiguous
  memberships, unresolved links, cross-basis records, wrong operations,
  accessors, proxies, exotic objects, sparse arrays, cycles, and caller-rehashed
  mutations; and
- every public unknown-input entry point performs the same descriptor-safe,
  iterative data-graph preflight before recursive cloning or structured
  cloning, refusing inputs beyond the shared depth or node budget with a
  `TypeError`.

## Non-goals

- Producing or interpreting portable behavior/scenario semantics (`BHV-*`).
- Executing or registering drivers (`DRV-0` and future Playwright work).
- Defining producer diagnostics or CTX-2 diagnostic policy.
- Loading Angular, Formly, project configuration, application factories, MCP,
  browsers, locators, or source files.
- Selecting an omitted commit, assertion, action, transition, capture, target,
  readiness record, or driver by array order or operation name.
- Adding synthetic walkthrough fixtures (`CTX-0D`) or changing CTX-0B records.
- Proving the bytes referenced by scenario, contract, profile, locator, or
  driver identities; later artifact-set consumers perform cross-artifact
  validation.

## Tech stack

- TypeScript and ESM under the existing schema package configuration.
- Node `crypto` SHA-256, Node `util.types.isProxy`, and the existing
  `canonicalStringify`/`parseArrayIndexProperty` helpers.
- Vitest small unit tests only; no filesystem, subprocess, framework, or
  browser dependency.

No new dependency is permitted.

## Proposed public contract

The owned implementation exports these top-level members:

```ts
export const AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION = '0.1.0' as const;

export interface AgentContextExecutionAuthorityDraft {
  readonly schemaVersion:
    typeof AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION;
  readonly basis: AgentContextExecutionBasis;
  readonly scenario: AgentContextScenarioReference;
  readonly physicalOperations: readonly AgentContextPhysicalOperation[];
  readonly readiness: readonly AgentContextReadinessAuthority[];
  readonly interactions: readonly AgentContextNodeInteractionAuthority[];
  readonly commits: readonly AgentContextValueCommitAuthority[];
  readonly validationSurfaces:
    readonly AgentContextValidationSurfaceAuthority[];
  readonly valueAssertions: readonly AgentContextValueAssertionAuthority[];
  readonly stateAssertions: readonly AgentContextStateAssertionAuthority[];
  readonly usage: AgentContextUsageExecutionAuthority;
  readonly repeaterCaptures:
    readonly AgentContextCreatedItemCaptureAuthority[];
}

export interface AgentContextExecutionAuthority
  extends AgentContextExecutionAuthorityDraft {
  readonly contentHash: `sha256:${string}`;
}

parseAgentContextExecutionAuthority(
  input: unknown,
): AgentContextExecutionAuthority;
canonicalizeAgentContextExecutionAuthority(input: unknown): string;
computeAgentContextExecutionAuthorityHash(
  input: unknown,
): `sha256:${string}`;
createAgentContextExecutionAuthority(
  draft: AgentContextExecutionAuthorityDraft,
): AgentContextExecutionAuthority;
```

`parse` accepts a canonical full artifact, verifies its hash, and returns a
detached ordinary DTO. `canonicalize` accepts only such a verified full
artifact. `compute` and `create` accept a draft, normalize every ID-addressed
collection, and never mutate caller data. The artifact hash is SHA-256 over the
canonical normalized draft without `contentHash`.

### Basis and scenario reference

```ts
interface AgentContextExecutionBasis {
  readonly formId: string;
  readonly contractHash: `sha256:${string}`;
}

interface AgentContextScenarioReference {
  readonly id: string;
  readonly version: number;
  readonly artifactHash: `sha256:${string}`;
  readonly basis: AgentContextExecutionBasis;
}
```

The scenario reference points to an independently content-hashed resolved
scenario artifact. Its basis must equal the top-level basis exactly. Changing
the reference changes CTX-0C identity but does not authorize CTX-0C to parse or
produce scenario semantics.

### Drivers, targets, physical operations, and readiness

```ts
interface AgentContextDriverReference {
  readonly kind: "generic" | "application";
  readonly id: string;
  readonly version: number;
}

interface AgentContextInteractionTarget {
  readonly purpose:
    | "control"
    | "trigger"
    | "popup"
    | "option"
    | "row"
    | "selection"
    | "add"
    | "item"
    | "expand"
    | "wrapper";
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

interface AgentContextPhysicalOperation {
  readonly id: string;
  readonly nodeId: string;
  readonly mechanic: "blur" | "click" | "check";
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

type AgentContextReadinessOwner =
  | {
      readonly kind: "interaction";
      readonly interactionId: string;
    }
  | {
      readonly kind: "repeater-capture";
      readonly repeaterCaptureId: string;
    };

interface AgentContextReadinessAuthority {
  readonly id: string;
  readonly nodeId: string;
  readonly owner: AgentContextReadinessOwner;
  readonly operation: "wait-readiness";
  readonly driver: AgentContextDriverReference;
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

interface AgentContextNodeInteractionAuthority {
  readonly id: string;
  readonly nodeId: string;
  readonly stepId: string;
  readonly profile: { readonly id: string; readonly version: number };
  readonly driver: AgentContextDriverReference;
  readonly operation:
    | "fill"
    | "check"
    | "select-option"
    | "select-from-overlay"
    | "type-and-pick"
    | "select-row"
    | "expand-item";
  readonly targets: readonly [AgentContextInteractionTarget, ...AgentContextInteractionTarget[]];
  readonly readinessIds: readonly string[];
}
```

`add-item` is intentionally absent from the general node-interaction union.
One created-item capture record is its sole source authority. A physical
operation is node-owned and must be selected by at least one exact commit or
validation activation. Commit selection requires the physical operation to
match the commit interaction's node and exact part/target pair; different
commit interactions cannot share one physical operation. Validation activation
selects its physical operation independently and requires the same validation
node, without borrowing a generic interaction target.

Every readiness record has exactly one closed owner. Interaction-owned
readiness must equal that interaction's node, driver, and exact part/target
pair. Capture-owned readiness must equal that capture's node and driver and one
of its exact add/item targets. In both variants, the owner must list the
readiness ID and every listed readiness ID must point back to that owner. Every
interaction's node and step must resolve one step membership.

### Commit and assertion authority

Each value commit has `operation: 'commit-value'`, a node and interaction, and
one of the closed authorities from RH-05:

- node-local `included-in-set`, mode `immediate | blur`;
- node-local `explicit-intent`, mode `blur`, naming one exact blur physical
  operation; or
- `usage-action`, naming one exact action owned by the node's step.

A validation surface has one stable validation ID, a constraint ID, one exact
node membership, a closed activation (`none`, node-local, or usage-action), and
an independent assertion record with its own stable ID, literal
`operation: 'assert-validation'`, and exact assertion target. Node-local
activation carries its own ID, literal `operation: 'activate-validation'`, and
one independently selected physical-operation ID for the same node.
Usage-action activation carries the same fixed operation plus one action ID.

Value assertions have a stable ID, literal `operation: 'assert-value'`, exact
node/part/locator-target facts, and kind
`committed-model-value | control-value`. State assertions additionally have a
positive integer version, a non-empty unique state set, literal
`operation: 'assert-state'`, and their own exact driver. Assertion targets and
state drivers are independent source authority; a generic interaction target
or driver cannot substitute for them. Supported states are `visible`, `hidden`,
`enabled`, `disabled`, `valid`, and `invalid`.

### Usage and transitions

```ts
interface AgentContextUsageExecutionAuthority {
  readonly id: string;
  readonly version: number;
  readonly basis: AgentContextExecutionBasis;
  readonly entry: {
    readonly id: string;
    readonly operation: "open-usage";
    readonly landingStepId: string;
    readonly driver: AgentContextApplicationDriverReference;
  };
  readonly steps: readonly AgentContextUsageStepAuthority[];
  readonly actions: readonly AgentContextUsageActionAuthority[];
  readonly outcomes: readonly AgentContextUsageOutcomeAuthority[];
  readonly transitions: readonly AgentContextUsageTransitionAuthority[];
}
```

Usage drivers are always application drivers. Steps own unique node IDs and
action IDs. Every action is owned by exactly one step; every outcome is owned
by exactly one action. Entry landing step, action outcomes, and transition
tuple fields must resolve exactly. A transition outcome must have kind
`step-changed`; step ordinal and collection order never infer a transition.

Actions carry fixed `operation: 'invoke-usage-action'`, their reviewed kind
(`next | submit | cancel | other`), driver, and outcome IDs. Outcomes carry
fixed `operation: 'assert-outcome'`, kind
`remains-on-step | step-changed | navigation | message`, assertion driver, and
assertion target. Transitions carry a stable ID, positive integer version, and
the complete `fromStepId/actionId/outcomeId/toStepId` tuple.

### Created-item capture authority

```ts
interface AgentContextCreatedItemCaptureAuthority {
  readonly id: string;
  readonly version: number;
  readonly repeaterNodeId: string;
  readonly stepId: string;
  readonly profile: { readonly id: string; readonly version: number };
  readonly operation: "add-item";
  readonly guarantee: "exactly-one-created-item";
  readonly captureMode: "driver-returned-item-scope";
  readonly driver: AgentContextDriverReference;
  readonly addTarget: {
    readonly partRef: string;
    readonly locatorTargetRef: string;
  };
  readonly itemTarget: {
    readonly partRef: string;
    readonly locatorTargetRef: string;
  };
  readonly readinessIds: readonly string[];
}
```

The repeater node must belong to `stepId`; `addTarget` and `itemTarget` must be
distinct exact pairs. Readiness IDs must resolve records owned by that exact
capture, for its same node and driver and one of its exact add/item targets.
The parser never accepts a generic interaction operation as a substitute for
this capture.

## Identity, canonicalization, and referential rules

- Stable IDs are 1–256 ASCII characters matching the existing contract stable
  identifier grammar: an ASCII alphanumeric first character followed by ASCII
  alphanumeric, dot, underscore, colon, square bracket, asterisk, percent, or
  hyphen characters.
- Hashes match exactly `sha256:[a-f0-9]{64}`.
- Versions are positive safe integers; step ordinals are non-negative safe
  integers. Accepted ordinal zero is normalized to positive zero before
  canonicalization, hashing, or return so JavaScript negative zero cannot
  survive a round trip.
- Every ID-addressed collection has at most 10,000 records, rejects duplicate
  IDs, and canonicalizes by ID. Steps canonicalize by ordinal then ID, while
  target/state/ID sets use code-unit order and reject duplicates.
- The input data graph has a maximum depth of 128 property/array edges from the
  depth-zero artifact root (`MAX_DATA_GRAPH_DEPTH = 128`) and a maximum of
  100,000 visited value occurrences (`MAX_DATA_GRAPH_NODES = 100_000`). The
  root and every own data-property value or dense array element each count as
  one occurrence; repeated references count each time because recursive clone
  work would also revisit them. An iterative preflight applies these limits
  before recursive clone or `structuredClone`, reads only property
  descriptors, and rejects proxies before any reflective operation, so it
  invokes neither accessors nor proxy traps.
- Full-artifact parsing requires canonical collection order. Draft compute and
  create normalize order before hashing.
- Node and action membership are exclusive: a node or action cannot occur in
  two steps. Outcomes cannot be owned by more than one action.
- Every interaction, physical operation, readiness record, commit, validation
  surface, value assertion, state assertion, and repeater capture resolves one
  declared node membership. Every interaction's explicit `stepId` must equal
  that membership.
- Every physical operation is referenced by a commit and/or validation
  activation. Commit-selected physical targets equal an exact
  `{ partRef, locatorTargetRef }` pair on that commit's interaction; validation
  activation selects the physical target independently for its node.
- Validation, value, and state assertion targets are independent exact source
  authority and do not have an interaction linkage. State assertion drivers
  likewise do not inherit from a generic interaction.
- Readiness owners are a closed interaction/repeater-capture union. Owner/list
  links agree in both directions, and each readiness target equals the exact
  target set of its selected owner.
- Driver equality is structural over kind, ID, and version. Profile equality
  is structural over ID and version.
- All readiness owner IDs, readiness IDs, interaction IDs,
  physical-operation IDs, action IDs,
  outcome IDs, step IDs, and transition tuple members resolve exactly once.
- Missing links and duplicate candidates refuse. No fallback chooses the first
  candidate.
- Every object is closed. Input must be a dense, enumerable, data-only,
  symbol-free plain JSON graph; null-prototype objects are accepted only when a
  structured clone proves the identical ordinary data graph.

## Commands

From the repository root:

```text
Focused RED/GREEN: pnpm exec vitest run packages/schema/src/agent-context-execution-authority.test.ts
Schema typecheck:  pnpm --filter @formly-contract/schema typecheck
Scoped lint:       pnpm exec eslint packages/schema/src/agent-context-execution-authority.ts packages/schema/src/agent-context-execution-authority.test.ts
Diff safety:       git diff --check
```

Parent-owned barrel exports, the package Changeset, execution-index status,
and broader repository verification are now integrated.

## Project structure and ownership

| File                                                            | Responsibility                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/schema/src/agent-context-execution-authority.ts`      | DTOs, strict parser, referential validation, canonicalization, creation, hashing |
| `packages/schema/src/agent-context-execution-authority.test.ts` | RED/GREEN behavioral and adversarial tests                                       |
| This specification                                              | Requirements, boundaries, and traceability                                       |

No other file is owned by this work item. In particular, do not edit the
schema barrel, Changesets, package versions, execution index, CTX-0B files,
fixtures, workspace, compiler, Angular, MCP, or Playwright code.

## Testing strategy

Use TDD and retain the initial module-not-found RED result before production
implementation.

Positive tests prove:

- create, parse, canonicalize, and hash round-trip one complete authority;
- different valid draft collection orders normalize to identical content
  hashes and bytes;
- scenario artifact hash remains distinct from, and causal to, the authority
  hash;
- one physical blur can be linked by both an explicit commit and validation
  activation without duplicating mechanics;
- a validation activation can independently select a physical target that is
  not a generic interaction target;
- every three-part driver identity and every complete transition/capture fact
  survives round-trip; and
- parse/create results are detached from caller mutation.

Negative/adversarial tests prove:

- unsupported schema version, missing or unknown keys, invalid ID/version/hash,
  and hash mismatch;
- duplicate IDs/targets/states/memberships and non-canonical full input;
- unresolved interaction, node, step, action, outcome, readiness, physical
  operation, activation/assertion, or transition links;
- one-sided or cross-owner readiness links, unused physical operations,
  cross-interaction commit sharing, and identical capture add/item targets;
- cross-basis scenario/usage, action owned by the wrong step, wrong transition
  source/action/outcome/destination relation, and non-step-changing transition
  outcomes;
- operation-only or wrong-operation records, owner-specific mismatched
  readiness drivers/targets, and invalid capture guarantee/mode;
- sparse/extended arrays, symbols, accessors without getter execution,
  non-enumerable data, classes, dates, exotic prototypes, detectable proxies,
  and cycles;
- a 20,000-level unknown extra and a graph exceeding 100,000 visited nodes are
  rejected with a bounded `TypeError` by create, compute, parse, and
  canonicalize before recursive cloning;
- negative-zero step ordinals normalize to positive zero and retain the same
  canonical bytes and content hash as an equivalent positive-zero draft; and
- a caller-mutated or caller-rehashed artifact still fails semantic validation
  before it could be consumed.

Tests assert public outcomes and stable failure paths, not private helper calls.

## Boundaries

Always:

- write the specification before production code and observe RED before GREEN;
- reject unknown or ambiguous authority rather than dropping or selecting it;
- retain exact versioned IDs and equality-relevant fields through normalized
  output; and
- keep canonical identity deterministic across caller insertion order.

Ask before:

- changing Form Contract `0.4.0`, CTX-0A, or CTX-0B;
- adding a dependency or editing a fourth file;
- adding scenario values/conditions/behavior or driver executable code; or
- weakening exact joins to best-effort lookup.

Never:

- accept raw selectors, callbacks, driver module paths, source snippets,
  customer values, or arbitrary option bags;
- derive authority from operation names, step ordinal, array order, labels, or
  a matching content hash alone; or
- load or execute a producer, application, scenario, Angular runtime, MCP
  handler, or browser while parsing or hashing.

## Tasks

- [x] `CTX-0C.1` — Record assumptions, public shape, referential rules,
      boundaries, and verification in this spec.
- [x] `CTX-0C.2` — Add focused tests and retain the initial RED failure.
- [x] `CTX-0C.3` — Implement the minimal strict DTO/parser/hash/create module.
- [x] `CTX-0C.4` — Run focused tests, schema typecheck, scoped lint, and diff
      safety; report integration-only work to the parent.

## Completion evidence

- RED: the first focused Vitest run exited `1` because
  `agent-context-execution-authority.js` did not exist; Vitest collected zero
  tests.
- RED: the focused regression run failed nine new assertions: all four public
  entry points raised `RangeError` for a 20,000-level extra, all four lacked
  the shared total-node refusal, and create retained a negative-zero ordinal.
- GREEN: the focused Vitest run passed one test file and all 51 tests.
- `pnpm --filter @formly-contract/schema typecheck` passed.
- Scoped ESLint for the owned source and test files passed.
- `git diff --check` passed.
- Barrel export, package Changeset, execution-index updates, and the combined
  190-test `CTX-0A` through `CTX-0D` verification are complete. Fresh post-fix
  review found no actionable findings.

## Success criteria

- The four public functions and all execution-authority DTOs behave as
  specified.
- Focused tests prove canonical content identity, strict data-only parsing,
  exact internal resolution, operation-specific refusal, basis matching, and
  mutation resistance.
- No scenario semantics, producer runtime, driver implementation, diagnostic
  policy, MCP, or browser code is introduced.
- Focused Vitest, schema typecheck, and scoped lint pass.
- Only the three owned files are changed by this worker.

## Integration result

The module is exported through `packages/schema/src/index.ts`, the schema
package Changeset is present, CTX-0B identity joins are reconciled, and the
execution index records the completed shared checkpoint.
