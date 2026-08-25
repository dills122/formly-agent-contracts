# Task Plan: Modular Formly Test Application

## Dependency Order

```text
fixture contract and registry
            |
Formly type/config modules
            |
feature fixture modules
            |
browser catalog host
            |
build, runtime smoke, and documentation
```

## Phase 1: Registry Foundation

- [x] Add failing registry tests for deterministic discovery, unique IDs,
  required feature breadth, and fresh instances.
- [x] Implement the fixture contract, multi-provider token, and registry.
- [x] Verify the focused registry tests pass.

## Phase 2: Formly Integration

- [x] Add failing integration tests for root/child registration and controlled
  builds of all fixtures.
- [x] Implement native field components and registration module.
- [x] Implement custom fields, repeat-section type, wrapper, validator,
  extension, preset, and registration module.
- [x] Verify registered configuration through the public Formly APIs.

## Phase 3: Fixture Corpus

- [x] Add applicant feature fixtures and module providers.
- [x] Add operations feature fixtures and module providers.
- [x] Add edge-case, opaque, and isolated legacy-v6 fixtures and providers.
- [x] Verify at least twelve forms satisfy the feature coverage test.

## Phase 4: Browser Application

- [x] Add the root NgModule, catalog component, browser entry point, styling,
  and Angular application-builder configuration.
- [x] AOT-build the application.
- [x] Serve and inspect representative native, custom, and repeated forms in a
  browser with no console errors.

## Phase 5: Delivery

- [x] Update README, MVP boundary, implementation plan, and progress evidence.
- [x] Run `pnpm check` and `pnpm audit --audit-level=high`.
- [x] Review the diff across correctness, readability, architecture, security,
  and performance; address required findings.
- [ ] Commit, push, and open a PR with branch, summary, and test evidence.

## Checkpoints

- Registry checkpoint: focused tests are green before field implementation.
- Integration checkpoint: all registrations resolve before browser UI work.
- Shipping checkpoint: production build, full checks, audit, and browser smoke
  are green before the PR is opened.

## Risks

| Risk | Mitigation |
| --- | --- |
| Formly 6.1 AOT incompatibility on Angular 20 | Build the smallest rendered slice before expanding the catalog. |
| Formly mutates shared fixture definitions | Require factories and test reference freshness. |
| Fixture breadth turns into one unreadable file | Split ownership by feature module and keep focused form factories. |
| Deprecated v6 aliases spread into new fixtures | Isolate them in one explicitly named legacy fixture. |
| Browser harness becomes a product UI | Keep local-only data, no routing/network/persistence, and simple catalog styling. |
