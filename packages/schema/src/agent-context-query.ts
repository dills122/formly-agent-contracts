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
  createAgentContextExecutionAuthority,
  parseAgentContextExecutionAuthority,
  type AgentContextCreatedItemCaptureAuthority,
  type AgentContextExecutionAuthority,
  type AgentContextExecutionBasis,
  type AgentContextNodeInteractionAuthority,
  type AgentContextPhysicalOperation,
  type AgentContextReadinessAuthority,
  type AgentContextScenarioReference,
  type AgentContextStateAssertionAuthority,
  type AgentContextUsageActionAuthority,
  type AgentContextUsageEntryAuthority,
  type AgentContextUsageOutcomeAuthority,
  type AgentContextUsageStepAuthority,
  type AgentContextUsageTransitionAuthority,
  type AgentContextValidationSurfaceAuthority,
  type AgentContextValueAssertionAuthority,
  type AgentContextValueCommitAuthority,
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
  createFormContract,
  parseArrayIndexProperty,
} from './canonical-json.js';
import {
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractConstraint,
  type ContractDiagnostic,
  type ContractEvidence,
  type ContractEffectAnalysis,
  type ContractInteractionProfile,
  type ContractLocator,
  type ContractNodeKind,
  type ContractNodeState,
  type ContractOption,
  type ContractOptionSource,
  type ContractPresentation,
  type ContractValueDomain,
  type FormContract,
} from './contract.js';
import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  parseCrossFieldEffectRegistry,
  type DeclaredCrossFieldEffect,
} from './cross-field-effect.js';
import type { FieldTypeWrapperPrecondition } from './field-type-interaction.js';
import { FIELD_TYPE_PROFILE_SCHEMA_VERSION } from './field-type-profile.js';
import { parseFormContract } from './validation.js';

export const AGENT_CONTEXT_QUERY_SCHEMA_VERSION = '0.1.0' as const;

export const AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_DEPTH = 128;
export const AGENT_CONTEXT_QUERY_MAX_DATA_GRAPH_NODES = 100_000;
export const AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE = 10_000;
export const AGENT_CONTEXT_QUERY_MAX_PAGE_SIZE = 200;
export const AGENT_CONTEXT_QUERY_MAX_CURSOR_LENGTH = 8_192;

/** @internal CTX-1 atomic projection bound; package publication remains CTX-1D. */
export const AGENT_CONTEXT_QUERY_MAX_ATOMIC_RECORD_GRAPH_NODES = 10_000;
/** @internal CTX-1 atomic projection bound; package publication remains CTX-1D. */
export const AGENT_CONTEXT_QUERY_MAX_ATOMIC_VIEW_GRAPH_NODES = 100_000;

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

export interface AgentContextUsageSearchScope {
  readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
  readonly artifactSet: AgentContextArtifactSetIdentity;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly sourceUsageCatalogs: readonly AgentContextArtifactReference[];
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
  readonly scope: AgentContextUsageSearchScope;
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

export interface AgentContextE2eSliceRequest {
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

function parseUsageSearchScopeFromDetached(
  input: unknown,
  path: string,
): AgentContextUsageSearchScope {
  const value = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'artifactSet',
      'workspaceIndex',
      'sourceUsageCatalogs',
    ]),
  );
  exactSchemaVersion(
    required(value, 'schemaVersion', path),
    `${path}.schemaVersion`,
  );
  const sourceUsageCatalogs = array(
    required(value, 'sourceUsageCatalogs', path),
    `${path}.sourceUsageCatalogs`,
  ).map((reference, index) =>
    parseTypedArtifactReference(
      reference,
      `${path}.sourceUsageCatalogs[${index}]`,
      AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
      AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    ),
  );
  if (sourceUsageCatalogs.length === 0) {
    fail(`${path}.sourceUsageCatalogs`, 'must contain at least one owner.');
  }
  assertCanonicalSet(
    sourceUsageCatalogs,
    `${path}.sourceUsageCatalogs`,
    referenceKey,
    compareReference,
  );
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: parseArtifactSetIdentity(
      required(value, 'artifactSet', path),
      `${path}.artifactSet`,
    ),
    workspaceIndex: parseWorkspaceIndexReference(
      required(value, 'workspaceIndex', path),
      `${path}.workspaceIndex`,
    ),
    sourceUsageCatalogs,
  };
}

export function parseAgentContextUsageSearchScope(
  input: unknown,
): AgentContextUsageSearchScope {
  const path = 'agentContextUsageSearchScope';
  return parseUsageSearchScopeFromDetached(
    cloneValidatedDataOnly(input, path),
    path,
  );
}

export function canonicalizeAgentContextUsageSearchScope(input: unknown): string {
  return canonicalStringify(parseAgentContextUsageSearchScope(input));
}

/** @internal CTX-1 source-module seam; package publication remains CTX-1D. */
export function validateAgentContextUsageSearchScopeAgainstParsedDataset(
  dataset: AgentContextQueryDataset,
  scopeInput: unknown,
): AgentContextUsageSearchScope {
  const scope = parseAgentContextUsageSearchScope(scopeInput);
  assertSame(
    scope.artifactSet,
    {
      schemaVersion: dataset.artifactSet.schemaVersion,
      contentHash: dataset.artifactSet.contentHash,
    },
    'agentContextUsageSearchScope.artifactSet',
  );
  assertSame(
    scope.workspaceIndex,
    dataset.artifactSet.workspaceIndex,
    'agentContextUsageSearchScope.workspaceIndex',
  );
  assertSame(
    scope.sourceUsageCatalogs,
    dataset.sourceUsageCatalogs.map(({ reference }) => reference),
    'agentContextUsageSearchScope.sourceUsageCatalogs',
  );
  return scope;
}

