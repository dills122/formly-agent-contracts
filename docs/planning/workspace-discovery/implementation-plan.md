# Implementation Plan: Distributed Workspace Form Discovery

Status: in progress. Tasks 1–6B, Checkpoint A, and Task 7A.1 are implemented
and verified. Completed work includes project-owned field-type profiles and
cross-field effects, resolved effect projection, deterministic workspace
artifacts/indexes, all three generic CLI commands, canonical Angular-fixture
goldens, linked/packed consumer smokes, and the schema-owned portable
runtime/dependency provenance foundation.

The RH-01 through RH-05 research packets are approved planning evidence, not
implemented product behavior. `RH06-DOC` and `CTX-0A` through `CTX-0D` are
complete. Under the reconciled dependency order, `CTX-1`, `DRV-0`, and Task
7A.2 (`HOST-1`) are ready. `AUTH-0` is also ready for explicit maintainer
approval of proposed ADR 0011; AUTH-dependent implementation remains gated
until that approval. Each other producer's exact prerequisites and status
remain in the execution index. Application
factory execution is separately blocked on `oci-rootless-v1`; neither the
trusted local worker nor the future `isolated-ci-v1` config worker satisfies
that gate.

Related research:
[Scalable Form Discovery and Registration](../../research/form-discovery-dx.md)

Profile architecture research:
[v0.4 Field-Type Adapter Research](../../research/v0.4-field-type-adapter.md)

Controlled Angular loader research:
[Angular JIT/config loading in pnpm and Nx monorepos](../../research/angular-jit-config-loading.md)

Canonical hardening decisions and scheduler:
[RH-06 Agent Context Hardening Reconciliation](../agent-context-hardening/rh-06-reconciliation.md)
and
[Agent Context Hardening Execution Index](../agent-context-hardening/execution-index.md)

Proposed decision:
[ADR 0007](../../decisions/0007-distributed-workspace-discovery.md)

## Overview

Build a typed workspace layer that discovers project-local Formly contract
sources across applications, libraries, and packages. The first vertical slice
must turn one root config and several project configs into deterministic
contract artifacts without Angular or Nx coupling. Project-owned raw
field-type profile registries are the implemented legacy input, while versioned
profile DTOs remain in the schema package and profile resolution remains in the
compiler. Proposed ADR 0011 moves normal authoring to workspace-level named
Formly environments and compact reusable-library adapters that lower
deterministically to that same canonical registry. Angular and Nx integrations
then add distributed providers, trusted JIT scenario compilation, a separate
AOT environment inventory/conformance lane, generated canonical registries,
optional migration scaffolds, and affected execution.
Source lineage, behavior evidence, and factory/value production follow their
own RH-06 gates and join through pinned sibling artifacts. Runtime capture
remains an optional migration phase.

The plan preserves the existing schema and extraction boundaries. No task may
silently execute application code from an MCP request, infer arbitrary form
roots, serialize model values, or invent selectors.

## Architecture decisions

- Add only three integration packages in this workspace increment:
  `workspace`, `angular`, and `nx`. The later MCP/Playwright consumer packages
  belong to the separate agent-context delivery plan.
- Keep configuration, discovery, runner, and CLI together in `workspace` until
  independent consumers justify more packages.
- Use root config for workspace policy and project config for local ownership.
- Pending `AUTH-0`/ADR 0011 approval, put named Formly environments and global
  authoring inputs in root config, let projects select one exact environment,
  and require reusable field libraries to contribute compact reviewed adapters
  through the same catalog/helper used by production registration. Third-party
  registrations use explicit reviewed binding adapters. Keep project
  `fieldTypeProfiles` only as a mutually exclusive legacy input.
- Put framework-neutral profile DTOs/validation in `@formly-contract/schema`,
  Formly registration/profile resolution in `@formly-contract/compiler`, and
  Angular inventory and scaffold generation in the optional `angular` package.
- Store only serializable profiles and stable driver IDs/versions in contracts;
  executable Playwright drivers remain outside this increment.
- Treat source catalogs as the unit of integration so one adapter can expose
  many forms.
- Use Jiti only inside the guarded trusted config/JIT worker after its retained
  compatibility gate. The AOT authoring browser uses an Angular CLI/Nx
  application target and is a different execution profile.
- Keep Angular and Nx optional; neither enters `@formly-contract/schema` or the
  runtime dependency surface of `@formly-contract/compiler`.
- Preserve one workspace-wide orchestrator and publication boundary. The first
  Nx integration adds exactly one aggregate target to an explicitly selected
  coordinator project; it does not run or publish one contract generation per
  form-owning project.
- Treat Nx as optional project enumeration, scheduling, caching, and affected
  execution. Nx never defines form IDs, source-use identity, journey meaning,
  behavior authority, or artifact freshness.
- Treat capture as incomplete migration evidence, never authoritative declared
  inventory.

## RH-06 status and authority boundary

Status words in the future sections are normative:

- **Implemented** means the named repository behavior exists and has retained
  verification evidence.
- **Approved research** means the design is decision-ready but no production
  behavior is implied.
- **Pending** means a predecessor or acceptance gate is not complete.
- **Blocked** means a named safety or feasibility gate has failed or has not yet
  been demonstrated; downstream implementation must not begin.

Form Contract `0.4.0` remains the implemented semantic compatibility boundary.
Source lineage, journeys, normalized behavior/scenario evidence, Angular
authoring reports, factory execution evidence, and agent-context manifests are
strict sibling record families until a later schema version explicitly adopts
any stable subset. The cross-plan authority chain is:

1. [RH-06](../agent-context-hardening/rh-06-reconciliation.md) decides ownership
   and dependency direction.
2. This plan owns workspace discovery, guarded execution hosts, producer
   integration, and optional Nx scheduling.
3. The [execution index](../agent-context-hardening/execution-index.md) owns the
   stable cross-plan task IDs and readiness state.
4. RH-01 through RH-04 retain the detailed research evidence and stop gates;
   completing research does not advance an implementation status.

## Dependency graph

