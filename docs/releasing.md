# Releasing

This repository releases two public npm packages from one synchronized version
and Git tag:

- `packages/contract-schema`
- `packages/formly-adapter`

The root, applications, demo, and fixtures remain private. Package names may
change before the first release, but the directory-based release boundary stays
the same.

## Release contract

A pushed `vX.Y.Z` tag starts `.github/workflows/release.yml`. The workflow:

1. verifies that the tag points at the current `main` commit;
2. verifies both public packages have version `X.Y.Z` and complete npm metadata;
3. runs the full `pnpm check` quality gate;
4. builds pnpm tarballs and checks their contents, rewritten dependencies, and
   installed imports;
5. publishes the exact checked tarballs to npm with trusted publishing; and
6. creates a GitHub release with generated notes and both tarballs attached.

Stable versions use the npm `latest` tag. SemVer prereleases such as
`0.4.0-rc.1` use `next` and become GitHub prereleases.

Release jobs build and test with the repository's pinned Node `22.22.1`
baseline. Immediately before publication, the workflow installs exact npm
`11.19.0`, satisfying trusted publishing's npm `11.5.1` and Node `22.14.0`
minimums without violating the workspace's engine-strict Node range.

## Before the first release

The current package scope is not final. Before publishing anything:

1. choose the final public package names;
2. confirm the npm account or organization owns the selected scope and that
   both names are available;
3. update package manifests, imports, workspace aliases, tests, and docs in one
   reviewed rename change; and
4. merge the release workflow to `main` before creating a release tag; and
5. protect the `v*` tag pattern with a GitHub ruleset so only release
   maintainers can create or update release tags.

npm only allows trusted publishing to be configured for an existing package.
The first release therefore needs this one-time bootstrap:

1. Set the synchronized package version and merge the release change to `main`.
2. Run `pnpm check` locally, then run `pnpm release:pack` and inspect the two
   tarballs under `artifacts/releases/`.
3. Tag the current `main` commit and push the tag. The workflow will verify the
   release and preserve an `npm-release-X.Y.Z` artifact, then npm publication
   will stop because trust is not configured yet.
4. Download that exact workflow artifact. Interactively publish the schema
   tarball first and the adapter tarball second with `npm publish --access
   public`. Add `--tag next` when bootstrapping a prerelease.
5. In each package's npm settings, configure a GitHub Actions trusted publisher
   for organization/user `dills122`, repository `formly-contract`,
   workflow file `release.yml`, and permission `npm publish`.
6. Rerun the failed workflow jobs. The publisher compares each existing npm
   version's SHA-512 integrity with the checked tarball, safely skips the exact
   bootstrap uploads, and completes the GitHub release.
7. After the OIDC release succeeds, require 2FA and disallow token publishing
   in each npm package's settings. Revoke any temporary bootstrap token.

Do not bootstrap with locally rebuilt tarballs after the tagged workflow has
run. Use the preserved workflow artifact so the integrity check can prove that
the npm and GitHub release assets are identical.

## Normal release procedure

1. Update both public `package.json` versions to the same SemVer value. Update
   contracts and documentation in the same change when behavior changed.
2. Run:

   ```sh
   pnpm install --frozen-lockfile
   pnpm check
   pnpm release:pack
   ```

3. Inspect the two tarballs under `artifacts/releases/`. `pnpm check` already
   verifies the same package boundary without retaining temporary tarballs.
4. Merge the reviewed release change to `main` and confirm required CI passes.
5. Tag the current remote `main` commit and push only that tag:

   ```sh
   git switch main
   git pull --ff-only
   git tag -a v0.4.0 -m "Release v0.4.0"
   git push origin v0.4.0
   ```

6. Watch the Release workflow. Confirm both npm package pages show the expected
   version and provenance, then confirm the GitHub release contains both
   tarballs.

Never move or reuse a published version tag. npm package name/version pairs are
immutable even when unpublished.

## Local release checks

- `pnpm release:check` validates public/private package boundaries, metadata,
  synchronized versions, and an optional workflow tag.
- `pnpm pack:check` expects built `dist` directories, packs both libraries in a
  temporary directory, checks the allowlisted files and dependency rewrite,
  imports the installed tarballs, and removes its temporary files.
- `pnpm release:pack` builds the library slice and retains verified tarballs in
  the ignored `artifacts/releases/` directory for manual inspection.

## Failure and retry behavior

- A tag not pointing at the current `main` commit fails before publication.
- A tag/version mismatch or unsynchronized package versions fails before
  publication.
- Existing npm versions are skipped only when registry integrity exactly
  matches the checked tarball. A mismatch is a hard failure and must be
  investigated; never force or overwrite it.
- The two npm packages publish sequentially. If the second publish fails, rerun
  the job after correcting the external issue; the first package's matching
  integrity makes the retry safe.
- GitHub release creation runs only after both npm packages are present.

## Source references

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm trusted-publisher management](https://docs.npmjs.com/cli/v11/commands/npm-trust/)
- [pnpm 10 workspace publishing](https://pnpm.io/10.x/workspaces#publishing-workspace-packages)
- [GitHub Actions secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create)
