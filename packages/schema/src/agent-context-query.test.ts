import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  canonicalizeAgentContextQueryDataset,
  canonicalizeAgentContextQuery,
  canonicalizeAgentContextQueryResult,
  canonicalizeAgentContextQuerySelection,
  createAgentContextUsageSearchScopeLiveOwners,
  createAgentContextPinnedLiveOwners,
  evaluateAgentContextQueryFreshness,
  parseAgentContextLiveOwnerState,
  parseAgentContextQuery,
  parseAgentContextQueryDataset,
  parseAgentContextQueryResult,
  parseAgentContextQuerySelection,
  parseAgentContextUsageSearchScope,
  validateAgentContextUsageSearchScope,
  validateAgentContextQuerySelection,
  type AgentContextLiveOwnerReference,
  type AgentContextQueryDataset,
  type AgentContextQuerySelection,
  type AgentContextUsageSearchScope,
} from './agent-context-query.js';
import {
  createAgentContextArtifactSet,
  type AgentContextArtifactReference,
} from './agent-context-artifacts.js';
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
} from './agent-context-usage.js';
import { createSyntheticRh05AgentContextFixtureSet } from './agent-context-walkthrough-fixtures.js';
import {
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractNode,
} from './contract.js';

const HASH_ZERO = `sha256:${'0'.repeat(64)}` as const;

function compareReference(
  left: { schemaId: string; schemaVersion: string; contentHash: string },
  right: { schemaId: string; schemaVersion: string; contentHash: string },
): number {
  for (const key of ['schemaId', 'schemaVersion', 'contentHash'] as const) {
    if (left[key] < right[key]) return -1;
    if (left[key] > right[key]) return 1;
  }
  return 0;
}

function fixtureBoundary(): {
  readonly dataset: AgentContextQueryDataset;
  readonly selection: AgentContextQuerySelection;
} {
  const fixture = createSyntheticRh05AgentContextFixtureSet();
  const positive = fixture.walkthroughs.positive;
  const artifactReference = (
    schemaId: string,
    schemaVersion: string,
    contentHash: string,
  ) => {
    const reference = fixture.artifactSet.artifacts.find(
      (candidate) =>
        candidate.schemaId === schemaId &&
        candidate.schemaVersion === schemaVersion &&
        candidate.contentHash === contentHash,
    );
    if (reference === undefined) {
      throw new Error(`missing fixture artifact reference ${contentHash}`);
    }
    return reference;
  };
  const sourceUsageReference = artifactReference(
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    fixture.sourceUsageCatalog.contentHash,
  );
  const journeyReference = artifactReference(
    AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
    AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    fixture.journeyCatalog.contentHash,
  );

  const formArtifacts = Object.values(fixture.walkthroughs)
    .flatMap((walkthrough) => [
      walkthrough.declaredContract,
      walkthrough.resolvedContract,
    ])
    .map((artifact) => ({
      reference: artifactReference(
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        artifact.contentHash,
      ),
      artifact,
    }))
    .sort((left, right) => compareReference(left.reference, right.reference));
  const authorityArtifacts = Object.values(fixture.walkthroughs)
    .map(({ executionAuthority: artifact }) => ({
      reference: artifactReference(
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
      { reference: sourceUsageReference, artifact: fixture.sourceUsageCatalog },
    ],
    journeyCatalogs: [
      { reference: journeyReference, artifact: fixture.journeyCatalog },
    ],
    formContracts: formArtifacts,
    executionAuthorities: authorityArtifacts,
  };
  const declaredReference = artifactReference(
    FORM_CONTRACT_SCHEMA_ID,
    FORM_CONTRACT_SCHEMA_VERSION,
    positive.declaredContract.contentHash,
  );
  const resolvedReference = artifactReference(
    FORM_CONTRACT_SCHEMA_ID,
    FORM_CONTRACT_SCHEMA_VERSION,
    positive.resolvedContract.contentHash,
  );
  const authorityReference = artifactReference(
    AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
    AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    positive.executionAuthority.contentHash,
  );
  const selectedUsage = fixture.sourceUsageCatalog.usages.find(
    ({ identity }) =>
      identity.kind === 'declared' &&
      identity.usageId === positive.usage.usageId &&
      identity.version === positive.usage.version,
  );
  if (selectedUsage?.resolution.status !== 'exact') {
    throw new Error('positive fixture usage must resolve exactly');
  }
  const selection: AgentContextQuerySelection = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: {
      schemaVersion: fixture.artifactSet.schemaVersion,
      contentHash: fixture.artifactSet.contentHash,
    },
    workspaceIndex: fixture.workspaceIndex,
    owners: {
      sourceUsageCatalog: sourceUsageReference,
      journeyCatalog: journeyReference,
      formContract: declaredReference,
      scenarioArtifact: resolvedReference,
      executionAuthority: authorityReference,
    },
    usage: positive.usage,
    journey: positive.journey,
    form: {
      projectId: selectedUsage.resolution.candidate.form.projectId,
      formId: positive.declaredContract.formId,
      contractHash:
        positive.declaredContract
          .contentHash as AgentContextQuerySelection['form']['contractHash'],
    },
    scenario: positive.executionAuthority.scenario,
    executionAuthority: {
      usageId: positive.executionAuthority.usage.id,
      usageVersion: positive.executionAuthority.usage.version,
      basis: positive.executionAuthority.basis,
    },
  };
  return { dataset, selection };
}

function nodeQuery(selection: AgentContextQuerySelection) {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'find-form-nodes',
    selection,
    withinStepId:
      'synthetic.rh05.operations.purchase-order.step-one',
    filters: {
      semanticType: 'single-choice',
      capability: 'select-option',
    },
    include: ['constraints', 'interaction'] as const,
    page: { collection: 'nodes', limit: 25 },
  } as const;
}

