import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

import {
  canonicalStringify,
  parseArrayIndexProperty,
} from './canonical-json.js';

export const AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID =
  'agent-context.execution-authority' as const;
export const AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION =
  '0.1.0' as const;

type Sha256Digest = `sha256:${string}`;
type DataRecord = Readonly<Record<string, unknown>>;

export interface AgentContextExecutionBasis {
  readonly formId: string;
  readonly contractHash: Sha256Digest;
}

export interface AgentContextScenarioReference {
  readonly id: string;
  readonly version: number;
  readonly artifactHash: Sha256Digest;
  readonly basis: AgentContextExecutionBasis;
}

export interface AgentContextDriverReference {
  readonly kind: 'generic' | 'application';
  readonly id: string;
  readonly version: number;
}

export interface AgentContextApplicationDriverReference
  extends AgentContextDriverReference {
  readonly kind: 'application';
}

export type AgentContextInteractionTargetPurpose =
  | 'control'
  | 'trigger'
  | 'popup'
  | 'option'
  | 'row'
  | 'selection'
  | 'add'
  | 'item'
  | 'expand'
  | 'wrapper';

export interface AgentContextInteractionTarget {
  readonly purpose: AgentContextInteractionTargetPurpose;
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

export interface AgentContextPhysicalOperation {
  readonly id: string;
  readonly nodeId: string;
  readonly mechanic: 'blur' | 'click' | 'check';
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

export type AgentContextReadinessOwner =
  | {
      readonly kind: 'interaction';
      readonly interactionId: string;
    }
  | {
      readonly kind: 'repeater-capture';
      readonly repeaterCaptureId: string;
    };

export interface AgentContextReadinessAuthority {
  readonly id: string;
  readonly nodeId: string;
  readonly owner: AgentContextReadinessOwner;
  readonly operation: 'wait-readiness';
  readonly driver: AgentContextDriverReference;
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

export type AgentContextNodeInteractionOperation =
  | 'fill'
  | 'check'
  | 'select-option'
  | 'select-from-overlay'
  | 'type-and-pick'
  | 'select-row'
  | 'expand-item';

export interface AgentContextNodeInteractionAuthority {
  readonly id: string;
  readonly nodeId: string;
  readonly stepId: string;
  readonly profile: {
    readonly id: string;
    readonly version: number;
  };
  readonly driver: AgentContextDriverReference;
  readonly operation: AgentContextNodeInteractionOperation;
  readonly targets: readonly [
    AgentContextInteractionTarget,
    ...AgentContextInteractionTarget[]
  ];
  readonly readinessIds: readonly string[];
}

interface AgentContextValueCommitAuthorityBase {
  readonly id: string;
  readonly nodeId: string;
  readonly interactionId: string;
  readonly operation: 'commit-value';
}

export type AgentContextValueCommitAuthority =
  | (AgentContextValueCommitAuthorityBase & {
      readonly kind: 'node-local';
      readonly mode: 'immediate' | 'blur';
      readonly execution: 'included-in-set';
    })
  | (AgentContextValueCommitAuthorityBase & {
      readonly kind: 'node-local';
      readonly mode: 'blur';
      readonly execution: 'explicit-intent';
      readonly physicalOperationId: string;
    })
  | (AgentContextValueCommitAuthorityBase & {
      readonly kind: 'usage-action';
      readonly actionId: string;
    });

export type AgentContextValidationActivation =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'node-local';
      readonly id: string;
      readonly operation: 'activate-validation';
      readonly physicalOperationId: string;
    }
  | {
      readonly kind: 'usage-action';
      readonly id: string;
      readonly operation: 'activate-validation';
      readonly actionId: string;
    };

export interface AgentContextValidationAssertionAuthority {
  readonly id: string;
  readonly operation: 'assert-validation';
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

export interface AgentContextValidationSurfaceAuthority {
  readonly id: string;
  readonly nodeId: string;
  readonly constraintId: string;
  readonly activation: AgentContextValidationActivation;
  readonly assertion: AgentContextValidationAssertionAuthority;
}

export interface AgentContextValueAssertionAuthority {
  readonly id: string;
  readonly nodeId: string;
  readonly operation: 'assert-value';
  readonly kind: 'committed-model-value' | 'control-value';
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

export type AgentContextAssertableNodeState =
  | 'visible'
  | 'hidden'
  | 'enabled'
  | 'disabled'
  | 'valid'
  | 'invalid';

export interface AgentContextStateAssertionAuthority {
  readonly id: string;
  readonly version: number;
  readonly nodeId: string;
  readonly operation: 'assert-state';
  readonly states: readonly [
    AgentContextAssertableNodeState,
    ...AgentContextAssertableNodeState[]
  ];
  readonly driver: AgentContextDriverReference;
  readonly partRef: string;
  readonly locatorTargetRef: string;
}

export interface AgentContextUsageEntryAuthority {
  readonly id: string;
  readonly operation: 'open-usage';
  readonly landingStepId: string;
  readonly driver: AgentContextApplicationDriverReference;
}

export interface AgentContextUsageStepAuthority {
  readonly id: string;
  readonly ordinal: number;
  readonly nodeIds: readonly string[];
  readonly actionIds: readonly string[];
}

export interface AgentContextUsageActionAuthority {
  readonly id: string;
  readonly operation: 'invoke-usage-action';
  readonly kind: 'next' | 'submit' | 'cancel' | 'other';
  readonly driver: AgentContextApplicationDriverReference;
  readonly outcomeIds: readonly string[];
}

export interface AgentContextUsageOutcomeAuthority {
  readonly id: string;
  readonly operation: 'assert-outcome';
  readonly kind: 'remains-on-step' | 'step-changed' | 'navigation' | 'message';
  readonly assertionDriver: AgentContextApplicationDriverReference;
  readonly assertionTargetRef: string;
}

export interface AgentContextUsageTransitionAuthority {
  readonly id: string;
  readonly version: number;
  readonly fromStepId: string;
  readonly actionId: string;
  readonly outcomeId: string;
  readonly toStepId: string;
}

export interface AgentContextUsageExecutionAuthority {
  readonly id: string;
  readonly version: number;
  readonly basis: AgentContextExecutionBasis;
  readonly entry: AgentContextUsageEntryAuthority;
  readonly steps: readonly AgentContextUsageStepAuthority[];
  readonly actions: readonly AgentContextUsageActionAuthority[];
  readonly outcomes: readonly AgentContextUsageOutcomeAuthority[];
  readonly transitions: readonly AgentContextUsageTransitionAuthority[];
}

export interface AgentContextCreatedItemCaptureAuthority {
  readonly id: string;
  readonly version: number;
  readonly repeaterNodeId: string;
  readonly stepId: string;
  readonly profile: {
    readonly id: string;
    readonly version: number;
  };
  readonly operation: 'add-item';
  readonly guarantee: 'exactly-one-created-item';
  readonly captureMode: 'driver-returned-item-scope';
  readonly driver: AgentContextDriverReference;
  readonly addTarget: {
    readonly partRef: string;
    readonly locatorTargetRef: string;
  };
  readonly itemTarget: {
    readonly partRef: string;
    readonly locatorTargetRef: string;
  };
  readonly readinessIds: readonly string[];
}

export interface AgentContextExecutionAuthorityDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION;
  readonly basis: AgentContextExecutionBasis;
  readonly scenario: AgentContextScenarioReference;
  readonly physicalOperations: readonly AgentContextPhysicalOperation[];
  readonly readiness: readonly AgentContextReadinessAuthority[];
  readonly interactions: readonly AgentContextNodeInteractionAuthority[];
  readonly commits: readonly AgentContextValueCommitAuthority[];
  readonly validationSurfaces: readonly AgentContextValidationSurfaceAuthority[];
  readonly valueAssertions: readonly AgentContextValueAssertionAuthority[];
  readonly stateAssertions: readonly AgentContextStateAssertionAuthority[];
  readonly usage: AgentContextUsageExecutionAuthority;
  readonly repeaterCaptures: readonly AgentContextCreatedItemCaptureAuthority[];
}

export interface AgentContextExecutionAuthority
  extends AgentContextExecutionAuthorityDraft {
  readonly contentHash: Sha256Digest;
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;
const MAX_ID_LENGTH = 256;
const MAX_COLLECTION_SIZE = 10_000;
const MAX_DATA_GRAPH_DEPTH = 128;
const MAX_DATA_GRAPH_NODES = 100_000;

const EXECUTION_AUTHORITY_KEYS = new Set([
  'schemaVersion',
  'basis',
  'scenario',
  'physicalOperations',
  'readiness',
  'interactions',
  'commits',
  'validationSurfaces',
  'valueAssertions',
  'stateAssertions',
  'usage',
  'repeaterCaptures',
  'contentHash',
]);
const EXECUTION_AUTHORITY_DRAFT_KEYS = new Set(
  [...EXECUTION_AUTHORITY_KEYS].filter((key) => key !== 'contentHash')
);
const BASIS_KEYS = new Set(['formId', 'contractHash']);
const SCENARIO_KEYS = new Set(['id', 'version', 'artifactHash', 'basis']);
const DRIVER_KEYS = new Set(['kind', 'id', 'version']);
const PROFILE_KEYS = new Set(['id', 'version']);
const TARGET_KEYS = new Set(['purpose', 'partRef', 'locatorTargetRef']);
const PHYSICAL_OPERATION_KEYS = new Set([
  'id',
  'nodeId',
  'mechanic',
  'partRef',
  'locatorTargetRef',
]);
const READINESS_KEYS = new Set([
  'id',
  'nodeId',
  'owner',
  'operation',
  'driver',
  'partRef',
  'locatorTargetRef',
]);
const READINESS_OWNER_UNION_KEYS = new Set([
  'kind',
  'interactionId',
  'repeaterCaptureId',
]);
const READINESS_INTERACTION_OWNER_KEYS = new Set(['kind', 'interactionId']);
const READINESS_CAPTURE_OWNER_KEYS = new Set(['kind', 'repeaterCaptureId']);
const INTERACTION_KEYS = new Set([
  'id',
  'nodeId',
  'stepId',
  'profile',
  'driver',
  'operation',
  'targets',
  'readinessIds',
]);
const COMMIT_UNION_KEYS = new Set([
  'id',
  'nodeId',
  'interactionId',
  'operation',
  'kind',
  'mode',
  'execution',
  'physicalOperationId',
  'actionId',
]);
const COMMIT_INCLUDED_KEYS = new Set([
  'id',
  'nodeId',
  'interactionId',
  'operation',
  'kind',
  'mode',
  'execution',
]);
const COMMIT_EXPLICIT_KEYS = new Set([
  ...COMMIT_INCLUDED_KEYS,
  'physicalOperationId',
]);
const COMMIT_USAGE_ACTION_KEYS = new Set([
  'id',
  'nodeId',
  'interactionId',
  'operation',
  'kind',
  'actionId',
]);
const VALIDATION_SURFACE_KEYS = new Set([
  'id',
  'nodeId',
  'constraintId',
  'activation',
  'assertion',
]);
const VALIDATION_ACTIVATION_UNION_KEYS = new Set([
  'kind',
  'id',
  'operation',
  'physicalOperationId',
  'actionId',
]);
const VALIDATION_ACTIVATION_NONE_KEYS = new Set(['kind']);
const VALIDATION_ACTIVATION_NODE_KEYS = new Set([
  'kind',
  'id',
  'operation',
  'physicalOperationId',
]);
const VALIDATION_ACTIVATION_ACTION_KEYS = new Set([
  'kind',
  'id',
  'operation',
  'actionId',
]);
const VALIDATION_ASSERTION_KEYS = new Set([
  'id',
  'operation',
  'partRef',
  'locatorTargetRef',
]);
const VALUE_ASSERTION_KEYS = new Set([
  'id',
  'nodeId',
  'operation',
  'kind',
  'partRef',
  'locatorTargetRef',
]);
const STATE_ASSERTION_KEYS = new Set([
  'id',
  'version',
  'nodeId',
  'operation',
  'states',
  'driver',
  'partRef',
  'locatorTargetRef',
]);
const USAGE_KEYS = new Set([
  'id',
  'version',
  'basis',
  'entry',
  'steps',
  'actions',
  'outcomes',
  'transitions',
]);
const ENTRY_KEYS = new Set(['id', 'operation', 'landingStepId', 'driver']);
const STEP_KEYS = new Set(['id', 'ordinal', 'nodeIds', 'actionIds']);
const ACTION_KEYS = new Set([
  'id',
  'operation',
  'kind',
  'driver',
  'outcomeIds',
]);
const OUTCOME_KEYS = new Set([
  'id',
  'operation',
  'kind',
  'assertionDriver',
  'assertionTargetRef',
]);
const TRANSITION_KEYS = new Set([
  'id',
  'version',
  'fromStepId',
  'actionId',
  'outcomeId',
  'toStepId',
]);
const CAPTURE_KEYS = new Set([
  'id',
  'version',
  'repeaterNodeId',
  'stepId',
  'profile',
  'operation',
  'guarantee',
  'captureMode',
  'driver',
  'addTarget',
  'itemTarget',
  'readinessIds',
]);
const CAPTURE_TARGET_KEYS = new Set(['partRef', 'locatorTargetRef']);

const TARGET_PURPOSES = [
  'control',
  'trigger',
  'popup',
  'option',
  'row',
  'selection',
  'add',
  'item',
  'expand',
  'wrapper',
] as const;
const PHYSICAL_MECHANICS = ['blur', 'click', 'check'] as const;
const NODE_INTERACTION_OPERATIONS = [
  'fill',
  'check',
  'select-option',
  'select-from-overlay',
  'type-and-pick',
  'select-row',
  'expand-item',
] as const;
const ASSERTABLE_STATES = [
  'visible',
  'hidden',
  'enabled',
  'disabled',
  'valid',
  'invalid',
] as const;
const ACTION_KINDS = ['next', 'submit', 'cancel', 'other'] as const;
const OUTCOME_KINDS = [
  'remains-on-step',
  'step-changed',
  'navigation',
  'message',
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

function stableId(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > MAX_ID_LENGTH ||
    !STABLE_ID_PATTERN.test(input)
  ) {
    fail(path, 'must be a 1-256 character contract stable identifier.');
  }
  return input;
}

function sha256(input: unknown, path: string): Sha256Digest {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a lowercase sha256 digest.');
  }
  return input as Sha256Digest;
}

function positiveInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || (input as number) <= 0) {
    fail(path, 'must be a positive safe integer.');
  }
  return input as number;
}

function ordinal(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) < 0) {
    fail(path, 'must be a non-negative safe integer.');
  }
  const value = Number(input);
  return Object.is(value, -0) ? 0 : value;
}

