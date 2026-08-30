import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

import type { Sha256Digest } from './agent-context-artifacts.js';
import {
  AGENT_CONTEXT_DRIVER_CAPABILITIES,
  parseAgentContextDriverRegistryManifest,
  type AgentContextDriverCapability,
  type AgentContextDriverRegistryManifest,
} from './agent-context-driver-registry.js';
import type {
  AgentContextDriverReference,
  AgentContextInteractionTarget,
  AgentContextNodeInteractionAuthority,
  AgentContextPhysicalOperation,
  AgentContextStateAssertionAuthority,
  AgentContextValidationSurfaceAuthority,
  AgentContextValueAssertionAuthority,
  AgentContextValueCommitAuthority,
} from './agent-context-execution-authority.js';
import { executeAgentContextQuery } from './agent-context-query-core.js';
import {
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  parseAgentContextLiveOwnerState,
  parseAgentContextQueryDataset,
  type AgentContextE2eSliceProjection,
  type AgentContextNodeCandidateProjection,
  type AgentContextQueryDataset,
} from './agent-context-query.js';
import {
  AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY,
  AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_VERSION,
  AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION,
  canonicalizeAgentContextTestIntent,
  parseAgentContextIntentDiagnostic,
  parseAgentContextTestIntent,
  parseAgentContextTestIntentContextReference,
  type AgentContextIntentBlockingDiagnostic,
  type AgentContextIntentDiagnostic,
  type AgentContextIntentDiagnosticCode,
  type AgentContextIntentValue,
  type AgentContextIntentWarning,
  type AgentContextTestIntent,
  type AgentContextTestIntentContextReference,
  type AgentContextTestIntentNodeTarget,
} from './agent-context-test-intent.js';
import { canonicalStringify } from './canonical-json.js';
import type { ContractConstraint, ContractNode, JsonValue } from './contract.js';

export const AGENT_CONTEXT_VALIDATED_PLAN_SCHEMA_ID =
  'agent-context.validated-plan' as const;
export const AGENT_CONTEXT_VALIDATED_PLAN_SCHEMA_VERSION = '0.1.0' as const;
export const AGENT_CONTEXT_SEMANTIC_POLICY_VERSION = '0.1.0' as const;

export type AgentContextApprovedItemContext =
  | {
      readonly kind: 'existing-index';
      readonly repeaterNodeId: string;
      readonly index: number;
    }
  | {
      readonly kind: 'created-item';
      readonly repeaterNodeId: string;
      readonly itemContextId: string;
      readonly establishedByPlanStepId: string;
    };

export interface AgentContextApprovedNodeBinding {
  readonly nodeId: string;
  readonly stepId: string;
  readonly profile: { readonly id: string; readonly version: number };
  readonly driver: AgentContextDriverReference;
  readonly operations: readonly [
    AgentContextDriverCapability,
    ...AgentContextDriverCapability[],
  ];
  readonly targets: readonly [
    AgentContextInteractionTarget,
    ...AgentContextInteractionTarget[],
  ];
  readonly itemContext?: AgentContextApprovedItemContext;
}

export interface AgentContextResolvedPlanValue {
  readonly kind: 'canonical';
  readonly value: JsonValue;
  readonly authorization:
    | { readonly kind: 'domain-value' }
    | {
        readonly kind: 'literal';
        readonly expectedClassification: 'valid' | 'invalid';
      };
}

export type AgentContextValidatedPlanStepOrigin =
  | {
      readonly kind: 'intent';
      readonly intentStepIndexes: readonly [number, ...number[]];
    }
  | {
      readonly kind: 'declared-expansion';
      readonly parentIntentStepIndexes: readonly [number, ...number[]];
      readonly prerequisiteRef: string;
    };

interface AgentContextValidatedPlanStepBase {
  readonly planStepId: string;
  readonly origin: AgentContextValidatedPlanStepOrigin;
  readonly evidenceRefs: readonly string[];
}

export type AgentContextApprovedCommitResolution =
  | {
      readonly kind: 'included-in-set';
      readonly commitId: string;
      readonly mode: 'immediate' | 'blur';
      readonly physicalOperationId: string;
    }
  | {
      readonly kind: 'node-operation';
      readonly commitId: string;
      readonly mode: 'blur';
      readonly physicalOperationId: string;
      readonly planStepId: string;
    }
  | {
      readonly kind: 'usage-action';
      readonly commitId: string;
      readonly actionId: string;
      readonly physicalOperationId: string;
      readonly planStepId: string;
    };

export type AgentContextApprovedNodeOperationAuthority =
  | { readonly kind: 'value-commit'; readonly commitId: string }
  | {
      readonly kind: 'validation-activation';
      readonly validationId: string;
      readonly activationId: string;
    };

export type AgentContextValidatedExecutionStep =
  AgentContextValidatedPlanStepBase &
    (
      | {
          readonly op: 'open-usage';
          readonly entryId: string;
          readonly landingStepId: string;
          readonly driver: AgentContextDriverReference & {
            readonly kind: 'application';
          };
        }
      | {
          readonly op: 'wait-readiness';
          readonly binding: AgentContextApprovedNodeBinding;
          readonly readinessId: string;
        }
      | {
          readonly op: 'set-value';
          readonly binding: AgentContextApprovedNodeBinding;
          readonly physicalOperationId: string;
          readonly value: AgentContextResolvedPlanValue;
          readonly commit: AgentContextApprovedCommitResolution;
          readonly validationActivations: readonly {
            readonly validationId: string;
            readonly activationId: string;
          }[];
        }
      | {
          readonly op: 'perform-node-operation';
          readonly binding: AgentContextApprovedNodeBinding;
          readonly physicalOperationId: string;
          readonly mechanic: 'blur' | 'click' | 'check';
          readonly partRef: string;
          readonly locatorTargetRef: string;
          readonly authorities: readonly [
            AgentContextApprovedNodeOperationAuthority,
            ...AgentContextApprovedNodeOperationAuthority[],
          ];
        }
      | {
          readonly op: 'expect-state';
          readonly assertion: {
            readonly nodeId: string;
            readonly stepId: string;
            readonly assertionRef: { readonly id: string; readonly version: number };
            readonly state: AgentContextStateAssertionAuthority['states'][number];
            readonly driver: AgentContextDriverReference;
            readonly partRef: string;
            readonly locatorTargetRef: string;
          };
        }
      | {
          readonly op: 'expect-value';
          readonly binding: AgentContextApprovedNodeBinding;
          readonly assertionId: string;
          readonly value: AgentContextResolvedPlanValue;
        }
      | {
          readonly op: 'expect-validation';
          readonly binding: AgentContextApprovedNodeBinding;
          readonly validationId: string;
          readonly constraint: string;
          readonly state: 'present' | 'absent';
          readonly assertionTargetRef: string;
        }
    );

export interface AgentContextValidatedExecutionPlan {
  readonly schemaVersion: typeof AGENT_CONTEXT_VALIDATED_PLAN_SCHEMA_VERSION;
  readonly semanticPolicyVersion: typeof AGENT_CONTEXT_SEMANTIC_POLICY_VERSION;
  readonly intentHash: Sha256Digest;
  readonly contextRef: AgentContextTestIntentContextReference;
  readonly caseId: string;
  readonly steps: readonly AgentContextValidatedExecutionStep[];
}

export interface ValidateAgentContextTestIntentInput {
  readonly intent: unknown;
  readonly dataset: unknown;
  readonly liveOwners: unknown;
  readonly driverRegistryManifest: unknown;
}

export type ValidateAgentContextTestIntentResult =
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION;
      readonly status: 'valid';
      readonly contextRef: AgentContextTestIntentContextReference;
      readonly planHash: Sha256Digest;
      readonly plan: AgentContextValidatedExecutionPlan;
      readonly warnings: readonly AgentContextIntentWarning[];
    }
  | {
      readonly schemaVersion: typeof AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION;
      readonly status: 'invalid';
      readonly contextRef: AgentContextTestIntentContextReference;
      readonly diagnostics: readonly [
        AgentContextIntentBlockingDiagnostic,
        ...AgentContextIntentBlockingDiagnostic[],
      ];
      readonly warnings: readonly AgentContextIntentWarning[];
    };

export interface RevalidateAgentContextExecutionPlanInput {
  readonly intent: unknown;
  readonly contextRef: unknown;
  readonly plan: unknown;
  readonly planHash: unknown;
  readonly dataset: unknown;
  readonly liveOwners: unknown;
  readonly driverRegistryManifest: unknown;
}

export type RevalidateAgentContextExecutionPlanResult =
  | { readonly status: 'valid'; readonly canonicalPlanHash: Sha256Digest }
  | {
      readonly status: 'invalid';
      readonly diagnostics: readonly [
        AgentContextIntentBlockingDiagnostic,
        ...AgentContextIntentBlockingDiagnostic[],
      ];
    };

type ApiEnvelope = Readonly<Record<string, unknown>>;

function parseApiEnvelope(
  input: unknown,
  path: string,
  requiredKeys: readonly string[],
): ApiEnvelope {
  if (
    (typeof input === 'object' && input !== null) ||
    typeof input === 'function'
  ) {
    if (utilTypes.isProxy(input)) {
      throw new TypeError(`${path}: must not be a proxy.`);
    }
  }
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${path}: must be an object.`);
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path}: must be a plain object.`);
  }
  const allowed = new Set(requiredKeys);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const safe: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === 'symbol') {
      throw new TypeError(`${path}: must not contain symbol keys.`);
    }
    if (!allowed.has(key)) {
      throw new TypeError(`${path}.${key}: is not allowed.`);
    }
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !('value' in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(
        `${path}.${key}: must be an enumerable data property.`,
      );
    }
    safe[key] = descriptor.value;
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(safe, key)) {
      throw new TypeError(`${path}.${key}: is required.`);
    }
  }
  return safe;
}

interface ParsedValidationContext {
  readonly intent: AgentContextTestIntent;
  readonly dataset: AgentContextQueryDataset;
  readonly manifest: AgentContextDriverRegistryManifest;
  readonly slice: AgentContextE2eSliceProjection;
  readonly nodes: ReadonlyMap<string, AgentContextNodeCandidateProjection>;
  readonly repeaterAncestors: ReadonlyMap<string, string>;
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== 'object' || input === null || Object.isFrozen(input)) return input;
  for (const value of Object.values(input)) deepFreeze(value);
  return Object.freeze(input);
}

