import { describe, expect, it } from 'vitest';

import {
  createAgentContextArtifactSet,
  type AgentContextArtifactReference,
} from './agent-context-artifacts.js';
import {
  AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
  createAgentContextDriverRegistryManifest,
  type AgentContextDriverCapability,
  type AgentContextDriverRegistration,
} from './agent-context-driver-registry.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  createAgentContextExecutionAuthority,
  type AgentContextDriverReference,
  type AgentContextExecutionAuthority,
} from './agent-context-execution-authority.js';
import {
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
} from './agent-context-usage.js';
import {
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  createAgentContextPinnedLiveOwners,
  type AgentContextLiveOwnerState,
  type AgentContextQueryDataset,
  type AgentContextQuerySelection,
} from './agent-context-query.js';
import {
  computeAgentContextTestIntentHash,
  computeAgentContextValidatedPlanHash,
  revalidateAgentContextExecutionPlan,
  validateAgentContextTestIntent,
} from './agent-context-intent-validator.js';
import { createSyntheticRh05AgentContextFixtureSet } from './agent-context-walkthrough-fixtures.js';
import { canonicalStringify, createFormContract } from './canonical-json.js';
import type { DeclaredCrossFieldEffect } from './cross-field-effect.js';
import {
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractConstraint,
  type ContractNode,
  type FormContract,
} from './contract.js';
import type {
  AgentContextIntentValue,
  AgentContextTestIntent,
} from './agent-context-test-intent.js';

function compareReference(
  left: AgentContextArtifactReference,
  right: AgentContextArtifactReference,
): number {
  return (
    left.schemaId.localeCompare(right.schemaId) ||
    left.schemaVersion.localeCompare(right.schemaVersion) ||
    left.contentHash.localeCompare(right.contentHash)
  );
}

function exactReference(
  artifacts: readonly AgentContextArtifactReference[],
  schemaId: string,
  schemaVersion: string,
  contentHash: string,
): AgentContextArtifactReference {
  const reference = artifacts.find(
    (candidate) =>
      candidate.schemaId === schemaId &&
      candidate.schemaVersion === schemaVersion &&
      candidate.contentHash === contentHash,
  );
  if (reference === undefined) throw new Error(`missing ${schemaId} ${contentHash}`);
  return reference;
}

function selectionFor(
  fixture: ReturnType<typeof createSyntheticRh05AgentContextFixtureSet>,
  polarity: 'positive' | 'negative',
  sourceUsageCatalog: AgentContextArtifactReference,
  journeyCatalog: AgentContextArtifactReference,
): AgentContextQuerySelection {
  const walkthrough = fixture.walkthroughs[polarity];
  const usage = fixture.sourceUsageCatalog.usages.find(
    ({ identity }) => canonicalStringify(identity) === canonicalStringify(walkthrough.usage),
  );
  if (usage?.resolution.status !== 'exact') throw new Error('usage must resolve exactly');
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: {
      schemaVersion: fixture.artifactSet.schemaVersion,
      contentHash: fixture.artifactSet.contentHash,
    },
    workspaceIndex: fixture.workspaceIndex,
    owners: {
      sourceUsageCatalog,
      journeyCatalog,
      formContract: exactReference(
        fixture.artifactSet.artifacts,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        walkthrough.declaredContract.contentHash,
      ),
      scenarioArtifact: exactReference(
        fixture.artifactSet.artifacts,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        walkthrough.resolvedContract.contentHash,
      ),
      executionAuthority: exactReference(
        fixture.artifactSet.artifacts,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
        walkthrough.executionAuthority.contentHash,
      ),
    },
    usage: walkthrough.usage,
    journey: walkthrough.journey,
    form: usage.resolution.candidate.form,
    scenario: walkthrough.executionAuthority.scenario,
    executionAuthority: {
      usageId: walkthrough.executionAuthority.usage.id,
      usageVersion: walkthrough.executionAuthority.usage.version,
      basis: walkthrough.executionAuthority.basis,
    },
  };
}

function manifestFor(authority: AgentContextExecutionAuthority) {
  const registrations = new Map<
    string,
    { driver: AgentContextDriverReference; capabilities: Set<AgentContextDriverCapability> }
  >();
  const add = (
    driver: AgentContextDriverReference,
    capability: AgentContextDriverCapability,
  ) => {
    const key = `${driver.kind}\0${driver.id}\0${driver.version}`;
    const entry = registrations.get(key) ?? { driver, capabilities: new Set() };
    entry.capabilities.add(capability);
    registrations.set(key, entry);
  };
  add(authority.usage.entry.driver, 'open-usage');
  for (const interaction of authority.interactions) {
    add(interaction.driver, interaction.operation);
    if (authority.commits.some(({ interactionId }) => interactionId === interaction.id)) {
      add(interaction.driver, 'commit-value');
    }
    if (authority.validationSurfaces.some(({ nodeId }) => nodeId === interaction.nodeId)) {
      add(interaction.driver, 'activate-validation');
      add(interaction.driver, 'assert-validation');
    }
    if (authority.valueAssertions.some(({ nodeId }) => nodeId === interaction.nodeId)) {
      add(interaction.driver, 'assert-value');
    }
  }
  for (const readiness of authority.readiness) add(readiness.driver, 'wait-readiness');
  for (const assertion of authority.stateAssertions) add(assertion.driver, 'assert-state');
  for (const action of authority.usage.actions) add(action.driver, 'invoke-usage-action');
  for (const outcome of authority.usage.outcomes) add(outcome.assertionDriver, 'assert-outcome');
  return createAgentContextDriverRegistryManifest({
    schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
    registrations: [...registrations.values()].map(
      ({ driver, capabilities }): AgentContextDriverRegistration => ({
        ...driver,
        capabilities: [...capabilities] as [
          AgentContextDriverCapability,
          ...AgentContextDriverCapability[],
        ],
      }),
    ),
  });
}

