# CTX-0A Specification: Pinned Artifact-Set Foundation

- Status: Ready after RH-06 review instance 3
- Depends on: `RH06-DOC`
- Implements: `CTX-0A` in the [execution index](execution-index.md)
- Architecture: [RH-06 reconciliation](rh-06-reconciliation.md)

## Assumptions

1. Form Contract `0.4.0` remains unchanged; this is a sibling schema family
   with its own initial schema version.
2. The first slice proves immutable artifact-set identity and pins the current
   workspace index plus sibling artifact bytes. It does not define live
   freshness status, execution authority, consumer diagnostics, source
   indexing, journey semantics, behavior semantics, intent validation, MCP, or
   browser execution.
3. `repositoryRevision` is bounded provenance only. CTX-0A does not claim that
   it closes every dirty-worktree input or proves that independently produced
   artifacts came from one build. Owner-specific basis references and CTX-2
   later prove mixed-context integrity.
4. The artifact set may be incomplete while producer lanes are being built.
   Later context/intent validators decide which schema-addressed records are
   mandatory for a requested operation.
5. Open schema-addressed references inventory artifact bytes without freezing
   unfinished producer-kind or logical-ID unions. Unknown schema IDs never
   confer execution authority.
6. Exact public names may change during independent review before RED tests are
   committed; after implementation they become versioned API.

## Objective

Add a dependency-light schema-owned foundation that lets all future producer
and consumer lanes pin the same workspace index and sibling artifact bytes
without relying on “latest.”

The user-visible outcome is not a new command. It is a strict, canonical,
content-addressed record that future source-lineage, journey, behavior,
Angular-authoring, query, intent, and Playwright work can share.

Success means:

- every referenced sibling artifact has an open namespaced schema ID, schema
  version, and lowercase SHA-256 content hash;
- the set records a bounded repository-revision provenance token and a
  structured workspace-index schema-version/content-hash anchor;
- the set's own content hash is its sole canonical identity;
- exact references are unique and canonicalized in stable order;
- parsing rejects unknown properties, accessors, exotic prototypes, symbols,
  sparse arrays, invalid schema IDs/versions/hashes, duplicates, an unsupported
  artifact-set version, and a mismatched set hash; and
- synthetic fixtures can create and round-trip an incomplete but honest set
  without claiming that future producers already exist.

## Non-goals

- Defining `FormUsage`, journey entry/step/action/transition records (`CTX-0B`).
- Defining scenario, commit, assertion, or repeater execution authority
  (`CTX-0C`).
- Defining the RH-05 walkthrough fixture graph (`CTX-0D`).
- Generalizing or changing Form Contract hashing.
- Reading Git, source files, workspace config, Angular metadata, or registries.
- Comparing an artifact set with a live checkout or defining
  `current | stale | unknown`; CTX-1 owns that comparison and vocabulary.
- Defining stable diagnostic codes, phases, severity, typed locations,
  blocking policy, or remediation; CTX-2 owns that consumer contract.
- Selecting the CTX-1/CTX-2 implementation module boundary.
- Proving an input-manifest closure or common build identity across producer
  artifacts. A future versioned input-manifest design is required before an
  `inputDigest` or derived build ID can be authoritative.

## Tech stack

- TypeScript and ESM using the repository's current compiler configuration.
- Node `crypto` SHA-256 and the existing `canonicalStringify` helper.
- Vitest small unit tests; no filesystem, subprocess, Angular, or browser use.

No new dependency is permitted.

## Proposed contract

The exact implementation should follow this shape unless RED tests expose a
contradiction:

```ts
export const AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION = '0.1.0' as const;

export type Sha256Digest = `sha256:${string}`;

export interface AgentContextArtifactReference {
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly contentHash: Sha256Digest;
}

export interface AgentContextWorkspaceIndexReference {
  readonly schemaVersion: string;
  readonly contentHash: Sha256Digest;
}

export interface AgentContextArtifactSetDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION;
  readonly repositoryRevision: string;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly artifacts: readonly AgentContextArtifactReference[];
}

export interface AgentContextArtifactSet
  extends AgentContextArtifactSetDraft {
  readonly contentHash: Sha256Digest;
}
```

