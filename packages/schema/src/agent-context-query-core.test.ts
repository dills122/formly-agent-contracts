import { describe, expect, it } from 'vitest';

import {
  createAgentContextArtifactSet,
  type AgentContextArtifactReference,
} from './agent-context-artifacts.js';
import { createAgentContextQueryCursor } from './agent-context-query-cursor.js';
import {
  executeAgentContextQuery,
  type AgentContextQueryPaginationRuntime,
} from './agent-context-query-core.js';
import {
  AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE,
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  createAgentContextPinnedLiveOwners,
  createAgentContextUsageSearchScopeLiveOwners,
  type AgentContextQueryDataset,
  type AgentContextQuerySelection,
  type AgentContextSearchUsageFilters,
  type AgentContextUsageSearchScope,
  type SearchFormUsagesQuery,
} from './agent-context-query.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  createAgentContextExecutionAuthority,
  type AgentContextExecutionAuthorityDraft,
} from './agent-context-execution-authority.js';
import {
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  createAgentContextJourneyCatalog,
  createAgentContextSourceUsageCatalog,
  type AgentContextJourneyCatalogDraft,
  type AgentContextSourceUsageCatalog,
} from './agent-context-usage.js';
import { createSyntheticRh05AgentContextFixtureSet } from './agent-context-walkthrough-fixtures.js';
import { canonicalStringify, createFormContract } from './canonical-json.js';
import {
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractNode,
  type FormContract,
} from './contract.js';

const PAGINATION: AgentContextQueryPaginationRuntime = {
  now: 1_000,
  ttlMs: 100,
  signingMaterial: '0123456789abcdef0123456789abcdef',
};

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
  if (reference === undefined)
    throw new Error(`missing reference ${contentHash}`);
  return reference;
}

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

function flattenNodes(nodes: readonly ContractNode[]): readonly ContractNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenNodes(node.children),
    ...(node.arrayTemplate === undefined
      ? []
      : flattenNodes([node.arrayTemplate])),
  ]);
}

function boundary() {
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
  const selections = Object.values(fixture.walkthroughs)
    .map((walkthrough): AgentContextQuerySelection => {
      const usage = fixture.sourceUsageCatalog.usages.find(
        ({ identity }) =>
          canonicalStringify(identity) ===
          canonicalStringify(walkthrough.usage),
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
    })
    .sort((left, right) =>
      canonicalStringify(left).localeCompare(canonicalStringify(right)),
    );
  const scope: AgentContextUsageSearchScope = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: selections[0]!.artifactSet,
    workspaceIndex: fixture.workspaceIndex,
    sourceUsageCatalogs: [sourceUsageCatalog],
  };
  const searchLive = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    owners: createAgentContextUsageSearchScopeLiveOwners(scope),
  } as const;
  const selectedLive = (selection: AgentContextQuerySelection) => ({
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    owners: createAgentContextPinnedLiveOwners(selection),
  });
  return {
    fixture,
    dataset,
    selections,
    scope,
    searchLive,
    selectedLive,
  };
}

function searchQuery(
  scope: AgentContextUsageSearchScope,
  filters: AgentContextSearchUsageFilters = {},
  limit = 200,
  cursor?: string,
): SearchFormUsagesQuery {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'search-form-usages',
    scope,
    filters,
    page: {
      collection: 'candidates',
      limit,
      ...(cursor === undefined ? {} : { cursor }),
    },
  };
}

function scopeFor(
  dataset: AgentContextQueryDataset,
): AgentContextUsageSearchScope {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: {
      schemaVersion: dataset.artifactSet.schemaVersion,
      contentHash: dataset.artifactSet.contentHash,
    },
    workspaceIndex: dataset.artifactSet.workspaceIndex,
    sourceUsageCatalogs: dataset.sourceUsageCatalogs.map(
      ({ reference }) => reference,
    ),
  };
}

function replacePrimarySourceCatalog(
  dataset: AgentContextQueryDataset,
  artifact: AgentContextSourceUsageCatalog,
): AgentContextQueryDataset {
  const primary = dataset.sourceUsageCatalogs[0];
  if (primary === undefined) throw new Error('missing primary source catalog');
  const reference: AgentContextArtifactReference = {
    ...primary.reference,
    contentHash: artifact.contentHash,
  };
  const artifactSet = createAgentContextArtifactSet({
    schemaVersion: dataset.artifactSet.schemaVersion,
    repositoryRevision: dataset.artifactSet.repositoryRevision,
    workspaceIndex: dataset.artifactSet.workspaceIndex,
    artifacts: dataset.artifactSet.artifacts.map((candidate) =>
      compareReference(candidate, primary.reference) === 0
        ? reference
        : candidate,
    ),
  });
  return {
    ...dataset,
    artifactSet,
    sourceUsageCatalogs: dataset.sourceUsageCatalogs
      .map((owner) =>
        compareReference(owner.reference, primary.reference) === 0
          ? { reference, artifact }
          : owner,
      )
      .sort((left, right) => compareReference(left.reference, right.reference)),
  };
}

function addSourceCatalog(
  dataset: AgentContextQueryDataset,
  artifact: AgentContextSourceUsageCatalog,
): AgentContextQueryDataset {
  const reference: AgentContextArtifactReference = {
    schemaId: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    contentHash: artifact.contentHash,
  };
  const artifactSet = createAgentContextArtifactSet({
    schemaVersion: dataset.artifactSet.schemaVersion,
    repositoryRevision: dataset.artifactSet.repositoryRevision,
    workspaceIndex: dataset.artifactSet.workspaceIndex,
    artifacts: [...dataset.artifactSet.artifacts, reference],
  });
  return {
    ...dataset,
    artifactSet,
    sourceUsageCatalogs: [
      ...dataset.sourceUsageCatalogs,
      { reference, artifact },
    ].sort((left, right) => compareReference(left.reference, right.reference)),
  };
}

function searchLive(scope: AgentContextUsageSearchScope) {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    owners: createAgentContextUsageSearchScopeLiveOwners(scope),
  } as const;
}

function repinJourneyCatalog(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  mutate: (
    draft: AgentContextJourneyCatalogDraft,
  ) => AgentContextJourneyCatalogDraft,
) {
  const owner = dataset.journeyCatalogs.find(
    ({ reference }) =>
      reference.contentHash === selection.owners.journeyCatalog.contentHash,
  );
  if (owner === undefined) throw new Error('missing journey owner');
  const artifact = createAgentContextJourneyCatalog(
    mutate({
      schemaVersion: owner.artifact.schemaVersion,
      workspaceIndex: owner.artifact.workspaceIndex,
      journeys: owner.artifact.journeys,
    }),
  );
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
    dataset: {
      ...dataset,
      artifactSet,
      journeyCatalogs: dataset.journeyCatalogs
        .map((candidate) =>
          compareReference(candidate.reference, owner.reference) === 0
            ? { reference, artifact }
            : candidate,
        )
        .sort((left, right) =>
          compareReference(left.reference, right.reference),
        ),
    },
    selection: {
      ...selection,
      artifactSet: {
        schemaVersion: artifactSet.schemaVersion,
        contentHash: artifactSet.contentHash,
      },
      owners: { ...selection.owners, journeyCatalog: reference },
    },
  };
}

