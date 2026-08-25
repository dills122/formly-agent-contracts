# ADR 0004: Derive v0 Node Identity from Model Paths

- Status: Accepted
- Date: 2026-08-25

## Context

Formly keys may be numbers, dotted strings, bracketed strings, or arrays whose
string segments can contain literal dots. Repeated-field templates also need an
identity before any model rows exist. Generated Formly IDs and labels are not
stable semantic identifiers.

Formly 6.1.8 normalizes string keys by translating bracket segments and
splitting dots, preserves array-form segments, and stringifies other scalar
keys. The adapter must match those path semantics without importing Formly's
private `getKeyPath` helper.

## Decision

The v0 adapter constructs cumulative model paths as follows:

- dotted strings become multiple path segments;
- bracketed word or numeric segments become path segments;
- array-form keys preserve each segment literally;
- numeric keys and numeric bracket segments become non-negative integers;
- keyless groups inherit their parent model path; and
- an array template adds the literal `*` segment before its template key.

A keyed node ID is the form ID, `::path:`, and an ordered sequence of typed path
tokens. String tokens use `s_` plus strict percent encoding; numeric tokens use
`n_` plus the decimal value. For example,
`applicant.profile::path:s_identity.s_legalName` is distinct from a single key
containing a literal dot, whose dot is encoded as `%2E`.

Keyless nodes use `::position:` plus their zero-based tree position. Position
is a fallback only where no model path exists. Duplicate generated IDs receive
a deterministic position suffix and an `UNKNOWN_FIELD_SHAPE` diagnostic rather
than being silently merged.

## Consequences

- IDs do not depend on labels, generated Formly IDs, or rendered selectors.
- Array templates remain addressable before rows exist.
- Ordinary keyed nodes survive unrelated presentation or sibling-order changes.
- Reordering a keyless structural group can change that group's fallback ID;
  this limitation is explicit in v0.
- Literal-dot array keys remain distinguishable from dotted string keys.

## Source

- Formly 6.1.8 key normalization implementation:
  <https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/utils.ts>
