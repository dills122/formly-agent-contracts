# Handoff: Begin the controlled Angular JIT host implementation

## Objective And Boundary

Implement the accepted bounded-v1 Angular JIT/config-loading architecture in
reviewable slices, beginning with **Task 7A.1: Version portable runtime and
dependency provenance**.

The first slice is schema/hash foundation work only. It must not preload Angular,
move project evaluation into workers, add an Nx target, or claim that the JIT
host is usable. Those behaviors follow in Tasks 7A.2–7C.3 after their contract
dependencies land.

The supported future runtime boundary is deliberately peer-correct Angular
graphs with one project-visible core/compiler pair. Private or bundled Angular
copies, custom loaders, `--preserve-symlinks`, and alternate absolute framework
imports are not v1-supported graphs.

## Canonical Sources

Read these in order; repository truth outranks this handoff:

1. [`AGENTS.md`](../../../AGENTS.md)
2. [Angular JIT/config-loading decision](../../research/angular-jit-config-loading.md)
3. [Controlled execution-host architecture](../../architecture-overview.md#controlled-project-execution-hosts)
4. [Distributed workspace implementation plan](../../planning/workspace-discovery/implementation-plan.md#task-7a1-version-portable-runtime-and-dependency-provenance)
5. [Repository implementation plan](../../implementation-plan.md)

The retained experiment is
[`scripts/research/angular-jit-config-loading.mjs`](../../../scripts/research/angular-jit-config-loading.mjs).
It is evidence for the later JIT slice, not production code to promote during
Task 7A.1.

## Current Repository State

- Repository: `/Users/dsteele/repos/formly-agent-contracts`
- Current branch at handoff: `codex/code-quality-cleanup`
- Checkpoint commit: `c8640946f71ea1c0e71adaee6baa97f4c56e1a4f`
- Local `main` is one commit behind this checkpoint at handoff time.
- The working tree is intentionally dirty with the accepted research/plan and
  retained harness. Start the new worktree from this working-tree state so these
  sources are available.
- The branch originated with code-quality cleanup work associated in the prior
  session with PR #32. Recheck its remote/merge state before preparing a future
  implementation PR; do not assume this handoff's status note is current.

Tracked planning changes:

- `docs/architecture-overview.md`
- `docs/implementation-plan.md`
- `docs/planning/workspace-discovery/implementation-plan.md`

New files owned by this research:

- `docs/research/angular-jit-config-loading.md`
- `scripts/research/angular-jit-config-loading.mjs`
- `.planning/2026-08-27-angular-jit-monorepo-loader-research/`
- this handoff

Other untracked `.planning/` directories predate this research. Preserve them
and do not fold them into implementation scope merely because they are visible.

## Completed Work And Evidence

- Official Angular, Node 22.13, pnpm, TypeScript, Jiti 2.7, and Nx sources were
  reconciled with exact installed-source inspection.
- The retained fresh-process harness proves four cases:
  1. the real partial-compilation failure occurs without the compiler facade;
  2. config-relative alias-free compiler preload fixes that exact failure;
  3. native compiler import from `packages/workspace` is unresolved under the
     strict package graph; and
  4. the Nx barrel additionally requires its selected tsconfig paths.
- Three fresh-context doubt-review cycles and two separately authorized
  read-only Claude reviews were reconciled. The final cycle found no new runtime
  blocker; its three plan contradictions are resolved in the canonical plan.
- Documentation validation, the retained harness, focused harness ESLint, and
  `git diff --check` passed after reconciliation.
- The final repository gate passed lint, 450 tests, all TypeScript/Angular/Nx
  builds, release/pack/demo/docs checks, and linked/packed workspace consumers.
  The first wrapper invocation stopped only when the managed sandbox denied
  access to the user's pnpm store; rerunning that exact consumer gate with
  approved store access passed.

## Decisions And Rationale

- `@formly-contract/workspace` becomes the publishable, Angular-free runtime
  host/protocol owner. `@formly-contract/angular` composes it through a mandatory
  compatible workspace peer.
- The parent loads only Node-safe root config. One disposable child per project
  owns project config, registries, factories, and Angular state.
- Inventory precedes form factories so cross-project duplicate identities fail
  globally before compilation.
- Workers never publish. The parent validates/rehashes results and commits
  content-addressed artifacts before replacing the index last.
- Portable provenance is schema-owned and path-free. The selected lockfile's
  relative path and digest record declared dependency state, not installed-byte
  attestation.
- Task 7A.1 intentionally migrates workspace-index/configuration hashes and
  goldens. Existing form-artifact bytes must remain unchanged.
- Nx v1 will expose one aggregate target on an explicit coordinator project.
  Per-project publisher targets conflict with global validation/publication and
  are not claimed.
- `trusted-local-v1` states that network is not enforced. A later external
  `isolated-ci-v1` provider must prove denial or fail closed.

## Blockers And Limitations

- The controlled host is not implemented. Current workspace generation still
  imports every project config and runs factories in the parent process.
- Do not delete workplace shims based on the synthetic result. Remove each only
  after the productized host and a representative workplace rerun prove it is
  redundant.
- Do not treat Node's Permission Model as a network sandbox.
- Do not promise whole-transitive-graph Angular singleton enforcement; the
  reviewed Node/Jiti surface cannot establish it for private/bundled copies.
- Task 7A.1 must decide the exact schema version/migration shape from current
  contract patterns. If that requires changing an existing public compatibility
  policy, stop and record the decision rather than silently broadening it.

## Immediate Next Actions

1. Verify repository/branch/dirty state and read the canonical sources above.
2. Inspect existing schema versioning, canonical serialization, workspace-index
   hashing, and golden-test conventions.
3. Write failing focused tests for Task 7A.1's DTO validation, forbidden
   machine-local fields, hash causality, compatibility behavior, and unchanged
   form-artifact bytes.
4. Implement only the smallest schema/index changes needed to make those tests
   pass; update public exports and canonical docs when the final shape is known.
5. Run focused checks, then `pnpm check`. Review the slice against Task 7A.1 and
   package it as a separate PR-ready checkpoint before beginning Task 7A.2.

Safe parallel work after the Task 7A.1 contract shape is fixed:

- one lane may prepare packed-consumer fixtures for Task 7A.2;
- another may inspect the strict pnpm peer install matrix for Task 7A.3;
- neither lane should implement against an unaccepted DTO shape or edit the same
  schema files.

## Verification Commands

```sh
pnpm check:docs
node scripts/research/angular-jit-config-loading.mjs
pnpm exec eslint scripts/research/angular-jit-config-loading.mjs
git diff --check
pnpm check
```

Add focused Task 7A.1 test commands once the owning test files are selected.

## Delivery Metadata

- Handoff date: 2026-08-27
- Intended execution: a new project worktree created from the current working
  tree, using the user's configured default model with `high` reasoning
- First delivery unit: Task 7A.1 only
- Expected next checkpoint: Task 7A.1 tests/build/docs green, focused review
  complete, branch/PR metadata ready
- No production Angular/JIT fix was implemented by the research task
