import { describe, expect, it } from "vitest";

import {
  canonicalizeAgentContextArtifactSet,
  createAgentContextArtifactSet,
  parseAgentContextArtifactSet,
  type Sha256Digest,
} from "./agent-context-artifacts.js";
import {
  canonicalizeAgentContextExecutionAuthority,
  createAgentContextExecutionAuthority,
  parseAgentContextExecutionAuthority,
} from "./agent-context-execution-authority.js";
import {
  canonicalizeAgentContextJourneyCatalog,
  canonicalizeAgentContextSourceUsageCatalog,
  createAgentContextJourneyCatalog,
  createAgentContextSourceUsageCatalog,
  parseAgentContextJourneyCatalog,
  parseAgentContextSourceUsageCatalog,
  validateAgentContextUsageJourneyReferences,
} from "./agent-context-usage.js";
import {
  createSyntheticRh05AgentContextFixtureSet,
  validateSyntheticRh05AgentContextFixtureSet,
  type SyntheticRh05AgentContextFixtureSet,
} from "./agent-context-walkthrough-fixtures.js";
import { canonicalStringify, createFormContract } from "./canonical-json.js";
import { parseFormContract } from "./validation.js";

type ShallowMutable<T extends object> = {
  -readonly [Key in keyof T]: T[Key];
};

function mutable<T extends object>(input: T): ShallowMutable<T> {
  return input;
}

function mutableArray<T>(input: readonly T[]): T[] {
  return input as T[];
}

function clonedFixture(): SyntheticRh05AgentContextFixtureSet {
  return structuredClone(createSyntheticRh05AgentContextFixtureSet());
}

function withoutContentHash<T extends { readonly contentHash: string }>(
  input: T
): Omit<T, "contentHash"> {
  const { contentHash, ...draft } = input;
  void contentHash;
  return draft;
}

function repinArtifactHash(
  fixture: SyntheticRh05AgentContextFixtureSet,
  previousHash: string,
  nextHash: Sha256Digest
): void {
  mutable(fixture).artifactSet = createAgentContextArtifactSet({
    ...withoutContentHash(fixture.artifactSet),
    artifacts: fixture.artifactSet.artifacts.map((reference) =>
      reference.contentHash === previousHash
        ? { ...reference, contentHash: nextHash }
        : reference
    ),
  });
}

function deepRejectedExtra(depth: number): object {
  let nested: object = {};
  for (let index = 0; index < depth; index += 1) {
    nested = { nested };
  }
  return nested;
}

