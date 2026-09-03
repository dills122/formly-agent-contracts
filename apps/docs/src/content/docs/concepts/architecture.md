---
title: Architecture
description: How Formly Contract separates application-owned execution, portable contracts, and future query and E2E layers.
---

Formly Contract is a compiler pipeline, not a runtime dump. Trusted build code
selects application-owned forms, the compiler projects an allowlisted semantic
model, and consumers read validated portable artifacts.

```text
Angular/Formly application code
        │ explicit sources + profiles
        ▼
@formly-contract/workspace
        │ trusted discovery + policy + worker orchestration + publication
        ├── Node-safe project execution
        └── @formly-contract/angular/jit
                │ project-local compiler preload + disposable worker
        ▼
@formly-contract/compiler
        │ declared or scenario-resolved projection
        ▼
@formly-contract/schema
        │ validation + canonical JSON + hash
        ▼
workspace-index.json + content-addressed contracts
        │
        ├── current: review, CI drift checks, consumer E2E helpers
        └── planned: MCP query → typed intent → Playwright driver
```

## The four current package boundaries

**Schema owns portable contracts.** DTOs, runtime parsing, canonicalization,
hashing, diagnostics, field profiles, effects, and runtime provenance belong in
`@formly-contract/schema`.

**Compiler owns Formly semantics.** Declared extraction, controlled scenario
compilation, field-profile resolution, and allowlisted projection belong in
`@formly-contract/compiler`.

**Workspace owns trusted orchestration.** Root/project/source configuration,
config loading, discovery, policy resolution, index generation, artifact
publication, and CLI commands belong in `@formly-contract/workspace`.

**Angular owns guarded JIT composition.** Project-local Angular compiler
preload, disposable-child runtime hosting, and the Angular CLI belong in
`@formly-contract/angular`. This isolates module/cache state, crashes, and
timeouts; it does not turn trusted application code into untrusted sandboxed
code.

The repository also contains a private `@formly-contract/playwright` experiment
for trusted-local driver implementation binding and exact validated-plan call
lowering. It is not a fourth shipped product layer: it launches no browser and
provides no automatic Playwright generation or execution. Its portable
identities and semantic plan remain schema-owned.

Future query, intent, and browser packages consume these contracts. They must
not create a second configuration system or evaluate trusted application code
inside an untrusted MCP request.

## Declared, resolved, and observed stay separate

- **Declared** describes what application configuration states without running
  arbitrary callbacks.
- **Resolved** records a controlled scenario outcome for supplied synthetic
  model and form state.
- **Observed** would record what a browser actually rendered in one visited
  state. This layer is planned.

No view silently upgrades another. Evidence travels with each fact and unknown
behavior remains explicit.

## Trust boundary

Workspace configuration and form factories are trusted local or CI code. They
may import application modules and execute reviewed factories. An MCP server or
other untrusted query surface must read already-generated, strictly validated
artifacts instead of loading configs or selecting executable plugins.

:::note[Canonical architecture]
The [architecture overview](https://github.com/dills122/formly-contract/blob/main/docs/architecture-overview.md)
and [controlled builder ADR](https://github.com/dills122/formly-contract/blob/main/docs/decisions/0002-controlled-formly-builder-boundary.md)
are the canonical architecture contracts. This page is an orientation layer.
:::
