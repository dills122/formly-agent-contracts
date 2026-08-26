import { defineFormContractProject } from '@formly-contract/workspace';
import { NX_CLAIMS_SOURCE } from '@nx-fixture/feature-lib/contracts';

export default defineFormContractProject({
  projectId: 'fixture-nx-feature-lib',
  sources: [NX_CLAIMS_SOURCE],
});
