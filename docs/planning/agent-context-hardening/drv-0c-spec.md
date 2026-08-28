# DRV-0C1 Trusted-Local Driver Implementation Inventory

- Status: approved implementation packet
- Owner: experimental `@formly-contract/playwright` package core
- Dependency: reviewed DRV-0A/B driver-registry manifest at `1f79901`
- Scope: DRV-0C1 only; this document does not mark aggregate `DRV-0` complete

## Objective

Provide a trusted-local, eager runtime inventory that associates exact driver
identities with directly callable implementations without turning executable
code into contract data. The inventory deterministically generates the existing
`agent-context.driver-registry@0.1.0` manifest, binds only to an exact whole-
inventory allowlist, and returns a resolver only after that binding succeeds.

This packet proves installation identity and exact capability allowlisting in a
single Node process. It does not execute a driver or prove browser behavior.

## Assumptions and accepted decisions

- Driver source modules are trusted local application or library code. Values
  still cross a strict runtime boundary so configuration mistakes, getters,
  proxies, and exotic containers fail closed without invoking user code.
- Sources are eagerly imported by a future composition root. This packet
  accepts functions, never module paths, package names, export names, factories,
  or dynamic import descriptors.
- A manifest is an exact allowlist for one implementation inventory. It is not
  a lower bound: unlisted drivers and unlisted capabilities make binding fail.
- Implementations are opaque callable identities. This package never invokes,
  clones, serializes, hashes, or exposes them through the generated manifest.
- JavaScript exposes no non-invoking test that distinguishes a callable bound
  function from a non-callable bound class constructor, and a function's
  `name` property is mutable. The boundary therefore rejects every callable
  whose intrinsic `Function.prototype.toString` form contains `[native code]`.
  This conservatively excludes bound and platform-native functions; authors
  must contribute a normal or arrow wrapper function instead.
- Browser execution and conformance belong to `PW-1`/`PW-2`, not DRV-0C.

## Exact authoring and runtime API

```ts
type AgentContextDriverImplementation = (...args: never[]) => unknown;

interface AgentContextDriverImplementationDefinition {
  readonly id: string;
  readonly version: number;
  readonly capabilities: readonly [
    AgentContextDriverCapability,
    ...AgentContextDriverCapability[],
  ];
  readonly implementation: AgentContextDriverImplementation;
}

interface AgentContextGenericDriverImplementationSource {
  readonly sourceId: string;
  readonly kind: 'generic';
  readonly drivers: readonly AgentContextDriverImplementationDefinition[];
}

interface AgentContextApplicationDriverImplementationSource {
  readonly sourceId: string;
  readonly kind: 'application';
  readonly drivers: readonly AgentContextDriverImplementationDefinition[];
}

type AgentContextDriverImplementationSource =
  | AgentContextGenericDriverImplementationSource
  | AgentContextApplicationDriverImplementationSource;

interface AgentContextDriverImplementationRegistry {
  readonly manifest: AgentContextDriverRegistryManifest;
}

function createAgentContextDriverImplementationRegistry(
  sources: readonly AgentContextDriverImplementationSource[],
): AgentContextDriverImplementationRegistry;

function bindAgentContextDriverImplementationRegistry(
  registry: AgentContextDriverImplementationRegistry,
  allowlistManifestInput: unknown,
): AgentContextDriverImplementationBindingResult;
```

The registry is an opaque capability: only values returned by `create` are
accepted by `bind`. Its implementation map is retained in private module state
and is never exported or returned.

## Source and inventory invariants

- Each source is exactly `{ sourceId, kind, drivers }`; each driver is exactly
  `{ id, version, capabilities, implementation }`.
- `sourceId` and driver `id` use the 1-256 character contract-stable identifier
  grammar. Source IDs are unique across the composed input.
- A source may own zero or more drivers. At most 10,000 sources and 10,000
  drivers may be composed.
- Driver identity is the exact `(kind,id,version)` triple. Duplicate triples are
  rejected even when they appear in different sources. Different kinds or
  versions coexist and never shadow one another.
- Application drivers may not use the reserved `generic.` namespace.
- Capabilities are nonempty, unique members of the closed 18-member DRV-0A/B
  vocabulary. Source and capability order are authoring conveniences only.
- The generated manifest is created through the public schema API, so
  registrations and capabilities use the canonical schema order and hash.
  Permuting source, driver, or capability input order does not change it.
- Every container must be an ordinary dense array or a plain/null-prototype
  object with enumerable data properties only, no unknown or symbol keys.
  Proxies, accessors, sparse/exotic arrays, exotic objects, callable proxies,
  classes, all `[native code]` forms (including renamed bound functions and
  platform-native callables), and non-callable implementations are rejected.
  Validation never relies on mutable function names, reads through a getter,
  or invokes an implementation. Normal authored and arrow functions remain
  accepted.
