import {
  createNxOrganizationFragment,
  createNxSiteContactFragment,
  type NxFixtureFormInstance,
} from '@nx-fixture/forms-kit/forms';
import { of } from 'rxjs';

export interface MicrogridProjectOptions {
  readonly initialProjectName?: string;
  readonly deploymentModel?: 'owner-operated' | 'hosted' | 'cooperative';
}

function readPath(model: unknown, path: readonly string[]): unknown {
  let current: unknown = model;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current;
}

function equipmentOptions(technology: unknown) {
  switch (technology) {
    case 'solar':
      return [
        { label: 'Helios Roof Array', value: 'helios-roof' },
        { label: 'Solstice Ground Array', value: 'solstice-ground' },
      ];
    case 'wind':
      return [
        { label: 'Northwind 80', value: 'northwind-80' },
        { label: 'Harbor Vertical 24', value: 'harbor-vertical' },
      ];
    case 'hybrid':
      return [
        { label: 'Confluence Hybrid Pack', value: 'confluence-hybrid' },
      ];
    default:
      return [];
  }
}

export function createNxMicrogridProjectForm(
  options: MicrogridProjectOptions = {},
): NxFixtureFormInstance {
  return {
    fields: [
      {
        wrappers: ['nx-section'],
        props: { label: 'Project identity' },
        fieldGroup: [
          {
            key: 'project.name',
            type: 'input',
            id: 'nx-microgrid-project-name',
            props: { label: 'Project name', required: true, maxLength: 120 },
          },
          {
            key: 'project.deploymentModel',
            type: 'cool-radio-btn-grp',
            id: 'nx-microgrid-deployment-model',
            props: {
              label: 'Deployment model',
              required: true,
              options: [
                { label: 'Owner operated', value: 'owner-operated' },
                { label: 'Hosted service', value: 'hosted' },
                { label: 'Community cooperative', value: 'cooperative' },
              ],
            },
          },
          {
            key: 'project.hostOrganization',
            type: 'input',
            props: { label: 'Host organization', required: true },
            expressions: {
              hide: "model.project.deploymentModel !== 'hosted'",
            },
          },
          {
            key: 'project.siteCount',
            type: 'input',
            defaultValue: 1,
            props: {
              label: 'Number of deployment sites',
              type: 'number',
              min: 1,
              max: 25,
              required: true,
            },
          },
        ],
      },
      ...createNxOrganizationFragment(),
      ...createNxSiteContactFragment(),
    ],
    model: {
      project: {
        ...(options.initialProjectName === undefined
          ? {}
          : { name: options.initialProjectName }),
        deploymentModel: options.deploymentModel ?? 'owner-operated',
        siteCount: 1,
      },
      organization: { kind: 'municipality' },
      contact: { preference: 'portal' },
    },
  };
}

export function createNxSiteAssessmentForm(): NxFixtureFormInstance {
  return {
    fields: [
      {
        wrappers: ['nx-section'],
        props: { label: 'Site conditions' },
        fieldGroup: [
          {
            key: 'site.address',
            type: 'input',
            props: { label: 'Synthetic site address', required: true },
          },
          {
            key: 'site.classification',
            type: 'select',
            props: {
              label: 'Site classification',
              required: true,
              options: [
                { label: 'Urban rooftop', value: 'urban-rooftop' },
                { label: 'Industrial brownfield', value: 'brownfield' },
                { label: 'Remote community', value: 'remote-community' },
                { label: 'Campus district', value: 'campus' },
              ],
            },
          },
          {
            key: 'site.surveyWindow',
            type: 'date-range',
            props: { label: 'Survey window', required: true },
          },
          {
            key: 'site.constraints',
            type: 'table-select',
            defaultValue: [],
            props: {
              label: 'Known site constraints',
              rowOptions: [
                { id: 'heritage', label: 'Heritage review zone' },
                { id: 'wetland', label: 'Wetland setback' },
                { id: 'grid-capacity', label: 'Limited grid capacity' },
                { id: 'seasonal-access', label: 'Seasonal road access' },
              ],
            },
          },
        ],
      },
      {
        key: 'site.obstacles',
        type: 'expandable-repeater',
        props: { label: 'Survey obstacles', addText: 'Add obstacle' },
        fieldArray: {
          fieldGroup: [
            {
              key: 'category',
              type: 'select',
              props: {
                label: 'Obstacle category',
                options: [
                  { label: 'Access', value: 'access' },
                  { label: 'Environmental', value: 'environmental' },
                  { label: 'Structural', value: 'structural' },
                ],
              },
            },
            {
              key: 'details',
              type: 'textarea',
              props: { label: 'Details', rows: 3, required: true },
            },
          ],
        },
      },
    ],
    model: {
      site: {
        classification: 'campus',
        constraints: ['grid-capacity'],
        obstacles: [{ category: 'access', details: 'Synthetic gate schedule.' }],
      },
    },
  };
}

