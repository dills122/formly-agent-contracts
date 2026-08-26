import { defineFormContractProject } from '@formly-agent-contracts/workspace';
import { CLAIMS_FEATURE_SOURCE } from '@fixture/feature-lib/contracts';

export default defineFormContractProject({
  projectId: 'fixture-feature-lib',
  sources: [CLAIMS_FEATURE_SOURCE],
});
