import type { FormlyFieldConfig } from '@ngx-formly/core';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  analyzeDeclaredFieldEffects,
  observeControlledScenarioDelta,
  validateExplicitEffectGraph,
  type AnalyzableField,
  type ExplicitFieldEffect,
} from './cross-field-effects.spike.js';

function entry(nodeId: string, field: FormlyFieldConfig): AnalyzableField {
  return { nodeId, field };
}

describe('cross-field effects research spike', () => {
  it('extracts direct read paths from effective string expressions only', () => {
    const result = analyzeDeclaredFieldEffects([
      entry('applicant.communication/contact.email', {
        key: 'contact.email',
        type: 'input',
        expressions: {
          hide: "model.channel !== 'email'",
          'props.required':
            "model['channel'] === 'email' && formState.permissions.canEdit",
        },
      }),
    ]);

    expect(result.edges).toEqual([
      {
        source: { scope: 'formState', path: ['permissions', 'canEdit'] },
        target: {
          nodeId: 'applicant.communication/contact.email',
          property: 'props.required',
        },
        effectKind: 'required-state',
        evidence: 'declared-string-reference',
        authority: 'dependency-only',
      },
      {
        source: { scope: 'model', path: ['channel'] },
        target: {
          nodeId: 'applicant.communication/contact.email',
          property: 'hide',
        },
        effectKind: 'visibility-state',
        evidence: 'declared-string-reference',
        authority: 'dependency-only',
      },
      {
        source: { scope: 'model', path: ['channel'] },
        target: {
          nodeId: 'applicant.communication/contact.email',
          property: 'props.required',
        },
        effectKind: 'required-state',
        evidence: 'declared-string-reference',
        authority: 'dependency-only',
      },
    ]);
    expect(result.unknowns).toEqual([]);
    expect(result.coverage).toBe('complete-for-analyzed-surfaces');
  });

  it('does not execute or invent endpoints for functions, Observables, or change props', () => {
    let invoked = false;
    const opaque = (): boolean => {
      invoked = true;
      return true;
    };

    const result = analyzeDeclaredFieldEffects([
      entry('caseType', {
        key: 'caseType',
        type: 'select',
        hideExpression: false,
        expressions: {
          'props.options': opaque,
          'props.disabled': of(true),
        },
        props: { change: opaque },
      }),
    ]);

    expect(invoked).toBe(false);
    expect(result.edges).toEqual([]);
    expect(result.coverage).toBe('incomplete');
    expect(result.unknowns.map(({ evidence, reason }) => ({ evidence, reason })))
      .toEqual([
        {
          evidence: 'declared-handler-property-existence',
          reason: 'handler-invocation-and-effects-opaque',
        },
        {
          evidence: 'declared-observable-existence',
          reason: 'observable-dependencies-opaque',
        },
        {
          evidence: 'declared-function-existence',
          reason: 'function-dependencies-opaque',
        },
      ]);
  });

  it('blocks computed, field-rooted, shadowed, and write references', () => {
    const result = analyzeDeclaredFieldEffects([
      entry('dependent', {
        key: 'dependent',
        type: 'input',
        expressions: {
          hide: 'model[field.props.dependsOn] === undefined',
          'props.disabled': 'lookup(model, formState.alias)',
          'props.required':
            '(model => model.channel)({ channel: "email" })',
          'props.options': "(model.channel = 'email')",
          'props.readonly': 'field.model.country === "CA"',
        },
      }),
    ]);

    expect(result.edges).toEqual([
      {
        source: { scope: 'formState', path: ['alias'] },
        target: { nodeId: 'dependent', property: 'props.disabled' },
        effectKind: 'enabled-state',
        evidence: 'declared-string-reference',
        authority: 'dependency-only',
      },
    ]);
    expect(new Set(result.unknowns.map(({ reason }) => reason))).toEqual(
      new Set([
        'computed-source-path',
        'field-rooted-reference',
        'nested-function-semantics',
        'opaque-call-semantics',
        'source-path-write',
        'unsupported-target-property',
      ]),
    );
  });

  it('rejects malformed and TypeScript-only expression strings before emitting edges', () => {
    const result = analyzeDeclaredFieldEffects([
      entry('one', {
        key: 'one',
        expressions: { hide: 'model.channel as string' },
      }),
      entry('two', {
        key: 'two',
        expressions: { hide: 'model.channel && )' },
      }),
    ]);

    expect(result.edges).toEqual([]);
    expect(result.unknowns.map(({ reason }) => reason)).toEqual([
      'string-expression-not-javascript',
      'string-expression-parse-error',
    ]);
  });

  it('keeps literal dotted keys and numeric path segments distinct', () => {
    const result = analyzeDeclaredFieldEffects([
      entry('target', {
        key: 'target',
        expressions: {
          hide: "model.a.b || model['a.b'] || model.items[0]",
        },
      }),
    ]);

    expect(result.edges.map(({ source }) => source)).toEqual([
      { scope: 'model', path: ['a.b'] },
      { scope: 'model', path: ['a', 'b'] },
      { scope: 'model', path: ['items', 0] },
    ]);
  });

  it('matches pinned Formly overwrite order for legacy and current expression maps', () => {
    const result = analyzeDeclaredFieldEffects([
      entry('target', {
        key: 'target',
        hideExpression: 'model.legacy',
        expressions: { hide: 'model.current' },
        expressionProperties: { hide: 'model.final' },
      }),
    ]);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.source).toEqual({
      scope: 'model',
      path: ['final'],
    });
  });

  it('keeps model-target expressions and unmodeled behavior surfaces unknown', () => {
    const result = analyzeDeclaredFieldEffects([
      entry('group', {
        expressions: { 'model.caseType': 'model.product', hide: 'model.flag' },
        fieldGroup: [{ key: 'child', type: 'input' }],
        fieldArray: () => ({ key: 'row', type: 'input' }),
        hooks: { onInit: () => undefined },
        validators: { validation: [() => true] },
      }),
    ]);

    expect(result.edges).toEqual([
      expect.objectContaining({
        source: { scope: 'model', path: ['flag'] },
        target: { nodeId: 'group', property: 'hide' },
      }),
    ]);
    expect(new Set(result.unknowns.map(({ reason }) => reason))).toEqual(
      new Set([
        'descendant-state-propagation-not-modeled',
        'dynamic-field-array-out-of-scope',
        'model-target-resolution-required',
        'opaque-behavior-surface-out-of-scope',
      ]),
    );
  });

  it('reports clears and loads as scenario candidates while retaining structural unknowns', () => {
    const result = observeControlledScenarioDelta({
      changedSource: { scope: 'model', path: ['product'] },
      before: [
        { nodeId: 'caseType', value: 'old', options: undefined },
        { nodeId: 'removed', visible: true },
      ],
      after: [
        {
          nodeId: 'caseType',
          value: undefined,
          options: [{ label: 'Beta', value: 'beta' }],
        },
        { nodeId: 'added', visible: true },
      ],
    });

    expect(result.deltas).toEqual([
      expect.objectContaining({
        target: { nodeId: 'caseType', property: 'options' },
        effectKind: 'options-state',
        authority: 'candidate',
      }),
      expect.objectContaining({
        target: { nodeId: 'caseType', property: 'value' },
        effectKind: 'value-state',
        authority: 'candidate',
      }),
    ]);
    expect(result.unknowns).toEqual([
      { nodeId: 'added', reason: 'node-presence-changed' },
      { nodeId: 'removed', reason: 'node-presence-changed' },
    ]);
  });

  it('rejects duplicate IDs and non-JSON observations instead of silently comparing them', () => {
    const result = observeControlledScenarioDelta({
      changedSource: { scope: 'model', path: ['source'] },
      before: [
        { nodeId: 'duplicate', value: 1 },
        { nodeId: 'duplicate', value: 2 },
        { nodeId: 'runtime', options: new Map([['a', 1]]) },
      ],
      after: [
        { nodeId: 'duplicate', value: 3 },
        { nodeId: 'runtime', options: new Map([['b', 2]]) },
      ],
    });

    expect(result.deltas).toEqual([]);
    expect(result.unknowns).toEqual([
      { nodeId: 'duplicate', reason: 'duplicate-node-id' },
      { nodeId: 'runtime', reason: 'non-json-observation' },
    ]);
  });

  it('validates decision-bearing explicit effect fields and reports SCC members honestly', () => {
    const effects: ExplicitFieldEffect[] = [
      {
        id: 'product-filters-case-type',
        trigger: { nodeId: 'product', event: 'valueChanged' },
        target: { nodeId: 'caseType', property: 'options' },
        kind: 'filters',
        timing: { mode: 'sync' },
        ordering: 'source-before-target',
        evidence: 'declared',
        opacity: 'transparent',
      },
      {
        id: 'case-type-clears-product',
        trigger: { nodeId: 'caseType', event: 'valueChanged' },
        target: { nodeId: 'product', property: 'value' },
        kind: 'clears',
        timing: { mode: 'sync' },
        ordering: 'source-before-target',
        evidence: 'declared',
        opacity: 'transparent',
      },
      {
        id: 'missing-load',
        trigger: { nodeId: 'missing', event: 'valueChanged' },
        target: { nodeId: 'caseType', property: 'options' },
        kind: 'loads',
        timing: { mode: 'async' },
        ordering: 'source-before-target',
        evidence: 'declared',
        opacity: 'transparent',
      },
    ];

    expect(
      validateExplicitEffectGraph(effects, {
        knownNodeIds: ['caseType', 'product'],
        targetCapabilities: {
          caseType: ['options'],
          product: ['value'],
        },
        readinessIds: [],
      }),
    ).toEqual([
      {
        code: 'ASYNC_READINESS_REQUIRED',
        message: 'Async effect "missing-load" must declare a readinessId.',
      },
      {
        code: 'EFFECT_CYCLE',
        message:
          'Explicit effect graph contains strongly connected members: caseType, product.',
      },
      {
        code: 'UNKNOWN_EFFECT_SOURCE',
        message: 'Explicit effect source "missing" is not a known node.',
      },
    ]);
  });
});