```text
Implemented historical path:
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

Reconciled pending path:
RH06-DOC
       |
       v
CTX-0A: schema-addressed artifact-set envelope + workspace-index anchor
       |----------------------|----------------------|
       v                      v                      v
CTX-0B: usage/journey    CTX-0C: scenario/      producer contracts only
records                  execution authority   (no runtime execution)
       |                      |
       |----------------------|
                  v
CTX-0D: synthetic walkthrough fixtures
       |
       v
CTX-1: pure queries + live freshness status -> CTX-2: intent/diagnostics

Cross-plan release gate (canonical scheduler is the execution index):
CTX-2 + LIN-4 + BHV-4 + ANG-5 + DRV-0 -> CTX-GATE -> MCP-1 -> PW-1

Workspace/Angular host branch:
Task 7A.1 [complete provenance; consumed by HOST-1]
CTX-0A -> HOST-1 / Task 7A.2: framework-neutral host protocol
                 |
                 v
HOST-2 / Task 7B.1 -> HOST-3 / Task 7B.2
                              |
                              v
                 HOST-4 / Task 7B.3 (+ CTX-0A)

CTX-0A -> ANG-0 -> ANG-1 retained AOT compatibility gate
HOST-1 + ANG-1 go -> ANG-2 / Task 7A.3: Angular package shell
ANG-2 + CTX-0A + AUTH-0 accepted
  -> ANG-2P / Task 7D: source providers + named-environment descriptors
CTX-0A + ANG-1 go + AUTH-0 accepted
  -> ANG-2R / Task 8B.1: environment/adapter/registry/conformance contracts
ANG-2 + HOST-4 -> ANG-3 / Task 7C: guarded JIT host
ANG-2 + ANG-2P + ANG-2R -> ANG-4 / Task 8B.2: AOT inventory host
ANG-4 -> ANG-5 / Task 8B.3: adapter lowering + required conformance
          (+ LIN-2 only for optional source/template joins)

ANG-3 + ANG-2P + BHV-1 + CTX-0C + CTX-0D -> Task 8 / BHV-4
Task 8 + Tasks 8B.2–8B.4 ----------------> Checkpoint B: Angular producer pilot

Source-lineage branch:
LIN-0 workplace topology/scale/privacy gate -> LIN-1 -> LIN-2 lineage artifact
LIN-2 + CTX-1 -> LIN-3 artifact queries
LIN-2 + journey/Angular refs -> LIN-4 bounded context/annotations

Behavior/scenario branch:
RH06-DOC -> BHV-0; CTX-0A + BHV-0 -> BHV-1 portable semantics
       |
       +----> BHV-2 v0.4 projections -> BHV-3 bounded derivation/scaffolds
       |
       +----> BHV-4 / Task 8 trusted resolved evidence
              (also needs CTX-0C, CTX-0D, ANG-3 / Task 7C,
               and ANG-2P / Task 7D)

Factory branch:
CTX-0A -> FAC-1 inert DTO/projector -> FAC-2 code-free sidecar/identity
       |
FAC-3 rootless OCI conformance [BLOCKED until `oci-rootless-v1` passes]
       |
FAC-4 opt-in application factory execution

Optional Nx branch after Checkpoint B and stable producer APIs:
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
Checkpoint C: optional Nx/workplace operations path
       |
Task 15A: generic consumer documentation
       |
Task 15B: integration consumer documentation
       |
Task 15C: package/release smoke
       |
Task 15D: independent review

Optional migration branch after Checkpoint B + CTX-0A:
Task 13: capture identity/privacy -> Task 14: capture/reconciliation
       |
       +----> joins Task 15B only when capture ships in the same release
```

`CTX-0A` through `CTX-0D` are the shared contract checkpoint. They land in
dependency order, while each lineage, Angular, behavior, or factory producer
waits for the exact checkpoint surfaces listed in the execution index; there is
no additional blanket publication prerequisite. `CTX-2` exits only when the
explicitly synthetic walkthroughs validate or refuse exactly; it does not
authorize transport or browser work.
The real representative producer/workplace `CTX-GATE` depends on `CTX-2`,
`LIN-4`, `BHV-4`, `ANG-5`, and `DRV-0`, and blocks both `MCP-1` and `PW-1`.
`PW-1` is scheduled only after `MCP-1` and a go decision at `CTX-GATE`. The
[execution index](../agent-context-hardening/execution-index.md) is canonical
for these cross-plan dependencies and status.

The diagram intentionally keeps three execution profiles separate:

- Task 7B/7C uses a short-lived trusted config/JIT worker and never claims an
  untrusted-code sandbox;
- Task 8B uses a pinned Angular application-target AOT build plus fresh browser
  contexts for trusted authoring/inventory; and
- FAC-3/FAC-4 uses a future rootless OCI runner for application factory
  execution. `isolated-ci-v1` is not an alias for `oci-rootless-v1`.

The cross-field effects research item `RS-EFFECTS-01` is complete. It approves
an explicit application-declared effect graph, conditionally approves derived
string/scenario evidence as non-authoritative authoring aids, and rejects
automatic semantic-verb inference. The first production slice therefore
contains explicit effects only.

## Cross-plan traceability

| Requirement                                                                                                     | Decision                                                                                                                                                                                     | Tasks                                                                                                              | Verification                                                                                                                                                                                                                   | Status                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `REQ-CONFIG-01` Repository-aware deterministic discovery                                                        | Root policy plus project-local ownership; framework-specific evaluation composes through the generic host                                                                                    | Tasks 1–6B and `HOST-1`–`HOST-4`/Tasks 7A.2–7B.3                                                                   | Existing loader/config/source/discovery/runner/index tests plus strict protocol, lifecycle, failure-safe publication, and linked/packed consumer checks                                                                        | Implemented through Task 6B; `HOST-1` is ready and `HOST-2`–`HOST-4` remain pending                                                  |
| `REQ-PROFILE-01` Custom types expose reviewed, serializable interaction semantics                               | The implemented canonical registry remains the compiler IR; proposed ADR 0011 makes compact library-owned adapters the normal semantic authoring authority; executable drivers stay separate | Tasks 3A–3B plus `AUTH-0`, adapter lowering, and environment publication                                           | Existing strict DTO/resolution/hash tests plus compact-to-canonical parity, conflict, exact environment binding, and conformance tests                                                                                         | Tasks 3A–3B and Tasks 5.0–5.1 implemented for the canonical/legacy boundary; `AUTH-0` is ready and the new authoring path is pending |
| `REQ-AUTHOR-01` Angular reduces profile-authoring work without becoming semantic authority                      | A schema-owned compatibility result and retained AOT gate precede named-environment inventory; reviewed adapters remain semantic authority and required conformance gates actionability      | `AUTH-0`, `ANG-0`, `ANG-1`, `ANG-2`/Task 7A.3, `ANG-2P`/Task 7D, `ANG-2R`/Task 8B.1, `ANG-4`–`ANG-6`/Tasks 8B.2–8C | Angular CLI/Nx application-target gate, strict environment/adapter/registry/report schemas, configured-scope coverage, compact-lowering parity, required controlled conformance, negative inference, and workplace value pilot | Proposed ADR 0011 plus approved retained Angular research; production gates pending                                                  |
| `REQ-EFFECTS-01` Ordering/effects are represented without function-source guessing                              | Explicit declared graph; derived references/deltas remain non-authoritative evidence                                                                                                         | Tasks 3C and 5A                                                                                                    | Strict DTO, endpoint/capability/readiness/SCC tests, retained 11-test spike                                                                                                                                                    | Implemented with schema/config/compiler/workspace/anchor-fixture evidence                                                            |
| `REQ-CONTEXT-01` New producer artifacts share exact references, freshness, execution authority, and diagnostics | Land the schema-addressed envelope first, then keep authority, live freshness, and consumer diagnostic ownership in their named slices                                                       | `CTX-0A`–`CTX-2` and `CTX-GATE` in the execution index                                                             | Strict validators, canonical round trips, referential-integrity and mutation tests, exact synthetic walkthroughs, then one real pinned producer pilot                                                                          | `CTX-0A` through `CTX-0D` complete; `CTX-1` ready; later gates pending                                                               |
| `REQ-LINEAGE-01` An agent can connect an anchored form root and direct source usage without name guessing       | Explicit root authority plus per-leaf TypeScript indexing; ambiguity, coverage, staleness, and privacy fail closed                                                                           | `LIN-0`–`LIN-4` / RH01-T2–T8                                                                                       | Representative leaf-tsconfig/project-reference/alias/barrel/lazy/privacy/scale gate, then exact/ambiguous/stale/incomplete query tests                                                                                         | Harness retained; `LIN-0` blocked after an `inconclusive` public rehearsal, no production index                                      |
| `REQ-SCENARIO-01` Scenario evidence has portable semantics and a distinct trusted producer                      | RH-04 owns semantics; Task 8 produces JIT-resolved artifacts; RH-05 only queries/validates them                                                                                              | `BHV-0`–`BHV-4`, `ANG-2P`/Task 7D, and `ANG-3`/Task 7C                                                             | Exact basis-contract hashes, replayable/compile-only cases, strict deltas, no inferred business verbs                                                                                                                          | ADR 0010 proposed; explicit `BHV-0` approval and later schemas/host remain pending                                                   |
| `REQ-FACTORY-01` Factory-derived shape/value evidence cannot be manufactured from synthetic live-looking inputs | Inert DTO/projector first; code-free sidecar and structural identity; execution only in rootless OCI                                                                                         | `FAC-1`–`FAC-4`                                                                                                    | Synthetic projector negatives, then retained catch-resistant ledger and `oci-rootless-v1` conformance controls                                                                                                                 | `FAC-1` ready; runtime execution remains blocked at FAC-3                                                                            |
| `REQ-NX-01` Nx improves monorepo discovery and execution without becoming authority                             | One optional aggregate coordinator target; artifact hashes remain correctness                                                                                                                | Tasks 9–12C                                                                                                        | Supported-version fixture, one-target/cache/affected/isolation tests                                                                                                                                                           | Pending Checkpoint B and workplace version evidence                                                                                  |

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

