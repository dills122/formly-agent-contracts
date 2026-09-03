---
title: Custom field profiles
description: Generate reviewed custom-field profiles from the same declarations used by Angular Formly registration.
---

A Formly custom field still needs its Angular component, but you do **not**
hand-write the full Formly Contract profile when a shipped behavior preset
matches it. Define one contracted type, use that definition to register the
component with Formly, and lower the same definition into the project profile
registry.

Formly's `{ name, component }` registration alone cannot generate a truthful
profile. It establishes only the rendering alias. Formly Contract deliberately
does not inspect the component template or guess its semantic type, value
shape, accessible parts, or interaction.

## The complete paired flow

### 1. Declare reviewed behavior once

Use the browser-safe entry point so the declaration can be shared by Angular
browser code and Node-side contract configuration:

```ts title="field-type-profiles.ts"
import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
} from '@formly-contract/schema/field-type-authoring';

export const COOL_RADIO_TYPE = defineContractedFormlyType({
  name: 'cool-radio-btn-grp',
  profile: { id: 'claims.cool-radio', version: 1 },
  behavior: radioChoice(),
});

export const CLAIM_FIELD_PROFILES = buildFieldTypeProfileRegistry({
  id: 'claims.fields',
  version: 1,
  types: [COOL_RADIO_TYPE],
});
```

`radioChoice()` lowers to canonical declared metadata for a scalar
single-choice control: radio-group and radio-option parts, projected
`props.options`, the `check` operation, and the `generic.choice` driver data
contract. Nothing is inferred from `CoolRadioComponent`.

### 2. Register that exact definition with Formly

```ts title="forms-kit.module.ts"
import { FormlyModule } from '@ngx-formly/core';
import { toFormlyTypeRegistration } from '@formly-contract/schema/field-type-authoring';

import { CoolRadioComponent } from './cool-radio.component.js';
import { COOL_RADIO_TYPE } from './field-type-profiles.js';

@NgModule({
  declarations: [CoolRadioComponent],
  imports: [
    FormlyModule.forChild({
      types: [toFormlyTypeRegistration(COOL_RADIO_TYPE, CoolRadioComponent)],
    }),
  ],
})
export class FormsKitModule {}
```

The helper returns Formly's normal `{ name, component }` object. Reusing the
definition removes the duplicated alias that otherwise lets production
registration and contract metadata drift apart. Formly 6's
[`forRoot`/`forChild` API](https://v6.formly.dev/docs/api/core/) remains in
control of component registration.

### 3. Attach the generated registry to its project

```ts title="formly-contracts.project.ts"
import { defineFormContractProject } from '@formly-contract/workspace';
import { CLAIM_FIELD_PROFILES, CLAIM_SOURCE } from '@work/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'claims-forms-kit',
  sources: [CLAIM_SOURCE],
  fieldTypeProfiles: CLAIM_FIELD_PROFILES,
});
```

The resulting join is:

```text
field type "cool-radio-btn-grp"
  -> generated registration for "cool-radio-btn-grp"
  -> generated profile "claims.cool-radio" version 1
  -> reviewed radio-choice semantics
```

If the project omits this registry or the names differ, compilation reports
`UNMAPPED_FIELD_TYPE`. Formly can still render the component; Formly Contract
correctly refuses to invent its interaction semantics.

## Wrappers use the same pattern

Declare reviewed wrapper behavior and include it in registry lowering:

```ts title="field-type-profiles.ts"
import { defineContractedFormlyWrapper } from '@formly-contract/schema/field-type-authoring';

export const EXPANSION_WRAPPER = defineContractedFormlyWrapper({
  name: 'expansion-panel',
  profile: { id: 'claims.expansion-wrapper', version: 1 },
  activation: {
    part: 'wrapper-expand',
    operation: 'click',
    role: 'button',
  },
});

export const CLAIM_FIELD_PROFILES = buildFieldTypeProfileRegistry({
  id: 'claims.fields',
  version: 1,
  types: [COOL_RADIO_TYPE],
  wrappers: [EXPANSION_WRAPPER],
});
```

Formly wrapper registration remains its normal object; reuse the declared name
instead of typing it twice:

```ts
FormlyModule.forChild({
  wrappers: [
    {
      name: EXPANSION_WRAPPER.name,
      component: ExpansionPanelWrapperComponent,
    },
  ],
});
```

The authoring API currently has `toFormlyTypeRegistration(...)` for types, but
no `toFormlyWrapperRegistration(...)`. Formly's official
[custom-wrapper guide](https://v6.formly.dev/docs/guide/custom-formly-wrapper/)
shows the underlying component registration and field usage.

## Shipped behavior presets

Choose only a preset that matches reviewed component behavior:

| Helper                         | Generated behavior                                      | Generic driver data     |
| ------------------------------ | ------------------------------------------------------- | ----------------------- |
| `radioChoice(options?)`        | Scalar radio choice                                     | `generic.choice`        |
| `choiceControl(options?)`      | Single/multi radio, checkbox, select, or overlay choice | `generic.choice`        |
| `typedInput(options)`          | Text, search, or numeric-style scalar input             | `generic.fill`          |
| `autocompleteChoice(options?)` | Overlay autocomplete selection                          | `generic.autocomplete`  |
| `rowSelection(options?)`       | Single or multi row selection                           | `generic.row-selection` |
| `repeater(options?)`           | Add-item collection, optionally expandable               | `generic.repeater`      |
| `stepper(options?)`            | Next/previous/optional submit navigation                | `generic.stepper`       |

Options configure reviewed details such as projected option paths,
completeness, multiplicity, presentation, input role, and structural behavior.
They do not make an executable browser driver available. Generic IDs currently
describe validated data contracts; browser execution remains planned.

## Aliases, variants, and legacy profiles

Use `aliasContractedFormlyType(type, alias)` when one component and reviewed
behavior are registered under multiple exact Formly names. The builder emits
one canonical profile for identical aliases and one registration per alias.
Reusing an `id@version` with different semantics is rejected.

Profile variants remain part of the canonical registry surface. A field selects
a declared non-default variant with data-only metadata:

```ts
{
  key: 'contactMethod',
  type: 'custom-select',
  formlyContract: { profileVariant: 'compact' },
}
```

`profileVariant` is the only supported field-level contract override. An
undeclared variant produces `UNMAPPED_PROFILE_VARIANT`.

Keep an explicit reviewed registry when a component's semantics cannot be
represented losslessly by the closed preset vocabulary. That is the supported
legacy escape hatch, not evidence that all custom fields must be hand-rolled.
Preserve unknown aspects such as `model-codec`, `runtime-states`,
`locator-scope`, or `interaction-sequence` instead of selecting the nearest
visual preset.

Definitions are validated, snapshotted, and runtime-frozen so later
caller-owned mutation cannot make generated profiles and Formly registrations
disagree. Component behavior still needs a browser/AOT conformance test; Node
discovery never instantiates the Angular component.

:::note[Canonical sources]
See the [public API reference](../api/#browser-safe-field-type-authoring),
[Node-safe Angular library pattern](../node-safe-angular-libraries/),
[v0.4 metadata specification](https://github.com/dills122/formly-contract/blob/main/docs/v0.4-e2e-authoring-metadata-spec.md),
and [maintained fixture declarations](https://github.com/dills122/formly-contract/blob/main/fixtures/angular-monorepo/libs/forms-kit/src/lib/field-type-profiles.ts).
:::
