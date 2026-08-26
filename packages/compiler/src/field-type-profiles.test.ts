import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  computeFieldTypeProfileRegistryHash,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

import {
  FieldTypeProfileResolutionError,
  resolveFieldTypeProfile,
} from './field-type-profiles.js';

function createRegistry(): FieldTypeProfileRegistry {
  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id: 'fixture.adapter-profiles',
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
          collectionPath: 'props.options',
          labelPath: 'label',
          valuePath: 'value',
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
        identity: { id: 'fixture.portal-radio', version: 2 },
        semanticType: 'single-choice',
        valueShape: 'object',
        evidence: 'declared',
        parts: [
          {
            name: 'trigger',
            role: 'button',
            cardinality: 'one',
            evidence: 'declared',
          },
          {
            name: 'popup',
            role: 'listbox',
            cardinality: 'one',
            evidence: 'declared',
          },
          {
            name: 'option',
            role: 'option',
            cardinality: 'many',
            evidence: 'declared',
          },
        ],
        interaction: {
          kind: 'choice',
          operation: 'select-from-overlay',
          triggerPart: 'trigger',
          popupPart: 'popup',
          optionPart: 'option',
        },
        valueDomain: {
          kind: 'projected',
          source: 'adapter',
          completeness: 'scenario',
          collectionPath: 'props.records',
          labelPath: 'name',
          valuePath: 'record',
          evidence: 'declared',
        },
        driver: {
          kind: 'application',
          id: 'fixture.portal-driver',
          version: 2,
          capabilities: ['select-from-overlay'],
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
            profile: { id: 'fixture.portal-radio', version: 2 },
          },
        ],
      },
    ],
    wrappers: [
      {
        identity: { id: 'fixture.expansion-wrapper', version: 1 },
        wrapperName: 'expansion-panel',
        evidence: 'declared',
        parts: [
          {
            name: 'wrapper-expand',
            role: 'button',
            cardinality: 'one',
            evidence: 'declared',
          },
        ],
        preconditions: [
          {
            kind: 'activate',
            part: 'wrapper-expand',
            operation: 'click',
            evidence: 'declared',
          },
        ],
        unknowns: [],
      },
      {
        identity: { id: 'fixture.dialog-wrapper', version: 1 },
        wrapperName: 'dialog',
        evidence: 'declared',
        parts: [
          {
            name: 'dialog-open',
            role: 'button',
            cardinality: 'one',
            evidence: 'declared',
          },
        ],
        preconditions: [
          {
            kind: 'activate',
            part: 'dialog-open',
            operation: 'click',
            evidence: 'declared',
          },
        ],
        unknowns: [],
      },
    ],
  };
}