### Task 3B: Integrate legacy project-owned profile registries (`REQ-PROFILE-01`)

**Description:** Let each project descriptor contribute a serializable
field-type profile registry, resolve it against Formly types/wrappers/approved
variants, and carry its canonical identity into resolved workspace
configuration. Root configuration controls policy and defaults but does not
become a central list of application field types.

This completed task remains the compatibility implementation. Proposed ADR
0011 supersedes raw project registries as the intended normal authoring UX but
retains the DTO, hashes, compiler resolution, and mutually exclusive legacy
input during migration.

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

## RH-06 shared foundation and producer gates

This section is the mandatory bridge between the implemented generic workspace
history and all pending producer work. It does not renumber Tasks 1–7A.1 and it
does not duplicate the full task contracts in the
[execution index](../agent-context-hardening/execution-index.md).

### Shared `CTX-0` contract checkpoint

| ID       | Observable output                                                                                                                              | Dependencies       | Status   | Verification boundary                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CTX-0A` | Schema-addressed artifact-set envelope with open content references, one structured workspace-index anchor, and its own `contentHash` identity | `RH06-DOC`         | Complete | 60 focused tests, schema build/lint, fresh review, Changeset, and full repository gate pass                                                                 |
| `CTX-0B` | Source-usage and journey record schemas with distinct form/root/usage/journey identities                                                       | `CTX-0A`           | Complete | 48 focused tests, privacy/identity plus bounded-input and numeric-normalization regressions, schema checks, and focused post-fix review                     |
| `CTX-0C` | Scenario references and exact commit/assertion/action/transition/repeater-capture authority                                                    | `CTX-0A`           | Complete | 51 focused tests, authority mutation plus bounded-input and numeric-normalization regressions, schema checks, and focused post-fix review                   |
| `CTX-0D` | Minimal positive and negative synthetic walkthrough records                                                                                    | `CTX-0B`, `CTX-0C` | Complete | 31 focused and 190 integrated tests, bounded exact synthetic-boundary and cross-family projection validation, and three-pass independent-review remediation |

No TypeScript source indexer, Angular host, application factory, MCP adapter, or
Playwright driver is part of `CTX-0`. New producers may define their internal
contracts after `CTX-0A`, but they may not publish sibling records until every
explicit execution-index dependency for that producer is complete. The pure
query/validator lane may proceed over `CTX-0D` without pretending those fixtures
are source, runtime, or workplace evidence. `CTX-0A` does not define execution
authority, compare a set to a live workspace, choose the query module boundary,
or own an exhaustive consumer diagnostic policy: those responsibilities belong
to `CTX-0C`, `CTX-1`, and `CTX-2`, respectively.

### RH-01 source-lineage producer mapping

The [RH-01 research packet](../../research/hardening/form-identity-and-source-lineage.md)
is approved evidence. Production source lineage remains pending and uses the
execution-index IDs below so RH01's research task numbers remain stable.

| Execution ID | RH-01 mapping | Workspace responsibility                                                                                                                            | Dependencies                                                      | Status                                                                                               |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `LIN-0`      | RH01-T2       | Retain the representative leaf-tsconfig, project-reference, declaration-output, alias/barrel, lazy-route, privacy, bundle-isolation, and scale gate | `RH06-DOC`                                                        | Blocked: harness/public rehearsal complete; representative workplace evidence remains `inconclusive` |
| `LIN-1`      | RH01-T3       | Add typed definition/root anchors and creation provenance without serializing functions                                                             | `CTX-0A`, `LIN-0` go                                              | Pending; must not begin before gate                                                                  |
| `LIN-2`      | RH01-T4–T5    | Build per-leaf indexes, canonical cross-program joins, coverage, staleness, disclosure, and deterministic source-lineage artifact                   | `CTX-0B`, `LIN-1`                                                 | Pending                                                                                              |
| `LIN-3`      | RH01-T6       | Add artifact-only exact/ambiguous/unresolved/stale/incomplete queries                                                                               | `LIN-2`, `CTX-1`                                                  | Pending                                                                                              |
| `LIN-4`      | RH01-T7–T8    | Add bounded Angular/route candidates and strict exceptional usage/journey annotations                                                               | `LIN-2`, journey schema from `CTX-0B`; Angular evidence when used | Pending                                                                                              |

The form ID, root anchor ID, usage/callsite ID, and journey/step ID remain
separate identities. Nx may enumerate the leaf programs and cache index targets,
and Angular may enrich component/route evidence, but neither can manufacture a
form root, usage selection, or business journey. A missing or incomplete
program produces `incomplete`, not an authoritative empty usage list.

### Behavior/scenario and factory mappings

| Execution IDs   | Ownership in this plan                                                                                                              | Status and boundary                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `BHV-0`         | Approve the portable causal-edge/acausal-state/access-prerequisite topology and authority matrix                                    | ADR 0010 proposed; ready for explicit maintainer approval                                                                     |
| `BHV-1`         | Schema owns strict normalized conditions, behavior/scenario evidence, facet/scope completeness, and unknowns                        | Pending topology approval; `CTX-0A` is complete                                                                               |
| `BHV-2`         | Compiler/workspace project existing v0.4 effects, wrapper prerequisites, and repeater access losslessly                             | Pending `BHV-1`; existing v0.4 source records remain implemented authority                                                    |
| `BHV-3`         | Compiler/workspace derive only the bounded closed grammar and emit conservative callback/hook scaffolds                             | Pending `BHV-2`; helpers/imports/pipelines remain refused                                                                     |
| `BHV-4`         | Angular Task 8 produces exact contract-hash-bound replayable/compile-only scenario evidence                                         | Pending `ANG-3`, `ANG-2P`, `BHV-1`, `CTX-0C`, and `CTX-0D`; these are direct publication dependencies                         |
| `BHV-GATE`      | A redacted workplace pilot measures construct frequency and scaffold acceptance before AST coverage expands                         | Pending `BHV-3` and `BHV-4`                                                                                                   |
| `FAC-1`–`FAC-2` | Schema/compiler own inert binding/value DTOs and pure projection; workspace owns the code-free sidecar and structural-identity gate | `FAC-1` ready; `FAC-2` pending `FAC-1`                                                                                        |
| `FAC-3`–`FAC-4` | An external rootless OCI provider owns conformance; workspace may orchestrate only after it passes                                  | **Blocked** until `oci-rootless-v1`, the catch-resistant runner ledger, structural controls, and retained negative cases pass |

The focused
[typed factory input and Observable analysis](../../research/hardening/typed-factory-input-analysis.md)
refines this branch without changing its authority. Type descriptors, bounded
usage classification, inert binding plans, diagnostics, and generated reviewed
scaffolds map to `FAC-1`. A code-free identity/registration sidecar remains
`FAC-2`. Automatic application factory execution remains `FAC-3`/`FAC-4`, and
subscribed/resolved Observable emissions remain Task 8 evidence. Type-derived
emission shapes or literal-union candidates never satisfy those later gates.

For `TFI-MVP-1`, workspace reuses the exact leaf TypeScript Program and checker
that already power source linkage. The full normalized descriptor is ephemeral
workspace analysis state and does not cross into compiler, cache, schema, or
portable contract artifacts. This first slice emits no report or scaffold.
`TFI-MVP-3` renders a bounded, canonically ordered,
privacy-filtered local authoring report and typed application scaffold. That
scaffold references compiler-owned RH-02 authoring helpers; compiler continues
to validate/materialize inert bindings without importing TypeScript or
receiving Program objects. The existing code-free identity/registration
sidecar remains separate. A future persisted or cross-package type artifact
requires a separate versioned schema decision; the MVP does not silently create
one.

`TFI-MVP-5` exposes the renderer through a read-only workspace API and CLI. It
discovers only exact application-Program roots from the existing project,
source, definition, and `lineage.rootSymbol` chain and accepts optional stable
form-ID filters; there is no second target registry. Sanitized Indexing- and
NIGO-shaped Nx fixtures measure generated, explicit, ambiguous, and unsupported
inputs separately. The command neither calls source `list()` nor application
factories, writes no scaffold, and publishes nothing into portable artifacts.

`TFI-MVP-2` adds only ephemeral workspace analysis beside that descriptor. It
classifies the bounded direct-use grammar in the declared factory body and
combines use evidence with the corresponding normalized property type. The
result distinguishes captured callbacks, inert Observables, unavailable
Angular view handles, explicit construction values, explicit capability
bindings, and unsupported inputs. Destructuring, aliases, computed access,
getters, unknown higher-order consumers, and unreviewed storage fail closed.
It invokes no factory or callback, subscribes to no stream, imports no
application runtime, and changes no schema or portable artifact. `TFI-MVP-3`
now renders this private plan as an ephemeral typed authoring draft. The draft
references the real exported options interface with indexed-access types,
keeps explicit and unsupported inputs visible, and depends only on a
compiler-owned type contract with no runtime implementation. It writes no file
and does not make the current trusted `create()` path an automatic
application-factory runner.

The trusted JIT/config worker and the `isolated-ci-v1` CI provider are not
factory containment. No future task may extend the current `create()` path with
application factory execution as a shortcut around FAC-3.

## Phase 2: Angular integration

The framework-neutral runtime-host mapping is explicit and precedes Angular
execution. Task 7A.1 is already complete provenance work; it is not a hidden
pending scheduler dependency.

| Execution ID | Workspace-plan task                               | Exact dependencies |
| ------------ | ------------------------------------------------- | ------------------ |
| `HOST-1`     | Task 7A.2 framework-neutral runtime-host protocol | `CTX-0A`           |
| `HOST-2`     | Task 7B.1 discovery/inventory split               | `HOST-1`           |
| `HOST-3`     | Task 7B.2 trusted-local worker lifecycle          | `HOST-2`           |
| `HOST-4`     | Task 7B.3 failure-safe aggregation/publication    | `HOST-3`, `CTX-0A` |

The Angular execution-index mapping is likewise explicit:

| Execution ID | Workspace-plan task(s)                                                                                                    | Exact dependencies                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ANG-0`      | Schema-owned compatibility result in the prerequisite below                                                               | `CTX-0A`                                                 |
| `ANG-1`      | Retained Angular CLI/Nx application-target compatibility fixture gate                                                     | `ANG-0`                                                  |
| `ANG-2`      | Task 7A.3 dependency-light Angular package shell                                                                          | `ANG-1` go, `HOST-1`                                     |
| `ANG-2P`     | Task 7D Angular source-group providers plus Node-safe named-environment descriptors/project selection                     | `ANG-2`, `CTX-0A`, `AUTH-0` accepted                     |
| `ANG-2R`     | Task 8B.1 schema-owned environment/adapter/generated-registry/report/conformance contracts                                | `CTX-0A`, `ANG-1` go, `AUTH-0` accepted                  |
| `ANG-3`      | Task 7C guarded JIT/config host capability only; no scenario semantics or publication                                     | `ANG-2`, `HOST-4`                                        |
| `ANG-4`      | Task 8B.2 AOT browser host and named-environment Formly inventory                                                         | `ANG-2`, `ANG-2P`, `ANG-2R`                              |
| `ANG-5`      | Task 8B.3 adapter lowering, required conformance, generated registry/environment bundle, and optional migration scaffolds | `ANG-4`; `LIN-2` only for optional source/template joins |
| `ANG-GATE`   | Task 8B.4 workplace authoring-value pilot                                                                                 | `ANG-5`                                                  |
| `ANG-6`      | Optional Task 8C expanded registry-bound drift/browser-parity conformance                                                 | `ANG-GATE` go, `BHV-4`                                   |

