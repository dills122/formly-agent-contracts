/**
 * Synthetic Canadian postal code shape, e.g. "A1A 1A1". Shared between the
 * `postalCode` Formly validator (test-formly-extensions.module.ts) and the
 * `pattern` prop on the applicant form's postal code field
 * (applicant-forms.ts). Kept in its own module, free of any Angular
 * imports, so pulling it in doesn't drag either side's Angular
 * component/module graph into the other.
 */
export const postalCodePattern = /^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$/;
