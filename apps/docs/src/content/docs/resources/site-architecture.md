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

The first production vertical is
[workspace to Playwright context](../start/end-to-end.md). Other pages exist to
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

The initial scaffold intentionally omits Astro’s canonical `site` URL because a
hosting domain has not been selected. Builds therefore skip sitemap generation
until deployment configuration is added; this avoids publishing invented
canonical URLs.

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

## Future API generation

Generated API pages should land under `reference/api/` from package exports and
schema metadata during the docs build. Generated output must be reproducible,
ignored or checked according to an explicit policy, and subordinate to package
types—not a hand-maintained second contract.

## Canonical-source policy

Root `docs/`, ADRs, package entry points, and maintained fixtures remain
canonical. Site pages are navigation and integration layers. Each summarizing
page links directly to its source material and uses explicit status labels so
research cannot silently become product behavior.