The workspace index is a required structured anchor separate from the open
`artifacts` inventory. CTX-0A does not reserve a workspace-index `schemaId` or
attempt to recognize semantic duplication under an arbitrary open schema ID;
known owner parsers and later integrity validation may reject redundant or
conflicting evidence. An empty `artifacts` array is legal and explicitly means
the future sibling producer set is not yet populated. Logical selectors such
as `formId`, usage ID, scenario ID, journey ID, and driver ID belong to their
owner-specific CTX-0B/CTX-0C references; CTX-0A does not impose one incompatible
grammar on all of them.

`schemaId` is open for forward-compatible inventory. A consumer may use an
artifact as evidence or authority only when a statically registered owner
parser supports that exact schema ID and version and validates the referenced
bytes. In particular, CTX-0A does not prematurely merge portable behavior,
resolved scenarios, observations, authoring reports, or future factory
evidence into one closed kind.

The public API is:

```ts
parseAgentContextArtifactSet(input: unknown): AgentContextArtifactSet;
canonicalizeAgentContextArtifactSet(input: unknown): string;
computeAgentContextArtifactSetHash(input: unknown): `sha256:${string}`;
createAgentContextArtifactSet(
  draft: AgentContextArtifactSetDraft,
): AgentContextArtifactSet;
```

`parse` requires and verifies `contentHash`, requires references to already be
in canonical order, and returns detached normalized data. `canonicalize`
accepts a valid full set and includes its verified `contentHash` in the emitted
JSON. `compute` accepts a valid draft, clones and sorts its references using
the same normalization as `create`, and hashes those canonical draft bytes.
`create` validates a draft, performs that identical normalization, computes the
digest, and returns a detached full set. Reference insertion order therefore
cannot change either function's identity result. Keeping full-set serialization
separate from hash-input serialization matches the workspace-index convention
and avoids an API whose name silently omits a field.

## Identity and ordering rules

- `schemaId` is 1–128 ASCII characters and uses this exact pattern:

  ```ts
  const SCHEMA_ID_PATTERN = new RegExp(
    '^[a-z][a-z0-9]*' +
      '(?:[.-][a-z0-9]+)+$',
    'u',
  );
  ```

  Valid examples are `formly-contract.form-contract`, `agent-context.lineage`,
  and `app-driver.customer-lookup`. Invalid examples include `form`,
  `Formly.contract`, `form..contract`, `form_contract`, `form/contract`,
  `form.`, and `.form`.
- `repositoryRevision` is 1–256 printable ASCII characters with no control
  characters or leading/trailing whitespace. It is provenance, not proof of a
  complete source-input closure.
- referenced `schemaVersion` is 1–64 ASCII characters, starts and ends with an
  ASCII alphanumeric character, and may contain ASCII alphanumeric, dot,
  underscore, plus, or hyphen characters between them. Only the artifact set's
  own unsupported schema version is rejected by CTX-0A; owner parsers decide
  whether referenced versions are supported.
- hashes match exactly `sha256:[a-f0-9]{64}`.
- at most 10,000 artifact references are accepted.
- references sort by `schemaId`, then `schemaVersion`, then `contentHash`, using
  code-unit ordering.
- an exact duplicate `{ schemaId, schemaVersion, contentHash }` is invalid.
- every object is closed and every array is dense, data-only, and symbol-free.

## Commands

From the repository root:

```text
Focused RED/GREEN: pnpm exec vitest run packages/schema/src/agent-context-artifacts.test.ts
Schema type/build: pnpm --filter @formly-contract/schema build
Scoped lint:       pnpm exec eslint packages/schema/src/agent-context-artifacts.ts packages/schema/src/agent-context-artifacts.test.ts packages/schema/src/index.ts
Full verification: pnpm check
Diff safety:       git diff --check
```

## Project structure

| File | Responsibility |
| --- | --- |
| `packages/schema/src/agent-context-artifacts.ts` | DTOs, strict parser, canonicalization, creation, hashing |
| `packages/schema/src/agent-context-artifacts.test.ts` | RED/GREEN behavioral and adversarial tests |
| `packages/schema/src/index.ts` | Public exports only |
| `.changeset/<generated-name>.md` | Minor release note for the new public schema API |
| This specification | Requirements and traceability |

No workspace, compiler, fixture, Angular, MCP, or Playwright file belongs in
CTX-0A.

## Code style

Follow the strict data-only parser pattern already used by runtime provenance
and the workspace index. Return normalized fresh objects rather than the
caller's mutable input:

