import { types as utilTypes } from 'node:util';

import type { Sha256Digest } from './agent-context-artifacts.js';
import {
  canonicalStringify,
  parseArrayIndexProperty,
} from './canonical-json.js';
import type {
  AgentContextAssertableNodeState,
} from './agent-context-execution-authority.js';
import {
  parseAgentContextQuerySelection,
  type AgentContextDiagnosticEvidenceProjection,
  type AgentContextNodeDetailAspect,
  type AgentContextQuerySelection,
} from './agent-context-query.js';
import type { JsonValue } from './contract.js';

export const AGENT_CONTEXT_TEST_INTENT_SCHEMA_ID =
  'agent-context.test-intent' as const;
export const AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION = '0.1.0' as const;
export const AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_ID =
  'agent-context.intent-diagnostic' as const;
export const AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_VERSION = '0.1.0' as const;

export interface AgentContextTestIntentContextReference {
  readonly selection: AgentContextQuerySelection;
  readonly driverRegistryHash: Sha256Digest;
}

export type AgentContextIntentValue =
  | { readonly kind: 'domain-value'; readonly value: JsonValue }
  | { readonly kind: 'candidate'; readonly id: string }
  | { readonly kind: 'runtime-policy'; readonly policy: 'first-enabled' }
  | { readonly kind: 'constraint-violation'; readonly constraint: string }
  | {
      readonly kind: 'literal';
      readonly value: JsonValue;
      readonly expectedClassification: 'valid' | 'invalid';
    };

export type AgentContextIntentItemContext =
  | {
      readonly kind: 'index';
      readonly repeaterNodeId: string;
      readonly index: number;
    }
  | {
      readonly kind: 'created-item';
      readonly repeaterNodeId: string;
      readonly capture: string;
    };

export interface AgentContextTestIntentNodeTarget {
  readonly nodeId: string;
  readonly itemContext?: AgentContextIntentItemContext;
}

export type AgentContextTestIntentStep =
  | { readonly op: 'openUsage' }
  | (AgentContextTestIntentNodeTarget & {
      readonly op: 'set';
      readonly value: AgentContextIntentValue;
    })
  | {
      readonly op: 'addItem';
      readonly nodeId: string;
      readonly captureId?: string;
      readonly captureAs: string;
    }
  | {
      readonly op: 'expandItem';
      readonly nodeId: string;
      readonly itemContext: AgentContextIntentItemContext;
    }
  | (AgentContextTestIntentNodeTarget & {
      readonly op: 'expectState';
      readonly assertionId?: string;
      readonly state: AgentContextAssertableNodeState;
    })
  | (AgentContextTestIntentNodeTarget & {
      readonly op: 'expectValue';
      readonly assertionId: string;
      readonly value: AgentContextIntentValue;
    })
  | (AgentContextTestIntentNodeTarget & {
      readonly op: 'commitValue';
      readonly commitId: string;
    })
  | {
      readonly op: 'invokeUsageAction';
      readonly actionId: string;
      readonly transitionId?: string;
    }
  | (AgentContextTestIntentNodeTarget & {
      readonly op: 'activateValidation';
      readonly validationId: string;
    })
  | (AgentContextTestIntentNodeTarget & {
      readonly op: 'expectValidation';
      readonly validationId: string;
      readonly constraint: string;
      readonly state: 'present' | 'absent';
    })
  | { readonly op: 'expectOutcome'; readonly outcomeId: string };

export interface AgentContextTestIntent {
  readonly schemaVersion: typeof AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION;
  readonly contextRef: AgentContextTestIntentContextReference;
  readonly case: {
    readonly id: string;
    readonly title: string;
    readonly polarity: 'positive' | 'negative';
  };
  readonly steps: readonly AgentContextTestIntentStep[];
}

export const AGENT_CONTEXT_INTENT_DIAGNOSTIC_CODES = Object.freeze([
  'AMBIGUOUS_FORM_USAGE',
  'AMBIGUOUS_NODE',
  'FORM_USAGE_NOT_FOUND',
  'NODE_NOT_FOUND',
  'STALE_CONTEXT',
  'CONTEXT_MISMATCH',
  'PLAN_HASH_MISMATCH',
  'PLAN_SEMANTIC_INVALID',
  'USAGE_ENTRY_UNSUPPORTED',
  'USAGE_ACTION_NOT_FOUND',
  'USAGE_ACTION_UNSUPPORTED',
  'USAGE_TRANSITION_NOT_FOUND',
  'USAGE_TRANSITION_MISMATCH',
  'OUTCOME_NOT_FOUND',
  'OUTCOME_ASSERTION_UNSUPPORTED',
  'VALIDATION_NOT_FOUND',
  'VALIDATION_ACTIVATION_UNSUPPORTED',
  'VALIDATION_ASSERTION_UNSUPPORTED',
  'COMMIT_NOT_FOUND',
  'COMMIT_UNSUPPORTED',
  'COMMIT_AUTHORITY_AMBIGUOUS',
  'VALUE_ASSERTION_NOT_FOUND',
  'VALUE_ASSERTION_UNSUPPORTED',
  'STATE_ASSERTION_NOT_FOUND',
  'STATE_ASSERTION_UNSUPPORTED',
  'STATE_ASSERTION_AMBIGUOUS',
  'SCENARIO_REQUIRED',
  'VALUE_OUT_OF_DOMAIN',
  'VALUE_CLASSIFICATION_UNKNOWN',
  'UNSUPPORTED_INTERACTION',
  'MISSING_LOCATOR_TARGET',
  'LOCATOR_PARITY_MISMATCH',
  'ORDERING_PRECONDITION_MISSING',
  'READINESS_UNAVAILABLE',
  'HIDDEN_NODE_UNREACHABLE',
  'REPEATER_CONTEXT_REQUIRED',
  'REPEATER_ITEM_CAPTURE_UNSUPPORTED',
  'REPEATER_ITEM_CAPTURE_NOT_FOUND',
  'REPEATER_ITEM_CAPTURE_AMBIGUOUS',
  'EFFECT_COVERAGE_INCOMPLETE',
  'STEP_SCOPE_MISMATCH',
  'CROSS_STEP_PREREQUISITE_REQUIRED',
  'CROSS_STEP_TRANSITION_AMBIGUOUS',
  'CROSS_STEP_TRANSITION_UNAVAILABLE',
  'PREREQUISITE_CYCLE',
  'ATOMIC_VIEW_TOO_LARGE',
  'ATOMIC_RECORD_TOO_LARGE',
  'CONTRACT_CONTEXT_INVALID',
  'RUNTIME_PARITY_MISMATCH',
] as const);

