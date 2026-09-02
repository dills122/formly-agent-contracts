---
title: Node-safe Angular libraries
description: Separate Angular browser entry points from Formly factories and contract discovery code.
---

A reusable Angular/Formly library can participate in contract generation
without making its complete browser package executable under Node. Give browser
runtime code, pure form factories, and trusted contract discovery distinct
entry points.

This is the recommended setup for both Angular CLI and Nx workspaces:

```text
Browser application
  -> @work/forms-kit
     -> Angular modules, components, providers, and browser integrations
     -> pure form factories

Formly Contract worker
  -> formly-contracts.project.ts
     -> @work/forms-kit/contracts
        -> source descriptors and reviewed profile data
        -> pure form factories
        -> type-only model/Formly imports

Forbidden tool edge
  @work/forms-kit/contracts -X-> @work/forms-kit browser barrel
```

The filename is not the guarantee. The `/contracts` entry point's entire
runtime dependency closure must be safe to evaluate under Node.

## Why the Angular worker is not the whole solution

Use `formly-contracts-angular` when a selected project legitimately needs
partially compiled Angular libraries. Its disposable worker reserves the
project-local `@angular/compiler` before project config evaluation.

That solves the Angular JIT prerequisite. It cannot:

- repair arbitrary JavaScript circular-initialization failures;
- supply browser globals to Node;
- make Apollo, NgRx, DOM, or application startup side effects suitable for
  contract discovery; or
- tree-shake unused exports before a browser barrel is evaluated.

For example, a component may directly refer to itself while its decorator
metadata is evaluated:

```ts
@Component({
  providers: [
    { provide: FORM_FIELD_CONTROL, useExisting: NumberComponent },
  ],
})
export class NumberComponent {}
```

