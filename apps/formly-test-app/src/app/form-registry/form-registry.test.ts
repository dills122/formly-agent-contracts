import type { FormlyFieldConfig } from '@ngx-formly/core';
import { describe, expect, it } from 'vitest';

import type { TestFormDefinition } from './form-definition.js';
import { TestFormCatalog } from './form-registry.js';

function createDefinition(id: string): TestFormDefinition {
  return {
    id,
    title: `Form ${id}`,
    description: `Synthetic form ${id}`,
    features: ['basic-controls'],
    create: () => ({
      fields: [{ key: 'name', type: 'input' }],
      model: {},
      formState: {},
    }),
  };
}

describe('TestFormCatalog', () => {
  it('sorts definitions by stable form ID', () => {
    const catalog = new TestFormCatalog([
      [createDefinition('operations.inspection')],
      [createDefinition('applicant.profile')],
    ]);

    expect(catalog.list().map(({ id }) => id)).toEqual([
      'applicant.profile',
      'operations.inspection',
    ]);
  });

  it('rejects duplicate form IDs contributed by separate modules', () => {
    expect(
      () =>
        new TestFormCatalog([
          [createDefinition('applicant.profile')],
          [createDefinition('applicant.profile')],
        ]),
    ).toThrowError('Duplicate test form ID: applicant.profile');
  });

  it('creates fresh field, model, and form-state values', () => {
    const definition: TestFormDefinition = {
      ...createDefinition('applicant.profile'),
      create: () => {
        const fields: FormlyFieldConfig[] = [
          { key: 'name', type: 'input' },
        ];
        return { fields, model: {}, formState: {} };
      },
    };
    const catalog = new TestFormCatalog([[definition]]);

    const first = catalog.create('applicant.profile');
    const second = catalog.create('applicant.profile');

    expect(first.fields).not.toBe(second.fields);
    expect(first.fields[0]).not.toBe(second.fields[0]);
    expect(first.model).not.toBe(second.model);
    expect(first.formState).not.toBe(second.formState);
  });

  it('reports an unknown form ID explicitly', () => {
    const catalog = new TestFormCatalog([
      [createDefinition('applicant.profile')],
    ]);

    expect(() => catalog.create('missing.form')).toThrowError(
      'Unknown test form ID: missing.form',
    );
  });
});
