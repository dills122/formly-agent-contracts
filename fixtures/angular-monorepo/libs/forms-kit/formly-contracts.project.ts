import { defineFormContractProject } from '@formly-contract/workspace';
import {
  FIXTURE_FIELD_TYPE_PROFILES,
  SHARED_FORMS_SOURCE,
} from '@fixture/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'fixture-forms-kit',
  sources: [SHARED_FORMS_SOURCE],
  fieldTypeProfiles: FIXTURE_FIELD_TYPE_PROFILES,
});
