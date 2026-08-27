import { defineFormContractSource } from '@formly-contract/workspace';

import type { NxFixtureFormInstance } from './form-instance.js';
import { createNxContactFragment } from './contact.fragment.js';

export const NX_SHARED_FORMS_SOURCE = defineFormContractSource({
  sourceId: 'fixture/nx-shared-forms',
  list: () => [
    {
      id: 'nx.shared.contact-preferences',
      create: (): NxFixtureFormInstance => ({
        fields: createNxContactFragment(),
        model: {},
      }),
    },
  ],
});