function expectResolutionError(
  action: () => unknown,
  code: FieldTypeProfileResolutionError['code'],
  subject: string,
): void {
  try {
    action();
    throw new Error('Expected profile resolution to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(FieldTypeProfileResolutionError);
    expect(error).toMatchObject({ code, subject });
  }
}

describe('resolveFieldTypeProfile', () => {
  it('selects the exact Formly type default without inventing a variant', () => {
    const registry = createRegistry();
    const resolved = resolveFieldTypeProfile(registry, {
      formlyType: 'cool-radio-btn-grp',
      wrappers: [],
    });

    expect(resolved.profile.identity).toEqual({
      id: 'fixture.radio',
      version: 1,
    });
    expect(resolved.parts).toEqual(resolved.profile.parts);
    expect(resolved.preconditions).toEqual([]);
    expect(resolved.provenance).toEqual([
      'registry:fixture.adapter-profiles@1',
      'type:cool-radio-btn-grp',
    ]);
    expect(resolved.registry).toEqual({
      schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
      id: 'fixture.adapter-profiles',
      version: 1,
      contentHash: computeFieldTypeProfileRegistryHash(registry),
    });
  });

  it('selects only a declared named variant and retains serialized driver identity', () => {
    const resolved = resolveFieldTypeProfile(createRegistry(), {
      formlyType: 'cool-radio-btn-grp',
      variant: 'portal',
      wrappers: [],
    });

    expect(resolved.profile.identity).toEqual({
      id: 'fixture.portal-radio',
      version: 2,
    });
    expect(resolved.profile.driver).toEqual({
      kind: 'application',
      id: 'fixture.portal-driver',
      version: 2,
      capabilities: ['select-from-overlay'],
    });
    expect(resolved.provenance).toEqual([
      'registry:fixture.adapter-profiles@1',
      'type:cool-radio-btn-grp',
      'variant:portal',
    ]);
    expect(() => structuredClone(resolved)).not.toThrow();
  });

  it('composes wrapper parts and preconditions in declared request order', () => {
    const first = resolveFieldTypeProfile(createRegistry(), {
      formlyType: 'cool-radio-btn-grp',
      wrappers: ['expansion-panel', 'dialog'],
    });
    const reversed = resolveFieldTypeProfile(createRegistry(), {
      formlyType: 'cool-radio-btn-grp',
      wrappers: ['dialog', 'expansion-panel'],
    });

    expect(first.parts.map(({ name }) => name)).toEqual([
      'group',
      'option',
      'wrapper-expand',
      'dialog-open',
    ]);
    expect(first.preconditions.map(({ part }) => part)).toEqual([
      'wrapper-expand',
      'dialog-open',
    ]);
    expect(first.provenance).toEqual([
      'registry:fixture.adapter-profiles@1',
      'type:cool-radio-btn-grp',
      'wrapper:expansion-panel',
      'wrapper:dialog',
    ]);
    expect(reversed.preconditions.map(({ part }) => part)).toEqual([
      'dialog-open',
      'wrapper-expand',
    ]);
  });

  it('returns stable typed diagnostics for unmapped types, variants, and wrappers', () => {
    const registry = createRegistry();
    expectResolutionError(
      () =>
        resolveFieldTypeProfile(registry, {
          formlyType: 'Cool-Radio-Btn-Grp',
          wrappers: [],
        }),
      'UNMAPPED_FIELD_TYPE',
      'Cool-Radio-Btn-Grp',
    );
    expectResolutionError(
      () =>
        resolveFieldTypeProfile(registry, {
          formlyType: 'cool-radio-btn-grp',
          variant: 'missing',
          wrappers: [],
        }),
      'UNMAPPED_PROFILE_VARIANT',
      'cool-radio-btn-grp/missing',
    );
    expectResolutionError(
      () =>
        resolveFieldTypeProfile(registry, {
          formlyType: 'cool-radio-btn-grp',
          wrappers: ['missing'],
        }),
      'UNMAPPED_WRAPPER_PROFILE',
      'missing',
    );
  });

  it('rejects duplicate wrapper requests before composing their surfaces', () => {
    expectResolutionError(
      () =>
        resolveFieldTypeProfile(createRegistry(), {
          formlyType: 'cool-radio-btn-grp',
          wrappers: ['dialog', 'dialog'],
        }),
      'DUPLICATE_WRAPPER_REQUEST',
      'dialog',
    );
  });

  it('rejects wrapper parts that conflict with the type or an earlier wrapper', () => {
    const typeConflictBase = createRegistry();
    const typeConflict: FieldTypeProfileRegistry = {
      ...typeConflictBase,
      wrappers: typeConflictBase.wrappers.map((wrapper, index) =>
        index === 0
          ? {
              ...wrapper,
              parts: wrapper.parts.map((part) => ({
                ...part,
                name: 'option',
              })),
              preconditions: wrapper.preconditions.map((precondition) => ({
                ...precondition,
                part: 'option',
              })),
            }
          : wrapper,
      ),
    };
    const wrapperConflictBase = createRegistry();
    const wrapperConflict: FieldTypeProfileRegistry = {
      ...wrapperConflictBase,
      wrappers: wrapperConflictBase.wrappers.map((wrapper, index) =>
        index === 1
          ? {
              ...wrapper,
              parts: wrapper.parts.map((part) => ({
                ...part,
                name: 'wrapper-expand',
              })),
              preconditions: wrapper.preconditions.map((precondition) => ({
                ...precondition,
                part: 'wrapper-expand',
              })),
            }
          : wrapper,
      ),
    };

    expectResolutionError(
      () =>
        resolveFieldTypeProfile(typeConflict, {
          formlyType: 'cool-radio-btn-grp',
          wrappers: ['expansion-panel'],
        }),
      'PROFILE_PART_CONFLICT',
      'option',
    );
    expectResolutionError(
      () =>
        resolveFieldTypeProfile(wrapperConflict, {
          formlyType: 'cool-radio-btn-grp',
          wrappers: ['expansion-panel', 'dialog'],
        }),
      'PROFILE_PART_CONFLICT',
      'wrapper-expand',
    );
  });

  it('blocks generic execution when a composed wrapper has a codec, locator, or sequence unknown', () => {
    for (const aspect of [
      'model-codec',
      'locator-scope',
      'interaction-sequence',
    ] as const) {
      const base = createRegistry();
      const blocked: FieldTypeProfileRegistry = {
        ...base,
        wrappers: base.wrappers.map((wrapper, index) =>
          index === 0
            ? {
                ...wrapper,
                unknowns: [
                  {
                    aspect,
                    reason: `${aspect} is owned by the wrapper.`,
                    evidence: 'declared',
                  },
                ],
              }
            : wrapper,
        ),
      };

      expectResolutionError(
        () =>
          resolveFieldTypeProfile(blocked, {
            formlyType: 'cool-radio-btn-grp',
            wrappers: ['expansion-panel'],
          }),
        'WRAPPER_BLOCKS_GENERIC_DRIVER',
        `expansion-panel/${aspect}`,
      );
    }
  });

  it('retains nonblocking wrapper runtime-state unknowns with serializable provenance', () => {
    const base = createRegistry();
    const runtimeVariable: FieldTypeProfileRegistry = {
      ...base,
      wrappers: base.wrappers.map((wrapper, index) =>
        index === 0
          ? {
              ...wrapper,
              unknowns: [
                {
                  aspect: 'runtime-states',
                  reason:
                    'The panel may already be expanded in some scenarios.',
                  evidence: 'observed',
                },
              ],
            }
          : wrapper,
      ),
    };

    const resolved = resolveFieldTypeProfile(runtimeVariable, {
      formlyType: 'cool-radio-btn-grp',
      wrappers: ['expansion-panel'],
    });

    expect(resolved.unknowns).toEqual([
      {
        scope: 'wrapper',
        source: 'expansion-panel',
        aspect: 'runtime-states',
        reason: 'The panel may already be expanded in some scenarios.',
        evidence: 'observed',
      },
    ]);
    expect(() => structuredClone(resolved)).not.toThrow();
  });
});
