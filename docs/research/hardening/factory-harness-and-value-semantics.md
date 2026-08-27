# RH-02: Factory Harness and Value Semantics

**Scoped status:** Decision-ready research complete; bounded mechanics
experiment passed; no production behavior implemented

**Decision owner:** Repository maintainer

**Recommendation:** Conditional go for approved static inputs and named
controlled factory-input scenarios in an explicit, process-isolated harness;
no-go for publishing structure or values derived only from meaningless
construction probes

## Executive conclusion

Real synchronous form factories such as
`IndexingFormConfig(options): FieldConfig[]` and
`NigoAddFormConfig(options): FieldConfig[]` can be invoked without duplicating
the form or mounting an application component. The safe boundary is narrower
than "make a plausible options object," however.

The recommended harness requires the application to classify every input
binding and every semantic use. It publishes declared structure only from
approved static/invariant inputs and publishes controlled structure only from
named, safe factory-input scenarios. Tagged construction probes may establish
that a factory can be called and may diagnose data flow, but probe-only output
is not publishable contract evidence. Inert capabilities may be captured but
must fail on execution. A taint-aware allowlist projector remains useful as
defense in depth, not as a complete provenance engine. Structural booleans and
enums are fixed invariants or values in named, business-valid variants. Model
and Formly `formState` remain separate scenario inputs.

Factory code is arbitrary trusted application code and can have import-time or
construction-time side effects. Each form/variant must therefore run in a fresh
child process with no credentials, no network, no writes, bounded time/memory
and output, a Node-safe entry point, and immediate allowlisted projection. A
worker thread is useful for termination and resource limits but is not a
sufficient isolation boundary because it shares the process and address space.
Node's permission model is defense in depth, not the sole sandbox.

The experiment established one risky data-flow seam. A representative
factory filtered an input array, interpolated a tagged scalar into presentation
and class strings, created an RxJS `Subject`, and captured a callback in an
`onDestroy` closure. The harness redacted the derived strings and filtered
probe options before declared extraction. Different probes produced the same
contract hash; no probe reached JSON; and no callback, subscription,
`TemplateRef` access, or lifecycle closure ran.

This is not a claim that automatic usage completeness or arbitrary primitive
taint is solved. JavaScript array cardinality, booleans, and numbers can affect
structure without retaining provenance. Explicit usage metadata is a trusted,
reviewed application declaration, not proof of complete data flow. A binding
without approved semantics or reviewed coverage may run only in non-publishing
probe mode; otherwise the harness fails closed.

## Decision packet

### Question

How may a trusted compiler invoke workplace Formly factories that require
large live-looking options objects while ensuring that:

- the real form factory remains the structural authority;
- application components and production services are not instantiated;
- callbacks, Observables, and view objects do not execute;
- construction scaffolds cannot become labels, option values, defaults,
  selectors, variants, or other claimed semantics; and
- static, dynamic, mixed, filtered, scenario-resolved, and unknown value
  domains remain distinguishable?

### Why this matters now

The workspace source API currently accepts only a zero-argument
`definition.create()` returning `{ fields, model?, formState? }`. Named
scenarios are validated but the workspace runner does not execute them. A
workplace adapter can wrap a real options-taking factory today, but without a
binding contract the wrapper is free to leak fake construction values or run
services. The Angular scenario task in the workspace plan needs this safety
contract before its execution boundary is implemented.

### Scope and prohibitions

In scope:

- input classification and a generic factory-contract API;
- construction probes, inert capabilities, usage bindings, and scalar
  redaction;
- declared, factory-input, model/form-state, resolved, and observed evidence;
- value-domain metadata and structural variants;
- fail-closed diagnostics, isolation, cleanup, and determinism;
- one bounded local experiment against the current extractor.

Out of scope:

- production code, public DTO changes, or workspace runner changes;
- changes to architecture, specifications, ADRs, or implementation plans;
- customer/workplace source, data, labels, credentials, or service calls;
- component mounting, browser observation, remote queries, or async settling;
- claiming support beyond the pinned Angular/Formly pair.

### Success and stop criteria

The research stops when it provides a concrete API and flow, demonstrates the
construction/taint seam, specifies fail-closed security and diagnostics, and
identifies an ordered implementation gate. It does not need to implement a
general JavaScript taint engine or the production child runner.

## Authority chain and stack

The governing repository order is:

1. `docs/architecture-overview.md`: declared, resolved, and observed evidence
   are separate; the compiler is build-time and allowlisted; network and real
   data are prohibited.
2. ADR 0002: Angular 20.3.29/Formly 6.1.8 may use a component-free controlled
   `FormlyFormBuilder`, but view/lifecycle behavior remains unknown.
3. ADR 0005 and `docs/v0.2-real-world-semantics-spec.md`: declared extraction
   executes nothing; trusted scenarios receive fresh fields and cloned
   model/form-state and project through the same allowlist.
4. ADR 0007 and the workspace implementation plan: typed project sources own
   factories and synthetic scenarios; Angular scenario execution remains a
   later task.
5. Current code: `packages/workspace/src/source.ts`,
   `packages/workspace/src/run-workspace.ts`, and
   `packages/compiler/src/extract-form.ts`.

`docs/research/angular-jit-config-loading.md` was requested but does not exist
at base commit `d4ffdb517d0d506ed7cd55074c4eac720a145f8b`.

Detected versions:

| Component | Version |
| --- | --- |
| Node.js | 22.22.1, Darwin arm64 |
| pnpm | 10.23.0 |
| TypeScript | 5.9.3 |
| Angular | 20.3.29 |
| Formly | 6.1.8 |
| RxJS | 7.8.2 |

## Evidence

### Documented facts

1. Formly's public `FormlyFormBuilder.build(field)` builds a supplied field,
   while `FormlyFieldConfig` includes functions, hooks, async validators,
   parsers, model/form/options links, and arbitrary props. A built field is not
   a serializable DTO. Source: <https://v6.formly.dev/docs/api/core/>.
2. Formly lifecycle hooks run at lifecycle events including initialization,
   view initialization, and destruction. Merely capturing a hook is not
   evidence that its behavior ran. Source:
   <https://v6.formly.dev/docs/guide/faq/#what-is-hooks-in-formly>.
3. An RxJS `Observable` starts its execution when `subscribe` is called, and a
   `Subject` is both an Observable and an Observer with `next`, `complete`, and
   `unsubscribe` behavior. Sources:
   <https://rxjs.dev/api/index/class/Observable> and
   <https://rxjs.dev/api/index/class/Subject>.
4. Angular `TemplateRef` represents an embedded template tied to declaration,
   data-binding, and injection context; its purpose is to create an embedded
   view. A meaningful `TemplateRef` cannot be fabricated by a component-free
   options harness. Source: <https://angular.dev/api/core/TemplateRef>.
5. The pinned Node 22.22.1 permission model exposes controls for filesystem,
   child-process, worker, addon, and WASI access. `node --help` on the pinned
   runtime exposes no network, FFI, or inspector permission flag. Its
   documentation also warns that filesystem permissions do not cover every
   alternative access path. Network denial and the stronger sandbox must
   therefore be supplied by the OS/container. Sources:
   <https://nodejs.org/download/release/latest-v22.x/docs/api/permissions.html>
   and <https://nodejs.org/download/release/latest-v22.x/docs/api/cli.html>.
6. Node child processes support an abort signal, timeout, bounded output, a
   supplied environment, and shell-free spawning. Worker threads support
   termination and V8 resource limits, but their limits do not cover all
   external memory. Sources:
   <https://nodejs.org/download/release/latest-v22.x/docs/api/child_process.html>
   and <https://nodejs.org/download/release/latest-v22.x/docs/api/worker_threads.html>.

### Repository observations

1. `FormContractDefinition.create` has no parameters. The workspace runner
   invokes it synchronously, validates the returned instance, and performs
   declared extraction only.
2. `FormContractScenario.create` is stored and validated but is not used by the
   workspace runner at this commit.
3. `compileFormContractScenario` clones only model and form-state, then invokes
   a fresh zero-argument field factory and calls the supplied builder once.
4. The current extractor already allowlists options and recognized resolved
   expression targets, reports hooks/parsers/functions/async-like values, and
   never serializes the whole field object.
5. Current realistic fixtures include static options, Observable options,
   function expressions, validators, hooks, parsers, model options, dynamic
   arrays, custom types, tables, repeaters, and named synthetic scenarios.
