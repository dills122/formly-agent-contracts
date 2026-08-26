import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createNxContactFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'claimant.name',
      type: 'input',
      id: 'nx-claimant-name',
      props: { label: 'Claimant name', required: true },
    },
    {
      key: 'claimant.contactPreference',
      type: 'cool-radio-btn-grp',
      id: 'nx-contact-preference',
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
