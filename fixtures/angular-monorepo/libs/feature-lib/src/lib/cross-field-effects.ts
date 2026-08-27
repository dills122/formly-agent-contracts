import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  type CrossFieldEffectRegistry,
} from '@formly-contract/schema';

export const CLAIMS_CROSS_FIELD_EFFECTS = {
  schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  id: 'fixture.angular-cross-field-effects',
  version: 1,
  forms: [
    {
      formId: 'claims.intake',
      coverage: 'complete',
      effects: [
        {
          identity: {
            id: 'fixture.product-filters-case-type',
            version: 1,
          },
          trigger: {
            nodeId: 'claims.intake::path:s_claimDetails.s_product',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'claims.intake::path:s_claimDetails.s_caseType',
            property: 'options',
          },
          kind: 'filters',
          timing: { mode: 'sync' },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
        {
          identity: {
            id: 'fixture.case-type-controls-other-details',
            version: 1,
          },
          trigger: {
            nodeId: 'claims.intake::path:s_claimDetails.s_caseType',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'claims.intake::path:s_claimDetails.s_otherDetails',
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
