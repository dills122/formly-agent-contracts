# Package Guide

The `packages/` directory contains the reusable Formly Contract implementation.
Each package owns one architectural boundary; application code and fixtures
should use these public entry points instead of importing another package's
internal files.

## Choose the right package

| Package | Use it for | Do not use it for |
| --- | --- | --- |
| [`@formly-contract/schema`](./schema/README.md) | portable DTOs, strict parsers, canonical JSON, hashing, diagnostics, profiles, effects, and query data | loading Angular/Formly application code |
| [`@formly-contract/compiler`](./compiler/README.md) | projecting trusted Formly field configuration into a validated contract | repository discovery or artifact publication |
| [`@formly-contract/workspace`](./workspace/README.md) | config loading, project/source discovery, generation, checking, indexes, source usage, and the `formly-contracts` CLI | defining a second contract model or browser automation |
| [`@formly-contract/playwright`](./playwright/README.md) | the current private experiment for binding validated driver identities to trusted-local implementations | launching browsers, generating Playwright tests, or claiming shipped E2E execution |

The main dependency direction is:

```text
workspace -> compiler -> schema
playwright -----------> schema
```

`schema` stays portable. `compiler` may understand Formly. `workspace` may load
trusted repository configuration and publish artifacts. The private
`playwright` experiment consumes schema-owned identities but must not become a
second discovery or configuration system.

## For contributors

When a change spans packages, update the shared schema contract first, then the
compiler projection, then workspace orchestration. Add focused tests beside the
owning source and update the package README when an entry point, responsibility,
or support boundary changes.

Run the package builds with:

```sh
pnpm build:demo
```

Run the complete repository gate with `pnpm check`. See the root
[`CONTRIBUTING.md`](../CONTRIBUTING.md) for branch, testing, privacy, and pull
request expectations.
