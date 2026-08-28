import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

import {
  canonicalStringify,
  parseArrayIndexProperty,
} from './canonical-json.js';
import type {
  AgentContextWorkspaceIndexReference,
  Sha256Digest,
} from './agent-context-artifacts.js';

export const AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID =
  'agent-context.source-usage' as const;
export const AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION = '0.1.0' as const;
export const AGENT_CONTEXT_JOURNEY_SCHEMA_ID = 'agent-context.journey' as const;
export const AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION = '0.1.0' as const;

export type AgentContextSourceProgramPurpose =
  | 'application'
  | 'library'
  | 'test'
  | 'tooling'
  | 'other';

export interface AgentContextSourceUsageScope {
  readonly projectIds: readonly string[];
  readonly includedPurposes: readonly AgentContextSourceProgramPurpose[];
  readonly excludedPurposes: readonly AgentContextSourceProgramPurpose[];
}

export type AgentContextSourceUsageCoverage =
  | {
      readonly status: 'complete';
      readonly scope: AgentContextSourceUsageScope;
      readonly evidenceRefs: readonly string[];
    }
  | {
      readonly status: 'incomplete';
      readonly scope: AgentContextSourceUsageScope;
      readonly reasons: readonly string[];
      readonly evidenceRefs: readonly string[];
    };

export type AgentContextUsageReference =
  | {
      readonly kind: 'declared';
      readonly usageId: string;
      readonly version: number;
    }
  | {
      readonly kind: 'callsite';
      readonly projectId: string;
      readonly callsiteKey: string;
    };

export interface AgentContextSourcePosition {
  readonly line: number;
  readonly column: number;
}

export interface AgentContextSourceSpan {
  readonly start: AgentContextSourcePosition;
  readonly end: AgentContextSourcePosition;
}

export type AgentContextSourceLocation =
  | {
      readonly kind: 'path';
      readonly pathMode: 'workspace-relative' | 'project-relative';
      readonly path: string;
      readonly span: AgentContextSourceSpan;
    }
  | {
      readonly kind: 'module';
      readonly moduleId: string;
      readonly exportName?: string;
    }
  | {
      readonly kind: 'opaque';
      readonly fileId: string;
    };

export type AgentContextSourceSymbolKind =
  | 'function'
  | 'class'
  | 'callable-const'
  | 'method'
  | 'property'
  | 'component'
  | 'other';

export interface AgentContextSourceSymbolReference {
  readonly id: string;
  readonly kind: AgentContextSourceSymbolKind;
}

export interface AgentContextSourceInvocation {
  readonly location: AgentContextSourceLocation;
  readonly symbol: AgentContextSourceSymbolReference;
  readonly syntaxKind: 'call' | 'construct';
  readonly syntaxToken: AgentContextInvocationSyntaxToken;
  readonly sourceFileHash: Sha256Digest;
}

export interface AgentContextInvocationSyntaxToken {
  readonly kind: 'ast-call-shape';
  readonly version: 1;
  readonly calleeForm: 'identifier' | 'property-access' | 'element-access';
  readonly argumentCount: number;
  readonly typeArgumentCount: number;
  readonly optionalCall: boolean;
}

export interface AgentContextFormReference {
  readonly projectId: string;
  readonly formId: string;
  readonly contractHash: Sha256Digest;
}

export interface AgentContextRootAnchorReference {
  readonly projectId: string;
  readonly rootAnchorId: string;
}

export interface AgentContextFormRootCandidate {
  readonly root: AgentContextRootAnchorReference;
  readonly form: AgentContextFormReference;
  readonly evidenceRefs: readonly string[];
}

export type AgentContextUsageResolution =
  | {
      readonly status: 'exact';
      readonly candidate: AgentContextFormRootCandidate;
    }
  | {
      readonly status: 'ambiguous';
      readonly candidates: readonly AgentContextFormRootCandidate[];
    }
  | {
      readonly status: 'unresolved';
      readonly reasons: readonly string[];
    };

export interface AgentContextUsageContextClaim {
  readonly kind: 'component' | 'route' | 'catalog';
  readonly id: string;
  readonly evidenceRefs: readonly string[];
}

export interface AgentContextSourceUsage {
  readonly identity: AgentContextUsageReference;
  readonly projectId: string;
  readonly invocation: AgentContextSourceInvocation;
  readonly resolution: AgentContextUsageResolution;
  readonly contexts: readonly AgentContextUsageContextClaim[];
  readonly evidenceRefs: readonly string[];
}

export interface AgentContextSourceUsageCatalogDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly coverage: AgentContextSourceUsageCoverage;
  readonly usages: readonly AgentContextSourceUsage[];
}

export interface AgentContextSourceUsageCatalog
  extends AgentContextSourceUsageCatalogDraft {
  readonly contentHash: Sha256Digest;
}

export interface AgentContextJourneyEntry {
  readonly id: string;
  readonly usage: AgentContextUsageReference;
  readonly landingStepId: string;
  readonly evidenceRefs: readonly string[];
}

export interface AgentContextJourneyStep {
  readonly id: string;
  readonly ordinal: number;
  readonly label?: string;
  readonly forms: readonly AgentContextFormReference[];
  readonly usages: readonly AgentContextUsageReference[];
  readonly actionIds: readonly string[];
}

export interface AgentContextJourneyAction {
  readonly id: string;
  readonly kind: 'next' | 'submit' | 'cancel' | 'other';
  readonly outcomeIds: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface AgentContextJourneyOutcome {
  readonly id: string;
  readonly kind: 'remains-on-step' | 'step-changed' | 'navigation' | 'message';
  readonly evidenceRefs: readonly string[];
}

export interface AgentContextJourneyTransition {
  readonly id: string;
  readonly version: number;
  readonly fromStepId: string;
  readonly actionId: string;
  readonly outcomeId: string;
  readonly toStepId: string;
  readonly evidenceRefs: readonly string[];
}

export interface AgentContextJourney {
  readonly id: string;
  readonly version: number;
  readonly entry: AgentContextJourneyEntry;
  readonly steps: readonly AgentContextJourneyStep[];
  readonly actions: readonly AgentContextJourneyAction[];
  readonly outcomes: readonly AgentContextJourneyOutcome[];
  readonly transitions: readonly AgentContextJourneyTransition[];
  readonly evidenceRefs: readonly string[];
}

export interface AgentContextJourneyCatalogDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly journeys: readonly AgentContextJourney[];
}

export interface AgentContextJourneyCatalog
  extends AgentContextJourneyCatalogDraft {
  readonly contentHash: Sha256Digest;
}

type DataRecord = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const AGENT_CONTEXT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const WORKSPACE_STABLE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/u;
const FORM_CONTRACT_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const GLOB_META_PATTERN = /[*?[\]{}]/u;
const PACKAGE_SEGMENT_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const MAX_ID_LENGTH = 256;
const MAX_LABEL_LENGTH = 256;
const MAX_MODULE_ID_LENGTH = 512;
const MAX_PATH_LENGTH = 1_024;
const MAX_COLLECTION_SIZE = 10_000;
const MAX_INVOCATION_ARITY = 1_024;
const MAX_DATA_GRAPH_DEPTH = 128;
const MAX_DATA_GRAPH_NODES = 100_000;

