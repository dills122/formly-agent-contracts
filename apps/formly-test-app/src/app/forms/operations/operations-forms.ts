import type { AbstractControl } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';
import { of } from 'rxjs';

import type { TestFormDefinition } from '../../form-registry/form-definition.js';

function readModelValue(model: unknown, key: string): unknown {
  if (typeof model !== 'object' || model === null) {
    return undefined;
  }

  return (model as Readonly<Record<string, unknown>>)[key];
}

function createEquipmentInspectionFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'asset.id',
      type: 'input',
      props: { label: 'Asset ID', required: true },
    },
    {
      key: 'inspection.date',
      type: 'input',
      defaultValue: '2026-08-25',
      props: { label: 'Inspection date', type: 'date', required: true },
    },
    {
      key: 'inspection.condition',
      type: 'rating',
      props: {
        label: 'Condition rating',
        min: 1,
        max: 5,
        required: true,
      },
    },
    {
      key: 'inspection.safeToUse',
      type: 'checkbox',
      defaultValue: true,
      props: { label: 'Safe to use' },
    },
    {
      key: 'defects',
      type: 'repeat-section',
      props: { label: 'Defects', addText: 'Add defect' },
      fieldArray: {
        fieldGroup: [
          {
            key: 'summary',
            type: 'input',
            props: { label: 'Summary', required: true },
          },
          {
            key: 'severity',
            type: 'select',
            props: {
              label: 'Severity',
              options: [
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ],
            },
          },
        ],
      },
    },
  ];
}

function createPurchaseOrderFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'supplier',
      type: 'select',
      props: {
        label: 'Supplier',
        valueProp: 'code',
        labelProp: 'displayName',
        options: of([
          { code: 'NORTH', displayName: 'North Supply Cooperative' },
          { code: 'SOUTH', displayName: 'South Supply Cooperative' },
        ]),
        required: true,
      },
    },
    {
      key: 'currency',
      type: 'select',
      defaultValue: 'CAD',
      props: {
        label: 'Currency',
        options: [
          { value: 'CAD', label: 'Canadian dollar' },
          { value: 'USD', label: 'US dollar' },
        ],
      },
    },
    {
      key: 'total',
      type: 'currency',
      props: {
        label: 'Order total',
        min: 0,
        required: true,
      },
      modelOptions: {
        updateOn: 'blur',
      },
    },
  ];
}

function createIncidentReportFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'severity',
      type: 'select',
      defaultValue: 'minor',
      props: {
        label: 'Severity',
        options: [
          { value: 'minor', label: 'Minor' },
          { value: 'major', label: 'Major' },
          { value: 'critical', label: 'Critical' },
        ],
      },
    },
    {
      key: 'summary',
      type: 'textarea',
      props: {
        label: 'Summary',
        rows: 5,
        minLength: 20,
        maxLength: 500,
        required: true,
      },
      validators: {
        containsDetails: {
          expression: (control: AbstractControl) =>
            typeof control.value === 'string' && control.value.trim().length >= 20,
          message: 'Provide at least twenty characters of useful detail.',
        },
      },
    },
    {
      key: 'emergencyContacted',
      type: 'checkbox',
      props: { label: 'Emergency contact notified' },
      expressions: {
        hide: (field) =>
          readModelValue(field.model as unknown, 'severity') !== 'critical',
        'props.required': (field) =>
          readModelValue(field.model as unknown, 'severity') === 'critical',
      },
    },
  ];
}

function createAccessRequestFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'requestor',
      type: 'input',
      props: { label: 'Requestor', required: true },
    },
    {
      key: 'environment',
      type: 'select',
      props: {
        label: 'Environment',
        options: [
          { value: 'development', label: 'Development' },
          { value: 'test', label: 'Test' },
          { value: 'production', label: 'Production' },
        ],
      },
    },
    {
      key: 'justification',
      type: 'textarea',
      props: { label: 'Justification', rows: 4 },
      expressions: {
        'props.disabled': 'formState.readonly',
      },
      hooks: {
        onInit: (field) => {
          field.props = { ...field.props, description: 'Initialized by a hook.' };
        },
      },
    },
  ];
}

export const OPERATIONS_TEST_FORMS = [
  {
    id: 'operations.equipment-inspection',
    title: 'Equipment inspection',
    description: 'Custom rating control and a populated defect repeater.',
    features: [
      'basic-controls',
      'nested-groups',
      'constraints',
      'defaults',
      'static-options',
      'repeaters',
      'custom-types',
    ],
    create: () => ({
      fields: createEquipmentInspectionFields(),
      model: { defects: [{ summary: 'Loose synthetic guard', severity: 'low' }] },
      formState: {},
    }),
  },
  {
    id: 'operations.purchase-order',
    title: 'Purchase order',
    description: 'Observable options, custom option properties, and currency input.',
    features: [
      'basic-controls',
      'defaults',
      'static-options',
      'observable-options',
      'model-options',
      'custom-types',
    ],
    create: () => ({
      fields: createPurchaseOrderFields(),
      model: {},
      formState: {},
    }),
  },
  {
    id: 'operations.incident-report',
    title: 'Incident report',
    description: 'Inline validation and function-driven conditional behavior.',
    features: [
      'basic-controls',
      'constraints',
      'defaults',
      'static-options',
      'function-expressions',
      'inline-validation',
    ],
    create: () => ({
      fields: createIncidentReportFields(),
      model: {},
      formState: {},
    }),
  },
  {
    id: 'operations.access-request',
    title: 'Access request',
    description: 'Form-state expressions and a lifecycle hook.',
    features: [
      'basic-controls',
      'static-options',
      'string-expressions',
      'hooks',
      'form-state',
      'opaque-values',
    ],
    create: () => ({
      fields: createAccessRequestFields(),
      model: {},
      formState: { readonly: false },
    }),
  },
] satisfies readonly TestFormDefinition[];