function same(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function planStepId(index: number, suffix: string): string {
  return `intent.${index.toString().padStart(4, '0')}.${suffix}`;
}

function intentStepLocation(intent: AgentContextTestIntent, stepIndex: number) {
  return {
    kind: 'intent-step' as const,
    stepIndex,
    usageId: intent.contextRef.selection.usage.usageId,
  };
}

function diagnostic<const Code extends AgentContextIntentDiagnosticCode>(
  code: Code,
  at: Extract<AgentContextIntentDiagnostic, { readonly code: Code }>['at'],
  remediation: Extract<
    AgentContextIntentDiagnostic,
    { readonly code: Code }
  >['remediation'][number],
  evidenceRefs: readonly string[] = [],
): Extract<AgentContextIntentDiagnostic, { readonly code: Code }> {
  const policy = AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY[code];
  return parseAgentContextIntentDiagnostic({
    schemaVersion: AGENT_CONTEXT_INTENT_DIAGNOSTIC_SCHEMA_VERSION,
    code,
    phase: policy.phase,
    severity: policy.severity,
    blocking: policy.blocking,
    at,
    remediation: [remediation],
    evidenceRefs,
    sourceDiagnostics: [],
  }) as Extract<AgentContextIntentDiagnostic, { readonly code: Code }>;
}

function driverSupports(
  manifest: AgentContextDriverRegistryManifest,
  driver: AgentContextDriverReference,
  capability: AgentContextDriverCapability,
): boolean {
  return manifest.registrations.some(
    (registration) =>
      registration.kind === driver.kind &&
      registration.id === driver.id &&
      registration.version === driver.version &&
      registration.capabilities.includes(capability),
  );
}

function interactionFor(
  context: ParsedValidationContext,
  nodeId: string,
): AgentContextNodeInteractionAuthority | undefined {
  const matches = context.slice.authority.interactions.items.filter(
    (interaction) => interaction.nodeId === nodeId,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function usageStepIdForNode(
  context: ParsedValidationContext,
  nodeId: string,
): string | undefined {
  const matches = context.slice.authority.steps.items.filter(({ nodeIds }) =>
    nodeIds.includes(nodeId),
  );
  return matches.length === 1 ? matches[0]!.id : undefined;
}

function targetExists(
  node: AgentContextNodeCandidateProjection,
  locatorTargetRef: string,
): boolean {
  return (
    node.details.locators?.complete === true &&
    node.details.locators.items.some(({ target }) => target === locatorTargetRef)
  );
}

function bindingFor(
  interaction: AgentContextNodeInteractionAuthority,
  operation:
    | AgentContextDriverCapability
    | readonly [
        AgentContextDriverCapability,
        ...AgentContextDriverCapability[],
      ],
  targets: readonly AgentContextInteractionTarget[] = interaction.targets,
  driver: AgentContextDriverReference = interaction.driver,
  itemContext?: AgentContextApprovedItemContext,
): AgentContextApprovedNodeBinding {
  if (targets.length === 0) throw new TypeError('approved binding requires a target');
  const operations =
    typeof operation === 'string' ? [operation] : [...operation];
  return {
    nodeId: interaction.nodeId,
    stepId: interaction.stepId,
    profile: interaction.profile,
    driver,
    operations: operations as [
      AgentContextDriverCapability,
      ...AgentContextDriverCapability[],
    ],
    targets: targets as [
      AgentContextInteractionTarget,
      ...AgentContextInteractionTarget[],
    ],
    ...(itemContext === undefined ? {} : { itemContext }),
  };
}

function sourceTarget(
  purpose: AgentContextInteractionTarget['purpose'],
  partRef: string,
  locatorTargetRef: string,
): AgentContextInteractionTarget {
  return { purpose, partRef, locatorTargetRef };
}

function classifyLiteral(
  value: JsonValue,
  constraints: readonly ContractConstraint[],
): 'valid' | 'invalid' | 'unknown' {
  if (constraints.some(({ kind }) => kind === 'pattern')) return 'unknown';
  let valid = true;
  for (const constraint of constraints) {
    if (constraint.kind === 'named') return 'unknown';
    if (constraint.kind === 'required') {
      if (
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        valid = false;
      }
      continue;
    }
    if (constraint.kind === 'min' || constraint.kind === 'max') {
      if (typeof value !== 'number') return 'unknown';
      if (constraint.kind === 'min' && value < constraint.value) valid = false;
      if (constraint.kind === 'max' && value > constraint.value) valid = false;
      continue;
    }
    if (constraint.kind === 'minLength' || constraint.kind === 'maxLength') {
      if (typeof value !== 'string' && !Array.isArray(value)) return 'unknown';
      // Angular's Validators.minLength intentionally leaves empty optional
      // values valid; a separate required constraint is authoritative for
      // whether the empty value itself is invalid.
      if (constraint.kind === 'minLength' && value.length === 0) continue;
      if (constraint.kind === 'minLength' && value.length < constraint.value) valid = false;
      if (constraint.kind === 'maxLength' && value.length > constraint.value) valid = false;
      continue;
    }
    return 'unknown';
  }
  return valid ? 'valid' : 'invalid';
}

function resolveValue(
  context: ParsedValidationContext,
  intentValue: AgentContextIntentValue,
  node: AgentContextNodeCandidateProjection,
  stepIndex: number,
  diagnostics: AgentContextIntentDiagnostic[],
): AgentContextResolvedPlanValue | undefined {
  if (intentValue.kind === 'domain-value') {
    const domain = node.details.domain?.valueDomain;
    if (
      domain?.kind !== 'enumerated' ||
      !domain.values.some((value) => same(value, intentValue.value))
    ) {
      diagnostics.push(
        diagnostic(
          'VALUE_OUT_OF_DOMAIN',
          { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
          {
            kind: 'choose-domain-value',
            candidateIds:
              domain?.kind === 'enumerated'
                ? domain.values.map((_, index) => `domain.${index}`)
                : [],
          },
        ),
      );
      return undefined;
    }
    return {
      kind: 'canonical',
      value: intentValue.value,
      authorization: { kind: 'domain-value' },
    };
  }
  if (intentValue.kind === 'literal') {
    if (node.details.domain?.valueDomain !== undefined) {
      diagnostics.push(
        diagnostic(
          'VALUE_CLASSIFICATION_UNKNOWN',
          { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
          { kind: 'inspect-source', sourceRefs: [] },
        ),
      );
      return undefined;
    }
    if (
      typeof intentValue.value === 'object' &&
      intentValue.value !== null
    ) {
      diagnostics.push(
        diagnostic(
          'VALUE_CLASSIFICATION_UNKNOWN',
          { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
          { kind: 'inspect-source', sourceRefs: [] },
        ),
      );
      return undefined;
    }
    const classification = classifyLiteral(
      intentValue.value,
      node.details.constraints?.items ?? [],
    );
    if (classification === 'unknown') {
      diagnostics.push(
        diagnostic(
          'VALUE_CLASSIFICATION_UNKNOWN',
          { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
          { kind: 'inspect-source', sourceRefs: [] },
        ),
      );
      return undefined;
    }
    if (classification !== intentValue.expectedClassification) {
      diagnostics.push(
        diagnostic(
          'VALUE_OUT_OF_DOMAIN',
          { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
          { kind: 'choose-domain-value', candidateIds: [] },
        ),
      );
      return undefined;
    }
    return {
      kind: 'canonical',
      value: intentValue.value,
      authorization: {
        kind: 'literal',
        expectedClassification: intentValue.expectedClassification,
      },
    };
  }
  diagnostics.push(
    diagnostic(
      'VALUE_CLASSIFICATION_UNKNOWN',
      { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
      { kind: 'inspect-source', sourceRefs: [] },
    ),
  );
  return undefined;
}

function canonicalPlanValueIsAuthorized(
  node: ContractNode,
  value: AgentContextResolvedPlanValue,
): boolean {
  if (node.valueDomain?.kind === 'enumerated') {
    return node.valueDomain.values.some((candidate) =>
      same(candidate, value.value),
    );
  }
  if (node.valueDomain !== undefined) return false;
  if (typeof value.value === 'object' && value.value !== null) return false;
  return classifyLiteral(value.value, node.constraints) !== 'unknown';
}

function nodeAndInteraction(
  context: ParsedValidationContext,
  target: AgentContextTestIntentNodeTarget,
  stepIndex: number,
  capability: AgentContextDriverCapability,
  diagnostics: AgentContextIntentDiagnostic[],
):
  | {
      readonly node: AgentContextNodeCandidateProjection;
      readonly interaction: AgentContextNodeInteractionAuthority;
    }
  | undefined {
  const node = context.nodes.get(target.nodeId);
  if (node === undefined) {
    diagnostics.push(
      diagnostic(
        'NODE_NOT_FOUND',
        { ...intentStepLocation(context.intent, stepIndex), nodeId: target.nodeId },
        { kind: 'choose-node', nodeIds: [...context.nodes.keys()].sort() },
      ),
    );
    return undefined;
  }
  const interaction = interactionFor(context, node.nodeId);
  if (
    interaction === undefined ||
    !driverSupports(context.manifest, interaction.driver, capability)
  ) {
    diagnostics.push(
      diagnostic(
        'UNSUPPORTED_INTERACTION',
        { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
        { kind: 'declare-profile', formlyType: node.formlyType ?? 'unknown' },
      ),
    );
    return undefined;
  }
  const missing = interaction.targets.find(
    ({ locatorTargetRef }) => !targetExists(node, locatorTargetRef),
  );
  if (missing !== undefined) {
    diagnostics.push(
      diagnostic(
        'MISSING_LOCATOR_TARGET',
        { ...intentStepLocation(context.intent, stepIndex), nodeId: node.nodeId },
        { kind: 'declare-locator-target', target: missing.locatorTargetRef },
      ),
    );
    return undefined;
  }
  return { node, interaction };
}

function commitForSet(
  context: ParsedValidationContext,
  interaction: AgentContextNodeInteractionAuthority,
  setIndex: number,
  diagnostics: AgentContextIntentDiagnostic[],
): AgentContextApprovedCommitResolution | undefined {
  const commits = context.slice.authority.commits.items.filter(
    ({ interactionId }) => interactionId === interaction.id,
  );
  if (commits.length === 0) {
    diagnostics.push(
      diagnostic(
        'COMMIT_NOT_FOUND',
        { ...intentStepLocation(context.intent, setIndex), commitId: 'required' },
        { kind: 'declare-commit', commitId: 'required' },
      ),
    );
    return undefined;
  }
  if (commits.length > 1) {
    diagnostics.push(
      diagnostic(
        'COMMIT_AUTHORITY_AMBIGUOUS',
        { ...intentStepLocation(context.intent, setIndex), nodeId: interaction.nodeId },
        { kind: 'choose-commit', commitIds: commits.map(({ id }) => id).sort() },
      ),
    );
    return undefined;
  }
  const commit = commits[0]!;
  if (commit.kind === 'node-local' && commit.execution === 'included-in-set') {
    return {
      kind: 'included-in-set',
      commitId: commit.id,
      mode: commit.mode,
      physicalOperationId: interaction.id,
    };
  }
  if (commit.kind === 'node-local' && commit.execution === 'explicit-intent') {
    const commitIndex = context.intent.steps.findIndex(
      (step, index) =>
        index > setIndex &&
        step.op === 'commitValue' &&
        step.nodeId === interaction.nodeId &&
        step.commitId === commit.id,
    );
    if (commitIndex < 0) {
      diagnostics.push(
        diagnostic(
          'COMMIT_NOT_FOUND',
          { ...intentStepLocation(context.intent, setIndex), commitId: commit.id },
          { kind: 'declare-commit', commitId: commit.id },
        ),
      );
      return undefined;
    }
    return {
      kind: 'node-operation',
      commitId: commit.id,
      mode: 'blur',
      physicalOperationId: commit.physicalOperationId,
      planStepId: planStepId(commitIndex, 'node-operation'),
    };
  }
  diagnostics.push(
    diagnostic(
      'COMMIT_UNSUPPORTED',
      { ...intentStepLocation(context.intent, setIndex), commitId: commit.id },
      { kind: 'declare-commit-driver', commitId: commit.id },
    ),
  );
  return undefined;
}

function operationBinding(
  context: ParsedValidationContext,
  nodeId: string,
  operation:
    | AgentContextDriverCapability
    | readonly [
        AgentContextDriverCapability,
        ...AgentContextDriverCapability[],
      ],
  target: AgentContextInteractionTarget,
  stepIndex: number,
  diagnostics: AgentContextIntentDiagnostic[],
): AgentContextApprovedNodeBinding | undefined {
  const operations =
    typeof operation === 'string' ? [operation] : [...operation];
  const primaryOperation = operations[0];
  if (primaryOperation === undefined) {
    throw new TypeError('approved operation binding requires an operation');
  }
  const found = nodeAndInteraction(
    context,
    { nodeId },
    stepIndex,
    primaryOperation,
    diagnostics,
  );
  if (found === undefined) return undefined;
  if (
    operations.some(
      (capability) =>
        !driverSupports(context.manifest, found.interaction.driver, capability),
    )
  ) {
    diagnostics.push(
      diagnostic(
        'UNSUPPORTED_INTERACTION',
        { ...intentStepLocation(context.intent, stepIndex), nodeId },
        {
          kind: 'declare-profile',
          formlyType: found.node.formlyType ?? 'unknown',
        },
      ),
    );
    return undefined;
  }
  if (!targetExists(found.node, target.locatorTargetRef)) {
    diagnostics.push(
      diagnostic(
        'MISSING_LOCATOR_TARGET',
        { ...intentStepLocation(context.intent, stepIndex), nodeId },
        { kind: 'declare-locator-target', target: target.locatorTargetRef },
      ),
    );
    return undefined;
  }
  return bindingFor(
    found.interaction,
    operations as [
      AgentContextDriverCapability,
      ...AgentContextDriverCapability[],
    ],
    [target],
  );
}

function checkOrdering(
  context: ParsedValidationContext,
  diagnostics: AgentContextIntentDiagnostic[],
): void {
  const setIndexes = new Map<string, number[]>();
  context.intent.steps.forEach((step, index) => {
    if (step.op !== 'set') return;
    const indexes = setIndexes.get(step.nodeId) ?? [];
    indexes.push(index);
    setIndexes.set(step.nodeId, indexes);
  });
  for (const effect of context.slice.effects.items) {
    if (effect.ordering !== 'source-before-target') continue;
    const sourceIndexes = setIndexes.get(effect.trigger.nodeId) ?? [];
    context.intent.steps.forEach((step, targetIndex) => {
      if (!('nodeId' in step) || step.nodeId !== effect.target.nodeId) return;
      if (sourceIndexes.some((sourceIndex) => sourceIndex < targetIndex)) return;
      diagnostics.push(
        diagnostic(
          'ORDERING_PRECONDITION_MISSING',
          {
            ...intentStepLocation(context.intent, targetIndex),
            nodeId: effect.target.nodeId,
          },
          { kind: 'set-before', nodeId: effect.trigger.nodeId },
          [effect.identity.id],
        ),
      );
    });
  }
}

function checkUnsupportedWrapperPrerequisites(
  context: ParsedValidationContext,
  diagnostics: AgentContextIntentDiagnostic[],
): void {
  const diagnosedNodes = new Set<string>();
  for (const prerequisite of context.slice.prerequisites.items) {
    if (
      prerequisite.kind !== 'wrapper-precondition' ||
      diagnosedNodes.has(prerequisite.node.nodeId)
    ) {
      continue;
    }
    const stepIndex = context.intent.steps.findIndex(
      (step) =>
        'nodeId' in step && step.nodeId === prerequisite.node.nodeId,
    );
    if (stepIndex < 0) continue;
    diagnosedNodes.add(prerequisite.node.nodeId);
    diagnostics.push(
      diagnostic(
        'UNSUPPORTED_INTERACTION',
        {
          ...intentStepLocation(context.intent, stepIndex),
          nodeId: prerequisite.node.nodeId,
        },
        {
          kind: 'declare-profile',
          formlyType: prerequisite.node.formlyType ?? 'unknown',
        },
      ),
    );
  }
}

function checkCommittedValueOrdering(
  context: ParsedValidationContext,
  assertion: AgentContextValueAssertionAuthority,
  interaction: AgentContextNodeInteractionAuthority,
  assertionIndex: number,
  diagnostics: AgentContextIntentDiagnostic[],
): boolean {
  if (assertion.kind !== 'committed-model-value') return true;
  const commits = context.slice.authority.commits.items.filter(
    ({ interactionId }) => interactionId === interaction.id,
  );
  if (commits.length !== 1) {
    const commitId = commits[0]?.id ?? 'required';
    diagnostics.push(
      diagnostic(
        commits.length > 1 ? 'COMMIT_AUTHORITY_AMBIGUOUS' : 'COMMIT_NOT_FOUND',
        commits.length > 1
          ? {
              ...intentStepLocation(context.intent, assertionIndex),
              nodeId: interaction.nodeId,
            }
          : {
              ...intentStepLocation(context.intent, assertionIndex),
              commitId,
            },
        commits.length > 1
          ? {
              kind: 'choose-commit',
              commitIds: commits.map(({ id }) => id).sort(),
            }
          : { kind: 'declare-commit', commitId },
      ),
    );
    return false;
  }
  const commit = commits[0]!;
  if (commit.kind === 'node-local' && commit.execution === 'included-in-set') {
    return true;
  }
  if (commit.kind === 'node-local' && commit.execution === 'explicit-intent') {
    const priorCommit = context.intent.steps.findIndex(
      (step, index) =>
        index < assertionIndex &&
        step.op === 'commitValue' &&
        step.nodeId === interaction.nodeId &&
        step.commitId === commit.id,
    );
    if (priorCommit >= 0) return true;
    diagnostics.push(
      diagnostic(
        'COMMIT_NOT_FOUND',
        {
          ...intentStepLocation(context.intent, assertionIndex),
          commitId: commit.id,
        },
        { kind: 'declare-commit', commitId: commit.id },
      ),
    );
    return false;
  }
  diagnostics.push(
    diagnostic(
      'COMMIT_UNSUPPORTED',
      {
        ...intentStepLocation(context.intent, assertionIndex),
        commitId: commit.id,
      },
      { kind: 'declare-commit-driver', commitId: commit.id },
    ),
  );
  return false;
}

function physicalOperationFor(
  context: ParsedValidationContext,
  id: string,
): AgentContextPhysicalOperation | undefined {
  return context.slice.authority.physicalOperations.items.find(
    (operation) => operation.id === id,
  );
}

function commitSource(
  context: ParsedValidationContext,
  id: string,
): AgentContextValueCommitAuthority | undefined {
  return context.slice.authority.commits.items.find((commit) => commit.id === id);
}

function validationSource(
  context: ParsedValidationContext,
  id: string,
): AgentContextValidationSurfaceAuthority | undefined {
  return context.slice.authority.validationSurfaces.items.find(
    (surface) => surface.id === id,
  );
}

function makeNodeOperation(
  context: ParsedValidationContext,
  stepIndex: number,
  diagnostics: AgentContextIntentDiagnostic[],
): { readonly step: AgentContextValidatedExecutionStep; readonly consumed: number } | undefined {
  const intentStep = context.intent.steps[stepIndex];
  if (intentStep?.op !== 'commitValue' && intentStep?.op !== 'activateValidation') {
    return undefined;
  }
  let physical: AgentContextPhysicalOperation | undefined;
  const authorities: AgentContextApprovedNodeOperationAuthority[] = [];
  const originIndexes = [stepIndex];
  if (intentStep.op === 'commitValue') {
    const commit = commitSource(context, intentStep.commitId);
    if (
      commit?.kind !== 'node-local' ||
      commit.execution !== 'explicit-intent' ||
      commit.nodeId !== intentStep.nodeId ||
      !driverSupports(
        context.manifest,
        interactionFor(context, intentStep.nodeId)?.driver ?? {
          kind: 'application',
          id: 'missing',
          version: 1,
        },
        'commit-value',
      )
    ) {
      diagnostics.push(
        diagnostic(
          commit === undefined ? 'COMMIT_NOT_FOUND' : 'COMMIT_UNSUPPORTED',
          { ...intentStepLocation(context.intent, stepIndex), commitId: intentStep.commitId },
          commit === undefined
            ? { kind: 'declare-commit', commitId: intentStep.commitId }
            : { kind: 'declare-commit-driver', commitId: intentStep.commitId },
        ),
      );
      return undefined;
    }
    physical = physicalOperationFor(context, commit.physicalOperationId);
    authorities.push({ kind: 'value-commit', commitId: commit.id });
  } else {
    const surface = validationSource(context, intentStep.validationId);
    if (surface?.nodeId !== intentStep.nodeId) {
      diagnostics.push(
        diagnostic(
          'VALIDATION_NOT_FOUND',
          {
            ...intentStepLocation(context.intent, stepIndex),
            validationId: intentStep.validationId,
          },
          { kind: 'declare-validation', validationId: intentStep.validationId },
        ),
      );
      return undefined;
    }
    if (surface.activation.kind !== 'node-local') {
      diagnostics.push(
        diagnostic(
          'VALIDATION_ACTIVATION_UNSUPPORTED',
          {
            ...intentStepLocation(context.intent, stepIndex),
            validationId: surface.id,
          },
          { kind: 'declare-validation-activation', validationId: surface.id },
        ),
      );
      return undefined;
    }
    physical = physicalOperationFor(context, surface.activation.physicalOperationId);
    authorities.push({
      kind: 'validation-activation',
      validationId: surface.id,
      activationId: surface.activation.id,
    });
  }
  if (physical === undefined) {
    diagnostics.push(
      diagnostic(
        intentStep.op === 'commitValue'
          ? 'COMMIT_UNSUPPORTED'
          : 'VALIDATION_ACTIVATION_UNSUPPORTED',
        intentStep.op === 'commitValue'
          ? { ...intentStepLocation(context.intent, stepIndex), commitId: intentStep.commitId }
          : {
              ...intentStepLocation(context.intent, stepIndex),
              validationId: intentStep.validationId,
            },
        intentStep.op === 'commitValue'
          ? { kind: 'declare-commit-driver', commitId: intentStep.commitId }
          : {
              kind: 'declare-validation-activation',
              validationId: intentStep.validationId,
            },
      ),
    );
    return undefined;
  }

  let consumed = 1;
  const next = context.intent.steps[stepIndex + 1];
  if (intentStep.op === 'commitValue' && next?.op === 'activateValidation') {
    const surface = validationSource(context, next.validationId);
    if (
      next.nodeId === physical.nodeId &&
      next.itemContext === undefined &&
      surface?.nodeId === physical.nodeId &&
      surface.activation.kind === 'node-local' &&
      surface.activation.physicalOperationId === physical.id
    ) {
      authorities.push({
        kind: 'validation-activation',
        validationId: surface.id,
        activationId: surface.activation.id,
      });
      originIndexes.push(stepIndex + 1);
      consumed = 2;
    }
  }
  const operations = authorities.map(({ kind }) =>
    kind === 'value-commit' ? 'commit-value' : 'activate-validation',
  ) as [AgentContextDriverCapability, ...AgentContextDriverCapability[]];
  const binding = operationBinding(
    context,
    physical.nodeId,
    operations,
    sourceTarget('control', physical.partRef, physical.locatorTargetRef),
    stepIndex,
    diagnostics,
  );
  if (binding === undefined) return undefined;
  return {
    consumed,
    step: {
      planStepId: planStepId(stepIndex, 'node-operation'),
      origin: {
        kind: 'intent',
        intentStepIndexes: originIndexes as [number, ...number[]],
      },
      evidenceRefs: [physical.id],
      op: 'perform-node-operation',
      binding,
      physicalOperationId: physical.id,
      mechanic: physical.mechanic,
      partRef: physical.partRef,
      locatorTargetRef: physical.locatorTargetRef,
      authorities: authorities as [
        AgentContextApprovedNodeOperationAuthority,
        ...AgentContextApprovedNodeOperationAuthority[],
      ],
    },
  };
}

function parseContext(
  input: ValidateAgentContextTestIntentInput,
  diagnostics: AgentContextIntentDiagnostic[],
): ParsedValidationContext | undefined {
  const intent = parseAgentContextTestIntent(input.intent);
  const dataset = parseAgentContextQueryDataset(input.dataset);
  const liveOwners = parseAgentContextLiveOwnerState(input.liveOwners);
  const manifest = parseAgentContextDriverRegistryManifest(
    input.driverRegistryManifest,
  );
  if (intent.contextRef.driverRegistryHash !== manifest.contentHash) {
    diagnostics.push(
      diagnostic(
        'CONTEXT_MISMATCH',
        { kind: 'plan' },
        { kind: 'revalidate-intent' },
      ),
    );
    return undefined;
  }
  const nodeIds = [...new Set(
    intent.steps.flatMap((step) =>
      'nodeId' in step ? [step.nodeId] : [],
    ),
  )].sort();
  const landingStepId = dataset.executionAuthorities.find(
    ({ reference }) =>
      same(reference, intent.contextRef.selection.owners.executionAuthority),
  )?.artifact.usage.entry.landingStepId;
  if (landingStepId === undefined) {
    diagnostics.push(
      diagnostic(
        'CONTEXT_MISMATCH',
        { kind: 'plan' },
        { kind: 'revalidate-intent' },
      ),
    );
    return undefined;
  }
  const result = executeAgentContextQuery(
    dataset,
    {
      schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
      operation: 'get-e2e-slice',
      selection: intent.contextRef.selection,
      withinStepId: landingStepId,
      nodeIds,
      goal: intent.case.polarity,
      includeOutgoingEffects: true,
    },
    liveOwners,
  );
  if (result.operation !== 'get-e2e-slice' || result.status !== 'complete') {
    diagnostics.push(
      diagnostic(
        result.operation === 'get-e2e-slice' &&
          result.reason.kind === 'step-scope-mismatch'
          ? 'STEP_SCOPE_MISMATCH'
          : 'CONTRACT_CONTEXT_INVALID',
        {
          kind: 'context',
          usageId: intent.contextRef.selection.usage.usageId,
          view: 'e2e-slice',
          ...(result.operation === 'get-e2e-slice' &&
          result.reason.kind === 'step-scope-mismatch'
            ? { requestedStepId: landingStepId }
            : { aspect: 'e2e-slice' }),
        },
        result.operation === 'get-e2e-slice' &&
          result.reason.kind === 'step-scope-mismatch'
          ? { kind: 'choose-step', stepIds: [] }
          : { kind: 'regenerate-artifacts' },
      ),
    );
    return undefined;
  }
  if (result.freshness !== 'current') {
    diagnostics.push(
      diagnostic(
        'STALE_CONTEXT',
        {
          kind: 'context',
          usageId: intent.contextRef.selection.usage.usageId,
          view: 'e2e-slice',
        },
        { kind: 'regenerate-artifacts' },
      ),
    );
    return undefined;
  }
  const nodes = new Map(
    result.slice.closureNodes.items.map((node) => [node.nodeId, node]),
  );
  const scenario = dataset.formContracts.find(({ reference }) =>
    same(reference, intent.contextRef.selection.owners.scenarioArtifact),
  )?.artifact;
  if (scenario === undefined) return undefined;
  return {
    intent,
    dataset,
    manifest,
    slice: result.slice,
    nodes,
    repeaterAncestors: collectRepeaterAncestors(scenario.nodes),
  };
}

function effectWarning(
  context: ParsedValidationContext,
): AgentContextIntentWarning | undefined {
  const scenario = context.dataset.formContracts.find(({ reference }) =>
    same(reference, context.intent.contextRef.selection.owners.scenarioArtifact),
  )?.artifact;
  if (scenario?.effectAnalysis?.completeness !== 'incomplete') return undefined;
  const stepIndex = context.intent.steps.findIndex((step) => 'nodeId' in step);
  const candidateStep =
    stepIndex < 0 ? undefined : context.intent.steps[stepIndex];
  const nodeId =
    candidateStep === undefined || !('nodeId' in candidateStep)
      ? context.slice.closureNodes.items[0]?.nodeId ?? 'unknown'
      : candidateStep.nodeId;
  return diagnostic(
    'EFFECT_COVERAGE_INCOMPLETE',
    {
      ...intentStepLocation(context.intent, Math.max(stepIndex, 0)),
      nodeId,
    },
    { kind: 'inspect-source', sourceRefs: [] },
  );
}

function collectRepeaterAncestors(
  nodes: readonly ContractNode[],
): ReadonlyMap<string, string> {
  const ancestors = new Map<string, string>();
  const pending = nodes.map((node) => ({
    node,
    repeaterNodeId: undefined as string | undefined,
  }));
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current.repeaterNodeId !== undefined) {
      ancestors.set(current.node.id, current.repeaterNodeId);
    }
    pending.push(
      ...current.node.children.map((node) => ({
        node,
        repeaterNodeId: current.repeaterNodeId,
      })),
    );
    if (current.node.arrayTemplate !== undefined) {
      pending.push({
        node: current.node.arrayTemplate,
        repeaterNodeId: current.node.id,
      });
    }
  }
  return ancestors;
}

function buildPlan(
  context: ParsedValidationContext,
  diagnostics: AgentContextIntentDiagnostic[],
): AgentContextValidatedExecutionPlan {
  checkOrdering(context, diagnostics);
  checkUnsupportedWrapperPrerequisites(context, diagnostics);
  const planSteps: AgentContextValidatedExecutionStep[] = [];
  const entry = context.slice.authority.entry;
  if (!driverSupports(context.manifest, entry.driver, 'open-usage')) {
    diagnostics.push(
      diagnostic(
        'USAGE_ENTRY_UNSUPPORTED',
        {
          kind: 'context',
          usageId: context.intent.contextRef.selection.usage.usageId,
          entryId: entry.id,
        },
        { kind: 'declare-entry-driver', entryId: entry.id },
      ),
    );
  }
  for (let index = 0; index < context.intent.steps.length; index += 1) {
    const step = context.intent.steps[index]!;
    if (step.op === 'openUsage') {
      planSteps.push({
        planStepId: planStepId(index, 'open-usage'),
        origin: { kind: 'intent', intentStepIndexes: [index] },
        evidenceRefs: [entry.id],
        op: 'open-usage',
        entryId: entry.id,
        landingStepId: entry.landingStepId,
        driver: entry.driver,
      });
      continue;
    }
    const itemContext =
      'itemContext' in step ? step.itemContext : undefined;
    if (itemContext !== undefined) {
      if (!('nodeId' in step)) {
        throw new TypeError('item-scoped intent step requires a nodeId');
      }
      diagnostics.push(
        diagnostic(
          'REPEATER_ITEM_CAPTURE_UNSUPPORTED',
          {
            ...intentStepLocation(context.intent, index),
            nodeId: step.nodeId,
          },
          {
            kind: 'declare-repeater-capture',
            repeaterNodeId: itemContext.repeaterNodeId,
          },
        ),
      );
      continue;
    }
    const targetNodeId = 'nodeId' in step ? step.nodeId : undefined;
    const requiredRepeaterNodeId =
      targetNodeId === undefined
        ? undefined
        : context.repeaterAncestors.get(targetNodeId);
    if (requiredRepeaterNodeId !== undefined && targetNodeId !== undefined) {
      diagnostics.push(
        diagnostic(
          'REPEATER_CONTEXT_REQUIRED',
          {
            ...intentStepLocation(context.intent, index),
            nodeId: targetNodeId,
          },
          {
            kind: 'choose-item-context',
            repeaterNodeId: requiredRepeaterNodeId,
          },
        ),
      );
      continue;
    }
    if (step.op === 'set') {
      const found = nodeAndInteraction(
        context,
        step,
        index,
        interactionFor(context, step.nodeId)?.operation ?? 'fill',
        diagnostics,
      );
      if (found === undefined) continue;
      if (found.node.state?.hidden === true) {
        diagnostics.push(
          diagnostic(
            'HIDDEN_NODE_UNREACHABLE',
            { ...intentStepLocation(context.intent, index), nodeId: step.nodeId },
            { kind: 'inspect-source', sourceRefs: [] },
          ),
        );
        continue;
      }
      const value = resolveValue(context, step.value, found.node, index, diagnostics);
      const commit = commitForSet(context, found.interaction, index, diagnostics);
      if (value === undefined || commit === undefined) continue;
      for (const [readinessIndex, readinessId] of found.interaction.readinessIds.entries()) {
        const readiness = context.slice.authority.readiness.items.find(
          (candidate) => candidate.id === readinessId,
        );
        const readinessTarget =
          readiness === undefined
            ? undefined
            : found.interaction.targets.find(
                ({ partRef, locatorTargetRef }) =>
                  partRef === readiness.partRef &&
                  locatorTargetRef === readiness.locatorTargetRef,
              );
        if (
          readiness === undefined ||
          readinessTarget === undefined ||
          !driverSupports(context.manifest, readiness.driver, 'wait-readiness') ||
          !targetExists(found.node, readiness.locatorTargetRef)
        ) {
          diagnostics.push(
            diagnostic(
              'READINESS_UNAVAILABLE',
              { ...intentStepLocation(context.intent, index), nodeId: step.nodeId },
              { kind: 'declare-readiness', readinessId },
            ),
          );
          continue;
        }
        planSteps.push({
          planStepId: planStepId(index, `readiness.${readinessIndex}`),
          origin: {
            kind: 'declared-expansion',
            parentIntentStepIndexes: [index],
            prerequisiteRef: readiness.id,
          },
          evidenceRefs: [readiness.id],
          op: 'wait-readiness',
          binding: bindingFor(
            found.interaction,
            'wait-readiness',
            [readinessTarget],
            readiness.driver,
          ),
          readinessId: readiness.id,
        });
      }
      planSteps.push({
        planStepId: planStepId(index, 'set'),
        origin: { kind: 'intent', intentStepIndexes: [index] },
        evidenceRefs: [found.interaction.id],
        op: 'set-value',
        binding: bindingFor(found.interaction, found.interaction.operation),
        physicalOperationId: found.interaction.id,
        value,
        commit,
        validationActivations: [],
      });
      continue;
    }
    if (step.op === 'commitValue' || step.op === 'activateValidation') {
      const operation = makeNodeOperation(context, index, diagnostics);
      if (operation !== undefined) {
        planSteps.push(operation.step);
        index += operation.consumed - 1;
      }
      continue;
    }
    if (step.op === 'expectState') {
      const node = context.nodes.get(step.nodeId);
      const compatible = context.slice.authority.stateAssertions.items.filter(
        (assertion) =>
          assertion.nodeId === step.nodeId && assertion.states.includes(step.state),
      );
      const selected =
        step.assertionId === undefined
          ? compatible.length === 1
            ? compatible[0]
            : undefined
          : compatible.find(({ id }) => id === step.assertionId);
      if (selected === undefined) {
        diagnostics.push(
          diagnostic(
            step.assertionId === undefined && compatible.length > 1
              ? 'STATE_ASSERTION_AMBIGUOUS'
              : 'STATE_ASSERTION_NOT_FOUND',
            {
              ...intentStepLocation(context.intent, index),
              nodeId: step.nodeId,
              state: step.state,
              ...(step.assertionId === undefined
                ? {}
                : { assertionId: step.assertionId }),
            },
            step.assertionId === undefined && compatible.length > 1
              ? {
                  kind: 'choose-state-assertion',
                  assertionIds: compatible.map(({ id }) => id).sort(),
                }
              : {
                  kind: 'select-or-declare-state-assertion',
                  assertionIds: compatible.map(({ id }) => id).sort(),
                },
          ),
        );
        continue;
      }
      if (
        node === undefined ||
        !driverSupports(context.manifest, selected.driver, 'assert-state') ||
        !targetExists(node, selected.locatorTargetRef)
      ) {
        diagnostics.push(
          diagnostic(
            'STATE_ASSERTION_UNSUPPORTED',
            {
              ...intentStepLocation(context.intent, index),
              assertionId: selected.id,
              state: step.state,
            },
            { kind: 'declare-state-assertion-driver', assertionId: selected.id },
          ),
        );
        continue;
      }
      const usageStepId = usageStepIdForNode(context, step.nodeId);
      if (usageStepId === undefined) {
        diagnostics.push(
          diagnostic(
            'STATE_ASSERTION_UNSUPPORTED',
            {
              ...intentStepLocation(context.intent, index),
              assertionId: selected.id,
              state: step.state,
            },
            { kind: 'declare-state-assertion-driver', assertionId: selected.id },
          ),
        );
        continue;
      }
      planSteps.push({
        planStepId: planStepId(index, 'expect-state'),
        origin: { kind: 'intent', intentStepIndexes: [index] },
        evidenceRefs: [selected.id],
        op: 'expect-state',
        assertion: {
          nodeId: step.nodeId,
          stepId: usageStepId,
          assertionRef: { id: selected.id, version: selected.version },
          state: step.state,
          driver: selected.driver,
          partRef: selected.partRef,
          locatorTargetRef: selected.locatorTargetRef,
        },
      });
      continue;
    }
    if (step.op === 'expectValue') {
      const source = context.slice.authority.valueAssertions.items.find(
        (assertion) =>
          assertion.id === step.assertionId && assertion.nodeId === step.nodeId,
      );
      const node = context.nodes.get(step.nodeId);
      const interaction = interactionFor(context, step.nodeId);
      if (source === undefined || node === undefined || interaction === undefined) {
        diagnostics.push(
          diagnostic(
            'VALUE_ASSERTION_NOT_FOUND',
            {
              ...intentStepLocation(context.intent, index),
              assertionId: step.assertionId,
            },
            { kind: 'declare-value-assertion', assertionId: step.assertionId },
          ),
        );
        continue;
      }
      if (
        !driverSupports(context.manifest, interaction.driver, 'assert-value') ||
        !targetExists(node, source.locatorTargetRef)
      ) {
        diagnostics.push(
          diagnostic(
            'VALUE_ASSERTION_UNSUPPORTED',
            {
              ...intentStepLocation(context.intent, index),
              assertionId: source.id,
            },
            { kind: 'declare-value-assertion-driver', assertionId: source.id },
          ),
        );
        continue;
      }
      if (
        !checkCommittedValueOrdering(
          context,
          source,
          interaction,
          index,
          diagnostics,
        )
      ) {
        continue;
      }
      const value = resolveValue(context, step.value, node, index, diagnostics);
      if (value === undefined) continue;
      planSteps.push({
        planStepId: planStepId(index, 'expect-value'),
        origin: { kind: 'intent', intentStepIndexes: [index] },
        evidenceRefs: [source.id],
        op: 'expect-value',
        binding: bindingFor(interaction, 'assert-value', [
          sourceTarget('control', source.partRef, source.locatorTargetRef),
        ]),
        assertionId: source.id,
        value,
      });
      continue;
    }
    if (step.op === 'expectValidation') {
      const surface = validationSource(context, step.validationId);
      const node = context.nodes.get(step.nodeId);
      const interaction = interactionFor(context, step.nodeId);
      if (
        surface?.nodeId !== step.nodeId ||
        surface.constraintId !== step.constraint
      ) {
        diagnostics.push(
          diagnostic(
            'VALIDATION_NOT_FOUND',
            {
              ...intentStepLocation(context.intent, index),
              validationId: step.validationId,
            },
            { kind: 'declare-validation', validationId: step.validationId },
          ),
        );
        continue;
      }
      if (
        node === undefined ||
        interaction === undefined ||
        !driverSupports(context.manifest, interaction.driver, 'assert-validation') ||
        !targetExists(node, surface.assertion.locatorTargetRef)
      ) {
        diagnostics.push(
          diagnostic(
            'VALIDATION_ASSERTION_UNSUPPORTED',
            {
              ...intentStepLocation(context.intent, index),
              validationId: step.validationId,
            },
            {
              kind: 'declare-validation-assertion',
              validationId: step.validationId,
            },
          ),
        );
        continue;
      }
      planSteps.push({
        planStepId: planStepId(index, 'expect-validation'),
        origin: { kind: 'intent', intentStepIndexes: [index] },
        evidenceRefs: [surface.assertion.id],
        op: 'expect-validation',
        binding: bindingFor(interaction, 'assert-validation', [
          sourceTarget(
            'control',
            surface.assertion.partRef,
            surface.assertion.locatorTargetRef,
          ),
        ]),
        validationId: surface.id,
        constraint: surface.constraintId,
        state: step.state,
        assertionTargetRef: surface.assertion.locatorTargetRef,
      });
      continue;
    }
    diagnostics.push(
      diagnostic(
        step.op === 'invokeUsageAction'
          ? 'USAGE_ACTION_UNSUPPORTED'
          : step.op === 'expectOutcome'
            ? 'OUTCOME_ASSERTION_UNSUPPORTED'
            : 'REPEATER_ITEM_CAPTURE_UNSUPPORTED',
        step.op === 'invokeUsageAction'
          ? { ...intentStepLocation(context.intent, index), actionId: step.actionId }
          : step.op === 'expectOutcome'
            ? { ...intentStepLocation(context.intent, index), outcomeId: step.outcomeId }
            : {
                ...intentStepLocation(context.intent, index),
                nodeId: step.nodeId,
              },
        step.op === 'invokeUsageAction'
          ? { kind: 'declare-action-driver', actionId: step.actionId }
          : step.op === 'expectOutcome'
            ? { kind: 'declare-outcome-assertion', outcomeId: step.outcomeId }
            : { kind: 'declare-repeater-capture', repeaterNodeId: step.nodeId },
      ),
    );
  }
  return deepFreeze({
    schemaVersion: AGENT_CONTEXT_VALIDATED_PLAN_SCHEMA_VERSION,
    semanticPolicyVersion: AGENT_CONTEXT_SEMANTIC_POLICY_VERSION,
    intentHash: computeAgentContextTestIntentHash(context.intent),
    contextRef: context.intent.contextRef,
    caseId: context.intent.case.id,
    steps: planSteps,
  });
}

export function computeAgentContextValidatedPlanHash(input: unknown): Sha256Digest {
  return `sha256:${createHash('sha256')
    .update(canonicalStringify(input))
    .digest('hex')}`;
}

export function computeAgentContextTestIntentHash(input: unknown): Sha256Digest {
  return `sha256:${createHash('sha256')
    .update(canonicalizeAgentContextTestIntent(input))
    .digest('hex')}`;
}

export function validateAgentContextTestIntent(
  input: ValidateAgentContextTestIntentInput,
): ValidateAgentContextTestIntentResult {
  const envelope = parseApiEnvelope(input, 'validation', [
    'intent',
    'dataset',
    'liveOwners',
    'driverRegistryManifest',
  ]);
  const diagnostics: AgentContextIntentDiagnostic[] = [];
  const parsedIntent = parseAgentContextTestIntent(envelope.intent);
  const context = parseContext(
    {
      intent: parsedIntent,
      dataset: envelope.dataset,
      liveOwners: envelope.liveOwners,
      driverRegistryManifest: envelope.driverRegistryManifest,
    },
    diagnostics,
  );
  const warnings: AgentContextIntentWarning[] = [];
  if (context !== undefined) {
    const warning = effectWarning(context);
    if (warning !== undefined) warnings.push(warning);
  }
  const plan = context === undefined ? undefined : buildPlan(context, diagnostics);
  const blockers = diagnostics.filter(
    (candidate): candidate is AgentContextIntentBlockingDiagnostic =>
      candidate.blocking,
  );
  if (plan === undefined || blockers.length > 0) {
    const effectiveBlockers =
      blockers.length > 0
        ? blockers
        : [
            diagnostic(
              'CONTRACT_CONTEXT_INVALID',
              {
                kind: 'context',
                usageId: parsedIntent.contextRef.selection.usage.usageId,
                aspect: 'intent-validation',
              },
              { kind: 'regenerate-artifacts' },
            ) as AgentContextIntentBlockingDiagnostic,
          ];
    return deepFreeze({
      schemaVersion: AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION,
      status: 'invalid',
      contextRef: parsedIntent.contextRef,
      diagnostics: effectiveBlockers as [
        AgentContextIntentBlockingDiagnostic,
        ...AgentContextIntentBlockingDiagnostic[],
      ],
      warnings,
    });
  }
  return deepFreeze({
    schemaVersion: AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION,
    status: 'valid',
    contextRef: parsedIntent.contextRef,
    planHash: computeAgentContextValidatedPlanHash(plan),
    plan,
    warnings,
  });
}

function planSemanticallyMatches(
  plan: AgentContextValidatedExecutionPlan,
  dataset: AgentContextQueryDataset,
  manifest: AgentContextDriverRegistryManifest,
): boolean {
  const authority = dataset.executionAuthorities.find(({ reference }) =>
    same(reference, plan.contextRef.selection.owners.executionAuthority),
  )?.artifact;
  const contract = dataset.formContracts.find(({ reference }) =>
    same(reference, plan.contextRef.selection.owners.scenarioArtifact),
  )?.artifact;
  if (authority === undefined || contract === undefined) return false;
  const nodes = new Map<string, ContractNode>();
  const pending = [...contract.nodes];
  while (pending.length > 0) {
    const node = pending.pop()!;
    nodes.set(node.id, node);
    pending.push(...node.children);
    if (node.arrayTemplate !== undefined) pending.push(node.arrayTemplate);
  }
  let currentStepId: string | undefined;
  let lastIntentIndex = -1;
  const planStepIds = new Set<string>();
  for (const step of plan.steps) {
    if (planStepIds.has(step.planStepId)) return false;
    planStepIds.add(step.planStepId);
    const originIndexes =
      step.origin.kind === 'intent'
        ? step.origin.intentStepIndexes
        : step.origin.parentIntentStepIndexes;
    if (
      originIndexes.some(
        (index, position) =>
          (position > 0 && index <= originIndexes[position - 1]!) ||
          index < lastIntentIndex,
      )
    ) return false;
    lastIntentIndex = originIndexes[originIndexes.length - 1]!;
    if (step.op === 'open-usage') {
      if (
        currentStepId !== undefined ||
        step.origin.kind !== 'intent' ||
        !same(step.origin.intentStepIndexes, [0]) ||
        step.planStepId !== planStepId(0, 'open-usage') ||
        !same(step.evidenceRefs, [authority.usage.entry.id]) ||
        step.entryId !== authority.usage.entry.id ||
        step.landingStepId !== authority.usage.entry.landingStepId ||
        !same(step.driver, authority.usage.entry.driver) ||
        !driverSupports(manifest, step.driver, 'open-usage')
      ) return false;
      currentStepId = step.landingStepId;
      continue;
    }
    if (currentStepId === undefined) return false;
    if (step.op === 'expect-state') {
      const source = authority.stateAssertions.find(
        ({ id, version }) =>
          id === step.assertion.assertionRef.id &&
          version === step.assertion.assertionRef.version,
      );
      if (
        source?.nodeId !== step.assertion.nodeId ||
        step.origin.kind !== 'intent' ||
        step.origin.intentStepIndexes.length !== 1 ||
        step.planStepId !==
          planStepId(step.origin.intentStepIndexes[0], 'expect-state') ||
        !same(step.evidenceRefs, [source?.id]) ||
        step.assertion.stepId !== currentStepId ||
        !source.states.includes(step.assertion.state) ||
        !same(source.driver, step.assertion.driver) ||
        source.partRef !== step.assertion.partRef ||
        source.locatorTargetRef !== step.assertion.locatorTargetRef ||
        !driverSupports(manifest, step.assertion.driver, 'assert-state')
      ) return false;
      continue;
    }
    const contractNode = nodes.get(step.binding.nodeId);
    if (
      contractNode === undefined ||
      step.binding.stepId !== currentStepId ||
      step.binding.itemContext !== undefined
    ) {
      return false;
    }
    const interaction = authority.interactions.find(
      ({ nodeId, stepId, profile, driver }) =>
        nodeId === step.binding.nodeId &&
        stepId === step.binding.stepId &&
        same(profile, step.binding.profile) &&
        same(driver, step.binding.driver),
    );
    if (interaction === undefined) return false;
    if (step.op === 'set-value') {
      const commit = authority.commits.find(({ id }) => id === step.commit.commitId);
      if (
        step.origin.kind !== 'intent' ||
        step.origin.intentStepIndexes.length !== 1 ||
        step.planStepId !==
          planStepId(step.origin.intentStepIndexes[0], 'set') ||
        !same(step.evidenceRefs, [interaction.id]) ||
        step.binding.operations.length !== 1 ||
        step.binding.operations[0] !== interaction.operation ||
        !same(step.binding.targets, interaction.targets) ||
        !driverSupports(manifest, step.binding.driver, interaction.operation) ||
        step.physicalOperationId !== interaction.id ||
        step.validationActivations.length !== 0 ||
        commit?.interactionId !== interaction.id ||
        !canonicalPlanValueIsAuthorized(contractNode, step.value)
      ) return false;
      if (step.commit.kind === 'included-in-set') {
        if (
          commit?.kind !== 'node-local' ||
          commit.execution !== 'included-in-set' ||
          commit.mode !== step.commit.mode ||
          step.commit.physicalOperationId !== interaction.id
        ) return false;
      } else if (step.commit.kind === 'node-operation') {
        const commitPlanStepId = step.commit.planStepId;
        if (
          commit?.kind !== 'node-local' ||
          commit.execution !== 'explicit-intent' ||
          commit.mode !== step.commit.mode ||
          commit.physicalOperationId !== step.commit.physicalOperationId ||
          !plan.steps.some(
            (candidate) =>
              candidate.planStepId === commitPlanStepId &&
              candidate.op === 'perform-node-operation' &&
              candidate.physicalOperationId === commit.physicalOperationId &&
              candidate.authorities.some(
                (approved) =>
                  approved.kind === 'value-commit' &&
                  approved.commitId === commit.id,
              ),
          )
        ) return false;
      } else {
        return false;
      }
      continue;
    }
    if (step.op === 'wait-readiness') {
      const readiness = authority.readiness.find(({ id }) => id === step.readinessId);
      const readinessIndex = interaction.readinessIds.indexOf(step.readinessId);
      const targetPurpose = interaction.targets.find(
        ({ locatorTargetRef }) =>
          locatorTargetRef === readiness?.locatorTargetRef,
      )?.purpose ?? 'control';
      if (
        readiness?.nodeId !== step.binding.nodeId ||
        readiness.owner.kind !== 'interaction' ||
        readiness.owner.interactionId !== interaction.id ||
        readinessIndex < 0 ||
        step.origin.kind !== 'declared-expansion' ||
        step.origin.parentIntentStepIndexes.length !== 1 ||
        step.origin.prerequisiteRef !== readiness.id ||
        step.planStepId !==
          planStepId(
            step.origin.parentIntentStepIndexes[0],
            `readiness.${readinessIndex}`,
          ) ||
        !same(step.evidenceRefs, [readiness.id]) ||
        !same(readiness.driver, step.binding.driver) ||
        !same(step.binding.operations, ['wait-readiness']) ||
        !same(step.binding.targets, [
          sourceTarget(
            targetPurpose,
            readiness.partRef,
            readiness.locatorTargetRef,
          ),
        ]) ||
        !driverSupports(manifest, step.binding.driver, 'wait-readiness')
      ) return false;
      continue;
    }
    if (step.op === 'perform-node-operation') {
      const physical = authority.physicalOperations.find(
        ({ id }) => id === step.physicalOperationId,
      );
      if (
        physical?.nodeId !== step.binding.nodeId ||
        step.origin.kind !== 'intent' ||
        step.origin.intentStepIndexes.length !== step.authorities.length ||
        step.origin.intentStepIndexes.length > 2 ||
        (step.origin.intentStepIndexes.length === 2 &&
          (step.origin.intentStepIndexes[1] !==
            step.origin.intentStepIndexes[0] + 1 ||
            step.authorities[0]?.kind !== 'value-commit' ||
            step.authorities[1]?.kind !== 'validation-activation')) ||
        step.planStepId !==
          planStepId(step.origin.intentStepIndexes[0], 'node-operation') ||
        !same(step.evidenceRefs, [physical?.id]) ||
        physical.mechanic !== step.mechanic ||
        physical.partRef !== step.partRef ||
        physical.locatorTargetRef !== step.locatorTargetRef
      ) return false;
      const operations: AgentContextDriverCapability[] = [];
      const authorityKeys = new Set<string>();
      for (const approved of step.authorities) {
        const authorityKey = canonicalStringify(approved);
        if (authorityKeys.has(authorityKey)) return false;
        authorityKeys.add(authorityKey);
        if (approved.kind === 'value-commit') {
          const commit = authority.commits.find(
            ({ id }) => id === approved.commitId,
          );
          if (
            commit?.kind !== 'node-local' ||
            commit.execution !== 'explicit-intent' ||
            commit.nodeId !== physical.nodeId ||
            commit.interactionId !== interaction.id ||
            commit.physicalOperationId !== physical.id
          ) return false;
          operations.push('commit-value');
          continue;
        }
        const surface = authority.validationSurfaces.find(
          ({ id }) => id === approved.validationId,
        );
        if (
          surface?.nodeId !== physical.nodeId ||
          surface.activation.kind !== 'node-local' ||
          surface.activation.id !== approved.activationId ||
          surface.activation.physicalOperationId !== physical.id
        ) return false;
        operations.push('activate-validation');
      }
      if (
        !same(step.binding.operations, operations) ||
        !same(step.binding.targets, [
          sourceTarget('control', physical.partRef, physical.locatorTargetRef),
        ]) ||
        operations.some(
          (operation) =>
            !driverSupports(manifest, step.binding.driver, operation),
        )
      ) return false;
      continue;
    }
    if (step.op === 'expect-value') {
      const assertion = authority.valueAssertions.find(
        ({ id }) => id === step.assertionId,
      );
      if (
        assertion?.nodeId !== step.binding.nodeId ||
        step.origin.kind !== 'intent' ||
        step.origin.intentStepIndexes.length !== 1 ||
        step.planStepId !==
          planStepId(step.origin.intentStepIndexes[0], 'expect-value') ||
        !same(step.evidenceRefs, [assertion?.id]) ||
        assertion.locatorTargetRef !== step.binding.targets[0].locatorTargetRef ||
        !same(step.binding.operations, ['assert-value']) ||
        !same(step.binding.targets, [
          sourceTarget(
            'control',
            assertion.partRef,
            assertion.locatorTargetRef,
          ),
        ]) ||
        !driverSupports(manifest, step.binding.driver, 'assert-value') ||
        !canonicalPlanValueIsAuthorized(contractNode, step.value)
      ) return false;
      continue;
    }
    const surface = authority.validationSurfaces.find(
      ({ id }) => id === step.validationId,
    );
    if (
      surface?.nodeId !== step.binding.nodeId ||
      step.origin.kind !== 'intent' ||
      step.origin.intentStepIndexes.length !== 1 ||
      step.planStepId !==
        planStepId(step.origin.intentStepIndexes[0], 'expect-validation') ||
      !same(step.evidenceRefs, [surface?.assertion.id]) ||
      surface.constraintId !== step.constraint ||
      surface.assertion.locatorTargetRef !== step.assertionTargetRef ||
      !same(step.binding.operations, ['assert-validation']) ||
      !same(step.binding.targets, [
        sourceTarget(
          'control',
          surface.assertion.partRef,
          surface.assertion.locatorTargetRef,
        ),
      ]) ||
      !driverSupports(manifest, step.binding.driver, 'assert-validation')
    ) return false;
  }
  return currentStepId !== undefined;
}

function planDiagnostic(code: 'CONTEXT_MISMATCH' | 'PLAN_HASH_MISMATCH' | 'PLAN_SEMANTIC_INVALID') {
  return diagnostic(code, { kind: 'plan' }, { kind: 'revalidate-intent' }) as AgentContextIntentBlockingDiagnostic;
}

type PlanDataRecord = Readonly<Record<string, unknown>>;

const PLAN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-/]*$/u;
const PLAN_SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MAX_PLAN_GRAPH_DEPTH = 128;
const MAX_PLAN_GRAPH_NODES = 100_000;
const MAX_PLAN_COLLECTION_SIZE = 10_000;

function planFail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function preflightPlanDataGraph(input: unknown, path: string): void {
  type Frame =
    | {
        readonly kind: 'visit';
        readonly value: unknown;
        readonly path: string;
        readonly depth: number;
      }
    | { readonly kind: 'leave'; readonly value: object };
  const frames: Frame[] = [
    { kind: 'visit', value: input, path, depth: 0 },
  ];
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
      ((valueType === 'object' && frame.value !== null) ||
        valueType === 'function') &&
      utilTypes.isProxy(frame.value)
    ) {
      planFail(frame.path, 'must not be a proxy.');
    }
    if (valueType !== 'object' || frame.value === null) continue;
    const objectValue = frame.value as object;
    if (ancestors.has(objectValue)) {
      planFail(frame.path, 'must not contain a cycle.');
    }
    ancestors.add(objectValue);
    frames.push({ kind: 'leave', value: objectValue });
    const isArray = Array.isArray(objectValue);
    const descriptors = Object.getOwnPropertyDescriptors(objectValue);
    for (const key of Reflect.ownKeys(objectValue)) {
      if (typeof key === 'symbol') {
        planFail(frame.path, 'must not contain symbol keys.');
      }
      if (isArray && key === 'length') continue;
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor)
      ) {
        planFail(`${frame.path}.${key}`, 'must be an enumerable data property.');
      }
      const childDepth = frame.depth + 1;
      if (childDepth > MAX_PLAN_GRAPH_DEPTH) {
        planFail(frame.path, 'is too deeply nested.');
      }
      nodeCount += 1;
      if (nodeCount > MAX_PLAN_GRAPH_NODES) {
        planFail(frame.path, 'is too large.');
      }
      frames.push({
        kind: 'visit',
        value: descriptor.value,
        path: isArray ? `${frame.path}[${key}]` : `${frame.path}.${key}`,
        depth: childDepth,
      });
    }
  }
}

function planRecord(input: unknown, path: string): PlanDataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    planFail(path, 'must be an object.');
  }
  return input as PlanDataRecord;
}

function planExactKeys(
  input: PlanDataRecord,
  path: string,
  keys: readonly string[],
): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) planFail(`${path}.${key}`, 'is not allowed.');
  }
  for (const key of keys) {
    if (!Object.hasOwn(input, key)) planFail(`${path}.${key}`, 'is required.');
  }
}

