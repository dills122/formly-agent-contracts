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
`fixture-nx-app → fixture-nx-feature-lib → fixture-nx-forms-kit → fixture-nx-formly-kit`. The fixture contains a representative shared form and
feature form rather than duplicating the deeper Angular CLI corpus.

It is also the retained workplace MVP acceptance path. The fixture proves:

```text
ClaimPageComponent direct createNxClaimForm(...) call
  -> explicit NX_CLAIM_FORM_CONTRACT root symbol
  -> nx.claims.intake
  -> exact generated contract hash
  -> source-usage query by source path or form ID

NX_COOL_RADIO_TYPE + radioChoice()
  -> real Formly registration name
  -> generated canonical field-type profile registry
```

Root `sourceUsage` points to `apps/test-app/tsconfig.app.json`. The analysis
program also includes discovered project configs, so the Node-safe contract
definition is visible without importing it into the Angular runtime. The
feature library's own project config establishes callsite ownership; in the MVP
a consuming library without such a config emits `SOURCE_PROJECT_UNRESOLVED`.
All fixture project configs are intentionally TypeScript: the source-usage MVP
rejects `.mjs` and `.cjs` project configs rather than overriding the leaf
application program's `allowJs` setting.

The source catalog is deliberately `static-convention` evidence with
`bounded-programs-mvp` incomplete coverage. It proves neither route reachability
nor browser rendering, and the indexer does not execute or serialize the
fixture's browser-only `window.location.pathname` call argument.

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

The fixture test injects deterministic runtime provenance. This directory is a
package inside the repository workspace, not a standalone dependency workspace,
so it intentionally has no private `pnpm-lock.yaml` and is not a direct CLI
`workspaceRoot`. Real consumer commands run at the consumer's actual workspace
root, where the canonical lockfile exists.

Run the build command twice to observe the second execution as a local Nx cache
hit. Run `pnpm --filter @formly-contract/nx-workspace-fixture graph` to
inspect the project graph interactively.

Generation writes `workspace-index.json`, content-addressed contracts, and the
opt-in `source-usage-catalog.json`. The acceptance test also assembles the pure
query dataset and proves that both supported filters reach the same exact form
candidate.

This fixture validates the workspace shell, graph, task executor, cache,
browser composition, compact radio-profile lowering, static source linkage,
and distributed Formly Contract configuration. The future
`@formly-contract/nx` plugin will use this same workspace to prove
inferred contract targets and affected execution.
