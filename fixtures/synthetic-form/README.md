# Synthetic Golden Form Fixture

This private package owns one stable, invented `FormlyFieldConfig[]` factory
used by the deterministic demo and compiler compatibility tests.

It deliberately covers a compact cross-section of contract behavior: nested
groups, constraints, static choices, conditional visibility, a repeatable
template, exact test locators, display content, and opaque functions that must
remain diagnostic evidence.

## Where it is used

- [`apps/demo-cli`](../../apps/demo-cli/README.md) extracts and prints the golden
  contract.
- `src/compatibility.test.ts` exercises the pinned Angular/Formly builder
  combination.
- `pnpm check:demo` runs the demo twice and requires deterministic output.

This is not a consumer workspace example and has no root/project/source
configuration. Use the
[maintained examples](../../apps/docs/src/content/docs/reference/examples.md)
for repository integration patterns.

From the repository root:

```sh
pnpm --filter @formly-contract/synthetic-form build
pnpm exec vitest run fixtures/synthetic-form/src
pnpm check:demo
```

Keep all data synthetic and stable. When changing the field tree, assert the
intended semantic or diagnostic difference rather than accepting unexplained
artifact churn.
