# `@formly-contract/schema`

Versioned Form Contract types, strict runtime validation, canonical JSON, and
content hashing for agent-readable Angular Formly contracts.

```sh
pnpm add --save-dev @formly-contract/schema
```

```ts
import {
  canonicalStringify,
  parseFormContract,
} from '@formly-contract/schema';

const contract = parseFormContract(JSON.parse(serializedContract));
const canonicalJson = canonicalStringify(contract);
```

The package also exposes strict, versioned application metadata registries for
custom field profiles and explicit cross-field effects. Effect registries are
declared data only: parsing rejects callbacks, observed/candidate authority,
and contradictory timing or target semantics.

This package is pre-1.0. Its schema version is explicit in every contract, and
unsupported or unknown Formly behavior remains diagnostic evidence rather than
an inferred value.

See the [main repository](https://github.com/dills122/formly-contract)
for the contract model, compatibility policy, and complete examples.