6. Existing value-domain metadata distinguishes complete static options,
   scenario-resolved options, unresolved function/string/async sources,
   booleans, and unknowns. It does not represent a known-local-plus-dynamic
   mixed domain or an opaque construction-time filter.

### Prototype observations

1. A factory accepted a typed options object and immediately executed
   `customNigoReasons.filter(reason => reason.active)` without a component,
   injector, builder, or service.
2. A unique tagged string survived direct interpolation into `className` and
   `props.description`, so ordinary substring scanning can detect direct and
   interpolated string flow.
3. The experiment's explicit, hand-written redaction list removed tagged
   option values produced by filtering/mapping before current extraction and
   replaced them with an unresolved dynamic source. It did not discover the
   target automatically.
4. A callback spy, an Observable facade whose `subscribe` would throw, and a
   `TemplateRef`-shaped proxy whose property access would throw were captured
   with zero calls/accesses. The throwing paths were not exercised.
5. The factory created a real RxJS `Subject` and captured it in an `onDestroy`
   closure. Declared extraction reported the hook but did not invoke it; the
   Subject remained untriggered.
6. Two different tag nonces and option payloads produced identical semantic
   `contentHash` values after redaction, and neither nonce appeared in the
   serialized contract.

### Inferences

1. Invoking an existing synchronous factory is feasible; duplicating its field
   tree is unnecessary.
2. Tagged strings are a useful leak detector, not a complete provenance
   system. Arithmetic, boolean logic, destructuring, copying, closure capture,
   and native-library transformations defeat automatic dynamic lineage.
3. Explicit usage bindings are application-declared semantic authority; they
   do not prove their own completeness. Taint, perturbation, and source
   scaffolding can find some omissions but cannot turn an unreviewed usage map
   into evidence.
4. A fake `TemplateRef` or service is unsafe because successful method access
   would pretend that view or application behavior exists. Capture-only opaque
   tokens must throw on dereference.
5. Process exit is the only generic cleanup for factory-created Subjects and
   closures that the harness does not own. Invoking arbitrary Formly lifecycle
   hooks for cleanup would execute precisely the behavior this phase excludes.
6. Scenario output can be complete for the named controlled input only when a
   finite, closed synthetic provider protocol proves completion. Otherwise it
   is a partial scenario snapshot. A filtered dynamic domain cannot become
   complete merely because one scaffold row survived construction.

### Unknowns

1. Workplace factory import graphs may execute DI, environment reads, timers,
   or services before the exported factory is called.
2. The frequency and shape of immediately called option-provider functions is
   not measured.
3. Required `TemplateRef` parameters may be captured harmlessly or may alter
   structure based on identity/method access; the latter must fail.
4. Some factories may use numbers, dates, or booleans in both arithmetic and
   structure. No general lossless primitive taint is available in JavaScript.
5. Angular custom extensions may subscribe, schedule tasks, or use component
   context during the builder phase; only the pinned synthetic core setup has
   been proven.
6. Node permission flags plus a child process have not been proven against a
   real workplace import graph. An OS sandbox/container remains an
   implementation gate for higher-risk repositories.
7. A staged-file manifest can exclude known paths but cannot prove compiled
   bytes contain no embedded secret/customer literal. Source/build inputs need
   their own data-governance review, and staging must run credential-free.

## Proposed generic API

Factory-input scenarios and Formly model/form-state scenarios are separate
types with separate identities and hashes. Construction probes use a third API
that cannot publish artifacts:

```ts
type FactoryFieldConfig = FormlyFieldConfig & ContractFormlyFieldConfig;
type FactoryBindingKind =
  | 'known'
  | 'fixed'
  | 'structural'
  | 'controlled-collection'
  | 'captured-callback'
  | 'construction-function'
  | 'inert-observable'
  | 'unavailable-template-ref'
  | 'opaque';
type SemanticFactoryTarget =
  | 'options'
  | 'defaultValue'
  | 'presentation'
  | 'state'
  | 'locator';
type FactoryDomainUnknownReason =
  | 'dynamic-source'
  | 'opaque-filter'
  | 'scenario-not-settled'
  | 'unsupported-value';

interface FactoryKnownOption extends ContractOption {
  readonly semanticRole?: 'other';
}

declare const harnessValueBrand: unique symbol;
declare const harnessAbsentBrand: unique symbol;
interface HarnessValue<T> {
  readonly [harnessValueBrand]: T;
}
interface HarnessAbsent {
  readonly [harnessAbsentBrand]: true;
}
type BoundOption<T> =
  | HarnessValue<T>
  | (undefined extends T ? HarnessAbsent : never);
type BoundOptions<TOptions extends object> = {
  readonly [Key in keyof TOptions]-?: BoundOption<TOptions[Key]>;
};

interface ArtifactSafeValue<T extends JsonValue> {
  readonly value: T;
  readonly approval: {
    readonly owner: string;
    readonly reason: string;
    readonly version: number;
    readonly scope: 'safe-if-present-anywhere-in-output-artifact';
  };
}

type FactoryInputUse =
  | { kind: 'construction-only' }
  | {
      kind: 'semantic';
      target: { nodeId: string; property: SemanticFactoryTarget };
      projection:
        | { kind: 'value-domain'; domainBindingId: string }
        | {
            kind: 'suppress-as-unknown';
            reason: FactoryDomainUnknownReason;
          }
        | { kind: 'allow-artifact-safe-scenario-value' }
        | {
            kind: 'finite-provider-domain';
            protocolId: string;
            projectorId: string;
          };
    }
  | {
      kind: 'captured-runtime';
      target?: { nodeId: string; property: string };
      reason: string;
    }
  | { kind: 'structural'; variantDimension: string };

interface BindingDeclaration {
  readonly id: string;
  readonly uses: readonly FactoryInputUse[];
  readonly review: {
    readonly status: 'reviewed';
    readonly owner: string;
    readonly version: number;
  };
}

type CapabilityIdentity =
  | { readonly kind: 'unique' }
  | { readonly kind: 'shared'; readonly groupId: string };

interface CapabilityHarness {
  capturedCallback<TArgs extends readonly unknown[], TResult = never>(
    options: {
      declaration: BindingDeclaration;
      identity: CapabilityIdentity;
    },
  ): HarnessValue<(...args: TArgs) => TResult>;
  inertObservable<T>(
    options: {
      declaration: BindingDeclaration;
      identity: CapabilityIdentity;
    },
  ): HarnessValue<Observable<T>>;
  unavailableTemplateRef<T>(
    options: {
      declaration: BindingDeclaration;
      identity: CapabilityIdentity;
    },
  ): HarnessValue<TemplateRef<T>>;
  opaque<T extends object>(options: {
    declaration: BindingDeclaration;
    identity: CapabilityIdentity;
  }): HarnessValue<T>;
}

interface DeclaredFactoryHarness extends CapabilityHarness {
  absent(declaration: BindingDeclaration): HarnessAbsent;
  presentUndefined(
    declaration: BindingDeclaration,
  ): HarnessValue<undefined>;
  known<T extends JsonValue>(
    declaration: BindingDeclaration,
    approved: ArtifactSafeValue<T>,
  ): HarnessValue<T>;
  fixed<T extends JsonValue>(options: {
    declaration: BindingDeclaration;
    invariantKey: string;
    approved: ArtifactSafeValue<T>;
  }): HarnessValue<T>;
  structural<T extends string | number | boolean>(options: {
    declaration: BindingDeclaration;
    variantDimension: string;
    approved: ArtifactSafeValue<T>;
  }): HarnessValue<T>;
}

interface ControlledFactoryHarness extends DeclaredFactoryHarness {
  scenarioValue<T extends JsonValue>(
    declaration: BindingDeclaration,
    approved: ArtifactSafeValue<T>,
  ): HarnessValue<T>;
  controlledCollection<T extends JsonValue>(options: {
    declaration: BindingDeclaration;
    domain: FactoryValueDomain; // single authority for provider/known values
    scenarioRows: ArtifactSafeValue<readonly T[]>;
    mutability: 'frozen' | 'fresh-mutable-copy';
  }): HarnessValue<T[]>;
  constantConstructionFunction<
    TArgs extends readonly unknown[],
    TResult extends JsonValue,
  >(options: {
    declaration: BindingDeclaration;
    maxCalls: number;
    result: ArtifactSafeValue<TResult>;
  }): HarnessValue<(...args: TArgs) => TResult>;
  finiteObservable<T extends JsonValue>(options: {
    declaration: BindingDeclaration;
    protocol: FiniteProviderProtocol<T>;
    projectorId: string;
  }): HarnessValue<Observable<T>>;
}

interface NonPublishingProbeHarness extends CapabilityHarness {
  probeString(declaration: BindingDeclaration): HarnessValue<string>;
  probeCollection<T>(options: {
    declaration: BindingDeclaration;
    constructionRows: readonly T[];
  }): HarnessValue<T[]>;
}

interface FactoryVariant {
  readonly id: string;
  readonly description: string;
  readonly assignment: Readonly<Record<string, string | number | boolean>>;
  readonly invariants?: Readonly<Record<string, JsonValue>>;
}

interface DeclaredFactoryInput<TOptions extends object> {
  readonly id: string;
  readonly variantId: string;
  readonly createOptions: (
    harness: DeclaredFactoryHarness,
  ) => BoundOptions<TOptions>;
}

interface FactoryInputScenario<TOptions extends object> {
  readonly id: string;
  readonly variantId: string;
  readonly createOptions: (
    harness: ControlledFactoryHarness,
  ) => BoundOptions<TOptions>;
}

interface FactoryProbe<TOptions extends object> {
  readonly id: string;
  readonly variantId: string;
  readonly createOptions: (
    harness: NonPublishingProbeHarness,
  ) => BoundOptions<TOptions>;
}

interface ModelFormStateScenario {
  readonly id: string;
  readonly model?: Readonly<Record<string, JsonValue>>;
  readonly formState?: Readonly<Record<string, JsonValue>>;
}

interface ResolvedScenarioComposition {
  readonly id: string;
  readonly factoryInput:
    | { readonly kind: 'declared'; readonly id: string }
    | { readonly kind: 'controlled'; readonly id: string };
  readonly modelFormStateScenarioId: string;
}

interface FiniteProviderProtocol<T extends JsonValue> {
  readonly id: string;
  readonly emissions: ArtifactSafeValue<readonly T[]>;
  readonly completion: 'synchronous-complete';
  readonly maxEmissions: number;
  readonly domainDerivation: 'project-all-emissions';
}

interface ModuleExportReference {
  readonly moduleSpecifier: string;
  readonly exportName: string;
  readonly contentHash: string;
}

type SyntheticProviderBinding =
  | {
      readonly token: ModuleExportReference;
      readonly useValue: ArtifactSafeValue<JsonValue>;
    }
  | {
      readonly token: ModuleExportReference;
      readonly useProtocolId: string;
    };

interface AngularScenarioHost {
  readonly identity: { readonly id: string; readonly version: number };
  readonly imports: readonly ModuleExportReference[];
  readonly syntheticProviders: readonly SyntheticProviderBinding[];
  readonly forbiddenProviderTokenIds: readonly string[];
  readonly settlingProtocolIds: readonly string[];
  readonly teardown: {
    readonly destroyTestBed: true;
    readonly requireNoPendingTasks: true;
  };
}

interface FormFactoryContract<TOptions extends object> {
  readonly id: string;
  readonly createFields: (options: TOptions) => FactoryFieldConfig[];
  readonly variants: readonly FactoryVariant[];
  readonly declaredInputs?: readonly DeclaredFactoryInput<TOptions>[];
  readonly factoryInputScenarios?: readonly FactoryInputScenario<TOptions>[];
  readonly probes?: readonly FactoryProbe<TOptions>[];
  readonly modelScenarios?: readonly ModelFormStateScenario[];
  readonly resolvedScenarios?: readonly ResolvedScenarioComposition[];
  readonly angularScenarioHost?: AngularScenarioHost;
}

declare function defineFormFactoryContract<TOptions extends object>(
  contract: FormFactoryContract<TOptions>,
): FormFactoryContract<TOptions>;
declare function reviewedBinding(
  options: {
    readonly id: string;
    readonly owner: string;
    readonly version: number;
    readonly uses: readonly FactoryInputUse[];
  },
): BindingDeclaration;
declare function artifactSafe<T extends JsonValue>(options: {
  readonly value: T;
  readonly owner: string;
  readonly reason: string;
  readonly version: number;
}): ArtifactSafeValue<T>;
```

