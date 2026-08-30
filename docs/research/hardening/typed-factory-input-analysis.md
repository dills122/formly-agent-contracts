# Typed factory input and Observable analysis

- Status: Decision-ready; all 3 independent reviews reconciled
- Date: 2026-08-29
- Scope: static TypeScript analysis, inert materialization design, Observable
  type/value semantics, and the next MVP implementation slice
- Production behavior changed by this research: none
- Canonical predecessor:
  [Factory harness and value semantics](./factory-harness-and-value-semantics.md)
- Execution index:
  [Typed factory input analysis](../../planning/typed-factory-input-analysis/execution-index.md)

## Executive decision

Proceed with a TypeScript-powered factory-input analyzer and generated inert
binding plan. It can remove most of the ridiculous handwritten boilerplate from
well-typed Formly factories without pretending to know runtime business data.

The useful boundary is:

1. Recover the factory's expected options type, each property type, callback
   signatures, callback return types, and supported usage sites from the same
   leaf TypeScript `Program` used for source linkage.
2. Automatically plan inert values only for capabilities whose storage position
   is recognized by the bounded grammar, such as callbacks directly stored in
   Formly configuration, RxJS Observables, and unavailable Angular view
   objects.
3. Require explicit reviewed values only when an input affects field-tree
   construction or cannot be classified safely.
4. Report `any`, `unknown`, unresolved generics, ambiguous flow, and nested
   unsafe types honestly instead of filling them with plausible objects.
5. Treat `Observable<T>` as strong evidence for the _type of each emission_, not
   evidence for actual emitted values, completion, timing, or availability.
6. Keep exact finite Observable values behind either a tiny static literal
   source proof or the separate Task 8 controlled scenario protocol. Never
   subscribe during declared input analysis.

Confidence is high for the typed happy path and moderate for the percentage of
real factory inputs that the first usage-classification grammar will automate.
The remaining uncertainty is coverage, not feasibility. The analyzer will need
workplace measurement before expanding beyond direct property access and
directly stored callback values. Destructuring and aliases are initial refusal
cases, not promised first-slice support.

## What this solves

The current source definition has two distinct jobs:

- `lineage.rootSymbol` connects the generated contract to the real application
  factory; and
- zero-argument `create()` returns a Node-safe declared form instance for
  generation.

The first job now works. The second is painful for a factory such as:

```ts
export function IndexingFormConfig(options: IndexingFormConfigOptions): FieldConfig[] {
  // construct the form tree
}
```

Today the application must invent something like
`createIndexingContractOptions()` just to satisfy dozens of callbacks, streams,
templates, flags, collections, and service-shaped values. That duplicates the
input interface, creates fake values with unclear meaning, and can accidentally
look like runtime evidence.

The proposed analyzer turns that full fake object into a small reviewed binding
plan. Most deferred capabilities are generated. Only construction-affecting
inputs remain for the application to choose deliberately.

This does **not** make an arbitrary factory safe to execute. RH-02's execution
and containment decisions remain unchanged. The immediate product is an
analysis/report/scaffold that can support a reviewed Node-safe adapter; automatic
application factory execution remains gated by `FAC-3`/`FAC-4`.

## Research questions and answers

### Can TypeScript recover the real options shape?

Yes, for sources included in a valid leaf `Program`.

The compiler API exposes symbols, resolved types, call signatures, return
types, type arguments, and contextual types. The retained TypeScript 5.9.3
experiment recovered:

- `reviewFn: () => boolean`;
- `productChangeFn: (field: Field) => void`;
- `productOptionsFn: (field: Field) => Observable<readonly Option<string>[]>`;
- arrays, object types, literal unions, aliases, subclasses, `unknown`, and
  `any`; and
- the same callback signatures for anonymous functions supplied at a real
  invocation site through contextual typing.

This is supported by TypeScript's documented `Program`/`TypeChecker` model and
contextual typing behavior. The compiler API is not promised as a permanently
stable surface, so the analyzer must pin supported TypeScript versions and keep
compatibility fixtures.

