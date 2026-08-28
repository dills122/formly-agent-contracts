---
title: Installation
description: Install and verify Formly Contract as build-time tooling beside an Angular application.
---

Formly Contract is build/test tooling. Do not add it to the Angular browser
bundle.

## Supported baseline

- Node.js `>=22.13.0 <23`; repository reference `22.22.1`
- pnpm `10.23.0`
- Angular 20 or newer
- Formly 6.x

The compatibility suite is pinned to Angular `20.3.29` and Formly `6.1.8`.

## Link the packages before the first release

The packages are not published to npm yet. Clone this repository beside the
consumer and build the three public tooling packages:

```sh
git clone https://github.com/dills122/formly-contract.git
cd formly-contract
pnpm install --frozen-lockfile
pnpm --filter @formly-contract/schema build
pnpm --filter @formly-contract/compiler build
pnpm --filter @formly-contract/workspace build
```

In the consuming repository, add sibling links with paths adjusted for your
layout:

```json
{
  "devDependencies": {
    "@formly-contract/schema": "link:../formly-contract/packages/schema",
    "@formly-contract/compiler": "link:../formly-contract/packages/compiler",
    "@formly-contract/workspace": "link:../formly-contract/packages/workspace"
  }
}
```

Install through the consumer’s normal pnpm workflow, then verify the binary:

```sh
pnpm install
pnpm exec formly-contracts --help
```

A successful check begins with
`Usage: formly-contracts <command> [options]`.

:::caution[Keep Node-only discovery out of browser barrels]
Config loading evaluates imports. Export form factories and source descriptors
from a Node-safe secondary entry point such as `@work/forms-kit/contracts`.
Do not re-export workspace tooling from an Angular module barrel.
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
