# `@formly-contract/compiler`

Allowlisted extraction of Angular Formly field configuration into deterministic,
agent-readable Form Contracts.

## Package boundary

Use this package when trusted build or test code already has a
`FormlyFieldConfig[]`. It understands Formly semantics and projects them into
schema-owned portable data. Repository discovery, config loading, artifact
publication, and CLI behavior belong to
[`@formly-contract/workspace`](../workspace/README.md).

The package is prepared for public release but is not yet published to npm.
Follow the repository
[installation guide](../../apps/docs/src/content/docs/start/installation.md) to
build and link it from a sibling checkout. After the first release, installation
will use `pnpm add --save-dev @formly-contract/compiler`.

The package declares peer compatibility with `@ngx-formly/core` 6.x and is
intended for Angular 20 or newer applications. The compatibility suite is
pinned to Angular `20.3.29` with Formly `6.1.8`, so that exact pairing has the
strongest test evidence. Validate other Angular major and Formly minor or patch
combinations in the consuming application; mileage may vary.

```ts
import { extractFormContract } from '@formly-contract/compiler';

const { contract, diagnostics } = extractFormContract({
  formId: 'claims.create',
  fields,
});
```

Declared extraction does not execute callbacks, subscribe to Observables, or
render Angular components. Use the trusted scenario compiler only inside a
controlled Angular test/build environment.

The returned diagnostics are part of the result, not incidental logging. An
unsupported function, stream, hook, or custom type must remain explicit instead
of being guessed or silently discarded.

The package also exports the type-only `FactoryInputAuthoringHarness` contract
used by workspace-generated local authoring drafts. It has no runtime
implementation and does not authorize application-factory execution; generated
drafts remain partial until their explicit inputs and unsupported cases are
reviewed.

## For contributors

Projection changes should add focused semantic and diagnostic tests. If output
shape changes, update [`@formly-contract/schema`](../schema/README.md) first and
refresh only the intentional fixture goldens.

```sh
pnpm exec vitest run packages/compiler/src
pnpm --filter @formly-contract/compiler build
```

See the [main repository](https://github.com/dills122/formly-contract)
for compatibility details, scenario examples, and the contract evidence model.
