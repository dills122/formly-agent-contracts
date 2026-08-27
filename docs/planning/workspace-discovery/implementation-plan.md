# Implementation Plan: Distributed Workspace Form Discovery

Status: in progress; Tasks 1–6B and Checkpoint A are complete. Task 7A.1 code
and acceptance verification are complete after correcting the exact-loader and
resolved-package findings from independent review instance 1 plus the
order-insensitive configuration-hash finding from instance 2. Completed work
includes
project-owned field-type profiles and cross-field effects, resolved effect
projection, deterministic workspace artifacts/indexes, all three generic CLI
commands, canonical Angular-fixture goldens, linked/packed consumer smokes, and
the schema-owned portable runtime/dependency provenance foundation. Task 7A.2
begins only after the independent review loop returns a ready verdict.

Related research:
[Scalable Form Discovery and Registration](../../research/form-discovery-dx.md)

Profile architecture research:
[v0.4 Field-Type Adapter Research](../../research/v0.4-field-type-adapter.md)

Controlled Angular loader research:
[Angular JIT/config loading in pnpm and Nx monorepos](../../research/angular-jit-config-loading.md)

Proposed decision:
[ADR 0007](../../decisions/0007-distributed-workspace-discovery.md)

## Overview

Build a typed workspace layer that discovers project-local Formly contract
sources across applications, libraries, and packages. The first vertical slice
must turn one root config and several project configs into deterministic
contract artifacts without Angular or Nx coupling. The project configuration
also becomes the ownership boundary for application field-type profile
registries, while versioned profile DTOs remain in the schema package and
profile resolution remains in the compiler. Angular and Nx integrations
then add distributed providers, trusted scenario compilation, adapter
scaffolding, inferred tasks, and affected execution. Runtime capture remains an
optional migration phase.

The plan preserves the existing schema and extraction boundaries. No task may
silently execute application code from an MCP request, infer arbitrary form
roots, serialize model values, or invent selectors.

## Architecture decisions

- Add only three packages in this increment: `workspace`, `angular`, and `nx`.
- Keep configuration, discovery, runner, and CLI together in `workspace` until
  independent consumers justify more packages.
- Use root config for workspace policy and project config for local ownership.
- Keep global profile policy in root config, but keep application-specific
  field-type profiles and Angular authoring inputs in project config.
- Put framework-neutral profile DTOs/validation in `@formly-contract/schema`,
  Formly registration/profile resolution in `@formly-contract/compiler`, and
  Angular inventory and scaffold generation in the optional `angular` package.
- Store only serializable profiles and stable driver IDs/versions in contracts;
  executable Playwright drivers remain outside this increment.
- Treat source catalogs as the unit of integration so one adapter can expose
  many forms.
- Use Jiti as the leading TypeScript config-loader candidate, subject to an
  executable compatibility gate.
- Keep Angular and Nx optional; neither enters `@formly-contract/schema` or the
  runtime dependency surface of `@formly-contract/compiler`.
- Preserve one workspace-wide orchestrator and publication boundary. The first
  Nx integration adds exactly one aggregate target to an explicitly selected
  coordinator project; it does not run or publish one contract generation per
  form-owning project.
- Treat capture as incomplete migration evidence, never authoritative declared
  inventory.

## Dependency graph

```text
Task 1 -> Task 2 -> Task 3
Task 3 -> Task 4: root/project discovery
Task 3 -> Task 3A -> Task 3B: project profile registry integration
Tasks 3B + 4 -> Task 5: first artifact-generation vertical slice
Task 5 -> Task 6A: generic CLI (`generate` pilot first)
Task 3B -> Task 3C: explicit cross-field effect contract
Tasks 3C + 5 -> Task 5A: resolve effects against generated nodes
Tasks 5A + 6A + 6B
       |
Checkpoint A: generic pilot
       |
Task 7A.1: portable provenance
       |
Task 7A.2: workspace host protocol
       |---------------------------|
Task 7B.1 -> 7B.2        Task 7A.3: Angular package scaffold
       |---------------------------|
Task 7B.3                 Task 7D: Angular provider bridge
       |
Task 7C.1 -> 7C.2 -> 7C.3: guarded Angular JIT host
       |---------------------------|
Task 8: trusted Angular scenario compilation
       |
Task 8B: Angular field-profile authoring
       |
Checkpoint B: Angular pilot
       |
Task 9: Nx version gate
       |
Task 10A: Nx package scaffold
       |
Task 10B: one aggregate Nx target
       |
Task 11A: Nx executor
       |-------------------------------|
Task 11B: Nx generators     Task 11C: external isolated-CI provider
       |                               |
Task 12A: Nx fixture shell             |
       |                               |
Task 12B: Nx fixture projects          |
       |-------------------------------|
Task 12C: aggregate cache/affected + isolation proof
       |
Checkpoint C: workplace-ready path
       |
Tasks 13-14: optional migration capture
       |
Task 15A: generic consumer documentation
       |
Task 15B: integration consumer documentation
       |
Task 15C: package/release smoke
       |
Task 15D: independent review
```

The cross-field effects research item `RS-EFFECTS-01` is complete. It approves
an explicit application-declared effect graph, conditionally approves derived
string/scenario evidence as non-authoritative authoring aids, and rejects
automatic semantic-verb inference. The first production slice therefore
contains explicit effects only.

## Cross-plan traceability

| Requirement | Decision | Tasks | Verification | Status |
| --- | --- | --- | --- | --- |
| `REQ-CONFIG-01` Repository-aware deterministic discovery | Root policy plus project-local ownership | Tasks 1–6B | Focused loader/config/source/discovery/runner/index tests, canonical Angular goldens, and linked/packed CLI consumers | Implemented through Task 6B; maintainer UX review remains at Checkpoint A |
| `REQ-PROFILE-01` Custom types expose reviewed, serializable interaction semantics | Profiles are application-owned data; executable drivers are separate | Tasks 3A–3B | Strict DTO, resolution, conflict, canonical-hash, and artifact-ingestion semantic safety tests | Tasks 3A–3B and Tasks 5.0–5.1 implemented, including safe node projection and realistic Angular/Nx fixture coverage; executable drivers remain separate |
| `REQ-AUTHOR-01` Angular reduces profile-authoring work without becoming semantic authority | Inventory and scaffolds are build-time evidence only | Tasks 7A–8B | Angular inventory, negative inference, and scenario tests | Planned; prototype complete |
| `REQ-EFFECTS-01` Ordering/effects are represented without function-source guessing | Explicit declared graph; derived references/deltas remain non-authoritative evidence | Tasks 3C and 5A | Strict DTO, endpoint/capability/readiness/SCC tests, retained 11-test spike | Implemented with schema/config/compiler/workspace/anchor-fixture evidence |

## Phase 0: Fail-fast feasibility and contracts

### Task 1: Prove the trusted config-loading boundary

**Description:** Create a controlled fixture that loads root and project configs
through Jiti using ESM, CommonJS, TypeScript, and a representative `tsconfig`
path alias. Compare behavior with native Node loading and document why the
selected loader satisfies the supported Node range.

**Acceptance criteria:**

- [x] The async loader reads all four representative config/module formats.
- [x] Path aliases resolve only when an explicit project `tsconfig` is supplied.
- [x] A malformed export and a missing file produce stable, actionable errors.

**Verification:**