function literal<T extends string>(
  input: unknown,
  expected: T,
  path: string
): T {
  if (input !== expected) {
    fail(path, `must be "${expected}".`);
  }
  return expected;
}

function enumValue<T extends readonly string[]>(
  input: unknown,
  allowed: T,
  path: string
): T[number] {
  if (typeof input !== 'string' || !allowed.includes(input)) {
    fail(
      path,
      `must be one of ${allowed.map((value) => `"${value}"`).join(', ')}.`
    );
  }
  return input;
}

function array(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  if (input.length > MAX_COLLECTION_SIZE) {
    fail(path, `must contain at most ${MAX_COLLECTION_SIZE} items.`);
  }
  return input;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertCanonicalOrder<T>(
  values: readonly T[],
  path: string,
  compare: (left: T, right: T) => number
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

function parseIdCollection<T extends { readonly id: string }>(
  input: unknown,
  path: string,
  parse: (entry: unknown, entryPath: string) => T,
  requireCanonicalOrder: boolean,
  compare: (left: T, right: T) => number = (left, right) =>
    compareText(left.id, right.id)
): readonly T[] {
  const parsed = array(input, path).map((entry, index) =>
    parse(entry, `${path}[${index}]`)
  );
  const ids = new Set<string>();
  for (const [index, value] of parsed.entries()) {
    if (ids.has(value.id)) {
      fail(`${path}[${index}].id`, `duplicates ID "${value.id}".`);
    }
    ids.add(value.id);
  }
  if (requireCanonicalOrder) {
    assertCanonicalOrder(parsed, path, compare);
    return parsed;
  }
  return [...parsed].sort(compare);
}

function parseStableIdSet(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
  requireNonEmpty = false
): readonly string[] {
  const parsed = array(input, path).map((value, index) =>
    stableId(value, `${path}[${index}]`)
  );
  if (requireNonEmpty && parsed.length === 0) {
    fail(path, 'must contain at least one item.');
  }
  const seen = new Set<string>();
  for (const [index, value] of parsed.entries()) {
    if (seen.has(value)) {
      fail(`${path}[${index}]`, `duplicates ID "${value}".`);
    }
    seen.add(value);
  }
  if (requireCanonicalOrder) {
    assertCanonicalOrder(parsed, path, compareText);
    return parsed;
  }
  return [...parsed].sort(compareText);
}

function parseBasis(input: unknown, path: string): AgentContextExecutionBasis {
  const value = record(input, path, BASIS_KEYS);
  return {
    formId: stableId(required(value, 'formId', path), `${path}.formId`),
    contractHash: sha256(
      required(value, 'contractHash', path),
      `${path}.contractHash`
    ),
  };
}

function parseScenario(
  input: unknown,
  path: string
): AgentContextScenarioReference {
  const value = record(input, path, SCENARIO_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`
    ),
    artifactHash: sha256(
      required(value, 'artifactHash', path),
      `${path}.artifactHash`
    ),
    basis: parseBasis(required(value, 'basis', path), `${path}.basis`),
  };
}

function parseDriver(
  input: unknown,
  path: string
): AgentContextDriverReference {
  const value = record(input, path, DRIVER_KEYS);
  return {
    kind: enumValue(
      required(value, 'kind', path),
      ['generic', 'application'] as const,
      `${path}.kind`
    ),
    id: stableId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`
    ),
  };
}

function parseApplicationDriver(
  input: unknown,
  path: string
): AgentContextApplicationDriverReference {
  const driver = parseDriver(input, path);
  if (driver.kind !== 'application') {
    fail(`${path}.kind`, 'must be "application" for usage authority.');
  }
  return {
    kind: 'application',
    id: driver.id,
    version: driver.version,
  };
}

function parseProfile(
  input: unknown,
  path: string
): { readonly id: string; readonly version: number } {
  const value = record(input, path, PROFILE_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`
    ),
  };
}

function parseTarget(
  input: unknown,
  path: string
): AgentContextInteractionTarget {
  const value = record(input, path, TARGET_KEYS);
  return {
    purpose: enumValue(
      required(value, 'purpose', path),
      TARGET_PURPOSES,
      `${path}.purpose`
    ),
    partRef: stableId(required(value, 'partRef', path), `${path}.partRef`),
    locatorTargetRef: stableId(
      required(value, 'locatorTargetRef', path),
      `${path}.locatorTargetRef`
    ),
  };
}

function compareTargets(
  left: AgentContextInteractionTarget,
  right: AgentContextInteractionTarget
): number {
  return (
    compareText(left.purpose, right.purpose) ||
    compareText(left.partRef, right.partRef) ||
    compareText(left.locatorTargetRef, right.locatorTargetRef)
  );
}

function parseTargets(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextNodeInteractionAuthority['targets'] {
  const parsed = array(input, path).map((entry, index) =>
    parseTarget(entry, `${path}[${index}]`)
  );
  if (parsed.length === 0) {
    fail(path, 'must contain at least one target.');
  }
  const seen = new Set<string>();
  for (const [index, target] of parsed.entries()) {
    const key = `${target.purpose}\0${target.partRef}\0${target.locatorTargetRef}`;
    if (seen.has(key)) {
      fail(`${path}[${index}]`, 'duplicates an exact interaction target.');
    }
    seen.add(key);
  }
  if (requireCanonicalOrder) {
    assertCanonicalOrder(parsed, path, compareTargets);
    return [parsed[0]!, ...parsed.slice(1)];
  }
  const sorted = [...parsed].sort(compareTargets);
  return [sorted[0]!, ...sorted.slice(1)];
}

function parsePhysicalOperation(
  input: unknown,
  path: string
): AgentContextPhysicalOperation {
  const value = record(input, path, PHYSICAL_OPERATION_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    nodeId: stableId(required(value, 'nodeId', path), `${path}.nodeId`),
    mechanic: enumValue(
      required(value, 'mechanic', path),
      PHYSICAL_MECHANICS,
      `${path}.mechanic`
    ),
    partRef: stableId(required(value, 'partRef', path), `${path}.partRef`),
    locatorTargetRef: stableId(
      required(value, 'locatorTargetRef', path),
      `${path}.locatorTargetRef`
    ),
  };
}

function parseReadinessOwner(
  input: unknown,
  path: string
): AgentContextReadinessOwner {
  const value = record(input, path, READINESS_OWNER_UNION_KEYS);
  const kind = enumValue(
    required(value, 'kind', path),
    ['interaction', 'repeater-capture'] as const,
    `${path}.kind`
  );
  const allowedKeys =
    kind === 'interaction'
      ? READINESS_INTERACTION_OWNER_KEYS
      : READINESS_CAPTURE_OWNER_KEYS;
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail(`${path}.${key}`, 'is not supported for this readiness owner.');
    }
  }
  if (kind === 'interaction') {
    return {
      kind,
      interactionId: stableId(
        required(value, 'interactionId', path),
        `${path}.interactionId`
      ),
    };
  }
  return {
    kind,
    repeaterCaptureId: stableId(
      required(value, 'repeaterCaptureId', path),
      `${path}.repeaterCaptureId`
    ),
  };
}

function parseReadiness(
  input: unknown,
  path: string
): AgentContextReadinessAuthority {
  const value = record(input, path, READINESS_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    nodeId: stableId(required(value, 'nodeId', path), `${path}.nodeId`),
    owner: parseReadinessOwner(required(value, 'owner', path), `${path}.owner`),
    operation: literal(
      required(value, 'operation', path),
      'wait-readiness',
      `${path}.operation`
    ),
    driver: parseDriver(required(value, 'driver', path), `${path}.driver`),
    partRef: stableId(required(value, 'partRef', path), `${path}.partRef`),
    locatorTargetRef: stableId(
      required(value, 'locatorTargetRef', path),
      `${path}.locatorTargetRef`
    ),
  };
}

function parseInteraction(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextNodeInteractionAuthority {
  const value = record(input, path, INTERACTION_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    nodeId: stableId(required(value, 'nodeId', path), `${path}.nodeId`),
    stepId: stableId(required(value, 'stepId', path), `${path}.stepId`),
    profile: parseProfile(required(value, 'profile', path), `${path}.profile`),
    driver: parseDriver(required(value, 'driver', path), `${path}.driver`),
    operation: enumValue(
      required(value, 'operation', path),
      NODE_INTERACTION_OPERATIONS,
      `${path}.operation`
    ),
    targets: parseTargets(
      required(value, 'targets', path),
      `${path}.targets`,
      requireCanonicalOrder
    ),
    readinessIds: parseStableIdSet(
      required(value, 'readinessIds', path),
      `${path}.readinessIds`,
      requireCanonicalOrder
    ),
  };
}

function rejectVariantExtras(
  value: DataRecord,
  allowedKeys: ReadonlySet<string>,
  path: string
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail(`${path}.${key}`, 'is not supported for this authority variant.');
    }
  }
}

function parseCommit(
  input: unknown,
  path: string
): AgentContextValueCommitAuthority {
  const value = record(input, path, COMMIT_UNION_KEYS);
  const base = {
    id: stableId(required(value, 'id', path), `${path}.id`),
    nodeId: stableId(required(value, 'nodeId', path), `${path}.nodeId`),
    interactionId: stableId(
      required(value, 'interactionId', path),
      `${path}.interactionId`
    ),
    operation: literal(
      required(value, 'operation', path),
      'commit-value',
      `${path}.operation`
    ),
  };
  const kind = enumValue(
    required(value, 'kind', path),
    ['node-local', 'usage-action'] as const,
    `${path}.kind`
  );
  if (kind === 'usage-action') {
    rejectVariantExtras(value, COMMIT_USAGE_ACTION_KEYS, path);
    return {
      ...base,
      kind,
      actionId: stableId(required(value, 'actionId', path), `${path}.actionId`),
    };
  }

  const execution = enumValue(
    required(value, 'execution', path),
    ['included-in-set', 'explicit-intent'] as const,
    `${path}.execution`
  );
  if (execution === 'included-in-set') {
    rejectVariantExtras(value, COMMIT_INCLUDED_KEYS, path);
    return {
      ...base,
      kind,
      mode: enumValue(
        required(value, 'mode', path),
        ['immediate', 'blur'] as const,
        `${path}.mode`
      ),
      execution,
    };
  }

  rejectVariantExtras(value, COMMIT_EXPLICIT_KEYS, path);
  return {
    ...base,
    kind,
    mode: literal(required(value, 'mode', path), 'blur', `${path}.mode`),
    execution,
    physicalOperationId: stableId(
      required(value, 'physicalOperationId', path),
      `${path}.physicalOperationId`
    ),
  };
}

function parseValidationActivation(
  input: unknown,
  path: string
): AgentContextValidationActivation {
  const value = record(input, path, VALIDATION_ACTIVATION_UNION_KEYS);
  const kind = enumValue(
    required(value, 'kind', path),
    ['none', 'node-local', 'usage-action'] as const,
    `${path}.kind`
  );
  if (kind === 'none') {
    rejectVariantExtras(value, VALIDATION_ACTIVATION_NONE_KEYS, path);
    return { kind };
  }
  const base = {
    kind,
    id: stableId(required(value, 'id', path), `${path}.id`),
    operation: literal(
      required(value, 'operation', path),
      'activate-validation',
      `${path}.operation`
    ),
  };
  if (kind === 'node-local') {
    rejectVariantExtras(value, VALIDATION_ACTIVATION_NODE_KEYS, path);
    return {
      kind: 'node-local',
      id: base.id,
      operation: base.operation,
      physicalOperationId: stableId(
        required(value, 'physicalOperationId', path),
        `${path}.physicalOperationId`
      ),
    };
  }
  rejectVariantExtras(value, VALIDATION_ACTIVATION_ACTION_KEYS, path);
  return {
    kind: 'usage-action',
    id: base.id,
    operation: base.operation,
    actionId: stableId(required(value, 'actionId', path), `${path}.actionId`),
  };
}

function parseValidationAssertion(
  input: unknown,
  path: string
): AgentContextValidationAssertionAuthority {
  const value = record(input, path, VALIDATION_ASSERTION_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    operation: literal(
      required(value, 'operation', path),
      'assert-validation',
      `${path}.operation`
    ),
    partRef: stableId(required(value, 'partRef', path), `${path}.partRef`),
    locatorTargetRef: stableId(
      required(value, 'locatorTargetRef', path),
      `${path}.locatorTargetRef`
    ),
  };
}

function parseValidationSurface(
  input: unknown,
  path: string
): AgentContextValidationSurfaceAuthority {
  const value = record(input, path, VALIDATION_SURFACE_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    nodeId: stableId(required(value, 'nodeId', path), `${path}.nodeId`),
    constraintId: stableId(
      required(value, 'constraintId', path),
      `${path}.constraintId`
    ),
    activation: parseValidationActivation(
      required(value, 'activation', path),
      `${path}.activation`
    ),
    assertion: parseValidationAssertion(
      required(value, 'assertion', path),
      `${path}.assertion`
    ),
  };
}

function parseValueAssertion(
  input: unknown,
  path: string
): AgentContextValueAssertionAuthority {
  const value = record(input, path, VALUE_ASSERTION_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    nodeId: stableId(required(value, 'nodeId', path), `${path}.nodeId`),
    operation: literal(
      required(value, 'operation', path),
      'assert-value',
      `${path}.operation`
    ),
    kind: enumValue(
      required(value, 'kind', path),
      ['committed-model-value', 'control-value'] as const,
      `${path}.kind`
    ),
    partRef: stableId(required(value, 'partRef', path), `${path}.partRef`),
    locatorTargetRef: stableId(
      required(value, 'locatorTargetRef', path),
      `${path}.locatorTargetRef`
    ),
  };
}

function parseStates(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextStateAssertionAuthority['states'] {
  const parsed = array(input, path).map((state, index) =>
    enumValue(state, ASSERTABLE_STATES, `${path}[${index}]`)
  );
  if (parsed.length === 0) {
    fail(path, 'must contain at least one state.');
  }
  const seen = new Set<string>();
  for (const [index, state] of parsed.entries()) {
    if (seen.has(state)) {
      fail(`${path}[${index}]`, `duplicates state "${state}".`);
    }
    seen.add(state);
  }
  if (requireCanonicalOrder) {
    assertCanonicalOrder(parsed, path, compareText);
    return [parsed[0]!, ...parsed.slice(1)];
  }
  const sorted = [...parsed].sort(compareText);
  return [sorted[0]!, ...sorted.slice(1)];
}

function parseStateAssertion(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextStateAssertionAuthority {
  const value = record(input, path, STATE_ASSERTION_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`
    ),
    nodeId: stableId(required(value, 'nodeId', path), `${path}.nodeId`),
    operation: literal(
      required(value, 'operation', path),
      'assert-state',
      `${path}.operation`
    ),
    states: parseStates(
      required(value, 'states', path),
      `${path}.states`,
      requireCanonicalOrder
    ),
    driver: parseDriver(required(value, 'driver', path), `${path}.driver`),
    partRef: stableId(required(value, 'partRef', path), `${path}.partRef`),
    locatorTargetRef: stableId(
      required(value, 'locatorTargetRef', path),
      `${path}.locatorTargetRef`
    ),
  };
}

