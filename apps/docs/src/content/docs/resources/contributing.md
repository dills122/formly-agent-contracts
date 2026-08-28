---
title: Contributing to docs
description: Run, edit, validate, and review the Astro Starlight documentation site.
---

The docs app is `@formly-contract/docs` under `apps/docs/`. It uses Astro
Starlight and builds to static files.

## Local workflow

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

Before handoff:

```sh
pnpm check:docs
```

That command checks Markdown links and trailing whitespace across the repository
and then performs a production Astro build. The Starlight build also creates
the Pagefind search index and fails on invalid content routes.

Use `pnpm docs:preview` to inspect the production output locally.

## Deployment workflow

The [Docs Site workflow](https://github.com/dills122/formly-contract/actions/workflows/docs-site.yml)
publishes the static build to
[GitHub Pages](https://dills122.github.io/formly-contract/) after relevant
changes reach `main`. It uses GitHub's `github-pages` environment and artifact
deployment rather than committing generated output to a branch.

The production build receives its canonical origin, repository subpath, edit
repository, and default branch from GitHub context. Maintainers can run the
workflow manually from the Actions page. See the
[docs app README](https://github.com/dills122/formly-contract/blob/main/apps/docs/README.md)
for local reproduction and custom-domain overrides.

## Where content belongs

- `src/content/docs/start/` — evaluation, installation, adoption, status
- `src/content/docs/concepts/` — stable mental models and boundaries
- `src/content/docs/reference/` — current package, config, CLI, and artifact
  surfaces
- `src/content/docs/resources/` — troubleshooting, roadmap navigation, and
  contributor guidance
- `tokens.css` and `src/styles/custom.css` — the site design system and
  Starlight theme overrides

Add a sidebar entry in `astro.config.mjs` for every navigable page.

## Source-of-truth rule

Existing root docs and ADRs remain canonical. A site page may:

- orient a newcomer;
- assemble a workflow across several canonical sources;
- link to maintained fixture or package code; and
- clearly label current, consumer-owned, or planned capability.

Do not paste an entire specification into the site or silently restate future
research as shipped behavior. Add a “Canonical source” aside on pages that
summarize a contract. If behavior changes, update the canonical doc and the
site’s orientation page in the same change.

## Review checklist

- Commands and package names exist on the current branch.
- Examples parse generated JSON before trusting it.
- Planned capabilities are visually and verbally labelled.
- No customer or workplace data appears in examples or screenshots.
- Links resolve and `pnpm check:docs` passes.
- Root-relative links do not bypass the configured GitHub Pages base path.
- The page remains usable at 320, 375, 414, and 768 CSS pixels.

:::note[Repository contribution policy]
Read the root [CONTRIBUTING.md](https://github.com/dills122/formly-contract/blob/main/CONTRIBUTING.md)
for branch, test, privacy, and pull-request requirements.
:::
