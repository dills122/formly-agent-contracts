import type { FormContract } from '@formly-agent-contracts/contract-schema';
import { extractFormContract } from '@formly-agent-contracts/formly-adapter';
import { createGoldenFormFields } from '@formly-agent-contracts/synthetic-form';

export function createGoldenContract(): FormContract {
  return extractFormContract({
    formId: 'demo.golden-form',
    fields: createGoldenFormFields(),
  }).contract;
}
