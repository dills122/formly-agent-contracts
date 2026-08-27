# RH-04: Form Rules, Callbacks, Lifecycle Hooks, and Cross-Field Effects

**Status:** research complete; production changes not implemented

**Decision:** conditional go for a normalized, evidence-bearing behavior graph;
no-go for treating arbitrary callback or hook source as an authoritative effect
graph

## Executive recommendation

Formly configuration contains enough reliable information to generate useful
positive and negative E2E scaffolds, but not enough to recover every workplace
behavior automatically. The valuable boundary is:

1. Normalize a small, specified expression grammar and static field state as
   **derived** rules. A derived rule can propose branch scenarios only when its
   paths resolve to stable contract nodes, every generated source input is
   witnessed by a declared/scenario value or the node's resolved domain, and
   its result is one of the bounded E2E facets described below.
2. Emit **review scaffolds**, never operational effects, for callback-shaped
   properties, direct control mutations, subscriptions, helpers, aliases, and
   other executable surfaces. A scaffold records only facts visible without
   execution.
3. Use named, isolated trusted scenarios to record **scenario** outcomes. A
   scenario establishes that a state was reached for that input; it does not
   establish causality, global completeness, or whether an option change was a
   load versus a filter.
4. Use browser/runtime traces as **observed** conformance evidence for visited
   paths. Observation can validate a declaration or scenario expectation but
   cannot invent unvisited branches.
5. Require a minimal **declared** behavior when an E2E author needs ordering,
   semantic effect kind, readiness, lifecycle scope, or repeater activation and
   those facts are not already guaranteed by a field profile or bounded rule.

This is high-value even if automatic coverage is modest. An E2E author needs a
source operation/value, target expectation, access prerequisites, and a
readiness condition. They do not need callback source, RxJS operator names,
subscription variables, or an approximate whole-program call graph.

The existing v0.4 explicit-effect registry remains the correct authority for
`loads`, `filters`, `clears`, state control, readiness, and ordering. The next
schema should generalize its target facets and evidence model rather than infer
more semantics from executable source.

## Question, scope, and method

The question is which behavior encoded in real Formly configurations can be
captured reliably enough to guide positive and negative E2E tests.

The review covered:

- current schema, compiler, effect resolver, workspace configuration, trusted
  scenarios, field profiles, repeaters, and realistic test-app fixtures;
- the v0.4 cross-field-effects research and accepted trusted-scenario boundary;
- pinned Formly 6.1.8 declarations and runtime bundles after a frozen install;
- official Formly v6 expression/API/migration documentation, Angular Reactive
  Forms documentation, and RxJS documentation; and
- a bounded TypeScript-AST and differential-state experiment retained at
  `scripts/research/form-effects/form-effects.test.mjs`.

The experiment intentionally does not execute source extracted from the
application. It parses supplied research snippets, emits conservative mutation
candidates, and separately executes hand-owned probes to show the difference
between syntactic evidence and an observed outcome.

## Evidence discipline

The proposed terms have fixed meanings:

| Evidence | What it proves | Authority |
| --- | --- | --- |
| `declared` | The application owner asserts normalized source, target, outcome, timing, and completeness | Actionable after schema/reference validation |
| `derived` | A bounded adapter rule deterministically normalized supported inert syntax or static configuration | Actionable only for the exact normalized rule; otherwise candidate |
| `scenario` | A named controlled compilation produced a particular state for explicit inputs | Scenario-local candidate or expectation |
| `observed` | A runtime/browser trace saw a transition on one visited path | Conformance evidence, never global completeness |

`resolved`, used by the current schema, describes a materialized field value,
not how its behavioral claim was obtained. The behavioral model should call
this evidence `scenario` and retain the scenario ID.

Facts, inferences, and unknowns are kept separate throughout this artifact.

## Documented and pinned facts

