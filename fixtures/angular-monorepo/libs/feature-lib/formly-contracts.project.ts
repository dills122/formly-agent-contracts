import { defineFormContractProject } from '@formly-contract/workspace';
import { CLAIMS_FEATURE_SOURCE } from '@fixture/feature-lib/contracts';
import { FIXTURE_FIELD_TYPE_PROFILES } from '@fixture/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'fixture-feature-lib',
  sources: [CLAIMS_FEATURE_SOURCE],
  fieldTypeProfiles: FIXTURE_FIELD_TYPE_PROFILES,
});
