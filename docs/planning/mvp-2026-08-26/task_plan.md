# Task Plan: August 26 Parser MVP

Goal: Publish a cloneable repository that converts a synthetic Formly 6.1 form
on Angular 20 into a deterministic, agent-readable contract.

## Phases

- [x] Confirm the first-delivery objective, stack, data boundary, and tracking
  preference.
- [x] Write the MVP specification, delivery process, and implementation tasks.
- [x] Prove the pinned Angular/Formly compatibility and choose the extraction
  boundary.
- [ ] Implement and test the v0 contract foundation.
- [ ] Implement and test the parser vertical slice.
- [ ] Ship the synthetic demo and user documentation.
- [ ] Publish an approved, licensed GitHub repository for the workplace test.
- [ ] Add the MCP inspector only if the parser shipping gate remains green.

## Decisions

- Parser and contract data are the product; MCP is an optional inspector.
- All fixtures are invented and safe for a public repository.
- Active work is tracked in Markdown; GitHub issues are reserved for
  reproducible bugs and accepted follow-up work.
- Playwright and production MCP packaging are post-MVP.

## Risks

- Angular 20/Formly 6.1 has a broad declared peer match but is not the current
  Formly-recommended pairing.
- A full Formly runtime build may require more Angular DI/view setup than the
  one-day window permits.
- “Form flow” must remain bounded to evidence the parser can safely provide.

## Current Gate

The pinned workspace and exact-version compatibility proof pass. ADR 0002
selects a controlled, component-free Formly builder boundary. Begin the v0
contract and diagnostics slice; MCP remains deferred.
