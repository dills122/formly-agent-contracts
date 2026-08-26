# ADR 0009: Adopt Changesets for Independent Per-Package Versioning

- Status: Accepted
- Date: 2026-08-26

## Context

Before this change, every published package moved in lockstep: one pushed
`vX.Y.Z` Git tag had to exactly equal every published package's version, and
[scripts/release-manifest.mjs](../../scripts/release-manifest.mjs) hard-failed
if any two published packages disagreed. This was documented as a deliberate,
temporary simplification in
[the scoped-package-publishing research spike](../research/scoped-package-publishing.md),
which recommended [Changesets](https://github.com/changesets/changesets) as
the versioning/changelog layer once independent versions were actually
needed — and versions had already begun diverging organically
(`@formly-contract/workspace` sat at `0.1.0` while the published packages were
at `0.4.0`).

Lockstep versioning does not scale cleanly as more `@formly-contract/*`
packages join: it forces every package to release together even when only one
changed, and it gives no per-package changelog.

Adopting independent versioning breaks an assumption the release tooling
relied on: a single tag can no longer mean "this version, for every package."
Something has to decide how a release is still triggered and published.

## Decision

1. Add `@changesets/cli` and configure `.changeset/config.json` for fully
   independent versioning (no `fixed`/`linked` groups). Changesets already
   skips any workspace package with `private: true`, so it automatically
   tracks exactly the same publishable set as
   [scripts/release-manifest.mjs](../../scripts/release-manifest.mjs) without
   a separate ignore list.
2. Add [.github/workflows/changesets.yml](../../.github/workflows/changesets.yml),
   triggered on push to `main`, running `changesets/action` with no
   `publish-script` configured. It only ever opens or updates a
   "Version Packages" pull request that bumps affected packages' versions and
   writes their changelogs. **It never publishes.**
3. Keep the existing tag-triggered
   [.github/workflows/release.yml](../../.github/workflows/release.yml) as the
   only path that ever runs `npm publish`, unchanged in its trust model:
   pushing a tag matching the protected `v*` pattern is still the only way to
   trigger a release, and only release maintainers can push that tag.
4. Redefine what the tag means: it is now a release **trigger**, not a
   **version**. `scripts/release-manifest.mjs` no longer takes or validates a
   `--tag` argument, no longer requires synchronized versions across
   packages, and returns a plain list of publishable packages and their
   (independent) versions. `scripts/publish-release.mjs` no longer takes a
   `--tag` argument either — each tarball's own version decides its npm
   dist-tag via the existing `npmTagForVersion` helper.
5. A release run therefore publishes whichever `packages/*` packages have a
   version not yet on npm and safely skips the rest, using the integrity-match
   skip logic `publish-release.mjs` already had (originally built for
   bootstrap-retry safety, and equally correct here).
6. One GitHub release is still created per triggering tag, bundling whatever
   tarballs were built. It no longer carries a `--prerelease` flag tied to a
   single release-wide version, since "the release" may now contain a mix of
   stable and prerelease packages; prerelease-ness is expressed at the npm
   dist-tag level per package instead.

### Alternative trigger model considered and rejected (for now)

`changesets/action` also supports a "publish on merge" mode: configuring its
`publish-script` input runs the actual publish immediately when the Version
Packages PR is merged, with no separate tag step. This is the more common
Changesets setup and removes a manual step, but it replaces the tag-push gate
with "anyone who can merge to `main`" as the release trigger — a real change
to who/what can cause an npm publish, not just a mechanical one. Rejected for
now to keep the existing protected-tag-ruleset trust model intact; revisit
once the tag-push step proves to be pure friction rather than a deliberate
gate.

## Consequences

- Contributors must remember to run `pnpm changeset` for any PR that changes
  a released package; nothing currently enforces this in CI (no
  `changeset status` check on PRs yet — left as a follow-up, matching the open
  question already recorded in the research spike).
- A release tag's content is now arbitrary (any value matching `v*`); it is
  no longer meaningful to ask "what version does this tag correspond to." Tag
  names should stay simple and monotonic (`v1`, `v2`, ...) purely for human
  readability of the trigger history, not as a version record — the npm
  registry and each package's `CHANGELOG.md` are the version record.
- `docs/releasing.md` was rewritten to describe the new flow end to end.
- This closes the two open questions left in
  [the research spike](../research/scoped-package-publishing.md#other-open-questions):
  every package versions independently (no fixed/linked groups needed yet),
  and a `changeset status` PR check remains an explicit, not-yet-adopted
  follow-up rather than a silent gap.

## Alternatives rejected

See the research spike for the full comparison (Nx release, Lerna,
semantic-release, Rush, staying hand-rolled). Changesets was chosen there
specifically for being native to pnpm workspaces, requiring no new build
orchestrator, and working unmodified with the existing npm trusted-publishing
(OIDC) setup.
