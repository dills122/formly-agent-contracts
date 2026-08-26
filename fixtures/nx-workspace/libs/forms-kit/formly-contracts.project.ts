import { defineFormContractProject } from '@formly-agent-contracts/workspace';
import { NX_SHARED_FORMS_SOURCE } from '@nx-fixture/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'fixture-nx-forms-kit',
  sources: [NX_SHARED_FORMS_SOURCE],
});