Sources:

- <https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API>
- <https://www.typescriptlang.org/docs/handbook/type-inference.html#contextual-typing>

### Can TypeScript tell what an Observable will emit?

It can usually tell the **emission type**. It cannot derive the actual runtime
sequence from the type alone.

For a resolved `Observable<T>`, `T` describes each `next` value. The experiment
recovered all of these without importing or executing application code:

| Declared value                                            | Recovered emission type             |
| --------------------------------------------------------- | ----------------------------------- |
| `Observable<readonly Option<string>[]>`                   | `readonly Option<string>[]`         |
| `Subject<Option<boolean>>`                                | `Option<boolean>`                   |
| application subclass of `BehaviorSubject<Option<number>>` | `Option<number>`                    |
| `Observable<Option<string> \| null>`                      | `Option<string> \| null`            |
| `Observable<readonly Option<'open' \| 'closed'>[]>`       | the literal-union option-array type |
| generic identity around `of({ value: 42 } as const)`      | the inferred literal object type    |
| `of(1, 2).pipe(map(...))`                                 | the mapped result object type       |

The analyzer rejected a structurally similar object with a `subscribe` method
because it did not resolve to the canonical RxJS `Observable` symbol. It also
resolved real RxJS imports through a workspace barrel and rejected a local
same-spelled `fakeOf` function.

The result should be stored internally as a normalized type descriptor, not as
an authoritative `typeToString()` value. The display string is useful for
diagnostics, while identity, union members, nullability, generic arguments,
call signatures, and hazards require structured fields.

### What does a finite literal union tell us?

`Observable<Option<'open' | 'closed'>[]>` gives a useful type-level upper bound:
well-typed values are expected to use `open` or `closed`. It does **not** prove
that either value is available in a particular subscription, that both appear,
or what labels the UI renders.

This distinction is important for E2E authoring:

- a type-derived literal union may become non-actionable candidate metadata;
- it must not become `options`, a complete enumerated `valueDomain`, or a
  Playwright instruction; and
- browser/scenario evidence may later confirm which candidates are actually
  available.

TypeScript types are erased from emitted JavaScript, so this descriptor must be
produced at analysis/build time. It cannot be recovered later by inspecting an
ordinary runtime value.

Source: <https://www.typescriptlang.org/docs/handbook/typescript-from-scratch#erased-types>.

### What about `any` and `unknown`?

They fail closed at the top level and when found by the bounded recursive
grammar inside an otherwise useful type.

The work-shaped experiment included:

```ts
(query: string) => Observable<Observable<any[]> | readonly PolicySearchResult[]>;
```

The outer emission type was recovered, but the descriptor was tagged
`contains-any`. A separate `Observable<{ payload: any }>` case proves that the
retained walk also enters application-owned object properties. The experiment
bounds traversal at depth 8 and 256 visited types. If either bound is reached,
it reports `analysis-truncated`; it does not assert that the unseen graph is
safe. The tool can explain the known outer shape and typed result branch, but
it cannot claim the nested collection's element shape.

Top-level `Observable<any>` is `unsafe-any`; `Observable<unknown>` is
`unknown`. Neither receives a generated semantic value or actionable option
profile. This follows TypeScript's own distinction: `any` disables checking,
whereas `unknown` requires narrowing before use.

Source: <https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any>.

### Can exact emissions ever be recovered without subscribing?

Yes, but only for a deliberately tiny static grammar whose RxJS symbols and
inputs are exact:

- canonical `rxjs.of(...)` with only safe-static literal arguments; and
- canonical `rxjs.from(readonlyLiteralArray)` with exactly one inline,
  safe-static array/tuple literal.

The retained safe-static literal grammar is narrower than JavaScript or JSON:

- finite numbers other than negative zero, strings, booleans, and `null`;
- recursively accepted array literals with no spreads; and
- object literals containing only unique identifier/string keys, excluding
  `__proto__`, with recursively accepted values.

