import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { canonicalStringify } from './canonical-json.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  canonicalizeAgentContextExecutionAuthority,
  computeAgentContextExecutionAuthorityHash,
  createAgentContextExecutionAuthority,
  parseAgentContextExecutionAuthority,
  type AgentContextExecutionAuthority,
  type AgentContextExecutionAuthorityDraft,
} from './agent-context-execution-authority.js';

const HASH_A = `sha256:${'a'.repeat(64)}` as const;
const HASH_B = `sha256:${'b'.repeat(64)}` as const;
const HASH_C = `sha256:${'c'.repeat(64)}` as const;

function authorityDraft(
  overrides: Partial<AgentContextExecutionAuthorityDraft> = {}
): AgentContextExecutionAuthorityDraft {
  const basis = {
    formId: 'orders.entry',
    contractHash: HASH_A,
  } as const;
  const fillDriver = {
    kind: 'generic',
    id: 'generic.fill',
    version: 1,
  } as const;
  const choiceDriver = {
    kind: 'generic',
    id: 'generic.choice',
    version: 1,
  } as const;
  const repeaterDriver = {
    kind: 'generic',
    id: 'generic.repeater',
    version: 1,
  } as const;
  const stateDriver = {
    kind: 'generic',
    id: 'generic.state',
    version: 3,
  } as const;
  const usageDriver = {
    kind: 'application',
    id: 'orders.entry.usage-driver',
    version: 2,
  } as const;

  return {
    schemaVersion: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    basis,
    scenario: {
      id: 'orders.entry.valid',
      version: 3,
      artifactHash: HASH_B,
      basis,
    },
    physicalOperations: [
      {
        id: 'orders.entry.total.blur',
        nodeId: 'orders.entry::total',
        mechanic: 'blur',
        partRef: 'control',
        locatorTargetRef: 'control',
      },
    ],
    readiness: [
      {
        id: 'orders.entry.product.options-ready',
        nodeId: 'orders.entry::product',
        owner: {
          kind: 'interaction',
          interactionId: 'orders.entry.product.choose',
        },
        operation: 'wait-readiness',
        driver: choiceDriver,
        partRef: 'popup',
        locatorTargetRef: 'popup',
      },
      {
        id: 'orders.entry.lines.add-ready',
        nodeId: 'orders.entry::lines',
        owner: {
          kind: 'repeater-capture',
          repeaterCaptureId: 'orders.entry.lines.created-item',
        },
        operation: 'wait-readiness',
        driver: repeaterDriver,
        partRef: 'add',
        locatorTargetRef: 'add',
      },
    ],
    interactions: [
      {
        id: 'orders.entry.total.fill',
        nodeId: 'orders.entry::total',
        stepId: 'details',
        profile: { id: 'native.input', version: 1 },
        driver: fillDriver,
        operation: 'fill',
        targets: [
          {
            purpose: 'control',
            partRef: 'control',
            locatorTargetRef: 'control',
          },
        ],
        readinessIds: [],
      },
      {
        id: 'orders.entry.product.choose',
        nodeId: 'orders.entry::product',
        stepId: 'details',
        profile: { id: 'orders.product-choice', version: 4 },
        driver: choiceDriver,
        operation: 'select-from-overlay',
        targets: [
          {
            purpose: 'trigger',
            partRef: 'trigger',
            locatorTargetRef: 'trigger',
          },
          {
            purpose: 'popup',
            partRef: 'popup',
            locatorTargetRef: 'popup',
          },
          {
            purpose: 'option',
            partRef: 'option',
            locatorTargetRef: 'option',
          },
        ],
        readinessIds: ['orders.entry.product.options-ready'],
      },
      {
        id: 'orders.entry.lines.expand',
        nodeId: 'orders.entry::lines',
        stepId: 'details',
        profile: { id: 'orders.line-repeater', version: 5 },
        driver: repeaterDriver,
        operation: 'expand-item',
        targets: [
          {
            purpose: 'item',
            partRef: 'item',
            locatorTargetRef: 'item',
          },
          {
            purpose: 'expand',
            partRef: 'expand',
            locatorTargetRef: 'expand',
          },
        ],
        readinessIds: [],
      },
    ],
    commits: [
      {
        id: 'orders.entry.total.commit-on-blur',
        nodeId: 'orders.entry::total',
        interactionId: 'orders.entry.total.fill',
        operation: 'commit-value',
        kind: 'node-local',
        mode: 'blur',
        execution: 'explicit-intent',
        physicalOperationId: 'orders.entry.total.blur',
      },
      {
        id: 'orders.entry.total.commit-on-submit',
        nodeId: 'orders.entry::total',
        interactionId: 'orders.entry.total.fill',
        operation: 'commit-value',
        kind: 'usage-action',
        actionId: 'orders.entry.submit',
      },
    ],
    validationSurfaces: [
      {
        id: 'orders.entry.total.minimum',
        nodeId: 'orders.entry::total',
        constraintId: 'minimum',
        activation: {
          kind: 'node-local',
          id: 'orders.entry.total.minimum.on-blur',
          operation: 'activate-validation',
          physicalOperationId: 'orders.entry.total.blur',
        },
        assertion: {
          id: 'orders.entry.total.minimum.message',
          operation: 'assert-validation',
          partRef: 'validation-message',
          locatorTargetRef: 'minimum-message',
        },
      },
    ],
    valueAssertions: [
      {
        id: 'orders.entry.total.committed-value',
        nodeId: 'orders.entry::total',
        operation: 'assert-value',
        kind: 'committed-model-value',
        partRef: 'model-value',
        locatorTargetRef: 'committed-value',
      },
    ],
    stateAssertions: [
      {
        id: 'orders.entry.product.available-state',
        version: 2,
        nodeId: 'orders.entry::product',
        operation: 'assert-state',
        states: ['visible', 'enabled'],
        driver: stateDriver,
        partRef: 'state-surface',
        locatorTargetRef: 'available-state',
      },
    ],
    usage: {
      id: 'orders.entry.usage',
      version: 7,
      basis,
      entry: {
        id: 'orders.entry.open',
        operation: 'open-usage',
        landingStepId: 'details',
        driver: usageDriver,
      },
      steps: [
        {
          id: 'confirmation',
          ordinal: 1,
          nodeIds: [],
          actionIds: [],
        },
        {
          id: 'details',
          ordinal: 0,
          nodeIds: [
            'orders.entry::total',
            'orders.entry::product',
            'orders.entry::lines',
          ],
          actionIds: ['orders.entry.submit'],
        },
      ],
      actions: [
        {
          id: 'orders.entry.submit',
          operation: 'invoke-usage-action',
          kind: 'submit',
          driver: usageDriver,
          outcomeIds: ['orders.entry.confirmed'],
        },
      ],
      outcomes: [
        {
          id: 'orders.entry.confirmed',
          operation: 'assert-outcome',
          kind: 'step-changed',
          assertionDriver: usageDriver,
          assertionTargetRef: 'confirmation-panel',
        },
      ],
      transitions: [
        {
          id: 'orders.entry.details-to-confirmation',
          version: 4,
          fromStepId: 'details',
          actionId: 'orders.entry.submit',
          outcomeId: 'orders.entry.confirmed',
          toStepId: 'confirmation',
        },
      ],
    },
    repeaterCaptures: [
      {
        id: 'orders.entry.lines.created-item',
        version: 6,
        repeaterNodeId: 'orders.entry::lines',
        stepId: 'details',
        profile: { id: 'orders.line-repeater', version: 5 },
        operation: 'add-item',
        guarantee: 'exactly-one-created-item',
        captureMode: 'driver-returned-item-scope',
        driver: repeaterDriver,
        addTarget: {
          partRef: 'add',
          locatorTargetRef: 'add',
        },
        itemTarget: {
          partRef: 'item',
          locatorTargetRef: 'item',
        },
        readinessIds: ['orders.entry.lines.add-ready'],
      },
    ],
    ...overrides,
  };
}