Representative controlled factory-input scenario:

```ts
const binding = (id: string, uses: readonly FactoryInputUse[]) =>
  reviewedBinding({
    id,
    owner: 'claims-forms',
    version: 1,
    uses,
  });
const safe = <T extends JsonValue>(value: T, reason: string) =>
  artifactSafe({
    value,
    owner: 'claims-forms',
    reason,
    version: 1,
  });

export const nigoContract = defineFormFactoryContract<NigoOptions>({
  id: 'claims.nigo-add',
  createFields: NigoAddFormConfig,
  variants: [
    {
      id: 'standard',
      description: 'Standard NIGO form structure.',
      assignment: { compact: false },
    },
  ],
  factoryInputScenarios: [
    {
      id: 'safe-active-reasons',
      variantId: 'standard',
      createOptions: (h) => ({
        customNigoReasons: h.controlledCollection({
          declaration: binding('customNigoReasons', [
            {
              kind: 'semantic',
              target: {
                nodeId: 'claims.nigo-add::path:s_reason',
                property: 'options',
              },
              projection: {
                kind: 'value-domain',
                domainBindingId: 'customNigoReasons',
              },
            },
          ]),
          domain: {
            kind: 'mixed',
            knownValues: [
              { label: 'Other', value: 'Other', semanticRole: 'other' },
            ],
            dynamicSource: { providerId: 'claims.nigo-reasons' },
            completeness: 'partial',
            evidence: 'declared',
          },
          scenarioRows: safe(
            [
              {
                id: 'SYNTHETIC-ACTIVE',
                label: 'Synthetic active',
                active: true,
              },
            ],
            'Named safe scenario row; acceptable anywhere in this artifact.',
          ),
          mutability: 'fresh-mutable-copy',
        }),
        close: h.capturedCallback(
          {
            declaration: binding('close', [
              {
                kind: 'captured-runtime',
                reason: 'Application lifecycle callback.',
              },
            ]),
            identity: { kind: 'unique' },
          },
        ),
        results$: h.inertObservable(
          {
            declaration: binding('results', [
              {
                kind: 'captured-runtime',
                reason: 'Runtime query result.',
              },
            ]),
            identity: { kind: 'unique' },
          },
        ),
        rowTemplate: h.unavailableTemplateRef(
          {
            declaration: binding('rowTemplate', [
              {
                kind: 'captured-runtime',
                reason: 'Requires an Angular view.',
              },
            ]),
            identity: { kind: 'unique' },
          },
        ),
        compact: h.structural({
          declaration: binding('compact', [
            { kind: 'structural', variantDimension: 'compact' },
          ]),
          variantDimension: 'compact',
          approved: safe(false, 'Standard layout invariant.'),
        }),
      }),
    },
  ],
});
```

`semanticRole: 'other'` is application declaration, never inferred from the
string `Other`. If a localized label is not an approved static value, retain
only the safe value/role or mark the whole known option unresolved according to
the eventual DTO.

### Binding classification

| Binding | Materialization | May execute? | Semantic rule |
| --- | --- | ---: | --- |
| Known JSON value | Exact value approved as safe/meaningful if copied anywhere in this scenario artifact | No | May enter scenario output; usage metadata still governs domain claims |
| Probe string | Per-run nonce-tagged string in non-publishing mode | No | No contract artifact may be emitted from the run |
| Structural scalar | Exact variant value | No | Affects only the named variant; never called a probe |
| Controlled collection | Approved safe scenario rows; frozen or fresh mutable copy | Array operations only | Produces controlled scenario structure; raw rows never prove a global domain |
| Captured callback/hook | Proxy function; calls and structural introspection traps throw | No | Truthiness/`typeof` reflect production presence; capture-only use is reviewed metadata |
| Construction function | Call-counted constant function returning one artifact-safe JSON result | Only explicitly allowed calls | Result is controlled scenario input, not global domain evidence |
| Observable | Inert proxy; `subscribe`, `pipe`, symbol/prototype inspection, and other behavior throw | No | Dynamic/unknown until a finite controlled protocol materializes values |
| `TemplateRef` | Capture-only proxy; any property/method access throws | No | View-dependent unknown |
| `any`/service-shaped object | Opaque capture-only proxy; primitives forbidden | No | Cannot be structural or semantic evidence |

Binding declarations and immutable inputs are deeply frozen. A factory that
uses in-place `sort`, `reverse`, `splice`, or row annotations may request one
fresh mutable copy for a named controlled scenario; that mutation cannot alter
caller data or upgrade evidence. Accessors, symbols, sparse arrays,
unregistered functions, thenables, subscribe-like objects, Angular objects,
and other exotic values in `createOptions()` fail validation unless they came
from a harness constructor. A declared-input factory that requires mutable or
unknown dynamic scaffolding is unsupported as declared evidence and moves to a
controlled scenario or non-publishing probe.

