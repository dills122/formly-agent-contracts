import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
} from '@formly-contract/schema/field-type-authoring';

export const NX_COOL_RADIO_TYPE = defineContractedFormlyType({
  name: 'cool-radio-btn-grp',
  profile: { id: 'fixture.nx-cool-radio', version: 1 },
  behavior: radioChoice(),
});

export const NX_FIELD_TYPE_PROFILES = buildFieldTypeProfileRegistry({
  id: 'fixture.nx-fields',
  version: 1,
  types: [NX_COOL_RADIO_TYPE],
});
