import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createNxOrganizationFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'organization.legalName',
      type: 'input',
      props: { label: 'Organization legal name', required: true },
    },
    {
      key: 'organization.kind',
      type: 'select',
      props: {
        label: 'Organization type',
        required: true,
        options: [
          { label: 'Municipality', value: 'municipality' },
          { label: 'Campus operator', value: 'campus' },
          { label: 'Community cooperative', value: 'cooperative' },
          { label: 'Commercial operator', value: 'commercial' },
        ],
      },
    },
    {
      key: 'organization.registrationId',
      type: 'input',
      props: { label: 'Synthetic registration ID', required: true },
    },
  ];
}
