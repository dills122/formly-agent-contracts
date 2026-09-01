import { describe, expect, it } from 'vitest';

import {
  autocompleteChoice,
  buildFieldTypeProfileRegistry,
  choiceControl,
  defineContractedFormlyType,
  radioChoice,
  repeater,
  rowSelection,
  stepper,
  toFormlyTypeRegistration,
  typedInput,
  defineContractedFormlyWrapper,
} from './field-type-authoring.js';
import {
  canonicalizeFieldTypeProfileRegistry,
  computeFieldTypeProfileRegistryHash,
  parseFieldTypeProfileRegistry,
} from './field-type-profile.js';

const NX_RADIO_REGISTRY_CANONICAL =
  '{"id":"fixture.nx-fields","profiles":[{"driver":{"capabilities":["check"],"id":"generic.choice","kind":"generic","version":1},"effectCapabilities":{"readiness":[],"targetProperties":["options"]},"evidence":"declared","identity":{"id":"fixture.nx-cool-radio","version":1},"interaction":{"kind":"choice","operation":"check","optionPart":"option"},"parts":[{"cardinality":"one","evidence":"declared","name":"group","role":"radiogroup"},{"cardinality":"many","evidence":"declared","name":"option","role":"radio"}],"semanticType":"single-choice","unknowns":[],"valueDomain":{"collectionPath":"props.options","completeness":"complete","evidence":"declared","kind":"projected","labelPath":"label","source":"adapter","valuePath":"value"},"valueShape":"scalar"}],"registrations":[{"defaultProfile":{"id":"fixture.nx-cool-radio","version":1},"formlyType":"cool-radio-btn-grp","variants":[]}],"schemaVersion":"0.4.0","version":1,"wrappers":[]}';

function createRadioType(
  name = 'cool-radio-btn-grp',
  profileId = 'fixture.nx-cool-radio',
) {
  return defineContractedFormlyType({
    name,
    profile: { id: profileId, version: 1 },
    behavior: radioChoice(),
  });
}

