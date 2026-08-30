import {
  defineFormContractDefinition,
  defineFormContractSource,
} from '@formly-contract/workspace';

import type { TestFormDefinition } from '../form-registry/form-definition.js';
import { APPLICANT_TEST_FORMS } from '../forms/applicant/applicant-forms.js';
import { EDGE_CASE_TEST_FORMS } from '../forms/edge-cases/edge-case-forms.js';
import { OPERATIONS_TEST_FORMS } from '../forms/operations/operations-forms.js';

function toContractDefinition(definition: TestFormDefinition) {
  return defineFormContractDefinition({
    id: definition.id,
    create: definition.create,
  });
}

export const APPLICANT_FORM_SOURCE = defineFormContractSource({
  sourceId: 'fixture/applicant-forms',
  list: () => APPLICANT_TEST_FORMS.map(toContractDefinition),
});

export const OPERATIONS_FORM_SOURCE = defineFormContractSource({
  sourceId: 'fixture/operations-forms',
  list: () => OPERATIONS_TEST_FORMS.map(toContractDefinition),
});

export const EDGE_CASE_FORM_SOURCE = defineFormContractSource({
  sourceId: 'fixture/edge-case-forms',
  list: () => EDGE_CASE_TEST_FORMS.map(toContractDefinition),
});
