# ADR 0005: Separate Declared Extraction from Trusted Scenario Resolution

- Status: Accepted
- Date: 2026-08-25

## Context

Production Formly configurations commonly use `expressions`, legacy
`expressionProperties`, and `hideExpression` callbacks to update required,
readonly, disabled, options, and visibility. Treating every callback as opaque
makes a contract safe but not useful enough to plan E2E flows. Executing those
callbacks during an MCP request would import application behavior into an
untrusted query boundary.

Formly 6.1 exposes `FormlyFormBuilder.build(field)` as its public normalization
API. Formly expressions may be strings, booleans, or functions, and a build can
apply their initial scenario value to the field tree.

## Decision

Keep two explicit APIs and evidence modes:

1. Declared extraction projects a supplied field tree without executing or
   subscribing to anything. Recognized callback expressions are serialized as
   dynamic-rule metadata.
2. Trusted scenario compilation runs only in an application build or CI
   process. It receives the application's configured `FormlyFormBuilder`, a
   fresh field factory, and disposable synthetic inputs, performs the Formly
   build, and then projects the resolved tree.

The MCP server may read compiled artifacts but must not call the trusted
compiler. Function source is never serialized or interpreted. Async behavior
that has not materialized during the controlled build remains explicit.

## Consequences

- Existing applications can expose realistic initial form flow without moving
  callbacks into the MCP process.
- Declared and resolved evidence cannot be silently confused.
- Scenario factories must return fresh fields because Formly mutates them.
- Service-backed callbacks can resolve when their closures and DI setup are
  already present in the trusted application compiler.
- Remote and lifecycle-driven changes still need declared provider metadata or
  later browser verification.

## Sources

- Formly 6 API, `FormlyFormBuilder`:
  <https://v6.formly.dev/docs/api/core/>
- Formly expression behavior:
  <https://formly.dev/docs/guide/expression-properties/>
- Angular reactive forms model:
  <https://angular.dev/guide/forms/reactive-forms>

