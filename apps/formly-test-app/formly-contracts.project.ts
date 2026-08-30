import { defineFormContractProject } from '@formly-contract/workspace';

import {
  APPLICANT_FORM_SOURCE,
  EDGE_CASE_FORM_SOURCE,
  OPERATIONS_FORM_SOURCE,
} from './src/app/form-contracts/form-sources.js';
import { TEST_APP_FIELD_TYPE_PROFILES } from './src/app/form-contracts/field-type-profiles.js';

export default defineFormContractProject({
  projectId: 'fixture-single-angular-app',
  sources: [
    APPLICANT_FORM_SOURCE,
    OPERATIONS_FORM_SOURCE,
    EDGE_CASE_FORM_SOURCE,
  ],
  fieldTypeProfiles: TEST_APP_FIELD_TYPE_PROFILES,
});
