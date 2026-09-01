# Changesets

This directory manages release versioning and changelogs for every
non-private package under `packages/` (currently `@formly-contract/schema`,
`@formly-contract/compiler`, `@formly-contract/workspace`, and
`@formly-contract/angular`; private packages are skipped automatically).

## Adding a changeset

Any PR that changes a released package's behavior needs a changeset:

```sh
pnpm changeset
```

Pick the affected package(s) and a bump type (patch/minor/major), then write
a short changelog entry. Commit the generated `.changeset/*.md` file with the
rest of the PR. Versions are independent per package — bumping
`@formly-contract/compiler` does not require bumping `@formly-contract/schema`
unless `updateInternalDependencies` needs to patch-bump it for a
`workspace:*` dependency edge.

## What happens next

Merging to `main` runs `.github/workflows/changesets.yml`, which opens or
updates a "Version Packages" pull request aggregating every pending
changeset into per-package version bumps and `CHANGELOG.md` entries. That bot
never publishes anything — see
[docs/releasing.md](../docs/releasing.md) for how a reviewed merge of that PR
turns into an actual npm release.

Full documentation: <https://github.com/changesets/changesets>
