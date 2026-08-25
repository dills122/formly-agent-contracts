import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createGoldenFormFields(): FormlyFieldConfig[] {
  const opaqueEligibilityRule = (): boolean => false;

  return [
    {
      key: 'profile',
      props: {
        label: 'Profile',
        description: 'Invented public demo data for contract inspection.',
      },
      fieldGroup: [
        {
          key: 'displayName',
          type: 'input',
          props: {
            label: 'Display name',
            placeholder: 'Ada Example',
            required: true,
            minLength: 2,
            maxLength: 60,
          },
        },
        {
          key: 'age',
          type: 'input',
          props: {
            type: 'number',
            label: 'Age',
            min: 0,
            max: 120,
          },
        },
        {
          key: 'contactMethod',
          type: 'select',
          defaultValue: 'email',
          props: {
            label: 'Preferred contact method',
            required: true,
            options: [
              { label: 'Email', value: 'email' },
              { label: 'Phone', value: 'phone' },
            ],
          },
        },
        {
          key: 'email',
          type: 'input',
          props: {
            type: 'email',
            label: 'Email address',
          },
          expressions: {
            hide: "model.contactMethod !== 'email'",
          },
        },
        {
          key: 'newsletter',
          type: 'checkbox',
          defaultValue: false,
          props: { label: 'Receive synthetic updates' },
        },
      ],
    },
    {
      key: 'addresses',
      type: 'repeat-section',
      props: { label: 'Addresses' },
      fieldArray: {
        fieldGroup: [
          {
            key: 'street',
            type: 'input',
            props: { label: 'Street', required: true },
          },
          {
            key: 'postalCode',
            type: 'input',
            props: {
              label: 'Postal code',
              pattern: '^[A-Z0-9 -]+$',
            },
          },
        ],
      },
    },
    {
      key: 'eligibilityReview',
      type: 'input',
      props: { label: 'Eligibility review' },
      expressions: {
        'props.disabled': opaqueEligibilityRule,
      },
    },
  ];
}
