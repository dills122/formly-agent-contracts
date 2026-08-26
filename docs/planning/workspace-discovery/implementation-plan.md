# Implementation Plan: Distributed Workspace Form Discovery

Status: draft for maintainer review; implementation has not started

Related research:
[Scalable Form Discovery and Registration](../../research/form-discovery-dx.md)

Proposed decision:
[ADR 0007](../../decisions/0007-distributed-workspace-discovery.md)

## Overview

Build a typed workspace layer that discovers project-local Formly contract
sources across applications, libraries, and packages. The first vertical slice
must turn one root config and several project configs into deterministic
contract artifacts without Angular or Nx coupling. Angular and Nx integrations
then add distributed providers, trusted scenario compilation, inferred tasks,
and affected execution. Runtime capture remains an optional migration phase.

The plan preserves the existing schema and extraction boundaries. No task may
silently execute application code from an MCP request, infer arbitrary form
roots, serialize model values, or invent selectors.

## Architecture decisions

- Add only three packages in this increment: `workspace`, `angular`, and `nx`.
- Keep configuration, discovery, runner, and CLI together in `workspace` until
  independent consumers justify more packages.
- Use root config for workspace policy and project config for local ownership.
- Treat source catalogs as the unit of integration so one adapter can expose
  many forms.
- Use Jiti as the leading TypeScript config-loader candidate, subject to an
  executable compatibility gate.
- Keep Angular and Nx optional; neither enters `contract-schema` or the runtime
  dependency surface of `formly-adapter`.
- Treat capture as incomplete migration evidence, never authoritative declared
  inventory.

## Dependency graph

