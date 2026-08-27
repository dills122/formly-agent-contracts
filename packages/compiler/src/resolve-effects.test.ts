import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  computeCrossFieldEffectRegistryHash,
  type ContractNode,
  type CrossFieldEffectRegistry,
} from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

import { resolveCrossFieldEffects } from './resolve-effects.js';

function node(
  id: string,
  overrides: Partial<ContractNode> = {},
): ContractNode {
  return {
    id,
    kind: 'control',
    modelPath: [id],
    formlyType: 'input',
    semanticType: 'text',
    evidence: 'declared',
    wrappers: [],
    constraints: [],
    options: [],
    conditions: [],
    dynamicRules: [],
    locators: [],
    children: [],
    ...overrides,
  };
}

function registry(
  effects: CrossFieldEffectRegistry['forms'][number]['effects'],
  coverage: 'complete' | 'partial' = 'complete',
): CrossFieldEffectRegistry {
  return {
    schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
    id: 'fixture.effects',
    version: 1,
    forms: [{ formId: 'claims.intake', coverage, effects }],
  };
}

const syncEffect = {
  identity: { id: 'fixture.product-controls-details', version: 1 },
  trigger: {
    nodeId: 'claims.product',
    event: 'selectionChanged',
  },
  target: {
    nodeId: 'claims.details',
    property: 'visibility',
  },
  kind: 'controls-state',
  timing: { mode: 'sync' },
  ordering: 'source-before-target',
  evidence: 'declared',
  opacity: 'transparent',
} as const;

