# Deterministic Contract Demo

This private application prints the canonical JSON contract for the shared
synthetic golden form. It is the smallest executable proof that the compiler
and schema packages agree on stable extraction, serialization, and hashing.

## What this is for

- giving a newcomer one command that produces a readable Form Contract;
- protecting deterministic output with `pnpm check:demo`; and
- exercising the dependency path from synthetic Formly fields through the
  compiler to canonical schema output.

This is not the consumer workspace CLI. It accepts no project configuration and
does not discover application forms. Use the `formly-contracts` binary from
[`@formly-contract/workspace`](../../packages/workspace/README.md) for `list`,
`generate`, and `check`.

From the repository root:

```sh
pnpm demo
pnpm check:demo
```

The form itself belongs to
[`fixtures/synthetic-form`](../../fixtures/synthetic-form/README.md). Keep its
labels and values invented and stable; changing it intentionally changes the
demo contract and must remain deterministic.
