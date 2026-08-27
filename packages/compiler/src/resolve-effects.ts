import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  canonicalizeCrossFieldEffectRegistry,
  collectContractConditionIds,
  collectContractNodes,
  contractEffectCycleComponents,
  computeCrossFieldEffectRegistryHash,
  parseCrossFieldEffectRegistry,
  validateContractEffectReferences,
  type ContractCrossFieldEffectRegistryIdentity,
  type ContractDiagnostic,
  type ContractDiagnosticSeverity,
  type ContractEffectAnalysis,
  type ContractEffectAnalysisReason,
  type ContractNode,
  type CrossFieldEffectRegistry,
  type DeclaredCrossFieldEffect,
} from '@formly-contract/schema';

export interface CrossFieldEffectExtractionRegistry {
  readonly schemaVersion: CrossFieldEffectRegistry['schemaVersion'];
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
  readonly registry: CrossFieldEffectRegistry;
}

export interface ResolveCrossFieldEffectsInput {
  readonly formId: string;
  readonly nodes: readonly ContractNode[];
  readonly diagnostics: readonly ContractDiagnostic[];
  readonly registry?: CrossFieldEffectExtractionRegistry;
  readonly cyclePolicy: ContractDiagnosticSeverity;
}

export interface CrossFieldEffectResolution {
  readonly crossFieldEffectRegistry?: ContractCrossFieldEffectRegistryIdentity;
  readonly declaredEffects?: readonly DeclaredCrossFieldEffect[];
  readonly effectAnalysis?: ContractEffectAnalysis;
  readonly diagnostics: readonly ContractDiagnostic[];
}

const OPAQUE_DIAGNOSTIC_CODES = new Set([
  'OPAQUE_FUNCTION',
  'ASYNC_VALUE',
  'UNSUPPORTED_RULE',
]);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

const preparedRegistryBundles = new WeakSet<object>();

function deepFreezeRegistryValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreezeRegistryValue(child);
  }
  return Object.freeze(value);
}

function effectPath(
  formId: string,
  effect: DeclaredCrossFieldEffect,
): readonly string[] {
  return ['crossFieldEffects', formId, effect.identity.id];
}

function diagnostic(
  code: ContractDiagnostic['code'],
  message: string,
  formId: string,
  effect: DeclaredCrossFieldEffect,
  nodeId: string | undefined,
  severity: ContractDiagnosticSeverity = 'error',
): ContractDiagnostic {
  return {
    code,
    severity,
    message,
    evidence: 'declared',
    sourcePath: effectPath(formId, effect),
    ...(nodeId === undefined ? {} : { nodeId }),
  };
}

function validateRegistryBundle(
  bundle: CrossFieldEffectExtractionRegistry,
): {
  readonly registry: CrossFieldEffectRegistry;
  readonly contentHash: string;
} {
  if (typeof bundle !== 'object' || bundle === null || Array.isArray(bundle)) {
    throw new TypeError('crossFieldEffects must be a registry bundle');
  }
  const readDataProperty = (key: keyof CrossFieldEffectExtractionRegistry): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(bundle, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !('value' in descriptor)
    ) {
      throw new TypeError(`crossFieldEffects.${key} must be an own enumerable data property`);
    }
    return descriptor.value;
  };
  const schemaVersion = readDataProperty('schemaVersion');
  const id = readDataProperty('id');
  const version = readDataProperty('version');
  const contentHash = readDataProperty('contentHash');
  const registryValue = readDataProperty('registry');
  if (preparedRegistryBundles.has(bundle)) {
    return {
      registry: registryValue as CrossFieldEffectRegistry,
      contentHash: contentHash as string,
    };
  }
  const registry = parseCrossFieldEffectRegistry(registryValue);
  const normalized = deepFreezeRegistryValue(
    JSON.parse(
      canonicalizeCrossFieldEffectRegistry(registry),
    ) as CrossFieldEffectRegistry,
  );
  const normalizedHash = computeCrossFieldEffectRegistryHash(normalized);
  if (
    schemaVersion !== normalized.schemaVersion ||
    schemaVersion !== CROSS_FIELD_EFFECT_SCHEMA_VERSION ||
    id !== normalized.id ||
    version !== normalized.version ||
    contentHash !== normalizedHash
  ) {
    throw new TypeError(
      'crossFieldEffects must match the canonical registry identity',
    );
  }
  return { registry: normalized, contentHash: normalizedHash };
}

export function prepareCrossFieldEffectExtractionRegistry(
  bundle: CrossFieldEffectExtractionRegistry,
): CrossFieldEffectExtractionRegistry {
  const { registry: normalized, contentHash } = validateRegistryBundle(bundle);
  const prepared = deepFreezeRegistryValue({
    schemaVersion: normalized.schemaVersion,
    id: normalized.id,
    version: normalized.version,
    contentHash,
    registry: normalized,
  });
  preparedRegistryBundles.add(prepared);
  return prepared;
}