- [x] Focused loader fixture tests pass on Node `22.22.1`.
- [x] CI covers the minimum supported Node version or the engine floor is
      intentionally raised before publication.
- [x] The research document records the observed commands and result.

**Dependencies:** None

**Files likely touched:**

- `fixtures/workspace-config-loader/`
- `docs/research/form-discovery-dx.md`

**Estimated scope:** Medium

### Task 2: Scaffold the workspace package without behavior

**Description:** Add the publishable workspace package, build/type-check setup,
and an empty public entry point. Do not add Angular, Nx, glob, or CLI behavior in
this task.

**Acceptance criteria:**

- [x] `@formly-contract/workspace` builds as ESM with declarations.
- [x] Its dependency graph includes schema/adapter but no Angular or Nx package.
- [x] Package metadata and exports follow the two existing public packages.

**Verification:**

- [x] `pnpm --filter @formly-contract/workspace build`
- [x] `pnpm lint`

**Dependencies:** Task 1

**Files likely touched:**

- `packages/workspace/package.json`
- `packages/workspace/tsconfig.json`
- `packages/workspace/tsconfig.build.json`
- `packages/workspace/src/index.ts`

**Estimated scope:** Medium

### Task 3: Define and validate config, source, and plugin contracts

**Description:** Specify the exact pre-1.0 root config, project config,
`FormContractSource`, form definition, scenario, resolved-config, and plugin
interfaces. Add runtime validation and deterministic precedence rules without
loading files yet.

**Acceptance criteria:**

- [x] `defineConfig` and `defineFormContractProject` are typed identity helpers.
- [x] Runtime validation rejects unknown keys, duplicate plugin IDs, invalid
      globs/paths, unsafe output locations, and malformed source definitions.
- [x] Integration presets can retain JSON-safe plugin options, while executable
      lifecycle hooks remain outside resolved configuration.
- [x] Configuration-only project descriptors may omit sources and resolve to an
      empty source inventory.
- [x] Precedence is documented as defaults, root config, project config, then
      explicit CLI override; supported arrays replace rather than deep-merge.

**Verification:**

- [x] Focused config validation tests cover valid and invalid inputs.
- [x] Equivalent inputs produce byte-identical resolved JSON-safe config.

**Dependencies:** Task 2

**Files likely touched:**

- `packages/workspace/src/config.ts`
- `packages/workspace/src/config.test.ts`
- `packages/workspace/src/source.ts`
- `packages/workspace/src/index.ts`

**Estimated scope:** Medium

### Task 3A: Define the versioned field-type profile contract (`REQ-PROFILE-01`)

**Description:** Promote only the approved, framework-neutral portion of the
field-type profile spike into a strict runtime DTO. Define semantic parts,
interaction vocabulary, value-domain projection, wrapper preconditions,
profile/driver identity, evidence, and unknowns without Angular or Playwright
types. This task begins only after the maintainer approves the DTO and profile
precedence decision.

**Acceptance criteria:**

- [x] Runtime validation rejects unknown keys, malformed identities/versions,
      duplicate parts, missing references, invalid value projections, and
      contradictory generic-driver capabilities.
- [x] The DTO distinguishes profile data from executable driver
      implementations and records stable profile/driver ID plus version.
- [x] Canonical serialization and hashing are deterministic and version
      sensitive.

**Verification:**

- [x] Focused schema tests cover every union branch and negative validation
      category.
- [x] Contract-domain source/completeness combinations and generic
      repeater/wrapper role-cardinality surfaces are enforced by regression
      tests.
- [x] Strict JSON validation rejects non-index array properties, and generic
      drivers reject interaction/value-shape combinations they cannot execute.
- [x] Equivalent registries produce byte-identical canonical output and hashes.

**Dependencies:** Task 3; maintainer approval of the v0.4 profile DTO and
precedence/conflict rules

**Files likely touched:**

- `packages/schema/src/field-type-profile.ts`
- `packages/schema/src/field-type-profile.test.ts`
- `packages/schema/src/index.ts`

**Estimated scope:** Medium

### Task 3B: Integrate project-owned profile registries (`REQ-PROFILE-01`)

**Description:** Let each project descriptor contribute a serializable
field-type profile registry, resolve it against Formly types/wrappers/approved
variants, and carry its canonical identity into resolved workspace
configuration. Root configuration controls policy and defaults but does not
become a central list of application field types.

**Acceptance criteria:**

- [x] Project profiles resolve deterministically with explicit conflict and
      unmapped-type diagnostics; no silent last-write-wins behavior exists.
- [x] Resolved configuration contains JSON-safe profile data and stable
      identities only, never Angular components or executable driver functions.
- [x] Profile registry identity participates in resolved configuration. Task 5
      carries that already-resolved identity into artifact provenance.

**Verification:**

- [x] Focused tests cover multiple projects, duplicate IDs, wrapper/variant
      conflicts, unmapped types, and changed profile versions.
- [x] A profile change changes the resolved hash while reordered equivalent
      input does not.

**Dependencies:** Task 3A

**Files likely touched:**

- `packages/workspace/src/config.ts`
- `packages/workspace/src/config.test.ts`
- `packages/compiler/src/field-type-profiles.ts`
- `packages/compiler/src/field-type-profiles.test.ts`
- affected public indexes

**Estimated scope:** Medium

### Task 3C: Define explicit cross-field effect configuration (`REQ-EFFECTS-01`)

**Description:** Define the smallest strict DTO for application-declared
cross-field effects and let project/form descriptors contribute those records.
Each effect identifies a stable trigger node/event, target node/property,
semantic kind, timing/readiness, optional condition rule, ordering, evidence,
and opacity. Derived string references, opaque signals, and scenario deltas are
separate evidence records and are not part of this first actionable slice.

**Acceptance criteria:**

- [x] Runtime validation rejects unknown keys, malformed identities, missing
      timing/readiness data, contradictory ordering, and non-declared authority.
- [x] Project/form configuration carries serializable effect data only and
      cannot embed callbacks, services, or executable readiness behavior.
- [x] Canonical serialization and hashing include effect identity/version and
      are stable under equivalent input ordering.

**Verification:**

- [x] Focused schema/config tests cover sync, async, conditional, invalid,
      duplicate, and unknown-field branches.
- [x] Tests prove derived dependency candidates and scenario deltas cannot be
      accepted as actionable effects.

**Dependencies:** Task 3B; the explicit-effect DTO, cycle-severity policy,
serializable readiness reference, and condition-rule linkage are approved for
the Task 3C authoring boundary. Task 5A still owns capability and endpoint
resolution semantics.

**Files likely touched:**

- `packages/schema/src/cross-field-effect.ts`
- `packages/schema/src/cross-field-effect.test.ts`
- `packages/workspace/src/config.ts`
- `packages/workspace/src/config.test.ts`
- affected public indexes

**Estimated scope:** Medium

## Phase 1: Generic workspace vertical slice

### Task 4: Discover root and project configs deterministically

**Description:** Load one root config, expand its project-config globs, apply
exclusions, load project descriptors, and return a sorted inventory with source
provenance. Discovery must not import arbitrary files outside matched configs.

**Acceptance criteria:**

- [x] Project configs across `apps`, `libs`, and `packages` are sorted by
      normalized workspace-relative path and stable project ID.
- [x] Duplicate project/source IDs fail before any form factory executes.
- [x] Discovery output records config paths and plugin identities without
      timestamps or environment-dependent ordering.

