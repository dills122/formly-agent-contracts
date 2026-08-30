# Contributing

Thanks for helping make Formly Contract useful and trustworthy.

## Before You Start

- Read the [MVP specification](docs/mvp-spec.md) and
  [architecture overview](docs/architecture-overview.md).
- Search existing issues before reporting a bug.
- Never include customer, workplace, credential, or proprietary data in an
  issue, fixture, test, screenshot, or pull request.
- Discuss public contract changes before implementing them.

## Development Environment

The initial baseline is Node.js 22.22.1 and pnpm 10.23.0. Install the pinned
workspace and run its complete local gate with:

```sh
pnpm install --frozen-lockfile
pnpm check
```

For a smaller documentation-only change, run `pnpm check:docs`. Every pull
request is expected to pass the relevant focused check and the complete gate.

The product documentation site is an Astro Starlight app under `apps/docs/`.
Start it with `pnpm docs:dev`, inspect the production build with
`pnpm docs:preview`, and use `pnpm check:docs` to run repository Markdown checks
plus the static site build. Existing root docs and ADRs remain canonical; site
pages should link to them and label planned behavior explicitly.

The Pages deployment runs only after relevant changes reach `main`; pull
requests validate the same build through `pnpm check`. See
[`apps/docs/README.md`](apps/docs/README.md) for the production URL, subpath
configuration, manual workflow, and custom-domain overrides.

## Choose the Owning Area

| Change | Primary location |
| --- | --- |
| Portable DTO, parser, canonicalization, hashing, diagnostic, profile, effect, or query contract | [`packages/schema`](packages/schema/README.md) |
| Formly projection or controlled scenario behavior | [`packages/compiler`](packages/compiler/README.md) |
| Configuration, discovery, generation, source usage, indexes, or CLI behavior | [`packages/workspace`](packages/workspace/README.md) |
| Trusted-local driver implementation binding experiment | [`packages/playwright`](packages/playwright/README.md) |
| Consumer-shaped regression coverage | [`fixtures/`](fixtures/README.md) or [`apps/formly-test-app`](apps/formly-test-app/README.md) |
| User-facing site content | `apps/docs/src/content/docs/` |
| Canonical specifications, ADRs, or engineering evidence | [`docs/`](docs/README.md) |

Keep ownership boundaries intact. When a change crosses them, update shared
contracts first and avoid importing another package's `src/` files directly.
The group and package READMEs explain local entry points, focused checks, and
intentional limitations.

## Making a Change

1. Create a focused branch from `main`.
2. Add or update a focused test for behavior changes.
3. Keep the change within one package or vertical slice where possible.
4. Update contracts and documentation in the same pull request when behavior,
   setup, commands, or public data changes.
5. Record verification evidence in the pull request description.

Use synthetic data in every public fixture and example. If a support claim
depends on a workspace shape, add it to the smallest maintained fixture that
proves that shape and update its README when the purpose or coverage changes.

Opaque Formly behavior must become an explicit diagnostic. Do not infer,
evaluate, or silently omit functions, Observables, hooks, or remote values.

## Pull Requests

Pull requests should be small enough to review in one sitting. Complete the
provided template, link any relevant issue, and call out:

- public contract changes;
- compatibility assumptions;
- known unknowns or unsupported behavior; and
- the exact commands used for verification.

By contributing, you agree that your contribution is licensed under the
repository's [MIT License](LICENSE).
