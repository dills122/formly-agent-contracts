import { types as utilTypes } from 'node:util';

import {
  AGENT_CONTEXT_QUERY_CURSOR_MAX_SIGNING_BYTES,
  AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS,
  AGENT_CONTEXT_QUERY_CURSOR_MIN_SIGNING_BYTES,
  createAgentContextQueryCursor,
  parseAgentContextQueryCursor,
} from './agent-context-query-cursor.js';
import {
  AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE,
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  evaluateAgentContextQueryFreshness,
  parseAgentContextLiveOwnerState,
  parseAgentContextQuery,
  parseAgentContextQueryDataset,
  validateAgentContextQueryResultAgainstParsedDataset,
  validateAgentContextQuerySelectionAgainstParsedDataset,
  validateAgentContextUsageSearchScopeAgainstParsedDataset,
  type AgentContextArtifactSetIdentity,
  type AgentContextExecutionAuthoritySelection,
  type AgentContextFreshness,
  type AgentContextCompleteCollection,
  type AgentContextContextSummaryProjection,
  type AgentContextDiagnosticEvidenceProjection,
  type AgentContextExecutionAuthorityProjection,
  type AgentContextFindNodeFilters,
  type AgentContextNodeCandidateProjection,
  type AgentContextNodeDetailAspect,
  type AgentContextPageableCollection,
  type AgentContextPageResult,
  type AgentContextQuery,
  type AgentContextQueryCapability,
  type AgentContextQueryDataset,
  type AgentContextQueryResult,
  type AgentContextQuerySelection,
  type AgentContextSearchUsageFilters,
  type AgentContextUsageCandidateProjection,
  type FindFormNodesQuery,
  type FindFormNodesResult,
  type GetFormContextQuery,
  type GetFormContextResult,
  type SearchFormUsagesQuery,
  type SearchFormUsagesResult,
} from './agent-context-query.js';
import type { AgentContextArtifactReference } from './agent-context-artifacts.js';
import type { AgentContextExecutionAuthority } from './agent-context-execution-authority.js';
import type {
  AgentContextJourney,
  AgentContextSourceUsage,
} from './agent-context-usage.js';
import { canonicalStringify } from './canonical-json.js';
import type { ContractNode, FormContract } from './contract.js';

export interface AgentContextQueryPaginationRuntime {
  readonly now: number;
  readonly ttlMs: number;
  readonly signingMaterial: string;
}

interface SelectionOwners {
  readonly scenarioArtifact: FormContract;
  readonly authority: AgentContextExecutionAuthority;
}

const PAGINATION_KEYS = new Set(['now', 'ttlMs', 'signingMaterial']);
const MAX_ATOMIC_RECORD_GRAPH_NODES = 10_000;
const MAX_ATOMIC_VIEW_GRAPH_NODES = 100_000;

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function graphExceeds(input: unknown, maximum: number): boolean {
  let count = 1;
  const pending: unknown[] = [input];
  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value !== 'object' || value === null) continue;
    for (const descriptor of Object.values(
      Object.getOwnPropertyDescriptors(value),
    )) {
      if (!descriptor.enumerable || !('value' in descriptor)) continue;
      count += 1;
      if (count > maximum) return true;
      pending.push(descriptor.value);
    }
  }
  return false;
}

function hasOversizedCollection(input: unknown): boolean {
  const pending: unknown[] = [input];
  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value !== 'object' || value === null) continue;
    if (
      Array.isArray(value) &&
      value.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE
    ) {
      return true;
    }
    for (const descriptor of Object.values(
      Object.getOwnPropertyDescriptors(value),
    )) {
      if (!descriptor.enumerable || !('value' in descriptor)) continue;
      pending.push(descriptor.value);
    }
  }
  return false;
}

function recordIsOversized(input: unknown): boolean {
  return (
    hasOversizedCollection(input) ||
    graphExceeds(input, MAX_ATOMIC_RECORD_GRAPH_NODES)
  );
}

function referenceKey(reference: AgentContextArtifactReference): string {
  return `${reference.schemaId}\0${reference.schemaVersion}\0${reference.contentHash}`;
}

function parsePaginationRuntime(
  input: unknown,
): AgentContextQueryPaginationRuntime {
  const path = 'agentContextQueryPagination';
  if (
    ((typeof input === 'object' && input !== null) ||
      typeof input === 'function') &&
    utilTypes.isProxy(input)
  ) {
    fail(path, 'must not be a proxy.');
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be a flat object.');
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object or null-prototype object.');
  }
  if (Object.getOwnPropertySymbols(input).length > 0) {
    fail(path, 'must not contain symbol-keyed properties.');
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const value: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [key, descriptor] of Object.entries(descriptors)) {
    const propertyPath = `${path}.${key}`;
    if (!PAGINATION_KEYS.has(key)) fail(propertyPath, 'is not supported.');
    if (!descriptor.enumerable) fail(propertyPath, 'must be enumerable.');
    if (!('value' in descriptor))
      fail(propertyPath, 'must be a data property.');
    value[key] = descriptor.value;
  }
  for (const key of PAGINATION_KEYS) {
    if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'is required.');
  }
  const now = value.now;
  if (!Number.isSafeInteger(now) || Number(now) < 0) {
    fail(`${path}.now`, 'must be a non-negative safe integer.');
  }
  const ttlMs = value.ttlMs;
  if (
    !Number.isSafeInteger(ttlMs) ||
    Number(ttlMs) <= 0 ||
    Number(ttlMs) > AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS ||
    !Number.isSafeInteger(Number(now) + Number(ttlMs))
  ) {
    fail(
      `${path}.ttlMs`,
      `must be 1-${AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS}.`,
    );
  }
  const signingMaterial = value.signingMaterial;
  if (typeof signingMaterial !== 'string') {
    fail(`${path}.signingMaterial`, 'must be a string.');
  }
  const signingBytes = Buffer.byteLength(signingMaterial, 'utf8');
  if (
    signingBytes < AGENT_CONTEXT_QUERY_CURSOR_MIN_SIGNING_BYTES ||
    signingBytes > AGENT_CONTEXT_QUERY_CURSOR_MAX_SIGNING_BYTES
  ) {
    fail(
      `${path}.signingMaterial`,
      `must contain ${AGENT_CONTEXT_QUERY_CURSOR_MIN_SIGNING_BYTES}-${AGENT_CONTEXT_QUERY_CURSOR_MAX_SIGNING_BYTES} UTF-8 bytes.`,
    );
  }
  return {
    now: Object.is(now, -0) ? 0 : Number(now),
    ttlMs: Number(ttlMs),
    signingMaterial,
  };
}