**Verification:**

- [x] Focused tests cover globs, exclusions, duplicates, empty workspaces, and
      paths containing spaces.
- [x] Consecutive discovery runs return identical canonical output.

**Dependencies:** Tasks 1 and 3

**Files likely touched:**

- `packages/workspace/src/load-config.ts`
- `packages/workspace/src/load-config.test.ts`
- `packages/workspace/src/discover-projects.ts`
- `packages/workspace/src/discover-projects.test.ts`
- `packages/workspace/src/index.ts`

**Estimated scope:** Medium

### Task 5: Generate one complete multi-project artifact set

**Description:** Add the first end-to-end runner. It enumerates each source,
validates stable form IDs, invokes declared extraction, writes canonical form
contracts under project-scoped output directories, and produces a deterministic
workspace index.

Implement this vertical slice in three reviewable increments:

1. **[x] Task 5.0 — artifact and declared-source contracts:** bump the form artifact
   to v0.4, add value-domain and resolved interaction-profile DTOs with strict
   validation/hashing, and require source factories to return the normalized
   declared Formly extraction input.
2. **[x] Task 5.1 — profile-aware extraction:** resolve the configured project
   registry during declared extraction and project registry identity,
   interaction metadata, value domains, provenance, and stable unmapped-type
   diagnostics into contracts.
3. **[x] Task 5.2 — runner and workspace index:** enumerate normalized sources,
   enforce global identities/output containment, write canonical artifacts,
   and emit the deterministic index.

**Acceptance criteria:**

- [x] One bulk factory-map source and one registry-adapter source generate
      contracts without individual root-config entries.
- [x] Form IDs are globally unique and output paths cannot escape the configured
      artifact directory.
- [x] The workspace index records contract hashes, source/project IDs, evidence,
      config/plugin/profile-registry identities, and diagnostics without model
      values.
- [x] Unmapped custom field types remain discoverable but non-operable and are
      reported with stable project/form/type provenance.

**Verification:**

- [x] Runner tests compare generated artifacts with canonical expectations.
- [x] Consecutive runs produce byte-identical files and index ordering.
- [x] A duplicate form ID and a throwing factory leave no falsely successful
      aggregate index.

**Dependencies:** Tasks 3B and 4

**Files likely touched:**

- `packages/workspace/src/run-workspace.ts`
- `packages/workspace/src/run-workspace.test.ts`
- `packages/workspace/src/workspace-index.ts`
- `packages/workspace/src/workspace-index.test.ts`
- `packages/workspace/src/index.ts`

**Estimated scope:** Medium

### Task 5A: Resolve explicit effects against generated contracts (`REQ-EFFECTS-01`)

**Description:** After form contracts and stable node IDs exist, validate each
declared effect against the generated node namespace, field-profile target and
readiness capabilities, condition rules, and deterministic cycle policy. Carry
only validated declared effects into artifacts and the workspace index.

**Acceptance criteria:**

- [x] Unknown endpoints, unsupported target/readiness capabilities, duplicate
      effect IDs, unresolved condition rules, and configured cycle violations
      fail with stable project/form/effect provenance. Duplicate IDs are strict
      config-schema failures; generated-contract failures are diagnostics.
- [x] Effect registry identity contributes to contract and workspace hashes;
      no model value or executable behavior enters artifacts.
- [x] Opaque behavior makes analysis completeness explicit; edge absence never
      proves independence or unreachability when coverage is incomplete.

**Verification:**

- [x] Focused integration tests cover valid sync/async effects, stable endpoint
      resolution, readiness/profile linkage, SCC diagnostics, and stale IDs.
- [x] Golden artifacts distinguish declared effects from dependency candidates,
      opaque signals, and observed scenario deltas.

**Dependencies:** Tasks 3C and 5

**Files likely touched:**

- `packages/compiler/src/resolve-effects.ts`
- `packages/compiler/src/resolve-effects.test.ts`
- `packages/workspace/src/run-workspace.ts`
- `packages/workspace/src/run-workspace.test.ts`
- workspace index/golden fixtures

**Estimated scope:** Medium

**Foundation decision (Task 5A.0):** field profiles own serializable target and
readiness capability declarations; per-form effect entries explicitly claim
complete or partial coverage. Generated contracts retain registry identity,
validated declared effects, and an analysis completeness record. Built-in
controls receive only conservative shape-derived target capabilities. Stable
condition-rule identities are compiler-derived from the owning node and rule
property; only serialized conditions may be referenced, and no executable rule
or readiness implementation enters artifacts. Warning-policy cycles remain in
the declared graph but make analysis explicitly incomplete. Workspace indexes
retain the full validated effect DTO so index-only consumers can reconstruct
ordering and readiness semantics.

### Task 6A: Ship the generic CLI

**Description:** Add a `formly-contracts` binary with `generate`, `list`, and
`check` commands over the workspace runner.

**Current status:** complete. The CLI exposes deterministic config inventory,
generation, and exact non-mutating artifact checks with stable output and exit
behavior.

**Acceptance criteria:**

- [x] `generate` writes the deterministic artifact set through the workspace
      runner.
- [x] `list` reports the inventory without running factories.
- [x] `check` validates committed/current artifacts.
- [x] Pilot `generate` usage and generation failures have stable exit codes and
      concise project/source/form/output provenance.
- [x] Pilot command help and failures omit stack traces and underlying callback
      details by default.

**Verification:**

- [x] CLI unit tests cover pilot `generate` parsing, forwarding, output, and exit
      behavior, including a real temporary workspace.
- [x] Focused CLI tests execute all three commands against temporary fixtures.

**Dependencies:** Task 5 for the `generate` pilot; Task 5A before Task 6A is
complete

**Files likely touched:**

- `packages/workspace/src/cli.ts`
- `packages/workspace/src/cli.test.ts`
- `package.json`

**Estimated scope:** Medium

### Task 6B: Prove the CLI in a consumer-shaped monorepo fixture

**Description:** Add a small synthetic Angular monorepo fixture containing one
app, a base Formly library, a reusable forms/custom-fields library, a consuming
feature library, a root config, and local project configs. Extend it with a
factory map and registry adapter when the CLI runner exists. Keep each fixture
module intentionally small and keep browser/runtime entry points separate from
Node-oriented discovery descriptors.

**Acceptance criteria:**

- [x] The fixture requires one root config and one config per project boundary,
      not one root entry per form.
- [x] Configuration-only app and base-Formly projects resolve without fake
      sources.
- [x] A feature form composes reusable fragments and the
      `cool-radio-btn-grp` custom field across library boundaries.
- [x] Angular production compilation proves Node-only discovery dependencies do
      not leak into the browser graph.
- [x] At least six forms are exposed through two bulk source patterns.
- [x] At least one project config registers one field profile reused by
      multiple form instances without per-form profile declarations.
- [x] At least one form declares an explicit effect whose endpoints resolve to
      generated stable node IDs and profile capabilities.
- [x] Generated artifacts and the workspace index match committed golden files.

**Verification:**

- [x] A linked-package smoke test executes `list`, `generate`, and `check`.
- [x] A packed-tarball smoke test executes `generate` outside this workspace.
- [x] `pnpm check` passes at Checkpoint A.

**Dependencies:** the Task 6A `generate` pilot for the implemented fixture
boundary; all Task 6A commands for the remaining linked smoke test

