# RH-02: Factory Harness and Value Semantics

**Scoped status:** Decision-ready candidate after remediating all findings from
three bounded independent-review instances, one adversarial doubt pass, one
Claude Opus cross-model review, one original experiment, and four follow-up
design spikes. The review-instance limit is exhausted, so the final corrections
are self-verified rather than independently re-verdict-ed; no production
behavior implemented

**Decision owner:** Repository maintainer

**Recommendation:** Go for contract/type and inert projector work; no-go for
application factory execution until an inert registration sidecar and a
runner-owned violation ledger pass the retained negative-control gate below.
No-go for publishing controlled scenarios under v0.4; they remain internal
until a versioned schema adds controlled node evidence.
No-go for Angular/Formly-resolved evidence under RH-02; that remains a separate
Task 8 evidence/security mode.

## Executive conclusion

Real synchronous form factories such as
`IndexingFormConfig(options): FieldConfig[]` and
`NigoAddFormConfig(options): FieldConfig[]` can be invoked without duplicating
the form or mounting an application component. The safe boundary is narrower
than "make a plausible options object," however.

The recommended harness requires the application to classify every supported
top-level input binding and every semantic use. It publishes v0.4 structure
only from approved static/invariant declared inputs. Named, safe controlled
factory-input scenarios may produce internal compiler candidates and
diagnostics, but v0.4 has no `controlled` node-evidence kind, so they cannot
publish a `FormContract` until a versioned schema revision adds that evidence.
Tagged construction probes may establish
that a factory can be called and may diagnose data flow, but probe-only output
is not publishable contract evidence. Inert capabilities may be captured but
must record a violation before failing on execution. A taint-aware allowlist
projector remains useful as
defense in depth, not as a complete provenance engine. Structural booleans and
enums are fixed invariants or values in named, business-valid variants. Model
and Formly `formState` remain separate scenario inputs.

Factory code is arbitrary, reviewed application code and can have import-time or
construction-time side effects. Each form/variant must therefore load only
inside a fresh child in the selected `oci-rootless-v1` profile with no
credentials, no network, no host writes, bounded time/memory and output, a
Node-safe staged entry point, and immediate allowlisted projection. A
worker thread is useful for termination and resource limits but is not a
sufficient isolation boundary because it shares the process and address space.
Node's permission model is defense in depth, not the sole sandbox. Factory
registrations therefore come from a code-free JSON sidecar; the TypeScript
project config is not evaluated on the factory-execution path. A runner-owned
preload records supported capability, scheduling, ambient-input, and Node API
violations before throwing so application `try/catch` cannot erase them.
OS containment still owns effect prevention; absence of a JavaScript-ledger
entry is not proof that arbitrary hostile code attempted no syscall.

The experiment established one risky data-flow seam. A representative
factory filtered an input array, interpolated a tagged scalar into presentation
and class strings, created an RxJS `Subject`, and captured a callback in an
`onDestroy` closure. The harness redacted the derived strings and filtered
probe options before declared extraction. Different probes produced the same
contract hash; no probe reached JSON; and no callback, subscription,
`TemplateRef` access, or lifecycle closure ran.

Three follow-up spikes narrowed the remaining design gates. On the pinned
Angular/Formly pair, importing one NgModule through another made a transitive
environment initializer and provider factory executable. A separate
module-free builder seam applied Formly type defaults while a rejecting
injector exposed one explicit synthetic `useValue` token and rejected an
application `providedIn: 'root'` service. A paired-selection projector then
replaced the exact `options` and `value-domain` slots from one knowledge record;
two different filtered scaffold arrays produced identical semantic output,
the scaffold strings disappeared, and the captured lifecycle/callback counts
remained zero. The provider spike also showed why RH-02 must not publish
Angular/Formly-resolved evidence: Formly resolution can execute application
expressions, validators, extensions, and captured closures even when DI itself
is restricted. These are bounded observations, not production conformance.

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

- field/tree shape is factory-derived while semantic/value authority remains
  explicit reviewed metadata;
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
- bounded local experiments against the current extractor and pinned
  Angular/Formly provider/builder seams.

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
7. Docker's OCI container controls include a `none` network driver, read-only
   root filesystems, dropped Linux capabilities, security options, PID and
   memory limits, user namespaces/non-root users, and tmpfs mounts. Rootless
   mode runs the daemon and containers without root privileges. These are
   capabilities to verify, not evidence that any particular daemon is safely
   configured. Sources: <https://docs.docker.com/engine/network/drivers/none/>,
   <https://docs.docker.com/engine/containers/run/>, and
   <https://docs.docker.com/engine/security/rootless/>.
8. Angular's public `importProvidersFrom` API collects providers from supplied
   NgModules and standalone components, including transitively imported ones.
   Angular's module injector is a flattened view of providers reachable through
   recursive NgModule imports, and environment initializers execute when an
   environment injector is constructed. A module/content hash is therefore not
   a provider allowlist. Sources:
   <https://angular.dev/api/core/importProvidersFrom>,
   <https://angular.dev/guide/di/hierarchical-dependency-injection>, and
   <https://angular.dev/api/core/provideEnvironmentInitializer>.
9. Angular `InjectionToken` identity is object identity, not its description;
   supplying an explicit value for the exact imported token can avoid its
   default root factory, while an unrecognized token must not be delegated to a
   root injector. Source: <https://angular.dev/api/core/InjectionToken>.

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
7. On the research host, Docker 29.7.2 exposes `--network`, `--read-only`,
   `--cap-drop`, `--security-opt`, `--pids-limit`, `--memory`, `--tmpfs`,
   `--user`, and `--userns`. Node 22.22.1 exposes deny-by-default permission
   controls for filesystem, child process, worker, addon, and WASI access but
   still no network-denial permission. This establishes command-surface
   feasibility only; no containment conformance run was performed.
8. The current extractor computes `options` independently before deriving
   `valueDomain`; a binding-aware override must therefore address both exact
   slots or raw scaffold options remain projectable.
9. ADR 0007's canonical package-import direction is `angular -> workspace`:
   the optional Angular package consumes workspace-owned source contracts,
   while workspace has no Angular dependency. Tasks 7B and 8 place provider
   helpers and project-source scenario compilation in that Angular package. No
   runtime plugin indirection is required for this direction.

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
7. A follow-up Angular 20.3.29 spike imported `FeatureModule ->
   ProductionModule` through `importProvidersFrom`. Injector construction ran
   one transitive environment initializer; resolving the production token ran
   one transitive provider factory.
8. In that spike, a non-root environment injector did not auto-provide an
   imported `providedIn: 'root'` application service. A rejecting `Injector`
   facade returned one explicit synthetic value, rejected the root service
   even when a fallback value was supplied, and was installed into a directly
   constructed Formly 6.1.8 builder. The builder applied an `input` type
   default and exposed only the rejecting facade through `field.options`.
   The spike used the pinned Formly provider layout to initialize core config;
   that is a version-specific feasibility seam, not an approved production API.
9. A paired-selection spike exercised a factory that filtered an array,
   interpolated filtered cardinality and a boolean, and captured a callback in
   a lifecycle closure. The projector required coordinated exact `options` and
   `value-domain` uses referencing one knowledge ID. Runs with two scaffold
   nonces were equal, retained only the approved `Other` option/domain fact,
   contained no scaffold/interpolated strings, and made zero lifecycle or
   callback calls. Removing either exact use failed validation.

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
7. An arbitrary Angular NgModule import is incompatible with the stronger
   no-production-provider invariant: Angular intentionally flattens transitive
   providers and may run initializers before any requested field is built.
   The safe host must exclude application NgModules/providers rather than try
   to denylist their tokens after registration.
8. `options` and `valueDomain` remain separate public slots but can share one
   reviewed knowledge authority. The runtime must validate and apply their two
   exact projections as an indivisible pair; atomic metadata need not imply a
   coarse multi-slot suppression operation.

### Unknowns

1. Workplace factory import graphs may execute DI, environment reads, timers,
   or services before the exported factory is called.
2. The frequency and shape of immediately called option-provider functions is
   not measured.
3. Required `TemplateRef` parameters may be captured harmlessly or may alter
   structure based on identity/method access; the latter must fail.
4. Some factories may use numbers, dates, or booleans in both arithmetic and
   structure. No general lossless primitive taint is available in JavaScript.
5. Angular custom extensions may subscribe, schedule tasks, capture production
   services, or use component context during the builder phase. The restricted
   host deliberately excludes application NgModules, custom extensions,
   validators, provider factories/classes, and component mounting; forms that
   need them remain unsupported rather than weakening the provider guarantee.
6. The selected rootless OCI containment profile has not been proven against a
   real workplace import graph or CI/desktop runtime. Its conformance probe
   remains a mandatory pre-execution gate.
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
  | 'selection-collection'
  | 'captured-callback'
  | 'construction-function'
  | 'inert-observable'
  | 'unavailable-template-ref'
  | 'opaque';
type FactoryLocatorTarget =
  | {
      readonly candidateId: string;
      readonly target: string;
      readonly strategy: 'testId';
      readonly attribute: string;
    }
  | {
      readonly candidateId: string;
      readonly target: string;
      readonly strategy: 'role' | 'label' | 'placeholder' | 'domId';
    };
type SemanticFactoryTarget =
  | { readonly kind: 'options' }
  | { readonly kind: 'value-domain' }
  | { readonly kind: 'default-value' }
  | {
      readonly kind: 'presentation';
      readonly property: 'label' | 'description' | 'placeholder';
    }
  | {
      readonly kind: 'state';
      readonly property: 'hidden' | 'readonly' | 'disabled';
    }
  | { readonly kind: 'locator'; readonly locator: FactoryLocatorTarget };
type FactoryDomainUnknownReason =
  | 'dynamic-source'
  | 'opaque-filter'
  | 'scenario-not-settled'
  | 'unsupported-value';

interface FactoryDynamicSource {
  readonly providerId: string;
  readonly sourceKind: 'string' | 'function' | 'async';
}

interface FactoryKnownOption extends ContractOption {
  readonly semanticRole?: 'other';
}

declare const harnessValueBrand: unique symbol;
declare const harnessAbsentBrand: unique symbol;
interface HarnessValue<T, TOptionKey extends string = string> {
  readonly [harnessValueBrand]: {
    readonly value: T;
    readonly optionKey: TOptionKey;
  };
}
interface HarnessAbsent<TOptionKey extends string = string> {
  readonly [harnessAbsentBrand]: {
    readonly optionKey: TOptionKey;
  };
}
type StringKey<T> = Extract<keyof T, string>;
type OptionalKey<T extends object> = {
  [Key in StringKey<T>]-?: {} extends Pick<T, Key> ? Key : never;
}[StringKey<T>];
type RequiredKey<T extends object> = Exclude<StringKey<T>, OptionalKey<T>>;
type PresentUndefinedKey<T extends object> = {
  [Key in StringKey<T>]-?: undefined extends Required<T>[Key] ? Key : never;
}[StringKey<T>];
type PresentOptionValue<
  TOptions extends object,
  TKey extends StringKey<TOptions>,
> = Required<TOptions>[TKey];
type BoundOptions<TOptions extends object> = {
  readonly [Key in StringKey<TOptions>]-?:
    | HarnessValue<PresentOptionValue<TOptions, Key>, Key>
    | (Key extends OptionalKey<TOptions> ? HarnessAbsent<Key> : never);
};

interface FactoryOptionShape<TOptions extends object> {
  readonly required: readonly RequiredKey<TOptions>[];
  readonly optional: readonly OptionalKey<TOptions>[];
  readonly presentUndefined: readonly PresentUndefinedKey<TOptions>[];
}

interface ArtifactSafeValue<T extends JsonValue> {
  readonly value: T;
  readonly approval: {
    readonly owner: string;
    readonly reason: string;
    readonly version: number;
    readonly scope: 'safe-if-present-anywhere-in-output-artifact';
  };
}

type NonCollectionSemanticFactoryTarget = Exclude<
  SemanticFactoryTarget,
  { readonly kind: 'options' } | { readonly kind: 'value-domain' }
>;

interface FactoryNodeTarget<TSlot extends SemanticFactoryTarget> {
  readonly nodeId: string;
  readonly expectedIdentity:
    | { readonly kind: 'keyed'; readonly key: JsonValue }
    | {
        readonly kind: 'keyless';
        readonly sourceOrdinalPath: readonly number[];
      };
  readonly expectedType?: string;
  readonly slot: TSlot;
}

