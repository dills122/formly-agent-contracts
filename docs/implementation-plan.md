# Implementation Plan: Tomorrow's Parser MVP

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

## Dependency Order

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

- `packages/contract-schema/package.json`
- `packages/contract-schema/src/contract.ts`
- `packages/contract-schema/src/validation.ts`
- `packages/contract-schema/src/contract.test.ts`

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

- `packages/contract-schema/src/canonical-json.ts`
- `packages/contract-schema/src/content-hash.ts`
- `packages/contract-schema/src/canonical-json.test.ts`
- `packages/contract-schema/src/index.ts`

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

- `packages/formly-adapter/package.json`
- `packages/formly-adapter/src/extract-form.ts`
- `packages/formly-adapter/src/extract-form.test.ts`
- `packages/formly-adapter/src/index.ts`

**Estimated scope:** Medium

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

- `packages/formly-adapter/src/extract-form.ts`
- `packages/formly-adapter/src/extract-form.test.ts`
- `packages/contract-schema/src/contract.ts`
- `packages/contract-schema/src/contract.test.ts`

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
| Formly 6.1 behaves incorrectly with Angular 20 despite its broad peer range | High | Run Task 2 first and publish the exact supported pairing only after an executable proof. |
| `FormlyFormBuilder` requires more Angular runtime setup than fits in one day | High | Fall back to a declared-config extractor and label runtime defaults/expressions unknown. |
| “Understand flow” expands into full rule evaluation | High | Represent ordering, hierarchy, arrays, declarations, and unknowns; defer witness solving and runtime parity. |
| MCP work consumes the delivery window | Medium | MCP starts only after Checkpoint C and remains removable. |
| Public API hardens too early | Medium | Publish a versioned v0 contract and pre-1.0 package; require decisions for breaking changes. |
| Synthetic fixture is too simple to expose real problems | Medium | Include nesting, arrays, validation, a condition, and an opaque construct in one small form. |

## Post-MVP Increments

1. Validate the parser against a sanitized shape recreated from the target work
   application without copying its data or code.
2. Add a host integration API for application-equivalent Formly providers.
3. Add runtime-builder parity for type defaults, wrappers, and initial
   expressions.
4. Expand semantic rule representation and scenario resolution.
5. Add custom type adapters and stable DOM identity.
6. Add production MCP packaging only when its deployment boundary is known.
7. Add Playwright intent and execution in a separate project milestone.
