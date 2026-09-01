---
title: Maintained examples
description: Choose a single-project, Angular CLI workspace, or Nx fixture and understand exactly what each proves.
---

The repository maintains three executable Angular examples as a compliance
suite. Each uses the same public configuration, source, schema, compiler, and
workspace APIs that a consumer uses.

:::tip[Start with one form, not the fixture matrix]
The [end-to-end walkthrough](../start/end-to-end.md) follows one maintained
Formly fragment through its source, project, workspace, generated index, and
contract anatomy. Return here when you need to choose a repository layout.
:::

| Example                                                                                                        | Layout                                                                | Forms | Primary evidence                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/formly-test-app`](https://github.com/dills122/formly-contract/tree/main/apps/formly-test-app)           | One Angular CLI application and one contract project                  |    12 | broad Formly authoring corpus, browser rendering, declared generation, reviewed custom interactions, explicit opaque diagnostics                                                                  |
| [`fixtures/angular-monorepo`](https://github.com/dills122/formly-contract/tree/main/fixtures/angular-monorepo) | Angular CLI `apps/` and `libs/` workspace with four contract projects |     6 | distributed discovery, reusable fragments, custom profiles, wrappers, cross-field effects, canonical goldens                                                                                      |
| [`fixtures/nx-workspace`](https://github.com/dills122/formly-contract/tree/main/fixtures/nx-workspace)         | Integrated Nx workspace with four projects                            |    12 | regulated microgrid workflow, seventeen cases, two sanitized factory-input forms, six custom profiles, effects, diagnostics, source-usage indexing, deterministic artifacts, Nx graph/build/cache |

Run their contract-level acceptance tests together:

```sh
pnpm test:examples
```

The repository-wide `pnpm build` also AOT-builds the single application and
both workspace applications. Unit tests and builds are complementary: a
successful Angular build proves browser composition and templates, while the
fixture tests prove deterministic contract inventory and semantics.

These examples are nested packages in the Formly Contract development
workspace, so their tests inject pinned runtime provenance. A copied standalone
consumer instead generates from its own workspace root and lockfile with the
normal `formly-contracts generate` and `formly-contracts check` commands.

## Single project

Start with the single-project example when an Angular repository has one
application and no independently owned form libraries. Its config discovers
one adjacent project descriptor:

```ts
export default defineConfig({
  projectConfigs: ["formly-contracts.project.ts"],
  tsconfigPath: "tsconfig.json",
  output: { directory: "dist/formly-contracts" },
  diagnostics: { failOn: ["error"] },
});
```

The project descriptor can still expose several sources. Source boundaries are
semantic ownership boundaries; they do not require separate build projects.
The maintained example uses applicant, operations, and edge-case sources so a
consumer can see how a larger single app stays organized.

## Multi-project Angular CLI workspace

Use the Angular monorepo fixture when forms or custom fields live in reusable
libraries. Its source-owning projects share one reviewed field-profile registry
and the feature project adds declared cross-field effects. Configuration-only
app and base libraries demonstrate that a discovered project need not own a
form source.

This is the deepest canonical artifact corpus. Its committed goldens make
schema, hashing, effects, diagnostics, and content-addressed paths reviewable in
pull requests.

## Nx workspace

Use the Nx fixture when project graph ownership, task caching, source-usage
linkage, or a complex regulated workflow matters. Its synthetic microgrid
deployment corpus spans reusable organization/contact forms plus project
intake, site assessment, system design, funding, permitting, and
commissioning. The later lifecycle also covers stakeholder governance and
ongoing operations.

Its acceptance test links a direct application call to the exact generated
contract and then reaches the same candidate through both source-path and form
ID queries. It also verifies seventeen named cases, six reviewed custom types,
three cross-field effects, two sanitized typed-input authoring cases, deliberate
async/opaque diagnostics, nested repeaters, object-valued options, and
byte-identical repeated generation.

## Reading support claims

Examples are executable evidence for the exact pinned Angular `20.3.29` and
Formly `6.1.8` baseline. They do not imply that arbitrary callbacks are
executed, every custom component is understood, routes are reachable, or every
Angular/Formly version pair has been tested. Expected diagnostics in the
single-project and workspace corpora are part of the support contract: unknown
behavior must stay visible.

When adding a supported shape, update the smallest relevant fixture and its
focused assertion. Add it to more than one example only when the support claim
depends on both layouts.
