import { defineFormContractSource } from '@formly-agent-contracts/workspace';

import { createNxClaimForm } from './claim.form.js';

export const NX_CLAIMS_SOURCE = defineFormContractSource({
  sourceId: 'fixture/nx-claims',
  list: () => [{ id: 'nx.claims.intake', create: createNxClaimForm }],
});
