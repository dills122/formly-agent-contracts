import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function parseExpression(expression) {
  const sourceFile = ts.createSourceFile(
    'form-effect.js',
    `const candidate = ${expression};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const declaration = sourceFile.statements[0]?.declarationList?.declarations[0];
  return { sourceFile, expression: declaration?.initializer };
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

function literalGetTarget(call) {
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return undefined;
  }
  if (call.expression.name.text !== 'get') {
    return undefined;
  }
  const argument = call.arguments[0];
  return ts.isStringLiteral(argument) ? argument.text : undefined;
}

function analyzeCallback(expression) {
  const parsed = parseExpression(expression);
  const root = parsed.expression;
  if (root === undefined) {
    return { classification: 'parse-error', candidates: [], unknowns: [] };
  }
  if (ts.isIdentifier(root) || ts.isPropertyAccessExpression(root)) {
    return {
      classification: 'external-reference',
      candidates: [],
      unknowns: ['implementation-outside-declaration'],
    };
  }
  if (!ts.isArrowFunction(root) && !ts.isFunctionExpression(root)) {
    return {
      classification: 'unsupported-value',
      candidates: [],
      unknowns: ['callback-shape-unsupported'],
    };
  }

  const candidates = [];
  const unknowns = new Set();
  const visit = (node) => {
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
    candidates,
    unknowns: [...unknowns].sort(),
  };
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

function otherScenario(reason) {
  const isOther = reason === 'Other';
  return {
    reason,
    details: {
      visible: isOther,
      required: isOther,
    },
  };
}

describe('RH-04 bounded form-effects experiments', () => {
  it('resolves the Other branch only for the controlled scenarios that were run', () => {
    const standard = otherScenario('Transfer');
    const other = otherScenario('Other');

    expect(standard.details).toEqual({ visible: false, required: false });
    expect(other.details).toEqual({ visible: true, required: true });
  });

  it('finds a direct revalidation target and confirms the callback mutation', () => {
    const source = `(field) =>
      field.parent.formControl.get('dependent').updateValueAndValidity()`;
    expect(analyzeCallback(source)).toEqual({
      classification: 'inline-callback',
      candidates: [
        { target: 'dependent', mutation: 'updateValueAndValidity' },
      ],
      unknowns: [],
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
      candidates: [],
      unknowns: ['implementation-outside-declaration'],
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
      candidates: [
        { target: 'dependent', mutation: 'markAsTouched' },
        { target: 'dependent', mutation: 'updateValueAndValidity' },
      ],
      unknowns: [
        'helper-call-indirection',
        'subscription-lifecycle-and-pipeline-semantics',
      ],
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
      candidates: [],
      unknowns: ['helper-call-indirection'],
    });
    expect(
      analyzeCallback(`(field) => {
        const dependent = field.parent.formControl.get('dependent');
        dependent.updateValueAndValidity();
      }`),
    ).toEqual({
      classification: 'inline-callback',
      candidates: [],
      unknowns: ['alias-resolution-required'],
    });
  });
});