export type AgentContextIntentDiagnosticCode =
  (typeof AGENT_CONTEXT_INTENT_DIAGNOSTIC_CODES)[number];
export type AgentContextIntentDiagnosticPhase =
  | 'discovery'
  | 'context'
  | 'validation'
  | 'compile'
  | 'runtime';
export type AgentContextIntentDiagnosticSeverity = 'warning' | 'error';

export type AgentContextIntentDiagnosticLocation =
  | { readonly kind: 'search'; readonly queryRef: string }
  | {
      readonly kind: 'context';
      readonly usageId: string;
      readonly view?: 'summary' | 'diagnostics' | 'journey' | 'e2e-slice';
      readonly queryRef?: string;
      readonly entryId?: string;
      readonly requestedStepId?: string;
      readonly sourceStepId?: string;
      readonly sourceNodeId?: string;
      readonly targetNodeId?: string;
      readonly cycleNodeIds?: readonly string[];
      readonly recordKind?:
        | 'search-candidate'
        | 'summary-step'
        | 'diagnostic'
        | 'node-projection';
      readonly recordId?: string;
      readonly aspect?: string;
    }
  | {
      readonly kind: 'intent-step';
      readonly stepIndex: number;
      readonly usageId: string;
      readonly nodeId?: string;
      readonly actionId?: string;
      readonly transitionId?: string;
      readonly currentStepId?: string;
      readonly outcomeId?: string;
      readonly validationId?: string;
      readonly commitId?: string;
      readonly assertionId?: string;
      readonly captureId?: string;
      readonly state?: AgentContextAssertableNodeState;
    }
  | { readonly kind: 'plan'; readonly planStepId?: string }
  | {
      readonly kind: 'runtime';
      readonly planStepId: string;
      readonly nodeId?: string;
    };

export type AgentContextIntentDiagnosticRemediation =
  | { readonly kind: 'choose-candidate'; readonly usageIds: readonly string[] }
  | { readonly kind: 'choose-node'; readonly nodeIds: readonly string[] }
  | { readonly kind: 'register-usage'; readonly usageId: string }
  | { readonly kind: 'regenerate-artifacts' }
  | { readonly kind: 'revalidate-intent' }
  | { readonly kind: 'declare-entry-driver'; readonly entryId: string }
  | { readonly kind: 'declare-action'; readonly actionId: string }
  | { readonly kind: 'declare-action-driver'; readonly actionId: string }
  | {
      readonly kind: 'choose-declared-transition';
      readonly transitionIds: readonly string[];
    }
  | { readonly kind: 'declare-outcome'; readonly outcomeId: string }
  | { readonly kind: 'declare-outcome-assertion'; readonly outcomeId: string }
  | { readonly kind: 'declare-validation'; readonly validationId: string }
  | {
      readonly kind: 'declare-validation-activation';
      readonly validationId: string;
    }
  | {
      readonly kind: 'declare-validation-assertion';
      readonly validationId: string;
    }
  | { readonly kind: 'declare-commit'; readonly commitId: string }
  | { readonly kind: 'declare-commit-driver'; readonly commitId: string }
  | { readonly kind: 'choose-commit'; readonly commitIds: readonly string[] }
  | { readonly kind: 'declare-value-assertion'; readonly assertionId: string }
  | {
      readonly kind: 'declare-value-assertion-driver';
      readonly assertionId: string;
    }
  | {
      readonly kind: 'select-or-declare-state-assertion';
      readonly assertionIds: readonly string[];
    }
  | {
      readonly kind: 'declare-state-assertion-driver';
      readonly assertionId: string;
    }
  | {
      readonly kind: 'choose-state-assertion';
      readonly assertionIds: readonly string[];
    }
  | { readonly kind: 'choose-scenario'; readonly scenarioIds: readonly string[] }
  | {
      readonly kind: 'choose-domain-value';
      readonly candidateIds: readonly string[];
    }
  | { readonly kind: 'inspect-source'; readonly sourceRefs: readonly string[] }
  | { readonly kind: 'declare-profile'; readonly formlyType: string }
  | { readonly kind: 'declare-locator-target'; readonly target: string }
  | { readonly kind: 'set-before'; readonly nodeId: string }
  | { readonly kind: 'declare-readiness'; readonly readinessId: string }
  | { readonly kind: 'choose-item-context'; readonly repeaterNodeId: string }
  | {
      readonly kind: 'declare-repeater-capture';
      readonly repeaterNodeId: string;
    }
  | {
      readonly kind: 'choose-repeater-capture';
      readonly captureIds: readonly string[];
    }
  | { readonly kind: 'choose-step'; readonly stepIds: readonly string[] }
  | {
      readonly kind: 'request-prerequisite-step';
      readonly withinStepId: string;
      readonly transitionId: string;
      readonly thenActionId: string;
      readonly outcomeId: string;
      readonly toStepId: string;
    }
  | {
      readonly kind: 'declare-journey-transition';
      readonly fromStepId: string;
      readonly toStepId: string;
    }
  | { readonly kind: 'narrow-slice'; readonly maximumItems: number }
  | {
      readonly kind: 'recover-oversized-record';
      readonly maximumBytes: number;
      readonly recovery: AgentContextOversizedRecordRecovery;
    };

interface AgentContextIntentDiagnosticPolicy {
  readonly phase: AgentContextIntentDiagnosticPhase;
  readonly severity: AgentContextIntentDiagnosticSeverity;
  readonly blocking: boolean;
  readonly locationKind: AgentContextIntentDiagnosticLocation['kind'];
  /** Code-specific required fields beyond the base location shape. */
  readonly locationRequired: readonly string[];
  /** Code-specific optional fields beyond the base location shape. */
  readonly locationOptional: readonly string[];
  readonly remediationKind: AgentContextIntentDiagnosticRemediation['kind'];
}

