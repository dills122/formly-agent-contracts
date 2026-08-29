import { defineFormContractDefinition } from '@formly-contract/workspace';

import { createNxClaimForm } from './claim.form.js';

export const NX_CLAIM_FORM_CONTRACT = defineFormContractDefinition({
  id: 'nx.claims.intake',
  create: createNxClaimForm,
  lineage: { rootSymbol: createNxClaimForm },
});