Numeric, computed, accessor, method, shorthand, spread, duplicate, and
`__proto__` object keys are refused. These exclusions avoid reconstructing a
different own-key/prototype result than JavaScript evaluates. The adversarial
matrix includes identifier/string `__proto__`, numeric/exponent keys, and
numeric/string duplicate-key equivalence.

The retained experiment enumerated those cases, including a real RxJS `of`
re-exported through a workspace barrel. It rejected:

- identifiers, imported values, spreads, computed values, getters, and
  non-JSON literals;
- `from(Promise)`, general iterables, Observable-like inputs, and schedulers;
- `pipe(...)`, even when its current operator looks simple;
- `new Observable(...)`;
- same-spelled non-RxJS helpers; and
- mutable/hot sources as complete domains.

RxJS documents that `of` emits its arguments and completes synchronously.
`from` accepts many source categories, so the allowlist must recognize only the
inline literal array case rather than assuming every `from` call is finite or
synchronous.

Sources:

- <https://rxjs.dev/api/index/function/of>
- <https://rxjs.dev/api/index/function/from>

This optional static-value feature is worthwhile only after the input analyzer
MVP. It can recover easy wins, but most workplace option streams come from
callbacks, services, subjects, HTTP results, stores, or operator chains.

### Is a BehaviorSubject initial value an exact emission set?

No.

A literal `new BehaviorSubject(initial)` proves one declared initial expression.
It does not prove the current value at a later subscription or the set of future
values. The runtime experiment changed the subject before subscription; the
subscriber received the changed value and the stream did not complete.

At most this can be retained as `initial-only` source metadata. It must not be
promoted to a complete option/value domain.

Source: <https://rxjs.dev/api/index/class/BehaviorSubject>.

### Why not subscribe with a timeout and see what happens?

Because subscribing is executing the producer, and a timeout does not create
semantic completeness or a security boundary.

The retained runtime experiment demonstrated:

- a cold Observable executed a side effect only when subscribed;
- a synchronous finite source emitted and completed;
- an asynchronous finite source emitted later and completed;
- a producer errored;
- a `BehaviorSubject` emitted current state but remained open; and
- `NEVER` produced nothing and timed out.

RxJS explicitly describes subscription as the start of an Observable
execution. That execution can be synchronous or asynchronous and may be
infinite. A timeout can stop one observation window; it cannot prove there were
no later values, no missed hot values, or no external side effects.

Sources:

- <https://rxjs.dev/guide/observable>
- <https://rxjs.dev/api/index/class/Subscription>

Any future concrete emission claim therefore remains in Task 8 and needs a
named scenario, a registered finite/closed provider protocol, a settling rule,
teardown, a projector, and the broader execution authority already required by
RH-02. The typed analyzer supplies descriptors to that lane; it does not become
the lane.

## Proposed analyzer contract and ownership

The first implementation follows the repository's existing source-analysis and
package dependency direction:

1. `packages/workspace` already constructs the authoritative leaf TypeScript
   `Program` used by source linkage. The factory-input analyzer runs inside that
   same Program/checker context and owns ephemeral `FactoryInputAnalysis` plus
   the full `NormalizedTypeDescriptor`. It must not construct a second Program
   or compare symbols across Program instances.
2. Workspace renders private/local authoring output. It contains the real
   property/interface names, indexed-access types, and confined module
   specifiers required for a usable typed adapter. It may be printed to the
   local CLI or written only to a dedicated, realpath-confined authoring output
   directory inside the consumer workspace. It is excluded from portable
   bundles and is committed only by explicit author choice.
3. The generated application scaffold references the compiler-owned RH-02
   type-only authoring contract. The MVP compiler surface validates nothing and
   materializes nothing at runtime; it only types application-authored helper
   calls. Compiler remains the owner of any future RH-02 inert-binding
   validation/materialization API, while the deferred FAC-3/FAC-4 runner remains
   responsible for contained execution. Compiler does not import TypeScript or
   consume workspace compiler objects. No new runtime DTO or reverse dependency
   is introduced between workspace and compiler.

