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

const radioRegistry = buildFieldTypeProfileRegistry({
  id: 'fixture.nx-fields',
  version: 2,
  types: [NX_COOL_RADIO_TYPE],
});

export const NX_FIELD_TYPE_PROFILES = {
  ...radioRegistry,
  version: 2,
  profiles: [
    ...radioRegistry.profiles,
    {
      identity: { id: 'fixture.nx-date-range', version: 1 },
      semanticType: 'date-range',
      valueShape: 'object',
      evidence: 'declared',
      parts: [
        { name: 'start', role: 'textbox', cardinality: 'one', evidence: 'declared' },
        { name: 'end', role: 'textbox', cardinality: 'one', evidence: 'declared' },
      ],
      interaction: { kind: 'fill', operation: 'fill', controlPart: 'start' },
      valueDomain: { kind: 'not-applicable', evidence: 'declared' },
      driver: {
        kind: 'application',
        id: 'fixture.nx-date-range-driver',
        version: 1,
        capabilities: ['fill'],
      },
      effectCapabilities: { targetProperties: [], readiness: [] },
      unknowns: [],
    },
    {
      identity: { id: 'fixture.nx-dependent-select', version: 1 },
      semanticType: 'single-choice',
      valueShape: 'scalar',
      evidence: 'declared',
      parts: [
        { name: 'trigger', role: 'button', cardinality: 'one', evidence: 'declared' },
        { name: 'popup', role: 'listbox', cardinality: 'one', evidence: 'declared' },
        { name: 'option', role: 'option', cardinality: 'many', evidence: 'declared' },
      ],
      interaction: {
        kind: 'choice',
        operation: 'select-from-overlay',
        triggerPart: 'trigger',
        popupPart: 'popup',
        optionPart: 'option',
      },
      valueDomain: {
        kind: 'projected',
        source: 'adapter',
        completeness: 'scenario',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
        disabledPath: 'disabled',
        evidence: 'declared',
      },
      driver: {
        kind: 'generic',
        id: 'generic.choice',
        version: 1,
        capabilities: ['select-from-overlay'],
      },
      effectCapabilities: {
        targetProperties: ['options'],
        readiness: [
          {
            id: 'fixture.nx-equipment-options-ready',
            targetProperty: 'options',
            evidence: 'declared',
          },
        ],
      },
      unknowns: [],
    },
    {
      identity: { id: 'fixture.nx-entity-autocomplete', version: 1 },
      semanticType: 'single-choice',
      valueShape: 'object',
      evidence: 'declared',
      parts: [
        { name: 'query', role: 'combobox', cardinality: 'one', evidence: 'declared' },
        { name: 'popup', role: 'listbox', cardinality: 'one', evidence: 'declared' },
        { name: 'option', role: 'option', cardinality: 'many', evidence: 'declared' },
      ],
      interaction: {
        kind: 'autocomplete',
        operation: 'type-and-pick',
        queryPart: 'query',
        popupPart: 'popup',
        optionPart: 'option',
      },
      valueDomain: {
        kind: 'projected',
        source: 'adapter',
        completeness: 'complete',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
        disabledPath: 'disabled',
        evidence: 'declared',
      },
      driver: {
        kind: 'generic',
        id: 'generic.autocomplete',
        version: 1,
        capabilities: ['type-and-pick'],
      },
      effectCapabilities: { targetProperties: ['options'], readiness: [] },
      unknowns: [],
    },
    {
      identity: { id: 'fixture.nx-table-select', version: 1 },
      semanticType: 'multi-choice',
      valueShape: 'array',
      evidence: 'declared',
      parts: [
        { name: 'row', role: 'row', cardinality: 'many', evidence: 'declared' },
        { name: 'selection', role: 'checkbox', cardinality: 'many', evidence: 'declared' },
      ],
      interaction: {
        kind: 'row-selection',
        operation: 'select-row',
        rowPart: 'row',
        selectionPart: 'selection',
      },
      valueDomain: {
        kind: 'projected',
        source: 'adapter',
        completeness: 'complete',
        collectionPath: 'props.rowOptions',
        labelPath: 'label',
        valuePath: 'id',
        evidence: 'declared',
      },
      driver: {
        kind: 'generic',
        id: 'generic.row-selection',
        version: 1,
        capabilities: ['select-row'],
      },
      effectCapabilities: { targetProperties: [], readiness: [] },
      unknowns: [],
    },
    {
      identity: { id: 'fixture.nx-expandable-repeater', version: 1 },
      semanticType: 'repeater',
      valueShape: 'array',
      evidence: 'declared',
      parts: [
        { name: 'add', role: 'button', cardinality: 'one', evidence: 'declared' },
        { name: 'item', role: 'group', cardinality: 'many', evidence: 'declared' },
        { name: 'expand', role: 'button', cardinality: 'many', evidence: 'declared' },
      ],
      interaction: {
        kind: 'repeater',
        operation: 'expand-item',
        addPart: 'add',
        itemPart: 'item',
        expandPart: 'expand',
      },
      valueDomain: { kind: 'not-applicable', evidence: 'declared' },
      driver: {
        kind: 'generic',
        id: 'generic.repeater',
        version: 1,
        capabilities: ['expand-item'],
      },
      effectCapabilities: { targetProperties: [], readiness: [] },
      unknowns: [],
    },
  ],
  registrations: [
    ...radioRegistry.registrations,
    {
      formlyType: 'date-range',
      defaultProfile: { id: 'fixture.nx-date-range', version: 1 },
      variants: [],
    },
    {
      formlyType: 'dependent-select',
      defaultProfile: { id: 'fixture.nx-dependent-select', version: 1 },
      variants: [],
    },
    {
      formlyType: 'entity-autocomplete',
      defaultProfile: { id: 'fixture.nx-entity-autocomplete', version: 1 },
      variants: [],
    },
    {
      formlyType: 'expandable-repeater',
      defaultProfile: { id: 'fixture.nx-expandable-repeater', version: 1 },
      variants: [],
    },
    {
      formlyType: 'table-select',
      defaultProfile: { id: 'fixture.nx-table-select', version: 1 },
      variants: [],
    },
  ],
  wrappers: [
    {
      identity: { id: 'fixture.nx-section-wrapper', version: 1 },
      wrapperName: 'nx-section',
      evidence: 'declared',
      parts: [
        { name: 'expand', role: 'button', cardinality: 'one', evidence: 'declared' },
      ],
      preconditions: [
        {
          kind: 'activate',
          part: 'expand',
          operation: 'click',
          evidence: 'declared',
        },
      ],
      unknowns: [],
    },
  ],
} as const;