### Task 7A: Publish the runtime-host contract and Angular package boundary

**Description:** Establish the versioned framework-neutral host contract first,
then make the workspace and Angular packages consume it. The completed Task
7A.1 number is preserved. This parent task is complete only after Tasks
7A.1–7A.3 plus the separately named `ANG-0`/`ANG-1` compatibility prerequisite
pass; each child is a separate reviewable slice and must leave generic
consumers working.

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

#### Task 7A.2 (`HOST-1`): Publish the workspace runtime-host protocol

**Description:** Promote `@formly-contract/workspace` from the private prototype
to the publishable framework-neutral execution host. Add strict IPC and
parent-selected host-module descriptors plus public composition subpaths and a
packed private worker entry. No Angular dependency enters this package.

**Current status:** Ready after `CTX-0A` completion. The earlier 7A.1 review
completion did not by itself authorize this task; both dependencies now pass.

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

**Dependencies:** `CTX-0A`. Task 7A.1 is already complete provenance work and
is consumed by this task; it is not a pending scheduler gate.

**Files likely touched:**

- `packages/workspace/package.json`
- `packages/workspace/src/runtime-host/`
- `packages/workspace/src/index.ts`
- packed consumer smoke fixture

**Estimated scope:** Medium

#### RH-06 Angular compatibility prerequisite: `ANG-0` and `ANG-1`

