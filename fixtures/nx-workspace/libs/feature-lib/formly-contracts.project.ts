import { defineFormContractProject } from '@formly-contract/workspace';
import { NX_CLAIMS_SOURCE } from '@nx-fixture/feature-lib/contracts';
import { NX_FIELD_TYPE_PROFILES } from '@nx-fixture/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'fixture-nx-feature-lib',
  sources: [NX_CLAIMS_SOURCE],
  fieldTypeProfiles: NX_FIELD_TYPE_PROFILES,
});