describe('resolveCrossFieldEffects', () => {
  it('projects a validated effect, registry identity, and complete coverage', () => {
    const effects = registry([syncEffect]);

    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [node('claims.product'), node('claims.details')],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.crossFieldEffectRegistry).toEqual({
      schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
      id: 'fixture.effects',
      version: 1,
      contentHash: computeCrossFieldEffectRegistryHash(effects),
    });
    expect(result.declaredEffects).toEqual([syncEffect]);
    expect(result.effectAnalysis).toEqual({
      completeness: 'complete',
      reasons: [],
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('omits invalid effects and reports stable endpoint provenance', () => {
    const effects = registry([
      {
        ...syncEffect,
        target: { nodeId: 'claims.stale', property: 'visibility' },
      },
    ]);

    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [node('claims.product')],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.declaredEffects).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_EFFECT_TARGET',
        severity: 'error',
        nodeId: 'claims.stale',
        sourcePath: [
          'crossFieldEffects',
          'claims.intake',
          'fixture.product-controls-details',
        ],
      }),
    ]);
  });

  it('validates async readiness against the resolved target profile', () => {
    const asyncEffect = {
      ...syncEffect,
      identity: { id: 'fixture.product-loads-cases', version: 1 },
      target: { nodeId: 'claims.caseType', property: 'options' },
      kind: 'loads',
      timing: {
        mode: 'async',
        readinessId: 'fixture.options-ready',
      },
    } as const;
    const effects = registry([asyncEffect]);
    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [
        node('claims.product'),
        node('claims.caseType', {
          semanticType: 'single-choice',
          interactionProfile: {
            profile: { id: 'fixture.dependent-select', version: 1 },
            semanticType: 'single-choice',
            valueShape: 'scalar',
            evidence: 'declared',
            parts: [
              {
                name: 'option',
                role: 'option',
                cardinality: 'many',
                evidence: 'declared',
              },
            ],
            interaction: {
              kind: 'choice',
              operation: 'select-option',
              optionPart: 'option',
            },
            driver: {
              kind: 'generic',
              id: 'generic.choice',
              version: 1,
              capabilities: ['select-option'],
            },
            effectCapabilities: {
              targetProperties: ['options'],
              readiness: [
                {
                  id: 'fixture.options-ready',
                  targetProperty: 'options',
                  evidence: 'declared',
                },
              ],
            },
            preconditions: [],
            unknowns: [],
            provenance: ['registry:fixture.profiles@1'],
          },
        }),
      ],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.declaredEffects).toEqual([asyncEffect]);
    expect(result.diagnostics).toEqual([]);
  });

  it('downgrades partial or opaque analysis without inventing missing edges', () => {
    const effects = registry([syncEffect], 'partial');
    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [
        node('claims.product', {
          dynamicRules: [
            {
              id: 'claims.product::rule:props.options',
              property: 'props.options',
              source: 'function',
              evidence: 'declared',
            },
          ],
        }),
        node('claims.details'),
      ],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.effectAnalysis).toEqual({
      completeness: 'incomplete',
      reasons: ['declared-partial', 'opaque-dynamic-rule'],
    });
  });

  it('rejects unsupported target properties and readiness IDs', () => {
    const effects = registry([
      {
        ...syncEffect,
        identity: { id: 'fixture.invalid-readiness', version: 1 },
        target: { nodeId: 'claims.details', property: 'options' },
        kind: 'loads',
        timing: { mode: 'async', readinessId: 'fixture.missing-ready' },
      },
    ]);
    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [node('claims.product'), node('claims.details')],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.declaredEffects).toEqual([]);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'UNKNOWN_EFFECT_READINESS',
      'UNSUPPORTED_EFFECT_TARGET',
    ]);
    expect(result.effectAnalysis).toEqual({
      completeness: 'incomplete',
      reasons: ['invalid-declared-effect'],
    });
  });

  it('does not infer options capability from a boolean enumerated domain', () => {
    const effect = {
      ...syncEffect,
      identity: { id: 'fixture.loads-checkbox-options', version: 1 },
      target: { nodeId: 'claims.details', property: 'options' },
      kind: 'loads',
    } as const;
    const effects = registry([effect]);
    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [
        node('claims.product'),
        node('claims.details', {
          formlyType: 'checkbox',
          semanticType: 'boolean',
          valueDomain: {
            kind: 'enumerated',
            source: 'semantic-type',
            completeness: 'complete',
            evidence: 'declared',
            values: [false, true],
          },
        }),
      ],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.declaredEffects).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe('UNSUPPORTED_EFFECT_TARGET');
  });

  it('retains options capability for an explicitly dynamic value domain', () => {
    const effect = {
      ...syncEffect,
      identity: { id: 'fixture.loads-dynamic-options', version: 1 },
      target: { nodeId: 'claims.details', property: 'options' },
      kind: 'loads',
    } as const;
    const effects = registry([effect]);
    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [
        node('claims.product'),
        node('claims.details', {
          formlyType: 'dependent-select',
          semanticType: 'single-choice',
          valueDomain: {
            kind: 'dynamic',
            source: 'function',
            evidence: 'declared',
          },
        }),
      ],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.declaredEffects).toEqual([effect]);
    expect(result.diagnostics).toEqual([]);
  });

  it('resolves condition-rule IDs and rejects stale references', () => {
    const conditional = {
      ...syncEffect,
      conditionRuleId: 'claims.product::rule:expressions:props.required',
    } as const;
    const effects = registry([conditional]);
    const bundle = {
      schemaVersion: effects.schemaVersion,
      id: effects.id,
      version: effects.version,
      contentHash: computeCrossFieldEffectRegistryHash(effects),
      registry: effects,
    };
    const nodes = [
      node('claims.product', {
        conditions: [
          {
            id: 'claims.product::rule:expressions:props.required',
            property: 'props.required',
            expression: 'model.enabled',
            evidence: 'declared',
          },
        ],
      }),
      node('claims.details'),
    ];

    expect(
      resolveCrossFieldEffects({
        formId: 'claims.intake',
        nodes,
        diagnostics: [],
        registry: bundle,
        cyclePolicy: 'error',
      }).declaredEffects,
    ).toEqual([conditional]);

    const staleRegistry = registry([
      { ...conditional, conditionRuleId: 'claims.missing-rule' },
    ]);
    const stale = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes,
      diagnostics: [],
      registry: {
        schemaVersion: staleRegistry.schemaVersion,
        id: staleRegistry.id,
        version: staleRegistry.version,
        contentHash: computeCrossFieldEffectRegistryHash(staleRegistry),
        registry: staleRegistry,
      },
      cyclePolicy: 'error',
    });
    expect(stale.declaredEffects).toEqual([]);
    expect(stale.diagnostics[0]?.code).toBe('UNKNOWN_EFFECT_CONDITION');

    const opaqueNodes = [
      node('claims.product', {
        dynamicRules: [
          {
            id: conditional.conditionRuleId,
            property: 'props.required',
            source: 'function',
            evidence: 'declared',
          },
        ],
      }),
      node('claims.details'),
    ];
    const opaque = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: opaqueNodes,
      diagnostics: [],
      registry: bundle,
      cyclePolicy: 'error',
    });
    expect(opaque.declaredEffects).toEqual([]);
    expect(opaque.diagnostics[0]?.code).toBe('UNKNOWN_EFFECT_CONDITION');
  });

  it('applies deterministic cycle policy to strongly connected effects', () => {
    const reverse = {
      ...syncEffect,
      identity: { id: 'fixture.details-controls-product', version: 1 },
      trigger: { nodeId: 'claims.details', event: 'valueChanged' },
      target: { nodeId: 'claims.product', property: 'visibility' },
    } as const;
    const effects = registry([syncEffect, reverse]);
    const bundle = {
      schemaVersion: effects.schemaVersion,
      id: effects.id,
      version: effects.version,
      contentHash: computeCrossFieldEffectRegistryHash(effects),
      registry: effects,
    };
    const nodes = [node('claims.product'), node('claims.details')];

    const error = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes,
      diagnostics: [],
      registry: bundle,
      cyclePolicy: 'error',
    });
    const warning = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes,
      diagnostics: [],
      registry: bundle,
      cyclePolicy: 'warning',
    });

    expect(error.declaredEffects).toEqual([]);
    expect(error.diagnostics).toHaveLength(2);
    expect(error.diagnostics.every(({ severity }) => severity === 'error')).toBe(
      true,
    );
    expect(warning.declaredEffects).toHaveLength(2);
    expect(
      warning.diagnostics.every(({ severity }) => severity === 'warning'),
    ).toBe(true);
    expect(warning.effectAnalysis).toEqual({
      completeness: 'incomplete',
      reasons: ['effect-cycle'],
    });
  });

  it('preserves pre-existing diagnostic order when appending effect diagnostics', () => {
    const effects = registry([]);
    const diagnostics = [
      {
        code: 'UNMAPPED_FIELD_TYPE',
        severity: 'warning',
        message: 'second alphabetically',
        evidence: 'declared',
        sourcePath: ['fields', 1],
      },
      {
        code: 'ASYNC_VALUE',
        severity: 'warning',
        message: 'first alphabetically',
        evidence: 'declared',
        sourcePath: ['fields', 0],
      },
    ] as const;

    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [],
      diagnostics,
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    expect(result.diagnostics).toEqual(diagnostics);
  });

  it('rejects accessor-backed registry bundle properties without invoking them', () => {
    const effects = registry([]);
    let getterCalls = 0;
    const bundle = {
      id: effects.id,
      version: effects.version,
      contentHash: computeCrossFieldEffectRegistryHash(effects),
      registry: effects,
    } as Record<string, unknown>;
    Object.defineProperty(bundle, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return effects.schemaVersion;
      },
    });

    expect(() =>
      resolveCrossFieldEffects({
        formId: 'claims.intake',
        nodes: [],
        diagnostics: [],
        registry: bundle as never,
        cyclePolicy: 'error',
      }),
    ).toThrow(/own enumerable data property/u);
    expect(getterCalls).toBe(0);
  });

  it('does not alias mutable unprepared registry effects into its result', () => {
    const effects = registry([syncEffect]);
    const result = resolveCrossFieldEffects({
      formId: 'claims.intake',
      nodes: [node('claims.product'), node('claims.details')],
      diagnostics: [],
      registry: {
        schemaVersion: effects.schemaVersion,
        id: effects.id,
        version: effects.version,
        contentHash: computeCrossFieldEffectRegistryHash(effects),
        registry: effects,
      },
      cyclePolicy: 'error',
    });

    (effects.forms[0]!.effects[0]!.target as { property: string }).property =
      'value';
    expect(result.declaredEffects?.[0]?.target.property).toBe('visibility');
    expect(Object.isFrozen(result.declaredEffects?.[0])).toBe(true);
  });

  it(
    'resolves a long acyclic effect chain without recursive graph traversal',
    () => {
      const count = 12_000;
      const nodes = Array.from({ length: count + 1 }, (_, index) =>
        node(`node.${String(index).padStart(5, '0')}`),
      );
      const chain = Array.from({ length: count }, (_, index) => ({
        ...syncEffect,
        identity: {
          id: `fixture.effect-${String(index).padStart(5, '0')}`,
          version: 1,
        },
        trigger: {
          nodeId: `node.${String(index).padStart(5, '0')}`,
          event: 'valueChanged' as const,
        },
        target: {
          nodeId: `node.${String(index + 1).padStart(5, '0')}`,
          property: 'visibility' as const,
        },
      }));
      const effects = registry(chain);

      const result = resolveCrossFieldEffects({
        formId: 'claims.intake',
        nodes,
        diagnostics: [],
        registry: {
          schemaVersion: effects.schemaVersion,
          id: effects.id,
          version: effects.version,
          contentHash: computeCrossFieldEffectRegistryHash(effects),
          registry: effects,
        },
        cyclePolicy: 'error',
      });

      expect(result.declaredEffects).toHaveLength(count);
      expect(result.effectAnalysis).toEqual({
        completeness: 'complete',
        reasons: [],
      });
    },
    20_000,
  );
});
