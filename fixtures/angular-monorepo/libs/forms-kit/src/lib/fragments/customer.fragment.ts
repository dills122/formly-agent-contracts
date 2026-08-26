import type { FormlyFieldConfig } from '@ngx-formly/core';

import { readNestedValue } from './model-utils.js';

export function createCustomerFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'customer.account',
      type: 'entity-autocomplete',
      id: 'customer-account',
      props: {
        label: 'Customer account',
        required: true,
        options: [
          { label: 'Ada Manufacturing', value: { id: 'customer-ada' } },
          { label: 'Northwind Logistics', value: { id: 'customer-northwind' } },
        ],
      },
    },
    {
      key: 'customer.coveragePeriod',
      type: 'date-range',
      id: 'coverage-period',
      props: { label: 'Coverage period', required: true },
    },
    {
      key: 'customer.email',
      type: 'input',
      id: 'customer-email',
      props: { label: 'Contact email', type: 'email', required: true },
    },
    {
      key: 'customer.acceptTerms',
      type: 'checkbox',
      id: 'customer-terms',
      props: { label: 'Terms accepted' },
    },
    {
      key: 'customer.notes',
      type: 'textarea',
      id: 'customer-notes',
      props: { label: 'Approval notes' },
      hideExpression: (model) =>
        readNestedValue(model, 'customer', 'acceptTerms') !== true,
    },
  ];
}
