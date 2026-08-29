import { defineFormContractSource } from '@formly-contract/workspace';

import { NX_WORKPLACE_INDEXING_CONTRACT } from './indexing-form.contract.js';
import { NX_WORKPLACE_NIGO_CONTRACT } from './nigo-add-form.contract.js';

export const NX_WORKPLACE_FORMS_SOURCE = defineFormContractSource({
  sourceId: 'fixture/nx-workplace-forms',
  list: () => [NX_WORKPLACE_INDEXING_CONTRACT, NX_WORKPLACE_NIGO_CONTRACT],
});
