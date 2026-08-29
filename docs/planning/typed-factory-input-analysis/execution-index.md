# Typed Factory Input Analysis Execution Index

- Status: Research and independent review complete
- Scope: research, retained experiments, technical design, and review
- Production behavior changes: none authorized by this index

## Work graph

```text
TFI-0 baseline and boundary
  +--> TFI-1 TypeScript input-shape recovery ----+
  +--> OBS-1 Observable emission-type recovery --+--> TFI-2 decision model
  +--> OBS-2 finite static-source recognition ---+
  +--> OBS-3 controlled-subscription boundary ---+

TFI-2 --> REV-1 --> reconcile --> REV-2 (Claude) --> reconcile --> REV-3
```

## Work items

| ID      | Outcome                                                                                                                                                                          | Dependencies                       | Status                                               | Acceptance boundary                                                                                                                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TFI-0` | Reconcile RH-02, `REQ-FACTORY-01`, `FAC-*`, and the workplace MVP into one non-conflicting research boundary                                                                     | none                               | complete                                             | No plan text authorizes application imports, arbitrary subscriptions, or stronger evidence than the canonical predecessors                                                                                                                                                                       |
| `TFI-1` | Retained TypeScript spike recovers expected factory input properties, signatures, contextual anonymous callback types, and demonstrates a deliberately narrow direct-use grammar | `TFI-0`                            | research complete; production classifier pending     | Direct property uses, stored function values, immediate IIFEs/synchronous collection callbacks, ambiguous higher-order/getter cases, and explicit refusal diagnostics are retained; destructuring, aliases, computed access, and broader flow remain unsupported rather than silently classified |
| `OBS-1` | Retained TypeScript spike demonstrates emission-type recovery from supported RxJS Observable/Subject shapes                                                                      | `TFI-0`                            | research complete; normalized production DTO pending | Exact aliases, subclasses, common generic wrappers, pipeline result types, and bounded hazard traversal are covered; `typeToString()` remains diagnostic-only and type evidence never becomes concrete values                                                                                    |
| `OBS-2` | Retained static-expression spike identifies the deliberately tiny set of finite literal Observable sources that can be enumerated without subscription                           | `TFI-0`, `OBS-1`                   | complete                                             | Symbol-resolved allowlist passes the safe-static primitive/array/unique non-`__proto__` identifier-or-string-key object grammar and rejects numeric/prototype/imported/dynamic/operator/scheduler/subject/promise/iterable ambiguity                                                             |
| `OBS-3` | Retained runtime experiment demonstrates the safety and completeness limits of subscription                                                                                      | `TFI-0`, `OBS-1`                   | complete                                             | Cold side effects, hot state, errors, async completion, and never-completion show why declared analysis cannot subscribe; any future controlled claim requires named finite and settling protocols                                                                                               |
| `TFI-2` | Decision-ready design specifies generated materialization, evidence vocabulary, ownership/lifecycle, diagnostics, and the MVP implementation sequence                            | `TFI-1`, `OBS-1`, `OBS-2`, `OBS-3` | accepted after three review reconciliations          | The `createIndexingContractOptions()` happy path is concrete; unsupported cases fail closed; RH-02/Task 8 ownership remains intact                                                                                                                                                               |
| `REV-1` | Fresh-context independent engineering review                                                                                                                                     | `TFI-2`                            | complete                                             | Five findings accepted: claims narrowed, adversarial cases added, function-storage boundary corrected, compiler ownership/lifecycle decided, and verification refreshed                                                                                                                          |
| `REV-2` | Fresh Claude independent review                                                                                                                                                  | `REV-1` reconciliation             | complete                                             | One package-ownership blocker and two focused test gaps accepted; authoritative Program ownership moved to workspace and adversarial coverage added                                                                                                                                              |
| `REV-3` | Final fresh-context independent engineering review                                                                                                                               | `REV-2` reconciliation             | complete                                             | Two localized blockers accepted: safe-static object keys narrowed and local-versus-portable privacy outputs specified; status/formatting hygiene reconciled                                                                                                                                      |

## Planned implementation handoff IDs

These IDs describe the accepted post-research implementation sequence. `TFI-2`
and all three reviews accepted the sequence; each slice still preserves its own
acceptance boundary and verification gate.

| ID          | Candidate implementation outcome                                                                                       | Expected dependency                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `TFI-MVP-1` | Internal normalized TypeScript input/emission-type descriptors and fail-closed diagnostics                             | accepted `TFI-2`                                                    |
| `TFI-MVP-2` | Source analyzer that classifies required explicit values versus auto-opaque capabilities in reviewed storage positions | `TFI-MVP-1`                                                         |
| `TFI-MVP-3` | Generated typed options-materializer scaffold colocated with the registered form definition                            | `TFI-MVP-2`, existing source-definition linkage                     |
| `TFI-MVP-4` | Optional finite-static Observable expression evidence for the strict accepted allowlist                                | `TFI-MVP-1`, accepted `OBS-2`; may be deferred without blocking MVP |
| `TFI-MVP-5` | Work-shaped fixture and checkout workflow proving the indexing-form and NIGO-style factory cases                       | `TFI-MVP-3`                                                         |

## Production implementation status

| ID          | Status      | Current acceptance boundary                                                                                                                                                                    |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TFI-MVP-1` | complete    | Workspace-private analysis reuses an existing `WorkspaceSourceUsageProgramDescriptor`, normalizes one supported factory input shape, resolves canonical RxJS emission types, and fails closed. |
| `TFI-MVP-2` | complete    | Workspace-private analysis classifies the factory body's bounded direct-use grammar and combines each use with the `TFI-MVP-1` type result; no scaffold or runtime execution is added.         |
| `TFI-MVP-3` | not started | No scaffold or authoring output is added by `TFI-MVP-1`.                                                                                                                                       |
| `TFI-MVP-4` | deferred    | No finite runtime values are inferred from Observable types.                                                                                                                                   |
| `TFI-MVP-5` | not started | The production analyzer must pass its focused compatibility fixtures before the workplace-shaped pilot begins.                                                                                 |

