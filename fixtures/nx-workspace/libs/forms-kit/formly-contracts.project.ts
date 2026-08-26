import { defineFormContractProject } from '@formly-contract/workspace';
import {
  NX_FIELD_TYPE_PROFILES,
  NX_SHARED_FORMS_SOURCE,
} from '@nx-fixture/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'fixture-nx-forms-kit',
  sources: [NX_SHARED_FORMS_SOURCE],
  fieldTypeProfiles: NX_FIELD_TYPE_PROFILES,
});
