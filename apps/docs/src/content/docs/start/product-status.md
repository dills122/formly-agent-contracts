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
- `formly-contracts list`, `generate`, and non-mutating `check` commands.
- Programmatic workspace discovery, generation, checking, index parsing, and
  contract parsing APIs.
- Angular CLI and Nx consumer-shaped fixtures plus a browser-rendered synthetic
  Formly test application.

## Researched or planned

<div class="status-line">
  <span class="status status--planned">Not shipped</span>
  <span>MCP transport · Playwright compiler/drivers · browser parity</span>
</div>

- A production MCP server and read-only query surface.
- Typed test-intent validation and automatic Playwright generation.
- Generic and application-specific executable field drivers.
- Browser observation and declared/resolved/observed parity reports.
- Automatic Angular-assisted source discovery and symbol-level source lineage.
- Journey contracts for routes, authentication, fixtures, submit behavior, and
  application outcomes.

The existing research describes constraints and candidate delivery slices. It
does not authorize consumers to import packages or call APIs that do not exist.

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