function planKeys(
  input: PlanDataRecord,
  path: string,
  required: readonly string[],
  optional: readonly string[],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) planFail(`${path}.${key}`, 'is not allowed.');
  }
  for (const key of required) {
    if (!Object.hasOwn(input, key)) planFail(`${path}.${key}`, 'is required.');
  }
}

function planArray(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) planFail(path, 'must be an array.');
  if (input.length > MAX_PLAN_COLLECTION_SIZE) {
    planFail(
      path,
      `must contain at most ${MAX_PLAN_COLLECTION_SIZE} items.`,
    );
  }
  return input;
}

function planText(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > 4_096
  ) {
    planFail(path, 'must be a non-empty string of at most 4096 characters.');
  }
  return input;
}

function planId(input: unknown, path: string): string {
  const value = planText(input, path);
  if (value.length > 256 || !PLAN_ID_PATTERN.test(value)) {
    planFail(path, 'must be a contract-stable identifier.');
  }
  return value;
}

function planSha256(input: unknown, path: string): Sha256Digest {
  if (typeof input !== 'string' || !PLAN_SHA256_PATTERN.test(input)) {
    planFail(path, 'must be a lowercase sha256 digest.');
  }
  return input as Sha256Digest;
}

function planVersion(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || (input as number) < 1) {
    planFail(path, 'must be a positive safe integer.');
  }
  return input as number;
}