const SOURCE_PROGRAM_PURPOSES: readonly AgentContextSourceProgramPurpose[] = [
  'application',
  'library',
  'other',
  'test',
  'tooling',
];
const SOURCE_SYMBOL_KINDS: readonly AgentContextSourceSymbolKind[] = [
  'callable-const',
  'class',
  'component',
  'function',
  'method',
  'other',
  'property',
];
const CONTEXT_KINDS = ['catalog', 'component', 'route'] as const;
const ACTION_KINDS = ['cancel', 'next', 'other', 'submit'] as const;
const OUTCOME_KINDS = [
  'message',
  'navigation',
  'remains-on-step',
  'step-changed',
] as const;

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
  | {
      readonly kind: 'leave';
      readonly input: object;
    };

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
    if (inputType !== 'object' || frame.input === null) {
      continue;
    }

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
      if (isArray && key === 'length') {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(objectInput, key);
      if (descriptor === undefined || !('value' in descriptor)) {
        continue;
      }

      const childPath = isArray
        ? `${frame.path}[${key}]`
        : `${frame.path}.${key}`;
      const childDepth = frame.depth + 1;
      if (childDepth > MAX_DATA_GRAPH_DEPTH) {
        fail(
          childPath,
          `must not exceed the maximum data graph depth of ${MAX_DATA_GRAPH_DEPTH}.`
        );
      }
      scheduledNodeCount += 1;
      if (scheduledNodeCount > MAX_DATA_GRAPH_NODES) {
        fail(
          childPath,
          `must not exceed the maximum data graph node count of ${MAX_DATA_GRAPH_NODES}.`
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
  ancestors = new Set<object>()
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
  if (ancestors.has(objectInput)) {
    fail(path, 'must not contain a cycle.');
  }

  const isArray = Array.isArray(objectInput);
  const prototype = Object.getPrototypeOf(objectInput) as unknown;
  if (isArray) {
    if (prototype !== Array.prototype) {
      fail(path, 'must be an ordinary array.');
    }
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
        if (key === 'length') {
          continue;
        }
        const index = parseArrayIndexProperty(key, length);
        if (index === undefined) {
          fail(`${path}.${key}`, 'is not a supported array property.');
        }
        const itemPath = `${path}[${index}]`;
        if (!descriptor.enumerable) {
          fail(itemPath, 'must be enumerable.');
        }
        if (!('value' in descriptor)) {
          fail(itemPath, 'must be a data property.');
        }
        indexedDescriptors.push([index, descriptor]);
      }

      indexedDescriptors.sort(([left], [right]) => left - right);
      if (indexedDescriptors.length !== length) {
        let missingIndex = 0;
        for (const [index] of indexedDescriptors) {
          if (index !== missingIndex) {
            break;
          }
          missingIndex += 1;
        }
        fail(`${path}[${missingIndex}]`, 'must not be sparse.');
      }
      return indexedDescriptors.map(([index, descriptor]) =>
        cloneDataOnly(descriptor.value, `${path}[${index}]`, ancestors)
      );
    }

    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      const propertyPath = `${path}.${key}`;
      if (!descriptor.enumerable) {
        fail(propertyPath, 'must be enumerable.');
      }
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
      'must round-trip through structured clone as identical plain JSON data.'
    );
  }
  return detached;
}

function record(
  input: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>
): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      fail(`${path}.${key}`, 'is not supported.');
    }
  }
  return input as DataRecord;
}

function required(value: DataRecord, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) {
    fail(`${path}.${key}`, 'is required.');
  }
  return value[key];
}

function optional(value: DataRecord, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function agentContextId(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length > MAX_ID_LENGTH ||
    !AGENT_CONTEXT_ID_PATTERN.test(input)
  ) {
    fail(path, 'must be a 1-256 character agent-context identifier.');
  }
  return input;
}

function workspaceProjectId(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length > MAX_ID_LENGTH ||
    !WORKSPACE_STABLE_ID_PATTERN.test(input) ||
    input
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(path, 'must be a 1-256 character lowercase workspace stable ID.');
  }
  return input;
}

function formContractIdentifier(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length > MAX_ID_LENGTH ||
    !FORM_CONTRACT_IDENTIFIER_PATTERN.test(input)
  ) {
    fail(path, 'must be a 1-256 character Form Contract stable identifier.');
  }
  return input;
}

function sha256(input: unknown, path: string): Sha256Digest {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a lowercase sha256 digest.');
  }
  return input as Sha256Digest;
}

function positiveVersion(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) <= 0) {
    fail(path, 'must be a positive safe integer.');
  }
  return Number(input);
}

function nonNegativeInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) < 0) {
    fail(path, 'must be a non-negative safe integer.');
  }
  const value = Number(input);
  return Object.is(value, -0) ? 0 : value;
}

function boundedNonNegativeInteger(
  input: unknown,
  path: string,
  maximum: number
): number {
  const value = nonNegativeInteger(input, path);
  if (value > maximum) {
    fail(path, `must be at most ${maximum}.`);
  }
  return value;
}

function booleanValue(input: unknown, path: string): boolean {
  if (typeof input !== 'boolean') {
    fail(path, 'must be a boolean.');
  }
  return input;
}

function positiveInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) <= 0) {
    fail(path, 'must be a positive safe integer.');
  }
  return Number(input);
}

function enumValue<Values extends readonly string[]>(
  input: unknown,
  path: string,
  values: Values
): Values[number] {
  if (typeof input !== 'string' || !values.includes(input)) {
    fail(path, `must be one of ${values.join(', ')}.`);
  }
  return input;
}

function boundedText(input: unknown, path: string, maximum: number): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > maximum ||
    input.trim() !== input ||
    CONTROL_CHARACTER_PATTERN.test(input)
  ) {
    fail(path, `must be bounded printable text of 1-${maximum} characters.`);
  }
  return input;
}

function array(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  if (input.length > MAX_COLLECTION_SIZE) {
    fail(path, `must contain at most ${MAX_COLLECTION_SIZE} entries.`);
  }
  return input;
}

function assertCanonicalOrder<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
  path: string
): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      compare(previous, current) > 0
    ) {
      fail(path, 'must be in canonical order.');
    }
  }
}

function canonicalSet<T>(
  values: readonly T[],
  key: (value: T) => string,
  compare: (left: T, right: T) => number,
  path: string,
  requireCanonicalOrder: boolean,
  duplicateLabel: string
): readonly T[] {
  const identities = new Set<string>();
  for (const [index, value] of values.entries()) {
    const identity = key(value);
    if (identities.has(identity)) {
      fail(`${path}[${index}]`, `is a duplicate ${duplicateLabel}.`);
    }
    identities.add(identity);
  }
  if (requireCanonicalOrder) {
    assertCanonicalOrder(values, compare, path);
    return values;
  }
  return [...values].sort(compare);
}