Every top-level options property is a branded `HarnessValue<T>` until the
isolated runner materializes the complete `TOptions`; raw literals cannot
satisfy `BoundOptions<TOptions>`. Publishable JSON inputs additionally carry an
owned approval saying they are safe and meaningful if copied anywhere in that
output artifact. This avoids relying on primitive provenance for privacy or
"fake value" exclusion. Usage mappings still control value-domain and other
semantic relationships, and their completeness remains reviewed rather than
inferred.

Optional properties are also explicit. `h.absent(...)` causes the runner to
omit the own property, while `h.presentUndefined(...)` creates an own property
whose value is `undefined`; neither can be substituted for the other. Presence
is a reviewed structural use. `fixed({ invariantKey, ... })` must resolve to the
same canonical value in the selected variant's `invariants`; `structural`
likewise must resolve to its dimension in `assignment`.

Capture-only capabilities are proxies. Application, construct, property,
prototype, key-enumeration, and method traps fail. JavaScript truthiness,
strict comparison to `undefined`, and `typeof` cannot be trapped; publishing
therefore requires the application review to state that capability presence
and broad type are production-equivalent invariants. Factories that inspect
more than presence/type are unsupported until refactored or modeled by an
explicit safe construction protocol. Capability equality/aliasing is modeled
by `CapabilityIdentity`: the runner reuses one proxy for a shared group and a
distinct proxy for each unique declaration. Comparisons to application-only
sentinels or unmodeled Map/Set membership remain unsupported.

Scalar/presentation redaction is target-specific rather than implied by value
domains. `suppress-as-unknown` drops the entire declared target (for example an
interpolated description or locator) and emits an unknown diagnostic;
`allow-artifact-safe-scenario-value` retains scenario-specific content;
`value-domain` and `finite-provider-domain` are reserved for option/value-domain
targets. Contradictory projection kinds for one target are invalid.

### Scalars and taint

String probes include an unpredictable per-process marker. Non-publishing probe
mode checks all contract-bearing string/JSON targets for direct or interpolated
markers and reports the affected property. A future projector may exercise the
same check as defense in depth, but detection does not authorize publishing
the remaining structure. Explicit usage declarations are reviewed metadata;
the runtime can validate their targets and conflicts but cannot prove that no
primitive/cardinality flow was omitted.

The following are prohibited:

- fake numeric primitives used in arithmetic;
- fake booleans used as "neutral" defaults;
- boxed primitives presented to code requiring normal primitive semantics;
- replacing a marker substring and retaining the surrounding presentation;
- inferring that an unmarked value is safe.

A required scalar must be one of:

1. an approved known static value;
2. a named structural variant value;
3. an approved value in a named controlled factory-input scenario;
4. a tagged string probe in a run that emits no artifact; or
5. unsupported, producing `FACTORY_SCALAR_UNSAFE` and no artifact.

## Compile flow

1. **Inventory without execution.** Discover a stable form ID and descriptor.
   Require a Node-safe secondary entry point that does not import components.
2. **Stage an execution image.** Build/copy only the compiled descriptor,
   reviewed metadata, runtime loader, and exact dependency closure into an
   ephemeral directory. Exclude the checkout, `.git`, `.env*`, home/config
   files, fixtures, generated data, source maps, and unrelated sources. Scan
   the manifest before execution. Produce the image in the same credential-free
   OS sandbox: config loaders, bundler plugins, package scripts, and Angular
   compilation are executable boundaries too. Dynamic/computed imports and
   undeclared assets fail staging rather than widening read access.
3. **Spawn a fresh child per form/variant/scenario.** Use an argument array,
   never a shell; strip credentials and inherited Node options; set an empty
   temporary working directory, `TZ=UTC`, explicit locale, fixed resource
   limits, structured IPC only, and ignored child stdout/stderr.
4. **Apply containment.** Deny network in the OS sandbox/container. Use Node
   permissions to deny writes, child processes, workers, addons, and WASI and
   to allow reads only from the staged image. The pinned runtime has no Node
   network permission flag, so do not claim one.
5. **Import the descriptor inside containment.** Import-time failure or blocked
   access maps to a stable parent-generated diagnostic. Never forward child
   exception text, stack, stdout, stderr, or raw values to an artifact.
6. **Select an evidence mode.** Declared mode accepts only reviewed
   static/invariant inputs. Controlled mode accepts named safe synthetic
   factory-input scenarios. Probe mode may use tags/scaffolds but cannot emit a
   contract artifact.
7. **Materialize one named input.** Build the options object only through the
   mode-specific harness and validate the resulting graph. Freeze immutable
   inputs or create one disposable mutable scenario copy as declared.
8. **Invoke and project in one synchronous turn.** The factory call, graph
   inspection, node-ID computation, allowlisted projection, deep freeze of the
   inert DTO, and initiation of structured IPC occur without `await` or a
   return to the event loop. Promise/Observable returns, re-entrancy,
   capability execution, and out-of-budget work fail closed. Queued
   microtasks/timers cannot mutate the already frozen projection; their mere
   creation is still a side-effect diagnostic.
9. **Validate the returned field array inside containment.** Require a dense
   fresh array of expected field records. JavaScript cannot reliably prove an
   object is not a `Proxy`; reflection itself may invoke proxy traps. Treat all
   such inspection as continued trusted application execution under the same
   timeout. Capture safe intrinsic references before importing the factory and
   reject accessor descriptors when actually observed.
10. **Build structure with correct evidence.** Compute stable node IDs, then
    validate each reviewed usage target and reject conflicting projections.
    Declared inputs yield declared structure; factory-input scenarios yield
    controlled scenario structure. Probe output stops here with diagnostics.
11. **Project with binding overrides.** Suppress raw scenario values at
    reviewed semantic targets and emit the binding's single domain/unknown
    metadata authority. The standard extractor still reports unrelated opaque
    hooks, parsers, validators, and functions.
12. **Optionally compile controlled Formly resolutions.** In a separate
    Angular-enabled child, create a new options object, model, formState,
    fields, builder, and TestBed for each scenario. The runner constructs the
    TestBed from the serializable `AngularScenarioHost` manifest; it does not
    call an arbitrary exported host callback. Only content-hashed imports,
    artifact-safe `useValue` providers, registered finite protocols, and
    allowlisted provider tokens are allowed; forbidden tokens fail lookup.
    A domain is scenario-complete only when a
    finite closed provider protocol and settling condition succeed; otherwise
    it is partial. Project immediately and destroy the process.
13. **Check repeatability and declared determinism.** Re-run publishable inputs
    in another fresh process and require equal canonical hashes. Record the
    staged-image and environment-policy hashes. Forbid ambient clock, random,
    host identity, unordered filesystem, and undeclared environment inputs by
    source/policy review and guarded runtime APIs where feasible. Two equal
    runs are observed repeatability, not proof of determinism. Probe mode uses
    a different nonce only to test leak detection and still emits no artifact.
14. **Publish only inert DTOs.** Keep declared variants and each controlled or resolved
    scenario as distinct artifacts with input identities and evidence. The MCP
    path never imports the factory contract.

### Evidence separation

| View | Inputs | What it may claim | What it may not claim |
| --- | --- | --- | --- |
| Declared structure | Approved static/invariant factory input plus inert capture-only capabilities | Field/tree structure for that named variant; reviewed usage/domain declarations | Unknown provider-dependent structure, lifecycle outcome, browser parity |
| Controlled factory result | Approved synthetic factory-input scenario | Factory output under the named input | Global domain completeness |
| Formly resolved scenario | Fresh factory inputs plus model/formState and configured builder | Allowlisted post-build state for that exact scenario | Unvisited branches, mounted lifecycle, remote completion |
| Non-publishing probe | Meaningless tagged construction scaffolds | Feasibility and leak diagnostics only | Any semantic contract artifact |
| Observed runtime | Browser visit and captured state | Rendered facts for visited state | Declared universe or unvisited branches |

Factory-input scenarios and model/form-state scenarios have different IDs and
hash inputs. They may be composed by a resolved scenario, but they must not be
flattened into one untyped `options` bag in metadata.

## Value-domain design

The current schema should not be changed by this research task. A future
version should use a discriminated union similar to:

