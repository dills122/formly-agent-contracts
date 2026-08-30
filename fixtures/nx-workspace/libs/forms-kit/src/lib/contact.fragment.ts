import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createNxSiteContactFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'contact.name',
      type: 'input',
      id: 'nx-site-contact-name',
      props: { label: 'Site contact name', required: true, maxLength: 80 },
    },
    {
      key: 'contact.email',
      type: 'input',
      id: 'nx-site-contact-email',
      props: { label: 'Site contact email', type: 'email', required: true },
    },
    {
      key: 'contact.preference',
      type: 'cool-radio-btn-grp',
      id: 'nx-site-contact-preference',
      props: {
        label: 'Preferred coordination channel',
        required: true,
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'phone' },
          { label: 'Project portal', value: 'portal' },
        ],
      },
    },
  ];
}
