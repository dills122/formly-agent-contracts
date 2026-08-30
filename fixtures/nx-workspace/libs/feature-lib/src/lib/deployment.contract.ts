import { defineFormContractDefinition } from '@formly-contract/workspace';

import {
  createNxCommissioningForm,
  createNxFundingPlanForm,
  createNxMicrogridProjectForm,
  createNxOperationsPlanForm,
  createNxPermittingForm,
  createNxSiteAssessmentForm,
  createNxStakeholderGovernanceForm,
  createNxSystemDesignForm,
} from './deployment.forms.js';

export const NX_MICROGRID_PROJECT_CONTRACT = defineFormContractDefinition({
  id: 'microgrid.project-intake',
  create: createNxMicrogridProjectForm,
  lineage: { rootSymbol: createNxMicrogridProjectForm },
  scenarios: [
    {
      id: 'municipal-resilience-hub',
      description: 'Owner-operated urban resilience hub with safe defaults.',
      create: () => ({ deploymentModel: 'owner-operated', siteCount: 1 }),
    },
    {
      id: 'hosted-campus-network',
      description: 'Hosted multi-site campus deployment.',
      create: () => ({ deploymentModel: 'hosted', siteCount: 4 }),
    },
    {
      id: 'remote-community-cooperative',
      description: 'Community-owned remote microgrid deployment.',
      create: () => ({ deploymentModel: 'cooperative', siteCount: 2 }),
    },
  ],
});

export const NX_SITE_ASSESSMENT_CONTRACT = defineFormContractDefinition({
  id: 'microgrid.site-assessment',
  create: createNxSiteAssessmentForm,
  lineage: { rootSymbol: createNxSiteAssessmentForm },
  scenarios: [
    {
      id: 'urban-rooftop',
      description: 'Dense rooftop site with heritage and structural review.',
    },
    {
      id: 'remote-seasonal-access',
      description: 'Remote site with seasonal logistics constraints.',
    },
  ],
});

export const NX_SYSTEM_DESIGN_CONTRACT = defineFormContractDefinition({
  id: 'microgrid.system-design',
  create: createNxSystemDesignForm,
  lineage: { rootSymbol: createNxSystemDesignForm },
  scenarios: [
    { id: 'solar-storage', description: 'Solar array with battery storage.' },
    {
      id: 'island-capable-hybrid',
      description: 'Hybrid system capable of island operation.',
    },
  ],
});

export const NX_FUNDING_PLAN_CONTRACT = defineFormContractDefinition({
  id: 'microgrid.funding-plan',
  create: createNxFundingPlanForm,
  lineage: { rootSymbol: createNxFundingPlanForm },
  scenarios: [
    { id: 'capital-purchase', description: 'Direct capital acquisition.' },
    {
      id: 'blended-public-funding',
      description: 'Multiple committed and proposed sources.',
    },
  ],
});

export const NX_PERMITTING_CONTRACT = defineFormContractDefinition({
  id: 'microgrid.permitting',
  create: createNxPermittingForm,
  lineage: { rootSymbol: createNxPermittingForm },
  scenarios: [
    {
      id: 'standard-interconnection',
      description: 'Building and grid approvals.',
    },
    {
      id: 'environmental-review',
      description: 'Adds environmental screening evidence.',
    },
  ],
});

export const NX_COMMISSIONING_CONTRACT = defineFormContractDefinition({
  id: 'microgrid.commissioning',
  create: createNxCommissioningForm,
  lineage: { rootSymbol: createNxCommissioningForm },
  scenarios: [
    {
      id: 'readiness-review',
      description: 'Pre-energization checkpoint review.',
    },
    { id: 'final-acceptance', description: 'Independent final acceptance.' },
  ],
});

export const NX_STAKEHOLDER_GOVERNANCE_CONTRACT =
  defineFormContractDefinition({
    id: 'microgrid.stakeholder-governance',
    create: createNxStakeholderGovernanceForm,
    lineage: { rootSymbol: createNxStakeholderGovernanceForm },
    scenarios: [
      {
        id: 'single-accountable-owner',
        description: 'One organization owns operational decisions.',
      },
      {
        id: 'community-steering-board',
        description: 'Multi-party governance with voting and advisory roles.',
      },
    ],
  });

export const NX_OPERATIONS_PLAN_CONTRACT = defineFormContractDefinition({
  id: 'microgrid.operations-plan',
  create: createNxOperationsPlanForm,
  lineage: { rootSymbol: createNxOperationsPlanForm },
  scenarios: [
    {
      id: 'remote-monitored-service',
      description: 'Telemetry-enabled service with scheduled maintenance.',
    },
    {
      id: 'locally-operated-service',
      description: 'Local operations without a remote telemetry dependency.',
    },
  ],
});
