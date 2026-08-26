import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createContactFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'claimant.name',
      type: 'input',
      id: 'claimant-name',
      props: {
        label: 'Claimant name',
        required: true,
      },
    },
    {
      key: 'claimant.contactPreference',
      type: 'cool-radio-btn-grp',
      id: 'contact-preference',
      props: {
        label: 'Preferred contact method',
        required: true,
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'phone' },
        ],
      },
    },
  ];
}
