# Research: Publishing Strategy for a Growing `@formly-contract/*` Package Family

Status: research spike; no change adopted yet

Decision owner: project maintainer

Research date: 2026-08-26

## Decision question

The workspace currently hand-rolls release tooling for exactly two synchronized
public packages (`scripts/release-manifest.mjs`, `scripts/pack-release.mjs`,
`.github/workflows/release.yml`, documented in
[docs/releasing.md](../releasing.md)). The package family is about to grow
(`@formly-contract/core`, `@formly-contract/workspace`, and more). How do other
publishers version, changelog, and release many scoped npm packages from one
monorepo, and does the current hand-rolled pipeline still fit once there are
more than two packages?

## Current state (baseline)

- pnpm workspace (`apps/*`, `fixtures/*`, `packages/*`), one root
  `private: true` manifest, no build-orchestration tool (no Nx/Turborepo
  release layer — Nx appears only inside a *fixture*, not the tooling).
- **Lockstep/fixed versioning by hand**: `release-manifest.mjs` hardcodes
  `PUBLISHED_PACKAGE_DIRECTORIES = ['packages/contract-schema',
  'packages/formly-adapter']` and asserts both carry the identical `X.Y.Z`
  from the pushed `vX.Y.Z` tag.
  - Reality is already drifting from that model: `packages/workspace` is
    `@formly-agent-contracts/workspace` at `0.1.0` (marked experimental, not
    in the published set) while the two published packages are at `0.4.0`.
    That is independent versioning happening organically, not lockstep.
  - Also a **scope split already exists**: `@formly-contract/*` vs
    `@formly-agent-contracts/*`. Worth resolving before adding
    `@formly-contract/core` / `@formly-contract/workspace` — see Open
    questions.
- One npm "publish" tag output (`next`/`latest`) applied to every package in
  the release, decided from whether the version string has a prerelease
  suffix.
- No changelog generation — releases rely on `gh release create
  --generate-notes` (commit-log based) plus manual `README.md` updates.
- Publish step is a **fixed-arity check**: `tarballs.length !== 2` is a hard
  failure. Adding a third published package requires editing the workflow
  script, not just adding a directory.
- Publishing uses **npm trusted publishing (OIDC)**, not long-lived npm
  tokens — this is the newest-generation approach and ahead of what most
  tooling below defaults to; keep it regardless of what else changes.
- Release is **tag-triggered, single version for the whole release**: pushing
  one `vX.Y.Z` tag releases whichever packages match that version. There is
  no per-package tag/version convention yet (e.g. `@formly-contract/core@1.2.0`).

## What other publishers do

Every mainstream option decomposes into two independent questions:
**(1) how does a package's next version get decided**, and **(2) how does
"decided" become "tagged, changelogged, and published"**. Tools differ mainly
in how much of a scoped monorepo's *dependency graph* they understand.

### 1. Changesets (`@changesets/cli`)

- Model: contributors add a small markdown "changeset" file per PR
  (`pnpm changeset`) declaring which packages changed and at what bump
  (patch/minor/major) plus a human-written changelog entry. A bot/CI job
  aggregates pending changesets into one "Version Packages" PR; merging it
  bumps every affected package's `package.json`, writes `CHANGELOG.md` per
  package, and (via `changesets/action`) can `pnpm publish -r` immediately
  after.
- Versioning: **independent by default**, with a `fixed`/`linked` config
  option to lock groups of packages together (e.g. keep `core` and
  `workspace` in lockstep if desired, let others float).
- Dependency awareness: bumping a package automatically bumps dependents
  that use `workspace:*`/`^` ranges that would otherwise break — handles the
  `@formly-contract/formly-adapter → @formly-contract/contract-schema`
  edge that today is asserted manually.
- Fit: **native to pnpm workspaces** (same team's tooling lineage,
  documented directly in pnpm's own workspace publishing guide already
  linked from `docs/releasing.md`). This is the closest drop-in replacement
  for the current hand-rolled scripts and is what most scoped npm families
  use in practice — `@radix-ui/*`, `@remix-run/*`, `@tanstack/*`,
  `@sveltejs/*`, Chakra UI, Vite's own plugin ecosystem.
- Trusted publishing: works with npm OIDC trusted publishing as of npm
  ≥11.5.1 (already the pinned version here), since it still shells out to
  `npm publish` per package — no rework of the OIDC setup needed.

### 2. Nx release

- Model: `nx release` is Nx's built-in successor to Lerna (Nx acquired and
  absorbed Lerna's maintenance). Understands the project graph, computes
  version bumps from conventional commits *or* changesets, generates a
  changelog, tags, and publishes — all as one graph-aware command
  (`nx release --dry-run` for review first).
