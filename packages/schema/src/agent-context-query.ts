import { types as utilTypes } from 'node:util';

import {
  AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
  parseAgentContextArtifactSet,
  type AgentContextArtifactReference,
  type AgentContextArtifactSet,
  type AgentContextWorkspaceIndexReference,
  type Sha256Digest,
} from './agent-context-artifacts.js';
import {
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  parseAgentContextExecutionAuthority,
  type AgentContextExecutionAuthority,
  type AgentContextExecutionBasis,
  type AgentContextScenarioReference,
} from './agent-context-execution-authority.js';
import {
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  parseAgentContextJourneyCatalog,
  parseAgentContextSourceUsageCatalog,
  type AgentContextFormReference,
  type AgentContextJourneyCatalog,
  type AgentContextSourceUsageCatalog,
} from './agent-context-usage.js';
import {
  canonicalStringify,
  parseArrayIndexProperty,
} from './canonical-json.js';
import {
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  type FormContract,
} from './contract.js';
import { parseFormContract } from './validation.js';

export const AGENT_CONTEXT_QUERY_SCHEMA_VERSION = '0.1.0' as const;

export const AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_DEPTH = 128;
export const AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_NODES = 100_000;
export const AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE = 10_000;
export const AGENT_CONTEXT_QUERY_MAX_PAGE_SIZE = 200;
export const AGENT_CONTEXT_QUERY_MAX_CURSOR_LENGTH = 8_192;

const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4_096;
const MAX_PATH_LENGTH = 1_024;
const MAX_MODEL_PATH_SEGMENTS = 128;

type DataRecord = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SCHEMA_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u;
const VERSION_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-/]*$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const GLOB_META_PATTERN = /[*?[\]{}]/u;

export type AgentContextQueryCapability =
  | 'activate-validation'
  | 'activate-wrapper'
  | 'add-item'
  | 'assert-outcome'
  | 'assert-state'
  | 'assert-validation'
  | 'assert-value'
  | 'check'
  | 'commit-value'
  | 'expand-item'
  | 'fill'
  | 'invoke-usage-action'
  | 'open-usage'
  | 'select-from-overlay'
  | 'select-option'
  | 'select-row'
  | 'type-and-pick'
  | 'wait-readiness';

export type AgentContextNodeDetailAspect =
  | 'constraints'
  | 'domain'
  | 'effects'
  | 'interaction'
  | 'locators'
  | 'unknowns';

export type AgentContextPageableCollection =
  | 'candidates'
  | 'diagnostics'
  | 'nodes'
  | 'steps';

export type AgentContextFreshness = 'current' | 'stale' | 'unknown';

export interface AgentContextOwnedSourceUsageCatalog {
  readonly reference: AgentContextArtifactReference;
  readonly artifact: AgentContextSourceUsageCatalog;
}

export interface AgentContextOwnedJourneyCatalog {
  readonly reference: AgentContextArtifactReference;
  readonly artifact: AgentContextJourneyCatalog;
}

export interface AgentContextOwnedFormContract {
  readonly reference: AgentContextArtifactReference;
  readonly artifact: FormContract;
}

export interface AgentContextOwnedExecutionAuthority {
  readonly reference: AgentContextArtifactReference;
  readonly artifact: AgentContextExecutionAuthority;
}

export interface AgentContextQueryDataset {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
  readonly artifactSet: AgentContextArtifactSet;
  readonly sourceUsageCatalogs: readonly AgentContextOwnedSourceUsageCatalog[];
  readonly journeyCatalogs: readonly AgentContextOwnedJourneyCatalog[];
  readonly formContracts: readonly AgentContextOwnedFormContract[];
  readonly executionAuthorities: readonly AgentContextOwnedExecutionAuthority[];
}

export interface AgentContextArtifactSetIdentity {
  readonly schemaVersion: typeof AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION;
  readonly contentHash: Sha256Digest;
}

export interface AgentContextDeclaredUsageSelection {
  readonly kind: 'declared';
  readonly usageId: string;
  readonly version: number;
}

export interface AgentContextIdentityReference {
  readonly id: string;
  readonly version: number;
}

export interface AgentContextExecutionAuthoritySelection {
  readonly usageId: string;
  readonly usageVersion: number;
  readonly basis: AgentContextExecutionBasis;
}

export interface AgentContextQuerySelection {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
  readonly artifactSet: AgentContextArtifactSetIdentity;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly owners: {
    readonly sourceUsageCatalog: AgentContextArtifactReference;
    readonly journeyCatalog: AgentContextArtifactReference;
    readonly formContract: AgentContextArtifactReference;
    readonly scenarioArtifact: AgentContextArtifactReference;
    readonly executionAuthority: AgentContextArtifactReference;
  };
  readonly usage: AgentContextDeclaredUsageSelection;
  readonly journey: AgentContextIdentityReference;
  readonly form: AgentContextFormReference;
  readonly scenario: AgentContextScenarioReference;
  readonly executionAuthority: AgentContextExecutionAuthoritySelection;
}

export interface AgentContextPageRequest<
  Collection extends AgentContextPageableCollection,
> {
  readonly collection: Collection;
  readonly limit: number;
  readonly cursor?: string;
}

export type AgentContextQueryModelPathSegment = string | number;

export interface AgentContextSearchUsageFilters {
  readonly text?: string;
  readonly sourcePath?: string;
  readonly sourceLine?: number;
  readonly sourceColumn?: number;
  readonly usageId?: string;
  readonly formId?: string;
  readonly routeId?: string;
  readonly stepId?: string;
  readonly modelPath?: readonly AgentContextQueryModelPathSegment[];
  readonly label?: string;
  readonly scenarioId?: string;
  readonly capabilities?: readonly AgentContextQueryCapability[];
}

export interface SearchFormUsagesQuery {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
  readonly operation: 'search-form-usages';
  readonly filters: AgentContextSearchUsageFilters;
  readonly page: AgentContextPageRequest<'candidates'>;
}

export type GetFormContextQuery =
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly selection: AgentContextQuerySelection;
      readonly view: 'summary';
      readonly page: AgentContextPageRequest<'steps'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly selection: AgentContextQuerySelection;
      readonly view: 'diagnostics';
      readonly page: AgentContextPageRequest<'diagnostics'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly selection: AgentContextQuerySelection;
      readonly view: 'journey';
    };

export interface AgentContextFindNodeFilters {
  readonly nodeId?: string;
  readonly modelPath?: readonly AgentContextQueryModelPathSegment[];
  readonly label?: string;
  readonly semanticType?: string;
  readonly capability?: AgentContextQueryCapability;
  readonly scenarioId?: string;
}

export interface FindFormNodesQuery {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
  readonly operation: 'find-form-nodes';
  readonly selection: AgentContextQuerySelection;
  readonly withinStepId?: string;
  readonly filters: AgentContextFindNodeFilters;
  readonly include: readonly AgentContextNodeDetailAspect[];
  readonly page: AgentContextPageRequest<'nodes'>;
}

export interface GetE2eSliceQuery {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
  readonly operation: 'get-e2e-slice';
  readonly selection: AgentContextQuerySelection;
  readonly withinStepId: string;
  readonly nodeIds: readonly string[];
  readonly goal: 'boundary' | 'negative' | 'positive';
  readonly includeOutgoingEffects: boolean;
}

export type AgentContextQuery =
  | SearchFormUsagesQuery
  | GetFormContextQuery
  | FindFormNodesQuery
  | GetE2eSliceQuery;

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

type DataGraphPreflightFrame =
  | {
      readonly kind: 'visit';
      readonly input: unknown;
      readonly path: string;
      readonly depth: number;
    }
  | { readonly kind: 'leave'; readonly input: object };

function preflightDataGraph(input: unknown, path: string): void {
  const frames: DataGraphPreflightFrame[] = [
    { kind: 'visit', input, path, depth: 0 },
  ];
  const ancestors = new Set<object>();
  let scheduledNodeCount = 1;

  while (frames.length > 0) {
    const frame = frames.pop()!;
    if (frame.kind === 'leave') {
      ancestors.delete(frame.input);
      continue;
    }
    const inputType = typeof frame.input;
    if (
      ((inputType === 'object' && frame.input !== null) ||
        inputType === 'function') &&
      utilTypes.isProxy(frame.input)
    ) {
      fail(frame.path, 'must not be a proxy.');
    }
    if (inputType !== 'object' || frame.input === null) continue;
    const objectInput = frame.input as object;
    if (ancestors.has(objectInput)) {
      fail(frame.path, 'must not contain a cycle.');
    }
    ancestors.add(objectInput);
    frames.push({ kind: 'leave', input: objectInput });

    const isArray = Array.isArray(objectInput);
    const childFrames: DataGraphPreflightFrame[] = [];
    for (const key of Reflect.ownKeys(objectInput)) {
      if (typeof key === 'symbol') {
        fail(frame.path, 'must not contain symbol-keyed properties.');
      }
      if (isArray && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(objectInput, key);
      if (descriptor === undefined || !('value' in descriptor)) continue;
      const childPath = isArray
        ? `${frame.path}[${key}]`
        : `${frame.path}.${key}`;
      const childDepth = frame.depth + 1;
      if (childDepth > AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_DEPTH) {
        fail(
          childPath,
          `must not exceed the maximum data graph depth of ${AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_DEPTH}.`,
        );
      }
      scheduledNodeCount += 1;
      if (scheduledNodeCount > AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_NODES) {
        fail(
          childPath,
          `must not exceed the maximum data graph node count of ${AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_NODES}.`,
        );
      }
      childFrames.push({
        kind: 'visit',
        input: descriptor.value,
        path: childPath,
        depth: childDepth,
      });
    }
    for (let index = childFrames.length - 1; index >= 0; index -= 1) {
      frames.push(childFrames[index]!);
    }
  }
}

function cloneDataOnly(
  input: unknown,
  path: string,
  ancestors = new Set<object>(),
): unknown {
  const inputType = typeof input;
  if (
    ((inputType === 'object' && input !== null) || inputType === 'function') &&
    utilTypes.isProxy(input)
  ) {
    fail(path, 'must not be a proxy.');
  }
  if (input === null || inputType === 'string' || inputType === 'boolean') {
    return input;
  }
  if (inputType === 'number') {
    if (!Number.isFinite(input)) {
      fail(path, 'must be a finite JSON number.');
    }
    return input;
  }
  if (inputType !== 'object' || input === null) {
    fail(path, 'must be a JSON value.');
  }
  const objectInput = input as object;
  if (ancestors.has(objectInput)) fail(path, 'must not contain a cycle.');
  const isArray = Array.isArray(objectInput);
  const prototype = Object.getPrototypeOf(objectInput) as unknown;
  if (isArray) {
    if (prototype !== Array.prototype) fail(path, 'must be an ordinary array.');
  } else if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object or null-prototype object.');
  }
  if (Object.getOwnPropertySymbols(objectInput).length > 0) {
    fail(path, 'must not contain symbol-keyed properties.');
  }

  ancestors.add(objectInput);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(objectInput);
    if (isArray) {
      const lengthDescriptor = descriptors.length;
      if (
        lengthDescriptor === undefined ||
        !('value' in lengthDescriptor) ||
        typeof lengthDescriptor.value !== 'number'
      ) {
        fail(`${path}.length`, 'must be an array length data property.');
      }
      const length = lengthDescriptor.value;
      const indexedDescriptors: [number, PropertyDescriptor][] = [];
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (key === 'length') continue;
        const index = parseArrayIndexProperty(key, length);
        if (index === undefined) {
          fail(`${path}.${key}`, 'is not a supported array property.');
        }
        const itemPath = `${path}[${index}]`;
        if (!descriptor.enumerable) fail(itemPath, 'must be enumerable.');
        if (!('value' in descriptor)) fail(itemPath, 'must be a data property.');
        indexedDescriptors.push([index, descriptor]);
      }
      indexedDescriptors.sort(([left], [right]) => left - right);
      if (indexedDescriptors.length !== length) {
        let missingIndex = 0;
        for (const [index] of indexedDescriptors) {
          if (index !== missingIndex) break;
          missingIndex += 1;
        }
        fail(`${path}[${missingIndex}]`, 'must not be sparse.');
      }
      return indexedDescriptors.map(([index, descriptor]) =>
        cloneDataOnly(descriptor.value, `${path}[${index}]`, ancestors),
      );
    }

    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      const propertyPath = `${path}.${key}`;
      if (!descriptor.enumerable) fail(propertyPath, 'must be enumerable.');
      if (!('value' in descriptor)) {
        fail(propertyPath, 'must be a data property.');
      }
      result[key] = cloneDataOnly(descriptor.value, propertyPath, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(objectInput);
  }
}

