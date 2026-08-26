import { defineFormContractSource } from '@formly-agent-contracts/workspace';

import type { FixtureFormInstance } from './fixture-form-instance.js';
import { createContactFragment } from './fragments/contact.fragment.js';
import { createCustomerFragment } from './fragments/customer.fragment.js';

export const SHARED_FORMS_SOURCE = defineFormContractSource({
  sourceId: 'fixture/shared-forms',
  list: () => [
    {
      id: 'shared.contact-preferences',
      create: (): FixtureFormInstance => ({
        fields: createContactFragment(),
        model: {},
      }),
    },
    {
      id: 'shared.customer-lookup',
      create: (): FixtureFormInstance => ({
        fields: createCustomerFragment(),
        model: {},
      }),
    },
  ],
});
