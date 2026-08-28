import { describe, expect, it } from 'vitest';

import {
  createAgentContextArtifactSet,
  type AgentContextArtifactReference,
} from './agent-context-artifacts.js';
import {
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE,
  canonicalizeAgentContextQueryResult,
  classifyAgentContextE2eSliceOverflow,
  parseAgentContextQueryResult,
  resolveAgentContextE2eSliceAgainstParsedDataset,
  validateAgentContextQuerySelection,
  validateAgentContextQueryResult,
  type AgentContextQueryDataset,
  type AgentContextQuerySelection,
  type AgentContextUsageSearchScope,
} from './agent-context-query.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  createAgentContextExecutionAuthority,
  type AgentContextExecutionAuthority,
} from './agent-context-execution-authority.js';
import {
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
} from './agent-context-usage.js';
import { createSyntheticRh05AgentContextFixtureSet } from './agent-context-walkthrough-fixtures.js';
import { canonicalStringify, createFormContract } from './canonical-json.js';
import {
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractNode,
} from './contract.js';

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
  if (reference === undefined) throw new Error(`missing reference ${contentHash}`);
  return reference;
}

function compareReference(
  left: AgentContextArtifactReference,
  right: AgentContextArtifactReference,
): number {
  for (const key of ['schemaId', 'schemaVersion', 'contentHash'] as const) {
    const order = left[key].localeCompare(right[key]);
    if (order !== 0) return order;
  }
  return 0;
}

function flattenNodes(nodes: readonly ContractNode[]): readonly ContractNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenNodes(node.children),
    ...(node.arrayTemplate === undefined
      ? []
      : flattenNodes([node.arrayTemplate])),
  ]);
}

function complete<T>(items: readonly T[]) {
  return { complete: true, items } as const;
}

function boundary() {
  const fixture = createSyntheticRh05AgentContextFixtureSet();
  const walkthrough = fixture.walkthroughs.positive;
  const selectedUsage = fixture.sourceUsageCatalog.usages.find(
    ({ identity }) =>
      identity.kind === 'declared' &&
      identity.usageId === walkthrough.usage.usageId &&
      identity.version === walkthrough.usage.version,
  );
  if (selectedUsage?.resolution.status !== 'exact') {
    throw new Error('positive usage must resolve exactly');
  }
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
  const formContracts = Object.values(fixture.walkthroughs)
    .flatMap((candidate) => [
      candidate.declaredContract,
      candidate.resolvedContract,
    ])
    .map((artifact) => ({
      reference: exactReference(
        fixture.artifactSet.artifacts,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        artifact.contentHash,
      ),
      artifact,
    }))
    .sort((left, right) => compareReference(left.reference, right.reference));
  const executionAuthorities = Object.values(fixture.walkthroughs)
    .map(({ executionAuthority: artifact }) => ({
      reference: exactReference(
        fixture.artifactSet.artifacts,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
        artifact.contentHash,
      ),
      artifact,
    }))
    .sort((left, right) => compareReference(left.reference, right.reference));
  const dataset: AgentContextQueryDataset = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: fixture.artifactSet,
    sourceUsageCatalogs: [
      { reference: sourceUsageCatalog, artifact: fixture.sourceUsageCatalog },
    ],
    journeyCatalogs: [
      { reference: journeyCatalog, artifact: fixture.journeyCatalog },
    ],
    formContracts,
    executionAuthorities,
  };
  const selection: AgentContextQuerySelection = {
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
    form: selectedUsage.resolution.candidate.form,
    scenario: walkthrough.executionAuthority.scenario,
    executionAuthority: {
      usageId: walkthrough.executionAuthority.usage.id,
      usageVersion: walkthrough.executionAuthority.usage.version,
      basis: walkthrough.executionAuthority.basis,
    },
  };
  const scope: AgentContextUsageSearchScope = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: selection.artifactSet,
    workspaceIndex: selection.workspaceIndex,
    sourceUsageCatalogs: [sourceUsageCatalog],
  };
  const nodes = flattenNodes(walkthrough.resolvedContract.nodes);
  const step = walkthrough.executionAuthority.usage.steps[0];
  if (step === undefined) throw new Error('positive authority needs a step');
  const focusNode = nodes.find(({ id }) => step.nodeIds.includes(id));
  if (focusNode === undefined) throw new Error('positive authority needs a node');
  return {
    fixture,
    dataset,
    walkthrough,
    selection,
    scope,
    sourceUsageCatalog,
    nodes,
    step,
    focusNode,
  };
}

function nodeProjection(
  value: ReturnType<typeof boundary>,
  node: ContractNode,
  includeAll = false,
) {
  const effects = (value.walkthrough.resolvedContract.declaredEffects ?? []).filter(
    ({ trigger, target }) => trigger.nodeId === node.id || target.nodeId === node.id,
  );
  const diagnostics = value.walkthrough.resolvedContract.diagnostics.filter(
    ({ nodeId }) => nodeId === node.id,
  );
  return {
    nodeId: node.id,
    kind: node.kind,
    modelPath: node.modelPath,
    ...(node.formlyType === undefined ? {} : { formlyType: node.formlyType }),
    ...(node.semanticType === undefined
      ? {}
      : { semanticType: node.semanticType }),
    evidence: node.evidence,
    ...(node.presentation === undefined
      ? {}
      : { presentation: node.presentation }),
    ...(node.state === undefined ? {} : { state: node.state }),
    childNodeIds: node.children.map(({ id }) => id),
    ...(node.arrayTemplate === undefined
      ? {}
      : { arrayTemplateNodeId: node.arrayTemplate.id }),
    capabilities: nodeExecutableCapabilities(
      value.walkthrough.executionAuthority,
      node.id,
    ),
    included: includeAll
      ? [
          'constraints',
          'domain',
          'effects',
          'interaction',
          'locators',
          'unknowns',
        ]
      : [],
    details: includeAll
      ? {
          constraints: complete(node.constraints),
          domain: {
            options: complete(node.options),
            ...(node.optionSource === undefined
              ? {}
              : { optionSource: node.optionSource }),
            ...(node.valueDomain === undefined
              ? {}
              : { valueDomain: node.valueDomain }),
          },
          effects: complete(effects),
          interaction: {
            ...(node.interactionProfile === undefined
              ? {}
              : { profile: node.interactionProfile }),
          },
          locators: complete(node.locators),
          unknowns: complete(diagnostics),
        }
      : {},
  } as const;
}