function cloneValidatedDataOnly(input: unknown, path: string): unknown {
  preflightDataGraph(input, path);
  const detached = cloneDataOnly(input, path);
  let roundTripDetached: unknown;
  try {
    roundTripDetached = cloneDataOnly(structuredClone(input), path);
  } catch {
    fail(path, 'must round-trip through structured clone as plain JSON data.');
  }
  if (canonicalStringify(roundTripDetached) !== canonicalStringify(detached)) {
    fail(
      path,
      'must round-trip through structured clone as identical plain JSON data.',
    );
  }
  return detached;
}

function record(
  input: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) fail(`${path}.${key}`, 'is not supported.');
  }
  return input as DataRecord;
}

function required(value: DataRecord, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'is required.');
  return value[key];
}

function optional(value: DataRecord, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}

function exactSchemaVersion(input: unknown, path: string): void {
  if (input !== AGENT_CONTEXT_QUERY_SCHEMA_VERSION) {
    fail(path, `must be ${AGENT_CONTEXT_QUERY_SCHEMA_VERSION}.`);
  }
}

function sha256(input: unknown, path: string): Sha256Digest {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a lowercase sha256 digest.');
  }
  return input as Sha256Digest;
}

function boundedVersion(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > 64 ||
    !VERSION_PATTERN.test(input)
  ) {
    fail(path, 'must be a 1-64 character ASCII version string.');
  }
  return input;
}

function boundedId(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > MAX_ID_LENGTH ||
    !ID_PATTERN.test(input)
  ) {
    fail(path, `must be a 1-${MAX_ID_LENGTH} character stable identifier.`);
  }
  return input;
}

function boundedText(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > MAX_TEXT_LENGTH ||
    input.trim() !== input ||
    CONTROL_CHARACTER_PATTERN.test(input)
  ) {
    fail(path, 'must be bounded printable text of 1-4096 characters.');
  }
  return input;
}

function positiveInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) <= 0) {
    fail(path, 'must be a positive safe integer.');
  }
  return Number(input);
}

function nonNegativeInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) < 0) {
    fail(path, 'must be a non-negative safe integer.');
  }
  const number = Number(input);
  return Object.is(number, -0) ? 0 : number;
}

function booleanValue(input: unknown, path: string): boolean {
  if (typeof input !== 'boolean') fail(path, 'must be a boolean.');
  return input;
}

function enumValue<Values extends readonly string[]>(
  input: unknown,
  path: string,
  values: Values,
): Values[number] {
  if (typeof input !== 'string' || !values.includes(input)) {
    fail(path, `must be one of ${values.join(', ')}.`);
  }
  return input;
}

function array(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) fail(path, 'must be an array.');
  if (input.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE) {
    fail(
      path,
      `must contain at most ${AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE} entries.`,
    );
  }
  return input;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareReference(
  left: AgentContextArtifactReference,
  right: AgentContextArtifactReference,
): number {
  return (
    compareText(left.schemaId, right.schemaId) ||
    compareText(left.schemaVersion, right.schemaVersion) ||
    compareText(left.contentHash, right.contentHash)
  );
}

function referenceKey(reference: AgentContextArtifactReference): string {
  return `${reference.schemaId}\0${reference.schemaVersion}\0${reference.contentHash}`;
}

function assertCanonicalSet<T>(
  values: readonly T[],
  path: string,
  identity: (value: T) => string,
  compare: (left: T, right: T) => number,
): void {
  const identities = new Set<string>();
  for (const [index, value] of values.entries()) {
    const key = identity(value);
    if (identities.has(key)) fail(`${path}[${index}]`, 'is a duplicate.');
    identities.add(key);
    const previous = values[index - 1];
    if (previous !== undefined && compare(previous, value) > 0) {
      fail(path, 'must be in canonical order.');
    }
  }
}

