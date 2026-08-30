# Workspace Config Loader Fixture

This directory is test input for the trusted configuration loader in
[`@formly-contract/workspace`](../../packages/workspace/README.md). It is not a
consumer example.

The `configs/` directory intentionally mixes module formats and failure modes:

| File | Case |
| --- | --- |
| `typescript.ts` | ordinary TypeScript default export |
| `aliased.ts` | TypeScript import resolved through the fixture tsconfig |
| `esm.mjs` | native ESM module |
| `commonjs.cjs` | CommonJS module |
| `named-only.mjs` | missing required default export |
| `malformed.ts` | invalid configuration input used to verify diagnostics |

Some files are supposed to fail. Do not normalize them into one style or use
them as configuration templates.

Run the owning tests from the repository root:

```sh
pnpm exec vitest run packages/workspace/src/config-loader.test.ts
```

When adding a loader behavior, add the smallest fixture module that proves the
case and assert the exact success or error contract in the workspace test.
