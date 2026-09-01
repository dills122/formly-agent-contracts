---
title: Site architecture
description: The documentation information architecture, Astro Starlight decision, canonical-source policy, and future growth path.
---

## Information architecture

The site follows the reader’s decision sequence:

1. **Start** — evaluate the project, install it, complete one integration, and
   understand current versus planned capability.
2. **Concepts** — learn the evidence model, trust boundary, and package flow.
3. **Reference** — look up packages, workspace configuration, sources, custom
   fields, artifacts, CLI, and APIs.
4. **Resources** — troubleshoot, navigate research, and contribute.

The primary learning vertical is
[one maintained Formly form from source to contract](../start/end-to-end.md).
It leads with the rendered form, then reveals workspace wiring, repeatable
generation, contract anatomy, and the current execution boundary. Other pages
support that path rather than simulate a complete API encyclopedia.

## Framework decision: Astro Starlight

Astro Starlight is the selected framework.

- Starlight is a docs-specific Astro integration with Markdown content,
  structured sidebars, accessible navigation, light/dark themes, and code
  presentation.
- Its default search is static, low-bandwidth Pagefind and needs no hosted
  search service. See the official [site search guide](https://starlight.astro.build/guides/site-search/).
- Markdown pages support frontmatter, heading anchors, asides, and Expressive
  Code blocks. See [authoring content](https://starlight.astro.build/guides/authoring-content/).
- Astro’s content collections provide a typed route/content foundation for
  future generated reference pages. See the official
  [content collections guide](https://docs.astro.build/en/guides/content-collections/).
- Astro emits static assets that can be hosted on GitHub Pages, Netlify,
  Cloudflare Pages, or any ordinary static web server.

## Hosting model

The site is deployed as a GitHub Pages project site at
[dills122.github.io/formly-contract](https://dills122.github.io/formly-contract/).
The Pages workflow supplies Astro with the canonical origin and repository base
path, builds the pnpm workspace with its pinned Node version, uploads
`apps/docs/dist` as an artifact, and deploys through the protected
`github-pages` environment.

Local builds omit `site` and `base`, so development stays at `/`. CI derives
the standard values from GitHub context and accepts `DOCS_SITE_URL` and
`DOCS_SITE_BASE` repository variables for a future custom domain. Internal
links are relative or Starlight-managed so both hosting modes remain valid.

This fits the pnpm TypeScript monorepo, follows the project owner’s Astro
preference, and leaves product packages independent of the docs runtime.

## Alternatives considered

**Docusaurus** has the strongest built-in multi-version documentation workflow.
Its own [versioning guide](https://docusaurus.io/docs/versioning) also warns that
versioning duplicates content, increases build time, and complicates
contributions. The project is pre-release and does not need snapshot copies yet;
adding a React site and version lifecycle now would be premature.

**VitePress** is a lean static Markdown option with local search, Shiki, and
strong navigation. It would fit technically, but Starlight provides the desired
Astro foundation and a more docs-specific starter without custom-building the
content collection.

## Versioning policy

The site documents the current default branch until a public compatibility
promise requires retained release docs. At that point, create version-prefixed
content collections or publish immutable site builds from release tags. Do not
copy today’s pages into `v0` directories before the first release.

## API reference policy

The current [public API reference](../reference/api.md) is a curated map from
supported use cases to package entry points. It is intentionally smaller than
the generated TypeScript declarations, which remain exhaustive.

If declaration-driven pages are added later, they should land under
`reference/api/`, be reproducible, and stay subordinate to package exports and
types—not become a second contract. Generated detail should augment the curated
entry-point map rather than replace the user journey.

## Canonical-source policy

Root `docs/`, ADRs, package entry points, and maintained fixtures remain
canonical. Site pages are navigation and integration layers. Each summarizing
page links directly to its source material and uses explicit status labels so
research cannot silently become product behavior.