**Files likely touched:**

- `fixtures/angular-monorepo/package.json`
- `fixtures/angular-monorepo/formly-contracts.config.ts`
- `fixtures/angular-monorepo/apps/test-app/formly-contracts.project.ts`
- `fixtures/angular-monorepo/libs/formly-kit/formly-contracts.project.ts`
- `fixtures/angular-monorepo/libs/forms-kit/formly-contracts.project.ts`
- `fixtures/angular-monorepo/libs/feature-lib/formly-contracts.project.ts`

**Estimated scope:** Medium; form definitions may reuse existing synthetic
fixture exports rather than duplicate files

## Checkpoint A: Generic workspace pilot

- [x] One root config discovers at least three project configs.
- [x] Bulk sources generate deterministic declared contracts and a safe index.
- [x] Project-owned profile registries resolve deterministically and contribute
      their identity to the workspace index.
- [x] Explicit effects resolve against generated nodes and contribute their
      validated identity to form and workspace hashes.
- [x] Linked and packed packages work from isolated temporary consumers.
- [x] Full lint, tests, builds, demo, and documentation checks pass.
- [x] Maintainer reviewed the generic/workplace feedback and authorized the
      accepted Angular host implementation plan on 2026-08-27. Additional
      workplace UX feedback remains expected after the next pull-down test.

## Phase 2: Angular integration

### Task 7A: Publish the runtime-host contract and Angular package boundary

**Description:** Establish the versioned framework-neutral host contract first,
then make the workspace and Angular packages consume it. This parent task is
complete only after Tasks 7A.1–7A.3 pass; each child is a separate reviewable
slice and must leave generic consumers working.

#### Task 7A.1: Version portable runtime and dependency provenance

**Description:** Add schema-owned, path-free DTOs for the worker protocol,
runtime host, Jiti/Node toolchain, execution profile, and dependency snapshot.
Version workspace index/configuration hashing deliberately rather than hiding
the provenance migration inside worker changes.

**Acceptance criteria:**

- [x] Runtime provenance records exact tool/worker/Jiti/Node/profile/adapter
      identities plus platform/architecture and a relative selected-lockfile
      path with SHA-256 digest.
- [x] Portable DTOs reject absolute paths, module URLs, PIDs, timings, temporary
      directories, environment values, and other machine-local observations.
- [x] Project configuration hashes incorporate the runtime host and dependency
      snapshot; the root index incorporates the resulting project hashes.
- [x] The schema/version migration and compatibility behavior are explicit.

**Verification:**

- [x] Runtime-schema, canonical-serialization, hash-causality, path-redaction,
      and prior-version rejection/compatibility tests pass.
- [x] Existing form-artifact goldens remain byte-identical; index/configuration
      goldens migrate once and are deterministic across repeated runs.

**Dependencies:** Checkpoint A and the accepted
`docs/research/angular-jit-config-loading.md` decision

**Files likely touched:**

- `packages/schema/src/runtime-provenance.ts`
- `packages/schema/src/workspace-index.ts`
- focused schema tests and public export

**Estimated scope:** Medium

#### Task 7A.2: Publish the workspace runtime-host protocol

**Description:** Promote `@formly-contract/workspace` from the private prototype
to the publishable framework-neutral execution host. Add strict IPC and
parent-selected host-module descriptors plus public composition subpaths and a
packed private worker entry. No Angular dependency enters this package.

**Acceptance criteria:**

- [ ] The package has complete publish metadata and public runtime-host/CLI
      composition subpaths; its private worker entry is included in the tarball
      but cannot be selected by project config.
- [ ] Requests, inventory/approval/result messages, and host descriptors are
      strict versioned DTOs. Only the trusted parent resolves the absolute
      `file:` host URL used internally; it never enters portable output.
- [ ] Protocol version, host ID/version, operation, and JSON-safety failures use
      stable diagnostics before project code runs.
- [ ] Generic CLI/programmatic consumers remain Angular-free.

**Verification:**

- [ ] Protocol round-trip/negative tests and package-export tests pass.
- [ ] Linked and packed non-hoisted generic consumers load every public subpath
      without repository aliases.
- [ ] Dependency audit proves workspace depends only on framework-neutral
      compiler/schema surfaces.

**Dependencies:** Task 7A.1

**Files likely touched:**

- `packages/workspace/package.json`
- `packages/workspace/src/runtime-host/`
- `packages/workspace/src/index.ts`
- packed consumer smoke fixture

**Estimated scope:** Medium

#### Task 7A.3: Scaffold the dependency-light Angular host package

**Description:** Add the publishable Angular integration shell and its Node-safe
`./jit` wrapper. Fix peer ownership with a strict pnpm install matrix before any
runtime compatibility claim; the guarded compiler import itself belongs to Task
7C.

**Acceptance criteria:**

- [ ] `@formly-contract/angular` has a mandatory compatible workspace peer and
      no reverse dependency; Angular/Formly peer optionality is fixed by an
      explicit supported/unsupported install matrix.
- [ ] Importing `@formly-contract/angular/jit` performs no eager Angular import
      and returns a host descriptor relative to the installed Angular package.
- [ ] The unique future CLI/programmatic entry names are reserved without
      advertising an unimplemented generation path.

**Verification:**

- [ ] Package builds and import-without-root-Angular smoke tests pass.
- [ ] Linked, packed, hoist-disabled, missing-peer, incompatible-peer, and
      project-only-peer install cases match the documented matrix.
- [ ] Dependency audit proves `angular -> workspace -> compiler/schema`.

**Dependencies:** Task 7A.2

**Files likely touched:**

- `packages/angular/package.json`
- `packages/angular/tsconfig*.json`
- `packages/angular/src/jit.ts`
- install-matrix fixture/test

**Estimated scope:** Medium

### Task 7B: Defer every project config into a short-lived worker

**Description:** Replace parent-process project evaluation in three ordered
slices. The parent evaluates only the Node-safe root config; every project-owned
config, registry, factory, and framework object stays inside one disposable
child. Workers never publish final artifacts or the workspace index.

#### Task 7B.1: Split discovery and inventory before project evaluation

**Acceptance criteria:**

- [ ] Stage-one discovery expands and validates project config paths without
      importing them or claiming to know project/source IDs.
- [ ] Each serialized request carries canonical config/project/runtime-base and
      effective-tsconfig paths plus root policy and the parent-selected host.
- [ ] Exact root overrides support centralized configs with precedence: exact
      project override, root default, then absent.
- [ ] A child loads its project once, returns inventory, and waits; the parent
      rejects cross-project duplicate IDs before sending compile approval.

**Verification:**

- [ ] Import-spy, traversal/symlink, override-precedence, inventory-order, and
      duplicate-before-factory tests pass.
- [ ] `list` obtains inventory without invoking a form factory.

**Dependencies:** Task 7A.2

**Files likely touched:**

- `packages/workspace/src/discover-projects.ts`
- `packages/workspace/src/config.ts`
- `packages/workspace/src/project-worker.ts`
- focused discovery/protocol tests

**Estimated scope:** Medium

#### Task 7B.2: Enforce the trusted-local worker lifecycle

**Acceptance criteria:**

- [ ] Workers use direct `process.execPath` spawning with no shell, a scrubbed
      allowlisted environment, validated IPC, explicit timeout/termination, and
      no authority to write final outputs.