function analysisReasons(
  coverage: 'complete' | 'partial' | undefined,
  nodes: readonly ContractNode[],
  diagnostics: readonly ContractDiagnostic[],
  hasInvalidEffect: boolean,
  hasCycle: boolean,
): readonly ContractEffectAnalysisReason[] {
  const reasons = new Set<ContractEffectAnalysisReason>();
  if (coverage === undefined) {
    reasons.add('form-not-declared');
  } else if (coverage === 'partial') {
    reasons.add('declared-partial');
  }
  if (hasInvalidEffect) {
    reasons.add('invalid-declared-effect');
  }
  if (hasCycle) {
    reasons.add('effect-cycle');
  }
  if (
    [...collectContractNodes(nodes).values()].some(
      (node) => node.dynamicRules.length > 0,
    )
  ) {
    reasons.add('opaque-dynamic-rule');
  }
  if (diagnostics.some(({ code }) => OPAQUE_DIAGNOSTIC_CODES.has(code))) {
    reasons.add('opaque-diagnostic');
  }
  return [...reasons].sort(compareText);
}

export function resolveCrossFieldEffects(
  input: ResolveCrossFieldEffectsInput,
): CrossFieldEffectResolution {
  if (input.registry === undefined) {
    return { diagnostics: input.diagnostics };
  }

  const validatedRegistry = validateRegistryBundle(input.registry);
  const registry = validatedRegistry.registry;
  const registryIdentity: ContractCrossFieldEffectRegistryIdentity = {
    schemaVersion: registry.schemaVersion,
    id: registry.id,
    version: registry.version,
    contentHash: validatedRegistry.contentHash,
  };
  const form = registry.forms.find(({ formId }) => formId === input.formId);
  const nodes = collectContractNodes(input.nodes);
  const conditionIds = collectContractConditionIds(input.nodes);
  const effectDiagnostics: ContractDiagnostic[] = [];
  const valid: DeclaredCrossFieldEffect[] = [];

  for (const effect of form?.effects ?? []) {
    let isValid = true;
    const target = nodes.get(effect.target.nodeId);
    const problems = validateContractEffectReferences(effect, nodes, conditionIds);
    if (problems.includes('unknown-source')) {
      effectDiagnostics.push(
        diagnostic(
          'UNKNOWN_EFFECT_SOURCE',
          `Effect source "${effect.trigger.nodeId}" is not a contract node.`,
          input.formId,
          effect,
          effect.trigger.nodeId,
        ),
      );
      isValid = false;
    }
    if (problems.includes('unknown-target')) {
      effectDiagnostics.push(
        diagnostic(
          'UNKNOWN_EFFECT_TARGET',
          `Effect target "${effect.target.nodeId}" is not a contract node.`,
          input.formId,
          effect,
          effect.target.nodeId,
        ),
      );
      isValid = false;
    } else if (problems.includes('unsupported-target')) {
      effectDiagnostics.push(
        diagnostic(
          'UNSUPPORTED_EFFECT_TARGET',
          `Effect target does not support property "${effect.target.property}".`,
          input.formId,
          effect,
          target!.id,
        ),
      );
      isValid = false;
    }

    if (
      effect.timing.mode === 'async' &&
      target !== undefined &&
      problems.includes('unknown-readiness')
    ) {
      const readinessId = effect.timing.readinessId;
      effectDiagnostics.push(
          diagnostic(
            'UNKNOWN_EFFECT_READINESS',
            `Effect readiness "${readinessId}" is not supported by the target property.`,
            input.formId,
            effect,
            target.id,
          ),
      );
      isValid = false;
    }

    if (
      effect.conditionRuleId !== undefined &&
      problems.includes('unknown-condition')
    ) {
      effectDiagnostics.push(
        diagnostic(
          'UNKNOWN_EFFECT_CONDITION',
          `Effect condition "${effect.conditionRuleId}" is not a contract rule.`,
          input.formId,
          effect,
          undefined,
        ),
      );
      isValid = false;
    }
    if (isValid) {
      valid.push(effect);
    }
  }

  const invalidBeforeCycles = (form?.effects.length ?? 0) !== valid.length;
  const invalidCycleEffects = new Set<string>();
  const cycles = contractEffectCycleComponents(valid);
  for (const component of cycles) {
    const members = [...component].sort(compareText);
    for (const effect of valid) {
      if (
        component.has(effect.trigger.nodeId) &&
        component.has(effect.target.nodeId)
      ) {
        effectDiagnostics.push(
          diagnostic(
            'EFFECT_CYCLE',
            `Effect participates in a cycle containing: ${members.join(', ')}.`,
            input.formId,
            effect,
            effect.trigger.nodeId,
            input.cyclePolicy,
          ),
        );
        if (input.cyclePolicy === 'error') {
          invalidCycleEffects.add(effect.identity.id);
        }
      }
    }
  }
  const declaredEffects = valid
    .filter(({ identity }) => !invalidCycleEffects.has(identity.id))
    .sort((left, right) => compareText(left.identity.id, right.identity.id));
  const reasons = analysisReasons(
    form?.coverage,
    input.nodes,
    [...input.diagnostics, ...effectDiagnostics],
    invalidBeforeCycles || invalidCycleEffects.size > 0,
    cycles.length > 0,
  );

  return {
    crossFieldEffectRegistry: registryIdentity,
    declaredEffects,
    effectAnalysis: {
      completeness: reasons.length === 0 ? 'complete' : 'incomplete',
      reasons,
    },
    diagnostics: [
      ...input.diagnostics,
      ...effectDiagnostics.sort((left, right) =>
        compareText(
          `${left.code}:${left.sourcePath.join('/')}:${left.nodeId ?? ''}`,
          `${right.code}:${right.sourcePath.join('/')}:${right.nodeId ?? ''}`,
        ),
      ),
    ],
  };
}
