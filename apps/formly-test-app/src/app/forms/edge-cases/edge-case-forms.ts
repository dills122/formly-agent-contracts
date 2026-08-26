import type { AbstractControl } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';
import { of } from 'rxjs';

import type { TestFormDefinition } from '../../form-registry/form-definition.js';

function isLockedFormState(formState: unknown): boolean {
  if (typeof formState !== 'object' || formState === null) {
    return false;
  }

  return (formState as Readonly<Record<string, unknown>>).locked === true;
}

function isBetaInteractionModel(model: unknown): boolean {
  if (typeof model !== 'object' || model === null) {
    return false;
  }
  const interaction: unknown = (
    model as Readonly<Record<string, unknown>>
  ).interaction;
  return (
    typeof interaction === 'object' &&
    interaction !== null &&
    (interaction as Readonly<Record<string, unknown>>).toggle === 'beta'
  );
}

function createKeyPathFields(): FormlyFieldConfig[] {
  return [
    { key: 0, type: 'input', props: { label: 'Numeric key zero' } },
    {
      key: 'account.owner.name',
      type: 'input',
      props: { label: 'Dotted key' },
    },
    {
      key: 'items[2].sku',
      type: 'input',
      props: { label: 'Bracketed index key' },
    },
    {
      key: ['literal.segment', 'value'],
      type: 'input',
      props: { label: 'Array key with literal dot' },
    },
    {
      fieldGroup: [
        {
          key: 'insideKeylessGroup',
          type: 'checkbox',
          props: { label: 'Inside keyless group' },
        },
      ],
    },
  ];
}

function createValidationFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'postalCode',
      type: 'input',
      props: { label: 'Postal code', required: true },
      validators: {
        validation: ['postalCode'],
      },
    },
    {
      key: 'quantity',
      type: 'input',
      props: { label: 'Even quantity', type: 'number', min: 2, max: 20 },
      validators: {
        even: {
          expression: (control: AbstractControl) =>
            Number(control.value) % 2 === 0,
          message: 'Quantity must be even.',
        },
      },
    },
    {
      key: 'reference',
      type: 'input',
      props: { label: 'Unique reference' },
      asyncValidators: {
        uniqueReference: {
          expression: (control: AbstractControl) =>
            Promise.resolve(control.value !== 'ALREADY-USED'),
          message: 'Reference is already used.',
        },
      },
    },
  ];
}

function createOpaqueBehaviorFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'source',
      type: 'select',
      props: {
        label: 'Observable source',
        options: of([
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
        ]),
      },
    },
    {
      key: 'normalizedCode',
      type: 'input',
      props: { label: 'Normalized code' },
      modelOptions: {
        debounce: { default: 150 },
      },
      parsers: [
        (value: unknown) =>
          typeof value === 'string' ? value.trim().toUpperCase() : value,
      ],
      expressions: {
        'props.disabled': (field) =>
          isLockedFormState(field.options?.formState as unknown),
      },
      hooks: {
        onChanges: () => undefined,
      },
    },
    {
      key: 'generatedRows',
      type: 'repeat-section',
      props: { label: 'Function array template', addText: 'Add generated row' },
      fieldArray: () => ({
        type: 'input',
        props: { label: 'Generated value' },
      }),
    },
    {
      key: 'interaction.toggle',
      type: 'button-toggle',
      props: {
        label: 'Synthetic toggle choice',
        options: [
          { label: 'Alpha mode', value: 'alpha' },
          { label: 'Beta mode', value: 'beta' },
        ],
      },
    },
    {
      key: 'interaction.overlay',
      type: 'overlay-select',
      props: {
        label: 'Synthetic overlay choice',
        placeholder: 'Choose a synthetic team',
        options: [
          { label: 'North team', value: 'north' },
          { label: 'South team', value: 'south' },
        ],
      },
      expressions: {
        'props.options': (field) =>
          isBetaInteractionModel(field.model as unknown)
            ? [
                { label: 'East team', value: 'east' },
                { label: 'West team', value: 'west' },
              ]
            : [
                { label: 'North team', value: 'north' },
                { label: 'South team', value: 'south' },
              ],
      },
    },
    {
      key: 'interaction.autocomplete',
      type: 'autocomplete',
      props: {
        label: 'Synthetic autocomplete',
        options: [
          { label: 'Amber record', value: { id: 'amber' } },
          { label: 'Blue record', value: { id: 'blue' } },
          { label: 'Crimson record', value: { id: 'crimson' } },
        ],
      },
    },
    {
      key: 'interaction.selectedRows',
      type: 'table-select',
      defaultValue: [],
      props: {
        label: 'Synthetic row selector',
        rowOptions: [
          { id: 'row-a', label: 'Synthetic row A' },
          { id: 'row-b', label: 'Synthetic row B' },
        ],
      },
    },
    {
      key: 'interaction.expandedItems',
      type: 'expandable-repeater',
      props: {
        label: 'Expandable synthetic items',
        addText: 'Add expandable item',
      },
      fieldArray: {
        fieldGroup: [
          {
            key: 'name',
            type: 'input',
            props: { label: 'Expandable item name' },
          },
        ],
      },
    },
  ];
}

function createLegacyV6Fields(): FormlyFieldConfig[] {
  return [
    {
      key: 'legacyName',
      type: 'input',
      templateOptions: {
        label: 'Legacy template options',
        required: true,
      },
    },
    {
      key: 'legacyDetails',
      type: 'textarea',
      templateOptions: {
        label: 'Legacy conditional details',
      },
      hideExpression: '!model.legacyName',
      expressionProperties: {
        'templateOptions.required': '!!model.legacyName',
      },
    },
  ];
}

export const EDGE_CASE_TEST_FORMS = [
  {
    id: 'edge.key-paths',
    title: 'Key path laboratory',
    description: 'Numeric, dotted, bracketed, array-form, and keyless paths.',
    features: ['basic-controls', 'nested-groups', 'key-paths'],
    create: () => ({
      fields: createKeyPathFields(),
      model: {},
      formState: {},
    }),
  },
  {
    id: 'edge.validation',
    title: 'Validation laboratory',
    description: 'Named, inline, and async validator declarations.',
    features: [
      'basic-controls',
      'constraints',
      'named-validation',
      'inline-validation',
      'async-validation',
      'opaque-values',
    ],
    create: () => ({
      fields: createValidationFields(),
      model: {},
      formState: {},
    }),
  },
  {
    id: 'edge.opaque-behavior',
    title: 'Opaque behavior laboratory',
    description: 'Functions, hooks, parsers, Observables, and function arrays.',
    features: [
      'observable-options',
      'repeaters',
      'function-expressions',
      'model-options',
      'parsers',
      'hooks',
      'form-state',
      'opaque-values',
      'custom-types',
    ],
    create: () => ({
      fields: createOpaqueBehaviorFields(),
      model: {
        generatedRows: [],
        interaction: {
          toggle: 'alpha',
          selectedRows: [],
          expandedItems: [{ name: 'Collapsed synthetic item' }],
        },
      },
      formState: { locked: false },
    }),
  },
  {
    id: 'edge.legacy-v6',
    title: 'Legacy v6 aliases',
    description: 'Deprecated v6 aliases isolated for compatibility detection.',
    features: [
      'basic-controls',
      'string-expressions',
      'legacy-v6-aliases',
    ],
    create: () => ({
      fields: createLegacyV6Fields(),
      model: {},
      formState: {},
    }),
  },
] satisfies readonly TestFormDefinition[];
