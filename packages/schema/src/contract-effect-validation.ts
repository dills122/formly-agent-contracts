import type {
  ContractCondition,
  ContractNode,
} from './contract.js';
import type {
  CrossFieldEffectTargetProperty,
  DeclaredCrossFieldEffect,
} from './cross-field-effect.js';

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

const BASE_CONTROL_TARGETS = [
  'enabled',
  'required',
  'value',
  'visibility',
] as const satisfies readonly CrossFieldEffectTargetProperty[];

export function collectContractNodes(
  roots: readonly ContractNode[],
): ReadonlyMap<string, ContractNode> {
  const result = new Map<string, ContractNode>();
  const pending = [...roots].reverse();
  while (pending.length > 0) {
    const node = pending.pop()!;
    result.set(node.id, node);
    if (node.arrayTemplate !== undefined) {
      pending.push(node.arrayTemplate);
    }
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      pending.push(node.children[index]!);
    }
  }
  return result;
}

export function contractNodeTargetCapabilities(
  node: ContractNode,
): ReadonlySet<CrossFieldEffectTargetProperty> {
  const result = new Set<CrossFieldEffectTargetProperty>();
  if (node.kind === 'control') {
    BASE_CONTROL_TARGETS.forEach((property) => result.add(property));
    if (
      node.interactionProfile?.interaction.kind === 'choice' ||
      node.interactionProfile?.interaction.kind === 'autocomplete' ||
      node.interactionProfile?.interaction.kind === 'row-selection' ||
      node.optionSource !== undefined ||
      node.valueDomain?.kind === 'dynamic'
    ) {
      result.add('options');
    }
  } else {
    result.add('visibility');
  }
  node.interactionProfile?.effectCapabilities.targetProperties.forEach(
    (property) => result.add(property),
  );
  return result;
}

export function collectContractConditionIds(
  nodes: readonly ContractNode[],
): ReadonlySet<string> {
  const result = new Set<string>();
  for (const node of collectContractNodes(nodes).values()) {
    node.conditions.forEach(({ id }: ContractCondition) => result.add(id));
  }
  return result;
}

export function contractEffectCycleComponents(
  effects: readonly DeclaredCrossFieldEffect[],
): readonly ReadonlySet<string>[] {
  const adjacencySets = new Map<string, Set<string>>();
  const reverseSets = new Map<string, Set<string>>();
  const nodeIds = new Set<string>();
  for (const effect of effects) {
    nodeIds.add(effect.trigger.nodeId);
    nodeIds.add(effect.target.nodeId);
    const targets =
      adjacencySets.get(effect.trigger.nodeId) ?? new Set<string>();
    targets.add(effect.target.nodeId);
    adjacencySets.set(effect.trigger.nodeId, targets);
    const sources = reverseSets.get(effect.target.nodeId) ?? new Set<string>();
    sources.add(effect.trigger.nodeId);
    reverseSets.set(effect.target.nodeId, sources);
  }

  const sortedNodeIds = [...nodeIds].sort(compareText);
  const adjacency = new Map(
    sortedNodeIds.map((nodeId) => [
      nodeId,
      [...(adjacencySets.get(nodeId) ?? [])].sort(compareText),
    ]),
  );
  const reverse = new Map(
    sortedNodeIds.map((nodeId) => [
      nodeId,
      [...(reverseSets.get(nodeId) ?? [])].sort(compareText),
    ]),
  );

  const visited = new Set<string>();
  const finishOrder: string[] = [];
  for (const start of sortedNodeIds) {
    if (visited.has(start)) {
      continue;
    }
    visited.add(start);
    const stack = [{ nodeId: start, nextTarget: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const targets = adjacency.get(frame.nodeId) ?? [];
      const target = targets[frame.nextTarget];
      if (target === undefined) {
        finishOrder.push(frame.nodeId);
        stack.pop();
        continue;
      }
      frame.nextTarget += 1;
      if (!visited.has(target)) {
        visited.add(target);
        stack.push({ nodeId: target, nextTarget: 0 });
      }
    }
  }

  visited.clear();
  const components: Set<string>[] = [];
  for (let index = finishOrder.length - 1; index >= 0; index -= 1) {
    const start = finishOrder[index]!;
    if (visited.has(start)) {
      continue;
    }
    const component = new Set<string>();
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      component.add(nodeId);
      for (const source of reverse.get(nodeId) ?? []) {
        if (!visited.has(source)) {
          visited.add(source);
          stack.push(source);
        }
      }
    }
    const soleMember = component.size === 1 ? [...component][0]! : undefined;
    const selfCycle =
      soleMember !== undefined &&
      (adjacency.get(soleMember) ?? []).includes(soleMember);
    if (component.size > 1 || selfCycle) {
      components.push(component);
    }
  }
  return components.sort((left, right) =>
    compareText(
      [...left].sort(compareText)[0]!,
      [...right].sort(compareText)[0]!,
    ),
  );
}

export type ContractEffectReferenceProblem =
  | 'unknown-source'
  | 'unknown-target'
  | 'unsupported-target'
  | 'unknown-readiness'
  | 'unknown-condition';

export function validateContractEffectReferences(
  effect: DeclaredCrossFieldEffect,
  nodes: ReadonlyMap<string, ContractNode>,
  conditionIds: ReadonlySet<string>,
): readonly ContractEffectReferenceProblem[] {
  const problems: ContractEffectReferenceProblem[] = [];
  if (!nodes.has(effect.trigger.nodeId)) {
    problems.push('unknown-source');
  }
  const target = nodes.get(effect.target.nodeId);
  if (target === undefined) {
    problems.push('unknown-target');
  } else {
    if (!contractNodeTargetCapabilities(target).has(effect.target.property)) {
      problems.push('unsupported-target');
    }
    if (effect.timing.mode === 'async') {
      const readinessId = effect.timing.readinessId;
      const readiness = target.interactionProfile?.effectCapabilities.readiness.find(
        ({ id }) => id === readinessId,
      );
      if (readiness?.targetProperty !== effect.target.property) {
        problems.push('unknown-readiness');
      }
    }
  }
  if (
    effect.conditionRuleId !== undefined &&
    !conditionIds.has(effect.conditionRuleId)
  ) {
    problems.push('unknown-condition');
  }
  return problems;
}
