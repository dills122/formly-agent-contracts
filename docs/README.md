# Documentation Guide

The `docs/` directory holds canonical architecture, specification, process, and
engineering evidence. It is intentionally broader and more detailed than the
hosted documentation site.

## Choose the right starting point

| Reader or task | Start here |
| --- | --- |
| Evaluating the product | [Hosted documentation](https://dills122.github.io/formly-contract/) and the [product status page](../apps/docs/src/content/docs/start/product-status.md) |
| Integrating a repository | [Workplace pilot](./workplace-pilot.md), then [workspace configuration](./workspace-configuration.md) |
| Understanding architecture | [Architecture overview](./architecture-overview.md) and accepted [decisions](./decisions/) |
| Contributing code | Root [`CONTRIBUTING.md`](../CONTRIBUTING.md), then the owning package README under [`packages/`](../packages/README.md) |
| Maintaining the docs site | [`apps/docs/README.md`](../apps/docs/README.md) and the [docs contributor guide](../apps/docs/src/content/docs/resources/contributing.md) |

## Directory and document roles

| Location | Meaning |
| --- | --- |
| top-level specifications | canonical current or versioned contract definitions |
| `decisions/` | accepted architecture decisions and ownership boundaries |
| `research/` | retained investigation and evidence; not automatically shipped behavior |
| `planning/` | delivery sequencing and proposed gates; not a user capability claim |
| `work/` | implementation handoffs and historical working context |
| `apps/docs/src/content/docs/` | concise user-facing orientation and reference site |

Research, planning, and handoff documents are valuable engineering records, but
their presence does not mean a feature is available. Check the
[product status page](../apps/docs/src/content/docs/start/product-status.md) and
package entry points before describing behavior as shipped.

## Contributor rules

- Update the canonical specification or ADR when a public contract or ownership
  boundary changes.
- Update the user-facing site page in the same change when setup, commands,
  package responsibilities, or supported behavior changes.
- Link to canonical material instead of duplicating long specifications into
  the site.
- Keep customer, workplace, credential, and proprietary data out of every
  document and example.
- Use explicit language for current, experimental, and planned capability.

Validate documentation changes from the repository root:

```sh
pnpm check:docs
```
