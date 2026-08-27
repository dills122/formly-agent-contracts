import { describe, expect, it } from 'vitest';

import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  canonicalizeCrossFieldEffectRegistry,
  computeCrossFieldEffectRegistryHash,
  parseCrossFieldEffectRegistry,
  type CrossFieldEffectRegistry,
} from './cross-field-effect.js';

function createRegistry(reversed = false): CrossFieldEffectRegistry {
  const effects: CrossFieldEffectRegistry['forms'][number]['effects'] = [
    {
      identity: { id: 'claims.product-filters-case-type', version: 1 },
      trigger: {
        nodeId: 'claims.intake::path:s_product',
        event: 'selectionChanged',
      },
      target: {
        nodeId: 'claims.intake::path:s_caseType',
        property: 'options',
      },
      kind: 'filters',
      timing: {
        mode: 'async',
        readinessId: 'claims.case-type-options-ready',
      },
      conditionRuleId: 'claims.product-selected',
      ordering: 'source-before-target',
      evidence: 'declared',
      opacity: 'transparent',
    },
    {
      identity: { id: 'claims.is-new-controls-case', version: 2 },
      trigger: {
        nodeId: 'claims.intake::path:s_isNew',
        event: 'valueChanged',
      },
      target: {
        nodeId: 'claims.intake::path:s_case',
        property: 'visibility',
      },
      kind: 'controls-state',
      timing: { mode: 'sync' },
      ordering: 'source-before-target',
      evidence: 'declared',
      opacity: 'transparent',
    },
  ];
  const forms: CrossFieldEffectRegistry['forms'] = [
    {
      formId: 'claims.intake',
      effects: reversed ? [...effects].reverse() : effects,
    },
    {
      formId: 'claims.search',
      effects: [],
    },
  ];

  return {
    schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
    id: 'claims.cross-field-effects',
    version: 3,
    forms: reversed ? [...forms].reverse() : forms,
  };
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a test record');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Expected a test array');
  }
  return value;
}

function firstEffect(value: unknown): Record<string, unknown> {
  const form = record(array(record(value).forms)[0]);
  return record(array(form.effects)[0]);
}