function boundary(polarity: 'positive' | 'negative') {
  const fixture = createSyntheticRh05AgentContextFixtureSet();
  const sourceUsageCatalog = exactReference(
    fixture.artifactSet.artifacts,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    fixture.sourceUsageCatalog.contentHash,
  );
  const journeyCatalog = exactReference(
    fixture.artifactSet.artifacts,
    AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
    AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    fixture.journeyCatalog.contentHash,
  );
  const dataset: AgentContextQueryDataset = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: fixture.artifactSet,
    sourceUsageCatalogs: [
      { reference: sourceUsageCatalog, artifact: fixture.sourceUsageCatalog },
    ],
    journeyCatalogs: [
      { reference: journeyCatalog, artifact: fixture.journeyCatalog },
    ],
    formContracts: Object.values(fixture.walkthroughs)
      .flatMap(({ declaredContract, resolvedContract }) => [declaredContract, resolvedContract])
      .map((artifact) => ({
        reference: exactReference(
          fixture.artifactSet.artifacts,
          FORM_CONTRACT_SCHEMA_ID,
          FORM_CONTRACT_SCHEMA_VERSION,
          artifact.contentHash,
        ),
        artifact,
      }))
      .sort((left, right) => compareReference(left.reference, right.reference)),
    executionAuthorities: Object.values(fixture.walkthroughs)
      .map(({ executionAuthority: artifact }) => ({
        reference: exactReference(
          fixture.artifactSet.artifacts,
          AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
          AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
          artifact.contentHash,
        ),
        artifact,
      }))
      .sort((left, right) => compareReference(left.reference, right.reference)),
  };
  const selection = selectionFor(fixture, polarity, sourceUsageCatalog, journeyCatalog);
  const authority = fixture.walkthroughs[polarity].executionAuthority;
  const manifest = manifestFor(authority);
  const liveOwners: AgentContextLiveOwnerState = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    owners: createAgentContextPinnedLiveOwners(selection),
  };
  return { fixture, dataset, selection, authority, manifest, liveOwners };
}

function withoutFormContractContentHash(
  contract: FormContract,
): Omit<FormContract, 'contentHash'> {
  const { contentHash, ...draft } = contract;
  void contentHash;
  return draft;
}

function repinExecutionAuthority(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  mutate: (
    draft: Omit<AgentContextExecutionAuthority, 'contentHash'>,
  ) => Omit<AgentContextExecutionAuthority, 'contentHash'>,
) {
  const owner = dataset.executionAuthorities.find(
    ({ reference }) =>
      reference.contentHash === selection.owners.executionAuthority.contentHash,
  );
  if (owner === undefined) throw new Error('missing execution-authority owner');
  const { contentHash, ...draft } = owner.artifact;
  void contentHash;
  const artifact = createAgentContextExecutionAuthority(mutate(draft));
  const reference: AgentContextArtifactReference = {
    ...owner.reference,
    contentHash: artifact.contentHash,
  };
  const artifactSet = createAgentContextArtifactSet({
    schemaVersion: dataset.artifactSet.schemaVersion,
    repositoryRevision: dataset.artifactSet.repositoryRevision,
    workspaceIndex: dataset.artifactSet.workspaceIndex,
    artifacts: dataset.artifactSet.artifacts.map((candidate) =>
      compareReference(candidate, owner.reference) === 0
        ? reference
        : candidate,
    ),
  });
  return {
    artifact,
    dataset: {
      ...dataset,
      artifactSet,
      executionAuthorities: dataset.executionAuthorities
        .map((candidate) =>
          compareReference(candidate.reference, owner.reference) === 0
            ? { reference, artifact }
            : candidate,
        )
        .sort((left, right) =>
          compareReference(left.reference, right.reference),
        ),
    } satisfies AgentContextQueryDataset,
    selection: {
      ...selection,
      artifactSet: {
        schemaVersion: artifactSet.schemaVersion,
        contentHash: artifactSet.contentHash,
      },
      owners: { ...selection.owners, executionAuthority: reference },
    } satisfies AgentContextQuerySelection,
  };
}

function repinScenarioOwner(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  artifact: FormContract,
) {
  const owner = dataset.formContracts.find(
    ({ reference }) =>
      reference.contentHash === selection.owners.scenarioArtifact.contentHash,
  );
  if (owner === undefined) throw new Error('missing scenario-artifact owner');
  const reference: AgentContextArtifactReference = {
    ...owner.reference,
    contentHash: artifact.contentHash as AgentContextArtifactReference['contentHash'],
  };
  const artifactSet = createAgentContextArtifactSet({
    schemaVersion: dataset.artifactSet.schemaVersion,
    repositoryRevision: dataset.artifactSet.repositoryRevision,
    workspaceIndex: dataset.artifactSet.workspaceIndex,
    artifacts: dataset.artifactSet.artifacts.map((candidate) =>
      compareReference(candidate, owner.reference) === 0
        ? reference
        : candidate,
    ),
  });
  const scenarioDataset: AgentContextQueryDataset = {
    ...dataset,
    artifactSet,
    formContracts: dataset.formContracts
      .map((candidate) =>
        compareReference(candidate.reference, owner.reference) === 0
          ? { reference, artifact }
          : candidate,
      )
      .sort((left, right) => compareReference(left.reference, right.reference)),
  };
  const scenarioSelection: AgentContextQuerySelection = {
    ...selection,
    artifactSet: {
      schemaVersion: artifactSet.schemaVersion,
      contentHash: artifactSet.contentHash,
    },
    owners: { ...selection.owners, scenarioArtifact: reference },
    scenario: { ...selection.scenario, artifactHash: reference.contentHash },
  };
  return repinExecutionAuthority(
    scenarioDataset,
    scenarioSelection,
    (authority) => ({
      ...authority,
      scenario: {
        ...authority.scenario,
        artifactHash: reference.contentHash,
      },
    }),
  );
}

function replaceNodeConstraints(
  nodes: readonly ContractNode[],
  nodeId: string,
  constraints: readonly ContractConstraint[],
): readonly ContractNode[] {
  return replaceContractNode(nodes, nodeId, (node) => ({
    ...node,
    constraints,
  }));
}

function replaceContractNode(
  nodes: readonly ContractNode[],
  nodeId: string,
  replace: (node: ContractNode) => ContractNode,
): readonly ContractNode[] {
  return nodes.map((node) => ({
    ...(node.id === nodeId ? replace(node) : node),
    children: replaceContractNode(node.children, nodeId, replace),
    ...(node.arrayTemplate === undefined
      ? {}
      : {
          arrayTemplate: replaceContractNode(
            [node.arrayTemplate],
            nodeId,
            replace,
          )[0]!,
        }),
  }));
}

