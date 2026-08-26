# `@formly-contract/formly-adapter`

Allowlisted extraction of Angular Formly field configuration into deterministic,
agent-readable Form Contracts.

```sh
pnpm add --save-dev @formly-contract/formly-adapter
```

The package declares peer compatibility with `@ngx-formly/core` 6.x and is
intended for Angular 20 or newer applications. The compatibility suite is
pinned to Angular `20.3.29` with Formly `6.1.8`, so that exact pairing has the
strongest test evidence. Validate other Angular major and Formly minor or patch
combinations in the consuming application; mileage may vary.

```ts
import { extractFormContract } from '@formly-contract/formly-adapter';

const { contract, diagnostics } = extractFormContract({
  formId: 'claims.create',
  fields,
});
```

Declared extraction does not execute callbacks, subscribe to Observables, or
render Angular components. Use the trusted scenario compiler only inside a
controlled Angular test/build environment.

See the [main repository](https://github.com/dills122/formly-contract)
for compatibility details, scenario examples, and the contract evidence model.