type FactoryInputUse =
  | { kind: 'construction-only' }
  | {
      kind: 'semantic';
      target: FactoryNodeTarget<{ readonly kind: 'options' }>;
      projection: {
        kind: 'selection-options';
        selectionKnowledgeId: string;
      };
    }
  | {
      kind: 'semantic';
      target: FactoryNodeTarget<{ readonly kind: 'value-domain' }>;
      projection:
        | { kind: 'value-domain'; domainBindingId: string }
        | {
            kind: 'selection-value-domain';
            selectionKnowledgeId: string;
          }
        | {
            kind: 'suppress-as-unknown';
            reason: FactoryDomainUnknownReason;
          }
        | { kind: 'allow-artifact-safe-scenario-value' };
    }
  | {
      kind: 'semantic';
      target: FactoryNodeTarget<NonCollectionSemanticFactoryTarget>;
      projection:
        | {
            kind: 'suppress-as-unknown';
            reason: FactoryDomainUnknownReason;
          }
        | { kind: 'allow-artifact-safe-scenario-value' };
    }
  | {
      kind: 'captured-runtime';
      target?: FactoryNodeTarget<SemanticFactoryTarget>;
      reason: string;
    }
  | { kind: 'structural'; variantDimension: string };

interface BindingDeclaration<TOptionKey extends string = string> {
  readonly id: string;
  readonly optionKey: TOptionKey;
  readonly uses: readonly FactoryInputUse[];
  readonly review: {
    readonly status: 'reviewed';
    readonly owner: string;
    readonly version: number;
  };
}

type SelectionOptionsUse<TKnowledgeId extends string> = {
  readonly kind: 'semantic';
  readonly target: FactoryNodeTarget<{ readonly kind: 'options' }>;
  readonly projection: {
    readonly kind: 'selection-options';
    readonly selectionKnowledgeId: TKnowledgeId;
  };
};

type SelectionValueDomainUse<TKnowledgeId extends string> = {
  readonly kind: 'semantic';
  readonly target: FactoryNodeTarget<{
    readonly kind: 'value-domain';
  }>;
  readonly projection: {
    readonly kind: 'selection-value-domain';
    readonly selectionKnowledgeId: TKnowledgeId;
  };
};

interface SelectionBindingDeclaration<
  TOptionKey extends string,
  TKnowledgeId extends string,
> extends Omit<BindingDeclaration<TOptionKey>, 'uses'> {
  readonly uses: readonly [
    SelectionOptionsUse<TKnowledgeId>,
    SelectionValueDomainUse<TKnowledgeId>,
  ];
}

type CapabilityIdentity =
  | { readonly kind: 'unique' }
  | { readonly kind: 'shared'; readonly groupId: string };

interface CapabilityHarness {
  capturedCallback<
    TOptionKey extends string,
    TArgs extends readonly unknown[],
    TResult = never,
  >(
    options: {
      declaration: BindingDeclaration<TOptionKey>;
      identity: CapabilityIdentity;
    },
  ): HarnessValue<(...args: TArgs) => TResult, TOptionKey>;
  inertObservable<
    TObservable extends object,
    TOptionKey extends string,
  >(
    options: {
      declaration: BindingDeclaration<TOptionKey>;
      identity: CapabilityIdentity;
    },
  ): HarnessValue<TObservable, TOptionKey>;
  unavailableTemplateRef<
    TTemplateRef extends object,
    TOptionKey extends string,
  >(
    options: {
      declaration: BindingDeclaration<TOptionKey>;
      identity: CapabilityIdentity;
    },
  ): HarnessValue<TTemplateRef, TOptionKey>;
  opaque<T extends object, TOptionKey extends string>(options: {
    declaration: BindingDeclaration<TOptionKey>;
    identity: CapabilityIdentity;
  }): HarnessValue<T, TOptionKey>;
}

interface DeclaredFactoryHarness extends CapabilityHarness {
  absent<TOptionKey extends string>(
    declaration: BindingDeclaration<TOptionKey>,
  ): HarnessAbsent<TOptionKey>;
  presentUndefined<TOptionKey extends string>(
    declaration: BindingDeclaration<TOptionKey>,
  ): HarnessValue<undefined, TOptionKey>;
  known<T extends JsonValue, TOptionKey extends string>(
    declaration: BindingDeclaration<TOptionKey>,
    approved: ArtifactSafeValue<T>,
  ): HarnessValue<T, TOptionKey>;
  fixed<T extends JsonValue, TOptionKey extends string>(options: {
    declaration: BindingDeclaration<TOptionKey>;
    invariantKey: string;
    approved: ArtifactSafeValue<T>;
  }): HarnessValue<T, TOptionKey>;
  structural<
    T extends string | number | boolean,
    TOptionKey extends string,
  >(options: {
    declaration: BindingDeclaration<TOptionKey>;
    variantDimension: string;
    approved: ArtifactSafeValue<T>;
  }): HarnessValue<T, TOptionKey>;
  declaredSelectionCollection<
    const TOptionKey extends string,
    const TKnowledgeId extends string,
    T extends JsonValue,
  >(options: {
    declaration: SelectionBindingDeclaration<TOptionKey, TKnowledgeId>;
    knowledge: FactorySelectionKnowledge<NoInfer<TKnowledgeId>>;
    rows: ArtifactSafeValue<readonly T[]>;
    mutability: 'frozen' | 'fresh-mutable-copy';
  }): HarnessValue<T[], TOptionKey>;
}

interface ControlledFactoryHarness extends DeclaredFactoryHarness {
  scenarioValue<T extends JsonValue, TOptionKey extends string>(
    declaration: BindingDeclaration<TOptionKey>,
    approved: ArtifactSafeValue<T>,
  ): HarnessValue<T, TOptionKey>;
  controlledCollection<
    const TOptionKey extends string,
    const TKnowledgeId extends string,
    T extends JsonValue,
  >(options: {
    declaration: SelectionBindingDeclaration<TOptionKey, TKnowledgeId>;
    knowledge: FactorySelectionKnowledge<NoInfer<TKnowledgeId>>;
    scenarioRows: ArtifactSafeValue<readonly T[]>;
    mutability: 'frozen' | 'fresh-mutable-copy';
  }): HarnessValue<T[], TOptionKey>;
  constantConstructionFunction<
    TOptionKey extends string,
    TArgs extends readonly unknown[],
    TResult extends JsonValue,
  >(options: {
    declaration: BindingDeclaration<TOptionKey>;
    maxCalls: number;
    result: ArtifactSafeValue<TResult>;
  }): HarnessValue<(...args: TArgs) => TResult, TOptionKey>;
}

interface NonPublishingProbeHarness extends CapabilityHarness {
  probeString<TOptionKey extends string>(
    declaration: BindingDeclaration<TOptionKey>,
  ): HarnessValue<string, TOptionKey>;
  probeCollection<T, TOptionKey extends string>(options: {
    declaration: BindingDeclaration<TOptionKey>;
    constructionRows: readonly T[];
  }): HarnessValue<T[], TOptionKey>;
}

interface FactoryVariantDimension {
  readonly id: string;
  readonly assignments: Readonly<
    Record<string, string | number | boolean>
  >; // binding ID -> exact value
}

interface FactoryVariant {
  readonly id: string;
  readonly description: string;
  readonly dimensions: readonly FactoryVariantDimension[];
  readonly invariants?: Readonly<Record<string, JsonValue>>;
}

interface DeclaredFactoryInput<TOptions extends object> {
  readonly id: string;
  readonly variantId: string;
  readonly outputPolicy: 'publish-declared-v0.4';
  readonly createOptions: (
    harness: DeclaredFactoryHarness,
  ) => BoundOptions<TOptions>;
}

interface FactoryInputScenario<TOptions extends object> {
  readonly id: string;
  readonly variantId: string;
  readonly outputPolicy: 'internal-candidate-only-v0.4';
  readonly createOptions: (
    harness: ControlledFactoryHarness,
  ) => BoundOptions<TOptions>;
}

interface FactoryProbe<TOptions extends object> {
  readonly id: string;
  readonly variantId: string;
  readonly outputPolicy: 'non-publishing';
  readonly createOptions: (
    harness: NonPublishingProbeHarness,
  ) => BoundOptions<TOptions>;
}

interface ModelFormStateScenario {
  readonly id: string;
  readonly model?: Readonly<Record<string, JsonValue>>;
  readonly formState?: Readonly<Record<string, JsonValue>>;
}

interface StagedModuleReference {
  readonly packageName: string;
  readonly exportSubpath: string;
  readonly exportName: string;
  readonly entryContentHash: string;
  readonly dependencyManifest: readonly {
    readonly packageRelativePath: string;
    readonly contentHash: string;
  }[];
}

interface FormFactoryRegistration {
  readonly id: string;
  readonly optionShape: {
    readonly required: readonly string[];
    readonly optional: readonly string[];
    readonly presentUndefined: readonly string[];
  };
  readonly executableContract: StagedModuleReference;
}

interface FormFactoryRegistrationSidecar {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly registrations: readonly FormFactoryRegistration[];
}

// Exported only from the staged, child-only secondary entry point.
interface ChildFormFactoryContract<TOptions extends object> {
  readonly id: string;
  readonly optionShape: FactoryOptionShape<TOptions>;
  readonly createFields: (options: TOptions) => FactoryFieldConfig[];
  readonly variants: readonly FactoryVariant[];
  readonly declaredInputs?: readonly DeclaredFactoryInput<TOptions>[];
  readonly factoryInputScenarios?: readonly FactoryInputScenario<TOptions>[];
  readonly probes?: readonly FactoryProbe<TOptions>[];
}

declare function defineFormFactoryContract<TOptions extends object>(
  contract: ChildFormFactoryContract<TOptions>,
): ChildFormFactoryContract<TOptions>;
declare function reviewedBinding<const TOptionKey extends string>(
  options: {
    readonly id: string;
    readonly optionKey: TOptionKey;
    readonly owner: string;
    readonly version: number;
    readonly uses: readonly FactoryInputUse[];
  },
): BindingDeclaration<TOptionKey>;
declare function reviewedSelectionBinding<
  const TOptionKey extends string,
  const TKnowledgeId extends string,
>(
  options: {
    readonly id: string;
    readonly optionKey: TOptionKey;
    readonly owner: string;
    readonly version: number;
    readonly uses: readonly [
      SelectionOptionsUse<TKnowledgeId>,
      SelectionValueDomainUse<TKnowledgeId>,
    ];
  },
): SelectionBindingDeclaration<TOptionKey, TKnowledgeId>;
declare function artifactSafe<T extends JsonValue>(options: {
  readonly value: T;
  readonly owner: string;
  readonly reason: string;
  readonly version: number;
}): ArtifactSafeValue<T>;
```

The two contract levels are intentional. Factory-execution inventory comes
only from an exact-schema `FormFactoryRegistrationSidecar` in JSON/JSONC at a
fixed convention or explicit CLI path. The factory path does not evaluate the
repository's TypeScript project config, a JavaScript config, package script,
or generated module to discover registrations. The sidecar carries the erased
runtime `optionShape`, so the parent can validate it before execution and the
child can confirm the same canonical shape after import. The referenced
secondary entry point exports the function-valued `ChildFormFactoryContract`
and is loaded only from its staged path after containment is active. ID or
shape mismatch is fatal before any factory input is materialized.

`StagedModuleReference` is not an arbitrary path. `packageName` and
`exportSubpath` must resolve through an exact package `exports` entry;
`dependencyManifest` contains normalized package-relative files and hashes
created by a credential-free build/staging job. The parent validates and copies
those bytes without evaluating the entry point. Missing, extra, changed,
dynamic, or path-escaping files fail staging. If producing the manifest needs a
bundler, TypeScript loader, Angular compiler, plugin, or package script, that
producer runs under the same containment policy and its identity enters the
manifest hash. A parent-side import is never a discovery fallback.

The existing TypeScript project-config loader remains a separate legacy trust
boundary for the existing zero-argument source path. It is not used before or
during RH-02 factory generation. Workspace integration may correlate the two
sets of inert results only after both paths finish; it must not turn the TS
config into a factory-registration fallback. Invalid JSON/JSONC, unknown keys,
duplicate IDs, non-canonical option shapes, or a missing sidecar fail with
`FACTORY_REGISTRATION_SIDECAR_INVALID`.

RH-02 deliberately has no `AngularScenarioHost`. Even a module-free Formly
builder runs core extensions that may evaluate application expressions,
validators, hooks, async validators, or values captured by closures. A
JSON-safe imitation of application type defaults would also be a second,
drift-prone semantic authority. Consequently this contract stops at raw factory
construction and immediate projection. Formly-resolved scenarios, finite
Observable settling, type/default equivalence, and model/form-state composition
belong to the separate application-equivalent Task 8 contract. That future
contract must bind provider and settling protocols per named composition and
must make its broader execution/evidence claim explicit; no RH-02 artifact is
upgraded to resolved evidence.

Representative controlled factory-input scenario:

```ts
const binding = <const TOptionKey extends string>(
  optionKey: TOptionKey,
  uses: readonly FactoryInputUse[],
) =>
  reviewedBinding({
    id: optionKey,
    optionKey,
    owner: 'claims-forms',
    version: 1,
    uses,
  });
