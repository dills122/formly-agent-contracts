import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import { Script } from 'node:vm';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const requireFromFormlyApp = createRequire(
  new URL('../../../apps/formly-test-app/package.json', import.meta.url),
);
const formlyPackagePath = requireFromFormlyApp.resolve(
  '@ngx-formly/core/package.json',
);
const formlyPackage = JSON.parse(readFileSync(formlyPackagePath, 'utf8'));
const formlyPackageRoot = dirname(formlyPackagePath);
const { evalStringExpression: evaluatePinnedFormlyString } = await import(
  pathToFileURL(
    join(
      formlyPackageRoot,
      'esm2020/lib/extensions/field-expression/utils.mjs',
    ),
  ).href
);

const CALLBACK_CONTEXT_UNKNOWNS = [
  'feedback-semantics-unknown',
  'invocation-wiring-unknown',
  'stable-node-resolution-required',
  'timing-readiness-unknown',
];

function parseExpression(expression) {
  const sourceText = `const candidate = ${expression};`;
  try {
    new Script(sourceText);
  } catch {
    return { expression: undefined, reason: 'callback-not-javascript' };
  }

  const sourceFile = ts.createSourceFile(
    'form-effect.js',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    return { expression: undefined, reason: 'callback-parse-error' };
  }
  const declaration = sourceFile.statements[0]?.declarationList?.declarations[0];
  return { expression: declaration?.initializer };
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  if (
    ts.isElementAccessExpression(node) &&
    (ts.isStringLiteral(node.argumentExpression) ||
      ts.isNumericLiteral(node.argumentExpression))
  ) {
    return node.argumentExpression.text;
  }
  return undefined;
}

function isPropertyPath(node, expected) {
  const segments = [];
  let current = node;
  while (ts.isPropertyAccessExpression(current)) {
    segments.unshift(current.name.text);
    current = current.expression;
  }
  if (ts.isIdentifier(current)) {
    segments.unshift(current.text);
  }
  return JSON.stringify(segments) === JSON.stringify(expected);
}

function literalGetTarget(call) {
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return undefined;
  }
  if (call.expression.name.text !== 'get') {
    return undefined;
  }
  if (
    !isPropertyPath(call.expression.expression, [
      'field',
      'parent',
      'formControl',
    ])
  ) {
    return undefined;
  }
  const argument = call.arguments[0];
  return ts.isStringLiteral(argument) ? argument.text : undefined;
}