1. Formly v6 expressions may be strings, functions, or supported reactive
   values and assign a named field property. Conditional visibility uses
   `expressions.hide`. [Formly v6 expressions](https://v6.formly.dev/docs/guide/expression-properties/)
2. Hidden fields reset their model value by default unless field or global
   reset-on-hide configuration disables that behavior. Visibility and value
   reset must therefore remain distinct facts. [Formly v6 expressions](https://v6.formly.dev/docs/guide/expression-properties/#2-conditional-rendering)
3. `options.fieldChanges` reports the affected field, expression-change type,
   target property, and evaluated value. It does not report the upstream model
   path or a business effect verb. [Formly v6 expression changes](https://v6.formly.dev/docs/guide/expression-properties/#3-get-notified-about-an-expression-changes)
4. The public Formly config surface includes `expressions`, legacy
   `expressionProperties`, `hideExpression`, `hooks`, validators, parsers,
   `fieldArray`, `formControl`, and template-owned `props`. It exposes no
   application effect graph. [Formly v6 core API](https://v6.formly.dev/docs/api/core/)
5. Formly v6 enables lazy rendering and reset-on-hide by default, so a hidden
   field may be absent from the DOM and its value may be removed. [Formly v6 migration](https://v6.formly.dev/docs/guide/migration/#5-lazy-render-is-enabled-by-default)
6. Angular `valueChanges` emits for UI and programmatic changes and also for
   enable/disable unless `emitEvent: false`; child emission occurs before the
   parent value is updated. Source/ordering claims based only on a subscription
   body can therefore be wrong. [Angular `AbstractControl`](https://angular.dev/api/forms/AbstractControl#valueChanges)
7. Angular requires `updateValueAndValidity()` after runtime validator changes;
   the method recalculates status and by default propagates to ancestors and
   emits events. [Angular form validation](https://angular.dev/guide/forms/form-validation#triggering-validation-updates)
8. `markAsTouched()` changes interaction state and may emit a touched event; it
   is not a validation rule. [Angular `AbstractControl`](https://angular.dev/api/forms/AbstractControl#markAsTouched)
9. RxJS pipelines can suppress, delay, replace, cancel, or terminate emissions.
   For example, `distinctUntilChanged` compares against the previously emitted
   value, while subscription cleanup runs finalizers. Operator presence is not
   an E2E-ready timing contract. [RxJS `distinctUntilChanged`](https://rxjs.dev/api/operators/distinctUntilChanged) and [RxJS `Subscription`](https://rxjs.dev/api/index/class/Subscription)
10. In pinned Formly 6.1.8, `props.change` is invoked by the Formly attributes
    directive for its bound DOM change event. Custom templates may instead own
    or omit invocation. The same pinned runtime automatically subscribes to an
    Observable returned by `onInit`, `afterContentInit`, or `afterViewInit` and
    unsubscribes those subscriptions before invoking `onDestroy`. These are
    pinned-package observations, not cross-version guarantees. Versioned source:
    [Formly attributes](https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/templates/formly.attributes.ts),
    [field lifecycle](https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/components/formly.field.ts),
    and [field configuration](https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/models/fieldconfig.ts).

## Workplace examples and capability matrix

The category indicates the strongest safe default output. A later declared or
observed record may supplement it, but does not retroactively change what the
static construct proves.

| Representative construct | Safe extraction | Default category | E2E value and boundary |
| --- | --- | --- | --- |
| Static `required`, `readonly`, `disabled`, `hide`, or options | Exact target state/domain | **automatic** | Direct initial-state expectations |
| Modern string `expressions` using a literal model path, comparison, boolean operators, and JSON literal | Normalized condition, resolved source node, target facet, polarity | **automatic** per branch after grammar/path normalization and a valid input witness | Positive/negative scaffolds are independent; no arbitrary calls, writes, or invented values |
| Legacy string `hideExpression` / `expressionProperties` in the same bounded grammar | Same normalized rule, with legacy provenance and pinned precedence | **automatic** per witnessed branch | Same value as modern expressions; source form is provenance only |
| `Other` branch expressed as `model.reason === 'Other'` for both visibility and required | Two rules sharing one guard; only domain/declared/scenario-backed source inputs | **automatic** when each emitted branch has a valid input witness | A known `Other` option can witness the positive branch; a different known option is required for the negative branch |
| `Other` branch expressed as a function or helper | Opaque rule target plus suggested scenario inputs | **scenario-resolvable** | Named scenarios can prove reached visibility/required states, not global predicate semantics |
| Function/Observable expression assigning visibility, required, readonly, enabled, or options | Owning node, target property, executable surface, unknown dependencies | **scenario-resolvable** | Initial or named scenarios may materialize the target state |
| Inline `change` / `optionSelected` with direct literal `get('x').updateValueAndValidity()` | Trigger surface and candidate target/mutation | **scaffold-only** | Useful declaration review prompt; widget invocation, aliases, guards, propagation, and timing remain unknown |
| Inline callback assigning a literal target's option collection | Candidate target and assignment shape | **scaffold-only** | Never infer `loads` versus `filters`; scenario delta can show the resulting set |
| Inline helper call, alias, destructuring, imported symbol, service call, closure, or computed `get(path)` | Declaration location and opacity dimensions | **scaffold-only** | Whole-program interpretation is intentionally unsupported |
| External callback reference such as `callbacks.updateCaseTypes` | Callback property and symbol spelling only | **explicit-only** | Names imply nothing; declare target/kind/readiness if ordering matters |
| Option set differs between isolated product scenarios | Source input pair and scenario-local target delta | **scenario-resolvable** | Can generate per-product choices; cannot claim load/filter/causality/completeness |
| Runtime `fieldChanges`, Angular control event, or browser trace | Visited target transition with timestamp/step and actual state | **observed-only** | Validates reachable outcome and readiness on the visited path |
| `hooks.onInit` directly subscribing to literal sibling/parent `valueChanges` | Candidate source, subscription phase, candidate mutations in direct subscriber | **scaffold-only** | Pipeline, initial emission, renderer lifecycle, aliases, and cleanup require declaration/observation |
| `onInit` returning an Observable plus Formly-owned teardown | Lifecycle scope and pinned auto-cleanup convention | **observed-only** for an app | Pinned source suggests cleanup, but the application build must prove the hook is rendered and destroyed |
| Manual subscription stored in an alias and unsubscribed in `onDestroy` | Hook presence and possible cleanup pair | **scaffold-only** | Alias identity and every termination path are not safe static authority |
| `markAsTouched`, `markAsUntouched`, `setErrors`, validator mutation, or revalidation | Candidate state/validity mutation and literal target when direct | **scaffold-only** | These are distinct E2E facets and must not be collapsed into `required` |
| Object `fieldArray` template | Array structure and child template | **automatic** | Describes potential children, not how a runtime row becomes reachable |
| Function `fieldArray` | Dynamic-array opacity and owning array node | **scenario-resolvable** | Named row scenarios may materialize structure; global shape remains unknown |
| Repeater profile with declared add/expand parts and operations | `add-item` / `expand-item` access prerequisite | **automatic** from the declared profile | Planner may add/expand before targeting a child |
| Unprofiled or custom expandable repeater | Structural array plus unknown access sequence | **explicit-only** | Browser observation can inform review but cannot make a stable driver contract |

There is one deliberate nuance: a construct can be scenario-resolvable for a
target outcome while remaining explicit-only for operational semantics. An
option delta can prove “these options existed in scenario B”; only a declaration
can safely say “product filters case type asynchronously and is ready when X.”

## Bounded experiment results

The focused suite contains six tests and passed as follows:

```text
pnpm exec vitest run scripts/research/form-effects/form-effects.test.mjs

Test Files  1 passed (1)
Tests       6 passed (6)
```

The callback analyzer first compiles each supplied research snippet with
Node's JavaScript parser without running it, then performs TypeScript-AST
candidate analysis only if the snippet is valid JavaScript. Malformed syntax
and TypeScript-only parameter annotations are rejected before candidate
extraction. The separate `Other` probe executes only a hand-owned bounded
expression and compares the normalized evaluator with the installed Formly
6.1.8 string evaluator.

### `Other` visibility and required branch

The bounded parser normalized `model.reason === 'Other'` to strict equality on
the `reason` path. Both the normalized evaluator and pinned Formly evaluator
produced the same results for two values from the declared research domain:

| Input | Details visible | Details required |
| --- | ---: | ---: |
| `reason = "Transfer"` | false | false |
| `reason = "Other"` | true | true |

The retained witness records identify the source node, `select-option`
operation, value-domain index, value, and boolean outcome. This is sufficient
derived evidence for those exact domain-backed branches. Without a known
non-`Other` domain value, the negative branch is not generated; the compiler
must never synthesize an arbitrary alternative. This test does not prove that
these are the only possible outcomes of an arbitrary function predicate.

### Direct revalidation callback

The AST experiment recognized the literal chain
`get('dependent').updateValueAndValidity()` and emitted a candidate target and
mutation plus contextual unknowns for invocation wiring, stable node
resolution, timing/readiness, and feedback. Executing the hand-owned callback
incremented the dependent probe's revalidation count from zero to one.

The static candidate is useful but not authoritative: it does not prove which
custom widget fires the callback, whether a guard bypasses the call, whether
aliases change the target, whether emitted events cause a cycle, or when async
validators settle.

### Indirect update callback

For `externalCallbacks.updateCaseTypes`, the analyzer emitted only
`implementation-outside-declaration`. A controlled execution changed options
from `['basic']` to `['special-a', 'special-b']`.

This shows the intended split. The factory can safely scaffold review of the
external symbol. The scenario can retain its option set. Neither fact reveals
whether the callback loaded, filtered, cached, replaced, or merely exposed the
options, so the operational effect is explicit-only.

### Lifecycle subscription and cleanup

For a direct `onInit`-shaped subscription to `valueChanges`, the AST experiment
found the literal source control's `valueChanges` stream and literal dependent
targets for `markAsTouched()` and `updateValueAndValidity()`. It also reported
helper/pipeline and lifecycle semantics as unknown. A computed source lookup is
refused. The emitted control key is review syntax, not a stable contract node
ID; compiler path normalization is still required. The runtime probe observed
one touched/revalidation mutation before teardown and no further mutation after
unsubscribe; observer count fell from one to zero.

This proves the mechanics of the research example, not a general Formly hook
contract. A trusted `FormlyFormBuilder.build()` does not by itself render the
field component and trigger renderer lifecycle hooks. Lifecycle behavior needs
a rendered Angular scenario or browser observation, plus an explicit effect if
test ordering depends on it.

### Helpers and aliases

The analyzer refused both `revalidateDependent(field)` and a local alias
followed by `dependent.updateValueAndValidity()`. Adding symbol resolution could
increase candidate coverage, but would introduce imports, overloads, closures,
DI, higher-order functions, and build-configuration dependence without making
the semantic claim authoritative. The recommended implementation stops at a
review scaffold.

## Proposed normalized behavior model

Use one normalized, discriminated record family for the planner-facing behavior
graph. A causal edge and an acausal target-state snapshot are different members
of that family: scenarios and observations may establish state without
inventing a trigger, while rules, explicit effects, lifecycle hooks, and
repeater profiles may establish edges. Store evidence separately from the
semantic core and require kind-specific evidence identifiers.

```ts
type BehaviorFacet =
  | 'visibility'
  | 'required'
  | 'readonly'
  | 'enabled'
  | 'options'
  | 'value'
  | 'validity'
  | 'touched'
  | 'reachability';

type BehaviorInputOperation =
  | 'fill'
  | 'check'
  | 'select-option'
  | 'select-from-overlay'
  | 'type-and-pick'
  | 'select-row';

type BehaviorInputWitnessEvidence =
  | {
      readonly kind: 'domain';
      readonly contractHash: string;
      readonly nodeId: string;
      readonly valueIndex: number;
    }
  | {
      readonly kind: 'declared-case';
      readonly registryId: string;
      readonly registryVersion: number;
      readonly declarationId: string;
      readonly declarationVersion: number;
    }
  | {
      readonly kind: 'scenario';
      readonly scenarioId: string;
      readonly scenarioVersion: number;
    };

interface BehaviorRuleCase {
  readonly id: string;
  readonly outcome: boolean;
  readonly inputs: readonly [
    {
      readonly nodeId: string;
      readonly operation: BehaviorInputOperation;
      readonly value: JsonValue;
      readonly evidence: BehaviorInputWitnessEvidence;
    },
    ...{
      readonly nodeId: string;
      readonly operation: BehaviorInputOperation;
      readonly value: JsonValue;
      readonly evidence: BehaviorInputWitnessEvidence;
    }[],
  ];
}

type BehaviorTrigger =
  | {
      kind: 'node-event';
      nodeId: string;
      event: 'valueChanged' | 'selectionChanged';
    }
  | {
      kind: 'rule';
      ruleId: string;
      cases: readonly [BehaviorRuleCase, ...BehaviorRuleCase[]];
    }
  | {
      kind: 'lifecycle';
      nodeId: string;
      phase: 'onInit' | 'afterContentInit' | 'afterViewInit' | 'onDestroy';
    }
  | {
      kind: 'profile-operation';
      nodeId: string;
      part: string;
      operation: 'click' | 'check' | 'add-item' | 'expand-item';
    };

type BehaviorTransition =
  | 'sets-state'
  | 'controls-state'
  | 'toggles'
  | 'loads'
  | 'filters'
  | 'clears'
  | 'revalidates'
  | 'marks-touched'
  | 'marks-untouched'
  | 'adds-item'
  | 'expands-item'
  | 'unknown';

type BehaviorState =
  | { readonly kind: 'json'; readonly value: JsonValue }
  | { readonly kind: 'undefined' }
  | { readonly kind: 'node-absent' };

type DeclaredBehaviorOrigin =
  | {
      readonly kind: 'cross-field-effect';
      readonly registryId: string;
      readonly registryVersion: number;
      readonly effectId: string;
      readonly effectVersion: number;
    }
  | {
      readonly kind: 'field-profile';
      readonly profileId: string;
      readonly profileVersion: number;
      readonly sourcePath: readonly (string | number)[];
    };

type DeclaredBehaviorEvidence = {
  readonly kind: 'declared';
  readonly origin: DeclaredBehaviorOrigin;
};

type DerivedBehaviorEvidence = {
  readonly kind: 'derived';
  readonly normalizer: { readonly id: string; readonly version: number };
  readonly derivation: { readonly id: string; readonly version: number };
  readonly sourcePath: readonly (string | number)[];
};

type ScenarioBehaviorEvidence = {
  readonly kind: 'scenario';
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly sourcePath?: readonly (string | number)[];
};

type ObservedBehaviorEvidence = {
  readonly kind: 'observed';
  readonly observationId: string;
  readonly observer: { readonly id: string; readonly version: number };
  readonly scenario?: { readonly id: string; readonly version: number };
};

type CausalBehaviorEvidenceRef =
  | DeclaredBehaviorEvidence
  | DerivedBehaviorEvidence;

type BehaviorEvidenceRef =
  | CausalBehaviorEvidenceRef
  | ScenarioBehaviorEvidence
  | ObservedBehaviorEvidence;

interface BehaviorEvidenceSet<
  Primary extends BehaviorEvidenceRef = BehaviorEvidenceRef,
  Corroborating extends BehaviorEvidenceRef = BehaviorEvidenceRef,
> {
  readonly primary: Primary;
  readonly corroborating: readonly Corroborating[];
}

interface ContractBehaviorEdge {
  readonly recordKind: 'edge';
  readonly identity: { readonly id: string; readonly version: number };
  readonly trigger: BehaviorTrigger;
  readonly target: { readonly nodeId: string; readonly facet: BehaviorFacet };
  readonly transition: BehaviorTransition;
  readonly guard?: { readonly kind: 'rule'; readonly ruleId: string };
  readonly expected?: BehaviorState;
  readonly timing:
    | { readonly mode: 'sync' }
    | { readonly mode: 'async'; readonly readinessId: string }
    | { readonly mode: 'unknown' };
  readonly ordering:
    | 'source-before-target'
    | 'activate-before-child'
    | 'none'
    | 'unknown';
  readonly lifecycle?: {
    readonly starts:
      | 'onInit'
      | 'afterContentInit'
      | 'afterViewInit'
      | 'interaction';
    readonly ends: 'onDestroy' | 'completion' | 'unknown';
  };
  readonly authority: 'actionable';
  readonly evidence: BehaviorEvidenceSet<CausalBehaviorEvidenceRef>;
}

interface ContractTargetStateCore {
  readonly recordKind: 'state';
  readonly identity: { readonly id: string; readonly version: number };
  readonly target: { readonly nodeId: string; readonly facet: BehaviorFacet };
  readonly state: BehaviorState;
}

type ContractTargetState = ContractTargetStateCore &
  (
    | {
        readonly authority: 'actionable';
        readonly evidence: BehaviorEvidenceSet<CausalBehaviorEvidenceRef>;
      }
    | {
        readonly authority: 'scenario';
        readonly evidence: BehaviorEvidenceSet<
          ScenarioBehaviorEvidence,
          ScenarioBehaviorEvidence | ObservedBehaviorEvidence
        >;
      }
    | {
        readonly authority: 'observation';
        readonly evidence: BehaviorEvidenceSet<
          ObservedBehaviorEvidence,
          ObservedBehaviorEvidence
        >;
      }
  );

type ContractBehaviorRecord = ContractBehaviorEdge | ContractTargetState;
```

An edge is emitted only when declared or fully normalized derived evidence
establishes its causal source/trigger; candidate executable surfaces stay in
the review scaffold. Scenario and observed evidence may corroborate an edge but
cannot be its primary evidence. A state record needs no trigger and can retain
an explicit JSON value, meaningful `undefined`, or node absence. Its authority
is structurally coupled to primary evidence: actionable to declared/derived,
scenario to scenario, and observation to observed. Validators must resolve
every declaration identity, allowlist the exact normalizer and derivation
version, and reject corroborating evidence that attempts to raise authority.
The DTO intentionally does not store function text, callback names as semantic
verbs, arbitrary RxJS pipelines, or executable readiness code.

A rule trigger contains only witnessed cases. Each input value must resolve to
the cited domain slot in the named contract hash or to the declared/scenario
case before serialization. A rule may therefore expose only a positive case or
only a negative case; a missing witness is a localized unknown, never
permission to invent the other input.

### Normalized conditions

An automatic rule must normalize to a closed expression grammar, not merely a
string reference list. The minimum useful grammar is:

- operands: resolved contract node value, allowlisted form-state path, and JSON
  literal;
- operators: strict equality/inequality, ordered scalar comparison, membership
  in a literal list, `present`, `empty`, `not`, `and`, and `or`; and
- outcomes: a boolean state for visibility/required/readonly/enabled, or a
  JSON-serializable value for a supported state target.

Calls, assignment, `new`, getters, optional invocation, dynamic element access,
template strings with expressions, regex execution, nested functions, and
coercive equality are refused. Short-circuit behavior and `undefined` need
explicit normal forms. A rule that cannot be normalized remains an opaque
dynamic rule plus scaffold; it is never partially emitted.

### How it composes with current schemas

Most v0.4 records map directly:

| Current record | Normalized mapping |
| --- | --- |
| `ContractCondition` | Edge with `BehaviorTrigger.rule` plus a normalized condition; raw expression remains provenance |
| `ContractDynamicRule` | Review scaffold with known owner/target facet and opaque condition/source; never an edge |
| `DeclaredCrossFieldEffect` | Actionable node-event edge with lossless effect-kind projection below |
| Trusted resolved node state/domain | Acausal state record with required scenario evidence and `scenarioId` |
| Field-profile wrapper precondition | Profile-operation reachability edge retaining `nodeId`, named `part`, and `click` / `check` |
| Repeater `add-item` / `expand-item` profile | Profile-operation reachability edge retaining the profile's add/expand part and operation |
| Future browser/runtime delta | Observed state record, or corroborating evidence on an independently established edge |

The existing effect-kind mapping is deliberately lossless:

| v0.4 kind | Normalized transition | Expected-state rule |
| --- | --- | --- |
| `loads` | `loads` | No value synthesized; declaration plus readiness owns semantics |
| `filters` | `filters` | No value synthesized; declaration plus readiness owns semantics |
| `clears` | `clears` | Preserve the declaration; include `expected` only when a separate declared clear-value codec exists |
| `controls-state` | `controls-state` | Preserve target facet and optional condition guard; do not infer polarity |
| `toggles` | `toggles` | Preserve target facet; do not convert it to an idempotent set operation |

Wrapper activation and repeater access remain profile-owned declarations. For
example, `{ kind: 'activate', part: 'panel-header', operation: 'click' }` maps
to a `profile-operation` trigger with the same part and operation and a
`reachability` target. Repeater `addPart`/`expandPart` map the same way to
`add-item`/`expand-item`. This retains the planner operation instead of asking
consumers to reconstruct it from a generic reachability edge.

Exact schema changes are required; the current strict v0.4 validators cannot
accept these as additive unknown properties:

1. Introduce a new schema version rather than changing `0.4.0` in place.
2. Add `readonly`, `validity`, `touched`, and `reachability` target facets.
   Current `enabled` cannot represent readonly, validation recalculation, or
   user-interaction state.
3. Add `revalidates`, `marks-touched`, `marks-untouched`, `adds-item`, and
   `expands-item` transitions while retaining all five v0.4 effect kinds
   losslessly. Keep `loads` and `filters` declaration-only.
4. Add the discriminated edge/state record family, then replace the effect
   edge's single trigger shape with the trigger union above. Scenario-resolved
   state must use an acausal state record rather than an invented trigger. A
   planner-facing lifecycle or repeater prerequisite cannot be represented by
   current `valueChanged | selectionChanged` alone.
5. Add the discriminated evidence union and authority/evidence matrix. Require
   registry/profile declaration identity, normalizer and derivation versions,
   scenario identity/version, and observation plus observer identity/version.
   Do not add `derived`, `scenario`, or `observed` to the existing
   `DeclaredCrossFieldEffect`; that registry must remain declaration-only.
6. Add normalized conditions separately from current raw
   `ContractCondition.expression`. Only normalized conditions with resolved
   source nodes and domain/declared/scenario-backed case inputs may authorize
   an automatic branch. Positive and negative cases are authorized separately.
7. Require stable scenario IDs on scenario-derived values and deltas. Current
   `evidence: 'resolved'` and `completeness: 'scenario'` do not identify which
   scenario produced the value.
8. Replace or supplement `effectAnalysis` with facet completeness and localized
   unknowns. The current reasons are form-wide and cannot say that rules are
   covered while lifecycle timing remains unknown.
9. Preserve the current explicit registry and field profiles as authoring
   inputs and project them losslessly into the new normalized view. Do not force
   application authors to duplicate current declarations during migration.

### Completeness and unknowns

A single `complete | incomplete` bit is inadequate for mixed behavior. Use:

```ts
interface ContractBehaviorAnalysis {
  readonly scenarioAxes: readonly {
    readonly identity: { readonly id: string; readonly version: number };
    readonly inputNodeIds: readonly [string, ...string[]];
    readonly scenarioIds: readonly [string, ...string[]];
    readonly coverage: 'sampled' | 'declared-complete';
    readonly evidence: 'declared';
  }[];
  readonly completeness: readonly {
    readonly targetFacet: BehaviorFacet;
    readonly scope:
      | { readonly kind: 'form' }
      | { readonly kind: 'node'; readonly nodeId: string };
    readonly aggregate: 'complete' | 'partial' | 'unknown';
    readonly producers: readonly [
      {
        readonly surface:
          | 'static'
          | 'rule'
          | 'cross-field'
          | 'lifecycle'
          | 'repeater';
        readonly status: 'complete' | 'partial' | 'unknown';
      },
      ...{
        readonly surface:
          | 'static'
          | 'rule'
          | 'cross-field'
          | 'lifecycle'
          | 'repeater';
        readonly status: 'complete' | 'partial' | 'unknown';
      }[],
    ];
  }[];
  readonly unknowns: readonly {
    readonly nodeId?: string;
    readonly sourcePath: readonly (string | number)[];
    readonly affectedFacets:
      | readonly [BehaviorFacet, ...BehaviorFacet[]]
      | 'unknown';
    readonly surface:
      | 'expression'
      | 'callback'
      | 'hook'
      | 'observable'
      | 'validator'
      | 'repeater';
    readonly dimensions: readonly (
      | 'source'
      | 'target'
      | 'condition'
      | 'transition'
      | 'timing'
      | 'readiness'
      | 'cleanup'
      | 'coverage'
    )[];
    readonly reason: string;
  }[];
}
```

Completeness rules:

- `complete` is always bounded to a target facet, form/node scope, producer
  inventory, and analyzed form version.
- The compiler must emit the applicable producer inventory even when a producer
  found no records; consumers may not infer the inventory from present edges.
- An aggregate is complete only when every applicable producer is complete and
  no localized unknown can affect that target facet and scope.
- Application-declared complete effect coverage may make the `cross-field`
  producer complete only after every declaration validates and no opaque
  surface claims that target facet.
- A scenario set is never globally complete merely because it has no unknown
  deltas. It may be complete only for a versioned finite scenario axis whose
  input nodes and exhaustive scenario IDs are explicitly declared.
- Observed evidence never raises global completeness.
- Opaque callbacks, hooks, validators, and option functions localize unknowns;
  they do not erase reliable static rules elsewhere in the form.
- An unknown with unresolved target and `affectedFacets: 'unknown'` blocks form
  completeness for every facet. An unresolved target with named affected
  facets blocks those form-facet aggregates and every node-facet aggregate
  unless the producer can prove the unknown cannot target that node.
- Edge absence may imply independence only for the relevant target facet and
  scope when its aggregate is complete. Otherwise absence means unknown.

## Review scaffold and minimal declarations

The compiler may emit a non-authoritative scaffold alongside diagnostics:

```ts
interface BehaviorReviewScaffold {
  readonly id: string;
  readonly formId: string;
  readonly ownerNodeId: string;
  readonly surface: 'expression' | 'change' | 'optionSelected' | 'hook';
  readonly sourcePath: readonly (string | number)[];
  readonly known: {
    readonly targetNodeId?: string;
    readonly targetFacet?: BehaviorFacet;
    readonly mutation?: BehaviorTransition;
    readonly lifecyclePhase?:
      | 'onInit'
      | 'afterContentInit'
      | 'afterViewInit'
      | 'onDestroy';
  };
  readonly localUnknowns: readonly string[];
  readonly contextualUnknowns: readonly string[];
}
```

Scaffolds are review queue items, not contract edges. Suggested declarations
must leave unknown fields blank rather than synthesize them from names. A
direct callback with no syntax-local unknowns still carries contextual unknowns
for widget invocation, stable node resolution, timing/readiness, and event
feedback until another producer resolves them.

Minimal application declarations for the unresolved workplace examples are:

- **Direct revalidation:** source node/event, target node, facet `validity`,
  transition `revalidates`, timing, and ordering. No callback source is needed.
- **Indirect option update:** source node/event, target options node,
  declaration-only `loads` or `filters`, timing/readiness, and ordering.
- **Touched mutation:** source node/event, target node, transition
  `marks-touched`; declare it only when error visibility or the test assertion
  depends on touched state.
- **Lifecycle subscription:** normally declare its semantic node-event effect,
  not the implementation hook. Add lifecycle scope only if initialization,
  teardown, or replay behavior changes the test plan.
- **Repeater child:** use the existing field-profile operation and part names
  for add/expand. Add a behavior declaration only for additional business
  effects such as loading row options after expansion.

## What an E2E author needs

For each generated positive or negative case, expose only:

1. how to reach the source and target, including add/expand prerequisites;
2. which source operation and input activates the branch;
3. the target facet and expected outcome;
4. when the outcome is ready or that readiness is unknown;
5. evidence and authority; and
6. facet-local completeness and blocking unknowns.

Do not expose callback bodies, imported helper paths, subscription ownership,
operator sequences, or speculative effect verbs to the E2E author. Those are
review provenance, not executable intent.

## Failure modes and refusal rules

| Failure mode | Required result |
| --- | --- |
| JavaScript parse error or unsupported syntax | No partial rule; opaque expression diagnostic |
| TypeScript-only syntax in a Formly string | Reject because pinned Formly executes JavaScript strings |
| Assignment, increment, delete, getter, or side-effecting call | No automatic condition/effect |
| Dynamic path, alias, destructuring, parent traversal, or repeated-row-relative lookup | Scaffold with target/source-resolution unknown |
| Helper, imported callback, service/DI call, closure, higher-order function | Scaffold only; never follow arbitrary source for authority |
| Function name such as `loadOptions`, `clearOther`, or `updateCaseTypes` | No semantic inference from the name |
| `change`/`optionSelected` on a custom field | Invocation unknown until the field profile or browser proves event wiring |
| RxJS `debounce`, scheduling, `switchMap`, retry, cancellation, error, or shared subscription | Timing/readiness and convergence unknown |
| Child `valueChanges` subscriber reads parent value | Ordering unknown because Angular documents parent update lag |
| `emitEvent: false` or enable/disable emission | Do not equate event count with user changes |
| Runtime validator change without visible revalidation call | Validity timing unknown |
| `setErrors` followed by validation | Manual error may be overwritten; scenario/observation is path-local |
| Hide transition | Record visibility; value clear requires effective reset-policy evidence |
| Lazy rendering | Hidden target may be absent; browser reachability differs from state alone |
| Options contain functions, class instances, Observables, or unstable object identity | Reject non-JSON evidence or use an application codec/profile |
| Differential scenario changes multiple inputs, time, or providers | No causal source edge |
| Rule branch has no domain, declared-case, or scenario-backed input | Retain the normalized rule but emit no E2E case for that branch |
| Added/removed nodes across scenarios | Structural delta with local unknown, not a normal target-property effect |
| Repeater row IDs or indices shift after add/remove | Do not persist instance IDs as stable template endpoints |
| `onInit` not rendered by a builder-only scenario | Lifecycle remains unobserved |
| Missing or incomplete `onDestroy` cleanup | Report cleanup unknown; do not assume leak-free readiness |
| Effect cycle or feedback through emitted Angular events | Deterministic SCC diagnostic; convergence remains undeclared |

## Feasibility, value, and confidence

| Claim | Confidence | Basis |
| --- | ---: | --- |
| Bounded string rules can generate useful positive/negative branch scaffolds | 0.85 | Existing string extraction plus closed-grammar/path-resolution design; implementation still required |
| Static callback AST can find useful review candidates | 0.80 | Direct revalidation experiment succeeds; alias/helper negatives are explicit |
| Static callback AST can authoritatively recover workplace effects | 0.25 | Event wiring, symbols, closures, RxJS, DI, and timing dominate |
| Trusted scenarios can provide actionable scenario-local target states | 0.90 | Existing Formly scenario compiler and current differential experiment |
| Scenario deltas can infer `loads` versus `filters` | 0.15 | Identical deltas can arise from loading, filtering, caching, replacement, or fixtures |
| Explicit effects plus field profiles cover E2E ordering/readiness/repeater needs | 0.90 | Current validated registry and interaction-profile ownership already compose |
| Runtime/browser observations can verify visited paths | 0.90 | Direct observation is strong for the path, weak for global coverage |
| The normalized graph is worth implementing | 0.85 | It removes consumer-specific joins while retaining evidence and opacity |

Overall recommendation: **go** for normalized rule/behavior projection,
localized completeness, stable scenario IDs, and scaffold generation;
**conditional go** for bounded string-condition automation after expanding the
retained pinned-Formly differential test across the closed grammar and legacy
precedence cases; **no-go** for whole-program callback or RxJS interpretation
as contract authority.

## Ordered implementation tasks

1. Approve the causal-edge/acausal-state record union, authority/evidence
   matrix, versioned evidence origins, rule-case input witnesses, true
   facet/scope completeness, and lossless v0.4/profile mappings before
   versioning the schema.
2. Specify the closed normalized-condition grammar, JavaScript semantics,
   stable relative-path resolution, legacy precedence, and refusal tests.
3. Version the schema and add behavior facets, transitions, evidence sets,
   stable scenario IDs, witnessed rule cases, and facet/scope-local
   completeness/unknown DTOs with the validator matrix above.
4. Project current `DeclaredCrossFieldEffect`, wrapper activation, and repeater
   operations losslessly into the normalized behavior view without weakening
   their declaration-only authority or dropping named parts.
5. Implement automatic derived rules for static and bounded string expressions,
   including domain-backed `Other` visibility/required cases and
   hide/reset-policy separation. Differential-test every grammar form against
   pinned Formly evaluation.
6. Add a conservative callback/hook scaffold producer for only direct literal
   control access and allowlisted mutations. Refuse helpers, aliases, imports,
   computed paths, writes outside the allowlist, and arbitrary pipelines.
7. Add named differential-scenario evidence with one-axis input declarations,
   stable scenario IDs, JSON projection, structural delta diagnostics, and no
   automatic business verbs.
8. Add explicit `validity`, `touched`, and lifecycle/repeater declarations to
   registry validation and planner projection; keep readiness as a profile-owned
   serializable capability.
9. Add rendered Angular lifecycle tests covering returned Observable teardown,
   manual `onDestroy` cleanup, emitted-event feedback, and hook non-execution in
   builder-only scenarios.
10. Add browser conformance events only after the normalized evidence schema is
   stable; compare observations to declarations without promoting observations
   to global facts.
11. Measure construct frequencies and scaffold acceptance on a redacted
    workplace corpus before increasing AST coverage.

## Limitations and open decisions

- The experiment uses hand-owned probes rather than a workplace application and
  does not measure real construct frequency.
- It does not execute Angular components, Formly lifecycle rendering, real
  validators, or RxJS scheduling. Existing repository Formly builder tests
  provide complementary scenario evidence only.
- The normalized DTO is a research proposal, not a committed public contract.
- Relative model scope and repeated-row identity remain the largest blockers
  for safe automatic path-to-node resolution.
- Readiness error, cancellation, timeout, and retry semantics remain profile or
  application declarations.
- Whether `readonly` should be a baseline control capability or profile-owned
  needs a schema-owner decision; it must not remain conflated with `enabled`.
- Lifecycle metadata should be emitted only when it changes planning or
  conformance. Recording every hook would add detail without E2E value.

## Traceability index

| Decision or claim | Repository evidence | External authority | Experiment |
| --- | --- | --- | --- |
| Declared/scenario/MCP execution boundary | `docs/decisions/0005-trusted-scenario-resolution.md`; `packages/compiler/src/extract-form.ts` | Formly builder/API links above | Existing Formly scenario tests |
| Explicit semantic effects own ordering/readiness | `packages/schema/src/cross-field-effect.ts`; `packages/compiler/src/resolve-effects.ts`; `docs/research/v0.4-cross-field-effects.md` | Angular/Formly expose state APIs, not a business effect graph | Direct/indirect callback comparison |
| Modern and legacy rules remain relevant | `packages/compiler/src/extract-form.ts`; edge-case fixtures | Formly v6 expressions/API/migration | `Other` branch and AST cases |
| Validation and touched are distinct facets | Current schema lacks both target facets | Angular `updateValueAndValidity` and `markAsTouched` docs | Direct and lifecycle probes |
| Lifecycle timing and cleanup are not builder facts | Hook diagnostics in extractor; access-request fixture | Formly v6 docs and pinned 6.1.8 bundle | Subscription teardown probe |
| Options deltas do not imply load/filter | Existing v0.4 differential scenario spike | Formly reports target expression changes only | Indirect option-update probe |
| Repeaters require access prerequisites | Field interaction/profile schemas and expandable-repeater fixture | Formly `fieldArray` API | Existing field-profile/browser research |

## Verification record

```text
pnpm exec vitest run scripts/research/form-effects/form-effects.test.mjs
  Test Files  1 passed (1)
  Tests       6 passed (6)

pnpm exec vitest run apps/formly-test-app/src/app/forms/effects-spike/*.test.ts
  Test Files  2 passed (2)
  Tests       11 passed (11)

pnpm exec vitest run packages/schema/src/cross-field-effect.test.ts packages/compiler/src/resolve-effects.test.ts
  Test Files  2 passed (2)
  Tests       33 passed (33)

pnpm check:docs
  Documentation checks passed for 57 files.

pnpm exec eslint scripts/research/form-effects/form-effects.test.mjs
  exited 0 with no output

pnpm lint
  exited 0 with no lint findings

git diff --check
  exited 0 with no output
```