function positiveIntent(value: ReturnType<typeof boundary>): AgentContextTestIntent {
  const [supplier, currency, total] = value.fixture.walkthroughs.positive.focusNodeIds;
  if (supplier === undefined || currency === undefined || total === undefined) {
    throw new Error('positive fixture nodes are incomplete');
  }
  return {
    schemaVersion: '0.1.0',
    contextRef: {
      selection: value.selection,
      driverRegistryHash: value.manifest.contentHash,
    },
    case: {
      id: 'synthetic.purchase-order.positive',
      title: 'accepts a valid order total',
      polarity: 'positive',
    },
    steps: [
      { op: 'openUsage' },
      { op: 'set', nodeId: supplier, value: { kind: 'domain-value', value: 'synthetic-supplier-a' } },
      { op: 'set', nodeId: currency, value: { kind: 'domain-value', value: 'CAD' } },
      {
        op: 'set',
        nodeId: total,
        value: { kind: 'literal', value: 125, expectedClassification: 'valid' },
      },
      {
        op: 'commitValue',
        nodeId: total,
        commitId: 'synthetic.rh05.purchase-order.total.commit-on-blur',
      },
      {
        op: 'activateValidation',
        nodeId: total,
        validationId: 'synthetic.rh05.purchase-order.total.min',
      },
      {
        op: 'expectValue',
        nodeId: total,
        assertionId: 'synthetic.rh05.purchase-order.total.committed-value',
        value: { kind: 'literal', value: 125, expectedClassification: 'valid' },
      },
      {
        op: 'expectValidation',
        nodeId: total,
        validationId: 'synthetic.rh05.purchase-order.total.min',
        constraint: 'min',
        state: 'absent',
      },
    ],
  };
}

function negativeIntent(value: ReturnType<typeof boundary>): AgentContextTestIntent {
  const [product, caseType, otherDetails] = value.fixture.walkthroughs.negative.expectedNodeIds;
  if (product === undefined || caseType === undefined || otherDetails === undefined) {
    throw new Error('negative fixture nodes are incomplete');
  }
  return {
    schemaVersion: '0.1.0',
    contextRef: {
      selection: value.selection,
      driverRegistryHash: value.manifest.contentHash,
    },
    case: {
      id: 'synthetic.claims.negative',
      title: 'requires details when case type is Other',
      polarity: 'negative',
    },
    steps: [
      { op: 'openUsage' },
      { op: 'set', nodeId: product, value: { kind: 'domain-value', value: 'auto' } },
      { op: 'set', nodeId: caseType, value: { kind: 'domain-value', value: 'other' } },
      { op: 'expectState', nodeId: otherDetails, state: 'visible' },
      {
        op: 'set',
        nodeId: otherDetails,
        value: { kind: 'literal', value: '', expectedClassification: 'invalid' },
      },
      {
        op: 'activateValidation',
        nodeId: otherDetails,
        validationId: 'synthetic.rh05.claims.other-details.required',
      },
      {
        op: 'expectValidation',
        nodeId: otherDetails,
        validationId: 'synthetic.rh05.claims.other-details.required',
        constraint: 'required',
        state: 'present',
      },
    ],
  };
}

function validate(
  value: ReturnType<typeof boundary>,
  intent: AgentContextTestIntent,
  liveOwners: unknown = value.liveOwners,
) {
  return validateAgentContextTestIntent({
    intent,
    dataset: value.dataset,
    liveOwners,
    driverRegistryManifest: value.manifest,
  });
}

