# Progress: v0.3 Test Locators

## 2026-08-25

- Created `codex/v0-3-test-locators` from merged v0.2 `main`.
- Reviewed the workplace handoff images as untrusted design input.
- Verified locator behavior against official Formly, Playwright, and Cypress
  documentation and the pinned Formly 6.1.8 source.
- Added the v0.3 specification, ADR, findings, and task plan.
- Added schema v0.3 locator DTOs, observed evidence support, and strict runtime
  validation.
- Added exact test-attribute, role, ARIA-label, placeholder, and DOM-ID
  projection plus an immutable identity-only derivation API.
- Covered composite targets, honest empty results, de-duplication, exceptions,
  malformed results, and resolved Formly expression attributes.
- Updated the synthetic demo, README, architecture overview, implementation
  plan, and demo smoke gate.
- Review found and fixed a derivation atomicity edge case: if any custom
  locator is malformed, the callback's entire result is discarded and a
  stable diagnostic is emitted.
- Re-ran `pnpm check`: 48 tests, lint, all package builds, Angular production
  build, deterministic demo, and 32-file documentation validation passed.