- [ ] Inventory/approve/compile is one lifecycle; live configs and factories do
      not cross IPC or reload between phases.
- [ ] Malformed messages, early exit, late failure, timeout, or host mismatch
      terminate the child and prevent publication.
- [ ] `trusted-local-v1` provenance says network is not enforced; selecting
      unavailable `isolated-ci-v1` fails closed.

**Verification:**

- [ ] Environment-secret, forbidden write/child/worker, malformed IPC, timeout,
      crash, and cleanup tests pass without weakening the trusted-code caveat.
- [ ] Reversed child completion produces identical validated result ordering.

**Dependencies:** Task 7B.1

**Files likely touched:**

- `packages/workspace/src/project-worker.ts`
- `packages/workspace/src/worker-supervisor.ts`
- `packages/workspace/src/run-workspace.ts`
- focused lifecycle fixtures/tests

**Estimated scope:** Medium

#### Task 7B.3: Make aggregation and publication failure-safe

**Acceptance criteria:**

- [ ] One generation lock spans discovery through publication; lock/package
      metadata snapshots are rechecked before commit.
- [ ] The parent validates/rehashes child results and sorts independently of
      completion order.
- [ ] Content-addressed artifacts publish before an atomic index-last replace;
      worker failure cannot change the prior index.
- [ ] Filesystem failure may leave only unreferenced artifacts. Prior index
      authority, cleanup, and idempotent rerun behavior are documented/tested.

**Verification:**

- [ ] Concurrent generation, mid-run dependency mutation, artifact/index fault
      injection, orphan cleanup, and rerun tests preserve the prior index.
- [ ] Node-safe form-artifact bytes remain unchanged; provenance-versioned
      index/configuration goldens migrate intentionally and remain canonical.

**Dependencies:** Task 7B.2 and Task 7A.3

**Files likely touched:**

- `packages/workspace/src/run-workspace.ts`
- `packages/workspace/src/publication.ts`
- focused aggregation/publication tests
- linked/packed consumer fixtures

**Estimated scope:** Medium

### Task 7C: Add the guarded Angular JIT runtime host

**Description:** Implement the Angular-owned runtime for conventional
peer-correct Angular graphs without claiming complete transitive singleton
enforcement.

#### Task 7C.1: Resolve and reserve the Angular runtime safely

**Acceptance criteria:**

- [ ] Core/compiler resolve without tsconfig aliases from the explicit project
      runtime base; real package roots/metadata and exact versions agree before
      compiler import.
- [ ] Project-context and core-context compiler resolution identify the same
      real package, and one pair is reserved atomically before global mutation.
- [ ] Fully inherited exact, `@angular/*`, catch-all, and exported-subpath
      tsconfig mappings are rejected for reserved runtime packages.
- [ ] Missing, mismatch, conflict, alias, ambient-facade, and unsupported-graph
      cases use stable pre-publication diagnostics.

**Verification:**

- [ ] Resolver/realpath/symlink/version/ambient/reservation tests pass against
      strict non-hoisted and centralized-config fixtures.

**Dependencies:** Tasks 7A.3 and 7B.3

**Files likely touched:**

- `packages/angular/src/runtime-resolution.ts`
- `packages/angular/src/runtime-resolution.test.ts`
- resolver fixtures

**Estimated scope:** Medium

#### Task 7C.2: Preload the compiler and load the project without fallback

**Acceptance criteria:**

- [ ] Core/compiler use Jiti's pinned native-module path; environment/Jiti
      overrides cannot restore transformation fallback.
- [ ] Compiler imports before the first partial declaration, and any failed or
      partial import poisons/exits the worker without retry.
- [ ] Non-Angular aliases still use the selected project tsconfig.
- [ ] `formly-contracts-angular` and `runAngularWorkspace` compose the workspace
      parent with the installed Angular host and never retain Angular state in
      the caller/Nx daemon.

**Verification:**

- [ ] Retained tests pin Jiti tsconfig-before-alias and native-failure behavior.
- [ ] Packed CLI/programmatic consumers succeed when compiler visibility exists
      only from the selected project.

**Dependencies:** Task 7C.1

**Files likely touched:**

- `packages/angular/src/project-host.ts`
- `packages/angular/src/cli-main.ts`
- `packages/angular/src/jit.ts`
- focused host/CLI tests

**Estimated scope:** Medium

#### Task 7C.3: Prove the peer-correct compatibility boundary

**Acceptance criteria:**

- [ ] V1 requires Angular-consuming libraries to use peers and explicitly
      excludes private/bundled copies, custom loaders, preserve-symlinks, and
      alternate absolute runtime imports.
- [ ] Different projects/Angular versions run in separate children; no compiler
      facade or Angular cache enters the parent.
- [ ] ESM/TS/CJS and supported Node/Angular/Formly/package-manager combinations
      are recorded from maintained fixtures, not inferred broadly.

**Verification:**

- [ ] Root/project, project-only dependency, same-realpath symlink,
      distinct-copy, mismatch, ambient-facade, and partial-evaluation fixtures
      pass their documented outcomes.
- [ ] A transitive private-copy fixture remains explicitly unsupported and
      prevents a whole-graph singleton claim.
- [ ] Full Angular install matrix, packed consumers, and `pnpm check` pass.

**Dependencies:** Task 7C.2

**Files likely touched:**

- Angular runtime-host fixtures
- packed consumer/integration tests
- compatibility documentation

**Estimated scope:** Medium

### Task 7D: Productize distributed Angular source providers

**Description:** Add the Angular integration package with a multi token,
`provideFormContractSource`, and a deterministic catalog. Prove NgModule and
standalone provider contribution using groups rather than individual root
registrations.

**Acceptance criteria:**

- [ ] Separate features contribute source groups through Angular public provider
      APIs.
- [ ] The catalog sorts IDs, rejects duplicates, and returns fresh instances.
- [ ] The package declares Angular/Formly peers without adding them to
      `workspace`.

**Verification:**

- [ ] Focused Angular provider tests cover NgModule, standalone, optional-empty,
      and duplicate cases.
- [ ] Angular production compilation succeeds.

**Dependencies:** Task 7A.3

**Files likely touched:**

- `packages/angular/src/provider.ts`
- `packages/angular/src/provider.test.ts`
- `packages/angular/src/index.ts`
- synthetic feature-provider test modules

**Estimated scope:** Medium

### Task 8: Compile trusted Angular scenarios from a project source

**Description:** Let an Angular project config declare the controlled imports,
providers, and synthetic scenarios needed to obtain the application-equivalent
`FormlyFormBuilder`. Compile each scenario through the existing allowlisted
adapter without retaining the injector or live field tree.

**Acceptance criteria:**

- [ ] A dynamic form resolves visibility, required/readonly state, and options
      under two synthetic scenarios.
- [ ] Lazy-feature providers are included explicitly by the project source; the
      runner does not assume root DI can enumerate unloaded features.
- [ ] Artifacts record resolved evidence and scenario identity but no model or
      form-state values beyond explicitly approved JSON-safe metadata.

**Verification:**

- [ ] Focused TestBed tests prove eager, lazy-feature-import, custom type, and
      factory-failure behavior.
- [ ] Declared and resolved artifacts remain separate and deterministic.
- [ ] `pnpm check` passes at Checkpoint B.

**Dependencies:** Tasks 7C.3 and 7D

**Files likely touched:**