function parseIdSet(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
  minimum = 0
): readonly string[] {
  const values = array(input, path).map((value, index) =>
    agentContextId(value, `${path}[${index}]`)
  );
  if (values.length < minimum) {
    fail(
      path,
      `must contain at least ${minimum === 1 ? 'one' : minimum} entry.`
    );
  }
  return canonicalSet(
    values,
    (value) => value,
    compareText,
    path,
    requireCanonicalOrder,
    'an exact identifier'
  );
}

function parseWorkspaceProjectIdSet(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly string[] {
  const values = array(input, path).map((value, index) =>
    workspaceProjectId(value, `${path}[${index}]`)
  );
  if (values.length === 0) {
    fail(path, 'must contain at least one entry.');
  }
  return canonicalSet(
    values,
    (value) => value,
    compareText,
    path,
    requireCanonicalOrder,
    'workspace project ID'
  );
}

function parseWorkspaceIndexReference(
  input: unknown,
  path: string
): AgentContextWorkspaceIndexReference {
  const value = record(input, path, new Set(['schemaVersion', 'contentHash']));
  const schemaVersion = boundedText(
    required(value, 'schemaVersion', path),
    `${path}.schemaVersion`,
    64
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._+-]*$/u.test(schemaVersion)) {
    fail(`${path}.schemaVersion`, 'must be a stable ASCII version string.');
  }
  return {
    schemaVersion,
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`
    ),
  };
}

function computeHash(input: unknown): Sha256Digest {
  return `sha256:${createHash('sha256')
    .update(canonicalStringify(input))
    .digest('hex')}`;
}

function parseEvidenceRefs(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
  minimum = 0
): readonly string[] {
  return parseIdSet(input, path, requireCanonicalOrder, minimum);
}

function compareUsageReferences(
  left: AgentContextUsageReference,
  right: AgentContextUsageReference
): number {
  if (left.kind === 'declared' && right.kind === 'declared') {
    return (
      compareText(left.usageId, right.usageId) || left.version - right.version
    );
  }
  if (left.kind === 'callsite' && right.kind === 'callsite') {
    return (
      compareText(left.projectId, right.projectId) ||
      compareText(left.callsiteKey, right.callsiteKey)
    );
  }
  return compareText(left.kind, right.kind);
}

function usageReferenceKey(reference: AgentContextUsageReference): string {
  return reference.kind === 'declared'
    ? `declared\0${reference.usageId}\0${reference.version}`
    : `callsite\0${reference.projectId}\0${reference.callsiteKey}`;
}

function parseUsageReference(
  input: unknown,
  path: string
): AgentContextUsageReference {
  const discriminated = record(
    input,
    path,
    new Set(['kind', 'usageId', 'version', 'projectId', 'callsiteKey'])
  );
  const kind = required(discriminated, 'kind', path);
  if (kind === 'declared') {
    const value = record(input, path, new Set(['kind', 'usageId', 'version']));
    return {
      kind,
      usageId: agentContextId(
        required(value, 'usageId', path),
        `${path}.usageId`
      ),
      version: positiveVersion(
        required(value, 'version', path),
        `${path}.version`
      ),
    };
  }
  if (kind === 'callsite') {
    const value = record(
      input,
      path,
      new Set(['kind', 'projectId', 'callsiteKey'])
    );
    return {
      kind,
      projectId: workspaceProjectId(
        required(value, 'projectId', path),
        `${path}.projectId`
      ),
      callsiteKey: agentContextId(
        required(value, 'callsiteKey', path),
        `${path}.callsiteKey`
      ),
    };
  }
  fail(`${path}.kind`, 'must be declared or callsite.');
}

function parseUsageReferenceSet(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly AgentContextUsageReference[] {
  const references = array(input, path).map((entry, index) =>
    parseUsageReference(entry, `${path}[${index}]`)
  );
  return canonicalSet(
    references,
    usageReferenceKey,
    compareUsageReferences,
    path,
    requireCanonicalOrder,
    'usage reference'
  );
}

function parseSourcePosition(
  input: unknown,
  path: string
): AgentContextSourcePosition {
  const value = record(input, path, new Set(['line', 'column']));
  return {
    line: positiveInteger(required(value, 'line', path), `${path}.line`),
    column: positiveInteger(required(value, 'column', path), `${path}.column`),
  };
}

function compareSourcePositions(
  left: AgentContextSourcePosition,
  right: AgentContextSourcePosition
): number {
  return left.line - right.line || left.column - right.column;
}

function parseSourceSpan(input: unknown, path: string): AgentContextSourceSpan {
  const value = record(input, path, new Set(['start', 'end']));
  const start = parseSourcePosition(
    required(value, 'start', path),
    `${path}.start`
  );
  const end = parseSourcePosition(required(value, 'end', path), `${path}.end`);
  if (compareSourcePositions(end, start) < 0) {
    fail(`${path}.end`, 'must not be before span start.');
  }
  return { start, end };
}

function relativeSourcePath(input: unknown, path: string): string {
  const value = boundedText(input, path, MAX_PATH_LENGTH);
  const segments = value.split('/');
  if (
    value.startsWith('/') ||
    URI_SCHEME_PATTERN.test(value) ||
    GLOB_META_PATTERN.test(value) ||
    value.includes('\\') ||
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..'
    )
  ) {
    fail(path, 'must be a literal relative POSIX path.');
  }
  return value;
}

function packageModuleSpecifier(input: unknown, path: string): string {
  const value = boundedText(input, path, MAX_MODULE_ID_LENGTH);
  if (
    URI_SCHEME_PATTERN.test(value) ||
    GLOB_META_PATTERN.test(value) ||
    value.includes('\\')
  ) {
    fail(path, 'must be a bare lowercase package module specifier.');
  }
  const segments = value.split('/');
  const valid = value.startsWith('@')
    ? segments.length >= 2 &&
      PACKAGE_SEGMENT_PATTERN.test(segments[0]?.slice(1) ?? '') &&
      segments
        .slice(1)
        .every((segment) => PACKAGE_SEGMENT_PATTERN.test(segment))
    : segments.every((segment) => PACKAGE_SEGMENT_PATTERN.test(segment));
  if (!valid) {
    fail(path, 'must be a bare lowercase package module specifier.');
  }
  return value;
}

function parseSourceLocation(
  input: unknown,
  path: string
): AgentContextSourceLocation {
  const discriminated = record(
    input,
    path,
    new Set([
      'kind',
      'pathMode',
      'path',
      'span',
      'moduleId',
      'exportName',
      'fileId',
    ])
  );
  const kind = required(discriminated, 'kind', path);
  if (kind === 'path') {
    const value = record(
      input,
      path,
      new Set(['kind', 'pathMode', 'path', 'span'])
    );
    return {
      kind,
      pathMode: enumValue(
        required(value, 'pathMode', path),
        `${path}.pathMode`,
        ['project-relative', 'workspace-relative'] as const
      ),
      path: relativeSourcePath(required(value, 'path', path), `${path}.path`),
      span: parseSourceSpan(required(value, 'span', path), `${path}.span`),
    };
  }
  if (kind === 'module') {
    const value = record(
      input,
      path,
      new Set(['kind', 'moduleId', 'exportName'])
    );
    const exportNameInput = optional(value, 'exportName');
    const location: AgentContextSourceLocation = {
      kind,
      moduleId: packageModuleSpecifier(
        required(value, 'moduleId', path),
        `${path}.moduleId`
      ),
    };
    return exportNameInput === undefined
      ? location
      : {
          ...location,
          exportName: agentContextId(exportNameInput, `${path}.exportName`),
        };
  }
  if (kind === 'opaque') {
    const value = record(input, path, new Set(['kind', 'fileId']));
    return {
      kind,
      fileId: agentContextId(required(value, 'fileId', path), `${path}.fileId`),
    };
  }
  fail(`${path}.kind`, 'must be path, module, or opaque.');
}

function parseSourceSymbolReference(
  input: unknown,
  path: string
): AgentContextSourceSymbolReference {
  const value = record(input, path, new Set(['id', 'kind']));
  return {
    id: agentContextId(required(value, 'id', path), `${path}.id`),
    kind: enumValue(
      required(value, 'kind', path),
      `${path}.kind`,
      SOURCE_SYMBOL_KINDS
    ),
  };
}

function parseInvocationSyntaxToken(
  input: unknown,
  path: string
): AgentContextInvocationSyntaxToken {
  const value = record(
    input,
    path,
    new Set([
      'kind',
      'version',
      'calleeForm',
      'argumentCount',
      'typeArgumentCount',
      'optionalCall',
    ])
  );
  if (required(value, 'kind', path) !== 'ast-call-shape') {
    fail(`${path}.kind`, 'must be ast-call-shape.');
  }
  if (required(value, 'version', path) !== 1) {
    fail(`${path}.version`, 'must be 1.');
  }
  return {
    kind: 'ast-call-shape',
    version: 1,
    calleeForm: enumValue(
      required(value, 'calleeForm', path),
      `${path}.calleeForm`,
      ['element-access', 'identifier', 'property-access'] as const
    ),
    argumentCount: boundedNonNegativeInteger(
      required(value, 'argumentCount', path),
      `${path}.argumentCount`,
      MAX_INVOCATION_ARITY
    ),
    typeArgumentCount: boundedNonNegativeInteger(
      required(value, 'typeArgumentCount', path),
      `${path}.typeArgumentCount`,
      MAX_INVOCATION_ARITY
    ),
    optionalCall: booleanValue(
      required(value, 'optionalCall', path),
      `${path}.optionalCall`
    ),
  };
}

function parseSourceInvocation(
  input: unknown,
  path: string
): AgentContextSourceInvocation {
  const value = record(
    input,
    path,
    new Set([
      'location',
      'symbol',
      'syntaxKind',
      'syntaxToken',
      'sourceFileHash',
    ])
  );
  const syntaxKind = enumValue(
    required(value, 'syntaxKind', path),
    `${path}.syntaxKind`,
    ['call', 'construct'] as const
  );
  const syntaxToken = parseInvocationSyntaxToken(
    required(value, 'syntaxToken', path),
    `${path}.syntaxToken`
  );
  if (syntaxKind === 'construct' && syntaxToken.optionalCall) {
    fail(
      `${path}.syntaxToken.optionalCall`,
      'must be false for construct syntax.'
    );
  }
  return {
    location: parseSourceLocation(
      required(value, 'location', path),
      `${path}.location`
    ),
    symbol: parseSourceSymbolReference(
      required(value, 'symbol', path),
      `${path}.symbol`
    ),
    syntaxKind,
    syntaxToken,
    sourceFileHash: sha256(
      required(value, 'sourceFileHash', path),
      `${path}.sourceFileHash`
    ),
  };
}

function parseFormReference(
  input: unknown,
  path: string
): AgentContextFormReference {
  const value = record(
    input,
    path,
    new Set(['projectId', 'formId', 'contractHash'])
  );
  return {
    projectId: workspaceProjectId(
      required(value, 'projectId', path),
      `${path}.projectId`
    ),
    formId: formContractIdentifier(
      required(value, 'formId', path),
      `${path}.formId`
    ),
    contractHash: sha256(
      required(value, 'contractHash', path),
      `${path}.contractHash`
    ),
  };
}

function formReferenceKey(reference: AgentContextFormReference): string {
  return `${reference.projectId}\0${reference.formId}\0${reference.contractHash}`;
}

function logicalFormReferenceKey(reference: AgentContextFormReference): string {
  return `${reference.projectId}\0${reference.formId}`;
}

function compareFormReferences(
  left: AgentContextFormReference,
  right: AgentContextFormReference
): number {
  return compareText(formReferenceKey(left), formReferenceKey(right));
}

function parseRootAnchorReference(
  input: unknown,
  path: string
): AgentContextRootAnchorReference {
  const value = record(input, path, new Set(['projectId', 'rootAnchorId']));
  return {
    projectId: workspaceProjectId(
      required(value, 'projectId', path),
      `${path}.projectId`
    ),
    rootAnchorId: agentContextId(
      required(value, 'rootAnchorId', path),
      `${path}.rootAnchorId`
    ),
  };
}

function formRootCandidateKey(
  candidate: AgentContextFormRootCandidate
): string {
  return [
    candidate.form.projectId,
    candidate.form.formId,
    candidate.form.contractHash,
    candidate.root.projectId,
    candidate.root.rootAnchorId,
  ].join('\0');
}

function compareFormRootCandidates(
  left: AgentContextFormRootCandidate,
  right: AgentContextFormRootCandidate
): number {
  return compareText(formRootCandidateKey(left), formRootCandidateKey(right));
}

function parseFormRootCandidate(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextFormRootCandidate {
  const value = record(input, path, new Set(['root', 'form', 'evidenceRefs']));
  const root = parseRootAnchorReference(
    required(value, 'root', path),
    `${path}.root`
  );
  const form = parseFormReference(
    required(value, 'form', path),
    `${path}.form`
  );
  if (root.projectId !== form.projectId) {
    fail(`${path}.root.projectId`, 'must equal candidate form.projectId.');
  }
  return {
    root,
    form,
    evidenceRefs: parseEvidenceRefs(
      required(value, 'evidenceRefs', path),
      `${path}.evidenceRefs`,
      requireCanonicalOrder,
      1
    ),
  };
}

function parseUsageResolution(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextUsageResolution {
  const discriminated = record(
    input,
    path,
    new Set(['status', 'candidate', 'candidates', 'reasons'])
  );
  const status = required(discriminated, 'status', path);
  if (status === 'exact') {
    const value = record(input, path, new Set(['status', 'candidate']));
    return {
      status,
      candidate: parseFormRootCandidate(
        required(value, 'candidate', path),
        `${path}.candidate`,
        requireCanonicalOrder
      ),
    };
  }
  if (status === 'ambiguous') {
    const value = record(input, path, new Set(['status', 'candidates']));
    const candidates = array(
      required(value, 'candidates', path),
      `${path}.candidates`
    ).map((candidate, index) =>
      parseFormRootCandidate(
        candidate,
        `${path}.candidates[${index}]`,
        requireCanonicalOrder
      )
    );
    if (candidates.length < 2) {
      fail(`${path}.candidates`, 'must contain at least two candidates.');
    }
    return {
      status,
      candidates: canonicalSet(
        candidates,
        formRootCandidateKey,
        compareFormRootCandidates,
        `${path}.candidates`,
        requireCanonicalOrder,
        'candidate'
      ),
    };
  }
  if (status === 'unresolved') {
    const value = record(input, path, new Set(['status', 'reasons']));
    return {
      status,
      reasons: parseIdSet(
        required(value, 'reasons', path),
        `${path}.reasons`,
        requireCanonicalOrder,
        1
      ),
    };
  }
  fail(`${path}.status`, 'must be exact, ambiguous, or unresolved.');
}

function contextClaimKey(claim: AgentContextUsageContextClaim): string {
  return `${claim.kind}\0${claim.id}`;
}

function compareContextClaims(
  left: AgentContextUsageContextClaim,
  right: AgentContextUsageContextClaim
): number {
  return compareText(contextClaimKey(left), contextClaimKey(right));
}

function parseUsageContextClaims(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly AgentContextUsageContextClaim[] {
  const claims = array(input, path).map((entry, index) => {
    const claimPath = `${path}[${index}]`;
    const value = record(
      entry,
      claimPath,
      new Set(['kind', 'id', 'evidenceRefs'])
    );
    return {
      kind: enumValue(
        required(value, 'kind', claimPath),
        `${claimPath}.kind`,
        CONTEXT_KINDS
      ),
      id: agentContextId(required(value, 'id', claimPath), `${claimPath}.id`),
      evidenceRefs: parseEvidenceRefs(
        required(value, 'evidenceRefs', claimPath),
        `${claimPath}.evidenceRefs`,
        requireCanonicalOrder
      ),
    };
  });
  return canonicalSet(
    claims,
    contextClaimKey,
    compareContextClaims,
    path,
    requireCanonicalOrder,
    'context'
  );
}

function parseSourceUsage(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextSourceUsage {
  const value = record(
    input,
    path,
    new Set([
      'identity',
      'projectId',
      'invocation',
      'resolution',
      'contexts',
      'evidenceRefs',
    ])
  );
  const identity = parseUsageReference(
    required(value, 'identity', path),
    `${path}.identity`
  );
  const projectId = workspaceProjectId(
    required(value, 'projectId', path),
    `${path}.projectId`
  );
  if (identity.kind === 'callsite' && identity.projectId !== projectId) {
    fail(`${path}.identity.projectId`, 'must equal source usage projectId.');
  }
  return {
    identity,
    projectId,
    invocation: parseSourceInvocation(
      required(value, 'invocation', path),
      `${path}.invocation`
    ),
    resolution: parseUsageResolution(
      required(value, 'resolution', path),
      `${path}.resolution`,
      requireCanonicalOrder
    ),
    contexts: parseUsageContextClaims(
      required(value, 'contexts', path),
      `${path}.contexts`,
      requireCanonicalOrder
    ),
    evidenceRefs: parseEvidenceRefs(
      required(value, 'evidenceRefs', path),
      `${path}.evidenceRefs`,
      requireCanonicalOrder
    ),
  };
}

function parseProgramPurposeSet(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
  minimum = 0
): readonly AgentContextSourceProgramPurpose[] {
  const purposes = array(input, path).map((entry, index) =>
    enumValue(entry, `${path}[${index}]`, SOURCE_PROGRAM_PURPOSES)
  );
  if (purposes.length < minimum) {
    fail(path, 'must contain at least one entry.');
  }
  return canonicalSet(
    purposes,
    (value) => value,
    compareText,
    path,
    requireCanonicalOrder,
    'source program purpose'
  );
}

function parseSourceUsageScope(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextSourceUsageScope {
  const value = record(
    input,
    path,
    new Set(['projectIds', 'includedPurposes', 'excludedPurposes'])
  );
  const includedPurposes = parseProgramPurposeSet(
    required(value, 'includedPurposes', path),
    `${path}.includedPurposes`,
    requireCanonicalOrder,
    1
  );
  const excludedPurposes = parseProgramPurposeSet(
    required(value, 'excludedPurposes', path),
    `${path}.excludedPurposes`,
    requireCanonicalOrder
  );
  const included = new Set(includedPurposes);
  if (excludedPurposes.some((purpose) => included.has(purpose))) {
    fail(path, 'must not list a purpose as both included and excluded.');
  }
  return {
    projectIds: parseWorkspaceProjectIdSet(
      required(value, 'projectIds', path),
      `${path}.projectIds`,
      requireCanonicalOrder
    ),
    includedPurposes,
    excludedPurposes,
  };
}

function parseSourceUsageCoverage(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextSourceUsageCoverage {
  const discriminated = record(
    input,
    path,
    new Set(['status', 'scope', 'reasons', 'evidenceRefs'])
  );
  const status = required(discriminated, 'status', path);
  if (status === 'complete') {
    const value = record(
      input,
      path,
      new Set(['status', 'scope', 'evidenceRefs'])
    );
    return {
      status,
      scope: parseSourceUsageScope(
        required(value, 'scope', path),
        `${path}.scope`,
        requireCanonicalOrder
      ),
      evidenceRefs: parseEvidenceRefs(
        required(value, 'evidenceRefs', path),
        `${path}.evidenceRefs`,
        requireCanonicalOrder
      ),
    };
  }
  if (status === 'incomplete') {
    const value = record(
      input,
      path,
      new Set(['status', 'scope', 'reasons', 'evidenceRefs'])
    );
    return {
      status,
      scope: parseSourceUsageScope(
        required(value, 'scope', path),
        `${path}.scope`,
        requireCanonicalOrder
      ),
      reasons: parseIdSet(
        required(value, 'reasons', path),
        `${path}.reasons`,
        requireCanonicalOrder,
        1
      ),
      evidenceRefs: parseEvidenceRefs(
        required(value, 'evidenceRefs', path),
        `${path}.evidenceRefs`,
        requireCanonicalOrder
      ),
    };
  }
  fail(`${path}.status`, 'must be complete or incomplete.');
}

function normalizeSourceUsageCatalog(
  input: unknown,
  requireContentHash: boolean,
  requireCanonicalOrder: boolean
): AgentContextSourceUsageCatalogDraft & {
  readonly contentHash?: Sha256Digest;
} {
  const path = 'agentContextSourceUsageCatalog';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    requireContentHash
      ? new Set([
          'schemaVersion',
          'workspaceIndex',
          'coverage',
          'usages',
          'contentHash',
        ])
      : new Set(['schemaVersion', 'workspaceIndex', 'coverage', 'usages'])
  );
  if (
    required(value, 'schemaVersion', path) !==
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION}.`
    );
  }
  const coverage = parseSourceUsageCoverage(
    required(value, 'coverage', path),
    `${path}.coverage`,
    requireCanonicalOrder
  );
  const usages = array(required(value, 'usages', path), `${path}.usages`).map(
    (usage, index) =>
      parseSourceUsage(usage, `${path}.usages[${index}]`, requireCanonicalOrder)
  );
  const normalizedUsages = canonicalSet(
    usages,
    ({ identity }) => usageReferenceKey(identity),
    (left, right) => compareUsageReferences(left.identity, right.identity),
    `${path}.usages`,
    requireCanonicalOrder,
    'usage identity'
  );
  const scopeProjects = new Set(coverage.scope.projectIds);
  for (const [index, usage] of normalizedUsages.entries()) {
    if (!scopeProjects.has(usage.projectId)) {
      fail(
        `${path}.usages[${index}].projectId`,
        'must be included in coverage.scope.projectIds.'
      );
    }
  }
  const normalized: AgentContextSourceUsageCatalogDraft = {
    schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    workspaceIndex: parseWorkspaceIndexReference(
      required(value, 'workspaceIndex', path),
      `${path}.workspaceIndex`
    ),
    coverage,
    usages: normalizedUsages,
  };
  return requireContentHash
    ? {
        ...normalized,
        contentHash: sha256(
          required(value, 'contentHash', path),
          `${path}.contentHash`
        ),
      }
    : normalized;
}

