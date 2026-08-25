import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import type { TestFormDefinition } from './form-registry/form-definition.js';
import { TestFormCatalog } from './form-registry/form-registry.js';
import { FormHost } from './form-host.js';

function createDefinition(id: string): TestFormDefinition {
  return {
    id,
    title: `Form ${id}`,
    description: `Synthetic form ${id}`,
    features: ['basic-controls'],
    create: () => ({
      fields: [{ key: 'value', type: 'input' }],
      model: { id },
      formState: { id },
    }),
  };
}

describe('FormHost', () => {
  it('selects the first deterministic catalog entry initially', () => {
    const host = new FormHost(
      new TestFormCatalog([
        [createDefinition('operations.inspection')],
        [createDefinition('applicant.profile')],
      ]),
    );

    expect(host.activeDefinition?.id).toBe('applicant.profile');
    expect(host.model).toEqual({ id: 'applicant.profile' });
  });

  it('replaces the Angular form and fixture state on every selection', () => {
    const host = new FormHost(
      new TestFormCatalog([[createDefinition('applicant.profile')]]),
    );
    const firstForm = host.form;
    const firstFields = host.fields;

    host.select('applicant.profile');

    expect(host.form).not.toBe(firstForm);
    expect(host.fields).not.toBe(firstFields);
    expect(host.options.formState).toEqual({ id: 'applicant.profile' });
  });
});