function parseEntry(
  input: unknown,
  path: string
): AgentContextUsageEntryAuthority {
  const value = record(input, path, ENTRY_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    operation: literal(
      required(value, 'operation', path),
      'open-usage',
      `${path}.operation`
    ),
    landingStepId: stableId(
      required(value, 'landingStepId', path),
      `${path}.landingStepId`
    ),
    driver: parseApplicationDriver(
      required(value, 'driver', path),
      `${path}.driver`
    ),
  };
}

function parseStep(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextUsageStepAuthority {
  const value = record(input, path, STEP_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    ordinal: ordinal(required(value, 'ordinal', path), `${path}.ordinal`),
    nodeIds: parseStableIdSet(
      required(value, 'nodeIds', path),
      `${path}.nodeIds`,
      requireCanonicalOrder
    ),
    actionIds: parseStableIdSet(
      required(value, 'actionIds', path),
      `${path}.actionIds`,
      requireCanonicalOrder
    ),
  };
}

function parseAction(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextUsageActionAuthority {
  const value = record(input, path, ACTION_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    operation: literal(
      required(value, 'operation', path),
      'invoke-usage-action',
      `${path}.operation`
    ),
    kind: enumValue(
      required(value, 'kind', path),
      ACTION_KINDS,
      `${path}.kind`
    ),
    driver: parseApplicationDriver(
      required(value, 'driver', path),
      `${path}.driver`
    ),
    outcomeIds: parseStableIdSet(
      required(value, 'outcomeIds', path),
      `${path}.outcomeIds`,
      requireCanonicalOrder
    ),
  };
}

function parseOutcome(
  input: unknown,
  path: string
): AgentContextUsageOutcomeAuthority {
  const value = record(input, path, OUTCOME_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    operation: literal(
      required(value, 'operation', path),
      'assert-outcome',
      `${path}.operation`
    ),
    kind: enumValue(
      required(value, 'kind', path),
      OUTCOME_KINDS,
      `${path}.kind`
    ),
    assertionDriver: parseApplicationDriver(
      required(value, 'assertionDriver', path),
      `${path}.assertionDriver`
    ),
    assertionTargetRef: stableId(
      required(value, 'assertionTargetRef', path),
      `${path}.assertionTargetRef`
    ),
  };
}

function parseTransition(
  input: unknown,
  path: string
): AgentContextUsageTransitionAuthority {
  const value = record(input, path, TRANSITION_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`
    ),
    fromStepId: stableId(
      required(value, 'fromStepId', path),
      `${path}.fromStepId`
    ),
    actionId: stableId(required(value, 'actionId', path), `${path}.actionId`),
    outcomeId: stableId(
      required(value, 'outcomeId', path),
      `${path}.outcomeId`
    ),
    toStepId: stableId(required(value, 'toStepId', path), `${path}.toStepId`),
  };
}

function compareSteps(
  left: AgentContextUsageStepAuthority,
  right: AgentContextUsageStepAuthority
): number {
  return left.ordinal - right.ordinal || compareText(left.id, right.id);
}

function parseUsage(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextUsageExecutionAuthority {
  const value = record(input, path, USAGE_KEYS);
  const steps = parseIdCollection(
    required(value, 'steps', path),
    `${path}.steps`,
    (entry, entryPath) => parseStep(entry, entryPath, requireCanonicalOrder),
    requireCanonicalOrder,
    compareSteps
  );
  const ordinals = new Set<number>();
  for (const [index, step] of steps.entries()) {
    if (ordinals.has(step.ordinal)) {
      fail(
        `${path}.steps[${index}].ordinal`,
        `duplicates ordinal ${step.ordinal}.`
      );
    }
    ordinals.add(step.ordinal);
  }
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`
    ),
    basis: parseBasis(required(value, 'basis', path), `${path}.basis`),
    entry: parseEntry(required(value, 'entry', path), `${path}.entry`),
    steps,
    actions: parseIdCollection(
      required(value, 'actions', path),
      `${path}.actions`,
      (entry, entryPath) =>
        parseAction(entry, entryPath, requireCanonicalOrder),
      requireCanonicalOrder
    ),
    outcomes: parseIdCollection(
      required(value, 'outcomes', path),
      `${path}.outcomes`,
      parseOutcome,
      requireCanonicalOrder
    ),
    transitions: parseIdCollection(
      required(value, 'transitions', path),
      `${path}.transitions`,
      parseTransition,
      requireCanonicalOrder
    ),
  };
}

function parseCaptureTarget(
  input: unknown,
  path: string
): { readonly partRef: string; readonly locatorTargetRef: string } {
  const value = record(input, path, CAPTURE_TARGET_KEYS);
  return {
    partRef: stableId(required(value, 'partRef', path), `${path}.partRef`),
    locatorTargetRef: stableId(
      required(value, 'locatorTargetRef', path),
      `${path}.locatorTargetRef`
    ),
  };
}

function parseCapture(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean
): AgentContextCreatedItemCaptureAuthority {
  const value = record(input, path, CAPTURE_KEYS);
  return {
    id: stableId(required(value, 'id', path), `${path}.id`),
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`
    ),
    repeaterNodeId: stableId(
      required(value, 'repeaterNodeId', path),
      `${path}.repeaterNodeId`
    ),
    stepId: stableId(required(value, 'stepId', path), `${path}.stepId`),
    profile: parseProfile(required(value, 'profile', path), `${path}.profile`),
    operation: literal(
      required(value, 'operation', path),
      'add-item',
      `${path}.operation`
    ),
    guarantee: literal(
      required(value, 'guarantee', path),
      'exactly-one-created-item',
      `${path}.guarantee`
    ),
    captureMode: literal(
      required(value, 'captureMode', path),
      'driver-returned-item-scope',
      `${path}.captureMode`
    ),
    driver: parseDriver(required(value, 'driver', path), `${path}.driver`),
    addTarget: parseCaptureTarget(
      required(value, 'addTarget', path),
      `${path}.addTarget`
    ),
    itemTarget: parseCaptureTarget(
      required(value, 'itemTarget', path),
      `${path}.itemTarget`
    ),
    readinessIds: parseStableIdSet(
      required(value, 'readinessIds', path),
      `${path}.readinessIds`,
      requireCanonicalOrder
    ),
  };
}

function sameBasis(
  left: AgentContextExecutionBasis,
  right: AgentContextExecutionBasis
): boolean {
  return (
    left.formId === right.formId && left.contractHash === right.contractHash
  );
}

function sameDriver(
  left: AgentContextDriverReference,
  right: AgentContextDriverReference
): boolean {
  return (
    left.kind === right.kind &&
    left.id === right.id &&
    left.version === right.version
  );
}

function hasExactTarget(
  interaction: AgentContextNodeInteractionAuthority,
  partRef: string,
  locatorTargetRef: string
): boolean {
  return interaction.targets.some(
    (target) =>
      target.partRef === partRef && target.locatorTargetRef === locatorTargetRef
  );
}

function hasExactCaptureTarget(
  capture: AgentContextCreatedItemCaptureAuthority,
  partRef: string,
  locatorTargetRef: string
): boolean {
  return [capture.addTarget, capture.itemTarget].some(
    (target) =>
      target.partRef === partRef && target.locatorTargetRef === locatorTargetRef
  );
}

function sameTarget(
  left: { readonly partRef: string; readonly locatorTargetRef: string },
  right: { readonly partRef: string; readonly locatorTargetRef: string }
): boolean {
  return (
    left.partRef === right.partRef &&
    left.locatorTargetRef === right.locatorTargetRef
  );
}

function requireResolved<T>(
  map: ReadonlyMap<string, T>,
  id: string,
  path: string
): T {
  const value = map.get(id);
  if (value === undefined) {
    fail(path, `must resolve exactly one declared ID "${id}".`);
  }
  return value;
}

function validateUsage(
  authority: AgentContextExecutionAuthorityDraft,
  path: string
): {
  readonly stepIds: ReadonlySet<string>;
  readonly nodeStepById: ReadonlyMap<string, string>;
  readonly actionStepById: ReadonlyMap<string, string>;
  readonly actionById: ReadonlyMap<string, AgentContextUsageActionAuthority>;
} {
  const usage = authority.usage;
  if (!sameBasis(usage.basis, authority.basis)) {
    fail(`${path}.usage.basis`, 'must equal the top-level basis.');
  }
  const stepById = new Map(usage.steps.map((step) => [step.id, step]));
  requireResolved(
    stepById,
    usage.entry.landingStepId,
    `${path}.usage.entry.landingStepId`
  );
  const actionById = new Map(
    usage.actions.map((action) => [action.id, action])
  );
  const outcomeById = new Map(
    usage.outcomes.map((outcome) => [outcome.id, outcome])
  );

  const nodeStepById = new Map<string, string>();
  const actionStepById = new Map<string, string>();
  for (const [stepIndex, step] of usage.steps.entries()) {
    for (const nodeId of step.nodeIds) {
      if (nodeStepById.has(nodeId)) {
        fail(
          `${path}.usage.steps[${stepIndex}].nodeIds`,
          `node ID "${nodeId}" belongs to more than one step.`
        );
      }
      nodeStepById.set(nodeId, step.id);
    }
    for (const [actionIndex, actionId] of step.actionIds.entries()) {
      requireResolved(
        actionById,
        actionId,
        `${path}.usage.steps[${stepIndex}].actionIds[${actionIndex}]`
      );
      if (actionStepById.has(actionId)) {
        fail(
          `${path}.usage.steps[${stepIndex}].actionIds`,
          `action ID "${actionId}" belongs to more than one step.`
        );
      }
      actionStepById.set(actionId, step.id);
    }
  }
  for (const [actionIndex, action] of usage.actions.entries()) {
    if (!actionStepById.has(action.id)) {
      fail(
        `${path}.usage.actions[${actionIndex}].id`,
        `must be owned by exactly one usage step.`
      );
    }
  }

  const outcomeActionById = new Map<string, string>();
  for (const [actionIndex, action] of usage.actions.entries()) {
    for (const [outcomeIndex, outcomeId] of action.outcomeIds.entries()) {
      requireResolved(
        outcomeById,
        outcomeId,
        `${path}.usage.actions[${actionIndex}].outcomeIds[${outcomeIndex}]`
      );
      if (outcomeActionById.has(outcomeId)) {
        fail(
          `${path}.usage.actions[${actionIndex}].outcomeIds`,
          `outcome ID "${outcomeId}" belongs to more than one action.`
        );
      }
      outcomeActionById.set(outcomeId, action.id);
    }
  }
  for (const [outcomeIndex, outcome] of usage.outcomes.entries()) {
    if (!outcomeActionById.has(outcome.id)) {
      fail(
        `${path}.usage.outcomes[${outcomeIndex}].id`,
        'must be owned by exactly one usage action.'
      );
    }
  }

  const transitionTuples = new Set<string>();
  for (const [transitionIndex, transition] of usage.transitions.entries()) {
    const transitionPath = `${path}.usage.transitions[${transitionIndex}]`;
    requireResolved(
      stepById,
      transition.fromStepId,
      `${transitionPath}.fromStepId`
    );
    requireResolved(
      stepById,
      transition.toStepId,
      `${transitionPath}.toStepId`
    );
    const action = requireResolved(
      actionById,
      transition.actionId,
      `${transitionPath}.actionId`
    );
    const outcome = requireResolved(
      outcomeById,
      transition.outcomeId,
      `${transitionPath}.outcomeId`
    );
    if (actionStepById.get(action.id) !== transition.fromStepId) {
      fail(
        `${transitionPath}.actionId`,
        'must belong to the transition source step.'
      );
    }
    if (outcomeActionById.get(outcome.id) !== action.id) {
      fail(
        `${transitionPath}.outcomeId`,
        'must belong to the selected transition action.'
      );
    }
    if (outcome.kind !== 'step-changed') {
      fail(
        `${transitionPath}.outcomeId`,
        'must resolve a step-changed outcome.'
      );
    }
    if (transition.fromStepId === transition.toStepId) {
      fail(`${transitionPath}.toStepId`, 'must differ from fromStepId.');
    }
    const tuple = [
      transition.fromStepId,
      transition.actionId,
      transition.outcomeId,
      transition.toStepId,
    ].join('\0');
    if (transitionTuples.has(tuple)) {
      fail(transitionPath, 'duplicates an exact transition tuple.');
    }
    transitionTuples.add(tuple);
  }

  return {
    stepIds: new Set(stepById.keys()),
    nodeStepById,
    actionStepById,
    actionById,
  };
}

function validateSemanticAuthority(
  authority: AgentContextExecutionAuthorityDraft,
  path: string
): void {
  if (!sameBasis(authority.scenario.basis, authority.basis)) {
    fail(`${path}.scenario.basis`, 'must equal the top-level basis.');
  }
  const usage = validateUsage(authority, path);
  const interactionById = new Map(
    authority.interactions.map((interaction) => [interaction.id, interaction])
  );
  const physicalById = new Map(
    authority.physicalOperations.map((operation) => [operation.id, operation])
  );
  const readinessById = new Map(
    authority.readiness.map((readiness) => [readiness.id, readiness])
  );
  const captureById = new Map(
    authority.repeaterCaptures.map((capture) => [capture.id, capture])
  );
  const interactionReadinessIdsById = new Map(
    authority.interactions.map((interaction) => [
      interaction.id,
      new Set(interaction.readinessIds),
    ])
  );
  const captureReadinessIdsById = new Map(
    authority.repeaterCaptures.map((capture) => [
      capture.id,
      new Set(capture.readinessIds),
    ])
  );

  for (const [index, interaction] of authority.interactions.entries()) {
    const interactionPath = `${path}.interactions[${index}]`;
    const nodeStep = usage.nodeStepById.get(interaction.nodeId);
    if (nodeStep === undefined) {
      fail(
        `${interactionPath}.nodeId`,
        `must resolve exactly one usage-step node membership.`
      );
    }
    if (!usage.stepIds.has(interaction.stepId)) {
      fail(
        `${interactionPath}.stepId`,
        `must resolve exactly one declared usage step.`
      );
    }
    if (interaction.stepId !== nodeStep) {
      fail(`${interactionPath}.stepId`, 'must equal the node membership step.');
    }
  }

  for (const [index, capture] of authority.repeaterCaptures.entries()) {
    const capturePath = `${path}.repeaterCaptures[${index}]`;
    const nodeStep = usage.nodeStepById.get(capture.repeaterNodeId);
    if (nodeStep === undefined) {
      fail(
        `${capturePath}.repeaterNodeId`,
        'must resolve exactly one usage-step node membership.'
      );
    }
    if (capture.stepId !== nodeStep) {
      fail(`${capturePath}.stepId`, 'must equal the node membership step.');
    }
    if (sameTarget(capture.addTarget, capture.itemTarget)) {
      fail(`${capturePath}.itemTarget`, 'must differ from addTarget.');
    }
  }

  for (const [index, physical] of authority.physicalOperations.entries()) {
    const physicalPath = `${path}.physicalOperations[${index}]`;
    if (!usage.nodeStepById.has(physical.nodeId)) {
      fail(
        `${physicalPath}.nodeId`,
        'must resolve exactly one usage-step node membership.'
      );
    }
  }

  for (const [index, readiness] of authority.readiness.entries()) {
    const readinessPath = `${path}.readiness[${index}]`;
    if (readiness.owner.kind === 'interaction') {
      const interaction = requireResolved(
        interactionById,
        readiness.owner.interactionId,
        `${readinessPath}.owner.interactionId`
      );
      if (readiness.nodeId !== interaction.nodeId) {
        fail(`${readinessPath}.nodeId`, 'must equal the interaction node.');
      }
      if (!sameDriver(readiness.driver, interaction.driver)) {
        fail(`${readinessPath}.driver`, 'must equal the interaction driver.');
      }
      if (
        !hasExactTarget(
          interaction,
          readiness.partRef,
          readiness.locatorTargetRef
        )
      ) {
        fail(readinessPath, 'must select an exact interaction target.');
      }
      if (!interactionReadinessIdsById.get(interaction.id)?.has(readiness.id)) {
        fail(
          `${readinessPath}.owner.interactionId`,
          `must list this readiness ID in the owner's readinessIds.`
        );
      }
      continue;
    }

    const capture = requireResolved(
      captureById,
      readiness.owner.repeaterCaptureId,
      `${readinessPath}.owner.repeaterCaptureId`
    );
    if (readiness.nodeId !== capture.repeaterNodeId) {
      fail(`${readinessPath}.nodeId`, 'must equal the repeater-capture node.');
    }
    if (!sameDriver(readiness.driver, capture.driver)) {
      fail(
        `${readinessPath}.driver`,
        'must equal the repeater-capture driver.'
      );
    }
    if (
      !hasExactCaptureTarget(
        capture,
        readiness.partRef,
        readiness.locatorTargetRef
      )
    ) {
      fail(readinessPath, 'must select an exact repeater-capture target.');
    }
    if (!captureReadinessIdsById.get(capture.id)?.has(readiness.id)) {
      fail(
        `${readinessPath}.owner.repeaterCaptureId`,
        `must list this readiness ID in the owner's readinessIds.`
      );
    }
  }

  for (const [index, interaction] of authority.interactions.entries()) {
    const interactionPath = `${path}.interactions[${index}]`;
    for (const [
      readinessIndex,
      readinessId,
    ] of interaction.readinessIds.entries()) {
      const readiness = requireResolved(
        readinessById,
        readinessId,
        `${interactionPath}.readinessIds[${readinessIndex}]`
      );
      if (
        readiness.owner.kind !== 'interaction' ||
        readiness.owner.interactionId !== interaction.id
      ) {
        fail(
          `${interactionPath}.readinessIds[${readinessIndex}]`,
          'must resolve readiness owned by the selected interaction.'
        );
      }
    }
  }

  const referencedPhysicalIds = new Set<string>();
  const physicalCommitInteractionUses = new Map<string, string>();
  for (const [index, commit] of authority.commits.entries()) {
    const commitPath = `${path}.commits[${index}]`;
    const interaction = requireResolved(
      interactionById,
      commit.interactionId,
      `${commitPath}.interactionId`
    );
    if (commit.nodeId !== interaction.nodeId) {
      fail(`${commitPath}.nodeId`, 'must equal the interaction node.');
    }
    if (
      commit.kind === 'node-local' &&
      commit.execution === 'explicit-intent'
    ) {
      const physical = requireResolved(
        physicalById,
        commit.physicalOperationId,
        `${commitPath}.physicalOperationId`
      );
      if (
        physical.mechanic !== 'blur' ||
        physical.nodeId !== commit.nodeId ||
        !hasExactTarget(
          interaction,
          physical.partRef,
          physical.locatorTargetRef
        )
      ) {
        fail(
          `${commitPath}.physicalOperationId`,
          'must resolve an exact blur physical operation for the interaction.'
        );
      }
      referencedPhysicalIds.add(physical.id);
      const priorInteraction = physicalCommitInteractionUses.get(physical.id);
      if (
        priorInteraction !== undefined &&
        priorInteraction !== interaction.id
      ) {
        fail(
          `${commitPath}.physicalOperationId`,
          'must not bind one physical operation to multiple interactions.'
        );
      }
      physicalCommitInteractionUses.set(physical.id, interaction.id);
    }
    if (commit.kind === 'usage-action') {
      requireResolved(
        usage.actionById,
        commit.actionId,
        `${commitPath}.actionId`
      );
      if (
        usage.actionStepById.get(commit.actionId) !==
        usage.nodeStepById.get(commit.nodeId)
      ) {
        fail(
          `${commitPath}.actionId`,
          'must be owned by the same step as the node.'
        );
      }
    }
  }

  const activationIds = new Set<string>();
  const validationAssertionIds = new Set<string>();
  for (const [index, surface] of authority.validationSurfaces.entries()) {
    const surfacePath = `${path}.validationSurfaces[${index}]`;
    if (!usage.nodeStepById.has(surface.nodeId)) {
      fail(
        `${surfacePath}.nodeId`,
        'must resolve exactly one usage-step node membership.'
      );
    }
    if (validationAssertionIds.has(surface.assertion.id)) {
      fail(
        `${surfacePath}.assertion.id`,
        'duplicates a validation assertion ID.'
      );
    }
    validationAssertionIds.add(surface.assertion.id);
    if (surface.activation.kind !== 'none') {
      if (activationIds.has(surface.activation.id)) {
        fail(
          `${surfacePath}.activation.id`,
          'duplicates a validation activation ID.'
        );
      }
      activationIds.add(surface.activation.id);
    }
    if (surface.activation.kind === 'node-local') {
      const physical = requireResolved(
        physicalById,
        surface.activation.physicalOperationId,
        `${surfacePath}.activation.physicalOperationId`
      );
      if (physical.nodeId !== surface.nodeId) {
        fail(
          `${surfacePath}.activation.physicalOperationId`,
          'must resolve an exact physical operation for the validation node.'
        );
      }
      referencedPhysicalIds.add(physical.id);
    }
    if (surface.activation.kind === 'usage-action') {
      requireResolved(
        usage.actionById,
        surface.activation.actionId,
        `${surfacePath}.activation.actionId`
      );
      if (
        usage.actionStepById.get(surface.activation.actionId) !==
        usage.nodeStepById.get(surface.nodeId)
      ) {
        fail(
          `${surfacePath}.activation.actionId`,
          'must be owned by the same step as the node.'
        );
      }
    }
  }

  for (const [index, assertion] of authority.valueAssertions.entries()) {
    const assertionPath = `${path}.valueAssertions[${index}]`;
    if (!usage.nodeStepById.has(assertion.nodeId)) {
      fail(
        `${assertionPath}.nodeId`,
        'must resolve exactly one usage-step node membership.'
      );
    }
  }

  for (const [index, assertion] of authority.stateAssertions.entries()) {
    const assertionPath = `${path}.stateAssertions[${index}]`;
    if (!usage.nodeStepById.has(assertion.nodeId)) {
      fail(
        `${assertionPath}.nodeId`,
        'must resolve exactly one usage-step node membership.'
      );
    }
  }

  for (const [index, capture] of authority.repeaterCaptures.entries()) {
    const capturePath = `${path}.repeaterCaptures[${index}]`;
    for (const [
      readinessIndex,
      readinessId,
    ] of capture.readinessIds.entries()) {
      const readiness = requireResolved(
        readinessById,
        readinessId,
        `${capturePath}.readinessIds[${readinessIndex}]`
      );
      if (
        readiness.owner.kind !== 'repeater-capture' ||
        readiness.owner.repeaterCaptureId !== capture.id
      ) {
        fail(
          `${capturePath}.readinessIds[${readinessIndex}]`,
          'must resolve readiness owned by the selected repeater capture.'
        );
      }
    }
  }

  for (const [index, physical] of authority.physicalOperations.entries()) {
    if (!referencedPhysicalIds.has(physical.id)) {
      fail(
        `${path}.physicalOperations[${index}].id`,
        'must be referenced by a commit or validation activation.'
      );
    }
  }
}