- `packages/angular/src/compile-project.ts`
- `packages/angular/src/compile-project.test.ts`
- `packages/angular/src/config.ts`
- `packages/angular/src/index.ts`
- synthetic Angular integration fixture

**Estimated scope:** Medium

### Task 8B: Generate Angular-assisted field-profile inventory and scaffolds (`REQ-AUTHOR-01`)

**Description:** Use the configured Angular generation host to inventory the
effective Formly type/component/inheritance/default/wrapper surface and produce
evidence-tagged, review-required profile scaffolds from public Angular
reflection and optional source-template analysis. The generator must preserve
unknowns and never approve inferred interaction semantics.

**Acceptance criteria:**

- [ ] Inventory distinguishes raw Formly declarations from effective inherited
      components, defaults, and wrappers in the configured project injector.
- [ ] Native-backed candidates are tagged `derived` with explicit unknowns;
      opaque children, parse failures, dynamic roles, and multi-step widgets do
      not become actionable profiles automatically.
- [ ] The report lists registered custom types with missing profiles and lazy
      feature registrations absent from the configured generation host.

**Verification:**

- [ ] Focused tests retain the native-backed, overlay, autocomplete, table,
      repeater, opaque-child, wrapper, variant, and inherited-type matrix from
      the research spike.
- [ ] Angular production compilation and `pnpm check` pass.

**Dependencies:** Tasks 3B and 8

**Files likely touched:**

- `packages/angular/src/field-type-authoring.ts`
- `packages/angular/src/field-type-authoring.test.ts`
- `packages/angular/src/index.ts`
- synthetic Angular integration fixture

**Estimated scope:** Medium

## Checkpoint B: Angular consumer pilot

- [ ] Root discovery imports no project configs; one fresh worker contains each
      project's config, sources, factories, and Angular runtime state.
- [ ] Packed, non-hoisted Angular CLI/programmatic consumers resolve the compiler
      from the selected project rather than workspace/root hoisting.
- [ ] The peer-correct graph limitation, reserved-alias failures, and unsupported
      private-copy fixture are explicit and tested.
- [ ] Trusted-local provenance says network is not enforced. Selecting
      `isolated-ci-v1` before its external provider is installed fails closed
      with `WORKER_ISOLATION_UNAVAILABLE`; network denial is a later Task 11C
      gate rather than a Checkpoint B claim.
- [ ] Multiple Angular feature sources compile through one project config.
- [ ] Both NgModule and standalone contribution are documented.
- [ ] Trusted scenario execution is isolated from CLI/MCP query handling.
- [ ] A work-like synthetic dynamic form demonstrates locator and state results.
- [ ] Project configuration supplies a reviewed custom-field profile registry;
      Angular inventory/scaffolding reports coverage and unmapped types without
      automatically authorizing derived candidates.
- [ ] The complex-widget research matrix remains the acceptance fixture for
      profiles, scenario values, wrappers, and unknowns.
- [ ] Maintainer approves the Angular host API before Nx packages depend on it.

## Phase 3: Nx integration

### Task 9: Fix the supported Nx version contract

**Description:** Inspect the workplace workspace with `nx report`, choose the
initial supported major or range, and record the CreateNodes API shape and Node
compatibility. Do not claim broad Nx support without a matching fixture.

**Acceptance criteria:**

- [ ] The workplace Nx, Node, Angular, and package-manager versions are recorded
      without private source or credentials.
- [ ] ADR 0007 names the initial Nx compatibility claim.
- [ ] The package peer range and test fixture use the same API generation.

**Verification:**

- [ ] Official Nx compatibility guidance is cited.
- [ ] A maintainer approves the supported range before implementation.

**Dependencies:** Checkpoint B and access to version metadata from the workplace
workspace

**Files likely touched:**

- `docs/decisions/0007-distributed-workspace-discovery.md`
- `docs/research/form-discovery-dx.md`

**Estimated scope:** Small

### Task 10A: Scaffold the optional Nx integration package

**Description:** Add the publishable Nx package, supported peer range, build
configuration and empty plugin exports without
implementing inference.

**Acceptance criteria:**

- [ ] `@formly-contract/nx` builds against the approved Nx major.
- [ ] Nx remains a peer/optional integration dependency and does not enter
      workspace runtime dependencies.
- [ ] Package exports reserve the plugin entry point without executor behavior.

**Verification:**

- [ ] `pnpm --filter @formly-contract/nx build`
- [ ] Package metadata validation passes.

**Dependencies:** Task 9

**Files likely touched:**

- `packages/nx/package.json`
- `packages/nx/tsconfig.json`
- `packages/nx/tsconfig.build.json`
- `packages/nx/src/index.ts`

**Estimated scope:** Medium

### Task 10B: Infer one aggregate contract target on a coordinator project

**Description:** Add the optional Nx plugin and use the supported CreateNodes API
to recognize the root/project marker files as inert inputs, then attach exactly
one `form-contracts` target to an explicitly configured existing Nx coordinator
project. The plugin must not evaluate Formly Contract config in the Nx daemon.
The target runs the workspace-wide parent once so inventory, cross-project
duplicate validation, the generation lock, and index-last publication retain
one owner. Fine-grained per-project contract caching is outside the first Nx
contract.

**Acceptance criteria:**

- [ ] Plugin options select one existing coordinator project and reject missing,
      ambiguous, or multiply configured coordinators.
- [ ] Exactly that project receives the target; form-owning projects do not each
      receive a publisher target.
- [ ] Target inputs include the root config, every inert project marker/config,
      declared owned sources, relevant dependency production inputs, lockfile,
      and tool/runtime package versions.
- [ ] Target outputs name the complete workspace artifact directory and index,
      with no per-project publisher collision.
- [ ] Inventory returned by the runner is checked against the project inputs the
      plugin registered; drift fails with a stable diagnostic rather than
      creating an under-keyed cache entry.

**Verification:**

- [ ] CreateNodes unit tests cover apps, libraries, packages, exclusions,
      missing/duplicate coordinators, and multiple form-owning projects.
- [ ] `nx show project <coordinator> --json` shows one aggregate target, while
      other fixture projects show none.

**Dependencies:** Task 10A

**Files likely touched:**

- `packages/nx/src/plugin.ts`
- `packages/nx/src/plugin.test.ts`
- `packages/nx/src/index.ts`
- `nx.json` fixture configuration

**Estimated scope:** Medium

### Task 11A: Execute workspace generation through Nx

**Description:** Add an executor that delegates to the workspace runner without
duplicating discovery, extraction, or artifact behavior. One executor invocation
owns the complete workspace run; it does not fan out publication to Nx project
tasks.

**Acceptance criteria:**

- [ ] The executor delegates compilation rather than duplicating workspace
      logic.
- [ ] One invocation performs all project inventory, duplicate validation,
      compilation, hashing, locking, and index-last publication through the
      workspace runner.
- [ ] Executor options expose only Nx-specific project/config/output selection;
      workspace policy remains in the typed config.

**Verification:**

- [ ] Executor tests preserve exit codes and artifact paths.
- [ ] Executor integration test returns the workspace runner's diagnostics and
      output metadata.

**Dependencies:** Task 10B

**Files likely touched:**

- `packages/nx/src/executors/generate.ts`
- `packages/nx/src/executors/generate.test.ts`

**Estimated scope:** Small

### Task 11B: Add idempotent Nx setup generators

**Description:** Add generators that install/preserve the root config and add a
local project marker without editing a central form list.