```ts
type FactoryValueDomain =
  | {
      kind: 'static';
      values: readonly FactoryKnownOption[];
      completeness: 'complete';
      evidence: 'declared';
    }
  | {
      kind: 'dynamic';
      dynamicSource: { providerId: string };
      completeness: 'unknown';
      evidence: 'declared';
    }
  | {
      kind: 'mixed';
      knownValues: readonly FactoryKnownOption[];
      dynamicSource: { providerId: string };
      completeness: 'partial';
      evidence: 'declared';
    }
  | {
      kind: 'filtered';
      input: { bindingId: string };
      filter: { kind: 'declared'; filterId: string } | { kind: 'opaque' };
      knowledge:
        | { kind: 'complete'; values: readonly FactoryKnownOption[] }
        | { kind: 'partial'; knownValues: readonly FactoryKnownOption[] }
        | { kind: 'unknown' };
      evidence: 'declared';
    }
  | {
      kind: 'scenario';
      scenarioEvidence:
        | { kind: 'controlled'; factoryInputScenarioId: string }
        | { kind: 'resolved'; resolvedScenarioId: string };
      values: readonly FactoryKnownOption[];
      completeness: 'scenario-complete';
      settling: { kind: 'finite-closed'; providerProtocolId: string };
    }
  | {
      kind: 'scenario';
      scenarioEvidence:
        | { kind: 'controlled'; factoryInputScenarioId: string }
        | { kind: 'resolved'; resolvedScenarioId: string };
      values: readonly FactoryKnownOption[];
      completeness: 'partial';
      settling: {
        kind: 'snapshot';
        reason: 'not-settled' | 'open-source';
      };
    }
  | {
      kind: 'unknown';
      reason: FactoryDomainUnknownReason;
      evidence: 'declared' | 'resolved';
    };
```

Rules:

1. Static means the approved source is finite and globally complete, not merely
   that the factory received an array.
2. Dynamic records a stable provider identity and no values.
3. Mixed records only approved known local values plus an unknown dynamic
   remainder. It is necessarily partial.
4. Filtered describes provenance. An opaque predicate over a dynamic source is
   unknown even if construction probes survive it. A declared filter over a
   complete static source may be complete after deterministic evaluation.
5. Scenario values are scenario-complete only when a finite closed synthetic
   provider protocol proves that all scenario emissions were consumed and a
   bounded settling condition completed. A one-pass builder result, open
   Observable, timeout, or immediate snapshot is partial.
   Scenario/protocol IDs must resolve to the current contract's registered
   scenario and the protocol actually materialized by its harness; unchecked
   string references are invalid. For `finite-provider-domain`, output values
   are computed through the registered allowlisted `projectorId` from the
   protocol emissions actually consumed; the author cannot separately repeat
   or override the scenario values.
6. Defaults, current model values, probe rows, table data, translated labels,
   and sentinel-like spelling never expand a domain automatically.

## Structural variants without boolean explosion

A factory input requires a named variant when changing it can alter any
contract-bearing structure: field existence/order/key/type, group/array shape,
wrappers, semantic control kind, required interaction parts, or a finite static
domain. A flag that only changes a separately redacted presentation value does
not require a structural variant.

Each `FactoryVariant.assignment` is a complete, canonical dimension-to-value
map and may include reviewed fixed invariants. Runtime `structural` calls must
match the selected assignment exactly; missing, extra, duplicate, or conflicting
dimensions are errors. Variant identity hashes the canonical assignment and
invariants before `createOptions()` executes.

Do not generate the Cartesian product of booleans. Use this policy:

1. Mark project invariants as `fixed` and compile them once.
2. Define a baseline variant for the ordinary business state.
3. Add named variants only for supported, business-valid structural states
   needed by a journey, release gate, or explicit coverage requirement.
4. Group correlated flags in one named variant; do not expose them as
   independent dimensions when the application never supports arbitrary
   combinations.
5. Reject a structural delta actually observed across configured controlled
   inputs with `FACTORY_VARIANT_REQUIRED`. This diagnostic cannot discover an
   omitted flag or untested higher-order combination.
6. If the required variant set is still large or data-driven, declare the
   structure partially known and defer coverage to controlled runtime evidence.

Pairwise generation is not semantic proof: arbitrary factory conditions can
depend on higher-order combinations. Named variants are an authoring contract,
not a combinatorial testing algorithm. The reviewed variant declaration is a
trust boundary; coverage remains unknown beyond configured business-valid
states.

## Side-effect and determinism threat model

| Threat | Required control | Failure result |
| --- | --- | --- |
| Import-time service/network activity | Node-safe entry point; empty credentials; OS network deny; staged dependency image | Abort variant; stable blocked-side-effect diagnostic |
| Files/customer data | Build and execute staged dependency-only image inside credential-free OS sandbox; no checkout/home/config/secrets mounts; no writes | Abort; discard child text output |
| Callback called during construction | Throwing captured callback; separately declared bounded construction function | Abort with binding ID and call phase |
| Observable subscription | `subscribe` throws; controlled scenario sources use approved synthetic data only | Abort; no retry or fallback to live source |
| `TemplateRef`/Angular view access | Capture-only throwing proxy; no component/view creation | Abort and require browser/hosted variant |
| DI/JIT imports | Separate Angular scenario host with explicit imports/providers | Declared extraction remains available; resolved scenario fails |
| Timers/CPU/infinite loop | Child timeout plus OS CPU budget; hard kill fallback | No artifact for variant |
| Microtask/timer mutates returned fields after factory return | Factory inspection/projection/freeze/IPC initiation stays in one synchronous turn; queued work never becomes evidence | Side-effect diagnostic; child discarded after frozen DTO send |
| Memory/output exhaustion | Process/V8 memory limit, bounded structured IPC, ignored child stdout/stderr | No artifact; stable resource diagnostic |
| Spawn/worker/native escape | Node denies child, worker, addon, and WASI; OS sandbox denies remaining process/native/inspector/network surface | Abort |
| Global/module cache mutation | Fresh process per form/variant/scenario | Process discarded |
| Subscription/Subject leak | Do not run lifecycle hooks; terminate child; explicit disposer only for harness-owned resources | Process discarded; leak diagnostic if it prevents quiescence |
| Nondeterminism (`Date`, random, locale, env, host/filesystem) | Forbid ambient inputs by reviewed policy/guards; fixed declared context; record image/environment hashes; repeat fresh runs | Observed mismatch is fatal; equal runs do not prove determinism |
| Sensitive exception/log content | Stable parent-generated codes; ignored child text streams; schema-limited IPC | No raw error/value in artifact |
| Shared runner compromise | Never execute in MCP; child cannot write artifacts directly | Parent validates and writes inert result |

The parent process owns output paths and canonical serialization. The child
returns a bounded, validated inert projection over IPC; it never receives an
artifact path to write.

Isolation protects the parent/workspace from accidental or hostile side
effects; it does not make malicious factory output semantically trustworthy.
The factory and projector necessarily share one child because live Formly
trees contain functions, proxies, closures, and cycles that cannot cross an
inert IPC boundary before projection. Parent-side exact DTO validation catches
malformed output, not lies from trusted application code. The application
factory and reviewed binding metadata remain trusted build inputs.

## Explicit diagnostics

All diagnostics include phase, project/source/form/variant IDs where known,
binding ID and safe source path where relevant, but no raw binding value,
callback arguments, exception text, customer path, or environment value.