The MVP intentionally has no cache, so there is no stale descriptor to
invalidate. Each run reuses the workspace-created leaf Program for both source
lineage and factory input analysis. The internal analysis records the active
TypeScript runtime version and whether RxJS resolved to a canonical package
symbol; the local scaffold/review draft does not publish dependency-version
claims. Changes to tsconfig, sources, declarations, or dependency versions are
naturally observed on the next run. A cross-version compatibility matrix is a
future release gate, not an implemented MVP feature. The separate code-free
source-registration sidecar remains workspace-owned and does not gain
executable factory inputs.

### Output and privacy boundary

The two output classes are intentionally different:

| Output                                      | Permitted content                                                                                                                                                                 | Prohibited content                                                                                                                                             | Publication                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Private/local authoring report and scaffold | Selected stable form/property/interface names, privacy-safe relative module specifiers, bounded type summaries, materialization dispositions, diagnostics, generated helper calls | Copied source snippets, initializers/runtime literals, comments, absolute paths, credentials, customer values, unbounded/transitive type graphs                | Local CLI or confined workspace authoring directory only; never part of a portable contract/bundle |
| Portable contract/summary                   | Existing reviewed contract fields and, if later approved, aggregate counts/stable IDs/diagnostic codes                                                                            | Local scaffold text, application property/interface/import names, module specifiers, type summaries, source literals/snippets, absolute paths, customer values | Existing canonical artifact pipeline only                                                          |

For this MVP, no type-analysis report is added to the portable contract. The
private output uses existing workspace path normalization, realpath confinement,
symlink rejection, and atomic-write conventions. Acceptance tests must prove
local-output confinement, portable-bundle absence, redaction of source
initializers/literals/comments/absolute paths, and deterministic ordering
within each output class.

If a future consumer needs to persist or exchange type descriptors, that is a
new versioned schema decision with validation, canonical serialization,
compatibility/invalidation keys, truncation limits, and privacy tests. This MVP
does not create that public boundary.

```ts
interface FactoryInputAnalysis {
  readonly factorySymbolId: string;
  readonly expectedType: NormalizedTypeDescriptor;
  readonly properties: readonly FactoryInputPropertyAnalysis[];
  readonly coverage: "complete-supported-grammar" | "incomplete";
  readonly diagnostics: readonly FactoryInputDiagnostic[];
}

interface FactoryInputPropertyAnalysis {
  readonly key: string;
  readonly expectedType: NormalizedTypeDescriptor;
  readonly uses: readonly FactoryInputUse[];
  readonly materialization:
    | "captured-callback"
    | "inert-observable"
    | "unavailable-view"
    | "explicit-value-required"
    | "explicit-binding-required"
    | "unsupported";
  readonly observable?: ObservableTypeAnalysis;
}

interface ObservableTypeAnalysis {
  readonly emissionType: NormalizedTypeDescriptor;
  readonly precision: "exact-type" | "contains-any" | "contains-unknown";
  readonly values:
    | { readonly kind: "type-only" }
    | {
        readonly kind: "finite-static";
        readonly source: "rxjs-of-literals" | "rxjs-from-literal-array";
        readonly emissions: readonly JsonValue[];
      }
    | {
        readonly kind: "initial-only";
        readonly initialValue: JsonValue;
      }
    | { readonly kind: "unknown" };
}
```

`NormalizedTypeDescriptor` needs bounded, canonical fields rather than an
unbounded serialization of TypeScript internals:

- type kind and nullability;
- literal/union members when bounded;
- array/tuple element descriptors;
- application symbol identity using the existing program/path privacy model;
- recognized external package identity (without claiming a supported version
  range in the descriptor);
- call/construct parameter and return descriptors;
- generic arguments; and
- `any`, `unknown`, unresolved, recursive, truncated, and unsupported hazards.

Raw source text, absolute paths, compiler object IDs, and the full transitive
property graph must not enter portable artifacts.

## Usage classification and materialization

The analyzer should classify each property use rather than guessing from the
property's type alone.

