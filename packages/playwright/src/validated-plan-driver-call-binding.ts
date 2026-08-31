import {
  parseAgentContextValidatedExecutionPlan,
  revalidateAgentContextExecutionPlan,
  type AgentContextDriverCapability,
  type AgentContextDriverReference,
  type AgentContextIntentBlockingDiagnostic,
  type AgentContextValidatedExecutionStep,
  type RevalidateAgentContextExecutionPlanInput,
  type Sha256Digest,
} from '@formly-contract/schema';

import {
  requireAgentContextDriverImplementationBinding,
  type AgentContextDriverImplementation,
  type AgentContextDriverImplementationBindingIssue,
  type AgentContextDriverImplementationBindingResult,
  type AgentContextDriverResolutionResult,
} from './driver-implementation-registry.js';

export const AGENT_CONTEXT_VALIDATED_PLAN_DRIVER_CALL_SCHEMA_VERSION =
  '0.1.0' as const;

type NonEmptyCapabilities = readonly [
  AgentContextDriverCapability,
  ...AgentContextDriverCapability[],
];

type DriverResolutionRefusalIssue = Extract<
  AgentContextDriverResolutionResult,
  { readonly status: 'refused' }
>['issue'];

export interface AgentContextValidatedPlanDriverCall {
  readonly planStepId: string;
  readonly driver: AgentContextDriverReference;
  readonly requiredCapabilities: NonEmptyCapabilities;
  readonly approvedStep: AgentContextValidatedExecutionStep;
}

export interface AgentContextBoundValidatedPlanDriverCall {
  readonly call: AgentContextValidatedPlanDriverCall;
  readonly implementation: AgentContextDriverImplementation;
}

export interface AgentContextValidatedPlanDriverCallResolutionIssue {
  readonly planStepId: string;
  readonly issue: DriverResolutionRefusalIssue;
}

interface DriverCallBindingBase {
  readonly schemaVersion: typeof AGENT_CONTEXT_VALIDATED_PLAN_DRIVER_CALL_SCHEMA_VERSION;
}

export type AgentContextValidatedPlanDriverCallBindingResult =
  | (DriverCallBindingBase & {
      readonly status: 'bound';
      readonly canonicalPlanHash: Sha256Digest;
      readonly calls: readonly AgentContextBoundValidatedPlanDriverCall[];
    })
  | (DriverCallBindingBase & {
      readonly status: 'invalid-plan';
      readonly diagnostics: readonly [
        AgentContextIntentBlockingDiagnostic,
        ...AgentContextIntentBlockingDiagnostic[],
      ];
    })
  | (DriverCallBindingBase & {
      readonly status: 'refused';
      readonly reason: 'implementation-binding-incompatible';
      readonly canonicalPlanHash: Sha256Digest;
      readonly issues: readonly [
        AgentContextDriverImplementationBindingIssue,
        ...AgentContextDriverImplementationBindingIssue[],
      ];
    })
  | (DriverCallBindingBase & {
      readonly status: 'refused';
      readonly reason: 'implementation-binding-context-mismatch';
      readonly canonicalPlanHash: Sha256Digest;
      readonly planDriverRegistryHash: Sha256Digest;
      readonly boundAllowlistManifestContentHash: Sha256Digest;
    })
  | (DriverCallBindingBase & {
      readonly status: 'refused';
      readonly reason: 'driver-call-resolution-refused';
      readonly canonicalPlanHash: Sha256Digest;
      readonly issues: readonly [
        AgentContextValidatedPlanDriverCallResolutionIssue,
        ...AgentContextValidatedPlanDriverCallResolutionIssue[],
      ];
    });

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalCapabilities(
  values: NonEmptyCapabilities,
): NonEmptyCapabilities {
  const sorted = [...values].sort(compareText);
  return Object.freeze([sorted[0]!, ...sorted.slice(1)]);
}

function driverAndCapabilitiesForStep(
  step: AgentContextValidatedExecutionStep,
): {
  readonly driver: AgentContextDriverReference;
  readonly requiredCapabilities: NonEmptyCapabilities;
} {
  if (step.op === 'open-usage') {
    return {
      driver: step.driver,
      requiredCapabilities: Object.freeze(['open-usage']),
    };
  }
  if (step.op === 'expect-state') {
    return {
      driver: step.assertion.driver,
      requiredCapabilities: Object.freeze(['assert-state']),
    };
  }
  return {
    driver: step.binding.driver,
    requiredCapabilities: canonicalCapabilities(step.binding.operations),
  };
}

function deepFreezeData<T>(input: T, seen = new Set<object>()): T {
  if (typeof input !== 'object' || input === null || seen.has(input)) {
    return input;
  }
  seen.add(input);
  for (const key of Reflect.ownKeys(input)) {
    deepFreezeData((input as Record<PropertyKey, unknown>)[key], seen);
  }
  return Object.freeze(input);
}