function isPageable(query: AgentContextQuery): boolean {
  return !(
    query.operation === 'get-e2e-slice' ||
    (query.operation === 'get-form-context' && query.view === 'journey')
  );
}

function findOwner<
  T extends { readonly reference: AgentContextArtifactReference },
>(
  entries: readonly T[],
  reference: AgentContextArtifactReference,
  path: string,
): T {
  const key = referenceKey(reference);
  const owners = entries.filter(
    ({ reference: candidate }) => referenceKey(candidate) === key,
  );
  if (owners.length !== 1) fail(path, 'must resolve exactly one owner.');
  return owners[0]!;
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

function artifactSetIdentity(
  dataset: AgentContextQueryDataset,
): AgentContextArtifactSetIdentity {
  return {
    schemaVersion: dataset.artifactSet.schemaVersion,
    contentHash: dataset.artifactSet.contentHash,
  };
}

function selectionAuthorityIdentity(
  authority: AgentContextExecutionAuthority,
): AgentContextExecutionAuthoritySelection {
  return {
    usageId: authority.usage.id,
    usageVersion: authority.usage.version,
    basis: authority.basis,
  };
}

function enumerateSelections(
  dataset: AgentContextQueryDataset,
  sourceUsageCatalog: AgentContextArtifactReference,
  usage: AgentContextSourceUsage,
): readonly AgentContextQuerySelection[] {
  if (
    usage.identity.kind !== 'declared' ||
    usage.resolution.status !== 'exact'
  ) {
    return [];
  }
  const form = usage.resolution.candidate.form;
  const declaredOwners = dataset.formContracts.filter(
    ({ reference, artifact }) =>
      reference.contentHash === form.contractHash &&
      artifact.formId === form.formId &&
      artifact.contentHash === form.contractHash,
  );
  const selections: AgentContextQuerySelection[] = [];
  for (const declaredOwner of declaredOwners) {
    for (const journeyOwner of dataset.journeyCatalogs) {
      for (const journey of journeyOwner.artifact.journeys) {
        if (!sameJson(journey.entry.usage, usage.identity)) continue;
        for (const authorityOwner of dataset.executionAuthorities) {
          const authority = authorityOwner.artifact;
          if (
            authority.usage.id !== usage.identity.usageId ||
            authority.usage.version !== usage.identity.version ||
            authority.basis.formId !== form.formId ||
            authority.basis.contractHash !== form.contractHash
          ) {
            continue;
          }
          const scenarioOwners = dataset.formContracts.filter(
            ({ reference, artifact }) =>
              reference.contentHash === authority.scenario.artifactHash &&
              artifact.contentHash === authority.scenario.artifactHash &&
              artifact.formId === form.formId,
          );
          for (const scenarioOwner of scenarioOwners) {
            const selection: AgentContextQuerySelection = {
              schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
              artifactSet: artifactSetIdentity(dataset),
              workspaceIndex: dataset.artifactSet.workspaceIndex,
              owners: {
                sourceUsageCatalog,
                journeyCatalog: journeyOwner.reference,
                formContract: declaredOwner.reference,
                scenarioArtifact: scenarioOwner.reference,
                executionAuthority: authorityOwner.reference,
              },
              usage: usage.identity,
              journey: { id: journey.id, version: journey.version },
              form,
              scenario: authority.scenario,
              executionAuthority: selectionAuthorityIdentity(authority),
            };
            try {
              selections.push(
                validateAgentContextQuerySelectionAgainstParsedDataset(
                  dataset,
                  selection,
                ),
              );
            } catch {
              // A structurally plausible owner path is not a handoff unless all
              // exact selection joins validate. Invalid paths remain absent.
            }
          }
        }
      }
    }
  }
  const byCanonical = new Map<string, AgentContextQuerySelection>();
  for (const selection of selections) {
    byCanonical.set(canonicalStringify(selection), selection);
  }
  return [...byCanonical.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, selection]) => selection);
}