function analyzeCallback(expression) {
  const parsed = parseExpression(expression);
  const root = parsed.expression;
  if (root === undefined) {
    return {
      classification: 'parse-error',
      sources: [],
      candidates: [],
      localUnknowns: [parsed.reason ?? 'callback-parse-error'],
      contextUnknowns: [],
    };
  }
  if (ts.isIdentifier(root) || ts.isPropertyAccessExpression(root)) {
    return {
      classification: 'external-reference',
      sources: [],
      candidates: [],
      localUnknowns: ['implementation-outside-declaration'],
      contextUnknowns: [],
    };
  }
  if (!ts.isArrowFunction(root) && !ts.isFunctionExpression(root)) {
    return {
      classification: 'unsupported-value',
      sources: [],
      candidates: [],
      localUnknowns: ['callback-shape-unsupported'],
      contextUnknowns: [],
    };
  }

  const sources = new Map();
  const candidates = [];
  const unknowns = new Set();
  const visit = (node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === 'valueChanges'
    ) {
      if (ts.isCallExpression(node.expression)) {
        const controlKey = literalGetTarget(node.expression);
        if (controlKey === undefined) {
          unknowns.add('source-resolution-required');
        } else {
          sources.set(controlKey, { controlKey, stream: 'valueChanges' });
        }
      } else {
        unknowns.add('source-resolution-required');
      }
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        unknowns.add('helper-call-indirection');
      } else {
        const method = propertyName(node.expression);
        if (
          method === 'updateValueAndValidity' ||
          method === 'markAsTouched' ||
          method === 'setValue' ||
          method === 'reset'
        ) {
          const receiver = node.expression.expression;
          if (ts.isCallExpression(receiver)) {
            const target = literalGetTarget(receiver);
            if (target !== undefined) {
              candidates.push({ target, mutation: method });
            } else {
              unknowns.add('target-resolution-required');
            }
          } else {
            unknowns.add('alias-resolution-required');
          }
        }
        if (method === 'subscribe') {
          unknowns.add('subscription-lifecycle-and-pipeline-semantics');
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root.body);
  return {
    classification: 'inline-callback',
    sources: [...sources.values()],
    candidates,
    localUnknowns: [...unknowns].sort(),
    contextUnknowns: CALLBACK_CONTEXT_UNKNOWNS,
  };
}

function modelPath(node) {
  const segments = [];
  let current = node;
  while (ts.isPropertyAccessExpression(current)) {
    segments.unshift(current.name.text);
    current = current.expression;
  }
  return ts.isIdentifier(current) && current.text === 'model'
    ? segments
    : undefined;
}

function jsonLiteral(node) {
  if (ts.isStringLiteral(node)) {
    return { recognized: true, value: node.text };
  }
  if (ts.isNumericLiteral(node)) {
    return { recognized: true, value: Number(node.text) };
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return { recognized: true, value: true };
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return { recognized: true, value: false };
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return { recognized: true, value: null };
  }
  return { recognized: false };
}

function normalizeCondition(expression) {
  const parsed = parseExpression(expression);
  const root = parsed.expression;
  if (root === undefined || !ts.isBinaryExpression(root)) {
    return undefined;
  }
  const operator =
    root.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      ? 'equals'
      : root.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
        ? 'not-equals'
        : undefined;
  const sourcePath = modelPath(root.left);
  const literal = jsonLiteral(root.right);
  if (operator === undefined || sourcePath === undefined || !literal.recognized) {
    return undefined;
  }
  return { kind: 'comparison', operator, sourcePath, value: literal.value };
}

function evaluateNormalizedCondition(condition, model) {
  let actual = model;
  for (const segment of condition.sourcePath) {
    actual = actual?.[segment];
  }
  return condition.operator === 'equals'
    ? actual === condition.value
    : actual !== condition.value;
}

function deriveBranchWitnesses(
  condition,
  contractHash,
  sourceNodeId,
  operation,
  domain,
) {
  return domain.map((value, valueIndex) => ({
    outcome: evaluateNormalizedCondition(
      condition,
      condition.sourcePath.reduceRight(
        (child, segment) => ({ [segment]: child }),
        value,
      ),
    ),
    source: { nodeId: sourceNodeId, operation, value },
    evidence: {
      kind: 'domain',
      contractHash,
      nodeId: sourceNodeId,
      valueIndex,
    },
  }));
}

class ControlProbe {
  constructor(value) {
    this.value = value;
    this.revalidations = 0;
    this.touched = false;
  }

  updateValueAndValidity() {
    this.revalidations += 1;
  }

  markAsTouched() {
    this.touched = true;
  }
}

class SubjectProbe {
  observers = new Set();

  subscribe(observer) {
    this.observers.add(observer);
    return { unsubscribe: () => this.observers.delete(observer) };
  }

  next(value) {
    for (const observer of this.observers) {
      observer(value);
    }
  }
}

describe('RH-04 bounded form-effects experiments', () => {
  it('rejects malformed and TypeScript-only callback syntax before AST analysis', () => {
    for (const source of ['(field) => {', '(field: any) => field']) {
      expect(analyzeCallback(source)).toEqual({
        classification: 'parse-error',
        sources: [],
        candidates: [],
        localUnknowns: ['callback-not-javascript'],
        contextUnknowns: [],
      });
    }
  });

  it('normalizes the Other rule and derives only domain-backed branch witnesses', () => {
    expect(formlyPackage.version).toBe('6.1.8');
    const expression = `model.reason === 'Other'`;
    const condition = normalizeCondition(expression);
    expect(condition).toEqual({
      kind: 'comparison',
      operator: 'equals',
      sourcePath: ['reason'],
      value: 'Other',
    });
    expect(normalizeCondition(`model.reason == 'Other'`)).toBeUndefined();
    expect(normalizeCondition(`isOther(model.reason)`)).toBeUndefined();

    const evaluateWithFormly = evaluatePinnedFormlyString(expression, [
      'model',
      'formState',
      'field',
    ]);
    for (const reason of ['Transfer', 'Other']) {
      expect(evaluateNormalizedCondition(condition, { reason })).toBe(
        evaluateWithFormly({ reason }, {}, {}),
      );
    }

    expect(
      deriveBranchWitnesses(
        condition,
        'sha256:research-form-v1',
        'claims.reason',
        'select-option',
        ['Transfer', 'Other'],
      ),
    ).toEqual([
      {
        outcome: false,
        source: {
          nodeId: 'claims.reason',
          operation: 'select-option',
          value: 'Transfer',
        },
        evidence: {
          kind: 'domain',
          contractHash: 'sha256:research-form-v1',
          nodeId: 'claims.reason',
          valueIndex: 0,
        },
      },
      {
        outcome: true,
        source: {
          nodeId: 'claims.reason',
          operation: 'select-option',
          value: 'Other',
        },
        evidence: {
          kind: 'domain',
          contractHash: 'sha256:research-form-v1',
          nodeId: 'claims.reason',
          valueIndex: 1,
        },
      },
    ]);
    expect(
      deriveBranchWitnesses(
        condition,
        'sha256:research-form-v1',
        'claims.reason',
        'select-option',
        ['Other'],
      ).map(({ outcome, source }) => ({ outcome, source })),
    ).toEqual([
      {
        outcome: true,
        source: {
          nodeId: 'claims.reason',
          operation: 'select-option',
          value: 'Other',
        },
      },
    ]);
  });

  it('finds a direct revalidation target and confirms the callback mutation', () => {
    const source = `(field) =>
      field.parent.formControl.get('dependent').updateValueAndValidity()`;
    expect(analyzeCallback(source)).toEqual({
      classification: 'inline-callback',
      sources: [],
      candidates: [
        { target: 'dependent', mutation: 'updateValueAndValidity' },
      ],
      localUnknowns: [],
      contextUnknowns: CALLBACK_CONTEXT_UNKNOWNS,
    });

    const dependent = new ControlProbe();
    const change = (field) =>
      field.parent.formControl.get('dependent').updateValueAndValidity();
    change({
      parent: { formControl: { get: () => dependent } },
    });
    expect(dependent.revalidations).toBe(1);
  });

  it('refuses to infer an indirect update callback even when a scenario observes options', () => {
    expect(analyzeCallback('externalCallbacks.updateCaseTypes')).toEqual({
      classification: 'external-reference',
      sources: [],
      candidates: [],
      localUnknowns: ['implementation-outside-declaration'],
      contextUnknowns: [],
    });

    const state = { options: ['basic'] };
    const externalCallbacks = {
      updateCaseTypes: () => {
        state.options = ['special-a', 'special-b'];
      },
    };
    externalCallbacks.updateCaseTypes();
    expect(state.options).toEqual(['special-a', 'special-b']);
  });

  it('separates lifecycle source, target mutations, and cleanup evidence', () => {
    const onInitSource = `(field) =>
      field.parent.formControl.get('source').valueChanges
        .pipe(distinctUntilChanged())
        .subscribe(() => {
          field.parent.formControl.get('dependent').markAsTouched();
          field.parent.formControl.get('dependent').updateValueAndValidity();
        })`;
    expect(analyzeCallback(onInitSource)).toEqual({
      classification: 'inline-callback',
      sources: [{ controlKey: 'source', stream: 'valueChanges' }],
      candidates: [
        { target: 'dependent', mutation: 'markAsTouched' },
        { target: 'dependent', mutation: 'updateValueAndValidity' },
      ],
      localUnknowns: [
        'helper-call-indirection',
        'subscription-lifecycle-and-pipeline-semantics',
      ],
      contextUnknowns: CALLBACK_CONTEXT_UNKNOWNS,
    });

    const valueChanges = new SubjectProbe();
    const dependent = new ControlProbe();
    const subscription = valueChanges.subscribe(() => {
      dependent.markAsTouched();
      dependent.updateValueAndValidity();
    });
    valueChanges.next('first');
    expect({
      touched: dependent.touched,
      revalidations: dependent.revalidations,
      observers: valueChanges.observers.size,
    }).toEqual({ touched: true, revalidations: 1, observers: 1 });

    subscription.unsubscribe();
    valueChanges.next('after-destroy');
    expect({
      revalidations: dependent.revalidations,
      observers: valueChanges.observers.size,
    }).toEqual({ revalidations: 1, observers: 0 });
  });

  it('keeps helpers and aliases as review scaffolds instead of source interpretation', () => {
    expect(analyzeCallback('(field) => revalidateDependent(field)')).toEqual({
      classification: 'inline-callback',
      sources: [],
      candidates: [],
      localUnknowns: ['helper-call-indirection'],
      contextUnknowns: CALLBACK_CONTEXT_UNKNOWNS,
    });
    expect(
      analyzeCallback(`(field) => {
        const dependent = field.parent.formControl.get('dependent');
        dependent.updateValueAndValidity();
      }`),
    ).toEqual({
      classification: 'inline-callback',
      sources: [],
      candidates: [],
      localUnknowns: ['alias-resolution-required'],
      contextUnknowns: CALLBACK_CONTEXT_UNKNOWNS,
    });
    expect(
      analyzeCallback(`() =>
        logger.get('dependent').updateValueAndValidity()`),
    ).toEqual({
      classification: 'inline-callback',
      sources: [],
      candidates: [],
      localUnknowns: ['target-resolution-required'],
      contextUnknowns: CALLBACK_CONTEXT_UNKNOWNS,
    });
    expect(
      analyzeCallback(`(field) =>
        field.parent.formControl.get(field.props.source).valueChanges
          .subscribe(() => undefined)`),
    ).toEqual({
      classification: 'inline-callback',
      sources: [],
      candidates: [],
      localUnknowns: [
        'source-resolution-required',
        'subscription-lifecycle-and-pipeline-semantics',
      ],
      contextUnknowns: CALLBACK_CONTEXT_UNKNOWNS,
    });
  });
});
