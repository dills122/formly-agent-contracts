import type { FormlyFieldConfig } from '@ngx-formly/core';
import { describe, expect, it } from 'vitest';

import { REQUIRED_TEST_FORM_FEATURES } from '../form-registry/form-definition.js';
import { APPLICANT_TEST_FORMS } from './applicant/applicant-forms.js';
import { EDGE_CASE_TEST_FORMS } from './edge-cases/edge-case-forms.js';
import { OPERATIONS_TEST_FORMS } from './operations/operations-forms.js';

const definitions = [
  ...APPLICANT_TEST_FORMS,
  ...OPERATIONS_TEST_FORMS,
  ...EDGE_CASE_TEST_FORMS,
];

function visitFields(
  fields: readonly FormlyFieldConfig[],
  visitor: (field: FormlyFieldConfig) => void,
): void {
  for (const field of fields) {
    visitor(field);
    visitFields(field.fieldGroup ?? [], visitor);
    if (field.fieldArray && typeof field.fieldArray !== 'function') {
      visitFields([field.fieldArray], visitor);
    }
  }
}

describe('synthetic Formly fixture corpus', () => {
  it('contains twelve stable forms split across three feature modules', () => {
    expect(APPLICANT_TEST_FORMS).toHaveLength(4);
    expect(OPERATIONS_TEST_FORMS).toHaveLength(4);
    expect(EDGE_CASE_TEST_FORMS).toHaveLength(4);
    expect(definitions.map(({ id }) => id)).toEqual([
      'applicant.profile',
      'applicant.household',
      'applicant.communication',
      'applicant.address-history',
      'operations.equipment-inspection',
      'operations.purchase-order',
      'operations.incident-report',
      'operations.access-request',
      'edge.key-paths',
      'edge.validation',
      'edge.opaque-behavior',
      'edge.legacy-v6',
    ]);
  });

  it('covers every required feature category', () => {
    const actualFeatures = new Set(
      definitions.flatMap(({ features }) => features),
    );

    for (const feature of REQUIRED_TEST_FORM_FEATURES) {
      expect(actualFeatures.has(feature), `missing feature: ${feature}`).toBe(
        true,
      );
    }
  });

  it('returns fresh top-level state for every registered fixture', () => {
    for (const definition of definitions) {
      const first = definition.create();
      const second = definition.create();

      expect(first.fields, definition.id).not.toBe(second.fields);
      expect(first.model, definition.id).not.toBe(second.model);
      expect(first.formState, definition.id).not.toBe(second.formState);
    }
  });

  it('includes empty scalar and populated object repeaters', () => {
    const opaque = EDGE_CASE_TEST_FORMS.find(
      ({ id }) => id === 'edge.opaque-behavior',
    )?.create();
    const generatedRows = opaque?.fields.find(
      ({ key }) => key === 'generatedRows',
    );
    const scalarTemplate =
      typeof generatedRows?.fieldArray === 'function'
        ? generatedRows.fieldArray()
        : undefined;

    expect(opaque?.model.generatedRows).toEqual([]);
    expect(scalarTemplate?.key).toBeUndefined();
    expect(scalarTemplate?.type).toBe('input');

    const equipment = OPERATIONS_TEST_FORMS.find(
      ({ id }) => id === 'operations.equipment-inspection',
    )?.create();
    expect(equipment?.model.defects).toEqual([
      { summary: 'Loose synthetic guard', severity: 'low' },
    ]);
  });

  it('isolates deprecated v6 aliases to the named legacy fixture', () => {
    for (const definition of definitions) {
      let deprecatedAliasCount = 0;
      visitFields(definition.create().fields, (field) => {
        if (
          field.templateOptions ??
          field.hideExpression ??
          field.expressionProperties
        ) {
          deprecatedAliasCount += 1;
        }
      });

      if (definition.id === 'edge.legacy-v6') {
        expect(deprecatedAliasCount).toBeGreaterThan(0);
      } else {
        expect(deprecatedAliasCount, definition.id).toBe(0);
      }
    }
  });
});
