# Maintained Angular CLI Workspace Fixture

## Why this project exists

This is the repository's maintained compliance fixture for an Angular CLI
workspace in which applications and reusable form libraries have separate
ownership boundaries. It proves that distributed Formly Contract configuration
does not depend on Nx and gives maintainers a canonical, reviewable artifact
corpus for multi-project behavior.

The fixture serves three purposes:

- consumers can study how application, feature, form, and Formly integration
  libraries participate without collapsing into one contract project;
- maintainers can test distributed discovery, Node-safe entrypoints, reusable
  fragments, effects, custom interactions, and content-addressed goldens; and
- CI can detect changes to generated indexes and contracts byte-for-byte while
  also compiling the full browser composition in production mode.

This is the deepest committed golden corpus in the repository. Its forms are
synthetic, but the boundaries and interaction shapes are deliberately modeled
after the hard parts of real Angular/Formly workspaces.

## What this project proves

- A root config can discover several independently owned project descriptors.
- Configuration-only projects and source-owning projects can coexist.
- Angular library barrels can stay browser-oriented while dedicated contract
  entrypoints remain safe for the Node-based loader.
- Reusable fragments, declared effects, wrappers, and custom profiles produce
  deterministic artifacts across library boundaries.
- Generated output matches committed canonical goldens and the composed Angular
  application still builds.

It does not claim Nx integration, browser-journey coverage, arbitrary lazy-route
reachability, or compatibility beyond the pinned Angular/Formly baseline.

## Workspace structure

The fixture deliberately uses an Angular CLI workspace layout without adding Nx
as a prerequisite.

```text
apps/test-app       browser application and composition root
libs/formly-kit     base Formly module and shared type registration
libs/forms-kit      reusable fragments, forms, and custom fields
libs/feature-lib    page/view that composes and renders the reusable forms
```

See the [`libs/` guide](./libs/README.md) for the browser and contract
responsibility of each library.

The root `formly-contracts.config.ts` discovers one project descriptor at each
boundary. `test-app` and `formly-kit` are valid configuration-only projects;
`forms-kit` and `feature-lib` contribute source catalogs.

Its six definitions deliberately cover
static and dependent choices, a custom radio group, structured autocomplete,
composite date entry, table selection, conditional visibility, and an
expandable repeater. The forms are synthetic, but their library boundaries and
interaction shapes mirror the problems found during real-world testing.

## Entrypoint boundary

The fixture keeps three concerns separate:

- normal library barrels export Angular modules for the browser;
- `forms` exports framework data and factories that are safe in browser and
  trusted build graphs; and
- `contracts` exports source descriptors for the Node-based config loader.

This arrangement lets project descriptors use application path aliases without
booting Angular in Jiti, and keeps `@formly-contract/workspace` and Jiti
out of the application bundle.

## Commands

From the repository root:

```sh
pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts
pnpm --filter @formly-contract/angular-monorepo-fixture build
pnpm fixture:angular:serve
```

The focused test loads the real TypeScript configs, executes both source
catalogs, asserts the behavior matrix, and generates the fixture in a temporary
sibling workspace for a byte-for-byte comparison with `goldens/`. Golden
contract filenames use the `.contract.golden.json` suffix so they remain
reviewable repository fixtures rather than ignored runtime output. The golden
index and the `claims.intake` contract preserve the complete declared effect
DTOs, including their resolved source and target node IDs.

The [`goldens/` guide](./goldens/README.md) explains the encoded directory
layout and when those files may be updated.

The production build verifies the complete app → feature-lib → forms-kit →
formly-kit browser composition.