describe("synthetic RH-05 agent-context fixtures", () => {
  it("creates exactly two visibly synthetic walkthroughs and eight pinned artifacts", () => {
    const fixture = createSyntheticRh05AgentContextFixtureSet();

    expect(fixture.kind).toBe("synthetic");
    expect(fixture.id).toBe("synthetic.rh05.agent-context-fixture-set");
    expect(fixture.researchBasis).toBe("RH-05");
    expect(Object.keys(fixture.walkthroughs)).toEqual(["positive", "negative"]);
    expect(fixture.walkthroughs.positive).toMatchObject({
      kind: "synthetic",
      polarity: "positive",
      researchBasis: "RH-05 walkthrough 1",
    });
    expect(fixture.walkthroughs.negative).toMatchObject({
      kind: "synthetic",
      polarity: "negative",
      researchBasis: "RH-05 walkthrough 2",
    });
    expect(fixture.artifactSet.artifacts).toHaveLength(8);
    expect(fixture.sourceUsageCatalog.coverage).toMatchObject({
      status: "incomplete",
      reasons: ["synthetic-fixture-only"],
    });
    expect(fixture.artifactSet.repositoryRevision).toBe(
      "synthetic.ctx-0d.rh05.v1"
    );

    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(fixture)
    ).not.toThrow();
  });

  it("round-trips every owner artifact through its strict parser and canonical serializer", () => {
    const fixture = createSyntheticRh05AgentContextFixtureSet();

    expect(
      canonicalizeAgentContextArtifactSet(
        parseAgentContextArtifactSet(fixture.artifactSet)
      )
    ).toBe(canonicalStringify(fixture.artifactSet));
    expect(
      canonicalizeAgentContextSourceUsageCatalog(
        parseAgentContextSourceUsageCatalog(fixture.sourceUsageCatalog)
      )
    ).toBe(canonicalStringify(fixture.sourceUsageCatalog));
    expect(
      canonicalizeAgentContextJourneyCatalog(
        parseAgentContextJourneyCatalog(fixture.journeyCatalog)
      )
    ).toBe(canonicalStringify(fixture.journeyCatalog));

    for (const walkthrough of Object.values(fixture.walkthroughs)) {
      expect(parseFormContract(walkthrough.declaredContract)).toEqual(
        walkthrough.declaredContract
      );
      expect(parseFormContract(walkthrough.resolvedContract)).toEqual(
        walkthrough.resolvedContract
      );
      expect(
        canonicalizeAgentContextExecutionAuthority(
          parseAgentContextExecutionAuthority(walkthrough.executionAuthority)
        )
      ).toBe(canonicalStringify(walkthrough.executionAuthority));
    }

    expect(() =>
      validateAgentContextUsageJourneyReferences(
        fixture.sourceUsageCatalog,
        fixture.journeyCatalog
      )
    ).not.toThrow();
  });

  it("is deterministic and returns fresh detached data", () => {
    const first = createSyntheticRh05AgentContextFixtureSet();
    const second = createSyntheticRh05AgentContextFixtureSet();

    expect(canonicalStringify(first)).toBe(canonicalStringify(second));
    expect(first).not.toBe(second);
    expect(first.artifactSet).not.toBe(second.artifactSet);
    expect(first.walkthroughs.positive.declaredContract).not.toBe(
      second.walkthroughs.positive.declaredContract
    );

    mutableArray(first.walkthroughs.positive.focusNodeIds).push(
      "synthetic.rh05.extra"
    );
    mutableArray(first.sourceUsageCatalog.usages).pop();
    mutableArray(
      first.walkthroughs.negative.executionAuthority.stateAssertions
    ).pop();

    expect(first.walkthroughs.positive.focusNodeIds).toContain(
      "synthetic.rh05.extra"
    );
    expect(first.sourceUsageCatalog.usages).toHaveLength(1);
    expect(
      first.walkthroughs.negative.executionAuthority.stateAssertions
    ).toHaveLength(0);
    expect(second.walkthroughs.positive.focusNodeIds).not.toContain(
      "synthetic.rh05.extra"
    );
    expect(second.sourceUsageCatalog.usages).toHaveLength(2);
    expect(
      second.walkthroughs.negative.executionAuthority.stateAssertions
    ).toHaveLength(1);
  });

  it("rejects extra fixture, walkthrough-map, and walkthrough record keys", () => {
    const fixtureExtra = clonedFixture();
    Object.assign(fixtureExtra, { driverRegistry: {} });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(fixtureExtra)
    ).toThrow(/fixture.*driverRegistry/u);

    const thirdWalkthrough = clonedFixture();
    Object.assign(thirdWalkthrough.walkthroughs, {
      third: thirdWalkthrough.walkthroughs.positive,
    });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(thirdWalkthrough)
    ).toThrow(/fixture\.walkthroughs.*third/u);

    const walkthroughExtra = clonedFixture();
    Object.assign(walkthroughExtra.walkthroughs.negative, {
      realEvidence: "not-synthetic",
    });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(walkthroughExtra)
    ).toThrow(/fixture\.walkthroughs\.negative.*realEvidence/u);

    const missingWalkthroughKey = clonedFixture();
    Reflect.deleteProperty(
      missingWalkthroughKey.walkthroughs.positive,
      "focusNodeIds"
    );
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(missingWalkthroughKey)
    ).toThrow(/fixture\.walkthroughs\.positive\.focusNodeIds.*required/u);
  });

  it("preserves and rejects enumerable own __proto__ keys at root and nested records", () => {
    const rootExtra = clonedFixture();
    Object.defineProperty(rootExtra, "__proto__", {
      configurable: true,
      enumerable: true,
      value: null,
      writable: true,
    });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(rootExtra)
    ).toThrow(/fixture\.__proto__/u);

    const nestedExtra = clonedFixture();
    Object.defineProperty(nestedExtra.walkthroughs.positive, "__proto__", {
      configurable: true,
      enumerable: true,
      value: null,
      writable: true,
    });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(nestedExtra)
    ).toThrow(/fixture\.walkthroughs\.positive\.__proto__/u);
  });

  it("correlates each named walkthrough with its exact polarity and research basis before owner parsing", () => {
    const polarityMismatch = clonedFixture();
    mutable(polarityMismatch.walkthroughs.positive).polarity = "negative";
    mutable(polarityMismatch.artifactSet).contentHash = `sha256:${"0".repeat(
      64
    )}`;
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(polarityMismatch)
    ).toThrow(/fixture\.walkthroughs\.positive\.polarity/u);

    const basisMismatch = clonedFixture();
    mutable(basisMismatch.walkthroughs.negative).researchBasis =
      "RH-05 walkthrough 1";
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(basisMismatch)
    ).toThrow(/fixture\.walkthroughs\.negative\.researchBasis/u);
  });

  it("rejects accessors without executing getters", () => {
    const fixture = clonedFixture();
    const artifactSet = fixture.artifactSet;
    let getterExecutions = 0;
    Object.defineProperty(fixture, "artifactSet", {
      configurable: true,
      enumerable: true,
      get: () => {
        getterExecutions += 1;
        return artifactSet;
      },
    });

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /fixture\.artifactSet.*accessor/u
    );
    expect(getterExecutions).toBe(0);
  });

  it("rejects proxies without executing traps", () => {
    const fixture = clonedFixture();
    let trapExecutions = 0;
    const proxy = new Proxy(fixture, {
      get: () => {
        trapExecutions += 1;
        throw new Error("proxy get trap executed");
      },
      ownKeys: (target) => {
        trapExecutions += 1;
        return Reflect.ownKeys(target);
      },
    });

    expect(() => validateSyntheticRh05AgentContextFixtureSet(proxy)).toThrow(
      /fixture.*proxy/u
    );
    expect(trapExecutions).toBe(0);
  });

  it("rejects deeply nested extras with a bounded TypeError before recursive descent", () => {
    const fixture = clonedFixture();
    Object.assign(fixture, { rejectedExtra: deepRejectedExtra(20_000) });

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /fixture.*maximum data graph depth of 128/u
    );
  });

  it("rejects oversized extras at the total data-graph budget", () => {
    const fixture = clonedFixture();
    Object.assign(fixture, {
      rejectedExtra: Array.from({ length: 100_001 }, () => null),
    });

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /fixture.*maximum data graph node count of 100000/u
    );
  });

  it.each([
    ["Date", new Date(0)],
    ["URL", new URL("https://synthetic.invalid/rh05")],
  ])("rejects a prototype-disguised %s fixture root", (_name, branded) => {
    const fixture = clonedFixture();
    Object.assign(branded, fixture);
    Object.setPrototypeOf(branded, Object.prototype);

    expect(() => validateSyntheticRh05AgentContextFixtureSet(branded)).toThrow(
      /fixture.*structured clone/u
    );
  });

  it("rejects cycles, nonordinary objects, symbols, sparse arrays, and extended arrays", () => {
    const cyclic = clonedFixture();
    Object.assign(cyclic.walkthroughs.positive.journey, {
      loop: cyclic.walkthroughs.positive.journey,
    });
    expect(() => validateSyntheticRh05AgentContextFixtureSet(cyclic)).toThrow(
      /cyclic/u
    );

    const nonordinary = clonedFixture();
    Object.setPrototypeOf(nonordinary.walkthroughs, { inherited: true });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(nonordinary)
    ).toThrow(/fixture\.walkthroughs.*ordinary/u);

    const symbolKey = clonedFixture();
    Object.defineProperty(symbolKey, Symbol("hidden"), {
      enumerable: true,
      value: true,
    });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(symbolKey)
    ).toThrow(/fixture.*symbol/u);

    const sparse = clonedFixture();
    mutable(sparse.walkthroughs.positive).focusNodeIds = new Array<string>(1);
    expect(() => validateSyntheticRh05AgentContextFixtureSet(sparse)).toThrow(
      /fixture\.walkthroughs\.positive\.focusNodeIds.*sparse/u
    );

    const extended = clonedFixture();
    Object.assign(extended.walkthroughs.positive.focusNodeIds, {
      extra: "synthetic.rh05.extra",
    });
    expect(() => validateSyntheticRh05AgentContextFixtureSet(extended)).toThrow(
      /fixture\.walkthroughs\.positive\.focusNodeIds.*extra/u
    );
  });

  it("preserves the positive shared blur and the negative validation-only blur", () => {
    const fixture = createSyntheticRh05AgentContextFixtureSet();
    const positive = fixture.walkthroughs.positive.executionAuthority;
    const negative = fixture.walkthroughs.negative.executionAuthority;
    const positiveBlur = positive.physicalOperations[0]!;
    const negativeBlur = negative.physicalOperations[0]!;

    expect(
      positive.commits.filter(
        (commit) =>
          commit.kind === "node-local" &&
          commit.execution === "explicit-intent" &&
          commit.physicalOperationId === positiveBlur.id
      )
    ).toHaveLength(1);
    expect(
      positive.validationSurfaces.filter(
        (surface) =>
          surface.activation.kind === "node-local" &&
          surface.activation.physicalOperationId === positiveBlur.id
      )
    ).toHaveLength(1);
    expect(
      negative.commits.filter(
        (commit) =>
          commit.kind === "node-local" &&
          commit.execution === "explicit-intent" &&
          commit.physicalOperationId === negativeBlur.id
      )
    ).toHaveLength(0);
    expect(
      negative.validationSurfaces.filter(
        (surface) =>
          surface.activation.kind === "node-local" &&
          surface.activation.physicalOperationId === negativeBlur.id
      )
    ).toHaveLength(1);
  });

  it("refuses an owner-valid repinned positive authority that splits the shared blur", () => {
    const fixture = clonedFixture();
    const walkthrough = fixture.walkthroughs.positive;
    const previousHash = walkthrough.executionAuthority.contentHash;
    const authority = structuredClone(walkthrough.executionAuthority);
    const sharedBlur = authority.physicalOperations[0]!;
    const validationBlur = {
      ...sharedBlur,
      id: "synthetic.rh05.purchase-order.total.validation-blur",
    };
    mutable(authority).physicalOperations = [sharedBlur, validationBlur];
    const activation = authority.validationSurfaces[0]!.activation;
    if (activation.kind !== "node-local") {
      throw new Error("Positive synthetic validation must be node-local.");
    }
    mutable(activation).physicalOperationId = validationBlur.id;
    mutable(walkthrough).executionAuthority =
      createAgentContextExecutionAuthority(withoutContentHash(authority));
    repinArtifactHash(
      fixture,
      previousHash,
      walkthrough.executionAuthority.contentHash
    );

    expect(() =>
      parseAgentContextExecutionAuthority(walkthrough.executionAuthority)
    ).not.toThrow();
    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.executionAuthority\.physicalOperations.*shared blur/u
    );
  });

  it("refuses an owner-valid repinned negative authority without its validation-only blur", () => {
    const fixture = clonedFixture();
    const walkthrough = fixture.walkthroughs.negative;
    const previousHash = walkthrough.executionAuthority.contentHash;
    const authority = structuredClone(walkthrough.executionAuthority);
    mutable(authority).physicalOperations = [];
    mutable(authority.validationSurfaces[0]!).activation = { kind: "none" };
    mutable(walkthrough).executionAuthority =
      createAgentContextExecutionAuthority(withoutContentHash(authority));
    repinArtifactHash(
      fixture,
      previousHash,
      walkthrough.executionAuthority.contentHash
    );

    expect(() =>
      parseAgentContextExecutionAuthority(walkthrough.executionAuthority)
    ).not.toThrow();
    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /negative\.executionAuthority\.physicalOperations.*validation-only blur/u
    );
  });

  it("refuses an owner-valid repinned positive authority without supplier readiness", () => {
    const fixture = clonedFixture();
    const walkthrough = fixture.walkthroughs.positive;
    const previousHash = walkthrough.executionAuthority.contentHash;
    const authority = structuredClone(walkthrough.executionAuthority);
    const supplierInteraction = authority.interactions.find(
      (interaction) =>
        interaction.id === "synthetic.rh05.purchase-order.supplier.select"
    );
    if (supplierInteraction === undefined) {
      throw new Error("Positive synthetic supplier interaction must resolve.");
    }
    mutable(authority).readiness = [];
    mutable(supplierInteraction).readinessIds = [];
    mutable(walkthrough).executionAuthority =
      createAgentContextExecutionAuthority(withoutContentHash(authority));
    repinArtifactHash(
      fixture,
      previousHash,
      walkthrough.executionAuthority.contentHash
    );

    expect(() =>
      parseAgentContextExecutionAuthority(walkthrough.executionAuthority)
    ).not.toThrow();
    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.executionAuthority\.readiness.*supplier readiness/u
    );
  });

  it("refuses empty fixture-specific focus nodes", () => {
    const fixture = clonedFixture();
    mutable(fixture.walkthroughs.positive).focusNodeIds = [];

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.focusNodeIds.*documented positive focus/u
    );
  });

  it("refuses redirected fixture-specific focus nodes", () => {
    const fixture = clonedFixture();
    mutable(fixture.walkthroughs.negative).focusNodeIds = [
      fixture.walkthroughs.negative.expectedNodeIds[0]!,
    ];

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /negative\.focusNodeIds.*other-details/u
    );
  });

  it("refuses duplicate fixture-specific focus nodes", () => {
    const fixture = clonedFixture();
    const otherDetails = fixture.walkthroughs.negative.focusNodeIds[0]!;
    mutable(fixture.walkthroughs.negative).focusNodeIds = [
      otherDetails,
      otherDetails,
    ];

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /negative\.focusNodeIds.*other-details/u
    );
  });

  it("refuses a rehashed scenario artifact mismatch", () => {
    const fixture = clonedFixture();
    const authority = fixture.walkthroughs.positive.executionAuthority;
    mutable(authority.scenario).artifactHash = `sha256:${"f".repeat(64)}`;
    mutable(fixture.walkthroughs.positive).executionAuthority =
      createAgentContextExecutionAuthority(withoutContentHash(authority));

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.executionAuthority\.scenario\.artifactHash/u
    );
  });

  it("refuses a rehashed CTX-0C usage identity mismatch", () => {
    const fixture = clonedFixture();
    const authority = fixture.walkthroughs.negative.executionAuthority;
    mutable(authority.usage).id = "synthetic.rh05.wrong-usage";
    mutable(fixture.walkthroughs.negative).executionAuthority =
      createAgentContextExecutionAuthority(withoutContentHash(authority));

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /negative\.executionAuthority\.usage/u
    );
  });

  it("refuses a rehashed journey form-basis mismatch", () => {
    const fixture = clonedFixture();
    const form = fixture.journeyCatalog.journeys[0]!.steps[0]!.forms[0]!;
    mutable(form).contractHash = `sha256:${"e".repeat(64)}`;
    mutable(fixture).journeyCatalog = createAgentContextJourneyCatalog(
      withoutContentHash(fixture.journeyCatalog)
    );

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /agentContextJourneyCatalog.*exact usage form/u
    );
  });

  it("refuses a caller-rehashed catalog with an extra source usage", () => {
    const fixture = clonedFixture();
    const sourceHash = fixture.sourceUsageCatalog.contentHash;
    const positiveUsage = fixture.sourceUsageCatalog.usages.find(
      (usage) =>
        usage.identity.kind === "declared" &&
        usage.identity.usageId ===
          fixture.walkthroughs.positive.usage.usageId &&
        usage.identity.version === fixture.walkthroughs.positive.usage.version
    );
    if (positiveUsage === undefined) {
      throw new Error("Positive synthetic fixture usage must resolve.");
    }
    const extraUsage = structuredClone(positiveUsage);
    if (extraUsage.identity.kind !== "declared") {
      throw new Error("Synthetic fixture usage must be declared.");
    }
    mutable(extraUsage.identity).version = 2;
    mutable(fixture).sourceUsageCatalog = createAgentContextSourceUsageCatalog({
      ...withoutContentHash(fixture.sourceUsageCatalog),
      usages: [...fixture.sourceUsageCatalog.usages, extraUsage],
    });
    repinArtifactHash(
      fixture,
      sourceHash,
      fixture.sourceUsageCatalog.contentHash
    );

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /sourceUsageCatalog\.usages.*exactly two/u
    );
  });

  it("refuses a caller-rehashed catalog with an extra journey independently", () => {
    const fixture = clonedFixture();
    const journeyHash = fixture.journeyCatalog.contentHash;
    const positiveJourney = fixture.journeyCatalog.journeys.find(
      (journey) =>
        journey.id === fixture.walkthroughs.positive.journey.id &&
        journey.version === fixture.walkthroughs.positive.journey.version
    );
    if (positiveJourney === undefined) {
      throw new Error("Positive synthetic fixture journey must resolve.");
    }
    const extraJourney = structuredClone(positiveJourney);
    mutable(extraJourney).version = 2;
    mutable(fixture).journeyCatalog = createAgentContextJourneyCatalog({
      ...withoutContentHash(fixture.journeyCatalog),
      journeys: [...fixture.journeyCatalog.journeys, extraJourney],
    });
    repinArtifactHash(fixture, journeyHash, fixture.journeyCatalog.contentHash);

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /journeyCatalog\.journeys.*exactly two/u
    );
  });

  it("refuses a caller-rehashed step with another walkthrough form and usage", () => {
    const fixture = clonedFixture();
    const journeyHash = fixture.journeyCatalog.contentHash;
    const positiveJourney = fixture.journeyCatalog.journeys.find(
      (journey) =>
        journey.id === fixture.walkthroughs.positive.journey.id &&
        journey.version === fixture.walkthroughs.positive.journey.version
    );
    const negativeJourney = fixture.journeyCatalog.journeys.find(
      (journey) =>
        journey.id === fixture.walkthroughs.negative.journey.id &&
        journey.version === fixture.walkthroughs.negative.journey.version
    );
    if (positiveJourney === undefined || negativeJourney === undefined) {
      throw new Error("Both synthetic fixture journeys must resolve.");
    }
    const positiveStep = positiveJourney.steps[0]!;
    const negativeStep = negativeJourney.steps[0]!;
    mutable(positiveStep).forms = [
      ...positiveStep.forms,
      negativeStep.forms[0]!,
    ];
    mutable(positiveStep).usages = [
      ...positiveStep.usages,
      negativeStep.usages[0]!,
    ];
    mutable(fixture).journeyCatalog = createAgentContextJourneyCatalog(
      withoutContentHash(fixture.journeyCatalog)
    );
    repinArtifactHash(fixture, journeyHash, fixture.journeyCatalog.contentHash);

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.journey\.step\.forms.*exactly the walkthrough-selected form/u
    );
  });

  it("refuses caller-rehashed journey and execution action divergence", () => {
    const fixture = clonedFixture();
    const walkthrough = fixture.walkthroughs.positive;
    const previousHash = walkthrough.executionAuthority.contentHash;
    const authority = structuredClone(walkthrough.executionAuthority);
    const actionId = "synthetic.rh05.operations.purchase-order.continue";
    const outcomeId = "synthetic.rh05.operations.purchase-order.continued";
    mutable(authority.usage.steps[0]!).actionIds = [actionId];
    mutable(authority.usage).actions = [
      {
        id: actionId,
        operation: "invoke-usage-action",
        kind: "other",
        driver: authority.usage.entry.driver,
        outcomeIds: [outcomeId],
      },
    ];
    mutable(authority.usage).outcomes = [
      {
        id: outcomeId,
        operation: "assert-outcome",
        kind: "message",
        assertionDriver: authority.usage.entry.driver,
        assertionTargetRef:
          "synthetic.rh05.operations.purchase-order.continue-message",
      },
    ];
    mutable(walkthrough).executionAuthority =
      createAgentContextExecutionAuthority(withoutContentHash(authority));
    repinArtifactHash(
      fixture,
      previousHash,
      walkthrough.executionAuthority.contentHash
    );

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.executionAuthority\.usage\.steps\[0\]\.actionIds.*journey/u
    );
  });

  it("refuses owner hash mutation and unknown keys before cross-family validation", () => {
    const hashMutation = clonedFixture();
    mutable(hashMutation.sourceUsageCatalog.usages[0]!).evidenceRefs = [
      "synthetic:rh05:hash-mutation",
    ];
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(hashMutation)
    ).toThrow(/agentContextSourceUsageCatalog\.contentHash/u);

    const unknownKey = clonedFixture();
    Object.assign(unknownKey.artifactSet, { unexpected: true });
    expect(() =>
      validateSyntheticRh05AgentContextFixtureSet(unknownKey)
    ).toThrow(/agentContextArtifactSet\.unexpected/u);
  });

  it("refuses artifacts that lose their visible synthetic identity", () => {
    const fixture = clonedFixture();
    const sourceCatalog = fixture.sourceUsageCatalog;
    mutable(sourceCatalog.usages[0]!).evidenceRefs = ["workplace:real-source"];
    mutable(fixture).sourceUsageCatalog = createAgentContextSourceUsageCatalog(
      withoutContentHash(sourceCatalog)
    );

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /sourceUsageCatalog.*synthetic/u
    );
  });

  it("refuses a caller-rehashed resolved contract mutation that breaks scenario pinning", () => {
    const fixture = clonedFixture();
    const resolved = fixture.walkthroughs.positive.resolvedContract;
    mutable(resolved.nodes[0]!.presentation!).label = "Mutated synthetic label";
    const rehashedResolved = createFormContract({
      ...resolved,
    });
    Object.assign(fixture.walkthroughs.positive, {
      resolvedContract: rehashedResolved,
    });

    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.executionAuthority\.scenario\.artifactHash/u
    );
  });

  it("refuses an owner-valid declared-like positive resolved contract after complete repinning", () => {
    const fixture = clonedFixture();
    const walkthrough = fixture.walkthroughs.positive;
    const previousResolvedHash = walkthrough.resolvedContract.contentHash;
    const previousAuthorityHash = walkthrough.executionAuthority.contentHash;
    const declared = walkthrough.declaredContract;
    const declaredLikeResolved = createFormContract({
      ...withoutContentHash(declared),
      nodes: declared.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              presentation: {
                ...node.presentation,
                label: "Synthetic supplier declared-like replacement",
              },
            }
          : node
      ),
    });
    mutable(walkthrough).resolvedContract = declaredLikeResolved;

    const authority = structuredClone(walkthrough.executionAuthority);
    mutable(authority.scenario).artifactHash =
      declaredLikeResolved.contentHash as Sha256Digest;
    mutable(walkthrough).executionAuthority =
      createAgentContextExecutionAuthority(withoutContentHash(authority));
    repinArtifactHash(
      fixture,
      previousResolvedHash,
      declaredLikeResolved.contentHash as Sha256Digest
    );
    repinArtifactHash(
      fixture,
      previousAuthorityHash,
      walkthrough.executionAuthority.contentHash
    );

    expect(() => parseFormContract(declaredLikeResolved)).not.toThrow();
    expect(() =>
      parseAgentContextExecutionAuthority(walkthrough.executionAuthority)
    ).not.toThrow();
    expect(() => validateSyntheticRh05AgentContextFixtureSet(fixture)).toThrow(
      /positive\.resolvedContract\.supplier.*scenario domain/u
    );
  });
});
