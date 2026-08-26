# ADR 0006: Use Node-Local Multi-Target Locators with Explicit Evidence

- Status: Accepted
- Date: 2026-08-25

## Context

The v0.2 contract tells an E2E author what controls exist and how their state
flows, but it does not provide the DOM targeting information used by Cypress or
Playwright. Applications use different dedicated test attributes, and one
Formly field can render several interactive elements.

Formly 6.1 lets a field declare an `id`; its `FormlyAttributes` directive also
applies entries from `props.attributes` to the bound element. A controlled
Formly build can resolve those configuration values but does not render or
inspect a browser DOM.

## Decision

Schema `0.3.0` adds an ordered `locators` array to every node. Each entry names
a node-local target, strategy, value, evidence, and confidence. Test-ID entries
also retain their attribute name. A flat array supports both several fallback
strategies for one target and several named targets for a composite widget.

Locators remain on the node instead of a separate map because discovery and
explanation APIs already return nodes, and locator metadata is small. An empty
array explicitly states that no reliable locator is known.

The adapter reads exact configured test attributes and can invoke an explicitly
supplied derivation strategy over immutable identity data. Derived entries can
never claim exact confidence. The live Formly field and its executable members
are not exposed to that strategy.

Declared, resolved, and observed evidence remain distinct. Browser observation
is authoritative for rendered parity, but its capture is outside this slice.

## Consequences

- Cypress and Playwright consumers can share the same portable locator facts.
- Custom test-id attributes do not require a schema change.
- Date ranges, addresses, secrets, and other composites can name each DOM
  target without creating fake semantic form nodes.
- Application conventions stay outside the core adapter.
- Locator uniqueness and browser parity require a later observation layer.

## Sources

- Playwright locator guidance and configurable test-id attribute:
  <https://playwright.dev/docs/locators>
- Cypress selector best practices:
  <https://docs.cypress.io/app/core-concepts/best-practices#Selecting-Elements>
- Formly v6 field properties:
  <https://v6.formly.dev/docs/guide/properties-options/>
- Formly v6 core API and `FormlyAttributes`:
  <https://v6.formly.dev/docs/api/core/>