**Description:** Before an Angular package, JIT host, AOT browser host, or
authoring behavior is implemented, promote the retained RH-03 substrate proof
into a schema-owned compatibility result and a maintained application-target
fixture. This prerequisite is intentionally named with execution-index IDs
rather than retroactively inserting or renumbering Task 7A.1.

**`ANG-0` acceptance criteria:**

- [ ] `AngularHostCompatibilityResult` is a strict, dependency-free schema
      record with exact pass/fail cases, environment identity, canonical hash,
      and exhaustive diagnostics.
- [ ] Unknown keys, duplicate/missing cases, pass records with diagnostics, and
      fail records without the case-specific diagnostic are rejected.
- [ ] The result is substrate evidence only and cannot authorize a field
      profile or driver.

**`ANG-1` acceptance criteria:**

- [ ] Maintained Angular CLI and Nx application-target fixtures prove partial
      library linking, external resources, NgModule/standalone composition,
      root/feature scope isolation, opaque/missing-resource refusal, browser
      HTTP/WebSocket interception, model sink, popup association, and teardown.
- [ ] The fixture uses public Angular/Formly surfaces and fresh browser
      contexts; private Ivy inspection and bare-Node partial-library loading
      are prohibited.
- [ ] The result validates against `ANG-0`; every case must pass for the pinned
      tuple before Angular package behavior is supported.

**Verification:**

- [ ] Focused schema canonical/refinement/mutation tests pass.
- [ ] Retained Angular CLI and Nx application-target commands produce validated,
      byte-stable compatibility results for the supported tuple.
- [ ] Browser interception is documented as an I/O determinism guard, not a
      whole-process or OS sandbox.

**Dependencies:** `ANG-0` depends on `CTX-0A`; `ANG-1` depends on `ANG-0`

**Files likely touched:**

- `packages/schema/src/` Angular compatibility DTO and tests
- retained Angular CLI/Nx application-target compatibility fixtures
- exact gate scripts and package/check integration

**Estimated scope:** two Medium slices, landed sequentially

#### Task 7A.3 (`ANG-2`): Scaffold the dependency-light Angular host package

**Description:** After `ANG-1` passes, add the publishable Angular integration
shell and reserve separate Node-safe `./jit` and `./authoring` entry points. Fix
peer ownership with a strict pnpm install matrix; the guarded compiler import
belongs to Task 7C and the AOT browser implementation belongs to Task 8B.

**Acceptance criteria:**

- [ ] `@formly-contract/angular` has a mandatory compatible workspace peer and
      no reverse dependency; Angular/Formly peer optionality is fixed by an
      explicit supported/unsupported install matrix.
- [ ] Importing `@formly-contract/angular/jit` or
      `@formly-contract/angular/authoring` performs no eager Angular import and
      returns only a Node-safe descriptor for its distinct execution mode.
- [ ] The unique future CLI/programmatic entry names are reserved without
      advertising an unimplemented generation path.

**Verification:**

- [ ] Package builds and import-without-root-Angular smoke tests pass.
- [ ] Linked, packed, hoist-disabled, missing-peer, incompatible-peer, and
      project-only-peer install cases match the documented matrix.
- [ ] Dependency audit proves `angular -> workspace -> compiler/schema`.

**Dependencies:** `HOST-1` (Task 7A.2) and `ANG-1` go

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
child. Workers never publish final artifacts or the workspace index. Task 7B
owns the generic trusted-local lifecycle only; Angular provider contribution and
Node-safe authoring descriptors belong to Task 7D, not this worker task.

#### Task 7B.1 (`HOST-2`): Split discovery and inventory before project evaluation

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

**Dependencies:** `HOST-1` (Task 7A.2)

**Files likely touched:**

- `packages/workspace/src/discover-projects.ts`
- `packages/workspace/src/config.ts`
- `packages/workspace/src/project-worker.ts`
- focused discovery/protocol tests

**Estimated scope:** Medium

#### Task 7B.2 (`HOST-3`): Enforce the trusted-local worker lifecycle

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

**Dependencies:** `HOST-2` (Task 7B.1)

**Files likely touched:**

- `packages/workspace/src/project-worker.ts`
- `packages/workspace/src/worker-supervisor.ts`
- `packages/workspace/src/run-workspace.ts`
- focused lifecycle fixtures/tests

**Estimated scope:** Medium

#### Task 7B.3 (`HOST-4`): Make aggregation and publication failure-safe

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

**Dependencies:** `HOST-3` (Task 7B.2) and `CTX-0A`. Angular-specific hosts
compose this generic publication boundary later; they are not a prerequisite
for proving it.

**Files likely touched:**

- `packages/workspace/src/run-workspace.ts`
- `packages/workspace/src/publication.ts`
- focused aggregation/publication tests
- linked/packed consumer fixtures

**Estimated scope:** Medium

### Task 7C (`ANG-3`): Add the guarded Angular JIT runtime host

**Description:** Implement the Angular-owned runtime for conventional
peer-correct Angular graphs without claiming complete transitive singleton
enforcement. This is the guarded trusted config/JIT lane used by Task 8
scenario compilation. It does not build the AOT authoring application, inspect
rendered custom fields, or serve as a fallback for a failed `ANG-1` gate.

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

**Dependencies:** `ANG-2` (Task 7A.3) and `HOST-4` (Task 7B.3)

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
- [ ] The compatibility statement is explicitly limited to the trusted JIT
      config/scenario worker and remains separate from the `ANG-1` AOT
      application-target compatibility result.

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

### Task 7D (`ANG-2P`): Productize distributed Angular source providers

**Description:** Add the Angular integration package with a multi token,
`provideFormContractSource`, and a deterministic catalog. Prove NgModule and
standalone provider contribution using source groups rather than individual
root registrations. Under accepted ADR 0011, this task also owns Node-safe
named Formly-environment descriptors and exact project selection. Environment
descriptors point to the application-owned target, trusted authoring entry,
tsconfig, configured root/lazy scopes, source roots, and adapter-catalog entry.
Generic workspace discovery validates those serializable pointers without
importing Angular; Task 7B does not own or infer them.

