import type { FormContract } from '@formly-contract/schema';
import { extractFormContract } from '@formly-contract/compiler';
import { createGoldenFormFields } from '@formly-contract/synthetic-form';

/**
 * Extracts the fixed "golden" form contract that `pnpm demo` prints and
 * `.github/scripts/check-demo.mjs` uses as a determinism/regression check:
 * it runs this twice and requires byte-for-byte identical output, and
 * asserts on `formId`/node count. `formId` is hardcoded to
 * `'demo.golden-form'` — and the fields come from the synthetic-form
 * package's fixed `createGoldenFormFields()` — so the contract is a stable,
 * checked-against reference rather than anything user-configurable.
 */
export function createGoldenContract(): FormContract {
  return extractFormContract({
    formId: 'demo.golden-form',
    fields: createGoldenFormFields(),
  }).contract;
}
