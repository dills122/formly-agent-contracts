# Round 2 of 3 — Claude Independent Review

- Reviewer: authenticated Claude CLI, fresh no-session task in plan/read-only mode
- Review boundary: `origin/main` at `fd5e77c` through the staged working tree
- Initial verdict: **Not ready — one blocking finding**
- Disposition: all three actionable findings accepted; minor note accepted

## Independent verification

Claude independently ran the four focused tests, executable report, focused
no-cache ESLint, documentation checks for 114 files, and diff checks. It
hand-traced emission extraction, hazard traversal, usage classification, and
literal enumeration, and checked the proposed ownership against actual package
dependencies and workspace source-Program code.

## Findings and dispositions

### Blocking — Analyzer ownership conflicted with the authoritative Program

**Accepted.** The round-one correction assigned analysis to
`packages/compiler`, but compiler has no TypeScript dependency and does not own
the source-linkage Program. Workspace already constructs and validates the
authoritative leaf Program in `source-program.ts` and consumes it in source
usage indexing. Constructing another Program would break symbol identity;
passing compiler objects across the package boundary would create an unspecified
reverse contract.

Reconciliation:

- `packages/workspace` now owns factory input analysis and the complete
  ephemeral descriptor beside the exact Program/checker used for lineage.
- No second Program may be constructed and no TypeScript object/full descriptor
  crosses to compiler.
- Workspace emits a bounded canonical report and typed application scaffold.
  The scaffold references compiler-owned RH-02 inert authoring helpers;
  compiler retains binding validation/materialization without a TypeScript
  dependency.
- The existing code-free registration sidecar remains separate.

### Non-blocking — Stored function body did not distinguish callback input from scalar input

**Accepted and fixed before round 3.** The use-site label is now
`inside-stored-function`, not a materialization decision. The retained fixture
adds a typed boolean read in the same stored-function shape as a callback. Tests
prove its property type has no call signature. The plan now requires both a
reviewed storage position and a supported call signature on the input property
before generating a captured callback; scalars remain explicit.

### Non-blocking — Immediate capability call lacked retained coverage

**Accepted and fixed before round 3.** The fixture now calls
`options.service.load()` during construction and asserts
`construction-call`. The analyzer never calls the capability; the generated
plan requires an explicit reviewed binding or refusal.

### Minor — RxJS fixture resolution path was implicit

**Accepted.** The evidence section now explains that declaration and runtime
probes deliberately use the pinned RxJS 7.8.2 copy under
`apps/formly-test-app/node_modules` and must be updated together.

## Reviewer-confirmed claims

Claude confirmed the TypeScript/RxJS research substance, exact static-source
allowlist, subscription boundary, round-one remediations, NIGO hypothesis label,
and canonical RH-02/Task 8/FAC safety boundaries. Its blocker was architectural
ownership, not the Observable conclusion or experiment validity.

## Post-reconciliation verification

Focused Vitest remains 1 file, 4 tests passing with the new scalar and service
assertions. Complete verification is refreshed before round 3.
