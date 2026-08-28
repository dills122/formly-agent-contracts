# DRV-0A/B Driver-Registry Manifest Contract

- Status: DRV-0A/B complete; aggregate DRV-0 incomplete
- Owner: `@formly-contract/schema`
- Schema identity: `agent-context.driver-registry@0.1.0`
- Dependency: `CTX-0C`
- Scope: DRV-0A/B only; this document does not mark the full `DRV-0` work item complete

## Objective

Freeze a deterministic, hash-addressed sibling artifact that allowlists exact
driver identities and their declared E2E capabilities. Add a pure compatibility
check between that manifest and the driver references already bound by the
`agent-context.execution-authority@0.1.0` artifact.

This packet proves declarative allowlisting only. A compatible result does not
prove that an implementation is installed, importable, callable, safe, or
browser-conformant.

## Exact DTO

```ts
const AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_ID =
  'agent-context.driver-registry' as const;
const AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION = '0.1.0' as const;

type AgentContextDriverCapability =
  | 'activate-validation'
  | 'activate-wrapper'
  | 'add-item'
  | 'assert-outcome'
  | 'assert-state'
  | 'assert-validation'
  | 'assert-value'
  | 'check'
  | 'commit-value'
  | 'expand-item'
  | 'fill'
  | 'invoke-usage-action'
  | 'open-usage'
  | 'select-from-overlay'
  | 'select-option'
  | 'select-row'
  | 'type-and-pick'
  | 'wait-readiness';

interface AgentContextDriverRegistration {
  readonly kind: 'generic' | 'application';
  readonly id: string;
  readonly version: number;
  readonly capabilities: readonly [
    AgentContextDriverCapability,
    ...AgentContextDriverCapability[],
  ];
}

interface AgentContextDriverRegistryManifestDraft {
  readonly schemaVersion: '0.1.0';
  readonly registrations: readonly AgentContextDriverRegistration[];
}

interface AgentContextDriverRegistryManifest
  extends AgentContextDriverRegistryManifestDraft {
  readonly contentHash: `sha256:${string}`;
}

type AgentContextExecutionAuthorityDriverCompatibilityIssue =
  | {
      readonly code: 'DRIVER_REGISTRATION_MISSING';
      readonly driver: {
        readonly kind: 'generic' | 'application';
        readonly id: string;
        readonly version: number;
      };
      readonly requiredCapabilities: readonly [
        AgentContextDriverCapability,
        ...AgentContextDriverCapability[],
      ];
    }
  | {
      readonly code: 'DRIVER_CAPABILITY_MISSING';
      readonly driver: {
        readonly kind: 'generic' | 'application';
        readonly id: string;
        readonly version: number;
      };
      readonly missingCapabilities: readonly [
        AgentContextDriverCapability,
        ...AgentContextDriverCapability[],
      ];
    };

type AgentContextExecutionAuthorityDriverCompatibilityResult =
  | {
      readonly status: 'compatible';
      readonly executionAuthorityContentHash: `sha256:${string}`;
      readonly driverRegistryContentHash: `sha256:${string}`;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'incompatible';
      readonly executionAuthorityContentHash: `sha256:${string}`;
      readonly driverRegistryContentHash: `sha256:${string}`;
      readonly issues: readonly [
        AgentContextExecutionAuthorityDriverCompatibilityIssue,
        ...AgentContextExecutionAuthorityDriverCompatibilityIssue[],
      ];
    };
```

The manifest is referenced through the existing open artifact-set envelope as
`{ schemaId, schemaVersion, contentHash }`. Neither that envelope nor Form
Contract `0.4.0` embeds or special-cases the registry.

## Invariants

- Registrations are data only: exactly `{ kind, id, version, capabilities }`.
  Module paths, package names, export names, callbacks, factories, selectors,
  option bags, and executable defaults are unknown keys and are rejected.
- Registration identity is the exact triple `(kind,id,version)`. Duplicate
  triples are rejected. Different versions may coexist.
- No lookup falls back across kind, ID, or version, and no lookup chooses the
  first same-name registration.
- Registration order is canonical by kind, then ID, then numeric version.
- Each capability list is nonempty, unique, supported by the closed vocabulary,
  and lexicographically ordered.
- Draft `create` and `compute` operations normalize both orders. Parsing a full
  manifest requires canonical form and an exact lowercase SHA-256 self-hash.
- Generic registrations are manifest-allowlisted and are not constrained by the
  existing Form Contract `0.4.0` `GenericFieldTypeDriverId` union. Application
  registrations may not use the reserved `generic.` namespace.
- Existing CTX-0C usage entry, action, and outcome driver references remain
  application-only. This manifest does not weaken their schema validation.

## Pure compatibility algorithm

`validateAgentContextExecutionAuthorityDriverCompatibility` performs no I/O
and accepts unknown inputs so both artifacts are revalidated at the boundary.

