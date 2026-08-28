import type { FormlyFieldConfig } from '@ngx-formly/core';
import { isObservable } from 'rxjs';
import ts from 'typescript';

export type EffectKind =
  | 'enabled-state'
  | 'options-state'
  | 'required-state'
  | 'value-state'
  | 'visibility-state';

export type ModelPathSegment = string | number;

export interface DependencySource {
  scope: 'formState' | 'model';
  path: ModelPathSegment[];
}

export interface EffectTarget {
  nodeId: string;
  property: string;
}

export interface EffectEdgeCandidate {
  source: DependencySource;
  target: EffectTarget;
  effectKind: EffectKind;
  evidence: 'controlled-scenario-delta' | 'declared-string-reference';
  authority: 'candidate' | 'dependency-only';
}

export type OpaqueReason =
  | 'computed-source-path'
  | 'descendant-state-propagation-not-modeled'
  | 'dynamic-field-array-out-of-scope'
  | 'field-rooted-reference'
  | 'function-dependencies-opaque'
  | 'handler-invocation-and-effects-opaque'
  | 'model-target-resolution-required'
  | 'nested-function-semantics'
  | 'observable-dependencies-opaque'
  | 'opaque-behavior-surface-out-of-scope'
  | 'opaque-call-semantics'
  | 'source-path-write'
  | 'string-expression-not-javascript'
  | 'string-expression-parse-error'
  | 'unsupported-target-property';

export interface OpaqueEffectSignal {
  declaration: { nodeId: string; property: string };
  trigger: null;
  target: EffectTarget | null;
  effectKind: EffectKind | null;
  evidence:
    | 'declared-function-existence'
    | 'declared-handler-property-existence'
    | 'declared-observable-existence'
    | 'declared-opaque-behavior-existence'
    | 'declared-string-reference';
  reason: OpaqueReason;
}

export interface DeclaredEffectAnalysis {
  edges: EffectEdgeCandidate[];
  unknowns: OpaqueEffectSignal[];
  coverage: 'complete-for-analyzed-surfaces' | 'incomplete';
}

export interface AnalyzableField {
  /** Stable contract node ID supplied by the compiler; never derived here. */
  nodeId: string;
  field: FormlyFieldConfig;
}

export interface ScenarioFieldObservation {
  nodeId: string;
  visible?: boolean;
  enabled?: boolean;
  required?: boolean;
  options?: unknown;
  value?: unknown;
}

export interface ScenarioDeltaUnknown {
  nodeId: string;
  reason:
    | 'duplicate-node-id'
    | 'node-presence-changed'
    | 'non-json-observation'
    | 'property-presence-changed';
}

export interface ScenarioDeltaAnalysis {
  deltas: EffectEdgeCandidate[];
  unknowns: ScenarioDeltaUnknown[];
}

export type EffectTargetProperty =
  | 'enabled'
  | 'options'
  | 'required'
  | 'value'
  | 'visibility';

export interface ExplicitFieldEffect {
  id: string;
  trigger: {
    nodeId: string;
    event: 'selectionChanged' | 'valueChanged';
  };
  target: {
    nodeId: string;
    property: EffectTargetProperty;
  };
  kind: 'clears' | 'controls-state' | 'filters' | 'loads' | 'toggles';
  timing: {
    mode: 'async' | 'sync' | 'unknown';
    readinessId?: string;
  };
  conditionRuleId?: string;
  ordering: 'none' | 'source-before-target';
  evidence: 'declared';
  opacity: 'transparent';
}

export interface EffectGraphValidationContext {
  knownNodeIds: readonly string[];
  targetCapabilities: Readonly<
    Record<string, readonly EffectTargetProperty[]>
  >;
  readinessIds: readonly string[];
}