function createdAuthority(): AgentContextExecutionAuthority {
  return createAgentContextExecutionAuthority(authorityDraft());
}

function manualDraftHash(input: AgentContextExecutionAuthority): string {
  const draft = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== 'contentHash')
  );
  return `sha256:${createHash('sha256')
    .update(canonicalStringify(draft))
    .digest('hex')}`;
}

function replaceOwnProperty(input: object, key: string, value: unknown): void {
  Object.defineProperty(input, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function deeplyNestedData(depth: number): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let cursor = root;
  for (let level = 0; level < depth; level += 1) {
    const child: Record<string, unknown> = {};
    cursor.child = child;
    cursor = child;
  }
  return root;
}

function captureThrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

const PUBLIC_UNKNOWN_ENTRY_POINTS = [
  {
    name: 'create',
    input: () => authorityDraft() as unknown,
    invoke: (input: unknown) =>
      createAgentContextExecutionAuthority(
        input as AgentContextExecutionAuthorityDraft
      ),
  },
  {
    name: 'compute',
    input: () => authorityDraft() as unknown,
    invoke: (input: unknown) =>
      computeAgentContextExecutionAuthorityHash(input),
  },
  {
    name: 'parse',
    input: () => createdAuthority() as unknown,
    invoke: (input: unknown) => parseAgentContextExecutionAuthority(input),
  },
  {
    name: 'canonicalize',
    input: () => createdAuthority() as unknown,
    invoke: (input: unknown) =>
      canonicalizeAgentContextExecutionAuthority(input),
  },
] as const;

describe('agent context execution-authority identity', () => {
  it('creates, parses, and canonicalizes exact authority without losing selected facts', () => {
    const draft = authorityDraft();

    const created = createAgentContextExecutionAuthority(draft);
    const canonical = canonicalizeAgentContextExecutionAuthority(created);
    const reparsed = parseAgentContextExecutionAuthority(JSON.parse(canonical));

    expect(created.contentHash).toBe(
      computeAgentContextExecutionAuthorityHash(draft)
    );
    expect(created.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(reparsed).toEqual(created);
    expect(JSON.parse(canonical)).toEqual(created);
    expect(created.scenario).toEqual({
      id: 'orders.entry.valid',
      version: 3,
      artifactHash: HASH_B,
      basis: { formId: 'orders.entry', contractHash: HASH_A },
    });
    expect(created.interactions[1]).toMatchObject({
      profile: { id: 'orders.product-choice', version: 4 },
      driver: { kind: 'generic', id: 'generic.choice', version: 1 },
      operation: 'select-from-overlay',
      readinessIds: ['orders.entry.product.options-ready'],
    });
    expect(created.usage.transitions[0]).toEqual({
      id: 'orders.entry.details-to-confirmation',
      version: 4,
      fromStepId: 'details',
      actionId: 'orders.entry.submit',
      outcomeId: 'orders.entry.confirmed',
      toStepId: 'confirmation',
    });
    expect(created.repeaterCaptures[0]).toMatchObject({
      operation: 'add-item',
      guarantee: 'exactly-one-created-item',
      captureMode: 'driver-returned-item-scope',
      profile: { id: 'orders.line-repeater', version: 5 },
      driver: { kind: 'generic', id: 'generic.repeater', version: 1 },
      addTarget: { partRef: 'add', locatorTargetRef: 'add' },
      itemTarget: { partRef: 'item', locatorTargetRef: 'item' },
    });
  });

  it('normalizes every unordered authority collection before hashing', () => {
    const first = authorityDraft();
    const reversed = structuredClone(first);
    const mutable = reversed as unknown as {
      physicalOperations: unknown[];
      readiness: unknown[];
      interactions: { targets: unknown[]; readinessIds: string[] }[];
      commits: unknown[];
      validationSurfaces: unknown[];
      valueAssertions: unknown[];
      stateAssertions: { states: string[] }[];
      usage: {
        steps: { nodeIds: string[]; actionIds: string[] }[];
        actions: { outcomeIds: string[] }[];
        outcomes: unknown[];
        transitions: unknown[];
      };
      repeaterCaptures: unknown[];
    };
    mutable.physicalOperations.reverse();
    mutable.readiness.reverse();
    mutable.interactions.reverse();
    for (const interaction of mutable.interactions) {
      interaction.targets.reverse();
      interaction.readinessIds.reverse();
    }
    mutable.commits.reverse();
    mutable.validationSurfaces.reverse();
    mutable.valueAssertions.reverse();
    mutable.stateAssertions.reverse();
    mutable.stateAssertions[0]?.states.reverse();
    mutable.usage.steps.reverse();
    for (const step of mutable.usage.steps) {
      step.nodeIds.reverse();
      step.actionIds.reverse();
    }
    mutable.usage.actions.reverse();
    mutable.usage.actions[0]?.outcomeIds.reverse();
    mutable.usage.outcomes.reverse();
    mutable.usage.transitions.reverse();
    mutable.repeaterCaptures.reverse();

    const firstCreated = createAgentContextExecutionAuthority(first);
    const reversedCreated = createAgentContextExecutionAuthority(reversed);

    expect(computeAgentContextExecutionAuthorityHash(first)).toBe(
      computeAgentContextExecutionAuthorityHash(reversed)
    );
    expect(reversedCreated).toEqual(firstCreated);
    expect(canonicalizeAgentContextExecutionAuthority(reversedCreated)).toBe(
      canonicalizeAgentContextExecutionAuthority(firstCreated)
    );
    expect(firstCreated.usage.steps.map(({ id }) => id)).toEqual([
      'details',
      'confirmation',
    ]);
    expect(firstCreated.interactions.map(({ id }) => id)).toEqual([
      'orders.entry.lines.expand',
      'orders.entry.product.choose',
      'orders.entry.total.fill',
    ]);
  });

  it('keeps the independent scenario hash causal to authority identity', () => {
    const first = authorityDraft();
    const second = authorityDraft({
      scenario: { ...first.scenario, artifactHash: HASH_C },
    });

    expect(first.scenario.artifactHash).toBe(HASH_B);
    expect(computeAgentContextExecutionAuthorityHash(first)).not.toBe(
      computeAgentContextExecutionAuthorityHash(second)
    );
  });

  it('preserves one shared physical blur for commit and validation activation', () => {
    const created = createdAuthority();

    expect(created.physicalOperations).toEqual([
      {
        id: 'orders.entry.total.blur',
        nodeId: 'orders.entry::total',
        mechanic: 'blur',
        partRef: 'control',
        locatorTargetRef: 'control',
      },
    ]);
    expect(created.commits[0]).toMatchObject({
      physicalOperationId: 'orders.entry.total.blur',
    });
    expect(created.validationSurfaces[0]?.activation).toMatchObject({
      physicalOperationId: 'orders.entry.total.blur',
    });
  });

  it('allows validation activation to own a physical target independently', () => {
    const draft = authorityDraft();
    const validationSurfaces = structuredClone(
      draft.validationSurfaces
    ) as unknown as {
      activation: { physicalOperationId: string };
    }[];
    validationSurfaces[0]!.activation.physicalOperationId =
      'orders.entry.total.validation-click';

    const created = createAgentContextExecutionAuthority({
      ...draft,
      physicalOperations: [
        ...draft.physicalOperations,
        {
          id: 'orders.entry.total.validation-click',
          nodeId: 'orders.entry::total',
          mechanic: 'click',
          partRef: 'validation-trigger',
          locatorTargetRef: 'validation-trigger',
        },
      ],
      validationSurfaces: validationSurfaces as never,
    });

    expect(created.validationSurfaces[0]?.activation).toMatchObject({
      physicalOperationId: 'orders.entry.total.validation-click',
    });
  });

  it('rejects physical operations that no authority references', () => {
    const draft = authorityDraft();

    expect(() =>
      createAgentContextExecutionAuthority({
        ...draft,
        physicalOperations: [
          ...draft.physicalOperations,
          {
            id: 'orders.entry.total.unused-click',
            nodeId: 'orders.entry::total',
            mechanic: 'click',
            partRef: 'control',
            locatorTargetRef: 'control',
          },
        ],
      })
    ).toThrow(/physicalOperations\[1\]\.id.*commit or validation activation/u);
  });

  it('does not mutate drafts and returns detached data from create and parse', () => {
    const draft = authorityDraft();
    const before = structuredClone(draft);
    const created = createAgentContextExecutionAuthority(draft);
    const parseInput = structuredClone(created);
    const parsed = parseAgentContextExecutionAuthority(parseInput);
    const createdBytes = canonicalizeAgentContextExecutionAuthority(created);
    const parsedBytes = canonicalizeAgentContextExecutionAuthority(parsed);

    const mutableDraft = draft as unknown as {
      scenario: { id: string };
      interactions: { targets: { partRef: string }[] }[];
    };
    mutableDraft.scenario.id = 'mutated.scenario';
    mutableDraft.interactions[0]!.targets[0]!.partRef = 'mutated';
    const mutableParse = parseInput as unknown as {
      usage: { transitions: { toStepId: string }[] };
      repeaterCaptures: { guarantee: string }[];
    };
    mutableParse.usage.transitions[0]!.toStepId = 'mutated';
    mutableParse.repeaterCaptures[0]!.guarantee = 'mutated';

    expect(before.scenario.id).toBe('orders.entry.valid');
    expect(canonicalizeAgentContextExecutionAuthority(created)).toBe(
      createdBytes
    );
    expect(canonicalizeAgentContextExecutionAuthority(parsed)).toBe(
      parsedBytes
    );
  });
});

describe('agent context execution-authority strict shape and operations', () => {
  it.each(['0.0.9', '0.2.0'])(
    'rejects unsupported schema version %s',
    (schemaVersion) => {
      expect(() =>
        createAgentContextExecutionAuthority({
          ...authorityDraft(),
          schemaVersion,
        } as never)
      ).toThrow(/executionAuthority\.schemaVersion.*must be 0\.1\.0/u);
    }
  );

  it('rejects unknown and missing properties at nested levels', () => {
    expect(() =>
      createAgentContextExecutionAuthority({
        ...authorityDraft(),
        driverModule: './unsafe.js',
      } as never)
    ).toThrow(/executionAuthority\.driverModule.*not supported/u);

    const missing = structuredClone(authorityDraft()) as unknown as Record<
      string,
      unknown
    >;
    delete missing.scenario;
    expect(() =>
      createAgentContextExecutionAuthority(missing as never)
    ).toThrow(/executionAuthority\.scenario.*required/u);

    const nested = structuredClone(authorityDraft()) as unknown as {
      interactions: Record<string, unknown>[];
    };
    nested.interactions[0]!.selector = '#unsafe';
    expect(() => createAgentContextExecutionAuthority(nested as never)).toThrow(
      /interactions\[0\]\.selector.*not supported/u
    );

    const missingDriver = structuredClone(authorityDraft()) as unknown as {
      interactions: Record<string, unknown>[];
    };
    delete missingDriver.interactions[0]!.driver;
    expect(() =>
      createAgentContextExecutionAuthority(missingDriver as never)
    ).toThrow(/interactions\[0\]\.driver.*required/u);

    const legacyAssertionLink = structuredClone(
      authorityDraft()
    ) as unknown as {
      validationSurfaces: Record<string, unknown>[];
    };
    legacyAssertionLink.validationSurfaces[0]!.interactionId =
      'orders.entry.total.fill';
    expect(() =>
      createAgentContextExecutionAuthority(legacyAssertionLink as never)
    ).toThrow(/validationSurfaces\[0\]\.interactionId.*not supported/u);
  });

  it.each([
    ['interactions', 'operation', 'add-item'],
    ['readiness', 'operation', 'fill'],
    ['commits', 'operation', 'fill'],
    ['stateAssertions', 'operation', 'fill'],
    ['valueAssertions', 'operation', 'fill'],
    ['repeaterCaptures', 'operation', 'expand-item'],
  ] as const)(
    'rejects wrong %s %s %s instead of trusting the operation name',
    (collection, key, value) => {
      const draft = structuredClone(authorityDraft()) as unknown as Record<
        string,
        Record<string, unknown>[]
      >;
      draft[collection]![0]![key] = value;

      expect(() =>
        createAgentContextExecutionAuthority(draft as never)
      ).toThrow(new RegExp(`${collection}\\[0\\]\\.${key}.*must be`));
    }
  );

  it('rejects wrong usage operation literals', () => {
    const entry = structuredClone(authorityDraft()) as unknown as {
      usage: { entry: { operation: string } };
    };
    entry.usage.entry.operation = 'fill';
    expect(() => createAgentContextExecutionAuthority(entry as never)).toThrow(
      /usage\.entry\.operation.*must be "open-usage"/u
    );

    const action = structuredClone(authorityDraft()) as unknown as {
      usage: { actions: { operation: string }[] };
    };
    action.usage.actions[0]!.operation = 'click';
    expect(() => createAgentContextExecutionAuthority(action as never)).toThrow(
      /usage\.actions\[0\]\.operation.*must be "invoke-usage-action"/u
    );

    const outcome = structuredClone(authorityDraft()) as unknown as {
      usage: { outcomes: { operation: string }[] };
    };
    outcome.usage.outcomes[0]!.operation = 'visible';
    expect(() =>
      createAgentContextExecutionAuthority(outcome as never)
    ).toThrow(/usage\.outcomes\[0\]\.operation.*must be "assert-outcome"/u);
  });

  it('rejects malformed IDs, hashes, versions, guarantees, and modes', () => {
    expect(() =>
      createAgentContextExecutionAuthority(
        authorityDraft({ basis: { formId: '../orders', contractHash: HASH_A } })
      )
    ).toThrow(/basis\.formId.*stable identifier/u);
    expect(() =>
      createAgentContextExecutionAuthority(
        authorityDraft({
          basis: { formId: 'orders.entry', contractHash: 'bad' as never },
        })
      )
    ).toThrow(/basis\.contractHash.*sha256 digest/u);

    const version = structuredClone(authorityDraft()) as unknown as {
      scenario: { version: number };
    };
    version.scenario.version = 0;
    expect(() =>
      createAgentContextExecutionAuthority(version as never)
    ).toThrow(/scenario\.version.*positive safe integer/u);

    const guarantee = structuredClone(authorityDraft()) as unknown as {
      repeaterCaptures: { guarantee: string; captureMode: string }[];
    };
    guarantee.repeaterCaptures[0]!.guarantee = 'one-or-more-items';
    expect(() =>
      createAgentContextExecutionAuthority(guarantee as never)
    ).toThrow(/repeaterCaptures\[0\]\.guarantee.*exactly-one-created-item/u);
    guarantee.repeaterCaptures[0]!.guarantee = 'exactly-one-created-item';
    guarantee.repeaterCaptures[0]!.captureMode = 'query-first-row';
    expect(() =>
      createAgentContextExecutionAuthority(guarantee as never)
    ).toThrow(
      /repeaterCaptures\[0\]\.captureMode.*driver-returned-item-scope/u
    );
  });
});

describe('agent context execution-authority exact internal resolution', () => {
  it('rejects duplicate identities, targets, states, and ambiguous ownership', () => {
    const duplicateInteraction = authorityDraft();
    expect(() =>
      createAgentContextExecutionAuthority({
        ...duplicateInteraction,
        interactions: [
          ...duplicateInteraction.interactions,
          duplicateInteraction.interactions[0]!,
        ],
      })
    ).toThrow(/interactions\[3\]\.id.*duplicate/u);

    const duplicateTarget = structuredClone(authorityDraft()) as unknown as {
      interactions: { targets: unknown[] }[];
    };
    duplicateTarget.interactions[0]!.targets.push(
      duplicateTarget.interactions[0]!.targets[0]
    );
    expect(() =>
      createAgentContextExecutionAuthority(duplicateTarget as never)
    ).toThrow(/interactions\[0\]\.targets\[1\].*duplicate/u);

    const duplicateState = structuredClone(authorityDraft()) as unknown as {
      stateAssertions: { states: string[] }[];
    };
    duplicateState.stateAssertions[0]!.states = ['enabled', 'enabled'];
    expect(() =>
      createAgentContextExecutionAuthority(duplicateState as never)
    ).toThrow(/stateAssertions\[0\]\.states\[1\].*duplicate/u);

    const duplicateNodeMembership = structuredClone(
      authorityDraft()
    ) as unknown as {
      usage: { steps: { nodeIds: string[] }[] };
    };
    duplicateNodeMembership.usage.steps[0]!.nodeIds.push('orders.entry::total');
    expect(() =>
      createAgentContextExecutionAuthority(duplicateNodeMembership as never)
    ).toThrow(/usage\.steps\[1\]\.nodeIds.*more than one step/u);

    const duplicateActionOwnership = structuredClone(
      authorityDraft()
    ) as unknown as {
      usage: { steps: { actionIds: string[] }[] };
    };
    duplicateActionOwnership.usage.steps[0]!.actionIds.push(
      'orders.entry.submit'
    );
    expect(() =>
      createAgentContextExecutionAuthority(duplicateActionOwnership as never)
    ).toThrow(/usage\.steps\[1\]\.actionIds.*more than one step/u);
  });

  it.each([
    ['interactions', 'stepId', 'missing-step'],
    ['physicalOperations', 'nodeId', 'orders.entry::missing'],
    ['commits', 'interactionId', 'missing-interaction'],
    ['validationSurfaces', 'nodeId', 'orders.entry::missing'],
    ['valueAssertions', 'nodeId', 'orders.entry::missing'],
    ['stateAssertions', 'nodeId', 'orders.entry::missing'],
    ['repeaterCaptures', 'repeaterNodeId', 'orders.entry::missing'],
  ] as const)('rejects unresolved %s.%s links', (collection, key, value) => {
    const draft = structuredClone(authorityDraft()) as unknown as Record<
      string,
      Record<string, unknown>[]
    >;
    draft[collection]![0]![key] = value;

    expect(() => createAgentContextExecutionAuthority(draft as never)).toThrow(
      new RegExp(`${collection}\\[\\d+\\]\\.${key}.*resolve`)
    );
  });

  it('rejects cross-basis scenario and usage records', () => {
    const scenario = structuredClone(authorityDraft()) as unknown as {
      scenario: { basis: { formId: string; contractHash: string } };
    };
    scenario.scenario.basis = {
      ...scenario.scenario.basis,
      contractHash: HASH_C,
    };
    expect(() =>
      createAgentContextExecutionAuthority(scenario as never)
    ).toThrow(/scenario\.basis.*top-level basis/u);

    const usage = structuredClone(authorityDraft()) as unknown as {
      usage: { basis: { formId: string; contractHash: string } };
    };
    usage.usage.basis = { ...usage.usage.basis, formId: 'orders.other' };
    expect(() => createAgentContextExecutionAuthority(usage as never)).toThrow(
      /usage\.basis.*top-level basis/u
    );
  });

  it('rejects mismatched interaction node, step, driver, target, and readiness links', () => {
    const step = structuredClone(authorityDraft()) as unknown as {
      interactions: { stepId: string }[];
    };
    step.interactions[0]!.stepId = 'confirmation';
    expect(() => createAgentContextExecutionAuthority(step as never)).toThrow(
      /interactions\[\d+\]\.stepId.*node membership/u
    );

    const physicalTarget = structuredClone(authorityDraft()) as unknown as {
      physicalOperations: { partRef: string }[];
    };
    physicalTarget.physicalOperations[0]!.partRef = 'other';
    expect(() =>
      createAgentContextExecutionAuthority(physicalTarget as never)
    ).toThrow(
      /commits\[0\]\.physicalOperationId.*exact blur physical operation/u
    );

    const readinessDriver = structuredClone(authorityDraft()) as unknown as {
      readiness: {
        driver: {
          kind: 'generic' | 'application';
          id: string;
          version: number;
        };
      }[];
    };
    readinessDriver.readiness[0]!.driver = {
      ...readinessDriver.readiness[0]!.driver,
      version: 99,
    };
    expect(() =>
      createAgentContextExecutionAuthority(readinessDriver as never)
    ).toThrow(/readiness\[1\]\.driver.*interaction driver/u);

    const readinessId = structuredClone(authorityDraft()) as unknown as {
      interactions: { readinessIds: string[] }[];
    };
    readinessId.interactions[1]!.readinessIds = [
      'orders.entry.product.options-ready',
      'missing-readiness',
    ];
    expect(() =>
      createAgentContextExecutionAuthority(readinessId as never)
    ).toThrow(/interactions\[1\]\.readinessIds\[0\].*resolve/u);
  });

  it('requires disjoint bidirectional readiness ownership', () => {
    const borrowedByCapture = structuredClone(authorityDraft()) as unknown as {
      repeaterCaptures: { readinessIds: string[] }[];
    };
    borrowedByCapture.repeaterCaptures[0]!.readinessIds = [
      'orders.entry.lines.add-ready',
      'orders.entry.product.options-ready',
    ];
    expect(() =>
      createAgentContextExecutionAuthority(borrowedByCapture as never)
    ).toThrow(
      /repeaterCaptures\[0\]\.readinessIds\[1\].*owned by the selected repeater capture/u
    );

    const borrowedByInteraction = structuredClone(
      authorityDraft()
    ) as unknown as {
      interactions: { readinessIds: string[] }[];
    };
    borrowedByInteraction.interactions[2]!.readinessIds = [
      'orders.entry.lines.add-ready',
    ];
    expect(() =>
      createAgentContextExecutionAuthority(borrowedByInteraction as never)
    ).toThrow(
      /interactions\[0\]\.readinessIds\[0\].*owned by the selected interaction/u
    );

    const omittedByOwner = structuredClone(authorityDraft()) as unknown as {
      interactions: { readinessIds: string[] }[];
    };
    omittedByOwner.interactions[1]!.readinessIds = [];
    expect(() =>
      createAgentContextExecutionAuthority(omittedByOwner as never)
    ).toThrow(/readiness\[1\]\.owner\.interactionId.*owner's readinessIds/u);

    const omittedByCaptureOwner = structuredClone(
      authorityDraft()
    ) as unknown as {
      repeaterCaptures: { readinessIds: string[] }[];
    };
    omittedByCaptureOwner.repeaterCaptures[0]!.readinessIds = [];
    expect(() =>
      createAgentContextExecutionAuthority(omittedByCaptureOwner as never)
    ).toThrow(
      /readiness\[0\]\.owner\.repeaterCaptureId.*owner's readinessIds/u
    );

    const unresolvedOwner = structuredClone(authorityDraft()) as unknown as {
      readiness: {
        owner: { kind: string; interactionId?: string };
      }[];
    };
    unresolvedOwner.readiness[0]!.owner = {
      kind: 'interaction',
      interactionId: 'missing-interaction',
    };
    expect(() =>
      createAgentContextExecutionAuthority(unresolvedOwner as never)
    ).toThrow(/readiness\[1\]\.owner\.interactionId.*resolve/u);

    const overlappingOwner = structuredClone(authorityDraft()) as unknown as {
      readiness: {
        owner: Record<string, unknown>;
      }[];
    };
    overlappingOwner.readiness[0]!.owner.repeaterCaptureId =
      'orders.entry.lines.created-item';
    expect(() =>
      createAgentContextExecutionAuthority(overlappingOwner as never)
    ).toThrow(
      /readiness\[0\]\.owner\.repeaterCaptureId.*not supported for this readiness owner/u
    );

    const wrongCaptureTarget = structuredClone(authorityDraft()) as unknown as {
      readiness: { partRef: string; locatorTargetRef: string }[];
    };
    wrongCaptureTarget.readiness[1]!.partRef = 'expand';
    wrongCaptureTarget.readiness[1]!.locatorTargetRef = 'expand';
    expect(() =>
      createAgentContextExecutionAuthority(wrongCaptureTarget as never)
    ).toThrow(/readiness\[0\].*exact repeater-capture target/u);
  });

  it('represents capture-owned readiness without an ordinary repeater interaction', () => {
    const draft = authorityDraft();
    const created = createAgentContextExecutionAuthority({
      ...draft,
      interactions: draft.interactions.filter(
        ({ id }) => id !== 'orders.entry.lines.expand'
      ),
    });

    expect(created.readiness[0]).toMatchObject({
      id: 'orders.entry.lines.add-ready',
      owner: {
        kind: 'repeater-capture',
        repeaterCaptureId: 'orders.entry.lines.created-item',
      },
    });
  });

  it('rejects commit and validation authorities that do not match their exact operation', () => {
    const commitNode = structuredClone(authorityDraft()) as unknown as {
      commits: { nodeId: string }[];
    };
    commitNode.commits[0]!.nodeId = 'orders.entry::product';
    expect(() =>
      createAgentContextExecutionAuthority(commitNode as never)
    ).toThrow(/commits\[0\]\.nodeId.*interaction node/u);

    const commitPhysical = structuredClone(authorityDraft()) as unknown as {
      commits: { physicalOperationId?: string }[];
    };
    commitPhysical.commits[0]!.physicalOperationId = 'missing-operation';
    expect(() =>
      createAgentContextExecutionAuthority(commitPhysical as never)
    ).toThrow(/commits\[0\]\.physicalOperationId.*resolve/u);

    const wrongMechanic = structuredClone(authorityDraft()) as unknown as {
      physicalOperations: { mechanic: string }[];
    };
    wrongMechanic.physicalOperations[0]!.mechanic = 'click';
    expect(() =>
      createAgentContextExecutionAuthority(wrongMechanic as never)
    ).toThrow(/commits\[0\]\.physicalOperationId.*blur/u);

    const action = structuredClone(authorityDraft()) as unknown as {
      commits: { actionId?: string }[];
    };
    action.commits[1]!.actionId = 'missing-action';
    expect(() => createAgentContextExecutionAuthority(action as never)).toThrow(
      /commits\[1\]\.actionId.*resolve/u
    );

    const activation = structuredClone(authorityDraft()) as unknown as {
      validationSurfaces: {
        activation: { physicalOperationId?: string };
      }[];
    };
    activation.validationSurfaces[0]!.activation.physicalOperationId =
      'missing-operation';
    expect(() =>
      createAgentContextExecutionAuthority(activation as never)
    ).toThrow(
      /validationSurfaces\[0\]\.activation\.physicalOperationId.*resolve/u
    );
  });

  it('does not share one physical operation across different commit interactions', () => {
    const draft = authorityDraft();

    expect(() =>
      createAgentContextExecutionAuthority({
        ...draft,
        interactions: [
          ...draft.interactions,
          {
            id: 'orders.entry.total.alternate-fill',
            nodeId: 'orders.entry::total',
            stepId: 'details',
            profile: { id: 'native.input', version: 1 },
            driver: {
              kind: 'generic',
              id: 'generic.fill',
              version: 1,
            },
            operation: 'fill',
            targets: [
              {
                purpose: 'control',
                partRef: 'control',
                locatorTargetRef: 'control',
              },
            ],
            readinessIds: [],
          },
        ],
        commits: [
          ...draft.commits,
          {
            id: 'orders.entry.total.alternate-commit',
            nodeId: 'orders.entry::total',
            interactionId: 'orders.entry.total.alternate-fill',
            operation: 'commit-value',
            kind: 'node-local',
            mode: 'blur',
            execution: 'explicit-intent',
            physicalOperationId: 'orders.entry.total.blur',
          },
        ],
      })
    ).toThrow(
      /physicalOperationId.*must not bind one physical operation to multiple interactions/u
    );
  });

  it('retains independent assertion targets and state drivers', () => {
    const created = createdAuthority();

    expect(created.validationSurfaces[0]).toMatchObject({
      nodeId: 'orders.entry::total',
      assertion: {
        partRef: 'validation-message',
        locatorTargetRef: 'minimum-message',
      },
    });
    expect(created.valueAssertions[0]).toMatchObject({
      nodeId: 'orders.entry::total',
      partRef: 'model-value',
      locatorTargetRef: 'committed-value',
    });
    expect(created.stateAssertions[0]).toMatchObject({
      nodeId: 'orders.entry::product',
      driver: { kind: 'generic', id: 'generic.state', version: 3 },
      partRef: 'state-surface',
      locatorTargetRef: 'available-state',
    });
  });

  it('rejects capture facts that differ from selected authority', () => {
    const captureStep = structuredClone(authorityDraft()) as unknown as {
      repeaterCaptures: { stepId: string }[];
    };
    captureStep.repeaterCaptures[0]!.stepId = 'confirmation';
    expect(() =>
      createAgentContextExecutionAuthority(captureStep as never)
    ).toThrow(/repeaterCaptures\[0\]\.stepId.*node membership/u);

    const identicalTargets = structuredClone(authorityDraft()) as unknown as {
      repeaterCaptures: {
        addTarget: { partRef: string; locatorTargetRef: string };
        itemTarget: { partRef: string; locatorTargetRef: string };
      }[];
    };
    identicalTargets.repeaterCaptures[0]!.itemTarget = {
      ...identicalTargets.repeaterCaptures[0]!.addTarget,
    };
    expect(() =>
      createAgentContextExecutionAuthority(identicalTargets as never)
    ).toThrow(/repeaterCaptures\[0\]\.itemTarget.*must differ from addTarget/u);
  });

  it('rejects usage-action authority owned by a different node step', () => {
    const draft = structuredClone(authorityDraft()) as unknown as {
      usage: {
        steps: { id: string; actionIds: string[] }[];
        transitions: { fromStepId: string; toStepId: string }[];
      };
    };
    draft.usage.steps[0]!.actionIds = ['orders.entry.submit'];
    draft.usage.steps[1]!.actionIds = [];
    draft.usage.transitions[0]!.fromStepId = 'confirmation';
    draft.usage.transitions[0]!.toStepId = 'details';

    expect(() => createAgentContextExecutionAuthority(draft as never)).toThrow(
      /commits\[1\]\.actionId.*same step/u
    );
  });

  it('requires exact entry and transition referential integrity', () => {
    const entry = structuredClone(authorityDraft()) as unknown as {
      usage: { entry: { landingStepId: string } };
    };
    entry.usage.entry.landingStepId = 'missing-step';
    expect(() => createAgentContextExecutionAuthority(entry as never)).toThrow(
      /usage\.entry\.landingStepId.*resolve/u
    );

    const transitionAction = structuredClone(authorityDraft()) as unknown as {
      usage: { transitions: { actionId: string }[] };
    };
    transitionAction.usage.transitions[0]!.actionId = 'missing-action';
    expect(() =>
      createAgentContextExecutionAuthority(transitionAction as never)
    ).toThrow(/usage\.transitions\[0\]\.actionId.*resolve/u);

    const transitionOutcome = structuredClone(authorityDraft()) as unknown as {
      usage: { transitions: { outcomeId: string }[] };
    };
    transitionOutcome.usage.transitions[0]!.outcomeId = 'missing-outcome';
    expect(() =>
      createAgentContextExecutionAuthority(transitionOutcome as never)
    ).toThrow(/usage\.transitions\[0\]\.outcomeId.*resolve/u);

    const nonChanging = structuredClone(authorityDraft()) as unknown as {
      usage: { outcomes: { kind: string }[] };
    };
    nonChanging.usage.outcomes[0]!.kind = 'message';
    expect(() =>
      createAgentContextExecutionAuthority(nonChanging as never)
    ).toThrow(/usage\.transitions\[0\]\.outcomeId.*step-changed/u);

    const wrongSource = structuredClone(authorityDraft()) as unknown as {
      usage: { transitions: { fromStepId: string }[] };
    };
    wrongSource.usage.transitions[0]!.fromStepId = 'confirmation';
    expect(() =>
      createAgentContextExecutionAuthority(wrongSource as never)
    ).toThrow(/usage\.transitions\[0\]\.actionId.*source step/u);
  });
});

describe('agent context execution-authority canonical and adversarial refusal', () => {
  it.each(PUBLIC_UNKNOWN_ENTRY_POINTS)(
    '$name rejects a 20,000-level extra graph with a bounded TypeError',
    ({ input, invoke }) => {
      const candidate = input() as object;
      replaceOwnProperty(candidate, 'extra', deeplyNestedData(20_000));

      const error = captureThrown(() => invoke(candidate));

      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toMatch(
        /executionAuthority\.extra.*maximum data graph depth of 128/u
      );
    }
  );

  it.each(PUBLIC_UNKNOWN_ENTRY_POINTS)(
    '$name rejects an oversized extra graph with the shared node budget',
    ({ input, invoke }) => {
      const candidate = input() as object;
      replaceOwnProperty(candidate, 'extra', Array(100_001).fill(null));

      const error = captureThrown(() => invoke(candidate));

      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toMatch(
        /maximum data graph node count of 100000/u
      );
    }
  );

  it('normalizes accepted negative-zero ordinals before hashing and round-trip', () => {
    const negativeZeroDraft = structuredClone(authorityDraft()) as unknown as {
      usage: { steps: { id: string; ordinal: number }[] };
    };
    negativeZeroDraft.usage.steps.find(
      (step) => step.id === 'details'
    )!.ordinal = -0;
    const positiveZeroDraft = authorityDraft();

    const created = createAgentContextExecutionAuthority(
      negativeZeroDraft as never
    );
    const createdOrdinal = created.usage.steps.find(
      (step) => step.id === 'details'
    )!.ordinal;

    expect(Object.is(createdOrdinal, -0)).toBe(false);
    expect(Object.is(createdOrdinal, 0)).toBe(true);
    expect(created.contentHash).toBe(
      computeAgentContextExecutionAuthorityHash(positiveZeroDraft)
    );
    expect(computeAgentContextExecutionAuthorityHash(negativeZeroDraft)).toBe(
      computeAgentContextExecutionAuthorityHash(positiveZeroDraft)
    );

    const negativeZeroArtifact = structuredClone(created) as unknown as {
      usage: { steps: { id: string; ordinal: number }[] };
    };
    negativeZeroArtifact.usage.steps.find(
      (step) => step.id === 'details'
    )!.ordinal = -0;
    const parsed = parseAgentContextExecutionAuthority(negativeZeroArtifact);

    expect(
      Object.is(
        parsed.usage.steps.find((step) => step.id === 'details')!.ordinal,
        -0
      )
    ).toBe(false);
    expect(
      canonicalizeAgentContextExecutionAuthority(negativeZeroArtifact)
    ).toBe(canonicalizeAgentContextExecutionAuthority(created));
  });

  it('rejects non-canonical full artifacts and stale hashes after mutation', () => {
    const created = createdAuthority();
    const reversed = structuredClone(created) as unknown as {
      interactions: unknown[];
    };
    reversed.interactions.reverse();
    expect(() => parseAgentContextExecutionAuthority(reversed)).toThrow(
      /executionAuthority\.interactions.*canonical order/u
    );

    const mutated = structuredClone(created) as unknown as {
      scenario: { id: string };
    };
    mutated.scenario.id = 'orders.entry.changed';
    expect(() => parseAgentContextExecutionAuthority(mutated)).toThrow(
      /executionAuthority\.contentHash.*does not match/u
    );
  });

  it('rejects a caller-rehashed cross-basis mutation before consumption', () => {
    const mutated = structuredClone(createdAuthority()) as unknown as {
      contentHash: string;
      scenario: { basis: { contractHash: string } };
    };
    mutated.scenario.basis.contractHash = HASH_C;
    mutated.contentHash = manualDraftHash(
      mutated as AgentContextExecutionAuthority
    );

    expect(() => parseAgentContextExecutionAuthority(mutated)).toThrow(
      /executionAuthority\.scenario\.basis.*top-level basis/u
    );
  });

  it('rejects sparse, extended, and non-enumerable arrays', () => {
    const sparse = structuredClone(authorityDraft()) as unknown as {
      interactions: unknown[];
    };
    sparse.interactions = new Array(1);
    expect(() => createAgentContextExecutionAuthority(sparse as never)).toThrow(
      /interactions\[0\].*sparse/u
    );

    const extended = structuredClone(authorityDraft()) as unknown as {
      interactions: unknown[] & { selector?: string };
    };
    extended.interactions.selector = '#unsafe';
    expect(() =>
      createAgentContextExecutionAuthority(extended as never)
    ).toThrow(/interactions\.selector.*supported array property/u);

    const nonEnumerable = structuredClone(authorityDraft()) as unknown as {
      interactions: unknown[];
    };
    Object.defineProperty(nonEnumerable.interactions, '0', {
      enumerable: false,
      value: nonEnumerable.interactions[0],
      writable: true,
    });
    expect(() =>
      createAgentContextExecutionAuthority(nonEnumerable as never)
    ).toThrow(/interactions\[0\].*enumerable/u);
  });

  it('rejects symbols and accessors without invoking getters', () => {
    const symbolKeyed = authorityDraft() as unknown as Record<
      string | symbol,
      unknown
    >;
    symbolKeyed[Symbol('driver')] = './unsafe.js';
    expect(() =>
      createAgentContextExecutionAuthority(symbolKeyed as never)
    ).toThrow(/executionAuthority.*symbol-keyed/u);

    const accessor = authorityDraft();
    let getterCalls = 0;
    Object.defineProperty(accessor.scenario, 'artifactHash', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return HASH_B;
      },
    });
    expect(() => createAgentContextExecutionAuthority(accessor)).toThrow(
      /scenario\.artifactHash.*data property/u
    );
    expect(getterCalls).toBe(0);
  });

  it('rejects class instances, dates, exotic arrays, proxies, and cycles', () => {
    const classInstance = Object.assign(
      new (class ExecutionAuthority {})(),
      authorityDraft()
    );
    expect(() =>
      createAgentContextExecutionAuthority(classInstance as never)
    ).toThrow(/executionAuthority.*plain object/u);

    expect(() =>
      createAgentContextExecutionAuthority(
        authorityDraft({ scenario: new Date() as never })
      )
    ).toThrow(/scenario.*plain object/u);

    const exotic = structuredClone(authorityDraft()) as unknown as {
      interactions: unknown[];
    };
    Object.setPrototypeOf(exotic.interactions, null);
    expect(() => createAgentContextExecutionAuthority(exotic as never)).toThrow(
      /interactions.*ordinary array/u
    );

    let traps = 0;
    const proxied = new Proxy(authorityDraft(), {
      getOwnPropertyDescriptor() {
        traps += 1;
        throw new Error('must not inspect proxy');
      },
      getPrototypeOf() {
        traps += 1;
        throw new Error('must not inspect proxy');
      },
      ownKeys() {
        traps += 1;
        throw new Error('must not inspect proxy');
      },
    });
    expect(() => createAgentContextExecutionAuthority(proxied)).toThrow(
      /executionAuthority.*proxy/u
    );
    expect(traps).toBe(0);

    const cyclic = authorityDraft() as unknown as Record<string, unknown>;
    replaceOwnProperty(cyclic, 'scenario', cyclic);
    expect(() => createAgentContextExecutionAuthority(cyclic as never)).toThrow(
      /executionAuthority\.scenario.*cycle/u
    );
  });

  it('rejects full artifacts passed to the draft hash API', () => {
    expect(() =>
      computeAgentContextExecutionAuthorityHash(createdAuthority())
    ).toThrow(/executionAuthority\.contentHash.*not supported/u);
  });
});
