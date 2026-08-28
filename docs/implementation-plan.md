# Implementation Plan: Tomorrow's Parser MVP

**Document role:** Historical record of the completed parser foundation. The
current post-v0.4 scheduler is the
[agent-context hardening execution index](planning/agent-context-hardening/execution-index.md),
governed by the
[RH-06 reconciliation](planning/agent-context-hardening/rh-06-reconciliation.md).

**Current status:** Form Contract `0.4.0` is the implemented compatibility
boundary. `RH06-DOC` is complete; `CTX-0A`, `LIN-0`, and `BHV-0` are the only
ready lanes, and only `CTX-0A` writes product schema code.

## Delivery Target

By August 26, 2026, publish a GitHub-ready repository that extracts a synthetic
Formly configuration into a deterministic, agent-readable contract. Parser
correctness and a reproducible demo are the shipping gate. The MCP inspector is
a stretch task and cannot delay that gate.

The controlling requirements are in [the MVP specification](mvp-spec.md).

The separately requested modular browser fixture harness is specified in
[the Formly test application specification](formly-test-app-spec.md) and tracked
in [its task plan](planning/formly-test-app/task_plan.md). It remains test
infrastructure and does not change the parser dependency order below.

The first workplace integration exposed a focused v0.2 compatibility slice.
Its contract and execution boundaries are specified in
[the real-world semantics specification](v0.2-real-world-semantics-spec.md) and
tracked in [the v0.2 task plan](planning/v0.2-real-world/task_plan.md).

The reconciled agent-to-contract-to-Playwright consumer flow is summarized in the
[agent context and deterministic E2E delivery plan](planning/v0.4-e2e-authoring/agent-context-delivery-plan.md).
It remains a bounded schema/query/validator pilot before MCP transport or
Playwright drivers. Synthetic consumer proof may proceed while producers are
built, but a real workplace pilot waits until required producer artifacts join
under one current pinned context.

## Current Post-v0.4 Execution Authority

Form Contract `0.4.0` retains its implemented form tree, domains, interaction
profiles, locators, explicit effects, unknowns, diagnostics, and canonical
hashes. Source lineage, journeys, portable behavior/scenario records, Angular
observations, driver manifests, and agent-context manifests begin as strict
sibling record families. They are not retrofitted into v0.4; any later folding
requires an explicit schema decision.

The immediate consumer checkpoint spine is:

```text
RH06-DOC
   |
CTX-0A
   |----------------|
CTX-0B             CTX-0C
   |________________|
          |
       CTX-0D
          |
       CTX-1 -> CTX-2 (synthetic proof) ---------\
                                                  +-> CTX-GATE (real context)
       LIN-4 + BHV-4 + ANG-5 + DRV-0 -----------/
                                                        |
                                             MCP-1 -> PW-1 -> PW-2 -> PW-3
```

Producer branches advance in parallel only at the dependency points named in
the execution index. That index is normative when this summary omits a branch
or prerequisite. `CTX-GATE` is the real representative producer/workplace
context gate, not the synthetic proof, and both MCP and Playwright wait for its
go decision. `PW-1` schedules after `MCP-1`; its implementation may reuse the
pure core internally, but that does not create an alternative scheduler edge.

`CTX-0A` owns only the schema-addressed pinned artifact-set envelope, its
structured workspace-index anchor, and the required schema Changeset. `CTX-0B`
owns source-usage and journey schemas; `CTX-0C` owns scenario references and
exact execution-authority schemas; and `CTX-0D` owns only explicitly synthetic
positive/negative walkthrough fixtures. `CTX-1` selects the pure query module
boundary and owns live freshness comparison/status; `CTX-2` owns the
exhaustive consumer diagnostic policy. No TypeScript indexer, Angular host, MCP
server, validator, Playwright driver, or workplace evidence belongs in the
first shared-contract checkpoint.

