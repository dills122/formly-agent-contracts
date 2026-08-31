# `@formly-contract/playwright`

Private experimental trusted-local driver inventory and validated-plan call
binding.

## Current status

Despite the package name, this is **not** a shipped Playwright integration. It
does not depend on Playwright, launch a browser, generate test source, compile
typed test intent into source, or execute form interactions.

The current package has two narrow responsibilities: bind schema-validated
driver IDs and capabilities to reviewed local implementation definitions, then
revalidate a CTX-2 plan and bind each exact approved step to its trusted local
implementation. The call result is reviewable and data-only apart from the
paired callable identity; it has no selector or free-form argument bag and
never invokes the callable. Keeping that experiment behind the eventual
package boundary lets later browser work consume stable identities without
putting executable modules or selectors into portable artifacts.

Its current root exports are documented under the
[private API boundary](../../apps/docs/src/content/docs/reference/api.md#private-playwright-experiment).

The package is private and versioned `0.0.0`. Users evaluating Formly Contract
today should consume generated contracts directly from their own Playwright or
Cypress helpers; see the
[end-to-end vertical](../../apps/docs/src/content/docs/start/end-to-end.md).

## Contributor boundary

This package may own trusted driver implementation registration,
validated-plan call lowering, and eventual browser execution. It must not own:

- form discovery or trusted config loading;
- schema DTOs, driver identity contracts, or intent validation;
- agent-selected module paths or invented selectors; or
- semantic claims not already present in validated artifacts.

Current implementation and tests live in
`src/driver-implementation-registry.ts`,
`src/validated-plan-driver-call-binding.ts`, and their adjacent tests.

`bindAgentContextValidatedPlanDriverCalls(revalidationInput, binding)` first
runs the complete schema revalidator. Only then does it lower each plan step in
order and resolve the exact driver identity and required capabilities. Invalid
plans never reach the resolver, an incompatible or mismatched implementation
allowlist returns no calls, and one resolution refusal makes the entire batch
unavailable. The binder accepts only the exact frozen binding result returned
by `bindAgentContextDriverImplementationRegistry`. Its internal-class private
field prevents ordinary TypeScript object spread or resolver replacement from
preserving the nominal result type, while private runtime provenance rejects
cloned and proxied objects. The returned implementation functions remain
opaque and uncalled.

Runtime provenance is local to one evaluated copy of this package. Create the
implementation binding and consume it with the call binder from that same
module instance. Duplicate bundles, preserved-symlink package copies, or hot
reload can otherwise load separate provenance stores and reject an authentic
binding from the other copy. This rejection is fail-closed: deduplicate the
package instance or recreate the implementation binding through the consuming
instance instead of copying or bypassing it.

```sh
pnpm exec vitest run packages/playwright/src
pnpm --filter @formly-contract/playwright build
```

Planned sequencing is tracked in the
[agent-context execution index](../../docs/planning/agent-context-hardening/execution-index.md).
Planning documents describe intended work, not current user-facing capability.
