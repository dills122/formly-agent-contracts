import type { FormlyFieldConfig } from '@ngx-formly/core';

import type { TestFormDefinition } from '../../form-registry/form-definition.js';

function createProfileFields(): FormlyFieldConfig[] {
  return [
    {
      wrappers: ['section-card'],
      props: {
        label: 'Identity',
        description: 'Invented identity details for the fixture corpus.',
      },
      fieldGroup: [
        { type: '#applicantName' },
        {
          key: 'identity.preferredName',
          id: 'applicant-preferred-name',
          type: 'input',
          defaultValue: '',
          props: {
            label: 'Preferred name',
            placeholder: 'Ada Example',
            maxLength: 40,
            attributes: {
              'data-testid': 'applicant-preferred-name',
              role: 'textbox',
              'aria-label': 'Preferred name',
            },
          },
        },
        {
          key: 'identity.birthDate',
          type: 'input',
          props: {
            label: 'Birth date',
            type: 'date',
            required: true,
          },
        },
      ],
    },
    {
      key: 'address',
      wrappers: ['section-card'],
      props: { label: 'Primary address' },
      fieldGroup: [
        {
          key: 'street',
          type: 'input',
          props: {
            label: 'Street',
            required: true,
            minLength: 3,
          },
        },
        {
          key: 'postalCode',
          type: 'input',
          props: {
            label: 'Postal code',
            required: true,
            pattern: '^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$',
          },
          validators: {
            validation: ['postalCode'],
          },
        },
      ],
    },
  ];
}

function createHouseholdFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'householdName',
      type: 'input',
      props: {
        label: 'Household name',
        required: true,
      },
    },
    {
      key: 'members',
      type: 'repeat-section',
      props: {
        label: 'Household members',
        addText: 'Add member',
      },
      fieldArray: {
        wrappers: ['section-card'],
        props: { label: 'Member' },
        fieldGroup: [
          {
            key: 'name',
            type: 'input',
            props: {
              label: 'Name',
              required: true,
            },
          },
          {
            key: 'age',
            type: 'input',
            props: {
              label: 'Age',
              type: 'number',
              min: 0,
              max: 120,
              required: true,
            },
          },
          {
            key: 'relationship',
            type: 'select',
            props: {
              label: 'Relationship',
              options: [
                { value: 'self', label: 'Self' },
                { value: 'partner', label: 'Partner' },
                { value: 'dependent', label: 'Dependent' },
              ],
              required: true,
            },
          },
        ],
      },
    },
  ];
}

function createCommunicationFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'channel',
      type: 'radio',
      defaultValue: 'email',
      props: {
        label: 'Preferred channel',
        options: [
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone' },
          { value: 'post', label: 'Post' },
        ],
        required: true,
      },
    },
    {
      key: 'email',
      type: 'input',
      props: {
        label: 'Email address',
        type: 'email',
      },
      expressions: {
        hide: "model.channel !== 'email'",
        'props.required': "model.channel === 'email'",
      },
    },
    {
      key: 'phone',
      type: 'input',
      props: {
        label: 'Phone number',
        type: 'tel',
      },
      expressions: {
        hide: "model.channel !== 'phone'",
        'props.required': "model.channel === 'phone'",
      },
    },
    {
      key: 'consent.newsletter',
      type: 'checkbox',
      defaultValue: false,
      props: {
        label: 'Receive synthetic fixture updates',
      },
    },
  ];
}

function createAddressHistoryFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'addresses',
      type: 'repeat-section',
      props: {
        label: 'Address history',
        addText: 'Add address',
      },
      fieldArray: {
        fieldGroup: [
          {
            key: 'street',
            type: 'input',
            props: { label: 'Street', required: true },
          },
          {
            key: ['location', 'city'],
            type: 'input',
            props: { label: 'City', required: true },
          },
          {
            key: 'period.from',
            type: 'input',
            props: { label: 'From', type: 'date' },
          },
          {
            key: 'period.to',
            type: 'input',
            props: { label: 'To', type: 'date' },
          },
        ],
      },
    },
    {
      key: 'addresses[0].verified',
      type: 'checkbox',
      props: { label: 'First address verified' },
    },
  ];
}

export const APPLICANT_TEST_FORMS = [
  {
    id: 'applicant.profile',
    title: 'Applicant profile',
    description: 'Preset identity fields, nested address data, and constraints.',
    features: [
      'basic-controls',
      'nested-groups',
      'key-paths',
      'constraints',
      'defaults',
      'wrappers',
      'presets',
    ],
    create: () => ({
      fields: createProfileFields(),
      model: {},
      formState: {},
    }),
  },
  {
    id: 'applicant.household',
    title: 'Household members',
    description: 'A populated object repeater with nested static choices.',
    features: [
      'basic-controls',
      'nested-groups',
      'constraints',
      'static-options',
      'repeaters',
      'custom-types',
      'wrappers',
    ],
    create: () => ({
      fields: createHouseholdFields(),
      model: {
        members: [{ name: 'Alex Example', age: 34, relationship: 'self' }],
      },
      formState: {},
    }),
  },
  {
    id: 'applicant.communication',
    title: 'Communication preferences',
    description: 'Conditional contact controls driven by string expressions.',
    features: [
      'basic-controls',
      'defaults',
      'static-options',
      'string-expressions',
    ],
    create: () => ({
      fields: createCommunicationFields(),
      model: {},
      formState: {},
    }),
  },
  {
    id: 'applicant.address-history',
    title: 'Address history',
    description: 'Array, dotted, bracketed, and array-form model keys.',
    features: ['basic-controls', 'nested-groups', 'key-paths', 'repeaters'],
    create: () => ({
      fields: createAddressHistoryFields(),
      model: { addresses: [] },
      formState: {},
    }),
  },
] satisfies readonly TestFormDefinition[];