export interface EffectGraphDiagnostic {
  code:
    | 'ASYNC_READINESS_REQUIRED'
    | 'DUPLICATE_EFFECT_ID'
    | 'EFFECT_CYCLE'
    | 'UNKNOWN_EFFECT_READINESS'
    | 'UNKNOWN_EFFECT_SOURCE'
    | 'UNKNOWN_EFFECT_TARGET'
    | 'UNSUPPORTED_EFFECT_TARGET';
  message: string;
}

interface PartialAccess {
  scope: DependencySource['scope'];
  path: ModelPathSegment[];
  computed: boolean;
}

interface ParsedReferences {
  sources: DependencySource[];
  reasons: OpaqueReason[];
}

function targetEffectKind(property: string): EffectKind | undefined {
  switch (property) {
    case 'hide':
    case 'visible':
    case 'visibility':
      return 'visibility-state';
    case 'enabled':
    case 'props.disabled':
    case 'templateOptions.disabled':
      return 'enabled-state';
    case 'required':
    case 'props.required':
    case 'templateOptions.required':
      return 'required-state';
    case 'options':
    case 'props.options':
    case 'templateOptions.options':
      return 'options-state';
    case 'value':
      return 'value-state';
    default:
      return undefined;
  }
}

function literalElement(
  argument: ts.Expression | undefined,
): ModelPathSegment | undefined {
  if (argument !== undefined && ts.isStringLiteral(argument)) {
    return argument.text;
  }
  if (argument !== undefined && ts.isNumericLiteral(argument)) {
    return Number(argument.text);
  }
  return undefined;
}

function readAccess(node: ts.Expression): PartialAccess | undefined {
  if (ts.isIdentifier(node)) {
    if (node.text === 'model' || node.text === 'formState') {
      return { scope: node.text, path: [], computed: false };
    }
    return undefined;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const base = readAccess(node.expression);
    return base === undefined
      ? undefined
      : { ...base, path: [...base.path, node.name.text] };
  }
  if (ts.isElementAccessExpression(node)) {
    const base = readAccess(node.expression);
    if (base === undefined) {
      return undefined;
    }
    const segment = literalElement(node.argumentExpression);
    return segment === undefined
      ? { ...base, computed: true }
      : { ...base, path: [...base.path, segment] };
  }
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isAsExpression(node)
  ) {
    return readAccess(node.expression);
  }
  return undefined;
}

function containsNamedIdentifier(node: ts.Node, names: Set<string>): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current) && names.has(current.text)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return (
    kind >= ts.SyntaxKind.FirstAssignment &&
    kind <= ts.SyntaxKind.LastAssignment
  );
}