**Acceptance criteria:**

- [ ] Separate features contribute source groups through Angular public provider
      APIs.
- [ ] The catalog sorts IDs, rejects duplicates, and returns fresh instances.
- [ ] A contracted type contribution feeds the same public catalog/helper path
      used by production Formly registration. A third-party registration may
      instead use one explicit reviewed binding adapter whose exact
      type/component/wrapper/scope join is proven by conformance.
- [ ] Each explicit semantic form retains one `FormContractDefinition`; source
      groups may adapt an existing registry, while fragments are not promoted
      unless deliberately registered as standalone semantic forms.
- [ ] The Node-safe environment descriptor validates confined
      workspace-relative target/entry/tsconfig/source-root/catalog pointers,
      explicit root/lazy scopes, stable environment identity, and exact project
      selection without importing the trusted Angular entry.
- [ ] One project selects at most one environment. Environment inheritance,
      overlays, and merge precedence are unsupported in the first version.
- [ ] Environment selection and legacy `fieldTypeProfiles` are mutually
      exclusive and never silently merged.
- [ ] Provider and descriptor inventory states configured scope explicitly;
      absent lazy features remain incomplete rather than silently absent.
- [ ] The package declares Angular/Formly peers without adding them to
      `workspace`.

**Verification:**

- [ ] Focused Angular provider tests cover NgModule, standalone, optional-empty,
      and duplicate cases.
- [ ] Generic `list` and config validation prove that authoring pointers are
      Node-safe and that no Angular module or provider executes.
- [ ] Angular production compilation succeeds.

**Dependencies:** `ANG-2` (Task 7A.3), `CTX-0A`, and accepted `AUTH-0` / ADR
0011

**Files likely touched:**

- `packages/angular/src/provider.ts`
- `packages/angular/src/provider.test.ts`
- `packages/angular/src/index.ts`
- `packages/workspace/src/config.ts` and focused Node-safe descriptor tests
- synthetic feature-provider test modules

**Estimated scope:** Medium

### Task 8: Produce trusted JIT scenario artifacts from a project source

**Description:** Let an Angular project source declare the controlled imports,
providers, trusted compile callbacks, and separately versioned JSON-safe
scenario axes/cases needed to obtain the application-equivalent
`FormlyFormBuilder`. Run them only through the guarded Task 7C JIT/config worker
and project through the existing allowlisted adapter. RH-04 owns the portable
behavior/scenario semantics; this task is the trusted Angular producer, and the
agent-context/MCP layers are consumers only.

**Acceptance criteria:**

- [ ] A dynamic form resolves visibility, required/readonly state, and options
      under two named synthetic cases without retaining an injector or live
      field tree.
- [ ] Every result pins its exact form-contract hash, scenario axis/case,
      compiler/host identity, and its own canonical artifact hash.
- [ ] Replayable cases declare exact JSON-safe node operations and values;
      callback-only cases are marked compile-only and cannot generate E2E
      steps.
- [ ] Lazy-feature providers are included explicitly by the project source; the
      runner does not assume root DI can enumerate unloaded features.
- [ ] Scenario state is acausal evidence unless an explicit v0.4 effect or a
      closed witnessed derived rule establishes the exact edge. Option deltas
      never infer `loads` or `filters`.
- [ ] No model/form-state value enters a portable artifact beyond the
      allowlisted scenario metadata required to witness the exact result.

**Verification:**

- [ ] Focused guarded-worker/TestBed tests prove eager, lazy-feature-import,
      custom type, compile-only/replayable, factory-failure, timeout, teardown,
      and basis-hash mismatch behavior.
- [ ] Declared, scenario-resolved, and later observed artifacts remain separate
      and deterministic.
- [ ] Removing a replay operation/value, changing the basis contract, or
      relabeling a business verb fails with an exact diagnostic.

**Dependencies:** `ANG-3` (Tasks 7C.1–7C.3), `ANG-2P` (the Task 7D
project-source integration), approved `BHV-1` portable behavior/scenario
semantics, `CTX-0C`, and `CTX-0D`. This task is `BHV-4`, the resolved-evidence
producer; `ANG-3` owns only the guarded host capability and never owns scenario
semantics or publication.

**Files likely touched:**

- `packages/angular/src/compile-project.ts`
- `packages/angular/src/compile-project.test.ts`
- `packages/angular/src/config.ts`
- schema-owned scenario/behavior records and synthetic integration fixtures
- `packages/angular/src/index.ts`

**Estimated scope:** Medium

### Task 8B: Build the separate AOT field-profile authoring lane (`REQ-AUTHOR-01`)

**Description:** Use the configured named Formly environment, its Angular
application target, and fresh browser contexts to inventory effective
registrations and scopes. Aggregate reviewed compact adapter contributions,
run required controlled-example conformance, and lower them deterministically
to the existing canonical `FieldTypeProfileRegistry`. This lane never loads
through Task 7C and never turns rendered DOM, source heuristics, or generated
scaffolds into semantic authority. Optional scaffolds remain migration aids.

#### Task 8B.1 (`ANG-2R`): Publish strict environment, adapter, registry-build, report, scaffold, and conformance contracts

**Acceptance criteria:**

- [ ] Schema-owned DTOs cover exact environment/scope identity, compact adapter
      presets/contributions, raw/effective registrations,
      inheritance/defaults/wrappers, generated-registry identity, evidence,
      unknowns, dispositions, configured-scope coverage, diagnostics,
      observations, conformance states, and optional review-only scaffolds.
- [ ] Validators enforce exact IDs/references, canonical set ordering,
      built-in-vs-explicit precedence, closed diagnostic/unknown unions, and no
      Angular objects, paths outside the disclosure policy, or live values.
- [ ] The registry-build manifest pins environment, scope-inventory,
      adapter-catalog, generated-registry, tool-compatibility, and conformance
      hashes plus omissions/conflicts.
- [ ] Display/assertion-only and unsupported generic-operation gaps remain
      explicit dispositions/unknowns rather than invented executable profiles;
      no driver is implied before the schema-owned non-interactive decision.

**Verification:**

- [ ] Canonical round-trip, unknown-key, reference-mutation, compact-to-canonical
      parity, coverage, evidence, conflict, and conformance-state tests pass over
      the retained RH-03 matrix.

**Dependencies:** `CTX-0A`, `ANG-1` go, and accepted `AUTH-0` / ADR 0011

**Estimated scope:** Medium

#### Task 8B.2 (`ANG-4`): Implement the isolated AOT browser host and named-environment Formly inventory

**Acceptance criteria:**

- [ ] The selected named environment's Angular CLI/Nx application target
      consumes the exact authoring entry and tsconfig, links partial libraries,
      resolves external resources, and emits the confined browser shell.
- [ ] Each root/feature scope uses a fresh browser context/platform/injector,
      a one-shot schema-validated bridge, bounded time/output, and mandatory
      destroy/page/context cleanup.
