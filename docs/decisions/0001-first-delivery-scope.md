# ADR 0001: First Delivery Is a Formly Contract Extractor

- Status: Accepted
- Date: 2026-08-25

## Context

The long-term architecture includes contract compilation, MCP discovery, typed
E2E intent, Playwright execution, runtime parity, and change analysis. The first
usable repository is wanted by August 26, 2026. Attempting the entire flow in
that window would make the core contract difficult to validate and would put
MCP or Playwright plumbing ahead of the information product.

The target workplace stack uses Angular 20 and Formly 6.1. Work forms and data
cannot be copied into this repository.

## Decision

The first delivery will be a reusable parser and contract-schema vertical slice
for explicitly registered `FormlyFieldConfig[]` values, tested with invented
fixtures. It will prioritize deterministic, JSON-safe information about form
structure and declared behavior.

A small read-only MCP inspector is permitted only after the parser shipping gate
passes. It is a development consumer, not part of the public product boundary.
Playwright integration and production MCP delivery are separate post-MVP
milestones.

## Consequences

- The repository can demonstrate useful output quickly and test the riskiest
  Angular/Formly compatibility assumption first.
- Opaque runtime behavior will appear as diagnostics rather than inferred facts.
- The first contract will be versioned but pre-1.0 and may evolve through
  explicit decisions.
- The fixture will demonstrate representative shapes but cannot prove full
  compatibility with the eventual workplace application.
- Runtime builder parity, source analysis, custom widgets, and browser-observed
  behavior remain deliberate future work.

## Evidence

- `@ngx-formly/core@6.1.8` declares `@angular/forms >=13.2.0`.
- Current Formly guidance recommends Formly 7 for Angular 18 and newer, so the
  requested Angular 20/Formly 6.1 pairing requires an executable compatibility
  test before making a support claim.

Sources:

- <https://registry.npmjs.org/@ngx-formly%2fcore/6.1.8>
- <https://www.npmjs.com/package/@ngx-formly/core>
- <https://angular.dev/reference/versions>
