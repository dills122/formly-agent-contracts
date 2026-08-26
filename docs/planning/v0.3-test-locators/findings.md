# Findings: v0.3 Test Locators

## Sources

- Playwright recommends role, label, and explicit test-ID locators, and permits
  configuring the attribute behind `getByTestId`.
- Cypress recommends dedicated `data-*` selector attributes rather than
  styling, tag, text, or ordinary DOM IDs.
- Formly 6.1 documents field `id` and `props`; its core `FormlyAttributes`
  directive applies `props.attributes` to a bound element and generates an ID
  when one is absent.

## Notes

- A Formly build normalizes configuration but does not render a DOM, so it
  cannot create observed evidence.
- Attribute name and value must both be portable contract data; `testId` alone
  assumes Playwright's default convention.
- Composite widgets need named DOM targets under one semantic field.
- Locator presence does not prove uniqueness; that requires a page observation.
