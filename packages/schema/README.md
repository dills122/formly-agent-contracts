# `@formly-contract/schema`

Versioned Form Contract types, strict runtime validation, canonical JSON, and
content hashing for agent-readable Angular Formly contracts.

## Package boundary

This is the portable foundation. It owns data contracts and pure operations
that can run without loading Angular, Formly configuration, a repository, or a
browser. Compiler, workspace, and future transport/execution layers consume
these contracts rather than defining parallel DTOs.

The package also owns the path-free runtime-provenance `1.0.0` DTO used by
workspace indexes. Its parser rejects unknown or machine-local observations;
its canonicalizer sorts identity collections before hashing.

The package is prepared for public release but is not yet published to npm.
Follow the repository
[installation guide](../../apps/docs/src/content/docs/start/installation.md) to
use the GitHub pilot RC or build and link it from a sibling checkout. After npm
publication, installation will use `pnpm add @formly-contract/schema`.

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
  aliasContractedFormlyType,
  defineContractedFormlyType,
  radioChoice,
} from '@formly-contract/schema/field-type-authoring';
```

The Node-oriented package root is not a browser entry point and does not
re-export these helpers.

The browser-safe subpath exports the complete compact authoring surface:
behavior presets for choices, typed inputs, autocomplete, row selection,
repeaters, and steppers; `defineContractedFormlyType`,
`aliasContractedFormlyType`, `defineContractedFormlyWrapper`,
`toFormlyTypeRegistration`, and `buildFieldTypeProfileRegistry`; plus their
input/output types. Exact aliases may share one profile identity only when their
lowered profiles are identical. See the
[public API reference](../../apps/docs/src/content/docs/reference/api.md#browser-safe-field-type-authoring)
for one end-to-end registration example.

The package also exposes strict, versioned application metadata registries for
custom field profiles and explicit cross-field effects. Effect registries are
declared data only: parsing rejects callbacks, observed/candidate authority,
and contradictory timing or target semantics.

This package is pre-1.0. Its schema version is explicit in every contract, and
unsupported or unknown Formly behavior remains diagnostic evidence rather than
an inferred value.

The package root also exposes the current CTX-2 typed-intent boundary:
`parseAgentContextTestIntent`, `validateAgentContextTestIntent`,
`computeAgentContextTestIntentHash`,
`parseAgentContextValidatedExecutionPlan`, and
`revalidateAgentContextExecutionPlan`. This is a pure synthetic-proof slice,
not a browser runner. Unsupported runtime value policies, repeaters, usage
actions, outcomes, and pattern-constrained literals return blocking diagnostics
until their complete source authority, semantic policy, and driver-call ABI are
implemented. Targeted nodes with declared wrapper activation preconditions also
fail closed in this checkpoint; automatic wrapper expansion is a documented
fast follow rather than an omitted plan step.

Public validation and revalidation envelopes are hostile-data boundaries:
required values must be own enumerable data properties, and proxy, accessor,
inherited, hidden, or coercion-based input is rejected without execution.
Diagnostic DTOs are code-discriminated and enforce the exact location fields
owned by each stable code. The pure length classifier mirrors Angular's
optional-empty `minLength` rule; `required` remains the independent authority
that classifies an empty value as invalid.

A validated plan retains the canonical source-intent hash and the
classification authority for every resolved value. Revalidation requires the
exact source intent, reruns the validator against current context authority,
requires a complete CTX-1 E2E slice, and accepts only an exactly rebuilt plan.
The intent and plan hashes are content identities, not signatures.
Strict parsers reject proxies, accessors, non-enumerable properties, invalid
closed-enum values, and caller-controlled coercion hooks. The standalone
`computeAgentContextValidatedPlanHash` helper runs the same strict plan parse
before hashing, so proxy, accessor, hidden, cyclic, and unknown-key input is
rejected without evaluating caller-controlled behavior. Valid parsed or
validator-produced plans retain the same canonical hash.

## For contributors

Changes here can affect every downstream package and generated artifact. Keep
parsers strict, preserve deterministic canonicalization, add exact positive and
negative tests beside the owning module, and update canonical specifications
when a public DTO changes.

```sh
pnpm exec vitest run packages/schema/src
pnpm --filter @formly-contract/schema build
```

See the [main repository](https://github.com/dills122/formly-contract)
for the contract model and compatibility policy, or use the
[schema API reference](../../apps/docs/src/content/docs/reference/api.md#schema)
for the current consumer entry points.
