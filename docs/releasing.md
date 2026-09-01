# Releasing

This repository releases every non-private package directly under `packages/`.
Today that is:

- `packages/schema` (`@formly-contract/schema`)
- `packages/compiler` (`@formly-contract/compiler`)
- `packages/workspace` (`@formly-contract/workspace`)
- `packages/angular` (`@formly-contract/angular`)

Adding a new `@formly-contract/*` package to the release needs no script or
workflow edit: leave it non-private and satisfy the metadata checks in
[scripts/release-manifest.mjs](../scripts/release-manifest.mjs) (name,
description, semantic version, `files: ["dist"]`, public `publishConfig`, and
a `repository.directory` matching its real path). See
[ADR 0008](decisions/0008-package-rename.md) for how the current package
names and scope were chosen, and [ADR 0009](decisions/0009-changesets-independent-versioning.md)
for how versioning and releases work.

The root, applications, demo, and fixtures remain private and are never
eligible for release regardless of their `private` flag — only directories
directly under `packages/` can join it.

Every published package versions **independently**. There is no repo-wide
"the release version" — [Changesets](https://github.com/changesets/changesets)
tracks per-package version bumps and changelogs, and a release tag is a
trigger, not a version.

## Authoring a change

Any PR that changes a released package's behavior needs a changeset:

```sh
pnpm changeset
```

Pick the affected package(s), a bump type, and write the changelog entry.
Commit the generated `.changeset/*.md` file with the rest of the PR. See
[.changeset/README.md](../.changeset/README.md).

## From merged changesets to a release

1. When preparing a release, a maintainer manually runs
   [.github/workflows/changesets.yml](../.github/workflows/changesets.yml).
   The workflow opens or updates a bot-authored "Version Packages" pull
   request, which bumps every affected package's `package.json` and writes its
   `CHANGELOG.md` entries. It does not run automatically on pushes to `main`,
   and the bot never publishes anything.
2. A maintainer reviews and merges the Version Packages PR like any other
   change (full `pnpm check` gate applies).
3. A maintainer pushes a release tag to trigger
   [.github/workflows/release.yml](../.github/workflows/release.yml):

   ```sh
   git switch main
   git pull --ff-only
   git tag -a v1 -m "Release"
   git push origin v1
   ```

   The tag only needs to match the protected `v*` pattern — it does not need
   to equal any package's version, and its content is otherwise ignored. Any
   value that satisfies the pattern works; incrementing counters
   (`v1`, `v2`, ...) or a date-stamped tag are both fine.
4. The release workflow builds every `packages/*` package, packs and verifies
   the ones eligible to publish, and publishes each one **that isn't already
   on npm** with matching integrity — packages with no pending version bump
   are silently skipped, not re-published. Each package's own version decides
   its npm dist-tag (`latest` for a stable version, `next` for a prerelease).
5. A single GitHub release is created for that tag, generated notes attached,
   bundling whatever tarballs were built (published or already-current).

Release jobs build and test with the repository's pinned Node `22.22.1`
baseline. Immediately before publication, the workflow installs exact npm
`11.19.0`, satisfying trusted publishing's npm `11.5.1` and Node `22.14.0`
minimums without violating the workspace's engine-strict Node range.

## Before the first release

npm only allows trusted publishing to be configured for an existing package.
The first release therefore needs this one-time bootstrap:

1. Confirm the npm account or organization owns the `@formly-contract` scope
   and that every to-be-released package name is available.
2. Merge the release and Changesets workflows to `main` and protect the `v*`
   tag pattern with a GitHub ruleset so only release maintainers can create or
   update release tags. In repository settings under Actions > General,
   enable "Allow GitHub Actions to create and approve pull requests" so the
   Changesets workflow can open its Version Packages PR.
3. Merge at least one already-versioned package to `main` (or merge a
   generated Version Packages PR) so every to-be-released package has its
   intended first version.
4. Run `pnpm check` locally, then run `pnpm release:pack` and inspect the
   tarballs under `artifacts/releases/`.
5. Tag the current `main` commit and push the tag. The workflow will verify
   the release and preserve an `npm-release-<tag>` artifact, then npm
   publication will stop because trust is not configured yet.
6. Download that exact workflow artifact. Interactively publish each tarball
   with `npm publish --access public`, in the order printed by
   `pnpm release:check`. Add `--tag next` when bootstrapping a prerelease.
7. In each package's npm settings, configure a GitHub Actions trusted
   publisher for organization/user `dills122`, repository `formly-contract`,
   workflow file `release.yml`, and permission `npm publish`.
8. Rerun the failed workflow jobs. The publisher compares each existing npm
   version's SHA-512 integrity with the checked tarball, safely skips the
   exact bootstrap uploads, and completes the GitHub release.
9. After the OIDC release succeeds, require 2FA and disallow token publishing
   in each npm package's settings. Revoke any temporary bootstrap token.

Do not bootstrap with locally rebuilt tarballs after the tagged workflow has
run. Use the preserved workflow artifact so the integrity check can prove that
the npm and GitHub release assets are identical.

Never move or reuse a published version tag. npm package name/version pairs are
immutable even when unpublished.

## Local release checks

- `pnpm changeset status` shows pending changesets and the version bumps they
  imply, without writing anything.
- `pnpm release:check` validates public/private package boundaries and
  metadata for every publishable package.
- `pnpm pack:check` expects built `dist` directories, packs every published
  package in a temporary directory, checks the allowlisted files and
  dependency rewrite, imports the installed tarballs, and removes its
  temporary files.
- `pnpm release:pack` builds the workspace packages and retains verified
  tarballs in the ignored `artifacts/releases/` directory for manual
  inspection.
- `pnpm pilot:pack` builds and retains schema, compiler, and the private
  workspace CLI under `artifacts/pilot/`, with SHA-256 metadata and a pnpm
  install argument list. It is a portable pilot handoff, not a public release
  or an offline third-party dependency bundle.

## Failure and retry behavior

- A tag not pointing at the current `main` commit fails before publication.
- Incomplete or invalid npm metadata on any publishable package fails before
  publication.
- Existing npm versions are skipped only when registry integrity exactly
  matches the checked tarball. A mismatch is a hard failure and must be
  investigated; never force or overwrite it.
- Published packages publish sequentially. If a later publish fails, rerun the
  job after correcting the external issue; every already-matching package's
  integrity check makes the retry safe.
- GitHub release creation runs only after every npm package publish attempt
  completes.

## Source references

- [Changesets documentation](https://github.com/changesets/changesets)
- [changesets/action](https://github.com/changesets/action)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm trusted-publisher management](https://docs.npmjs.com/cli/v11/commands/npm-trust/)
- [pnpm 10 workspace publishing](https://pnpm.io/10.x/workspaces#publishing-workspace-packages)
- [GitHub Actions secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create)