function repinExecutionAuthority(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  mutate: (
    draft: AgentContextExecutionAuthorityDraft,
  ) => AgentContextExecutionAuthorityDraft,
) {
  const owner = dataset.executionAuthorities.find(
    ({ reference }) =>
      reference.contentHash === selection.owners.executionAuthority.contentHash,
  );
  if (owner === undefined) throw new Error('missing authority owner');
  const authority = owner.artifact;
  const artifact = createAgentContextExecutionAuthority(
    mutate({
      schemaVersion: authority.schemaVersion,
      basis: authority.basis,
      scenario: authority.scenario,
      physicalOperations: authority.physicalOperations,
      readiness: authority.readiness,
      interactions: authority.interactions,
      commits: authority.commits,
      validationSurfaces: authority.validationSurfaces,
      valueAssertions: authority.valueAssertions,
      stateAssertions: authority.stateAssertions,
      usage: authority.usage,
      repeaterCaptures: authority.repeaterCaptures,
    }),
  );
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
    },
    selection: {
      ...selection,
      artifactSet: {
        schemaVersion: artifactSet.schemaVersion,
        contentHash: artifactSet.contentHash,
      },
      owners: { ...selection.owners, executionAuthority: reference },
    },
  };
}

function repinScenarioArtifact(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  artifact: FormContract,
) {
  const owner = dataset.formContracts.find(
    ({ reference }) =>
      reference.contentHash === selection.owners.scenarioArtifact.contentHash,
  );
  if (owner === undefined) throw new Error('missing scenario owner');
  const reference: AgentContextArtifactReference = {
    ...owner.reference,
    contentHash:
      artifact.contentHash as AgentContextArtifactReference['contentHash'],
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
    dataset: {
      ...dataset,
      artifactSet,
      formContracts: dataset.formContracts
        .map((candidate) =>
          compareReference(candidate.reference, owner.reference) === 0
            ? { reference, artifact }
            : candidate,
        )
        .sort((left, right) =>
          compareReference(left.reference, right.reference),
        ),
    },
    selection: {
      ...selection,
      artifactSet: {
        schemaVersion: artifactSet.schemaVersion,
        contentHash: artifactSet.contentHash,
      },
      owners: { ...selection.owners, scenarioArtifact: reference },
      scenario: {
        ...selection.scenario,
        artifactHash: reference.contentHash,
      },
    },
  };
}

function threeStepBoundary() {
  const value = boundary();
  const selection = value.selections.find(
    ({ usage }) =>
      usage.usageId === value.fixture.walkthroughs.positive.usage.usageId,
  );
  if (selection === undefined) throw new Error('missing positive selection');
  const stepId = value.fixture.walkthroughs.positive.stepId;
  const stepIds = [stepId, `${stepId}.two`, `${stepId}.three`] as const;
  const journeyRepin = repinJourneyCatalog(
    value.dataset,
    selection,
    (draft) => ({
      ...draft,
      journeys: draft.journeys.map((journey) =>
        journey.id === selection.journey.id &&
        journey.version === selection.journey.version
          ? {
              ...journey,
              steps: stepIds.map((id, index) => ({
                id,
                ordinal: index + 1,
                label: `Synthetic step ${String(index + 1)}`,
                forms: [selection.form],
                usages: [selection.usage],
                actionIds: [],
              })),
            }
          : journey,
      ),
    }),
  );
  const authorityRepin = repinExecutionAuthority(
    journeyRepin.dataset,
    journeyRepin.selection,
    (draft) => {
      const nodeIds = draft.usage.steps.flatMap((step) => step.nodeIds);
      if (nodeIds.length !== 3) throw new Error('fixture needs three nodes');
      const stepByNodeId = new Map(
        nodeIds.map((nodeId, index) => [nodeId, stepIds[index]!] as const),
      );
      return {
        ...draft,
        interactions: draft.interactions.map((interaction) => ({
          ...interaction,
          stepId: stepByNodeId.get(interaction.nodeId)!,
        })),
        repeaterCaptures: draft.repeaterCaptures.map((capture) => ({
          ...capture,
          stepId: stepByNodeId.get(capture.repeaterNodeId)!,
        })),
        usage: {
          ...draft.usage,
          steps: stepIds.map((id, index) => ({
            id,
            ordinal: index + 1,
            nodeIds: [nodeIds[index]!],
            actionIds: [],
          })),
        },
      };
    },
  );
  return { ...authorityRepin, stepIds };
}

function journeyWithEmptyStepBoundary() {
  const value = threeStepBoundary();
  const emptyStepId = `${value.stepIds[2]}.empty`;
  const journeyRepin = repinJourneyCatalog(
    value.dataset,
    value.selection,
    (draft) => ({
      ...draft,
      journeys: draft.journeys.map((journey) =>
        journey.id === value.selection.journey.id &&
        journey.version === value.selection.journey.version
          ? {
              ...journey,
              steps: [
                ...journey.steps,
                {
                  id: emptyStepId,
                  ordinal: 4,
                  label: 'Synthetic empty step',
                  forms: [value.selection.form],
                  usages: [value.selection.usage],
                  actionIds: [],
                },
              ],
            }
          : journey,
      ),
    }),
  );
  const authorityRepin = repinExecutionAuthority(
    journeyRepin.dataset,
    journeyRepin.selection,
    (draft) => ({
      ...draft,
      usage: {
        ...draft.usage,
        steps: [
          ...draft.usage.steps,
          { id: emptyStepId, ordinal: 4, nodeIds: [], actionIds: [] },
        ],
      },
    }),
  );
  return { ...authorityRepin, emptyStepId };
}

