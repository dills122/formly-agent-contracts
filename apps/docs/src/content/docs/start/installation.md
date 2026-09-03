---
title: Installation
description: Install and verify Formly Contract as build-time tooling beside an Angular application.
---

The compiler and workspace packages are Node-side build/test tooling and must
not enter the Angular browser bundle. The schema package has one explicit
browser-safe entry point, `@formly-contract/schema/field-type-authoring`, for
production custom-field registration.

## Supported baseline

- Node.js `>=22.13.0 <23`; repository reference `22.22.1`
- pnpm `10.23.0`
- Angular 20 or newer
- Formly 6.x

The compatibility suite is pinned to Angular `20.3.29` and Formly `6.1.8`.

## Evaluate the GitHub pilot release candidate

Before npm publication, download every asset from the newest
[`pilot-rc.*` GitHub prerelease](https://github.com/dills122/formly-contract/releases).
Keep the four package tarballs, `formly-contract-pilot.json`, and
`formly-contract-pilot.pnpmfile.cjs` in one directory. The manifest records
each package SHA-256, the pnpm-hook SHA-256, exact pnpm version, and install
arguments verified by the release candidate's temporary consumer smoke test.

The pilot RC is installable evaluation evidence, not an npm publication or a
stable compatibility promise. Third-party Angular, Formly, TypeScript, and
pnpm dependencies still come from the consumer's registry or package cache.

## Link the packages before npm publication

The packages are prepared for public npm release but may still need to be
linked before the npm bootstrap completes. Clone this repository beside the
consumer and build the four publishable packages:

```sh
git clone https://github.com/dills122/formly-contract.git
cd formly-contract
pnpm install --frozen-lockfile
pnpm --filter @formly-contract/schema build
pnpm --filter @formly-contract/compiler build
pnpm --filter @formly-contract/workspace build
pnpm --filter @formly-contract/angular build
```

In the consuming repository, add sibling links with paths adjusted for your
layout:

```json
{
  "dependencies": {
    "@formly-contract/schema": "link:../formly-contract/packages/schema"
  },
  "devDependencies": {
    "@formly-contract/compiler": "link:../formly-contract/packages/compiler",
    "@formly-contract/workspace": "link:../formly-contract/packages/workspace",
    "@formly-contract/angular": "link:../formly-contract/packages/angular"
  }
}
```

Keep schema in regular `dependencies` when production Angular code imports its
field-type-authoring subpath. If schema is used only from Node tooling, it may
remain dev-only. The schema root is Node-oriented; browser code must import the
dedicated subpath.

Install through the consumer’s normal pnpm workflow, then verify the binary:

```sh
pnpm install
pnpm exec formly-contracts --help
```

A successful check begins with
`Usage: formly-contracts <command> [options]`.

## Pack a portable workplace pilot bundle

When a sibling checkout is not available on the consuming machine, build and
retain the required pilot tarballs plus a checksum/install manifest:

```sh
pnpm pilot:pack
```

Copy `artifacts/pilot/` to the consumer, then run the `pnpm` command described
by `formly-contract-pilot.json`. The pilot remains a retained evaluation
handoff even though workspace and Angular are now on the public release path.
The manifest contains schema, compiler, workspace, and Angular and is checked
in a temporary consumer predeclared with the compatibility suite's pinned
Angular `20.3.29` and Formly `6.1.8` runtime stack. The check installs the exact
manifest arguments, imports `@formly-contract/angular/jit`, and runs
`formly-contracts-angular --help`. Its checksummed pnpm hook redirects only
dependencies among those four unpublished packages to bundled tarballs;
inspect and retain that file beside the tarballs when copying the bundle.
Third-party Angular, Formly, TypeScript, and pnpm dependencies still require the
consumer's normal registry or package cache; this is not an offline dependency
bundle.

:::caution[Keep Node-only discovery out of browser barrels]
Config loading evaluates the complete runtime import graph. Give a reusable
forms library separate browser, pure-factory, and contracts entry points:

```text
@work/forms-kit            Angular modules and components
@work/forms-kit/forms      reusable pure form factories
@work/forms-kit/contracts  Node-safe descriptors and profile data
```

Project configs import only `/contracts`; browser code never imports it. See
[Node-safe Angular libraries](../reference/node-safe-angular-libraries.md) for
the complete layout, configuration, verification, and temporary-shim pattern.
:::

## Repository contributors

Run the documentation site from this monorepo with:

```sh
pnpm docs:dev
```

Build the static site and validate its internal routes with:

```sh
pnpm check:docs
```

Generated Astro output stays under `apps/docs/dist/` and is ignored by Git.

:::note[Canonical source]
See the [workplace pilot installation](https://github.com/dills122/formly-contract/blob/main/docs/workplace-pilot.md#1-prepare-the-formly-contract-checkout)
for the maintained evaluation workflow and privacy boundary.
:::
