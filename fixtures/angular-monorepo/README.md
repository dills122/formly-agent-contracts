# Angular Monorepo Consumer Fixture

This fixture is the consumer-shaped playground for workspace discovery and
future Angular/Formly integration work. It deliberately uses an Angular CLI
workspace layout without adding Nx as a prerequisite.

```text
apps/test-app       browser application and composition root
libs/formly-kit     base Formly module and shared type registration
libs/forms-kit      reusable fragments, forms, and custom fields
libs/feature-lib    page/view that composes and renders the reusable forms
```

The root `formly-contracts.config.ts` discovers one project descriptor at each
boundary. `test-app` and `formly-kit` are valid configuration-only projects;
`forms-kit` and `feature-lib` contribute source catalogs.

This is the deep behavior corpus. Its six definitions deliberately cover
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
catalogs, and asserts the behavior matrix. The production build verifies the complete
app → feature-lib → forms-kit → formly-kit browser composition.