function sourceTextCorpus(usage: AgentContextSourceUsage): readonly string[] {
  const values: string[] = [usage.identity.kind, usage.projectId];
  if (usage.identity.kind === 'declared') {
    values.push(usage.identity.usageId, String(usage.identity.version));
  } else {
    values.push(usage.identity.projectId, usage.identity.callsiteKey);
  }
  const { location, symbol, syntaxKind, syntaxToken } = usage.invocation;
  values.push(
    location.kind,
    symbol.id,
    symbol.kind,
    syntaxKind,
    syntaxToken.kind,
    String(syntaxToken.version),
    syntaxToken.calleeForm,
    String(syntaxToken.argumentCount),
    String(syntaxToken.typeArgumentCount),
    String(syntaxToken.optionalCall),
  );
  if (location.kind === 'path') {
    values.push(
      location.pathMode,
      location.path,
      String(location.span.start.line),
      String(location.span.start.column),
      String(location.span.end.line),
      String(location.span.end.column),
    );
  } else if (location.kind === 'module') {
    values.push(location.moduleId);
    if (location.exportName !== undefined) values.push(location.exportName);
  } else {
    values.push(location.fileId);
  }
  const candidates =
    usage.resolution.status === 'exact'
      ? [usage.resolution.candidate]
      : usage.resolution.status === 'ambiguous'
      ? usage.resolution.candidates
      : [];
  for (const candidate of candidates) {
    values.push(
      candidate.root.projectId,
      candidate.root.rootAnchorId,
      candidate.form.projectId,
      candidate.form.formId,
    );
  }
  for (const context of usage.contexts) values.push(context.kind, context.id);
  return values;
}

function collectExecutableCapabilities(
  authority: AgentContextExecutionAuthority,
): readonly AgentContextQueryCapability[] {
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
    .filter(
      (capability, index, capabilities) =>
        capabilities.indexOf(capability) === index,
    )
    .sort(compareText);
}

function selectedOwners(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
): SelectionOwners {
  return {
    scenarioArtifact: findOwner(
      dataset.formContracts,
      selection.owners.scenarioArtifact,
      'agentContextQueryCore.selection.owners.scenarioArtifact',
    ).artifact,
    authority: findOwner(
      dataset.executionAuthorities,
      selection.owners.executionAuthority,
      'agentContextQueryCore.selection.owners.executionAuthority',
    ).artifact,
  };
}

function selectedJourney(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
): AgentContextJourney {
  const catalog = findOwner(
    dataset.journeyCatalogs,
    selection.owners.journeyCatalog,
    'agentContextQueryCore.selection.owners.journeyCatalog',
  ).artifact;
  const journeys = catalog.journeys.filter(
    ({ id, version }) =>
      id === selection.journey.id && version === selection.journey.version,
  );
  if (journeys.length !== 1)
    fail('agentContextQueryCore.journey', 'is missing.');
  return journeys[0]!;
}

function handoffTextCorpus(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
): readonly string[] {
  const journey = selectedJourney(dataset, selection);
  const { scenarioArtifact, authority } = selectedOwners(dataset, selection);
  const values: string[] = [
    journey.id,
    String(journey.version),
    selection.scenario.id,
    String(selection.scenario.version),
  ];
  for (const step of journey.steps.filter((candidate) =>
    candidate.usages.some((usage) => sameJson(usage, selection.usage)),
  )) {
    values.push(step.id);
    if (step.label !== undefined) values.push(step.label);
  }
  for (const node of flattenNodes(scenarioArtifact.nodes)) {
    values.push(node.id, node.kind, ...node.modelPath.map(String));
    if (node.formlyType !== undefined) values.push(node.formlyType);
    if (node.semanticType !== undefined) values.push(node.semanticType);
    if (node.presentation?.label !== undefined)
      values.push(node.presentation.label);
    if (node.presentation?.description !== undefined) {
      values.push(node.presentation.description);
    }
    if (node.presentation?.placeholder !== undefined) {
      values.push(node.presentation.placeholder);
    }
    values.push(...collectNodeCapabilities(authority, node.id));
  }
  values.push(...collectExecutableCapabilities(authority));
  return values;
}

function collectNodeCapabilities(
  authority: AgentContextExecutionAuthority,
  nodeId: string,
): readonly AgentContextQueryCapability[] {
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
    .filter(
      (capability, index, capabilities) =>
        capabilities.indexOf(capability) === index,
    )
    .sort(compareText);
}

function exactModelPath(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): boolean {
  return sameJson(left, right);
}

function handoffMatches(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  filters: AgentContextSearchUsageFilters,
  sourceTextMatched: boolean,
): boolean {
  const journey = selectedJourney(dataset, selection);
  const { scenarioArtifact, authority } = selectedOwners(dataset, selection);
  if (
    filters.stepId !== undefined &&
    !journey.steps.some(
      (step) =>
        step.id === filters.stepId &&
        step.usages.some((usage) => sameJson(usage, selection.usage)),
    )
  ) {
    return false;
  }
  if (
    filters.scenarioId !== undefined &&
    filters.scenarioId !== selection.scenario.id
  ) {
    return false;
  }
  if (filters.modelPath !== undefined || filters.label !== undefined) {
    const matchedNode = flattenNodes(scenarioArtifact.nodes).some(
      (node) =>
        (filters.modelPath === undefined ||
          exactModelPath(node.modelPath, filters.modelPath)) &&
        (filters.label === undefined ||
          node.presentation?.label?.includes(filters.label) === true),
    );
    if (!matchedNode) return false;
  }
  if (
    filters.capabilities !== undefined &&
    !filters.capabilities.every((capability) =>
      collectExecutableCapabilities(authority).includes(capability),
    )
  ) {
    return false;
  }
  return (
    filters.text === undefined ||
    sourceTextMatched ||
    handoffTextCorpus(dataset, selection).some((text) =>
      text.includes(filters.text!),
    )
  );
}