describe('compact field-type authoring', () => {
  it('lowers typed, choice, structural, and collection presets through one typed builder', () => {
    const authored = [
      defineContractedFormlyType({
        name: 'phone',
        profile: { id: 'fixture.phone', version: 1 },
        behavior: typedInput({ semanticType: 'phone-number' }),
      }),
      defineContractedFormlyType({
        name: 'fund-select',
        profile: { id: 'fixture.fund-select', version: 1 },
        behavior: choiceControl({ presentation: 'overlay' }),
      }),
      defineContractedFormlyType({
        name: 'preferences',
        profile: { id: 'fixture.preferences', version: 1 },
        behavior: choiceControl({
          multiple: true,
          presentation: 'checkbox',
        }),
      }),
      defineContractedFormlyType({
        name: 'advisor-search',
        profile: { id: 'fixture.advisor-search', version: 1 },
        behavior: autocompleteChoice({ completeness: 'scenario' }),
      }),
      defineContractedFormlyType({
        name: 'account-table',
        profile: { id: 'fixture.account-table', version: 1 },
        behavior: rowSelection(),
      }),
      defineContractedFormlyType({
        name: 'dependants',
        profile: { id: 'fixture.dependants', version: 1 },
        behavior: repeater({ expandable: true }),
      }),
      defineContractedFormlyType({
        name: 'application-stepper',
        profile: { id: 'fixture.application-stepper', version: 1 },
        behavior: stepper(),
      }),
    ];

    const registry = buildFieldTypeProfileRegistry({
      id: 'fixture.extended-fields',
      version: 1,
      types: authored,
    });

    expect(parseFieldTypeProfileRegistry(registry)).toBe(registry);
    expect(
      registry.profiles.map(({ semanticType, driver }) => [
        semanticType,
        driver.id,
      ]),
    ).toEqual([
      ['multi-row-selection', 'generic.row-selection'],
      ['single-choice', 'generic.autocomplete'],
      ['stepper', 'generic.stepper'],
      ['repeater', 'generic.repeater'],
      ['single-choice', 'generic.choice'],
      ['phone-number', 'generic.fill'],
      ['multi-choice', 'generic.choice'],
    ]);
    const stepperProfile = registry.profiles.find(
      ({ semanticType }) => semanticType === 'stepper',
    );
    expect(stepperProfile?.driver.capabilities).toEqual([
      'next-step',
      'previous-step',
      'submit-stepper',
    ]);
    expect(stepperProfile?.parts.map(({ name }) => name)).toEqual([
      'step',
      'next',
      'previous',
      'submit',
    ]);
  });

  it('rejects contradictory compact choice presets', () => {
    expect(() =>
      choiceControl({ multiple: true, presentation: 'radio' }),
    ).toThrow('choiceControl.multiple is unsupported for radio');
    expect(() => choiceControl({ presentation: 'checkbox' })).toThrow(
      'choiceControl.multiple must be true for checkbox',
    );
    expect(() => typedInput({ semanticType: 'phone', role: 'button' as 'textbox' }))
      .toThrow('typedInput.role is unsupported');
  });

  it('lowers the default radio preset to the existing canonical Nx registry bytes', () => {
    const registry = buildFieldTypeProfileRegistry({
      id: 'fixture.nx-fields',
      version: 1,
      types: [createRadioType()],
    });

    expect(parseFieldTypeProfileRegistry(registry)).toBe(registry);
    expect(canonicalizeFieldTypeProfileRegistry(registry)).toBe(
      NX_RADIO_REGISTRY_CANONICAL,
    );
    expect(computeFieldTypeProfileRegistryHash(registry)).toBe(
      'sha256:3bf4d2347c67454301b839382ede8b7aa4a206a9ef8d433de0adbf505ae89708',
    );
  });

  it('uses one exact type name for the portable descriptor and Formly registration', () => {
    class CoolRadioComponent {}

    const type = createRadioType();
    const registration = toFormlyTypeRegistration(
      type,
      CoolRadioComponent,
    );
    const registry = buildFieldTypeProfileRegistry({
      id: 'fixture.nx-fields',
      version: 1,
      types: [type],
    });

    expect(registration).toEqual({
      name: 'cool-radio-btn-grp',
      component: CoolRadioComponent,
    });
    expect(registry.registrations).toEqual([
      {
        formlyType: registration.name,
        defaultProfile: { id: 'fixture.nx-cool-radio', version: 1 },
        variants: [],
      },
    ]);
    expect(type).not.toHaveProperty('component');
    expect(registry).not.toHaveProperty('component');
    expect(JSON.stringify(registry)).not.toContain('CoolRadioComponent');
  });

  it('requires an Angular-constructable component without invoking it', () => {
    const type = createRadioType();
    let constructed = false;
    class StatefulComponent {
      constructor() {
        constructed = true;
      }
    }

    expect(toFormlyTypeRegistration(type, StatefulComponent)).toEqual({
      name: 'cool-radio-btn-grp',
      component: StatefulComponent,
    });
    expect(constructed).toBe(false);

    const componentFactory = () => StatefulComponent;
    expect(() =>
      // @ts-expect-error Formly components must be constructable classes.
      toFormlyTypeRegistration(type, componentFactory),
    ).toThrow('component must be a component constructor');
  });

  it('emits the same ordered registry for either contribution order', () => {
    const alpha = createRadioType('alpha-radio', 'fixture.profile-zeta');
    const zeta = createRadioType('zeta-radio', 'fixture.profile-alpha');

    const first = buildFieldTypeProfileRegistry({
      id: 'fixture.ordered-fields',
      version: 1,
      types: [alpha, zeta],
    });
    const second = buildFieldTypeProfileRegistry({
      id: 'fixture.ordered-fields',
      version: 1,
      types: [zeta, alpha],
    });

    expect(first).toEqual(second);
    expect(first.profiles.map(({ identity }) => identity.id)).toEqual([
      'fixture.profile-alpha',
      'fixture.profile-zeta',
    ]);
    expect(first.registrations.map(({ formlyType }) => formlyType)).toEqual([
      'alpha-radio',
      'zeta-radio',
    ]);
  });

  it('rejects duplicate Formly names and duplicate profile identities', () => {
    expect(() =>
      buildFieldTypeProfileRegistry({
        id: 'fixture.duplicate-name',
        version: 1,
        types: [
          createRadioType('duplicate-radio', 'fixture.profile-one'),
          createRadioType('duplicate-radio', 'fixture.profile-two'),
        ],
      }),
    ).toThrow('duplicates Formly type name "duplicate-radio"');

    expect(() =>
      buildFieldTypeProfileRegistry({
        id: 'fixture.duplicate-profile',
        version: 1,
        types: [
          createRadioType('first-radio', 'fixture.shared-profile'),
          createRadioType('second-radio', 'fixture.shared-profile'),
        ],
      }),
    ).toThrow('duplicates profile identity "fixture.shared-profile@1"');
  });

  it('rejects malformed registry, type, profile, and option-path identities', () => {
    expect(() =>
      buildFieldTypeProfileRegistry({
        id: 'notnamespaced',
        version: 1,
        types: [createRadioType()],
      }),
    ).toThrow('registry.id must be a stable namespaced identifier');
    expect(() => createRadioType('not/a/type')).toThrow(
      'type.name must be a stable token',
    );
    expect(() => createRadioType('radio', 'notnamespaced')).toThrow(
      'type.profile.id must be a stable namespaced identifier',
    );
    expect(() =>
      defineContractedFormlyType({
        name: 'radio',
        profile: { id: 'fixture.radio', version: 0 },
        behavior: radioChoice(),
      }),
    ).toThrow('type.profile.version must be a positive safe integer');
    expect(() => radioChoice({ collectionPath: 'options' })).toThrow(
      'radioChoice.collectionPath must be a dot-delimited property path rooted at props',
    );
    expect(() => radioChoice({ labelPath: 'display-label' })).toThrow(
      'radioChoice.labelPath must be a dot-delimited property path',
    );
  });

  it('rejects unsupported behavior and radio-choice options at the lowering boundary', () => {
    const unsupported = {
      name: 'unsupported-radio',
      profile: { id: 'fixture.unsupported-radio', version: 1 },
      behavior: { kind: 'future-control' },
    } as unknown as ReturnType<typeof createRadioType>;

    expect(() =>
      buildFieldTypeProfileRegistry({
        id: 'fixture.unsupported-fields',
        version: 1,
        types: [unsupported],
      }),
    ).toThrow(
      'registry.types[0].behavior.kind "future-control" is unsupported',
    );
    expect(() =>
      radioChoice({ completeness: 'unknown' as 'complete' }),
    ).toThrow('radioChoice.completeness is unsupported');
  });

  it('snapshots and freezes authored definitions before deriving registrations or profiles', () => {
    const profile = { id: 'fixture.mutable-radio', version: 1 };
    const definition = {
      name: 'mutable-radio',
      profile,
      behavior: radioChoice(),
    };
    const type = defineContractedFormlyType(definition);

    definition.name = 'changed-radio';
    profile.id = 'fixture.changed-radio';
    Reflect.set(definition.behavior, 'labelPath', 'changedLabel');

    expect(Object.isFrozen(type)).toBe(true);
    expect(Object.isFrozen(type.profile)).toBe(true);
    expect(Object.isFrozen(type.behavior)).toBe(true);
    expect(Reflect.set(type, 'name', 'other-radio')).toBe(false);
    expect(Reflect.set(type.profile, 'id', 'fixture.other-radio')).toBe(false);

    class MutableRadioComponent {}
    const registration = toFormlyTypeRegistration(
      type,
      MutableRadioComponent,
    );
    const registry = buildFieldTypeProfileRegistry({
      id: 'fixture.mutable-fields',
      version: 1,
      types: [type],
    });

    expect(registration.name).toBe('mutable-radio');
    expect(registry.profiles[0]?.identity).toEqual({
      id: 'fixture.mutable-radio',
      version: 1,
    });
    expect(registry.registrations[0]?.defaultProfile).toEqual({
      id: 'fixture.mutable-radio',
      version: 1,
    });
    expect(registry.profiles[0]?.valueDomain).toMatchObject({
      labelPath: 'label',
    });
    expect(parseFieldTypeProfileRegistry(registry)).toBe(registry);
  });

  it('rejects inherited profile data instead of emitting a non-canonical object', () => {
    const inheritedProfile = Object.create({
      id: 'fixture.inherited-radio',
      version: 1,
    }) as { id: string; version: number };

    expect(() =>
      defineContractedFormlyType({
        name: 'inherited-radio',
        profile: inheritedProfile,
        behavior: radioChoice(),
      }),
    ).toThrow('type.profile must be a plain or null-prototype object');
  });

  it('rejects accessors without executing author-provided code', () => {
    let accessorExecuted = false;
    const profile = { version: 1 } as { id: string; version: number };
    Object.defineProperty(profile, 'id', {
      enumerable: true,
      get: () => {
        accessorExecuted = true;
        return 'fixture.accessor-radio';
      },
    });

    expect(() =>
      defineContractedFormlyType({
        name: 'accessor-radio',
        profile,
        behavior: radioChoice(),
      }),
    ).toThrow('type.profile must contain only data properties');
    expect(accessorExecuted).toBe(false);
  });

  it('rejects symbols and non-enumerable descriptor properties', () => {
    const symbolProfile = {
      id: 'fixture.symbol-radio',
      version: 1,
      [Symbol('metadata')]: true,
    };
    expect(() =>
      defineContractedFormlyType({
        name: 'symbol-radio',
        profile: symbolProfile,
        behavior: radioChoice(),
      }),
    ).toThrow('type.profile must contain only string-keyed properties');

    const hiddenProfile = { version: 1 } as {
      id: string;
      version: number;
    };
    Object.defineProperty(hiddenProfile, 'id', {
      enumerable: false,
      value: 'fixture.hidden-radio',
    });
    expect(() =>
      defineContractedFormlyType({
        name: 'hidden-radio',
        profile: hiddenProfile,
        behavior: radioChoice(),
      }),
    ).toThrow('type.profile properties must be enumerable');
  });

  it('rejects sparse, extended, and cyclic authoring inputs', () => {
    const sparseTypes = new Array(1) as ReturnType<
      typeof createRadioType
    >[];
    expect(() =>
      buildFieldTypeProfileRegistry({
        id: 'fixture.sparse-fields',
        version: 1,
        types: sparseTypes,
      }),
    ).toThrow('registry.types must be a dense plain array');

    const extendedTypes = [createRadioType()] as ReturnType<
      typeof createRadioType
    >[] & { extra?: boolean };
    extendedTypes.extra = true;
    expect(() =>
      buildFieldTypeProfileRegistry({
        id: 'fixture.extended-fields',
        version: 1,
        types: extendedTypes,
      }),
    ).toThrow('registry.types must be a dense plain array');

    const cyclicType: Record<string, unknown> = {
      name: 'cyclic-radio',
      behavior: radioChoice(),
    };
    cyclicType.profile = cyclicType;
    expect(() =>
      defineContractedFormlyType(
        cyclicType as unknown as ReturnType<typeof createRadioType>,
      ),
    ).toThrow('type.profile contains unknown property name');
  });

  it('authors wrapper activation without a verbose registry object', () => {
    const wrapper = defineContractedFormlyWrapper({
      name: 'expansion-panel',
      profile: { id: 'fixture.expansion-wrapper', version: 1 },
      activation: {},
    });
    const registry = buildFieldTypeProfileRegistry({
      id: 'fixture.wrapper-fields',
      version: 1,
      types: [],
      wrappers: [wrapper],
    });
    expect(registry.wrappers).toEqual([{
      identity: { id: 'fixture.expansion-wrapper', version: 1 },
      wrapperName: 'expansion-panel',
      evidence: 'declared',
      parts: [{ name: 'activate', role: 'button', cardinality: 'one', evidence: 'declared' }],
      preconditions: [{ kind: 'activate', part: 'activate', operation: 'click', evidence: 'declared' }],
      unknowns: [],
    }]);
    expect(parseFieldTypeProfileRegistry(registry)).toEqual(registry);
  });
});