function authorityProjection(
  value: ReturnType<typeof boundary>,
  nodeIds: readonly string[],
) {
  const authority = value.walkthrough.executionAuthority;
  const requestedNodeIds = new Set(nodeIds);
  const steps = authority.usage.steps.filter(
    (step) =>
      step.id === authority.usage.entry.landingStepId ||
      step.nodeIds.some((nodeId) => requestedNodeIds.has(nodeId)),
  );
  const stepIds = new Set(steps.map(({ id }) => id));
  const actionIds = new Set(steps.flatMap(({ actionIds: ids }) => ids));
  const actions = authority.usage.actions.filter(({ id }) => actionIds.has(id));
  const outcomeIds = new Set(actions.flatMap(({ outcomeIds: ids }) => ids));
  const outcomes = authority.usage.outcomes.filter(({ id }) => outcomeIds.has(id));
  const transitions = authority.usage.transitions.filter(
    ({ fromStepId, actionId, outcomeId, toStepId }) =>
      stepIds.has(fromStepId) &&
      actionIds.has(actionId) &&
      outcomeIds.has(outcomeId) &&
      stepIds.has(toStepId),
  );
  const interactions = authority.interactions.filter(({ nodeId }) =>
    requestedNodeIds.has(nodeId),
  );
  const interactionIds = new Set(interactions.map(({ id }) => id));
  const repeaterCaptures = authority.repeaterCaptures.filter(
    ({ repeaterNodeId }) => requestedNodeIds.has(repeaterNodeId),
  );
  const captureIds = new Set(repeaterCaptures.map(({ id }) => id));
  const readiness = authority.readiness.filter(({ owner }) =>
    owner.kind === 'interaction'
      ? interactionIds.has(owner.interactionId)
      : captureIds.has(owner.repeaterCaptureId),
  );
  const commits = authority.commits.filter(
    ({ nodeId, interactionId }) =>
      requestedNodeIds.has(nodeId) && interactionIds.has(interactionId),
  );
  const validationSurfaces = authority.validationSurfaces.filter(({ nodeId }) =>
    requestedNodeIds.has(nodeId),
  );
  const valueAssertions = authority.valueAssertions.filter(({ nodeId }) =>
    requestedNodeIds.has(nodeId),
  );
  const stateAssertions = authority.stateAssertions.filter(({ nodeId }) =>
    requestedNodeIds.has(nodeId),
  );
  const physicalOperationIds = new Set([
    ...commits.flatMap((commit) =>
      commit.kind === 'node-local' && commit.execution === 'explicit-intent'
        ? [commit.physicalOperationId]
        : [],
    ),
    ...validationSurfaces.flatMap((surface) =>
      surface.activation.kind === 'node-local'
        ? [surface.activation.physicalOperationId]
        : [],
    ),
  ]);
  return {
    owner: value.selection.owners.executionAuthority,
    entry: authority.usage.entry,
    steps: complete(steps),
    actions: complete(actions),
    outcomes: complete(outcomes),
    transitions: complete(transitions),
    physicalOperations: complete(
      authority.physicalOperations.filter(({ id }) =>
        physicalOperationIds.has(id),
      ),
    ),
    readiness: complete(readiness),
    interactions: complete(interactions),
    commits: complete(commits),
    validationSurfaces: complete(validationSurfaces),
    valueAssertions: complete(valueAssertions),
    stateAssertions: complete(stateAssertions),
    repeaterCaptures: complete(repeaterCaptures),
  } as const;
}

function allAuthorityNodeIds(authority: AgentContextExecutionAuthority) {
  return authority.usage.steps.flatMap(({ nodeIds }) => nodeIds);
}

function executableCapabilities(authority: AgentContextExecutionAuthority) {
  return [
    authority.usage.entry.operation,
    ...authority.usage.actions.map(({ operation }) => operation),
    ...authority.usage.outcomes.map(({ operation }) => operation),
    ...authority.readiness.map(({ operation }) => operation),
    ...authority.interactions.map(({ operation }) => operation),
    ...authority.commits.map(({ operation }) => operation),
    ...authority.validationSurfaces.flatMap(({ activation, assertion }) => [
      ...(activation.kind === 'none' ? [] : [activation.operation]),
      assertion.operation,
    ]),
    ...authority.valueAssertions.map(({ operation }) => operation),
    ...authority.stateAssertions.map(({ operation }) => operation),
    ...authority.repeaterCaptures.map(({ operation }) => operation),
  ]
    .filter((capability, index, capabilities) =>
      capabilities.indexOf(capability) === index,
    )
    .sort((left, right) => left.localeCompare(right));
}

function nodeExecutableCapabilities(
  authority: AgentContextExecutionAuthority,
  nodeId: string,
) {
  return [
    ...authority.readiness
      .filter((record) => record.nodeId === nodeId)
      .map(({ operation }) => operation),
    ...authority.interactions
      .filter((record) => record.nodeId === nodeId)
      .map(({ operation }) => operation),
    ...authority.commits
      .filter((record) => record.nodeId === nodeId)
      .map(({ operation }) => operation),
    ...authority.validationSurfaces
      .filter((record) => record.nodeId === nodeId)
      .flatMap(({ activation, assertion }) => [
        ...(activation.kind === 'none' ? [] : [activation.operation]),
        assertion.operation,
      ]),
    ...authority.valueAssertions
      .filter((record) => record.nodeId === nodeId)
      .map(({ operation }) => operation),
    ...authority.stateAssertions
      .filter((record) => record.nodeId === nodeId)
      .map(({ operation }) => operation),
    ...authority.repeaterCaptures
      .filter((record) => record.repeaterNodeId === nodeId)
      .map(({ operation }) => operation),
  ]
    .filter((capability, index, capabilities) =>
      capabilities.indexOf(capability) === index,
    )
    .sort((left, right) => left.localeCompare(right));
}

function summaryProjection(value: ReturnType<typeof boundary>) {
  const contract = value.walkthrough.resolvedContract;
  const nodes = flattenNodes(contract.nodes);
  const diagnostics = contract.diagnostics;
  const interactionUnknowns = nodes.reduce(
    (count, node) => count + (node.interactionProfile?.unknowns.length ?? 0),
    0,
  );
  const effectAnalysisReasons = contract.effectAnalysis?.reasons.length ?? 0;
  const effectAnalysisUnreported = contract.effectAnalysis === undefined ? 1 : 0;
  return {
    usageEntry: {
      usage: value.selection.usage,
      entryId: value.walkthrough.executionAuthority.usage.entry.id,
      landingStepId:
        value.walkthrough.executionAuthority.usage.entry.landingStepId,
      capability: 'open-usage',
    },
    form: {
      identity: value.selection.form,
      nodeCount: nodes.length,
    },
    diagnosticEvidenceCounts: {
      total: diagnostics.length,
      warnings: diagnostics.filter(({ severity }) => severity === 'warning').length,
      errors: diagnostics.filter(({ severity }) => severity === 'error').length,
    },
    executableCapabilities: complete(
      executableCapabilities(value.walkthrough.executionAuthority),
    ),
    scenarioIds: complete([value.selection.scenario.id]),
    effectAnalysis:
      contract.effectAnalysis === undefined
        ? { state: 'not-reported' }
        : { state: 'reported', analysis: contract.effectAnalysis },
    unknownEvidenceCounts: {
      total:
        diagnostics.length +
        interactionUnknowns +
        effectAnalysisReasons +
        effectAnalysisUnreported,
      diagnostics: diagnostics.length,
      interactionProfiles: interactionUnknowns,
      effectAnalysisReasons,
      effectAnalysisUnreported,
    },
  } as const;
}