const selectionBinding = <
  const TOptionKey extends string,
  const TKnowledgeId extends string,
>(
  optionKey: TOptionKey,
  nodeId: string,
  expectedKey: string,
  expectedType: string,
  selectionKnowledgeId: TKnowledgeId,
) =>
  reviewedSelectionBinding({
    id: optionKey,
    optionKey,
    owner: 'claims-forms',
    version: 1,
    uses: [
      {
        kind: 'semantic',
        target: {
          nodeId,
          expectedIdentity: { kind: 'keyed', key: expectedKey },
          expectedType,
          slot: { kind: 'options' },
        },
        projection: { kind: 'selection-options', selectionKnowledgeId },
      },
      {
        kind: 'semantic',
        target: {
          nodeId,
          expectedIdentity: { kind: 'keyed', key: expectedKey },
          expectedType,
          slot: { kind: 'value-domain' },
        },
        projection: {
          kind: 'selection-value-domain',
          selectionKnowledgeId,
        },
      },
    ],
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
  optionShape: {
    required: [
      'customNigoReasons',
      'close',
      'results$',
      'rowTemplate',
      'compact',
    ],
    optional: [],
    presentUndefined: [],
  },
  createFields: NigoAddFormConfig,
  variants: [
    {
      id: 'standard',
      description: 'Standard NIGO form structure.',
      dimensions: [
        {
          id: 'layout',
          assignments: { compact: false },
        },
      ],
    },
  ],
  factoryInputScenarios: [
    {
      id: 'safe-active-reasons',
      variantId: 'standard',
      outputPolicy: 'internal-candidate-only-v0.4',
      createOptions: (h) => ({
        customNigoReasons: h.controlledCollection({
          declaration: selectionBinding(
            'customNigoReasons',
            'claims.nigo-add::path:s_reason',
            'reason',
            'select',
            'claims.nigo-reason-knowledge',
          ),
          knowledge: {
            id: 'claims.nigo-reason-knowledge',
            valueDomain: {
              kind: 'mixed',
              knownValues: ['Other'],
              dynamicSource: {
                providerId: 'claims.nigo-reasons',
                sourceKind: 'async',
              },
              completeness: 'partial',
              evidence: 'declared',
            },
            options: [
              { label: 'Other', value: 'Other', semanticRole: 'other' },
            ],
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
        results$: h.inertObservable<
          NigoOptions['results$'],
          'results$'
        >(
          {
            declaration: binding('results$', [
              {
                kind: 'captured-runtime',
                reason: 'Runtime query result.',
              },
            ]),
            identity: { kind: 'unique' },
          },
        ),
        rowTemplate: h.unavailableTemplateRef<
          NigoOptions['rowTemplate'],
          'rowTemplate'
        >(
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
            { kind: 'structural', variantDimension: 'layout' },
          ]),
          variantDimension: 'layout',
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
the eventual DTO. In v0.4 projection the extra role remains versioned
generation metadata and is stripped from `ContractOption`; it requires an
explicit future schema addition before becoming a public option property.

A declared or controlled collection that can populate a choice field has one reviewed
`FactorySelectionKnowledge.id` but exactly two coordinated semantic uses:

1. `selection-options` addresses only the node's `options` slot; and
2. `selection-value-domain` addresses only the node's `value-domain` slot.

Both uses must be on the same binding declaration, resolve to the same node,
reference the same knowledge ID passed to `declaredSelectionCollection` or
`controlledCollection`, and appear
exactly once. The pair is validated atomically before projection, then applied
as two exact overrides. Missing/mismatched pairs fail with
`FACTORY_SELECTION_PROJECTION_INCOMPLETE`; duplicate or competing authorities
remain `FACTORY_BINDING_TARGET_CONFLICT`. The ordinary extractor never reads
raw `props.options` for either controlled slot: it receives the approved
`FactoryKnownOption[]` for `options` and the separately mapped
`FactoryValueDomain` for `valueDomain`. Because v0.4 `ContractNode.options` is
required, `FactorySelectionKnowledge.options` is required too; an
intentionally empty approved array is explicit and never falls back to raw
rows. Other exact presentation, state, locator, or default slots retain their
normal extraction/override rules.

This paired design preserves v0.4's two public fields without duplicating
authority. The knowledge record is hashed once; each exact use hashes its slot
plus the shared knowledge ID. A value-only control that genuinely has no
options collection uses `scenarioValue` plus the ordinary one-slot
`value-domain` projection; it does not use `controlledCollection` or
`FactorySelectionKnowledge`.

### Binding classification

| Binding | Materialization | May execute? | Semantic rule |
| --- | --- | ---: | --- |
| Known JSON value | Exact value approved as safe/meaningful if copied anywhere in this scenario artifact | No | May enter scenario output; usage metadata still governs domain claims |
| Probe string | Per-run nonce-tagged string in non-publishing mode | No | No contract artifact may be emitted from the run |
| Structural scalar | Exact variant value | No | Affects only the named variant; never called a probe |
| Declared/controlled selection collection | Approved finite static rows or safe scenario rows; frozen or fresh mutable copy | Array operations only | Paired knowledge owns options/domain; raw rows never prove more than its declared evidence |
| Captured callback/hook | Proxy function; calls and structural introspection traps record, then throw | No | Truthiness/`typeof` reflect production presence; capture-only use is reviewed metadata |
| Construction function | Call-counted constant function returning one artifact-safe JSON result | Only explicitly allowed calls | Result is controlled scenario input, not global domain evidence |
| Observable | Inert proxy; `subscribe`, `pipe`, symbol/prototype inspection, and other behavior record, then throw | No | Dynamic/unknown in RH-02; finite settling belongs to Task 8 |
| `TemplateRef` | Capture-only proxy; any property/method access records, then throws | No | View-dependent unknown |
| `any`/service-shaped object | Opaque capture-only proxy; primitives forbidden; every trap records, then throws | No | Cannot be structural or semantic evidence |

Binding declarations and immutable inputs are deeply frozen and wrapped in
runner-owned mutation guards. A `set`, `defineProperty`, `deleteProperty`, or
mutating-array attempt records `FACTORY_INPUT_MUTATION_ATTEMPTED` before it
throws, so sloppy-mode assignment cannot silently change behavior. A factory that
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

The handle brand also carries the exact top-level `optionKey`, and each
`BindingDeclaration` names that key explicitly. Materialization requires one
unique declaration ID for one option key and rejects a handle whose branded
key does not match the property receiving it. Reusing one declaration at a
second key is invalid; v1 has no top-level binding-alias feature. Equivalent
values at two keys use two declarations, preserving unambiguous variant,
ledger, ownership, and semantic-use attribution. The canonical key-to-binding
map is hashed before factory invocation.

The first contract is deliberately top-level-only. A composite object or
non-selection array may be passed as one `known` value only when the entire
recursively plain JSON graph is artifact-safe and its binding is
`construction-only`; no nested leaf may be structural, dynamic,
capability-shaped, or independently semantic. Static/controlled choice arrays
use the paired collection constructors instead. Nested booleans/enums that change structure,
nested callbacks/providers, or nested collections consumed as option sources
are unsupported and fail `FACTORY_NESTED_BINDING_UNSUPPORTED`; they must be
flattened behind a reviewed factory adapter or wait for a future JSON-pointer
binding grammar. This is narrower than the ideal workplace corpus but is
enforceable and prevents a top-level approval from laundering unclassified
nested behavior.

Optional properties are also explicit. `OptionalKey<TOptions>` is derived from
property optionality, not from whether the value type happens to include
`undefined`. `h.absent(...)` is therefore assignable only to an optional key;
a required `string | undefined` key must use a present handle, including
`h.presentUndefined(...)` when appropriate. Present handles use
`Required<TOptions>[Key]`, so `optional?: string` cannot be present with
`undefined`, while `optional?: string | undefined` may be. The child contract's explicit
`optionShape` is the runtime authority after TypeScript erasure: it lists every
supported string key, requires one bound handle per key, permits an absent
handle only for a listed optional key, permits present `undefined` only for a
listed `presentUndefined` key, and rejects missing, extra, numeric, or symbol
keys. The sidecar and child shapes must match canonically. Materialization
omits an absent optional property and preserves an own property for approved
present `undefined`. Type fixtures must cover both optional forms plus required
`T | undefined`.

Presence is a reviewed structural use. `fixed({ invariantKey, ... })` must
resolve to the same canonical value in the selected variant's `invariants`.
For `structural`, the declaration ID selects one entry from the named
dimension's `assignments`; the approved value must match that per-binding
entry. This allows one `layout` dimension to require, for example,
`compact=true`, `showDetails=false`, and `inlineActions=true` without pretending
those booleans are independent dimensions.

Field `key`, `type`, parent/child position, and sibling order are structural
identity, not projectable semantic slots. A publishable controlled value may
not determine them. Approved fixed or named structural bindings may do so only
when the review declares that identity effect, and any configured-input delta
must be represented by the selected variant. Before stable node IDs are
computed, the runner addresses these properties by source ordinal path and
compares declared/controlled runs plus mandatory two-nonce probe runs. A probe
marker in `key` or `type`, an unexplained identity delta, or a controlled-only
value in structural identity is fatal as `FACTORY_STRUCTURAL_IDENTITY_UNSAFE`.
This check is not advertised as automatic proof for omitted primitive flow;
the declaration remains a reviewed trust boundary.

Capture-only capabilities are proxies. Application, construct, property,
prototype, key-enumeration, and method traps first append a safe entry to the
runner-owned violation ledger, then fail. JavaScript truthiness,
strict comparison to `undefined`, and `typeof` cannot be trapped; publishing
therefore requires the application review to state that capability presence
and broad type are production-equivalent invariants. Factories that inspect
more than presence/type are unsupported until refactored or modeled by an
explicit safe construction protocol. Capability equality/aliasing is modeled
by `CapabilityIdentity`: the runner reuses one proxy for a shared group and a
distinct proxy for each unique declaration. Comparisons to application-only
sentinels or unmodeled Map/Set membership remain unsupported.

Scalar/presentation redaction is exact-target-specific rather than implied by
value domains. A target names the node plus an exact contract slot, such as
`presentation.description`, `state.disabled`, or one locator candidate
identity. `suppress-as-unknown` drops only that declared slot (for example an
interpolated description or locator) and emits an unknown diagnostic;
`allow-artifact-safe-scenario-value` retains scenario-specific content;
`value-domain` is reserved for option/value-domain targets. A target that does
not resolve to exactly one projected slot is
invalid; ambiguous or duplicate locator identities are rejected rather than
broadly suppressing all locators. Contradictory projection kinds for one exact
target are invalid. Each target also carries either a keyed expectation or a
keyless `sourceOrdinalPath`, plus `expectedType` when stable. A node-ID match
whose key presence/value, ordinal path, or type corroboration changed is
`FACTORY_BINDING_TARGET_MISMATCH`, not authorization to retarget the override.
This explicitly supports the current compiler's positional IDs for keyless
nodes without inventing a key.

Controlled runs never feed an unreserved raw `props.options` array or a domain
derived from it to the ordinary extractor. Every option-bearing controlled
node requires the exact paired selection declaration; otherwise the slot is
unknown and the run fails publishing with
`FACTORY_SELECTION_PROJECTION_INCOMPLETE`. This whole-tree default prevents
one controlled collection reused at a second field—or mapped into fresh option
objects—from becoming an accidental complete domain. Declared-mode literal
options may use ordinary extraction only when no controlled/probe binding was
materialized in that run and the entire option graph is approved static data.

A locator `candidateId` is computed from its stable source slot/configuration
before the potentially tainted locator value is read; it is not derived from
the selector string. The public v0.4 locator does not gain a new field. The ID
exists only in binding/projection metadata so two candidates with the same
strategy/target can still be addressed and conflict-checked independently.

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

### Runner-owned violation ledger

Throwing is not evidence because ordinary application code can catch an error
and continue with a fallback. Before the child imports any application byte, a
tool-owned preload creates a module-private append-only ledger that the staged
contract cannot reference or clear. Every harness capability and immutable
input proxy closes over a recorder; each trap records a stable kind, phase,
binding ID, and safe source identifier **before** throwing. The preload also
guards the supported scheduling/ambient surface (`setTimeout`, `setInterval`,
`setImmediate`, `queueMicrotask`, `process.nextTick`, `Promise.prototype.then`,
`Date.now`, `new Date()` without an argument, `Math.random`, and
`crypto.randomUUID`) and supported Node network/process/file entry points.
After synchronous projection, the child can seal but not erase the ledger;
the parent accepts a DTO only when the sealed summary is empty.

This is a supported-surface contract, not a claim to instrument arbitrary
syscalls or prove quiescence. OCI and Node permissions prevent external
effects even when application code catches the resulting denial. The
JavaScript ledger makes violations through the supported Node/harness APIs
observable and refusal-safe; an attempted lower-level bypass is outside the
trusted-code model and remains contained but may produce only a generic child
failure. The conformance suite must show that each supported denial is recorded
even when the factory catches every thrown error. The child is terminated
unconditionally after its one synchronous result; pending Promise/RxJS work is
never enumerated or called "settled."

### Selected containment backend and refusal behavior

The first supported execution backend should be a versioned
`oci-rootless-v1` profile, implemented through a rootless Docker- or
Podman-compatible OCI runtime. This is a deployment prerequisite, not an
optional hardening flag. The profile requires:

- a non-root UID/GID in a user/PID/mount namespace and a rootless daemon or
  equivalent unprivileged runtime;
- `network=none`, no published ports, no host/Docker socket, no devices, and no
  inherited credentials or proxy variables;
- a read-only root filesystem, the content-hashed staged image as the only
  read-only input mount, and a bounded `tmpfs` for the working directory;
- all Linux capabilities dropped, `no-new-privileges`, the runtime's default
  or stricter seccomp policy, bounded PIDs/CPU/memory, and a hard wall timeout;
- Node's permission model enabled with reads limited to the staged image and
  without child-process, worker, addon, WASI, or write allowances; and
- a bounded result channel dedicated to one schema-framed DTO. Application
  stdout/stderr and exception text remain discarded and are never parsed as a
  result.

Before the first application import, the runner executes a pinned conformance
image under the exact profile. It must prove that outbound DNS/TCP/UDP, host and
checkout reads, filesystem writes outside the bounded tmpfs, process/worker
creation through the Node APIs, device/socket access, and resource-limit
breaches fail, while a valid staged-module read and bounded DTO round trip
succeed. The preflight records runtime/version, image, seccomp, and policy
hashes; an allowlisted set of exact hashes is part of generation provenance.

Failure to find a rootless runtime, apply any required control, or pass any
probe emits `FACTORY_CONTAINMENT_UNAVAILABLE` or
`FACTORY_CONTAINMENT_NONCONFORMANT` and forbids executable factory artifacts.
There is no fallback to an in-process import, plain Node child, worker thread,
host-network container, or deprecated platform sandbox. Static inert
registration inventory may still be reported, but it is not factory-derived
structure. macOS/Windows developer support is through a conforming rootless
Linux VM-backed OCI runtime; native-host execution is out of scope for the
first backend.

## Compile flow

1. **Inventory a code-free sidecar.** Parse only the fixed-convention or
   explicitly selected JSON/JSONC `FormFactoryRegistrationSidecar` with an
   exact own-data schema. Do not evaluate the TypeScript project config,
   package scripts, generated modules, or the `executableContract` to list IDs.
   Require a precompiled Node-safe secondary entry point that does not import
   components or production services.
2. **Preflight `oci-rootless-v1`.** Capability-detect the runtime and execute
   the pinned conformance image under the exact policy. Refuse executable
   generation on an unavailable control, failed probe, or unapproved
   runtime/image/policy hash.
3. **Stage an execution image without imports.** Verify/copy only the compiled descriptor,
   reviewed metadata, runtime loader, and exact dependency closure into an
   ephemeral directory. Exclude the checkout, `.git`, `.env*`, home/config
   files, fixtures, generated data, source maps, and unrelated sources. Scan
   the manifest before execution. Produce the image in the same credential-free
   OS sandbox: config loaders, bundler plugins, package scripts, and Angular
   compilation are executable boundaries too. Dynamic/computed imports and
   undeclared assets fail staging rather than widening read access.
4. **Spawn a fresh container/child per phase.** Start one contained metadata
   child per inert registration, then a new execution child for every selected
   variant/scenario. Use an argument array, never a shell; strip credentials
   and inherited Node options; set an empty temporary working directory,
   `TZ=UTC`, explicit locale, fixed resource limits, structured IPC only, and
   ignored child stdout/stderr.
5. **Apply layered containment and instrumentation.** Apply the conforming rootless OCI profile and use Node
   permissions to deny writes, child processes, workers, addons, and WASI and
   to allow reads only from the staged image. Install and self-test the
   tool-owned violation-ledger preload before the first application import.
   The pinned runtime has no Node network permission flag, so do not claim one.
6. **Import the executable contract inside containment.** Resolve only the
   staged entry whose bytes and export name match the inert registration. The
   exported child contract ID and runtime `optionShape` must canonically match
   the sidecar registration. The metadata child projects a function-free
   manifest of variant/scenario IDs and hashes, sends it over bounded IPC, and
   exits. The parent selects one manifest entry and starts a fresh execution
   child, which reimports the same content-hashed bytes before materialization.
   Import-time failure or blocked
   access maps to a stable parent-generated diagnostic. Never forward child
   exception text, stack, stdout, stderr, or raw values to an artifact.
7. **Select an evidence mode.** Declared mode accepts only reviewed
   static/invariant inputs. Controlled mode accepts named safe synthetic
   factory-input scenarios. Probe mode may use tags/scaffolds but cannot emit a
   contract artifact.
8. **Materialize one named input.** Build the options object only through the
   mode-specific harness and validate the resulting graph. Require each
   handle/declaration key to match its property, each declaration ID to map to
   exactly one key, and present/absent values to satisfy `Required<T>[Key]` plus
   the runtime `optionShape`. Freeze immutable
   inputs behind mutation-recording proxies or create one disposable mutable
   scenario copy as declared. Reject unsupported nested behavioral leaves.
9. **Invoke and project in one synchronous turn.** The factory call, graph
   inspection, node-ID computation, allowlisted projection, deep freeze of the
   inert DTO, and initiation of structured IPC occur without `await` or a
   return to the event loop. Promise/Observable returns, re-entrancy,
   capability execution, and out-of-budget work fail closed. Supported
   microtask/timer creation records a ledger violation before scheduling;
   queued work cannot mutate the already frozen projection and is never
   treated as settled. Seal the violation summary before IPC; any entry makes
   the parent discard the DTO even if application code caught every throw.
   The child is terminated after its single response.
10. **Validate the returned field array inside containment.** Require a dense
   fresh array of expected field records. JavaScript cannot reliably prove an
   object is not a `Proxy`; reflection itself may invoke proxy traps. Treat all
   such inspection as continued trusted application execution under the same
   timeout. Capture safe intrinsic references before importing the factory and
   reject accessor descriptors when actually observed.
11. **Build structure with correct evidence.** Inspect structural identity by
    source ordinal path before computing stable node IDs. Reject probe markers,
    controlled-only identity, and unexplained key/type/order deltas. Then
    compute stable node IDs, validate each reviewed usage target, and reject
    conflicting projections.
    Declared inputs yield declared structure; factory-input scenarios yield
    an internal controlled candidate only. Probe output stops here with
    diagnostics.
12. **Project with binding overrides.** Build an exact-slot projection plan
    before reading contract-bearing values. For declared or controlled
    harness-provided selections,
    validate the complete two-slot pair and reserve `options` plus
    `value-domain` for its one knowledge ID; do not call the ordinary raw-option
    or derived-domain readers for those slots. Project the approved options and
    mapped domain independently. In controlled mode, fail any unreserved
    option/domain slot rather than calling raw-option extraction; other
    unreserved non-selection slots use ordinary extraction. Suppress other
    reviewed scenario values only at their exact targets. The standard
    extractor still reports unrelated opaque hooks, parsers, validators, and
    functions.
13. **Stop before Angular/Formly resolution.** RH-02 does not call Formly's
    builder, run expressions/validators/extensions, subscribe to providers,
    settle async work, or combine model/formState. A future Task 8 source may
    reference the factory-input and model/form-state scenario IDs, but it runs
    under a separately approved application-equivalent threat model and emits
    resolved evidence rather than mutating this raw-factory result.
14. **Check repeatability and declared determinism.** Re-run declared
    publishable inputs and internal controlled candidates in another fresh
    process and require equal canonical hashes. Record the
    staged-image and environment-policy hashes. Forbid ambient clock, random,
    host identity, unordered filesystem, and undeclared environment inputs by
    source/policy review and guarded runtime APIs where feasible. Two equal
    runs are observed repeatability, not proof of determinism. Probe mode uses
    a different nonce only to test leak detection and still emits no artifact.
15. **Publish only schema-compatible inert DTOs.** Under v0.4, only declared
    variants may become `FormContract` artifacts. Controlled candidates remain
    compiler-internal test/evaluation results and never enter storage or MCP.
    Publishing them requires a future versioned `controlled` evidence kind,
    provenance, validation, hashing, migration, and consumer behavior. The MCP
    path never imports the factory contract.

### Evidence separation

| View | Inputs | What it may claim | What it may not claim |
| --- | --- | --- | --- |
| Declared structure | Approved static/invariant factory input plus inert capture-only capabilities | Field/tree structure for that named variant; reviewed usage/domain declarations | Unknown provider-dependent structure, lifecycle outcome, browser parity |
| Controlled factory result (internal only under v0.4) | Approved synthetic factory-input scenario | Candidate factory output, projection feasibility, repeatability, and diagnostics under the named input | Any v0.4 `FormContract`, node evidence, storage/MCP publication, or global domain completeness |
| Formly resolved scenario (future Task 8; not RH-02 output) | Fresh factory inputs plus model/formState and an application-equivalent configured builder | Allowlisted post-build state for that exact scenario | RH-02's no-production-service guarantee, unvisited branches, mounted lifecycle, remote completion |
| Non-publishing probe | Meaningless tagged construction scaffolds | Feasibility and leak diagnostics only | Any semantic contract artifact |
| Observed runtime | Browser visit and captured state | Rendered facts for visited state | Declared universe or unvisited branches |

Factory-input scenarios and model/form-state scenarios have different IDs and
hash inputs. RH-02 owns only the former. A future Task 8 contract may compose
their stable references, but they must not be flattened into one untyped
`options` bag in metadata or executed by this harness.

## Value-domain design

The current schema should not be changed by this research task. Its authority
split remains normative: `ContractValueDomain.values` contains only canonical
`JsonValue` entries, while labels and disabled state remain in the node's
separate `options` collection. Factory provenance may extend the value-domain
metadata in a future schema version, but it must not introduce a second option
record authority.

A future internal authoring DTO should therefore keep value knowledge and
option presentation separate:

```ts
type FactoryValueDomain =
  | {
      kind: 'static';
      values: readonly JsonValue[];
      completeness: 'complete';
      evidence: 'declared';
    }
  | {
      kind: 'dynamic';
      dynamicSource: FactoryDynamicSource;
      completeness: 'unknown';
      evidence: 'declared';
    }
  | {
      kind: 'mixed';
      knownValues: readonly JsonValue[];
      dynamicSource: FactoryDynamicSource;
      completeness: 'partial';
      evidence: 'declared';
    }
  | {
      kind: 'filtered';
      input: { bindingId: string };
      filter: { kind: 'declared'; filterId: string } | { kind: 'opaque' };
      knowledge:
        | { kind: 'complete'; values: readonly JsonValue[] }
        | { kind: 'partial'; knownValues: readonly JsonValue[] }
        | { kind: 'unknown' };
      evidence: 'declared';
    }
  | {
      kind: 'scenario';
      scenarioEvidence: {
        kind: 'controlled';
        factoryInputScenarioId: string;
      };
      values: readonly JsonValue[];
      completeness: 'scenario-complete';
      basis: { kind: 'explicit-finite-construction-input' };
    }
  | {
      kind: 'scenario';
      scenarioEvidence: {
        kind: 'controlled';
        factoryInputScenarioId: string;
      };
      values: readonly JsonValue[];
      completeness: 'partial';
      reason: 'dynamic-remainder' | 'opaque-filter';
    }
  | {
      kind: 'unknown';
      reason: FactoryDomainUnknownReason;
      evidence: 'declared';
    };

interface FactorySelectionKnowledge<TKnowledgeId extends string = string> {
  readonly id: TKnowledgeId;
  readonly valueDomain: FactoryValueDomain;
  readonly options: readonly FactoryKnownOption[];
}
```

Rules:

1. Static means the approved source is finite and globally complete, not merely
   that the factory received an array.
2. Dynamic records a stable provider identity and no values.
3. Mixed records only approved known local values plus an unknown dynamic
   remainder. It is necessarily partial. Any corresponding labels remain in
   `FactorySelectionKnowledge.options`, not in `knownValues`.
4. Filtered describes provenance. An opaque predicate over a dynamic source is
   unknown even if construction probes survive it. A declared filter over a
   complete static source may be complete after deterministic evaluation.
5. Controlled scenario values are scenario-complete only for the explicit
   finite construction input supplied to that one scenario; this is not a
   claim about a dynamic provider. A known local subset plus a dynamic
   remainder is partial. Observable emissions, settling, and resolved evidence
   are outside RH-02 and require a future Task 8 domain contract.
6. Defaults, current model values, probe rows, table data, translated labels,
   and sentinel-like spelling never expand a domain automatically.
7. Inside `FactorySelectionKnowledge`, each option value must canonically match
   exactly one value in `static.values`, `mixed.knownValues`, the filtered
   knowledge subset, or the controlled scenario values. Duplicate canonical
   option values, option records for an unknown remainder, and two presentation
   records for one value are errors. A known value may omit presentation when
   its label is not approved; that absence does not remove the value from the
   internal domain.
8. Every `FactorySelectionKnowledge` record carries `options` (an explicitly
   approved empty array is permitted), and the declared or controlled binding
   must declare the paired exact `selection-options` and
   `selection-value-domain` uses described above.
   The ordinary extractor's raw option and derived-domain paths are bypassed
   only for those two slots. A partial pair, knowledge-ID mismatch, or another
   authority for either slot is fatal before any declared node is published or
   controlled candidate is accepted internally.
9. Projection to v0.4 is explicit: globally finite declared values map to
   `enumerated/complete`; RH-02 controlled-only values do **not** map to
   `enumerated/scenario` because v0.4's scenario evidence is `resolved`.
   A controlled run maps to no v0.4 node at all. For declared inputs,
   unresolved dynamic knowledge maps to `dynamic` or `unknown`; mixed and
   filtered provenance is retained in versioned generation metadata until a
   later schema version adds it. None of these states may be flattened into a
   false complete or resolved domain. Declared `options` is projected
   independently and remains the sole label/disabled authority.
   The current v0.4 validator additionally requires an enumerated domain for a
   generic `choice`/`autocomplete`/`row-selection` interaction profile. A mixed
   or partial node therefore cannot retain that executable generic profile:
   keep the honest dynamic/unknown domain plus approved local options and omit
   the generic profile with `FACTORY_V04_PARTIAL_CHOICE_UNEXECUTABLE`. Never
   promote the known subset (for example `Other`) to a complete enumeration.

The exact compatibility mapping is:

| Factory knowledge | v0.4 `valueDomain` | v0.4 `options` | Additional provenance |
| --- | --- | --- | --- |
| Static complete | `enumerated`, `static-options`, `complete`, declared; canonical values only | Matching approved presentations | Static binding/filter IDs in generation metadata |
| Dynamic | `dynamic` with the declared `sourceKind` | Empty unless separately approved local presentations exist | Provider ID in generation metadata |
| Mixed | `dynamic` with the dynamic remainder's `sourceKind`; do not enumerate the known subset as complete; omit incompatible generic choice execution profile | Approved presentations for known local values only | `knownValues`, provider ID, `partial`, and v0.4 execution limitation in generation metadata |
| Filtered, declared, complete static input | `enumerated`, `static-options`, `complete`, declared | Matching approved presentations | Input binding and filter IDs |
| Filtered partial/opaque | `dynamic` when the input source kind is known, otherwise `unknown`; omit incompatible generic choice execution profile | Approved presentations for known survivors only | Filter/input IDs, partial/unknown reason, and v0.4 execution limitation |
| Future Task 8 resolved finite-closed scenario (not emitted by RH-02) | `enumerated`, `resolved-options`, `scenario`, resolved | Matching approved scenario presentations | Resolved scenario, protocol, projector, and settling IDs |
| Controlled factory-input scenario without a public controlled evidence kind | No v0.4 node or `valueDomain`; internal candidate only | No v0.4 options; internal candidate only | Scenario knowledge remains compiler-internal until a schema revision defines controlled evidence, validation, hashing, migration, and consumers |
| Future Task 8 partial/open scenario (not emitted by RH-02) | `dynamic` when source kind is known, otherwise `unknown` | Approved observed presentations only | Scenario ID and snapshot reason |

This mapping is intentionally lossy for declared mixed knowledge and refuses
controlled publication entirely. Losing precision—or withholding an
incompatible artifact—is preferable to reusing `resolved` evidence for a
different stage or advertising a known subset as a complete finite domain. A future
schema revision may add partial/controlled provenance additively; it must define
migration, hashing, and consumer behavior before those facts enter the public
contract.

## Structural variants without boolean explosion

A factory input requires a named variant when changing it can alter any
contract-bearing structure: field existence/order/key/type, group/array shape,
wrappers, semantic control kind, required interaction parts, or a finite static
domain. A flag that only changes a separately redacted presentation value does
not require a structural variant.

Each `FactoryVariant.dimensions` entry is a named business dimension containing
a complete canonical binding-ID-to-value assignment and may be accompanied by
reviewed fixed invariants. Runtime `structural` calls select the dimension and
their `BindingDeclaration.id` selects the exact assigned value. Missing, extra,
duplicate, or conflicting dimensions/binding IDs are errors. Variant identity
hashes the sorted dimension IDs, their sorted per-binding assignments, and
invariants before `createOptions()` executes.

Do not generate the Cartesian product of booleans. Use this policy:

1. Mark project invariants as `fixed` and compile them once.
2. Define a baseline variant for the ordinary business state.
3. Add named variants only for supported, business-valid structural states
   needed by a journey, release gate, or explicit coverage requirement.
4. Group correlated flags in one named dimension with per-binding assignments;
   do not expose them as independent dimensions when the application never
   supports arbitrary combinations.
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
| Executable registration/config before containment | Code-free exact-schema JSON/JSONC sidecar; factory path never evaluates TS/JS config | Reject sidecar or refuse factory path |
| Import-time service/network activity | Node-safe reviewed entry point; empty credentials; OS network deny; staged dependency image; preload ledger over supported Node APIs | External effect blocked; any ledger entry aborts; an uninstrumented caught OS denial may yield only generic child refusal and is not claimed attributable |
| Files/customer data | Build and execute staged dependency-only image inside credential-free OS sandbox; no checkout/home/config/secrets mounts; no writes | Abort; discard child text output |
| Callback called during construction | Ledger-recording captured callback; separately declared bounded construction function | Abort with binding ID and call phase even if the throw is caught |
| Observable subscription | `subscribe` records then throws; RH-02 has no finite/active Observable protocol | Abort; no retry or fallback to live source |
| `TemplateRef`/Angular view access | Capture-only proxy records then throws; no component/view creation | Abort and require browser/Task 8 evidence |
| DI/JIT/Formly resolution | RH-02 does not create an Angular injector, import an NgModule, or call the Formly builder | `FACTORY_ANGULAR_HOST_UNSUPPORTED`; raw declared artifacts and internal controlled candidates only |
| Timers/CPU/infinite loop | Child timeout plus OS CPU budget; hard kill fallback | No artifact for variant |
| Microtask/timer mutates returned fields after factory return | Guard supported schedulers into the ledger; inspection/projection/freeze/IPC stays in one synchronous turn; unconditional child termination | Ledger violation when observed; queued work never becomes evidence; no quiescence claim |
| Memory/output exhaustion | Process/V8 memory limit, bounded structured IPC, ignored child stdout/stderr | No artifact; stable resource diagnostic |
| Spawn/worker/native escape | Node denies child, worker, addon, and WASI; rootless OCI isolates PID/user/mount/network namespaces, drops capabilities, applies no-new-privileges/seccomp, and bounds PIDs | Abort; a failed preflight forbids execution |
| Global/module cache mutation | Fresh process per form/variant/scenario | Process discarded |
| Subscription/Subject leak | RH-02 never subscribes or runs lifecycle hooks; terminate the child unconditionally; dispose harness-owned resources | Process discarded; no claim that arbitrary pending tasks were enumerated |
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
| `FACTORY_REGISTRATION_SIDECAR_INVALID` | error | Code-free registration sidecar is missing, non-canonical, duplicated, or violates its exact JSON/JSONC schema |
| `FACTORY_CONTAINMENT_UNAVAILABLE` | error | The required rootless OCI runtime/control set is unavailable; no executable fallback is allowed |
| `FACTORY_CONTAINMENT_NONCONFORMANT` | error | The pinned preflight failed or runtime/image/policy hashes are not approved |
| `FACTORY_STAGE_INVALID` | error | Dependency-only execution image contains a prohibited or undeclared file |
| `FACTORY_IMPORT_FAILED` | error | Node-safe descriptor could not be imported |
| `FACTORY_SIDE_EFFECT_BLOCKED` | error | A supported network/file/process/worker/addon API attempt was recorded before denial; absence is not syscall-level proof |
| `FACTORY_SCHEDULED_WORK_OBSERVED` | error | A guarded timer, microtask, next-tick, or Promise scheduling API was used |
| `FACTORY_AMBIENT_INPUT_OBSERVED` | error | A guarded clock/random/host input was read |
| `FACTORY_TIMEOUT` | error | Import, factory, or projection exceeded its budget |
| `FACTORY_RESOURCE_LIMIT` | error | Memory, output, IPC, or handle budget was exceeded |
| `FACTORY_RETURN_INVALID` | error | Factory did not synchronously return a fresh dense field array |
| `FACTORY_CALLBACK_INVOKED` | error | Capture-only callback ran during import/construction/build |
| `FACTORY_OBSERVABLE_SUBSCRIBED` | error | Inert Observable was subscribed |
| `FACTORY_TEMPLATE_REF_DEREFERENCED` | error | Capture-only view token was read/called |
| `FACTORY_INPUT_MUTATION_ATTEMPTED` | error | A supposedly immutable input was assigned, deleted, redefined, or mutated |
| `FACTORY_OPTION_SHAPE_INVALID` | error | Bound option keys, required/optional classification, or absent/present materialization disagrees with `optionShape` |
| `FACTORY_BINDING_KEY_MISMATCH` | error | Handle/declaration key does not match its option property, or one declaration ID was reused across keys |
| `FACTORY_NESTED_BINDING_UNSUPPORTED` | error | A composite top-level input contains a nested structural, dynamic, capability, or independently semantic leaf |
| `FACTORY_BINDING_UNCLASSIFIED` | error | Options contain a value not created/approved by the harness |
| `FACTORY_BINDING_USAGE_UNDECLARED` | error | Taint/identity analysis actually detected flow to an undeclared semantic target; absence of this code is not coverage proof |
| `FACTORY_BINDING_TARGET_MISSING` | error | Declared node/exact-slot target was absent or did not resolve uniquely in the variant |
| `FACTORY_BINDING_TARGET_MISMATCH` | error | A target's computed node ID resolved but its keyed/keyless ordinal identity or expected type corroboration changed |
| `FACTORY_BINDING_TARGET_CONFLICT` | error | Multiple declarations disagree about one target/domain authority |
| `FACTORY_SELECTION_PROJECTION_INCOMPLETE` | error | A controlled selection lacks one exact options/domain use, targets different nodes, or references mismatched knowledge IDs |
| `FACTORY_SCALAR_UNSAFE` | error | A required scalar cannot be safely known, varied, or tagged |
| `FACTORY_STRUCTURAL_IDENTITY_UNSAFE` | error | Probe/controlled input reached field key/type/order/ancestry without a fixed or named structural declaration |
| `FACTORY_PROBE_TAINT_OBSERVED` | info | Non-publishing probe reached a named structural or semantic path |
| `FACTORY_TAINT_IN_PUBLISHABLE_OUTPUT` | error | Probe marker reached a run that was incorrectly marked publishable |
| `FACTORY_VARIANT_REQUIRED` | error | An undeclared input changes contract-bearing structure |
| `FACTORY_RUNTIME_BEHAVIOR_OPAQUE` | warning | Callback/hook/Observable/view/service is captured for later execution |
| `FACTORY_SCENARIO_PARTIAL` | warning | Scenario materialization is not globally complete |
| `FACTORY_V04_PARTIAL_CHOICE_UNEXECUTABLE` | warning | Honest mixed/partial knowledge cannot satisfy v0.4's enumerated-domain requirement for a generic choice-like interaction profile; profile omitted rather than fabricated |
| `FACTORY_ANGULAR_HOST_UNSUPPORTED` | error | Angular DI/Formly builder, expression, validator, extension, component, or resolved evidence was requested from RH-02; use a separately approved Task 8 mode |
| `FACTORY_NONDETERMINISTIC` | error | Repeated fresh-process canonical projections observably differ; absence is not proof |
| `FACTORY_CLEANUP_FAILED` | error | Harness-owned cleanup or unconditional child termination failed; this is not pending-task enumeration |

Any error produces no contract artifact for that variant/scenario. Policy may
escalate warnings, but it must not downgrade errors that protect data origin,
execution containment, identity, or determinism.

These `FACTORY_*` identifiers are runner/generation diagnostics in this design,
not additions silently serialized into v0.4's closed contract diagnostic-code
union. Errors gate publication; warnings remain in the internal generation
report/build log unless item 2 explicitly versions the public diagnostic DTO,
validation, hashing, migration, and consumers. The same rule prevents a new
factory diagnostic name from changing public contract bytes by accident.

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
| Content-hashed application NgModule imports plus provider denylist | Reject for the no-production-provider profile | Angular intentionally flattens transitive providers and runs environment initializers; hashes prove identity, not provider authorization |
| Restricted pinned Formly core config plus exact synthetic value/protocol injector | Reject from RH-02; defer to Task 8 | DI restriction does not stop Formly core from running application expressions/validators/closures, and copied type defaults would drift |
| Conforming rootless OCI run + fresh child + violation ledger + approved inputs/scenarios + reviewed usages + allowlisted projection | Recommend only after the negative-control gate | Preserves real factory execution and honest evidence if catch-resistant violations are proven; preflight is mandatory, reviewed usage is a trust boundary, and probes cannot publish |

Important failure cases:

- If a factory invokes a capture-only callback or subscribes during
  construction, do not return a neutral value. Fail and require a separately
  reviewed bounded construction binding or refactor. The ledger entry remains
  fatal even if the factory catches the thrown trap and falls back.
- If a controlled collection reaches two option-bearing nodes, both nodes need
  their own paired selection authority; an unreserved second slot is unknown,
  never an ordinary complete options/domain extraction.
- If a scaffold or controlled-only value changes `key`, `type`, ancestry, or
  order, reject the run. Structural identity is not a redactable semantic slot.
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

## Follow-up design spikes after independent review 2

These disposable spikes targeted only the two P1 findings. They ran from
`scripts/research/factory-harness/` and are deleted after their hashes and
results are retained here, preserving the one-artifact delivery boundary.

### Environment and method

```text
Repository HEAD before the spikes:
  1973bad9c8a92e01dd3fb5af7e9f47f29949af24

Host:
  Darwin 25.5.0 arm64 (RELEASE_ARM64_T6000)

node --version
  v22.22.1

pnpm --version
  10.23.0

Pinned packages exercised:
  @angular/core 20.3.29
  @ngx-formly/core 6.1.8
```

`provider-boundary.mjs` created a JIT-decorated `ProductionModule`, imported it
transitively through `FeatureModule`, and passed that graph to Angular's public
`importProvidersFrom`/`createEnvironmentInjector` APIs. It then created a
null-parent synthetic environment, a rejecting `Injector` facade, and a
component-free Formly builder. The spike used Formly's pinned runtime provider
layout only to establish feasibility. The final decision does not promote that
seam into RH-02; all Formly-builder execution remains Task 8 work.

`paired-selection-projection.mjs` invoked a realistic factory twice with
different scaffold rows. The factory ran `filter`/`map`, interpolated the
filtered count and a boolean, and captured a callback plus mutable lifecycle
state in `onDestroy`. The miniature binding-aware projector reserved and
replaced exact `options` and `value-domain` slots from one shared knowledge ID,
suppressed the interpolated description, and left the lifecycle hook opaque.

`typecheck-doc-api.mjs` combined the first three retained TypeScript fences
with minimal external type declarations and semantically typechecked the full
API plus representative contract as one unit under TypeScript 5.9.3 strict and
exact-optional semantics. It typechecked the mechanics fence separately and
used five `@ts-expect-error` cases to prove that an incomplete selection pair,
a mismatched knowledge ID, missing explicit options, invalid optional-present
`undefined`, and cross-key handle reuse remain rejected. A positive keyless
target fixture also compiled.

### Commands and exact results

```text
shasum -a 256 \
  scripts/research/factory-harness/provider-boundary.mjs \
  scripts/research/factory-harness/paired-selection-projection.mjs \
  scripts/research/factory-harness/typecheck-doc-api.mjs
  199a97f37ce00417285c8284d2822bc5f6fc21f514771fb19fa60e46dec5bf90  provider-boundary.mjs
  f729dde6b244c86188431a7e0fdef1cb3527e48361fe885f9e312f8617e2de76  paired-selection-projection.mjs
  566be136a11b41275717aeaa737c48488be7eb24230df471045876df1110957f  typecheck-doc-api.mjs

node scripts/research/factory-harness/provider-boundary.mjs
  {"angular":"20.3.29","formly":"6.1.8","transitiveInitializerCalls":1,
   "transitiveProductionFactoryCalls":1,"explicitBuilderDefaultApplied":"text",
   "unknownProviderRejected":true}

node scripts/research/factory-harness/paired-selection-projection.mjs
  {"equalAcrossScaffoldNonces":true,"retainedOptionValue":"Other",
   "lifecycleCalls":0,"callbackCalls":0,"incompletePairRejected":true}

node scripts/research/factory-harness/typecheck-doc-api.mjs
  {"typescript":"5.9.3","fences":4,"semanticDiagnostics":0,
   "expectedTypeErrors":5,"exactOptionalPropertyTypes":true,"strict":true}
```

Two failed intermediate attempts are also material evidence. A direct
`BrowserTestingModule` TestBed run first failed `NG0908` without Zone.js; after
Zone.js was added it failed because `document` was absent. This confirms that
the established TestBed path carries browser-test-platform requirements even
without mounting a component. The final provider spike deliberately avoided
claiming that path as the restricted host implementation.

### Spike conclusions and limits

- **Observation:** arbitrary NgModule import cannot satisfy the stronger
  provider invariant. One transitive initializer ran at injector creation and
  one transitive production provider factory ran at lookup.
- **Observation:** the pinned builder can apply core/type defaults while its
  field-facing injector rejects every non-synthetic token, and a non-root
  environment does not automatically materialize a `providedIn: 'root'`
  application service.
- **Observation:** two exact slot overrides can share one knowledge authority
  without projecting raw filtered rows. Removing either slot was rejected.
- **Observation:** the complete illustrative API/example now has zero semantic
  diagnostics under strict TypeScript 5.9.3; incomplete-pair and mismatched-ID
  `@ts-expect-error` cases are active. This is stronger than the earlier
  syntax-only fence check but remains a disposable research fixture.
- **Inference:** module-free and synthetic-value-only DI is necessary but not
  sufficient. Formly core still resolves executable field surfaces, so RH-02
  must stop before the builder rather than advertise a restricted host.
- **Deferred:** supported Formly initialization, executable-field policy,
  provider protocols, settling, and type-default equivalence belong to the
  separate Task 8 design and compatibility fixtures.
- **Unknown:** custom Formly extensions/providers and application-equivalent
  DI cannot be admitted while retaining the no-production-provider invariant.
- **Not proved:** OCI containment, malicious code resistance, complete
  projection, semantic type safety, async settling, or workplace compatibility.

## Adversarial negative-control spike after cross-model review

The Claude review's decisive proof obligation was prototyped in a disposable
Node script after the design was narrowed. The factory was intentionally
ordinary rather than malicious: it caught every callback, Observable,
TemplateRef, and fetch-facade error; filtered/mapped one array; interpolated a
scaffold nonce into presentation and the field `key`; reused the resulting
options at a second select; scheduled a closure that would mutate the returned
field; and captured an uncalled lifecycle closure. A module-private miniature
ledger recorded each trap before throwing. The scheduling facade recorded but
did not enqueue its closure. The projector rejected structural-identity taint
and the unreserved second options slot, then refused the artifact because the
ledger was nonempty.

Environment: Node `v22.22.1`, Darwin `25.5.0` arm64. Temporary file:
`scripts/research/factory-harness/adversarial-negative-control.mjs`, SHA-256
`2b74ee6cc5708718353edb9468cdf5657b2dc378a363301e3000e1294ec32aed`.
It is deleted at final packaging to preserve the one-artifact delivery rule.

```text
node scripts/research/factory-harness/adversarial-negative-control.mjs
  {"artifactPublished":false,
   "caughtViolationsStillRecorded":["FACTORY_CALLBACK_INVOKED",
   "FACTORY_OBSERVABLE_SUBSCRIBED","FACTORY_SIDE_EFFECT_BLOCKED",
   "FACTORY_TEMPLATE_REF_DEREFERENCED"],"lifecycleCalls":0,
   "scheduledMutationRan":false,"structuralIdentityRejected":true,
   "unreservedOptionsRejected":true}

shasum -a 256 \
  scripts/research/factory-harness/adversarial-negative-control.mjs
  2b74ee6cc5708718353edb9468cdf5657b2dc378a363301e3000e1294ec32aed
```

This proves only the record-before-throw and refusal algorithm in one process.
It does not prove that a Node preload can comprehensively wrap ESM built-ins,
that an OCI supervisor observes arbitrary syscalls, or that production target
identity/whole-tree projection is correct. Those remain item 5 retained-test
gates. It does show that caught exceptions need not erase supported harness
violations and that the proposed negative-control assertion is executable.

## Decision and implementation consequences

### Go/no-go

**Go** now for DTO/type specification and pure validation/projector work over
inert synthetic fixtures.

**No-go** for application factory execution until the code-free sidecar,
catch-resistant violation ledger, structural-identity gate, whole-tree
controlled-options refusal, and `oci-rootless-v1` conformance runner pass the
retained adversarial negative control. After that gate, approve a pilot that
publishes v0.4 contracts only from approved static/invariant declared inputs.
Named safe factory-input scenarios remain internal repeatability/projection
checks until a versioned schema adds controlled node evidence.

**No-go** for a generic auto-filler that invents empty arrays, false booleans,
no-op callbacks, fake templates, or plausible records and then treats factory
output as real contract structure or values. Construction probes are permitted
only for non-publishing feasibility/diagnostic runs.

**No-go** for adding factory execution directly to the current workspace/MCP
process or for running production providers/services to resolve inputs.

**No-go** for Angular/Formly resolution under RH-02, including the earlier
module-free restricted profile. DI restriction does not stop Formly from
executing expressions, validators, extensions, or captured closures, and a
copied JSON-safe type registry would drift from production. Application-
equivalent Task 8 is a separate evidence/security mode, not an alias for this
harness.

### Package ownership and dependency direction

| Layer | Owns | Allowed dependencies | Must not own/import |
| --- | --- | --- | --- |
| `@formly-contract/schema` | Versioned inert output DTOs, canonical value-domain/option split, diagnostic/provenance DTOs, validators, hashing | JSON-safe schema utilities only | Formly, Angular, RxJS, Node process/container APIs, application modules |
| `@formly-contract/compiler` | Child-only factory authoring types, binding/materialization validation, exact semantic-target grammar, binding-aware allowlisted projection | Schema; existing Formly peer boundary | Workspace config/discovery, OCI orchestration, Angular TestBed, production providers |
| `@formly-contract/workspace` | Code-free `FormFactoryRegistrationSidecar` discovery, exact parent-side validation, dependency-manifest staging, `oci-rootless-v1` preflight/orchestration, parent-owned publication | Schema and compiler output APIs; Node/OCI adapter | Evaluating TS/JS config on the factory path, importing application factory contracts in the parent, Angular DI/TestBed, MCP-time execution |
| planned `@formly-contract/angular` (Task 8, outside RH-02) | Application-equivalent Formly resolution, model/form-state composition, provider/settling protocols scoped to named scenarios, teardown, resolved evidence | Workspace source contracts, compiler and schema; Angular/Formly/RxJS peers | Claiming RH-02's no-production-service guarantee, weakening workspace containment, or rewriting raw factory evidence in place |
| application secondary entry point | `ChildFormFactoryContract<TOptions>`, the real factory reference, reviewed bindings/scenarios | Compiler authoring API and application-owned Formly types | Production service resolution, customer data, component bootstrap, parent-side registration execution |

The compiler API uses caller-supplied generic object types for Observable and
TemplateRef-shaped capabilities; it does not import RxJS or Angular merely to
create capture-only proxies. The planned Angular package may use those runtime
peers only in its separate contained Task 8 child. Package-import direction is
`angular -> workspace -> compiler -> schema`; neither workspace, compiler, nor
schema imports Angular. This matches ADR 0007 and Tasks 7A–8: the Angular
package consumes `FormContractSource`/future factory-source contracts and
returns a generic source/registration that the unchanged workspace runner can
validate and execute. This package direction does not authorize the RH-02
factory path to evaluate an application project config; its sidecar remains a
separate code-free input. Workspace never discovers or invokes Angular through
a parallel plugin protocol. This graph is acyclic and keeps Angular optional.

The factory contract still requires a child-only application secondary entry
point. The sidecar visible to workspace contains only stable JSON data,
including ID, option shape, and `StagedModuleReference`; the factory path does
not import the project config. A future Angular helper may correlate inert IDs
after RH-02 output exists, but executable factory/host symbols remain behind
the staged reference and their respective containment gates.

### Ordered implementation breakdown

1. **Approve concepts, exact boundaries, and schema mapping.** Decide that factory inputs, usage
   bindings, structural variants, future model/form-state scenarios, and
   observed evidence are separate contracts; usage completeness is reviewed
   application metadata; and probe runs cannot publish. Approve the code-free
   sidecar/child-only executable split, exact target plus key/type
   or keyless-ordinal corroboration, structural-identity prohibition,
   top-level-only v1 binding grammar, unique option-key/binding identity,
   exact optional-present semantics, per-binding variant assignments, v0.4
   paired-selection mapping, controlled-candidate non-publication,
   explicit RH-02 stop before Angular/Formly resolution, canonical
   `angular -> workspace` dependency direction, and stable diagnostics.
2. **Specify and typecheck DTOs before runtime code.** Add versioned
   internal/public types for the exact JSON/JSONC sidecar, inert registrations,
   keyed binding declarations, exact uses, keyed/keyless targets, variants,
   option shape, scenario identity, mixed/filtered provenance,
   redaction evidence, and generation metadata. Preserve canonical
   `JsonValue[]` domains and separate option presentation. Add compile-time
   authoring fixtures that semantically typecheck the complete API/example as
   one unit, including incomplete/mismatched selection-pair, stale key/type,
   optional-options, `optional?: T` versus `optional?: T | undefined`,
   declaration/key mismatch and reuse, keyless targets, and unsupported
   nested-binding negative cases, plus
   runtime exact-schema tests. Extend the
   architecture/spec/ADR only after maintainer approval.
3. **Implement pure binding validation/materialization with synthetic fixtures
   only.** Exact own-data
   schemas, mutation-recording immutable proxies, isolated mutable scenario
   copies, call-counted and record-before-throw capabilities, a module-private
   ledger abstraction, target validation, and safe diagnostic formatting. Add negative tests for
   accessors, sparse arrays, exotic values, primitive misuse, and leaks.
   This item may not import an application factory module.
4. **Make projection binding-aware with synthetic fixtures only.** Apply
   structural-identity checks before node IDs; semantic overrides at computed node IDs; require one knowledge ID's exact
   options/domain pair before bypassing raw option extraction; reject partial,
   mismatched, duplicate, stale-target, and competing authorities; reject every
   controlled unreserved option/domain slot; keep every controlled candidate
   internal under v0.4; block any publishable probe run; and ensure current
   hook/async diagnostics remain. Never sanitize
   the live tree into a misleading shape before identity computation. This
   item may use hand-built field trees but may not import application code.
5. **Prove `oci-rootless-v1` plus the violation preload, then build the runner.** First implement the
   fail-closed capability detector, pinned conformance image, and tool-owned
   ledger preload. Retain a negative control whose factory catches every
   callback/Observable/view/network denial, schedules a mutation, interpolates
   a scaffold into `key`, and reuses a collection at an unreserved select; all
   violations must remain visible and publication must fail. Only after it
   passes, produce and audit a dependency-only execution image; use shell-free
   spawn, ignored child text streams, sanitized env, schema-limited IPC,
   read-only mounts, no network/capabilities/privilege escalation, bounded
   PID/time/memory, Node deny rules, parent-owned writes, unconditional
   hard-kill cleanup, an empty sealed ledger requirement, and two-fresh-process
   repeatability and ambient-input guards. Prove blocked
   network/file/spawn, import-time
   effects, infinite loop, OOM/output, and sensitive-error cases.
6. **Integrate code-free workspace registration discovery.** Parse the
   conventional/CLI-selected `FormFactoryRegistrationSidecar` on a factory-only
   path that never evaluates TS/JS config. Keep the existing zero-argument
   source behavior separate. The parent must never import the referenced
   application contract. Preserve exact validation, provenance, and failure
   semantics.
7. **Design Angular/Formly resolution only as separate Task 8 work.** Do not
   implement a restricted RH-02 host. A future proposal must cover executable
   field surfaces, production type/default equivalence, scenario-scoped
   provider/settling protocols, model/formState clones, cleanup, and its
   application-equivalent evidence/security claim.
8. **Add realistic fixtures.** Cover a large heterogeneous top-level options
   object plus explicit nested-behavior rejection; immediate
   filter/sort/map; known `Other` plus dynamic remainder; called pure provider;
   caught forbidden callback/subscription/view/network access; scaffold-derived
   field key; one collection reused at two selects; structural flags; hooks;
   mixed and filtered domains; nondeterminism; and diagnostics without raw
   values.
9. **Gate workplace pilot.** Run in a credential-free checkout with an OS
   network sandbox. Publish only declared v0.4 artifacts; use controlled runs
   as internal diagnostics unless a separately approved schema revision adds
   controlled evidence. Measure binding/variant authoring burden and unsupported
   factory proportion before claiming scalability.
10. **Defer browser conformance.** Only a later observed evidence layer may
    verify mounted lifecycle, templates, remote readiness, and rendered values.

The next implementation gate is items 1–2: approve the corrected separation,
ownership, sidecar, paired-slot mapping, controlled-evidence non-publication,
exact optional/key identity, structural-identity rule, and explicit
Angular/Formly no-go, with typechecked fixtures.
Items 3–4 are pure library/test work over inert synthetic objects and may follow
that approval. **No application contract import, application integration test,
or factory-derived artifact is permitted until the containment preflight and
runner in item 5 pass.** Application-executing work starts at item 5, not by
extending the current `definition.create()` signature or importing a
function-valued descriptor in the parent.

## Traceability

| Acceptance | Decision/evidence | Verification | Status |
| --- | --- | --- | --- |
| RH02-A1: Concrete API/flow, alternatives, failures | Proposed generic API, compile flow, alternatives/failure modes | Static reconciliation against current source/compiler APIs | Met |
| RH02-A2: Functions, filtered arrays, interpolated scalars, lifecycle closure; no scaffold output | Original bounded experiment, paired-selection spike, and adversarial negative control | Two-nonce semantic equality; zero lifecycle/callback counters; incomplete pair, scaffold key, caught violations, scheduled mutation, and second unreserved options slot rejected | Met within bounded scope |
| RH02-A3: Security/determinism rules and diagnostics | Threat model, violation-ledger design, and diagnostic table | Source-backed design review and miniature catch-resistant ledger spike; production containment not implemented | Design met; production proof deferred |
| RH02-A4: Recommendation, confidence, unknowns, ordered implementation | Go/no-go, unknowns, confidence, breakdown | Maintainer decision remains | Met |
| RH02-NG1: No production/shared architecture/spec/plan changes | Only this research artifact retained | `git status`, `git diff --check`, explicit temporary-path check | Met |
| RH02-DG1: Enforce the Angular/Formly execution boundary | RH-02 stops before the builder; all resolved evidence is separate Task 8 work | Tasks 1–2 and 7; provider spike plus source review of executable Formly surfaces | Explicit no-go selected |
| RH02-DG2: Preserve exact `options` and `valueDomain` authority | One knowledge record, two mandatory exact uses, raw readers bypassed only for those slots | Tasks 1–4; paired-selection spike and future schema/projector negative tests | Design and miniature algorithm observed; production proof pending |
| RH02-DG3: Match canonical package direction | `angular -> workspace -> compiler -> schema`, no reverse Angular import or parallel plugin protocol | Tasks 1, 6, and 7; ADR 0007/Tasks 7A–8 reconciliation plus dependency audit | Design reconciled; package not implemented |
| RH02-DG4: Gate all application execution on containment | Code-free sidecar replaces TS config discovery; items 3–4 are inert-only; imports start only after item 5 passes | Tasks 1–6; sidecar/import-boundary tests and OCI preflight evidence | Order explicit; runtime gate pending |
| RH02-DG5: Make caught violations fail closed | Module-private record-before-throw ledger; parent requires an empty sealed summary | Tasks 3, 5, and 8; adversarial negative-control spike and future retained child-runner test | Miniature mechanic observed; production proof pending |
| RH02-DG6: Represent controlled evidence honestly | v0.4 publishes declared artifacts only; controlled runs remain internal until a versioned schema adds controlled evidence and consumer semantics | Tasks 1–4 and 9; schema/API negative tests before any controlled publication | Explicit non-publication gate selected |

## Confidence and limitations

| Claim | Confidence | Reason |
| --- | ---: | --- |
| Real synchronous factories can be reused without components | 0.95 | Direct experiment and existing zero-argument factory corpus |
| Approved inputs plus paired exact target overrides can prevent raw scenario options/domains from entering an accepted internal candidate | 0.84 | Miniature two-nonce projector passed and incomplete pairs failed; production projector and usage completeness remain unproven; v0.4 publication is forbidden |
| Tagged strings catch direct/interpolated leaks | 0.95 | Two-nonce experiment |
| Automatic generic primitive taint would be safe | 0.15 | JavaScript primitive provenance is lost |
| Staged `oci-rootless-v1` process-per-input is the correct first cleanup boundary | 0.82 | Required controls/refusal are concrete, but the conformance image and workplace import remain unproven |
| Proposed domain union represents requested knowledge states without duplicating v0.4 option authority | 0.92 | Values/presentation are separate and their coordinated exact projections now have one knowledge identity; schema review remains |
| RH-02 must stop before Angular/Formly resolution | 0.93 | Provider spike and installed Formly source show DI restriction does not bound executable field expressions/validators/extensions |
| A module-private record-before-throw ledger can survive ordinary `try/catch` | 0.90 | Adversarial miniature recorded callback/Observable/view/network/scheduling attempts and refused publication; production preload/OS integration remains unproven |
| Canonical Angular/workspace package graph is acyclic | 0.95 | ADR 0007 and Tasks 7A–8 explicitly support Angular consuming workspace contracts with no reverse Angular dependency |
| Node permission model alone is sufficient isolation | 0.20 | Official limitations and shared host risks require OS defense |
| Workplace corpus is covered with acceptable authoring cost | 0.50 | No workplace factory was executed or measured |

The largest remaining risks are import-time side effects outside the supported
preload surface, production integration of the code-free sidecar and sealed
ledger, authoring burden for large option interfaces, structural variants
hidden behind unclassified primitives, and the intentionally unsupported
nested-binding corpus. Angular/Formly initialization and async settling are
separate Task 8 risks, not RH-02 implementation gates.

Evidence that would change the recommendation:

- a workplace sample showing that most factories require live DI/services
  before returning any structure would narrow the go to static indexing or a
  hosted browser capture;
- an `oci-rootless-v1` conformance/workplace prototype that cannot load the
  staged Angular/Formly dependency closure would keep executable generation at
  no-go and require a different explicitly reviewed containment backend;
- unacceptable per-form usage/variant metadata burden would favor refactoring
  factories into pure structural inputs plus separately declared provider
  contracts;
- a safe, auditable language/runtime provenance mechanism could reduce explicit
  usage declarations, but should not change evidence separation.

### Independent review remediation

Independent-review instance 1 returned `Not ready`. Its blind findings were
reconciled with a separate author explanation; the explanation confirmed the
gaps rather than dismissing them. This revision addresses them as follows:

| Review finding | Resolution in this revision | Remaining proof |
| --- | --- | --- |
| Function-valued descriptor could import before containment | Split inert `FormFactoryRegistration` from child-only `ChildFormFactoryContract`; exact staged module/manifest bytes load only after preflight/containment | Implement and attack-test parent inventory/staging without application imports |
| Factory domain duplicated v0.4 option authority | `FactoryValueDomain` contains only `JsonValue`; `FactorySelectionKnowledge.options` is separate; mapping to v0.4 is explicit and conservative | Approve/version DTOs and golden migrations before implementation |
| Semantic targets were too coarse | Replaced category strings with discriminated exact presentation/state/value/default/locator slots and unique-target validation | Typechecked authoring fixtures plus projector conflict/missing-target tests |
| Correlated structural flags could not share a dimension | Each dimension now owns a binding-ID-to-value assignment map | Runtime exact/canonical assignment validation and realistic multi-flag fixture |
| Required `T | undefined` keys could be absent | `OptionalKey<T>` tests key optionality; child `optionShape` supplies erased runtime authority | Runtime negative tests for missing/extra/symbol/numeric/absent keys |
| OS containment was unselected | Selected mandatory `oci-rootless-v1`, exact controls, conformance preflight, provenance, diagnostics, and no unsafe fallback | Build/run the pinned conformance image locally and in CI before any application import |
| Package ownership was undecided | Added an explicit schema/compiler/workspace/planned-Angular/application ownership and dependency matrix | Maintainer approval and enforcement through package manifests/import-boundary tests |

The optional-key and per-binding dimension TypeScript mechanics were checked
after this revision with TypeScript 5.9.3 under `--strict` and
`--exactOptionalPropertyTypes`. Positive cases compiled; `@ts-expect-error`
cases confirmed that required keys (including `string | undefined`) cannot use
the absent handle and cannot be listed as optional. The temporary typecheck
file was deleted. This test did not typecheck the entire illustrative API or
prove runtime validation/containment at remediation commit `1973bad`. The
follow-up `typecheck-doc-api.mjs` spike above supersedes the full-API typecheck
gap for the current document, but remains non-retained test evidence and still
does not prove runtime validation/containment.

### Independent-review instance 2 remediation

Independent-review instance 2 also returned `Not ready`. Its blind preliminary
ledger was frozen before it received the author explanation. The explanation
confirmed all four findings rather than contesting them. This revision treats
the two P1 findings as immediate API-gate blockers and records the two P2
corrections directly in ownership/order:

| Review finding | Resolution in this revision | Remaining proof |
| --- | --- | --- |
| Angular host had a denylist but no enforceable positive provider boundary | Removed arbitrary host imports/providers; selected a module-free pinned core profile, exact synthetic value/protocol bindings, null-parent environment, rejecting injector, and explicit unsupported cases | Retained version-specific compatibility fixture; reject unknown/optional/root tokens and every unsupported provider/config form |
| Selection knowledge mixed an exact `value-domain` target with separate `options` projection | One knowledge ID now requires two coordinated exact uses, one per public slot; raw option/domain readers are bypassed only after pair validation | Full API type fixture plus production projector conflict/missing/mismatch tests |
| Angular/workspace dependency direction conflicted with ADR 0007 | Replaced the undefined plugin boundary with `angular -> workspace -> compiler -> schema`; workspace has no Angular import | Package manifests and import-boundary audit when the Angular package is implemented |
| Items 3–4 appeared to execute before containment despite item 5 wording | Marked items 3–4 inert synthetic-only and stated the hard prohibition on application imports/integration before item 5 passes | CI/import-boundary test and OCI conformance evidence |

The follow-up provider and paired-selection spikes above were added because the
two P1 changes assert runtime mechanics that prose alone could not establish.
They support the chosen direction but deliberately do not mark the production
tasks complete.

## Doubt register and adversarial reconciliation

The non-trivial claim to challenge is:

> Explicit usage bindings plus process isolation and taint-aware allowlisted
> projection are sufficient to invoke real factory structure without allowing
> construction scaffolds or live behavior to become semantic evidence.

The earlier revision received three bounded fresh-context adversarial passes.
After independent-review instance 2, a new fresh-context remediation pass was
run against only this artifact and the RH-02 contract, followed—with explicit
user authorization—by a Claude Code 2.1.246 / Claude Opus cross-model review
using `--safe-mode`, no tools, no session persistence, and only the artifact
plus acceptance/review contract on stdin.

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

The later remediation pass and Claude review converged on two blocking defects
and exposed additional boundary inconsistencies. Earlier Angular/finite-
provider resolutions in the historical tables above are therefore superseded
by the narrower final design.

| Later finding | Source | Classification | Final reconciliation |
| --- | --- | --- | --- |
| Trap exceptions and OS denials can be caught, erasing diagnostics | Both | Valid + blocking | Added a module-private record-before-throw ledger, empty sealed-summary publication gate, explicit supported-surface limit, and adversarial negative-control spike |
| TS project config executes application code before containment | Both | Valid + blocking | Replaced project-config inventory with an exact code-free JSON/JSONC sidecar; factory path never evaluates TS/JS config |
| Restricted Formly builder still executes expressions/validators/extensions/closures | Remediation pass; reinforced by Claude type-registry drift finding | Valid + blocking | Removed `AngularScenarioHost`, finite Observable resolution, and resolved evidence from RH-02; deferred all builder work to Task 8 |
| Selection pair allowed optional options/domain-only ambiguity | Remediation pass | Valid + actionable | `FactorySelectionKnowledge.options` is required; domain-only values use `scenarioValue`, not `controlledCollection` |
| Provider/settling protocols were global and unscoped | Remediation pass | Valid + actionable | Removed them from RH-02; future Task 8 must scope protocols per named resolved composition |
| Pending-task requirement was not implementable without a tracker | Remediation pass | Valid + actionable | Removed quiescence/pending-task claims; guarded scheduling records supported calls and the child is always terminated |
| Structural key/type/order were neither projectable nor tested | Claude | Valid + blocking grammar defect | Made structural identity non-projectable, added pre-node-ID rejection and mandatory probe/delta checks, and exercised scaffold-derived `key` rejection |
| Controlled rows could reach a second unreserved options slot | Claude | Valid + actionable | Controlled mode now refuses every unreserved options/domain slot across the whole tree; negative control reuses one collection at two selects |
| Nested option leaves bypass top-level classification | Claude | Valid + actionable support limit | Selected an explicit top-level-only v1; nested behavioral/structural leaves fail closed instead of receiving whole-object approval |
| Deep freeze can silently fail in sloppy code | Claude | Valid + actionable | Immutable inputs use mutation-recording proxies before throwing; fresh mutable copies remain explicit controlled inputs |
| Hand-authored node IDs can retarget after drift | Claude | Valid + actionable | Exact targets now require expected key/type corroboration and mismatch diagnostics |
| Registration type lacked the option shape checked in compile flow | Claude | Valid + actionable | Added JSON-safe sidecar `optionShape` and canonical parent/child equality |

Final independent-review instance 3 of 3 then returned `Not ready`. Its blind
ledger was frozen before the author explanation and it verified the exact
worktree/canonical sources. The four remaining findings were accepted:

| Independent-review instance 3 finding | Classification | Final resolution |
| --- | --- | --- |
| v0.4 has no honest node evidence for controlled factory artifacts | Valid + blocking | Controlled scenarios are now compiler-internal candidates only; v0.4 publishes declared inputs. Public controlled publication requires a versioned evidence/provenance/validation/hash/migration/consumer change first |
| `BoundOptions` allowed present `undefined` for `optional?: T` under exact optional semantics | Valid + actionable | Present handles use `Required<TOptions>[Key]`; five-case typecheck distinguishes absence, `optional?: T`, `optional?: T | undefined`, and required `T | undefined` |
| A binding declaration was not uniquely tied to one option key | Valid + actionable | Handle/declaration brands carry the literal option key; materialization requires a unique canonical key-to-binding map and rejects cross-key reuse; the map is hashed |
| Mandatory `expectedKey` excluded positional keyless Formly nodes | Valid + actionable | Target identity is a discriminated keyed value or keyless source ordinal path, with optional type corroboration |

This exhausted the configured three-instance independent-review bound. The
accepted corrections receive focused self-verification below, but no fourth
independent readiness verdict is claimed.

The reconciled claim is deliberately smaller:

> After its retained negative-control gate passes, a staged, isolated harness
> can publish exact artifact-safe declared inputs
> while evaluating named artifact-safe controlled scenarios internally and
> keeping reviewed capture-only behavior inert.
> Meaningless construction probes establish feasibility only and produce no
> semantic artifact. Reviewed usage/variant metadata remains application-owned
> authority whose completeness is not automatically proven.

The final doubt stop condition was convergence: the local remediation pass and
Claude agreed on both blockers, every substantive finding was classified, and
the highest-risk catch/identity/reuse mechanic received a bounded negative
control. Independent review subsequently found and closed the controlled-
evidence/API identity gaps above; the next uncertainty is the retained
production preload/OCI experiment in implementation item 5.

## Original verification record

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

## Independent-review remediation verification

```text
docker --version
  Docker version 29.7.2, build a7dcaa6

docker run --help | rg --
  --network|--read-only|--cap-drop|--pids-limit|--memory|--security-opt|
  --tmpfs|--user|--userns
  exit 0; every required command-surface flag was present

node --version
  v22.22.1

node --help | rg --
  --permission|--allow-fs-read|--allow-fs-write|--allow-child-process|
  --allow-worker|--allow-addons
  exit 0; permission flags present; no network permission flag observed

pnpm exec tsc --noEmit --strict --exactOptionalPropertyTypes \
  --skipLibCheck --target ES2022 --module NodeNext \
  --moduleResolution NodeNext /private/tmp/factory-harness-types.ts
  exit 0; positive cases and @ts-expect-error negative cases passed
  temporary file deleted after the run

TypeScript transpile diagnostics over every retained TypeScript fence
  4 TypeScript fences parsed; 0 syntax errors

pnpm check:docs
  Documentation checks passed for 57 files.

git diff --check
  exit 0; no output

git status --short --branch
  ## codex/rh-02-factory-harness-research
   M docs/research/hardening/factory-harness-and-value-semantics.md
```

The remediation remains documentation-only. It does not claim that the full
illustrative API, rootless OCI conformance image, staging algorithm, projector,
or runtime runner has been implemented or proven.
The modified status above was captured immediately before packaging this
remediation; the post-commit worktree was clean.

## Final hardening verification record

The last design revision, cross-model reconciliation, and independent-review
instance 3 remediation ran from branch
`codex/rh-02-factory-harness-research` at pre-packaging HEAD
`1973bad9c8a92e01dd3fb5af7e9f47f29949af24`.

```text
node scripts/research/factory-harness/provider-boundary.mjs
  {"angular":"20.3.29","formly":"6.1.8",
   "transitiveInitializerCalls":1,"transitiveProductionFactoryCalls":1,
   "explicitBuilderDefaultApplied":"text","unknownProviderRejected":true}

node scripts/research/factory-harness/paired-selection-projection.mjs
  {"equalAcrossScaffoldNonces":true,"retainedOptionValue":"Other",
   "lifecycleCalls":0,"callbackCalls":0,"incompletePairRejected":true}

node scripts/research/factory-harness/typecheck-doc-api.mjs
  {"typescript":"5.9.3","fences":4,"semanticDiagnostics":0,
   "expectedTypeErrors":5,"exactOptionalPropertyTypes":true,"strict":true}

node scripts/research/factory-harness/adversarial-negative-control.mjs
  {"artifactPublished":false,
   "caughtViolationsStillRecorded":["FACTORY_CALLBACK_INVOKED",
   "FACTORY_OBSERVABLE_SUBSCRIBED","FACTORY_SIDE_EFFECT_BLOCKED",
   "FACTORY_TEMPLATE_REF_DEREFERENCED"],"lifecycleCalls":0,
   "scheduledMutationRan":false,"structuralIdentityRejected":true,
   "unreservedOptionsRejected":true}

pnpm exec vitest run packages/schema/src/contract.test.ts
  Test Files  1 passed (1)
  Tests       79 passed (79)

pnpm check:docs
  Documentation checks passed for 57 files.

git diff --check
  exit 0; no output

test ! -e scripts/research/factory-harness/provider-boundary.mjs
test ! -e scripts/research/factory-harness/paired-selection-projection.mjs
test ! -e scripts/research/factory-harness/typecheck-doc-api.mjs
test ! -e scripts/research/factory-harness/adversarial-negative-control.mjs
  all exit 0

git status --short --branch
  ## codex/rh-02-factory-harness-research
   M docs/research/hardening/factory-harness-and-value-semantics.md

```

The four scripts were deliberately disposable and were deleted only after the
recorded hashes and final results above. The sole retained change remains this
research artifact. Adding this verification record changed only documentation;
`pnpm check:docs` and `git diff --check` are rerun once more before commit.

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
- pinned installed Angular 20.3.29 injector implementation under
  `node_modules/.pnpm/@angular+core@20.3.29*/node_modules/@angular/core/fesm2022/`
- pinned installed Formly 6.1.8 core implementation and declarations under
  `packages/compiler/node_modules/@ngx-formly/core/`
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
- Angular transitive provider collection:
  <https://angular.dev/api/core/importProvidersFrom>
- Angular injector hierarchy/provider flattening:
  <https://angular.dev/guide/di/hierarchical-dependency-injection>
- Angular environment initializers:
  <https://angular.dev/api/core/provideEnvironmentInitializer>
- Angular `InjectionToken` identity/default factories:
  <https://angular.dev/api/core/InjectionToken>
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
- Docker container run controls:
  <https://docs.docker.com/engine/containers/run/>
- Docker `none` network driver:
  <https://docs.docker.com/engine/network/drivers/none/>
- Docker rootless mode:
  <https://docs.docker.com/engine/security/rootless/>
