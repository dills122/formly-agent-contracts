---
title: Form sources
description: Explicitly expose fresh application-owned form factories without guessing exports.
---

A source is a Node-safe catalogue of forms a project has chosen to expose.

```ts
import { defineFormContractSource } from '@formly-contract/workspace';
import { createClaimFields } from './forms/claim.fields.js';

export const CLAIMS_SOURCE = defineFormContractSource({
  sourceId: 'claims/forms',
  list: () => [
    {
      id: 'claims.create',
      create: () => ({ fields: createClaimFields() }),
    },
  ],
});
```

## Identity rules

- `sourceId` is a lowercase workspace-stable ID.
- A form `id` is a contract-stable identifier.
- Project and source IDs must be globally unique.
- Form IDs must resolve unambiguously across the workspace.
- Identity does not come from a label, route, Formly-generated ID, or file
  name.

## Freshness rules

`list()` and every form `create()` callback must return fresh arrays and
objects. Formly mutates field trees during building. Sharing an instance across
runs would make output depend on call order.

## Scenarios

A definition may list named synthetic scenarios. Scenario compilation belongs
in a trusted Angular/Formly environment and describes one supplied model and
form-state branch. Do not claim scenario-resolved options or visibility are
globally complete.

## Node-safe entry points

Prefer a secondary entry point such as:

```text
@work/forms-kit            Angular modules and components
@work/forms-kit/forms      reusable factories and fragments
@work/forms-kit/contracts  Node-oriented source descriptors
```

Config loading evaluates imports; it does not tree-shake a browser barrel.

:::note[Maintained example]
See the [Nx source descriptor](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/src/lib/shared.source.ts)
and its [project config](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/formly-contracts.project.ts).
:::