export function validateAgentContextUsageSearchScope(
  datasetInput: unknown,
  scopeInput: unknown,
): AgentContextUsageSearchScope {
  return validateAgentContextUsageSearchScopeAgainstParsedDataset(
    parseAgentContextQueryDataset(datasetInput),
    scopeInput,
  );
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

function collectFormContractNodeIds(
  nodes: FormContract['nodes'],
): readonly string[] {
  return collectFormContractNodes(nodes).map(({ id }) => id);
}

/** @internal CTX-1 source-module seam; package publication remains CTX-1D. */
export function validateAgentContextQuerySelectionAgainstParsedDataset(
  dataset: AgentContextQueryDataset,
  selectionInput: unknown,
): AgentContextQuerySelection {
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

  assertSame(
    {
      id: authority.usage.entry.id,
      landingStepId: authority.usage.entry.landingStepId,
    },
    {
      id: journey.entry.id,
      landingStepId: journey.entry.landingStepId,
    },
    'agentContextQuerySelection.executionAuthority.usage.entry',
  );
  const relevantJourneySteps = journey.steps.filter((step) =>
    step.usages.some((usageReference) =>
      sameJson(usageReference, selection.usage),
    ),
  );
  if (
    relevantJourneySteps.some(
      (step) =>
        !step.forms.some((formReference) =>
          sameJson(formReference, selection.form),
        ),
    )
  ) {
    fail(
      'agentContextQuerySelection.journey.steps',
      'every selected-usage step must contain the selected form.',
    );
  }
  assertSame(
    authority.usage.steps.map(({ id, ordinal, actionIds }) => ({
      id,
      ordinal,
      actionIds,
    })),
    relevantJourneySteps.map(({ id, ordinal, actionIds }) => ({
      id,
      ordinal,
      actionIds,
    })),
    'agentContextQuerySelection.executionAuthority.usage.steps',
  );
  const authorityNodeIds = authority.usage.steps
    .flatMap(({ nodeIds }) => nodeIds)
    .sort(compareText);
  const contractNodeIds = [...collectFormContractNodeIds(formContract.nodes)].sort(
    compareText,
  );
  const scenarioNodeIds = [
    ...collectFormContractNodeIds(scenarioArtifact.nodes),
  ].sort(compareText);
  assertSame(
    authorityNodeIds,
    contractNodeIds,
    'agentContextQuerySelection.executionAuthority.usage.steps.nodeIds',
  );
  assertSame(
    scenarioNodeIds,
    contractNodeIds,
    'agentContextQuerySelection.scenarioArtifact.nodes',
  );
  const relevantStepIds = new Set(relevantJourneySteps.map(({ id }) => id));
  const relevantActionIds = new Set(
    relevantJourneySteps.flatMap(({ actionIds }) => actionIds),
  );
  const relevantActions = journey.actions.filter(({ id }) =>
    relevantActionIds.has(id),
  );
  const relevantOutcomeIds = new Set(
    relevantActions.flatMap(({ outcomeIds }) => outcomeIds),
  );
  const relevantOutcomes = journey.outcomes.filter(({ id }) =>
    relevantOutcomeIds.has(id),
  );
  const relevantTransitions = journey.transitions.filter(
    ({ fromStepId, toStepId, actionId, outcomeId }) =>
      relevantStepIds.has(fromStepId) &&
      relevantStepIds.has(toStepId) &&
      relevantActionIds.has(actionId) &&
      relevantOutcomeIds.has(outcomeId),
  );
  assertSame(
    authority.usage.actions.map(({ id, kind, outcomeIds }) => ({
      id,
      kind,
      outcomeIds,
    })),
    relevantActions.map(({ id, kind, outcomeIds }) => ({
      id,
      kind,
      outcomeIds,
    })),
    'agentContextQuerySelection.executionAuthority.usage.actions',
  );
  assertSame(
    authority.usage.outcomes.map(({ id, kind }) => ({ id, kind })),
    relevantOutcomes.map(({ id, kind }) => ({ id, kind })),
    'agentContextQuerySelection.executionAuthority.usage.outcomes',
  );
  assertSame(
    authority.usage.transitions.map(
      ({ id, version, fromStepId, actionId, outcomeId, toStepId }) => ({
        id,
        version,
        fromStepId,
        actionId,
        outcomeId,
        toStepId,
      }),
    ),
    relevantTransitions.map(
      ({ id, version, fromStepId, actionId, outcomeId, toStepId }) => ({
        id,
        version,
        fromStepId,
        actionId,
        outcomeId,
        toStepId,
      }),
    ),
    'agentContextQuerySelection.executionAuthority.usage.transitions',
  );
  return selection;
}

export function validateAgentContextQuerySelection(
  datasetInput: unknown,
  selectionInput: unknown,
): AgentContextQuerySelection {
  return validateAgentContextQuerySelectionAgainstParsedDataset(
    parseAgentContextQueryDataset(datasetInput),
    selectionInput,
  );
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

function parseE2eSliceRequest(
  input: unknown,
  path: string,
): AgentContextE2eSliceRequest {
  const value = record(
    input,
    path,
    new Set(['withinStepId', 'nodeIds', 'goal', 'includeOutgoingEffects']),
  );
  return {
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

function parseQueryFromDetached(input: unknown, path: string): AgentContextQuery {
  const unionValue = record(
    input,
    path,
    new Set([
      'schemaVersion',
      'operation',
      'scope',
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
      new Set(['schemaVersion', 'operation', 'scope', 'filters', 'page']),
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation,
      scope: parseUsageSearchScopeFromDetached(
        required(value, 'scope', path),
        `${path}.scope`,
      ),
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
    const request = parseE2eSliceRequest(
      {
        withinStepId: required(value, 'withinStepId', path),
        nodeIds: required(value, 'nodeIds', path),
        goal: required(value, 'goal', path),
        includeOutgoingEffects: required(value, 'includeOutgoingEffects', path),
      },
      path,
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation,
      selection: parseSelectionFromDetached(
        required(value, 'selection', path),
        `${path}.selection`,
      ),
      ...request,
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
  readonly context: AgentContextQuerySelection | AgentContextUsageSearchScope;
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
  let context: AgentContextQuerySelection | AgentContextUsageSearchScope;
  let include: readonly AgentContextNodeDetailAspect[] = [];
  if (query.operation === 'search-form-usages') {
    expectedCollection = 'candidates';
    sortOrder = 'usage-identity';
    disclosure = 'usage-candidates';
    context = query.scope;
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
      readonly totalMatches: number;
      readonly usages: readonly AgentContextUsageCandidateReference[];
    }
  | { readonly kind: 'usage-absent-authoritative' }
  | { readonly kind: 'usage-absence-not-authoritative' }
  | {
      readonly kind: 'node-ambiguous';
      readonly totalMatches: number;
      readonly nodeIds: readonly string[];
    }
  | { readonly kind: 'node-absent' }
  | { readonly kind: 'step-absent'; readonly stepId: string }
  | {
      readonly kind: 'slice-focus-node-absent';
      readonly nodeIds: readonly string[];
    }
  | { readonly kind: 'step-scope-mismatch'; readonly nodeIds: readonly string[] }
  | {
      readonly kind: 'cross-step-prerequisite-required';
      readonly witness: AgentContextCrossStepWitness;
      readonly transition: AgentContextUsageTransitionAuthority;
    }
  | {
      readonly kind: 'cross-step-transition-ambiguous';
      readonly witness: AgentContextCrossStepWitness;
      readonly transitions: readonly AgentContextUsageTransitionAuthority[];
    }
  | {
      readonly kind: 'cross-step-transition-unavailable';
      readonly witness: AgentContextCrossStepWitness;
    }
  | {
      readonly kind: 'prerequisite-readiness-unavailable';
      readonly effect: DeclaredCrossFieldEffect['identity'];
      readonly nodeId: string;
      readonly readinessId: string;
    }
  | {
      readonly kind: 'prerequisite-cycle';
      readonly nodeIds: readonly string[];
    }
  | { readonly kind: 'atomic-record-too-large' }
  | { readonly kind: 'atomic-view-too-large' };

export interface AgentContextCrossStepWitness {
  readonly effect: DeclaredCrossFieldEffect['identity'];
  readonly trigger: {
    readonly nodeId: string;
    readonly stepId: string;
  };
  readonly target: {
    readonly nodeId: string;
    readonly stepId: string;
  };
}

export type AgentContextUsageCandidateIdentity =
  | AgentContextDeclaredUsageSelection
  | {
      readonly kind: 'callsite';
      readonly projectId: string;
      readonly callsiteKey: string;
    };

export interface AgentContextUsageCandidateReference {
  readonly sourceUsageCatalog: AgentContextArtifactReference;
  readonly usage: AgentContextUsageCandidateIdentity;
}

export interface AgentContextUsageCandidateProjection {
  readonly usage: AgentContextUsageCandidateIdentity;
  readonly projectId: string;
  readonly form?: AgentContextFormReference;
  readonly sourceUsageCatalog: AgentContextArtifactReference;
  readonly selectionHandoffs: AgentContextCompleteCollection<AgentContextQuerySelection>;
  readonly matchReasons: AgentContextCompleteCollection<string>;
}

export interface AgentContextCompleteCollection<T> {
  readonly complete: true;
  readonly items: readonly T[];
}

export interface AgentContextNodeDomainProjection {
  readonly options: AgentContextCompleteCollection<ContractOption>;
  readonly optionSource?: ContractOptionSource;
  readonly valueDomain?: ContractValueDomain;
}

export interface AgentContextNodeInteractionProjection {
  readonly profile?: ContractInteractionProfile;
}

export interface AgentContextNodeDetailProjection {
  readonly constraints?: AgentContextCompleteCollection<ContractConstraint>;
  readonly domain?: AgentContextNodeDomainProjection;
  readonly effects?: AgentContextCompleteCollection<DeclaredCrossFieldEffect>;
  readonly interaction?: AgentContextNodeInteractionProjection;
  readonly locators?: AgentContextCompleteCollection<ContractLocator>;
  readonly unknowns?: AgentContextCompleteCollection<ContractDiagnostic>;
}

export interface AgentContextNodeCandidateProjection {
  readonly nodeId: string;
  readonly kind: ContractNodeKind;
  readonly modelPath: readonly AgentContextQueryModelPathSegment[];
  readonly formlyType?: string;
  readonly semanticType?: string;
  readonly evidence: ContractEvidence;
  readonly presentation?: ContractPresentation;
  readonly state?: ContractNodeState;
  readonly childNodeIds: readonly string[];
  readonly arrayTemplateNodeId?: string;
  readonly capabilities: readonly AgentContextQueryCapability[];
  readonly included: readonly AgentContextNodeDetailAspect[];
  readonly details: AgentContextNodeDetailProjection;
}

export interface AgentContextStepSummaryProjection {
  readonly id: string;
  readonly ordinal: number;
  readonly nodeCount: number;
  readonly actionIds: readonly string[];
}

export interface AgentContextExecutionAuthorityProjection {
  readonly owner: AgentContextArtifactReference;
  readonly entry: AgentContextUsageEntryAuthority;
  readonly steps: AgentContextCompleteCollection<AgentContextUsageStepAuthority>;
  readonly actions: AgentContextCompleteCollection<AgentContextUsageActionAuthority>;
  readonly outcomes: AgentContextCompleteCollection<AgentContextUsageOutcomeAuthority>;
  readonly transitions: AgentContextCompleteCollection<AgentContextUsageTransitionAuthority>;
  readonly physicalOperations: AgentContextCompleteCollection<AgentContextPhysicalOperation>;
  readonly readiness: AgentContextCompleteCollection<AgentContextReadinessAuthority>;
  readonly interactions: AgentContextCompleteCollection<AgentContextNodeInteractionAuthority>;
  readonly commits: AgentContextCompleteCollection<AgentContextValueCommitAuthority>;
  readonly validationSurfaces: AgentContextCompleteCollection<AgentContextValidationSurfaceAuthority>;
  readonly valueAssertions: AgentContextCompleteCollection<AgentContextValueAssertionAuthority>;
  readonly stateAssertions: AgentContextCompleteCollection<AgentContextStateAssertionAuthority>;
  readonly repeaterCaptures: AgentContextCompleteCollection<AgentContextCreatedItemCaptureAuthority>;
}

export interface AgentContextJourneyProjection {
  readonly identity: AgentContextIdentityReference;
  readonly authority: AgentContextExecutionAuthorityProjection;
}

export interface AgentContextContextSummaryProjection {
  readonly usageEntry: {
    readonly usage: AgentContextDeclaredUsageSelection;
    readonly entryId: string;
    readonly landingStepId: string;
    readonly capability: 'open-usage';
  };
  readonly form: {
    readonly identity: AgentContextFormReference;
    readonly nodeCount: number;
  };
  readonly diagnosticEvidenceCounts: {
    readonly total: number;
    readonly warnings: number;
    readonly errors: number;
  };
  readonly executableCapabilities: AgentContextCompleteCollection<AgentContextQueryCapability>;
  readonly scenarioIds: AgentContextCompleteCollection<string>;
  readonly effectAnalysis:
    | { readonly state: 'not-reported' }
    | {
        readonly state: 'reported';
        readonly analysis: ContractEffectAnalysis;
      };
  readonly unknownEvidenceCounts: {
    readonly total: number;
    readonly diagnostics: number;
    readonly interactionProfiles: number;
    readonly effectAnalysisReasons: number;
    readonly effectAnalysisUnreported: 0 | 1;
  };
}

export type AgentContextDiagnosticEvidenceProjection =
  | {
      readonly kind: 'contract-diagnostic';
      readonly owner: AgentContextArtifactReference;
      readonly diagnostic: ContractDiagnostic;
    }
  | {
      readonly kind: 'effect-analysis';
      readonly owner: AgentContextArtifactReference;
      readonly analysis: ContractEffectAnalysis;
    };

export interface AgentContextE2eSliceProjection {
  readonly withinStepId: string;
  readonly authority: AgentContextExecutionAuthorityProjection;
  readonly focusNodes: AgentContextCompleteCollection<AgentContextNodeCandidateProjection>;
  readonly closureNodes: AgentContextCompleteCollection<AgentContextNodeCandidateProjection>;
  readonly prerequisites: AgentContextCompleteCollection<AgentContextE2ePrerequisiteProjection>;
  readonly effects: AgentContextCompleteCollection<DeclaredCrossFieldEffect>;
}

export type AgentContextE2ePrerequisiteProjection =
  | {
      readonly kind: 'effect-source';
      readonly node: AgentContextNodeCandidateProjection;
      readonly effect: DeclaredCrossFieldEffect;
    }
  | {
      readonly kind: 'readiness';
      readonly node: AgentContextNodeCandidateProjection;
      readonly readiness: AgentContextReadinessAuthority;
    }
  | {
      readonly kind: 'wrapper-precondition';
      readonly node: AgentContextNodeCandidateProjection;
      readonly preconditionIndex: number;
      readonly precondition: FieldTypeWrapperPrecondition;
    };

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
      readonly scope: AgentContextUsageSearchScope;
      readonly freshness: AgentContextFreshness;
      readonly candidates: readonly AgentContextUsageCandidateProjection[];
      readonly page: AgentContextPageResult<'candidates'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'search-form-usages';
      readonly status: 'ambiguous';
      readonly scope: AgentContextUsageSearchScope;
      readonly freshness: AgentContextFreshness;
      readonly candidates: readonly AgentContextUsageCandidateProjection[];
      readonly page: AgentContextPageResult<'candidates'>;
      readonly reason: Extract<AgentContextQueryReason, { kind: 'usage-ambiguous' }>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'search-form-usages';
      readonly status: 'not-found';
      readonly scope: AgentContextUsageSearchScope;
      readonly freshness: AgentContextFreshness;
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
      readonly scope: AgentContextUsageSearchScope;
      readonly freshness: AgentContextFreshness;
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
      readonly summary: AgentContextContextSummaryProjection;
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
      readonly evidence: readonly AgentContextDiagnosticEvidenceProjection[];
      readonly page: AgentContextPageResult<'diagnostics'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-form-context';
      readonly status: 'complete';
      readonly view: 'journey';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly journey: AgentContextJourneyProjection;
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
      readonly authority: AgentContextExecutionAuthorityProjection;
      readonly candidates: readonly AgentContextNodeCandidateProjection[];
      readonly page: AgentContextPageResult<'nodes'>;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'find-form-nodes';
      readonly status: 'ambiguous';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly authority: AgentContextExecutionAuthorityProjection;
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
      readonly request: AgentContextE2eSliceRequest;
      readonly slice: AgentContextE2eSliceProjection;
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_QUERY_SCHEMA_VERSION;
      readonly operation: 'get-e2e-slice';
      readonly status: 'refused';
      readonly selection: AgentContextQuerySelection;
      readonly freshness: AgentContextFreshness;
      readonly request: AgentContextE2eSliceRequest;
      readonly reason: Extract<
        AgentContextQueryReason,
        {
          kind:
            | 'step-scope-mismatch'
            | 'step-absent'
            | 'slice-focus-node-absent'
            | 'cross-step-prerequisite-required'
            | 'cross-step-transition-ambiguous'
            | 'cross-step-transition-unavailable'
            | 'prerequisite-readiness-unavailable'
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

function parseCompleteCollection<T>(
  input: unknown,
  path: string,
  parseItem: (entry: unknown, path: string) => T,
): AgentContextCompleteCollection<T> {
  const value = record(input, path, new Set(['complete', 'items']));
  if (required(value, 'complete', path) !== true) {
    fail(`${path}.complete`, 'must be true for an atomic collection.');
  }
  return {
    complete: true,
    items: array(required(value, 'items', path), `${path}.items`).map(
      (entry, index) => parseItem(entry, `${path}.items[${index}]`),
    ),
  };
}

function parseCanonicalCompleteCollection<T>(
  input: unknown,
  path: string,
  parseItem: (entry: unknown, path: string) => T,
  identity: (entry: T) => string,
  compare: (left: T, right: T) => number,
): AgentContextCompleteCollection<T> {
  const collection = parseCompleteCollection(input, path, parseItem);
  assertCanonicalSet(collection.items, `${path}.items`, identity, compare);
  return collection;
}

function parseUsageCandidate(
  input: unknown,
  path: string,
  scope: AgentContextUsageSearchScope,
): AgentContextUsageCandidateProjection {
  const value = record(
    input,
    path,
    new Set([
      'usage',
      'projectId',
      'form',
      'sourceUsageCatalog',
      'selectionHandoffs',
      'matchReasons',
    ]),
  );
  const usage = parseUsageIdentity(
    required(value, 'usage', path),
    `${path}.usage`,
  );
  const projectId = boundedId(
    required(value, 'projectId', path),
    `${path}.projectId`,
  );
  if (usage.kind === 'callsite' && usage.projectId !== projectId) {
    fail(`${path}.usage.projectId`, 'must equal the candidate projectId.');
  }
  const form = optional(value, 'form');
  const parsedForm =
    form === undefined ? undefined : parseFormReference(form, `${path}.form`);
  const sourceUsageCatalog = parseTypedArtifactReference(
    required(value, 'sourceUsageCatalog', path),
    `${path}.sourceUsageCatalog`,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  );
  if (
    !scope.sourceUsageCatalogs.some(
      (reference) => referenceKey(reference) === referenceKey(sourceUsageCatalog),
    )
  ) {
    fail(
      `${path}.sourceUsageCatalog`,
      'must be an exact owner in the search scope.',
    );
  }
  const selectionHandoffs = parseCanonicalCompleteCollection(
    required(value, 'selectionHandoffs', path),
    `${path}.selectionHandoffs`,
    (entry, entryPath) => parseSelectionFromDetached(entry, entryPath),
    canonicalStringify,
    (left, right) => compareText(canonicalStringify(left), canonicalStringify(right)),
  );
  for (const [index, handoff] of selectionHandoffs.items.entries()) {
    const handoffPath = `${path}.selectionHandoffs.items[${index}]`;
    assertSame(handoff.artifactSet, scope.artifactSet, `${handoffPath}.artifactSet`);
    assertSame(
      handoff.workspaceIndex,
      scope.workspaceIndex,
      `${handoffPath}.workspaceIndex`,
    );
    assertSame(
      handoff.owners.sourceUsageCatalog,
      sourceUsageCatalog,
      `${handoffPath}.owners.sourceUsageCatalog`,
    );
    if (usage.kind !== 'declared') {
      fail(handoffPath, 'callsite candidates cannot claim an exact selection.');
    }
    assertSame(handoff.usage, usage, `${handoffPath}.usage`);
    if (parsedForm !== undefined) {
      assertSame(handoff.form, parsedForm, `${handoffPath}.form`);
    }
  }
  if (parsedForm === undefined && selectionHandoffs.items.length > 0) {
    fail(
      `${path}.selectionHandoffs`,
      'must be empty when the candidate has no exact resolved form.',
    );
  }
  const matchReasons = parseCanonicalCompleteCollection(
    required(value, 'matchReasons', path),
    `${path}.matchReasons`,
    boundedText,
    (reason) => reason,
    compareText,
  );
  return {
    usage,
    projectId,
    ...(parsedForm === undefined ? {} : { form: parsedForm }),
    sourceUsageCatalog,
    selectionHandoffs,
    matchReasons,
  };
}

function parseNodeCandidate(
  input: unknown,
  path: string,
): AgentContextNodeCandidateProjection {
  const value = record(
    input,
    path,
    new Set([
      'nodeId',
      'kind',
      'modelPath',
      'formlyType',
      'semanticType',
      'evidence',
      'presentation',
      'state',
      'childNodeIds',
      'arrayTemplateNodeId',
      'capabilities',
      'included',
      'details',
    ]),
  );
  const nodeId = boundedId(required(value, 'nodeId', path), `${path}.nodeId`);
  const kind = enumValue(required(value, 'kind', path), `${path}.kind`, [
    'array',
    'control',
    'display',
    'group',
  ] as const);
  const modelPath = parseModelPath(
    required(value, 'modelPath', path),
    `${path}.modelPath`,
  );
  const formlyType = optional(value, 'formlyType');
  const semanticType = optional(value, 'semanticType');
  const evidence = enumValue(
    required(value, 'evidence', path),
    `${path}.evidence`,
    ['declared', 'observed', 'resolved'] as const,
  );
  const presentation = optional(value, 'presentation');
  const state = optional(value, 'state');
  const arrayTemplateNodeId = optional(value, 'arrayTemplateNodeId');
  const childNodeIds = parseUniqueStringList(
    required(value, 'childNodeIds', path),
    `${path}.childNodeIds`,
  );
  const capabilities = parseCapabilitySet(
    required(value, 'capabilities', path),
    `${path}.capabilities`,
  );
  const included = parseIncludeSet(
    required(value, 'included', path),
    `${path}.included`,
  );
  const detailValue = record(
    required(value, 'details', path),
    `${path}.details`,
    new Set(NODE_DETAIL_ASPECTS),
  );
  const includedSet = new Set(included);
  for (const aspect of NODE_DETAIL_ASPECTS) {
    if (Object.hasOwn(detailValue, aspect) !== includedSet.has(aspect)) {
      fail(
        `${path}.details.${aspect}`,
        'must be present exactly when named by included.',
      );
    }
  }

  const constraintInput = optional(detailValue, 'constraints');
  const constraints =
    constraintInput === undefined
      ? undefined
      : parseCompleteCollection(
          constraintInput,
          `${path}.details.constraints`,
          (entry) => entry,
        );
  const domainInput = optional(detailValue, 'domain');
  let domain:
    | {
        readonly options: AgentContextCompleteCollection<unknown>;
        readonly optionSource?: unknown;
        readonly valueDomain?: unknown;
      }
    | undefined;
  if (domainInput !== undefined) {
    const domainValue = record(
      domainInput,
      `${path}.details.domain`,
      new Set(['options', 'optionSource', 'valueDomain']),
    );
    const optionSource = optional(domainValue, 'optionSource');
    const valueDomain = optional(domainValue, 'valueDomain');
    domain = {
      options: parseCompleteCollection(
        required(domainValue, 'options', `${path}.details.domain`),
        `${path}.details.domain.options`,
        (entry) => entry,
      ),
      ...(optionSource === undefined ? {} : { optionSource }),
      ...(valueDomain === undefined ? {} : { valueDomain }),
    };
  }
  const interactionInput = optional(detailValue, 'interaction');
  let interaction: { readonly profile?: unknown } | undefined;
  if (interactionInput !== undefined) {
    const interactionValue = record(
      interactionInput,
      `${path}.details.interaction`,
      new Set(['profile']),
    );
    const profile = optional(interactionValue, 'profile');
    interaction = profile === undefined ? {} : { profile };
  }
  const locatorInput = optional(detailValue, 'locators');
  const locators =
    locatorInput === undefined
      ? undefined
      : parseCompleteCollection(
          locatorInput,
          `${path}.details.locators`,
          (entry) => entry,
        );
  const unknownInput = optional(detailValue, 'unknowns');
  const unknowns =
    unknownInput === undefined
      ? undefined
      : parseCompleteCollection(
          unknownInput,
          `${path}.details.unknowns`,
          (entry) => entry,
        );

  const contract = parseFormContract(
    createFormContract({
      schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
      formId: 'agent-context.query-node-projection',
      nodes: [
        {
          id: nodeId,
          kind,
          modelPath,
          ...(formlyType === undefined
            ? {}
            : { formlyType: boundedId(formlyType, `${path}.formlyType`) }),
          ...(semanticType === undefined
            ? {}
            : {
                semanticType: boundedId(
                  semanticType,
                  `${path}.semanticType`,
                ),
              }),
          evidence,
          ...(presentation === undefined
            ? {}
            : { presentation: presentation as ContractPresentation }),
          wrappers: [],
          constraints: (constraints?.items ?? []) as readonly ContractConstraint[],
          options: (domain?.options.items ?? []) as readonly ContractOption[],
          ...(domain?.optionSource === undefined
            ? {}
            : { optionSource: domain.optionSource as ContractOptionSource }),
          ...(domain?.valueDomain === undefined
            ? {}
            : { valueDomain: domain.valueDomain as ContractValueDomain }),
          ...(interaction?.profile === undefined
            ? {}
            : {
                interactionProfile:
                  interaction.profile as ContractInteractionProfile,
              }),
          conditions: [],
          dynamicRules: [],
          ...(state === undefined ? {} : { state: state as ContractNodeState }),
          locators: (locators?.items ?? []) as readonly ContractLocator[],
          children: [],
        },
      ],
      diagnostics: (unknowns?.items ?? []) as readonly ContractDiagnostic[],
      ...(interaction?.profile === undefined
        ? {}
        : {
            // Form Contract validation requires a registry identity whenever
            // it validates an interaction profile. This fixed identity is a
            // parser-only scaffold: the returned node projection contains
            // only the parsed profile and never exposes this identity as
            // owner evidence.
            fieldTypeProfileRegistry: {
              schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
              id: 'agent-context.query-node-projection-profiles',
              version: 1,
              contentHash: `sha256:${'0'.repeat(64)}`,
            },
          }),
    }),
  );
  const parsedNode = contract.nodes[0]!;
  for (const [index, diagnostic] of contract.diagnostics.entries()) {
    if (diagnostic.nodeId !== undefined && diagnostic.nodeId !== nodeId) {
      fail(
        `${path}.details.unknowns.items[${index}].nodeId`,
        'must identify the projected node when present.',
      );
    }
  }
  const effectsInput = optional(detailValue, 'effects');
  let effects: AgentContextCompleteCollection<DeclaredCrossFieldEffect> | undefined;
  if (effectsInput !== undefined) {
    const rawEffects = parseCompleteCollection(
      effectsInput,
      `${path}.details.effects`,
      (entry) => entry,
    );
    const registry = parseCrossFieldEffectRegistry({
      schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
      id: 'agent-context.query-effects',
      version: 1,
      forms: [
        {
          formId: 'agent-context.query-node-projection',
          coverage: 'partial',
          effects: rawEffects.items,
        },
      ],
    });
    const parsedEffects = registry.forms[0]!.effects;
    for (const [index, effect] of parsedEffects.entries()) {
      if (effect.trigger.nodeId !== nodeId && effect.target.nodeId !== nodeId) {
        fail(
          `${path}.details.effects.items[${index}]`,
          'must name the projected node as trigger or target.',
        );
      }
    }
    assertCanonicalSet(
      parsedEffects,
      `${path}.details.effects.items`,
      (effect) => `${effect.identity.id}\0${effect.identity.version}`,
      (left, right) =>
        compareText(left.identity.id, right.identity.id) ||
        left.identity.version - right.identity.version,
    );
    effects = { complete: true, items: parsedEffects };
  }

  const details: AgentContextNodeDetailProjection = {
    ...(constraints === undefined
      ? {}
      : { constraints: { complete: true, items: parsedNode.constraints } }),
    ...(domain === undefined
      ? {}
      : {
          domain: {
            options: { complete: true, items: parsedNode.options },
            ...(parsedNode.optionSource === undefined
              ? {}
              : { optionSource: parsedNode.optionSource }),
            ...(parsedNode.valueDomain === undefined
              ? {}
              : { valueDomain: parsedNode.valueDomain }),
          },
        }),
    ...(effects === undefined ? {} : { effects }),
    ...(interaction === undefined
      ? {}
      : {
          interaction:
            parsedNode.interactionProfile === undefined
              ? {}
              : { profile: parsedNode.interactionProfile },
        }),
    ...(locators === undefined
      ? {}
      : { locators: { complete: true, items: parsedNode.locators } }),
    ...(unknowns === undefined
      ? {}
      : { unknowns: { complete: true, items: contract.diagnostics } }),
  };
  return {
    nodeId,
    kind,
    modelPath,
    ...(parsedNode.formlyType === undefined
      ? {}
      : { formlyType: parsedNode.formlyType }),
    ...(parsedNode.semanticType === undefined
      ? {}
      : { semanticType: parsedNode.semanticType }),
    evidence,
    ...(parsedNode.presentation === undefined
      ? {}
      : { presentation: parsedNode.presentation }),
    ...(parsedNode.state === undefined ? {} : { state: parsedNode.state }),
    childNodeIds,
    ...(arrayTemplateNodeId === undefined
      ? {}
      : {
          arrayTemplateNodeId: boundedId(
            arrayTemplateNodeId,
            `${path}.arrayTemplateNodeId`,
          ),
        }),
    capabilities,
    included,
    details,
  };
}

function parseUsageCandidateReference(
  input: unknown,
  path: string,
): AgentContextUsageCandidateReference {
  const value = record(
    input,
    path,
    new Set(['sourceUsageCatalog', 'usage']),
  );
  return {
    sourceUsageCatalog: parseTypedArtifactReference(
      required(value, 'sourceUsageCatalog', path),
      `${path}.sourceUsageCatalog`,
      AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
      AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    ),
    usage: parseUsageIdentity(required(value, 'usage', path), `${path}.usage`),
  };
}

function parseCrossStepWitness(
  input: unknown,
  path: string,
): AgentContextCrossStepWitness {
  const value = record(input, path, new Set(['effect', 'trigger', 'target']));
  const parseEndpoint = (
    endpointInput: unknown,
    endpointPath: string,
  ): { readonly nodeId: string; readonly stepId: string } => {
    const endpoint = record(
      endpointInput,
      endpointPath,
      new Set(['nodeId', 'stepId']),
    );
    return {
      nodeId: boundedId(
        required(endpoint, 'nodeId', endpointPath),
        `${endpointPath}.nodeId`,
      ),
      stepId: boundedId(
        required(endpoint, 'stepId', endpointPath),
        `${endpointPath}.stepId`,
      ),
    };
  };
  const witness = {
    effect: parseIdentityReference(
      required(value, 'effect', path),
      `${path}.effect`,
    ),
    trigger: parseEndpoint(
      required(value, 'trigger', path),
      `${path}.trigger`,
    ),
    target: parseEndpoint(
      required(value, 'target', path),
      `${path}.target`,
    ),
  };
  if (witness.trigger.stepId === witness.target.stepId) {
    fail(path, 'must describe a cross-step effect.');
  }
  return witness;
}

function parseUsageTransition(
  input: unknown,
  path: string,
): AgentContextUsageTransitionAuthority {
  const value = record(
    input,
    path,
    new Set([
      'id',
      'version',
      'fromStepId',
      'actionId',
      'outcomeId',
      'toStepId',
    ]),
  );
  return {
    id: boundedId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`,
    ),
    fromStepId: boundedId(
      required(value, 'fromStepId', path),
      `${path}.fromStepId`,
    ),
    actionId: boundedId(
      required(value, 'actionId', path),
      `${path}.actionId`,
    ),
    outcomeId: boundedId(
      required(value, 'outcomeId', path),
      `${path}.outcomeId`,
    ),
    toStepId: boundedId(
      required(value, 'toStepId', path),
      `${path}.toStepId`,
    ),
  };
}

function assertTransitionMatchesWitness(
  transition: AgentContextUsageTransitionAuthority,
  witness: AgentContextCrossStepWitness,
  path: string,
): void {
  if (
    transition.fromStepId !== witness.trigger.stepId ||
    transition.toStepId !== witness.target.stepId
  ) {
    fail(path, 'must connect the exact cross-step witness steps.');
  }
}

function parseReason(input: unknown, path: string): AgentContextQueryReason {
  const union = record(
    input,
    path,
    new Set([
      'kind',
      'usages',
      'nodeIds',
      'stepId',
      'fromStepId',
      'transitionId',
      'toStepId',
      'transitionIds',
      'witness',
      'transition',
      'transitions',
      'effect',
      'nodeId',
      'readinessId',
      'totalMatches',
    ]),
  );
  const kind = required(union, 'kind', path);
  if (kind === 'usage-ambiguous') {
    const value = record(input, path, new Set(['kind', 'totalMatches', 'usages']));
    const totalMatches = positiveInteger(
      required(value, 'totalMatches', path),
      `${path}.totalMatches`,
    );
    if (totalMatches < 2) {
      fail(`${path}.totalMatches`, 'must be at least two for ambiguity.');
    }
    if (totalMatches > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE) {
      fail(
        `${path}.totalMatches`,
        `must be at most ${AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE}.`,
      );
    }
    const usages = parseCandidateList(
      required(value, 'usages', path),
      `${path}.usages`,
      parseUsageCandidateReference,
      canonicalStringify,
    );
    if (usages.length < 1 || usages.length > totalMatches) {
      fail(
        `${path}.usages`,
        'must contain one page-local identity per candidate and no more than totalMatches.',
      );
    }
    return {
      kind,
      totalMatches,
      usages,
    };
  }
  if (kind === 'node-ambiguous') {
    const value = record(input, path, new Set(['kind', 'totalMatches', 'nodeIds']));
    const totalMatches = positiveInteger(
      required(value, 'totalMatches', path),
      `${path}.totalMatches`,
    );
    if (totalMatches < 2) {
      fail(`${path}.totalMatches`, 'must be at least two for ambiguity.');
    }
    if (totalMatches > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE) {
      fail(
        `${path}.totalMatches`,
        `must be at most ${AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE}.`,
      );
    }
    const nodeIds = parseCanonicalStringSet(
      required(value, 'nodeIds', path),
      `${path}.nodeIds`,
      1,
    );
    if (nodeIds.length > totalMatches) {
      fail(`${path}.nodeIds`, 'must not exceed totalMatches.');
    }
    return {
      kind,
      totalMatches,
      nodeIds,
    };
  }
  if (
    kind === 'slice-focus-node-absent' ||
    kind === 'step-scope-mismatch' ||
    kind === 'prerequisite-cycle'
  ) {
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
  if (kind === 'step-absent') {
    const value = record(input, path, new Set(['kind', 'stepId']));
    return {
      kind,
      stepId: boundedId(required(value, 'stepId', path), `${path}.stepId`),
    };
  }
  if (kind === 'cross-step-prerequisite-required') {
    const value = record(
      input,
      path,
      new Set(['kind', 'witness', 'transition']),
    );
    const witness = parseCrossStepWitness(
      required(value, 'witness', path),
      `${path}.witness`,
    );
    const transition = parseUsageTransition(
      required(value, 'transition', path),
      `${path}.transition`,
    );
    assertTransitionMatchesWitness(transition, witness, `${path}.transition`);
    return { kind, witness, transition };
  }
  if (kind === 'cross-step-transition-ambiguous') {
    const value = record(input, path, new Set(['kind', 'witness', 'transitions']));
    const witness = parseCrossStepWitness(
      required(value, 'witness', path),
      `${path}.witness`,
    );
    const transitions = parseCandidateList(
      required(value, 'transitions', path),
      `${path}.transitions`,
      parseUsageTransition,
      canonicalStringify,
    );
    if (
      transitions.length < 2 ||
      transitions.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE
    ) {
      fail(
        `${path}.transitions`,
        `must contain 2-${AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE} exact transitions.`,
      );
    }
    for (const [index, transition] of transitions.entries()) {
      assertTransitionMatchesWitness(
        transition,
        witness,
        `${path}.transitions[${index}]`,
      );
    }
    return { kind, witness, transitions };
  }
  if (kind === 'cross-step-transition-unavailable') {
    const value = record(input, path, new Set(['kind', 'witness']));
    return {
      kind,
      witness: parseCrossStepWitness(
        required(value, 'witness', path),
        `${path}.witness`,
      ),
    };
  }
  if (kind === 'prerequisite-readiness-unavailable') {
    const value = record(
      input,
      path,
      new Set(['kind', 'effect', 'nodeId', 'readinessId']),
    );
    return {
      kind,
      effect: parseIdentityReference(
        required(value, 'effect', path),
        `${path}.effect`,
      ),
      nodeId: boundedId(required(value, 'nodeId', path), `${path}.nodeId`),
      readinessId: boundedId(
        required(value, 'readinessId', path),
        `${path}.readinessId`,
      ),
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
    new Set([
      'schemaVersion',
      'operation',
      'status',
      'scope',
      'freshness',
      'candidates',
      'page',
      'reason',
    ]),
  );
  const status = required(union, 'status', path);
  const scope = parseUsageSearchScopeFromDetached(
    required(union, 'scope', path),
    `${path}.scope`,
  );
  const freshness = parseFreshness(
    required(union, 'freshness', path),
    `${path}.freshness`,
  );
  if (status === 'refused') {
    const value = record(
      input,
      path,
      new Set([
        'schemaVersion',
        'operation',
        'status',
        'scope',
        'freshness',
        'reason',
      ]),
    );
    const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
    if (reason.kind !== 'atomic-record-too-large') {
      fail(`${path}.reason.kind`, 'is not valid for refused usage search.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status,
      scope,
      freshness,
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
      'scope',
      'freshness',
      'candidates',
      'page',
      ...(status === 'complete' ? [] : ['reason']),
    ]),
  );
  const candidates = parseCandidateList(
    required(value, 'candidates', path),
    `${path}.candidates`,
    (entry, entryPath) => parseUsageCandidate(entry, entryPath, scope),
    (candidate) =>
      `${referenceKey(candidate.sourceUsageCatalog)}\0${canonicalStringify(candidate.usage)}`,
  );
  const page = parsePageResult(required(value, 'page', path), `${path}.page`, 'candidates');
  if (status === 'complete') {
    if (candidates.length !== 1) {
      fail(`${path}.candidates`, 'must contain exactly one complete match.');
    }
    if (page.truncated) {
      fail(`${path}.page.truncated`, 'must be false for a complete result.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status,
      scope,
      freshness,
      candidates,
      page,
    };
  }
  const reason = parseReason(required(value, 'reason', path), `${path}.reason`);
  if (status === 'ambiguous') {
    if (reason.kind !== 'usage-ambiguous') {
      fail(`${path}.reason.kind`, 'must be usage-ambiguous.');
    }
    if (
      !sameJson(
        candidates.map(({ sourceUsageCatalog, usage }) => ({
          sourceUsageCatalog,
          usage,
        })),
        reason.usages,
      )
    ) {
      fail(
        `${path}.reason.usages`,
        'must equal the candidate usage identities.',
      );
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'search-form-usages',
      status,
      scope,
      freshness,
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
  if (page.truncated) {
    fail(`${path}.page.truncated`, 'must be false for a not-found result.');
  }
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'search-form-usages',
    status,
    scope,
    freshness,
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

function parseExecutionAuthorityProjection(
  input: unknown,
  path: string,
  selection: AgentContextQuerySelection,
): AgentContextExecutionAuthorityProjection {
  const collectionKeys = [
    'steps',
    'actions',
    'outcomes',
    'transitions',
    'physicalOperations',
    'readiness',
    'interactions',
    'commits',
    'validationSurfaces',
    'valueAssertions',
    'stateAssertions',
    'repeaterCaptures',
  ] as const;
  const value = record(
    input,
    path,
    new Set(['owner', 'entry', ...collectionKeys]),
  );
  const owner = parseTypedArtifactReference(
    required(value, 'owner', path),
    `${path}.owner`,
    AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
    AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  );
  assertSame(owner, selection.owners.executionAuthority, `${path}.owner`);
  const collections = Object.fromEntries(
    collectionKeys.map((key) => [
      key,
      parseCompleteCollection(
        required(value, key, path),
        `${path}.${key}`,
        (entry) => entry,
      ),
    ]),
  ) as Record<
    (typeof collectionKeys)[number],
    AgentContextCompleteCollection<unknown>
  >;
  const entry = required(value, 'entry', path);
  let authority: AgentContextExecutionAuthority;
  try {
    authority = createAgentContextExecutionAuthority({
      schemaVersion: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
      basis: selection.executionAuthority.basis,
      scenario: selection.scenario,
      physicalOperations: collections.physicalOperations
        .items as readonly AgentContextPhysicalOperation[],
      readiness: collections.readiness
        .items as readonly AgentContextReadinessAuthority[],
      interactions: collections.interactions
        .items as readonly AgentContextNodeInteractionAuthority[],
      commits: collections.commits
        .items as readonly AgentContextValueCommitAuthority[],
      validationSurfaces: collections.validationSurfaces
        .items as readonly AgentContextValidationSurfaceAuthority[],
      valueAssertions: collections.valueAssertions
        .items as readonly AgentContextValueAssertionAuthority[],
      stateAssertions: collections.stateAssertions
        .items as readonly AgentContextStateAssertionAuthority[],
      usage: {
        id: selection.executionAuthority.usageId,
        version: selection.executionAuthority.usageVersion,
        basis: selection.executionAuthority.basis,
        entry: entry as AgentContextUsageEntryAuthority,
        steps: collections.steps.items as readonly AgentContextUsageStepAuthority[],
        actions: collections.actions
          .items as readonly AgentContextUsageActionAuthority[],
        outcomes: collections.outcomes
          .items as readonly AgentContextUsageOutcomeAuthority[],
        transitions: collections.transitions
          .items as readonly AgentContextUsageTransitionAuthority[],
      },
      repeaterCaptures: collections.repeaterCaptures
        .items as readonly AgentContextCreatedItemCaptureAuthority[],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'is invalid';
    fail(path, message);
  }
  const normalized = {
    entry: authority.usage.entry,
    steps: authority.usage.steps,
    actions: authority.usage.actions,
    outcomes: authority.usage.outcomes,
    transitions: authority.usage.transitions,
    physicalOperations: authority.physicalOperations,
    readiness: authority.readiness,
    interactions: authority.interactions,
    commits: authority.commits,
    validationSurfaces: authority.validationSurfaces,
    valueAssertions: authority.valueAssertions,
    stateAssertions: authority.stateAssertions,
    repeaterCaptures: authority.repeaterCaptures,
  };
  assertSame(entry, normalized.entry, `${path}.entry`);
  for (const key of collectionKeys) {
    assertSame(collections[key].items, normalized[key], `${path}.${key}.items`);
  }
  return {
    owner,
    entry: normalized.entry,
    steps: { complete: true, items: normalized.steps },
    actions: { complete: true, items: normalized.actions },
    outcomes: { complete: true, items: normalized.outcomes },
    transitions: { complete: true, items: normalized.transitions },
    physicalOperations: {
      complete: true,
      items: normalized.physicalOperations,
    },
    readiness: { complete: true, items: normalized.readiness },
    interactions: { complete: true, items: normalized.interactions },
    commits: { complete: true, items: normalized.commits },
    validationSurfaces: {
      complete: true,
      items: normalized.validationSurfaces,
    },
    valueAssertions: { complete: true, items: normalized.valueAssertions },
    stateAssertions: { complete: true, items: normalized.stateAssertions },
    repeaterCaptures: {
      complete: true,
      items: normalized.repeaterCaptures,
    },
  };
}

function parseJourneyProjection(
  input: unknown,
  path: string,
  selection: AgentContextQuerySelection,
): AgentContextJourneyProjection {
  const value = record(input, path, new Set(['identity', 'authority']));
  const identity = parseIdentityReference(
    required(value, 'identity', path),
    `${path}.identity`,
  );
  assertSame(identity, selection.journey, `${path}.identity`);
  return {
    identity,
    authority: parseExecutionAuthorityProjection(
      required(value, 'authority', path),
      `${path}.authority`,
      selection,
    ),
  };
}

const EFFECT_ANALYSIS_REASONS = [
  'declared-partial',
  'effect-cycle',
  'form-not-declared',
  'invalid-declared-effect',
  'opaque-dynamic-rule',
  'opaque-diagnostic',
] as const;

function parseEffectAnalysis(
  input: unknown,
  path: string,
): ContractEffectAnalysis {
  const value = record(input, path, new Set(['completeness', 'reasons']));
  const completeness = enumValue(
    required(value, 'completeness', path),
    `${path}.completeness`,
    ['complete', 'incomplete'] as const,
  );
  const reasons = array(required(value, 'reasons', path), `${path}.reasons`).map(
    (reason, index) =>
      enumValue(reason, `${path}.reasons[${index}]`, EFFECT_ANALYSIS_REASONS),
  );
  const uniqueReasons = new Set(reasons);
  if (uniqueReasons.size !== reasons.length) {
    fail(`${path}.reasons`, 'must not contain duplicates.');
  }
  if (
    (completeness === 'complete' && reasons.length !== 0) ||
    (completeness === 'incomplete' && reasons.length === 0)
  ) {
    fail(`${path}.reasons`, `must explain ${completeness} effect analysis.`);
  }
  return { completeness, reasons };
}

function parseContractDiagnosticEvidence(
  input: unknown,
  path: string,
): ContractDiagnostic {
  const value = record(
    input,
    path,
    new Set(['code', 'severity', 'message', 'evidence', 'sourcePath', 'nodeId']),
  );
  const nodeId = optional(value, 'nodeId');
  const diagnosticInput = input as ContractDiagnostic;
  const node =
    nodeId === undefined
      ? []
      : [
          {
            id: boundedId(nodeId, `${path}.nodeId`),
            kind: 'group' as const,
            modelPath: [],
            evidence: 'declared' as const,
            wrappers: [],
            constraints: [],
            options: [],
            conditions: [],
            dynamicRules: [],
            locators: [],
            children: [],
          },
        ];
  const contract = parseFormContract(
    createFormContract({
      schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
      formId: 'agent-context.query-diagnostic-evidence',
      nodes: node,
      diagnostics: [diagnosticInput],
    }),
  );
  return contract.diagnostics[0]!;
}

function parseContextSummaryProjection(
  input: unknown,
  path: string,
  selection: AgentContextQuerySelection,
): AgentContextContextSummaryProjection {
  const value = record(
    input,
    path,
    new Set([
      'usageEntry',
      'form',
      'diagnosticEvidenceCounts',
      'executableCapabilities',
      'scenarioIds',
      'effectAnalysis',
      'unknownEvidenceCounts',
    ]),
  );
  const usageEntryValue = record(
    required(value, 'usageEntry', path),
    `${path}.usageEntry`,
    new Set(['usage', 'entryId', 'landingStepId', 'capability']),
  );
  const usage = parseUsageIdentity(
    required(usageEntryValue, 'usage', `${path}.usageEntry`),
    `${path}.usageEntry.usage`,
  );
  if (usage.kind !== 'declared') {
    fail(`${path}.usageEntry.usage.kind`, 'must be declared.');
  }
  assertSame(usage, selection.usage, `${path}.usageEntry.usage`);
  if (
    required(usageEntryValue, 'capability', `${path}.usageEntry`) !==
    'open-usage'
  ) {
    fail(`${path}.usageEntry.capability`, 'must be open-usage.');
  }
  const formValue = record(
    required(value, 'form', path),
    `${path}.form`,
    new Set(['identity', 'nodeCount']),
  );
  const formIdentity = parseFormReference(
    required(formValue, 'identity', `${path}.form`),
    `${path}.form.identity`,
  );
  assertSame(formIdentity, selection.form, `${path}.form.identity`);
  const diagnosticCountsValue = record(
    required(value, 'diagnosticEvidenceCounts', path),
    `${path}.diagnosticEvidenceCounts`,
    new Set(['total', 'warnings', 'errors']),
  );
  const diagnosticEvidenceCounts = {
    total: nonNegativeInteger(
      required(diagnosticCountsValue, 'total', `${path}.diagnosticEvidenceCounts`),
      `${path}.diagnosticEvidenceCounts.total`,
    ),
    warnings: nonNegativeInteger(
      required(
        diagnosticCountsValue,
        'warnings',
        `${path}.diagnosticEvidenceCounts`,
      ),
      `${path}.diagnosticEvidenceCounts.warnings`,
    ),
    errors: nonNegativeInteger(
      required(diagnosticCountsValue, 'errors', `${path}.diagnosticEvidenceCounts`),
      `${path}.diagnosticEvidenceCounts.errors`,
    ),
  };
  if (
    diagnosticEvidenceCounts.total !==
    diagnosticEvidenceCounts.warnings + diagnosticEvidenceCounts.errors
  ) {
    fail(
      `${path}.diagnosticEvidenceCounts.total`,
      'must equal warnings plus errors.',
    );
  }
  const executableCapabilities = parseCanonicalCompleteCollection(
    required(value, 'executableCapabilities', path),
    `${path}.executableCapabilities`,
    parseCapability,
    (capability) => capability,
    compareText,
  );
  const scenarioIds = parseCanonicalCompleteCollection(
    required(value, 'scenarioIds', path),
    `${path}.scenarioIds`,
    boundedId,
    (scenarioId) => scenarioId,
    compareText,
  );
  assertSame(
    scenarioIds.items,
    [selection.scenario.id],
    `${path}.scenarioIds.items`,
  );
  const effectUnion = record(
    required(value, 'effectAnalysis', path),
    `${path}.effectAnalysis`,
    new Set(['state', 'analysis']),
  );
  const effectState = enumValue(
    required(effectUnion, 'state', `${path}.effectAnalysis`),
    `${path}.effectAnalysis.state`,
    ['not-reported', 'reported'] as const,
  );
  let effectAnalysis: AgentContextContextSummaryProjection['effectAnalysis'];
  if (effectState === 'not-reported') {
    record(
      required(value, 'effectAnalysis', path),
      `${path}.effectAnalysis`,
      new Set(['state']),
    );
    effectAnalysis = { state: effectState };
  } else {
    effectAnalysis = {
      state: effectState,
      analysis: parseEffectAnalysis(
        required(effectUnion, 'analysis', `${path}.effectAnalysis`),
        `${path}.effectAnalysis.analysis`,
      ),
    };
  }
  const unknownCountsValue = record(
    required(value, 'unknownEvidenceCounts', path),
    `${path}.unknownEvidenceCounts`,
    new Set([
      'total',
      'diagnostics',
      'interactionProfiles',
      'effectAnalysisReasons',
      'effectAnalysisUnreported',
    ]),
  );
  const effectAnalysisUnreported = nonNegativeInteger(
    required(
      unknownCountsValue,
      'effectAnalysisUnreported',
      `${path}.unknownEvidenceCounts`,
    ),
    `${path}.unknownEvidenceCounts.effectAnalysisUnreported`,
  );
  if (effectAnalysisUnreported !== 0 && effectAnalysisUnreported !== 1) {
    fail(
      `${path}.unknownEvidenceCounts.effectAnalysisUnreported`,
      'must be zero or one.',
    );
  }
  const normalizedEffectAnalysisUnreported: 0 | 1 =
    effectAnalysisUnreported === 0 ? 0 : 1;
  const unknownEvidenceCounts = {
    total: nonNegativeInteger(
      required(unknownCountsValue, 'total', `${path}.unknownEvidenceCounts`),
      `${path}.unknownEvidenceCounts.total`,
    ),
    diagnostics: nonNegativeInteger(
      required(
        unknownCountsValue,
        'diagnostics',
        `${path}.unknownEvidenceCounts`,
      ),
      `${path}.unknownEvidenceCounts.diagnostics`,
    ),
    interactionProfiles: nonNegativeInteger(
      required(
        unknownCountsValue,
        'interactionProfiles',
        `${path}.unknownEvidenceCounts`,
      ),
      `${path}.unknownEvidenceCounts.interactionProfiles`,
    ),
    effectAnalysisReasons: nonNegativeInteger(
      required(
        unknownCountsValue,
        'effectAnalysisReasons',
        `${path}.unknownEvidenceCounts`,
      ),
      `${path}.unknownEvidenceCounts.effectAnalysisReasons`,
    ),
    effectAnalysisUnreported: normalizedEffectAnalysisUnreported,
  };
  if (
    unknownEvidenceCounts.total !==
      unknownEvidenceCounts.diagnostics +
        unknownEvidenceCounts.interactionProfiles +
        unknownEvidenceCounts.effectAnalysisReasons +
        unknownEvidenceCounts.effectAnalysisUnreported ||
    unknownEvidenceCounts.diagnostics !== diagnosticEvidenceCounts.total ||
    unknownEvidenceCounts.effectAnalysisUnreported !==
      (effectAnalysis.state === 'not-reported' ? 1 : 0) ||
    unknownEvidenceCounts.effectAnalysisReasons !==
      (effectAnalysis.state === 'reported'
        ? effectAnalysis.analysis.reasons.length
        : 0)
  ) {
    fail(`${path}.unknownEvidenceCounts`, 'does not match the reported evidence.');
  }
  return {
    usageEntry: {
      usage,
      entryId: boundedId(
        required(usageEntryValue, 'entryId', `${path}.usageEntry`),
        `${path}.usageEntry.entryId`,
      ),
      landingStepId: boundedId(
        required(usageEntryValue, 'landingStepId', `${path}.usageEntry`),
        `${path}.usageEntry.landingStepId`,
      ),
      capability: 'open-usage',
    },
    form: {
      identity: formIdentity,
      nodeCount: nonNegativeInteger(
        required(formValue, 'nodeCount', `${path}.form`),
        `${path}.form.nodeCount`,
      ),
    },
    diagnosticEvidenceCounts,
    executableCapabilities,
    scenarioIds,
    effectAnalysis,
    unknownEvidenceCounts,
  };
}

function parseDiagnosticEvidenceProjection(
  input: unknown,
  path: string,
  selection: AgentContextQuerySelection,
): AgentContextDiagnosticEvidenceProjection {
  const union = record(
    input,
    path,
    new Set(['kind', 'owner', 'diagnostic', 'analysis']),
  );
  const kind = enumValue(required(union, 'kind', path), `${path}.kind`, [
    'contract-diagnostic',
    'effect-analysis',
  ] as const);
  const value = record(
    input,
    path,
    kind === 'contract-diagnostic'
      ? new Set(['kind', 'owner', 'diagnostic'])
      : new Set(['kind', 'owner', 'analysis']),
  );
  const owner = parseTypedArtifactReference(
    required(value, 'owner', path),
    `${path}.owner`,
    FORM_CONTRACT_SCHEMA_ID,
    FORM_CONTRACT_SCHEMA_VERSION,
  );
  if (
    !sameJson(owner, selection.owners.formContract) &&
    !sameJson(owner, selection.owners.scenarioArtifact)
  ) {
    fail(`${path}.owner`, 'must be a selected form evidence owner.');
  }
  return kind === 'contract-diagnostic'
    ? {
        kind,
        owner,
        diagnostic: parseContractDiagnosticEvidence(
          required(value, 'diagnostic', path),
          `${path}.diagnostic`,
        ),
      }
    : {
        kind,
        owner,
        analysis: parseEffectAnalysis(
          required(value, 'analysis', path),
          `${path}.analysis`,
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
      'scope',
      'selection',
      'freshness',
      'authority',
      'summary',
      'steps',
      'evidence',
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
        'summary',
        'steps',
        'page',
      ]),
    );
    const summary = parseContextSummaryProjection(
      required(value, 'summary', path),
      `${path}.summary`,
      selection,
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
      summary,
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
        'evidence',
        'page',
      ]),
    );
    const evidence = parseCandidateList(
      required(value, 'evidence', path),
      `${path}.evidence`,
      (entry, entryPath) =>
        parseDiagnosticEvidenceProjection(entry, entryPath, selection),
      canonicalStringify,
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-form-context',
      status,
      view,
      selection,
      freshness,
      evidence,
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
    journey: parseJourneyProjection(
      required(value, 'journey', path),
      `${path}.journey`,
      selection,
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
      'authority',
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
      ...(status === 'not-found' ? [] : ['authority']),
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
  const authority =
    status === 'not-found'
      ? undefined
      : parseExecutionAuthorityProjection(
          required(value, 'authority', path),
          `${path}.authority`,
          selection,
        );
  if (authority !== undefined) {
    const authorityNodeIds = new Set(
      authority.steps.items.flatMap(({ nodeIds }) => nodeIds),
    );
    for (const [index, candidate] of candidates.entries()) {
      if (!authorityNodeIds.has(candidate.nodeId)) {
        fail(
          `${path}.candidates[${index}].nodeId`,
          'must belong to the selected usage authority.',
        );
      }
    }
  }
  if (status === 'complete') {
    if (candidates.length !== 1) {
      fail(`${path}.candidates`, 'must contain exactly one complete match.');
    }
    if (page.truncated) {
      fail(`${path}.page.truncated`, 'must be false for a complete result.');
    }
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'find-form-nodes',
      status,
      selection,
      freshness,
      authority: authority!,
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
      authority: authority!,
      candidates,
      page,
      reason,
    };
  }
  if (candidates.length !== 0) fail(`${path}.candidates`, 'must be empty.');
  if (reason.kind !== 'node-absent') fail(`${path}.reason.kind`, 'must be node-absent.');
  if (page.truncated) {
    fail(`${path}.page.truncated`, 'must be false for a not-found result.');
  }
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
  selection: AgentContextQuerySelection,
): AgentContextE2eSliceProjection {
  const value = record(
    input,
    path,
    new Set([
      'withinStepId',
      'authority',
      'focusNodes',
      'closureNodes',
      'prerequisites',
      'effects',
    ]),
  );
  const withinStepId = boundedId(
    required(value, 'withinStepId', path),
    `${path}.withinStepId`,
  );
  const authority = parseExecutionAuthorityProjection(
    required(value, 'authority', path),
    `${path}.authority`,
    selection,
  );
  const step = authority.steps.items.find(({ id }) => id === withinStepId);
  if (step === undefined) {
    fail(`${path}.withinStepId`, 'must resolve in the selected authority.');
  }
  const parseNodes = (
    collectionInput: unknown,
    collectionPath: string,
    minimum: number,
  ): AgentContextCompleteCollection<AgentContextNodeCandidateProjection> => {
    const collection = parseCanonicalCompleteCollection(
      collectionInput,
      collectionPath,
      parseNodeCandidate,
      ({ nodeId }) => nodeId,
      (left, right) => compareText(left.nodeId, right.nodeId),
    );
    if (collection.items.length < minimum) {
      fail(`${collectionPath}.items`, `must contain at least ${minimum} entries.`);
    }
    return collection;
  };
  const focusNodes = parseNodes(
    required(value, 'focusNodes', path),
    `${path}.focusNodes`,
    1,
  );
  const closureNodes = parseNodes(
    required(value, 'closureNodes', path),
    `${path}.closureNodes`,
    1,
  );
  const closureById = new Map(
    closureNodes.items.map((node) => [node.nodeId, node] as const),
  );
  for (const [index, node] of focusNodes.items.entries()) {
    const closureNode = closureById.get(node.nodeId);
    if (closureNode === undefined || !sameJson(closureNode, node)) {
      fail(
        `${path}.focusNodes.items[${index}]`,
        'must be an exact subset of closureNodes.',
      );
    }
  }
  const stepNodeIds = new Set(step.nodeIds);
  for (const [index, node] of closureNodes.items.entries()) {
    if (!stepNodeIds.has(node.nodeId)) {
      fail(
        `${path}.closureNodes.items[${index}].nodeId`,
        'must belong to withinStepId.',
      );
    }
    if (!sameJson(node.included, NODE_DETAIL_ASPECTS)) {
      fail(
        `${path}.closureNodes.items[${index}].included`,
        'must contain the full canonical slice include set.',
      );
    }
  }
  const rawEffects = parseCompleteCollection(
    required(value, 'effects', path),
    `${path}.effects`,
    (entry) => entry,
  );
  const registry = parseCrossFieldEffectRegistry({
    schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
    id: 'agent-context.query-slice-effects',
    version: 1,
    forms: [
      {
        formId: 'agent-context.query-slice-projection',
        coverage: 'partial',
        effects: rawEffects.items,
      },
    ],
  });
  const parsedEffects = registry.forms[0]!.effects;
  assertCanonicalSet(
    parsedEffects,
    `${path}.effects.items`,
    (effect) => `${effect.identity.id}\0${effect.identity.version}`,
    (left, right) =>
      compareText(left.identity.id, right.identity.id) ||
      left.identity.version - right.identity.version,
  );
  for (const [index, effect] of parsedEffects.entries()) {
    if (
      !closureById.has(effect.trigger.nodeId) ||
      !closureById.has(effect.target.nodeId)
    ) {
      fail(
        `${path}.effects.items[${index}]`,
        'must have both effect endpoints in the exact closure.',
      );
    }
  }
  const prerequisites = parseCanonicalCompleteCollection(
    required(value, 'prerequisites', path),
    `${path}.prerequisites`,
    (entry, entryPath): AgentContextE2ePrerequisiteProjection => {
      const union = record(
        entry,
        entryPath,
        new Set([
          'kind',
          'node',
          'effect',
          'readiness',
          'preconditionIndex',
          'precondition',
        ]),
      );
      const kind = enumValue(required(union, 'kind', entryPath), `${entryPath}.kind`, [
        'effect-source',
        'readiness',
        'wrapper-precondition',
      ] as const);
      const branch = record(
        entry,
        entryPath,
        kind === 'effect-source'
          ? new Set(['kind', 'node', 'effect'])
          : kind === 'readiness'
            ? new Set(['kind', 'node', 'readiness'])
            : new Set([
                'kind',
                'node',
                'preconditionIndex',
                'precondition',
              ]),
      );
      const node = parseNodeCandidate(
        required(branch, 'node', entryPath),
        `${entryPath}.node`,
      );
      const closureNode = closureById.get(node.nodeId);
      if (closureNode === undefined || !sameJson(closureNode, node)) {
        fail(`${entryPath}.node`, 'must be an exact closure node.');
      }
      if (kind === 'effect-source') {
        const effectInput = required(branch, 'effect', entryPath);
        const effect = parsedEffects.find((candidate) =>
          sameJson(candidate, effectInput),
        );
        if (effect?.trigger.nodeId !== node.nodeId) {
          fail(
            `${entryPath}.effect`,
            'must be an exact slice effect triggered by the prerequisite node.',
          );
        }
        return { kind, node, effect };
      }
      if (kind === 'readiness') {
        const readinessInput = required(branch, 'readiness', entryPath);
        const readiness = authority.readiness.items.find((candidate) =>
          sameJson(candidate, readinessInput),
        );
        if (readiness?.nodeId !== node.nodeId) {
          fail(
            `${entryPath}.readiness`,
            'must be an exact selected-authority readiness for the prerequisite node.',
          );
        }
        return { kind, node, readiness };
      }
      const preconditionIndex = nonNegativeInteger(
        required(branch, 'preconditionIndex', entryPath),
        `${entryPath}.preconditionIndex`,
      );
      const preconditionInput = required(branch, 'precondition', entryPath);
      const precondition =
        node.details.interaction?.profile?.preconditions[preconditionIndex];
      if (precondition === undefined || !sameJson(precondition, preconditionInput)) {
        fail(
          `${entryPath}.precondition`,
          'must equal the included wrapper precondition at preconditionIndex.',
        );
      }
      return { kind, node, preconditionIndex, precondition };
    },
    canonicalStringify,
    (left, right) => compareText(canonicalStringify(left), canonicalStringify(right)),
  );
  return {
    withinStepId,
    authority,
    focusNodes,
    closureNodes,
    prerequisites,
    effects: { complete: true, items: parsedEffects },
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
      'request',
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
  const request = parseE2eSliceRequest(
    required(union, 'request', path),
    `${path}.request`,
  );
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
        'request',
        'slice',
      ]),
    );
    const slice = parseSliceProjection(
      required(value, 'slice', path),
      `${path}.slice`,
      selection,
    );
    if (slice.withinStepId !== request.withinStepId) {
      fail(`${path}.slice.withinStepId`, 'must equal request.withinStepId.');
    }
    assertSame(
      slice.focusNodes.items.map(({ nodeId }) => nodeId),
      request.nodeIds,
      `${path}.slice.focusNodes`,
    );
    return {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-e2e-slice',
      status,
      selection,
      freshness,
      request,
      slice,
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
      'request',
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
    request,
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
      'scope',
      'selection',
      'freshness',
      'authority',
      'candidates',
      'page',
      'reason',
      'summary',
      'steps',
      'evidence',
      'journey',
      'request',
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
    steps: { complete: true, items: steps },
    actions: { complete: true, items: actions },
    outcomes: { complete: true, items: outcomes },
    transitions: { complete: true, items: transitions },
    physicalOperations: {
      complete: true,
      items: completeUsage
        ? authority.physicalOperations
        : authority.physicalOperations.filter(({ id }) =>
            physicalOperationIds.has(id),
          ),
    },
    readiness: { complete: true, items: readiness },
    interactions: { complete: true, items: interactions },
    commits: { complete: true, items: commits },
    validationSurfaces: { complete: true, items: validationSurfaces },
    valueAssertions: { complete: true, items: valueAssertions },
    stateAssertions: { complete: true, items: stateAssertions },
    repeaterCaptures: { complete: true, items: repeaterCaptures },
  };
}

function collectFormContractNodes(
  nodes: FormContract['nodes'],
): readonly FormContract['nodes'][number][] {
  return nodes.flatMap((node) => [
    node,
    ...collectFormContractNodes(node.children),
    ...(node.arrayTemplate === undefined
      ? []
      : collectFormContractNodes([node.arrayTemplate])),
  ]);
}

function collectExecutableCapabilities(
  authority: AgentContextExecutionAuthority,
): readonly AgentContextQueryCapability[] {
  const capabilities: AgentContextQueryCapability[] = [
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
  ];
  return [...new Set(capabilities)].sort(compareText);
}

function collectNodeCapabilities(
  authority: AgentContextExecutionAuthority,
  nodeId: string,
): readonly AgentContextQueryCapability[] {
  const capabilities: AgentContextQueryCapability[] = [
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
  ];
  return [...new Set(capabilities)].sort(compareText);
}

function projectContextSummary(
  selection: AgentContextQuerySelection,
  contract: FormContract,
  authority: AgentContextExecutionAuthority,
): AgentContextContextSummaryProjection {
  const nodes = collectFormContractNodes(contract.nodes);
  const diagnostics = contract.diagnostics;
  const interactionProfiles = nodes.reduce(
    (count, node) => count + (node.interactionProfile?.unknowns.length ?? 0),
    0,
  );
  const effectAnalysisReasons = contract.effectAnalysis?.reasons.length ?? 0;
  const effectAnalysisUnreported = contract.effectAnalysis === undefined ? 1 : 0;
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
    executableCapabilities: {
      complete: true,
      items: collectExecutableCapabilities(authority),
    },
    scenarioIds: { complete: true, items: [selection.scenario.id] },
    effectAnalysis:
      contract.effectAnalysis === undefined
        ? { state: 'not-reported' }
        : { state: 'reported', analysis: contract.effectAnalysis },
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

function validateSearchCandidateAgainstDataset(
  dataset: AgentContextQueryDataset,
  candidate: AgentContextUsageCandidateProjection,
  path: string,
): void {
  const catalog = findOwner(
    dataset.sourceUsageCatalogs,
    candidate.sourceUsageCatalog,
    `${path}.sourceUsageCatalog`,
  ).artifact;
  const matches = catalog.usages.filter(({ identity }) =>
    sameJson(identity, candidate.usage),
  );
  if (matches.length !== 1) {
    fail(`${path}.usage`, 'must resolve exactly one source-usage owner record.');
  }
  const usage = matches[0]!;
  if (usage.projectId !== candidate.projectId) {
    fail(`${path}.projectId`, 'does not match the source-usage owner.');
  }
  if (
    candidate.usage.kind === 'callsite' &&
    candidate.usage.projectId !== candidate.projectId
  ) {
    fail(`${path}.usage.projectId`, 'does not match the source-usage owner.');
  }
  const exactForm =
    usage.resolution.status === 'exact'
      ? usage.resolution.candidate.form
      : undefined;
  if (candidate.form === undefined) {
    if (candidate.usage.kind === 'declared' && exactForm !== undefined) {
      fail(`${path}.form`, 'must surface the exact resolved form.');
    }
  } else {
    if (exactForm === undefined || !sameJson(candidate.form, exactForm)) {
      fail(`${path}.form`, 'does not match an exact source-usage resolution.');
    }
  }
  for (const [index, handoff] of candidate.selectionHandoffs.items.entries()) {
    validateAgentContextQuerySelectionAgainstParsedDataset(dataset, handoff);
    if (candidate.form === undefined || !sameJson(handoff.form, candidate.form)) {
      fail(
        `${path}.selectionHandoffs.items[${index}]`,
        'does not match the candidate form.',
      );
    }
  }
}

function validateNodeProjectionAgainstOwners(
  nodeById: ReadonlyMap<string, FormContract['nodes'][number]>,
  contract: FormContract,
  authority: AgentContextExecutionAuthority,
  candidate: AgentContextNodeCandidateProjection,
  path: string,
): void {
  const node = nodeById.get(candidate.nodeId);
  if (node === undefined) {
    fail(`${path}.nodeId`, 'must resolve exactly one selected form node.');
  }
  const basicProjection = {
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
  };
  const candidateBasic = {
    nodeId: candidate.nodeId,
    kind: candidate.kind,
    modelPath: candidate.modelPath,
    ...(candidate.formlyType === undefined
      ? {}
      : { formlyType: candidate.formlyType }),
    ...(candidate.semanticType === undefined
      ? {}
      : { semanticType: candidate.semanticType }),
    evidence: candidate.evidence,
    ...(candidate.presentation === undefined
      ? {}
      : { presentation: candidate.presentation }),
    ...(candidate.state === undefined ? {} : { state: candidate.state }),
    childNodeIds: candidate.childNodeIds,
    ...(candidate.arrayTemplateNodeId === undefined
      ? {}
      : { arrayTemplateNodeId: candidate.arrayTemplateNodeId }),
  };
  assertSame(candidateBasic, basicProjection, path);
  assertSame(
    candidate.capabilities,
    collectNodeCapabilities(authority, node.id),
    `${path}.capabilities`,
  );
  const effects = (contract.declaredEffects ?? []).filter(
    ({ trigger, target }) => trigger.nodeId === node.id || target.nodeId === node.id,
  );
  const diagnostics = contract.diagnostics.filter(
    ({ nodeId }) => nodeId === node.id,
  );
  for (const aspect of candidate.included) {
    const expected =
      aspect === 'constraints'
        ? { complete: true, items: node.constraints }
        : aspect === 'domain'
          ? {
              options: { complete: true, items: node.options },
              ...(node.optionSource === undefined
                ? {}
                : { optionSource: node.optionSource }),
              ...(node.valueDomain === undefined
                ? {}
                : { valueDomain: node.valueDomain }),
            }
          : aspect === 'effects'
            ? { complete: true, items: effects }
            : aspect === 'interaction'
              ? node.interactionProfile === undefined
                ? {}
                : { profile: node.interactionProfile }
              : aspect === 'locators'
                ? { complete: true, items: node.locators }
                : { complete: true, items: diagnostics };
    assertSame(candidate.details[aspect], expected, `${path}.details.${aspect}`);
  }
}

type AgentContextE2eSliceSemanticReason = Extract<
  AgentContextQueryReason,
  {
    kind:
      | 'step-absent'
      | 'slice-focus-node-absent'
      | 'step-scope-mismatch'
      | 'cross-step-prerequisite-required'
      | 'cross-step-transition-ambiguous'
      | 'cross-step-transition-unavailable'
      | 'prerequisite-readiness-unavailable'
      | 'prerequisite-cycle';
  }
>;

/** @internal CTX-1 source-module seam; package publication remains CTX-1D. */
export type AgentContextE2eSliceResolution =
  | {
      readonly status: 'complete';
      readonly slice: AgentContextE2eSliceProjection;
    }
  | {
      readonly status: 'refused';
      readonly reason: AgentContextE2eSliceSemanticReason;
    };

function projectNodeCandidate(
  contract: FormContract,
  authority: AgentContextExecutionAuthority,
  node: FormContract['nodes'][number],
  included: readonly AgentContextNodeDetailAspect[],
): AgentContextNodeCandidateProjection {
  const includeSet = new Set(included);
  const effects = (contract.declaredEffects ?? [])
    .filter(
      ({ trigger, target }) =>
        trigger.nodeId === node.id || target.nodeId === node.id,
    )
    .sort(
      (left, right) =>
        compareText(left.identity.id, right.identity.id) ||
        left.identity.version - right.identity.version,
    );
  const diagnostics = contract.diagnostics.filter(
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
    capabilities: collectNodeCapabilities(authority, node.id),
    included,
    details: {
      ...(includeSet.has('constraints')
        ? { constraints: { complete: true, items: node.constraints } }
        : {}),
      ...(includeSet.has('domain')
        ? {
            domain: {
              options: { complete: true, items: node.options },
              ...(node.optionSource === undefined
                ? {}
                : { optionSource: node.optionSource }),
              ...(node.valueDomain === undefined
                ? {}
                : { valueDomain: node.valueDomain }),
            },
          }
        : {}),
      ...(includeSet.has('effects')
        ? { effects: { complete: true, items: effects } }
        : {}),
      ...(includeSet.has('interaction')
        ? {
            interaction:
              node.interactionProfile === undefined
                ? {}
                : { profile: node.interactionProfile },
          }
        : {}),
      ...(includeSet.has('locators')
        ? { locators: { complete: true, items: node.locators } }
        : {}),
      ...(includeSet.has('unknowns')
        ? { unknowns: { complete: true, items: diagnostics } }
        : {}),
    },
  };
}

function firstPrerequisiteCycle(
  nodeIds: ReadonlySet<string>,
  effects: readonly DeclaredCrossFieldEffect[],
): readonly string[] | undefined {
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();
  for (const nodeId of [...nodeIds].sort(compareText)) adjacency.set(nodeId, []);
  for (const nodeId of adjacency.keys()) reverseAdjacency.set(nodeId, []);
  for (const effect of effects) {
    if (
      effect.ordering !== 'source-before-target' ||
      !nodeIds.has(effect.trigger.nodeId) ||
      !nodeIds.has(effect.target.nodeId)
    ) {
      continue;
    }
    adjacency.get(effect.target.nodeId)!.push(effect.trigger.nodeId);
    reverseAdjacency.get(effect.trigger.nodeId)!.push(effect.target.nodeId);
  }
  for (const targets of adjacency.values()) targets.sort(compareText);
  for (const targets of reverseAdjacency.values()) targets.sort(compareText);

  const visited = new Set<string>();
  const finishOrder: string[] = [];
  for (const root of [...adjacency.keys()].sort(compareText)) {
    if (visited.has(root)) continue;
    visited.add(root);
    const stack: { readonly nodeId: string; nextIndex: number }[] = [
      { nodeId: root, nextIndex: 0 },
    ];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const targets = adjacency.get(frame.nodeId) ?? [];
      const targetId = targets[frame.nextIndex];
      if (targetId === undefined) {
        finishOrder.push(frame.nodeId);
        stack.pop();
        continue;
      }
      frame.nextIndex += 1;
      if (visited.has(targetId)) continue;
      visited.add(targetId);
      stack.push({ nodeId: targetId, nextIndex: 0 });
    }
  }

  const assigned = new Set<string>();
  const cycles: string[][] = [];
  for (const root of finishOrder.reverse()) {
    if (assigned.has(root)) continue;
    const component: string[] = [];
    const stack = [root];
    assigned.add(root);
    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      component.push(nodeId);
      const targets = reverseAdjacency.get(nodeId) ?? [];
      for (let index = targets.length - 1; index >= 0; index -= 1) {
        const targetId = targets[index]!;
        if (assigned.has(targetId)) continue;
        assigned.add(targetId);
        stack.push(targetId);
      }
    }
    component.sort(compareText);
    if (
      component.length > 1 ||
      (component.length === 1 &&
        (adjacency.get(component[0]!) ?? []).includes(component[0]!))
    ) {
      cycles.push(component);
    }
  }
  cycles.sort((left, right) =>
    compareText(canonicalStringify(left), canonicalStringify(right)),
  );
  return cycles[0];
}

function crossStepWitness(
  effect: DeclaredCrossFieldEffect,
  triggerStepId: string,
  targetStepId: string,
): AgentContextCrossStepWitness {
  return {
    effect: effect.identity,
    trigger: { nodeId: effect.trigger.nodeId, stepId: triggerStepId },
    target: { nodeId: effect.target.nodeId, stepId: targetStepId },
  };
}

/** @internal CTX-1 source-module seam; package publication remains CTX-1D. */
export function resolveAgentContextE2eSliceAgainstParsedDataset(
  dataset: AgentContextQueryDataset,
  selection: AgentContextQuerySelection,
  request: AgentContextE2eSliceRequest,
): AgentContextE2eSliceResolution {
  const scenarioArtifact = findOwner(
    dataset.formContracts,
    selection.owners.scenarioArtifact,
    'agentContextQuerySlice.selection.owners.scenarioArtifact',
  ).artifact;
  const authority = findOwner(
    dataset.executionAuthorities,
    selection.owners.executionAuthority,
    'agentContextQuerySlice.selection.owners.executionAuthority',
  ).artifact;
  const selectedStep = authority.usage.steps.find(
    ({ id }) => id === request.withinStepId,
  );
  if (selectedStep === undefined) {
    return {
      status: 'refused',
      reason: { kind: 'step-absent', stepId: request.withinStepId },
    };
  }
  const scenarioNodes = collectFormContractNodes(scenarioArtifact.nodes);
  const scenarioNodeById = new Map(
    scenarioNodes.map((node) => [node.id, node] as const),
  );
  const absentNodeIds = request.nodeIds.filter(
    (nodeId) => !scenarioNodeById.has(nodeId),
  );
  if (absentNodeIds.length > 0) {
    return {
      status: 'refused',
      reason: { kind: 'slice-focus-node-absent', nodeIds: absentNodeIds },
    };
  }
  const selectedStepNodeIds = new Set(selectedStep.nodeIds);
  const outOfScopeNodeIds = request.nodeIds.filter(
    (nodeId) => !selectedStepNodeIds.has(nodeId),
  );
  if (outOfScopeNodeIds.length > 0) {
    return {
      status: 'refused',
      reason: { kind: 'step-scope-mismatch', nodeIds: outOfScopeNodeIds },
    };
  }

  const stepByNodeId = new Map<string, string>();
  for (const step of authority.usage.steps) {
    for (const nodeId of step.nodeIds) stepByNodeId.set(nodeId, step.id);
  }
  const scenarioEffects = scenarioArtifact.declaredEffects ?? [];
  for (const [index, effect] of scenarioEffects.entries()) {
    for (const [role, nodeId] of [
      ['trigger', effect.trigger.nodeId],
      ['target', effect.target.nodeId],
    ] as const) {
      if (!scenarioNodeById.has(nodeId) || !stepByNodeId.has(nodeId)) {
        fail(
          `agentContextQuerySlice.effects[${index}].${role}.nodeId`,
          'must resolve in both the scenario artifact and execution-authority steps.',
        );
      }
    }
  }
  const closureNodeIds = new Set(request.nodeIds);
  const includedEffects = new Map<string, DeclaredCrossFieldEffect>();
  const crossStepWitnesses = new Map<string, AgentContextCrossStepWitness>();
  const incomingByTarget = new Map<string, DeclaredCrossFieldEffect[]>();
  const sameStepOutgoingByTrigger = new Map<
    string,
    DeclaredCrossFieldEffect[]
  >();
  for (const effect of scenarioEffects) {
    if (effect.ordering === 'source-before-target') {
      const incoming = incomingByTarget.get(effect.target.nodeId) ?? [];
      incoming.push(effect);
      incomingByTarget.set(effect.target.nodeId, incoming);
    }
    if (
      stepByNodeId.get(effect.trigger.nodeId) ===
      stepByNodeId.get(effect.target.nodeId)
    ) {
      const outgoing = sameStepOutgoingByTrigger.get(effect.trigger.nodeId) ?? [];
      outgoing.push(effect);
      sameStepOutgoingByTrigger.set(effect.trigger.nodeId, outgoing);
    }
  }
  const closeIncoming = (seedNodeIds: readonly string[]): void => {
    const pendingNodeIds = [...seedNodeIds];
    let pendingIndex = 0;
    while (pendingIndex < pendingNodeIds.length) {
      const nodeId = pendingNodeIds[pendingIndex]!;
      pendingIndex += 1;
      for (const effect of incomingByTarget.get(nodeId) ?? []) {
        const effectKey = `${effect.identity.id}\0${effect.identity.version}`;
        const triggerStepId = stepByNodeId.get(effect.trigger.nodeId)!;
        const targetStepId = stepByNodeId.get(effect.target.nodeId)!;
        if (triggerStepId !== targetStepId) {
          const witness = crossStepWitness(effect, triggerStepId, targetStepId);
          crossStepWitnesses.set(canonicalStringify(witness), witness);
          continue;
        }
        includedEffects.set(effectKey, effect);
        if (!closureNodeIds.has(effect.trigger.nodeId)) {
          closureNodeIds.add(effect.trigger.nodeId);
          pendingNodeIds.push(effect.trigger.nodeId);
        }
      }
    }
  };
  closeIncoming(request.nodeIds);
  if (request.includeOutgoingEffects) {
    const outgoingSourceNodeIds = [...closureNodeIds];
    const outgoingTargetNodeIds: string[] = [];
    for (const nodeId of outgoingSourceNodeIds) {
      for (const effect of sameStepOutgoingByTrigger.get(nodeId) ?? []) {
        const effectKey = `${effect.identity.id}\0${effect.identity.version}`;
        includedEffects.set(effectKey, effect);
        if (!closureNodeIds.has(effect.target.nodeId)) {
          closureNodeIds.add(effect.target.nodeId);
          outgoingTargetNodeIds.push(effect.target.nodeId);
        }
      }
    }
    closeIncoming(outgoingTargetNodeIds);
  }

  const firstWitness = [...crossStepWitnesses.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, witness]) => witness)[0];
  if (firstWitness !== undefined) {
    const transitions = authority.usage.transitions
      .filter(
        ({ fromStepId, toStepId }) =>
          fromStepId === firstWitness.trigger.stepId &&
          toStepId === firstWitness.target.stepId,
      )
      .sort((left, right) =>
        compareText(canonicalStringify(left), canonicalStringify(right)),
      );
    if (transitions.length === 0) {
      return {
        status: 'refused',
        reason: {
          kind: 'cross-step-transition-unavailable',
          witness: firstWitness,
        },
      };
    }
    if (transitions.length > 1) {
      return {
        status: 'refused',
        reason: {
          kind: 'cross-step-transition-ambiguous',
          witness: firstWitness,
          transitions,
        },
      };
    }
    return {
      status: 'refused',
      reason: {
        kind: 'cross-step-prerequisite-required',
        witness: firstWitness,
        transition: transitions[0]!,
      },
    };
  }

  const effects = [...includedEffects.values()].sort(
    (left, right) =>
      compareText(left.identity.id, right.identity.id) ||
      left.identity.version - right.identity.version,
  );
  const cycle = firstPrerequisiteCycle(closureNodeIds, effects);
  if (cycle !== undefined) {
    return {
      status: 'refused',
      reason: { kind: 'prerequisite-cycle', nodeIds: cycle },
    };
  }
  for (const effect of effects) {
    if (effect.timing.mode !== 'async') continue;
    const readinessId = effect.timing.readinessId;
    const readiness = authority.readiness.filter(
      ({ id, nodeId }) =>
        id === readinessId && nodeId === effect.target.nodeId,
    );
    if (readiness.length !== 1) {
      return {
        status: 'refused',
        reason: {
          kind: 'prerequisite-readiness-unavailable',
          effect: effect.identity,
          nodeId: effect.target.nodeId,
          readinessId,
        },
      };
    }
  }

  const closureNodes = [...closureNodeIds]
    .sort(compareText)
    .map((nodeId) =>
      projectNodeCandidate(
        scenarioArtifact,
        authority,
        scenarioNodeById.get(nodeId)!,
        NODE_DETAIL_ASPECTS,
      ),
    );
  const nodeProjectionById = new Map(
    closureNodes.map((node) => [node.nodeId, node] as const),
  );
  const prerequisites: AgentContextE2ePrerequisiteProjection[] = [
    ...effects
      .filter(({ ordering }) => ordering === 'source-before-target')
      .map((effect) => ({
        kind: 'effect-source' as const,
        node: nodeProjectionById.get(effect.trigger.nodeId)!,
        effect,
      })),
    ...authority.readiness
      .filter(({ nodeId }) => closureNodeIds.has(nodeId))
      .map((readiness) => ({
        kind: 'readiness' as const,
        node: nodeProjectionById.get(readiness.nodeId)!,
        readiness,
      })),
    ...closureNodes.flatMap((node) =>
      (node.details.interaction?.profile?.preconditions ?? []).map(
        (precondition, preconditionIndex) => ({
          kind: 'wrapper-precondition' as const,
          node,
          preconditionIndex,
          precondition,
        }),
      ),
    ),
  ].sort((left, right) =>
    compareText(canonicalStringify(left), canonicalStringify(right)),
  );
  const focusNodes = request.nodeIds.map(
    (nodeId) => nodeProjectionById.get(nodeId)!,
  );
  return {
    status: 'complete',
    slice: {
      withinStepId: request.withinStepId,
      authority: projectExecutionAuthority(
        selection,
        authority,
        closureNodes.map(({ nodeId }) => nodeId),
      ),
      focusNodes: { complete: true, items: focusNodes },
      closureNodes: { complete: true, items: closureNodes },
      prerequisites: { complete: true, items: prerequisites },
      effects: { complete: true, items: effects },
    },
  };
}

function dataGraphExceeds(input: unknown, maximum: number): boolean {
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

/** @internal CTX-1 source-module seam; package publication remains CTX-1D. */
export function classifyAgentContextJourneyOverflow(
  result: Extract<
    GetFormContextResult,
    { readonly status: 'complete'; readonly view: 'journey' }
  >,
):
  | Extract<
      AgentContextQueryReason,
      { readonly kind: 'atomic-record-too-large' | 'atomic-view-too-large' }
    >
  | undefined {
  const authority = result.journey.authority;
  const collections = [
    authority.steps.items,
    authority.actions.items,
    authority.outcomes.items,
    authority.transitions.items,
    authority.physicalOperations.items,
    authority.readiness.items,
    authority.interactions.items,
    authority.commits.items,
    authority.validationSurfaces.items,
    authority.valueAssertions.items,
    authority.stateAssertions.items,
    authority.repeaterCaptures.items,
  ];
  if (
    collections.some(
      (items) => items.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE,
    ) ||
    [authority.entry, ...collections.flat()].some((record) =>
      dataGraphExceeds(
        record,
        AGENT_CONTEXT_QUERY_MAX_ATOMIC_RECORD_GRAPH_NODES,
      ),
    )
  ) {
    return { kind: 'atomic-record-too-large' };
  }
  if (
    dataGraphExceeds(
      result,
      AGENT_CONTEXT_QUERY_MAX_ATOMIC_VIEW_GRAPH_NODES,
    )
  ) {
    return { kind: 'atomic-view-too-large' };
  }
  return undefined;
}

/** @internal CTX-1 source-module seam; package publication remains CTX-1D. */
export function classifyAgentContextE2eSliceOverflow(
  result: GetE2eSliceResult,
):
  | Extract<
      AgentContextQueryReason,
      { readonly kind: 'atomic-record-too-large' | 'atomic-view-too-large' }
    >
  | undefined {
  const collections =
    result.status === 'complete'
      ? [
          result.slice.authority.steps.items,
          result.slice.authority.actions.items,
          result.slice.authority.outcomes.items,
          result.slice.authority.transitions.items,
          result.slice.authority.physicalOperations.items,
          result.slice.authority.readiness.items,
          result.slice.authority.interactions.items,
          result.slice.authority.commits.items,
          result.slice.authority.validationSurfaces.items,
          result.slice.authority.valueAssertions.items,
          result.slice.authority.stateAssertions.items,
          result.slice.authority.repeaterCaptures.items,
          result.slice.focusNodes.items,
          result.slice.closureNodes.items,
          result.slice.prerequisites.items,
          result.slice.effects.items,
        ]
      : result.reason.kind === 'cross-step-transition-ambiguous'
        ? [result.reason.transitions]
        : [];
  const records =
    result.status === 'complete'
      ? [result.request, result.slice.authority.entry, ...collections.flat()]
      : [result.request, result.reason];
  if (
    collections.some(
      (items) => items.length > AGENT_CONTEXT_QUERY_MAX_COLLECTION_SIZE,
    ) ||
    records.some((record) =>
      dataGraphExceeds(
        record,
        AGENT_CONTEXT_QUERY_MAX_ATOMIC_RECORD_GRAPH_NODES,
      ),
    )
  ) {
    return { kind: 'atomic-record-too-large' };
  }
  if (
    dataGraphExceeds(
      result,
      AGENT_CONTEXT_QUERY_MAX_ATOMIC_VIEW_GRAPH_NODES,
    )
  ) {
    return { kind: 'atomic-view-too-large' };
  }
  return undefined;
}

/** @internal CTX-1 source-module seam; package publication remains CTX-1D. */
export function validateAgentContextQueryResultAgainstParsedDataset(
  dataset: AgentContextQueryDataset,
  resultInput: unknown,
): AgentContextQueryResult {
  const result = parseAgentContextQueryResult(resultInput);
  const path = 'agentContextQueryResult';
  if (result.operation === 'search-form-usages') {
    validateAgentContextUsageSearchScopeAgainstParsedDataset(
      dataset,
      result.scope,
    );
    if (result.status !== 'refused') {
      for (const [index, candidate] of result.candidates.entries()) {
        validateSearchCandidateAgainstDataset(
          dataset,
          candidate,
          `${path}.candidates[${index}]`,
        );
      }
    }
    return result;
  }
  const selection = validateAgentContextQuerySelectionAgainstParsedDataset(
    dataset,
    result.selection,
  );
  if (result.operation === 'get-e2e-slice') {
    const resolution = resolveAgentContextE2eSliceAgainstParsedDataset(
      dataset,
      selection,
      result.request,
    );
    const semanticResult: GetE2eSliceResult =
      resolution.status === 'complete'
        ? {
            schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
            operation: 'get-e2e-slice',
            status: 'complete',
            selection,
            freshness: result.freshness,
            request: result.request,
            slice: resolution.slice,
          }
        : {
            schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
            operation: 'get-e2e-slice',
            status: 'refused',
            selection,
            freshness: result.freshness,
            request: result.request,
            reason: resolution.reason,
          };
    const overflow = classifyAgentContextE2eSliceOverflow(semanticResult);
    if (result.status === 'refused') {
      const expectedReason =
        overflow ??
        (resolution.status === 'refused' ? resolution.reason : undefined);
      if (expectedReason === undefined) {
        fail(`${path}.reason`, 'does not match the recomputed slice outcome.');
      }
      assertSame(result.reason, expectedReason, `${path}.reason`);
      return result;
    }
    if (resolution.status !== 'complete' || overflow !== undefined) {
      fail(`${path}.slice`, 'does not match the recomputed slice outcome.');
    }
    assertSame(result.slice, resolution.slice, `${path}.slice`);
    return result;
  }
  const authority = findOwner(
    dataset.executionAuthorities,
    selection.owners.executionAuthority,
    `${path}.selection.owners.executionAuthority`,
  ).artifact;
  if (result.status === 'refused') {
    if (result.operation === 'get-form-context' && result.view === 'journey') {
      const semanticResult = {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        operation: 'get-form-context',
        status: 'complete',
        view: 'journey',
        selection,
        freshness: result.freshness,
        journey: {
          identity: selection.journey,
          authority: projectExecutionAuthority(
            selection,
            authority,
            authority.usage.steps.flatMap(({ nodeIds }) => nodeIds),
            'complete-usage',
          ),
        },
      } as const;
      const overflow = classifyAgentContextJourneyOverflow(semanticResult);
      if (overflow === undefined) {
        fail(`${path}.reason`, 'does not match the recomputed journey outcome.');
      }
      assertSame(result.reason, overflow, `${path}.reason`);
    }
    return result;
  }
  const scenarioContract = findOwner(
    dataset.formContracts,
    selection.owners.scenarioArtifact,
    `${path}.selection.owners.scenarioArtifact`,
  ).artifact;
  const contractNodeById = new Map(
    collectFormContractNodes(scenarioContract.nodes).map(
      (node) => [node.id, node] as const,
    ),
  );
  if (result.operation === 'get-form-context') {
    if (result.view === 'summary') {
      assertSame(
        result.summary,
        projectContextSummary(selection, scenarioContract, authority),
        `${path}.summary`,
      );
      const stepById = new Map(
        authority.usage.steps.map((step) => [step.id, step] as const),
      );
      for (const [index, step] of result.steps.entries()) {
        const ownerStep = stepById.get(step.id);
        if (
          ownerStep === undefined ||
          !sameJson(step, {
            id: ownerStep.id,
            ordinal: ownerStep.ordinal,
            nodeCount: ownerStep.nodeIds.length,
            actionIds: ownerStep.actionIds,
          })
        ) {
          fail(`${path}.steps[${index}]`, 'does not match the authority owner.');
        }
      }
      return result;
    }
    if (result.view === 'diagnostics') {
      for (const [index, evidence] of result.evidence.entries()) {
        const owner = findOwner(
          dataset.formContracts,
          evidence.owner,
          `${path}.evidence[${index}].owner`,
        ).artifact;
        const exact =
          evidence.kind === 'contract-diagnostic'
            ? owner.diagnostics.some((diagnostic) =>
                sameJson(diagnostic, evidence.diagnostic),
              )
            : owner.effectAnalysis !== undefined &&
              sameJson(owner.effectAnalysis, evidence.analysis);
        if (!exact) {
          fail(
            `${path}.evidence[${index}]`,
            'does not match raw diagnostic owner evidence.',
          );
        }
      }
      return result;
    }
    assertSame(
      result.journey.authority,
      projectExecutionAuthority(
        selection,
        authority,
        authority.usage.steps.flatMap(({ nodeIds }) => nodeIds),
        'complete-usage',
      ),
      `${path}.journey.authority`,
    );
    return result;
  }
  if (result.operation === 'find-form-nodes') {
    if (result.status === 'not-found') return result;
    for (const [index, candidate] of result.candidates.entries()) {
      validateNodeProjectionAgainstOwners(
        contractNodeById,
        scenarioContract,
        authority,
        candidate,
        `${path}.candidates[${index}]`,
      );
    }
    assertSame(
      result.authority,
      projectExecutionAuthority(
        selection,
        authority,
        result.candidates.map(({ nodeId }) => nodeId),
      ),
      `${path}.authority`,
    );
    return result;
  }
  return result;
}

export function validateAgentContextQueryResult(
  datasetInput: unknown,
  resultInput: unknown,
): AgentContextQueryResult {
  return validateAgentContextQueryResultAgainstParsedDataset(
    parseAgentContextQueryDataset(datasetInput),
    resultInput,
  );
}

export function canonicalizeAgentContextQueryResult(input: unknown): string {
  return canonicalStringify(parseAgentContextQueryResult(input));
}

export type AgentContextLiveOwnerRole =
  | 'artifact-set'
  | 'workspace-index'
  | 'source-usage-catalog'
  | 'source-usage-catalog-set'
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
      readonly role: 'source-usage-catalog-set';
      readonly references: readonly AgentContextArtifactReference[];
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
  'source-usage-catalog-set',
  'journey-catalog',
  'form-contract',
  'scenario-artifact',
  'execution-authority',
];

const PINNED_SELECTION_LIVE_OWNER_ROLES: readonly AgentContextLiveOwnerRole[] =
  LIVE_OWNER_ROLES.filter(
    (role) => role !== 'source-usage-catalog-set',
  );

const REQUIRED_FRESHNESS_ROLES: Readonly<
  Record<AgentContextFreshnessView, readonly AgentContextLiveOwnerRole[]>
> = {
  'usage-search': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog-set',
  ],
  'context-summary': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog',
    'journey-catalog',
    'form-contract',
    'scenario-artifact',
    'execution-authority',
  ],
  'context-diagnostics': PINNED_SELECTION_LIVE_OWNER_ROLES,
  'context-journey': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog',
    'journey-catalog',
    'execution-authority',
  ],
  'node-search': [
    'artifact-set',
    'workspace-index',
    'source-usage-catalog',
    'form-contract',
    'scenario-artifact',
    'execution-authority',
  ],
  'e2e-slice': PINNED_SELECTION_LIVE_OWNER_ROLES,
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
    new Set([
      'role',
      'reference',
      'references',
      'identity',
      'scenario',
      'executionAuthority',
    ]),
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
  if (role === 'source-usage-catalog-set') {
    const value = record(input, path, new Set(['role', 'references']));
    const references = array(
      required(value, 'references', path),
      `${path}.references`,
    ).map((reference, index) =>
      parseTypedArtifactReference(
        reference,
        `${path}.references[${index}]`,
        AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
        AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
      ),
    );
    if (references.length === 0) {
      fail(`${path}.references`, 'must contain at least one owner.');
    }
    assertCanonicalSet(
      references,
      `${path}.references`,
      referenceKey,
      compareReference,
    );
    return { role, references };
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

export function createAgentContextUsageSearchScopeLiveOwners(
  scopeInput: unknown,
): readonly AgentContextLiveOwnerReference[] {
  const scope = parseAgentContextUsageSearchScope(scopeInput);
  return [
    { role: 'artifact-set', reference: scope.artifactSet },
    { role: 'workspace-index', reference: scope.workspaceIndex },
    {
      role: 'source-usage-catalog-set',
      references: scope.sourceUsageCatalogs,
    },
  ];
}

type SelectionFreshnessView = Exclude<
  AgentContextFreshnessView,
  'usage-search'
>;

export type AgentContextQueryFreshnessInput =
  | {
      readonly view: 'usage-search';
      readonly scope: unknown;
      readonly live: unknown;
    }
  | {
      readonly view: SelectionFreshnessView;
      readonly selection: unknown;
      readonly live: unknown;
    };

export function evaluateAgentContextQueryFreshness(
  input: AgentContextQueryFreshnessInput,
): AgentContextFreshness {
  const path = 'agentContextFreshness';
  const detached = cloneValidatedDataOnly(input, path);
  const union = record(
    detached,
    path,
    new Set(['view', 'scope', 'selection', 'live']),
  );
  const view = enumValue(required(union, 'view', path), `${path}.view`, [
    'usage-search',
    'context-summary',
    'context-diagnostics',
    'context-journey',
    'node-search',
    'e2e-slice',
  ] as const);
  const value = record(
    detached,
    path,
    view === 'usage-search'
      ? new Set(['view', 'scope', 'live'])
      : new Set(['view', 'selection', 'live']),
  );
  const expectedOwners =
    view === 'usage-search'
      ? createAgentContextUsageSearchScopeLiveOwners(
          required(value, 'scope', path),
        )
      : createAgentContextPinnedLiveOwners(
          required(value, 'selection', path),
        );
  const live = parseAgentContextLiveOwnerState(required(value, 'live', path));
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
