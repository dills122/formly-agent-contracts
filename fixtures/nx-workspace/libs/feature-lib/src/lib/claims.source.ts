import { defineFormContractSource } from '@formly-contract/workspace';

import { NX_CLAIM_FORM_CONTRACT } from './claim.contract.js';

export const NX_CLAIMS_SOURCE = defineFormContractSource({
  sourceId: 'fixture/nx-claims',
  list: () => [NX_CLAIM_FORM_CONTRACT],
});