function planIndex(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || (input as number) < 0) {
    planFail(path, 'must be a non-negative safe integer.');
  }
  return input as number;
}

function planEnum<const Values extends readonly string[]>(
  input: unknown,
  path: string,
  values: Values,
): Values[number] {
  if (typeof input !== 'string' || !values.includes(input)) {
    planFail(path, `must be one of ${values.join(', ')}.`);
  }
  return input;
}

function parsePlanDriver(
  input: unknown,
  path: string,
): AgentContextDriverReference {
  const value = planRecord(input, path);
  planExactKeys(value, path, ['kind', 'id', 'version']);
  return {
    kind: planEnum(value.kind, `${path}.kind`, [
      'generic',
      'application',
    ] as const),
    id: planId(value.id, `${path}.id`),
    version: planVersion(value.version, `${path}.version`),
  };
}

function parsePlanTarget(
  input: unknown,
  path: string,
): AgentContextInteractionTarget {
  const value = planRecord(input, path);
  planExactKeys(value, path, ['purpose', 'partRef', 'locatorTargetRef']);
  return {
    purpose: planEnum(value.purpose, `${path}.purpose`, [
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
    ] as const),
    partRef: planId(value.partRef, `${path}.partRef`),
    locatorTargetRef: planId(
      value.locatorTargetRef,
      `${path}.locatorTargetRef`,
    ),
  };
}

