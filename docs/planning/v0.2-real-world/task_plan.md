# Task Plan: v0.2 Real-World Form Semantics

Goal: remove the four blockers found in the first workplace integration while
preserving a deterministic, safe contract boundary.

## Phases

- [x] Record the contract, identity, and trusted-execution decisions.
- [x] Add failing schema tests for display nodes, dynamic rules, option source,
  and resolved state.
- [x] Implement and validate the v0.2 contract schema.
- [x] Add failing adapter regressions for keyless groups, templates, and
  dynamic choices.
- [x] Implement declared extraction without callback execution.
- [x] Add and test trusted Formly scenario compilation with synthetic inputs.
- [x] Update the golden fixture, docs, and demo output.
- [x] Run focused tests, all checks, clean-clone verification, and review.

## Constraints

- No work data or production MCP code enters this repository.
- No callback runs in declared extraction or an MCP query path.
- Public behavior changes update the schema and architecture docs first.
- Keep Formly-specific execution in `packages/formly-adapter`; keep DTO and
  runtime validation in `packages/contract-schema`.