| Code | Default severity | Meaning |
| --- | --- | --- |
| `FACTORY_DESCRIPTOR_INVALID` | error | Descriptor or options graph violates the exact schema |
| `FACTORY_STAGE_INVALID` | error | Dependency-only execution image contains a prohibited or undeclared file |
| `FACTORY_IMPORT_FAILED` | error | Node-safe descriptor could not be imported |
| `FACTORY_SIDE_EFFECT_BLOCKED` | error | Network/file/process/worker/addon action was denied |
| `FACTORY_TIMEOUT` | error | Import, factory, or projection exceeded its budget |
| `FACTORY_RESOURCE_LIMIT` | error | Memory, output, IPC, or handle budget was exceeded |
| `FACTORY_RETURN_INVALID` | error | Factory did not synchronously return a fresh dense field array |
| `FACTORY_CALLBACK_INVOKED` | error | Capture-only callback ran during import/construction/build |
| `FACTORY_OBSERVABLE_SUBSCRIBED` | error | Inert Observable was subscribed |
| `FACTORY_TEMPLATE_REF_DEREFERENCED` | error | Capture-only view token was read/called |
| `FACTORY_BINDING_UNCLASSIFIED` | error | Options contain a value not created/approved by the harness |
| `FACTORY_USAGE_COVERAGE_UNREVIEWED` | error | A publishable binding lacks an owned/versioned usage review |
| `FACTORY_BINDING_USAGE_UNDECLARED` | error | Taint/identity analysis actually detected flow to an undeclared semantic target; absence of this code is not coverage proof |
| `FACTORY_BINDING_TARGET_MISSING` | error | Declared node/property target was absent in the variant |
| `FACTORY_BINDING_TARGET_CONFLICT` | error | Multiple declarations disagree about one target/domain authority |
| `FACTORY_SCALAR_UNSAFE` | error | A required scalar cannot be safely known, varied, or tagged |
| `FACTORY_PROBE_TAINT_OBSERVED` | info | Non-publishing probe reached a named structural or semantic path |
| `FACTORY_TAINT_IN_PUBLISHABLE_OUTPUT` | error | Probe marker reached a run that was incorrectly marked publishable |
| `FACTORY_VARIANT_REQUIRED` | error | An undeclared input changes contract-bearing structure |
| `FACTORY_RUNTIME_BEHAVIOR_OPAQUE` | warning | Callback/hook/Observable/view/service is captured for later execution |
| `FACTORY_SCENARIO_PARTIAL` | warning | Scenario materialization is not globally complete |
| `FACTORY_NONDETERMINISTIC` | error | Repeated fresh-process canonical projections observably differ; absence is not proof |
| `FACTORY_CLEANUP_FAILED` | error | Harness-owned cleanup or Angular host destruction failed |

Any error produces no contract artifact for that variant/scenario. Policy may
escalate warnings, but it must not downgrade errors that protect data origin,
execution containment, identity, or determinism.

## Alternatives and failure modes

| Approach | Decision | Reason/failure mode |
| --- | --- | --- |
| Duplicate the form in a harness | Reject | Guaranteed semantic drift and ownership duplication |
| Instantiate the application component | Reject | Executes DI, lifecycle, subscriptions, services, view logic, and possibly customer state |
| Call production option/services with test credentials | Reject | Network/data exposure and nondeterminism; a test tenant is still real runtime evidence |
| Fill all inputs with `undefined`, empty arrays, no-ops, and `false` | Reject | Factories call array methods and branch/interpolate immediately; empty values fabricate structure/domains |
| Proxy or tag every value automatically | Reject as authority | Primitive provenance and closures are not reliably traceable; native behavior changes under proxies |
| Static TypeScript analysis only | Retain as optional scaffold | Useful for symbol/source indexing, not authoritative execution or closure/DI semantics |
| In-process or worker-only execution | Reject for production harness | Shared globals/module cache/process authority; weaker cleanup and containment |
| Fresh child + approved inputs/scenarios + reviewed usages + allowlisted projection | Recommend conditionally | Preserves real factory execution and honest evidence; reviewed usage is a trust boundary and probes cannot publish |

Important failure cases:

- If a factory invokes a capture-only callback or subscribes during
  construction, do not return a neutral value. Fail and require a separately
  reviewed bounded construction binding or refactor.
- Any run containing a meaningless probe is non-publishing, whether or not a
  marker is observed in the result. Replace it with an approved named
  factory-input scenario or mark the form unsupported.
- If `TemplateRef` is dereferenced, declared factory compilation cannot model
  it. Require a hosted/browser evidence path.
- If an imported module performs side effects before descriptor validation,
  containment must block them. Validation after import is not a sandbox.
- If a dynamic array is filtered, sorted, mapped, or concatenated, scaffold
  output proves only that the factory completed. Domain metadata comes from the
  binding declaration or controlled scenario, never the observed probe array.
- If two publishable repetitions differ, do not pick one output or weaken the
  hash. Emit `FACTORY_NONDETERMINISTIC`. Probe-run differences remain local
  diagnostics and never become an artifact.
- If a reviewed usage map omits primitive/cardinality flow, runtime validation
  may not discover the omission. Treat usage review like explicit effect/profile
  metadata: owned, versioned, diff-reviewed, and later checked by controlled or
  browser conformance rather than advertised as inferred fact.

## Bounded experiment

### Environment and retained method

- Base commit: `d4ffdb517d0d506ed7cd55074c4eac720a145f8b`
- Node: `v22.22.1`
- pnpm: `10.23.0`
- Platform: `darwin arm64`, Darwin `25.5.0`
- Angular/Formly/RxJS: `20.3.29` / `6.1.8` / `7.8.2`
- Temporary test SHA-256:
  `40ffe7ff22ce27f552d3aaa1348731b012edd7673759722a6415efadeefa7b3c`
- Temporary path: `scripts/research/factory-harness/factory-harness.test.ts`
  (deleted after recording results so this research document is the only
  retained artifact, as required)

The deletion requirement means the original command is intentionally no longer
re-runnable from this checkout. The hash identifies the executed temporary
source but cannot reconstruct it. The excerpt and method below retain the
decision-bearing mechanics, not the full 240-line test. A production
implementation must add retained focused tests rather than treating this
research run as a regression suite.

The 240-line Vitest experiment defined a typed `NigoAddFormConfig` analogue.
Its decision-bearing core was:

```ts
function NigoAddFormConfig(options: WorkplaceFactoryOptions) {
  const destroyed = new Subject<void>();
  const activeReasons = options.customNigoReasons.filter(
    (reason) => reason.active,
  );

  return [{
    key: 'reason',
    type: 'select',
    className: `reason-${options.presentationSuffix}`,
    props: {
      label: 'Reason',
      description: `Choose ${options.presentationSuffix}`,
      options: activeReasons.map(({ id, label }) => ({ value: id, label })),
      resultStream: options.resultStream,
      rowTemplate: options.rowTemplate,
    },
    hooks: {
      onDestroy: () => {
        destroyed.next();
        destroyed.complete();
        options.onClosed('destroyed');
      },
    },
  }];
}
```

The input contained one active and one inactive frozen probe row, a tagged
presentation scalar, a callback spy, a throwing `subscribe` facade, and a
throwing view-token proxy. The test asserted the raw field contained probes,
then used an explicit hand-written sanitizer for the known
class/description/option targets, marked options dynamic, and passed the result
to the current `extractFormContract`. This is a seam experiment, not the
proposed binding-aware projector or proof that undeclared flows can be found.

It repeated the factory with a different nonce and different probe option data.
Both projections had the same `contentHash`. It also asserted zero lifecycle,
callback, subscription, and template-access counts and verified the Subject was
not stopped.

### Commands and exact results

```text
pnpm exec vitest run scripts/research/factory-harness/factory-harness.test.ts
  failed before test load: Command "vitest" not found

pnpm install --frozen-lockfile --offline
  succeeded: 1029 packages reused/linked, 0 downloaded
  warning: fixture workspace CLI bins target dist files not yet built
  warning: dependency build scripts remained ignored

pnpm exec vitest run scripts/research/factory-harness/factory-harness.test.ts
  failed before test collection: root research path could not resolve rxjs

temporary test edit (no command): resolve RxJS from the synthetic fixture's
installed dependency using createRequire(new URL(
  '../../../fixtures/synthetic-form/package.json', import.meta.url))

pnpm exec vitest run scripts/research/factory-harness/factory-harness.test.ts
  Test Files  1 passed (1)
  Tests       1 passed (1)
  Duration    270ms

pnpm exec vitest run scripts/research/factory-harness/factory-harness.test.ts
  Test Files  1 passed (1)
  Tests       1 passed (1)
  Duration    257ms
```

The first two failures are environment/harness-resolution evidence, not product
failures. The final run contains the two-nonce repeatability assertion.

### What the experiment proves and does not prove

Proves in this environment:

- synchronous function invocation and construction-time array filtering work;
- direct/interpolated string probes can be detected and removed;
- current declared extraction does not invoke a lifecycle closure;
- the example factory did not invoke the callback, subscribe, dereference the
  template proxy, or execute the lifecycle closure;
- redacted probe differences need not affect the semantic hash.

Does not prove:

- automatic provenance for booleans, numbers, closures, or arbitrary library
  transformations;
- automatic target discovery, usage-map completeness, structural-flow
  detection, or conflicting-declaration rejection;
- the proposed throwing behavior for callback/Observable/TemplateRef misuse;
- child-process containment, dependency staging, or IPC scrubbing;
- security of Node permissions against untrusted code;
- isolation of Angular TestBed/JIT/custom extensions;
- async option settling, cleanup after sanctioned subscriptions, or browser
  parity;