function parseApprovedItemContext(
  input: unknown,
  path: string,
): AgentContextApprovedItemContext {
  const value = planRecord(input, path);
  const kind = planEnum(value.kind, `${path}.kind`, [
    'existing-index',
    'created-item',
  ] as const);
  if (kind === 'existing-index') {
    planExactKeys(value, path, ['kind', 'repeaterNodeId', 'index']);
    return {
      kind,
      repeaterNodeId: planId(
        value.repeaterNodeId,
        `${path}.repeaterNodeId`,
      ),
      index: planIndex(value.index, `${path}.index`),
    };
  }
  planExactKeys(value, path, [
    'kind',
    'repeaterNodeId',
    'itemContextId',
    'establishedByPlanStepId',
  ]);
  return {
    kind,
    repeaterNodeId: planId(value.repeaterNodeId, `${path}.repeaterNodeId`),
    itemContextId: planId(value.itemContextId, `${path}.itemContextId`),
    establishedByPlanStepId: planId(
      value.establishedByPlanStepId,
      `${path}.establishedByPlanStepId`,
    ),
  };
}

function parsePlanBinding(
  input: unknown,
  path: string,
): AgentContextApprovedNodeBinding {
  const value = planRecord(input, path);
  planKeys(
    value,
    path,
    ['nodeId', 'stepId', 'profile', 'driver', 'operations', 'targets'],
    ['itemContext'],
  );
  const profile = planRecord(value.profile, `${path}.profile`);
  planExactKeys(profile, `${path}.profile`, ['id', 'version']);
  const operations = planArray(value.operations, `${path}.operations`).map(
    (operation, index) =>
      planEnum(
        operation,
        `${path}.operations[${index}]`,
        AGENT_CONTEXT_DRIVER_CAPABILITIES,
      ),
  );
  const targets = planArray(value.targets, `${path}.targets`).map(
    (target, index) => parsePlanTarget(target, `${path}.targets[${index}]`),
  );
  if (operations.length === 0) planFail(`${path}.operations`, 'must not be empty.');
  if (targets.length === 0) planFail(`${path}.targets`, 'must not be empty.');
  if (new Set(operations).size !== operations.length) {
    planFail(`${path}.operations`, 'must not contain duplicates.');
  }
  return {
    nodeId: planId(value.nodeId, `${path}.nodeId`),
    stepId: planId(value.stepId, `${path}.stepId`),
    profile: {
      id: planId(profile.id, `${path}.profile.id`),
      version: planVersion(profile.version, `${path}.profile.version`),
    },
    driver: parsePlanDriver(value.driver, `${path}.driver`),
    operations: operations as [
      AgentContextDriverCapability,
      ...AgentContextDriverCapability[],
    ],
    targets: targets as [
      AgentContextInteractionTarget,
      ...AgentContextInteractionTarget[],
    ],
    ...(value.itemContext === undefined
      ? {}
      : {
          itemContext: parseApprovedItemContext(
            value.itemContext,
            `${path}.itemContext`,
          ),
        }),
  };
}

