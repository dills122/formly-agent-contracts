import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  type CrossFieldEffectRegistry,
} from '@formly-contract/schema';

export const NX_MICROGRID_CROSS_FIELD_EFFECTS = {
  schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  id: 'fixture.nx-microgrid-effects',
  version: 1,
  forms: [
    {
      formId: 'microgrid.project-intake',
      coverage: 'complete',
      effects: [
        {
          identity: { id: 'fixture.deployment-model-controls-host', version: 1 },
          trigger: {
            nodeId: 'microgrid.project-intake::path:s_project.s_deploymentModel',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'microgrid.project-intake::path:s_project.s_hostOrganization',
            property: 'visibility',
          },
          kind: 'controls-state',
          timing: { mode: 'sync' },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
      ],
    },
    {
      formId: 'microgrid.system-design',
      coverage: 'complete',
      effects: [
        {
          identity: { id: 'fixture.technology-filters-equipment', version: 1 },
          trigger: {
            nodeId: 'microgrid.system-design::path:s_system.s_technology',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'microgrid.system-design::path:s_system.s_equipmentModel',
            property: 'options',
          },
          kind: 'filters',
          timing: { mode: 'sync' },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
      ],
    },
    {
      formId: 'microgrid.operations-plan',
      coverage: 'complete',
      effects: [
        {
          identity: { id: 'fixture.monitoring-controls-telemetry', version: 1 },
          trigger: {
            nodeId: 'microgrid.operations-plan::path:s_operations.s_remoteMonitoring',
            event: 'valueChanged',
          },
          target: {
            nodeId: 'microgrid.operations-plan::path:s_operations.s_telemetryEndpoint',
            property: 'visibility',
          },
          kind: 'controls-state',
          timing: { mode: 'sync' },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
      ],
    },
  ],
} as const satisfies CrossFieldEffectRegistry;
