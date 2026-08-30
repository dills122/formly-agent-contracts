# Typed Factory Input Analysis Findings

This is the evidence log for the focused follow-up to RH-02. Entries use the
labels **Fact**, **Observation**, **Inference**, and **Unknown** deliberately.

## Baseline

- **Fact:** RH-02 keeps callbacks, Observable-shaped values, view objects, and
  opaque services inert during raw factory construction. Observable settling
  and Formly-resolved evidence belong to the separate Task 8 lane.
- **Fact:** `REQ-FACTORY-01` prohibits manufacturing factory-derived shape or
  value evidence from synthetic live-looking inputs. `FAC-3`/`FAC-4`
  application execution remains blocked behind an external rootless OCI gate.
- **Fact:** The completed workplace MVP explicitly excluded inferred runtime
  factory inputs, while proving exact linkage from a supported source usage to a
  stable form contract.
- **Inference:** A TypeScript analyzer can improve the authoring experience
  without weakening those boundaries if it generates inert materialization and
  descriptive type evidence rather than executing application behavior.

## Primary-source facts

- **Fact:** RxJS documents `Observable<T>` as values over time and states that
  `subscribe()` starts the Observable's work. A producer can emit synchronously
  or asynchronously, can have side effects, and may never complete.
  Source: <https://rxjs.dev/guide/observable>.
- **Fact:** `of(...)` synchronously emits each supplied argument and then
  completes. Source: <https://rxjs.dev/api/index/function/of>.
- **Fact:** `from(...)` accepts arrays, promises, iterables, and
  Observable-like inputs; those inputs do not all imply a statically finite or
  synchronously enumerable stream. Source:
  <https://rxjs.dev/api/index/function/from>.
- **Fact:** `BehaviorSubject<T>` has a current `T` value and emits that current
  value to a new subscriber, but later calls to `next(T)` can change it. Source:
  <https://rxjs.dev/api/index/class/BehaviorSubject>.
- **Fact:** TypeScript performs contextual typing for expressions and exposes a
  compiler API for creating a `Program`, obtaining its `TypeChecker`, and
  examining symbols and types. Sources:
  <https://www.typescriptlang.org/docs/handbook/type-inference.html#contextual-typing>
  and <https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API>.
- **Fact:** TypeScript erases types when it emits JavaScript. Type-derived
  materialization must therefore be generated during analysis/build time rather
  than discovered from ordinary runtime values. Source:
  <https://www.typescriptlang.org/docs/handbook/typescript-from-scratch#erased-types>.

## Retained observations

- **Observation:** Against TypeScript 5.9.3, the retained compiler API spike
  recovered the
  expected property and callback signatures for a work-shaped options object,
  including `() => boolean`, `(field: Field) => void`, and
  `(field: Field) => Observable<Option<string>[]>`.
- **Observation:** Anonymous functions at an invocation site inherited the
  expected callback types through contextual typing.
- **Observation:** A simple syntax walk distinguished immediate reads such as
  `options.staticOptions.filter(...)` from function values directly stored in
  returned field configuration. Lexical function nesting alone was not a sound
  deferred-execution boundary: IIFEs and common synchronous collection
  callbacks execute during construction, while an unknown callback consumer or
  getter remains ambiguous.
- **Observation:** Canonical RxJS emission types were recovered through aliases,
  Subject, a BehaviorSubject subclass, generic passthrough, unions, nullable
  emissions, literal-union option arrays, and a `pipe(map(...))` result.
- **Observation:** A work-shaped nested
  `Observable<Observable<any[]> | Results[]>` return type was recovered and
  tagged `contains-any`; an object property nested inside
  `Observable<{ payload: any }>` was also detected. Top-level
  `Observable<any>` and `Observable<unknown>` failed closed. The retained walk
  is bounded to depth 8 and 256 visited types; reaching either limit produces
  `analysis-truncated` rather than a false clean result.
- **Observation:** The strict literal grammar enumerated canonical `of` and
  `from(literal tuple)` sources, followed a real RxJS barrel re-export, and
  rejected a same-spelled local helper, identifiers, Promise input, operators,
  opaque producers, non-JSON numbers, `__proto__`, and numeric object keys.
  The accepted object grammar is limited to unique non-`__proto__`
  identifier/string keys so reconstruction preserves the tested semantics.
- **Observation:** Runtime subscription triggered a cold side effect; the
  BehaviorSubject current value differed from its constructor value; finite
  sync/async, error, and never-completing cases had distinct outcomes.
- **Observation:** The first failed run was localized to the isolated Program's
  RxJS declaration mapping. A later assertion exposed alias-symbol identity.
  Exact declaration-entry mapping plus canonical alias resolution fixed the root
  causes, and the same tests now guard both behaviors.

## Working hypotheses

- **Inference:** For a resolved RxJS `Observable<T>`, TypeScript should usually
  recover the _shape_ of each `next` value as `T`, including nested types such
  as `Option<string>[]`. That does not establish any concrete emitted value.
- **Inference:** Exact finite emission enumeration is defensible only for a
  deliberately tiny, symbol-resolved static expression grammar whose inputs
  are themselves exact literals. It should be an optional optimization, not an
  MVP dependency.
- **Inference:** `BehaviorSubject(literal)` can statically reveal an initial
  value expression, but that value is neither the complete future emission set
  nor necessarily the current value at the form's use site. It must not be
  labeled a complete domain.
- **Inference:** Callback inputs directly stored in supported Formly callback
  positions can be generated as typed record-before-throw inert capabilities.
  Inputs used by IIFEs or synchronous collection callbacks are construction
  inputs. Unknown higher-order consumers, getters, aliases, and other ambiguous
  flows require an explicit reviewed binding or refusal.

## Unknowns to resolve

- How robustly can emission type extraction distinguish RxJS types from
  structurally compatible application types without importing/evaluating RxJS?
- How should union emission types and `Observable<unknown>` be normalized?
- Does a strict static source allowlist create enough workplace value to justify
  its maintenance and version sensitivity?
- What percentage of workplace factories fit the deliberately narrow direct-use
  grammar before additional flow constructs are worth supporting?
- Does a later public consumer justify promoting any bounded type summary into
  a schema-owned record? The MVP answer is no: full type descriptors remain
  ephemeral workspace source-analysis state.

## Current decision

- **Inference:** Proceed with the typed analyzer, bounded usage classifier, and
  generated inert binding scaffold as `FAC-1` work.
- **Inference:** Workspace owns the complete normalized type graph beside its
  existing authoritative leaf Program, recomputes it every MVP run, and never
  passes TypeScript objects or the full graph to compiler. Workspace emits a
  bounded, canonical, privacy-filtered report and application scaffold; that
  scaffold references compiler-owned inert authoring helpers.
- **Inference:** Keep literal Observable enumeration optional and after the main
  input-analysis MVP; its grammar is sound but likely uncommon in service-driven
  workplace forms.
- **Inference:** Keep concrete subscription/resolution in Task 8 and automatic
  application factory execution behind `FAC-3`/`FAC-4`.
- **Unknown:** Workplace prevalence will determine whether the initial usage
  grammar automates enough inputs to expand beyond direct/destructured flows.