function sourceMatches(
  usage: AgentContextSourceUsage,
  filters: AgentContextSearchUsageFilters,
): boolean {
  if (
    filters.sourcePath !== undefined &&
    (usage.invocation.location.kind !== 'path' ||
      usage.invocation.location.path !== filters.sourcePath)
  ) {
    return false;
  }
  if (
    filters.sourceLine !== undefined &&
    (usage.invocation.location.kind !== 'path' ||
      usage.invocation.location.span.start.line !== filters.sourceLine)
  ) {
    return false;
  }
  if (
    filters.sourceColumn !== undefined &&
    (usage.invocation.location.kind !== 'path' ||
      usage.invocation.location.span.start.column !== filters.sourceColumn)
  ) {
    return false;
  }
  if (
    filters.usageId !== undefined &&
    (usage.identity.kind !== 'declared' ||
      usage.identity.usageId !== filters.usageId)
  ) {
    return false;
  }
  if (
    filters.formId !== undefined &&
    (usage.resolution.status !== 'exact' ||
      usage.resolution.candidate.form.formId !== filters.formId)
  ) {
    return false;
  }
  if (
    filters.routeId !== undefined &&
    !usage.contexts.some(
      ({ kind, id }) => kind === 'route' && id === filters.routeId,
    )
  ) {
    return false;
  }
  return true;
}

function searchFreshness(
  query: SearchFormUsagesQuery,
  live: unknown,
): AgentContextFreshness {
  return evaluateAgentContextQueryFreshness({
    view: 'usage-search',
    scope: query.scope,
    live,
  });
}

function authenticateCursor<Collection extends AgentContextPageableCollection>(
  query: AgentContextQuery,
  collection: Collection,
  cursor: string | undefined,
  runtime: AgentContextQueryPaginationRuntime,
): number | undefined {
  return cursor === undefined
    ? undefined
    : parseAgentContextQueryCursor({
        cursor,
        collection,
        query,
        now: runtime.now,
        signingMaterial: runtime.signingMaterial,
      }).position;
}

function paginate<Collection extends AgentContextPageableCollection, T>(
  query: AgentContextQuery,
  collection: Collection,
  limit: number,
  continuationPosition: number | undefined,
  items: readonly T[],
  runtime: AgentContextQueryPaginationRuntime,
): {
  readonly items: readonly T[];
  readonly page: AgentContextPageResult<Collection>;
} {
  const position = continuationPosition ?? 0;
  if (continuationPosition !== undefined && position >= items.length) {
    fail('agentContextQueryCursor.position', 'is outside the result range.');
  }
  const end = Math.min(position + limit, items.length);
  const pageItems = items.slice(position, end);
  if (end >= items.length) {
    return {
      items: pageItems,
      page: { collection, truncated: false },
    };
  }
  return {
    items: pageItems,
    page: {
      collection,
      truncated: true,
      nextCursor: createAgentContextQueryCursor({
        collection,
        query,
        position: end,
        now: runtime.now,
        ttlMs: runtime.ttlMs,
        signingMaterial: runtime.signingMaterial,
      }),
    },
  };
}