describe('agent-context pure typed-intent validator', () => {
  it('produces a deterministic lossless positive plan and coalesces the shared blur', () => {
    const value = boundary('positive');
    const intent = positiveIntent(value);
    const first = validate(value, intent);
    const second = validate(value, intent);

    expect(first.status).toBe('valid');
    expect(second).toEqual(first);
    if (first.status !== 'valid') return;
    expect(first.plan.intentHash).toBe(
      computeAgentContextTestIntentHash(intent),
    );
    expect(computeAgentContextValidatedPlanHash(first.plan)).toBe(first.planHash);
    expect(first.plan.steps.map(({ op }) => op)).toEqual([
      'open-usage',
      'wait-readiness',
      'set-value',
      'set-value',
      'set-value',
      'perform-node-operation',
      'expect-value',
      'expect-validation',
    ]);
    const blur = first.plan.steps.find(({ op }) => op === 'perform-node-operation');
    expect(blur?.origin).toEqual({ kind: 'intent', intentStepIndexes: [4, 5] });
    if (blur?.op === 'perform-node-operation') {
      expect(blur.authorities.map(({ kind }) => kind)).toEqual([
        'value-commit',
        'validation-activation',
      ]);
      expect(blur.binding.operations).toEqual([
        'commit-value',
        'activate-validation',
      ]);
    }
    const valueAssertion = first.plan.steps.find(
      ({ op }) => op === 'expect-value',
    );
    expect(valueAssertion?.op).toBe('expect-value');
    if (valueAssertion?.op === 'expect-value') {
      expect(valueAssertion.value.authorization).toEqual({
        kind: 'literal',
        expectedClassification: 'valid',
      });
    }
  });

  it('produces the negative conditional plan with exact state and validation authority', () => {
    const value = boundary('negative');
    const result = validate(value, negativeIntent(value));

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.plan.steps.map(({ op }) => op)).toContain('expect-state');
    expect(result.plan.steps.map(({ op }) => op)).toContain('expect-validation');
    const invalidLiteral = result.plan.steps.find(
      (step) =>
        step.op === 'set-value' &&
        step.value.authorization.kind === 'literal',
    );
    expect(invalidLiteral?.op).toBe('set-value');
    if (invalidLiteral?.op === 'set-value') {
      expect(invalidLiteral.value.authorization).toEqual({
        kind: 'literal',
        expectedClassification: 'invalid',
      });
    }
    expect(result.warnings.map(({ code }) => code)).toEqual([
      'EFFECT_COVERAGE_INCOMPLETE',
    ]);
  });

  it('keeps an independently authorized state assertion when the node has no interaction', () => {
    const value = boundary('negative');
    const otherDetails = value.fixture.walkthroughs.negative.expectedNodeIds[2];
    if (otherDetails === undefined) throw new Error('missing state-assertion node');
    const repinned = repinExecutionAuthority(
      value.dataset,
      value.selection,
      (authority) => ({
        ...authority,
        physicalOperations: authority.physicalOperations.filter(
          ({ nodeId }) => nodeId !== otherDetails,
        ),
        readiness: authority.readiness.filter(
          ({ nodeId }) => nodeId !== otherDetails,
        ),
        interactions: authority.interactions.filter(
          ({ nodeId }) => nodeId !== otherDetails,
        ),
        commits: authority.commits.filter(({ nodeId }) => nodeId !== otherDetails),
        validationSurfaces: authority.validationSurfaces.filter(
          ({ nodeId }) => nodeId !== otherDetails,
        ),
        valueAssertions: authority.valueAssertions.filter(
          ({ nodeId }) => nodeId !== otherDetails,
        ),
      }),
    );
    const manifest = manifestFor(repinned.artifact);
    const source = negativeIntent(value);
    const intent: AgentContextTestIntent = {
      schemaVersion: '0.1.0',
      contextRef: {
        selection: repinned.selection,
        driverRegistryHash: manifest.contentHash,
      },
      case: {
        id: 'synthetic.claims.state-only',
        title: 'asserts conditional state without a value interaction',
        polarity: 'negative',
      },
      steps: [
        { op: 'openUsage' },
        source.steps[1]!,
        source.steps[2]!,
        { op: 'expectState', nodeId: otherDetails, state: 'visible' },
      ],
    };
    const result = validateAgentContextTestIntent({
      intent,
      dataset: repinned.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(repinned.selection),
      },
      driverRegistryManifest: manifest,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    const stateAssertion = result.plan.steps.find(
      ({ op }) => op === 'expect-state',
    );
    expect(stateAssertion?.op).toBe('expect-state');
    if (stateAssertion?.op !== 'expect-state') return;
    expect(stateAssertion.assertion).toMatchObject({
      nodeId: otherDetails,
      stepId: repinned.artifact.usage.entry.landingStepId,
    });
  });

  it('fails closed when a targeted node declares an unsupported wrapper prerequisite', () => {
    const value = boundary('positive');
    const supplier = value.fixture.walkthroughs.positive.focusNodeIds[0];
    if (supplier === undefined) throw new Error('missing wrapper fixture node');
    const scenario = createFormContract({
      ...withoutFormContractContentHash(
        value.fixture.walkthroughs.positive.resolvedContract,
      ),
      nodes: replaceContractNode(
        value.fixture.walkthroughs.positive.resolvedContract.nodes,
        supplier,
        (node) => {
          if (node.interactionProfile === undefined) {
            throw new Error('missing wrapper fixture interaction profile');
          }
          return {
            ...node,
            interactionProfile: {
              ...node.interactionProfile,
              parts: [
                ...node.interactionProfile.parts,
                {
                  name: 'wrapper',
                  role: 'button',
                  cardinality: 'one',
                  evidence: 'declared',
                },
              ],
              preconditions: [
                {
                  kind: 'activate',
                  part: 'wrapper',
                  operation: 'click',
                  evidence: 'declared',
                },
              ],
            },
          };
        },
      ),
    });
    const repinned = repinScenarioOwner(value.dataset, value.selection, scenario);
    const manifest = manifestFor(repinned.artifact);
    const source = positiveIntent(value);
    const intent: AgentContextTestIntent = {
      ...source,
      contextRef: {
        selection: repinned.selection,
        driverRegistryHash: manifest.contentHash,
      },
    };
    const result = validateAgentContextTestIntent({
      intent,
      dataset: repinned.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(repinned.selection),
      },
      driverRegistryManifest: manifest,
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.map(({ code }) => code)).toContain(
        'UNSUPPORTED_INTERACTION',
      );
      expect('plan' in result).toBe(false);
    }
  });

  it('requires effect sources before every dependent target operation', () => {
    const value = boundary('negative');
    const source = negativeIntent(value);
    const reordered: AgentContextTestIntent = {
      ...source,
      steps: [
        source.steps[0]!,
        source.steps[1]!,
        source.steps[3]!,
        source.steps[2]!,
        ...source.steps.slice(4),
      ],
    };
    const result = validate(value, reordered);

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.map(({ code }) => code)).toContain(
        'ORDERING_PRECONDITION_MISSING',
      );
      expect('plan' in result).toBe(false);
    }
  });

  it('requires an explicit commit before a committed-model-value assertion', () => {
    const value = boundary('positive');
    const source = positiveIntent(value);
    const reordered: AgentContextTestIntent = {
      ...source,
      steps: [
        ...source.steps.slice(0, 4),
        source.steps[6]!,
        source.steps[4]!,
        source.steps[5]!,
        source.steps[7]!,
      ],
    };
    const result = validate(value, reordered);

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.map(({ code }) => code)).toContain(
        'COMMIT_NOT_FOUND',
      );
      expect('plan' in result).toBe(false);
    }
  });

  it('resolves readiness purpose from the exact part and locator tuple', () => {
    const value = boundary('positive');
    const supplier = value.fixture.walkthroughs.positive.focusNodeIds[0];
    if (supplier === undefined) throw new Error('missing readiness fixture node');
    const repinned = repinExecutionAuthority(
      value.dataset,
      value.selection,
      (authority) => ({
        ...authority,
        interactions: authority.interactions.map((interaction) =>
          interaction.nodeId === supplier
            ? {
                ...interaction,
                targets: [
                  {
                    purpose: 'add' as const,
                    partRef: 'add',
                    locatorTargetRef: interaction.targets[0].locatorTargetRef,
                  },
                  ...interaction.targets,
                ],
              }
            : interaction,
        ),
      }),
    );
    const manifest = manifestFor(repinned.artifact);
    const source = positiveIntent(value);
    const intent: AgentContextTestIntent = {
      ...source,
      contextRef: {
        selection: repinned.selection,
        driverRegistryHash: manifest.contentHash,
      },
    };
    const result = validateAgentContextTestIntent({
      intent,
      dataset: repinned.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(repinned.selection),
      },
      driverRegistryManifest: manifest,
    });

    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    const readiness = result.plan.steps.find(
      ({ op }) => op === 'wait-readiness',
    );
    expect(readiness?.op).toBe('wait-readiness');
    if (readiness?.op !== 'wait-readiness') return;
    expect(readiness.binding.targets).toEqual([
      {
        purpose: 'control',
        partRef: 'control',
        locatorTargetRef:
          'synthetic.rh05.purchase-order.supplier.control',
      },
    ]);
  });

  it('refuses hidden nodes and missing interaction or locator authority', () => {
    const value = boundary('positive');
    const supplier = value.fixture.walkthroughs.positive.focusNodeIds[0];
    if (supplier === undefined) throw new Error('missing refusal fixture node');

    const hiddenScenario = createFormContract({
      ...withoutFormContractContentHash(
        value.fixture.walkthroughs.positive.resolvedContract,
      ),
      nodes: replaceContractNode(
        value.fixture.walkthroughs.positive.resolvedContract.nodes,
        supplier,
        (node) => ({ ...node, state: { ...node.state, hidden: true } }),
      ),
    });
    const hidden = repinScenarioOwner(
      value.dataset,
      value.selection,
      hiddenScenario,
    );
    const hiddenManifest = manifestFor(hidden.artifact);
    const hiddenSource = positiveIntent(value);
    const hiddenResult = validateAgentContextTestIntent({
      intent: {
        ...hiddenSource,
        contextRef: {
          selection: hidden.selection,
          driverRegistryHash: hiddenManifest.contentHash,
        },
      },
      dataset: hidden.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(hidden.selection),
      },
      driverRegistryManifest: hiddenManifest,
    });
    expect(hiddenResult.status).toBe('invalid');
    if (hiddenResult.status === 'invalid') {
      expect(hiddenResult.diagnostics.map(({ code }) => code)).toContain(
        'HIDDEN_NODE_UNREACHABLE',
      );
    }

    const missingReadinessManifest = createAgentContextDriverRegistryManifest({
      schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
      registrations: value.manifest.registrations.map((registration) => ({
        ...registration,
        capabilities: registration.capabilities.filter(
          (capability) => capability !== 'wait-readiness',
        ) as [AgentContextDriverCapability, ...AgentContextDriverCapability[]],
      })),
    });
    const missingReadinessResult = validateAgentContextTestIntent({
      intent: {
        ...positiveIntent(value),
        contextRef: {
          selection: value.selection,
          driverRegistryHash: missingReadinessManifest.contentHash,
        },
      },
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: missingReadinessManifest,
    });
    expect(missingReadinessResult.status).toBe('invalid');
    if (missingReadinessResult.status === 'invalid') {
      expect(missingReadinessResult.diagnostics.map(({ code }) => code)).toContain(
        'READINESS_UNAVAILABLE',
      );
    }

    const missingInteraction = repinExecutionAuthority(
      value.dataset,
      value.selection,
      (authority) => ({
        ...authority,
        interactions: authority.interactions.filter(
          ({ nodeId }) => nodeId !== supplier,
        ),
        readiness: authority.readiness.filter(({ nodeId }) => nodeId !== supplier),
        commits: authority.commits.filter(({ nodeId }) => nodeId !== supplier),
      }),
    );
    const missingInteractionManifest = manifestFor(missingInteraction.artifact);
    const missingInteractionResult = validateAgentContextTestIntent({
      intent: {
        ...positiveIntent(value),
        contextRef: {
          selection: missingInteraction.selection,
          driverRegistryHash: missingInteractionManifest.contentHash,
        },
      },
      dataset: missingInteraction.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(missingInteraction.selection),
      },
      driverRegistryManifest: missingInteractionManifest,
    });
    expect(missingInteractionResult.status).toBe('invalid');
    if (missingInteractionResult.status === 'invalid') {
      expect(missingInteractionResult.diagnostics.map(({ code }) => code)).toContain(
        'UNSUPPORTED_INTERACTION',
      );
    }

    const locatorScenario = createFormContract({
      ...withoutFormContractContentHash(
        value.fixture.walkthroughs.positive.resolvedContract,
      ),
      nodes: replaceContractNode(
        value.fixture.walkthroughs.positive.resolvedContract.nodes,
        supplier,
        (node) => ({ ...node, locators: [] }),
      ),
    });
    const missingLocator = repinScenarioOwner(
      value.dataset,
      value.selection,
      locatorScenario,
    );
    const missingLocatorManifest = manifestFor(missingLocator.artifact);
    const missingLocatorResult = validateAgentContextTestIntent({
      intent: {
        ...positiveIntent(value),
        contextRef: {
          selection: missingLocator.selection,
          driverRegistryHash: missingLocatorManifest.contentHash,
        },
      },
      dataset: missingLocator.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(missingLocator.selection),
      },
      driverRegistryManifest: missingLocatorManifest,
    });
    expect(missingLocatorResult.status).toBe('invalid');
    if (missingLocatorResult.status === 'invalid') {
      expect(missingLocatorResult.diagnostics.map(({ code }) => code)).toContain(
        'MISSING_LOCATOR_TARGET',
      );
    }
  });

  it('refuses reversed ordering, unsupported value proposals, and stale owners with no plan', () => {
    const value = boundary('negative');
    const intent = negativeIntent(value);
    const reversed = {
      ...intent,
      steps: [intent.steps[0]!, intent.steps[2]!, intent.steps[1]!, ...intent.steps.slice(3)],
    };
    const ordering = validate(value, reversed);
    expect(ordering.status).toBe('invalid');
    if (ordering.status === 'invalid') {
      expect(ordering.diagnostics.map(({ code }) => code)).toContain(
        'ORDERING_PRECONDITION_MISSING',
      );
      expect('plan' in ordering).toBe(false);
    }

    const positive = boundary('positive');
    const runtimePolicy: AgentContextIntentValue = {
      kind: 'runtime-policy',
      policy: 'first-enabled',
    };
    const proposed = positiveIntent(positive);
    const unknown = validate(positive, {
      ...proposed,
      steps: proposed.steps.map((step, index) =>
        index === 1 && step.op === 'set' ? { ...step, value: runtimePolicy } : step,
      ),
    });
    expect(unknown.status).toBe('invalid');
    if (unknown.status === 'invalid') {
      expect(unknown.diagnostics.map(({ code }) => code)).toContain(
        'VALUE_CLASSIFICATION_UNKNOWN',
      );
    }

    const literalChoice = validate(positive, {
      ...proposed,
      steps: proposed.steps.map((step, index) =>
        index === 1 && step.op === 'set'
          ? {
              ...step,
              value: {
                kind: 'literal' as const,
                value: 'invented-supplier',
                expectedClassification: 'valid' as const,
              },
            }
          : step,
      ),
    });
    expect(literalChoice.status).toBe('invalid');
    if (literalChoice.status === 'invalid') {
      expect(literalChoice.diagnostics.map(({ code }) => code)).toContain(
        'VALUE_CLASSIFICATION_UNKNOWN',
      );
    }

    const ignoredItemContext = validate(positive, {
      ...proposed,
      steps: proposed.steps.map((step, index) =>
        index === 1 && step.op === 'set'
          ? {
              ...step,
              itemContext: {
                kind: 'index' as const,
                repeaterNodeId: 'invented.repeater',
                index: 0,
              },
            }
          : step,
      ),
    });
    expect(ignoredItemContext.status).toBe('invalid');
    if (ignoredItemContext.status === 'invalid') {
      expect(ignoredItemContext.diagnostics.map(({ code }) => code)).toContain(
        'REPEATER_ITEM_CAPTURE_UNSUPPORTED',
      );
    }

    const staleOwners = {
      ...value.liveOwners,
      owners: value.liveOwners.owners.filter(({ role }) => role !== 'scenario-artifact'),
    };
    const stale = validate(value, intent, staleOwners);
    expect(stale.status).toBe('invalid');
    if (stale.status === 'invalid') {
      expect(stale.diagnostics.map(({ code }) => code)).toEqual(['STALE_CONTEXT']);
    }
  });

  it('does not coalesce activation authority from a different node or item context', () => {
    const value = boundary('positive');
    const source = positiveIntent(value);
    const currency = value.fixture.walkthroughs.positive.focusNodeIds[1];
    const activationIndex = source.steps.findIndex(
      ({ op }) => op === 'activateValidation',
    );
    if (currency === undefined || activationIndex < 0) {
      throw new Error('missing activation fixture data');
    }
    const activation = source.steps[activationIndex];
    if (activation?.op !== 'activateValidation') {
      throw new Error('missing activation step');
    }

    const wrongNode = validate(value, {
      ...source,
      steps: source.steps.map((step, index) =>
        index === activationIndex ? { ...activation, nodeId: currency } : step,
      ),
    });
    expect(wrongNode.status).toBe('invalid');
    if (wrongNode.status === 'invalid') {
      expect(wrongNode.diagnostics.map(({ code }) => code)).toContain(
        'VALIDATION_NOT_FOUND',
      );
    }

    const repeaterScoped = validate(value, {
      ...source,
      steps: source.steps.map((step, index) =>
        index === activationIndex
          ? {
              ...activation,
              itemContext: {
                kind: 'index' as const,
                repeaterNodeId: 'synthetic.repeater',
                index: 0,
              },
            }
          : step,
      ),
    });
    expect(repeaterScoped.status).toBe('invalid');
    if (repeaterScoped.status === 'invalid') {
      expect(repeaterScoped.diagnostics.map(({ code }) => code)).toContain(
        'REPEATER_ITEM_CAPTURE_UNSUPPORTED',
      );
    }
  });

  it.each([
    {
      name: 'unanchored',
      pattern: '[A-Z]+',
      value: '1A',
      expectedClassification: 'valid' as const,
    },
    {
      name: 'anchored',
      pattern: '^[A-Z]+$',
      value: 'ABC',
      expectedClassification: 'valid' as const,
    },
    {
      name: 'optional empty',
      pattern: '[A-Z]+',
      value: '',
      expectedClassification: 'invalid' as const,
    },
  ])('fails closed for $name pattern literal classification', (patternCase) => {
    const value = boundary('negative');
    const otherDetails = value.fixture.walkthroughs.negative.expectedNodeIds[2];
    if (otherDetails === undefined) throw new Error('missing literal fixture node');
    const scenario = createFormContract({
      ...withoutFormContractContentHash(
        value.fixture.walkthroughs.negative.resolvedContract,
      ),
      nodes: replaceNodeConstraints(
        value.fixture.walkthroughs.negative.resolvedContract.nodes,
        otherDetails,
        [{ kind: 'pattern', value: patternCase.pattern }],
      ),
    });
    const repinned = repinScenarioOwner(value.dataset, value.selection, scenario);
    const manifest = manifestFor(repinned.artifact);
    const source = negativeIntent(value);
    const intent: AgentContextTestIntent = {
      ...source,
      contextRef: {
        selection: repinned.selection,
        driverRegistryHash: manifest.contentHash,
      },
      steps: source.steps.slice(0, 5).map((step) =>
        step.op === 'set' && step.nodeId === otherDetails
          ? {
              ...step,
              value: {
                kind: 'literal' as const,
                value: patternCase.value,
                expectedClassification: patternCase.expectedClassification,
              },
            }
          : step,
      ),
    };
    const result = validateAgentContextTestIntent({
      intent,
      dataset: repinned.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(repinned.selection),
      },
      driverRegistryManifest: manifest,
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.map(({ code }) => code)).toContain(
        'VALUE_CLASSIFICATION_UNKNOWN',
      );
    }
  });

  it.each([
    {
      name: 'optional empty minLength',
      constraints: [{ kind: 'minLength', value: 2 }] satisfies ContractConstraint[],
      expectedClassification: 'valid' as const,
    },
    {
      name: 'required empty minLength',
      constraints: [
        { kind: 'required' },
        { kind: 'minLength', value: 2 },
      ] satisfies ContractConstraint[],
      expectedClassification: 'invalid' as const,
    },
  ])('matches Angular classification for $name', ({ constraints, expectedClassification }) => {
    const value = boundary('negative');
    const otherDetails = value.fixture.walkthroughs.negative.expectedNodeIds[2];
    if (otherDetails === undefined) throw new Error('missing literal fixture node');
    const scenario = createFormContract({
      ...withoutFormContractContentHash(
        value.fixture.walkthroughs.negative.resolvedContract,
      ),
      nodes: replaceNodeConstraints(
        value.fixture.walkthroughs.negative.resolvedContract.nodes,
        otherDetails,
        constraints,
      ),
    });
    const repinned = repinScenarioOwner(value.dataset, value.selection, scenario);
    const manifest = manifestFor(repinned.artifact);
    const source = negativeIntent(value);
    const testIntent: AgentContextTestIntent = {
      ...source,
      contextRef: {
        selection: repinned.selection,
        driverRegistryHash: manifest.contentHash,
      },
      steps: source.steps.slice(0, 5).map((step) =>
        step.op === 'set' && step.nodeId === otherDetails
          ? {
              ...step,
              value: {
                kind: 'literal' as const,
                value: '',
                expectedClassification,
              },
            }
          : step,
      ),
    };

    const result = validateAgentContextTestIntent({
      intent: testIntent,
      dataset: repinned.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(repinned.selection),
      },
      driverRegistryManifest: manifest,
    });

    expect(result.status).toBe('valid');
  });

  it('rejects caller-rehashed semantic plan mutation during pure revalidation', () => {
    const value = boundary('positive');
    const intent = positiveIntent(value);
    const validated = validate(value, intent);
    if (validated.status !== 'valid') throw new Error('expected a valid plan');
    const set = validated.plan.steps.find(({ op }) => op === 'set-value');
    if (set?.op !== 'set-value') throw new Error('expected set plan step');
    const mutated = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.planStepId === set.planStepId
          ? { ...step, binding: { ...set.binding, nodeId: 'invented.node' } }
          : step,
      ),
    };
    const result = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: mutated,
      planHash: computeAgentContextValidatedPlanHash(mutated),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.map(({ code }) => code)).toEqual([
        'PLAN_SEMANTIC_INVALID',
      ]);
    }

    const valueMutation = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.planStepId === set.planStepId
          ? {
              ...set,
              value: {
                kind: 'canonical' as const,
                value: 'invented-value',
                authorization: set.value.authorization,
              },
            }
          : step,
      ),
    };
    const rejectedValue = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: valueMutation,
      planHash: computeAgentContextValidatedPlanHash(valueMutation),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedValue.status).toBe('invalid');

    const itemContextMutation = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.planStepId === set.planStepId
          ? {
              ...set,
              binding: {
                ...set.binding,
                itemContext: {
                  kind: 'existing-index' as const,
                  repeaterNodeId: 'invented.repeater',
                  index: 0,
                },
              },
            }
          : step,
      ),
    };
    const rejectedItemContext = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: itemContextMutation,
      planHash: computeAgentContextValidatedPlanHash(itemContextMutation),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedItemContext.status).toBe('invalid');

    const wrongHash = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: validated.plan,
      planHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(wrongHash.status).toBe('invalid');
    if (wrongHash.status === 'invalid') {
      expect(wrongHash.diagnostics.map(({ code }) => code)).toEqual([
        'PLAN_HASH_MISMATCH',
      ]);
    }

    const mismatchedContext = {
      ...validated.contextRef,
      selection: {
        ...validated.contextRef.selection,
        usage: {
          ...validated.contextRef.selection.usage,
          usageId: 'invented.usage',
        },
      },
    };
    const wrongContext = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: mismatchedContext,
      plan: validated.plan,
      planHash: validated.planHash,
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(wrongContext.status).toBe('invalid');
    if (wrongContext.status === 'invalid') {
      expect(wrongContext.diagnostics.map(({ code }) => code)).toEqual([
        'CONTEXT_MISMATCH',
      ]);
    }

    const extraKeyPlan = { ...validated.plan, unreviewedAuthority: true };
    const extraKey = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: extraKeyPlan,
      planHash: computeAgentContextValidatedPlanHash(extraKeyPlan),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(extraKey.status).toBe('invalid');
    if (extraKey.status === 'invalid') {
      expect(extraKey.diagnostics.map(({ code }) => code)).toEqual([
        'PLAN_SEMANTIC_INVALID',
      ]);
    }

    const blur = validated.plan.steps.find(
      ({ op }) => op === 'perform-node-operation',
    );
    if (blur?.op !== 'perform-node-operation') {
      throw new Error('expected a coalesced node operation');
    }
    const authorityMutation = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.planStepId === blur.planStepId
          ? {
              ...blur,
              authorities: [
                {
                  kind: 'value-commit' as const,
                  commitId: 'invented.commit',
                },
                blur.authorities[1]!,
              ],
            }
          : step,
      ),
    };
    const rejectedAuthority = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: authorityMutation,
      planHash: computeAgentContextValidatedPlanHash(authorityMutation),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedAuthority.status).toBe('invalid');

    const provenanceMutation = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.planStepId === blur.planStepId
          ? { ...blur, evidenceRefs: ['invented.evidence'] }
          : step,
      ),
    };
    const rejectedProvenance = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: provenanceMutation,
      planHash: computeAgentContextValidatedPlanHash(provenanceMutation),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedProvenance.status).toBe('invalid');

    const operationMutation = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.planStepId === blur.planStepId
          ? {
              ...blur,
              binding: {
                ...blur.binding,
                operations: ['commit-value'] as const,
              },
            }
          : step,
      ),
    };
    const rejectedOperation = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: operationMutation,
      planHash: computeAgentContextValidatedPlanHash(operationMutation),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedOperation.status).toBe('invalid');

    const deletedAssertion = {
      ...validated.plan,
      steps: validated.plan.steps.filter(({ op }) => op !== 'expect-value'),
    };
    const rejectedDeletion = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: deletedAssertion,
      planHash: computeAgentContextValidatedPlanHash(deletedAssertion),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedDeletion.status).toBe('invalid');

    const oppositeClassification = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.op === 'expect-value'
          ? {
              ...step,
              value: {
                kind: 'canonical' as const,
                value: 0,
                authorization: step.value.authorization,
              },
            }
          : step,
      ),
    };
    const rejectedClassification = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: oppositeClassification,
      planHash: computeAgentContextValidatedPlanHash(oppositeClassification),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedClassification.status).toBe('invalid');

    const staleOwners = {
      ...value.liveOwners,
      owners: value.liveOwners.owners.filter(
        ({ role }) => role !== 'scenario-artifact',
      ),
    };
    const rejectedStaleContext = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: validated.plan,
      planHash: validated.planHash,
      dataset: value.dataset,
      liveOwners: staleOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(rejectedStaleContext.status).toBe('invalid');
  });

  it('rejects an opposite-classification literal substitution after rehashing', () => {
    const value = boundary('positive');
    const intent = positiveIntent(value);
    const validated = validate(value, intent);
    if (validated.status !== 'valid') throw new Error('expected a valid plan');
    const mutated = {
      ...validated.plan,
      steps: validated.plan.steps.map((step) =>
        step.op === 'expect-value'
          ? {
              ...step,
              value: {
                ...step.value,
                authorization: {
                  kind: 'literal' as const,
                  expectedClassification: 'invalid' as const,
                },
              },
            }
          : step,
      ),
    };
    const result = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: mutated,
      planHash: computeAgentContextValidatedPlanHash(mutated),
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.map(({ code }) => code)).toEqual([
        'PLAN_SEMANTIC_INVALID',
      ]);
    }
  });

  it('rejects a current context when the exact E2E slice is refused', () => {
    const value = boundary('negative');
    const otherDetails = value.fixture.walkthroughs.negative.expectedNodeIds[2];
    if (otherDetails === undefined) throw new Error('missing state-assertion node');
    const source = negativeIntent(value);
    const intent: AgentContextTestIntent = {
      ...source,
      case: {
        id: 'synthetic.claims.refused-slice',
        title: 'refuses a cyclic prerequisite slice',
        polarity: 'negative',
      },
      steps: [
        { op: 'openUsage' },
        source.steps[1]!,
        source.steps[2]!,
        { op: 'expectState', nodeId: otherDetails, state: 'visible' },
      ],
    };
    const validated = validate(value, intent);
    if (validated.status !== 'valid') throw new Error('expected a valid source plan');

    const walkthrough = value.fixture.walkthroughs.negative;
    const product = walkthrough.resolvedContract.nodes[0]!;
    const reverseEffect: DeclaredCrossFieldEffect = {
      identity: {
        id: 'synthetic.rh05.claims.other-controls-product',
        version: 1,
      },
      trigger: { nodeId: otherDetails, event: 'valueChanged' },
      target: { nodeId: product.id, property: 'visibility' },
      kind: 'controls-state',
      timing: { mode: 'sync' },
      ordering: 'source-before-target',
      evidence: 'declared',
      opacity: 'transparent',
    };
    const cycleScenario = createFormContract({
      ...withoutFormContractContentHash(walkthrough.resolvedContract),
      declaredEffects: [
        ...(walkthrough.resolvedContract.declaredEffects ?? []),
        reverseEffect,
      ].sort(
        (left, right) => {
          const byId = left.identity.id.localeCompare(right.identity.id);
          return byId === 0
            ? left.identity.version - right.identity.version
            : byId;
        },
      ),
      effectAnalysis: {
        completeness: 'incomplete',
        reasons: ['effect-cycle', 'opaque-dynamic-rule'],
      },
    });
    const cycle = repinScenarioOwner(
      value.dataset,
      value.selection,
      cycleScenario,
    );
    const cycleManifest = manifestFor(cycle.artifact);
    const cycleIntent: AgentContextTestIntent = {
      ...intent,
      contextRef: {
        selection: cycle.selection,
        driverRegistryHash: cycleManifest.contentHash,
      },
    };
    const plan = {
      ...validated.plan,
      intentHash: computeAgentContextTestIntentHash(cycleIntent),
      contextRef: cycleIntent.contextRef,
    };
    const result = revalidateAgentContextExecutionPlan({
      intent: cycleIntent,
      contextRef: plan.contextRef,
      plan,
      planHash: computeAgentContextValidatedPlanHash(plan),
      dataset: cycle.dataset,
      liveOwners: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(cycle.selection),
      },
      driverRegistryManifest: cycleManifest,
    });

    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.diagnostics.map(({ code }) => code)).toEqual([
        'PLAN_SEMANTIC_INVALID',
      ]);
    }
  });

  it('rejects source-intent substitution and never coerces an untrusted plan hash', () => {
    const value = boundary('positive');
    const intent = positiveIntent(value);
    const validated = validate(value, intent);
    if (validated.status !== 'valid') throw new Error('expected a valid plan');

    const substitutedIntent: AgentContextTestIntent = {
      ...intent,
      case: { ...intent.case, title: 'different source intent' },
    };
    const substituted = revalidateAgentContextExecutionPlan({
      intent: substitutedIntent,
      contextRef: validated.contextRef,
      plan: validated.plan,
      planHash: validated.planHash,
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(substituted.status).toBe('invalid');

    let coercionCalled = false;
    const coercingHash = {
      toString() {
        coercionCalled = true;
        return validated.planHash;
      },
    };
    const coercion = revalidateAgentContextExecutionPlan({
      intent,
      contextRef: validated.contextRef,
      plan: validated.plan,
      planHash: coercingHash,
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    });
    expect(coercionCalled).toBe(false);
    expect(coercion.status).toBe('invalid');
  });

  it('rejects hostile API envelopes without invoking caller accessors', () => {
    const value = boundary('positive');
    const sourceIntent = positiveIntent(value);
    const validated = validate(value, sourceIntent);
    if (validated.status !== 'valid') throw new Error('expected a valid plan');

    let validationGetterCalled = false;
    const validationEnvelope: Record<string, unknown> = {
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    };
    Object.defineProperty(validationEnvelope, 'intent', {
      enumerable: true,
      get() {
        validationGetterCalled = true;
        return sourceIntent;
      },
    });
    expect(() =>
      validateAgentContextTestIntent(
        validationEnvelope as unknown as Parameters<
          typeof validateAgentContextTestIntent
        >[0],
      ),
    ).toThrow(/data property/u);
    expect(validationGetterCalled).toBe(false);

    let revalidationGetterCalled = false;
    const revalidationEnvelope: Record<string, unknown> = {
      contextRef: validated.contextRef,
      plan: validated.plan,
      planHash: validated.planHash,
      dataset: value.dataset,
      liveOwners: value.liveOwners,
      driverRegistryManifest: value.manifest,
    };
    Object.defineProperty(revalidationEnvelope, 'intent', {
      enumerable: true,
      get() {
        revalidationGetterCalled = true;
        return sourceIntent;
      },
    });
    const result = revalidateAgentContextExecutionPlan(
      revalidationEnvelope as unknown as Parameters<
        typeof revalidateAgentContextExecutionPlan
      >[0],
    );
    expect(result.status).toBe('invalid');
    expect(revalidationGetterCalled).toBe(false);
  });
});
