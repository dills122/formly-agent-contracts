import type { FormContractProjectConfig } from '@formly-contract/workspace';

type NxFieldTypeProfiles = NonNullable<
  FormContractProjectConfig['fieldTypeProfiles']
>;

export const NX_FIELD_TYPE_PROFILES: NxFieldTypeProfiles = {
  schemaVersion: '0.4.0',
  id: 'fixture.nx-fields',
  version: 1,
  profiles: [
    {
      identity: { id: 'fixture.nx-cool-radio', version: 1 },
      semanticType: 'single-choice',
      valueShape: 'scalar',
      evidence: 'declared',
      parts: [
        {
          name: 'group',
          role: 'radiogroup',
          cardinality: 'one',
          evidence: 'declared',
        },
        {
          name: 'option',
          role: 'radio',
          cardinality: 'many',
          evidence: 'declared',
        },
      ],
      interaction: {
        kind: 'choice',
        operation: 'check',
        optionPart: 'option',
      },
      valueDomain: {
        kind: 'projected',
        source: 'adapter',
        completeness: 'complete',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
        evidence: 'declared',
      },
      driver: {
        kind: 'generic',
        id: 'generic.choice',
        version: 1,
        capabilities: ['check'],
      },
      effectCapabilities: { targetProperties: ['options'], readiness: [] },
      unknowns: [],
    },
  ],
  registrations: [
    {
      formlyType: 'cool-radio-btn-grp',
      defaultProfile: { id: 'fixture.nx-cool-radio', version: 1 },
      variants: [],
    },
  ],
  wrappers: [],
};