function policy<
  const Phase extends AgentContextIntentDiagnosticPhase,
  const Severity extends AgentContextIntentDiagnosticSeverity,
  const Blocking extends boolean,
  const LocationKind extends AgentContextIntentDiagnosticLocation['kind'],
  const RemediationKind extends AgentContextIntentDiagnosticRemediation['kind'],
  const LocationRequired extends readonly (keyof Extract<
    AgentContextIntentDiagnosticLocation,
    { kind: LocationKind }
  >)[],
  const LocationOptional extends readonly (keyof Extract<
    AgentContextIntentDiagnosticLocation,
    { kind: LocationKind }
  >)[],
>(
  phase: Phase,
  severity: Severity,
  blocking: Blocking,
  locationKind: LocationKind,
  remediationKind: RemediationKind,
  locationRequired: LocationRequired,
  locationOptional: LocationOptional,
) {
  const frozenLocationRequired = Object.freeze(locationRequired);
  const frozenLocationOptional = Object.freeze(locationOptional);
  return Object.freeze({
    phase,
    severity,
    blocking,
    locationKind,
    locationRequired: frozenLocationRequired,
    locationOptional: frozenLocationOptional,
    remediationKind,
  });
}

export const AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY = Object.freeze({
  AMBIGUOUS_FORM_USAGE: policy('discovery', 'error', true, 'search', 'choose-candidate', [], []),
  AMBIGUOUS_NODE: policy('context', 'error', true, 'context', 'choose-node', ['queryRef'], []),
  FORM_USAGE_NOT_FOUND: policy('context', 'error', true, 'context', 'register-usage', [], []),
  NODE_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'choose-node', ['nodeId'], []),
  STALE_CONTEXT: policy('context', 'error', true, 'context', 'regenerate-artifacts', [], []),
  CONTEXT_MISMATCH: policy('compile', 'error', true, 'plan', 'revalidate-intent', [], []),
  PLAN_HASH_MISMATCH: policy('compile', 'error', true, 'plan', 'revalidate-intent', [], []),
  PLAN_SEMANTIC_INVALID: policy('compile', 'error', true, 'plan', 'revalidate-intent', [], []),
  USAGE_ENTRY_UNSUPPORTED: policy('context', 'error', true, 'context', 'declare-entry-driver', ['entryId'], []),
  USAGE_ACTION_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'declare-action', ['actionId'], []),
  USAGE_ACTION_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-action-driver', ['actionId'], []),
  USAGE_TRANSITION_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'choose-declared-transition', ['transitionId'], []),
  USAGE_TRANSITION_MISMATCH: policy('validation', 'error', true, 'intent-step', 'choose-declared-transition', ['transitionId', 'currentStepId', 'actionId'], []),
  OUTCOME_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'declare-outcome', ['outcomeId'], []),
  OUTCOME_ASSERTION_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-outcome-assertion', ['outcomeId'], []),
  VALIDATION_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'declare-validation', ['validationId'], []),
  VALIDATION_ACTIVATION_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-validation-activation', ['validationId'], []),
  VALIDATION_ASSERTION_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-validation-assertion', ['validationId'], []),
  COMMIT_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'declare-commit', ['commitId'], []),
  COMMIT_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-commit-driver', ['commitId'], []),
  COMMIT_AUTHORITY_AMBIGUOUS: policy('validation', 'error', true, 'intent-step', 'choose-commit', ['nodeId'], []),
  VALUE_ASSERTION_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'declare-value-assertion', ['assertionId'], []),
  VALUE_ASSERTION_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-value-assertion-driver', ['assertionId'], []),
  STATE_ASSERTION_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'select-or-declare-state-assertion', ['nodeId', 'state'], ['assertionId']),
  STATE_ASSERTION_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-state-assertion-driver', ['assertionId', 'state'], []),
  STATE_ASSERTION_AMBIGUOUS: policy('validation', 'error', true, 'intent-step', 'choose-state-assertion', ['nodeId', 'state'], []),
  SCENARIO_REQUIRED: policy('validation', 'error', true, 'intent-step', 'choose-scenario', ['nodeId'], []),
  VALUE_OUT_OF_DOMAIN: policy('validation', 'error', true, 'intent-step', 'choose-domain-value', ['nodeId'], []),
  VALUE_CLASSIFICATION_UNKNOWN: policy('validation', 'error', true, 'intent-step', 'inspect-source', ['nodeId'], []),
  UNSUPPORTED_INTERACTION: policy('validation', 'error', true, 'intent-step', 'declare-profile', ['nodeId'], []),
  MISSING_LOCATOR_TARGET: policy('validation', 'error', true, 'intent-step', 'declare-locator-target', ['nodeId'], []),
  LOCATOR_PARITY_MISMATCH: policy('runtime', 'error', true, 'runtime', 'inspect-source', [], []),
  ORDERING_PRECONDITION_MISSING: policy('validation', 'error', true, 'intent-step', 'set-before', ['nodeId'], []),
  READINESS_UNAVAILABLE: policy('validation', 'error', true, 'intent-step', 'declare-readiness', ['nodeId'], []),
  HIDDEN_NODE_UNREACHABLE: policy('validation', 'error', true, 'intent-step', 'inspect-source', ['nodeId'], []),
  REPEATER_CONTEXT_REQUIRED: policy('validation', 'error', true, 'intent-step', 'choose-item-context', ['nodeId'], []),
  REPEATER_ITEM_CAPTURE_UNSUPPORTED: policy('validation', 'error', true, 'intent-step', 'declare-repeater-capture', ['nodeId'], []),
  REPEATER_ITEM_CAPTURE_NOT_FOUND: policy('validation', 'error', true, 'intent-step', 'choose-repeater-capture', ['nodeId', 'captureId'], []),
  REPEATER_ITEM_CAPTURE_AMBIGUOUS: policy('validation', 'error', true, 'intent-step', 'choose-repeater-capture', ['nodeId'], []),
  EFFECT_COVERAGE_INCOMPLETE: policy('validation', 'warning', false, 'intent-step', 'inspect-source', ['nodeId'], []),
  STEP_SCOPE_MISMATCH: policy('context', 'error', true, 'context', 'choose-step', ['requestedStepId'], []),
  CROSS_STEP_PREREQUISITE_REQUIRED: policy('context', 'error', true, 'context', 'request-prerequisite-step', ['requestedStepId', 'sourceStepId', 'sourceNodeId', 'targetNodeId'], []),
  CROSS_STEP_TRANSITION_AMBIGUOUS: policy('context', 'error', true, 'context', 'choose-declared-transition', ['requestedStepId', 'sourceStepId', 'sourceNodeId', 'targetNodeId'], []),
  CROSS_STEP_TRANSITION_UNAVAILABLE: policy('context', 'error', true, 'context', 'declare-journey-transition', ['requestedStepId', 'sourceStepId', 'sourceNodeId', 'targetNodeId'], []),
  PREREQUISITE_CYCLE: policy('context', 'error', true, 'context', 'inspect-source', ['cycleNodeIds'], []),
  ATOMIC_VIEW_TOO_LARGE: policy('context', 'error', true, 'context', 'narrow-slice', [], []),
  ATOMIC_RECORD_TOO_LARGE: policy('context', 'error', true, 'context', 'recover-oversized-record', ['recordKind', 'recordId'], []),
  CONTRACT_CONTEXT_INVALID: policy('context', 'error', true, 'context', 'regenerate-artifacts', ['aspect'], []),
  RUNTIME_PARITY_MISMATCH: policy('runtime', 'error', true, 'runtime', 'inspect-source', [], []),
} satisfies Record<
  AgentContextIntentDiagnosticCode,
  AgentContextIntentDiagnosticPolicy
