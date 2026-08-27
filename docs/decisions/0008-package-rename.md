# ADR 0008: Rename Published Packages to a Consistent `@formly-contract` Family

- Status: Accepted
- Date: 2026-08-26

## Context

`@formly-contract` is the project's real npm scope — confirmed directly by
the maintainer, not inferred. Before this change the workspace's package
names did not consistently reflect it:

- `packages/contract-schema` published as `@formly-contract/contract-schema`
  and `packages/formly-adapter` published as `@formly-contract/formly-adapter`.
  Both restated a scope word (`contract`, `formly`) inside the package name,
  which reads as stutter once the scope already names the ecosystem.
- `packages/workspace` published as `@formly-agent-contracts/workspace` — a
  different scope entirely, left over from an earlier working name.

None of these packages had been published to npm yet (GitHub-only), so every
name was still free to change without a deprecation cycle.

Research into how other scoped npm families handle this
([docs/research/scoped-package-publishing.md](../research/scoped-package-publishing.md))
found a consistent convention worth adopting: a package name should be a bare
noun for what it targets or wraps, and should never restate a word already
carried by the scope. Remix's `@remix-run/react`, `@remix-run/node`, and
`@remix-run/cloudflare` are the clearest example — the platform name only,
never "remix" repeated inside.

## Decision

Rename the published package family to:

| Old | New |
|---|---|
| `packages/contract-schema` (`@formly-contract/contract-schema`) | `packages/schema` (`@formly-contract/schema`) |
| `packages/formly-adapter` (`@formly-contract/formly-adapter`) | `packages/compiler` (`@formly-contract/compiler`) |
| `packages/workspace` (`@formly-agent-contracts/workspace`) | `packages/workspace` (`@formly-contract/workspace`) |

`schema` is the DTO/validation/canonical-JSON/hashing layer. `compiler` is
the Formly-specific extraction and trusted scenario compilation engine —
matching the term architecture-overview.md already uses for this concept
("the contract compiler"). `compiler` was chosen over the scope's own
framework-naming convention (`angular`, `nx` are named after the tool they
integrate) specifically because this package is the project's central engine,
not a peripheral framework integration, and "the Formly integration" undersells
what it does.

The same convention extends to the rest of the planned family (not yet built,
recorded here for continuity with [ADR 0007](0007-distributed-workspace-discovery.md)):

- `@formly-contract/angular` — unchanged, already fit the convention.
- `@formly-contract/nx` — unchanged, already fit the convention.
- `@formly-contract/mcp` — planned name for the future MCP resources/tools
  package (architecture-overview.md §7).
- `@formly-contract/playwright` — planned name for the future typed E2E
  intent + Playwright compiler/driver package (architecture-overview.md §8).
  Intent schema types fold into `@formly-contract/schema` rather than
  spinning up a separate `test-intent` package.

## Consequences

- Fixture packages under `@formly-agent-contracts/*` (private, never
  published — `fixtures/nx-workspace`, `fixtures/angular-monorepo`,
  `fixtures/workspace-config-loader`) were renamed to `@formly-contract/*` in
  the same change for scope consistency, even though their npm scope has no
  functional effect while they stay private.
- ADR 0007 and decisions 0001/0003 still describe the pre-rename names
  (`contract-schema`, `formly-adapter`, `@formly-agent-contracts/workspace`)
  as written at the time. They are left as the historical record of what was
  decided when; this ADR is the pointer from those old names to the current
  ones. Do not edit them to match current names.
- `docs/releasing.md`, `docs/mvp-spec.md`, `README.md`, and other living
  reference docs were updated in the same change to describe the current
  names, since they document present-tense system structure rather than a
  point-in-time decision.
- `scripts/release-manifest.mjs` and `scripts/pack-release.mjs` were
  generalized to derive the published package set from each `packages/*`
  manifest's `private` flag instead of a hardcoded two-package array, so a
  future package rename or addition needs no further script edit.

## Alternatives rejected

### Keep `contract-schema` / `formly-adapter`, only fix the workspace scope

Cheapest change, but leaves the stutter in the two most-used package names
indefinitely once real consumers exist. Nothing was published yet, so this
was the last point at which fixing it was free.

### Rename `packages/contract-schema` to `core`

Considered first (matches a common `@scope/core` convention), rejected:
`contract-schema` is exactly what the package is — DTOs, validation, hashing
— not the workspace's most fundamental or highest-traffic logic. That is
arguably `compiler`. Calling the schema package `core` would misdescribe it
and invite the generic-junk-drawer problem `core` packages tend to become
across ecosystems as more packages are added.
