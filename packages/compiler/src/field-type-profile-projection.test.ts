import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  computeFieldTypeProfileRegistryHash,
  type FieldTypeProfile,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

import {
  prepareFieldTypeProfileExtractionRegistry,
  projectFieldTypeProfile,
  type FieldTypeProfileExtractionRegistry,
} from './field-type-profile-projection.js';

function createRegistry(): FieldTypeProfileRegistry {
  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id: 'fixture.projection-profiles',
    version: 3,
    profiles: [
      {
        identity: { id: 'fixture.radio', version: 1 },
        semanticType: 'single-choice',
        valueShape: 'scalar',
        evidence: 'declared',
        parts: [
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
          collectionPath: 'props.options',
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
      {
        identity: { id: 'fixture.portal', version: 2 },
        semanticType: 'record-choice',
        valueShape: 'object',
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
        valueDomain: {
          kind: 'projected',
          source: 'adapter',
          completeness: 'scenario',
          collectionPath: 'props.records',
          labelPath: 'display.name',
          valuePath: 'model',
          evidence: 'declared',
        },
        driver: {
          kind: 'application',
          id: 'fixture.portal-driver',
          version: 2,
          capabilities: ['select-option'],
        },
        unknowns: [],
      },
    ],
    registrations: [
      {
        formlyType: 'cool-radio-btn-grp',
        defaultProfile: { id: 'fixture.radio', version: 1 },
        variants: [
          {
            name: 'portal',
            profile: { id: 'fixture.portal', version: 2 },
          },
        ],
      },
    ],
    wrappers: [
      {
        identity: { id: 'fixture.expansion', version: 1 },
        wrapperName: 'expansion-panel',
        evidence: 'declared',
        parts: [
          {
            name: 'expand',
            role: 'button',
            cardinality: 'one',
            evidence: 'declared',
          },
        ],
        preconditions: [
          {
            kind: 'activate',
            part: 'expand',
            operation: 'click',
            evidence: 'declared',
          },
        ],
        unknowns: [],
      },
    ],
  };
}

function createBundle(
  registry = createRegistry(),
): FieldTypeProfileExtractionRegistry {
  return {
    schemaVersion: registry.schemaVersion,
    id: registry.id,
    version: registry.version,
    contentHash: computeFieldTypeProfileRegistryHash(registry),
    registry,
  };
}

function prepare(registry = createRegistry()) {
  return prepareFieldTypeProfileExtractionRegistry(createBundle(registry));
}

describe('prepareFieldTypeProfileExtractionRegistry', () => {
  it.each([
    ['schemaVersion', '0.3.0'],
    ['id', 'fixture.other-profiles'],
    ['version', 4],
    ['contentHash', `sha256:${'a'.repeat(64)}`],
  ] as const)('rejects a bundle whose %s contradicts its registry', (key, value) => {
    const bundle = createBundle();

    expect(() =>
      prepareFieldTypeProfileExtractionRegistry({
        ...bundle,
        [key]: value,
      }),
    ).toThrow(`fieldTypeProfiles.${key}`);
  });
});

describe('projectFieldTypeProfile', () => {
  it('projects the exact default profile, ordered options, domain, and wrapper surface', () => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        wrappers: ['expansion-panel'],
        props: {
          options: [
            { label: 'Alpha', value: { code: 'a' }, disabled: false },
            { label: 'Beta', value: { code: 'b' }, disabled: true },
          ],
        },
      },
    });

    expect(result.registry).toEqual(
      expect.objectContaining({
        id: 'fixture.projection-profiles',
        version: 3,
      }),
    );
    expect(result.semanticType).toBe('single-choice');
    expect(result.options).toEqual([
      { label: 'Alpha', value: { code: 'a' }, disabled: false },
      { label: 'Beta', value: { code: 'b' }, disabled: true },
    ]);
    expect(result.valueDomain).toEqual({
      kind: 'enumerated',
      source: 'adapter',
      completeness: 'complete',
      evidence: 'declared',
      values: [{ code: 'a' }, { code: 'b' }],
    });
    expect(result.interactionProfile).toEqual(
      expect.objectContaining({
        profile: { id: 'fixture.radio', version: 1 },
        semanticType: 'single-choice',
        preconditions: [
          {
            kind: 'activate',
            part: 'expand',
            operation: 'click',
            evidence: 'declared',
          },
        ],
        provenance: [
          'registry:fixture.projection-profiles@3',
          'type:cool-radio-btn-grp',
          'wrapper:expansion-panel',
        ],
      }),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('selects only a stable-token root metadata variant', () => {
    const selected = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'resolved',
      field: {
        type: 'cool-radio-btn-grp',
        formlyContract: { profileVariant: 'portal' },
        props: {
          records: [
            { display: { name: 'Primary' }, model: { id: 1 } },
          ],
        },
      },
    });
    const malformed = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        formlyContract: { profileVariant: 'not a token' },
        props: { options: [] },
      },
    });

    expect(selected.interactionProfile?.profile).toEqual({
      id: 'fixture.portal',
      version: 2,
    });
    expect(selected.valueDomain).toEqual(
      expect.objectContaining({
        kind: 'enumerated',
        completeness: 'scenario',
        evidence: 'declared',
      }),
    );
    expect(malformed.interactionProfile).toBeUndefined();
    expect(malformed.diagnostics).toEqual([
      expect.objectContaining({ code: 'UNMAPPED_PROFILE_VARIANT' }),
    ]);
  });

  it('blocks interaction when any declared string wrapper is unresolved', () => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        wrappers: ['missing-wrapper'],
        props: { options: [] },
      },
    });

    expect(result.interactionProfile).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'UNMAPPED_WRAPPER_PROFILE',
        severity: 'error',
      }),
    ]);
  });

  it('blocks interaction for non-string and accessor wrapper entries without invoking accessors', () => {
    let getterCalls = 0;
    const wrappers = ['expansion-panel', 42] as unknown[];
    Object.defineProperty(wrappers, '2', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return 'dialog';
      },
    });
    wrappers.length = 3;

    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        wrappers,
        props: { options: [] },
      },
    });

    expect(getterCalls).toBe(0);
    expect(result.interactionProfile).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_FIELD_SHAPE',
        path: ['wrappers', 1],
      }),
      expect.objectContaining({
        code: 'UNKNOWN_FIELD_SHAPE',
        path: ['wrappers', 2],
      }),
    ]);
  });

  it.each([
    ['missing', undefined],
    ['malformed', { unexpected: true }],
  ])('returns an unknown domain for a %s projected collection', (_name, options) => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        props: options === undefined ? {} : { options },
      },
    });

    expect(result.valueDomain).toEqual({
      kind: 'unknown',
      evidence: 'declared',
    });
    expect(result.options).toEqual([]);
    expect(result.interactionProfile).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'VALUE_DOMAIN_PROJECTION_FAILED' }),
    ]);
  });

  it('distinguishes a deliberately empty projected collection', () => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        props: { options: [] },
      },
    });

    expect(result.valueDomain).toEqual({
      kind: 'enumerated',
      source: 'adapter',
      completeness: 'complete',
      evidence: 'declared',
      values: [],
    });
    expect(result.interactionProfile).toBeDefined();
  });

  it.each([
    ['function', () => []],
    ['string', 'model.availableOptions'],
    ['async', { subscribe: () => undefined }],
  ] as const)(
    'treats a declared expression-backed placeholder collection as unresolved %s data',
    (source, expression) => {
      const result = projectFieldTypeProfile({
        preparedRegistry: prepare(),
        evidence: 'declared',
        field: {
          type: 'cool-radio-btn-grp',
          props: { options: [] },
          expressions: { 'props.options': expression },
        },
      });

      expect(result.valueDomain).toEqual({
        kind: 'dynamic',
        source,
        evidence: 'declared',
      });
      expect(result.options).toEqual([]);
      expect(result.interactionProfile).toBeUndefined();
      expect(result.diagnostics).toEqual([]);
    },
  );

  it.each([
    ['function', () => []],
    ['async', { subscribe: () => undefined }],
  ] as const)(
    'treats a direct unresolved %s collection as dynamic without invoking it',
    (source, options) => {
      let calls = 0;
      const directSource =
        source === 'function'
          ? () => {
              calls += 1;
              return [];
            }
          : {
              subscribe: () => {
                calls += 1;
              },
            };
      expect(options).toBeDefined();

      const result = projectFieldTypeProfile({
        preparedRegistry: prepare(),
        evidence: 'declared',
        field: {
          type: 'cool-radio-btn-grp',
          props: { options: directSource },
        },
      });

      expect(calls).toBe(0);
      expect(result.valueDomain).toEqual({
        kind: 'dynamic',
        source,
        evidence: 'declared',
      });
      expect(result.interactionProfile).toBeUndefined();
    },
  );

  it('does not invoke accessors or option callbacks while projecting paths', () => {
    let getterCalls = 0;
    let callbackCalls = 0;
    const props = Object.defineProperty({}, 'options', {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return [];
      },
    });
    const callback = (): never[] => {
      callbackCalls += 1;
      return [];
    };

    const accessorResult = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: { type: 'cool-radio-btn-grp', props },
    });
    const callbackResult = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        props: { options: callback },
      },
    });

    expect(getterCalls).toBe(0);
    expect(callbackCalls).toBe(0);
    expect(accessorResult.valueDomain?.kind).toBe('unknown');
    expect(callbackResult.valueDomain).toEqual({
      kind: 'dynamic',
      source: 'function',
      evidence: 'declared',
    });
  });

  it.each(['label', 'value', 'disabled'] as const)(
    'does not invoke an accessor at the projected %s path',
    (property) => {
      let getterCalls = 0;
      const option: Record<string, unknown> = {
        label: 'Visible',
        value: 'model-value',
        disabled: false,
      };
      Object.defineProperty(option, property, {
        enumerable: true,
        get: () => {
          getterCalls += 1;
          return property === 'disabled' ? false : 'accessed';
        },
      });

      const result = projectFieldTypeProfile({
        preparedRegistry: prepare(),
        evidence: 'declared',
        field: {
          type: 'cool-radio-btn-grp',
          props: { options: [option] },
        },
      });

      expect(getterCalls).toBe(0);
      expect(result.valueDomain?.kind).toBe('unknown');
      expect(result.interactionProfile).toBeUndefined();
    },
  );

  it('turns duplicate canonical values into a non-leaking projection failure', () => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        props: {
          options: [
            { label: 'Sensitive first', value: { code: 'same' } },
            { label: 'Sensitive second', value: { code: 'same' } },
          ],
        },
      },
    });

    expect(result.valueDomain?.kind).toBe('unknown');
    expect(result.interactionProfile).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'VALUE_DOMAIN_PROJECTION_FAILED' }),
    ]);
    expect(JSON.stringify(result.diagnostics)).not.toContain('Sensitive');
    expect(JSON.stringify(result.diagnostics)).not.toContain('same');
  });

  it('retains an ambiguous enumerated mapping but blocks a generic driver', () => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        props: {
          options: [
            { label: 'Same\u00a0\tlabel', value: 1 },
            { label: ' Same label\n', value: 2 },
          ],
        },
      },
    });

    expect(result.valueDomain).toEqual(
      expect.objectContaining({ kind: 'enumerated', values: [1, 2] }),
    );
    expect(result.options).toHaveLength(2);
    expect(result.interactionProfile).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'AMBIGUOUS_VALUE_MAPPING' }),
    ]);
  });

  it('retains an ambiguous enumerated mapping for an application driver', () => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'declared',
      field: {
        type: 'cool-radio-btn-grp',
        formlyContract: { profileVariant: 'portal' },
        props: {
          records: [
            { display: { name: 'Same\u2003label' }, model: { id: 1 } },
            { display: { name: ' Same label ' }, model: { id: 2 } },
          ],
        },
      },
    });

    expect(result.valueDomain).toEqual(
      expect.objectContaining({
        kind: 'enumerated',
        values: [{ id: 1 }, { id: 2 }],
      }),
    );
    expect(result.interactionProfile?.driver.kind).toBe('application');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'AMBIGUOUS_VALUE_MAPPING' }),
    ]);
  });

  it.each(['expressions', 'expressionProperties'] as const)(
    'downgrades a resolved %s-backed projected collection to scenario completeness without executing it',
    (mapName) => {
      let callbackCalls = 0;
      const result = projectFieldTypeProfile({
        preparedRegistry: prepare(),
        evidence: 'resolved',
        field: {
          type: 'cool-radio-btn-grp',
          props: { options: [{ label: 'Resolved', value: 'resolved' }] },
          [mapName]: {
            'props.options': () => {
              callbackCalls += 1;
              return [];
            },
          },
        },
      });

      expect(callbackCalls).toBe(0);
      expect(result.valueDomain).toEqual(
        expect.objectContaining({
          kind: 'enumerated',
          completeness: 'scenario',
          evidence: 'resolved',
        }),
      );
    },
  );

  it('keeps resolved extraction of a static projected collection declared', () => {
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(),
      evidence: 'resolved',
      field: {
        type: 'cool-radio-btn-grp',
        props: { options: [{ label: 'Static', value: 'static' }] },
      },
    });

    expect(result.valueDomain).toEqual({
      kind: 'enumerated',
      source: 'adapter',
      completeness: 'complete',
      evidence: 'declared',
      values: ['static'],
    });
  });

  it('retains an application interaction for ambiguous, dynamic, unknown, and runtime domains', () => {
    for (const valueDomain of [
      { kind: 'dynamic', source: 'function', evidence: 'declared' },
      { kind: 'unknown', reason: 'Runtime provider.', evidence: 'declared' },
      {
        kind: 'runtime-enumerable',
        completeness: 'scenario',
        optionPart: 'option',
        evidence: 'declared',
      },
    ] as const) {
      const base = createRegistry();
      const applicationProfile: FieldTypeProfile = {
        ...base.profiles[0]!,
        identity: {
          ...base.profiles[0]!.identity,
          version: base.profiles[0]!.identity.version + 10,
        },
        valueDomain,
        driver: {
          kind: 'application',
          id: 'fixture.application-choice',
          version: 1,
          capabilities: ['check'],
        },
      };
      const registry: FieldTypeProfileRegistry = {
        ...base,
        profiles: [applicationProfile, base.profiles[1]!],
        registrations: [
          {
            ...base.registrations[0]!,
            defaultProfile: applicationProfile.identity,
          },
        ],
      };

      const result = projectFieldTypeProfile({
        preparedRegistry: prepare(registry),
        evidence: 'declared',
        field: { type: 'cool-radio-btn-grp', props: {} },
      });

      expect(result.valueDomain?.kind).toBe(
        valueDomain.kind === 'dynamic' ? 'dynamic' : 'unknown',
      );
      expect(result.interactionProfile?.driver.kind).toBe('application');
    }
  });

  it('omits a not-applicable domain without removing an application interaction', () => {
    const base = createRegistry();
    const profile: FieldTypeProfile = {
      ...base.profiles[0]!,
      identity: { id: 'fixture.no-domain', version: 1 },
      valueDomain: { kind: 'not-applicable', evidence: 'declared' },
      driver: {
        kind: 'application',
        id: 'fixture.no-domain-driver',
        version: 1,
        capabilities: ['check'],
      },
    };
    const registry: FieldTypeProfileRegistry = {
      ...base,
      profiles: [profile, base.profiles[1]!],
      registrations: [
        { ...base.registrations[0]!, defaultProfile: profile.identity },
      ],
    };
    const result = projectFieldTypeProfile({
      preparedRegistry: prepare(registry),
      evidence: 'declared',
      field: { type: 'cool-radio-btn-grp' },
    });

    expect(result.valueDomain).toBeUndefined();
    expect(result.options).toEqual([]);
    expect(result.interactionProfile?.driver.kind).toBe('application');
  });
});
