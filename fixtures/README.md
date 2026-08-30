# Fixture Guide

The `fixtures/` directory contains synthetic inputs and consumer-shaped
workspaces used to prove Formly Contract behavior. Fixtures are executable test
assets, not production packages and never a place for customer or workplace
data.

## Maintained consumer examples

| Fixture | Use it to understand or test |
| --- | --- |
| [`angular-monorepo`](./angular-monorepo/README.md) | distributed Angular CLI ownership, reusable libraries, profiles, effects, and committed contract goldens |
| [`nx-workspace`](./nx-workspace/README.md) | a complex four-project Nx graph, source-usage linkage, custom interactions, effects, deterministic generation, and task caching |

The standalone companion lives at
[`apps/formly-test-app`](../apps/formly-test-app/README.md). Run all three
contract acceptance suites with:

```sh
pnpm test:examples
```

## Low-level test fixtures

| Fixture | Purpose |
| --- | --- |
| [`synthetic-form`](./synthetic-form/README.md) | one stable Formly field tree shared by the demo and compiler compatibility checks |
| [`workspace-config-loader`](./workspace-config-loader/README.md) | valid and deliberately invalid ESM, CommonJS, and TypeScript modules for config-loader tests |

Low-level fixtures are intentionally narrow and should not be copied as
consumer workspace layouts.

## Contributor expectations

- Use only invented labels, identifiers, cases, and values.
- Update focused assertions whenever a fixture adds a supported or deliberately
  unsupported shape.
- Update committed goldens only when the contract change is intentional and
  reviewed.
- Keep browser-only imports out of Node-loaded contract entrypoints.
- Run `pnpm test:examples` and the affected production build for consumer
  fixture changes; run `pnpm check` before final handoff when practical.