1. Strictly parse and self-hash-verify the execution-authority artifact and the
   driver-registry manifest. Invalid, stale, noncanonical, or semantically
   invalid artifacts throw `TypeError`; compatibility results describe only two
   valid artifacts.
2. Collect the exact driver/capability requirements already bound by CTX-0C:
   usage entry (`open-usage`), interactions (`fill`, `check`, `select-option`,
   `select-from-overlay`, `type-and-pick`, `select-row`, `expand-item`),
   readiness (`wait-readiness`), state assertions (`assert-state`), usage
   actions (`invoke-usage-action`), usage outcomes (`assert-outcome`), and
   repeater capture (`add-item`).
3. Group requirements by exact `(kind,id,version)` and sort each unique
   capability set lexicographically.
4. Look up only that exact triple. If absent, emit one
   `DRIVER_REGISTRATION_MISSING` issue with all required capabilities. If
   present but incomplete, emit one `DRIVER_CAPABILITY_MISSING` issue with only
   the missing capabilities.
5. Sort issues by `(kind,id,version)` and return a result bound to both input
   content hashes. Return `compatible` only when the issue list is empty.

The remaining vocabulary members—`activate-wrapper`, `commit-value`,
`activate-validation`, `assert-value`, and `assert-validation`—are reserved for
CTX-2 bindings. CTX-0C records name those semantic operations but do not yet
carry exact driver references for them, so this packet does not invent or infer
registrations.

An authority mutation with a newly computed content hash is still treated as
new untrusted content: full execution-authority semantic validation runs first,
then the mutated exact driver requirements must independently match the pinned
manifest. A hash is content identity, not execution approval.

## Security and bounds

- Every public manifest boundary rejects functions, accessors, proxies,
  symbol-keyed properties, sparse or exotic arrays, class/built-in instances,
  cycles, non-finite numbers, and non-enumerable or additional array data.
- Getters and proxy traps are not invoked while rejecting unsafe inputs.
- Cheap shallow checks run before graph traversal, cloning, or
  canonicalization. They reject a root or registration proxy/exotic prototype,
  dense or sparse registration arrays longer than 10,000, IDs longer than 256
  characters, and capability arrays longer than the closed 18-member
  vocabulary without visiting later registration properties or array entries.
- The subsequent iterative preflight rejects each reached proxy or exotic
  prototype before enumerating its keys, rejects arrays longer than 100,000
  slots and primitive strings longer than 4,096 characters, and caps traversal
  at depth 128 and 100,000 graph nodes. Property keys longer than 1,024
  characters are rejected immediately after that object's own keys are
  enumerated and before cloning or canonicalization.
- JavaScript provides no constant-time count of an arbitrary plain object's
  own keys: validating such an object necessarily enumerates its key list.
  Accordingly, the node cap bounds traversal work but not the temporary key
  list for a single extremely wide object. A serialized-input boundary must
  enforce its own byte limit before parsing and calling this in-memory API.
- A manifest contains at most 10,000 registrations. IDs otherwise use the
  existing 1–256 character contract-stable identifier grammar, and versions
  are positive safe integers.
- Compatibility output is bounded by the finite authority collections, groups
  repeated uses by exact driver identity, and returns no authority payload,
  implementation path, selector, callback, or option data.

## Non-goals

- No driver implementation registry, module loading, package resolution,
  callback execution, default executable inventory, or Playwright dependency.
- No proof that a manifest entry has a runtime implementation or conforms in a
  browser.
- No change to Form Contract `0.4.0`, CTX-0D fixtures, the CTX-0A artifact-set
  envelope, the existing compile-time generic-driver union, or any producer.
- No compatibility fallback, automatic capability inference, or agent-selected
  driver module.

## Acceptance

- The public schema API exports the schema constants, closed capability
  vocabulary and type, registration/draft/manifest types, compatibility issue
  and result types, strict parse/canonicalize/hash/create functions, and the
  pure compatibility validator.
- Tests cover all 18 capabilities and all 13 CTX-0C-bound operations; strict
  round-trip and hashing; malformed data and ordering; exact identity and
  no-fallback behavior; authority and manifest mutations; and bounded unsafe
  graphs without invoking getters or proxy traps.
- The exact schema triple round-trips through the unchanged artifact-set
  reference envelope.
- Focused schema tests, schema typecheck, scoped lint, and `git diff --check`
  pass with no new dependency.

## Remaining runtime-owned gap

`DRV-0C1` has added and verified the private
`@formly-contract/playwright` implementation inventory keyed by these exact
triples, including exact whole-inventory binding and resolution without browser
execution. Aggregate `DRV-0` remains incomplete until `DRV-0C2` binds the five
CTX-2-reserved capabilities to validated plans containing exact authority.
Browser conformance remains evidence for the later `PW-1` and `PW-2` lanes.
