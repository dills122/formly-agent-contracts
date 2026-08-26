import { verifyContentHash } from '@formly-contract/schema';
import { extractFormContract } from '@formly-contract/compiler';
import { describe, expect, it } from 'vitest';

import { APPLICANT_TEST_FORMS } from './forms/applicant/applicant-forms.js';
import { EDGE_CASE_TEST_FORMS } from './forms/edge-cases/edge-case-forms.js';
import { OPERATIONS_TEST_FORMS } from './forms/operations/operations-forms.js';

const definitions = [
  ...APPLICANT_TEST_FORMS,
  ...OPERATIONS_TEST_FORMS,
  ...EDGE_CASE_TEST_FORMS,
];

describe('Formly contract fixture integration', () => {
  it('extracts every registered synthetic fixture into a valid stable contract', () => {
    for (const definition of definitions) {
      const first = extractFormContract({
        formId: definition.id,
        fields: definition.create().fields,
      });
      const second = extractFormContract({
        formId: definition.id,
        fields: definition.create().fields,
      });

      expect(first.contract.nodes, definition.id).toHaveLength(
        definition.create().fields.length,
      );
      expect(verifyContentHash(first.contract), definition.id).toBe(true);
      expect(second.contract.contentHash, definition.id).toBe(
        first.contract.contentHash,
      );
    }
  });

  it('diagnoses every opaque behavior class present in the realistic corpus', () => {
    const diagnosticCodes = new Set(
      definitions.flatMap((definition) =>
        extractFormContract({
          formId: definition.id,
          fields: definition.create().fields,
        }).diagnostics.map(({ code }) => code),
      ),
    );

    expect(diagnosticCodes).toEqual(
      new Set([
        'OPAQUE_FUNCTION',
        'ASYNC_VALUE',
        'UNSUPPORTED_RULE',
      ]),
    );
  });

  it('retains representative conditions and array templates from the corpus', () => {
    const communication = APPLICANT_TEST_FORMS.find(
      ({ id }) => id === 'applicant.communication',
    );
    const household = APPLICANT_TEST_FORMS.find(
      ({ id }) => id === 'applicant.household',
    );

    const communicationContract = extractFormContract({
      formId: 'applicant.communication',
      fields: communication?.create().fields ?? [],
    }).contract;
    const householdContract = extractFormContract({
      formId: 'applicant.household',
      fields: household?.create().fields ?? [],
    }).contract;

    expect(communicationContract.nodes[1]?.conditions).toContainEqual({
      property: 'hide',
      expression: "model.channel !== 'email'",
      evidence: 'declared',
    });
    expect(householdContract.nodes[1]?.arrayTemplate?.modelPath).toEqual([
      'members',
      '*',
    ]);
  });
});