For that specific edge, use Angular's documented
[`forwardRef`](https://angular.dev/api/core/forwardRef) pattern:

```ts
import { Component, forwardRef } from '@angular/core';

@Component({
  providers: [
    {
      provide: FORM_FIELD_CONTROL,
      useExisting: forwardRef(() => NumberComponent),
    },
  ],
})
export class NumberComponent {}
```

Fixing the component is valuable, but another eager browser dependency could
still fail next. Retain the contracts boundary even after the immediate cycle
is repaired.

## 1. Create three entry points

Use a layout equivalent to:

```text
libs/forms-kit/
  formly-contracts.project.ts
  src/
    index.ts                         # browser entry point
    forms.ts                         # pure factory entry point
    contracts.ts                     # Node-safe contract entry point
    lib/
      claim.fields.ts                # pure Formly factory
      claim.contract.ts              # Node-side descriptor
      field-type-profiles.ts         # schema data only
      number.component.ts            # Angular component
      forms-kit.module.ts            # Angular registration
```

The browser entry point may export Angular code:

```ts title="libs/forms-kit/src/index.ts"
export { FormsKitModule } from './lib/forms-kit.module.js';
export { NumberComponent } from './lib/number.component.js';
export { createClaimFields } from './forms.js';
```

The factory entry point exports only form data and associated types:

```ts title="libs/forms-kit/src/forms.ts"
export { createClaimFields } from './lib/claim.fields.js';
export type { ClaimModel } from './lib/claim.fields.js';
```

The contracts entry point exports only trusted tooling descriptors and data:

```ts title="libs/forms-kit/src/contracts.ts"
export { CLAIMS_CONTRACT_SOURCE } from './lib/claim.contract.js';
export { FORMS_KIT_FIELD_TYPE_PROFILES } from './lib/field-type-profiles.js';
```

Do not re-export `contracts.ts` from `index.ts`. Contract descriptors import
the Node-side workspace API and do not belong in the Angular browser bundle.

## 2. Keep the form factory pure

```ts title="libs/forms-kit/src/lib/claim.fields.ts"
import type { FormlyFieldConfig } from '@ngx-formly/core';

export interface ClaimModel {
  amount?: number;
  reason?: string;
}

export function createClaimFields(): FormlyFieldConfig[] {
  return [
    {
      key: 'amount',
      type: 'application-number',
      props: { label: 'Amount', required: true },
    },
    {
      key: 'reason',
      type: 'application-select',
      props: {
        label: 'Reason',
        options: [
          { label: 'Correction', value: 'correction' },
          { label: 'Exception', value: 'exception' },
        ],
      },
    },
  ];
}
```

This module must not import the library root, Angular components, GraphQL
clients, stores, browser globals, or service instances. `import type` is safe
because TypeScript erases it. An ordinary nested import is still a runtime edge
even when the contracts entry point does not mention browser code directly.

If the real factory needs construction-time services, callbacks, or streams,
keep `lineage.rootSymbol` anchored to it and provide a truthful Node-safe
`create` adapter with explicit synthetic inputs. Do not invent business data or
application behavior merely to make generation pass.

## 3. Author reviewed custom-field data separately

The field profile belongs in a data-only module. Its declared behavior must
match the rendered control:

```ts title="libs/forms-kit/src/lib/field-type-profiles.ts"
import {
  buildFieldTypeProfileRegistry,
  choiceControl,
  defineContractedFormlyType,
  typedInput,
} from '@formly-contract/schema/field-type-authoring';

export const FORMS_KIT_FIELD_TYPE_PROFILES =
  buildFieldTypeProfileRegistry({
    id: 'claims.forms-kit-fields',
    version: 1,
    types: [
      defineContractedFormlyType({
        name: 'application-number',
        profile: { id: 'claims.application-number', version: 1 },
        behavior: typedInput({
          semanticType: 'number',
          role: 'spinbutton',
        }),
      }),
      defineContractedFormlyType({
        name: 'application-select',
        profile: { id: 'claims.application-select', version: 1 },
        behavior: choiceControl({ presentation: 'select' }),
      }),
    ],
  });
```

The Angular module separately registers the exact same Formly type names with
their components. A browser/AOT conformance test proves that the reviewed
profile matches the component; Node discovery does not instantiate it.

## 4. Define the source without importing the browser entry point

```ts title="libs/forms-kit/src/lib/claim.contract.ts"
import {
  defineFormContractDefinition,
  defineFormContractSource,
} from '@formly-contract/workspace';

import { createClaimFields } from './claim.fields.js';

export const CLAIM_CONTRACT = defineFormContractDefinition({
  id: 'claims.create',
  create: () => ({ fields: createClaimFields(), model: {} }),
  lineage: { rootSymbol: createClaimFields },
});

export const CLAIMS_CONTRACT_SOURCE = defineFormContractSource({
  sourceId: 'claims/forms-kit',
  list: () => [CLAIM_CONTRACT],
});
```

`lineage.rootSymbol` identifies the real application factory. The `create`
callback provides the declared instance generated by the tool. Both references
can point to the same zero-argument factory as shown here.

## 5. Give every subpath an exact resolver identity

For a source-consumed Nx library, add explicit aliases to the TypeScript config
used by Formly Contract:

```json title="tsconfig.base.json"
{
  "compilerOptions": {
    "paths": {
      "@work/forms-kit": ["libs/forms-kit/src/index.ts"],
      "@work/forms-kit/forms": ["libs/forms-kit/src/forms.ts"],
      "@work/forms-kit/contracts": ["libs/forms-kit/src/contracts.ts"]
    }
  }
}
```

For a packed or published library, expose equivalent package secondary entry
points through the library's normal Angular packaging configuration and verify
their packed contents. A source alias is sufficient only for an in-repository
consumer whose configured runtime resolver understands that TypeScript config.

## 6. Import `/contracts` from project config

```ts title="libs/forms-kit/formly-contracts.project.ts"
import { defineFormContractProject } from '@formly-contract/workspace';
import {
  CLAIMS_CONTRACT_SOURCE,
  FORMS_KIT_FIELD_TYPE_PROFILES,
} from '@work/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'claims-forms-kit',
  sources: [CLAIMS_CONTRACT_SOURCE],
  fieldTypeProfiles: FORMS_KIT_FIELD_TYPE_PROFILES,
});
```

The project config must not import `@work/forms-kit`, `FormsKitModule`, or a
feature barrel that re-exports them.

Select the alias-owning TypeScript config from the root:

```ts title="formly-contracts.config.ts"
import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: ['libs/**/formly-contracts.project.ts'],
  tsconfigPath: 'tsconfig.base.json',
  output: { directory: 'dist/formly-contracts' },
  diagnostics: { failOn: ['error'] },
});
```

## 7. Verify one selected project first

```sh
pnpm exec formly-contracts-angular list \
  --project-config libs/forms-kit/formly-contracts.project.ts \
  --explain

pnpm exec formly-contracts-angular generate \
  --project-config libs/forms-kit/formly-contracts.project.ts

pnpm exec formly-contracts-angular check \
  --project-config libs/forms-kit/formly-contracts.project.ts
```

Use `--explain` only while diagnosing a failure. The default retains the
stable worker code and phase but withholds causes. The opt-in output is bounded
and workspace-relative, is never serialized into artifacts, and may still
contain application identifiers in an exception message.

Retain consumer tests that prove:

- plain Node can import `@work/forms-kit/contracts` without evaluating a
  browser-barrel sentinel;
- the Angular CLI inventories and compiles the real factory;
- the normal Angular application build still succeeds;
- a deliberately broken sibling project is isolated and safely reported; and
- generated contracts contain the expected form IDs, nodes, profile IDs, and
  diagnostics.

## Temporary shim

When the library cannot expose `/contracts` during the pilot, commit a
tool-owned shim that imports safe implementation files directly:

```ts title="tools/formly-contract/forms-kit.contracts.ts"
export { createClaimFields } from
  '../../libs/forms-kit/src/lib/claim.fields.js';
export { FORMS_KIT_FIELD_TYPE_PROFILES } from
  '../../libs/forms-kit/src/lib/field-type-profiles.js';
```

Point a dedicated `tsconfig.formly-contracts.json` alias at the shim and use
that file as root `tsconfigPath`. Preserve every required path alias explicitly
because TypeScript `paths` from an extended config do not merge key by key.

The shim is a pilot adapter, not a durable package surface. Assign it an owner
and remove it after the real `/contracts` entry point passes the same Node
import and selected-generation tests.

:::note[Maintained implementation]
The Nx fixture retains separate
[`index.ts`](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/src/index.ts),
[`forms.ts`](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/src/forms.ts),
[`contracts.ts`](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/src/contracts.ts),
TypeScript aliases, and a
[`formly-contracts.project.ts`](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/formly-contracts.project.ts)
that imports only the contracts entry point.
:::
