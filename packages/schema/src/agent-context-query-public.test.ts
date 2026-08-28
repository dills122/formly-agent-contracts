import { describe, expect, it } from 'vitest';

import * as publicApi from './index.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  canonicalStringify,
  canonicalizeAgentContextQueryResult,
  createAgentContextArtifactSet,
  createAgentContextExecutionAuthority,
  createAgentContextJourneyCatalog,
  createAgentContextPinnedLiveOwners,
  createAgentContextQueryCursor,
  createAgentContextQueryCursorBinding,
  createAgentContextSourceUsageCatalog,
  createAgentContextUsageSearchScopeLiveOwners,
  createFormContract,
  createSyntheticRh05AgentContextFixtureSet,
  executeAgentContextQuery,
  parseAgentContextDriverRegistryManifest,
  parseAgentContextQuery,
  parseAgentContextQueryCursor,
  parseAgentContextQueryResult,
  validateAgentContextQueryResult,
  type AgentContextArtifactReference,
  type AgentContextQueryDataset,
  type AgentContextQueryPaginationRuntime,
  type AgentContextQuerySelection,
  type AgentContextUsageSearchScope,
  type ContractEvidence,
  type ContractNode,
  type FormContract,
  type Sha256Digest,
} from './index.js';

const PAGINATION: AgentContextQueryPaginationRuntime = {
  now: 1_000,
  ttlMs: 100,
  signingMaterial: '0123456789abcdef0123456789abcdef',
};

function compareReference(
  left: AgentContextArtifactReference,
  right: AgentContextArtifactReference
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
  contentHash: string
): AgentContextArtifactReference {
  const reference = artifacts.find(
    (candidate) =>
      candidate.schemaId === schemaId &&
      candidate.schemaVersion === schemaVersion &&
      candidate.contentHash === contentHash
  );
  if (reference === undefined) {
    throw new Error(`missing reference ${schemaId} ${contentHash}`);
  }
  return reference;
}

function referenceFor(
  schemaId: string,
  schemaVersion: string,
  contentHash: string
): AgentContextArtifactReference {
  return {
    schemaId,
    schemaVersion,
    contentHash: contentHash as Sha256Digest,
  };
}