function diagnosticEvidence(value: ReturnType<typeof boundary>) {
  const ownerReferences = [
    value.selection.owners.formContract,
    value.selection.owners.scenarioArtifact,
  ].filter(
    (owner, index, owners) =>
      owners.findIndex(
        (candidate) => compareReference(candidate, owner) === 0,
      ) === index,
  );
  return ownerReferences
    .flatMap((owner) => {
      const contract = value.dataset.formContracts.find(
        ({ reference }) => compareReference(reference, owner) === 0,
      )?.artifact;
      if (contract === undefined) throw new Error('missing diagnostic owner');
      return [
        ...contract.diagnostics.map((diagnostic) => ({
          kind: 'contract-diagnostic' as const,
          owner,
          diagnostic,
        })),
        ...(contract.effectAnalysis === undefined
          ? []
          : [
              {
                kind: 'effect-analysis' as const,
                owner,
                analysis: contract.effectAnalysis,
              },
            ]),
      ];
    })
    .sort((left, right) =>
      canonicalStringify(left).localeCompare(canonicalStringify(right)),
    );
}

function searchCandidate(value: ReturnType<typeof boundary>) {
  return {
    usage: value.selection.usage,
    projectId: value.selection.form.projectId,
    form: value.selection.form,
    sourceUsageCatalog: value.sourceUsageCatalog,
    selectionHandoffs: complete([value.selection]),
    matchReasons: complete(['text']),
  } as const;
}

function baseResults() {
  const value = boundary();
  const candidate = searchCandidate(value);
  const node = nodeProjection(value, value.focusNode);
  const authority = value.walkthrough.executionAuthority;
  const journeyAuthority = authorityProjection(
    value,
    allAuthorityNodeIds(authority),
  );
  const nodeAuthority = authorityProjection(value, [node.nodeId]);
  const searchBase = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'search-form-usages',
    scope: value.scope,
    freshness: 'current',
  } as const;
  const contextBase = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'get-form-context',
    selection: value.selection,
    freshness: 'current',
  } as const;
  const nodeBase = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'find-form-nodes',
    selection: value.selection,
    freshness: 'current',
  } as const;
  const sliceBase = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'get-e2e-slice',
    selection: value.selection,
    freshness: 'current',
    request: {
      withinStepId: value.step.id,
      nodeIds: [value.focusNode.id],
      goal: 'positive',
      includeOutgoingEffects: false,
    },
  } as const;
  return {
    value,
    candidate,
    node,
    authority,
    journeyAuthority,
    nodeAuthority,
    searchBase,
    contextBase,
    nodeBase,
    sliceBase,
  };
}

function validSliceResult() {
  const base = baseResults();
  const resolution = resolveAgentContextE2eSliceAgainstParsedDataset(
    base.value.dataset,
    base.value.selection,
    base.sliceBase.request,
  );
  if (resolution.status !== 'complete') {
    throw new Error('positive slice must resolve completely');
  }
  return {
    base,
    result: {
      ...base.sliceBase,
      status: 'complete',
      slice: resolution.slice,
    } as const,
  };
}