function normalizeAuthorityInput(
  input: unknown,
  requireContentHash: boolean,
  requireCanonicalOrder: boolean
): AgentContextExecutionAuthorityDraft & {
  readonly contentHash?: Sha256Digest;
} {
  const path = 'executionAuthority';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    requireContentHash
      ? EXECUTION_AUTHORITY_KEYS
      : EXECUTION_AUTHORITY_DRAFT_KEYS
  );
  if (
    required(value, 'schemaVersion', path) !==
    AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION}.`
    );
  }

  const normalized: AgentContextExecutionAuthorityDraft = {
    schemaVersion: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    basis: parseBasis(required(value, 'basis', path), `${path}.basis`),
    scenario: parseScenario(
      required(value, 'scenario', path),
      `${path}.scenario`
    ),
    physicalOperations: parseIdCollection(
      required(value, 'physicalOperations', path),
      `${path}.physicalOperations`,
      parsePhysicalOperation,
      requireCanonicalOrder
    ),
    readiness: parseIdCollection(
      required(value, 'readiness', path),
      `${path}.readiness`,
      parseReadiness,
      requireCanonicalOrder
    ),
    interactions: parseIdCollection(
      required(value, 'interactions', path),
      `${path}.interactions`,
      (entry, entryPath) =>
        parseInteraction(entry, entryPath, requireCanonicalOrder),
      requireCanonicalOrder
    ),
    commits: parseIdCollection(
      required(value, 'commits', path),
      `${path}.commits`,
      parseCommit,
      requireCanonicalOrder
    ),
    validationSurfaces: parseIdCollection(
      required(value, 'validationSurfaces', path),
      `${path}.validationSurfaces`,
      parseValidationSurface,
      requireCanonicalOrder
    ),
    valueAssertions: parseIdCollection(
      required(value, 'valueAssertions', path),
      `${path}.valueAssertions`,
      parseValueAssertion,
      requireCanonicalOrder
    ),
    stateAssertions: parseIdCollection(
      required(value, 'stateAssertions', path),
      `${path}.stateAssertions`,
      (entry, entryPath) =>
        parseStateAssertion(entry, entryPath, requireCanonicalOrder),
      requireCanonicalOrder
    ),
    usage: parseUsage(
      required(value, 'usage', path),
      `${path}.usage`,
      requireCanonicalOrder
    ),
    repeaterCaptures: parseIdCollection(
      required(value, 'repeaterCaptures', path),
      `${path}.repeaterCaptures`,
      (entry, entryPath) =>
        parseCapture(entry, entryPath, requireCanonicalOrder),
      requireCanonicalOrder
    ),
  };
  validateSemanticAuthority(normalized, path);
  if (!requireContentHash) {
    return normalized;
  }
  return {
    ...normalized,
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`
    ),
  };
}

