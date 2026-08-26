import '@angular/compiler';

import type { FormContract } from '@formly-contract/contract-schema';
import { extractFormContract } from '@formly-contract/formly-adapter';
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

function createHost(definitions: readonly TestFormDefinition[]): FormHost {
  const catalog = new TestFormCatalog([definitions]);
  const contracts = Object.fromEntries(
    definitions.map((definition) => [
      definition.id,
      extractFormContract({
        formId: definition.id,
        fields: definition.create().fields,
      }).contract,
    ]),
  ) satisfies Readonly<Record<string, FormContract>>;

  return new FormHost(catalog, contracts);
}

describe('FormHost', () => {
  it('selects the first deterministic catalog entry initially', () => {
    const host = createHost([
      createDefinition('operations.inspection'),
      createDefinition('applicant.profile'),
    ]);

    expect(host.activeDefinition?.id).toBe('applicant.profile');
    expect(host.model).toEqual({ id: 'applicant.profile' });
    expect(host.contract?.formId).toBe('applicant.profile');
    expect(host.contractMetrics).toEqual({
      controls: 1,
      diagnostics: 0,
      exactLocators: 0,
      nodes: 1,
    });
    expect(host.agentHandoff).toContain(
      'declared configuration; not browser-observed',
    );
  });

  it('replaces the Angular form and fixture state on every selection', () => {
    const host = createHost([createDefinition('applicant.profile')]);
    const firstForm = host.form;
    const firstFields = host.fields;

    host.select('applicant.profile');

    expect(host.form).not.toBe(firstForm);
    expect(host.fields).not.toBe(firstFields);
    expect(host.options.formState).toEqual({ id: 'applicant.profile' });
  });

  it('derives the locator and Playwright walkthrough from extracted facts', () => {
    const definition: TestFormDefinition = {
      id: 'applicant.profile',
      title: 'Applicant profile',
      description: 'Synthetic locator fixture',
      features: ['basic-controls'],
      create: () => ({
        fields: [
          {
            key: 'preferredName',
            id: 'applicant-preferred-name',
            type: 'input',
            props: {
              placeholder: 'Ada Example',
              attributes: {
                'data-testid': 'applicant-preferred-name',
                role: 'textbox',
                'aria-label': 'Preferred name',
              },
            },
          },
        ],
        model: {},
        formState: {},
      }),
    };
    const host = createHost([definition]);

    expect(host.contractMetrics.exactLocators).toBe(4);
    expect(host.locatorDemo.available).toBe(true);
    expect(host.locatorDemo.declarationJson).toContain('data-testid');
    expect(host.locatorDemo.normalizedJson).toContain(
      'applicant-preferred-name',
    );
    expect(host.locatorDemo.testIntentJson).toContain('"op": "set"');
    expect(host.locatorDemo.playwrightCode).toContain(
      'page.getByTestId("applicant-preferred-name")',
    );
  });
});
