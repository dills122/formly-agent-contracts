import { describe, expect, it } from 'vitest';

import {
  computeProfileRegistryHash,
  resolveFieldTypeProfile,
  type FieldTypeProfileRegistry,
  validateFieldTypeProfileRegistry,
} from './field-type-profile.spike.js';

const matrixRegistry: FieldTypeProfileRegistry = {
  profiles: [
    {
      id: 'fixture.button-toggle',
      version: 1,
      semanticType: 'single-choice',
      valueShape: 'scalar',
      parts: [
        { name: 'group', role: 'radiogroup' },
        { name: 'option', role: 'radio', multiple: true },
      ],
      interaction: {
        kind: 'choice',
        optionPart: 'option',
        activation: 'click',
      },
      valueDomain: {
        kind: 'projected',
        completeness: 'declared',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
      },
      driver: { kind: 'generic', id: 'generic.choice', version: 1 },
    },
    {
      id: 'fixture.overlay-select',
      version: 1,
      semanticType: 'single-choice',
      valueShape: 'scalar',
      parts: [
        { name: 'trigger', role: 'button' },
        { name: 'popup', role: 'listbox' },
        { name: 'option', role: 'option', multiple: true },
      ],
      interaction: {
        kind: 'choice',
        triggerPart: 'trigger',
        popupPart: 'popup',
        optionPart: 'option',
        activation: 'click',
      },
      valueDomain: {
        kind: 'projected',
        completeness: 'scenario',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
      },
      driver: { kind: 'generic', id: 'generic.choice', version: 1 },
    },
    {
      id: 'fixture.portal-overlay-select',
      version: 1,
      semanticType: 'single-choice',
      valueShape: 'object',
      parts: [
        { name: 'trigger', role: 'button' },
        { name: 'option', role: 'option', multiple: true },
      ],
      interaction: {
        kind: 'choice',
        triggerPart: 'trigger',
        optionPart: 'option',
        activation: 'click',
      },
      valueDomain: { kind: 'unknown', reason: 'remote-filtered' },
      driver: {
        kind: 'application',
        id: 'fixture.portal-overlay-select',
        version: 2,
      },
    },
    {
      id: 'fixture.autocomplete',
      version: 1,
      semanticType: 'single-choice',
      valueShape: 'scalar',
      parts: [
        { name: 'query', role: 'combobox' },
        { name: 'popup', role: 'listbox' },
        { name: 'option', role: 'option', multiple: true },
      ],
      interaction: {
        kind: 'autocomplete',
        queryPart: 'query',
        popupPart: 'popup',
        optionPart: 'option',
      },
      valueDomain: {
        kind: 'projected',
        completeness: 'scenario',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
      },
      driver: { kind: 'generic', id: 'generic.autocomplete', version: 1 },
    },
    {
      id: 'fixture.table-select',
      version: 1,
      semanticType: 'multi-choice',
      valueShape: 'array',
      parts: [
        { name: 'table', role: 'grid' },
        { name: 'row', role: 'row', multiple: true },
        { name: 'selection', role: 'checkbox', multiple: true },
      ],
      interaction: {
        kind: 'row-selection',
        rowPart: 'row',
        selectionPart: 'selection',
        activation: 'check',
      },
      valueDomain: {
        kind: 'projected',
        completeness: 'declared',
        collectionPath: 'props.rowOptions',
        labelPath: 'label',
        valuePath: 'id',
      },
      driver: { kind: 'generic', id: 'generic.row-selection', version: 1 },
    },
    {
      id: 'fixture.expandable-repeater',
      version: 1,
      semanticType: 'repeater',
      valueShape: 'array',
      parts: [
        { name: 'add', role: 'button' },
        { name: 'item', role: 'group', multiple: true },
        { name: 'expand', role: 'button', multiple: true },
      ],
      interaction: {
        kind: 'repeater',
        addPart: 'add',
        itemPart: 'item',
        expandPart: 'expand',
      },
      valueDomain: { kind: 'not-applicable' },
      driver: { kind: 'generic', id: 'generic.repeater', version: 1 },
    },
  ],
  registrations: [
    {
      formlyType: 'button-toggle',
      defaultProfileId: 'fixture.button-toggle',
    },
    {
      formlyType: 'overlay-select',
      defaultProfileId: 'fixture.overlay-select',
      variants: {
        portal: 'fixture.portal-overlay-select',
      },
    },
    {
      formlyType: 'autocomplete',
      defaultProfileId: 'fixture.autocomplete',
    },
    {
      formlyType: 'table-select',
      defaultProfileId: 'fixture.table-select',
    },
    {
      formlyType: 'expandable-repeater',
      defaultProfileId: 'fixture.expandable-repeater',
    },
  ],
  wrappers: [
    {
      id: 'fixture.expansion-wrapper',
      version: 1,
      wrapperName: 'expansion-panel',
      parts: [{ name: 'wrapperExpand', role: 'button' }],
      preconditions: [{ kind: 'activate', part: 'wrapperExpand' }],
    },
  ],
};