>);

interface DiagnosticLocationBaseByKind {
  readonly search: Extract<AgentContextIntentDiagnosticLocation, { kind: 'search' }>;
  readonly context: Pick<
    Extract<AgentContextIntentDiagnosticLocation, { kind: 'context' }>,
    'kind' | 'usageId' | 'view'
  >;
  readonly 'intent-step': Pick<
    Extract<AgentContextIntentDiagnosticLocation, { kind: 'intent-step' }>,
    'kind' | 'stepIndex' | 'usageId'
  >;
  readonly plan: Pick<
    Extract<AgentContextIntentDiagnosticLocation, { kind: 'plan' }>,
    'kind' | 'planStepId'
  >;
  readonly runtime: Pick<
    Extract<AgentContextIntentDiagnosticLocation, { kind: 'runtime' }>,
    'kind' | 'planStepId' | 'nodeId'
  >;
}

type DiagnosticLocationForPolicy<
  Policy extends AgentContextIntentDiagnosticPolicy,
  FullLocation extends AgentContextIntentDiagnosticLocation = Extract<
    AgentContextIntentDiagnosticLocation,
    { kind: Policy['locationKind'] }
  >,
> = DiagnosticLocationBaseByKind[Policy['locationKind']] &
  Required<
    Pick<
      FullLocation,
      Extract<Policy['locationRequired'][number], keyof FullLocation>
    >
  > &
  Partial<
    Pick<
      FullLocation,
      Extract<Policy['locationOptional'][number], keyof FullLocation>
    >
  >;

type DiagnosticPolicyMap = typeof AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY;

type DiagnosticRemediationForCode<
  Code extends AgentContextIntentDiagnosticCode,
> = Code extends 'CROSS_STEP_TRANSITION_AMBIGUOUS'
  ? {
      readonly kind: 'choose-declared-transition';
      readonly transitionIds: readonly [string, string, ...string[]];
    }
  : Extract<
      AgentContextIntentDiagnosticRemediation,
      { kind: DiagnosticPolicyMap[Code]['remediationKind'] }
    >;

export type AgentContextIntentDiagnostic = {
  readonly [Code in AgentContextIntentDiagnosticCode]: {
  readonly schemaVersion: typeof AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_VERSION;
  readonly code: Code;
  readonly phase: DiagnosticPolicyMap[Code]['phase'];
  readonly severity: DiagnosticPolicyMap[Code]['severity'];
  readonly blocking: DiagnosticPolicyMap[Code]['blocking'];
  readonly at: DiagnosticLocationForPolicy<DiagnosticPolicyMap[Code]>;
  readonly remediation: readonly [DiagnosticRemediationForCode<Code>];
  readonly evidenceRefs: readonly string[];
  readonly sourceDiagnostics: readonly AgentContextDiagnosticEvidenceProjection[];
  };
}[AgentContextIntentDiagnosticCode];

type DataRecord = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-/]*$/u;
const MAX_ID_LENGTH = 256;
const MAX_TITLE_LENGTH = 4_096;
const MAX_STEPS = 10_000;
const MAX_DATA_GRAPH_DEPTH = 128;
const MAX_DATA_GRAPH_NODES = 100_000;

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function preflightDataGraph(input: unknown, path: string): void {
  type Frame =
    | { readonly kind: 'visit'; readonly value: unknown; readonly path: string; readonly depth: number }
    | { readonly kind: 'leave'; readonly value: object };
  const frames: Frame[] = [{ kind: 'visit', value: input, path, depth: 0 }];
  const ancestors = new Set<object>();
  let nodeCount = 1;
  while (frames.length > 0) {
    const frame = frames.pop()!;
    if (frame.kind === 'leave') {
      ancestors.delete(frame.value);
      continue;
    }
    const valueType = typeof frame.value;
    if (
      ((valueType === 'object' && frame.value !== null) || valueType === 'function') &&
      utilTypes.isProxy(frame.value)
    ) {
      fail(frame.path, 'must not be a proxy.');
    }
    if (valueType !== 'object' || frame.value === null) continue;
    const objectValue = frame.value as object;
    if (ancestors.has(objectValue)) fail(frame.path, 'must not contain a cycle.');
    ancestors.add(objectValue);
    frames.push({ kind: 'leave', value: objectValue });
    const isArray = Array.isArray(objectValue);
    const descriptors = Object.getOwnPropertyDescriptors(objectValue);
    for (const key of Reflect.ownKeys(objectValue)) {
      if (typeof key === 'symbol') fail(frame.path, 'must not contain symbol keys.');
      if (isArray && key === 'length') continue;
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !('value' in descriptor) ||
        descriptor.enumerable !== true
      ) {
        fail(`${frame.path}.${key}`, 'must be an enumerable data property.');
      }
      const childDepth = frame.depth + 1;
      if (childDepth > MAX_DATA_GRAPH_DEPTH) fail(frame.path, 'is too deeply nested.');
      nodeCount += 1;
      if (nodeCount > MAX_DATA_GRAPH_NODES) fail(frame.path, 'is too large.');
      frames.push({
        kind: 'visit',
        value: descriptor.value,
        path: isArray ? `${frame.path}[${key}]` : `${frame.path}.${key}`,
        depth: childDepth,
      });
    }
  }
}