function executeUsageSearch(
  dataset: AgentContextQueryDataset,
  query: SearchFormUsagesQuery,
  live: unknown,
  runtime: AgentContextQueryPaginationRuntime,
): SearchFormUsagesResult {
  const scope = validateAgentContextUsageSearchScopeAgainstParsedDataset(
    dataset,
    query.scope,
  );
  const freshness = searchFreshness(query, live);
  const continuationPosition = authenticateCursor(
    query,
    query.page.collection,
    query.page.cursor,
    runtime,
  );
  const candidates: AgentContextUsageCandidateProjection[] = [];
  let excludedForUnavailableEvidence = false;
  const filterKeys = Object.keys(query.filters).sort(compareText);
  for (const catalogOwner of dataset.sourceUsageCatalogs) {
    for (const usage of catalogOwner.artifact.usages) {
      if (!sourceMatches(usage, query.filters)) continue;
      const sourceTextMatched =
        query.filters.text === undefined ||
        sourceTextCorpus(usage).some((text) =>
          text.includes(query.filters.text!),
        );
      const allHandoffs = enumerateSelections(
        dataset,
        catalogOwner.reference,
        usage,
      );
      const matchingHandoffs = allHandoffs.filter((selection) =>
        handoffMatches(dataset, selection, query.filters, sourceTextMatched),
      );
      const hasDependentFilter =
        query.filters.stepId !== undefined ||
        query.filters.modelPath !== undefined ||
        query.filters.label !== undefined ||
        query.filters.scenarioId !== undefined ||
        query.filters.capabilities !== undefined;
      const textMatched =
        query.filters.text === undefined ||
        sourceTextMatched ||
        matchingHandoffs.length > 0;
      if (
        (hasDependentFilter && matchingHandoffs.length === 0) ||
        !textMatched
      ) {
        if (
          allHandoffs.length === 0 &&
          (hasDependentFilter || !sourceTextMatched)
        ) {
          excludedForUnavailableEvidence = true;
        }
        continue;
      }
      const form =
        usage.resolution.status === 'exact'
          ? usage.resolution.candidate.form
          : undefined;
      const candidate: AgentContextUsageCandidateProjection = {
        usage: usage.identity,
        projectId: usage.projectId,
        ...(form === undefined ? {} : { form }),
        sourceUsageCatalog: catalogOwner.reference,
        selectionHandoffs: { complete: true, items: matchingHandoffs },
        matchReasons: { complete: true, items: filterKeys },
      };
      if (recordIsOversized(candidate)) {
        return {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          operation: 'search-form-usages',
          status: 'refused',
          scope,
          freshness,
          reason: { kind: 'atomic-record-too-large' },
        };
      }
      candidates.push(candidate);
      if (candidates.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE) {
        return {
          schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
          operation: 'search-form-usages',
          status: 'refused',
          scope,
          freshness,
          reason: { kind: 'atomic-record-too-large' },
        };
      }
    }
  }
  candidates.sort(
    (left, right) =>
      compareText(
        referenceKey(left.sourceUsageCatalog),
        referenceKey(right.sourceUsageCatalog),
      ) ||
      compareText(
        canonicalStringify(left.usage),
        canonicalStringify(right.usage),
      ),
  );
  const totalMatches = candidates.length;
  if (totalMatches === 0) {
    if (continuationPosition !== undefined) {
      fail('agentContextQueryCursor.position', 'is outside the result range.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status: 'not-found',
      scope,
      freshness,
      candidates: [],
      page: { collection: 'candidates', truncated: false },
      reason: {
        kind:
          dataset.sourceUsageCatalogs.every(
            ({ artifact }) => artifact.coverage.status === 'complete',
          ) && !excludedForUnavailableEvidence
            ? 'usage-absent-authoritative'
            : 'usage-absence-not-authoritative',
      },
    };
  }
  const page = paginate(
    query,
    query.page.collection,
    query.page.limit,
    continuationPosition,
    candidates,
    runtime,
  );
  const common = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'search-form-usages',
    scope,
    freshness,
    candidates: page.items,
    page: page.page,
  } as const;
  const result: SearchFormUsagesResult =
    totalMatches === 1
      ? { ...common, status: 'complete' }
      : {
          ...common,
          status: 'ambiguous',
          reason: {
            kind: 'usage-ambiguous',
            totalMatches,
            usages: page.items.map(({ sourceUsageCatalog, usage }) => ({
              sourceUsageCatalog,
              usage,
            })),
          },
        };
  if (graphExceeds(result, MAX_ATOMIC_VIEW_GRAPH_NODES)) {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status: 'refused',
      scope,
      freshness,
      reason: { kind: 'atomic-record-too-large' },
    };
  }
  return result;
}

function complete<T>(items: readonly T[]): AgentContextCompleteCollection<T> {
  return { complete: true, items };
}