describe('field-type profile registry spike', () => {
  it('validates the complete interaction matrix', () => {
    expect(validateFieldTypeProfileRegistry(matrixRegistry)).toEqual([]);
  });

  it('resolves an explicit field variant before ordered wrapper contributions', () => {
    const resolved = resolveFieldTypeProfile(matrixRegistry, {
      formlyType: 'overlay-select',
      variant: 'portal',
      wrappers: ['expansion-panel'],
    });

    expect(resolved.profile.id).toBe('fixture.portal-overlay-select');
    expect(resolved.profile.driver).toEqual({
      kind: 'application',
      id: 'fixture.portal-overlay-select',
      version: 2,
    });
    expect(resolved.parts).toContainEqual({
      name: 'wrapperExpand',
      role: 'button',
    });
    expect(resolved.preconditions).toEqual([
      { kind: 'activate', part: 'wrapperExpand' },
    ]);
    expect(resolved.provenance).toEqual([
      'type:overlay-select',
      'variant:portal',
      'wrapper:expansion-panel',
    ]);
  });

  it('hashes registry identity canonically and includes adapter versions', () => {
    const reordered: FieldTypeProfileRegistry = {
      profiles: [...matrixRegistry.profiles].reverse(),
      registrations: [...matrixRegistry.registrations].reverse(),
      wrappers: [...matrixRegistry.wrappers].reverse(),
    };
    const changed: FieldTypeProfileRegistry = {
      ...matrixRegistry,
      profiles: matrixRegistry.profiles.map((profile) =>
        profile.id === 'fixture.button-toggle'
          ? { ...profile, version: 2 }
          : profile,
      ),
    };

    expect(computeProfileRegistryHash(reordered)).toBe(
      computeProfileRegistryHash(matrixRegistry),
    );
    expect(computeProfileRegistryHash(changed)).not.toBe(
      computeProfileRegistryHash(matrixRegistry),
    );
  });

  it('rejects an incompatible generic driver instead of guessing execution', () => {
    const invalid: FieldTypeProfileRegistry = {
      ...matrixRegistry,
      profiles: matrixRegistry.profiles.map((profile) =>
        profile.id === 'fixture.autocomplete'
          ? {
              ...profile,
              driver: {
                kind: 'generic' as const,
                id: 'generic.choice' as const,
                version: 1,
              },
            }
          : profile,
      ),
    };

    expect(validateFieldTypeProfileRegistry(invalid)).toContainEqual({
      code: 'INCOMPATIBLE_GENERIC_DRIVER',
      subject: 'fixture.autocomplete',
      message:
        'Interaction autocomplete requires generic.autocomplete, received generic.choice.',
    });
    expect(() =>
      resolveFieldTypeProfile(invalid, {
        formlyType: 'autocomplete',
        wrappers: [],
      }),
    ).toThrow(
      'INVALID_PROFILE_REGISTRY: INCOMPATIBLE_GENERIC_DRIVER fixture.autocomplete',
    );
  });

  it('rejects a generic choice driver without a declared label-to-model-value mapping', () => {
    const invalid: FieldTypeProfileRegistry = {
      ...matrixRegistry,
      profiles: matrixRegistry.profiles.map((profile) =>
        profile.id === 'fixture.overlay-select'
          ? {
              ...profile,
              valueDomain: {
                kind: 'runtime-enumerable' as const,
                completeness: 'scenario' as const,
                optionPart: 'option',
              },
            }
          : profile,
      ),
    };

    expect(validateFieldTypeProfileRegistry(invalid)).toContainEqual({
      code: 'GENERIC_DRIVER_VALUE_MAPPING_REQUIRED',
      subject: 'fixture.overlay-select',
      message:
        'Generic choice execution requires a projected label-to-model-value mapping.',
    });
  });

  it('diagnoses missing part and profile references', () => {
    const invalid: FieldTypeProfileRegistry = {
      ...matrixRegistry,
      profiles: matrixRegistry.profiles.map((profile) =>
        profile.id === 'fixture.button-toggle'
          ? {
              ...profile,
              parts: profile.parts.filter(({ name }) => name !== 'option'),
            }
          : profile,
      ),
      registrations: matrixRegistry.registrations.map((registration) =>
        registration.formlyType === 'autocomplete'
          ? { ...registration, defaultProfileId: 'fixture.missing' }
          : registration,
      ),
    };

    expect(validateFieldTypeProfileRegistry(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNKNOWN_PART_REFERENCE',
          subject: 'fixture.button-toggle',
        }),
        expect.objectContaining({
          code: 'UNKNOWN_PROFILE_REFERENCE',
          subject: 'autocomplete',
        }),
      ]),
    );
  });

  it('diagnoses duplicate registrations and invalid application driver IDs', () => {
    const invalid: FieldTypeProfileRegistry = {
      profiles: [
        ...matrixRegistry.profiles,
        { ...matrixRegistry.profiles[0]!, id: 'fixture.button-toggle' },
        {
          ...matrixRegistry.profiles[2]!,
          id: 'fixture.invalid-driver',
          driver: { kind: 'application', id: 'Not Namespaced', version: 1 },
        },
      ],
      registrations: [
        ...matrixRegistry.registrations,
        { ...matrixRegistry.registrations[0]! },
      ],
      wrappers: [
        ...matrixRegistry.wrappers,
        { ...matrixRegistry.wrappers[0]!, id: 'fixture.duplicate-wrapper' },
      ],
    };

    expect(validateFieldTypeProfileRegistry(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_PROFILE_ID' }),
        expect.objectContaining({ code: 'DUPLICATE_FORMLY_TYPE' }),
        expect.objectContaining({ code: 'DUPLICATE_WRAPPER_NAME' }),
        expect.objectContaining({
          code: 'INVALID_APPLICATION_DRIVER',
          subject: 'fixture.invalid-driver',
        }),
      ]),
    );
  });

  it('fails early for unmapped types, variants, and wrappers', () => {
    expect(() =>
      resolveFieldTypeProfile(matrixRegistry, {
        formlyType: 'unknown-control',
        wrappers: [],
      }),
    ).toThrow('UNMAPPED_FIELD_TYPE: unknown-control');
    expect(() =>
      resolveFieldTypeProfile(matrixRegistry, {
        formlyType: 'overlay-select',
        variant: 'missing',
        wrappers: [],
      }),
    ).toThrow('UNMAPPED_PROFILE_VARIANT: overlay-select/missing');
    expect(() =>
      resolveFieldTypeProfile(matrixRegistry, {
        formlyType: 'button-toggle',
        wrappers: ['missing-wrapper'],
      }),
    ).toThrow('UNMAPPED_WRAPPER_PROFILE: missing-wrapper');
  });
});