function record(input: unknown, path: string): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object.');
  }
  return input as DataRecord;
}

function exactKeys(input: DataRecord, path: string, keys: readonly string[]): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) fail(`${path}.${key}`, 'is not allowed.');
  }
  for (const key of keys) {
    if (!Object.hasOwn(input, key)) fail(`${path}.${key}`, 'is required.');
  }
}

function optionalKeys(
  input: DataRecord,
  path: string,
  requiredKeys: readonly string[],
  optional: readonly string[],
): void {
  const allowed = new Set([...requiredKeys, ...optional]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) fail(`${path}.${key}`, 'is not allowed.');
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(input, key)) fail(`${path}.${key}`, 'is required.');
  }
}

function text(input: unknown, path: string, maximum = MAX_ID_LENGTH): string {
  if (typeof input !== 'string' || input.length === 0 || input.length > maximum) {
    fail(path, `must be a non-empty string of at most ${maximum} characters.`);
  }
  return input;
}

function id(input: unknown, path: string): string {
  const value = text(input, path);
  if (!ID_PATTERN.test(value)) fail(path, 'must be a contract-stable identifier.');
  return value;
}

function digest(input: unknown, path: string): Sha256Digest {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a lowercase sha256 digest.');
  }
  return input as Sha256Digest;
}

function enumValue<const Values extends readonly string[]>(
  input: unknown,
  path: string,
  values: Values,
): Values[number] {
  if (typeof input !== 'string' || !values.includes(input)) {
    fail(path, `must be one of ${values.join(', ')}.`);
  }
  return input;
}

function denseArray(input: unknown, path: string, maximum = MAX_STEPS): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    fail(path, 'must be an ordinary array.');
  }
  if (input.length > maximum) fail(path, `must contain at most ${maximum} items.`);
  const indexes: number[] = [];
  for (const key of Object.keys(input)) {
    const index = parseArrayIndexProperty(key, input.length);
    if (index === undefined) fail(`${path}.${key}`, 'is not an array item.');
    indexes.push(index);
  }
  if (indexes.length !== input.length) fail(path, 'must not be sparse.');
  return input;
}

function jsonValue(input: unknown, path: string): JsonValue {
  try {
    return JSON.parse(canonicalStringify(input)) as JsonValue;
  } catch (error) {
    fail(path, error instanceof Error ? error.message : 'must be JSON.');
  }
}

function parseItemContext(input: unknown, path: string): AgentContextIntentItemContext {
  const value = record(input, path);
  const kind = enumValue(value.kind, `${path}.kind`, ['index', 'created-item'] as const);
  if (kind === 'index') {
    exactKeys(value, path, ['kind', 'repeaterNodeId', 'index']);
    if (!Number.isSafeInteger(value.index) || (value.index as number) < 0) {
      fail(`${path}.index`, 'must be a non-negative safe integer.');
    }
    return { kind, repeaterNodeId: id(value.repeaterNodeId, `${path}.repeaterNodeId`), index: value.index as number };
  }
  exactKeys(value, path, ['kind', 'repeaterNodeId', 'capture']);
  return {
    kind,
    repeaterNodeId: id(value.repeaterNodeId, `${path}.repeaterNodeId`),
    capture: id(value.capture, `${path}.capture`),
  };
}

function parseIntentValue(input: unknown, path: string): AgentContextIntentValue {
  const value = record(input, path);
  const kind = enumValue(value.kind, `${path}.kind`, [
    'domain-value',
    'candidate',
    'runtime-policy',
    'constraint-violation',
    'literal',
  ] as const);
  if (kind === 'domain-value') {
    exactKeys(value, path, ['kind', 'value']);
    return { kind, value: jsonValue(value.value, `${path}.value`) };
  }
  if (kind === 'candidate') {
    exactKeys(value, path, ['kind', 'id']);
    return { kind, id: id(value.id, `${path}.id`) };
  }
  if (kind === 'runtime-policy') {
    exactKeys(value, path, ['kind', 'policy']);
    return { kind, policy: enumValue(value.policy, `${path}.policy`, ['first-enabled'] as const) };
  }
  if (kind === 'constraint-violation') {
    exactKeys(value, path, ['kind', 'constraint']);
    return { kind, constraint: id(value.constraint, `${path}.constraint`) };
  }
  exactKeys(value, path, ['kind', 'value', 'expectedClassification']);
  return {
    kind,
    value: jsonValue(value.value, `${path}.value`),
    expectedClassification: enumValue(
      value.expectedClassification,
      `${path}.expectedClassification`,
      ['valid', 'invalid'] as const,
    ),
  };
}

function parseNodeTarget(
  value: DataRecord,
  path: string,
): AgentContextTestIntentNodeTarget {
  return {
    nodeId: id(value.nodeId, `${path}.nodeId`),
    ...(value.itemContext === undefined
      ? {}
      : { itemContext: parseItemContext(value.itemContext, `${path}.itemContext`) }),
  };
}