describe('agent-context query result contract', () => {
  it('round-trips bounded full node aspects, atomic journey authority, and a concrete E2E slice', () => {
    const {
      value,
      authority,
      journeyAuthority,
      nodeBase,
      contextBase,
      sliceBase,
    } = baseResults();
    const node = nodeProjection(value, value.focusNode, true);
    const nodeResult = {
      ...nodeBase,
      status: 'complete',
      authority: authorityProjection(value, [node.nodeId]),
      candidates: [node],
      page: { collection: 'nodes', truncated: false },
    } as const;
    const journeyResult = {
      ...contextBase,
      status: 'complete',
      view: 'journey',
      journey: {
        identity: value.selection.journey,
        authority: journeyAuthority,
      },
    } as const;
    const readiness = authority.readiness[0];
    if (readiness === undefined) {
      throw new Error('positive authority needs readiness evidence');
    }
    const readinessNodeSource = value.nodes.find(
      ({ id }) => id === readiness.nodeId,
    );
    if (readinessNodeSource === undefined) {
      throw new Error('readiness node must resolve in the selected contract');
    }
    const readinessNode =
      readinessNodeSource.id === node.nodeId
        ? node
        : nodeProjection(value, readinessNodeSource);
    const closureNodes = [node, readinessNode]
      .filter(
        (candidate, index, nodes) =>
          nodes.findIndex(({ nodeId }) => nodeId === candidate.nodeId) === index,
      )
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
    const sliceResult = {
      ...sliceBase,
      status: 'complete',
      slice: {
        withinStepId: value.step.id,
        authority: authorityProjection(
          value,
          closureNodes.map(({ nodeId }) => nodeId),
        ),
        focusNodes: complete([node]),
        closureNodes: complete(closureNodes),
        prerequisites: complete([
          { kind: 'readiness', node: readinessNode, readiness },
        ]),
        effects: complete(
          value.walkthrough.resolvedContract.declaredEffects ?? [],
        ),
      },
    } as const;

    for (const result of [nodeResult, journeyResult, sliceResult]) {
      expect(parseAgentContextQueryResult(result)).toEqual(result);
      expect(validateAgentContextQueryResult(value.dataset, result)).toEqual(
        result,
      );
      expect(JSON.parse(canonicalizeAgentContextQueryResult(result))).toEqual(
        result,
      );
    }
  });

  it('validates search, summary, and diagnostic projections against exact dataset owners', () => {
    const { value, candidate, searchBase, contextBase } = baseResults();
    const searchResult = {
      ...searchBase,
      status: 'complete',
      candidates: [candidate],
      page: { collection: 'candidates', truncated: false },
    } as const;
    const summaryResult = {
      ...contextBase,
      status: 'complete',
      view: 'summary',
      summary: summaryProjection(value),
      steps: [
        {
          id: value.step.id,
          ordinal: value.step.ordinal,
          nodeCount: value.step.nodeIds.length,
          actionIds: value.step.actionIds,
        },
      ],
      page: { collection: 'steps', truncated: false },
    } as const;
    const diagnosticResult = {
      ...contextBase,
      status: 'complete',
      view: 'diagnostics',
      evidence: diagnosticEvidence(value),
      page: { collection: 'diagnostics', truncated: false },
    } as const;

    for (const result of [searchResult, summaryResult, diagnosticResult]) {
      expect(validateAgentContextQueryResult(value.dataset, result)).toEqual(
        result,
      );
    }

    expect(() =>
      validateAgentContextQueryResult(value.dataset, {
        ...searchResult,
        scope: {
          ...searchResult.scope,
          artifactSet: {
            ...searchResult.scope.artifactSet,
            contentHash: `sha256:${'0'.repeat(64)}`,
          },
        },
      }),
    ).toThrow(/scope|artifactSet/u);
    expect(() =>
      validateAgentContextQueryResult(value.dataset, {
        ...summaryResult,
        summary: {
          ...summaryResult.summary,
          form: {
            ...summaryResult.summary.form,
            nodeCount: summaryResult.summary.form.nodeCount + 1,
          },
        },
      }),
    ).toThrow(/summary|nodeCount|projection/u);
    expect(() =>
      validateAgentContextQueryResult(value.dataset, {
        ...diagnosticResult,
        evidence: [
          {
            kind: 'contract-diagnostic',
            owner: value.selection.owners.formContract,
            diagnostic: {
              code: 'OPAQUE_FUNCTION',
              severity: 'warning',
              message: 'internally valid but not owner evidence',
              evidence: 'declared',
              sourcePath: [],
            },
          },
        ],
      }),
    ).toThrow(/diagnostic|evidence|owner|projection/u);

    const unrelatedOwner = value.dataset.formContracts.find(
      ({ reference }) =>
        compareReference(reference, value.selection.owners.formContract) !==
          0 &&
        compareReference(reference, value.selection.owners.scenarioArtifact) !==
          0,
    );
    if (unrelatedOwner === undefined) {
      throw new Error('fixture needs an unrelated form owner');
    }
    expect(() =>
      parseAgentContextQueryResult({
        ...diagnosticResult,
        evidence: [
          {
            kind: 'contract-diagnostic',
            owner: unrelatedOwner.reference,
            diagnostic: unrelatedOwner.artifact.diagnostics[0],
          },
        ],
      }),
    ).toThrow(/evidence|owner|selected form/u);
  });

  it('requires the resolved scenario node set to equal the declared and authority node sets', () => {
    const value = boundary();
    const {
      contentHash: originalScenarioHash,
      ...scenarioDraft
    } = value.walkthrough.resolvedContract;
    const driftScenario = createFormContract({
      ...scenarioDraft,
      nodes: scenarioDraft.nodes.slice(1),
    });
    const {
      contentHash: originalAuthorityHash,
      ...authorityDraft
    } = value.walkthrough.executionAuthority;
    const driftAuthority = createAgentContextExecutionAuthority({
      ...authorityDraft,
      scenario: {
        ...authorityDraft.scenario,
        artifactHash:
          driftScenario.contentHash as AgentContextArtifactReference['contentHash'],
      },
    });
    const scenarioReference: AgentContextArtifactReference = {
      ...value.selection.owners.scenarioArtifact,
      contentHash:
        driftScenario.contentHash as AgentContextArtifactReference['contentHash'],
    };
    const authorityReference: AgentContextArtifactReference = {
      ...value.selection.owners.executionAuthority,
      contentHash: driftAuthority.contentHash,
    };
    const { contentHash: originalArtifactSetHash, ...artifactSetDraft } =
      value.dataset.artifactSet;
    const artifactSet = createAgentContextArtifactSet({
      ...artifactSetDraft,
      artifacts: artifactSetDraft.artifacts
        .map((reference) =>
          reference.contentHash === originalScenarioHash
            ? scenarioReference
            : reference.contentHash === originalAuthorityHash
              ? authorityReference
              : reference,
        )
        .sort(compareReference),
    });
    void originalArtifactSetHash;
    const dataset = {
      ...value.dataset,
      artifactSet,
      formContracts: value.dataset.formContracts
        .map((owner) =>
          owner.reference.contentHash === originalScenarioHash
            ? { reference: scenarioReference, artifact: driftScenario }
            : owner,
        )
        .sort((left, right) => compareReference(left.reference, right.reference)),
      executionAuthorities: value.dataset.executionAuthorities
        .map((owner) =>
          owner.reference.contentHash === originalAuthorityHash
            ? { reference: authorityReference, artifact: driftAuthority }
            : owner,
        )
        .sort((left, right) => compareReference(left.reference, right.reference)),
    };
    const selection = {
      ...value.selection,
      artifactSet: {
        schemaVersion: artifactSet.schemaVersion,
        contentHash: artifactSet.contentHash,
      },
      owners: {
        ...value.selection.owners,
        scenarioArtifact: scenarioReference,
        executionAuthority: authorityReference,
      },
      scenario: driftAuthority.scenario,
    };

    expect(() => validateAgentContextQuerySelection(dataset, selection)).toThrow(
      /scenarioArtifact\.nodes|node/u,
    );
  });

  it('preserves valid schema-owned effect-analysis reason order', () => {
    const { value, contextBase } = baseResults();
    const summary = summaryProjection(value);
    const effectAnalysisReasons = 2;
    const result = {
      ...contextBase,
      status: 'complete',
      view: 'summary',
      summary: {
        ...summary,
        effectAnalysis: {
          state: 'reported',
          analysis: {
            completeness: 'incomplete',
            reasons: ['opaque-diagnostic', 'declared-partial'],
          },
        },
        unknownEvidenceCounts: {
          ...summary.unknownEvidenceCounts,
          total:
            summary.unknownEvidenceCounts.total -
            summary.unknownEvidenceCounts.effectAnalysisUnreported +
            effectAnalysisReasons,
          effectAnalysisReasons,
          effectAnalysisUnreported: 0,
        },
      },
      steps: [],
      page: { collection: 'steps', truncated: false },
    } as const;

    expect(parseAgentContextQueryResult(result)).toEqual(result);
  });

  it('accepts every operation/status/view/page/result variant', () => {
    const {
      value,
      candidate,
      node,
      journeyAuthority,
      searchBase,
      contextBase,
      nodeBase,
      sliceBase,
    } = baseResults();
    const secondSelection = {
      ...value.selection,
      usage: { ...value.selection.usage, version: 2 },
      executionAuthority: {
        ...value.selection.executionAuthority,
        usageVersion: 2,
      },
    };
    const secondCandidate = {
      ...candidate,
      usage: secondSelection.usage,
      selectionHandoffs: complete([secondSelection]),
    };
    const usageCandidates = [candidate, secondCandidate] as const;
    const usageIdentities = usageCandidates.map(
      ({ sourceUsageCatalog, usage }) => ({ sourceUsageCatalog, usage }),
    );
    const secondNode = nodeProjection(value, value.nodes.find(({ id }) => id !== node.nodeId) ?? value.focusNode);
    const nodeCandidates = [node, secondNode].sort((left, right) =>
      left.nodeId.localeCompare(right.nodeId),
    );
    const nodeIds = nodeCandidates.map(({ nodeId }) => nodeId);
    const sliceNode = nodeProjection(value, value.focusNode, true);
    const witness = {
      effect: { id: 'synthetic.rh05.cross-step-effect', version: 1 },
      trigger: { nodeId: 'synthetic.rh05.source', stepId: 'entry' },
      target: { nodeId: sliceNode.nodeId, stepId: value.step.id },
    } as const;
    const transition = {
      id: 'synthetic.rh05.entry.next',
      version: 1,
      fromStepId: 'entry',
      actionId: 'synthetic.rh05.entry.next.action',
      outcomeId: 'synthetic.rh05.entry.next.outcome',
      toStepId: value.step.id,
    } as const;
    const results: readonly unknown[] = [
      {
        ...searchBase,
        status: 'complete',
        candidates: [candidate],
        page: { collection: 'candidates', truncated: false },
      },
      {
        ...searchBase,
        status: 'ambiguous',
        candidates: usageCandidates,
        page: { collection: 'candidates', truncated: false },
        reason: {
          kind: 'usage-ambiguous',
          totalMatches: usageCandidates.length,
          usages: usageIdentities,
        },
      },
      ...(
        ['usage-absent-authoritative', 'usage-absence-not-authoritative'] as const
      ).map((kind) => ({
        ...searchBase,
        status: 'not-found',
        candidates: [],
        page: { collection: 'candidates', truncated: false },
        reason: { kind },
      })),
      {
        ...searchBase,
        status: 'refused',
        reason: { kind: 'atomic-record-too-large' },
      },
      {
        ...contextBase,
        status: 'complete',
        view: 'summary',
        summary: summaryProjection(value),
        steps: [
          {
            id: value.step.id,
            ordinal: value.step.ordinal,
            nodeCount: value.step.nodeIds.length,
            actionIds: value.step.actionIds,
          },
        ],
        page: { collection: 'steps', truncated: false },
      },
      {
        ...contextBase,
        status: 'complete',
        view: 'diagnostics',
        evidence: diagnosticEvidence(value),
        page: { collection: 'diagnostics', truncated: false },
      },
      {
        ...contextBase,
        status: 'complete',
        view: 'journey',
        journey: {
          identity: value.selection.journey,
          authority: journeyAuthority,
        },
      },
      ...(['summary', 'diagnostics'] as const).map((view) => ({
        ...contextBase,
        status: 'refused',
        view,
        reason: { kind: 'atomic-record-too-large' },
      })),
      ...(['atomic-record-too-large', 'atomic-view-too-large'] as const).map(
        (kind) => ({
          ...contextBase,
          status: 'refused',
          view: 'journey',
          reason: { kind },
        }),
      ),
      {
        ...nodeBase,
        status: 'complete',
        authority: authorityProjection(value, [node.nodeId]),
        candidates: [node],
        page: { collection: 'nodes', truncated: false },
      },
      {
        ...nodeBase,
        status: 'ambiguous',
        authority: authorityProjection(value, nodeIds),
        candidates: nodeCandidates,
        page: { collection: 'nodes', truncated: false },
        reason: {
          kind: 'node-ambiguous',
          totalMatches: nodeCandidates.length,
          nodeIds,
        },
      },
      {
        ...nodeBase,
        status: 'not-found',
        candidates: [],
        page: { collection: 'nodes', truncated: false },
        reason: { kind: 'node-absent' },
      },
      {
        ...nodeBase,
        status: 'refused',
        reason: { kind: 'atomic-record-too-large' },
      },
      {
        ...sliceBase,
        status: 'complete',
        slice: {
          withinStepId: value.step.id,
          authority: authorityProjection(value, [sliceNode.nodeId]),
          focusNodes: complete([sliceNode]),
          closureNodes: complete([sliceNode]),
          prerequisites: complete([]),
          effects: complete([]),
        },
      },
      ...([
        { kind: 'step-absent', stepId: value.step.id },
        { kind: 'slice-focus-node-absent', nodeIds: [sliceNode.nodeId] },
        { kind: 'step-scope-mismatch', nodeIds: [sliceNode.nodeId] },
        {
          kind: 'cross-step-prerequisite-required',
          witness,
          transition,
        },
        {
          kind: 'cross-step-transition-ambiguous',
          witness,
          transitions: [
            transition,
            { ...transition, id: 'synthetic.rh05.entry.next-alternative' },
          ].sort((left, right) => {
            const leftKey = canonicalStringify(left);
            const rightKey = canonicalStringify(right);
            return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
          }),
        },
        {
          kind: 'cross-step-transition-unavailable',
          witness,
        },
        {
          kind: 'prerequisite-readiness-unavailable',
          effect: witness.effect,
          nodeId: sliceNode.nodeId,
          readinessId: 'synthetic.rh05.readiness.missing',
        },
        { kind: 'prerequisite-cycle', nodeIds: [sliceNode.nodeId] },
        { kind: 'atomic-record-too-large' },
        { kind: 'atomic-view-too-large' },
      ] as const).map((reason) => ({
        ...sliceBase,
        status: 'refused',
        reason,
      })),
    ];

    for (const result of results) {
      expect(() => parseAgentContextQueryResult(result)).not.toThrow();
    }
  });

  it('binds ambiguous reasons to page-local identities and total unpaged matches', () => {
    const { value, candidate, node, searchBase, nodeBase } = baseResults();
    const pagedUsageAmbiguity = {
      ...searchBase,
      status: 'ambiguous',
      candidates: [candidate],
      page: {
        collection: 'candidates',
        truncated: true,
        nextCursor: 'acq1.x.y',
      },
      reason: {
        kind: 'usage-ambiguous',
        totalMatches: 2,
        usages: [
          {
            sourceUsageCatalog: candidate.sourceUsageCatalog,
            usage: candidate.usage,
          },
        ],
      },
    } as const;
    const pagedNodeAmbiguity = {
      ...nodeBase,
      status: 'ambiguous',
      authority: authorityProjection(value, [node.nodeId]),
      candidates: [node],
      page: { collection: 'nodes', truncated: true, nextCursor: 'acq1.x.y' },
      reason: {
        kind: 'node-ambiguous',
        totalMatches: 2,
        nodeIds: [node.nodeId],
      },
    } as const;

    expect(parseAgentContextQueryResult(pagedUsageAmbiguity)).toEqual(
      pagedUsageAmbiguity,
    );
    expect(parseAgentContextQueryResult(pagedNodeAmbiguity)).toEqual(
      pagedNodeAmbiguity,
    );

    for (const result of [
      {
        ...pagedUsageAmbiguity,
        reason: { ...pagedUsageAmbiguity.reason, totalMatches: 1 },
      },
      {
        ...pagedUsageAmbiguity,
        reason: {
          ...pagedUsageAmbiguity.reason,
          totalMatches: AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE + 1,
        },
      },
      {
        ...pagedUsageAmbiguity,
        reason: { ...pagedUsageAmbiguity.reason, usages: [] },
      },
      {
        ...pagedNodeAmbiguity,
        reason: { ...pagedNodeAmbiguity.reason, totalMatches: 1 },
      },
      {
        ...pagedNodeAmbiguity,
        reason: {
          ...pagedNodeAmbiguity.reason,
          totalMatches: AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE + 1,
        },
      },
      {
        ...pagedNodeAmbiguity,
        reason: { ...pagedNodeAmbiguity.reason, nodeIds: [] },
      },
    ]) {
      expect(() => parseAgentContextQueryResult(result)).toThrow(
        /ambiguous|totalMatches|usages|nodeIds|candidate/u,
      );
    }
  });

  it('requires complete search and node results to prove one untruncated match', () => {
    const { value, candidate, node, searchBase, nodeBase } = baseResults();
    const secondUsageCandidate = {
      ...candidate,
      usage: {
        kind: 'declared' as const,
        usageId: 'synthetic.second-usage',
        version: 1,
      },
      selectionHandoffs: complete([]),
    };
    const usageCandidates = [candidate, secondUsageCandidate].sort((left, right) =>
      canonicalStringify({
        sourceUsageCatalog: left.sourceUsageCatalog,
        usage: left.usage,
      }).localeCompare(
        canonicalStringify({
          sourceUsageCatalog: right.sourceUsageCatalog,
          usage: right.usage,
        }),
      ),
    );

    const authorityNodeIds = allAuthorityNodeIds(value.walkthrough.executionAuthority);
    const secondNodeSource = value.nodes.find(
      ({ id }) => id !== node.nodeId && authorityNodeIds.includes(id),
    );
    if (secondNodeSource === undefined) {
      throw new Error('fixture needs a second authority node');
    }
    const secondNode = nodeProjection(value, secondNodeSource);
    const nodeCandidates = [node, secondNode].sort((left, right) =>
      left.nodeId.localeCompare(right.nodeId),
    );
    const nodeAuthority = authorityProjection(
      value,
      nodeCandidates.map(({ nodeId }) => nodeId),
    );

    for (const result of [
      {
        ...searchBase,
        status: 'complete',
        candidates: usageCandidates,
        page: { collection: 'candidates', truncated: false },
      },
      {
        ...searchBase,
        status: 'complete',
        candidates: [candidate],
        page: {
          collection: 'candidates',
          truncated: true,
          nextCursor: 'acq1.x.y',
        },
      },
      {
        ...nodeBase,
        status: 'complete',
        authority: nodeAuthority,
        candidates: nodeCandidates,
        page: { collection: 'nodes', truncated: false },
      },
      {
        ...nodeBase,
        status: 'complete',
        authority: authorityProjection(value, [node.nodeId]),
        candidates: [node],
        page: {
          collection: 'nodes',
          truncated: true,
          nextCursor: 'acq1.x.y',
        },
      },
    ]) {
      expect(() => parseAgentContextQueryResult(result)).toThrow(
        /complete|candidate|truncated/u,
      );
    }
  });

  it('rejects malformed cross-field mutations and incomplete secondary collections', () => {
    const { value, candidate, node, authority, searchBase, contextBase, sliceBase } =
      baseResults();
    const notFound = {
      ...searchBase,
      status: 'not-found',
      candidates: [],
      page: {
        collection: 'candidates',
        truncated: true,
        nextCursor: 'acq1.x.y',
      },
      reason: { kind: 'usage-absent-authoritative' },
    } as const;
    expect(() => parseAgentContextQueryResult(notFound)).toThrow(
      /not-found|truncated|page/u,
    );

    const badJourney = {
      ...contextBase,
      status: 'complete',
      view: 'journey',
      journey: {
        identity: value.selection.journey,
        authority: {
          ...authorityProjection(value, allAuthorityNodeIds(authority)),
          entry: { ...authority.usage.entry, landingStepId: 'missing.step' },
        },
      },
    } as const;
    expect(() => parseAgentContextQueryResult(badJourney)).toThrow(
      /landingStepId|step/u,
    );

    const evidence = {
      kind: 'contract-diagnostic',
      owner: value.selection.owners.formContract,
      diagnostic: {
        code: 'OPAQUE_FUNCTION',
        severity: 'warning',
        message: 'synthetic duplicate evidence',
        evidence: 'declared',
        sourcePath: [],
      },
    } as const;
    const duplicateEvidence = {
      ...contextBase,
      status: 'complete',
      view: 'diagnostics',
      evidence: [evidence, evidence],
      page: { collection: 'diagnostics', truncated: false },
    } as const;
    expect(() => parseAgentContextQueryResult(duplicateEvidence)).toThrow(
      /evidence|duplicate|canonical/u,
    );
    expect(() =>
      parseAgentContextQueryResult({
        ...contextBase,
        status: 'complete',
        view: 'diagnostics',
        evidence: [{ kind: 'atomic-record-too-large' }],
        page: { collection: 'diagnostics', truncated: false },
      }),
    ).toThrow(/diagnostic|evidence|kind/u);

    expect(() =>
      parseAgentContextQueryResult({
        ...contextBase,
        status: 'complete',
        view: 'summary',
        summary: {
          ...summaryProjection(value),
          diagnosticEvidenceCounts: {
            ...summaryProjection(value).diagnosticEvidenceCounts,
            total: 0,
            warnings: 1,
          },
        },
        steps: [],
        page: { collection: 'steps', truncated: false },
      }),
    ).toThrow(/diagnosticEvidenceCounts|total|warnings|errors/u);

    const slice = {
      withinStepId: value.step.id,
      authority: authorityProjection(value, [node.nodeId]),
      focusNodes: complete([node]),
      closureNodes: complete([node]),
      prerequisites: complete([]),
      effects: complete([]),
    } as const;
    expect(() =>
      parseAgentContextQueryResult({
        ...sliceBase,
        status: 'complete',
        slice: { ...slice, closureNodes: complete([]) },
      }),
    ).toThrow(/focus|closure|subset/u);
    expect(() =>
      parseAgentContextQueryResult({
        ...sliceBase,
        status: 'complete',
        slice: {
          ...slice,
          focusNodes: complete([]),
          prerequisites: complete([
            {
              kind: 'readiness',
              node: { ...node, nodeId: 'missing.prerequisite' },
              readiness: authority.readiness[0],
            },
          ]),
        },
      }),
    ).toThrow(/focus|prerequisite|closure|subset/u);
    const unrelatedEffect =
      value.fixture.walkthroughs.negative.resolvedContract.declaredEffects?.[0];
    if (unrelatedEffect === undefined) {
      throw new Error('negative walkthrough needs an unrelated effect');
    }
    const exactSlice = validSliceResult().result;
    expect(() =>
      parseAgentContextQueryResult({
        ...exactSlice,
        slice: {
          ...exactSlice.slice,
          effects: complete([unrelatedEffect]),
        },
      }),
    ).toThrow(/effect.*(closure|endpoint)|(closure|endpoint).*effect/u);

    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [
          {
            ...candidate,
            selectionHandoffs: { complete: false, items: [value.selection] },
          },
        ],
        page: { collection: 'candidates', truncated: false },
      }),
    ).toThrow(/complete|selectionHandoffs/u);
    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [
          {
            ...candidate,
            matchReasons: complete(Array(10_001).fill('bounded-reason')),
          },
        ],
        page: { collection: 'candidates', truncated: false },
      }),
    ).toThrow(/10000|10,000|matchReasons/u);

    const allDetailsNode = nodeProjection(value, value.focusNode, true);
    expect(() =>
      parseAgentContextQueryResult({
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'find-form-nodes',
        status: 'complete',
        selection: value.selection,
        freshness: 'current',
        authority: authorityProjection(value, [allDetailsNode.nodeId]),
        candidates: [
          {
            ...allDetailsNode,
            included: allDetailsNode.included.filter(
              (aspect) => aspect !== 'locators',
            ),
          },
        ],
        page: { collection: 'nodes', truncated: false },
      }),
    ).toThrow(/included|details|locators/u);
  });

  it('rejects search candidates outside their scope or with guessing-prone handoffs', () => {
    const { value, candidate, searchBase } = baseResults();
    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [
          {
            ...candidate,
            sourceUsageCatalog: {
              ...candidate.sourceUsageCatalog,
              contentHash: `sha256:${'0'.repeat(64)}`,
            },
          },
        ],
        page: { collection: 'candidates', truncated: false },
      }),
    ).toThrow(/sourceUsageCatalog|scope/u);
    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [
          {
            ...candidate,
            selectionHandoffs: complete([
              {
                ...value.selection,
                owners: {
                  ...value.selection.owners,
                  sourceUsageCatalog: {
                    ...value.selection.owners.sourceUsageCatalog,
                    contentHash: `sha256:${'0'.repeat(64)}`,
                  },
                },
              },
            ]),
          },
        ],
        page: { collection: 'candidates', truncated: false },
      }),
    ).toThrow(/selectionHandoffs|sourceUsageCatalog/u);

    const callsiteCandidate = {
      usage: {
        kind: 'callsite',
        projectId: 'different-project',
        callsiteKey: 'usage.callsite',
      },
      projectId: candidate.projectId,
      sourceUsageCatalog: candidate.sourceUsageCatalog,
      selectionHandoffs: complete([]),
      matchReasons: complete(['callsite']),
    } as const;
    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [callsiteCandidate],
        page: { collection: 'candidates', truncated: false },
      }),
    ).toThrow(/callsite|projectId/u);

    const validCallsiteCandidate = {
      ...callsiteCandidate,
      usage: { ...callsiteCandidate.usage, projectId: candidate.projectId },
    } as const;
    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [validCallsiteCandidate],
        page: { collection: 'candidates', truncated: false },
      }),
    ).not.toThrow();
    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [
          {
            ...validCallsiteCandidate,
            selectionHandoffs: complete([value.selection]),
          },
        ],
        page: { collection: 'candidates', truncated: false },
      }),
    ).toThrow(/callsite|selectionHandoffs/u);

    const unresolvedDeclaredCandidate = {
      usage: candidate.usage,
      projectId: candidate.projectId,
      sourceUsageCatalog: candidate.sourceUsageCatalog,
      selectionHandoffs: complete([]),
      matchReasons: candidate.matchReasons,
    } as const;
    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [unresolvedDeclaredCandidate],
        page: { collection: 'candidates', truncated: false },
      }),
    ).not.toThrow();
    const exactWithoutHandoff = {
      ...searchBase,
      status: 'complete',
      candidates: [{ ...candidate, selectionHandoffs: complete([]) }],
      page: { collection: 'candidates', truncated: false },
    } as const;
    expect(parseAgentContextQueryResult(exactWithoutHandoff)).toEqual(
      exactWithoutHandoff,
    );
    expect(
      validateAgentContextQueryResult(value.dataset, exactWithoutHandoff),
    ).toEqual(exactWithoutHandoff);

    expect(() =>
      parseAgentContextQueryResult({
        ...searchBase,
        status: 'complete',
        candidates: [
          {
            ...unresolvedDeclaredCandidate,
            selectionHandoffs: complete([value.selection]),
          },
        ],
        page: { collection: 'candidates', truncated: false },
      }),
    ).toThrow(/form|selectionHandoffs/u);
  });

  it('rejects result authority that drifts from the pinned selection or owner', () => {
    const { value, node, authority, journeyAuthority, nodeBase, contextBase } =
      baseResults();
    const projection = authorityProjection(value, [node.nodeId]);
    expect(() =>
      parseAgentContextQueryResult({
        ...nodeBase,
        status: 'complete',
        authority: {
          ...projection,
          owner: {
            ...projection.owner,
            contentHash: `sha256:${'0'.repeat(64)}`,
          },
        },
        candidates: [node],
        page: { collection: 'nodes', truncated: false },
      }),
    ).toThrow(/authority|owner|contentHash/u);

    const internallyValidEntryDrift = {
      ...nodeBase,
      status: 'complete',
      authority: {
        ...projection,
        entry: {
          ...projection.entry,
          driver: { ...projection.entry.driver, id: 'application.driver.drift' },
        },
      },
      candidates: [node],
      page: { collection: 'nodes', truncated: false },
    } as const;
    expect(() => parseAgentContextQueryResult(internallyValidEntryDrift)).not.toThrow();
    expect(() =>
      validateAgentContextQueryResult(value.dataset, internallyValidEntryDrift),
    ).toThrow(/authority|projection|entry|owner/u);

    const internallyValidJourneyDriverDrift = {
      ...contextBase,
      status: 'complete',
      view: 'journey',
      journey: {
        identity: value.selection.journey,
        authority: {
          ...journeyAuthority,
          entry: {
            ...journeyAuthority.entry,
            driver: {
              ...journeyAuthority.entry.driver,
              id: 'application.journey-driver.drift',
            },
          },
        },
      },
    } as const;
    expect(() =>
      parseAgentContextQueryResult(internallyValidJourneyDriverDrift),
    ).not.toThrow();
    expect(() =>
      validateAgentContextQueryResult(
        value.dataset,
        internallyValidJourneyDriverDrift,
      ),
    ).toThrow(/journey|authority|projection|entry/u);

    const bloatedNodeProjection = {
      ...nodeBase,
      status: 'complete',
      authority: journeyAuthority,
      candidates: [node],
      page: { collection: 'nodes', truncated: false },
    } as const;
    expect(() => parseAgentContextQueryResult(bloatedNodeProjection)).not.toThrow();
    expect(() =>
      validateAgentContextQueryResult(value.dataset, bloatedNodeProjection),
    ).toThrow(/authority|projection/u);

    expect(authority.contentHash).toBe(value.selection.owners.executionAuthority.contentHash);
  });

  it('recomputes slices and rejects omitted, inflated, or invented refusal data', () => {
    const { base, result } = validSliceResult();
    expect(validateAgentContextQueryResult(base.value.dataset, result)).toEqual(
      result,
    );
    expect(() =>
      validateAgentContextQueryResult(base.value.dataset, {
        ...result,
        slice: { ...result.slice, prerequisites: complete([]) },
      }),
    ).toThrow(/slice|prerequisite|recomputed|projection/u);

    const extraSource = base.value.nodes.find(
      ({ id }) => !result.request.nodeIds.includes(id),
    );
    if (extraSource === undefined) throw new Error('missing extra slice node');
    const extraNode = nodeProjection(base.value, extraSource, true);
    const closureNodes = [...result.slice.closureNodes.items, extraNode].sort(
      (left, right) => left.nodeId.localeCompare(right.nodeId),
    );
    expect(() =>
      validateAgentContextQueryResult(base.value.dataset, {
        ...result,
        slice: {
          ...result.slice,
          authority: authorityProjection(
            base.value,
            closureNodes.map(({ nodeId }) => nodeId),
          ),
          closureNodes: complete(closureNodes),
        },
      }),
    ).toThrow(/slice|closure|recomputed|projection/u);

    for (const kind of [
      'atomic-record-too-large',
      'atomic-view-too-large',
    ] as const) {
      expect(() =>
        validateAgentContextQueryResult(base.value.dataset, {
          ...base.sliceBase,
          status: 'refused',
          reason: { kind },
        }),
      ).toThrow(/reason|recomputed|outcome|projection/u);
    }
  });

  it('recomputes journey overflow refusals against the selected authority', () => {
    const { value, contextBase } = baseResults();
    for (const kind of [
      'atomic-record-too-large',
      'atomic-view-too-large',
    ] as const) {
      const forgedRefusal = {
        ...contextBase,
        status: 'refused',
        view: 'journey',
        reason: { kind },
      } as const;
      expect(parseAgentContextQueryResult(forgedRefusal)).toEqual(
        forgedRefusal,
      );
      expect(() =>
        validateAgentContextQueryResult(value.dataset, forgedRefusal),
      ).toThrow(/journey|reason|overflow|recomputed/u);
    }
  });

  it('classifies request, semantic-refusal, collection, and view graph caps record-first', () => {
    const { base, result } = validSliceResult();
    const nodeIds = Array.from(
      { length: 9_996 },
      (_, index) => `synthetic.rh05.node.${String(index).padStart(5, '0')}`,
    );
    expect(
      classifyAgentContextE2eSliceOverflow({
        ...result,
        request: { ...result.request, nodeIds: nodeIds.slice(0, 9_995) },
      }),
    ).toBeUndefined();
    expect(
      classifyAgentContextE2eSliceOverflow({
        ...result,
        request: { ...result.request, nodeIds },
      }),
    ).toEqual({ kind: 'atomic-record-too-large' });
    const recomputedOverflow = {
      ...base.sliceBase,
      request: { ...base.sliceBase.request, nodeIds },
      status: 'refused',
      reason: { kind: 'atomic-record-too-large' },
    } as const;
    expect(
      validateAgentContextQueryResult(base.value.dataset, recomputedOverflow),
    ).toEqual(recomputedOverflow);
    expect(() =>
      validateAgentContextQueryResult(base.value.dataset, {
        ...recomputedOverflow,
        reason: { kind: 'atomic-view-too-large' },
      }),
    ).toThrow(/reason|atomic-record-too-large/u);

    const transition = {
      id: 'synthetic.rh05.transition.0000',
      version: 1,
      fromStepId: 'synthetic.rh05.step.source',
      actionId: 'synthetic.rh05.action.0000',
      outcomeId: 'synthetic.rh05.outcome.0000',
      toStepId: result.request.withinStepId,
    } as const;
    const witness = {
      effect: { id: 'synthetic.rh05.effect.cross-step', version: 1 },
      trigger: {
        nodeId: 'synthetic.rh05.node.source',
        stepId: transition.fromStepId,
      },
      target: {
        nodeId: result.request.nodeIds[0],
        stepId: transition.toStepId,
      },
    } as const;
    const transitions = Array.from({ length: 1_500 }, (_, index) => ({
      ...transition,
      id: `synthetic.rh05.transition.${String(index).padStart(4, '0')}`,
      actionId: `synthetic.rh05.action.${String(index).padStart(4, '0')}`,
      outcomeId: `synthetic.rh05.outcome.${String(index).padStart(4, '0')}`,
    }));
    expect(
      classifyAgentContextE2eSliceOverflow({
        ...base.sliceBase,
        status: 'refused',
        reason: {
          kind: 'cross-step-transition-ambiguous',
          witness,
          transitions,
        },
      }),
    ).toEqual({ kind: 'atomic-record-too-large' });

    const effect =
      base.value.fixture.walkthroughs.negative.resolvedContract
        .declaredEffects?.[0];
    if (effect === undefined) throw new Error('missing cap effect');
    const withEffectCount = (count: number) => ({
      ...result,
      slice: {
        ...result.slice,
        effects: complete(
          Array.from({ length: count }, (_, index) => ({
            ...effect,
            identity: {
              ...effect.identity,
              id: `synthetic.rh05.effect.${String(index).padStart(5, '0')}`,
            },
          })),
        ),
      },
    });
    let lower = 0;
    let upper = AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE;
    while (lower + 1 < upper) {
      const middle = Math.floor((lower + upper) / 2);
      if (
        classifyAgentContextE2eSliceOverflow(withEffectCount(middle)) ===
        undefined
      ) {
        lower = middle;
      } else {
        upper = middle;
      }
    }
    expect(
      classifyAgentContextE2eSliceOverflow(withEffectCount(lower)),
    ).toBeUndefined();
    expect(
      classifyAgentContextE2eSliceOverflow(withEffectCount(upper)),
    ).toEqual({ kind: 'atomic-view-too-large' });
    expect(
      classifyAgentContextE2eSliceOverflow(
        withEffectCount(AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE + 1),
      ),
    ).toEqual({ kind: 'atomic-record-too-large' });
  });

  it('rejects a declared-only node projection when the selected scenario differs', () => {
    const { value, node, nodeBase } = baseResults();
    const result = {
      ...nodeBase,
      status: 'complete',
      authority: authorityProjection(value, [node.nodeId]),
      candidates: [{ ...node, evidence: 'declared' }],
      page: { collection: 'nodes', truncated: false },
    } as const;

    expect(() => parseAgentContextQueryResult(result)).not.toThrow();
    expect(() =>
      validateAgentContextQueryResult(value.dataset, result),
    ).toThrow(/candidate|selected owner|scenario|projection/u);
  });
});
