import { defineFormContractProject } from '@formly-contract/workspace';
import { CLAIMS_FEATURE_SOURCE } from '@fixture/feature-lib/contracts';

export default defineFormContractProject({
  projectId: 'fixture-feature-lib',
  sources: [CLAIMS_FEATURE_SOURCE],
});