**Acceptance criteria:**

- [ ] `init` creates or preserves one root config and registers the plugin.
- [ ] `add-project` creates a local project config and never overwrites existing
      source choices without an explicit flag.
- [ ] Both generators are idempotent.

**Verification:**

- [ ] Generator tests assert exact file changes for empty, configured, and
      conflicting workspaces.
- [ ] A dry-run mode reports changes without writing them.

**Dependencies:** Task 11A

**Files likely touched:**

- `packages/nx/src/generators/init.ts`
- `packages/nx/src/generators/add-project.ts`
- generator schema files
- `packages/nx/src/generators/generators.test.ts`

**Estimated scope:** Medium

### Task 11C: Add an external `isolated-ci-v1` execution provider

**Description:** Define the workspace-owned, versioned external-sandbox provider
contract and add one maintained CI realization that can enforce network denial.
The trusted parent selects the provider; project configuration cannot supply an
executable provider module or command. Node's Permission Model may add local
guardrails but is never treated as the network boundary.

**Acceptance criteria:**

- [ ] Provider capability negotiation reports read/write/process/network
      enforcement and fails closed with `WORKER_ISOLATION_UNAVAILABLE` when
      `isolated-ci-v1` is requested without the required capabilities.
- [ ] The maintained CI provider permits only declared fixture/package inputs,
      an ephemeral output/staging area, validated IPC, and the selected runtime;
      it receives no inherited credential environment.
- [ ] Only `isolated-ci-v1` provenance may report enforced network denial;
      `trusted-local-v1` continues to report `network: not-enforced`.
- [ ] The provider returns the same versioned project inventory/result protocol
      and never writes the final workspace index directly.

**Verification:**

- [ ] Unavailable, version-mismatch, malformed-capability, undeclared-read,
      forbidden-write/process, credential-scrubbing, and denied-network probes
      fail with stable diagnostics before publication.
- [ ] The same fixture contract/index bytes result under trusted-local and
      isolated-CI profiles apart from intentionally hashed execution provenance.
- [ ] `pnpm check`, the maintained sandbox smoke, and packed-tarball consumer
      tests pass at Checkpoint C.

**Dependencies:** Checkpoint B and Task 11A; it can proceed in parallel with
Task 11B and Tasks 12A–12B after the executor boundary is fixed

**Files likely touched:**

- `packages/workspace/src/isolation-provider.ts`
- `packages/workspace/src/execution-profiles.ts`
- `packages/workspace/src/isolation-provider.test.ts`
- maintained CI sandbox fixture and workflow

**Estimated scope:** Medium

### Task 12A: Scaffold the supported Nx fixture shell

**Description:** Add the smallest real Nx workspace shell using the approved Nx
major, root config, package manager, and plugin registration. Do not add form
projects or cache assertions yet.

**Acceptance criteria:**

- [ ] The fixture uses the supported Nx major and package manager without
      unrelated generators or UI dependencies.
- [ ] Root workspace and Formly contract configs install and load successfully.
- [ ] No application code or UI framework is required by the fixture shell.

**Verification:**

- [ ] Fixture install and `nx show projects` succeed.
- [ ] The configured plugin loads without adding targets to an empty workspace.

**Dependencies:** Task 11B

**Files likely touched:**

- `fixtures/nx-workspace/package.json`
- `fixtures/nx-workspace/nx.json`
- `fixtures/nx-workspace/formly-contracts.config.ts`

**Estimated scope:** Medium

**Anchor status:** A real Nx `23.1.1`/Angular `20.3.29` four-project workspace
is now installed, discoverable through `nx show projects`, and production-build
capable. Plugin registration remains pending on Tasks 10–11.

### Task 12B: Add form-owning and unrelated Nx fixture projects

**Description:** Add three minimal projects: one form-owning application, one
shared form library it depends on, and one intentionally unrelated library.
Keep project configs and synthetic forms colocated in one small file per project,
and select the application as the sole aggregate-target coordinator.

**Acceptance criteria:**

- [ ] Two projects own forms and one project is intentionally unrelated.
- [ ] Exactly one aggregate target and the ordinary dependency edge are visible
      through `nx show`; form-owning libraries receive no publisher target.
- [ ] A baseline aggregate run creates deterministic workspace artifacts and a
      globally validated index.

**Verification:**

- [ ] `nx run <coordinator>:form-contracts` succeeds and invokes one workspace
      generation.
- [ ] Baseline artifact hashes are identical across two clean runs.

**Dependencies:** Task 12A

**Files likely touched:**

- `fixtures/nx-workspace/apps/demo/formly-contracts.project.ts`
- `fixtures/nx-workspace/libs/forms/formly-contracts.project.ts`
- `fixtures/nx-workspace/libs/unrelated/project.json`
- fixture baseline artifact/index files

**Estimated scope:** Medium

**Anchor status:** The workspace already contains application, feature,
shared-form, and Formly-base projects with the expected static dependency chain
and two representative source definitions. The aggregate contract target,
workspace artifacts, and the intentionally unrelated invalidation case remain
pending on the Nx package.

### Task 12C: Prove aggregate caching and affected execution end to end

**Description:** Build a minimal Nx fixture with three projects and verify cold,
cached, changed-project, shared-dependency, and unaffected runs against real
artifact outputs.

**Acceptance criteria:**

- [ ] A second unchanged aggregate run is restored from cache.
- [ ] Changing any declared form-owning project or shared dependency reruns the
      one aggregate target.
- [ ] Changing an unrelated project does not select or invalidate the aggregate
      target.
- [ ] Changing root contract policy invalidates the aggregate target.

**Verification:**

- [ ] End-to-end commands and expected affected project sets are asserted in CI.
- [ ] `nx affected -t form-contracts` selects only the coordinator when a
      relevant input changes and selects nothing for the unrelated fixture.
- [ ] Tests state explicitly that v1 caches the workspace generation as one unit;
      per-project contract shards are not claimed.

**Dependencies:** Task 12B and Task 11C

**Files likely touched:**

- `packages/nx/src/e2e.test.ts`
- CI workflow for the supported Nx fixture

**Estimated scope:** Medium

**Anchor status:** The ordinary Angular production target is cacheable and a
second identical run has been demonstrated as a local Nx cache hit. Aggregate
contract-target behavior remains pending until the inferred target/executor
exists.

## Checkpoint C: Workplace-ready discovery path

- [ ] A new form-owning Nx project needs only a local project config.
- [ ] Existing registries and factory maps can be adapted in bulk.
- [ ] Generic, Angular, and Nx package boundaries remain acyclic and optional.
- [ ] Exactly one coordinator-owned aggregate target preserves workspace-wide
      duplicate validation/publication, and its cached/affected behavior is
      demonstrated rather than inferred.
- [ ] `isolated-ci-v1` proves external network denial and fails closed when its
      provider is unavailable; trusted-local output never makes that claim.
- [ ] Install, configuration, troubleshooting, and migration docs are complete.
- [ ] A sanitized workplace pilot confirms integration effort before a broader
      rollout.

## Phase 4: Optional migration capture

### Task 13: Specify runtime capture identity and privacy

**Description:** Define how an enabled dev/test Formly extension identifies root
builds, labels evidence, redacts state, deduplicates captures, and reports
incomplete coverage. Record the decision before implementation.

**Acceptance criteria:**