describe('agent-context pure query core', () => {
  it('pages ambiguity by total unpaged matches with deterministic continuations', () => {
    const value = boundary();
    const query = searchQuery(value.scope, {}, 1);
    const first = executeAgentContextQuery(
      value.dataset,
      query,
      value.searchLive,
      PAGINATION,
    );
    const repeated = executeAgentContextQuery(
      value.dataset,
      query,
      value.searchLive,
      PAGINATION,
    );
    expect(first).toEqual(repeated);
    expect(first).toMatchObject({
      operation: 'search-form-usages',
      status: 'ambiguous',
      freshness: 'current',
      reason: { kind: 'usage-ambiguous', totalMatches: 2 },
      page: { collection: 'candidates', truncated: true },
    });
    if (
      first.operation !== 'search-form-usages' ||
      first.status !== 'ambiguous'
    ) {
      throw new Error('expected search ambiguity');
    }
    expect(first.candidates).toHaveLength(1);
    expect(first.reason.usages).toEqual(
      first.candidates.map(({ sourceUsageCatalog, usage }) => ({
        sourceUsageCatalog,
        usage,
      })),
    );
    if (!first.page.truncated) throw new Error('expected continuation');

    const second = executeAgentContextQuery(
      value.dataset,
      searchQuery(value.scope, {}, 1, first.page.nextCursor),
      value.searchLive,
      PAGINATION,
    );
    expect(second).toMatchObject({
      operation: 'search-form-usages',
      status: 'ambiguous',
      reason: { kind: 'usage-ambiguous', totalMatches: 2 },
      page: { collection: 'candidates', truncated: false },
    });
    if (
      second.operation !== 'search-form-usages' ||
      second.status !== 'ambiguous'
    ) {
      throw new Error('expected continued ambiguity');
    }
    expect(second.candidates).toHaveLength(1);
    expect(second.candidates[0]).not.toEqual(first.candidates[0]);
  });

  it('matches exact and substring filters with AND semantics and exact handoffs', () => {
    const value = boundary();
    const positive = value.fixture.walkthroughs.positive;
    const node = flattenNodes(positive.resolvedContract.nodes).find(
      (candidate) => (candidate.presentation?.label?.trim().length ?? 0) > 0,
    );
    if (node?.presentation?.label === undefined) {
      throw new Error('fixture needs a presented node');
    }
    const label = node.presentation.label.trim();
    const labelSubstring = label.includes('supplier') ? 'supplier' : label;
    const filters: readonly AgentContextSearchUsageFilters[] = [
      { text: positive.usage.usageId.slice(10, 30) },
      { usageId: positive.usage.usageId },
      { formId: positive.declaredContract.formId },
      { stepId: positive.stepId },
      { modelPath: node.modelPath },
      { label: labelSubstring },
      { scenarioId: positive.executionAuthority.scenario.id },
      { capabilities: ['assert-value'] },
      { capabilities: ['assert-value', 'fill'] },
      {
        usageId: positive.usage.usageId,
        formId: positive.declaredContract.formId,
        modelPath: node.modelPath,
        label,
        scenarioId: positive.executionAuthority.scenario.id,
      },
    ];

    for (const filter of filters) {
      const result = executeAgentContextQuery(
        value.dataset,
        searchQuery(value.scope, filter),
        value.searchLive,
        PAGINATION,
      );
      expect(result.operation).toBe('search-form-usages');
      expect(result.freshness).toBe('current');
      expect(result.status, canonicalStringify(filter)).toBe('complete');
      if (
        result.operation !== 'search-form-usages' ||
        result.status !== 'complete'
      ) {
        throw new Error('expected one usage match');
      }
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]!.selectionHandoffs.items).toHaveLength(1);
      expect(result.candidates[0]!.matchReasons.items).toEqual(
        Object.keys(filter).sort(),
      );
    }
  });

  it('keeps multi-catalog candidates distinct and canonically owner-ordered', () => {
    const value = boundary();
    const primary = value.dataset.sourceUsageCatalogs[0]!.artifact;
    if (primary.coverage.status !== 'incomplete') {
      throw new Error('fixture coverage must be incomplete');
    }
    const secondCatalog = createAgentContextSourceUsageCatalog({
      schemaVersion: primary.schemaVersion,
      workspaceIndex: primary.workspaceIndex,
      coverage: {
        ...primary.coverage,
        reasons: [...primary.coverage.reasons, 'synthetic-second-catalog'],
      },
      usages: primary.usages,
    });
    const dataset = addSourceCatalog(value.dataset, secondCatalog);
    const scope = scopeFor(dataset);
    const usageId = value.fixture.walkthroughs.positive.usage.usageId;
    const result = executeAgentContextQuery(
      dataset,
      searchQuery(scope, { usageId }),
      searchLive(scope),
      PAGINATION,
    );
    expect(result).toMatchObject({
      operation: 'search-form-usages',
      status: 'ambiguous',
      reason: { kind: 'usage-ambiguous', totalMatches: 2 },
    });
    if (
      result.operation !== 'search-form-usages' ||
      result.status !== 'ambiguous'
    ) {
      throw new Error('expected cross-catalog ambiguity');
    }
    expect(result.candidates).toHaveLength(2);
    expect(
      result.candidates.map(({ sourceUsageCatalog }) => sourceUsageCatalog),
    ).toEqual([...scope.sourceUsageCatalogs].sort(compareReference));
    expect(
      new Set(
        result.candidates.map(
          ({ sourceUsageCatalog }) => sourceUsageCatalog.contentHash,
        ),
      ).size,
    ).toBe(2);
    expect(
      result.candidates.every(
        ({ selectionHandoffs }) => selectionHandoffs.items.length === 1,
      ),
    ).toBe(true);
  });

  it('surfaces exact forms with empty handoffs and preserves absence authority', () => {
    const value = boundary();
    const primary = value.dataset.sourceUsageCatalogs[0]!.artifact;
    const source = primary.usages[0]!;
    if (source.resolution.status !== 'exact') {
      throw new Error('fixture usage must resolve exactly');
    }
    const unavailableUsageId = 'synthetic.zzz.exact-without-handoff';
    const unavailableUsage = {
      ...source,
      identity: {
        kind: 'declared' as const,
        usageId: unavailableUsageId,
        version: 1,
      },
      invocation: {
        ...source.invocation,
        location: {
          kind: 'opaque' as const,
          fileId: 'synthetic.exact-without-handoff.source',
        },
        symbol: {
          ...source.invocation.symbol,
          id: 'synthetic.exact-without-handoff.symbol',
        },
      },
      contexts: [],
      evidenceRefs: ['synthetic:exact-without-handoff'],
    };
    const catalog = createAgentContextSourceUsageCatalog({
      schemaVersion: primary.schemaVersion,
      workspaceIndex: primary.workspaceIndex,
      coverage: {
        status: 'complete',
        scope: primary.coverage.scope,
        evidenceRefs: ['synthetic:complete-coverage'],
      },
      usages: [...primary.usages, unavailableUsage],
    });
    const dataset = replacePrimarySourceCatalog(value.dataset, catalog);
    const scope = scopeFor(dataset);
    const exact = executeAgentContextQuery(
      dataset,
      searchQuery(scope, { usageId: unavailableUsageId }),
      searchLive(scope),
      PAGINATION,
    );
    expect(exact).toMatchObject({
      operation: 'search-form-usages',
      status: 'complete',
      candidates: [
        {
          form: source.resolution.candidate.form,
          selectionHandoffs: { complete: true, items: [] },
        },
      ],
    });

    const unavailableDownstream = executeAgentContextQuery(
      dataset,
      searchQuery(scope, {
        usageId: unavailableUsageId,
        scenarioId: value.selections[0]!.scenario.id,
      }),
      searchLive(scope),
      PAGINATION,
    );
    expect(unavailableDownstream).toMatchObject({
      operation: 'search-form-usages',
      status: 'not-found',
      reason: { kind: 'usage-absence-not-authoritative' },
    });

    const authoritative = executeAgentContextQuery(
      dataset,
      searchQuery(scope, { usageId: 'synthetic.definitely-missing' }),
      searchLive(scope),
      PAGINATION,
    );
    expect(authoritative).toMatchObject({
      operation: 'search-form-usages',
      status: 'not-found',
      reason: { kind: 'usage-absent-authoritative' },
    });

    const incomplete = executeAgentContextQuery(
      value.dataset,
      searchQuery(value.scope, { usageId: 'synthetic.definitely-missing' }),
      value.searchLive,
      PAGINATION,
    );
    expect(incomplete).toMatchObject({
      operation: 'search-form-usages',
      status: 'not-found',
      reason: { kind: 'usage-absence-not-authoritative' },
    });
  });

  it('matches exact source positions and routes while excluding hashes and evidence from text', () => {
    const value = boundary();
    const primary = value.dataset.sourceUsageCatalogs[0]!.artifact;
    const usageId = value.fixture.walkthroughs.positive.usage.usageId;
    const catalog = createAgentContextSourceUsageCatalog({
      schemaVersion: primary.schemaVersion,
      workspaceIndex: primary.workspaceIndex,
      coverage: primary.coverage,
      usages: primary.usages.map((usage) =>
        usage.identity.kind === 'declared' && usage.identity.usageId === usageId
          ? {
              ...usage,
              invocation: {
                ...usage.invocation,
                syntaxKind: 'construct' as const,
                syntaxToken: {
                  kind: 'ast-call-shape' as const,
                  version: 1 as const,
                  calleeForm: 'element-access' as const,
                  argumentCount: 1_013,
                  typeArgumentCount: 1_021,
                  optionalCall: false,
                },
                location: {
                  kind: 'path' as const,
                  pathMode: 'project-relative' as const,
                  path: 'apps/order/order.spec.ts',
                  span: {
                    start: { line: 7, column: 3 },
                    end: { line: 9_719, column: 9_727 },
                  },
                },
              },
            }
          : usage,
      ),
    });
    const dataset = replacePrimarySourceCatalog(value.dataset, catalog);
    const scope = scopeFor(dataset);
    const located = executeAgentContextQuery(
      dataset,
      searchQuery(scope, {
        sourcePath: 'apps/order/order.spec.ts',
        sourceLine: 7,
        sourceColumn: 3,
      }),
      searchLive(scope),
      PAGINATION,
    );
    expect(located).toMatchObject({
      operation: 'search-form-usages',
      status: 'complete',
      candidates: [
        {
          matchReasons: {
            complete: true,
            items: ['sourceColumn', 'sourceLine', 'sourcePath'],
          },
        },
      ],
    });
    for (const text of [
      'project-relative',
      '9719',
      '9727',
      'construct',
      'ast-call-shape',
      'element-access',
      '1013',
      '1021',
      'false',
    ]) {
      const match = executeAgentContextQuery(
        dataset,
        searchQuery(scope, { text }),
        searchLive(scope),
        PAGINATION,
      );
      if (
        match.operation !== 'search-form-usages' ||
        match.status === 'not-found' ||
        match.status === 'refused'
      ) {
        throw new Error(`expected invocation text match for ${text}`);
      }
      expect(
        match.candidates.some(
          ({ usage }) =>
            usage.kind === 'declared' && usage.usageId === usageId,
        ),
      ).toBe(true);
    }

    const routeId = value.fixture.sourceUsageCatalog.usages
      .flatMap(({ contexts }) => contexts)
      .find(({ kind }) => kind === 'route')?.id;
    if (routeId === undefined) throw new Error('fixture needs a route');
    expect(
      executeAgentContextQuery(
        value.dataset,
        searchQuery(value.scope, { routeId }),
        value.searchLive,
        PAGINATION,
      ),
    ).toMatchObject({ operation: 'search-form-usages', status: 'complete' });

    for (const text of [
      primary.usages[0]!.invocation.sourceFileHash,
      primary.usages[0]!.evidenceRefs[0]!,
    ]) {
      expect(
        executeAgentContextQuery(
          value.dataset,
          searchQuery(value.scope, { text }),
          value.searchLive,
          PAGINATION,
        ),
      ).toMatchObject({
        operation: 'search-form-usages',
        status: 'not-found',
      });
    }
  });

  it('rejects cursor replay, expiry, out-of-range positions, and unsafe pagination objects', () => {
    const value = boundary();
    const query = searchQuery(value.scope, {}, 1);
    const first = executeAgentContextQuery(
      value.dataset,
      query,
      value.searchLive,
      PAGINATION,
    );
    if (
      first.operation !== 'search-form-usages' ||
      first.status === 'refused' ||
      !first.page.truncated
    ) {
      throw new Error('expected continuation');
    }
    const nextCursor = first.page.nextCursor;
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        searchQuery(
          value.scope,
          { usageId: value.selections[0]!.usage.usageId },
          1,
          nextCursor,
        ),
        value.searchLive,
        PAGINATION,
      ),
    ).toThrow(/cursor|invalid/u);
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        searchQuery(value.scope, {}, 1, nextCursor),
        value.searchLive,
        { ...PAGINATION, now: PAGINATION.now + PAGINATION.ttlMs },
      ),
    ).toThrow(/cursor|invalid/u);
    const outOfRange = createAgentContextQueryCursor({
      collection: 'candidates',
      query,
      position: 3,
      ...PAGINATION,
    });
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        searchQuery(value.scope, {}, 1, outOfRange),
        value.searchLive,
        PAGINATION,
      ),
    ).toThrow(/cursor|position|range/u);

    let getterReads = 0;
    const accessor = {
      ttlMs: PAGINATION.ttlMs,
      signingMaterial: PAGINATION.signingMaterial,
    } as { now?: number; ttlMs: number; signingMaterial: string };
    Object.defineProperty(accessor, 'now', {
      enumerable: true,
      get() {
        getterReads += 1;
        return PAGINATION.now;
      },
    });
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        query,
        value.searchLive,
        accessor,
      ),
    ).toThrow(/pagination|data property|accessor/u);
    expect(getterReads).toBe(0);

    let proxyReads = 0;
    const proxy = new Proxy(PAGINATION, {
      get(target, property, receiver) {
        proxyReads += 1;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    expect(() =>
      executeAgentContextQuery(value.dataset, query, value.searchLive, proxy),
    ).toThrow(/pagination|proxy/u);
    expect(proxyReads).toBe(0);

    const symbolPagination = { ...PAGINATION } as Record<
      string | symbol,
      unknown
    >;
    symbolPagination[Symbol('hidden')] = true;
    for (const invalid of [
      { ...PAGINATION, extra: true },
      { now: PAGINATION.now, ttlMs: PAGINATION.ttlMs },
      Object.assign(Object.create({ inherited: true }) as object, PAGINATION),
      symbolPagination,
      { ...PAGINATION, signingMaterial: 'too-short' },
      { ...PAGINATION, now: Number.MAX_SAFE_INTEGER },
    ]) {
      expect(() =>
        executeAgentContextQuery(
          value.dataset,
          query,
          value.searchLive,
          invalid,
        ),
      ).toThrow(
        /pagination|supported|required|plain|symbol|signingMaterial|ttlMs/u,
      );
    }
    expect(() =>
      executeAgentContextQuery(value.dataset, query, value.searchLive),
    ).toThrow(/pagination|required/u);

    let queryGetterReads = 0;
    const queryAccessor = { ...query } as Record<string, unknown>;
    Object.defineProperty(queryAccessor, 'operation', {
      enumerable: true,
      get() {
        queryGetterReads += 1;
        return query.operation;
      },
    });
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        queryAccessor,
        value.searchLive,
        PAGINATION,
      ),
    ).toThrow(/operation|data property|accessor/u);
    expect(queryGetterReads).toBe(0);

    let liveProxyReads = 0;
    const liveProxy = new Proxy(value.searchLive, {
      get(target, property, receiver) {
        liveProxyReads += 1;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    expect(() =>
      executeAgentContextQuery(value.dataset, query, liveProxy, PAGINATION),
    ).toThrow(/live|proxy/u);
    expect(liveProxyReads).toBe(0);
  });

  it('projects scenario-owned summary and declared-plus-scenario diagnostics', () => {
    const value = boundary();
    const selection = value.selections.find(
      ({ usage }) =>
        usage.usageId === value.fixture.walkthroughs.positive.usage.usageId,
    );
    if (selection === undefined) throw new Error('missing positive selection');
    const live = value.selectedLive(selection);
    const summary = executeAgentContextQuery(
      value.dataset,
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        selection,
        view: 'summary',
        page: { collection: 'steps', limit: 1 },
      },
      live,
      PAGINATION,
    );
    expect(summary).toMatchObject({
      operation: 'get-form-context',
      status: 'complete',
      view: 'summary',
      freshness: 'current',
    });
    if (
      summary.operation !== 'get-form-context' ||
      summary.status !== 'complete' ||
      summary.view !== 'summary'
    ) {
      throw new Error('expected summary');
    }
    const resolved = value.fixture.walkthroughs.positive.resolvedContract;
    expect(summary.summary.form.nodeCount).toBe(
      flattenNodes(resolved.nodes).length,
    );
    expect(summary.summary.diagnosticEvidenceCounts.total).toBe(
      resolved.diagnostics.length,
    );
    expect(summary.summary.effectAnalysis).toEqual(
      resolved.effectAnalysis === undefined
        ? { state: 'not-reported' }
        : { state: 'reported', analysis: resolved.effectAnalysis },
    );

    const diagnosticWalkthrough = Object.values(
      value.fixture.walkthroughs,
    ).sort(
      (left, right) =>
        right.declaredContract.diagnostics.length +
        right.resolvedContract.diagnostics.length +
        (right.declaredContract.effectAnalysis === undefined ? 0 : 1) +
        (right.resolvedContract.effectAnalysis === undefined ? 0 : 1) -
        (left.declaredContract.diagnostics.length +
          left.resolvedContract.diagnostics.length +
          (left.declaredContract.effectAnalysis === undefined ? 0 : 1) +
          (left.resolvedContract.effectAnalysis === undefined ? 0 : 1)),
    )[0]!;
    const diagnosticSelection = value.selections.find(
      ({ usage }) => usage.usageId === diagnosticWalkthrough.usage.usageId,
    );
    if (diagnosticSelection === undefined) {
      throw new Error('missing diagnostic selection');
    }
    const diagnostics = executeAgentContextQuery(
      value.dataset,
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        selection: diagnosticSelection,
        view: 'diagnostics',
        page: { collection: 'diagnostics', limit: 200 },
      },
      value.selectedLive(diagnosticSelection),
      PAGINATION,
    );
    expect(diagnostics).toMatchObject({
      operation: 'get-form-context',
      status: 'complete',
      view: 'diagnostics',
      freshness: 'current',
    });
    if (
      diagnostics.operation !== 'get-form-context' ||
      diagnostics.status !== 'complete' ||
      diagnostics.view !== 'diagnostics'
    ) {
      throw new Error('expected diagnostics');
    }
    const allowedOwners = [
      diagnosticSelection.owners.formContract,
      diagnosticSelection.owners.scenarioArtifact,
    ]
      .filter(
        (reference, index, references) =>
          references.findIndex(
            (candidate) => candidate.contentHash === reference.contentHash,
          ) === index,
      )
      .filter((reference) => {
        const artifact = value.dataset.formContracts.find(
          ({ reference: candidate }) =>
            candidate.contentHash === reference.contentHash,
        )?.artifact;
        return (
          artifact !== undefined &&
          (artifact.diagnostics.length > 0 ||
            artifact.effectAnalysis !== undefined)
        );
      })
      .map(({ contentHash }) => contentHash)
      .sort();
    expect(
      [
        ...new Set(diagnostics.evidence.map(({ owner }) => owner.contentHash)),
      ].sort(),
    ).toEqual(allowedOwners);
    expect(diagnostics.evidence).toEqual(
      [...diagnostics.evidence].sort((left, right) =>
        canonicalStringify(left).localeCompare(canonicalStringify(right)),
      ),
    );
  });

  it('pages steps by ordinal and refreshes continuation expiry explicitly', () => {
    const value = threeStepBoundary();
    const live = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      owners: createAgentContextPinnedLiveOwners(value.selection),
    } as const;
    const query = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      selection: value.selection,
      view: 'summary',
      page: { collection: 'steps', limit: 1 },
    } as const;
    const first = executeAgentContextQuery(
      value.dataset,
      query,
      live,
      PAGINATION,
    );
    if (
      first.operation !== 'get-form-context' ||
      first.status !== 'complete' ||
      first.view !== 'summary' ||
      !first.page.truncated
    ) {
      throw new Error('expected first summary page');
    }
    expect(first.steps.map(({ id }) => id)).toEqual([value.stepIds[0]]);
    const firstCursor = first.page.nextCursor;
    const second = executeAgentContextQuery(
      value.dataset,
      {
        ...query,
        page: { ...query.page, cursor: firstCursor },
      },
      live,
      { ...PAGINATION, now: 1_050 },
    );
    if (
      second.operation !== 'get-form-context' ||
      second.status !== 'complete' ||
      second.view !== 'summary' ||
      !second.page.truncated
    ) {
      throw new Error('expected second summary page');
    }
    expect(second.steps.map(({ id }) => id)).toEqual([value.stepIds[1]]);
    const secondCursor = second.page.nextCursor;

    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        {
          ...query,
          page: { ...query.page, cursor: firstCursor },
        },
        live,
        { ...PAGINATION, now: 1_100 },
      ),
    ).toThrow(/cursor|invalid/u);
    const third = executeAgentContextQuery(
      value.dataset,
      {
        ...query,
        page: { ...query.page, cursor: secondCursor },
      },
      live,
      { ...PAGINATION, now: 1_100 },
    );
    expect(third).toMatchObject({
      operation: 'get-form-context',
      status: 'complete',
      view: 'summary',
      steps: [{ id: value.stepIds[2] }],
      page: { truncated: false },
    });
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        {
          ...query,
          page: { ...query.page, cursor: secondCursor },
        },
        live,
        { ...PAGINATION, now: 1_150 },
      ),
    ).toThrow(/cursor|invalid/u);
  });

  it('deduplicates diagnostics when declared and scenario evidence share one owner', () => {
    const value = boundary();
    const selection = value.selections[0]!;
    const repinned = repinExecutionAuthority(
      value.dataset,
      selection,
      (draft) => ({
        ...draft,
        scenario: {
          ...draft.scenario,
          artifactHash: selection.form.contractHash,
        },
      }),
    );
    const authority = repinned.dataset.executionAuthorities.find(
      ({ reference }) =>
        reference.contentHash ===
        repinned.selection.owners.executionAuthority.contentHash,
    )?.artifact;
    if (authority === undefined) throw new Error('missing repinned authority');
    const sharedSelection: AgentContextQuerySelection = {
      ...repinned.selection,
      owners: {
        ...repinned.selection.owners,
        scenarioArtifact: repinned.selection.owners.formContract,
      },
      scenario: authority.scenario,
    };
    const result = executeAgentContextQuery(
      repinned.dataset,
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        selection: sharedSelection,
        view: 'diagnostics',
        page: { collection: 'diagnostics', limit: 200 },
      },
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(sharedSelection),
      },
      PAGINATION,
    );
    if (
      result.operation !== 'get-form-context' ||
      result.status !== 'complete' ||
      result.view !== 'diagnostics'
    ) {
      throw new Error('expected deduplicated diagnostics');
    }
    expect(
      result.evidence.every(
        ({ owner }) =>
          owner.contentHash === sharedSelection.owners.formContract.contentHash,
      ),
    ).toBe(true);
    const contract = repinned.dataset.formContracts.find(
      ({ reference }) =>
        reference.contentHash ===
        sharedSelection.owners.formContract.contentHash,
    )!.artifact;
    expect(result.evidence).toHaveLength(
      contract.diagnostics.length +
        (contract.effectAnalysis === undefined ? 0 : 1),
    );
  });

  it('deduplicates identical raw diagnostic evidence within one selected owner', () => {
    const value = boundary();
    const walkthrough = value.fixture.walkthroughs.positive;
    const selection = value.selections.find(
      ({ usage }) => usage.usageId === walkthrough.usage.usageId,
    );
    if (selection === undefined) throw new Error('missing diagnostic selection');
    const scenario = walkthrough.resolvedContract;
    const diagnostic = {
      code: 'UNKNOWN_FIELD_SHAPE' as const,
      severity: 'warning' as const,
      message: 'Synthetic duplicate diagnostic',
      evidence: 'resolved' as const,
      sourcePath: ['synthetic', 'duplicate'] as const,
    };
    const { contentHash: originalHash, ...scenarioDraft } = scenario;
    void originalHash;
    const duplicatedScenario = createFormContract({
      ...scenarioDraft,
      diagnostics: [diagnostic, diagnostic],
    });
    const scenarioRepin = repinScenarioArtifact(
      value.dataset,
      selection,
      duplicatedScenario,
    );
    const authorityRepin = repinExecutionAuthority(
      scenarioRepin.dataset,
      scenarioRepin.selection,
      (draft) => ({
        ...draft,
        scenario: {
          ...draft.scenario,
          artifactHash:
            duplicatedScenario.contentHash as AgentContextArtifactReference['contentHash'],
        },
      }),
    );
    const duplicateSelection: AgentContextQuerySelection = {
      ...authorityRepin.selection,
      scenario: {
        ...authorityRepin.selection.scenario,
        artifactHash:
          duplicatedScenario.contentHash as AgentContextArtifactReference['contentHash'],
      },
    };
    const result = executeAgentContextQuery(
      authorityRepin.dataset,
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        selection: duplicateSelection,
        view: 'diagnostics',
        page: { collection: 'diagnostics', limit: 200 },
      },
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(duplicateSelection),
      },
      PAGINATION,
    );
    if (
      result.operation !== 'get-form-context' ||
      result.status !== 'complete' ||
      result.view !== 'diagnostics'
    ) {
      throw new Error('expected deduplicated diagnostics');
    }
    const evidenceKeys = result.evidence.map(canonicalStringify);
    expect(evidenceKeys).toEqual([...new Set(evidenceKeys)]);
  });

  it('authenticates a diagnostics cursor before refusing oversized evidence', () => {
    const value = boundary();
    const walkthrough = value.fixture.walkthroughs.positive;
    const selection = value.selections.find(
      ({ usage }) => usage.usageId === walkthrough.usage.usageId,
    );
    if (selection === undefined) throw new Error('missing positive selection');
    const scenario = walkthrough.resolvedContract;
    const { contentHash: originalHash, ...scenarioDraft } = scenario;
    void originalHash;
    const oversizedScenario = createFormContract({
      ...scenarioDraft,
      diagnostics: [
        {
          code: 'UNKNOWN_FIELD_SHAPE',
          severity: 'warning',
          message: 'Synthetic oversized diagnostic',
          evidence: 'resolved',
          sourcePath: Array.from(
            { length: AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE + 1 },
            (_, index) => `segment-${String(index).padStart(5, '0')}`,
          ),
        },
      ],
    });
    const scenarioRepin = repinScenarioArtifact(
      value.dataset,
      selection,
      oversizedScenario,
    );
    const authorityRepin = repinExecutionAuthority(
      scenarioRepin.dataset,
      scenarioRepin.selection,
      (draft) => ({
        ...draft,
        scenario: {
          ...draft.scenario,
          artifactHash:
            oversizedScenario.contentHash as AgentContextArtifactReference['contentHash'],
        },
      }),
    );
    const oversizedSelection = authorityRepin.selection;
    const live = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      owners: createAgentContextPinnedLiveOwners(oversizedSelection),
    } as const;
    const query = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      selection: oversizedSelection,
      view: 'diagnostics',
      page: { collection: 'diagnostics', limit: 1 },
    } as const;
    expect(
      executeAgentContextQuery(
        authorityRepin.dataset,
        query,
        live,
        PAGINATION,
      ),
    ).toMatchObject({
      operation: 'get-form-context',
      status: 'refused',
      reason: { kind: 'atomic-record-too-large' },
    });
    expect(() =>
      executeAgentContextQuery(
        authorityRepin.dataset,
        {
          ...query,
          page: { ...query.page, cursor: 'acq1.invalid.invalid' },
        },
        live,
        PAGINATION,
      ),
    ).toThrow(/cursor|invalid/u);
  });

  it('returns the selected usage journey atomically with exact authority', () => {
    const value = journeyWithEmptyStepBoundary();
    const selection = value.selection;
    const result = executeAgentContextQuery(
      value.dataset,
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        selection,
        view: 'journey',
      },
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(selection),
      },
    );
    expect(result).toMatchObject({
      operation: 'get-form-context',
      status: 'complete',
      view: 'journey',
      freshness: 'current',
      journey: {
        identity: selection.journey,
        authority: { owner: selection.owners.executionAuthority },
      },
    });
    if (
      result.operation !== 'get-form-context' ||
      result.status !== 'complete' ||
      result.view !== 'journey'
    ) {
      throw new Error('expected journey');
    }
    const authority = value.dataset.executionAuthorities.find(
      ({ reference }) =>
        reference.contentHash ===
        selection.owners.executionAuthority.contentHash,
    )?.artifact;
    if (authority === undefined) throw new Error('missing selected authority');
    expect(result.journey.authority.steps.items).toEqual(authority.usage.steps);
    expect(result.journey.authority.actions.items).toEqual(
      authority.usage.actions,
    );
    expect(result.journey.authority.outcomes.items).toEqual(
      authority.usage.outcomes,
    );
    expect(result.journey.authority.transitions.items).toEqual(
      authority.usage.transitions,
    );
    expect(result.journey.authority.steps.items).toContainEqual({
      id: value.emptyStepId,
      ordinal: 4,
      nodeIds: [],
      actionIds: [],
    });
  });

  it('flattens scenario nodes, applies every node filter, and projects requested details only', () => {
    const value = boundary();
    const positive = value.fixture.walkthroughs.positive;
    const selection = value.selections.find(
      ({ usage }) => usage.usageId === positive.usage.usageId,
    );
    if (selection === undefined) throw new Error('missing positive selection');
    const sourceNode = flattenNodes(positive.resolvedContract.nodes).find(
      (node) => node.presentation?.label !== undefined,
    );
    if (
      sourceNode?.presentation?.label === undefined ||
      sourceNode.semanticType === undefined
    ) {
      throw new Error('fixture needs a filterable scenario node');
    }
    const capabilities = [
      'constraints',
      'domain',
      'effects',
      'interaction',
      'locators',
      'unknowns',
    ] as const;
    const query = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      selection,
      withinStepId: positive.stepId,
      filters: {
        nodeId: sourceNode.id,
        modelPath: sourceNode.modelPath,
        label: sourceNode.presentation.label,
        semanticType: sourceNode.semanticType,
        scenarioId: selection.scenario.id,
      },
      include: capabilities,
      page: { collection: 'nodes', limit: 1 },
    } as const;
    const result = executeAgentContextQuery(
      value.dataset,
      query,
      value.selectedLive(selection),
      PAGINATION,
    );
    expect(result).toMatchObject({
      operation: 'find-form-nodes',
      status: 'complete',
      freshness: 'current',
    });
    if (
      result.operation !== 'find-form-nodes' ||
      result.status !== 'complete'
    ) {
      throw new Error('expected one node');
    }
    const candidate = result.candidates[0]!;
    expect(candidate).toMatchObject({
      nodeId: sourceNode.id,
      evidence: 'resolved',
      modelPath: sourceNode.modelPath,
      presentation: sourceNode.presentation,
      state: sourceNode.state,
      included: capabilities,
    });
    expect(Object.keys(candidate.details).sort()).toEqual(
      [...capabilities].sort(),
    );
    expect(candidate.details.domain?.options.items).toEqual(sourceNode.options);
    expect(candidate.details.interaction?.profile).toEqual(
      sourceNode.interactionProfile,
    );
    expect(candidate.details.locators?.items).toEqual(sourceNode.locators);
    expect(result.authority.owner).toEqual(selection.owners.executionAuthority);
    expect(
      result.authority.steps.items.some(({ nodeIds }) =>
        nodeIds.includes(candidate.nodeId),
      ),
    ).toBe(true);

    for (const filters of [
      { nodeId: sourceNode.id },
      { modelPath: sourceNode.modelPath },
      { label: sourceNode.presentation.label.slice(-8) },
      { semanticType: sourceNode.semanticType },
      { scenarioId: selection.scenario.id },
      ...(candidate.capabilities[0] === undefined
        ? []
        : [{ capability: candidate.capabilities[0] }]),
    ]) {
      const filtered = executeAgentContextQuery(
        value.dataset,
        {
          ...query,
          filters,
          include: [],
          page: { collection: 'nodes', limit: 200 },
        },
        value.selectedLive(selection),
        PAGINATION,
      );
      expect(filtered.operation).toBe('find-form-nodes');
      expect(filtered.status).not.toBe('not-found');
    }

    const absent = executeAgentContextQuery(
      value.dataset,
      {
        ...query,
        withinStepId: 'unknown.step',
        filters: {},
        include: [],
      },
      value.selectedLive(selection),
      PAGINATION,
    );
    expect(absent).toMatchObject({
      operation: 'find-form-nodes',
      status: 'not-found',
      reason: { kind: 'node-absent' },
      page: { truncated: false },
    });
  });

  it('keeps node ambiguity total across pages with page-specific authority', () => {
    const value = boundary();
    const positive = value.fixture.walkthroughs.positive;
    const selection = value.selections.find(
      ({ usage }) => usage.usageId === positive.usage.usageId,
    );
    if (selection === undefined) throw new Error('missing positive selection');
    const query = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      selection,
      filters: {},
      include: [],
      page: { collection: 'nodes', limit: 1 },
    } as const;
    const first = executeAgentContextQuery(
      value.dataset,
      query,
      value.selectedLive(selection),
      PAGINATION,
    );
    expect(first).toMatchObject({
      operation: 'find-form-nodes',
      status: 'ambiguous',
      reason: {
        kind: 'node-ambiguous',
        totalMatches: flattenNodes(positive.resolvedContract.nodes).length,
      },
      page: { truncated: true },
    });
    if (
      first.operation !== 'find-form-nodes' ||
      first.status !== 'ambiguous' ||
      !first.page.truncated
    ) {
      throw new Error('expected first node page');
    }
    expect(first.reason.nodeIds).toEqual(
      first.candidates.map(({ nodeId }) => nodeId),
    );
    const pageNodeIds = new Set(first.candidates.map(({ nodeId }) => nodeId));
    for (const record of [
      ...first.authority.interactions.items,
      ...first.authority.commits.items,
      ...first.authority.validationSurfaces.items,
      ...first.authority.valueAssertions.items,
      ...first.authority.stateAssertions.items,
    ]) {
      expect(pageNodeIds.has(record.nodeId)).toBe(true);
    }
    const second = executeAgentContextQuery(
      value.dataset,
      {
        ...query,
        page: { ...query.page, cursor: first.page.nextCursor },
      },
      value.selectedLive(selection),
      PAGINATION,
    );
    expect(second).toMatchObject({
      operation: 'find-form-nodes',
      status: 'ambiguous',
      reason: {
        kind: 'node-ambiguous',
        totalMatches: flattenNodes(positive.resolvedContract.nodes).length,
      },
    });

    const scenarioMismatch = executeAgentContextQuery(
      value.dataset,
      {
        ...query,
        filters: { scenarioId: 'missing.scenario' },
        page: { collection: 'nodes', limit: 1 },
      },
      value.selectedLive(selection),
      PAGINATION,
    );
    expect(scenarioMismatch).toMatchObject({
      operation: 'find-form-nodes',
      status: 'not-found',
      reason: { kind: 'node-absent' },
    });
  });

  it('discovers nested children and array templates from the scenario artifact', () => {
    const value = boundary();
    const selection = value.selections.find(
      ({ usage }) =>
        usage.usageId === value.fixture.walkthroughs.positive.usage.usageId,
    );
    if (selection === undefined) throw new Error('missing positive selection');
    const scenario = value.fixture.walkthroughs.positive.resolvedContract;
    const [root, child, template] = scenario.nodes;
    if (root === undefined || child === undefined || template === undefined) {
      throw new Error('fixture needs three scenario nodes');
    }
    const { contentHash: originalScenarioHash, ...scenarioDraft } = scenario;
    void originalScenarioHash;
    const nestedScenario = createFormContract({
      ...scenarioDraft,
      nodes: [
        {
          ...root,
          children: [child],
          arrayTemplate: template,
        },
      ],
    });
    const scenarioRepin = repinScenarioArtifact(
      value.dataset,
      selection,
      nestedScenario,
    );
    const authorityRepin = repinExecutionAuthority(
      scenarioRepin.dataset,
      scenarioRepin.selection,
      (draft) => ({
        ...draft,
        scenario: {
          ...draft.scenario,
          artifactHash:
            nestedScenario.contentHash as AgentContextArtifactReference['contentHash'],
        },
      }),
    );
    const nestedSelection: AgentContextQuerySelection = {
      ...authorityRepin.selection,
      scenario: {
        ...authorityRepin.selection.scenario,
        artifactHash:
          nestedScenario.contentHash as AgentContextArtifactReference['contentHash'],
      },
    };
    const result = executeAgentContextQuery(
      authorityRepin.dataset,
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'find-form-nodes',
        selection: nestedSelection,
        filters: {},
        include: [],
        page: { collection: 'nodes', limit: 200 },
      },
      {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        owners: createAgentContextPinnedLiveOwners(nestedSelection),
      },
      PAGINATION,
    );
    if (result.operation !== 'find-form-nodes' || result.status === 'refused') {
      throw new Error('expected flattened nested nodes');
    }
    expect(result.candidates.map(({ nodeId }) => nodeId)).toEqual(
      [root.id, child.id, template.id].sort(),
    );
    const rootProjection = result.candidates.find(
      ({ nodeId }) => nodeId === root.id,
    );
    expect(rootProjection).toMatchObject({
      childNodeIds: [child.id],
      arrayTemplateNodeId: template.id,
    });
  });

  it('refuses a requested atomic node record above the graph bound', () => {
    const value = boundary();
    const selection = value.selections.find(
      ({ usage }) =>
        usage.usageId === value.fixture.walkthroughs.positive.usage.usageId,
    );
    if (selection === undefined) throw new Error('missing positive selection');
    const scenario = value.fixture.walkthroughs.positive.resolvedContract;
    const sourceNode = scenario.nodes[0]!;
    const { contentHash: originalScenarioHash, ...scenarioDraft } = scenario;
    void originalScenarioHash;
    const oversizedScenario = createFormContract({
      ...scenarioDraft,
      nodes: scenario.nodes.map((node) =>
        node.id === sourceNode.id
          ? {
              ...node,
              constraints: Array.from({ length: 5_001 }, () => ({
                kind: 'required' as const,
              })),
            }
          : node,
      ),
    });
    const scenarioRepin = repinScenarioArtifact(
      value.dataset,
      selection,
      oversizedScenario,
    );
    const authorityRepin = repinExecutionAuthority(
      scenarioRepin.dataset,
      scenarioRepin.selection,
      (draft) => ({
        ...draft,
        scenario: {
          ...draft.scenario,
          artifactHash:
            oversizedScenario.contentHash as AgentContextArtifactReference['contentHash'],
        },
      }),
    );
    const oversizedSelection: AgentContextQuerySelection = {
      ...authorityRepin.selection,
      scenario: {
        ...authorityRepin.selection.scenario,
        artifactHash:
          oversizedScenario.contentHash as AgentContextArtifactReference['contentHash'],
      },
    };
    const live = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      owners: createAgentContextPinnedLiveOwners(oversizedSelection),
    } as const;
    const baseQuery = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      selection: oversizedSelection,
      filters: { nodeId: sourceNode.id },
      page: { collection: 'nodes', limit: 1 },
    } as const;
    expect(
      executeAgentContextQuery(
        authorityRepin.dataset,
        { ...baseQuery, include: [] },
        live,
        PAGINATION,
      ),
    ).toMatchObject({ operation: 'find-form-nodes', status: 'complete' });
    expect(
      executeAgentContextQuery(
        authorityRepin.dataset,
        { ...baseQuery, include: ['constraints'] },
        live,
        PAGINATION,
      ),
    ).toMatchObject({
      operation: 'find-form-nodes',
      status: 'refused',
      reason: { kind: 'atomic-record-too-large' },
    });
  });

  it('computes current, unknown, and stale selected-view freshness', () => {
    const value = boundary();
    const selection = value.selections[0]!;
    const query = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      selection,
      filters: { nodeId: value.fixture.walkthroughs.negative.focusNodeIds[0]! },
      include: [],
      page: { collection: 'nodes', limit: 1 },
    } as const;
    const currentLive = value.selectedLive(selection);
    const unknownLive = {
      ...currentLive,
      owners: currentLive.owners.filter(
        ({ role }) => role !== 'execution-authority',
      ),
    };
    const staleLive = {
      ...currentLive,
      owners: currentLive.owners.map((owner) =>
        owner.role === 'scenario-artifact'
          ? {
              ...owner,
              reference: {
                ...owner.reference,
                contentHash: `sha256:${'0'.repeat(64)}` as const,
              },
            }
          : owner,
      ),
    };
    for (const [live, freshness] of [
      [currentLive, 'current'],
      [unknownLive, 'unknown'],
      [staleLive, 'stale'],
    ] as const) {
      const result = executeAgentContextQuery(
        value.dataset,
        query,
        live,
        PAGINATION,
      );
      expect(result.freshness).toBe(freshness);
    }
  });

  it('fails the CTX-1C slice operation closed and prohibits pagination for atomic views', () => {
    const value = boundary();
    const selection = value.selections[0]!;
    const sliceQuery = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-e2e-slice',
      selection,
      withinStepId: value.fixture.walkthroughs.positive.stepId,
      nodeIds: [value.fixture.walkthroughs.positive.focusNodeIds[0]!],
      goal: 'positive',
      includeOutgoingEffects: false,
    } as const;
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        sliceQuery,
        value.selectedLive(selection),
      ),
    ).toThrow(/get-e2e-slice|CTX-1C|unsupported/u);
    expect(() =>
      executeAgentContextQuery(
        value.dataset,
        {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          operation: 'get-form-context',
          selection,
          view: 'journey',
        },
        value.selectedLive(selection),
        PAGINATION,
      ),
    ).toThrow(/pagination|journey|prohibited/u);
  });
});