function usageSearchScope(
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

function withAdditionalSourceUsageCatalog(
  dataset: AgentContextQueryDataset,
): AgentContextQueryDataset {
  const primary = dataset.sourceUsageCatalogs[0];
  if (primary === undefined) throw new Error('missing primary usage catalog');
  const artifact = createAgentContextSourceUsageCatalog({
    schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    workspaceIndex: primary.artifact.workspaceIndex,
    coverage: primary.artifact.coverage,
    usages: [],
  });
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

function deeplyNestedDataGraph(depth: number): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let cursor = root;
  for (let index = 0; index < depth; index += 1) {
    const next: Record<string, unknown> = {};
    cursor.next = next;
    cursor = next;
  }
  return root;
}

function flattenContractNodes(
  nodes: readonly ContractNode[],
): readonly ContractNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenContractNodes(node.children),
    ...(node.arrayTemplate === undefined
      ? []
      : flattenContractNodes([node.arrayTemplate])),
  ]);
}

function repinExecutionAuthority(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  mutate: (
    draft: AgentContextExecutionAuthorityDraft,
  ) => AgentContextExecutionAuthorityDraft,
): {
  readonly dataset: AgentContextQueryDataset;
  readonly selection: AgentContextQuerySelection;
} {
  const selected = dataset.executionAuthorities.find(
    ({ reference }) =>
      reference.contentHash === selection.owners.executionAuthority.contentHash,
  );
  if (selected === undefined) throw new Error('missing selected authority');
  const draft: AgentContextExecutionAuthorityDraft = {
    schemaVersion: selected.artifact.schemaVersion,
    basis: selected.artifact.basis,
    scenario: selected.artifact.scenario,
    physicalOperations: selected.artifact.physicalOperations,
    readiness: selected.artifact.readiness,
    interactions: selected.artifact.interactions,
    commits: selected.artifact.commits,
    validationSurfaces: selected.artifact.validationSurfaces,
    valueAssertions: selected.artifact.valueAssertions,
    stateAssertions: selected.artifact.stateAssertions,
    usage: selected.artifact.usage,
    repeaterCaptures: selected.artifact.repeaterCaptures,
  };
  const artifact = createAgentContextExecutionAuthority(mutate(draft));
  const reference: AgentContextArtifactReference = {
    ...selected.reference,
    contentHash: artifact.contentHash,
  };
  const artifactSet = createAgentContextArtifactSet({
    schemaVersion: dataset.artifactSet.schemaVersion,
    repositoryRevision: dataset.artifactSet.repositoryRevision,
    workspaceIndex: dataset.artifactSet.workspaceIndex,
    artifacts: dataset.artifactSet.artifacts.map((candidate) =>
      compareReference(candidate, selected.reference) === 0
        ? reference
        : candidate,
    ),
  });
  return {
    dataset: {
      ...dataset,
      artifactSet,
      executionAuthorities: dataset.executionAuthorities
        .map((owner) =>
          compareReference(owner.reference, selected.reference) === 0
            ? { reference, artifact }
            : owner,
        )
        .sort((left, right) => compareReference(left.reference, right.reference)),
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

function repinJourneyCatalog(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  mutate: (draft: AgentContextJourneyCatalogDraft) => AgentContextJourneyCatalogDraft,
): {
  readonly dataset: AgentContextQueryDataset;
  readonly selection: AgentContextQuerySelection;
} {
  const selected = dataset.journeyCatalogs.find(
    ({ reference }) =>
      reference.contentHash === selection.owners.journeyCatalog.contentHash,
  );
  if (selected === undefined) throw new Error('missing selected journey catalog');
  const artifact = createAgentContextJourneyCatalog(
    mutate({
      schemaVersion: selected.artifact.schemaVersion,
      workspaceIndex: selected.artifact.workspaceIndex,
      journeys: selected.artifact.journeys,
    }),
  );
  const reference: AgentContextArtifactReference = {
    ...selected.reference,
    contentHash: artifact.contentHash,
  };
  const artifactSet = createAgentContextArtifactSet({
    schemaVersion: dataset.artifactSet.schemaVersion,
    repositoryRevision: dataset.artifactSet.repositoryRevision,
    workspaceIndex: dataset.artifactSet.workspaceIndex,
    artifacts: dataset.artifactSet.artifacts.map((candidate) =>
      compareReference(candidate, selected.reference) === 0
        ? reference
        : candidate,
    ),
  });
  return {
    dataset: {
      ...dataset,
      artifactSet,
      journeyCatalogs: dataset.journeyCatalogs
        .map((owner) =>
          compareReference(owner.reference, selected.reference) === 0
            ? { reference, artifact }
            : owner,
        )
        .sort((left, right) => compareReference(left.reference, right.reference)),
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

function addUnrelatedJourneyUsage(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
) {
  return repinJourneyCatalog(dataset, selection, (draft) => ({
    ...draft,
    journeys: draft.journeys.map((journey) =>
      journey.id === selection.journey.id &&
      journey.version === selection.journey.version
        ? {
            ...journey,
            steps: [
              ...journey.steps,
              {
                id: 'synthetic.multi-usage.unrelated-step',
                ordinal: 2,
                label: 'Unrelated usage step',
                forms: [selection.form],
                usages: [
                  {
                    kind: 'declared' as const,
                    usageId: 'synthetic.multi-usage.unrelated',
                    version: 1,
                  },
                ],
                actionIds: ['synthetic.multi-usage.unrelated-action'],
              },
            ],
            actions: [
              ...journey.actions,
              {
                id: 'synthetic.multi-usage.unrelated-action',
                kind: 'cancel' as const,
                outcomeIds: ['synthetic.multi-usage.unrelated-outcome'],
                evidenceRefs: ['synthetic.multi-usage.evidence.action'],
              },
            ],
            outcomes: [
              ...journey.outcomes,
              {
                id: 'synthetic.multi-usage.unrelated-outcome',
                kind: 'remains-on-step' as const,
                evidenceRefs: ['synthetic.multi-usage.evidence.outcome'],
              },
            ],
          }
        : journey,
    ),
  }));
}

describe('agent-context query dataset and pinned selection', () => {
  it('strictly round-trips a general owner-wrapped dataset and selection', () => {
    const { dataset, selection } = fixtureBoundary();

    const parsedDataset = parseAgentContextQueryDataset(
      JSON.parse(JSON.stringify(dataset)),
    );
    const parsedSelection = parseAgentContextQuerySelection(
      JSON.parse(JSON.stringify(selection)),
    );

    expect(parsedDataset).toEqual(dataset);
    expect(parsedSelection).toEqual(selection);
    expect(JSON.parse(canonicalizeAgentContextQueryDataset(dataset))).toEqual(
      dataset,
    );
    expect(
      JSON.parse(canonicalizeAgentContextQuerySelection(selection)),
    ).toEqual(selection);
    expect(validateAgentContextQuerySelection(dataset, selection)).toEqual(
      selection,
    );
  });

  it('rejects unknown keys and unsupported versions at strict boundaries', () => {
    const { dataset, selection } = fixtureBoundary();

    expect(() =>
      parseAgentContextQueryDataset({ ...dataset, unexpected: true }),
    ).toThrow(/unexpected/u);
    expect(() =>
      parseAgentContextQuerySelection({ ...selection, schemaVersion: '9.9.9' }),
    ).toThrow(/schemaVersion/u);
    expect(() =>
      parseAgentContextQuerySelection({
        ...selection,
        owners: { ...selection.owners, buildId: 'not-authority' },
      }),
    ).toThrow(/buildId/u);
    expect(() =>
      parseAgentContextQuerySelection({
        ...selection,
        owners: {
          ...selection.owners,
          sourceUsageCatalog: selection.owners.journeyCatalog,
        },
      }),
    ).toThrow(/sourceUsageCatalog/u);
  });

  it('rejects missing owner inventory and cross-owner selection drift', () => {
    const { dataset, selection } = fixtureBoundary();
    const incompleteDataset = {
      ...dataset,
      formContracts: dataset.formContracts.slice(1),
    };
    expect(() => parseAgentContextQueryDataset(incompleteDataset)).toThrow(
      /form-contract.*reference|reference.*form-contract/u,
    );

    const wrongFormOwner = {
      ...selection,
      owners: {
        ...selection.owners,
        formContract: selection.owners.scenarioArtifact,
      },
    };
    expect(() =>
      validateAgentContextQuerySelection(dataset, wrongFormOwner),
    ).toThrow(/formContract|contractHash/u);

    const wrongScenarioBasis = {
      ...selection,
      scenario: {
        ...selection.scenario,
        basis: { ...selection.scenario.basis, contractHash: HASH_ZERO },
      },
    };
    expect(() =>
      validateAgentContextQuerySelection(dataset, wrongScenarioBasis),
    ).toThrow(/scenario.*basis|basis.*scenario/u);

    const identityDrift: readonly AgentContextQuerySelection[] = [
      {
        ...selection,
        usage: { ...selection.usage, usageId: 'missing.usage' },
      },
      {
        ...selection,
        journey: { ...selection.journey, id: 'missing.journey' },
      },
      {
        ...selection,
        executionAuthority: {
          ...selection.executionAuthority,
          usageId: 'missing.execution-authority',
        },
      },
    ];
    for (const drifted of identityDrift) {
      expect(() =>
        validateAgentContextQuerySelection(dataset, drifted),
      ).toThrow(/selection|usage|journey|execution/u);
    }
  });

  it('rejects owner-valid rehashes whose authority no longer exactly projects the journey and form', () => {
    const original = fixtureBoundary();
    const mutations: readonly ((
      draft: AgentContextExecutionAuthorityDraft,
    ) => AgentContextExecutionAuthorityDraft)[] = [
      (draft) => ({
        ...draft,
        usage: {
          ...draft.usage,
          entry: { ...draft.usage.entry, id: `${draft.usage.entry.id}.drift` },
        },
      }),
      (draft) => ({
        ...draft,
        usage: {
          ...draft.usage,
          steps: draft.usage.steps.map((step, index) =>
            index === 0 ? { ...step, ordinal: step.ordinal + 1 } : step,
          ),
        },
      }),
      (draft) => ({
        ...draft,
        usage: {
          ...draft.usage,
          steps: draft.usage.steps.map((step, index) =>
            index === 0
              ? {
                  ...step,
                  nodeIds: [...step.nodeIds, 'synthetic.owner-valid.extra-node'],
                }
              : step,
          ),
        },
      }),
    ];

    for (const mutate of mutations) {
      const repinned = repinExecutionAuthority(
        original.dataset,
        original.selection,
        mutate,
      );
      expect(() =>
        validateAgentContextQuerySelection(
          repinned.dataset,
          repinned.selection,
        ),
      ).toThrow(/journey|entry|step|node|projection/u);
    }
  });

  it('compares only the selected-usage subgraph in a valid multi-usage journey', () => {
    const original = fixtureBoundary();
    const multiUsage = addUnrelatedJourneyUsage(
      original.dataset,
      original.selection,
    );

    expect(
      validateAgentContextQuerySelection(
        multiUsage.dataset,
        multiUsage.selection,
      ),
    ).toEqual(multiUsage.selection);

    const unrelatedDrift = repinJourneyCatalog(
      multiUsage.dataset,
      multiUsage.selection,
      (draft) => ({
        ...draft,
        journeys: draft.journeys.map((journey) => ({
          ...journey,
          actions: journey.actions.map((action) =>
            action.id === 'synthetic.multi-usage.unrelated-action'
              ? { ...action, kind: 'submit' as const }
              : action,
          ),
        })),
      }),
    );
    expect(
      validateAgentContextQuerySelection(
        unrelatedDrift.dataset,
        unrelatedDrift.selection,
      ),
    ).toEqual(unrelatedDrift.selection);

    const relevantDrift = repinJourneyCatalog(
      multiUsage.dataset,
      multiUsage.selection,
      (draft) => ({
        ...draft,
        journeys: draft.journeys.map((journey) => ({
          ...journey,
          steps: journey.steps.map((step) =>
            step.usages.some(
              (usage) =>
                usage.kind === 'declared' &&
                usage.usageId === multiUsage.selection.usage.usageId &&
                usage.version === multiUsage.selection.usage.version,
            )
              ? { ...step, ordinal: step.ordinal + 10 }
              : step,
          ),
        })),
      }),
    );
    expect(() =>
      validateAgentContextQuerySelection(
        relevantDrift.dataset,
        relevantDrift.selection,
      ),
    ).toThrow(/step|ordinal|projection/u);
  });
});

describe('agent-context query and result DTOs', () => {
  it('validates usage-search scope as the exact dataset owner set', () => {
    const fixture = fixtureBoundary();
    const dataset = withAdditionalSourceUsageCatalog(fixture.dataset);
    const scope = usageSearchScope(dataset);

    expect(validateAgentContextUsageSearchScope(dataset, scope)).toEqual(scope);
    expect(() =>
      validateAgentContextUsageSearchScope(dataset, {
        ...scope,
        sourceUsageCatalogs: scope.sourceUsageCatalogs.slice(0, 1),
      }),
    ).toThrow(/sourceUsageCatalogs|owner set|scope/u);
    expect(() =>
      validateAgentContextUsageSearchScope(dataset, {
        ...scope,
        sourceUsageCatalogs: [
          ...scope.sourceUsageCatalogs,
          {
            ...scope.sourceUsageCatalogs.at(-1)!,
            contentHash: HASH_ZERO,
          },
        ],
      }),
    ).toThrow(/sourceUsageCatalogs|owner set|scope/u);
    expect(() =>
      validateAgentContextUsageSearchScope(dataset, {
        ...scope,
        sourceUsageCatalogs: [...scope.sourceUsageCatalogs].reverse(),
      }),
    ).toThrow(/canonical|order|sourceUsageCatalogs/u);
    expect(() =>
      validateAgentContextUsageSearchScope(dataset, {
        ...scope,
        artifactSet: fixture.selection.artifactSet,
      }),
    ).toThrow(/artifactSet/u);
    expect(() =>
      validateAgentContextUsageSearchScope(dataset, {
        ...scope,
        workspaceIndex: {
          ...scope.workspaceIndex,
          contentHash: HASH_ZERO,
        },
      }),
    ).toThrow(/workspaceIndex/u);
  });

  it('pins usage search to an exact canonical multi-catalog scope', () => {
    const { dataset } = fixtureBoundary();
    const scope = usageSearchScope(dataset);
    const query = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      scope,
      filters: { text: 'purchase order' },
      page: { collection: 'candidates', limit: 25 },
    } as const;

    expect(parseAgentContextUsageSearchScope(scope)).toEqual(scope);
    expect(parseAgentContextQuery(query)).toEqual(query);
    expect(() =>
      parseAgentContextUsageSearchScope({
        ...scope,
        sourceUsageCatalogs: [
          ...scope.sourceUsageCatalogs,
          scope.sourceUsageCatalogs[0],
        ],
      }),
    ).toThrow(/sourceUsageCatalogs|duplicate|canonical/u);
    expect(() =>
      parseAgentContextUsageSearchScope({ ...scope, buildId: 'not-currentness' }),
    ).toThrow(/buildId/u);
  });

  it('strictly parses and canonically round-trips a bounded node query', () => {
    const { selection } = fixtureBoundary();
    const query = nodeQuery(selection);

    const parsed = parseAgentContextQuery(query);
    const canonical = canonicalizeAgentContextQuery(query);

    expect(parsed).toEqual(query);
    expect(JSON.parse(canonical)).toEqual(query);
  });

  it('confines source paths and bounds presentation payloads', () => {
    const { dataset } = fixtureBoundary();
    const scope = usageSearchScope(dataset);
    expect(() =>
      parseAgentContextQuery({
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'search-form-usages',
        scope,
        filters: { sourcePath: '../outside.ts' },
        page: { collection: 'candidates', limit: 25 },
      }),
    ).toThrow(/sourcePath/u);
    expect(() =>
      parseAgentContextQuery({
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'search-form-usages',
        scope,
        filters: { text: 'x'.repeat(4_097) },
        page: { collection: 'candidates', limit: 25 },
      }),
    ).toThrow(/4096|4,096/u);
  });

  it('accepts only operation-specific result statuses and reason variants', () => {
    const { dataset, selection } = fixtureBoundary();
    const authority = dataset.executionAuthorities.find(
      ({ reference }) =>
        reference.contentHash ===
        selection.owners.executionAuthority.contentHash,
    )!.artifact;
    const nodeIds = authority.usage.steps.flatMap(({ nodeIds: ids }) => ids);
    const result = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status: 'ambiguous',
      selection,
      freshness: 'current',
      authority: {
        owner: selection.owners.executionAuthority,
        entry: authority.usage.entry,
        steps: { complete: true, items: authority.usage.steps },
        actions: { complete: true, items: authority.usage.actions },
        outcomes: { complete: true, items: authority.usage.outcomes },
        transitions: { complete: true, items: authority.usage.transitions },
        physicalOperations: {
          complete: true,
          items: authority.physicalOperations,
        },
        readiness: { complete: true, items: authority.readiness },
        interactions: { complete: true, items: authority.interactions },
        commits: { complete: true, items: authority.commits },
        validationSurfaces: {
          complete: true,
          items: authority.validationSurfaces,
        },
        valueAssertions: { complete: true, items: authority.valueAssertions },
        stateAssertions: { complete: true, items: authority.stateAssertions },
        repeaterCaptures: {
          complete: true,
          items: authority.repeaterCaptures,
        },
      },
      candidates: nodeIds.map((nodeId) => {
        const node = flattenContractNodes(
          dataset.formContracts.find(
            ({ reference }) =>
              reference.contentHash === selection.owners.formContract.contentHash,
          )!.artifact.nodes,
        ).find(({ id }) => id === nodeId)!;
        return {
          nodeId,
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
          capabilities: [],
          included: [],
          details: {},
        };
      }),
      page: { collection: 'nodes', truncated: false },
      reason: {
        kind: 'node-ambiguous',
        totalMatches: nodeIds.length,
        nodeIds,
      },
    } as const;

    expect(parseAgentContextQueryResult(result)).toEqual(result);
    expect(JSON.parse(canonicalizeAgentContextQueryResult(result))).toEqual(
      result,
    );
    expect(() =>
      parseAgentContextQueryResult({ ...result, schemaVersion: '9.9.9' }),
    ).toThrow(/schemaVersion/u);
    expect(() =>
      parseAgentContextQueryResult({
        ...result,
        reason: {
          kind: 'node-ambiguous',
          totalMatches: nodeIds.length,
          nodeIds,
          severity: 'error',
        },
      }),
    ).toThrow(/severity/u);
    expect(() =>
      parseAgentContextQueryResult({
        ...result,
        operation: 'get-e2e-slice',
      }),
    ).toThrow(/operation|status|reason|candidates|authority/u);
  });
});

describe('safe bounded parsing', () => {
  it('rejects deep and oversized graphs with TypeError rather than recursion failure', () => {
    const { selection } = fixtureBoundary();
    const query = nodeQuery(selection);

    expect(() =>
      parseAgentContextQuery({
        ...query,
        extra: deeplyNestedDataGraph(129),
      }),
    ).toThrow(/maximum data graph depth of 128/u);
    expect(() =>
      parseAgentContextQuery({ ...query, extra: Array(100_001).fill(null) }),
    ).toThrow(/maximum data graph node count of 100000/u);
  });

  it('does not invoke getters or proxy traps while refusing unsafe input', () => {
    const { selection } = fixtureBoundary();
    const accessorInput = { ...nodeQuery(selection) } as Record<string, unknown>;
    let getterCalls = 0;
    Object.defineProperty(accessorInput, 'extra', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return true;
      },
    });
    expect(() => parseAgentContextQuery(accessorInput)).toThrow(/data property/u);
    expect(getterCalls).toBe(0);

    let proxyTrapCalls = 0;
    const proxyInput = new Proxy(nodeQuery(selection), {
      get() {
        proxyTrapCalls += 1;
        return undefined;
      },
    });
    expect(() => parseAgentContextQuery(proxyInput)).toThrow(/proxy/u);
    expect(proxyTrapCalls).toBe(0);
  });
});

describe('role-scoped live freshness', () => {
  it('evaluates aggregate usage-search freshness against the exact source-owner set', () => {
    const fixture = fixtureBoundary();
    const dataset = withAdditionalSourceUsageCatalog(fixture.dataset);
    const scope = usageSearchScope(dataset);
    const owners = createAgentContextUsageSearchScopeLiveOwners(scope);

    expect(
      evaluateAgentContextQueryFreshness({
        view: 'usage-search',
        scope,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners,
        },
      }),
    ).toBe('current');
    const sourceSet = owners.find(
      (owner) => owner.role === 'source-usage-catalog-set',
    );
    if (sourceSet?.role !== 'source-usage-catalog-set') {
      throw new Error('missing source usage owner set');
    }
    expect(
      evaluateAgentContextQueryFreshness({
        view: 'usage-search',
        scope,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: owners.map((owner) =>
            owner.role === 'source-usage-catalog-set'
              ? {
                  ...sourceSet,
                  references: sourceSet.references.map((reference, index) =>
                    index === 0
                      ? { ...reference, contentHash: HASH_ZERO }
                      : reference,
                  ),
                }
              : owner,
          ),
        },
      }),
    ).toBe('stale');

    for (const references of [
      sourceSet.references.slice(0, 1),
      [
        ...sourceSet.references,
        { ...sourceSet.references[0]!, contentHash: HASH_ZERO },
      ].sort(compareReference),
    ]) {
      expect(
        evaluateAgentContextQueryFreshness({
          view: 'usage-search',
          scope,
          live: {
            schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
            owners: owners.map((owner) =>
              owner.role === 'source-usage-catalog-set'
                ? { ...owner, references }
                : owner,
            ),
          },
        }),
      ).toBe('stale');
    }
    expect(() =>
      evaluateAgentContextQueryFreshness({
        view: 'usage-search',
        scope,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: owners.map((owner) =>
            owner.role === 'source-usage-catalog-set'
              ? { ...owner, references: [...owner.references].reverse() }
              : owner,
          ),
        },
      }),
    ).toThrow(/canonical|order|references/u);
  });

  it('returns current only when every role required by the view matches', () => {
    const { selection } = fixtureBoundary();
    const owners = createAgentContextPinnedLiveOwners(selection);

    expect(
      evaluateAgentContextQueryFreshness({
        view: 'e2e-slice',
        selection,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners,
        },
      }),
    ).toBe('current');

    const journeyOwners = owners.filter(({ role }) =>
      [
        'artifact-set',
        'workspace-index',
        'source-usage-catalog',
        'journey-catalog',
        'execution-authority',
      ].includes(role),
    );
    expect(
      evaluateAgentContextQueryFreshness({
        view: 'context-journey',
        selection,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: journeyOwners,
        },
      }),
    ).toBe('current');

    expect(
      evaluateAgentContextQueryFreshness({
        view: 'context-journey',
        selection,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: journeyOwners.filter(
            ({ role }) => role !== 'execution-authority',
          ),
        },
      }),
    ).toBe('unknown');

    const journeyWithIrrelevantScenarioDrift = owners
      .filter(({ role }) =>
        [
          'artifact-set',
          'workspace-index',
          'source-usage-catalog',
          'journey-catalog',
          'scenario-artifact',
          'execution-authority',
        ].includes(role),
      )
      .map((owner) =>
        owner.role === 'scenario-artifact'
          ? {
              ...owner,
              reference: { ...owner.reference, contentHash: HASH_ZERO },
            }
          : owner,
      );
    expect(
      evaluateAgentContextQueryFreshness({
        view: 'context-journey',
        selection,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: journeyWithIrrelevantScenarioDrift,
        },
      }),
    ).toBe('current');
  });

  it('gives a known stale role precedence over a missing required role', () => {
    const { selection } = fixtureBoundary();
    const owners = createAgentContextPinnedLiveOwners(selection);
    const staleForm = owners.find(
      (owner): owner is Extract<
        AgentContextLiveOwnerReference,
        { readonly role: 'form-contract' }
      > => owner.role === 'form-contract',
    );
    if (staleForm === undefined) throw new Error('missing form owner');
    const liveOwners = owners
      .filter(({ role }) => role !== 'journey-catalog')
      .map((owner) =>
        owner.role === 'form-contract'
          ? {
              ...staleForm,
              reference: { ...staleForm.reference, contentHash: HASH_ZERO },
            }
          : owner,
      );

    expect(
      evaluateAgentContextQueryFreshness({
        view: 'e2e-slice',
        selection,
        live: {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          owners: liveOwners,
        },
      }),
    ).toBe('stale');
  });

  it('returns unknown for missing required live owners even when revision matches', () => {
    const { dataset, selection } = fixtureBoundary();
    const scope = usageSearchScope(dataset);
    const live = parseAgentContextLiveOwnerState({
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      repositoryRevision: dataset.artifactSet.repositoryRevision,
      owners: [],
    });

    expect(
      evaluateAgentContextQueryFreshness({
        view: 'usage-search',
        scope,
        live,
      }),
    ).toBe('unknown');

    expect(selection).toBeDefined();
  });

  it('does not invoke freshness-wrapper getters or proxy traps', () => {
    const { selection } = fixtureBoundary();
    const live = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      owners: createAgentContextPinnedLiveOwners(selection),
    };
    let getterCalls = 0;
    const accessorInput: Record<string, unknown> = { selection, live };
    Object.defineProperty(accessorInput, 'view', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'e2e-slice';
      },
    });
    expect(() =>
      evaluateAgentContextQueryFreshness(
        accessorInput as Parameters<
          typeof evaluateAgentContextQueryFreshness
        >[0],
      ),
    ).toThrow(/data property/u);
    expect(getterCalls).toBe(0);

    let proxyTrapCalls = 0;
    const proxyInput = new Proxy(
      { view: 'e2e-slice', selection, live } as const,
      {
        get() {
          proxyTrapCalls += 1;
          return undefined;
        },
      },
    );
    expect(() => evaluateAgentContextQueryFreshness(proxyInput)).toThrow(
      /proxy/u,
    );
    expect(proxyTrapCalls).toBe(0);
  });
});
