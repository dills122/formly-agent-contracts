# `@formly-contract/playwright`

Private experimental trusted-local driver implementation inventory.

## Current status

Despite the package name, this is **not** a shipped Playwright integration. It
does not depend on Playwright, launch a browser, generate test source, compile
typed test intent, or execute form interactions.

The current package has one narrow responsibility: bind schema-validated driver
IDs and capabilities to reviewed local implementation definitions, then resolve
those bindings deterministically. Keeping that experiment behind the eventual
package boundary lets later browser work consume stable identities without
putting executable modules or selectors into portable artifacts.

Its current root exports are documented under the
[private API boundary](../../apps/docs/src/content/docs/reference/api.md#private-playwright-experiment).

The package is private and versioned `0.0.0`. Users evaluating Formly Contract
today should consume generated contracts directly from their own Playwright or
Cypress helpers; see the
[end-to-end vertical](../../apps/docs/src/content/docs/start/end-to-end.md).

## Contributor boundary

This package may own trusted driver implementation registration and eventual
validated-plan/browser execution. It must not own:

- form discovery or trusted config loading;
- schema DTOs, driver identity contracts, or intent validation;
- agent-selected module paths or invented selectors; or
- semantic claims not already present in validated artifacts.

Current implementation and tests live in
`src/driver-implementation-registry.ts` and its adjacent test.

```sh
pnpm exec vitest run packages/playwright/src
pnpm --filter @formly-contract/playwright build
```

Planned sequencing is tracked in the
[agent-context execution index](../../docs/planning/agent-context-hardening/execution-index.md).
Planning documents describe intended work, not current user-facing capability.