function sourceUsageDraftOf(
  input: AgentContextSourceUsageCatalogDraft
): AgentContextSourceUsageCatalogDraft {
  return {
    schemaVersion: input.schemaVersion,
    workspaceIndex: input.workspaceIndex,
    coverage: input.coverage,
    usages: input.usages,
  };
}

export function createAgentContextSourceUsageCatalog(
  draft: AgentContextSourceUsageCatalogDraft
): AgentContextSourceUsageCatalog {
  const normalized = normalizeSourceUsageCatalog(draft, false, false);
  return {
    ...normalized,
    contentHash: computeHash(sourceUsageDraftOf(normalized)),
  };
}

export function computeAgentContextSourceUsageCatalogHash(
  input: unknown
): Sha256Digest {
  const normalized = normalizeSourceUsageCatalog(input, false, false);
  return computeHash(sourceUsageDraftOf(normalized));
}

export function parseAgentContextSourceUsageCatalog(
  input: unknown
): AgentContextSourceUsageCatalog {
  const normalized = normalizeSourceUsageCatalog(input, true, true);
  const catalog = normalized as AgentContextSourceUsageCatalog;
  if (catalog.contentHash !== computeHash(sourceUsageDraftOf(catalog))) {
    fail(
      'agentContextSourceUsageCatalog.contentHash',
      'does not match artifact content.'
    );
  }
  return catalog;
}

