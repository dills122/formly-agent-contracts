# Progress: Modular Formly Test Application

## Log

- 2026-08-25: Updated from `main` and created branch
  `codex/formly-fixture-test-app`.
- 2026-08-25: Defined the fixture registry contract and proved deterministic
  discovery, unique IDs, feature breadth, and fresh fixture instances with
  failing-then-passing tests.
- 2026-08-25: Added root and child Formly registration modules for native
  controls, custom currency and rating controls, a repeat-section type, a
  wrapper, validator, validation message, extension, and preset.
- 2026-08-25: Added twelve synthetic fixtures across applicant, operations, and
  edge-case modules. The corpus covers nested groups, model-key variants,
  repeaters, expressions, validation, form state, opaque behavior, and an
  isolated legacy-v6 fixture.
- 2026-08-25: Added the browser catalog and production Angular application
  build for Angular 20.3.29 and Formly 6.1.8.
- 2026-08-25: Browser-smoked all twelve catalog entries. The custom rating
  control accepted a value, the defect repeater added a second row, and the
  browser console reported no warnings or errors.
- 2026-08-25: Merge-readiness review added explicit scalar-repeater coverage
  and accessible names for native text, textarea, select, and currency inputs.
- 2026-08-25: Scoped Angular's build-only Piscina and Vite dependencies to
  their first patched releases after the audit reported two high-severity
  advisories. The high-severity audit now passes with three low findings.

## Tests

- `pnpm test` passes: five files and sixteen tests.
- `pnpm lint` passes with type-aware TypeScript rules.
- `pnpm build` passes, including the Angular production AOT build.
- `pnpm install --frozen-lockfile --offline` passes.
- `pnpm audit --audit-level=high` passes with three low findings.
- Browser smoke passes for all twelve fixtures and representative custom and
  repeated controls.

## Next

- Publish the reviewed branch and pull request.
