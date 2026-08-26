import type { FormlyFieldConfig } from '@ngx-formly/core';

import { readNestedValue } from './model-utils.js';

export function createClaimDetailsFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'claimDetails.product',
      type: 'select',
      id: 'claim-product',
      props: {
        label: 'Product',
        required: true,
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Home', value: 'home' },
        ],
      },
    },
    {
      key: 'claimDetails.caseType',
      type: 'dependent-select',
      id: 'claim-case-type',
      props: {
        label: 'Case type',
        required: true,
        options: [],
      },
      expressions: {
        'props.options': (field) =>
          readNestedValue(field.model, 'claimDetails', 'product') === 'home'
            ? [
                { label: 'Water damage', value: 'water' },
                { label: 'Fire damage', value: 'fire' },
                { label: 'Other', value: 'other' },
              ]
            : [
                { label: 'Collision', value: 'collision' },
                { label: 'Glass damage', value: 'glass' },
                { label: 'Other', value: 'other' },
              ],
      },
    },
    {
      key: 'claimDetails.summary',
      type: 'input',
      id: 'claim-summary',
      props: {
        label: 'Claim summary',
        required: true,
      },
    },
    {
      key: 'claimDetails.otherDetails',
      type: 'textarea',
      id: 'claim-other-details',
      props: { label: 'Other case details', required: true },
      hideExpression: (model) =>
        readNestedValue(model, 'claimDetails', 'caseType') !== 'other',
    },
  ];
}