function parsePlanOrigin(
  input: unknown,
  path: string,
): AgentContextValidatedPlanStepOrigin {
  const value = planRecord(input, path);
  const kind = planEnum(value.kind, `${path}.kind`, [
    'intent',
    'declared-expansion',
  ] as const);
  if (kind === 'intent') {
    planExactKeys(value, path, ['kind', 'intentStepIndexes']);
    const indexes = planArray(
      value.intentStepIndexes,
      `${path}.intentStepIndexes`,
    ).map((entry, index) =>
      planIndex(entry, `${path}.intentStepIndexes[${index}]`),
    );
    if (indexes.length === 0) {
      planFail(`${path}.intentStepIndexes`, 'must not be empty.');
    }
    return {
      kind,
      intentStepIndexes: indexes as [number, ...number[]],
    };
  }
  planExactKeys(value, path, [
    'kind',
    'parentIntentStepIndexes',
    'prerequisiteRef',
  ]);
  const indexes = planArray(
    value.parentIntentStepIndexes,
    `${path}.parentIntentStepIndexes`,
  ).map((entry, index) =>
    planIndex(entry, `${path}.parentIntentStepIndexes[${index}]`),
  );
  if (indexes.length === 0) {
    planFail(`${path}.parentIntentStepIndexes`, 'must not be empty.');
  }
  return {
    kind,
    parentIntentStepIndexes: indexes as [number, ...number[]],
    prerequisiteRef: planId(value.prerequisiteRef, `${path}.prerequisiteRef`),
  };
}

