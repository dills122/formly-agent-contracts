import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  computeFieldTypeProfileRegistryHash,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

import {
  compileFormContractScenario,
  extractFormContract,
} from './extract-form.js';

function createRegistry(
  collectionPath = 'props.options',
): FieldTypeProfileRegistry {
  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id: 'fixture.extraction-profiles',
    version: 1,
    profiles: [
      {
        identity: { id: 'fixture.radio', version: 1 },
        semanticType: 'single-choice',
        valueShape: 'scalar',
        evidence: 'declared',
        parts: [
          {
            name: 'group',
            role: 'radiogroup',
            cardinality: 'one',
            evidence: 'declared',
          },
          {
            name: 'option',
            role: 'radio',
            cardinality: 'many',
            evidence: 'declared',
          },
        ],
        interaction: {
          kind: 'choice',
          operation: 'check',
          optionPart: 'option',
        },
        valueDomain: {
          kind: 'projected',
          source: 'adapter',
          completeness: 'complete',
          collectionPath,
          labelPath: 'label',
          valuePath: 'value',
          disabledPath: 'disabled',
          evidence: 'declared',
        },
        driver: {
          kind: 'generic',
          id: 'generic.choice',
          version: 1,
          capabilities: ['check'],
        },
        unknowns: [],
      },
    ],
    registrations: [
      {
        formlyType: 'cool-radio-btn-grp',
        defaultProfile: { id: 'fixture.radio', version: 1 },
        variants: [],
      },
    ],
    wrappers: [],
  };
}

function createRegistryBundle(collectionPath?: string) {
  const registry = createRegistry(collectionPath);
  return {
    schemaVersion: registry.schemaVersion,
    id: registry.id,
    version: registry.version,
    contentHash: computeFieldTypeProfileRegistryHash(registry),
    registry,
  };
}

