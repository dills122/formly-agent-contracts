# Formly Contract documentation site

This package is the Astro Starlight site published at
<https://dills122.github.io/formly-contract/>.

## Local development

Run commands from the repository root so the pinned Node and pnpm workspace
configuration remain in effect:

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

Use `pnpm check:docs` for Markdown validation plus a production build, and
`pnpm docs:preview` to inspect the generated static files.

The site is the concise user-facing layer. Canonical specifications, ADRs,
research, and planning have distinct roles under `docs/`; read the root
[`docs/` guide](../../docs/README.md) before moving or duplicating content.

## GitHub Pages deployment

`.github/workflows/docs-site.yml` deploys `apps/docs/dist` after a push to
`main` that changes the docs app or its build inputs. The workflow can also be
run manually. It uses the `github-pages` environment and GitHub's official
artifact deployment actions; it does not write generated files to a branch.

The standard project-site configuration is derived from GitHub context:

```text
DOCS_SITE_URL=https://<repository-owner>.github.io
DOCS_SITE_BASE=/<repository-name>
DOCS_SITE_REPOSITORY=<repository-owner>/<repository-name>
DOCS_SITE_EDIT_BRANCH=<default-branch>
```

Repository-level Actions variables named `DOCS_SITE_URL` and `DOCS_SITE_BASE`
override the defaults for a custom domain or nonstandard Pages path. The
repository and edit-branch variables can also be supplied during a local build
or in another CI host. For a custom domain, set `DOCS_SITE_URL` to its full
origin and `DOCS_SITE_BASE` to `/`.

To reproduce the Pages build locally:

```sh
DOCS_SITE_URL=https://dills122.github.io \
DOCS_SITE_BASE=/formly-contract \
DOCS_SITE_REPOSITORY=dills122/formly-contract \
DOCS_SITE_EDIT_BRANCH=main \
pnpm docs:build
```

The build emits canonical URLs, a sitemap, base-prefixed assets, and the local
Pagefind search index. The theme uses system font stacks and makes no external
font request. Generated `.astro/` and `dist/` directories stay out of Git.
