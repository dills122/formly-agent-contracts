---
title: Package responsibilities
description: Choose the Formly Contract package that owns the schema, compiler, or workspace behavior you need.
---

## `@formly-contract/schema`

Use for portable data and validation:

- `parseFormContract`
- `canonicalStringify`
- contract, profile, effect, and provenance types
- canonical serialization and SHA-256 hashes

It does not load Formly, Angular, application configs, or browser code.

## `@formly-contract/compiler`

Use in trusted build/test tooling that has Formly field configuration:

- `extractFormContract` for declared projection
- `compileFormContractScenario` for controlled scenario outcomes
- field-profile preparation and resolution
- cross-field effect resolution

It projects through allowlists. It does not serialize live Formly objects.

## `@formly-contract/workspace`

Use for repository-aware adoption:

- `defineConfig`, `defineFormContractProject`, and
  `defineFormContractSource`
- `discoverWorkspaceProjects`
- `runWorkspace` and `checkWorkspace`
- `parseWorkspaceContractIndex`
- the `formly-contracts` CLI

Configuration and source factories are trusted executable code. Generated
indexes and contracts are portable validated data.

## Applications and fixtures

- `apps/demo-cli` proves deterministic extraction against a synthetic form.
- `apps/formly-test-app` renders a synthetic Angular/Formly corpus for
  compatibility and research.
- `fixtures/angular-monorepo` exercises Angular CLI integration.
- `fixtures/nx-workspace` exercises Nx project boundaries, path aliases,
  custom fields, and deterministic generation.

No MCP server, Playwright driver package, or test-intent package is published
in the current repository.

:::note[Canonical package contracts]
Use the package entry points and
[architecture overview](https://github.com/dills122/formly-contract/blob/main/docs/architecture-overview.md)
as authority. Package APIs take precedence over examples on this site if a
future release changes them.
:::