| Use                                           | Example                                                                                     | First-slice result                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Construction read                             | `options.mode ? a : b`                                                                      | explicit value/variant required                                                                                               |
| Construction collection operation             | `options.reasons.filter(...)`                                                               | explicit finite collection required                                                                                           |
| Immediate capability invocation               | `options.service.load()` in the factory body                                                | refuse or require an explicit reviewed binding; never auto-call                                                               |
| Directly stored callback                      | `change: field => options.onChange(field)`                                                  | generated captured callback only when the surrounding Formly property is in the reviewed storage grammar                      |
| Directly stored callback returning Observable | a reviewed Formly expression property stores a function that calls `options.searchFn(term)` | generated captured callback plus return/emission type metadata; callback still throws if invoked during declared construction |
| Scalar read inside a stored function          | `'props.class': () => options.isDialog ? 'a' : 'b'`                                         | the use-site is stored, but the input property is not callable; explicit scenario/binding value required                      |
| IIFE or known synchronous collection callback | `(() => options.make())()` or `rows.map(row => options.transform(row))`                     | construction-time use; explicit binding required                                                                              |
| Unknown callback consumer or getter           | `helper(() => options.make())` or `get value() { return options.make(); }`                  | ambiguous; explicit binding/refusal                                                                                           |
| Escaped Observable                            | `props.options = options.options$`                                                          | generated inert Observable proxy; subscription records then throws                                                            |
| Escaped Angular view object                   | `props.header = options.templateRef`                                                        | generated unavailable-view proxy                                                                                              |
| Opaque object escape                          | `props.driver = options.driver`                                                             | explicit binding unless a reviewed capability adapter recognizes it                                                           |
| `any`, `unknown`, unresolved generic          | any use                                                                                     | fail closed with a focused diagnostic                                                                                         |
| Unsupported alias/control flow                | helper indirection or unbounded flow                                                        | incomplete coverage plus explicit binding/refusal                                                                             |

The demonstrated research grammar supports:

- direct `options.property` access;
- direct calls, property reads, object/array placement, and conditionals;
- direct function values stored in returned object properties;
- immediate IIFEs and common synchronous collection callbacks as construction
  uses; and
- ambiguous outcomes for unknown callback consumers and getters.

It deterministically marks coverage incomplete for destructuring, parameter or
property aliases, reassignment, computed property names, unknown helper calls,
higher-order escape, getters, reflection, and unsupported control flow. A
production classifier may add symbol-resolved destructuring and bounded
immutable aliases only after focused positive and adversarial acceptance tests.
Lexical function nesting is never itself evidence of deferred execution.

Use-site classification and input-type classification are separate axes. An
`inside-stored-function` access becomes a generated `captured-callback` only
when the accessed input property's own type has a supported call signature and
the surrounding Formly storage position is reviewed. A scalar, collection, or
service read inside that same stored function is never promoted to a callback;
it remains explicit or unsupported. The retained fixture includes both a real
callback and a typed boolean scalar in an identical storage shape. It also
includes an immediate `options.service.load()` call, which is classified as a
construction call and never invoked by the analyzer.

## The intended author experience

### Indexing-style form

Instead of hand-authoring every property in
`createIndexingContractOptions()`, the application keeps the real interface and
factory as authority:

```ts
export const INDEXING_FORM_CONTRACT = defineFormContractDefinition({
  id: "case.indexing",
  lineage: { rootSymbol: IndexingFormConfig },
  create: createReviewedIndexingContractAdapter,
});
```

The analyzer produces a review report similar to:

```text
auto: reviewFn                 captured callback () => boolean
auto: productChangeFn          captured callback (Field) => void
auto: productOptionsFn         captured callback; returns Observable<Option<string>[]>
auto: loading$                 inert Observable<boolean>
auto: cases$                   inert Observable<CaseManagementSearchSummary>
auto: panelHeaderTemplate      unavailable Angular view capability
explicit: canAddCaseType       construction boolean/variant
explicit: caseColumns          construction/escaped collection needs reviewed value
error: ownerFilterFn return    nested any[]; emission element shape incomplete
```