- The returned registry and manifest view are deeply frozen. The private map is
  built once, never exposed, and never mutated after creation.

## Exact whole-inventory binding

Binding strictly parses and self-hash-verifies the supplied manifest, then
compares its registrations with the registry's generated manifest by exact
identity and capability set. It produces these canonical issue variants:

```ts
type AgentContextDriverImplementationBindingIssue =
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_MISSING';
      readonly driver: AgentContextDriverReference;
      readonly requiredCapabilities: NonEmptyCapabilities;
    }
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_NOT_ALLOWLISTED';
      readonly driver: AgentContextDriverReference;
      readonly implementedCapabilities: NonEmptyCapabilities;
    }
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_CAPABILITY_MISSING';
      readonly driver: AgentContextDriverReference;
      readonly missingCapabilities: NonEmptyCapabilities;
    }
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_CAPABILITY_NOT_ALLOWLISTED';
      readonly driver: AgentContextDriverReference;
      readonly notAllowlistedCapabilities: NonEmptyCapabilities;
    };
```

Issues sort by `(kind,id,version)`, then in the variant order shown above; each
capability list is lexicographically sorted. A missing identity and an
unallowlisted identity each produce one issue. When both sides contain an
identity, missing and extra capabilities produce separate issues as needed.

An incompatible result includes the generated inventory-manifest hash, the
supplied allowlist-manifest hash, and a nonempty issue list. It has no
`resolver` property. A compatible result binds the same hashes, has an empty
issue list, and includes the only resolver authorized for that exact pair.

## Exact resolution

The bound resolver accepts an exact driver reference plus one or more required
capabilities. It normalizes capability order and returns one of:

- `resolved`: the exact driver, canonical required capabilities, and the
  original callable identity supplied by the owning source;
- `refused`: the exact driver, canonical required capabilities, and one
  `DRIVER_IMPLEMENTATION_MISSING` or
  `DRIVER_IMPLEMENTATION_CAPABILITY_MISSING` issue.

Resolution never falls back across kind, ID, or version, never selects the
first same-name driver, and never invokes the returned function. Malformed
requests throw `TypeError`; a valid but unauthorized request returns a
structured refusal.

## Commands and project structure

- Source: `packages/playwright/src/driver-implementation-registry.ts`
- Tests: `packages/playwright/src/driver-implementation-registry.test.ts`
- Focused test:
  `pnpm exec vitest run packages/playwright/src/driver-implementation-registry.test.ts`
- Typecheck: `pnpm exec tsc --project packages/playwright/tsconfig.json`
- Scoped lint:
  `pnpm exec eslint packages/playwright/src/driver-implementation-registry.ts packages/playwright/src/driver-implementation-registry.test.ts`
- Documentation check: `node .github/scripts/check-docs.mjs`

Production uses immutable, discriminated result objects and schema-owned
vocabulary/types. Tests are small, deterministic Vitest unit tests asserting
observable results and the absence of callback execution.

## Boundaries

- Always: validate at creation/binding/resolution boundaries; generate the
  manifest through `@formly-contract/schema`; compare exact identities and
  capability inventories; fail closed; retain callback identity.
- Ask first: change the schema vocabulary or manifest; add a Playwright/runtime
  dependency; publish this experimental package; add an invocation API.
- Never: invoke a driver; serialize or hash a callback; accept a module/export
  path; infer capabilities; use a default inventory; fall back during lookup.

## Traceability and acceptance

| Requirement | Implementation task | Verification | C1 status |
| --- | --- | --- | --- |
| `DRV-0C1-REQ-01` strict eager sources | Create/validate source definitions | malformed/proxy/getter/non-callable tests | In scope |
| `DRV-0C1-REQ-02` deterministic inventory | Compose exact identities and schema manifest | permutation, duplicate, namespace, hash tests | In scope |
| `DRV-0C1-REQ-03` exact binding | Compare complete implementation/allowlist inventories | all four canonical issue tests | In scope |
| `DRV-0C1-REQ-04` exact resolution | Return original callable only for exact authorized requests | coexistence/no-fallback/no-invocation tests | In scope |
| `DRV-0C1-REQ-05` private immutable executable state | Hide map and freeze public data | mutation/surface/identity tests | In scope |
| `DRV-0C2-REQ-01` package integration | Add public index/build config/root paths/lock/release wiring | package and repository gates | Deferred to C2 |
| `DRV-0C2-REQ-02` aggregate status reconciliation | Update execution index and governing plans after integration | docs/status review | Deferred to C2 |
| `PW-1/PW-2` browser conformance | Controlled browser fixtures and execution evidence | browser suites | Deferred |

DRV-0C1 is accepted when the five packet files implement and prove the first
five rows, focused tests/typecheck/lint/docs/diff checks pass, and the packet is
committed cleanly. Aggregate `DRV-0` remains in progress through C2 and browser
conformance remains separate.
