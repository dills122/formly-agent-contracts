// Angular's partial-compiled packages use the JIT fallback in this Node-based
// compatibility test, so the compiler must load before Angular Forms.
// Source: https://angular.dev/tools/libraries/creating-libraries#consuming-partial-ivy-code-outside-the-angular-cli
import '@angular/compiler';

import { FormGroup } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';
import { describe, expect, it } from 'vitest';

import { compileFormContractScenario } from '@formly-contract/compiler';

import {
  buildSyntheticForm,
  createSyntheticFormBuilder,
} from './compatibility.js';

describe('Angular 20.3 and Formly 6.1 compatibility', () => {
  it('builds a typed Formly configuration with the registered core extensions', () => {
    const result = buildSyntheticForm();
    const fields: readonly FormlyFieldConfig[] = result.fields;
    const displayName = fields[0]?.fieldGroup?.[0];

    expect(result.root.form).toBeInstanceOf(FormGroup);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.parent).toBe(result.root);
    expect(fields[0]?.formControl).toBeDefined();
    expect(displayName?.formControl).toBeDefined();
    expect(displayName?.props?.type).toBe('text');
  });

  it('resolves callback-driven initial state through the trusted Formly builder', () => {
    const builder = createSyntheticFormBuilder();
    const result = compileFormContractScenario({
      formId: 'scenario.dynamic-choice',
      builder,
      model: { mode: 'advanced' },
      formState: { readonly: true },
      locatorOptions: {
        deriveLocators: ({ formlyType }) =>
          formlyType === 'select'
            ? [
                {
                  target: 'menu',
                  strategy: 'testId',
                  attribute: 'data-testid',
                  value: 'advanced-choice-menu',
                },
              ]
            : [],
      },
      createFields: () => [
        {
          key: 'choice',
          type: 'select',
          props: { label: 'Choice', attributes: {} },
          hideExpression: (model: Readonly<{ mode?: string }>) =>
            model.mode !== 'advanced',
          expressionProperties: {
            'props.required': (model: Readonly<{ mode?: string }>) =>
              model.mode === 'advanced',
            'props.readonly': (
              _model: unknown,
              formState: Readonly<{ readonly?: boolean }>,
            ) => formState.readonly === true,
            'props.options': (model: Readonly<{ mode?: string }>) =>
              model.mode === 'advanced'
                ? [
                    { label: 'Alpha', value: 'alpha' },
                    { label: 'Beta', value: 'beta' },
                  ]
                : [],
            'props.attributes.data-testid': (
              model: Readonly<{ mode?: string }>,
            ) => `${model.mode ?? 'basic'}-choice`,
          },
        },
      ],
    });
    const choice = result.contract.nodes[0];

    expect(choice).toEqual(
      expect.objectContaining({
        evidence: 'resolved',
        constraints: [{ kind: 'required' }],
        options: [
          { label: 'Alpha', value: 'alpha' },
          { label: 'Beta', value: 'beta' },
        ],
        optionSource: {
          kind: 'dynamic',
          property: 'props.options',
          source: 'function',
          evidence: 'resolved',
        },
        state: { hidden: false, readonly: true, disabled: false },
      }),
    );
    expect(choice?.dynamicRules).toContainEqual({
      id: 'scenario.dynamic-choice::path:s_choice::rule:expressionProperties:props.required',
      property: 'props.required',
      source: 'function',
      evidence: 'resolved',
      resolvedValue: true,
    });
    expect(choice?.dynamicRules).toContainEqual({
      id: 'scenario.dynamic-choice::path:s_choice::rule:expressionProperties:props.options',
      property: 'props.options',
      source: 'function',
      evidence: 'resolved',
      resolvedValue: [
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta' },
      ],
    });
    expect(choice?.locators).toContainEqual({
      target: 'control',
      strategy: 'testId',
      attribute: 'data-testid',
      value: 'advanced-choice',
      evidence: 'resolved',
      confidence: 'exact',
    });
    expect(choice?.locators).toContainEqual({
      target: 'menu',
      strategy: 'testId',
      attribute: 'data-testid',
      value: 'advanced-choice-menu',
      evidence: 'resolved',
      confidence: 'derived',
    });
    expect(choice?.locators.some(({ evidence }) => evidence === 'observed')).toBe(
      false,
    );
    expect(result.diagnostics).toEqual([]);
  });
});