function parseResolvedPlanValue(
  input: unknown,
  path: string,
): AgentContextResolvedPlanValue {
  const value = planRecord(input, path);
  planExactKeys(value, path, ['kind', 'value', 'authorization']);
  if (value.kind !== 'canonical') {
    planFail(`${path}.kind`, 'must equal canonical.');
  }
  const authorization = planRecord(
    value.authorization,
    `${path}.authorization`,
  );
  const authorizationKind = planEnum(
    authorization.kind,
    `${path}.authorization.kind`,
    ['domain-value', 'literal'] as const,
  );
  if (authorizationKind === 'domain-value') {
    planExactKeys(authorization, `${path}.authorization`, ['kind']);
    return {
      kind: 'canonical',
      value: value.value as JsonValue,
      authorization: { kind: 'domain-value' },
    };
  }
  planExactKeys(authorization, `${path}.authorization`, [
    'kind',
    'expectedClassification',
  ]);
  return {
    kind: 'canonical',
    value: value.value as JsonValue,
    authorization: {
      kind: 'literal',
      expectedClassification: planEnum(
        authorization.expectedClassification,
        `${path}.authorization.expectedClassification`,
        ['valid', 'invalid'] as const,
      ),
    },
  };
}

function parsePlanCommit(
  input: unknown,
  path: string,
): AgentContextApprovedCommitResolution {
  const value = planRecord(input, path);
  const kind = planEnum(value.kind, `${path}.kind`, [
    'included-in-set',
    'node-operation',
    'usage-action',
  ] as const);
  if (kind === 'included-in-set') {
    planExactKeys(value, path, [
      'kind',
      'commitId',
      'mode',
      'physicalOperationId',
    ]);
    return {
      kind,
      commitId: planId(value.commitId, `${path}.commitId`),
      mode: planEnum(value.mode, `${path}.mode`, ['immediate', 'blur'] as const),
      physicalOperationId: planId(
        value.physicalOperationId,
        `${path}.physicalOperationId`,
      ),
    };
  }
  if (kind === 'node-operation') {
    planExactKeys(value, path, [
      'kind',
      'commitId',
      'mode',
      'physicalOperationId',
      'planStepId',
    ]);
    if (value.mode !== 'blur') planFail(`${path}.mode`, 'must equal blur.');
    return {
      kind,
      commitId: planId(value.commitId, `${path}.commitId`),
      mode: 'blur',
      physicalOperationId: planId(
        value.physicalOperationId,
        `${path}.physicalOperationId`,
      ),
      planStepId: planId(value.planStepId, `${path}.planStepId`),
    };
  }
  planExactKeys(value, path, [
    'kind',
    'commitId',
    'actionId',
    'physicalOperationId',
    'planStepId',
  ]);
  return {
    kind,
    commitId: planId(value.commitId, `${path}.commitId`),
    actionId: planId(value.actionId, `${path}.actionId`),
    physicalOperationId: planId(
      value.physicalOperationId,
      `${path}.physicalOperationId`,
    ),
    planStepId: planId(value.planStepId, `${path}.planStepId`),
  };
}

