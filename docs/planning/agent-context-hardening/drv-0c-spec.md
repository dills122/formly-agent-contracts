# DRV-0C Trusted-Local Driver Inventory and Plan Binding

- Status: DRV-0C1 complete; DRV-0C2 current-plan binding complete with CTX-2D1
- Owner: experimental `@formly-contract/playwright` package core
- Dependency: reviewed DRV-0A/B driver-registry manifest at `1f79901`
- Scope: DRV-0C1 inventory plus DRV-0C2 current-plan binding; no driver
  invocation or browser conformance

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

## DRV-0C2 exact validated-plan call binding

`CTX-2D1` lowers only a successfully revalidated
`agent-context.validated-plan@0.1.0` into a deterministic sequence of trusted
driver-call bindings. The private Playwright package owns this lowering because
it joins portable plan data to executable local identities. It does not move
semantic validation or driver DTO ownership out of `@formly-contract/schema`.

Each data-only call is exactly:

```ts
interface AgentContextValidatedPlanDriverCall {
  readonly planStepId: string;
  readonly driver: AgentContextDriverReference;
  readonly requiredCapabilities: readonly [
    AgentContextDriverCapability,
    ...AgentContextDriverCapability[],
  ];
  readonly approvedStep: AgentContextValidatedExecutionStep;
}
```

The binding result pairs that closed call with the exact callable returned by
the already allowlist-bound resolver. The call binder accepts only the exact,
frozen binding result created by
`bindAgentContextDriverImplementationRegistry`; module-private runtime
provenance rejects structural clones and resolver replacements before they can
yield calls. The exported result type is backed by an internal class with an
ECMAScript private field, so ordinary TypeScript object spread or resolver
replacement cannot preserve its nominal identity. The separate runtime
`WeakSet` still authenticates the exact returned object, including against
type-preserving `Proxy` wrappers. There is deliberately no independent
selector, locator list, free-form argument bag, module path, or override field.
The approved step is the sole execution payload and remains reviewable as data.

Binding follows this order and may not reorder it:

1. invoke the complete pure CTX-2 revalidator with the source intent, submitted
   context and plan hash, current dataset/live owners, and pinned manifest;
2. reject the whole request on any revalidation diagnostic, before inspecting
   the implementation binding;
3. authenticate the exact frozen registry-binding result and reject structural
   clones or resolver replacements;
4. parse the now-authorized plan and lower its steps in canonical plan order;
5. request the exact serialized driver identity and capability set for every
   call; and
6. return all bound calls only when every resolution succeeds. Any refusal
   returns step-local issues and no partial call batch.

The currently validated step union maps without inference:

- `open-usage` requires `open-usage` from its application driver;
- `wait-readiness`, `set-value`, `perform-node-operation`, `expect-value`, and
  `expect-validation` reuse their exact approved binding driver and operations;
- `expect-state` requires `assert-state` from its exact assertion driver.

This binds the five CTX-2-reserved capabilities (`commit-value`,
`activate-validation`, `assert-value`, `assert-validation`, and, when CTX-2
later admits wrapper expansions, `activate-wrapper`) through one ABI. The first
four are exercised by the current positive/negative plans. Wrapper expansion
remains fail closed in CTX-2 and therefore cannot create a call yet.

The operation returns callable identities but never invokes them. Browser
arguments, return values, error semantics, fixtures, and conformance remain
owned by `PW-1`/`PW-2`. Repeater capture, usage actions, transitions, and
outcomes remain `CTX-2D2`; they may extend the closed validated-step union and
then use this same lossless binding rule.

## Commands and project structure

- Source: `packages/playwright/src/driver-implementation-registry.ts`
- Call binding: `packages/playwright/src/validated-plan-driver-call-binding.ts`
- Tests: adjacent `*.test.ts` files under `packages/playwright/src`
- Focused test:
  `pnpm exec vitest run packages/playwright/src`
- Typecheck: `pnpm exec tsc --project packages/playwright/tsconfig.json`
- Scoped lint:
  `pnpm exec eslint packages/playwright/src/driver-implementation-registry.ts packages/playwright/src/driver-implementation-registry.test.ts packages/playwright/src/validated-plan-driver-call-binding.ts packages/playwright/src/validated-plan-driver-call-binding.test.ts packages/playwright/src/index.ts`
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
| `DRV-0C1-REQ-01` strict eager sources | Create/validate source definitions | malformed/proxy/getter/non-callable tests | Complete |
| `DRV-0C1-REQ-02` deterministic inventory | Compose exact identities and schema manifest | permutation, duplicate, namespace, hash tests | Complete |
| `DRV-0C1-REQ-03` exact binding | Compare complete implementation/allowlist inventories | all four canonical issue tests | Complete |
| `DRV-0C1-REQ-04` exact resolution | Return original callable only for exact authorized requests | coexistence/no-fallback/no-invocation tests | Complete |
| `DRV-0C1-REQ-05` private immutable executable state | Hide map and freeze public data | mutation/surface/identity tests | Complete |
| `DRV-0C1I-REQ-01` package integration | Add the private package index/build config/root paths/lock wiring | package and repository gates | Complete |
| `DRV-0C1I-REQ-02` C1 status reconciliation | Update the execution index and governing plans after integration while keeping aggregate `DRV-0` incomplete | docs/status review | Complete |
| `DRV-0C2-REQ-01` validated-plan call ABI | Preserve each exact closed validated step without a secondary argument or selector bag | positive/negative call-shape and deterministic-order tests | Complete (`CTX-2D1`) |
| `DRV-0C2-REQ-02` revalidation before lookup | Run complete CTX-2 revalidation before any implementation-binding access | caller-rehashed mutation plus binding-access trap | Complete (`CTX-2D1`) |
| `DRV-0C2-REQ-03` authenticated exact all-or-nothing resolution | Accept only the authentic frozen binding, match its allowlist hash, bind each exact driver/capability pair, and return no partial batch | clone/resolver-replacement rejection, direct per-step mapping, mismatched/incompatible binding tests, plus C1 missing identity/capability and no-fallback tests | Complete (`CTX-2D1`) |
| `DRV-0C2-REQ-04` no invocation | Retain original callable identities without executing them | throwing implementation and invocation-count tests | Complete (`CTX-2D1`) |
| `DRV-0C2-REQ-05` reserved-capability coverage | Bind the four currently reachable reserved capabilities and preserve the wrapper capability as a future closed-union extension | positive/negative capability coverage and wrapper fail-closed evidence | Current union complete; executable wrapper proof remains `CTX-2D2` |
| `PW-1/PW-2` browser conformance | Controlled browser fixtures and execution evidence | browser suites | Deferred |

The DRV-0C1 core and its private-package integration satisfy the first seven
rows. `CTX-2D1` completes the bounded DRV-0C2 binding for every currently valid
plan step. Aggregate `DRV-0` completion remains withheld only because CTX-2
cannot yet produce an executable `activate-wrapper` plan step; that proof stays
with `CTX-2D2`. Browser conformance remains separate.