Scenario ownership is split deliberately: RH-04 owns portable JSON-safe
semantics; `BHV-4` (workspace/Angular Task 8) owns trusted resolved-scenario
production pinned to the basis Form Contract hash after guarded JIT capability
`ANG-3`, the `ANG-2P` provider/project descriptor, `BHV-1`, `CTX-0C`, and
`CTX-0D` publication; RH-05 consumes and validates those artifacts. Existing
v0.4 explicit effects remain the authority
for business verbs such as `loads`, `filters`, `clears`, `toggles`, and
`controls-state`. A closed normalized rule with a pinned witness may authorize
only the exact state edge it proves; callbacks, helpers, hooks, RxJS pipelines,
and observations remain scaffold or corroborating evidence.

Package ownership follows [ADR 0008](decisions/0008-package-rename.md): shared
DTOs, runtime schemas, hashes, intent types, and diagnostics live in
`@formly-contract/schema`; semantic extraction lives in
`@formly-contract/compiler`; distributed producers and assembly live in
`@formly-contract/workspace`; and future transport/execution packages are
`@formly-contract/mcp` and `@formly-contract/playwright`. There is no separate
`test-intent` or `playwright-driver` package. The execution index controls the
exact dependencies and readiness status if this historical MVP sequence
conflicts with later planning.

## Dependency Order

The dependency order and task numbers below record the original parser MVP;
they do not supersede the current post-v0.4 execution authority above.

```text
compatibility proof
        |
contract schema and diagnostics
        |
canonical serializer and hash
        |
recursive Formly extractor
        |
synthetic golden form and demo CLI
        |
documentation and release check
        |
optional MCP inspector
```

Shared contracts are completed before consumers. Each task leaves the workspace
buildable or creates an explicit stop/go decision.

## One-Day Operating Schedule

These are timeboxes, not estimates to defend. When a box expires, use its
checkpoint to reduce scope instead of moving the parser shipping gate.

| Elapsed working time | Target |
| --- | --- |
| 0-1 hour | Tasks 1-2 and Checkpoint A |
| 1-2.5 hours | Tasks 3-4 and Checkpoint B |
| 2.5-5.5 hours | Tasks 5-6 |
| 5.5-6.5 hours | Task 7 and Checkpoint C |
| 6.5-8 hours | Tasks 8-9 and clean-clone verification |
| Remaining time | Optional Task 10 MCP inspector |

If compatibility or runtime-builder setup overruns, choose declared-config
extraction and preserve the missing runtime behavior as diagnostics. If parser
work overruns, reduce supported field properties before reducing determinism,
diagnostics, tests, or the fresh-clone demo.

## Phase 0: Fail Fast on Compatibility

### Task 1: Scaffold the smallest pnpm workspace

**Description:** Add only the root workspace, TypeScript, lint, test, and build
configuration required to run one package and one fixture.

**Acceptance criteria:**

- [x] Dependency versions and Node requirement are pinned.
- [x] Root lint, test, and build commands exist.
- [x] The minimal workspace passes all three commands.

**Verification:**