The generated typed scaffold uses indexed access types from the real interface
and a record-before-throw harness. Conceptually:

```ts
const generated = {
  reviewFn: h.callback<IndexingFormConfigOptions['reviewFn']>('reviewFn'),
  productChangeFn:
    h.callback<IndexingFormConfigOptions['productChangeFn']>('productChangeFn'),
  productOptionsFn:
    h.callback<IndexingFormConfigOptions['productOptionsFn']>('productOptionsFn'),
  loading$: h.observable<IndexingFormConfigOptions['loading$']>('loading$'),
  // explicit reviewed values are inserted only through named bindings
} satisfies Partial<IndexingFormConfigOptions>;
```

The application supplies only named, construction-relevant values. The final
materialized object is checked with `satisfies IndexingFormConfigOptions` in an
ephemeral generated module or a committed reviewed adapter. Type erasure means
the ordinary runtime cannot perform this check by itself.

### NIGO-style form hypothesis

For the second workplace shape, the analyzer is expected to reach a different
but still small result:

```text
explicit: caseTypeName             interpolated into template
explicit: className                interpolated into layout class
explicit: uniqueRelatedForms       filtered during construction
explicit: customNigoReasons        filtered during construction
explicit: isDialogForm             changes structure/layout; named variant
auto: searchFn                     deferred callback returning Observable<...>
auto: updateRelatedFormsOptions    deferred callback
```

This is a design hypothesis based on the supplied screenshots, not retained
executable evidence. `TFI-MVP-5` must add the sanitized fixture and measure the
actual auto/explicit/ambiguous counts before the project claims a NIGO authoring
improvement.

## Diagnostics

Names are provisional until a schema-owned diagnostic slice is approved.

| Diagnostic                                     | Meaning                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `FACTORY_INPUT_TYPE_ANY`                       | A required input or nested emission shape contains `any`                     |
| `FACTORY_INPUT_TYPE_UNKNOWN`                   | A required input or emission shape is `unknown` without a reviewed narrowing |
| `FACTORY_INPUT_GENERIC_UNRESOLVED`             | The leaf Program cannot instantiate a required generic                       |
| `FACTORY_INPUT_USE_AMBIGUOUS`                  | Flow analysis cannot prove construction, deferred, or safe escape usage      |
| `FACTORY_INPUT_VALUE_REQUIRED`                 | A construction-affecting scalar/collection/variant needs an explicit binding |
| `FACTORY_INPUT_CAPABILITY_UNSUPPORTED`         | A service/view/capability has no reviewed inert adapter                      |
| `FACTORY_OBSERVABLE_TYPE_UNRESOLVED`           | The type is not a supported canonical RxJS Observable shape                  |
| `FACTORY_OBSERVABLE_VALUES_UNKNOWN`            | The emission type is known but concrete values are not                       |
| `FACTORY_OBSERVABLE_STATIC_SOURCE_UNSUPPORTED` | A source expression falls outside the finite literal allowlist               |

Unknown values are expected metadata, not necessarily fatal generation errors.
They become fatal only when the selected projection or interaction profile
requires stronger actionable evidence.

## Evidence and retained experiment

Files:

- `scripts/research/typed-factory-inputs/fixture.ts`
- `scripts/research/typed-factory-inputs/rxjs-barrel.ts`
- `scripts/research/typed-factory-inputs/experiment.mjs`
- `scripts/research/typed-factory-inputs/experiment.test.mjs`
- `scripts/research/typed-factory-inputs/run-experiment.mjs`

Pinned environment:

| Component  | Version                           |
| ---------- | --------------------------------- |
| TypeScript | 5.9.3                             |
| RxJS       | 7.8.2                             |
| Node.js    | repository-supported Node 22 line |

The spike intentionally resolves RxJS from
`apps/formly-test-app/node_modules` so declaration analysis and runtime probes
use the same pinned 7.8.2 copy. Moving or upgrading that fixture requires
updating the path mapping and compatibility assertion together.

Verification:

```bash
pnpm exec vitest run scripts/research/typed-factory-inputs/experiment.test.mjs
node scripts/research/typed-factory-inputs/run-experiment.mjs
```

The test has five independent assertions:

1. input, callback, contextual, Observable, subclass, union, and hazard type
   recovery without application execution;
2. adversarial direct-use, immediate-execution, and refusal boundaries;
3. exact safe-static finite-source positives and refusals;
4. adversarial object-key/prototype literal refusals; and
5. runtime subscription side-effect/completion/error/timeout behavior.

The first run exposed an experiment configuration issue: the isolated
TypeScript `Program` did not resolve the fixture's RxJS declarations through a
package-directory path mapping. Pointing the pinned path at RxJS's exported
declaration entry fixed module resolution. A second failure showed that module
exports had to be canonicalized through TypeScript alias symbols before symbol
identity comparisons. Both are retained in the working implementation and
tests; neither changed the research hypothesis.

## Confidence and usefulness

| Claim                                                                        | Confidence                       | Reason                                                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Recover typed factory input properties and callback signatures               | 0.92                             | Primary TypeChecker API plus retained work-shaped fixture                                                                |
| Recover `Observable<T>` emission type for canonical RxJS types               | 0.90                             | Aliases, Subject, subclass, union, generic, and operator-result positives                                                |
| Detect top-level and bounded nested `any`/`unknown` hazards                  | 0.86                             | Retained generic/union and application-object-property tests; depth/node truncation fails closed                         |
| Correctly automate directly stored callbacks/streams in the Indexing fixture | 0.82                             | Direct storage and adversarial immediate/ambiguous cases are retained; workplace helper/alias prevalence is not measured |
| Materially reduce NIGO authoring                                             | 0.55 hypothesis                  | Screenshots are illustrative only; the sanitized `TFI-MVP-5` fixture and measured counts are still required              |
| Infer actual dynamic Observable values from types                            | 0.00                             | Type describes assignable shape, not runtime sequence                                                                    |
| Enumerate exact literal `of`/`from(tuple)` sources                           | 0.88 within the accepted grammar | Symbol-resolved positives/negatives and official RxJS semantics                                                          |
| Generalize static enumeration across arbitrary RxJS pipelines                | 0.20 and not recommended         | Operator callbacks, scheduling, hot sources, and external inputs quickly become execution semantics                      |
| Safely subscribe to arbitrary application Observables in declared mode       | 0.00                             | Subscription is execution; timeout does not prove safety or completeness                                                 |

Overall sentiment: this is a strong and useful MVP direction. It substantially
improves authoring for typed factories, explains streams better to agents, and
reduces fake inputs. It is not a replacement for browser/scenario resolution,
and it does not independently unlock arbitrary factory execution.

## Implementation sequence

### Slice 1 — Workspace-owned typed analysis and compatibility fixture (`TFI-MVP-1`)

- Add workspace-private normalized type descriptors and diagnostics beside the
  existing source Program machinery. Reuse the exact Program/checker instance
  selected for lineage; do not create a second Program or pass TypeScript
  objects to compiler.
- Recompute the descriptors on every run; do not persist, hash, cache, or pass
  the full graph across the workspace/compiler boundary.
- Resolve factory parameter types, callback signatures/returns, and canonical
  RxJS emission types from the configured leaf Program.
- Pin the repository's tested TypeScript/RxJS fixture versions and retain
  alias/subclass/barrel fixtures. Record the active TypeScript version and
  canonical RxJS-symbol availability internally; defer a cross-version support
  matrix and public compatibility claim.
- Define depth/node/string/union limits and make truncation an explicit hazard.
- Canonically sort each bounded local output and test repeated byte identity.
  Test workspace path confinement and prove no local report/scaffold content
  enters portable artifacts. A future portable descriptor requires a separate
  schema decision.
- Do not change public schema or execute a factory.

### Slice 2 — Bounded use classifier and inert binding plan (`TFI-MVP-2`)

