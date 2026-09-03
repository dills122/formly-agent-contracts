---
title: Custom field profiles
description: Declare reviewed semantics, parts, values, and driver capabilities for custom Angular/Formly fields.
---

Custom Angular components rarely expose enough meaning through a Formly type
string alone. A field-type profile is serializable, reviewed metadata that
describes what the control means and how a future validated driver may operate
it.

## Compact field-type authoring

The browser-safe authoring API generates the canonical registry from compact,
reviewed type definitions:

```ts
import {
  aliasContractedFormlyType,
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
  toFormlyTypeRegistration,
} from '@formly-contract/schema/field-type-authoring';

export const COOL_RADIO_TYPE = defineContractedFormlyType({
  name: 'cool-radio-btn-grp',
  profile: { id: 'claims.cool-radio', version: 1 },
  behavior: radioChoice(),
});

export const LEGACY_COOL_RADIO_TYPE = aliasContractedFormlyType(
  COOL_RADIO_TYPE,
  'legacy-cool-radio-btn-grp',
);

export const CLAIM_FIELD_PROFILES = buildFieldTypeProfileRegistry({
  id: 'claims.fields',
  version: 1,
  types: [COOL_RADIO_TYPE, LEGACY_COOL_RADIO_TYPE],
});

// Use every exact definition in the production Formly registration.
const formlyTypes = [
  toFormlyTypeRegistration(COOL_RADIO_TYPE, CoolRadioComponent),
  toFormlyTypeRegistration(LEGACY_COOL_RADIO_TYPE, CoolRadioComponent),
];
```

Each shared definition owns both a production Formly type name and its generated
canonical profile registration. `aliasContractedFormlyType()` snapshots the
same reviewed semantics under another exact type name. Registry lowering emits
one profile for identical aliases and one registration per name; the same
`id@version` with different semantics is rejected.

Definitions do not inspect Angular components or infer behavior. Helpers
snapshot and runtime-freeze validated declarations so later caller-owned
mutation cannot make registrations and generated profiles disagree.

Compact behavior presets cover radio and other single/multi choice controls,
typed inputs, autocomplete, row selection, repeaters, and steppers. Use only a
preset that matches reviewed component behavior. Custom semantics outside that
vocabulary still require the legacy reviewed registry or remain mapped with
explicit unknowns.

## Profile anatomy

A profile declares:

- stable identity and semantic type;
- scalar, array, or object model shape;
- named interactive parts and accessible roles;
- one interaction operation;
- how values are projected or why they remain dynamic;
- generic or application-specific driver identity and capabilities;
- effect targets and readiness capabilities; and
- explicit unknown aspects.

Registrations map a Formly `type` and optional variant to a profile. Wrapper
profiles may add parts, preconditions, and unknowns.

### Selecting a variant

A registration's `variants` list maps named variants to their own profile
reference. A field selects a non-default variant through the data-only root
field metadata `formlyContract: { profileVariant: 'variant-name' }`:

```ts
{
  key: 'contactMethod',
  type: 'custom-select',
  formlyContract: { profileVariant: 'compact' },
  props: { /* ... */ },
}
```

Fields cannot embed arbitrary interaction overrides through `formlyContract`
— `profileVariant` is the only field it currently supports. Omitting it (or
naming a variant the registration doesn't declare, which produces an
`UNMAPPED_PROFILE_VARIANT` diagnostic) resolves to the registration's
`defaultProfile`.

## Generic versus application drivers

Generic IDs currently describe validated data contracts:

- `generic.fill`
- `generic.choice`
- `generic.autocomplete`
- `generic.row-selection`
- `generic.repeater`

The executable driver layer is planned. Declaring `generic.choice` today gives
the compiler operational metadata; it does not install a Playwright helper.

Application-specific driver IDs must resolve through a future trusted
application allowlist. Never embed executable code or module URLs in a profile.

## Introspection workflow

Use Angular/Formly authoring experiments to understand a custom component’s
rendered roles, parts, wrapper behavior, and value codec. Convert only reviewed
findings into a profile. Keep the authoring host and reflection code outside
the portable schema and MCP query path.

If an aspect is not known, declare one of:

- `semantic-role`
- `model-codec`
- `runtime-states`
- `locator-scope`
- `interaction-sequence`

An unknown may block generic-driver compatibility. That refusal prevents a
profile from overpromising behavior.

The verbose registry shape below the compact helper remains the canonical
portable artifact and a legacy authoring surface. Consumers should prefer the
contracted type helpers for supported controls so schema details are generated
consistently.

:::note[Canonical sources]
Use the [v0.4 metadata specification](https://github.com/dills122/formly-contract/blob/main/docs/v0.4-e2e-authoring-metadata-spec.md),
[field-profile authoring research](https://github.com/dills122/formly-contract/blob/main/docs/research/hardening/angular-field-profile-authoring.md),
and [maintained fixture profiles](https://github.com/dills122/formly-contract/blob/main/fixtures/angular-monorepo/libs/forms-kit/src/lib/field-type-profiles.ts).
:::
