# Single Angular Project Example

This application is both a browser-rendered Formly catalog and the maintained
single-project Formly Contract example. It uses the ordinary Angular CLI
layout: the application, root contract config, and one project descriptor all
live at the same project root.

```text
formly-contracts.config.ts       workspace policy and output location
formly-contracts.project.ts      the one application ownership boundary
src/app/form-contracts/          Node-side source and profile descriptors
src/app/forms/                   browser-safe Formly factories by feature
src/app/formly-types/            native and custom Angular components
```

The contract entry points reuse the same factories that the browser registry
renders. They do not duplicate the fields or import contract configuration into
the application bundle.

## Corpus

The project contributes twelve synthetic forms from three independently named
sources:

| Source | Forms | Representative support evidence |
| --- | ---: | --- |
| `fixture/applicant-forms` | 4 | nesting, key paths, string conditions, wrappers, object repeaters |
| `fixture/operations-forms` | 4 | constraints, custom currency/rating controls, Observable options, hooks, inline validation |
| `fixture/edge-case-forms` | 4 | numeric/bracketed keys, async validation, function arrays, custom interaction controls, legacy v6 aliases |

The reviewed field-profile registry covers currency input, generated ratings,
ordinary and expandable repeaters, button and overlay choices, object-valued
autocomplete, and table row selection. The fixtures intentionally retain
unsupported executable behavior too. Generation must report those functions,
async values, and model options as explicit diagnostics rather than silently
claiming complete knowledge.

## Commands

From the repository root:

```sh
pnpm app:serve
pnpm --filter @formly-contract/formly-test-app build
pnpm exec vitest run apps/formly-test-app/workspace-fixture.test.ts
```

The fixture test generates into a temporary directory twice and asserts stable
bytes, the complete twelve-form inventory, portable paths, reviewed custom
interactions, nested array identity, declared conditions, and the expected
unknown/opaque diagnostic classes.

Run the complete maintained example suite with:

```sh
pnpm test:examples
```

That suite also exercises the Angular CLI monorepo and Nx workspace examples.

## Adapting the layout

For a real single Angular project, keep the root `projectConfigs` list literal
and small, give the application one stable `projectId`, and group definitions
into sources according to feature ownership. Every `list()` and `create()` call
must return fresh values. Keep browser-only setup in Angular modules and keep
the config import graph Node-safe.

In a standalone consumer repository with its own `pnpm-lock.yaml`, the normal
commands are `pnpm exec formly-contracts generate` and
`pnpm exec formly-contracts check`. This application is nested in the Formly
Contract development workspace, so its acceptance test supplies pinned runtime
provenance instead of pretending the repository lockfile belongs to the nested
project.

Do not copy the fixture's invented labels or model values into an application.
The useful example is the ownership and testing shape, not its synthetic
domain.
