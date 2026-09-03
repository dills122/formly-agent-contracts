# Workplace Pilot Readiness Execution Index

- Status: Complete; ready for coordinated PRs
- Integration branch: `codex/pilot-readiness`
- Base: current `origin/main` after the merged CTX-2D1 / DRV-0C2 checkpoint
- Completion boundary: make the next private-workspace pilot easier to run,
  diagnose, and report without expanding the supported source grammar or
  claiming browser execution.
- Canonical references:
  - [Workplace pilot](../../workplace-pilot.md)
  - [Workplace MVP pilot](../workplace-mvp-pilot/execution-index.md)
  - [Agent-context hardening](../agent-context-hardening/execution-index.md)
  - [CTX-2 task packet](../agent-context-hardening/ctx-2-spec.md)

## Objective

Retain one small readiness checkpoint before the representative workplace run:

1. rehearse the currently shipped adjacent boundaries: exact source linkage
   from the real Nx producer, then hash-pinned synthetic agent context, typed
   positive and negative intent validation, canonical plans, and trusted
   driver-call binding;
2. close the explicit hostile-input gap on the standalone plan-hash helper;
3. align the maintained docs/example and sanitized pilot report with that
   exact boundary; and
4. decide, from current package evidence, whether a separate local-install
   bundle is useful before the pilot.

This checkpoint does not add driver invocation, browser execution, an MCP
transport, new source-linkage grammar, new custom-field behavior presets, or
named Formly environments. Those remain governed by the canonical scheduler
and representative producer evidence.

## Work items

| ID | Outcome | Delivery unit / owner | Depends on | Status | Acceptance and verification |
| --- | --- | --- | --- | --- | --- |
| `READY-0` | Freeze scope, coordinate non-overlapping ownership, and reconcile retained work | Lead task | none | complete | This index names the completion boundary, owners, dependencies, and verification |
| `READY-1` | Assess a browser-free rehearsal for the real Nx source/form/hash producer and the adjacent synthetic query/validation/binding boundary | Internal subagent; Nx/integration-test paths | `READY-0` | complete; no retained code | Defer the same-form rehearsal: current workspace output has no journey/resolved-scenario/execution-authority join, and existing Nx plus Playwright tests already cover each honest boundary; `pnpm test:examples` and focused binding tests pass |
| `READY-2` | Harden the standalone public validated-plan hash helper against hostile/unparsed values while preserving valid canonical hashes | Internal subagent; schema hash/parser paths | `READY-0` | complete | RED proved proxy input was accepted; GREEN passes 21 focused tests plus schema typecheck/build and lint, with valid hashes unchanged and hostile properties rejected before semantic reads |
| `READY-3` | Assess whether current linked/packed-consumer tooling already supplies a reproducible workplace install path | Internal research subagent; read-only | `READY-0` | complete | Defer a new bundle: `pnpm check:workspace-consumers` already proves linked and packed three-package consumers; add a retained pnpm-specific `pilot:pack` only if the workplace rejects sibling links |
| `READY-4` | Improve the maintained docs-site example and synchronize the workplace guide/report through query, validation, plan, and binding | Existing independent task: `Add end-to-end Formly example` | `READY-0` | complete | Commit `5e320f890607e8cc499669758a67768314089d05`; docs checks and 20-route build pass; light/dark plus 320/375/414/768/desktop browser QA passes without page overflow |
| `READY-5` | Reconcile all handoffs and run integration verification | Lead task | retained parts of `READY-1` through `READY-4` | complete | Code commit `88373ba`: 1,126 tests, all package/application/Angular/Nx builds, linked and packed consumers, release/pack/demo gates, 141-file docs validation, and 20-page docs build pass; both branches target `main` through separate PRs |

## Parallel ownership

- `READY-1`, `READY-2`, `READY-3`, and `READY-4` may run concurrently because
  their owned paths do not overlap.
- The existing docs/example task owns docs-site content, styles, navigation,
  and `docs/workplace-pilot.md`. This branch must not create competing edits in
  those paths.
- `READY-1` owns integration-test composition and must not modify the schema
  plan-hash implementation.
- `READY-2` owns only the schema plan-hash/parser boundary and focused tests.
- The lead owns this index, reconciliation, final verification, and the code
  PR. The docs/example task retains its own branch and PR destination.

The real Nx workspace producer currently emits declared form contracts and
source-usage authority. CTX-2 planning additionally requires journey, resolved
scenario, execution-authority, driver-manifest, and live-owner artifacts. Those
producer gates are not complete for the Nx form, so `READY-1` must not fabricate
them merely to make a same-form test appear end to end. The rehearsal preserves
that join as unavailable and tests each implemented public boundary with its
real current authority.

## Decision gate after the workplace run

The sanitized workplace evidence selects the next vertical:

- source/root resolution failures inform `LIN-0` and the bounded grammar for
  `LIN-1`;
- custom-field authoring friction informs `AUTH-0`, `ANG-0`, and the Angular
  authoring sequence;
- missing dynamic behavior informs `BHV-0` through `BHV-4` and `CTX-2V`;
- a clean static/context pilot supports proceeding toward the remaining driver
  and browser/runtime parity gates.

No result from this readiness checkpoint alone promotes those downstream
statuses.

## Delivery checkpoints

- Code and planning: `codex/pilot-readiness` at `88373ba`, targeting `main`.
- Docs site, examples, API/README, and workplace guide:
  `codex/end-to-end-example` at
  `5e320f890607e8cc499669758a67768314089d05`, targeting `main` independently.

The code branch's full gate first encountered a network-denied cache miss in
the temporary packed-consumer install after lint, 1,126 tests, and all builds
had passed. The exact blocked `pnpm check:workspace-consumers` gate then passed
with network access, followed by the release, pack, demo, and documentation
gates. No repository failure was hidden or skipped.

## Package-readiness decision

The initial workplace pilot continues to use the documented sibling `link:`
workflow. The repository already packs schema, compiler, and the private
workspace CLI into an isolated consumer, rewrites their exact local dependency
versions through pnpm workspace overrides, generates contracts, and verifies
source-linkage hashes under `pnpm check:workspace-consumers`. A separate
retained tarball bundle would duplicate that proof before a consumer need is
known.

The later `pilot:pack` follow-up now retains schema, compiler, workspace, and
Angular tarballs plus a checksummed pnpm hook for bundled internal dependency
resolution. It remains separate from `release:pack` and is not an offline
bundle because third-party dependencies still require a registry or cache.