describe('cross-field effect registry', () => {
  it('accepts strict declared sync and async effects', () => {
    const registry = createRegistry();

    expect(parseCrossFieldEffectRegistry(registry)).toBe(registry);
  });

  it('canonicalizes equivalent form and effect ordering without mutating input', () => {
    const first = createRegistry();
    const second = createRegistry(true);
    const before = structuredClone(second);

    expect(canonicalizeCrossFieldEffectRegistry(second)).toBe(
      canonicalizeCrossFieldEffectRegistry(first),
    );
    expect(computeCrossFieldEffectRegistryHash(second)).toBe(
      computeCrossFieldEffectRegistryHash(first),
    );
    expect(second).toEqual(before);
  });

  it.each([
    [
      { timing: { mode: 'async' } },
      'registry.forms[0].effects[0].timing.readinessId is required',
    ],
    [
      {
        timing: {
          mode: 'sync',
          readinessId: 'claims.case-type-options-ready',
        },
      },
      'registry.forms[0].effects[0].timing contains unknown property readinessId',
    ],
    [
      {
        timing: {
          mode: 'unknown',
          readinessId: 'claims.case-type-options-ready',
        },
      },
      'registry.forms[0].effects[0].timing contains unknown property readinessId',
    ],
  ])('rejects contradictory timing metadata', (patch, message) => {
    const registry = createRegistry();
    const effect = registry.forms[0]!.effects[0]!;
    const malformed: unknown = structuredClone(registry);
    Object.assign(firstEffect(malformed), { ...effect, ...patch });

    expect(() => parseCrossFieldEffectRegistry(malformed)).toThrow(message);
  });

  it.each([
    ['loads', 'value'],
    ['filters', 'visibility'],
    ['clears', 'options'],
    ['toggles', 'options'],
    ['controls-state', 'options'],
  ])(
    'rejects the contradictory %s effect and %s target property',
    (kind, property) => {
      const malformed: unknown = structuredClone(createRegistry());
      const effect = firstEffect(malformed);
      effect.kind = kind;
      record(effect.target).property = property;

      expect(() => parseCrossFieldEffectRegistry(malformed)).toThrow(
        `registry.forms[0].effects[0].target.property is unsupported for ${kind}`,
      );
    },
  );

  it.each([
    ['evidence', 'observed', 'must be "declared"'],
    ['evidence', 'controlled-scenario-delta', 'must be "declared"'],
    ['opacity', 'opaque', 'must be "transparent"'],
  ])(
    'rejects non-actionable %s metadata',
    (property, value, expectedMessage) => {
      const malformed: unknown = structuredClone(createRegistry());
      firstEffect(malformed)[property] = value;

      expect(() => parseCrossFieldEffectRegistry(malformed)).toThrow(
        expectedMessage,
      );
    },
  );

  it('rejects callbacks and candidate authority fields', () => {
    const callbackRegistry: unknown = structuredClone(createRegistry());
    firstEffect(callbackRegistry).readiness = () => true;
    expect(() => parseCrossFieldEffectRegistry(callbackRegistry)).toThrow(
      'must be a JSON value',
    );

    const candidateRegistry: unknown = structuredClone(createRegistry());
    firstEffect(candidateRegistry).authority = 'candidate';
    expect(() => parseCrossFieldEffectRegistry(candidateRegistry)).toThrow(
      'contains unknown property authority',
    );
  });

  it('rejects duplicate form IDs and duplicate effect IDs within a form', () => {
    const duplicateForm = createRegistry();
    const malformedForms = {
      ...duplicateForm,
      forms: [duplicateForm.forms[0], duplicateForm.forms[0]],
    };
    expect(() => parseCrossFieldEffectRegistry(malformedForms)).toThrow(
      'duplicates form ID "claims.intake"',
    );

    const duplicateEffect = createRegistry();
    const firstEffect = duplicateEffect.forms[0]!.effects[0]!;
    const malformedEffects = {
      ...duplicateEffect,
      forms: [
        {
          ...duplicateEffect.forms[0]!,
          effects: [firstEffect, firstEffect],
        },
        duplicateEffect.forms[1]!,
      ],
    };
    expect(() => parseCrossFieldEffectRegistry(malformedEffects)).toThrow(
      'duplicates effect ID "claims.product-filters-case-type"',
    );

    const changedVersion = {
      ...firstEffect,
      identity: { ...firstEffect.identity, version: 2 },
    };
    const differentVersions = {
      ...duplicateEffect,
      forms: [
        {
          ...duplicateEffect.forms[0]!,
          effects: [firstEffect, changedVersion],
        },
        duplicateEffect.forms[1]!,
      ],
    };
    expect(() => parseCrossFieldEffectRegistry(differentVersions)).toThrow(
      'duplicates effect ID "claims.product-filters-case-type"',
    );
  });

  it('scopes logical effect IDs to their form registration', () => {
    const registry = createRegistry();
    const sharedIdentity = registry.forms[0]!.effects[0]!.identity;
    const secondFormEffect = {
      ...registry.forms[0]!.effects[1]!,
      identity: sharedIdentity,
      trigger: {
        nodeId: 'claims.search::path:s_product',
        event: 'selectionChanged' as const,
      },
      target: {
        nodeId: 'claims.search::path:s_caseType',
        property: 'options' as const,
      },
      kind: 'filters' as const,
    };
    const scoped = {
      ...registry,
      forms: [
        registry.forms[0]!,
        { formId: 'claims.search', effects: [secondFormEffect] },
      ],
    };

    expect(parseCrossFieldEffectRegistry(scoped)).toBe(scoped);
  });

  it.each([
    ['schemaVersion', '9.9.9', 'registry.schemaVersion is unsupported'],
    ['id', 'not namespaced', 'registry.id must be a stable namespaced identifier'],
    ['version', 0, 'registry.version must be a positive safe integer'],
  ])('rejects malformed registry identity %s', (property, value, message) => {
    const malformed = { ...createRegistry(), [property]: value };

    expect(() => parseCrossFieldEffectRegistry(malformed)).toThrow(message);
  });

  it('rejects malformed stable node and condition references', () => {
    const badNode: unknown = structuredClone(createRegistry());
    record(firstEffect(badNode).trigger).nodeId = 'contains spaces';
    expect(() => parseCrossFieldEffectRegistry(badNode)).toThrow(
      'trigger.nodeId must be a contract stable identifier',
    );

    const badCondition: unknown = structuredClone(createRegistry());
    firstEffect(badCondition).conditionRuleId = 'contains spaces';
    expect(() => parseCrossFieldEffectRegistry(badCondition)).toThrow(
      'conditionRuleId must be a stable namespaced identifier',
    );
  });
});