```ts
export function parseAgentContextArtifactSet(
  input: unknown,
): AgentContextArtifactSet {
  const normalized = validateAndNormalize(input, {
    requireContentHash: true,
  });

  if (normalized.contentHash !== computeNormalizedHash(normalized)) {
    fail('artifactSet.contentHash', 'does not match artifact content.');
  }

  return normalized as AgentContextArtifactSet;
}
```

Do not use JSON serialization as the first read of an untrusted object if that
would invoke a `toJSON` or accessor. Inspect descriptors and prototypes before
reading values.

## Testing strategy

Use TDD with a retained RED result before implementation.

Small positive tests:

- create, parse, and canonical round-trip a minimal empty set;
- prove directly that differently ordered valid drafts satisfy
  `compute(A) === compute(B) === create(A).contentHash`, and that both created
  sets have identical canonical bytes;
- prove every causal provenance/workspace/reference field changes the content
  hash; and
- prove parsing returns a detached normalized object.

Small negative/adversarial tests:

- prior/future top-level set schema version;
- unknown or missing properties at every object level;
- malformed hash, schema ID, referenced version, revision, or workspace-index
  reference;
- duplicate reference identity;
- hash mismatch after each causal mutation;
- sparse arrays, non-enumerable indexed elements, extra array properties,
  symbols, accessors, non-enumerable data, class instances, dates, safely
  detectable proxies, and cyclic input;
- control characters and leading or trailing whitespace in revision
  provenance; and
- caller mutation after parse or create does not mutate the returned result.

Tests assert observable acceptance, normalized output, hashes, and diagnostic
paths. They do not assert private helper calls.

Descriptor/prototype inspection can trigger traps on an arbitrary JavaScript
proxy. The implementation should reject proxies detectable through Node's
standard utility before traversal, but the public contract does not promise
trap-free handling of every adversarial proxy.

## Boundaries

Always:

- write and run failing tests before implementation;
- keep schema runtime free of Angular, TypeScript compiler, MCP, and Playwright;
- reject rather than drop unknown input; and
- keep canonical output deterministic across caller insertion order.

Ask before:

- changing `FormContract` `0.4.0`;
- adding a package or dependency;
- moving the schema out of `@formly-contract/schema`; or
- adding machine-local paths, timestamps, process IDs, or environment data.

Never:

- serialize functions, classes, component types, selectors, module paths,
  customer values, or source snippets;
- treat presence of an artifact reference as proof that its contents are valid
  or complete; or
- execute a producer while parsing, hashing, or validating the set.

## Tasks

- [ ] `CTX-0A.1` — Add RED tests for DTO shape, strict parsing, ordering,
  hashing, and adversarial inputs.
  - Acceptance: focused tests fail because the public API is absent.
  - Verify: focused Vitest command with the failure recorded.
  - Files: test file only.
- [ ] `CTX-0A.2` — Implement minimal DTO/parser/canonical/hash/create behavior.
  - Acceptance: all focused tests pass without ignored cases.
  - Verify: focused Vitest and schema build.
  - Files: implementation and test files.
- [ ] `CTX-0A.3` — Export the public API and run refactor/scope checks.
  - Acceptance: ESM exports type-check; the schema package Changeset describes
    the new public API; no unrelated public surface changes.
  - Verify: scoped lint, schema build, and `git diff --check`.
  - Files: package barrel, package Changeset, plus prior files.
- [ ] `CTX-0A.4` — Run full repository verification and fresh review.
  - Acceptance: `pnpm check` passes and review has no unresolved blocking
    finding.
  - Verify: recorded full-check and review evidence.
  - Files: no new scope unless a finding requires a documented correction.

## Success criteria

- The four public functions and DTOs behave exactly as specified.
- The retained test suite proves data-only parsing, deterministic identity,
  mutation resistance, and rejection behavior.
- The set uses open schema-addressed references and does not freeze unfinished
  logical artifact identities or authority classes.
- `pnpm check` passes.
- No downstream producer or consumer code is introduced.
- CTX-0B and CTX-0C can reference the artifact set without revising its
  identity or freshness inputs.

## Deferred questions

These do not block CTX-0A and are owned by later slices:

- final `FormUsage`, journey, scenario, and driver-registry record names;
- which artifact subset is required for contract-only, authoring-only, or
  executable queries;
- live-checkout freshness comparison, input-manifest closure, mixed-context
  basis validation, and review-only stale behavior;
- path disclosure modes and source coverage; and
- whether a future mature subset is folded into a successor Form Contract.
