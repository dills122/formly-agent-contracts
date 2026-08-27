import type { FormContractProjectConfig } from '@formly-contract/workspace';

type FixtureFieldTypeProfiles = NonNullable<
  FormContractProjectConfig['fieldTypeProfiles']
>;

export const FIXTURE_FIELD_TYPE_PROFILES: FixtureFieldTypeProfiles = {
  schemaVersion: '0.4.0',
  id: 'fixture.angular-fields',
  version: 1,
  profiles: [
    {
      identity: { id: 'fixture.cool-radio', version: 1 },
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
      unknowns: [],
    },
    {
      identity: { id: 'fixture.dependent-select', version: 1 },
      semanticType: 'single-choice',
      valueShape: 'scalar',
      evidence: 'declared',
      parts: [
        {
          name: 'trigger',
          role: 'button',
          cardinality: 'one',
          evidence: 'declared',
        },
        {
          name: 'popup',
          role: 'listbox',
          cardinality: 'one',
          evidence: 'declared',
        },
        {
          name: 'option',
          role: 'option',
          cardinality: 'many',
          evidence: 'declared',
        },
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
      unknowns: [
        {
          aspect: 'runtime-states',
          reason: 'Available options depend on the selected claim product.',
          evidence: 'declared',
        },
      ],
    },
    {
      identity: { id: 'fixture.entity-autocomplete', version: 1 },
      semanticType: 'single-choice',
      valueShape: 'object',
      evidence: 'declared',
      parts: [
        {
          name: 'query',
          role: 'combobox',
          cardinality: 'one',
          evidence: 'declared',
        },
        {
          name: 'popup',
          role: 'listbox',
          cardinality: 'one',
          evidence: 'declared',
        },
        {
          name: 'option',
          role: 'option',
          cardinality: 'many',
          evidence: 'declared',
        },
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
      unknowns: [],
    },
    {
      identity: { id: 'fixture.table-select', version: 1 },
      semanticType: 'multi-choice',
      valueShape: 'array',
      evidence: 'declared',
      parts: [
        {
          name: 'row',
          role: 'row',
          cardinality: 'many',
          evidence: 'declared',
        },
        {
          name: 'selection',
          role: 'checkbox',
          cardinality: 'many',
          evidence: 'declared',
        },
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
      unknowns: [],
    },
    {
      identity: { id: 'fixture.expandable-repeater', version: 1 },
      semanticType: 'repeater',
      valueShape: 'array',
      evidence: 'declared',
      parts: [
        {
          name: 'add',
          role: 'button',
          cardinality: 'one',
          evidence: 'declared',
        },
        {
          name: 'item',
          role: 'group',
          cardinality: 'many',
          evidence: 'declared',
        },
        {
          name: 'expand',
          role: 'button',
          cardinality: 'many',
          evidence: 'declared',
        },
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
      unknowns: [],
    },
  ],
  registrations: [
    {
      formlyType: 'cool-radio-btn-grp',
      defaultProfile: { id: 'fixture.cool-radio', version: 1 },
      variants: [],
    },
    {
      formlyType: 'dependent-select',
      defaultProfile: { id: 'fixture.dependent-select', version: 1 },
      variants: [],
    },
    {
      formlyType: 'entity-autocomplete',
      defaultProfile: { id: 'fixture.entity-autocomplete', version: 1 },
      variants: [],
    },
    {
      formlyType: 'table-select',
      defaultProfile: { id: 'fixture.table-select', version: 1 },
      variants: [],
    },
    {
      formlyType: 'expandable-repeater',
      defaultProfile: { id: 'fixture.expandable-repeater', version: 1 },
      variants: [],
    },
  ],
  wrappers: [
    {
      identity: { id: 'fixture.expansion-panel-wrapper', version: 1 },
      wrapperName: 'fixture-expansion-panel',
      evidence: 'declared',
      parts: [
        {
          name: 'wrapper-expand',
          role: 'button',
          cardinality: 'one',
          evidence: 'declared',
        },
      ],
      preconditions: [
        {
          kind: 'activate',
          part: 'wrapper-expand',
          operation: 'click',
          evidence: 'declared',
        },
      ],
      unknowns: [],
    },
  ],
};
