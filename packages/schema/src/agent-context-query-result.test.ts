import { describe, expect, it } from 'vitest';

import type { AgentContextArtifactReference } from './agent-context-artifacts.js';
import {
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  canonicalizeAgentContextQueryResult,
  parseAgentContextQueryResult,
  type AgentContextQuerySelection,
  type AgentContextUsageSearchScope,
} from './agent-context-query.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  type AgentContextExecutionAuthority,
} from './agent-context-execution-authority.js';
import {
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
} from './agent-context-usage.js';
import { createSyntheticRh05AgentContextFixtureSet } from './agent-context-walkthrough-fixtures.js';
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
  const selection: AgentContextQuerySelection = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: {
      schemaVersion: fixture.artifactSet.schemaVersion,
      contentHash: fixture.artifactSet.contentHash,
    },
    workspaceIndex: fixture.workspaceIndex,
    owners: {
      sourceUsageCatalog,
      journeyCatalog: exactReference(
        fixture.artifactSet.artifacts,
        AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
        AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
        fixture.journeyCatalog.contentHash,
      ),
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
  const nodes = flattenNodes(walkthrough.declaredContract.nodes);
  const step = walkthrough.executionAuthority.usage.steps[0];
  if (step === undefined) throw new Error('positive authority needs a step');
  const focusNode = nodes.find(({ id }) => step.nodeIds.includes(id));
  if (focusNode === undefined) throw new Error('positive authority needs a node');
  return {
    fixture,
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
  const effects = (value.walkthrough.declaredContract.declaredEffects ?? []).filter(
    ({ trigger, target }) => trigger.nodeId === node.id || target.nodeId === node.id,
  );
  const diagnostics = value.walkthrough.declaredContract.diagnostics.filter(
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
    capabilities: [],
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
  } as const;
  return {
    value,
    candidate,
    node,
    authority,
    searchBase,
    contextBase,
    nodeBase,
    sliceBase,
  };
}

describe('agent-context query result contract', () => {
  it('round-trips bounded full node aspects, atomic journey authority, and a concrete E2E slice', () => {
    const { value, authority, nodeBase, contextBase, sliceBase } = baseResults();
    const node = nodeProjection(value, value.focusNode, true);
    const nodeResult = {
      ...nodeBase,
      status: 'complete',
      authority,
      candidates: [node],
      page: { collection: 'nodes', truncated: false },
    } as const;
    const journeyResult = {
      ...contextBase,
      status: 'complete',
      view: 'journey',
      journey: { identity: value.selection.journey, execution: authority.usage },
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
        authority,
        focusNodes: complete([node]),
        closureNodes: complete(closureNodes),
        prerequisites: complete([
          { kind: 'readiness', node: readinessNode, readiness },
        ]),
        effects: complete(
          value.walkthrough.declaredContract.declaredEffects ?? [],
        ),
      },
    } as const;

    for (const result of [nodeResult, journeyResult, sliceResult]) {
      expect(parseAgentContextQueryResult(result)).toEqual(result);
      expect(JSON.parse(canonicalizeAgentContextQueryResult(result))).toEqual(
        result,
      );
    }
  });

  it('accepts every operation/status/view/page/result variant', () => {
    const {
      value,
      candidate,
      node,
      authority,
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
    const results: readonly unknown[] = [
      {
        ...searchBase,
        status: 'complete',
        candidates: [candidate],
        page: { collection: 'candidates', truncated: true, nextCursor: 'acq1.x.y' },
      },
      {
        ...searchBase,
        status: 'ambiguous',
        candidates: usageCandidates,
        page: { collection: 'candidates', truncated: false },
        reason: { kind: 'usage-ambiguous', usages: usageIdentities },
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
        reasons: [{ kind: 'atomic-record-too-large' }],
        page: { collection: 'diagnostics', truncated: false },
      },
      {
        ...contextBase,
        status: 'complete',
        view: 'journey',
        journey: {
          identity: value.selection.journey,
          execution: authority.usage,
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
        authority,
        candidates: [node],
        page: { collection: 'nodes', truncated: false },
      },
      {
        ...nodeBase,
        status: 'ambiguous',
        authority,
        candidates: nodeCandidates,
        page: { collection: 'nodes', truncated: false },
        reason: { kind: 'node-ambiguous', nodeIds },
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
          authority,
          focusNodes: complete([node]),
          closureNodes: complete([node]),
          prerequisites: complete([]),
          effects: complete([]),
        },
      },
      ...([
        { kind: 'step-scope-mismatch', nodeIds: [node.nodeId] },
        {
          kind: 'cross-step-prerequisite-required',
          fromStepId: 'entry',
          transitionId: 'entry.next',
          toStepId: 'review',
        },
        {
          kind: 'cross-step-transition-ambiguous',
          transitionIds: ['entry.next-a', 'entry.next-b'],
        },
        {
          kind: 'cross-step-transition-unavailable',
          fromStepId: 'entry',
          toStepId: 'review',
        },
        { kind: 'prerequisite-cycle', nodeIds: [node.nodeId] },
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
        execution: {
          ...authority.usage,
          entry: { ...authority.usage.entry, landingStepId: 'missing.step' },
        },
      },
    } as const;
    expect(() => parseAgentContextQueryResult(badJourney)).toThrow(
      /landingStepId|step/u,
    );

    const duplicateReasons = {
      ...contextBase,
      status: 'complete',
      view: 'diagnostics',
      reasons: [
        { kind: 'atomic-record-too-large' },
        { kind: 'atomic-record-too-large' },
      ],
      page: { collection: 'diagnostics', truncated: false },
    } as const;
    expect(() => parseAgentContextQueryResult(duplicateReasons)).toThrow(
      /reason|duplicate|canonical/u,
    );

    const slice = {
      withinStepId: value.step.id,
      authority,
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
        authority,
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
  });

  it('rejects result authority that drifts from the pinned selection', () => {
    const { value, node, authority, nodeBase } = baseResults();
    const driftedAuthority = {
      ...authority,
      basis: {
        ...authority.basis,
        contractHash: `sha256:${'0'.repeat(64)}`,
      },
    } as AgentContextExecutionAuthority;
    expect(() =>
      parseAgentContextQueryResult({
        ...nodeBase,
        status: 'complete',
        authority: driftedAuthority,
        candidates: [node],
        page: { collection: 'nodes', truncated: false },
      }),
    ).toThrow(/authority|contentHash|basis/u);

    expect(value.selection).toBeDefined();
  });
});