- [ ] No model values, services, controls, functions, or live fields cross the
      projection boundary.
- [ ] Stable application-provided IDs outrank generated temporary IDs.
- [ ] Captured-only, declared-only, and matched forms remain distinguishable.

**Verification:**

- [ ] A dedicated specification contains examples and threat cases.
- [ ] Maintainer approves the privacy and evidence rules.

**Dependencies:** Checkpoint C

**Files likely touched:**

- `docs/runtime-capture-spec.md`
- `docs/decisions/0008-runtime-capture-boundary.md`

**Estimated scope:** Small

### Task 14: Add capture and reconciliation as experimental Angular exports

**Description:** Implement the Formly extension and a reconciliation report that
helps a legacy application find forms built at runtime but missing from declared
project sources.

**Acceptance criteria:**

- [ ] Capture is disabled unless explicitly configured in a dev/test provider.
- [ ] Root builds project immediately through the existing allowlist and do not
      retain live objects.
- [ ] The report states that capture coverage is incomplete and lists unmatched
      IDs deterministically.

**Verification:**

- [ ] Tests cover repeated builds, hidden forms, temporary IDs, redaction, and
      production-disabled behavior.
- [ ] Browser/test harness exercise produces the documented reconciliation
      report.

**Dependencies:** Task 13

**Files likely touched:**

- `packages/angular/src/capture-extension.ts`
- `packages/angular/src/capture-extension.test.ts`
- `packages/angular/src/reconcile.ts`
- `packages/angular/src/reconcile.test.ts`
- `packages/angular/src/index.ts`

**Estimated scope:** Medium

## Phase 5: Release and review

### Task 15A: Document the generic workspace consumer path

**Description:** Finalize the workspace package README, root adoption guide, and
architecture overview for generic config discovery and bulk source adapters.

**Current status:** the root README, workspace configuration reference, and
workplace pilot guide cover `list`, `generate`, and `check`; linked and packed
temporary consumers exercise the CLI. A standalone workspace package README
and polished empty-directory release walkthrough remain before this release
task is complete.

**Acceptance criteria:**

- [ ] A generic guide starts with an empty consumer directory and ends with
      deterministic artifacts from multiple project configs.
- [ ] Workspace docs explain package purpose, config precedence, safety, and
      explicit limitations.
- [ ] Examples distinguish implemented behavior from optional integrations.

**Verification:**

- [ ] Documentation checks and generic example command smoke tests pass.

**Dependencies:** Checkpoint C

**Files likely touched:**

- `packages/workspace/README.md`
- root `README.md`
- `docs/architecture-overview.md`

**Estimated scope:** Medium

### Task 15B: Document Angular, Nx, and migration integrations

**Description:** Finalize the Angular and Nx package READMEs plus focused
consumer guides for provider composition, trusted scenarios, the one aggregate
Nx target, affected execution, and optional migration capture.

**Acceptance criteria:**

- [ ] Each integration package explains when to install it and what it excludes.
- [ ] A complete Angular/Nx guide starts with an empty fixture and ends with
      deterministic artifacts and affected execution.
- [ ] Capture is documented as incomplete and experimental when included.

**Verification:**

- [ ] Documentation checks and Angular/Nx example command smoke tests pass.
- [ ] Every command shown is exercised by a maintained fixture.

**Dependencies:** Task 15A; Task 14 only if capture is included in the same
release documentation

**Files likely touched:**

- `packages/angular/README.md`
- `packages/nx/README.md`
- Angular consumer guide
- Nx consumer guide
- runtime capture guide if included

**Estimated scope:** Medium

### Task 15C: Prove the publishable package set

**Description:** Update release manifests/workflows and run packed-tarball
consumer smoke tests for the five intended public packages.

**Acceptance criteria:**

- [ ] The release manifest contains only schema, compiler, workspace, Angular,
      and Nx packages for this increment.
- [ ] Peer dependencies and optional integration dependencies install without
      pulling Angular or Nx into generic consumers.
- [ ] Tarballs contain declarations, runtime files, READMEs, and licenses only.

**Verification:**

- [ ] Packed tarballs install and run in generic, Angular, and Nx fixtures.
- [ ] `pnpm lint`, `pnpm test`, `pnpm build`, demo, docs, and audit gates pass.

**Dependencies:** Task 15B

**Files likely touched:**

- release manifest/workflow files
- package manifests
- pack/publish smoke tests

**Estimated scope:** Medium

### Task 15D: Run fresh-context independent review

**Description:** Prepare the implementation and plan for an independent senior
maintainer review, remediate validated findings, and record final evidence.

**Acceptance criteria:**

- [ ] The reviewer receives the accepted ADR, plan, scoped diff, public API, and
      verification evidence without author conversation history.
- [ ] All high-confidence findings are fixed or explicitly accepted with
      maintainer rationale.
- [ ] Final docs and compatibility claims match the shipped packages.

**Verification:**

- [ ] Independent-review artifact and remediation ledger are retained.
- [ ] Full repository and consumer-fixture gates pass after remediation.

**Dependencies:** Task 15C

**Files likely touched:**

- independent-review planning artifacts
- files named by validated review findings only

**Estimated scope:** Medium

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Config loader cannot resolve workplace aliases or Angular imports | High | Run Task 1 before public API work; keep compiled/JS source adapter fallback |
| Root config becomes a nondeterministic arbitrary-code surface | High | Trusted local/CI boundary, runtime validation, explicit plugin imports, recorded identities, no MCP execution |
| Nx version API churn expands scope | High | Gate on workplace `nx report`; support one confirmed major first; isolate Nx package |
| Lazy modules appear registered but are not visible | High | Discover project markers outside Angular; require explicit feature imports or runtime capture |
| Bulk adapter executes real services/data | High | Fresh synthetic factories, no-network fixtures, structured-clone inputs, immediate allowlist projection |
| Workspace index leaks model or environment information | High | Allowlisted index schema, privacy tests, no raw inputs or timestamps |
| Package ecosystem fragments too early | Medium | Keep config/runner/CLI in `workspace`; add only Angular and Nx integration packages |
| 100-form runs become slow | Medium | Bounded project workers inside one deterministic generation, aggregate Nx caching for v1, and optional shard design only after global-validation semantics are preserved |
| Project/form IDs collide across products | Medium | Global deterministic duplicate gate before artifact success |
| Migration capture is mistaken for completeness | Medium | Explicit incomplete status and separate evidence/inventory reports |

## Open questions requiring maintainer or workplace evidence

1. Which Nx major version does the workplace monorepo use?
2. Do existing products already expose registries, factory maps, route metadata,
   or naming conventions that a bulk adapter can reuse?
3. Which path aliases and TypeScript module modes must project configs load?
4. Should workspace artifacts be committed, ignored and uploaded by CI, or both
   depending on environment?
5. Which diagnostic codes should fail workplace CI versus remain warnings?
6. Is runtime capture needed for the first workplace pilot, or can it remain a
   later migration tool?

## Remaining approval and workplace-evidence gates

- [ ] Formally accept or revise ADR 0007, which remains `Proposed` even though
      its generic configuration boundary is implemented.
- [x] Use Checkpoint A as the first shipping target.
- [x] Keep Angular resolved scenarios in Checkpoint B rather than requiring them
      for the first generic workplace pilot.
- [ ] Supply the workplace Nx version before Phase 3 compatibility claims or
      implementation begin.