function computeNormalizedHash(
  input: AgentContextExecutionAuthorityDraft
): Sha256Digest {
  const canonical = canonicalStringify({
    schemaVersion: input.schemaVersion,
    basis: input.basis,
    scenario: input.scenario,
    physicalOperations: input.physicalOperations,
    readiness: input.readiness,
    interactions: input.interactions,
    commits: input.commits,
    validationSurfaces: input.validationSurfaces,
    valueAssertions: input.valueAssertions,
    stateAssertions: input.stateAssertions,
    usage: input.usage,
    repeaterCaptures: input.repeaterCaptures,
  });
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function parseAgentContextExecutionAuthority(
  input: unknown
): AgentContextExecutionAuthority {
  const normalized = normalizeAuthorityInput(input, true, true);
  const authority = normalized as AgentContextExecutionAuthority;
  if (authority.contentHash !== computeNormalizedHash(authority)) {
    fail('executionAuthority.contentHash', 'does not match authority content.');
  }
  return authority;
}

export function canonicalizeAgentContextExecutionAuthority(
  input: unknown
): string {
  return canonicalStringify(parseAgentContextExecutionAuthority(input));
}

export function computeAgentContextExecutionAuthorityHash(
  input: unknown
): Sha256Digest {
  const normalized = normalizeAuthorityInput(input, false, false);
  return computeNormalizedHash(normalized);
}

export function createAgentContextExecutionAuthority(
  draft: AgentContextExecutionAuthorityDraft
): AgentContextExecutionAuthority {
  const normalized = normalizeAuthorityInput(draft, false, false);
  return {
    ...normalized,
    contentHash: computeNormalizedHash(normalized),
  };
}
