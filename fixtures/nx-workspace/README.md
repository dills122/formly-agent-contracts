# Nx Workspace Consumer Fixture

This fixture is the real Nx integration anchor for project-aware discovery. It
uses an integrated Nx `23.1.1` workspace with Angular `20.3.29` and Formly
`6.1.8` across four independently configured projects:

```text
apps/test-app       Angular application and composition root
libs/formly-kit     base Formly type registration
libs/forms-kit      reusable fragment and custom radio field
libs/feature-lib    consuming form and rendered page
```

Nx resolves the static dependency chain as
`fixture-nx-app → fixture-nx-feature-lib → fixture-nx-forms-kit →
fixture-nx-formly-kit`. The fixture contains a representative shared form and
feature form rather than duplicating the deeper Angular CLI corpus.

## Why two cache settings differ

Nx owns task caching for this fixture through `targetDefaults.build.cache`.
Angular CLI's separate persistent disk cache is disabled under `nx.json` so
the fixture has one cache authority and avoids a reproducible native LMDB crash
on the local macOS test host. A repeated Nx production build still restores
both terminal output and build artifacts from `.nx/cache`.

## Commands

From the repository root:

```sh
pnpm exec vitest run fixtures/nx-workspace/workspace-fixture.test.ts
pnpm --filter @formly-contract/nx-workspace-fixture show:projects
pnpm --filter @formly-contract/nx-workspace-fixture build
pnpm fixture:nx:serve
```

Run the build command twice to observe the second execution as a local Nx cache
hit. Run `pnpm --filter @formly-contract/nx-workspace-fixture graph` to
inspect the project graph interactively.

This fixture validates the workspace shell, graph, task executor, cache, browser
composition, and distributed Formly Contract configuration. The future
`@formly-contract/nx` plugin will use this same workspace to prove
inferred contract targets and affected execution.
