---
title: Custom field profiles
description: Declare reviewed semantics, parts, values, and driver capabilities for custom Angular/Formly fields.
---

Custom Angular components rarely expose enough meaning through a Formly type
string alone. A field-type profile is serializable, reviewed metadata that
describes what the control means and how a future validated driver may operate
it.

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

:::note[Canonical sources]
Use the [v0.4 metadata specification](https://github.com/dills122/formly-contract/blob/main/docs/v0.4-e2e-authoring-metadata-spec.md),
[field-profile authoring research](https://github.com/dills122/formly-contract/blob/main/docs/research/hardening/angular-field-profile-authoring.md),
and [maintained fixture profiles](https://github.com/dills122/formly-contract/blob/main/fixtures/angular-monorepo/libs/forms-kit/src/lib/field-type-profiles.ts).
:::
