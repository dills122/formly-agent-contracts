import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  canonicalizeAgentContextQueryDataset,
  canonicalizeAgentContextQuery,
  canonicalizeAgentContextQueryResult,
  canonicalizeAgentContextQuerySelection,
  createAgentContextPinnedLiveOwners,
  evaluateAgentContextQueryFreshness,
  parseAgentContextLiveOwnerState,
  parseAgentContextQuery,
  parseAgentContextQueryDataset,
  parseAgentContextQueryResult,
  parseAgentContextQuerySelection,
  validateAgentContextQuerySelection,
  type AgentContextLiveOwnerReference,
  type AgentContextQueryDataset,
  type AgentContextQuerySelection,
} from './agent-context-query.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
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
});

describe('agent-context query and result DTOs', () => {
  it('strictly parses and canonically round-trips a bounded node query', () => {
    const { selection } = fixtureBoundary();
    const query = nodeQuery(selection);

    const parsed = parseAgentContextQuery(query);
    const canonical = canonicalizeAgentContextQuery(query);

    expect(parsed).toEqual(query);
    expect(JSON.parse(canonical)).toEqual(query);
  });

  it('confines source paths and bounds presentation payloads', () => {
    expect(() =>
      parseAgentContextQuery({
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'search-form-usages',
        filters: { sourcePath: '../outside.ts' },
        page: { collection: 'candidates', limit: 25 },
      }),
    ).toThrow(/sourcePath/u);
    expect(() =>
      parseAgentContextQuery({
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'search-form-usages',
        filters: { text: 'x'.repeat(4_097) },
        page: { collection: 'candidates', limit: 25 },
      }),
    ).toThrow(/4096|4,096/u);
  });

  it('accepts only operation-specific result statuses and reason variants', () => {
    const { selection } = fixtureBoundary();
    const nodeIds = [
      'synthetic.rh05.operations.purchase-order::path:s_currency',
      'synthetic.rh05.operations.purchase-order::path:s_supplier',
    ];
    const result = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status: 'ambiguous',
      selection,
      freshness: 'current',
      candidates: nodeIds.map((nodeId) => ({ nodeId, modelPath: [] })),
      page: { collection: 'nodes', truncated: false },
      reason: { kind: 'node-ambiguous', nodeIds },
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
    ).toThrow(/operation|status|reason|candidates/u);
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

    const journeyWithIrrelevantScenarioDrift = journeyOwners.concat({
      role: 'scenario-artifact',
      reference: {
        ...selection.owners.scenarioArtifact,
        contentHash: HASH_ZERO,
      },
      scenario: selection.scenario,
    });
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
    const live = parseAgentContextLiveOwnerState({
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      repositoryRevision: dataset.artifactSet.repositoryRevision,
      owners: [],
    });

    expect(
      evaluateAgentContextQueryFreshness({
        view: 'usage-search',
        selection,
        live,
      }),
    ).toBe('unknown');
  });
});