function parseIntentStep(input: unknown, path: string): AgentContextTestIntentStep {
  const value = record(input, path);
  const op = enumValue(value.op, `${path}.op`, [
    'openUsage',
    'set',
    'addItem',
    'expandItem',
    'expectState',
    'expectValue',
    'commitValue',
    'invokeUsageAction',
    'activateValidation',
    'expectValidation',
    'expectOutcome',
  ] as const);
  if (op === 'openUsage') {
    exactKeys(value, path, ['op']);
    return { op };
  }
  if (op === 'addItem') {
    optionalKeys(value, path, ['op', 'nodeId', 'captureAs'], ['captureId']);
    return {
      op,
      nodeId: id(value.nodeId, `${path}.nodeId`),
      ...(value.captureId === undefined ? {} : { captureId: id(value.captureId, `${path}.captureId`) }),
      captureAs: id(value.captureAs, `${path}.captureAs`),
    };
  }
  if (op === 'expandItem') {
    exactKeys(value, path, ['op', 'nodeId', 'itemContext']);
    return {
      op,
      nodeId: id(value.nodeId, `${path}.nodeId`),
      itemContext: parseItemContext(value.itemContext, `${path}.itemContext`),
    };
  }
  if (op === 'invokeUsageAction') {
    optionalKeys(value, path, ['op', 'actionId'], ['transitionId']);
    return {
      op,
      actionId: id(value.actionId, `${path}.actionId`),
      ...(value.transitionId === undefined ? {} : { transitionId: id(value.transitionId, `${path}.transitionId`) }),
    };
  }
  if (op === 'expectOutcome') {
    exactKeys(value, path, ['op', 'outcomeId']);
    return { op, outcomeId: id(value.outcomeId, `${path}.outcomeId`) };
  }
  if (op === 'set') {
    optionalKeys(value, path, ['op', 'nodeId', 'value'], ['itemContext']);
    return { op, ...parseNodeTarget(value, path), value: parseIntentValue(value.value, `${path}.value`) };
  }
  if (op === 'expectState') {
    optionalKeys(value, path, ['op', 'nodeId', 'state'], ['itemContext', 'assertionId']);
    return {
      op,
      ...parseNodeTarget(value, path),
      ...(value.assertionId === undefined ? {} : { assertionId: id(value.assertionId, `${path}.assertionId`) }),
      state: enumValue(value.state, `${path}.state`, ['visible', 'hidden', 'enabled', 'disabled', 'valid', 'invalid'] as const),
    };
  }
  if (op === 'expectValue') {
    optionalKeys(value, path, ['op', 'nodeId', 'assertionId', 'value'], ['itemContext']);
    return {
      op,
      ...parseNodeTarget(value, path),
      assertionId: id(value.assertionId, `${path}.assertionId`),
      value: parseIntentValue(value.value, `${path}.value`),
    };
  }
  if (op === 'commitValue') {
    optionalKeys(value, path, ['op', 'nodeId', 'commitId'], ['itemContext']);
    return { op, ...parseNodeTarget(value, path), commitId: id(value.commitId, `${path}.commitId`) };
  }
  if (op === 'activateValidation') {
    optionalKeys(value, path, ['op', 'nodeId', 'validationId'], ['itemContext']);
    return { op, ...parseNodeTarget(value, path), validationId: id(value.validationId, `${path}.validationId`) };
  }
  optionalKeys(value, path, ['op', 'nodeId', 'validationId', 'constraint', 'state'], ['itemContext']);
  return {
    op,
    ...parseNodeTarget(value, path),
    validationId: id(value.validationId, `${path}.validationId`),
    constraint: id(value.constraint, `${path}.constraint`),
    state: enumValue(value.state, `${path}.state`, ['present', 'absent'] as const),
  };
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== 'object' || input === null || Object.isFrozen(input)) return input;
  for (const value of Object.values(input)) deepFreeze(value);
  return Object.freeze(input);
}

function parseContextReference(
  input: unknown,
  path: string,
): AgentContextTestIntentContextReference {
  const context = record(input, path);
  exactKeys(context, path, ['selection', 'driverRegistryHash']);
  return {
    selection: parseAgentContextQuerySelection(context.selection),
    driverRegistryHash: digest(
      context.driverRegistryHash,
      `${path}.driverRegistryHash`,
    ),
  };
}

export function parseAgentContextTestIntentContextReference(
  input: unknown,
): AgentContextTestIntentContextReference {
  const path = 'agentContextTestIntentContextReference';
  preflightDataGraph(input, path);
  return deepFreeze(parseContextReference(input, path));
}

export function parseAgentContextTestIntent(input: unknown): AgentContextTestIntent {
  const path = 'agentContextTestIntent';
  preflightDataGraph(input, path);
  const value = record(input, path);
  exactKeys(value, path, ['schemaVersion', 'contextRef', 'case', 'steps']);
  if (value.schemaVersion !== AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION) {
    fail(`${path}.schemaVersion`, `must equal ${AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION}.`);
  }
  const contextRef = parseContextReference(value.contextRef, `${path}.contextRef`);
  const caseValue = record(value.case, `${path}.case`);
  exactKeys(caseValue, `${path}.case`, ['id', 'title', 'polarity']);
  const steps = denseArray(value.steps, `${path}.steps`).map((step, index) =>
    parseIntentStep(step, `${path}.steps[${index}]`),
  );
  const captures = new Set<string>();
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]!;
    if (step.op === 'addItem') {
      if (captures.has(step.captureAs)) {
        fail(`${path}.steps[${index}].captureAs`, 'must be unique within the case.');
      }
      captures.add(step.captureAs);
    }
    const itemContext =
      step.op === 'expandItem' ||
      step.op === 'set' ||
      step.op === 'expectState' ||
      step.op === 'expectValue' ||
      step.op === 'commitValue' ||
      step.op === 'activateValidation' ||
      step.op === 'expectValidation'
        ? step.itemContext
        : undefined;
    if (
      itemContext?.kind === 'created-item' &&
      !captures.has(itemContext.capture)
    ) {
      fail(
        `${path}.steps[${index}].itemContext.capture`,
        'must reference an earlier addItem captureAs alias.',
      );
    }
  }
  if (steps[0]?.op !== 'openUsage') {
    fail(`${path}.steps[0].op`, 'must be openUsage.');
  }
  const laterOpenUsageIndex = steps.findIndex(
    (step, index) => index > 0 && step.op === 'openUsage',
  );
  if (laterOpenUsageIndex >= 0) {
    fail(
      `${path}.steps[${laterOpenUsageIndex}].op`,
      'openUsage may appear only once.',
    );
  }
  return deepFreeze({
    schemaVersion: AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION,
    contextRef,
    case: {
      id: id(caseValue.id, `${path}.case.id`),
      title: text(caseValue.title, `${path}.case.title`, MAX_TITLE_LENGTH),
      polarity: enumValue(caseValue.polarity, `${path}.case.polarity`, ['positive', 'negative'] as const),
    },
    steps,
  });
}

export function canonicalizeAgentContextTestIntent(input: unknown): string {
  return canonicalStringify(parseAgentContextTestIntent(input));
}