export function createNxSystemDesignForm(): NxFixtureFormInstance {
  return {
    fields: [
      {
        key: 'system.technology',
        type: 'select',
        props: {
          label: 'Primary generation technology',
          required: true,
          options: [
            { label: 'Solar photovoltaic', value: 'solar' },
            { label: 'Wind', value: 'wind' },
            { label: 'Hybrid solar and wind', value: 'hybrid' },
          ],
        },
      },
      {
        key: 'system.equipmentModel',
        type: 'dependent-select',
        props: {
          label: 'Equipment configuration',
          placeholder: 'Select technology first',
          options: [],
          required: true,
        },
        expressions: {
          'props.options': (field) =>
            equipmentOptions(readPath(field.model, ['system', 'technology'])),
        },
      },
      {
        key: 'system.generationCapacityKw',
        type: 'input',
        props: {
          label: 'Generation capacity (kW)',
          type: 'number',
          min: 25,
          max: 50_000,
          required: true,
        },
      },
      {
        key: 'system.storageCapacityKwh',
        type: 'input',
        props: {
          label: 'Storage capacity (kWh)',
          type: 'number',
          min: 0,
        },
      },
      {
        key: 'system.resilienceMode',
        type: 'cool-radio-btn-grp',
        props: {
          label: 'Resilience mode',
          options: [
            { label: 'Grid connected', value: 'grid-connected' },
            { label: 'Island capable', value: 'island-capable' },
            { label: 'Normally isolated', value: 'isolated' },
          ],
        },
      },
    ],
    model: {
      system: {
        technology: 'solar',
        resilienceMode: 'island-capable',
        generationCapacityKw: 750,
        storageCapacityKwh: 1_200,
      },
    },
  };
}

export function createNxFundingPlanForm(): NxFixtureFormInstance {
  return {
    fields: [
      {
        key: 'funding.structure',
        type: 'cool-radio-btn-grp',
        props: {
          label: 'Funding structure',
          required: true,
          options: [
            { label: 'Capital purchase', value: 'capital' },
            { label: 'Energy service agreement', value: 'service-agreement' },
            { label: 'Blended public funding', value: 'blended' },
          ],
        },
      },
      {
        key: 'funding.estimatedBudget',
        type: 'input',
        props: {
          label: 'Estimated project budget',
          type: 'number',
          min: 0,
          required: true,
        },
        modelOptions: { updateOn: 'blur' },
      },
      {
        key: 'funding.leadPartner',
        type: 'entity-autocomplete',
        props: {
          label: 'Lead delivery partner',
          required: true,
          options: [
            { label: 'Atlas Community Energy', value: { id: 'partner-atlas' } },
            { label: 'Juniper Grid Works', value: { id: 'partner-juniper' } },
            { label: 'Northstar Technical Co-op', value: { id: 'partner-northstar' } },
          ],
        },
      },
      {
        key: 'funding.program',
        type: 'select',
        props: {
          label: 'Optional grant program',
          options: of([
            { label: 'Synthetic Resilience Fund', value: 'fund-resilience' },
            { label: 'Synthetic Clean Campus Fund', value: 'fund-campus' },
          ]),
        },
      },
      {
        key: 'funding.contributions',
        type: 'expandable-repeater',
        props: { label: 'Funding contributions', addText: 'Add contribution' },
        fieldArray: {
          fieldGroup: [
            { key: 'source', type: 'input', props: { label: 'Source', required: true } },
            {
              key: 'amount',
              type: 'input',
              props: { label: 'Amount', type: 'number', min: 0, required: true },
            },
            {
              key: 'committed',
              type: 'checkbox',
              props: { label: 'Funding committed' },
            },
          ],
        },
      },
    ],
    model: {
      funding: {
        structure: 'blended',
        estimatedBudget: 4_500_000,
        contributions: [
          { source: 'Municipal capital plan', amount: 1_250_000, committed: true },
        ],
      },
    },
  };
}