function projectExecutionAuthority(
  selection: AgentContextQuerySelection,
  authority: AgentContextExecutionAuthority,
  nodeIds: readonly string[],
  projectionScope: 'nodes' | 'complete-usage' = 'nodes',
): AgentContextExecutionAuthorityProjection {
  const completeUsage = projectionScope === 'complete-usage';
  const requestedNodeIds = new Set(nodeIds);
  const steps = completeUsage
    ? authority.usage.steps
    : authority.usage.steps.filter(
        (step) =>
          step.id === authority.usage.entry.landingStepId ||
          step.nodeIds.some((nodeId) => requestedNodeIds.has(nodeId)),
      );
  const stepIds = new Set(steps.map(({ id }) => id));
  const actionIds = new Set(steps.flatMap(({ actionIds: ids }) => ids));
  const actions = completeUsage
    ? authority.usage.actions
    : authority.usage.actions.filter(({ id }) => actionIds.has(id));
  const outcomeIds = new Set(actions.flatMap(({ outcomeIds: ids }) => ids));
  const outcomes = completeUsage
    ? authority.usage.outcomes
    : authority.usage.outcomes.filter(({ id }) => outcomeIds.has(id));
  const transitions = completeUsage
    ? authority.usage.transitions
    : authority.usage.transitions.filter(
        ({ fromStepId, actionId, outcomeId, toStepId }) =>
          stepIds.has(fromStepId) &&
          actionIds.has(actionId) &&
          outcomeIds.has(outcomeId) &&
          stepIds.has(toStepId),
      );
  const interactions = completeUsage
    ? authority.interactions
    : authority.interactions.filter(({ nodeId }) =>
        requestedNodeIds.has(nodeId),
      );
  const interactionIds = new Set(interactions.map(({ id }) => id));
  const repeaterCaptures = completeUsage
    ? authority.repeaterCaptures
    : authority.repeaterCaptures.filter(({ repeaterNodeId }) =>
        requestedNodeIds.has(repeaterNodeId),
      );
  const repeaterCaptureIds = new Set(repeaterCaptures.map(({ id }) => id));
  const readiness = completeUsage
    ? authority.readiness
    : authority.readiness.filter(({ owner }) =>
        owner.kind === 'interaction'
          ? interactionIds.has(owner.interactionId)
          : repeaterCaptureIds.has(owner.repeaterCaptureId),
      );
  const commits = completeUsage
    ? authority.commits
    : authority.commits.filter(
        ({ nodeId, interactionId }) =>
          requestedNodeIds.has(nodeId) && interactionIds.has(interactionId),
      );
  const validationSurfaces = completeUsage
    ? authority.validationSurfaces
    : authority.validationSurfaces.filter(({ nodeId }) =>
        requestedNodeIds.has(nodeId),
      );
  const valueAssertions = completeUsage
    ? authority.valueAssertions
    : authority.valueAssertions.filter(({ nodeId }) =>
        requestedNodeIds.has(nodeId),
      );
  const stateAssertions = completeUsage
    ? authority.stateAssertions
    : authority.stateAssertions.filter(({ nodeId }) =>
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
    owner: selection.owners.executionAuthority,
    entry: authority.usage.entry,
    steps: complete(steps),
    actions: complete(actions),
    outcomes: complete(outcomes),
    transitions: complete(transitions),
    physicalOperations: complete(
      completeUsage
        ? authority.physicalOperations
        : authority.physicalOperations.filter(({ id }) =>
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
  };
}

function authorityProjectionHasOversizedRecord(
  projection: AgentContextExecutionAuthorityProjection,
): boolean {
  const collections = [
    projection.steps.items,
    projection.actions.items,
    projection.outcomes.items,
    projection.transitions.items,
    projection.physicalOperations.items,
    projection.readiness.items,
    projection.interactions.items,
    projection.commits.items,
    projection.validationSurfaces.items,
    projection.valueAssertions.items,
    projection.stateAssertions.items,
    projection.repeaterCaptures.items,
  ];
  return (
    collections.some(
      (items) => items.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE,
    ) || [projection.entry, ...collections.flat()].some(recordIsOversized)
  );
}

function projectContextSummary(
  selection: AgentContextQuerySelection,
  scenarioArtifact: FormContract,
  authority: AgentContextExecutionAuthority,
): AgentContextContextSummaryProjection {
  const nodes = flattenNodes(scenarioArtifact.nodes);
  const diagnostics = scenarioArtifact.diagnostics;
  const interactionProfiles = nodes.reduce(
    (count, node) => count + (node.interactionProfile?.unknowns.length ?? 0),
    0,
  );
  const effectAnalysisReasons =
    scenarioArtifact.effectAnalysis?.reasons.length ?? 0;
  const effectAnalysisUnreported =
    scenarioArtifact.effectAnalysis === undefined ? 1 : 0;
  return {
    usageEntry: {
      usage: selection.usage,
      entryId: authority.usage.entry.id,
      landingStepId: authority.usage.entry.landingStepId,
      capability: 'open-usage',
    },
    form: { identity: selection.form, nodeCount: nodes.length },
    diagnosticEvidenceCounts: {
      total: diagnostics.length,
      warnings: diagnostics.filter(({ severity }) => severity === 'warning')
        .length,
      errors: diagnostics.filter(({ severity }) => severity === 'error').length,
    },
    executableCapabilities: complete(collectExecutableCapabilities(authority)),
    scenarioIds: complete([selection.scenario.id]),
    effectAnalysis:
      scenarioArtifact.effectAnalysis === undefined
        ? { state: 'not-reported' }
        : { state: 'reported', analysis: scenarioArtifact.effectAnalysis },
    unknownEvidenceCounts: {
      total:
        diagnostics.length +
        interactionProfiles +
        effectAnalysisReasons +
        effectAnalysisUnreported,
      diagnostics: diagnostics.length,
      interactionProfiles,
      effectAnalysisReasons,
      effectAnalysisUnreported,
    },
  };
}

function diagnosticEvidence(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
): readonly AgentContextDiagnosticEvidenceProjection[] {
  const uniqueOwners = new Map<string, AgentContextArtifactReference>();
  for (const reference of [
    selection.owners.formContract,
    selection.owners.scenarioArtifact,
  ]) {
    uniqueOwners.set(referenceKey(reference), reference);
  }
  const projections = [...uniqueOwners.values()]
    .flatMap((owner): readonly AgentContextDiagnosticEvidenceProjection[] => {
      const artifact = findOwner(
        dataset.formContracts,
        owner,
        'agentContextQueryCore.diagnostics.owner',
      ).artifact;
      return [
        ...artifact.diagnostics.map((diagnostic) => ({
          kind: 'contract-diagnostic' as const,
          owner,
          diagnostic,
        })),
        ...(artifact.effectAnalysis === undefined
          ? []
          : [
              {
                kind: 'effect-analysis' as const,
                owner,
                analysis: artifact.effectAnalysis,
              },
            ]),
      ];
    });
  const byCanonical = new Map<string, AgentContextDiagnosticEvidenceProjection>();
  for (const projection of projections) {
    byCanonical.set(canonicalStringify(projection), projection);
  }
  return [...byCanonical.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, projection]) => projection);
}

function selectionFreshness(
  selection: AgentContextQuerySelection,
  view:
    | 'context-summary'
    | 'context-diagnostics'
    | 'context-journey'
    | 'node-search',
  live: unknown,
): AgentContextFreshness {
  return evaluateAgentContextQueryFreshness({ view, selection, live });
}