- [ ] Inventory distinguishes raw and effective registrations, inherited
      components/defaults/wrappers, explicit environment/scope provenance,
      alias conflicts, missing adapter contributions, and absent/unconfigured
      lazy scopes.
- [ ] HTTP/WebSocket interception improves determinism but is not described as
      a process or OS sandbox.

**Verification:**

- [ ] Maintained Angular CLI and Nx AOT fixtures retain partial-library,
      external-resource, root/feature isolation, model-sink, popup, opaque-child,
      missing-resource, and teardown cases.

**Dependencies:** `ANG-2` (Task 7A.3), `ANG-2P` (Task 7D), and `ANG-2R`
(Task 8B.1). Cross-plan release remains gated separately by `CTX-GATE`; it is
not another `ANG-4` scheduler dependency.

**Estimated scope:** Medium

#### Task 8B.3 (`ANG-5`): Aggregate adapters, run required conformance, and publish the generated canonical registry

**Acceptance criteria:**

- [ ] Reviewed adapter contributions join deterministically to exact
      environment registrations/components/wrappers/scopes; duplicates,
      conflicts, missing registrations, and ambiguous aliases fail closed.
- [ ] Compact presets lower losslessly into the existing realistic canonical
      registry matrix; the generated registry is reproducible and never edited
      as source.
- [ ] Every interactive profile required for actionability proves its exact
      component, controlled example, codec/model sink, required parts, driver
      operation, and configured scope through required conformance.
- [ ] Display/assertion-only fields retain an explicit non-interactive
      disposition and never receive an invented interaction or driver.
- [ ] Optional source/template analysis and scaffolds are evidence-tagged
      migration aids only. Native-backed candidates are `derived`; overlays,
      autocomplete, tables, repeaters, dynamic names, opaque children, parse
      failures, and multi-step widgets never gain authority from analysis.
- [ ] Publication emits the exact generated registry and environment-build
      manifest with complete/incomplete/non-actionable status; observations
      never rewrite declarations.

**Verification:**

- [ ] Focused tests retain the native-backed, overlay, autocomplete, table,
      repeater, date-range, text-editor, display-only, wrapper, variant,
      inherited-type, dynamic-name, and ambiguous-overlay matrix, including
      compact-to-canonical parity and required conformance failures.
- [ ] Source-derived joins use `LIN-2` identities/coverage when available;
      incomplete lineage produces a localized unknown, not a guessed join.

**Dependencies:** `ANG-4` (Task 8B.2); `LIN-2` only where optional
source/template joins are requested

**Estimated scope:** Medium

#### Task 8B.4: Run the workplace authoring-value pilot (`ANG-GATE`)

**Acceptance criteria:**

- [ ] A sanitized workplace slice records configuration effort, configured
      custom-type coverage, missing/ambiguous joins, scaffold acceptance,
      review time, and saved mechanical work without retaining workplace source.
- [ ] Maintainers issue an explicit go/narrow/stop decision before broader
      control-family or version support is claimed.

**Verification:**

- [ ] Redacted retained metrics and the accepted/narrowed support matrix are
      reviewable beside the exact environment/fixture identities.

**Dependencies:** Task 8B.3

**Estimated scope:** Small research/pilot gate

### Task 8C: Add optional expanded registry-bound drift and browser-parity conformance (`ANG-6`)

**Description:** After the authoring-value gate passes, optionally expand beyond
the required per-adapter publication conformance into broader TestBed and AOT
browser drift/parity scenarios. Exact registry/profile/driver/model-sink/part
bindings and reviewed steps own the claim. Observation may corroborate or
diagnose drift but never promotes a scaffold or rewrites the registry.

**Acceptance criteria:**

- [ ] TestBed and browser lanes are explicit and exact-version; neither is a
      fallback for a failed application-target gate.
- [ ] Every operation, part, popup, codec, model sink, and network mock resolves
      against pinned reviewed IDs and hashes before execution.
- [ ] Results distinguish pass, drift, unsupported, and incomplete coverage;
      one observed scenario never proves workspace completeness.

**Verification:**

- [ ] Exact-binding mutation tests and rendered positive/negative scenarios
      cover the approved workplace matrix without authority promotion.

**Dependencies:** `ANG-GATE` go, Task 8, and the stable behavior/scenario schema

**Estimated scope:** Medium; optional after Checkpoint B

## Checkpoint B: Angular producer pilot

- [ ] `CTX-0` is complete, and `ANG-0` plus the retained Angular CLI/Nx `ANG-1`
      application-target gate pass for the pinned tuple.
- [ ] Root discovery imports no project configs; one fresh trusted JIT worker
      contains each project's config, sources, factories, and JIT runtime state.
- [ ] Packed, non-hoisted Angular CLI/programmatic consumers resolve the compiler
      from the selected project rather than workspace/root hoisting.
- [ ] The JIT peer-correct graph limitation, reserved-alias failures, and
      unsupported private-copy fixture are explicit and tested.
- [ ] Trusted-local provenance says network is not enforced. Selecting
      `isolated-ci-v1` before its external provider is installed fails closed
      with `WORKER_ISOLATION_UNAVAILABLE`; network denial is a later Task 11C
      gate rather than a Checkpoint B claim.
- [ ] Task 8 produces deterministic contract-hash-bound scenario artifacts in
      the guarded JIT lane, separate from the AOT authoring browser.
- [ ] Task 8B uses the configured application target and fresh browser contexts;
      browser interception is documented only as an I/O determinism guard.
- [ ] Multiple Angular feature sources and both NgModule/standalone provider
      contributions are represented through Task 7D's Node-safe boundary.
- [ ] Each Formly-producing project selects one exact named environment (or an
      explicitly legacy raw registry, never both); reviewed compact adapters
      lower to a conformed generated canonical registry, while inventory and
      optional scaffolds report coverage and unmapped types without authorizing
      derived or observed candidates.
- [ ] The complex-widget matrix and `ANG-GATE` workplace metrics support an
      explicit go/narrow/stop decision. Optional Task 8C is not required to
      complete this authoring-value checkpoint.
- [ ] Maintainer approves the stable producer APIs before the optional Nx layer
      depends on them. This approval grants no form, usage, journey, or behavior
      authority to Nx.

## Phase 3: Nx integration

This phase is optional operational integration. Nx may enumerate project
boundaries, attach one configured aggregate target, schedule/cache work, and
compute affected inputs. Generic workspace artifacts and their pinned hashes
remain the correctness boundary. Nothing in this phase creates a semantic form
ID, root/usage/journey identity, behavior edge, scenario authority, or field
profile. Lineage producers may consume Nx project topology only after
independently proving the `LIN-0` coverage and identity gates.

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

“Infer” in this task means recognizing explicit marker/config files and
installing a scheduler target. It never means inferring forms, usages, journeys,
or behavior from the Nx project graph.

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
guardrails but is never treated as the network boundary. This profile executes
the trusted config/JIT project protocol. It is not the RH-02 application-factory
runner and cannot satisfy or weaken the separate `oci-rootless-v1` FAC-3 gate.

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
- [ ] Selecting `isolated-ci-v1` for an application-factory sidecar is rejected;
      factory execution remains blocked until FAC-3 passes.

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