function parseArtifactReference(
  input: unknown,
  path: string,
): AgentContextArtifactReference {
  const value = record(
    input,
    path,
    new Set(['schemaId', 'schemaVersion', 'contentHash']),
  );
  const schemaIdInput = required(value, 'schemaId', path);
  if (
    typeof schemaIdInput !== 'string' ||
    schemaIdInput.length > 128 ||
    !SCHEMA_ID_PATTERN.test(schemaIdInput)
  ) {
    fail(`${path}.schemaId`, 'must be a namespaced schema ID.');
  }
  return {
    schemaId: schemaIdInput,
    schemaVersion: boundedVersion(
      required(value, 'schemaVersion', path),
      `${path}.schemaVersion`,
    ),
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function parseTypedArtifactReference(
  input: unknown,
  path: string,
  schemaId: string,
  schemaVersion: string,
): AgentContextArtifactReference {
  const reference = parseArtifactReference(input, path);
  if (
    reference.schemaId !== schemaId ||
    reference.schemaVersion !== schemaVersion
  ) {
    fail(path, `must identify ${schemaId}@${schemaVersion}.`);
  }
  return reference;
}

function parseWorkspaceIndexReference(
  input: unknown,
  path: string,
): AgentContextWorkspaceIndexReference {
  const value = record(
    input,
    path,
    new Set(['schemaVersion', 'contentHash']),
  );
  return {
    schemaVersion: boundedVersion(
      required(value, 'schemaVersion', path),
      `${path}.schemaVersion`,
    ),
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function parseBasis(input: unknown, path: string): AgentContextExecutionBasis {
  const value = record(input, path, new Set(['formId', 'contractHash']));
  return {
    formId: boundedId(required(value, 'formId', path), `${path}.formId`),
    contractHash: sha256(
      required(value, 'contractHash', path),
      `${path}.contractHash`,
    ),
  };
}

function parseIdentityReference(
  input: unknown,
  path: string,
): AgentContextIdentityReference {
  const value = record(input, path, new Set(['id', 'version']));
  return {
    id: boundedId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`,
    ),
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

type OwnedArtifact =
  | AgentContextOwnedSourceUsageCatalog
  | AgentContextOwnedJourneyCatalog
  | AgentContextOwnedFormContract
  | AgentContextOwnedExecutionAuthority;

function parseOwnedArtifacts<T extends OwnedArtifact>(
  input: unknown,
  path: string,
  expectedSchemaId: string,
  expectedSchemaVersion: string,
  parseArtifact: (input: unknown) => T['artifact'],
): readonly T[] {
  const entries = array(input, path).map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const value = record(entry, entryPath, new Set(['reference', 'artifact']));
    const reference = parseArtifactReference(
      required(value, 'reference', entryPath),
      `${entryPath}.reference`,
    );
    if (
      reference.schemaId !== expectedSchemaId ||
      reference.schemaVersion !== expectedSchemaVersion
    ) {
      fail(
        `${entryPath}.reference`,
        `must identify ${expectedSchemaId}@${expectedSchemaVersion}.`,
      );
    }
    const artifact = parseArtifact(required(value, 'artifact', entryPath));
    const artifactHash = (artifact as { readonly contentHash: string })
      .contentHash;
    if (reference.contentHash !== artifactHash) {
      fail(
        `${entryPath}.reference.contentHash`,
        'must equal the artifact contentHash.',
      );
    }
    return { reference, artifact } as T;
  });
  assertCanonicalSet(
    entries,
    path,
    (entry) => referenceKey(entry.reference),
    (left, right) => compareReference(left.reference, right.reference),
  );
  return entries;
}

function validateOwnerInventory(
  artifactSet: AgentContextArtifactSet,
  groups: readonly {
    readonly schemaId: string;
    readonly schemaVersion: string;
    readonly entries: readonly OwnedArtifact[];
    readonly path: string;
  }[],
): void {
  const inventory = new Set(artifactSet.artifacts.map(referenceKey));
  for (const group of groups) {
    const entryKeys = new Set(group.entries.map(({ reference }) => referenceKey(reference)));
    for (const { reference } of group.entries) {
      if (!inventory.has(referenceKey(reference))) {
        fail(
          `${group.path}.reference`,
          'must be an exact reference in the artifact set.',
        );
      }
    }
    for (const reference of artifactSet.artifacts) {
      if (
        reference.schemaId === group.schemaId &&
        reference.schemaVersion === group.schemaVersion &&
        !entryKeys.has(referenceKey(reference))
      ) {
        fail(
          group.path,
          `must contain the inventoried ${group.schemaId} reference ${reference.contentHash}.`,
        );
      }
    }
  }
}

export function parseAgentContextQueryDataset(
  input: unknown,
): AgentContextQueryDataset {
  const path = 'agentContextQueryDataset';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    new Set([
      'schemaVersion',
      'artifactSet',
      'sourceUsageCatalogs',
      'journeyCatalogs',
      'formContracts',
      'executionAuthorities',
    ]),
  );
  exactSchemaVersion(
    required(value, 'schemaVersion', path),
    `${path}.schemaVersion`,
  );
  const artifactSet = parseAgentContextArtifactSet(
    required(value, 'artifactSet', path),
  );
  const sourceUsageCatalogs = parseOwnedArtifacts<AgentContextOwnedSourceUsageCatalog>(
    required(value, 'sourceUsageCatalogs', path),
    `${path}.sourceUsageCatalogs`,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    parseAgentContextSourceUsageCatalog,
  );
  const journeyCatalogs = parseOwnedArtifacts<AgentContextOwnedJourneyCatalog>(
    required(value, 'journeyCatalogs', path),
    `${path}.journeyCatalogs`,
    AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
    AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    parseAgentContextJourneyCatalog,
  );
  const formContracts = parseOwnedArtifacts<AgentContextOwnedFormContract>(
    required(value, 'formContracts', path),
    `${path}.formContracts`,
    FORM_CONTRACT_SCHEMA_ID,
    FORM_CONTRACT_SCHEMA_VERSION,
    parseFormContract,
  );
  const executionAuthorities =
    parseOwnedArtifacts<AgentContextOwnedExecutionAuthority>(
      required(value, 'executionAuthorities', path),
      `${path}.executionAuthorities`,
      AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
      AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
      parseAgentContextExecutionAuthority,
    );

  for (const [index, owner] of [
    ...sourceUsageCatalogs,
    ...journeyCatalogs,
  ].entries()) {
    if (!sameJson(owner.artifact.workspaceIndex, artifactSet.workspaceIndex)) {
      fail(
        `${path}.catalogs[${index}].artifact.workspaceIndex`,
        'must equal the artifact-set workspace index.',
      );
    }
  }
  validateOwnerInventory(artifactSet, [
    {
      schemaId: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
      schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
      entries: sourceUsageCatalogs,
      path: `${path}.sourceUsageCatalogs`,
    },
    {
      schemaId: AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
      schemaVersion: AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
      entries: journeyCatalogs,
      path: `${path}.journeyCatalogs`,
    },
    {
      schemaId: FORM_CONTRACT_SCHEMA_ID,
      schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
      entries: formContracts,
      path: `${path}.formContracts`,
    },
    {
      schemaId: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
      schemaVersion: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
      entries: executionAuthorities,
      path: `${path}.executionAuthorities`,
    },
  ]);
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet,
    sourceUsageCatalogs,
    journeyCatalogs,
    formContracts,
    executionAuthorities,
  };
}

export function canonicalizeAgentContextQueryDataset(input: unknown): string {
  return canonicalStringify(parseAgentContextQueryDataset(input));
}

function parseSelectionFromDetached(
  input: unknown,
  path: string,
): AgentContextQuerySelection {
  const value = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'artifactSet',
      'workspaceIndex',
      'owners',
      'usage',
      'journey',
      'form',
      'scenario',
      'executionAuthority',
    ]),
  );
  exactSchemaVersion(
    required(value, 'schemaVersion', path),
    `${path}.schemaVersion`,
  );
  const artifactSetValue = record(
    required(value, 'artifactSet', path),
    `${path}.artifactSet`,
    new Set(['schemaVersion', 'contentHash']),
  );
  if (
    required(artifactSetValue, 'schemaVersion', `${path}.artifactSet`) !==
    AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION
  ) {
    fail(
      `${path}.artifactSet.schemaVersion`,
      `must be ${AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION}.`,
    );
  }
  const ownersValue = record(
    required(value, 'owners', path),
    `${path}.owners`,
    new Set([
      'sourceUsageCatalog',
      'journeyCatalog',
      'formContract',
      'scenarioArtifact',
      'executionAuthority',
    ]),
  );
  const usageValue = record(
    required(value, 'usage', path),
    `${path}.usage`,
    new Set(['kind', 'usageId', 'version']),
  );
  if (required(usageValue, 'kind', `${path}.usage`) !== 'declared') {
    fail(`${path}.usage.kind`, 'must be declared.');
  }
  const formValue = record(
    required(value, 'form', path),
    `${path}.form`,
    new Set(['projectId', 'formId', 'contractHash']),
  );
  const scenarioValue = record(
    required(value, 'scenario', path),
    `${path}.scenario`,
    new Set(['id', 'version', 'artifactHash', 'basis']),
  );
  const authorityValue = record(
    required(value, 'executionAuthority', path),
    `${path}.executionAuthority`,
    new Set(['usageId', 'usageVersion', 'basis']),
  );
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: {
      schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
      contentHash: sha256(
        required(artifactSetValue, 'contentHash', `${path}.artifactSet`),
        `${path}.artifactSet.contentHash`,
      ),
    },
    workspaceIndex: parseWorkspaceIndexReference(
      required(value, 'workspaceIndex', path),
      `${path}.workspaceIndex`,
    ),
    owners: {
      sourceUsageCatalog: parseTypedArtifactReference(
        required(ownersValue, 'sourceUsageCatalog', `${path}.owners`),
        `${path}.owners.sourceUsageCatalog`,
        AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
        AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
      ),
      journeyCatalog: parseTypedArtifactReference(
        required(ownersValue, 'journeyCatalog', `${path}.owners`),
        `${path}.owners.journeyCatalog`,
        AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
        AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
      ),
      formContract: parseTypedArtifactReference(
        required(ownersValue, 'formContract', `${path}.owners`),
        `${path}.owners.formContract`,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
      ),
      scenarioArtifact: parseTypedArtifactReference(
        required(ownersValue, 'scenarioArtifact', `${path}.owners`),
        `${path}.owners.scenarioArtifact`,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
      ),
      executionAuthority: parseTypedArtifactReference(
        required(ownersValue, 'executionAuthority', `${path}.owners`),
        `${path}.owners.executionAuthority`,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
      ),
    },
    usage: {
      kind: 'declared',
      usageId: boundedId(
        required(usageValue, 'usageId', `${path}.usage`),
        `${path}.usage.usageId`,
      ),
      version: positiveInteger(
        required(usageValue, 'version', `${path}.usage`),
        `${path}.usage.version`,
      ),
    },
    journey: parseIdentityReference(
      required(value, 'journey', path),
      `${path}.journey`,
    ),
    form: {
      projectId: boundedId(
        required(formValue, 'projectId', `${path}.form`),
        `${path}.form.projectId`,
      ),
      formId: boundedId(
        required(formValue, 'formId', `${path}.form`),
        `${path}.form.formId`,
      ),
      contractHash: sha256(
        required(formValue, 'contractHash', `${path}.form`),
        `${path}.form.contractHash`,
      ),
    },
    scenario: {
      id: boundedId(
        required(scenarioValue, 'id', `${path}.scenario`),
        `${path}.scenario.id`,
      ),
      version: positiveInteger(
        required(scenarioValue, 'version', `${path}.scenario`),
        `${path}.scenario.version`,
      ),
      artifactHash: sha256(
        required(scenarioValue, 'artifactHash', `${path}.scenario`),
        `${path}.scenario.artifactHash`,
      ),
      basis: parseBasis(
        required(scenarioValue, 'basis', `${path}.scenario`),
        `${path}.scenario.basis`,
      ),
    },
    executionAuthority: {
      usageId: boundedId(
        required(authorityValue, 'usageId', `${path}.executionAuthority`),
        `${path}.executionAuthority.usageId`,
      ),
      usageVersion: positiveInteger(
        required(
          authorityValue,
          'usageVersion',
          `${path}.executionAuthority`,
        ),
        `${path}.executionAuthority.usageVersion`,
      ),
      basis: parseBasis(
        required(authorityValue, 'basis', `${path}.executionAuthority`),
        `${path}.executionAuthority.basis`,
      ),
    },
  };
}

export function parseAgentContextQuerySelection(
  input: unknown,
): AgentContextQuerySelection {
  const path = 'agentContextQuerySelection';
  return parseSelectionFromDetached(cloneValidatedDataOnly(input, path), path);
}

export function canonicalizeAgentContextQuerySelection(input: unknown): string {
  return canonicalStringify(parseAgentContextQuerySelection(input));
}

function findOwner<T extends OwnedArtifact>(
  entries: readonly T[],
  reference: AgentContextArtifactReference,
  path: string,
): T {
  const matches = entries.filter(
    (entry) => referenceKey(entry.reference) === referenceKey(reference),
  );
  if (matches.length !== 1) {
    fail(path, 'must resolve exactly one dataset owner.');
  }
  return matches[0]!;
}

function assertSame(input: unknown, expected: unknown, path: string): void {
  if (!sameJson(input, expected)) fail(path, 'does not match the selected owner.');
}

export function validateAgentContextQuerySelection(
  datasetInput: unknown,
  selectionInput: unknown,
): AgentContextQuerySelection {
  const dataset = parseAgentContextQueryDataset(datasetInput);
  const selection = parseAgentContextQuerySelection(selectionInput);
  assertSame(
    selection.artifactSet,
    {
      schemaVersion: dataset.artifactSet.schemaVersion,
      contentHash: dataset.artifactSet.contentHash,
    },
    'agentContextQuerySelection.artifactSet',
  );
  assertSame(
    selection.workspaceIndex,
    dataset.artifactSet.workspaceIndex,
    'agentContextQuerySelection.workspaceIndex',
  );

  const usageCatalog = findOwner(
    dataset.sourceUsageCatalogs,
    selection.owners.sourceUsageCatalog,
    'agentContextQuerySelection.owners.sourceUsageCatalog',
  ).artifact;
  const journeyCatalog = findOwner(
    dataset.journeyCatalogs,
    selection.owners.journeyCatalog,
    'agentContextQuerySelection.owners.journeyCatalog',
  ).artifact;
  const formContract = findOwner(
    dataset.formContracts,
    selection.owners.formContract,
    'agentContextQuerySelection.owners.formContract',
  ).artifact;
  const scenarioArtifact = findOwner(
    dataset.formContracts,
    selection.owners.scenarioArtifact,
    'agentContextQuerySelection.owners.scenarioArtifact',
  ).artifact;
  const authority = findOwner(
    dataset.executionAuthorities,
    selection.owners.executionAuthority,
    'agentContextQuerySelection.owners.executionAuthority',
  ).artifact;

  const usageMatches = usageCatalog.usages.filter(({ identity }) =>
    sameJson(identity, selection.usage),
  );
  if (usageMatches.length !== 1) {
    fail('agentContextQuerySelection.usage', 'must resolve exactly one usage.');
  }
  const usage = usageMatches[0]!;
  if (usage.resolution.status !== 'exact') {
    fail('agentContextQuerySelection.usage', 'must have an exact form resolution.');
  }
  assertSame(
    usage.resolution.candidate.form,
    selection.form,
    'agentContextQuerySelection.form',
  );

  const journeyMatches = journeyCatalog.journeys.filter(
    ({ id, version }) =>
      id === selection.journey.id && version === selection.journey.version,
  );
  if (journeyMatches.length !== 1) {
    fail('agentContextQuerySelection.journey', 'must resolve exactly one journey.');
  }
  const journey = journeyMatches[0]!;
  assertSame(
    journey.entry.usage,
    selection.usage,
    'agentContextQuerySelection.journey.entry.usage',
  );
  const containingSteps = journey.steps.filter(
    (step) =>
      step.usages.some((usageReference) =>
        sameJson(usageReference, selection.usage),
      ) &&
      step.forms.some((formReference) =>
        sameJson(formReference, selection.form),
      ),
  );
  if (containingSteps.length === 0) {
    fail(
      'agentContextQuerySelection.journey',
      'must contain the selected usage and form in one step.',
    );
  }

  if (selection.form.contractHash !== formContract.contentHash) {
    fail(
      'agentContextQuerySelection.form.contractHash',
      'must equal the selected Form Contract contentHash.',
    );
  }
  assertSame(
    {
      formId: formContract.formId,
      contractHash: formContract.contentHash,
    },
    selection.scenario.basis,
    'agentContextQuerySelection.scenario.basis',
  );
  if (
    scenarioArtifact.formId !== selection.form.formId ||
    scenarioArtifact.contentHash !== selection.scenario.artifactHash
  ) {
    fail(
      'agentContextQuerySelection.scenarioArtifact',
      'must equal the selected scenario artifact identity.',
    );
  }
  assertSame(
    authority.basis,
    selection.executionAuthority.basis,
    'agentContextQuerySelection.executionAuthority.basis',
  );
  if (
    authority.usage.id !== selection.executionAuthority.usageId ||
    authority.usage.version !== selection.executionAuthority.usageVersion
  ) {
    fail(
      'agentContextQuerySelection.executionAuthority',
      'must equal the selected execution-authority usage identity.',
    );
  }
  assertSame(
    authority.scenario,
    selection.scenario,
    'agentContextQuerySelection.scenario',
  );
  if (
    selection.usage.usageId !== selection.executionAuthority.usageId ||
    selection.usage.version !== selection.executionAuthority.usageVersion
  ) {
    fail(
      'agentContextQuerySelection.executionAuthority',
      'must use the selected declared usage identity.',
    );
  }
  assertSame(
    selection.form,
    {
      projectId: usage.resolution.candidate.form.projectId,
      formId: authority.basis.formId,
      contractHash: authority.basis.contractHash,
    },
    'agentContextQuerySelection.form',
  );
  return selection;
}

const QUERY_CAPABILITIES: readonly AgentContextQueryCapability[] = [
  'activate-validation',
  'activate-wrapper',
  'add-item',
  'assert-outcome',
  'assert-state',
  'assert-validation',
  'assert-value',
  'check',
  'commit-value',
  'expand-item',
  'fill',
  'invoke-usage-action',
  'open-usage',
  'select-from-overlay',
  'select-option',
  'select-row',
  'type-and-pick',
  'wait-readiness',
];

const NODE_DETAIL_ASPECTS: readonly AgentContextNodeDetailAspect[] = [
  'constraints',
  'domain',
  'effects',
  'interaction',
  'locators',
  'unknowns',
];

const PAGEABLE_COLLECTIONS: readonly AgentContextPageableCollection[] = [
  'candidates',
  'diagnostics',
  'nodes',
  'steps',
];

function parseCanonicalStringSet(
  input: unknown,
  path: string,
  minimum = 0,
): readonly string[] {
  const values = array(input, path).map((entry, index) =>
    boundedId(entry, `${path}[${index}]`),
  );
  if (values.length < minimum) {
    fail(path, `must contain at least ${minimum} entries.`);
  }
  assertCanonicalSet(values, path, (value) => value, compareText);
  return values;
}

function parseUniqueStringList(
  input: unknown,
  path: string,
  minimum = 0,
): readonly string[] {
  const values = array(input, path).map((entry, index) =>
    boundedId(entry, `${path}[${index}]`),
  );
  if (values.length < minimum) {
    fail(path, `must contain at least ${minimum} entries.`);
  }
  const identities = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (identities.has(value)) fail(`${path}[${index}]`, 'is a duplicate.');
    identities.add(value);
  }
  return values;
}

function parseCapability(input: unknown, path: string): AgentContextQueryCapability {
  return enumValue(input, path, QUERY_CAPABILITIES);
}

function parseCapabilitySet(
  input: unknown,
  path: string,
): readonly AgentContextQueryCapability[] {
  const values = array(input, path).map((entry, index) =>
    parseCapability(entry, `${path}[${index}]`),
  );
  assertCanonicalSet(values, path, (value) => value, compareText);
  return values;
}

function parseIncludeSet(
  input: unknown,
  path: string,
): readonly AgentContextNodeDetailAspect[] {
  const values = array(input, path).map((entry, index) =>
    enumValue(entry, `${path}[${index}]`, NODE_DETAIL_ASPECTS),
  );
  assertCanonicalSet(values, path, (value) => value, compareText);
  return values;
}

function modelPathSegment(
  input: unknown,
  path: string,
): AgentContextQueryModelPathSegment {
  if (typeof input === 'number') return nonNegativeInteger(input, path);
  if (input === '*') return '*';
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > MAX_ID_LENGTH ||
    input.trim() !== input ||
    CONTROL_CHARACTER_PATTERN.test(input)
  ) {
    fail(path, 'must be a bounded model-path segment.');
  }
  return input;
}

function parseModelPath(
  input: unknown,
  path: string,
): readonly AgentContextQueryModelPathSegment[] {
  if (!Array.isArray(input)) fail(path, 'must be an array.');
  if (input.length > MAX_MODEL_PATH_SEGMENTS) {
    fail(path, `must contain at most ${MAX_MODEL_PATH_SEGMENTS} segments.`);
  }
  return input.map((segment, index) =>
    modelPathSegment(segment, `${path}[${index}]`),
  );
}

function sourcePath(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > MAX_PATH_LENGTH ||
    input.trim() !== input ||
    input.startsWith('/') ||
    input.includes('\\') ||
    URI_SCHEME_PATTERN.test(input) ||
    GLOB_META_PATTERN.test(input) ||
    CONTROL_CHARACTER_PATTERN.test(input) ||
    input.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(path, 'must be a confined workspace-relative source path.');
  }
  return input;
}

function cursorText(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > AGENT_CONTEXT_QUERY_MAX_CURSOR_LENGTH ||
    !/^[\x21-\x7e]+$/u.test(input)
  ) {
    fail(
      path,
      `must be 1-${AGENT_CONTEXT_QUERY_MAX_CURSOR_LENGTH} printable ASCII characters.`,
    );
  }
  return input;
}

function parsePageRequest<Collection extends AgentContextPageableCollection>(
  input: unknown,
  path: string,
  collection: Collection,
): AgentContextPageRequest<Collection> {
  const value = record(input, path, new Set(['collection', 'limit', 'cursor']));
  if (required(value, 'collection', path) !== collection) {
    fail(`${path}.collection`, `must be ${collection}.`);
  }
  const limit = positiveInteger(required(value, 'limit', path), `${path}.limit`);
  if (limit > AGENT_CONTEXT_QUERY_MAX_PAGE_SIZE) {
    fail(`${path}.limit`, `must be at most ${AGENT_CONTEXT_QUERY_MAX_PAGE_SIZE}.`);
  }
  const cursor = optional(value, 'cursor');
  return {
    collection,
    limit,
    ...(cursor === undefined ? {} : { cursor: cursorText(cursor, `${path}.cursor`) }),
  };
}

function parseSearchFilters(
  input: unknown,
  path: string,
): AgentContextSearchUsageFilters {
  const value = record(
    input,
    path,
    new Set([
      'text',
      'sourcePath',
      'sourceLine',
      'sourceColumn',
      'usageId',
      'formId',
      'routeId',
      'stepId',
      'modelPath',
      'label',
      'scenarioId',
      'capabilities',
    ]),
  );
  const text = optional(value, 'text');
  const pathInput = optional(value, 'sourcePath');
  const line = optional(value, 'sourceLine');
  const column = optional(value, 'sourceColumn');
  if ((line !== undefined || column !== undefined) && pathInput === undefined) {
    fail(path, 'sourceLine and sourceColumn require sourcePath.');
  }
  const usageId = optional(value, 'usageId');
  const formId = optional(value, 'formId');
  const routeId = optional(value, 'routeId');
  const stepId = optional(value, 'stepId');
  const modelPath = optional(value, 'modelPath');
  const label = optional(value, 'label');
  const scenarioId = optional(value, 'scenarioId');
  const capabilities = optional(value, 'capabilities');
  return {
    ...(text === undefined ? {} : { text: boundedText(text, `${path}.text`) }),
    ...(pathInput === undefined
      ? {}
      : { sourcePath: sourcePath(pathInput, `${path}.sourcePath`) }),
    ...(line === undefined
      ? {}
      : { sourceLine: positiveInteger(line, `${path}.sourceLine`) }),
    ...(column === undefined
      ? {}
      : { sourceColumn: nonNegativeInteger(column, `${path}.sourceColumn`) }),
    ...(usageId === undefined
      ? {}
      : { usageId: boundedId(usageId, `${path}.usageId`) }),
    ...(formId === undefined ? {} : { formId: boundedId(formId, `${path}.formId`) }),
    ...(routeId === undefined
      ? {}
      : { routeId: boundedId(routeId, `${path}.routeId`) }),
    ...(stepId === undefined ? {} : { stepId: boundedId(stepId, `${path}.stepId`) }),
    ...(modelPath === undefined
      ? {}
      : { modelPath: parseModelPath(modelPath, `${path}.modelPath`) }),
    ...(label === undefined ? {} : { label: boundedText(label, `${path}.label`) }),
    ...(scenarioId === undefined
      ? {}
      : { scenarioId: boundedId(scenarioId, `${path}.scenarioId`) }),
    ...(capabilities === undefined
      ? {}
      : { capabilities: parseCapabilitySet(capabilities, `${path}.capabilities`) }),
  };
}

function parseFindNodeFilters(
  input: unknown,
  path: string,
): AgentContextFindNodeFilters {
  const value = record(
    input,
    path,
    new Set([
      'nodeId',
      'modelPath',
      'label',
      'semanticType',
      'capability',
      'scenarioId',
    ]),
  );
  const nodeId = optional(value, 'nodeId');
  const modelPath = optional(value, 'modelPath');
  const label = optional(value, 'label');
  const semanticType = optional(value, 'semanticType');
  const capability = optional(value, 'capability');
  const scenarioId = optional(value, 'scenarioId');
  return {
    ...(nodeId === undefined ? {} : { nodeId: boundedId(nodeId, `${path}.nodeId`) }),
    ...(modelPath === undefined
      ? {}
      : { modelPath: parseModelPath(modelPath, `${path}.modelPath`) }),
    ...(label === undefined ? {} : { label: boundedText(label, `${path}.label`) }),
    ...(semanticType === undefined
      ? {}
      : { semanticType: boundedId(semanticType, `${path}.semanticType`) }),
    ...(capability === undefined
      ? {}
      : { capability: parseCapability(capability, `${path}.capability`) }),
    ...(scenarioId === undefined
      ? {}
      : { scenarioId: boundedId(scenarioId, `${path}.scenarioId`) }),
  };
}

function parseQueryFromDetached(input: unknown, path: string): AgentContextQuery {
  const unionValue = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'filters',
      'page',
      'selection',
      'view',
      'withinStepId',
      'include',
      'nodeIds',
      'goal',
      'includeOutgoingEffects',
    ]),
  );
  exactSchemaVersion(
    required(unionValue, 'schemaVersion', path),
    `${path}.schemaVersion`,
  );
  const operation = required(unionValue, 'operation', path);
  if (operation === 'search-form-usages') {
    const value = record(
      input,
      path,
      new Set(['schemaVersion', 'operation', 'filters', 'page']),
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation,
      filters: parseSearchFilters(
        required(value, 'filters', path),
        `${path}.filters`,
      ),
      page: parsePageRequest(
        required(value, 'page', path),
        `${path}.page`,
        'candidates',
      ),
    };
  }
  if (operation === 'get-form-context') {
    const view = required(unionValue, 'view', path);
    if (view === 'journey') {
      const value = record(
        input,
        path,
        new Set(['schemaVersion', 'operation', 'selection', 'view']),
      );
      return {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation,
        selection: parseSelectionFromDetached(
          required(value, 'selection', path),
          `${path}.selection`,
        ),
        view,
      };
    }
    if (view !== 'summary' && view !== 'diagnostics') {
      fail(`${path}.view`, 'must be summary, diagnostics, or journey.');
    }
    const value = record(
      input,
      path,
      new Set(['schemaVersion', 'operation', 'selection', 'view', 'page']),
    );
    const selection = parseSelectionFromDetached(
      required(value, 'selection', path),
      `${path}.selection`,
    );
    if (view === 'summary') {
      return {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation,
        selection,
        view,
        page: parsePageRequest(required(value, 'page', path), `${path}.page`, 'steps'),
      };
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation,
      selection,
      view,
      page: parsePageRequest(
        required(value, 'page', path),
        `${path}.page`,
        'diagnostics',
      ),
    };
  }
  if (operation === 'find-form-nodes') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'selection',
        'withinStepId',
        'filters',
        'include',
        'page',
      ]),
    );
    const withinStepId = optional(value, 'withinStepId');
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation,
      selection: parseSelectionFromDetached(
        required(value, 'selection', path),
        `${path}.selection`,
      ),
      ...(withinStepId === undefined
        ? {}
        : { withinStepId: boundedId(withinStepId, `${path}.withinStepId`) }),
      filters: parseFindNodeFilters(
        required(value, 'filters', path),
        `${path}.filters`,
      ),
      include: parseIncludeSet(
        required(value, 'include', path),
        `${path}.include`,
      ),
      page: parsePageRequest(required(value, 'page', path), `${path}.page`, 'nodes'),
    };
  }
  if (operation === 'get-e2e-slice') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'selection',
        'withinStepId',
        'nodeIds',
        'goal',
        'includeOutgoingEffects',
      ]),
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation,
      selection: parseSelectionFromDetached(
        required(value, 'selection', path),
        `${path}.selection`,
      ),
      withinStepId: boundedId(
        required(value, 'withinStepId', path),
        `${path}.withinStepId`,
      ),
      nodeIds: parseCanonicalStringSet(
        required(value, 'nodeIds', path),
        `${path}.nodeIds`,
        1,
      ),
      goal: enumValue(required(value, 'goal', path), `${path}.goal`, [
        'boundary',
        'negative',
        'positive',
      ] as const),
      includeOutgoingEffects: booleanValue(
        required(value, 'includeOutgoingEffects', path),
        `${path}.includeOutgoingEffects`,
      ),
    };
  }
  fail(`${path}.operation`, 'is not supported.');
}

export function parseAgentContextQuery(input: unknown): AgentContextQuery {
  const path = 'agentContextQuery';
  return parseQueryFromDetached(cloneValidatedDataOnly(input, path), path);
}

export function canonicalizeAgentContextQuery(input: unknown): string {
  return canonicalStringify(parseAgentContextQuery(input));
}

export interface AgentContextQueryCursorBinding {
  readonly collection: AgentContextPageableCollection;
  readonly normalizedQuery: string;
  readonly context: AgentContextQuerySelection | null;
  readonly sortOrder:
    | 'diagnostic-kind'
    | 'node-id'
    | 'step-ordinal'
    | 'usage-identity';
  readonly disclosure:
    | 'context-diagnostics'
    | 'context-summary'
    | 'nodes'
    | 'usage-candidates';
  readonly include: readonly AgentContextNodeDetailAspect[];
}

function withoutCursor(query: AgentContextQuery): AgentContextQuery {
  if (!('page' in query) || query.page.cursor === undefined) return query;
  const page = {
    collection: query.page.collection,
    limit: query.page.limit,
  };
  return { ...query, page } as AgentContextQuery;
}

export function createAgentContextQueryCursorBinding(
  queryInput: unknown,
  collectionInput: unknown,
): AgentContextQueryCursorBinding {
  const query = parseAgentContextQuery(queryInput);
  const collection = enumValue(
    collectionInput,
    'agentContextQueryCursor.collection',
    PAGEABLE_COLLECTIONS,
  );
  let expectedCollection: AgentContextPageableCollection;
  let sortOrder: AgentContextQueryCursorBinding['sortOrder'];
  let disclosure: AgentContextQueryCursorBinding['disclosure'];
  let context: AgentContextQuerySelection | null;
  let include: readonly AgentContextNodeDetailAspect[] = [];
  if (query.operation === 'search-form-usages') {
    expectedCollection = 'candidates';
    sortOrder = 'usage-identity';
    disclosure = 'usage-candidates';
    context = null;
  } else if (query.operation === 'get-form-context') {
    if (query.view === 'journey') {
      fail('agentContextQueryCursor.collection', 'journey is not pageable.');
    }
    expectedCollection = query.view === 'summary' ? 'steps' : 'diagnostics';
    sortOrder = query.view === 'summary' ? 'step-ordinal' : 'diagnostic-kind';
    disclosure =
      query.view === 'summary' ? 'context-summary' : 'context-diagnostics';
    context = query.selection;
  } else if (query.operation === 'find-form-nodes') {
    expectedCollection = 'nodes';
    sortOrder = 'node-id';
    disclosure = 'nodes';
    context = query.selection;
    include = query.include;
  } else {
    fail('agentContextQueryCursor.collection', 'E2E slices are not pageable.');
  }
  if (collection !== expectedCollection) {
    fail(
      'agentContextQueryCursor.collection',
      `must be ${expectedCollection} for this query.`,
    );
  }
  const cursorFreeQuery = withoutCursor(query);
  return {
    collection,
    normalizedQuery: canonicalStringify(cursorFreeQuery),
    context,
    sortOrder,
    disclosure,
    include,
  };
}

export type AgentContextQueryReason =
  | {
      readonly kind: 'usage-ambiguous';
      readonly usages: readonly AgentContextUsageCandidateIdentity[];
    }
  | { readonly kind: 'usage-absent-authoritative' }
  | { readonly kind: 'usage-absence-not-authoritative' }
  | { readonly kind: 'node-ambiguous'; readonly nodeIds: readonly string[] }
  | { readonly kind: 'node-absent' }
  | { readonly kind: 'step-scope-mismatch'; readonly nodeIds: readonly string[] }
  | {
      readonly kind: 'cross-step-prerequisite-required';
      readonly fromStepId: string;
      readonly transitionId: string;
      readonly toStepId: string;
    }
  | {
      readonly kind: 'cross-step-transition-ambiguous';
      readonly transitionIds: readonly string[];
    }
  | {
      readonly kind: 'cross-step-transition-unavailable';
      readonly fromStepId: string;
      readonly toStepId: string;
    }
  | {
      readonly kind: 'prerequisite-cycle';
      readonly nodeIds: readonly string[];
    }
  | { readonly kind: 'atomic-record-too-large' }
  | { readonly kind: 'atomic-view-too-large' };

export type AgentContextUsageCandidateIdentity =
  | AgentContextDeclaredUsageSelection
  | {
      readonly kind: 'callsite';
      readonly projectId: string;
      readonly callsiteKey: string;
    };

export interface AgentContextUsageCandidateProjection {
  readonly usage: AgentContextUsageCandidateIdentity;
  readonly projectId: string;
  readonly form?: AgentContextFormReference;
  readonly matchReasons: readonly string[];
}

export interface AgentContextNodeCandidateProjection {
  readonly nodeId: string;
  readonly modelPath: readonly AgentContextQueryModelPathSegment[];
  readonly label?: string;
  readonly semanticType?: string;
  readonly capabilities?: readonly AgentContextQueryCapability[];
}

export interface AgentContextStepSummaryProjection {
  readonly id: string;
  readonly ordinal: number;
  readonly nodeCount: number;
  readonly actionIds: readonly string[];
}

export interface AgentContextJourneySummaryProjection {
  readonly id: string;
  readonly version: number;
  readonly entryId: string;
  readonly landingStepId: string;
  readonly stepIds: readonly string[];
  readonly actionIds: readonly string[];
  readonly outcomeIds: readonly string[];
  readonly transitionIds: readonly string[];
}

export interface AgentContextE2eSliceProjection {
  readonly withinStepId: string;
  readonly focusNodeIds: readonly string[];
  readonly nodeIds: readonly string[];
  readonly prerequisiteNodeIds: readonly string[];
  readonly effectIds: readonly string[];
}

export type AgentContextPageResult<
  Collection extends AgentContextPageableCollection,
> =
  | {
      readonly collection: Collection;
      readonly truncated: false;
    }
  | {
      readonly collection: Collection;
      readonly truncated: true;
      readonly nextCursor: string;
    };

export type SearchFormUsagesResult =
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'search-form-usages';
      readonly status: 'complete';
      readonly candidates: readonly AgentContextUsageCandidateProjection[];
      readonly page: AgentContextPageResult<'candidates'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'search-form-usages';
      readonly status: 'ambiguous';
      readonly candidates: readonly AgentContextUsageCandidateProjection[];
      readonly page: AgentContextPageResult<'candidates'>;
      readonly reason: Extract<AgentContextQueryReason, { kind: 'usage-ambiguous' }>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'search-form-usages';
      readonly status: 'not-found';
      readonly candidates: readonly [];
      readonly page: AgentContextPageResult<'candidates'>;
      readonly reason: Extract<
        AgentContextQueryReason,
        {
          kind:
            | 'usage-absent-authoritative'
            | 'usage-absence-not-authoritative';
        }
      >;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'search-form-usages';
      readonly status: 'refused';
      readonly reason: Extract<
        AgentContextQueryReason,
        { kind: 'atomic-record-too-large' }
      >;
    };

export type GetFormContextResult =
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly status: 'complete';
      readonly view: 'summary';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly steps: readonly AgentContextStepSummaryProjection[];
      readonly page: AgentContextPageResult<'steps'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly status: 'complete';
      readonly view: 'diagnostics';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly reasons: readonly AgentContextQueryReason[];
      readonly page: AgentContextPageResult<'diagnostics'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly status: 'complete';
      readonly view: 'journey';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly journey: AgentContextJourneySummaryProjection;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly status: 'refused';
      readonly view: 'summary' | 'diagnostics';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly reason: Extract<
        AgentContextQueryReason,
        { kind: 'atomic-record-too-large' }
      >;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly status: 'refused';
      readonly view: 'journey';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly reason: Extract<
        AgentContextQueryReason,
        { kind: 'atomic-record-too-large' | 'atomic-view-too-large' }
      >;
    };

export type FindFormNodesResult =
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'find-form-nodes';
      readonly status: 'complete';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly candidates: readonly AgentContextNodeCandidateProjection[];
      readonly page: AgentContextPageResult<'nodes'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'find-form-nodes';
      readonly status: 'ambiguous';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly candidates: readonly AgentContextNodeCandidateProjection[];
      readonly page: AgentContextPageResult<'nodes'>;
      readonly reason: Extract<AgentContextQueryReason, { kind: 'node-ambiguous' }>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'find-form-nodes';
      readonly status: 'not-found';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly candidates: readonly [];
      readonly page: AgentContextPageResult<'nodes'>;
      readonly reason: Extract<AgentContextQueryReason, { kind: 'node-absent' }>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'find-form-nodes';
      readonly status: 'refused';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly reason: Extract<
        AgentContextQueryReason,
        { kind: 'atomic-record-too-large' }
      >;
    };

export type GetE2eSliceResult =
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-e2e-slice';
      readonly status: 'complete';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly slice: AgentContextE2eSliceProjection;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-e2e-slice';
      readonly status: 'refused';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly reason: Extract<
        AgentContextQueryReason,
        {
          kind:
            | 'step-scope-mismatch'
            | 'cross-step-prerequisite-required'
            | 'cross-step-transition-ambiguous'
            | 'cross-step-transition-unavailable'
            | 'prerequisite-cycle'
            | 'atomic-record-too-large'
            | 'atomic-view-too-large';
        }
      >;
    };

export type AgentContextQueryResult =
  | SearchFormUsagesResult
  | GetFormContextResult
  | FindFormNodesResult
  | GetE2eSliceResult;

function parseFreshness(input: unknown, path: string): AgentContextFreshness {
  return enumValue(input, path, ['current', 'stale', 'unknown'] as const);
}

function parsePageResult<Collection extends AgentContextPageableCollection>(
  input: unknown,
  path: string,
  collection: Collection,
): AgentContextPageResult<Collection> {
  const union = record(
    input,
    path,
    new Set(['collection', 'truncated', 'nextCursor']),
  );
  if (required(union, 'collection', path) !== collection) {
    fail(`${path}.collection`, `must be ${collection}.`);
  }
  const truncated = required(union, 'truncated', path);
  if (truncated === false) {
    record(input, path, new Set(['collection', 'truncated']));
    return { collection, truncated: false };
  }
  if (truncated === true) {
    const value = record(
      input,
      path,
      new Set(['collection', 'truncated', 'nextCursor']),
    );
    return {
      collection,
      truncated: true,
      nextCursor: cursorText(
        required(value, 'nextCursor', path),
        `${path}.nextCursor`,
      ),
    };
  }
  fail(`${path}.truncated`, 'must be a boolean.');
}

function parseUsageIdentity(
  input: unknown,
  path: string,
): AgentContextUsageCandidateIdentity {
  const union = record(
    input,
    path,
    new Set(['kind', 'usageId', 'version', 'projectId', 'callsiteKey']),
  );
  const kind = required(union, 'kind', path);
  if (kind === 'declared') {
    const value = record(input, path, new Set(['kind', 'usageId', 'version']));
    return {
      kind,
      usageId: boundedId(required(value, 'usageId', path), `${path}.usageId`),
      version: positiveInteger(required(value, 'version', path), `${path}.version`),
    };
  }
  if (kind === 'callsite') {
    const value = record(input, path, new Set(['kind', 'projectId', 'callsiteKey']));
    return {
      kind,
      projectId: boundedId(required(value, 'projectId', path), `${path}.projectId`),
      callsiteKey: boundedId(
        required(value, 'callsiteKey', path),
        `${path}.callsiteKey`,
      ),
    };
  }
  fail(`${path}.kind`, 'must be declared or callsite.');
}

function parseFormReference(
  input: unknown,
  path: string,
): AgentContextFormReference {
  const value = record(
    input,
    path,
    new Set(['projectId', 'formId', 'contractHash']),
  );
  return {
    projectId: boundedId(required(value, 'projectId', path), `${path}.projectId`),
    formId: boundedId(required(value, 'formId', path), `${path}.formId`),
    contractHash: sha256(
      required(value, 'contractHash', path),
      `${path}.contractHash`,
    ),
  };
}

function parseUsageCandidate(
  input: unknown,
  path: string,
): AgentContextUsageCandidateProjection {
  const value = record(
    input,
    path,
    new Set(['usage', 'projectId', 'form', 'matchReasons']),
  );
  const form = optional(value, 'form');
  return {
    usage: parseUsageIdentity(required(value, 'usage', path), `${path}.usage`),
    projectId: boundedId(required(value, 'projectId', path), `${path}.projectId`),
    ...(form === undefined ? {} : { form: parseFormReference(form, `${path}.form`) }),
    matchReasons: parseCanonicalStringSet(
      required(value, 'matchReasons', path),
      `${path}.matchReasons`,
    ),
  };
}

function parseNodeCandidate(
  input: unknown,
  path: string,
): AgentContextNodeCandidateProjection {
  const value = record(
    input,
    path,
    new Set(['nodeId', 'modelPath', 'label', 'semanticType', 'capabilities']),
  );
  const label = optional(value, 'label');
  const semanticType = optional(value, 'semanticType');
  const capabilities = optional(value, 'capabilities');
  return {
    nodeId: boundedId(required(value, 'nodeId', path), `${path}.nodeId`),
    modelPath: parseModelPath(
      required(value, 'modelPath', path),
      `${path}.modelPath`,
    ),
    ...(label === undefined ? {} : { label: boundedText(label, `${path}.label`) }),
    ...(semanticType === undefined
      ? {}
      : { semanticType: boundedId(semanticType, `${path}.semanticType`) }),
    ...(capabilities === undefined
      ? {}
      : { capabilities: parseCapabilitySet(capabilities, `${path}.capabilities`) }),
  };
}

function parseReason(input: unknown, path: string): AgentContextQueryReason {
  const union = record(
    input,
    path,
    new Set([
      'kind',
      'usages',
      'nodeIds',
      'fromStepId',
      'transitionId',
      'toStepId',
      'transitionIds',
    ]),
  );
  const kind = required(union, 'kind', path);
  if (kind === 'usage-ambiguous') {
    const value = record(input, path, new Set(['kind', 'usages']));
    const usages = parseCandidateList(
      required(value, 'usages', path),
      `${path}.usages`,
      parseUsageIdentity,
      canonicalStringify,
    );
    if (usages.length < 2) {
      fail(`${path}.usages`, 'must contain at least two usage identities.');
    }
    return {
      kind,
      usages,
    };
  }
  if (kind === 'node-ambiguous') {
    const value = record(input, path, new Set(['kind', 'nodeIds']));
    return {
      kind,
      nodeIds: parseCanonicalStringSet(
        required(value, 'nodeIds', path),
        `${path}.nodeIds`,
        2,
      ),
    };
  }
  if (kind === 'step-scope-mismatch' || kind === 'prerequisite-cycle') {
    const value = record(input, path, new Set(['kind', 'nodeIds']));
    return {
      kind,
      nodeIds: parseCanonicalStringSet(
        required(value, 'nodeIds', path),
        `${path}.nodeIds`,
        1,
      ),
    };
  }
  if (kind === 'cross-step-prerequisite-required') {
    const value = record(
      input,
      path,
      new Set(['kind', 'fromStepId', 'transitionId', 'toStepId']),
    );
    return {
      kind,
      fromStepId: boundedId(
        required(value, 'fromStepId', path),
        `${path}.fromStepId`,
      ),
      transitionId: boundedId(
        required(value, 'transitionId', path),
        `${path}.transitionId`,
      ),
      toStepId: boundedId(required(value, 'toStepId', path), `${path}.toStepId`),
    };
  }
  if (kind === 'cross-step-transition-ambiguous') {
    const value = record(input, path, new Set(['kind', 'transitionIds']));
    return {
      kind,
      transitionIds: parseCanonicalStringSet(
        required(value, 'transitionIds', path),
        `${path}.transitionIds`,
        2,
      ),
    };
  }
  if (kind === 'cross-step-transition-unavailable') {
    const value = record(
      input,
      path,
      new Set(['kind', 'fromStepId', 'toStepId']),
    );
    return {
      kind,
      fromStepId: boundedId(
        required(value, 'fromStepId', path),
        `${path}.fromStepId`,
      ),
      toStepId: boundedId(required(value, 'toStepId', path), `${path}.toStepId`),
    };
  }
  if (
    kind === 'usage-absent-authoritative' ||
    kind === 'usage-absence-not-authoritative' ||
    kind === 'node-absent' ||
    kind === 'atomic-record-too-large' ||
    kind === 'atomic-view-too-large'
  ) {
    record(input, path, new Set(['kind']));
    return { kind };
  }
  fail(`${path}.kind`, 'is not a supported query reason.');
}

function parseCandidateList<T>(
  input: unknown,
  path: string,
  parse: (entry: unknown, path: string) => T,
  identity: (entry: T) => string,
): readonly T[] {
  const values = array(input, path).map((entry, index) =>
    parse(entry, `${path}[${index}]`),
  );
  assertCanonicalSet(values, path, identity, (left, right) =>
    compareText(identity(left), identity(right)),
  );
  return values;
}

function parseSearchResult(input: unknown, path: string): SearchFormUsagesResult {
  const union = record(
    input,
    path,
    new Set(['schemaVersion', 'operation', 'status', 'candidates', 'page', 'reason']),
  );
  const status = required(union, 'status', path);
  if (status === 'refused') {
    const value = record(
      input,
      path,
      new Set(['schemaVersion', 'operation', 'status', 'reason']),
    );
    const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
    if (reason.kind !== 'atomic-record-too-large') {
      fail(`${path}.reason.kind`, 'is not valid for refused usage search.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status,
      reason,
    };
  }
  if (status !== 'complete' && status !== 'ambiguous' && status !== 'not-found') {
    fail(`${path}.status`, 'is not valid for usage search.');
  }
  const value = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'candidates',
      'page',
      ...(status === 'complete' ? [] : ['reason']),
    ]),
  );
  const candidates = parseCandidateList(
    required(value, 'candidates', path),
    `${path}.candidates`,
    parseUsageCandidate,
    (candidate) => canonicalStringify(candidate.usage),
  );
  const page = parsePageResult(required(value, 'page', path), `${path}.page`, 'candidates');
  if (status === 'complete') {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status,
      candidates,
      page,
    };
  }
  const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
  if (status === 'ambiguous') {
    if (reason.kind !== 'usage-ambiguous') {
      fail(`${path}.reason.kind`, 'must be usage-ambiguous.');
    }
    if (!sameJson(candidates.map(({ usage }) => usage), reason.usages)) {
      fail(
        `${path}.reason.usages`,
        'must equal the candidate usage identities.',
      );
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status,
      candidates,
      page,
      reason,
    };
  }
  if (candidates.length !== 0) fail(`${path}.candidates`, 'must be empty.');
  if (
    reason.kind !== 'usage-absent-authoritative' &&
    reason.kind !== 'usage-absence-not-authoritative'
  ) {
    fail(`${path}.reason.kind`, 'is not a usage absence reason.');
  }
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'search-form-usages',
    status,
    candidates: [],
    page,
    reason,
  };
}

function parseStepSummary(
  input: unknown,
  path: string,
): AgentContextStepSummaryProjection {
  const value = record(
    input,
    path,
    new Set(['id', 'ordinal', 'nodeCount', 'actionIds']),
  );
  return {
    id: boundedId(required(value, 'id', path), `${path}.id`),
    ordinal: nonNegativeInteger(required(value, 'ordinal', path), `${path}.ordinal`),
    nodeCount: nonNegativeInteger(
      required(value, 'nodeCount', path),
      `${path}.nodeCount`,
    ),
    actionIds: parseCanonicalStringSet(
      required(value, 'actionIds', path),
      `${path}.actionIds`,
    ),
  };
}

function parseJourneySummary(
  input: unknown,
  path: string,
): AgentContextJourneySummaryProjection {
  const value = record(
    input,
    path,
    new Set([
      'id',
      'version',
      'entryId',
      'landingStepId',
      'stepIds',
      'actionIds',
      'outcomeIds',
      'transitionIds',
    ]),
  );
  return {
    id: boundedId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(required(value, 'version', path), `${path}.version`),
    entryId: boundedId(required(value, 'entryId', path), `${path}.entryId`),
    landingStepId: boundedId(
      required(value, 'landingStepId', path),
      `${path}.landingStepId`,
    ),
    stepIds: parseUniqueStringList(
      required(value, 'stepIds', path),
      `${path}.stepIds`,
    ),
    actionIds: parseCanonicalStringSet(
      required(value, 'actionIds', path),
      `${path}.actionIds`,
    ),
    outcomeIds: parseCanonicalStringSet(
      required(value, 'outcomeIds', path),
      `${path}.outcomeIds`,
    ),
    transitionIds: parseCanonicalStringSet(
      required(value, 'transitionIds', path),
      `${path}.transitionIds`,
    ),
  };
}

function parseContextResult(input: unknown, path: string): GetFormContextResult {
  const union = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'view',
      'selection',
      'freshness',
      'steps',
      'reasons',
      'journey',
      'page',
      'reason',
    ]),
  );
  const status = required(union, 'status', path);
  const view = enumValue(required(union, 'view', path), `${path}.view`, [
    'diagnostics',
    'journey',
    'summary',
  ] as const);
  const selection = parseSelectionFromDetached(
    required(union, 'selection', path),
    `${path}.selection`,
  );
  const freshness = parseFreshness(required(union, 'freshness', path), `${path}.freshness`);
  if (status === 'refused') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'status',
        'view',
        'selection',
        'freshness',
        'reason',
      ]),
    );
    const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
    if (
      reason.kind !== 'atomic-record-too-large' &&
      reason.kind !== 'atomic-view-too-large'
    ) {
      fail(`${path}.reason.kind`, 'is not valid for context refusal.');
    }
    if (view === 'journey') {
      return {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        status,
        view,
        selection,
        freshness,
        reason,
      };
    }
    if (reason.kind !== 'atomic-record-too-large') {
      fail(
        `${path}.reason.kind`,
        'summary and diagnostics may refuse only an oversized atomic record.',
      );
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status,
      view,
      selection,
      freshness,
      reason,
    };
  }
  if (status !== 'complete') fail(`${path}.status`, 'must be complete or refused.');
  if (view === 'summary') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'status',
        'view',
        'selection',
        'freshness',
        'steps',
        'page',
      ]),
    );
    const steps = parseCandidateList(
      required(value, 'steps', path),
      `${path}.steps`,
      parseStepSummary,
      (step) => `${String(step.ordinal).padStart(16, '0')}\0${step.id}`,
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status,
      view,
      selection,
      freshness,
      steps,
      page: parsePageResult(required(value, 'page', path), `${path}.page`, 'steps'),
    };
  }
  if (view === 'diagnostics') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'status',
        'view',
        'selection',
        'freshness',
        'reasons',
        'page',
      ]),
    );
    const reasons = array(required(value, 'reasons', path), `${path}.reasons`).map(
      (entry, index) => parseReason(entry, `${path}.reasons[${index}]`),
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status,
      view,
      selection,
      freshness,
      reasons,
      page: parsePageResult(
        required(value, 'page', path),
        `${path}.page`,
        'diagnostics',
      ),
    };
  }
  const value = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'view',
      'selection',
      'freshness',
      'journey',
    ]),
  );
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'get-form-context',
    status,
    view,
    selection,
    freshness,
    journey: parseJourneySummary(
      required(value, 'journey', path),
      `${path}.journey`,
    ),
  };
}

function parseNodeResult(input: unknown, path: string): FindFormNodesResult {
  const union = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'selection',
      'freshness',
      'candidates',
      'page',
      'reason',
    ]),
  );
  const status = required(union, 'status', path);
  const selection = parseSelectionFromDetached(
    required(union, 'selection', path),
    `${path}.selection`,
  );
  const freshness = parseFreshness(required(union, 'freshness', path), `${path}.freshness`);
  if (status === 'refused') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'status',
        'selection',
        'freshness',
        'reason',
      ]),
    );
    const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
    if (reason.kind !== 'atomic-record-too-large') {
      fail(`${path}.reason.kind`, 'must be atomic-record-too-large.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status,
      selection,
      freshness,
      reason,
    };
  }
  if (status !== 'complete' && status !== 'ambiguous' && status !== 'not-found') {
    fail(`${path}.status`, 'is not valid for node search.');
  }
  const value = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'selection',
      'freshness',
      'candidates',
      'page',
      ...(status === 'complete' ? [] : ['reason']),
    ]),
  );
  const candidates = parseCandidateList(
    required(value, 'candidates', path),
    `${path}.candidates`,
    parseNodeCandidate,
    (candidate) => candidate.nodeId,
  );
  const page = parsePageResult(required(value, 'page', path), `${path}.page`, 'nodes');
  if (status === 'complete') {
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status,
      selection,
      freshness,
      candidates,
      page,
    };
  }
  const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
  if (status === 'ambiguous') {
    if (reason.kind !== 'node-ambiguous') {
      fail(`${path}.reason.kind`, 'must be node-ambiguous.');
    }
    const candidateIds = candidates.map(({ nodeId }) => nodeId);
    if (!sameJson(candidateIds, reason.nodeIds)) {
      fail(`${path}.reason.nodeIds`, 'must equal the candidate node IDs.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status,
      selection,
      freshness,
      candidates,
      page,
      reason,
    };
  }
  if (candidates.length !== 0) fail(`${path}.candidates`, 'must be empty.');
  if (reason.kind !== 'node-absent') fail(`${path}.reason.kind`, 'must be node-absent.');
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'find-form-nodes',
    status,
    selection,
    freshness,
    candidates: [],
    page,
    reason,
  };
}

function parseSliceProjection(
  input: unknown,
  path: string,
): AgentContextE2eSliceProjection {
  const value = record(
    input,
    path,
    new Set([
      'withinStepId',
      'focusNodeIds',
      'nodeIds',
      'prerequisiteNodeIds',
      'effectIds',
    ]),
  );
  return {
    withinStepId: boundedId(
      required(value, 'withinStepId', path),
      `${path}.withinStepId`,
    ),
    focusNodeIds: parseCanonicalStringSet(
      required(value, 'focusNodeIds', path),
      `${path}.focusNodeIds`,
      1,
    ),
    nodeIds: parseCanonicalStringSet(
      required(value, 'nodeIds', path),
      `${path}.nodeIds`,
      1,
    ),
    prerequisiteNodeIds: parseCanonicalStringSet(
      required(value, 'prerequisiteNodeIds', path),
      `${path}.prerequisiteNodeIds`,
    ),
    effectIds: parseCanonicalStringSet(
      required(value, 'effectIds', path),
      `${path}.effectIds`,
    ),
  };
}

function parseSliceResult(input: unknown, path: string): GetE2eSliceResult {
  const union = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'selection',
      'freshness',
      'slice',
      'reason',
    ]),
  );
  const status = required(union, 'status', path);
  const selection = parseSelectionFromDetached(
    required(union, 'selection', path),
    `${path}.selection`,
  );
  const freshness = parseFreshness(required(union, 'freshness', path), `${path}.freshness`);
  if (status === 'complete') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'status',
        'selection',
        'freshness',
        'slice',
      ]),
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-e2e-slice',
      status,
      selection,
      freshness,
      slice: parseSliceProjection(required(value, 'slice', path), `${path}.slice`),
    };
  }
  if (status !== 'refused') fail(`${path}.status`, 'must be complete or refused.');
  const value = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'selection',
      'freshness',
      'reason',
    ]),
  );
  const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
  if (
    reason.kind === 'usage-ambiguous' ||
    reason.kind === 'usage-absent-authoritative' ||
    reason.kind === 'usage-absence-not-authoritative' ||
    reason.kind === 'node-ambiguous' ||
    reason.kind === 'node-absent'
  ) {
    fail(`${path}.reason.kind`, 'is not valid for an E2E slice refusal.');
  }
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'get-e2e-slice',
    status,
    selection,
    freshness,
    reason,
  };
}

export function parseAgentContextQueryResult(
  input: unknown,
): AgentContextQueryResult {
  const path = 'agentContextQueryResult';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'view',
      'selection',
      'freshness',
      'candidates',
      'page',
      'reason',
      'steps',
      'reasons',
      'journey',
      'slice',
    ]),
  );
  exactSchemaVersion(
    required(value, 'schemaVersion', path),
    `${path}.schemaVersion`,
  );
  const operation = required(value, 'operation', path);
  if (operation === 'search-form-usages') return parseSearchResult(detached, path);
  if (operation === 'get-form-context') return parseContextResult(detached, path);
  if (operation === 'find-form-nodes') return parseNodeResult(detached, path);
  if (operation === 'get-e2e-slice') return parseSliceResult(detached, path);
  fail(`${path}.operation`, 'is not supported.');
}

export function canonicalizeAgentContextQueryResult(input: unknown): string {
  return canonicalStringify(parseAgentContextQueryResult(input));
}

export type AgentContextLiveOwnerRole =
  | 'artifact-set'
  | 'workspace-index'
  | 'source-usage-catalog'
  | 'journey-catalog'
  | 'form-contract'
  | 'scenario-artifact'
  | 'execution-authority';

export type AgentContextLiveOwnerReference =
  | {
      readonly role: 'artifact-set';
      readonly reference: AgentContextArtifactSetIdentity;
    }
  | {
      readonly role: 'workspace-index';
      readonly reference: AgentContextWorkspaceIndexReference;
    }
  | {
      readonly role: 'source-usage-catalog' | 'journey-catalog';
      readonly reference: AgentContextArtifactReference;
    }
  | {
      readonly role: 'form-contract';
      readonly reference: AgentContextArtifactReference;
      readonly identity: AgentContextFormReference;
    }
  | {
      readonly role: 'scenario-artifact';
      readonly reference: AgentContextArtifactReference;
      readonly scenario: AgentContextScenarioReference;
    }
  | {
      readonly role: 'execution-authority';
      readonly reference: AgentContextArtifactReference;
      readonly executionAuthority: AgentContextExecutionAuthoritySelection;
    };

export interface AgentContextLiveOwnerState {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
  readonly repositoryRevision?: string;
  readonly owners: readonly AgentContextLiveOwnerReference[];
}

export type AgentContextFreshnessView =
  | 'usage-search'
  | 'context-summary'
  | 'context-diagnostics'
  | 'context-journey'
  | 'node-search'
  | 'e2e-slice';

const LIVE_OWNER_ROLES: readonly AgentContextLiveOwnerRole[] = [
  'artifact-set',
  'workspace-index',
  'source-usage-catalog',
  'journey-catalog',
  'form-contract',
  'scenario-artifact',
  'execution-authority',
];

const REQUIRED_FRESHNESS_ROLES: Readonly<
  Record<AgentContextFreshnessView, readonly AgentContextLiveOwnerRole[]>
> = {
  'usage-search': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog',
  ],
  'context-summary': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog',
    'journey-catalog',
    'form-contract',
    'execution-authority',
  ],
  'context-diagnostics': LIVE_OWNER_ROLES,
  'context-journey': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog',
    'journey-catalog',
  ],
  'node-search': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog',
    'form-contract',
    'scenario-artifact',
    'execution-authority',
  ],
  'e2e-slice': LIVE_OWNER_ROLES,
};

function repositoryRevision(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > 256 ||
    input.trim() !== input ||
    !/^[\x20-\x7e]+$/u.test(input)
  ) {
    fail(path, 'must be 1-256 printable ASCII provenance characters.');
  }
  return input;
}

function parseArtifactSetIdentity(
  input: unknown,
  path: string,
): AgentContextArtifactSetIdentity {
  const value = record(
    input,
    path,
    new Set(['schemaVersion', 'contentHash']),
  );
  if (
    required(value, 'schemaVersion', path) !==
    AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION}.`,
    );
  }
  return {
    schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function parseExecutionAuthoritySelection(
  input: unknown,
  path: string,
): AgentContextExecutionAuthoritySelection {
  const value = record(
    input,
    path,
    new Set(['usageId', 'usageVersion', 'basis']),
  );
  return {
    usageId: boundedId(
      required(value, 'usageId', path),
      `${path}.usageId`,
    ),
    usageVersion: positiveInteger(
      required(value, 'usageVersion', path),
      `${path}.usageVersion`,
    ),
    basis: parseBasis(required(value, 'basis', path), `${path}.basis`),
  };
}

function parseScenarioReference(
  input: unknown,
  path: string,
): AgentContextScenarioReference {
  const value = record(
    input,
    path,
    new Set(['id', 'version', 'artifactHash', 'basis']),
  );
  return {
    id: boundedId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(required(value, 'version', path), `${path}.version`),
    artifactHash: sha256(
      required(value, 'artifactHash', path),
      `${path}.artifactHash`,
    ),
    basis: parseBasis(required(value, 'basis', path), `${path}.basis`),
  };
}

function parseLiveOwnerReference(
  input: unknown,
  path: string,
): AgentContextLiveOwnerReference {
  const union = record(
    input,
    path,
    new Set(['role', 'reference', 'identity', 'scenario', 'executionAuthority']),
  );
  const role = enumValue(required(union, 'role', path), `${path}.role`, LIVE_OWNER_ROLES);
  if (role === 'artifact-set') {
    const value = record(input, path, new Set(['role', 'reference']));
    return {
      role,
      reference: parseArtifactSetIdentity(
        required(value, 'reference', path),
        `${path}.reference`,
      ),
    };
  }
  if (role === 'workspace-index') {
    const value = record(input, path, new Set(['role', 'reference']));
    return {
      role,
      reference: parseWorkspaceIndexReference(
        required(value, 'reference', path),
        `${path}.reference`,
      ),
    };
  }
  if (role === 'source-usage-catalog' || role === 'journey-catalog') {
    const value = record(input, path, new Set(['role', 'reference']));
    return {
      role,
      reference: parseTypedArtifactReference(
        required(value, 'reference', path),
        `${path}.reference`,
        role === 'source-usage-catalog'
          ? AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID
          : AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
        role === 'source-usage-catalog'
          ? AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION
          : AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
      ),
    };
  }
  if (role === 'form-contract') {
    const value = record(
      input,
      path,
      new Set(['role', 'reference', 'identity']),
    );
    return {
      role,
      reference: parseTypedArtifactReference(
        required(value, 'reference', path),
        `${path}.reference`,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
      ),
      identity: parseFormReference(
        required(value, 'identity', path),
        `${path}.identity`,
      ),
    };
  }
  if (role === 'scenario-artifact') {
    const value = record(
      input,
      path,
      new Set(['role', 'reference', 'scenario']),
    );
    return {
      role,
      reference: parseTypedArtifactReference(
        required(value, 'reference', path),
        `${path}.reference`,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
      ),
      scenario: parseScenarioReference(
        required(value, 'scenario', path),
        `${path}.scenario`,
      ),
    };
  }
  const value = record(
    input,
    path,
    new Set(['role', 'reference', 'executionAuthority']),
  );
  return {
    role,
    reference: parseTypedArtifactReference(
      required(value, 'reference', path),
      `${path}.reference`,
      AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
      AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    ),
    executionAuthority: parseExecutionAuthoritySelection(
      required(value, 'executionAuthority', path),
      `${path}.executionAuthority`,
    ),
  };
}

export function parseAgentContextLiveOwnerState(
  input: unknown,
): AgentContextLiveOwnerState {
  const path = 'agentContextLiveOwnerState';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    new Set(['schemaVersion', 'repositoryRevision', 'owners']),
  );
  exactSchemaVersion(
    required(value, 'schemaVersion', path),
    `${path}.schemaVersion`,
  );
  const revision = optional(value, 'repositoryRevision');
  const owners = array(required(value, 'owners', path), `${path}.owners`).map(
    (owner, index) =>
      parseLiveOwnerReference(owner, `${path}.owners[${index}]`),
  );
  assertCanonicalSet(
    owners,
    `${path}.owners`,
    ({ role }) => role,
    (left, right) =>
      LIVE_OWNER_ROLES.indexOf(left.role) - LIVE_OWNER_ROLES.indexOf(right.role),
  );
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    ...(revision === undefined
      ? {}
      : { repositoryRevision: repositoryRevision(revision, `${path}.repositoryRevision`) }),
    owners,
  };
}

export function canonicalizeAgentContextLiveOwnerState(input: unknown): string {
  return canonicalStringify(parseAgentContextLiveOwnerState(input));
}

export function createAgentContextPinnedLiveOwners(
  selectionInput: unknown,
): readonly AgentContextLiveOwnerReference[] {
  const selection = parseAgentContextQuerySelection(selectionInput);
  return [
    { role: 'artifact-set', reference: selection.artifactSet },
    { role: 'workspace-index', reference: selection.workspaceIndex },
    {
      role: 'source-usage-catalog',
      reference: selection.owners.sourceUsageCatalog,
    },
    { role: 'journey-catalog', reference: selection.owners.journeyCatalog },
    {
      role: 'form-contract',
      reference: selection.owners.formContract,
      identity: selection.form,
    },
    {
      role: 'scenario-artifact',
      reference: selection.owners.scenarioArtifact,
      scenario: selection.scenario,
    },
    {
      role: 'execution-authority',
      reference: selection.owners.executionAuthority,
      executionAuthority: selection.executionAuthority,
    },
  ];
}

export function evaluateAgentContextQueryFreshness(input: {
  readonly view: AgentContextFreshnessView;
  readonly selection: unknown;
  readonly live: unknown;
}): AgentContextFreshness {
  const view = enumValue(input.view, 'agentContextFreshness.view', [
    'usage-search',
    'context-summary',
    'context-diagnostics',
    'context-journey',
    'node-search',
    'e2e-slice',
  ] as const);
  const expectedOwners = createAgentContextPinnedLiveOwners(input.selection);
  const live = parseAgentContextLiveOwnerState(input.live);
  const expectedByRole = new Map(
    expectedOwners.map((owner) => [owner.role, owner] as const),
  );
  const liveByRole = new Map(
    live.owners.map((owner) => [owner.role, owner] as const),
  );
  const requiredRoles = REQUIRED_FRESHNESS_ROLES[view];
  let missing = false;
  for (const role of requiredRoles) {
    const expected = expectedByRole.get(role)!;
    const actual = liveByRole.get(role);
    if (actual === undefined) {
      missing = true;
      continue;
    }
    if (!sameJson(actual, expected)) return 'stale';
  }
  return missing ? 'unknown' : 'current';
}