```text
Task 1: config-loader gate
       |
Task 2: workspace package scaffold
       |
Task 3: typed config + source contracts
       |
Task 4: root/project discovery
       |
Task 5: first artifact-generation vertical slice
       |
Task 6A: generic CLI
       |
Task 6B: multi-package consumer fixture
       |
Checkpoint A: generic pilot
       |
Task 7A: Angular package scaffold
       |
Task 7B: Angular provider bridge
       |
Task 8: trusted Angular scenario host
       |
Checkpoint B: Angular pilot
       |
Task 9: Nx version gate
       |
Task 10A: Nx package scaffold
       |
Task 10B: inferred Nx target
       |
Task 11A: Nx executor
       |
Task 11B: Nx generators
       |
Task 12A: Nx fixture shell
       |
Task 12B: Nx fixture projects
       |
Task 12C: cache/affected end-to-end proof
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

## Phase 0: Fail-fast feasibility and contracts

### Task 1: Prove the trusted config-loading boundary

**Description:** Create a controlled fixture that loads root and project configs
through Jiti using ESM, CommonJS, TypeScript, and a representative `tsconfig`
path alias. Compare behavior with native Node loading and document why the
selected loader satisfies the supported Node range.

**Acceptance criteria:**

- [ ] The async loader reads all four representative config/module formats.
- [ ] Path aliases resolve only when an explicit project `tsconfig` is supplied.
- [ ] A malformed export and a missing file produce stable, actionable errors.

**Verification:**

- [ ] Focused loader fixture tests pass on Node `22.22.1`.
- [ ] CI covers the minimum supported Node version or the engine floor is
      intentionally raised before publication.
- [ ] The research document records the observed commands and result.

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

- [ ] `@formly-agent-contracts/workspace` builds as ESM with declarations.
- [ ] Its dependency graph includes schema/adapter but no Angular or Nx package.
- [ ] Package metadata and exports follow the two existing public packages.

**Verification:**

- [ ] `pnpm --filter @formly-agent-contracts/workspace build`
- [ ] `pnpm lint`

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

- [ ] `defineConfig` and `defineFormContractProject` are typed identity helpers.
- [ ] Runtime validation rejects unknown keys, duplicate plugin IDs, invalid
      globs/paths, unsafe output locations, and malformed source definitions.
- [ ] Precedence is documented as defaults, root config, project config, then
      explicit CLI override; supported arrays replace rather than deep-merge.

**Verification:**

- [ ] Focused config validation tests cover valid and invalid inputs.
- [ ] Equivalent inputs produce byte-identical resolved JSON-safe config.

**Dependencies:** Task 2

**Files likely touched:**

- `packages/workspace/src/config.ts`
- `packages/workspace/src/config.test.ts`
- `packages/workspace/src/source.ts`
- `packages/workspace/src/index.ts`

**Estimated scope:** Medium

## Phase 1: Generic workspace vertical slice

### Task 4: Discover root and project configs deterministically

**Description:** Load one root config, expand its project-config globs, apply
exclusions, load project descriptors, and return a sorted inventory with source
provenance. Discovery must not import arbitrary files outside matched configs.

**Acceptance criteria:**

- [ ] Project configs across `apps`, `libs`, and `packages` are sorted by
      normalized workspace-relative path and stable project ID.
- [ ] Duplicate project/source IDs fail before any form factory executes.
- [ ] Discovery output records config paths and plugin identities without
      timestamps or environment-dependent ordering.

**Verification:**

- [ ] Focused tests cover globs, exclusions, duplicates, empty workspaces, and
      paths containing spaces.
- [ ] Consecutive discovery runs return identical canonical output.

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

**Acceptance criteria:**

- [ ] One bulk factory-map source and one registry-adapter source generate
      contracts without individual root-config entries.
- [ ] Form IDs are globally unique and output paths cannot escape the configured
      artifact directory.
- [ ] The workspace index records contract hashes, source/project IDs, evidence,
      config/plugin identities, and diagnostics without model values.

**Verification:**

- [ ] Runner tests compare generated artifacts with canonical snapshots.
- [ ] Consecutive runs produce byte-identical files and index ordering.
- [ ] A duplicate form ID and a throwing factory leave no falsely successful
      aggregate index.

**Dependencies:** Task 4

**Files likely touched:**

- `packages/workspace/src/run-workspace.ts`
- `packages/workspace/src/run-workspace.test.ts`
- `packages/workspace/src/workspace-index.ts`
- `packages/workspace/src/workspace-index.test.ts`
- `packages/workspace/src/index.ts`

**Estimated scope:** Medium

### Task 6A: Ship the generic CLI

**Description:** Add a `formly-contracts` binary with `generate`, `list`, and
`check` commands over the workspace runner.

**Acceptance criteria:**

- [ ] `generate` writes artifacts, `list` reports the inventory without running
      factories, and `check` validates committed/current artifacts.
- [ ] CLI failures have stable exit codes and concise project/form provenance.
- [ ] Command help and failures identify config, project, and form provenance
      without stack traces by default.

**Verification:**

- [ ] CLI unit tests cover parsing and exit behavior.
- [ ] Focused CLI tests execute all three commands against temporary fixtures.

**Dependencies:** Task 5

**Files likely touched:**

- `packages/workspace/src/cli.ts`
- `packages/workspace/src/cli.test.ts`
- `package.json`

**Estimated scope:** Medium

### Task 6B: Prove the CLI in a consumer-shaped monorepo fixture

**Description:** Add a small synthetic monorepo fixture containing one app, two
libraries, a root config, and project configs that use a factory map and a
registry adapter. Keep each fixture module intentionally small.

**Acceptance criteria:**

- [ ] The fixture requires one root config and one config per form-owning
      project, not one root entry per form.
- [ ] At least six forms are exposed through two bulk source patterns.
- [ ] Generated artifacts and the workspace index match committed golden files.

**Verification:**

- [ ] A linked-package smoke test executes `list`, `generate`, and `check`.
- [ ] A packed-tarball smoke test executes `generate` outside this workspace.
- [ ] `pnpm check` passes at Checkpoint A.

**Dependencies:** Task 6A

**Files likely touched:**

- `fixtures/workspace-monorepo/package.json`
- `fixtures/workspace-monorepo/formly-contracts.config.ts`
- `fixtures/workspace-monorepo/apps/demo/formly-contracts.project.ts`
- `fixtures/workspace-monorepo/libs/basic/formly-contracts.project.ts`
- `fixtures/workspace-monorepo/libs/dynamic/formly-contracts.project.ts`

**Estimated scope:** Medium; form definitions may reuse existing synthetic
fixture exports rather than duplicate files

## Checkpoint A: Generic workspace pilot

- [ ] One root config discovers at least three project configs.
- [ ] Bulk sources generate deterministic declared contracts and a safe index.
- [ ] Linked or packed packages work from the consumer fixture.
- [ ] Full lint, tests, builds, demo, and documentation checks pass.
- [ ] Maintainer reviews the actual config and artifact UX before Angular/Nx API
      work begins.

## Phase 2: Angular integration

### Task 7A: Scaffold the Angular integration package

**Description:** Add a publishable Angular integration package with peer
dependencies, build configuration, and an empty public entry point. Do not add
provider or compiler behavior yet.

**Acceptance criteria:**

- [ ] `@formly-agent-contracts/angular` builds as ESM with declarations.
- [ ] Angular core/forms and Formly are peers, not workspace runtime dependencies.
- [ ] Neither schema, adapter, nor workspace gains an Angular dependency.

**Verification:**

- [ ] `pnpm --filter @formly-agent-contracts/angular build`
- [ ] Dependency audit confirms the intended package direction.

**Dependencies:** Checkpoint A

**Files likely touched:**

- `packages/angular/package.json`
- `packages/angular/tsconfig.json`
- `packages/angular/tsconfig.build.json`
- `packages/angular/src/index.ts`

**Estimated scope:** Medium

### Task 7B: Productize distributed Angular source providers

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

**Dependencies:** Task 7A

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

**Dependencies:** Task 7B

**Files likely touched:**

- `packages/angular/src/compile-project.ts`
- `packages/angular/src/compile-project.test.ts`
- `packages/angular/src/config.ts`
- `packages/angular/src/index.ts`
- synthetic Angular integration fixture

**Estimated scope:** Medium

## Checkpoint B: Angular consumer pilot

- [ ] Multiple Angular feature sources compile through one project config.
- [ ] Both NgModule and standalone contribution are documented.
- [ ] Trusted scenario execution is isolated from CLI/MCP query handling.
- [ ] A work-like synthetic dynamic form demonstrates locator and state results.
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

- [ ] `@formly-agent-contracts/nx` builds against the approved Nx major.
- [ ] Nx remains a peer/optional integration dependency and does not enter
      workspace runtime dependencies.
- [ ] Package exports reserve the plugin entry point without executor behavior.

**Verification:**

- [ ] `pnpm --filter @formly-agent-contracts/nx build`
- [ ] Package metadata validation passes.

**Dependencies:** Task 9

**Files likely touched:**

- `packages/nx/package.json`
- `packages/nx/tsconfig.json`
- `packages/nx/tsconfig.build.json`
- `packages/nx/src/index.ts`

**Estimated scope:** Medium

### Task 10B: Infer a contract target from each project marker

**Description:** Add the optional Nx plugin and use the supported CreateNodes API
to detect project configs and infer a `form-contracts` target with explicit
inputs and outputs.

**Acceptance criteria:**

- [ ] Only projects containing a matching project config receive the target.
- [ ] Target inputs include the root config, project config, owned source files,
      dependency production inputs, and relevant package versions.
- [ ] Target outputs are isolated per Nx project and do not collide.

**Verification:**

- [ ] CreateNodes unit tests cover apps, libraries, packages, exclusions, and
      duplicate target configuration.
- [ ] `nx show project <fixture> --json` shows the inferred target and provenance.

**Dependencies:** Task 10A

**Files likely touched:**

- `packages/nx/src/plugin.ts`
- `packages/nx/src/plugin.test.ts`
- `packages/nx/src/index.ts`
- `nx.json` fixture configuration

**Estimated scope:** Medium

### Task 11A: Execute workspace generation through Nx

**Description:** Add an executor that delegates to the workspace runner without
duplicating discovery, extraction, or artifact behavior.

**Acceptance criteria:**

- [ ] The executor delegates compilation rather than duplicating workspace
      logic.
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

### Task 12B: Add form-owning and unrelated Nx fixture projects

**Description:** Add three minimal projects: one form-owning application, one
shared form library it depends on, and one intentionally unrelated library.
Keep project configs and synthetic forms colocated in one small file per project.

**Acceptance criteria:**

- [ ] Two projects own forms and one project is intentionally unrelated.
- [ ] The inferred target and dependency edge are visible through `nx show`.
- [ ] A baseline run creates deterministic, project-isolated artifacts.

**Verification:**

- [ ] `nx run-many -t form-contracts` succeeds for the eligible projects.
- [ ] Baseline artifact hashes are identical across two clean runs.

**Dependencies:** Task 12A

**Files likely touched:**

- `fixtures/nx-workspace/apps/demo/formly-contracts.project.ts`
- `fixtures/nx-workspace/libs/forms/formly-contracts.project.ts`
- `fixtures/nx-workspace/libs/unrelated/project.json`
- fixture baseline artifact/index files

**Estimated scope:** Medium

### Task 12C: Prove caching and affected execution end to end

**Description:** Build a minimal Nx fixture with three projects and verify cold,
cached, changed-project, shared-dependency, and unaffected runs against real
artifact outputs.

**Acceptance criteria:**

- [ ] A second unchanged run is restored from cache.
- [ ] Changing one form-owning library reruns its contract target and dependent
      aggregate target but not unrelated projects.
- [ ] Changing the root locator policy invalidates every relevant contract
      target.

**Verification:**

- [ ] End-to-end commands and expected affected project sets are asserted in CI.
- [ ] `nx affected -t form-contracts` succeeds in the fixture.
- [ ] `pnpm check` and package tarball smoke tests pass at Checkpoint C.

**Dependencies:** Task 12B

**Files likely touched:**

- `packages/nx/src/e2e.test.ts`
- CI workflow for the supported Nx fixture

**Estimated scope:** Medium

## Checkpoint C: Workplace-ready discovery path

- [ ] A new form-owning Nx project needs only a local project config.
- [ ] Existing registries and factory maps can be adapted in bulk.
- [ ] Generic, Angular, and Nx package boundaries remain acyclic and optional.
- [ ] Cached and affected execution is demonstrated, not inferred.
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
consumer guides for provider composition, trusted scenarios, inferred targets,
affected execution, and optional migration capture.

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

- [ ] The release manifest contains only schema, adapter, workspace, Angular,
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
| 100-form runs become slow | Medium | Per-project outputs, Nx cache/affected execution, later bounded concurrency after determinism proof |
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

## Plan approval gate

Implementation starts only after the maintainer:

- [ ] accepts or revises ADR 0007;
- [ ] approves Checkpoint A as the first shipping target;
- [ ] confirms whether the first pilot must include Angular resolved scenarios;
      and
- [ ] supplies the workplace Nx version before Phase 3 begins.
