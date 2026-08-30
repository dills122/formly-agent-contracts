import { describe, expect, it } from "vitest";

import {
  runLiteralObjectKeyExperiment,
  runRuntimeExperiment,
  runStaticExperiment,
} from "./experiment.mjs";

describe("typed factory input research", () => {
  it("recovers factory input and Observable emission types without execution", () => {
    const result = runStaticExperiment();
    const byInputName = Object.fromEntries(
      result.factoryInputs.map((input) => [input.name, input])
    );
    const contextual = Object.fromEntries(
      result.contextualCallsite.map((input) => [
        input.name,
        input.contextualType,
      ])
    );

    expect(result.typescriptVersion).toBe("5.9.3");
    expect(byInputName.reviewFn.callSignatures).toEqual(["(): boolean"]);
    expect(byInputName.productChangeFn.callSignatures).toEqual([
      "(field: Field): void",
    ]);
    expect(byInputName.productOptionsFn.callSignatures).toEqual([
      "(field: Field): Observable<readonly Option<string>[]>",
    ]);
    expect(byInputName.productOptionsFn.callReturns).toEqual([
      {
        type: "Observable<readonly Option<string>[]>",
        observable: {
          status: "resolved",
          emissions: ["readonly Option<string>[]"],
        },
      },
    ]);
    expect(byInputName.ownerFilterFn.callReturns).toEqual([
      {
        type: "Observable<Observable<any[]> | readonly PolicySearchResult[]>",
        observable: {
          status: "resolved",
          emissions: ["Observable<any[]> | readonly PolicySearchResult[]"],
          hazards: ["contains-any"],
        },
      },
    ]);
    expect(byInputName.productChangeFn.uses).toEqual([
      "inside-stored-function",
    ]);
    expect(byInputName.staticOptions.uses).toEqual(["construction-call"]);
    expect(byInputName.mode.uses).toEqual(["construction"]);
    expect(byInputName.initialOptions$.uses).toEqual(["escape"]);
    expect(byInputName.initialOptions$.observable).toEqual({
      status: "resolved",
      emissions: ["readonly Option<string>[]"],
    });
    expect(byInputName.opaqueUnknown.observable.status).toBe("unknown");
    expect(byInputName.unsafeAny.observable.status).toBe("unsafe-any");
    expect(byInputName.reactiveFlag).toMatchObject({
      callSignatures: [],
      type: "boolean",
      uses: ["inside-stored-function"],
    });
    expect(byInputName.service.uses).toEqual(["construction-call"]);
    expect(result.observableTypes.objectNestedAny$).toEqual({
      status: "resolved",
      emissions: ["{ readonly payload: any; }"],
      hazards: ["contains-any"],
    });
    expect(result.factoryUsage).toEqual({
      coverage: "complete-demonstrated-direct-grammar",
      diagnostics: [],
      uses: {
        initialOptions$: ["escape"],
        mode: ["construction"],
        opaqueUnknown: ["inside-stored-function"],
        ownerFilterFn: ["inside-stored-function"],
        productChangeFn: ["inside-stored-function"],
        productOptionsFn: ["inside-stored-function"],
        productSubject$: ["escape"],
        reactiveFlag: ["inside-stored-function"],
        reviewFn: ["inside-stored-function"],
        service: ["construction-call"],
        staticOptions: ["construction-call"],
        templateRef: ["escape"],
        unsafeAny: ["inside-stored-function"],
      },
    });

    expect(contextual.reviewFn).toBe("() => boolean");
    expect(contextual.productChangeFn).toBe("(field: Field) => void");
    expect(contextual.productOptionsFn).toBe(
      "(field: Field) => Observable<readonly Option<string>[]>"
    );

    expect(result.observableTypes.aliased$).toEqual({
      status: "resolved",
      emissions: ["readonly Option<string>[]"],
    });
    expect(result.observableTypes.subject$).toEqual({
      status: "resolved",
      emissions: ["Option<boolean>"],
    });
    expect(result.observableTypes.subclass$).toEqual({
      status: "resolved",
      emissions: ["Option<number>"],
    });
    expect(result.observableTypes.union$).toEqual({
      status: "resolved",
      emissions: ['Option<"left">', 'Option<"right">'],
    });
    expect(result.observableTypes.nullable$).toEqual({
      status: "resolved",
      emissions: ["Option<string> | null"],
    });
    expect(result.observableTypes.literalChoiceArray$).toEqual({
      status: "resolved",
      emissions: ['readonly Option<"open" | "closed">[]'],
    });
    expect(result.observableTypes.unknown$.status).toBe("unknown");
    expect(result.observableTypes.any$.status).toBe("unsafe-any");
    expect(result.observableTypes.observableLike.status).toBe(
      "not-rxjs-observable"
    );
    expect(result.observableTypes.genericResult$).toEqual({
      status: "resolved",
      emissions: ['{ readonly label: "Generic"; readonly value: 42; }'],
    });
    expect(result.observableTypes.mapped$.status).toBe("resolved");
  });

  it("fails closed across adversarial usage-boundary constructs", () => {
    const { adversarialUsage } = runStaticExperiment();

    expect(adversarialUsage.coverage).toBe("incomplete");
    expect(adversarialUsage.diagnostics).toEqual([
      "unsupported-computed-access",
      "unsupported-destructuring",
      "unsupported-mutable-alias",
      "unsupported-parameter-alias",
      "unsupported-property-alias",
    ]);
    expect(adversarialUsage.uses.reviewFn).toEqual([
      "construction",
      "lexically-nested-ambiguous",
    ]);
    expect(adversarialUsage.uses.productChangeFn).toEqual([
      "construction",
      "inside-stored-function",
    ]);
    expect(adversarialUsage.uses.productOptionsFn).toEqual([
      "lexically-nested-ambiguous",
    ]);
    expect(adversarialUsage.uses.reactiveFlag).toEqual([
      "inside-stored-function",
    ]);
  });

  it("enumerates only a tiny symbol-resolved finite literal source grammar", () => {
    const { staticSources } = runStaticExperiment();

    expect(staticSources.directOf$).toEqual({
      status: "finite-complete",
      source: "rxjs.of",
      emissions: [
        { label: "Open", value: "open" },
        { label: "Closed", value: "closed", disabled: true },
      ],
    });
    expect(staticSources.wholeArrayOf$).toEqual({
      status: "finite-complete",
      source: "rxjs.of",
      emissions: [
        [
          { label: "One", value: 1 },
          { label: "Two", value: 2 },
        ],
      ],
    });
    expect(staticSources.barrelOf$).toEqual({
      status: "finite-complete",
      source: "rxjs.of",
      emissions: [{ label: "Barrel", value: "barrel" }],
    });
    expect(staticSources.fromTuple$).toEqual({
      status: "finite-complete",
      source: "rxjs.from-literal-array",
      emissions: [
        { label: "Red", value: "red" },
        { label: "Blue", value: "blue" },
      ],
    });
    expect(staticSources.identifierOf$).toEqual({
      status: "unknown",
      reason: "non-literal-of-argument",
    });
    expect(staticSources.promiseFrom$).toEqual({
      status: "unknown",
      reason: "from-input-not-literal-array",
    });
    expect(staticSources.iterableFrom$).toEqual({
      status: "unknown",
      reason: "from-input-not-literal-array",
    });
    expect(staticSources.scheduledOf$).toEqual({
      status: "unknown",
      reason: "non-literal-of-argument",
    });
    expect(staticSources.subject$).toEqual({
      status: "unknown",
      reason: "constructor-not-allowlisted",
    });
    expect(staticSources.nonJsonNumberOf$).toEqual({
      status: "unknown",
      reason: "non-literal-of-argument",
    });
    expect(staticSources.protoKeyOf$).toEqual({
      status: "unknown",
      reason: "non-literal-of-argument",
    });
    expect(staticSources.numericKeyOf$).toEqual({
      status: "unknown",
      reason: "non-literal-of-argument",
    });
    expect(staticSources.numericExponentKeyOf$).toEqual({
      status: "unknown",
      reason: "non-literal-of-argument",
    });
    expect(staticSources.mappedFinite$).toEqual({
      status: "unknown",
      reason: "operator-or-call-not-allowlisted",
    });
    expect(staticSources.initialBehavior$).toEqual({
      status: "initial-only",
      source: "rxjs.BehaviorSubject",
      initialValue: { label: "Initial", value: "initial" },
    });
    expect(staticSources.opaqueProducer$).toEqual({
      status: "unknown",
      reason: "constructor-not-allowlisted",
    });
    expect(staticSources.sameSpellingButNotRxjs).toEqual({
      status: "unknown",
      reason: "operator-or-call-not-allowlisted",
    });
  });

  it("rejects object keys whose JavaScript literal semantics are ambiguous", () => {
    expect(runLiteralObjectKeyExperiment()).toEqual({
      safeIdentifier: { accepted: true, value: { label: "Safe" } },
      protoIdentifier: { accepted: false },
      protoString: { accepted: false },
      numeric: { accepted: false },
      numericExponent: { accepted: false },
      numericStringDuplicate: { accepted: false },
    });
  });

  it("demonstrates why subscribing is execution rather than type inspection", async () => {
    const result = await runRuntimeExperiment();

    expect(result.cold).toEqual({
      executionsBeforeSubscribe: 0,
      executionsAfterSubscribe: 1,
      observation: {
        values: ["cold-value"],
        completed: true,
        error: undefined,
        timedOut: false,
      },
    });
    expect(result.behavior.values).toEqual(["changed-before-subscribe"]);
    expect(result.behavior.completed).toBe(false);
    expect(result.behavior.timedOut).toBe(true);
    expect(result.finiteSynchronous).toEqual({
      values: ["one", "two"],
      completed: true,
      error: undefined,
      timedOut: false,
    });
    expect(result.finiteAsynchronous).toEqual({
      values: ["later"],
      completed: true,
      error: undefined,
      timedOut: false,
    });
    expect(result.error).toEqual({
      values: [],
      completed: false,
      error: "producer-failed",
      timedOut: false,
    });
    expect(result.never).toEqual({
      values: [],
      completed: false,
      error: undefined,
      timedOut: true,
    });
  });
});