- [x] `pnpm install --frozen-lockfile`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`

**Dependencies:** None

**Files likely touched:**

- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `tsconfig.base.json`
- root lint/test configuration

**Estimated scope:** Medium

### Task 2: Prove Angular 20.3 and Formly 6.1 together

**Description:** Create the smallest synthetic typed field configuration and
prove the pinned libraries install and compile together. Attempt only the
minimum runtime setup needed to decide whether the parser can use Formly's
builder without a rendered host.

**Acceptance criteria:**

- [x] `FormlyFieldConfig[]` compiles against the pinned versions.
- [x] The experiment records whether `FormlyFormBuilder` is usable in the
  one-day harness.
- [x] Any peer, DI, or runtime incompatibility has a captured error and an
  explicit architecture decision.

**Verification:**

- [x] Focused compatibility test passes.
- [x] Decision is recorded in `docs/decisions/`.

**Dependencies:** Task 1

**Files likely touched:**

- `fixtures/synthetic-form/package.json`
- `fixtures/synthetic-form/src/compatibility.ts`
- `fixtures/synthetic-form/src/compatibility.test.ts`
- `docs/decisions/0002-extraction-boundary.md`

**Estimated scope:** Small

## Checkpoint A: Architecture Decision

- [x] Basic Angular/Formly type compatibility is established for the exact
  pinned pair.
- [x] Choose either controlled post-build extraction or declared-config
  extraction based on executable evidence.
- [x] Do not start MCP work.

## Phase 1: Establish the Contract

### Task 3: Define the v0 contract and diagnostics

**Description:** Define the smallest versioned DTOs needed to represent an
ordered form tree, model paths, constraints, options, evidence, and unknowns.

**Acceptance criteria:**

- [x] Runtime validation accepts a complete representative contract.
- [x] Malformed node identity, paths, and diagnostic values are rejected.
- [x] Diagnostic codes cover functions, async/Observable-like values, unknown
  field shapes, and unsupported rules.

**Verification:**

- [x] Focused schema tests pass.
- [x] TypeScript strict build passes.

**Dependencies:** Task 2

**Files likely touched:**

- `packages/schema/package.json`
- `packages/schema/src/contract.ts`
- `packages/schema/src/validation.ts`
- `packages/schema/src/contract.test.ts`

**Estimated scope:** Medium

### Task 4: Add canonical serialization and hashing

**Description:** Produce stable JSON ordering and a content hash without relying
on object insertion order or environment-specific values.

**Acceptance criteria:**

- [x] Equivalent contracts serialize to identical bytes.
- [x] Meaningful contract changes alter the content hash.
- [x] Hash input excludes the hash field itself and volatile timestamps.

**Verification:**

- [x] Determinism tests pass twice in separate processes.

**Dependencies:** Task 3

**Files likely touched:**

- `packages/schema/src/canonical-json.ts`
- `packages/schema/src/content-hash.ts`
- `packages/schema/src/canonical-json.test.ts`
- `packages/schema/src/index.ts`

**Estimated scope:** Small

## Checkpoint B: Contract Foundation

- [x] Schema tests pass.
- [x] Canonical output is readable and deterministic.
- [x] Public v0 fields are sufficient for the golden form; additions require a
  spec update.

## Phase 2: Deliver One Complete Parser Slice

### Task 5: Extract basic and nested fields

**Description:** Recursively project registered Formly configuration through an
allowlist into contract nodes.

**Acceptance criteria:**

- [x] Field order, parent/child structure, key-derived model paths, type, and
  presentation data are retained.
- [x] Required, length/range, pattern, and static options are represented.
- [x] Input objects are not mutated.

**Verification:**

- [x] Focused parser tests cover leaf and nested fields.
- [x] Mutation-safety test passes.

**Dependencies:** Tasks 3 and 4

**Files likely touched:**

- `packages/compiler/package.json`
- `packages/compiler/src/extract-form.ts`
- `packages/compiler/src/extract-form.test.ts`
- `packages/compiler/src/index.ts`

**Estimated scope:** Medium

## Phase 4: Real-World Form Semantics

### Task 11: Evolve the contract to v0.2

Add display nodes, dynamic-rule metadata, choice option-source metadata, and
resolved interaction state with strict runtime validation.

### Task 12: Correct declared extraction

Use structural IDs for every keyless node, classify template-only nodes as
display, and project recognized expression callbacks without executing them.

### Task 13: Add trusted scenario compilation

Use the caller's configured Formly builder and fresh synthetic inputs to
produce a resolved initial-state contract outside MCP/query paths.

**Current disposition:** This historical compiler primitive does not own the
RH-06 resolved-scenario producer. Portable scenario semantics belong to RH-04;
`BHV-4` (workspace/Angular Task 8) owns trusted production and basis-hash-pinned
resolved artifacts. `ANG-3` supplies only the guarded JIT-host capability and
does not itself produce resolved scenarios.

### Task 14: Prove workplace regressions

Cover keyless horizontal layouts, callback-driven required/readonly/options/
visibility, display templates, and dynamic-vs-empty choices in focused and
component-free integration tests.

## Phase 5: Portable Test Locators

### Task 15: Evolve the contract to v0.3

Add strict, evidence-tagged, multi-target locator DTOs to every node.

### Task 16: Project exact and derived locator candidates

Read configured Formly test attributes and IDs, support an opt-in immutable
identity deriver, and preserve an honest empty locator array.

### Task 17: Prove resolved evidence and composite widgets

Test expression-resolved test attributes through the real Formly builder and
multiple named DOM targets under one semantic node.

### Task 6: Extract arrays, conditions, and unknowns

**Description:** Extend the same vertical slice to array templates and declared
conditional behavior while producing diagnostics for unsafe values.

**Acceptance criteria:**

- [x] `fieldArray` template structure is retained without requiring realized
  model rows.
- [x] Safely representable condition metadata is preserved.
- [x] Functions, remote/async values, and unsupported constructs produce stable
  diagnostics instead of disappearing or being evaluated.

**Verification:**

- [x] Focused tests cover empty arrays, a conditional field, and every MVP
  diagnostic code.

**Dependencies:** Task 5

**Files likely touched:**

- `packages/compiler/src/extract-form.ts`
- `packages/compiler/src/extract-form.test.ts`
- `packages/schema/src/contract.ts`
- `packages/schema/src/contract.test.ts`

**Estimated scope:** Medium

### Task 7: Create the golden fixture and demo command

**Description:** Assemble the supported shapes into one invented form and make
the complete contract easy to inspect from the repository root.

**Acceptance criteria:**

- [x] Fixture contains no work-derived data.
- [x] `pnpm demo` emits valid canonical JSON and its hash.
- [x] Two consecutive runs are byte-for-byte identical.

**Verification:**

- [x] Demo smoke test passes from a clean build.
- [x] Golden contract output is reviewed for agent usability.

**Dependencies:** Task 6

**Files likely touched:**

- `fixtures/synthetic-form/src/golden-form.ts`
- `apps/demo-cli/package.json`
- `apps/demo-cli/src/main.ts`
- `apps/demo-cli/src/main.test.ts`
- root `package.json`

**Estimated scope:** Medium

## Checkpoint C: Parser Shipping Gate

- [x] Fresh-clone install, lint, test, build, and demo commands pass.
- [x] Contract answers: what fields exist, in what order, at what model paths,
  with what constraints/options, and what known flow/unknowns affect them.
- [x] Limitations are visible in output and README.
- [ ] If time is nearly exhausted, ship here.

## Phase 3: Package the Proof

### Task 8: Document installation, use, and limitations

**Description:** Make tomorrow's work pullable and testable without tribal
knowledge.

**Acceptance criteria:**

- [x] README includes exact setup and demo commands.
- [x] A minimal API example shows how a host registers and extracts a form.
- [x] Supported and unsupported behavior is explicit.

**Verification:**

- [x] Follow README instructions in a fresh clone or clean worktree.

**Dependencies:** Task 7

**Files likely touched:**

- `README.md`
- `docs/mvp-spec.md`
- `docs/planning/mvp-2026-08-26/progress.md`

**Estimated scope:** Small

### Task 9: Publish the testable GitHub repository

**Description:** After the parser shipping gate is green, add the approved
license, create or attach the GitHub remote, and publish the branch so it can be
cloned and tested at work. This task does not depend on the optional MCP task.

**Acceptance criteria:**

- [x] Repository owner, visibility, and license are approved.
- [x] The feature branch and its test evidence are available on GitHub.
- [x] A clone URL and exact verification commands are ready for the workplace
  test.

**Verification:**

- [x] Clone into a clean temporary directory.
- [x] Run frozen install, lint, test, build, and demo from that clone.

**Dependencies:** Task 8 and Checkpoint C

**Files likely touched:**

- `LICENSE`
- repository Git metadata and GitHub settings

**Estimated scope:** Small

### Task 10: Add a read-only MCP inspector if the gate is green

**Current disposition:** Historical, undispatched stretch task. It is not the
current production transport plan; `MCP-1` belongs to future
`@formly-contract/mcp` after `CTX-GATE`.

**Description:** Expose the already-produced golden contract through one small
resource or tool so its usefulness to an agent can be inspected. This task does
not add compilation, Angular execution, storage, or mutation to MCP requests.

**Acceptance criteria:**

- [ ] Inspector returns the same validated contract or compact node list.
- [ ] MCP-specific code does not enter the parser or schema packages.
- [ ] README labels the inspector experimental and non-production.

**Verification:**

- [ ] `pnpm mcp:inspect` smoke test passes.

**Dependencies:** Tasks 7 and 8; optional after Checkpoint C

**Files likely touched:**

- `apps/mcp-inspector/package.json`
- `apps/mcp-inspector/src/server.ts`
- `apps/mcp-inspector/src/server.test.ts`
- root `package.json`

**Estimated scope:** Medium; stretch

## Final Release Checkpoint

- [x] Parser shipping gate remains green.
- [x] Repository contains no private or work-derived data.
- [x] Approved license and GitHub remote are present.
- [x] Branch and PR metadata include exact test evidence.
- [x] Remaining architecture milestones are clearly labeled post-MVP.
- [ ] Publish a pre-1.0 tag only after the user has run the demo successfully.

## Execution Rules

- Work on one task at a time; parser tasks take priority over the MCP stretch.
- Keep each task to roughly two focused hours or less; split it before coding if
  it grows.
- Update `docs/planning/mvp-2026-08-26/progress.md` after each checkpoint.
- Record a decision when evidence changes the extraction boundary.
- Open GitHub issues for reproducible bugs or accepted follow-up work, not for
  the active one-day task list.
- Do not add a new feature unless it is required by an MVP success criterion.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Formly 6.x behaves incorrectly with an Angular 20+ combination despite its broad Angular peer range | High | Publish the broader usage target with the exact Angular `20.3.29` and Formly `6.1.8` reference pairing identified as the strongest executable evidence, and require consuming applications to validate other combinations. |
| `FormlyFormBuilder` requires more Angular runtime setup than fits in one day | High | Fall back to a declared-config extractor and label runtime defaults/expressions unknown. |
| “Understand flow” expands into full rule evaluation | High | Represent ordering, hierarchy, arrays, declarations, and unknowns; defer witness solving and runtime parity. |
| MCP work consumes the delivery window | Medium | MCP starts only after Checkpoint C and remains removable. |
| Public API hardens too early | Medium | Publish a versioned v0 contract and pre-1.0 package; require decisions for breaking changes. |
| Synthetic fixture is too simple to expose real problems | Medium | Include nesting, arrays, validation, a condition, and an opaque construct in one small form. |

## Post-MVP Increments

The earlier aspirational increment list is superseded by RH-06 and the
execution index. The current order is:

1. complete and verify `RH06-DOC`;
2. land `CTX-0A`, then `CTX-0B` and `CTX-0C`, then the explicitly synthetic
   `CTX-0D` fixtures;
3. advance source-lineage, behavior/scenario, Angular, and safe factory
   producers only when their execution-index schema and compatibility
   dependencies are satisfied;
4. implement `CTX-1` pure queries and `CTX-2` typed intent/validation over the
   synthetic records; `CTX-2` exits only when the synthetic positive/negative
   proof passes;
5. advance the canonical real producers `LIN-4`, `BHV-4`, `ANG-5`, and `DRV-0`
   according to the execution index;
6. run `CTX-GATE` only when those producers and `CTX-2` join one current pinned
   representative producer/workplace context;
7. add `MCP-1` in future `@formly-contract/mcp` after the real-context gate;
8. schedule `PW-1` after both `CTX-GATE` and `MCP-1` in future
   `@formly-contract/playwright` for the native vertical;
9. add `PW-2` only after resolved Angular/behavior producer evidence exists;
   and
10. add `PW-3` only after the custom/dynamic and browser-conformance gates.

The controlled-host requirements below still apply to the workspace/Angular
producer branch. That increment is complete only when packed strict-pnpm
consumers prove CLI and programmatic composition; project-specific runtime and
tsconfig bases work; Angular aliases and version conflicts fail before import;
no facade reaches the parent/Nx daemon; worker order/failure cannot change or
partially publish a workspace index; portable provenance excludes machine
paths; and isolated CI either proves network denial or fails closed. The generic
in-process runner remains the Node-safe baseline until that gate is complete.