- Classify construction reads, directly stored callbacks, safe known escapes,
  immediate invocation/synchronous callback execution, and ambiguity.
- Start with direct property access. Destructuring, aliases, computed access,
  getters, and unknown higher-order consumers remain incomplete/refused until
  each grammar addition has adversarial tests.
- Combine use-site disposition with the input property's own type. Only a
  supported callable in a reviewed storage position can become a captured
  callback; scalar reads inside stored functions stay explicit.
- Render known callbacks/Observables/view capabilities as compiler-authoring
  helper calls in the generated application scaffold. The MVP compiler API is
  type-only; compiler remains the owner of a future RH-02 inert-binding
  validation/materialization API.
- Require explicit values for construction-affecting properties.
- Emit incomplete coverage rather than guessing through unsupported flow.

### Slice 3 — Generated typed scaffold and reviewed adapter DX (`TFI-MVP-3`)

- Generate an ephemeral or opt-in committed scaffold that references the real
  interface with indexed access types and `satisfies`.
- Keep that scaffold local/private: allow only required identifiers and
  privacy-safe module specifiers, reject copied source snippets/literals,
  absolute paths, credentials, and customer values, and exclude it from every
  portable artifact.
- Colocate the form definition/root anchor with the real form package or its
  Node-safe contracts entry point.
- Let the author provide only named explicit variants/values.
- Keep current `create()` as an explicit reviewed Node-safe declaration adapter;
  do not silently replace it with automatic application execution.

### Slice 4 — Workplace fixture/pilot (`TFI-MVP-5`)

- Add sanitized Indexing- and NIGO-shaped fixtures.
- Measure auto, explicit, ambiguous, and unsupported property counts.
- Require review acceptance of the generated plan and verify deterministic
  output and no callback/subscription/view execution.

### Optional Slice 5 — Finite literal Observable sources (`TFI-MVP-4`)

- Add the exact `of`/`from(literal array)` grammar only if workplace examples
  show meaningful prevalence.
- Retain symbol/version gates and all negative cases.
- Keep type-only and initial-only metadata distinct from exact finite values.

### Separate later lane — resolved scenario emissions

- Remains Task 8 plus `FAC-3`/`FAC-4` authority.
- Requires named finite provider and settling protocols, contained execution,
  teardown, resolved evidence, and schema/consumer support.
- Does not reuse a declared type descriptor as resolved evidence.

## Go/no-go gates

Proceed from analysis to the workplace pilot only if:

- the exact leaf Program has no relevant semantic diagnostics;
- the repository-pinned TypeScript runtime is active and RxJS resolves to the
  canonical package identity (a cross-version compatibility matrix remains a
  later release gate);
- every used input is auto-inert, explicitly bound, or deterministically
  refused;
- no `any`/`unknown` hazard is hidden within the bounded traversed graph, and
  any traversal limit reports `analysis-truncated`;
- private/local generated modules are confined inside the consumer workspace,
  contain no copied source snippets/initializers/comments, absolute paths,
  credential, customer value, or application callback execution, and enter no
  portable artifact;
- portable output contains no application identifiers, module specifiers, type
  summaries, or local scaffold/report text beyond a separately approved
  versioned schema;
- repeated analysis is byte-deterministic; and
- the current RH-02/FAC execution boundary remains explicit in product docs.

Stop or narrow if workplace measurement shows most meaningful inputs flow
through unsupported helper/control-flow patterns, or if the analyzer encourages
authors to treat type candidates as runtime options.

## Remaining unknowns

1. What percentage of workplace inputs fit the first direct/destructured usage
   grammar?
2. How much bounded recursive type detail is useful before descriptors become
   noisy or leak internal domain names?
3. Should type-level literal candidate domains remain generation diagnostics or
   justify an additive future schema record?
4. Will optional finite static Observable enumeration save enough authoring to
   justify its RxJS-version maintenance cost?
5. Which reviewed application capability presets beyond callback, Observable,
   and Angular view object are common enough for the MVP?

These are workplace pilot questions. None blocks the typed analyzer or its
inert scaffold.
