import { defineFormContractSource } from '@formly-agent-contracts/workspace';

import { createClaimIntakeForm } from './claim-intake.form.js';
import { createClaimsAssignmentForm } from './claims-assignment.form.js';
import { createCustomerOnboardingForm } from './customer-onboarding.form.js';
import { createIncidentForm } from './incident.form.js';

export const CLAIMS_FEATURE_SOURCE = defineFormContractSource({
  sourceId: 'fixture/claims-feature',
  list: () => [
    {
      id: 'claims.assignment',
      create: createClaimsAssignmentForm,
    },
    {
      id: 'claims.intake',
      create: createClaimIntakeForm,
      scenarios: [
        {
          id: 'new-claim',
          description: 'Safe synthetic defaults for a new claim.',
          create: () => ({ product: 'auto' }),
        },
      ],
    },
    {
      id: 'customers.onboarding',
      create: createCustomerOnboardingForm,
      scenarios: [
        {
          id: 'approved-customer',
          description: 'Customer has accepted terms and reveals approval notes.',
          create: () => ({ acceptTerms: true }),
        },
      ],
    },
    {
      id: 'operations.incident',
      create: createIncidentForm,
    },
  ],
});