function executeContextQuery(
  dataset: AgentContextQueryDataset,
  query: GetFormContextQuery,
  live: unknown,
  runtime: AgentContextQueryPaginationRuntime | undefined,
): GetFormContextResult {
  const selection = validateAgentContextQuerySelectionAgainstParsedDataset(
    dataset,
    query.selection,
  );
  const { scenarioArtifact, authority } = selectedOwners(dataset, selection);
  if (query.view === 'summary') {
    if (runtime === undefined)
      fail('agentContextQueryPagination', 'is required.');
    const freshness = selectionFreshness(selection, 'context-summary', live);
    const continuationPosition = authenticateCursor(
      query,
      query.page.collection,
      query.page.cursor,
      runtime,
    );
    const steps = [...authority.usage.steps]
      .sort(
        (left, right) =>
          left.ordinal - right.ordinal || compareText(left.id, right.id),
      )
      .map((step) => ({
        id: step.id,
        ordinal: step.ordinal,
        nodeCount: step.nodeIds.length,
        actionIds: step.actionIds,
      }));
    const summary = projectContextSummary(
      selection,
      scenarioArtifact,
      authority,
    );
    if (
      steps.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE ||
      steps.some(recordIsOversized) ||
      recordIsOversized(summary)
    ) {
      return {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        status: 'refused',
        view: 'summary',
        selection,
        freshness,
        reason: { kind: 'atomic-record-too-large' },
      };
    }
    const paged = paginate(
      query,
      query.page.collection,
      query.page.limit,
      continuationPosition,
      steps,
      runtime,
    );
    const result: GetFormContextResult = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status: 'complete',
      view: 'summary',
      selection,
      freshness,
      summary,
      steps: paged.items,
      page: paged.page,
    };
    if (graphExceeds(result, MAX_ATOMIC_VIEW_GRAPH_NODES)) {
      return {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        status: 'refused',
        view: 'summary',
        selection,
        freshness,
        reason: { kind: 'atomic-record-too-large' },
      };
    }
    return result;
  }
  if (query.view === 'diagnostics') {
    if (runtime === undefined)
      fail('agentContextQueryPagination', 'is required.');
    const freshness = selectionFreshness(
      selection,
      'context-diagnostics',
      live,
    );
    const continuationPosition = authenticateCursor(
      query,
      query.page.collection,
      query.page.cursor,
      runtime,
    );
    const evidence = diagnosticEvidence(dataset, selection);
    if (
      evidence.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE ||
      evidence.some(recordIsOversized)
    ) {
      return {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        status: 'refused',
        view: 'diagnostics',
        selection,
        freshness,
        reason: { kind: 'atomic-record-too-large' },
      };
    }
    const paged = paginate(
      query,
      query.page.collection,
      query.page.limit,
      continuationPosition,
      evidence,
      runtime,
    );
    const result: GetFormContextResult = {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status: 'complete',
      view: 'diagnostics',
      selection,
      freshness,
      evidence: paged.items,
      page: paged.page,
    };
    if (graphExceeds(result, MAX_ATOMIC_VIEW_GRAPH_NODES)) {
      return {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        status: 'refused',
        view: 'diagnostics',
        selection,
        freshness,
        reason: { kind: 'atomic-record-too-large' },
      };
    }
    return result;
  }
  const freshness = selectionFreshness(selection, 'context-journey', live);
  const projection = projectExecutionAuthority(
    selection,
    authority,
    authority.usage.steps.flatMap(({ nodeIds }) => nodeIds),
    'complete-usage',
  );
  if (authorityProjectionHasOversizedRecord(projection)) {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status: 'refused',
      view: 'journey',
      selection,
      freshness,
      reason: { kind: 'atomic-record-too-large' },
    };
  }
  const result: GetFormContextResult = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'get-form-context',
    status: 'complete',
    view: 'journey',
    selection,
    freshness,
    journey: { identity: selection.journey, authority: projection },
  };
  if (graphExceeds(result, MAX_ATOMIC_VIEW_GRAPH_NODES)) {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status: 'refused',
      view: 'journey',
      selection,
      freshness,
      reason: { kind: 'atomic-view-too-large' },
    };
  }
  return result;
}

function projectNode(
  scenarioArtifact: FormContract,
  authority: AgentContextExecutionAuthority,
  node: ContractNode,
  included: readonly AgentContextNodeDetailAspect[],
): AgentContextNodeCandidateProjection {
  const effects = (scenarioArtifact.declaredEffects ?? []).filter(
    ({ trigger, target }) =>
      trigger.nodeId === node.id || target.nodeId === node.id,
  );
  const diagnostics = scenarioArtifact.diagnostics.filter(
    ({ nodeId }) => nodeId === node.id,
  );
  const includeSet = new Set(included);
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
    capabilities: collectNodeCapabilities(authority, node.id),
    included,
    details: {
      ...(includeSet.has('constraints')
        ? { constraints: complete(node.constraints) }
        : {}),
      ...(includeSet.has('domain')
        ? {
            domain: {
              options: complete(node.options),
              ...(node.optionSource === undefined
                ? {}
                : { optionSource: node.optionSource }),
              ...(node.valueDomain === undefined
                ? {}
                : { valueDomain: node.valueDomain }),
            },
          }
        : {}),
      ...(includeSet.has('effects') ? { effects: complete(effects) } : {}),
      ...(includeSet.has('interaction')
        ? {
            interaction:
              node.interactionProfile === undefined
                ? {}
                : { profile: node.interactionProfile },
          }
        : {}),
      ...(includeSet.has('locators')
        ? { locators: complete(node.locators) }
        : {}),
      ...(includeSet.has('unknowns')
        ? { unknowns: complete(diagnostics) }
        : {}),
    },
  };
}

