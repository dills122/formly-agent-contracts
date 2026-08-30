# Applications

The `apps/` directory contains runnable repository applications. These are not
published libraries; each exists to demonstrate, validate, or document the
packages under [`packages/`](../packages/README.md).

| Application | Purpose | Start here |
| --- | --- | --- |
| [`demo-cli`](./demo-cli/README.md) | prints one deterministic synthetic contract and protects the smallest compiler vertical | `pnpm demo` |
| [`formly-test-app`](./formly-test-app/README.md) | maintained single-project Angular example and twelve-form browser-rendered compliance corpus | `pnpm app:serve` |
| [`docs`](./docs/README.md) | Astro Starlight documentation site published through GitHub Pages | `pnpm docs:dev` |

The consumer-facing `formly-contracts` CLI is not implemented in `apps/`.
It belongs to [`packages/workspace`](../packages/workspace/README.md); the demo
CLI is intentionally fixed to one golden form.

For repository-wide commands and contribution expectations, return to the
[root README](../README.md) and [`CONTRIBUTING.md`](../CONTRIBUTING.md).
