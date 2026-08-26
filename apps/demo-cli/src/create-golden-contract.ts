import type { FormContract } from '@formly-contract/contract-schema';
import { extractFormContract } from '@formly-contract/formly-adapter';
import { createGoldenFormFields } from '@formly-contract/synthetic-form';

export function createGoldenContract(): FormContract {
  return extractFormContract({
    formId: 'demo.golden-form',
    fields: createGoldenFormFields(),
  }).contract;
}