- compatibility with the workplace factories named in the request.
- reproduction of the deleted temporary test from its hash/excerpt alone.

## Decision and implementation consequences

### Go/no-go

**Go** for a production design that publishes only approved static/invariant
inputs or named safe factory-input scenarios and requires reviewed binding
classification/usages, named structural variants, a staged dependency-only
image, OS-contained fresh child processes, immediate allowlisted projection,
two-run repeatability plus a reviewed determinism policy, and fail-closed
diagnostics.

**No-go** for a generic auto-filler that invents empty arrays, false booleans,
no-op callbacks, fake templates, or plausible records and then treats factory
output as real contract structure or values. Construction probes are permitted
only for non-publishing feasibility/diagnostic runs.

**No-go** for adding factory execution directly to the current workspace/MCP
process or for running production providers/services to resolve inputs.

### Ordered implementation breakdown

1. **Approve concepts and ownership.** Decide that factory inputs, usage
   bindings, structural variants, model/form-state scenarios, and observed
   evidence are separate contracts; usage completeness is reviewed application
   metadata; and probe runs cannot publish. Approve stable diagnostic names.
2. **Specify DTOs before runtime code.** Add versioned internal/public types
   for binding declarations, uses, variants, scenario identity, mixed/filtered
   value domains, redaction evidence, and generation metadata. Extend the
   architecture/spec/ADR only after maintainer approval.
3. **Implement pure binding validation/materialization.** Exact own-data
   schemas, freeze immutable data, create isolated mutable scenario copies,
   call-counted/throwing capabilities,
   target validation, and safe diagnostic formatting. Add negative tests for
   accessors, sparse arrays, exotic values, primitive misuse, and leaks.
4. **Make projection binding-aware.** Apply semantic overrides at computed node
   IDs, suppress controlled scenario values at reviewed targets, reject
   conflicting authorities, block any publishable probe run, and ensure current
   hook/async diagnostics remain. Never sanitize the live tree into a
   misleading shape before identity computation.
5. **Build the staging and child runner.** Produce and audit a dependency-only
   execution image; use shell-free spawn, ignored child text streams, sanitized
   env, schema-limited IPC, time/memory limits, OS network/process containment,
   Node deny rules, parent-owned writes, hard-kill cleanup, and
   two-fresh-process repeatability and ambient-input guards. Prove blocked
   network/file/spawn, import-time
   effects, infinite loop, OOM/output, and sensitive-error cases.
6. **Integrate declared workspace sources.** Add an options-factory definition
   alongside, not in place of, the current zero-argument definition. Preserve
   existing source ordering, exact validation, provenance, and failure
   semantics.
7. **Add controlled Angular scenarios separately.** Explicit application
   imports/providers, fresh TestBed and builder, approved synthetic provider
   values, model/formState clones, finite-closed settling gates for
   scenario-complete domains, destroy/exit, and no component mounting by
   default.
8. **Add realistic fixtures.** Cover a large nested options object; immediate
   filter/sort/map; known `Other` plus dynamic remainder; called pure provider;
   forbidden callback/subscription/view access; structural flags; hooks; mixed
   and filtered domains; nondeterminism; and diagnostics without raw values.
9. **Gate workplace pilot.** Run in a credential-free checkout with an OS
   network sandbox. Measure binding/variant authoring burden and unsupported
   factory proportion before claiming scalability.
10. **Defer browser conformance.** Only a later observed evidence layer may
    verify mounted lifecycle, templates, remote readiness, and rendered values.

The next implementation gate is items 1–2: approve the separation and schema
shape. Runtime work should not begin by extending the current
`definition.create()` signature ad hoc.

## Traceability

| Acceptance | Decision/evidence | Verification | Status |
| --- | --- | --- | --- |
| RH02-A1: Concrete API/flow, alternatives, failures | Proposed generic API, compile flow, alternatives/failure modes | Static reconciliation against current source/compiler APIs | Met |
| RH02-A2: Functions, filtered arrays, interpolated scalars, lifecycle closure; no scaffold output | Bounded experiment | Final two Vitest runs; two-nonce equal hash; zero execution counters | Met within bounded scope |
| RH02-A3: Security/determinism rules and diagnostics | Threat model and diagnostic table | Source-backed design review; production containment not implemented | Design met; runtime proof deferred |
| RH02-A4: Recommendation, confidence, unknowns, ordered implementation | Go/no-go, unknowns, confidence, breakdown | Maintainer decision remains | Met |
| RH02-NG1: No production/shared architecture/spec/plan changes | Only this research artifact retained | `git status`, `git diff --check`, explicit temporary-path check | Met |

## Confidence and limitations

| Claim | Confidence | Reason |
| --- | ---: | --- |
| Real synchronous factories can be reused without components | 0.95 | Direct experiment and existing zero-argument factory corpus |
| Approved inputs plus reviewed target overrides can prevent raw scenario values from becoming domains | 0.78 | Ownership is auditable; usage completeness and projector remain unproven |
| Tagged strings catch direct/interpolated leaks | 0.95 | Two-nonce experiment |
| Automatic generic primitive taint would be safe | 0.15 | JavaScript primitive provenance is lost |
| Staged OS-contained process-per-input is the correct generic cleanup boundary | 0.88 | Arbitrary factory-created closures/resources are otherwise unowned; containment prototype remains |
| Proposed domain union represents requested knowledge states | 0.90 | Each state is explicit and non-overlapping; schema review remains |
| Node permission model alone is sufficient isolation | 0.20 | Official limitations and shared host risks require OS defense |
| Workplace corpus is covered with acceptable authoring cost | 0.50 | No workplace factory was executed or measured |

The largest remaining risks are import-time side effects, authoring burden for
large option interfaces, structural variants hidden behind unclassified
primitives, custom Angular extension behavior, and cleanup/settling of any
future sanctioned async scenario.

Evidence that would change the recommendation:

- a workplace sample showing that most factories require live DI/services
  before returning any structure would narrow the go to static indexing or a
  hosted browser capture;
- an OS-contained prototype that cannot load Angular/Formly dependencies under
  practical read permissions would require a build-stage sandbox/container
  rather than the proposed Node child flags;
- unacceptable per-form usage/variant metadata burden would favor refactoring
  factories into pure structural inputs plus separately declared provider
  contracts;
- a safe, auditable language/runtime provenance mechanism could reduce explicit
  usage declarations, but should not change evidence separation.

## Doubt register and adversarial reconciliation

The non-trivial claim to challenge is:

> Explicit usage bindings plus process isolation and taint-aware allowlisted
> projection are sufficient to invoke real factory structure without allowing
> construction scaffolds or live behavior to become semantic evidence.

One fresh-context adversarial review was run against only this artifact and the
RH-02 contract. Cross-model review was skipped because this was a delegated,
non-interactive research unit.

| Finding | Classification | Reconciliation |
| --- | --- | --- |
| Array cardinality/booleans can alter structure without taint, so usage completeness is unenforceable | Valid + actionable | Probe mode now cannot publish; declared inputs require approved static/invariant values; controlled inputs are named scenario evidence; usage review is explicitly a trust boundary, not inferred proof |
| Proposed API had missing/incoherent types and an unreachable binding handle | Valid + actionable | Defined all referenced vocabulary, removed the handle, split mode-specific harnesses, supplied required callback reasons, and made domain ownership singular |
| Factory, model, and form-state scenarios were combined | Valid + actionable | Added independent `FactoryInputScenario`, `ModelFormStateScenario`, and reference-only `ResolvedScenarioComposition` identities |
| Pinned Node lacks network/FFI/inspector permission flags | Valid + actionable | Corrected the documented fact from pinned `node --help`; OS sandbox owns network and remaining containment |
| Read permission over a checkout exposes unrelated secrets/data | Valid + actionable | Added a manifest-audited dependency-only staging image and ignored child text streams; the checkout is not mounted/readable |
| Scenario-complete overclaimed open/one-pass Observable results | Valid + actionable | Split scenario domain branches; only a finite closed synthetic provider plus successful settling is scenario-complete; snapshots remain partial |
| Experiment manually redacted known targets and did not test the proposed projector/isolation | Valid + actionable | Renamed it a bounded mechanics/seam experiment, enumerated unproven surfaces, and reduced confidence/recommendation scope |
| Only-document-retained and command reproducibility claims were premature | Valid + actionable | Deleted the temporary test; recorded its final hash, the RxJS-resolution edit, every attempted command, and results |
| Structural API lacked dimension/fixed representation and diagnostic was too strong | Valid + actionable | Added `fixed` and dimensioned `structural`; limited `FACTORY_VARIANT_REQUIRED` to observed configured deltas and documented unknown combination coverage |
| Deep freeze excludes in-place sort/reverse/splice/annotation | Valid + actionable | Added one fresh mutable controlled-scenario copy; mutable/unknown inputs cannot produce declared evidence |
| Collection and semantic target duplicated provider/known-value authority | Valid + actionable | The controlled collection owns one domain; semantic usages reference it by binding ID; conflicts are errors |