function callForStep(
  step: AgentContextValidatedExecutionStep,
): AgentContextValidatedPlanDriverCall {
  const { driver, requiredCapabilities } = driverAndCapabilitiesForStep(step);
  return Object.freeze({
    planStepId: step.planStepId,
    driver: deepFreezeData(driver),
    requiredCapabilities,
    approvedStep: deepFreezeData(step),
  });
}

function freezeBindingIssue(
  issue: AgentContextValidatedPlanDriverCallResolutionIssue,
): AgentContextValidatedPlanDriverCallResolutionIssue {
  return Object.freeze({
    planStepId: issue.planStepId,
    issue: deepFreezeData(issue.issue),
  });
}

/**
 * Revalidates an exact CTX-2 plan, lowers every approved step to one data-only
 * call, and binds each call to its exact trusted implementation. This function
 * never invokes a returned implementation and never emits a partial call batch.
 */
export function bindAgentContextValidatedPlanDriverCalls(
  input: RevalidateAgentContextExecutionPlanInput,
  implementationBinding: AgentContextDriverImplementationBindingResult,
): AgentContextValidatedPlanDriverCallBindingResult {
  const revalidated = revalidateAgentContextExecutionPlan(input);
  if (revalidated.status === 'invalid') {
    return Object.freeze({
      schemaVersion: AGENT_CONTEXT_VALIDATED_PLAN_DRIVER_CALL_SCHEMA_VERSION,
      status: 'invalid-plan',
      diagnostics: deepFreezeData(revalidated.diagnostics),
    });
  }

  const trustedImplementationBinding =
    requireAgentContextDriverImplementationBinding(implementationBinding);

  if (trustedImplementationBinding.status === 'incompatible') {
    return Object.freeze({
      schemaVersion: AGENT_CONTEXT_VALIDATED_PLAN_DRIVER_CALL_SCHEMA_VERSION,
      status: 'refused',
      reason: 'implementation-binding-incompatible',
      canonicalPlanHash: revalidated.canonicalPlanHash,
      issues: deepFreezeData(trustedImplementationBinding.issues),
    });
  }

  const plan = parseAgentContextValidatedExecutionPlan(input.plan);
  if (
    trustedImplementationBinding.allowlistManifestContentHash !==
    plan.contextRef.driverRegistryHash
  ) {
    return Object.freeze({
      schemaVersion: AGENT_CONTEXT_VALIDATED_PLAN_DRIVER_CALL_SCHEMA_VERSION,
      status: 'refused',
      reason: 'implementation-binding-context-mismatch',
      canonicalPlanHash: revalidated.canonicalPlanHash,
      planDriverRegistryHash: plan.contextRef.driverRegistryHash,
      boundAllowlistManifestContentHash:
        trustedImplementationBinding.allowlistManifestContentHash,
    });
  }

  const boundCalls: AgentContextBoundValidatedPlanDriverCall[] = [];
  const resolutionIssues: AgentContextValidatedPlanDriverCallResolutionIssue[] =
    [];
  for (const step of plan.steps) {
    const call = callForStep(step);
    const resolution = trustedImplementationBinding.resolver({
      driver: call.driver,
      requiredCapabilities: call.requiredCapabilities,
    });
    if (resolution.status === 'refused') {
      resolutionIssues.push(
        freezeBindingIssue({
          planStepId: call.planStepId,
          issue: resolution.issue,
        }),
      );
      continue;
    }
    boundCalls.push(
      Object.freeze({
        call,
        implementation: resolution.implementation,
      }),
    );
  }

  const firstResolutionIssue = resolutionIssues[0];
  if (firstResolutionIssue !== undefined) {
    const issues: readonly [
      AgentContextValidatedPlanDriverCallResolutionIssue,
      ...AgentContextValidatedPlanDriverCallResolutionIssue[],
    ] = Object.freeze([
      firstResolutionIssue,
      ...resolutionIssues.slice(1),
    ]);
    return Object.freeze({
      schemaVersion: AGENT_CONTEXT_VALIDATED_PLAN_DRIVER_CALL_SCHEMA_VERSION,
      status: 'refused',
      reason: 'driver-call-resolution-refused',
      canonicalPlanHash: revalidated.canonicalPlanHash,
      issues,
    });
  }

  return Object.freeze({
    schemaVersion: AGENT_CONTEXT_VALIDATED_PLAN_DRIVER_CALL_SCHEMA_VERSION,
    status: 'bound',
    canonicalPlanHash: revalidated.canonicalPlanHash,
    calls: Object.freeze(boundCalls),
  });
}
