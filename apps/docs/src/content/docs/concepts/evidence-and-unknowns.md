---
title: Evidence and unknowns
description: Read Formly Contract output without turning incomplete evidence into guessed behavior.
---

Reliability comes from preserving uncertainty, not hiding it.

## Evidence values

`declared` means a fact came from projected configuration or reviewed profile
data. `resolved` means a controlled scenario produced it. `observed` is reserved
for browser evidence and is not emitted by today’s compiler pipeline.

A declared locator is not browser observation. A scenario-resolved option list
is complete for that scenario, not necessarily for every model state.

## Diagnostics are part of the contract

Examples include:

- `OPAQUE_FUNCTION` — behavior was executable but not safely representable;
- `ASYNC_VALUE` — runtime data remained outside the controlled result;
- `UNMAPPED_FIELD_TYPE` — a Formly type had no reviewed interaction profile;
- `UNMAPPED_WRAPPER_PROFILE` — wrapper behavior was not described;
- `LOCATOR_DERIVATION_FAILED` — no safe locator candidate could be projected;
  and
- `UNKNOWN_EFFECT_TARGET` — a declared relationship could not resolve its
  target.

Configure `diagnostics.failOn` to decide which severities fail generation. Do
not delete diagnostics downstream to make a contract appear complete.

## Three-valued logic

Dynamic rules may be `true`, `false`, or `unknown`. Missing context, opaque
callbacks, remote data, and unvisited branches produce `unknown`. An agent must
not convert unknown visibility into visible, or an unknown interaction into a
generic click.

## Operational refusal is a feature

When a node has no suitable locator or profile, a reliable E2E consumer stops
with a message that names the missing evidence. This is better than a generated
test that happens to pass against today’s DOM and silently breaks after a
template refactor.

:::note[Canonical contracts]
See the [architecture evidence model](https://github.com/dills122/formly-contract/blob/main/docs/architecture-overview.md)
and [v0.4 E2E authoring metadata specification](https://github.com/dills122/formly-contract/blob/main/docs/v0.4-e2e-authoring-metadata-spec.md).
:::