const DIAGNOSTIC_KEYS = [
  'schemaVersion',
  'code',
  'phase',
  'severity',
  'blocking',
  'at',
  'remediation',
  'evidenceRefs',
  'sourceDiagnostics',
] as const;

const DIAGNOSTIC_LOCATION_SHAPES = {
  search: { required: ['kind', 'queryRef'], optional: [] },
  context: {
    required: ['kind', 'usageId'],
    optional: ['view'],
  },
  'intent-step': {
    required: ['kind', 'stepIndex', 'usageId'],
    optional: [],
  },
  plan: { required: ['kind'], optional: ['planStepId'] },
  runtime: { required: ['kind', 'planStepId'], optional: ['nodeId'] },
} as const;

const DIAGNOSTIC_REMEDIATION_SHAPES: Readonly<
  Record<string, { readonly required: readonly string[]; readonly optional: readonly string[] }>
> = {
  'choose-candidate': { required: ['kind', 'usageIds'], optional: [] },
  'choose-node': { required: ['kind', 'nodeIds'], optional: [] },
  'register-usage': { required: ['kind', 'usageId'], optional: [] },
  'regenerate-artifacts': { required: ['kind'], optional: [] },
  'revalidate-intent': { required: ['kind'], optional: [] },
  'declare-entry-driver': { required: ['kind', 'entryId'], optional: [] },
  'declare-action': { required: ['kind', 'actionId'], optional: [] },
  'declare-action-driver': { required: ['kind', 'actionId'], optional: [] },
  'choose-declared-transition': {
    required: ['kind', 'transitionIds'],
    optional: [],
  },
  'declare-outcome': { required: ['kind', 'outcomeId'], optional: [] },
  'declare-outcome-assertion': {
    required: ['kind', 'outcomeId'],
    optional: [],
  },
  'declare-validation': { required: ['kind', 'validationId'], optional: [] },
  'declare-validation-activation': {
    required: ['kind', 'validationId'],
    optional: [],
  },
  'declare-validation-assertion': {
    required: ['kind', 'validationId'],
    optional: [],
  },
  'declare-commit': { required: ['kind', 'commitId'], optional: [] },
  'declare-commit-driver': { required: ['kind', 'commitId'], optional: [] },
  'choose-commit': { required: ['kind', 'commitIds'], optional: [] },
  'declare-value-assertion': {
    required: ['kind', 'assertionId'],
    optional: [],
  },
  'declare-value-assertion-driver': {
    required: ['kind', 'assertionId'],
    optional: [],
  },
  'select-or-declare-state-assertion': {
    required: ['kind', 'assertionIds'],
    optional: [],
  },
  'declare-state-assertion-driver': {
    required: ['kind', 'assertionId'],
    optional: [],
  },
  'choose-state-assertion': {
    required: ['kind', 'assertionIds'],
    optional: [],
  },
  'choose-scenario': { required: ['kind', 'scenarioIds'], optional: [] },
  'choose-domain-value': {
    required: ['kind', 'candidateIds'],
    optional: [],
  },
  'inspect-source': { required: ['kind', 'sourceRefs'], optional: [] },
  'declare-profile': { required: ['kind', 'formlyType'], optional: [] },
  'declare-locator-target': { required: ['kind', 'target'], optional: [] },
  'set-before': { required: ['kind', 'nodeId'], optional: [] },
  'declare-readiness': { required: ['kind', 'readinessId'], optional: [] },
  'choose-item-context': {
    required: ['kind', 'repeaterNodeId'],
    optional: [],
  },
  'declare-repeater-capture': {
    required: ['kind', 'repeaterNodeId'],
    optional: [],
  },
  'choose-repeater-capture': {
    required: ['kind', 'captureIds'],
    optional: [],
  },
  'choose-step': { required: ['kind', 'stepIds'], optional: [] },
  'request-prerequisite-step': {
    required: [
      'kind',
      'withinStepId',
      'transitionId',
      'thenActionId',
      'outcomeId',
      'toStepId',
    ],
    optional: [],
  },
  'declare-journey-transition': {
    required: ['kind', 'fromStepId', 'toStepId'],
    optional: [],
  },
  'narrow-slice': { required: ['kind', 'maximumItems'], optional: [] },
  'recover-oversized-record': {
    required: ['kind', 'maximumBytes', 'recovery'],
    optional: [],
  },
};

function cloneDiagnosticLocation(
  input: unknown,
  path: string,
  expected: AgentContextIntentDiagnosticPolicy,
): AgentContextIntentDiagnosticLocation {
  const value = record(input, path);
  const kind = enumValue(value.kind, `${path}.kind`, ['search', 'context', 'intent-step', 'plan', 'runtime'] as const);
  if (kind !== expected.locationKind) {
    fail(`${path}.kind`, `must equal ${expected.locationKind}.`);
  }
  const shape = DIAGNOSTIC_LOCATION_SHAPES[kind];
  optionalKeys(
    value,
    path,
    [...shape.required, ...expected.locationRequired],
    [...shape.optional, ...expected.locationOptional],
  );
  for (const [key, candidate] of Object.entries(value)) {
    if (key === 'kind') continue;
    if (key === 'stepIndex') {
      if (!Number.isSafeInteger(candidate) || (candidate as number) < 0) {
        fail(`${path}.${key}`, 'must be a non-negative safe integer.');
      }
      continue;
    }
    if (key === 'cycleNodeIds') {
      denseArray(candidate, `${path}.${key}`).forEach((entry, index) =>
        id(entry, `${path}.${key}[${index}]`),
      );
      continue;
    }
    if (key === 'view') {
      enumValue(candidate, `${path}.${key}`, [
        'summary',
        'diagnostics',
        'journey',
        'e2e-slice',
      ] as const);
      continue;
    }
    if (key === 'recordKind') {
      enumValue(candidate, `${path}.${key}`, [
        'search-candidate',
        'summary-step',
        'diagnostic',
        'node-projection',
      ] as const);
      continue;
    }
    if (key === 'state') {
      enumValue(candidate, `${path}.${key}`, [
        'visible',
        'hidden',
        'enabled',
        'disabled',
        'valid',
        'invalid',
      ] as const);
      continue;
    }
    text(candidate, `${path}.${key}`, MAX_TITLE_LENGTH);
  }
  return jsonValue(value, path) as AgentContextIntentDiagnosticLocation;
}