function parseStringReferences(expression: string): ParsedReferences {
  const sourceFile = ts.createSourceFile(
    'field-expression.js',
    `const __fieldEffect = (${expression});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const parseDiagnostics = (
    sourceFile as ts.SourceFile & {
      parseDiagnostics?: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics;
  if ((parseDiagnostics?.length ?? 0) > 0) {
    return { sources: [], reasons: ['string-expression-parse-error'] };
  }

  let typeScriptOnly = false;
  let nestedFunction = false;
  let sourcePathWrite = false;
  let fieldRooted = false;
  let computed = false;
  let opaqueCall = false;

  const preflight = (node: ts.Node): void => {
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      typeScriptOnly = true;
    }
    if (ts.isFunctionLike(node) && !ts.isSourceFile(node)) {
      nestedFunction = true;
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      containsNamedIdentifier(node.expression, new Set(['field']))
    ) {
      fieldRooted = true;
    }
    if (
      ts.isBinaryExpression(node) &&
      isAssignmentOperator(node.operatorToken.kind) &&
      containsNamedIdentifier(node.left, new Set(['model', 'formState']))
    ) {
      sourcePathWrite = true;
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      containsNamedIdentifier(node.operand, new Set(['model', 'formState']))
    ) {
      sourcePathWrite = true;
    }
    if (
      ts.isDeleteExpression(node) &&
      containsNamedIdentifier(node.expression, new Set(['model', 'formState']))
    ) {
      sourcePathWrite = true;
    }
    ts.forEachChild(node, preflight);
  };
  preflight(sourceFile);

  const reasons: OpaqueReason[] = [];
  if (typeScriptOnly) {
    reasons.push('string-expression-not-javascript');
  }
  if (nestedFunction) {
    reasons.push('nested-function-semantics');
  }
  if (sourcePathWrite) {
    reasons.push('source-path-write');
  }
  if (fieldRooted) {
    reasons.push('field-rooted-reference');
  }
  if (typeScriptOnly || nestedFunction || sourcePathWrite) {
    return { sources: [], reasons: [...new Set(reasons)].sort() };
  }

  const sources = new Map<string, DependencySource>();
  const recordAccess = (node: ts.Expression): void => {
    const access = readAccess(node);
    if (access === undefined) {
      return;
    }
    if (access.computed) {
      computed = true;
      return;
    }
    if (access.path.length === 0) {
      return;
    }
    const source = { scope: access.scope, path: access.path };
    sources.set(JSON.stringify([source.scope, source.path]), source);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      if (containsNamedIdentifier(node, new Set(['model', 'formState']))) {
        opaqueCall = true;
      }
      if (ts.isPropertyAccessExpression(node.expression)) {
        recordAccess(node.expression.expression);
      }
      for (const argument of node.arguments) {
        visit(argument);
      }
      return;
    }
    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      !(
        (ts.isPropertyAccessExpression(node.parent) ||
          ts.isElementAccessExpression(node.parent)) &&
        node.parent.expression === node
      )
    ) {
      recordAccess(node);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (computed) {
    reasons.push('computed-source-path');
  }
  if (opaqueCall) {
    reasons.push('opaque-call-semantics');
  }
  return {
    sources: [...sources.values()].sort((left, right) =>
      JSON.stringify([left.scope, left.path]).localeCompare(
        JSON.stringify([right.scope, right.path]),
      ),
    ),
    reasons: [...new Set(reasons)].sort(),
  };
}

function effectiveExpressionMap(field: FormlyFieldConfig): Map<string, unknown> {
  const result = new Map<string, unknown>();
  if (field.hideExpression) {
    result.set('hide', field.hideExpression);
  }
  for (const property of Object.keys(field.expressions ?? {})) {
    result.set(property, field.expressions?.[property]);
  }
  for (const property of Object.keys(field.expressionProperties ?? {})) {
    result.set(property, field.expressionProperties?.[property]);
  }
  return result;
}

function signal(
  nodeId: string,
  property: string,
  reason: OpaqueReason,
  evidence: OpaqueEffectSignal['evidence'],
  target: EffectTarget | null = null,
  effectKind: EffectKind | null = null,
): OpaqueEffectSignal {
  return {
    declaration: { nodeId, property },
    trigger: null,
    target,
    effectKind,
    evidence,
    reason,
  };
}

function hasExecutableBehavior(value: unknown): boolean {
  if (typeof value === 'function' || isObservable(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(hasExecutableBehavior);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(
      hasExecutableBehavior,
    );
  }
  return false;
}

export function analyzeDeclaredFieldEffects(
  entries: readonly AnalyzableField[],
): DeclaredEffectAnalysis {
  const edges: EffectEdgeCandidate[] = [];
  const unknowns: OpaqueEffectSignal[] = [];

  for (const { nodeId, field } of entries) {
    if (typeof field.props?.change === 'function') {
      unknowns.push(
        signal(
          nodeId,
          'props.change',
          'handler-invocation-and-effects-opaque',
          'declared-handler-property-existence',
        ),
      );
    }

    const expressions = effectiveExpressionMap(field);
    for (const property of [...expressions.keys()].sort()) {
      const expression = expressions.get(property);
      if (typeof expression === 'boolean' || expression === undefined) {
        continue;
      }
      if (property.startsWith('model.')) {
        unknowns.push(
          signal(
            nodeId,
            property,
            'model-target-resolution-required',
            typeof expression === 'string'
              ? 'declared-string-reference'
              : 'declared-opaque-behavior-existence',
          ),
        );
        continue;
      }

      const effectKind = targetEffectKind(property);
      const target = effectKind === undefined ? null : { nodeId, property };
      if (effectKind === undefined) {
        unknowns.push(
          signal(
            nodeId,
            property,
            'unsupported-target-property',
            typeof expression === 'string'
              ? 'declared-string-reference'
              : 'declared-opaque-behavior-existence',
          ),
        );
      }

      if (typeof expression === 'function') {
        unknowns.push(
          signal(
            nodeId,
            property,
            'function-dependencies-opaque',
            'declared-function-existence',
            target,
            effectKind ?? null,
          ),
        );
        continue;
      }
      if (isObservable(expression)) {
        unknowns.push(
          signal(
            nodeId,
            property,
            'observable-dependencies-opaque',
            'declared-observable-existence',
            target,
            effectKind ?? null,
          ),
        );
        continue;
      }
      if (typeof expression !== 'string') {
        continue;
      }

      const parsed = parseStringReferences(expression);
      if (effectKind !== undefined) {
        for (const source of parsed.sources) {
          edges.push({
            source,
            target: { nodeId, property },
            effectKind,
            evidence: 'declared-string-reference',
            authority: 'dependency-only',
          });
        }
      }
      for (const reason of parsed.reasons) {
        unknowns.push(
          signal(
            nodeId,
            property,
            reason,
            'declared-string-reference',
            target,
            effectKind ?? null,
          ),
        );
      }

      if (
        field.fieldGroup !== undefined &&
        field.fieldGroup.length > 0 &&
        (property === 'hide' ||
          property === 'props.disabled' ||
          property === 'templateOptions.disabled')
      ) {
        unknowns.push(
          signal(
            nodeId,
            property,
            'descendant-state-propagation-not-modeled',
            'declared-opaque-behavior-existence',
            target,
            effectKind ?? null,
          ),
        );
      }
    }

    if (typeof field.fieldArray === 'function') {
      unknowns.push(
        signal(
          nodeId,
          'fieldArray',
          'dynamic-field-array-out-of-scope',
          'declared-opaque-behavior-existence',
        ),
      );
    }
    if (
      hasExecutableBehavior(field.hooks) ||
      hasExecutableBehavior(field.validators) ||
      hasExecutableBehavior(field.asyncValidators) ||
      hasExecutableBehavior(field.parsers)
    ) {
      unknowns.push(
        signal(
          nodeId,
          'behavior-surfaces',
          'opaque-behavior-surface-out-of-scope',
          'declared-opaque-behavior-existence',
        ),
      );
    }
  }

  edges.sort((left, right) =>
    JSON.stringify([
      left.source.scope,
      left.source.path,
      left.target.nodeId,
      left.target.property,
    ]).localeCompare(
      JSON.stringify([
        right.source.scope,
        right.source.path,
        right.target.nodeId,
        right.target.property,
      ]),
    ),
  );
  unknowns.sort((left, right) =>
    JSON.stringify([
      left.declaration.nodeId,
      left.declaration.property,
      left.reason,
      left.evidence,
    ]).localeCompare(
      JSON.stringify([
        right.declaration.nodeId,
        right.declaration.property,
        right.reason,
        right.evidence,
      ]),
    ),
  );
  return {
    edges,
    unknowns,
    coverage:
      unknowns.length === 0 ? 'complete-for-analyzed-surfaces' : 'incomplete',
  };
}

function canonicalObservation(
  value: unknown,
  seen: Set<object>,
): string | undefined {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `number:${String(value)}` : undefined;
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const values = value.map((item) => canonicalObservation(item, seen));
    seen.delete(value);
    return values.some((item) => item === undefined)
      ? undefined
      : `array:[${values.join(',')}]`;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    seen.delete(value);
    return undefined;
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    seen.delete(value);
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of Object.keys(record).sort()) {
    const item = canonicalObservation(record[key], seen);
    if (item === undefined) {
      seen.delete(value);
      return undefined;
    }
    parts.push(`${JSON.stringify(key)}:${item}`);
  }
  seen.delete(value);
  return `object:{${parts.join(',')}}`;
}

function indexObservations(input: readonly ScenarioFieldObservation[]): {
  values: Map<string, ScenarioFieldObservation>;
  duplicates: Set<string>;
} {
  const values = new Map<string, ScenarioFieldObservation>();
  const duplicates = new Set<string>();
  for (const observation of input) {
    if (values.has(observation.nodeId)) {
      duplicates.add(observation.nodeId);
    } else {
      values.set(observation.nodeId, observation);
    }
  }
  return { values, duplicates };
}

export function observeControlledScenarioDelta(input: {
  changedSource: DependencySource;
  before: readonly ScenarioFieldObservation[];
  after: readonly ScenarioFieldObservation[];
}): ScenarioDeltaAnalysis {
  const before = indexObservations(input.before);
  const after = indexObservations(input.after);
  const duplicateIds = new Set([...before.duplicates, ...after.duplicates]);
  const allIds = new Set([...before.values.keys(), ...after.values.keys()]);
  // `key` reads off ScenarioFieldObservation (which uses Formly's own
  // 'visible' field name); `targetProperty` is what's emitted on
  // EffectEdgeCandidate.target, which must line up with EffectTargetProperty
  // ('visibility', not 'visible') so scenario-derived edges can be matched
  // against declared effect target capabilities.
  const properties = [
    { key: 'enabled', targetProperty: 'enabled' },
    { key: 'options', targetProperty: 'options' },
    { key: 'required', targetProperty: 'required' },
    { key: 'value', targetProperty: 'value' },
    { key: 'visible', targetProperty: 'visibility' },
  ] as const;
  const deltas: EffectEdgeCandidate[] = [];
  const unknowns: ScenarioDeltaUnknown[] = [];

  for (const nodeId of [...allIds].sort()) {
    if (duplicateIds.has(nodeId)) {
      unknowns.push({ nodeId, reason: 'duplicate-node-id' });
      continue;
    }
    const beforeValue = before.values.get(nodeId);
    const afterValue = after.values.get(nodeId);
    if (beforeValue === undefined || afterValue === undefined) {
      unknowns.push({ nodeId, reason: 'node-presence-changed' });
      continue;
    }

    let nodeHasNonJson = false;
    for (const { key, targetProperty } of properties) {
      const beforeHas = Object.prototype.hasOwnProperty.call(
        beforeValue,
        key,
      );
      const afterHas = Object.prototype.hasOwnProperty.call(afterValue, key);
      if (!beforeHas && !afterHas) {
        continue;
      }
      if (beforeHas !== afterHas) {
        unknowns.push({ nodeId, reason: 'property-presence-changed' });
        continue;
      }
      const beforeCanonical = canonicalObservation(
        beforeValue[key],
        new Set(),
      );
      const afterCanonical = canonicalObservation(afterValue[key], new Set());
      if (beforeCanonical === undefined || afterCanonical === undefined) {
        nodeHasNonJson = true;
        continue;
      }
      if (beforeCanonical !== afterCanonical) {
        const effectKind = targetEffectKind(targetProperty);
        if (effectKind !== undefined) {
          deltas.push({
            source: input.changedSource,
            target: { nodeId, property: targetProperty },
            effectKind,
            evidence: 'controlled-scenario-delta',
            authority: 'candidate',
          });
        }
      }
    }
    if (nodeHasNonJson) {
      unknowns.push({ nodeId, reason: 'non-json-observation' });
    }
  }

  const uniqueUnknowns = new Map<string, ScenarioDeltaUnknown>();
  for (const unknown of unknowns) {
    uniqueUnknowns.set(JSON.stringify([unknown.nodeId, unknown.reason]), unknown);
  }
  deltas.sort((left, right) =>
    JSON.stringify([left.target.nodeId, left.target.property]).localeCompare(
      JSON.stringify([right.target.nodeId, right.target.property]),
    ),
  );
  return {
    deltas,
    unknowns: [...uniqueUnknowns.values()].sort((left, right) =>
      JSON.stringify([left.nodeId, left.reason]).localeCompare(
        JSON.stringify([right.nodeId, right.reason]),
      ),
    ),
  };
}

function isReachable(
  start: string,
  target: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
): boolean {
  const pending = [...(adjacency.get(start) ?? [])];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined) {
      continue;
    }
    if (current === target) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    pending.push(...(adjacency.get(current) ?? []));
  }
  return false;
}

export function validateExplicitEffectGraph(
  effects: readonly ExplicitFieldEffect[],
  context: EffectGraphValidationContext,
): EffectGraphDiagnostic[] {
  const known = new Set(context.knownNodeIds);
  const readinessIds = new Set(context.readinessIds);
  const diagnostics: EffectGraphDiagnostic[] = [];
  const adjacency = new Map<string, string[]>();
  const effectIds = new Set<string>();

  for (const effect of effects) {
    if (effectIds.has(effect.id)) {
      diagnostics.push({
        code: 'DUPLICATE_EFFECT_ID',
        message: `Explicit effect ID "${effect.id}" is duplicated.`,
      });
    }
    effectIds.add(effect.id);
    if (!known.has(effect.trigger.nodeId)) {
      diagnostics.push({
        code: 'UNKNOWN_EFFECT_SOURCE',
        message: `Explicit effect source "${effect.trigger.nodeId}" is not a known node.`,
      });
    }
    if (!known.has(effect.target.nodeId)) {
      diagnostics.push({
        code: 'UNKNOWN_EFFECT_TARGET',
        message: `Explicit effect target "${effect.target.nodeId}" is not a known node.`,
      });
    } else if (
      !(context.targetCapabilities[effect.target.nodeId] ?? []).includes(
        effect.target.property,
      )
    ) {
      diagnostics.push({
        code: 'UNSUPPORTED_EFFECT_TARGET',
        message: `Node "${effect.target.nodeId}" does not declare the "${effect.target.property}" effect capability.`,
      });
    }
    if (
      effect.timing.mode === 'async' &&
      effect.timing.readinessId === undefined
    ) {
      diagnostics.push({
        code: 'ASYNC_READINESS_REQUIRED',
        message: `Async effect "${effect.id}" must declare a readinessId.`,
      });
    } else if (
      effect.timing.readinessId !== undefined &&
      !readinessIds.has(effect.timing.readinessId)
    ) {
      diagnostics.push({
        code: 'UNKNOWN_EFFECT_READINESS',
        message: `Effect "${effect.id}" references unknown readiness "${effect.timing.readinessId}".`,
      });
    }
    if (known.has(effect.trigger.nodeId) && known.has(effect.target.nodeId)) {
      const targets = adjacency.get(effect.trigger.nodeId) ?? [];
      if (!targets.includes(effect.target.nodeId)) {
        targets.push(effect.target.nodeId);
        targets.sort();
        adjacency.set(effect.trigger.nodeId, targets);
      }
    }
  }

  const assigned = new Set<string>();
  for (const start of [...known].sort()) {
    if (assigned.has(start)) {
      continue;
    }
    const members = [...known]
      .filter(
        (candidate) =>
          isReachable(start, candidate, adjacency) &&
          isReachable(candidate, start, adjacency),
      )
      .sort();
    if (members.length > 0) {
      members.forEach((nodeId) => assigned.add(nodeId));
      diagnostics.push({
        code: 'EFFECT_CYCLE',
        message: `Explicit effect graph contains strongly connected members: ${members.join(', ')}.`,
      });
    }
  }

  return diagnostics.sort((left, right) =>
    `${left.code}:${left.message}`.localeCompare(`${right.code}:${right.message}`),
  );
}
