# Task Plan: v0.3 Test Locators

Goal: add deterministic, evidence-tagged, multi-target locator metadata without
inventing selectors or rendering workplace data.

## Phases

- [x] Research official Formly, Playwright, and Cypress locator behavior.
- [x] Record the v0.3 schema, evidence, ownership, and composite-widget design.
- [x] Add failing schema tests and implement strict locator validation.
- [x] Add failing adapter tests for exact, derived, composite, empty, and
  malformed locator cases.
- [x] Implement deterministic locator projection and derivation diagnostics.
- [x] Add resolved Formly integration coverage.
- [x] Update the golden demo, README, architecture, and implementation plan.
- [ ] Run focused tests, all checks, clean-clone verification, and review.
- [ ] Open and merge a green pull request.

## Decisions

- Observed DOM evidence is authoritative but capture is deferred.
- Locators live on nodes as an ordered array with node-local targets.
- Empty arrays represent no reliable locator.
- The default adapter reads common dedicated test attributes and field IDs.
- An opt-in deriver receives only immutable identity data and can return
  multiple target locators.

## Risks

- A declared attribute may not be bound by a custom component; evidence states
  what was declared, not browser parity.
- Field IDs can be generated or ignored by composite widgets, so they are
  lower-priority derived DOM-ID candidates.
- A derivation strategy is executable code; it is explicit build input, never
  discovered from Formly configuration or invoked by MCP.