export function createNxPermittingForm(): NxFixtureFormInstance {
  return {
    fields: [
      {
        key: 'permits.jurisdiction',
        type: 'select',
        props: {
          label: 'Synthetic jurisdiction',
          required: true,
          options: [
            { label: 'Harbor District', value: 'harbor' },
            { label: 'Highland Region', value: 'highland' },
            { label: 'Metro Energy Zone', value: 'metro' },
          ],
        },
      },
      {
        key: 'permits.requiredApprovals',
        type: 'table-select',
        props: {
          label: 'Required approvals',
          rowOptions: [
            { id: 'building', label: 'Building approval' },
            { id: 'environmental', label: 'Environmental screening' },
            { id: 'interconnection', label: 'Grid interconnection study' },
            { id: 'fire-safety', label: 'Fire safety review' },
          ],
        },
      },
      {
        key: 'permits.authority',
        type: 'entity-autocomplete',
        props: {
          label: 'Coordinating authority',
          options: [
            { label: 'Harbor Planning Office', value: { id: 'authority-harbor' } },
            { label: 'Highland Infrastructure Board', value: { id: 'authority-highland' } },
            { label: 'Metro Grid Secretariat', value: { id: 'authority-metro' } },
          ],
        },
      },
      {
        key: 'permits.environmentalNotes',
        type: 'textarea',
        props: { label: 'Environmental screening notes', rows: 5 },
        expressions: {
          hide: "!model.permits.requiredApprovals?.includes('environmental')",
        },
      },
    ],
    model: {
      permits: {
        jurisdiction: 'metro',
        requiredApprovals: ['building', 'interconnection'],
      },
    },
  };
}

export function createNxCommissioningForm(): NxFixtureFormInstance {
  return {
    fields: [
      {
        key: 'commissioning.window',
        type: 'date-range',
        props: { label: 'Commissioning window', required: true },
      },
      {
        key: 'commissioning.approver',
        type: 'entity-autocomplete',
        props: {
          label: 'Independent approver',
          options: [
            { label: 'Aster Engineering Review', value: { id: 'review-aster' } },
            { label: 'Beacon Systems Assurance', value: { id: 'review-beacon' } },
          ],
        },
      },
      {
        key: 'commissioning.checkpoints',
        type: 'expandable-repeater',
        props: { label: 'Readiness checkpoints', addText: 'Add checkpoint' },
        fieldArray: {
          fieldGroup: [
            { key: 'name', type: 'input', props: { label: 'Checkpoint', required: true } },
            { key: 'owner', type: 'input', props: { label: 'Owner', required: true } },
            { key: 'complete', type: 'checkbox', props: { label: 'Complete' } },
          ],
        },
      },
      {
        key: 'commissioning.acceptanceConfirmed',
        type: 'checkbox',
        props: { label: 'Final acceptance criteria confirmed', required: true },
        hooks: {
          onInit: (field) => {
            field.props = {
              ...field.props,
              description: 'Confirm only after all synthetic checkpoints pass.',
            };
          },
        },
      },
    ],
    model: {
      commissioning: {
        checkpoints: [
          { name: 'Protection relay test', owner: 'Grid engineer', complete: false },
          { name: 'Island-mode trial', owner: 'Commissioning lead', complete: false },
        ],
        acceptanceConfirmed: false,
      },
    },
    formState: { readinessReview: 'pending' },
  };
}