export function canonicalizeAgentContextSourceUsageCatalog(
  input: unknown
): string {
  return canonicalStringify(parseAgentContextSourceUsageCatalog(input));
}

function parseJourneyEntry(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextJourneyEntry {
  const value = record(
    input,
    path,
    new Set(['id', 'usage', 'landingStepId', 'evidenceRefs'])
  );
  return {
    id: agentContextId(required(value, 'id', path), `${path}.id`),
    usage: parseUsageReference(required(value, 'usage', path), `${path}.usage`),
    landingStepId: agentContextId(
      required(value, 'landingStepId', path),
      `${path}.landingStepId`
    ),
    evidenceRefs: parseEvidenceRefs(
      required(value, 'evidenceRefs', path),
      `${path}.evidenceRefs`,
      requireCanonicalOrder
    ),
  };
}

function parseFormReferenceSet(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly AgentContextFormReference[] {
  const forms = array(input, path).map((entry, index) =>
    parseFormReference(entry, `${path}[${index}]`)
  );
  return canonicalSet(
    forms,
    logicalFormReferenceKey,
    compareFormReferences,
    path,
    requireCanonicalOrder,
    'logical form reference'
  );
}

function parseJourneyStep(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextJourneyStep {
  const value = record(
    input,
    path,
    new Set(['id', 'ordinal', 'label', 'forms', 'usages', 'actionIds'])
  );
  const labelInput = optional(value, 'label');
  const base = {
    id: agentContextId(required(value, 'id', path), `${path}.id`),
    ordinal: nonNegativeInteger(
      required(value, 'ordinal', path),
      `${path}.ordinal`
    ),
    forms: parseFormReferenceSet(
      required(value, 'forms', path),
      `${path}.forms`,
      requireCanonicalOrder
    ),
    usages: parseUsageReferenceSet(
      required(value, 'usages', path),
      `${path}.usages`,
      requireCanonicalOrder
    ),
    actionIds: parseIdSet(
      required(value, 'actionIds', path),
      `${path}.actionIds`,
      requireCanonicalOrder
    ),
  };
  return labelInput === undefined
    ? base
    : {
        ...base,
        label: boundedText(labelInput, `${path}.label`, MAX_LABEL_LENGTH),
      };
}

function compareJourneySteps(
  left: AgentContextJourneyStep,
  right: AgentContextJourneyStep
): number {
  return left.ordinal - right.ordinal || compareText(left.id, right.id);
}

function parseJourneySteps(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly AgentContextJourneyStep[] {
  const steps = array(input, path).map((entry, index) =>
    parseJourneyStep(entry, `${path}[${index}]`, requireCanonicalOrder)
  );
  if (steps.length === 0) {
    fail(path, 'must contain at least one step.');
  }
  const ids = new Set<string>();
  const ordinals = new Set<number>();
  for (const [index, step] of steps.entries()) {
    if (ids.has(step.id)) {
      fail(`${path}[${index}].id`, 'duplicates a step identity.');
    }
    ids.add(step.id);
    if (ordinals.has(step.ordinal)) {
      fail(`${path}[${index}].ordinal`, 'duplicates a step ordinal.');
    }
    ordinals.add(step.ordinal);
  }
  if (requireCanonicalOrder) {
    assertCanonicalOrder(steps, compareJourneySteps, path);
    return steps;
  }
  return [...steps].sort(compareJourneySteps);
}

function parseJourneyAction(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextJourneyAction {
  const value = record(
    input,
    path,
    new Set(['id', 'kind', 'outcomeIds', 'evidenceRefs'])
  );
  return {
    id: agentContextId(required(value, 'id', path), `${path}.id`),
    kind: enumValue(
      required(value, 'kind', path),
      `${path}.kind`,
      ACTION_KINDS
    ),
    outcomeIds: parseIdSet(
      required(value, 'outcomeIds', path),
      `${path}.outcomeIds`,
      requireCanonicalOrder,
      1
    ),
    evidenceRefs: parseEvidenceRefs(
      required(value, 'evidenceRefs', path),
      `${path}.evidenceRefs`,
      requireCanonicalOrder
    ),
  };
}

function parseJourneyActions(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly AgentContextJourneyAction[] {
  const actions = array(input, path).map((entry, index) =>
    parseJourneyAction(entry, `${path}[${index}]`, requireCanonicalOrder)
  );
  return canonicalSet(
    actions,
    ({ id }) => id,
    (left, right) => compareText(left.id, right.id),
    path,
    requireCanonicalOrder,
    'action identity'
  );
}

function parseJourneyOutcome(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextJourneyOutcome {
  const value = record(input, path, new Set(['id', 'kind', 'evidenceRefs']));
  return {
    id: agentContextId(required(value, 'id', path), `${path}.id`),
    kind: enumValue(
      required(value, 'kind', path),
      `${path}.kind`,
      OUTCOME_KINDS
    ),
    evidenceRefs: parseEvidenceRefs(
      required(value, 'evidenceRefs', path),
      `${path}.evidenceRefs`,
      requireCanonicalOrder
    ),
  };
}

function parseJourneyOutcomes(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly AgentContextJourneyOutcome[] {
  const outcomes = array(input, path).map((entry, index) =>
    parseJourneyOutcome(entry, `${path}[${index}]`, requireCanonicalOrder)
  );
  return canonicalSet(
    outcomes,
    ({ id }) => id,
    (left, right) => compareText(left.id, right.id),
    path,
    requireCanonicalOrder,
    'outcome identity'
  );
}

function transitionIdentityKey(
  transition: AgentContextJourneyTransition
): string {
  return `${transition.id}\0${transition.version}`;
}

function transitionTupleKey(transition: AgentContextJourneyTransition): string {
  return [
    transition.fromStepId,
    transition.actionId,
    transition.outcomeId,
    transition.toStepId,
  ].join('\0');
}

function compareJourneyTransitions(
  left: AgentContextJourneyTransition,
  right: AgentContextJourneyTransition
): number {
  return compareText(left.id, right.id) || left.version - right.version;
}

function parseJourneyTransition(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextJourneyTransition {
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
      'evidenceRefs',
    ])
  );
  return {
    id: agentContextId(required(value, 'id', path), `${path}.id`),
    version: positiveVersion(
      required(value, 'version', path),
      `${path}.version`
    ),
    fromStepId: agentContextId(
      required(value, 'fromStepId', path),
      `${path}.fromStepId`
    ),
    actionId: agentContextId(
      required(value, 'actionId', path),
      `${path}.actionId`
    ),
    outcomeId: agentContextId(
      required(value, 'outcomeId', path),
      `${path}.outcomeId`
    ),
    toStepId: agentContextId(
      required(value, 'toStepId', path),
      `${path}.toStepId`
    ),
    evidenceRefs: parseEvidenceRefs(
      required(value, 'evidenceRefs', path),
      `${path}.evidenceRefs`,
      requireCanonicalOrder
    ),
  };
}

function parseJourneyTransitions(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): readonly AgentContextJourneyTransition[] {
  const transitions = array(input, path).map((entry, index) =>
    parseJourneyTransition(entry, `${path}[${index}]`, requireCanonicalOrder)
  );
  const canonical = canonicalSet(
    transitions,
    transitionIdentityKey,
    compareJourneyTransitions,
    path,
    requireCanonicalOrder,
    'transition identity'
  );
  const tuples = new Set<string>();
  for (const [index, transition] of canonical.entries()) {
    const tuple = transitionTupleKey(transition);
    if (tuples.has(tuple)) {
      fail(`${path}[${index}]`, 'is a duplicate transition tuple.');
    }
    tuples.add(tuple);
  }
  return canonical;
}

function validateJourneyIntegrity(
  journey: AgentContextJourney,
  path: string
): void {
  const stepsById = new Map(journey.steps.map((step) => [step.id, step]));
  const actionsById = new Map(
    journey.actions.map((action) => [action.id, action])
  );
  const outcomesById = new Map(
    journey.outcomes.map((outcome) => [outcome.id, outcome])
  );
  const landingStep = stepsById.get(journey.entry.landingStepId);
  if (landingStep === undefined) {
    fail(`${path}.entry.landingStepId`, 'must reference a declared step.');
  }
  const entryUsageKey = usageReferenceKey(journey.entry.usage);
  if (
    !landingStep.usages.some(
      (reference) => usageReferenceKey(reference) === entryUsageKey
    )
  ) {
    fail(`${path}.entry.usage`, 'must be listed on the landing step.');
  }

  const actionOwners = new Map<string, string>();
  for (const [stepIndex, step] of journey.steps.entries()) {
    for (const [actionIndex, actionId] of step.actionIds.entries()) {
      const actionPath = `${path}.steps[${stepIndex}].actionIds[${actionIndex}]`;
      if (!actionsById.has(actionId)) {
        fail(actionPath, 'must reference a declared action.');
      }
      const existingOwner = actionOwners.get(actionId);
      if (existingOwner !== undefined) {
        fail(actionPath, `already belongs to step ${existingOwner}.`);
      }
      actionOwners.set(actionId, step.id);
    }
  }
  const outcomeOwners = new Map<string, string>();
  for (const [actionIndex, action] of journey.actions.entries()) {
    for (const [outcomeIndex, outcomeId] of action.outcomeIds.entries()) {
      const outcomePath = `${path}.actions[${actionIndex}].outcomeIds[${outcomeIndex}]`;
      if (!outcomesById.has(outcomeId)) {
        fail(outcomePath, 'must reference a declared outcome.');
      }
      const existingOwner = outcomeOwners.get(outcomeId);
      if (existingOwner !== undefined) {
        fail(outcomePath, `already belongs to action ${existingOwner}.`);
      }
      outcomeOwners.set(outcomeId, action.id);
    }
  }
  for (const [actionIndex, action] of journey.actions.entries()) {
    if (!actionOwners.has(action.id)) {
      fail(
        `${path}.actions[${actionIndex}].id`,
        'must belong to exactly one declared step.'
      );
    }
  }
  for (const [outcomeIndex, outcome] of journey.outcomes.entries()) {
    if (!outcomeOwners.has(outcome.id)) {
      fail(
        `${path}.outcomes[${outcomeIndex}].id`,
        'must belong to exactly one declared action.'
      );
    }
  }

  const transitionedOutcomes = new Set<string>();
  for (const [transitionIndex, transition] of journey.transitions.entries()) {
    const transitionPath = `${path}.transitions[${transitionIndex}]`;
    if (!stepsById.has(transition.fromStepId)) {
      fail(`${transitionPath}.fromStepId`, 'must reference a declared step.');
    }
    if (!stepsById.has(transition.toStepId)) {
      fail(`${transitionPath}.toStepId`, 'must reference a declared step.');
    }
    if (transition.toStepId === transition.fromStepId) {
      fail(`${transitionPath}.toStepId`, 'must differ from fromStepId.');
    }
    const action = actionsById.get(transition.actionId);
    if (action === undefined) {
      fail(`${transitionPath}.actionId`, 'must reference a declared action.');
    }
    if (actionOwners.get(action.id) !== transition.fromStepId) {
      fail(
        `${transitionPath}.actionId`,
        'must belong to the transition fromStepId.'
      );
    }
    const outcome = outcomesById.get(transition.outcomeId);
    if (outcome === undefined) {
      fail(`${transitionPath}.outcomeId`, 'must reference a declared outcome.');
    }
    if (outcomeOwners.get(outcome.id) !== action.id) {
      fail(
        `${transitionPath}.outcomeId`,
        'must belong to the transition actionId.'
      );
    }
    if (outcome.kind !== 'step-changed') {
      fail(
        `${transitionPath}.outcomeId`,
        'must reference a step-changed outcome.'
      );
    }
    if (transitionedOutcomes.has(outcome.id)) {
      fail(
        `${transitionPath}.outcomeId`,
        'must have exactly one step transition.'
      );
    }
    transitionedOutcomes.add(outcome.id);
  }
  for (const [outcomeIndex, outcome] of journey.outcomes.entries()) {
    if (
      outcome.kind === 'step-changed' &&
      !transitionedOutcomes.has(outcome.id)
    ) {
      fail(
        `${path}.outcomes[${outcomeIndex}].id`,
        'step-changed outcome must have exactly one transition.'
      );
    }
  }
}

function parseJourney(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextJourney {
  const value = record(
    input,
    path,
    new Set([
      'id',
      'version',
      'entry',
      'steps',
      'actions',
      'outcomes',
      'transitions',
      'evidenceRefs',
    ])
  );
  const parsed: AgentContextJourney = {
    id: agentContextId(required(value, 'id', path), `${path}.id`),
    version: positiveVersion(
      required(value, 'version', path),
      `${path}.version`
    ),
    entry: parseJourneyEntry(
      required(value, 'entry', path),
      `${path}.entry`,
      requireCanonicalOrder
    ),
    steps: parseJourneySteps(
      required(value, 'steps', path),
      `${path}.steps`,
      requireCanonicalOrder
    ),
    actions: parseJourneyActions(
      required(value, 'actions', path),
      `${path}.actions`,
      requireCanonicalOrder
    ),
    outcomes: parseJourneyOutcomes(
      required(value, 'outcomes', path),
      `${path}.outcomes`,
      requireCanonicalOrder
    ),
    transitions: parseJourneyTransitions(
      required(value, 'transitions', path),
      `${path}.transitions`,
      requireCanonicalOrder
    ),
    evidenceRefs: parseEvidenceRefs(
      required(value, 'evidenceRefs', path),
      `${path}.evidenceRefs`,
      requireCanonicalOrder
    ),
  };
  validateJourneyIntegrity(parsed, path);
  return parsed;
}

function journeyIdentityKey(journey: AgentContextJourney): string {
  return `${journey.id}\0${journey.version}`;
}

function compareJourneys(
  left: AgentContextJourney,
  right: AgentContextJourney
): number {
  return compareText(left.id, right.id) || left.version - right.version;
}

function normalizeJourneyCatalog(
  input: unknown,
  requireContentHash: boolean,
  requireCanonicalOrder: boolean
): AgentContextJourneyCatalogDraft & { readonly contentHash?: Sha256Digest } {
  const path = 'agentContextJourneyCatalog';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    requireContentHash
      ? new Set(['schemaVersion', 'workspaceIndex', 'journeys', 'contentHash'])
      : new Set(['schemaVersion', 'workspaceIndex', 'journeys'])
  );
  if (
    required(value, 'schemaVersion', path) !==
    AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION}.`
    );
  }
  const journeys = array(
    required(value, 'journeys', path),
    `${path}.journeys`
  ).map((entry, index) =>
    parseJourney(entry, `${path}.journeys[${index}]`, requireCanonicalOrder)
  );
  const normalized: AgentContextJourneyCatalogDraft = {
    schemaVersion: AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    workspaceIndex: parseWorkspaceIndexReference(
      required(value, 'workspaceIndex', path),
      `${path}.workspaceIndex`
    ),
    journeys: canonicalSet(
      journeys,
      journeyIdentityKey,
      compareJourneys,
      `${path}.journeys`,
      requireCanonicalOrder,
      'journey identity'
    ),
  };
  return requireContentHash
    ? {
        ...normalized,
        contentHash: sha256(
          required(value, 'contentHash', path),
          `${path}.contentHash`
        ),
      }
    : normalized;
}

function journeyDraftOf(
  input: AgentContextJourneyCatalogDraft
): AgentContextJourneyCatalogDraft {
  return {
    schemaVersion: input.schemaVersion,
    workspaceIndex: input.workspaceIndex,
    journeys: input.journeys,
  };
}

export function createAgentContextJourneyCatalog(
  draft: AgentContextJourneyCatalogDraft
): AgentContextJourneyCatalog {
  const normalized = normalizeJourneyCatalog(draft, false, false);
  return {
    ...normalized,
    contentHash: computeHash(journeyDraftOf(normalized)),
  };
}

export function computeAgentContextJourneyCatalogHash(
  input: unknown
): Sha256Digest {
  const normalized = normalizeJourneyCatalog(input, false, false);
  return computeHash(journeyDraftOf(normalized));
}

export function parseAgentContextJourneyCatalog(
  input: unknown
): AgentContextJourneyCatalog {
  const normalized = normalizeJourneyCatalog(input, true, true);
  const catalog = normalized as AgentContextJourneyCatalog;
  if (catalog.contentHash !== computeHash(journeyDraftOf(catalog))) {
    fail(
      'agentContextJourneyCatalog.contentHash',
      'does not match artifact content.'
    );
  }
  return catalog;
}

export function canonicalizeAgentContextJourneyCatalog(input: unknown): string {
  return canonicalStringify(parseAgentContextJourneyCatalog(input));
}

function sameWorkspaceIndex(
  left: AgentContextWorkspaceIndexReference,
  right: AgentContextWorkspaceIndexReference
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.contentHash === right.contentHash
  );
}

export function validateAgentContextUsageJourneyReferences(
  sourceUsageInput: unknown,
  journeyInput: unknown
): void {
  const sourceUsage = parseAgentContextSourceUsageCatalog(sourceUsageInput);
  const journeyCatalog = parseAgentContextJourneyCatalog(journeyInput);
  if (
    !sameWorkspaceIndex(
      sourceUsage.workspaceIndex,
      journeyCatalog.workspaceIndex
    )
  ) {
    fail(
      'agentContextJourneyCatalog.workspaceIndex',
      'must use the same exact basis as the source-usage catalog workspaceIndex.'
    );
  }

  const usagesByIdentity = new Map(
    sourceUsage.usages.map((usage) => [
      usageReferenceKey(usage.identity),
      usage,
    ])
  );
  for (const [journeyIndex, journey] of journeyCatalog.journeys.entries()) {
    for (const [stepIndex, step] of journey.steps.entries()) {
      for (const [usageIndex, usageReference] of step.usages.entries()) {
        const usagePath =
          `agentContextJourneyCatalog.journeys[${journeyIndex}]` +
          `.steps[${stepIndex}].usages[${usageIndex}]`;
        const usage = usagesByIdentity.get(usageReferenceKey(usageReference));
        if (usage === undefined) {
          const coverageQualification =
            sourceUsage.coverage.status === 'incomplete'
              ? ' Catalog coverage is incomplete, so absence is not an authoritative negative.'
              : '';
          fail(
            usagePath,
            `must reference a usage in the source-usage catalog.${coverageQualification}`
          );
        }
        if (usage.resolution.status !== 'exact') {
          fail(usagePath, 'usage must resolve exactly before journey linkage.');
        }
        const exactForm = usage.resolution.candidate.form;
        if (
          !step.forms.some(
            (form) => formReferenceKey(form) === formReferenceKey(exactForm)
          )
        ) {
          fail(
            `agentContextJourneyCatalog.journeys[${journeyIndex}].steps[${stepIndex}].forms`,
            'must contain the exact usage form reference.'
          );
        }
      }
    }
  }
}