### `TFI-MVP-1` traceability

| Acceptance ID | Requirement                                                                                                                | Evidence                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `TFI1-AC-01`  | Analyze the exact caller-supplied source Program; do not construct or accept a replacement Program internally.             | Foreign-Program refusal test; analyzer accepts only an existing descriptor and declaration         |
| `TFI1-AC-02`  | Recover a supported function/class factory's single options-object properties, callback signatures, and return types.      | Function, class, callback, generic, scalar, and unsupported-signature fixtures                     |
| `TFI1-AC-03`  | Resolve emission types only for canonical RxJS `Observable` ancestry, including aliases, subjects, subclasses, and unions. | Direct, barrel, alias, Subject, subclass, union, callback-return, and same-spelling-negative tests |
| `TFI1-AC-04`  | Normalize type structure within explicit depth, node, string, union, property, parameter, and signature limits.            | Repeated-equality, deep graph, property cap, and display cap tests                                 |
| `TFI1-AC-05`  | Expose `any`, `unknown`, unresolved generic, recursive, truncated, and unsupported hazards without inventing values.       | Fail-closed hazard, semantic-error, and suppression matrix                                         |
| `TFI1-AC-06`  | Keep the descriptor ephemeral and workspace-private; change no portable schema or artifact.                                | No barrel export, persistence, cache, schema, compiler, bundle, report, or scaffold change         |

### `TFI-MVP-2` traceability

| Acceptance ID | Requirement                                                                                                                                                          | Verification                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `TFI2-AC-01`  | Reuse the exact `TFI-MVP-1` Program/declaration boundary and support only a function or class constructor with one identifier options parameter.                     | Function/class positives plus foreign-Program, destructured-parameter, and unsupported-signature refusals            |
| `TFI2-AC-02`  | Classify direct construction reads/calls, direct returned escapes, reviewed stored functions, immediate IIFEs/synchronous collection callbacks, and ambiguous flow.  | Indexing-shaped positive matrix plus unknown higher-order consumer, getter, alias, destructuring, and computed cases |
| `TFI2-AC-03`  | Combine use evidence with the property type: only supported callables in reviewed deferred storage become captured callbacks.                                        | Callable and scalar values in identical storage positions produce different dispositions                             |
| `TFI2-AC-04`  | Classify canonical property Observables as inert streams and recognized Angular view handles as unavailable views only when they escape directly into returned data. | Canonical Observable, same-spelling negative, Angular `TemplateRef`, and non-view object cases                       |
| `TFI2-AC-05`  | Require explicit values/bindings or mark unsupported whenever construction, ambiguity, hazards, or an unreviewed capability prevents safe automation.                | Mixed-use, immediate capability, `any`/`unknown`, unused, and unreviewed storage cases                               |
| `TFI2-AC-06`  | Keep the plan bounded, deterministic, ephemeral, workspace-private, and free of factory calls, subscriptions, application imports, persistence, and portable output. | Repeated-equality assertion, source inspection, no barrel/schema/compiler/artifact changes, and full repository gate |