describe('profile-aware form extraction', () => {
  it('projects registry identity, interaction metadata, and an adapter value domain', () => {
    const fieldTypeProfiles = createRegistryBundle();
    const result = extractFormContract({
      formId: 'profiles.radio',
      fieldTypeProfiles,
      fields: [
        {
          key: 'contactPreference',
          type: 'cool-radio-btn-grp',
          props: {
            options: [
              { label: 'Email', value: 'email' },
              { label: 'Phone', value: 'phone', disabled: true },
            ],
          },
        },
      ],
    });

    expect(result.contract.fieldTypeProfileRegistry).toEqual({
      schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
      id: 'fixture.extraction-profiles',
      version: 1,
      contentHash: fieldTypeProfiles.contentHash,
    });
    expect(result.contract.nodes[0]).toMatchObject({
      formlyType: 'cool-radio-btn-grp',
      semanticType: 'single-choice',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone', disabled: true },
      ],
      valueDomain: {
        kind: 'enumerated',
        source: 'adapter',
        completeness: 'complete',
        evidence: 'declared',
        values: ['email', 'phone'],
      },
      interactionProfile: {
        profile: { id: 'fixture.radio', version: 1 },
        semanticType: 'single-choice',
        valueShape: 'scalar',
        evidence: 'declared',
        interaction: {
          kind: 'choice',
          operation: 'check',
          optionPart: 'option',
        },
        driver: {
          kind: 'generic',
          id: 'generic.choice',
          version: 1,
          capabilities: ['check'],
        },
        preconditions: [],
        unknowns: [],
        provenance: [
          'registry:fixture.extraction-profiles@1',
          'type:cool-radio-btn-grp',
        ],
      },
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('does not inspect discarded legacy options for a profile-mapped field', () => {
    let getterCalls = 0;
    let callbackCalls = 0;
    const legacyOptionsCallback = (): never[] => {
      callbackCalls += 1;
      return [];
    };
    const accessorProps: Record<string, unknown> = {
      records: [{ label: 'Email', value: 'email' }],
    };
    Object.defineProperty(accessorProps, 'options', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return legacyOptionsCallback;
      },
    });
    const callbackProps: Record<string, unknown> = {
      records: [{ label: 'Phone', value: 'phone' }],
      options: legacyOptionsCallback,
    };

    const result = extractFormContract({
      formId: 'profiles.safe-projection',
      fieldTypeProfiles: createRegistryBundle('props.records'),
      fields: [
        {
          key: 'contactPreference',
          type: 'cool-radio-btn-grp',
          props: accessorProps,
        },
        {
          key: 'alternatePreference',
          type: 'cool-radio-btn-grp',
          props: callbackProps,
        },
      ],
    });

    expect(getterCalls).toBe(0);
    expect(callbackCalls).toBe(0);
    expect(result.contract.nodes[0]?.options).toEqual([
      { label: 'Email', value: 'email' },
    ]);
    expect(result.contract.nodes[1]?.options).toEqual([
      { label: 'Phone', value: 'phone' },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it.each(['props', 'templateOptions'] as const)(
    'does not invoke an accessor-backed root field.%s during profile-aware extraction',
    (property) => {
      let getterCalls = 0;
      const field = {
        key: 'contactPreference',
        type: 'cool-radio-btn-grp',
      };
      Object.defineProperty(field, property, {
        enumerable: true,
        get: () => {
          getterCalls += 1;
          return {
            options: [{ label: 'Unsafe', value: 'unsafe' }],
          };
        },
      });

      const result = extractFormContract({
        formId: `profiles.root-${property}-accessor`,
        fieldTypeProfiles: createRegistryBundle(),
        fields: [field],
      });

      expect(getterCalls).toBe(0);
      expect(result.contract.nodes[0]).toMatchObject({
        formlyType: 'cool-radio-btn-grp',
        semanticType: 'single-choice',
        options: [],
        valueDomain: { kind: 'unknown', evidence: 'declared' },
      });
      expect(result.contract.nodes[0]?.interactionProfile).toBeUndefined();
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          code: 'VALUE_DOMAIN_PROJECTION_FAILED',
          sourcePath: ['fields', 0, 'props', 'options'],
        }),
      ]);
    },
  );

  it('retains an unmapped custom node as explicitly non-operable', () => {
    const result = extractFormContract({
      formId: 'profiles.unmapped',
      fieldTypeProfiles: createRegistryBundle(),
      fields: [
        {
          key: 'coveragePeriod',
          type: 'date-range',
          props: {
            options: [{ label: 'Sample', value: 'sample' }],
          },
        },
      ],
    });

    expect(result.contract.fieldTypeProfileRegistry).toBeDefined();
    expect(result.contract.nodes[0]).toMatchObject({
      formlyType: 'date-range',
      options: [{ label: 'Sample', value: 'sample' }],
    });
    expect(result.contract.nodes[0]?.semanticType).toBeUndefined();
    expect(result.contract.nodes[0]?.valueDomain).toBeUndefined();
    expect(result.contract.nodes[0]?.interactionProfile).toBeUndefined();
    expect(result.diagnostics).toContainEqual({
      code: 'UNMAPPED_FIELD_TYPE',
      severity: 'warning',
      message: 'No field-type profile is registered for Formly type "date-range".',
      evidence: 'declared',
      sourcePath: ['fields', 0, 'type'],
      nodeId: 'profiles.unmapped::path:s_coveragePeriod',
    });
  });

  it('emits built-in finite and dynamic value domains without a registry', () => {
    let callbackWasCalled = false;
    const result = extractFormContract({
      formId: 'profiles.built-ins',
      fields: [
        { key: 'accepted', type: 'checkbox' },
        {
          key: 'priority',
          type: 'radio',
          props: { options: [{ label: 'High', value: 2 }] },
        },
        { key: 'empty', type: 'select', props: { options: [] } },
        {
          key: 'remote',
          type: 'select',
          expressionProperties: {
            'props.options': () => {
              callbackWasCalled = true;
              return [];
            },
          },
        },
      ],
    });

    expect(result.contract.nodes.map(({ valueDomain }) => valueDomain)).toEqual([
      {
        kind: 'enumerated',
        source: 'semantic-type',
        completeness: 'complete',
        evidence: 'declared',
        values: [false, true],
      },
      {
        kind: 'enumerated',
        source: 'static-options',
        completeness: 'complete',
        evidence: 'declared',
        values: [2],
      },
      {
        kind: 'enumerated',
        source: 'static-options',
        completeness: 'complete',
        evidence: 'declared',
        values: [],
      },
      {
        kind: 'dynamic',
        source: 'function',
        evidence: 'declared',
      },
    ]);
    expect(callbackWasCalled).toBe(false);
  });

  it('forwards the profile registry through trusted scenario extraction', () => {
    const fieldTypeProfiles = createRegistryBundle();
    const result = compileFormContractScenario({
      formId: 'profiles.resolved',
      fieldTypeProfiles,
      builder: {
        build: (root) => {
          const field = root.fieldGroup?.[0];
          if (field?.props !== undefined) {
            field.props.options = [{ label: 'Resolved', value: 'resolved' }];
          }
        },
      },
      createFields: () => [
        {
          key: 'contactPreference',
          type: 'cool-radio-btn-grp',
          props: { options: [] },
          expressionProperties: { 'props.options': () => [] },
        },
      ],
    });

    expect(result.contract.fieldTypeProfileRegistry).toEqual({
      schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
      id: 'fixture.extraction-profiles',
      version: 1,
      contentHash: fieldTypeProfiles.contentHash,
    });
    expect(result.contract.nodes[0]?.valueDomain).toEqual({
      kind: 'enumerated',
      source: 'adapter',
      completeness: 'scenario',
      evidence: 'resolved',
      values: ['resolved'],
    });
    expect(result.contract.nodes[0]?.interactionProfile).toBeDefined();
  });

  it('keeps a static profile-projected scenario collection declared', () => {
    const result = compileFormContractScenario({
      formId: 'profiles.static-scenario',
      fieldTypeProfiles: createRegistryBundle(),
      builder: { build: () => undefined },
      createFields: () => [
        {
          key: 'contactPreference',
          type: 'cool-radio-btn-grp',
          props: {
            options: [{ label: 'Static', value: 'static' }],
          },
        },
      ],
    });

    expect(result.contract.nodes[0]?.valueDomain).toEqual({
      kind: 'enumerated',
      source: 'adapter',
      completeness: 'complete',
      evidence: 'declared',
      values: ['static'],
    });
  });
});
