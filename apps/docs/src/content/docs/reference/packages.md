---
title: Package responsibilities
description: Choose the Formly Contract package or repository group that owns the behavior you need.
---

## `@formly-contract/schema`

Use for portable data and validation:

- `parseFormContract`
- `canonicalStringify`
- contract, profile, effect, and provenance types
- canonical serialization and SHA-256 hashes
- pure agent-context queries, strict typed intent, and source-intent-bound
  canonical plan validation/revalidation

It does not load Formly, Angular, application configs, or browser code.
Its [package README](https://github.com/dills122/formly-contract/blob/main/packages/schema/README.md)
documents the browser-safe authoring subpath and contributor checks. The
[public API reference](./api.md#schema) groups its primary parsers, canonical
operations, registries, query surface, and authoring helpers.

## `@formly-contract/compiler`

Use in trusted build/test tooling that has Formly field configuration:

- `extractFormContract` for declared projection
- `compileFormContractScenario` for controlled scenario outcomes
- field-profile preparation and resolution
- cross-field effect resolution
- the type-only `FactoryInputAuthoringHarness` surface used by local generated
  factory-input drafts

It projects through allowlists. It does not serialize live Formly objects, and
the authoring harness type has no runtime implementation or factory-execution
authority.
Its [package README](https://github.com/dills122/formly-contract/blob/main/packages/compiler/README.md)
documents extraction boundaries and focused checks. See the
[compiler API](./api.md#compiler) for declared and scenario entry points.

## `@formly-contract/workspace`

Use for repository-aware adoption:

- `defineConfig`, `defineFormContractProject`, and
  `defineFormContractSource`
- `discoverWorkspaceProjects`
- `inspectWorkspaceFactoryInputs` for read-only, definition-linked authoring
  drafts
- `runWorkspace` and `checkWorkspace`
- `parseWorkspaceContractIndex`
- the `formly-contracts` CLI

Configuration and source factories are trusted executable code. Generated
indexes and contracts are portable validated data. Factory-input drafts are a
separate local authoring result: the inspector reads the existing TypeScript
Program and lineage but does not call the registered form factory or write the
suggested file.
Its [package README](https://github.com/dills122/formly-contract/blob/main/packages/workspace/README.md)
maps configuration, discovery, generation, source indexing, and CLI ownership.
The [workspace API](./api.md#workspace) and [CLI reference](./cli-api.md) are
the current consumer lookup surfaces.

## Private `@formly-contract/playwright` experiment

The repository contains a private `0.0.0` package that binds validated driver
identities to reviewed trusted-local implementation definitions. It can also
revalidate a CTX-2 plan and produce an all-or-nothing ordered batch pairing each
exact approved step with its trusted implementation. The directory reserves
the intended ownership boundary and supports ongoing design work.

It does **not** currently depend on Playwright, launch a browser, generate tests,
invoke drivers, or provide the planned browser execution vertical. It is not a
published user capability. See its
[package README](https://github.com/dills122/formly-contract/blob/main/packages/playwright/README.md)
and [private API boundary](./api.md#private-playwright-experiment) before
contributing there.

## Applications and fixtures

- `apps/demo-cli` proves deterministic extraction against a synthetic form.
- `apps/formly-test-app` is the maintained single Angular project example. It
  renders and generates contracts for a twelve-form synthetic corpus.
- `fixtures/angular-monorepo` exercises distributed Angular CLI integration,
  cross-field effects, custom profiles, and committed contract goldens.
- `fixtures/nx-workspace` exercises Nx project boundaries, path aliases,
  a ten-form regulated-workflow corpus plus two sanitized typed-input authoring
  forms, custom fields, source-usage linkage, effects, and deterministic
  generation.

See [Maintained examples](./examples.md) for the exact support evidence
and shared compliance command.

For repository navigation, the
[`packages/` guide](https://github.com/dills122/formly-contract/blob/main/packages/README.md),
[`apps/` guide](https://github.com/dills122/formly-contract/blob/main/apps/README.md),
and
[`fixtures/` guide](https://github.com/dills122/formly-contract/blob/main/fixtures/README.md)
explain which directories are product code, runnable examples, or test-only
inputs.

No MCP server, browser-executing Playwright integration, or test-intent package
is published in the current repository.

:::note[Canonical package contracts]
Use the package entry points and
[architecture overview](https://github.com/dills122/formly-contract/blob/main/docs/architecture-overview.md)
as authority. The [public API reference](./api.md) is curated from those entry
points; generated TypeScript declarations remain exhaustive.
:::