## Checkpoint C: Optional Nx/workplace operations path

**Status:** Pending Checkpoint B, workplace Nx version evidence, and Tasks
9–12C. This checkpoint proves the optional monorepo scheduling path; it is not
the agent-context `CTX-GATE` and does not authorize MCP or Playwright work.

- [ ] `CTX-0` and Checkpoint B remain valid under the selected Nx execution
      inputs; no producer record or hash changes merely because Nx scheduled it.
- [ ] A new form-owning Nx project needs only a local project config.
- [ ] Existing registries and factory maps can be adapted in bulk.
- [ ] Generic, Angular, and Nx package boundaries remain acyclic and optional.
- [ ] Exactly one coordinator-owned aggregate target preserves workspace-wide
      duplicate validation/publication, and its cached/affected behavior is
      demonstrated rather than inferred.
- [ ] `isolated-ci-v1` proves external network denial and fails closed when its
      provider is unavailable; trusted-local output never makes that claim.
- [ ] `isolated-ci-v1` is demonstrated only for the trusted project/JIT protocol;
      FAC-3/FAC-4 application factory execution remains blocked until the
      separate `oci-rootless-v1` conformance gate passes.
- [ ] If source lineage participates in the pilot, `LIN-0` has independently
      passed and `LIN-2` records program coverage/staleness/privacy. Nx topology
      alone is never reported as complete lineage.
- [ ] Install, configuration, troubleshooting, and migration docs are complete.
- [ ] A sanitized workplace pilot confirms this integration's setup, scheduling,
      cache, and affected-execution effort before a broader rollout. The later
      real producer/agent-context `CTX-GATE` is separate and additionally waits
      for `CTX-2`, `LIN-4`, `BHV-4`, `ANG-5`, and `DRV-0`; it blocks `MCP-1` and
      `PW-1` regardless of this optional Nx checkpoint.

## Phase 4: Optional migration capture

### Task 13: Specify runtime capture identity and privacy

**Description:** Define how an enabled dev/test Formly extension identifies root
builds, labels evidence, redacts state, deduplicates captures, and reports
incomplete coverage. Record the decision before implementation. Capture is a
separate observed sibling artifact: it may corroborate a declared/static usage
or behavior result but cannot create form-root, journey, effect, or completeness
authority.

**Acceptance criteria:**

- [ ] No model values, services, controls, functions, or live fields cross the
      projection boundary.
- [ ] Stable application-provided IDs outrank generated temporary IDs.
- [ ] Captured-only, declared-only, and matched forms remain distinguishable.

**Verification:**

- [ ] A dedicated specification contains examples and threat cases.
- [ ] Maintainer approves the privacy and evidence rules.

**Dependencies:** Checkpoint B, `CTX-0A`, and approval of the RH-01 path/privacy
and runtime-observation identity rules. Nx Checkpoint C is optional and is not
an authority prerequisite.

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
workplace pilot guide cover `list`, `generate`, `check`, and read-only
factory-input authoring; linked and packed temporary consumers exercise the
artifact CLI. A standalone workspace package README and polished
empty-directory release walkthrough remain before this release task is
complete.

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

| Risk                                                                                        | Impact | Mitigation                                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config loader cannot resolve workplace aliases or Angular imports                           | High   | Run Task 1 before public API work; keep compiled/JS source adapter fallback                                                                                         |
| Root config becomes a nondeterministic arbitrary-code surface                               | High   | Trusted local/CI boundary, runtime validation, explicit plugin imports, recorded identities, no MCP execution                                                       |
| Nx version API churn expands scope                                                          | High   | Gate on workplace `nx report`; support one confirmed major first; isolate Nx package                                                                                |
| Lazy modules appear registered but are not visible                                          | High   | Require explicit configured feature scopes; report configured-scope coverage and absent lazy scopes as incomplete; runtime capture remains later corroboration only |
| Trusted JIT loading and AOT authoring are conflated                                         | High   | Keep Task 7C/8 and Task 8B on separate entry points, hosts, evidence, and compatibility gates; never fall back between them                                         |
| Source-lineage coverage appears complete when a leaf program or resolution input is missing | High   | Run `LIN-0` before public indexing; retain per-program coverage, semantic-resolution closure hashes, hard staleness, and incomplete query results                   |
| Application factory execution leaks live data or side effects                               | High   | Limit FAC-1/FAC-2 to inert DTO/projector work; use a code-free sidecar; block all imports/execution until `oci-rootless-v1` and the retained negative controls pass |
| Workspace index leaks model or environment information                                      | High   | Allowlisted index schema, privacy tests, no raw inputs or timestamps                                                                                                |
| Package ecosystem fragments too early                                                       | Medium | Keep config/runner/CLI in `workspace`; add only Angular and Nx integration packages                                                                                 |
| Nx topology is mistaken for form, usage, journey, or behavior authority                     | High   | Limit Nx to explicit marker enumeration and scheduling; validate resulting pinned artifacts through the generic workspace layer                                     |
| 100-form runs or source indexing become slow                                                | Medium | Measure cold/incremental time, memory, and artifact size at `LIN-0`; use bounded workers and aggregate Nx caching only after correctness gates pass                 |
| Project/form IDs collide across products                                                    | Medium | Global deterministic duplicate gate before artifact success                                                                                                         |
| Migration capture is mistaken for completeness                                              | Medium | Explicit incomplete status and separate evidence/inventory reports                                                                                                  |

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
7. Which source path/route disclosure mode and cold/incremental lineage budgets
   are acceptable for local versus remotely exposed consumers?
8. Which workplace Angular application target and custom-field scopes form the
   minimum `ANG-1`/`ANG-GATE` matrix?
9. Is a maintained provider capable of satisfying the exact
   `oci-rootless-v1`/violation-ledger negative controls available? Until it is,
   application factory execution remains out of scope.

## Remaining approval and workplace-evidence gates

- [ ] Formally accept or revise ADR 0007, which remains `Proposed` even though
      its generic configuration boundary is implemented.
- [x] Use Checkpoint A as the first shipping target.
- [x] Keep Angular resolved scenarios in Checkpoint B rather than requiring them
      for the first generic workplace pilot.
- [x] Complete `RH06-DOC` and `CTX-0A`.
- [x] Land `CTX-0B` through `CTX-0D` before any new producer publishes one of
      those sibling artifact families.
- [ ] Pass `LIN-0` before implementing public source-lineage indexing.
- [ ] Implement `ANG-0` and pass the retained Angular CLI/Nx `ANG-1` gate before
      Task 7A.3 or any JIT/AOT Angular host behavior.
- [ ] Approve `BHV-0`/`BHV-1` before Task 8 publishes scenario evidence.
- [ ] Keep FAC-3/FAC-4 blocked until `oci-rootless-v1` and the catch-resistant
      negative controls pass; Task 11C cannot substitute for this gate.
- [ ] Supply the workplace Nx version before Phase 3 compatibility claims or
      implementation begin.
