# Progress: August 26 Parser MVP

## Log

- 2026-08-25 16:54 EDT: Confirmed the first delivery is the parser/contract
  product, using synthetic fixtures, Angular 20, Formly 6.1, pnpm, and
  repository Markdown planning.
- 2026-08-25 16:54 EDT: Verified official package metadata for Angular 20.3.29
  and Formly 6.1.8. Recorded the version-guidance mismatch as the first
  implementation risk.
- 2026-08-25 16:54 EDT: Created the MVP specification, dependency-ordered plan,
  delivery process, first ADR, findings, and task plan on branch
  `codex/mvp-delivery-plan`.
- 2026-08-25: Added the MIT license, Git hygiene, contribution and security
  guidance, issue/PR templates, and a dependency-free documentation workflow.
- 2026-08-25: Published the initial commit to the public GitHub repository at
  `dills122/formly-agent-contracts` under the MIT License.
- 2026-08-25: Protected `main`, required the passing documentation check and
  pull requests, enabled secret scanning and push protection, enabled
  Dependabot security updates, and restricted default Actions permissions to
  read-only.
- 2026-08-25 17:37 EDT: Pinned Node 22.22.1, pnpm 10.23.0, TypeScript 5.9.3,
  Angular 20.3.29, Formly 6.1.8, and the minimal lint/test/build toolchain.
- 2026-08-25 17:37 EDT: Proved the intended failure first: after Angular's
  compiler was loaded, the focused compatibility test failed because the
  implementation module did not yet exist.
- 2026-08-25 17:37 EDT: The first builder attempt failed with an uninitialized
  TestBed environment (`Cannot read properties of null (reading 'ngModule')`).
  Initializing Angular's public browser testing platform fixed the setup error;
  the deprecated dynamic testing package was removed from the experiment.
- 2026-08-25 17:37 EDT: Initialized Angular's public browser testing platform
  and proved `FormlyFormBuilder` resolves a nested synthetic tree, controls,
  parent links, and registered type defaults without mounting a component.
- 2026-08-25 17:37 EDT: Recorded the controlled compiler boundary in ADR 0002
  and added the workspace quality gate to GitHub Actions.
- 2026-08-25 18:49 EDT: Fast-forwarded to fresh `main` at `46842b4` and
  inventoried the new twelve-form synthetic corpus across applicant,
  operations, and edge-case modules.
- 2026-08-25 18:49 EDT: Verified the refreshed baseline with a frozen install,
  16 passing tests, strict lint/type checks, the Angular production build, and
  documentation checks.
- 2026-08-25 18:49 EDT: Started contract-foundation Tasks 3 and 4 on
  `codex/mvp-contract-foundation` before any adapter or MCP implementation.
- 2026-08-25 18:56 EDT: Defined schema version `0.1.0` in ADR 0003 and added
  typed DTOs, strict runtime validation, canonical JSON, SHA-256 hashing, and a
  publishable `@formly-agent-contracts/contract-schema` package boundary.
- 2026-08-25 18:56 EDT: Completed the contract TDD cycle: the two focused test
  files first failed on missing implementation modules, then passed all ten
  schema and determinism behaviors.
- 2026-08-25 18:58 EDT: Pre-merge review found test files were not included in
  strict TypeScript checking. Added package-level test-source type-checking,
  fixed immutable negative-test construction, and made runtime parsing reject
  stale content hashes with an eleventh focused test.
- 2026-08-25 19:02 EDT: Merged the reviewed contract foundation through PR #5
  after the Documentation and Workspace checks passed, then fast-forwarded
  local `main` to `f735ebe`.
- 2026-08-25 19:16 EDT: Completed adapter Tasks 5 and 6 with Formly v6 key-path
  compatibility, versioned stable node identities, recursive allowlisted
  projection, array templates, declared conditions, and explicit diagnostics
  that never execute opaque functions.
- 2026-08-25 19:16 EDT: Added focused adapter tests plus an integration suite
  that compiles all twelve synthetic application fixtures into valid,
  repeatable contracts. Recorded the identity rule in ADR 0004.
- 2026-08-25 19:20 EDT: Pre-merge review found that a duplicate-key fallback
  could collide with a legitimate path ending in the same suffix. Proved the
  failure with a focused test, then added deterministic collision resolution.
- 2026-08-25 19:23 EDT: PR #6 exposed a clean-checkout-only lint failure:
  workspace package types resolved locally through stale build output, while
  CI correctly had no `dist` directories before lint. Added root TypeScript
  source-path mappings for lint/test, kept adapter emission pointed at the
  already-built contract declarations, and enabled `noEmitOnError` globally.
  The clean-artifact lint/test reproduction and complete local gate now pass.
- 2026-08-25 19:25 EDT: Merged adapter PR #6 after both required GitHub checks
  passed and fast-forwarded fresh `main` to `dcf41aa`.
- 2026-08-25 19:30 EDT: Completed golden-demo Tasks 7 and 8 with a fully
  invented fixture, deterministic CLI, root `pnpm demo`, built-artifact smoke
  validation, and README setup, API, support, and limitation guidance.
- 2026-08-25 19:34 EDT: Cloned the pushed demo branch from GitHub into a fresh
  temporary directory. Frozen install, all 36 tests, lint, four-package demo
  build, Angular production build, demo smoke validation, documentation checks,
  and the documented `pnpm demo` command all passed without local artifacts.
- 2026-08-25 19:36 EDT: Opened final MVP PR #7 with the clean-clone evidence,
  exact demo hash, clone URL, and workplace verification commands.

## Next

- Merge final MVP PR #7 after its required GitHub checks pass.

## Tests

- `pnpm install --frozen-lockfile` passes with strict peers and engine checks.
- `pnpm lint` passes with type-aware TypeScript rules.
- `pnpm test` passes: one compatibility test.
- `pnpm build` passes with strict TypeScript checking and no emit.
- `pnpm check:docs` passes for the tracked Markdown files.
- `pnpm audit --audit-level=high` reports no known vulnerabilities.
- Contract-foundation full gate: 27 tests pass across seven files; strict lint,
  contract package build, fixture type-check, Angular production build, and 21
  documentation-file checks pass.
- The high-severity audit gate passes; pnpm reports three existing low-severity
  development dependency findings.
- Adapter-focused tests pass: five unit scenarios cover basic/nested fields,
  key paths, arrays, conditions, every MVP diagnostic, mutation safety, and
  non-execution of opaque functions, including adversarial ID collisions.
- Test-app integration passes for all twelve registered synthetic form
  definitions, including stable hashes, representative conditions, array
  templates, and the three opaque behavior classes present in that corpus.
- Golden demo test and built-artifact smoke check pass; `pnpm demo` emits the
  valid `demo.golden-form` contract with a stable SHA-256 content hash and an
  explicit `OPAQUE_FUNCTION` diagnostic.