The revised artifact then received a second fresh-context issues-only pass.

| Second-cycle finding | Classification | Reconciliation |
| --- | --- | --- |
| Raw publishable primitives could bypass classification and flow anywhere | Valid + actionable | `createOptions()` now returns branded `BoundOptions<T>` handles; only the runner materializes `TOptions`; every publishable JSON value requires explicit approval as safe/meaningful anywhere in the scenario artifact |
| Review helper could not supply owner/version | Valid + actionable | `reviewedBinding` now requires explicit ID, owner, version, and uses |
| Probe API/declared input identity/composition were unreachable or incomplete | Valid + actionable | Added named `FactoryProbe`, declared-input IDs, and composition references that distinguish declared from controlled factory inputs |
| Construction function/opaque generic bypassed classification | Valid + actionable | Replaced arbitrary function results with artifact-safe constant results; restricted opaque values to objects; every constructor returns a branded handle |
| Controlled domain evidence and finite settling protocol were missing | Valid + actionable | Scenario domains identify controlled versus resolved evidence; added registered finite provider and Angular host descriptors; unchecked IDs are invalid |
| Factory can mutate shared child state or return proxies that run traps during projection | Valid trade-off | Projection remains in the contained child because live fields cannot cross IPC; inspection is treated as trusted application execution; parent validation protects host/schema, not semantic truth against malicious code |
| Staging itself executes code and manifests cannot prove bytes contain no data | Valid + actionable | Staging now runs in the same credential-free OS sandbox, rejects undeclared dynamic assets/imports, and explicitly retains embedded-data governance as an unknown |
| Two matching runs do not prove determinism | Valid + actionable | Renamed the gate observed repeatability; ambient inputs require reviewed prohibition/guards and environment/image hashes; absence of mismatch is not proof |
| Variants lacked explicit assignments | Valid + actionable | Variants now carry canonical complete assignments/invariants, validated against structural calls and hashed pre-execution |
| Capability truthiness/type/identity can alter structure without method calls | Valid trade-off | Proxies trap inspectable behavior; untrappable presence/`typeof` must be reviewed as production-equivalent invariants; deeper inspection is unsupported |
| Deleted experiment is not reproducible and its sanitizer assertion is circular | Valid trade-off | Deletion is required by the delivery boundary; the artifact now says the command cannot rerun, retains only the mechanics/hash/results, and limits the observation to a hand-written seam test |
| Queued microtasks/timers can mutate fields after synchronous return | Valid + actionable | Factory inspection, projection, DTO freeze, and IPC initiation must remain in one synchronous turn; queued work is never evidence and causes a side-effect diagnostic |

The third and final bounded cycle found eight remaining specification gaps.

| Third-cycle finding | Classification | Reconciliation |
| --- | --- | --- |
| Semantic projection only represented value domains, not scalar suppression | Valid + actionable | Added target-specific `suppress-as-unknown`, artifact-safe scenario retention, finite-provider, and value-domain projections with conflict rejection |
| Optional property absence versus own `undefined` was unrepresentable | Valid + actionable | `BoundOptions` now requires an explicit absent handle or present value for every key; `absent` omits the property and `presentUndefined` preserves own-property presence |
| `fixed` was disconnected from hashed variant invariants | Valid + actionable | `fixed` now names an invariant key and must match the selected variant's canonical invariant value |
| Finite Observable domain values could conflict with protocol emissions | Valid + actionable | Finite-provider domain output is derived only from emissions actually consumed through one registered allowlisted projector; no separately authored scenario values override it |
| Capability equality/aliasing can change structure without traps | Valid + actionable | Added explicit unique/shared identity groups; unmodeled external-sentinel and Map/Set membership remain unsupported |
| Angular host pointer did not constrain providers/imports/settling/teardown | Valid + actionable | Replaced arbitrary host callback with a serializable manifest of content-hashed imports, artifact-safe values, registered protocols, forbidden tokens, settling IDs, and mandatory teardown |
| Experiment did not exercise the throwing capability paths | Valid + actionable | Narrowed the observation to zero use in the example and explicitly lists throwing misuse behavior as unproven |
| Retention/final verification was still pending | Valid + actionable | Closed only after the final commands/status recorded below |

The reconciled claim is deliberately smaller:

> A staged, isolated harness can publish exact artifact-safe declared inputs
> and named artifact-safe controlled scenarios while keeping reviewed
> capture-only behavior inert.
> Meaningless construction probes establish feasibility only and produce no
> semantic artifact. Reviewed usage/variant metadata remains application-owned
> authority whose completeness is not automatically proven.

The doubt stop condition was the three-cycle bound. All substantive findings
from each cycle were classified as actionable or explicit trust-boundary
trade-offs and reconciled above. No fourth cycle was run.

## Final verification record

```text
pnpm check:docs
  Documentation checks passed for 57 files.

git diff --check
  exit 0; no output

git diff --no-index --check /dev/null \
  docs/research/hardening/factory-harness-and-value-semantics.md
  exit 1 because the untracked file differs from /dev/null;
  no --check diagnostics (whitespace check passed)

test ! -e scripts/research/factory-harness/factory-harness.test.ts
  exit 0

git status --short --branch
  ## HEAD (no branch)
  ?? docs/research/hardening/

git rev-parse HEAD
  d4ffdb517d0d506ed7cd55074c4eac720a145f8b
```

The status above was captured before packaging this sole retained document into
the delivery branch/commit. No production, architecture, specification, plan,
fixture, or retained experiment file changed.

## Source index

Repository sources:

- `AGENTS.md`
- `.codex/steering/repository-steering.md`
- `.codex/steering/testing-quality-gates-steering.md`
- `docs/architecture-overview.md`
- `docs/decisions/0002-controlled-formly-builder-boundary.md`
- `docs/decisions/0005-trusted-scenario-resolution.md`
- `docs/decisions/0007-distributed-workspace-discovery.md`
- `docs/v0.2-real-world-semantics-spec.md`
- `docs/v0.4-e2e-authoring-metadata-spec.md`
- `docs/workplace-pilot.md`
- `docs/planning/workspace-discovery/implementation-plan.md`
- `docs/research/form-discovery-dx.md`
- `docs/research/v0.4-cross-field-effects.md`
- `packages/workspace/src/source.ts`
- `packages/workspace/src/run-workspace.ts`
- `packages/compiler/src/extract-form.ts`
- `packages/compiler/src/extract-form.test.ts`
- `fixtures/synthetic-form/src/compatibility.ts`
- `fixtures/synthetic-form/src/compatibility.test.ts`
- `apps/formly-test-app/src/app/forms/operations/operations-forms.ts`
- `apps/formly-test-app/src/app/forms/edge-cases/edge-case-forms.ts`
- realistic Angular monorepo source/fragment fixtures under
  `fixtures/angular-monorepo/`

Official sources:

- Formly v6 core API: <https://v6.formly.dev/docs/api/core/>
- Formly v6 hooks FAQ:
  <https://v6.formly.dev/docs/guide/faq/#what-is-hooks-in-formly>
- Angular `TemplateRef`: <https://angular.dev/api/core/TemplateRef>
- Angular partial-Ivy/JIT guidance:
  <https://angular.dev/tools/libraries/creating-libraries#consuming-partial-ivy-code-outside-the-angular-cli>
- Angular TestBed services:
  <https://angular.dev/guide/testing/services#testing-services-with-the-testbed>
- RxJS Observable: <https://rxjs.dev/api/index/class/Observable>
- RxJS Subject: <https://rxjs.dev/api/index/class/Subject>
- Node 22 permissions:
  <https://nodejs.org/download/release/latest-v22.x/docs/api/permissions.html>
- Node 22 CLI permissions:
  <https://nodejs.org/download/release/latest-v22.x/docs/api/cli.html>
- Node 22 child processes:
  <https://nodejs.org/download/release/latest-v22.x/docs/api/child_process.html>
- Node 22 worker threads:
  <https://nodejs.org/download/release/latest-v22.x/docs/api/worker_threads.html>