export function createNxStakeholderGovernanceForm(): NxFixtureFormInstance {
  return {
    fields: [
      {
        key: 'governance.model',
        type: 'cool-radio-btn-grp',
        props: {
          label: 'Governance model',
          required: true,
          options: [
            { label: 'Single accountable owner', value: 'single-owner' },
            { label: 'Joint steering committee', value: 'joint-committee' },
            { label: 'Community board', value: 'community-board' },
          ],
        },
      },
      {
        key: 'governance.operator',
        type: 'entity-autocomplete',
        props: {
          label: 'Accountable operator',
          options: [
            { label: 'Cedar Municipal Utilities', value: { id: 'operator-cedar' } },
            { label: 'Lakeview Campus Energy', value: { id: 'operator-lakeview' } },
            { label: 'Summit Community Power', value: { id: 'operator-summit' } },
          ],
          required: true,
        },
      },
      {
        key: 'governance.members',
        type: 'expandable-repeater',
        props: { label: 'Governance participants', addText: 'Add participant' },
        fieldArray: {
          fieldGroup: [
            { key: 'name', type: 'input', props: { label: 'Name', required: true } },
            {
              key: 'role',
              type: 'select',
              props: {
                label: 'Decision role',
                options: [
                  { label: 'Accountable', value: 'accountable' },
                  { label: 'Consulted', value: 'consulted' },
                  { label: 'Technical reviewer', value: 'technical-reviewer' },
                ],
              },
            },
            {
              key: 'voting',
              type: 'checkbox',
              props: { label: 'Voting member' },
            },
          ],
        },
      },
      {
        key: 'governance.escalationNotes',
        type: 'textarea',
        props: { label: 'Decision escalation process', rows: 4 },
        expressions: {
          hide: "model.governance.model === 'single-owner'",
        },
      },
    ],
    model: {
      governance: {
        model: 'joint-committee',
        members: [
          { name: 'Synthetic site sponsor', role: 'accountable', voting: true },
          { name: 'Synthetic grid advisor', role: 'technical-reviewer', voting: false },
        ],
      },
    },
  };
}

export function createNxOperationsPlanForm(): NxFixtureFormInstance {
  return {
    fields: [
      {
        key: 'operations.serviceWindow',
        type: 'date-range',
        props: { label: 'Initial service period', required: true },
      },
      {
        key: 'operations.provider',
        type: 'entity-autocomplete',
        props: {
          label: 'Operations provider',
          options: [
            { label: 'Aurora Microgrid Services', value: { id: 'service-aurora' } },
            { label: 'Cascade Field Operations', value: { id: 'service-cascade' } },
          ],
        },
      },
      {
        key: 'operations.spareParts',
        type: 'table-select',
        props: {
          label: 'On-site spare parts inventory',
          rowOptions: [
            { id: 'inverter', label: 'Replacement inverter module' },
            { id: 'relay', label: 'Protection relay' },
            { id: 'battery-controller', label: 'Battery controller' },
            { id: 'communications', label: 'Communications gateway' },
          ],
        },
      },
      {
        key: 'operations.remoteMonitoring',
        type: 'checkbox',
        defaultValue: true,
        props: { label: 'Enable remote monitoring' },
      },
      {
        key: 'operations.telemetryEndpoint',
        type: 'input',
        props: { label: 'Synthetic telemetry endpoint identifier' },
        expressions: { hide: '!model.operations.remoteMonitoring' },
      },
      {
        key: 'operations.maintenanceTasks',
        type: 'expandable-repeater',
        props: { label: 'Preventive maintenance plan', addText: 'Add task' },
        fieldArray: {
          fieldGroup: [
            { key: 'task', type: 'input', props: { label: 'Task', required: true } },
            {
              key: 'interval',
              type: 'select',
              props: {
                label: 'Interval',
                options: [
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Quarterly', value: 'quarterly' },
                  { label: 'Annually', value: 'annually' },
                ],
              },
            },
          ],
        },
      },
    ],
    model: {
      operations: {
        remoteMonitoring: true,
        spareParts: ['relay', 'communications'],
        maintenanceTasks: [
          { task: 'Inspect protection settings', interval: 'annually' },
        ],
      },
    },
  };
}