function boundary() {
  const fixture = createSyntheticRh05AgentContextFixtureSet();
  const sourceUsageCatalog = exactReference(
    fixture.artifactSet.artifacts,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    fixture.sourceUsageCatalog.contentHash
  );
  const journeyCatalog = exactReference(
    fixture.artifactSet.artifacts,
    AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
    AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    fixture.journeyCatalog.contentHash
  );
  const formContracts = Object.values(fixture.walkthroughs)
    .flatMap(({ declaredContract, resolvedContract }) => [
      declaredContract,
      resolvedContract,
    ])
    .map((artifact) => ({
      reference: exactReference(
        fixture.artifactSet.artifacts,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        artifact.contentHash
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
        artifact.contentHash
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
  const selections = Object.values(fixture.walkthroughs)
    .map((walkthrough): AgentContextQuerySelection => {
      const usage = fixture.sourceUsageCatalog.usages.find(
        ({ identity }) =>
          canonicalStringify(identity) === canonicalStringify(walkthrough.usage)
      );
      if (usage?.resolution.status !== 'exact') {
        throw new Error('walkthrough usage must resolve exactly');
      }
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
            walkthrough.declaredContract.contentHash
          ),
          scenarioArtifact: exactReference(
            fixture.artifactSet.artifacts,
            FORM_CONTRACT_SCHEMA_ID,
            FORM_CONTRACT_SCHEMA_VERSION,
            walkthrough.resolvedContract.contentHash
          ),
          executionAuthority: exactReference(
            fixture.artifactSet.artifacts,
            AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
            AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
            walkthrough.executionAuthority.contentHash
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
    })
    .sort((left, right) =>
      canonicalStringify(left).localeCompare(canonicalStringify(right))
    );
  const scope: AgentContextUsageSearchScope = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: selections[0]!.artifactSet,
    workspaceIndex: fixture.workspaceIndex,
    sourceUsageCatalogs: [sourceUsageCatalog],
  };
  return { fixture, dataset, selections, scope };
}

function selectionFor(
  value: ReturnType<typeof boundary>,
  polarity: 'negative' | 'positive'
): AgentContextQuerySelection {
  const usageId = value.fixture.walkthroughs[polarity].usage.usageId;
  const selection = value.selections.find(
    ({ usage }) => usage.usageId === usageId
  );
  if (selection === undefined) throw new Error(`missing ${polarity} selection`);
  return selection;
}

function withoutContentHash(
  contract: FormContract
): Omit<FormContract, 'contentHash'> {
  const { contentHash, ...draft } = contract;
  void contentHash;
  return draft;
}

function scaleNode(index: number, evidence: ContractEvidence): ContractNode {
  const suffix = index.toString().padStart(3, '0');
  return {
    id: `synthetic.ctx1.scale-form::path:s_field_${suffix}`,
    kind: 'control',
    modelPath: [`field_${suffix}`],
    formlyType: 'synthetic-scale-input',
    semanticType: 'text',
    evidence,
    presentation: {
      label: `Synthetic scale field ${suffix}`,
      description: `synthetic-scale-metadata-${suffix}-${'x'.repeat(512)}`,
    },
    wrappers: [],
    constraints: [],
    options: [],
    conditions: [],
    dynamicRules: [],
    locators: [],
    children: [],
  };
}

function scaleBoundary() {
  const value = boundary();
  const walkthrough = value.fixture.walkthroughs.positive;
  const oldSelection = selectionFor(value, 'positive');
  const declaredContract = createFormContract({
    ...withoutContentHash(walkthrough.declaredContract),
    nodes: Array.from({ length: 512 }, (_, index) =>
      scaleNode(index, 'declared')
    ),
  });
  const resolvedContract = createFormContract({
    ...withoutContentHash(walkthrough.resolvedContract),
    nodes: Array.from({ length: 512 }, (_, index) =>
      scaleNode(index, 'resolved')
    ),
  });
  const sourceUsageCatalog = createAgentContextSourceUsageCatalog({
    schemaVersion: value.fixture.sourceUsageCatalog.schemaVersion,
    workspaceIndex: value.fixture.sourceUsageCatalog.workspaceIndex,
    coverage: value.fixture.sourceUsageCatalog.coverage,
    usages: value.fixture.sourceUsageCatalog.usages.map((usage) =>
      usage.identity.kind !== 'declared' ||
      usage.identity.usageId !== walkthrough.usage.usageId ||
      usage.resolution.status !== 'exact'
        ? usage
        : {
            ...usage,
            resolution: {
              ...usage.resolution,
              candidate: {
                ...usage.resolution.candidate,
                form: {
                  ...usage.resolution.candidate.form,
                  contractHash: declaredContract.contentHash as Sha256Digest,
                },
              },
            },
          }
    ),
  });
  const journeyCatalog = createAgentContextJourneyCatalog({
    schemaVersion: value.fixture.journeyCatalog.schemaVersion,
    workspaceIndex: value.fixture.journeyCatalog.workspaceIndex,
    journeys: value.fixture.journeyCatalog.journeys.map((journey) =>
      journey.id !== walkthrough.journey.id
        ? journey
        : {
            ...journey,
            steps: journey.steps.map((step) => ({
              ...step,
              forms: step.forms.map((form) => ({
                ...form,
                contractHash: declaredContract.contentHash as Sha256Digest,
              })),
            })),
          }
    ),
  });
  const basis = {
    formId: declaredContract.formId,
    contractHash: declaredContract.contentHash as Sha256Digest,
  };
  const authority = walkthrough.executionAuthority;
  const executionAuthority = createAgentContextExecutionAuthority({
    schemaVersion: authority.schemaVersion,
    basis,
    scenario: {
      ...authority.scenario,
      basis,
      artifactHash: resolvedContract.contentHash as Sha256Digest,
    },
    physicalOperations: [],
    readiness: [],
    interactions: [],
    commits: [],
    validationSurfaces: [],
    valueAssertions: [],
    stateAssertions: [],
    usage: {
      ...authority.usage,
      basis,
      steps: authority.usage.steps.map((step) => ({
        ...step,
        nodeIds: resolvedContract.nodes.map(({ id }) => id),
      })),
    },
    repeaterCaptures: [],
  });

  const sourceReference = referenceFor(
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    sourceUsageCatalog.contentHash
  );
  const journeyReference = referenceFor(
    AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
    AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    journeyCatalog.contentHash
  );
  const declaredReference = referenceFor(
    FORM_CONTRACT_SCHEMA_ID,
    FORM_CONTRACT_SCHEMA_VERSION,
    declaredContract.contentHash
  );
  const resolvedReference = referenceFor(
    FORM_CONTRACT_SCHEMA_ID,
    FORM_CONTRACT_SCHEMA_VERSION,
    resolvedContract.contentHash
  );
  const authorityReference = referenceFor(
    AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
    AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    executionAuthority.contentHash
  );
  const replacedReferences = new Set([
    oldSelection.owners.sourceUsageCatalog.contentHash,
    oldSelection.owners.journeyCatalog.contentHash,
    oldSelection.owners.formContract.contentHash,
    oldSelection.owners.scenarioArtifact.contentHash,
    oldSelection.owners.executionAuthority.contentHash,
  ]);
  const artifactSet = createAgentContextArtifactSet({
    schemaVersion: value.fixture.artifactSet.schemaVersion,
    repositoryRevision: value.fixture.artifactSet.repositoryRevision,
    workspaceIndex: value.fixture.artifactSet.workspaceIndex,
    artifacts: [
      ...value.fixture.artifactSet.artifacts.filter(
        ({ contentHash }) => !replacedReferences.has(contentHash)
      ),
      sourceReference,
      journeyReference,
      declaredReference,
      resolvedReference,
      authorityReference,
    ],
  });
  const dataset: AgentContextQueryDataset = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet,
    sourceUsageCatalogs: [
      { reference: sourceReference, artifact: sourceUsageCatalog },
    ],
    journeyCatalogs: [
      { reference: journeyReference, artifact: journeyCatalog },
    ],
    formContracts: value.dataset.formContracts
      .filter(
        ({ reference }) =>
          reference.contentHash !==
            oldSelection.owners.formContract.contentHash &&
          reference.contentHash !==
            oldSelection.owners.scenarioArtifact.contentHash
      )
      .concat([
        { reference: declaredReference, artifact: declaredContract },
        { reference: resolvedReference, artifact: resolvedContract },
      ])
      .sort((left, right) => compareReference(left.reference, right.reference)),
    executionAuthorities: value.dataset.executionAuthorities
      .filter(
        ({ reference }) =>
          reference.contentHash !==
          oldSelection.owners.executionAuthority.contentHash
      )
      .concat([{ reference: authorityReference, artifact: executionAuthority }])
      .sort((left, right) => compareReference(left.reference, right.reference)),
  };
  const selection: AgentContextQuerySelection = {
    ...oldSelection,
    artifactSet: {
      schemaVersion: artifactSet.schemaVersion,
      contentHash: artifactSet.contentHash,
    },
    owners: {
      sourceUsageCatalog: sourceReference,
      journeyCatalog: journeyReference,
      formContract: declaredReference,
      scenarioArtifact: resolvedReference,
      executionAuthority: authorityReference,
    },
    form: {
      ...oldSelection.form,
      contractHash: declaredContract.contentHash as Sha256Digest,
    },
    scenario: executionAuthority.scenario,
    executionAuthority: {
      ...oldSelection.executionAuthority,
      basis,
    },
  };
  const scope: AgentContextUsageSearchScope = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: selection.artifactSet,
    workspaceIndex: artifactSet.workspaceIndex,
    sourceUsageCatalogs: [sourceReference],
  };
  return { dataset, selection, scope, resolvedContract };
}

function bytes(input: unknown): number {
  return Buffer.byteLength(canonicalStringify(input), 'utf8');
}

describe('public agent-context query API', () => {
  it('preserves the existing driver-registry barrel surface', () => {
    expect(parseAgentContextDriverRegistryManifest).toBeTypeOf('function');
    expect(publicApi).not.toHaveProperty(
      'validateAgentContextUsageSearchScopeAgainstParsedDataset',
    );
    expect(publicApi).not.toHaveProperty(
      'validateAgentContextQuerySelectionAgainstParsedDataset',
    );
    expect(publicApi).not.toHaveProperty(
      'validateAgentContextQueryResultAgainstParsedDataset',
    );
    expect(publicApi).not.toHaveProperty(
      'resolveAgentContextE2eSliceAgainstParsedDataset',
    );
    expect(publicApi).not.toHaveProperty(
      'classifyAgentContextE2eSliceOverflow',
    );
    expect(publicApi).not.toHaveProperty(
      'classifyAgentContextJourneyOverflow',
    );
    expect(publicApi).not.toHaveProperty(
      'AGENT_CONTEXT_QUERY_MAX_ATOMIC_RECORD_GRAPH_NODES',
    );
    expect(publicApi).not.toHaveProperty(
      'AGENT_CONTEXT_QUERY_MAX_ATOMIC_VIEW_GRAPH_NODES',
    );
  });

  it('executes and validates both exact CTX-0D walkthroughs through only the package barrel', () => {
    const value = boundary();
    for (const polarity of ['positive', 'negative'] as const) {
      const walkthrough = value.fixture.walkthroughs[polarity];
      const selection = selectionFor(value, polarity);
      const query = parseAgentContextQuery({
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-e2e-slice',
        selection,
        withinStepId: walkthrough.stepId,
        nodeIds: [...walkthrough.focusNodeIds].sort(),
        goal: polarity,
        includeOutgoingEffects: false,
      });
      const result = parseAgentContextQueryResult(
        executeAgentContextQuery(value.dataset, query, {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: createAgentContextPinnedLiveOwners(selection),
        })
      );
      expect(validateAgentContextQueryResult(value.dataset, result)).toEqual(
        result
      );
      expect(result).toMatchObject({
        operation: 'get-e2e-slice',
        status: 'complete',
        freshness: 'current',
        request: {
          withinStepId: walkthrough.stepId,
          nodeIds: [...walkthrough.focusNodeIds].sort(),
          goal: polarity,
          includeOutgoingEffects: false,
        },
      });
      if (
        result.operation !== 'get-e2e-slice' ||
        result.status !== 'complete'
      ) {
        throw new Error('expected complete public walkthrough slice');
      }
      expect(
        result.slice.closureNodes.items.map(({ nodeId }) => nodeId)
      ).toEqual([...walkthrough.expectedNodeIds].sort());
      const canonicalResult = canonicalizeAgentContextQueryResult(result);
      expect(parseAgentContextQueryResult(JSON.parse(canonicalResult))).toEqual(
        result
      );
    }
  });

  it('keeps a 512-node contract out of the progressive consumer payload', () => {
    const value = scaleBoundary();
    const searchQuery = parseAgentContextQuery({
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      scope: value.scope,
      filters: { usageId: value.selection.usage.usageId },
      page: { collection: 'candidates', limit: 2 },
    });
    const searchResult = executeAgentContextQuery(
      value.dataset,
      searchQuery,
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextUsageSearchScopeLiveOwners(value.scope),
      },
      PAGINATION
    );
    if (
      searchResult.operation !== 'search-form-usages' ||
      searchResult.status !== 'complete'
    ) {
      throw new Error('expected one exact public usage candidate');
    }
    const selection = searchResult.candidates[0]?.selectionHandoffs.items[0];
    expect(selection).toEqual(value.selection);
    if (selection === undefined) {
      throw new Error('expected a complete pinned public selection handoff');
    }
    const summaryQuery = parseAgentContextQuery({
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      selection,
      view: 'summary',
      page: { collection: 'steps', limit: 2 },
    });
    const live = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      owners: createAgentContextPinnedLiveOwners(selection),
    } as const;
    const summaryResult = executeAgentContextQuery(
      value.dataset,
      summaryQuery,
      live,
      PAGINATION
    );
    const firstNodeQuery = parseAgentContextQuery({
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      selection,
      filters: {},
      include: [],
      page: { collection: 'nodes', limit: 2 },
    });
    const firstNodeResult = executeAgentContextQuery(
      value.dataset,
      firstNodeQuery,
      live,
      PAGINATION
    );
    if (
      firstNodeResult.operation !== 'find-form-nodes' ||
      firstNodeResult.status !== 'ambiguous' ||
      !firstNodeResult.page.truncated
    ) {
      throw new Error('expected truncated ambiguous first node page');
    }
    expect(
      createAgentContextQueryCursorBinding(firstNodeQuery, 'nodes')
    ).toMatchObject({
      collection: 'nodes',
      sortOrder: 'node-id',
      disclosure: 'nodes',
      include: [],
    });
    expect(
      createAgentContextQueryCursor({
        collection: 'nodes',
        query: firstNodeQuery,
        position: 2,
        ...PAGINATION,
      })
    ).toBe(firstNodeResult.page.nextCursor);
    expect(
      parseAgentContextQueryCursor({
        cursor: firstNodeResult.page.nextCursor,
        collection: 'nodes',
        query: firstNodeQuery,
        now: PAGINATION.now,
        signingMaterial: PAGINATION.signingMaterial,
      })
    ).toEqual({ position: 2 });
    const secondNodeQuery = parseAgentContextQuery({
      ...firstNodeQuery,
      page: {
        collection: 'nodes',
        limit: 2,
        cursor: firstNodeResult.page.nextCursor,
      },
    });
    const secondNodeResult = executeAgentContextQuery(
      value.dataset,
      secondNodeQuery,
      live,
      PAGINATION
    );
    if (
      secondNodeResult.operation !== 'find-form-nodes' ||
      secondNodeResult.status !== 'ambiguous' ||
      !secondNodeResult.page.truncated
    ) {
      throw new Error('expected truncated ambiguous second node page');
    }

    expect(firstNodeResult.reason.totalMatches).toBe(512);
    expect(secondNodeResult.reason.totalMatches).toBe(512);
    const firstNodeIds = firstNodeResult.candidates.map(({ nodeId }) => nodeId);
    const secondNodeIds = secondNodeResult.candidates.map(
      ({ nodeId }) => nodeId
    );
    expect(firstNodeIds).toHaveLength(2);
    expect(secondNodeIds).toHaveLength(2);
    expect(firstNodeIds).not.toEqual(secondNodeIds);
    expect(
      firstNodeIds.every((nodeId) => !secondNodeIds.includes(nodeId))
    ).toBe(true);

    const baselineBytes = bytes(value.resolvedContract);
    const progressiveResults = [
      searchResult,
      summaryResult,
      firstNodeResult,
      secondNodeResult,
    ];
    const progressiveBytes = progressiveResults.reduce(
      (total, result) => total + bytes(result),
      0
    );
    const serializedProgressiveResults = progressiveResults
      .map((result) => canonicalizeAgentContextQueryResult(result))
      .join('\n');

    expect(baselineBytes).toBeGreaterThanOrEqual(256 * 1_024);
    expect(progressiveBytes * 4).toBeLessThanOrEqual(baselineBytes);
    expect(serializedProgressiveResults).not.toContain(
      'synthetic-scale-metadata-511'
    );

    expect(
      executeAgentContextQuery(
        value.dataset,
        searchQuery,
        {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: createAgentContextUsageSearchScopeLiveOwners(value.scope),
        },
        PAGINATION
      )
    ).toEqual(searchResult);
    expect(
      executeAgentContextQuery(value.dataset, summaryQuery, live, PAGINATION)
    ).toEqual(summaryResult);
    expect(
      executeAgentContextQuery(value.dataset, firstNodeQuery, live, PAGINATION)
    ).toEqual(firstNodeResult);
    expect(
      executeAgentContextQuery(value.dataset, secondNodeQuery, live, PAGINATION)
    ).toEqual(secondNodeResult);
  });
});
