---
title: Product status
description: A clear boundary between implemented Formly Contract capabilities and planned layers.
---

This page is intentionally conservative. “Designed” and “researched” do not
mean “available in the package.”

## Available now

- Form Contract schema `0.4.0`, strict runtime parsing, canonical JSON, and
  SHA-256 content hashes.
- Declared Formly extraction and trusted scenario compilation.
- Field-type profile and cross-field effect registries with explicit evidence
  and unknowns.
- Workspace configuration schema `0.2.0`, deterministic project discovery,
  trusted TypeScript config loading, content-addressed artifacts, and a
  workspace index.
- Optional `direct-root-call-v1` source indexing for explicit form definitions,
  direct factory calls/constructors, exact form ID/hash resolution, and a
  portable `source-usage-catalog.json`.
- Browser-safe compact authoring for contracted radio-choice Formly types,
  shared by production registration and canonical profile generation.
- `formly-contracts list`, `generate`, non-mutating `check`, and read-only
  `author-factory-inputs` commands.
- Programmatic workspace discovery, local factory-input inspection, generation,
  checking, index parsing, and contract parsing APIs.
- Pure `executeAgentContextQuery` over caller-assembled agent-context
  artifacts, including source-usage search by source path or form ID.
- Angular CLI and Nx consumer-shaped fixtures plus a browser-rendered synthetic
  Formly test application.

## Researched or planned

<div class="status-line">
  <span class="status status--planned">Not shipped</span>
  <span>MCP transport · Playwright compiler/drivers · browser parity</span>
</div>

- A production MCP server and CLI-managed query surface.
- Typed test-intent validation and automatic Playwright generation.
- Generic and application-specific executable field drivers.
- Browser observation and declared/resolved/observed parity reports.
- Broader interprocedural source discovery, route/render proof, and complete
  runtime lineage.
- Compact contracted-type presets beyond the current radio-choice happy path.
- Journey contracts for routes, authentication, fixtures, submit behavior, and
  application outcomes.

The existing research describes constraints and candidate delivery slices. It
does not authorize consumers to import packages or call APIs that do not exist.

The shipped source index is deliberately partial: it requires explicit
`defineFormContractProject` registration that directly references the canonical
source descriptor, an explicit `defineFormContractDefinition` directly listed
by that descriptor, matching literal/runtime IDs, agreement between the
project-config authority Program, the exact Jiti config runtime, and one
configured leaf application Program,
and supported direct calls or `new` expressions. A same-ID
descriptor outside that chain is not authority. It never executes or serializes
call arguments and reports incomplete coverage; some out-of-grammar calls may
remain unindexed without a per-call diagnostic.

Workspace-contained authority files and traversed aliases are
Program-vs-final-byte snapshot validated, so a mismatch suppresses every
dependent exact usage. Only the exact canonical helper package-export chain may
be external to a nested consumer root; unrelated external aliases fail closed.
Run against a quiescent workspace: both Programs are created before form factories
execute, but the MVP does not claim complete runtime/Jiti module snapshots and
retains a short config-loading-to-Program boundary. Contract generation separately calls
each definition's `create()` with no arguments. Implicit root inference
therefore requires a proven zero-argument-compatible signature; explicit
`lineage.rootSymbol` may name a required-argument factory behind a Node-safe
adapter.

Reusable fragments and steps remain dependencies/lineage and are not promoted
to standalone form roots unless explicitly registered.

## How pages declare status

Examples in this site use three labels:

- **Current** — implemented on the repository’s default branch and covered by
  tests or maintained fixtures.
- **Consumer code** — an integration pattern you can write today using current
  APIs; it is not a shipped helper from Formly Contract.
- **Planned** — research, accepted direction, or roadmap material without a
  production package surface.

:::note[Canonical sources]
The [README](https://github.com/dills122/formly-contract/blob/main/README.md)
defines the current public package surface. The
[implementation plan](https://github.com/dills122/formly-contract/blob/main/docs/implementation-plan.md)
and [research directory](https://github.com/dills122/formly-contract/tree/main/docs/research)
hold future design material.
:::
