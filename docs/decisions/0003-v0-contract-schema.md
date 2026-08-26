# ADR 0003: Define the v0 Form Contract Schema

- Status: Accepted
- Date: 2026-08-25

This decision records schema `0.1.0`. Schema `0.2.0` extends it as specified in
[ADR 0005](0005-trusted-scenario-resolution.md) and the
[v0.2 specification](../v0.2-real-world-semantics-spec.md).

## Context

The extractor needs a small, deterministic boundary before Formly-specific
projection begins. The twelve-form synthetic corpus includes nested groups,
repeaters, dotted and array-form keys, static and observable options, string and
function expressions, synchronous and asynchronous validators, hooks, parsers,
and legacy aliases.

Serializing live Formly fields would leak circular parent links, Angular
controls, injectors, subscriptions, and executable functions. Silently dropping
those values would make the result unreliable for E2E planning.

## Decision

Schema version `0.1.0` is a JSON-safe tree with these boundaries:

- a form has `formId`, ordered root `nodes`, ordered `diagnostics`, and a
  `sha256:` content hash;
- every node has a stable `id`, a `kind` (`control`, `group`, or `array`), a
  model path made from non-empty string or non-negative integer segments,
  declared or resolved evidence, ordered children, constraints, static options,
  conditions, and wrappers;
- presentation values are allowlisted to label, description, and placeholder;
- constraints are explicit tagged values for required, minimum, maximum,
  length, pattern, and named validation;
- default and option values must be JSON values;
- safely preserved expression strings become declared conditions;
- executable functions, asynchronous or Observable-like values, unknown field
  shapes, and unsupported rules become stable diagnostics rather than source
  text or guessed behavior.

The initial diagnostic codes are `OPAQUE_FUNCTION`, `ASYNC_VALUE`,
`UNKNOWN_FIELD_SHAPE`, and `UNSUPPORTED_RULE`. Diagnostics contain a severity,
human-readable message, evidence kind, configuration source path, and optional
node ID.

Canonical JSON recursively sorts object keys while retaining array order. It
rejects non-JSON values and cycles. The content hash is SHA-256 over the
canonical contract without `contentHash`; timestamps and other volatile values
are not part of v0.

Runtime validation is implemented inside `packages/contract-schema` rather
than adding a public runtime dependency. Validation rejects unknown object
properties so accidental schema expansion requires an explicit versioned
decision.

## Consequences

- The Formly adapter has a narrow target and cannot serialize live framework
  objects accidentally.
- Tree and option ordering remain semantically meaningful and deterministic.
- Model path and stable node-ID construction remain separate concerns; the
  adapter will define the v0 ID algorithm before emitting nodes.
- Unsupported behavior remains useful through diagnostics without evaluating
  source or function bodies.
- Schema evolution after publication requires a version change and matching
  runtime-validation updates.

## Sources

- Formly v6 properties and options:
  <https://v6.formly.dev/docs/guide/properties-options/>
- Formly v6 expressions:
  <https://v6.formly.dev/docs/guide/expression-properties/>
- Formly v6 validation:
  <https://v6.formly.dev/docs/guide/validation/>
- Node.js `crypto.createHash()`:
  <https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options>
