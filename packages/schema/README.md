# `@formly-contract/schema`

Versioned Form Contract types, strict runtime validation, canonical JSON, and
content hashing for agent-readable Angular Formly contracts.

The package also owns the path-free runtime-provenance `1.0.0` DTO used by
workspace indexes. Its parser rejects unknown or machine-local observations;
its canonicalizer sorts identity collections before hashing.

```sh
pnpm add @formly-contract/schema
```

Use a regular dependency when production Angular code imports the browser-safe
`@formly-contract/schema/field-type-authoring` subpath. Tooling-only consumers
that use only the Node-oriented root may install the package with `--save-dev`.

```ts
import {
  canonicalStringify,
  parseFormContract,
} from '@formly-contract/schema';

const contract = parseFormContract(JSON.parse(serializedContract));
const canonicalJson = canonicalStringify(contract);
```

Compact custom-field authoring must use its dedicated browser-safe entry point:

```ts
import {
  defineContractedFormlyType,
  radioChoice,
} from '@formly-contract/schema/field-type-authoring';
```

The Node-oriented package root is not a browser entry point and does not
re-export these helpers.

The package also exposes strict, versioned application metadata registries for
custom field profiles and explicit cross-field effects. Effect registries are
declared data only: parsing rejects callbacks, observed/candidate authority,
and contradictory timing or target semantics.

This package is pre-1.0. Its schema version is explicit in every contract, and
unsupported or unknown Formly behavior remains diagnostic evidence rather than
an inferred value.

See the [main repository](https://github.com/dills122/formly-contract)
for the contract model, compatibility policy, and complete examples.
