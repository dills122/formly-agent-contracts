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

## Next

- Begin implementation-plan Task 3: define the v0 contract and diagnostics.

## Tests

- `pnpm install --frozen-lockfile` passes with strict peers and engine checks.
- `pnpm lint` passes with type-aware TypeScript rules.
- `pnpm test` passes: one compatibility test.
- `pnpm build` passes with strict TypeScript checking and no emit.
- `pnpm check:docs` passes for the tracked Markdown files.
- `pnpm audit --audit-level=high` reports no known vulnerabilities.