const REMEDIATION_ARRAY_FIELDS = new Set([
  'usageIds',
  'nodeIds',
  'transitionIds',
  'commitIds',
  'assertionIds',
  'scenarioIds',
  'candidateIds',
  'sourceRefs',
  'captureIds',
  'stepIds',
]);

function validateOversizedRecordRecovery(input: unknown, path: string): void {
  const value = record(input, path);
  const kind = enumValue(value.kind, `${path}.kind`, [
    'retry-node-query',
    'maintainer-fix-projection',
  ] as const);
  if (kind === 'retry-node-query') {
    exactKeys(value, path, ['kind', 'nodeId', 'include']);
    id(value.nodeId, `${path}.nodeId`);
    denseArray(value.include, `${path}.include`).forEach((entry, index) =>
      enumValue(entry, `${path}.include[${index}]`, [
        'constraints',
        'domain',
        'effects',
        'interaction',
        'locators',
        'unknowns',
      ] as const),
    );
    return;
  }
  exactKeys(value, path, ['kind', 'sourceRefs']);
  denseArray(value.sourceRefs, `${path}.sourceRefs`).forEach((entry, index) =>
    text(entry, `${path}.sourceRefs[${index}]`, MAX_TITLE_LENGTH),
  );
}

function validateDiagnosticRemediationFields(
  input: DataRecord,
  path: string,
): void {
  for (const [key, candidate] of Object.entries(input)) {
    if (key === 'kind') continue;
    if (REMEDIATION_ARRAY_FIELDS.has(key)) {
      denseArray(candidate, `${path}.${key}`).forEach((entry, index) =>
        text(entry, `${path}.${key}[${index}]`, MAX_TITLE_LENGTH),
      );
      continue;
    }
    if (key === 'maximumItems' || key === 'maximumBytes') {
      if (!Number.isSafeInteger(candidate) || (candidate as number) < 1) {
        fail(`${path}.${key}`, 'must be a positive safe integer.');
      }
      continue;
    }
    if (key === 'recovery') {
      validateOversizedRecordRecovery(candidate, `${path}.${key}`);
      continue;
    }
    text(candidate, `${path}.${key}`, MAX_TITLE_LENGTH);
  }
}

export function parseAgentContextIntentDiagnostic(input: unknown): AgentContextIntentDiagnostic {
  const path = 'agentContextIntentDiagnostic';
  preflightDataGraph(input, path);
  const value = record(input, path);
  exactKeys(value, path, DIAGNOSTIC_KEYS);
  if (value.schemaVersion !== AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_VERSION) {
    fail(`${path}.schemaVersion`, `must equal ${AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_VERSION}.`);
  }
  const code = enumValue(value.code, `${path}.code`, AGENT_CONTEXT_INTENT_DIAGNOSTIC_CODES);
  const expected = AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY[code];
  if (value.phase !== expected.phase) fail(`${path}.phase`, `must equal ${expected.phase}.`);
  if (value.severity !== expected.severity) fail(`${path}.severity`, `must equal ${expected.severity}.`);
  if (value.blocking !== expected.blocking) fail(`${path}.blocking`, `must equal ${String(expected.blocking)}.`);
  const at = cloneDiagnosticLocation(value.at, `${path}.at`, expected);
  const remediationValues = denseArray(value.remediation, `${path}.remediation`, 1);
  if (remediationValues.length !== 1) fail(`${path}.remediation`, 'must contain exactly one item.');
  const remediationPath = `${path}.remediation[0]`;
  const remediationValue = record(remediationValues[0], remediationPath);
  if (remediationValue.kind !== expected.remediationKind) {
    fail(`${path}.remediation[0].kind`, `must equal ${expected.remediationKind}.`);
  }
  const remediationShape =
    DIAGNOSTIC_REMEDIATION_SHAPES[expected.remediationKind];
  if (remediationShape === undefined) {
    fail(remediationPath, 'uses an unsupported remediation policy.');
  }
  optionalKeys(
    remediationValue,
    remediationPath,
    remediationShape.required,
    remediationShape.optional,
  );
  validateDiagnosticRemediationFields(remediationValue, remediationPath);
  if (
    code === 'CROSS_STEP_TRANSITION_AMBIGUOUS' &&
    remediationValue.kind === 'choose-declared-transition' &&
    denseArray(
      remediationValue.transitionIds,
      `${remediationPath}.transitionIds`,
    ).length < 2
  ) {
    fail(
      `${remediationPath}.transitionIds`,
      'must contain at least two ambiguous transition IDs.',
    );
  }
  const remediation = jsonValue(
    remediationValue,
    remediationPath,
  ) as AgentContextIntentDiagnosticRemediation;
  const evidenceRefs = denseArray(value.evidenceRefs, `${path}.evidenceRefs`).map((entry, index) =>
    text(entry, `${path}.evidenceRefs[${index}]`, MAX_TITLE_LENGTH),
  );
  const sourceDiagnostics = denseArray(
    value.sourceDiagnostics,
    `${path}.sourceDiagnostics`,
  );
  if (sourceDiagnostics.length !== 0) {
    fail(
      `${path}.sourceDiagnostics`,
      'is reserved and must be empty until strict source-evidence parsing is available.',
    );
  }
  return deepFreeze({
    schemaVersion: AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_VERSION,
    code,
    phase: expected.phase,
    severity: expected.severity,
    blocking: expected.blocking,
    at,
    remediation: [remediation],
    evidenceRefs,
    sourceDiagnostics: [] as readonly AgentContextDiagnosticEvidenceProjection[],
  }) as AgentContextIntentDiagnostic;
}

export type AgentContextIntentWarning = Extract<
  AgentContextIntentDiagnostic,
  { readonly blocking: false }
>;

export type AgentContextIntentBlockingDiagnostic = Extract<
  AgentContextIntentDiagnostic,
  { readonly blocking: true }
>;

export type AgentContextOversizedRecordRecovery =
  | {
      readonly kind: 'retry-node-query';
      readonly nodeId: string;
      readonly include: readonly AgentContextNodeDetailAspect[];
    }
  | {
      readonly kind: 'maintainer-fix-projection';
      readonly sourceRefs: readonly string[];
    };