function parsePlanStep(
  input: unknown,
  path: string,
): AgentContextValidatedExecutionStep {
  const value = planRecord(input, path);
  const op = planEnum(value.op, `${path}.op`, [
    'open-usage',
    'wait-readiness',
    'set-value',
    'perform-node-operation',
    'expect-state',
    'expect-value',
    'expect-validation',
  ] as const);
  const baseKeys = ['planStepId', 'origin', 'evidenceRefs', 'op'] as const;
  const base = {
    planStepId: planId(value.planStepId, `${path}.planStepId`),
    origin: parsePlanOrigin(value.origin, `${path}.origin`),
    evidenceRefs: planArray(value.evidenceRefs, `${path}.evidenceRefs`).map(
      (entry, index) => planText(entry, `${path}.evidenceRefs[${index}]`),
    ),
  };
  if (op === 'open-usage') {
    planExactKeys(value, path, [...baseKeys, 'entryId', 'landingStepId', 'driver']);
    const driver = parsePlanDriver(value.driver, `${path}.driver`);
    if (driver.kind !== 'application') {
      planFail(`${path}.driver.kind`, 'must equal application.');
    }
    return {
      ...base,
      op,
      entryId: planId(value.entryId, `${path}.entryId`),
      landingStepId: planId(value.landingStepId, `${path}.landingStepId`),
      driver: { ...driver, kind: 'application' },
    };
  }
  if (op === 'wait-readiness') {
    planExactKeys(value, path, [...baseKeys, 'binding', 'readinessId']);
    return {
      ...base,
      op,
      binding: parsePlanBinding(value.binding, `${path}.binding`),
      readinessId: planId(value.readinessId, `${path}.readinessId`),
    };
  }
  if (op === 'set-value') {
    planExactKeys(value, path, [
      ...baseKeys,
      'binding',
      'physicalOperationId',
      'value',
      'commit',
      'validationActivations',
    ]);
    const validationActivations = planArray(
      value.validationActivations,
      `${path}.validationActivations`,
    ).map((activation, index) => {
      const activationPath = `${path}.validationActivations[${index}]`;
      const candidate = planRecord(activation, activationPath);
      planExactKeys(candidate, activationPath, ['validationId', 'activationId']);
      return {
        validationId: planId(
          candidate.validationId,
          `${activationPath}.validationId`,
        ),
        activationId: planId(
          candidate.activationId,
          `${activationPath}.activationId`,
        ),
      };
    });
    return {
      ...base,
      op,
      binding: parsePlanBinding(value.binding, `${path}.binding`),
      physicalOperationId: planId(
        value.physicalOperationId,
        `${path}.physicalOperationId`,
      ),
      value: parseResolvedPlanValue(value.value, `${path}.value`),
      commit: parsePlanCommit(value.commit, `${path}.commit`),
      validationActivations,
    };
  }
  if (op === 'perform-node-operation') {
    planExactKeys(value, path, [
      ...baseKeys,
      'binding',
      'physicalOperationId',
      'mechanic',
      'partRef',
      'locatorTargetRef',
      'authorities',
    ]);
    const authorities = planArray(value.authorities, `${path}.authorities`).map(
      (authority, index): AgentContextApprovedNodeOperationAuthority => {
        const authorityPath = `${path}.authorities[${index}]`;
        const candidate = planRecord(authority, authorityPath);
        const kind = planEnum(candidate.kind, `${authorityPath}.kind`, [
          'value-commit',
          'validation-activation',
        ] as const);
        if (kind === 'value-commit') {
          planExactKeys(candidate, authorityPath, ['kind', 'commitId']);
          return {
            kind,
            commitId: planId(candidate.commitId, `${authorityPath}.commitId`),
          };
        }
        planExactKeys(candidate, authorityPath, [
          'kind',
          'validationId',
          'activationId',
        ]);
        return {
          kind,
          validationId: planId(
            candidate.validationId,
            `${authorityPath}.validationId`,
          ),
          activationId: planId(
            candidate.activationId,
            `${authorityPath}.activationId`,
          ),
        };
      },
    );
    if (authorities.length === 0) {
      planFail(`${path}.authorities`, 'must not be empty.');
    }
    return {
      ...base,
      op,
      binding: parsePlanBinding(value.binding, `${path}.binding`),
      physicalOperationId: planId(
        value.physicalOperationId,
        `${path}.physicalOperationId`,
      ),
      mechanic: planEnum(value.mechanic, `${path}.mechanic`, [
        'blur',
        'click',
        'check',
      ] as const),
      partRef: planId(value.partRef, `${path}.partRef`),
      locatorTargetRef: planId(
        value.locatorTargetRef,
        `${path}.locatorTargetRef`,
      ),
      authorities: authorities as [
        AgentContextApprovedNodeOperationAuthority,
        ...AgentContextApprovedNodeOperationAuthority[],
      ],
    };
  }
  if (op === 'expect-state') {
    planExactKeys(value, path, [...baseKeys, 'assertion']);
    const assertionPath = `${path}.assertion`;
    const assertion = planRecord(value.assertion, assertionPath);
    planExactKeys(assertion, assertionPath, [
      'nodeId',
      'stepId',
      'assertionRef',
      'state',
      'driver',
      'partRef',
      'locatorTargetRef',
    ]);
    const assertionRef = planRecord(
      assertion.assertionRef,
      `${assertionPath}.assertionRef`,
    );
    planExactKeys(assertionRef, `${assertionPath}.assertionRef`, [
      'id',
      'version',
    ]);
    return {
      ...base,
      op,
      assertion: {
        nodeId: planId(assertion.nodeId, `${assertionPath}.nodeId`),
        stepId: planId(assertion.stepId, `${assertionPath}.stepId`),
        assertionRef: {
          id: planId(assertionRef.id, `${assertionPath}.assertionRef.id`),
          version: planVersion(
            assertionRef.version,
            `${assertionPath}.assertionRef.version`,
          ),
        },
        state: planEnum(assertion.state, `${assertionPath}.state`, [
          'visible',
          'hidden',
          'enabled',
          'disabled',
          'valid',
          'invalid',
        ] as const),
        driver: parsePlanDriver(assertion.driver, `${assertionPath}.driver`),
        partRef: planId(assertion.partRef, `${assertionPath}.partRef`),
        locatorTargetRef: planId(
          assertion.locatorTargetRef,
          `${assertionPath}.locatorTargetRef`,
        ),
      },
    };
  }
  if (op === 'expect-value') {
    planExactKeys(value, path, [
      ...baseKeys,
      'binding',
      'assertionId',
      'value',
    ]);
    return {
      ...base,
      op,
      binding: parsePlanBinding(value.binding, `${path}.binding`),
      assertionId: planId(value.assertionId, `${path}.assertionId`),
      value: parseResolvedPlanValue(value.value, `${path}.value`),
    };
  }
  planExactKeys(value, path, [
    ...baseKeys,
    'binding',
    'validationId',
    'constraint',
    'state',
    'assertionTargetRef',
  ]);
  return {
    ...base,
    op,
    binding: parsePlanBinding(value.binding, `${path}.binding`),
    validationId: planId(value.validationId, `${path}.validationId`),
    constraint: planId(value.constraint, `${path}.constraint`),
    state: planEnum(value.state, `${path}.state`, [
      'present',
      'absent',
    ] as const),
    assertionTargetRef: planId(
      value.assertionTargetRef,
      `${path}.assertionTargetRef`,
    ),
  };
}

export function parseAgentContextValidatedExecutionPlan(
  input: unknown,
): AgentContextValidatedExecutionPlan {
  const path = 'agentContextValidatedExecutionPlan';
  preflightPlanDataGraph(input, path);
  const clone = JSON.parse(canonicalStringify(input)) as unknown;
  const value = planRecord(clone, path);
  planExactKeys(value, path, [
    'schemaVersion',
    'semanticPolicyVersion',
    'intentHash',
    'contextRef',
    'caseId',
    'steps',
  ]);
  if (value.schemaVersion !== AGENT_CONTEXT_VALIDATED_PLAN_SCHEMA_VERSION) {
    planFail(
      `${path}.schemaVersion`,
      `must equal ${AGENT_CONTEXT_VALIDATED_PLAN_SCHEMA_VERSION}.`,
    );
  }
  if (value.semanticPolicyVersion !== AGENT_CONTEXT_SEMANTIC_POLICY_VERSION) {
    planFail(
      `${path}.semanticPolicyVersion`,
      `must equal ${AGENT_CONTEXT_SEMANTIC_POLICY_VERSION}.`,
    );
  }
  return deepFreeze({
    schemaVersion: AGENT_CONTEXT_VALIDATED_PLAN_SCHEMA_VERSION,
    semanticPolicyVersion: AGENT_CONTEXT_SEMANTIC_POLICY_VERSION,
    intentHash: planSha256(value.intentHash, `${path}.intentHash`),
    contextRef: parseAgentContextTestIntentContextReference(value.contextRef),
    caseId: planId(value.caseId, `${path}.caseId`),
    steps: planArray(value.steps, `${path}.steps`).map((step, index) =>
      parsePlanStep(step, `${path}.steps[${index}]`),
    ),
  });
}

export function revalidateAgentContextExecutionPlan(
  input: RevalidateAgentContextExecutionPlanInput,
): RevalidateAgentContextExecutionPlanResult {
  let envelope: ApiEnvelope;
  let intent: AgentContextTestIntent;
  let plan: AgentContextValidatedExecutionPlan;
  let suppliedHash: string;
  let suppliedContext: AgentContextTestIntentContextReference;
  try {
    envelope = parseApiEnvelope(input, 'revalidation', [
      'intent',
      'contextRef',
      'plan',
      'planHash',
      'dataset',
      'liveOwners',
      'driverRegistryManifest',
    ]);
    intent = parseAgentContextTestIntent(envelope.intent);
    plan = parseAgentContextValidatedExecutionPlan(envelope.plan);
    suppliedHash = planSha256(envelope.planHash, 'revalidation.planHash');
    suppliedContext = parseAgentContextTestIntentContextReference(
      envelope.contextRef,
    );
  } catch {
    return { status: 'invalid', diagnostics: [planDiagnostic('PLAN_SEMANTIC_INVALID')] };
  }
  const canonicalPlanHash = computeAgentContextValidatedPlanHash(plan);
  if (canonicalPlanHash !== suppliedHash) {
    return { status: 'invalid', diagnostics: [planDiagnostic('PLAN_HASH_MISMATCH')] };
  }
  if (
    !same(suppliedContext, plan.contextRef) ||
    !same(intent.contextRef, plan.contextRef) ||
    intent.case.id !== plan.caseId
  ) {
    return { status: 'invalid', diagnostics: [planDiagnostic('CONTEXT_MISMATCH')] };
  }
  if (computeAgentContextTestIntentHash(intent) !== plan.intentHash) {
    return { status: 'invalid', diagnostics: [planDiagnostic('PLAN_SEMANTIC_INVALID')] };
  }
  try {
    const dataset = parseAgentContextQueryDataset(envelope.dataset);
    const manifest = parseAgentContextDriverRegistryManifest(
      envelope.driverRegistryManifest,
    );
    const replayed = validateAgentContextTestIntent({
      intent,
      dataset: envelope.dataset,
      liveOwners: envelope.liveOwners,
      driverRegistryManifest: envelope.driverRegistryManifest,
    });
    if (
      replayed.status !== 'valid' ||
      replayed.planHash !== canonicalPlanHash ||
      !same(replayed.plan, plan) ||
      !planSemanticallyMatches(plan, dataset, manifest)
    ) {
      return { status: 'invalid', diagnostics: [planDiagnostic('PLAN_SEMANTIC_INVALID')] };
    }
  } catch {
    return { status: 'invalid', diagnostics: [planDiagnostic('PLAN_SEMANTIC_INVALID')] };
  }
  return { status: 'valid', canonicalPlanHash };
}

export function canonicalizeAgentContextValidatedPlan(input: unknown): string {
  return canonicalStringify(parseAgentContextValidatedExecutionPlan(input));
}

export function canonicalizeAgentContextTestIntentForValidation(input: unknown): string {
  return canonicalizeAgentContextTestIntent(input);
}

export type AgentContextValueAssertionSource = AgentContextValueAssertionAuthority;