- Versioning: supports both **fixed** (one version for the whole workspace,
  Nx's own historical default) and **independent** ("release groups"), and
  can mix — e.g. a "core" group fixed together, other packages independent.
- Dependency awareness: strongest of the options here, because it reuses
  Nx's project graph for affected-detection, not just declared
  `package.json` deps.
- Fit: this workspace does not use Nx as its build orchestrator (Nx only
  exists inside `fixtures/nx-workspace` as a *test fixture consumer*), so
  adopting `nx release` means adopting Nx as a top-level dependency just for
  releases — a much bigger footprint change than Changesets for a similar
  outcome.

### 3. Lerna (conventional-commits mode)

- Model: `lerna version --conventional-commits` derives bumps from Conventional
  Commit messages (`feat:`, `fix:`, `BREAKING CHANGE:`) instead of
  hand-authored changeset files, then `lerna publish`.
- Versioning: supports fixed or independent (`"version": "independent"` in
  `lerna.json`).
- Status: now maintained under the Nx org as a thinner wrapper; most new
  guidance points at `nx release` instead. Still common in older scoped
  monorepos (early Babel/Jest-era packages) but declining as a first choice
  for new setups.
- Fit: would require commit-message discipline this repo does not currently
  enforce (commit history isn't Conventional-Commits-shaped from the sample
  checked), so it trades hand-written changesets for hand-written commit
  hygiene — not obviously less work.

### 4. semantic-release (+ multi-package plugins)

- Model: fully automated — every merge to the release branch computes the
  next version from Conventional Commits and publishes with no human
  "release PR" step.
- Monorepo support is a bolt-on, not core: semantic-release itself is
  single-package by design. Monorepo use needs either
  `semantic-release-monorepo` (runs semantic-release once per package,
  scoped by path filters) or the community `multi-semantic-release`
  wrapper for cross-package dependency bumping. Both are less actively
  maintained than Changesets/Nx and are known to fight monorepos with
  interdependent internal packages (exactly this repo's
  `formly-adapter → contract-schema` shape).
- Fit: poor here — no human review step before publish is a mismatch for a
  workspace that already treats release as a reviewed, gated PR
  (`release:check`, `pack:check`, protected tag ruleset in
  `docs/releasing.md`).

### 5. Rush (Microsoft)

- Model: "change files" (conceptually pre-dates and closely resembles
  Changesets) checked in per-PR, `rush publish` bumps and publishes.
  Used by very large scoped families (Fluent UI, `@rushstack/*`).
- Versioning: independent by default, with "lockstep" version policies
  available.
- Fit: Rush replaces the package manager workflow itself (its own
  `rush.json`, `common/` shrinkwrap layout) — too heavy a migration to adopt
  only for release management on top of an existing pnpm workspace.

### 6. Plain `pnpm publish -r` / hand-rolled (current approach + evolution path)

- pnpm natively supports recursive publish (`pnpm -r publish`) and respects
  `workspace:*` range rewriting on pack/publish — which is already the
  mechanism `pack-release.mjs` leans on. Some small, tightly-coupled
  monorepos stay entirely hand-rolled and just add packages to the
  published set manually, same as today.
- Fit: viable indefinitely for **fixed/lockstep, small (2-4 package)**
  families where every package always ships together. Gets linearly more
  manual per package added (each new package needs its own line in
  `PUBLISHED_PACKAGE_DIRECTORIES`, its own build step in `release.yml`, its
  own slot in the `tarballs.length !== 2` check, and a manually-synchronized
  version bump across every manifest) — none of that is a *hard* wall, but
  it is the exact toil that Changesets/Nx release automate away, and the
  cost compounds with every package added, not just with `core` +
  `workspace`.

## Comparison

| Tool | Independent versioning | Dependency-aware bumps | Changelog | Fits pnpm workspace w/o new orchestrator | Fits existing OIDC/trusted publish | Migration cost from today |
|---|---|---|---|---|---|---|
| Changesets | yes (default) | yes | yes, per package | yes | yes | low |
| Nx release | yes (groups) | yes (strongest) | yes | no (adds Nx) | yes | medium-high |
| Lerna | yes | yes | yes (commit-derived) | yes | yes | medium (needs commit discipline) |
| semantic-release (+monorepo plugin) | yes | weak/bolted-on | yes | yes | yes | medium, poor interdependency fit |
| Rush | yes | yes | yes | no (replaces PM workflow) | yes | high |
| Current hand-rolled | no (asserts lockstep) | no (manual) | no | n/a (this is the baseline) | yes | zero, but toil scales per package |

## Recommendation

Adopt **Changesets** as the versioning/changelog layer, keeping the existing
pnpm workspace, npm trusted publishing, and quality-gate structure
(`release:check`, `pack:check`, protected tag ruleset) intact:

1. `pnpm add -Dw @changesets/cli`, `pnpm changeset init`.
2. Configure `.changeset/config.json`: start every current and new package
   **independent** (matches the drift already visible between
   `contract-schema`/`formly-adapter` at `0.4.0` and `workspace` at `0.1.0`);
   use `linked` only for groups that must always move together, if any
   emerge.
3. Replace the hardcoded `PUBLISHED_PACKAGE_DIRECTORIES` array and the
   `tarballs.length !== 2` assertion with a check driven by
   `manifest.private !== true` (i.e., "publishable" is whatever isn't
   marked private), so adding `@formly-contract/core` or
   `@formly-contract/workspace` means adding the package and clearing its
   pre-publish checklist — not editing release scripts.
4. Keep the existing `release-manifest.mjs`/`pack-release.mjs` verification
   logic (repository/homepage metadata, `files: ['dist']`, peer range
   assertions) as **post-version, pre-publish gates** — Changesets decides
   *what* version to publish; the existing scripts still decide whether the
   packed tarball is *allowed* to publish. Nothing about the OIDC trusted
   publishing step changes.
5. Keep tag-triggered release, but stop treating the tag as a version: once
   [ADR 0009](../decisions/0009-changesets-independent-versioning.md) landed,
   the tag became a plain release trigger matching the protected `v*`
   pattern, and each publish run ships whichever packages have a version not
   yet on npm. (A per-package tagging convention was considered and not
   needed — see the ADR's rejected-alternatives section.)

This is the smallest change that removes the two real scaling problems (fixed
package count, forced lockstep versioning) without discarding the OIDC
trusted-publishing work already done, and it matches what the rest of the
scoped-npm-package ecosystem (Radix, Remix, TanStack, Sveltejs) already does
for the same shape of problem.

## Resolved: package family and naming

Nothing under this project is actually published to npm yet (GitHub only), so
every current name is still free to change. Resolved naming convention:
**a package name is a bare noun for what it targets/wraps — it never restates
a word already in the `@formly-contract` scope.** (Precedent: Remix ships
`@remix-run/react`, `@remix-run/node`, `@remix-run/cloudflare` — the platform
name only, never "remix" again inside the package name.)

| Directory | Scoped name | Role | State |
|---|---|---|---|
| `packages/contract-schema` | `@formly-contract/schema` | DTOs, canonical JSON, SHA-256 hashing, runtime validation | rename pending |
| `packages/formly-adapter` | `@formly-contract/compiler` | Formly 6.x extraction + trusted scenario compilation ("the contract compiler" per [architecture-overview.md](../architecture-overview.md)) | rename pending |
| `packages/workspace` | `@formly-contract/workspace` | typed root/project config, discovery, artifact runner, CLI | name unchanged; scope rename pending (currently `@formly-agent-contracts/workspace`) |
| (planned, ADR 0007) | `@formly-contract/angular` | multi-provider bridge, controlled-builder host, field-type profile authoring, optional capture extension | not yet built |
| (planned, ADR 0007) | `@formly-contract/nx` | project marker detection, inferred cacheable targets, executor/generators, affected runs | not yet built |
| (future, arch §7) | `@formly-contract/mcp` | read-only MCP resources/tools over immutable bundles | not yet designed |
| (future, arch §8) | `@formly-contract/playwright` | typed E2E intent validation + Playwright compiler/driver runtime (folds test-intent schema into `schema` rather than a separate package) | not yet designed |

Do the rename as one reviewed change per package (manifest `name`, imports,
`workspace:*` references, README table, tests, docs), per the existing
"Before the first release" checklist in [docs/releasing.md](../releasing.md).
Do it before wiring Changesets so the first changeset/changelog entries land
under final names, not throwaway ones.

## Other open questions

1. ~~Does anything actually need fixed/linked versioning~~ — resolved:
   [ADR 0009](../decisions/0009-changesets-independent-versioning.md) adopted
   fully independent versioning, no fixed/linked groups.
2. Who authors changesets — is a "forgot to add a changeset" CI check
   (`changeset status` in PR CI) wanted, or is that too much process for
   solo/small-team velocity right now? Still open; recorded as a deliberate
   follow-up in ADR 0009, not a silent gap.

## Source references

- [Changesets documentation](https://github.com/changesets/changesets)
- [pnpm workspace publishing](https://pnpm.io/10.x/workspaces#publishing-workspace-packages)
- [Nx release](https://nx.dev/features/manage-releases)
- [Lerna (Nx-maintained)](https://lerna.js.org/)
- [semantic-release monorepo recipe](https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/release-workflow/multi-package-repositories-with-multi-semantic-release.md)
- [Rush](https://rushjs.io/pages/intro/welcome/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