function nodeMatches(
  node: ContractNode,
  authority: AgentContextExecutionAuthority,
  filters: AgentContextFindNodeFilters,
): boolean {
  return (
    (filters.nodeId === undefined || node.id === filters.nodeId) &&
    (filters.modelPath === undefined ||
      exactModelPath(node.modelPath, filters.modelPath)) &&
    (filters.label === undefined ||
      node.presentation?.label?.includes(filters.label) === true) &&
    (filters.semanticType === undefined ||
      node.semanticType === filters.semanticType) &&
    (filters.capability === undefined ||
      collectNodeCapabilities(authority, node.id).includes(filters.capability))
  );
}

function nodeProjectionIsOversized(
  candidate: AgentContextNodeCandidateProjection,
): boolean {
  return recordIsOversized(candidate);
}

function executeNodeQuery(
  dataset: AgentContextQueryDataset,
  query: FindFormNodesQuery,
  live: unknown,
  runtime: AgentContextQueryPaginationRuntime,
): FindFormNodesResult {
  const selection = validateAgentContextQuerySelectionAgainstParsedDataset(
    dataset,
    query.selection,
  );
  const freshness = selectionFreshness(selection, 'node-search', live);
  const continuationPosition = authenticateCursor(
    query,
    query.page.collection,
    query.page.cursor,
    runtime,
  );
  const { scenarioArtifact, authority } = selectedOwners(dataset, selection);
  let nodes = [...flattenNodes(scenarioArtifact.nodes)];
  if (query.withinStepId !== undefined) {
    const step = authority.usage.steps.find(
      ({ id }) => id === query.withinStepId,
    );
    if (step === undefined) nodes = [];
    else {
      const stepNodeIds = new Set(step.nodeIds);
      nodes = nodes.filter(({ id }) => stepNodeIds.has(id));
    }
  }
  if (
    query.filters.scenarioId !== undefined &&
    query.filters.scenarioId !== selection.scenario.id
  ) {
    nodes = [];
  }
  const matches = nodes
    .filter((node) => nodeMatches(node, authority, query.filters))
    .sort((left, right) => compareText(left.id, right.id));
  if (matches.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE) {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status: 'refused',
      selection,
      freshness,
      reason: { kind: 'atomic-record-too-large' },
    };
  }
  if (matches.length === 0) {
    if (continuationPosition !== undefined) {
      fail('agentContextQueryCursor.position', 'is outside the result range.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status: 'not-found',
      selection,
      freshness,
      candidates: [],
      page: { collection: 'nodes', truncated: false },
      reason: { kind: 'node-absent' },
    };
  }
  const pagedNodes = paginate(
    query,
    query.page.collection,
    query.page.limit,
    continuationPosition,
    matches,
    runtime,
  );
  const candidates = pagedNodes.items.map((node) =>
    projectNode(scenarioArtifact, authority, node, query.include),
  );
  if (candidates.some((candidate) => nodeProjectionIsOversized(candidate))) {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status: 'refused',
      selection,
      freshness,
      reason: { kind: 'atomic-record-too-large' },
    };
  }
  const projection = projectExecutionAuthority(
    selection,
    authority,
    candidates.map(({ nodeId }) => nodeId),
  );
  if (authorityProjectionHasOversizedRecord(projection)) {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status: 'refused',
      selection,
      freshness,
      reason: { kind: 'atomic-record-too-large' },
    };
  }
  const common = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'find-form-nodes',
    selection,
    freshness,
    authority: projection,
    candidates,
    page: pagedNodes.page,
  } as const;
  const result: FindFormNodesResult =
    matches.length === 1
      ? { ...common, status: 'complete' }
      : {
          ...common,
          status: 'ambiguous',
          reason: {
            kind: 'node-ambiguous',
            totalMatches: matches.length,
            nodeIds: candidates.map(({ nodeId }) => nodeId),
          },
        };
  if (graphExceeds(result, MAX_ATOMIC_VIEW_GRAPH_NODES)) {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status: 'refused',
      selection,
      freshness,
      reason: { kind: 'atomic-record-too-large' },
    };
  }
  return result;
}

export function executeAgentContextQuery(
  datasetInput: unknown,
  queryInput: unknown,
  liveInput: unknown,
  paginationInput?: unknown,
): AgentContextQueryResult {
  const dataset = parseAgentContextQueryDataset(datasetInput);
  const query = parseAgentContextQuery(queryInput);
  const live = parseAgentContextLiveOwnerState(liveInput);
  const pageable = isPageable(query);
  if (pageable && paginationInput === undefined) {
    fail('agentContextQueryPagination', 'is required for pageable operations.');
  }
  if (!pageable && paginationInput !== undefined) {
    fail('agentContextQueryPagination', 'is prohibited for atomic operations.');
  }
  if (query.operation === 'get-e2e-slice') {
    fail(
      'executeAgentContextQuery.get-e2e-slice',
      'is unsupported until CTX-1C.',
    );
  }
  if (query.operation === 'search-form-usages') {
    const result = executeUsageSearch(
      dataset,
      query,
      live,
      parsePaginationRuntime(paginationInput),
    );
    return validateAgentContextQueryResultAgainstParsedDataset(dataset, result);
  }
  if (query.operation === 'get-form-context') {
    const result = executeContextQuery(
      dataset,
      query,
      live,
      query.view === 'journey'
        ? undefined
        : parsePaginationRuntime(paginationInput),
    );
    return validateAgentContextQueryResultAgainstParsedDataset(dataset, result);
  }
  const result = executeNodeQuery(
    dataset,
    query,
    live,
    parsePaginationRuntime(paginationInput),
  );
  return validateAgentContextQueryResultAgainstParsedDataset(dataset, result);
}
