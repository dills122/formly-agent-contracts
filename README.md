# Formly Agent Contracts

Formly Agent Contracts turns Angular Formly field configuration into stable,
versioned JSON that an E2E test author or coding agent can understand without
guessing how a form is structured.

Given a `FormlyFieldConfig[]`, the adapter describes:

- the controls, display content, groups, and repeatable templates in the form;
- each field's model path, Formly type, label, constraints, and choices;
- known visibility, required, readonly, disabled, and dynamic-option behavior;
- exact or application-derived test locators such as `data-testid`,
  `data-test-id`, and `data-cy`;
- what came directly from configuration, what was resolved by a controlled
  Formly build, and what remains unknown; and
- stable diagnostics for behavior that cannot be represented safely.

The result is a deterministic **Form Contract** with strict runtime validation,
canonical serialization, and a content hash. The contract is intended to be a
reliable input for Cypress/Playwright test planning and future agent tooling. It
is not a dump of Formly's live runtime objects.

## What exists today

This repository currently provides schema v0.3 and two workspace packages:

| Package | Purpose |
| --- | --- |
| `@formly-agent-contracts/contract-schema` | Contract DTOs, runtime validation, canonical JSON, and SHA-256 content hashing |
| `@formly-agent-contracts/formly-adapter` | Safe declared extraction and trusted scenario compilation for Formly 6.1 |

It also includes:

- a deterministic CLI demo using a synthetic golden form;
- a browser-rendered Angular test application with twelve synthetic Formly
  fixtures; and
- compatibility coverage for the pinned Angular `20.3.29` and Formly `6.1.8`
  combination.

The parser and contract are the current product. A production MCP server,
automatic Playwright generation, browser observation, and application-source
discovery are future layers and are not shipped by this MVP.

## Why this is useful

Large Formly forms are often assembled from nested groups, shared fragments,
custom field types, expressions, dynamic choices, and application conventions.
Reading that source repeatedly is slow, and guessing from a rendered page leads
to brittle tests.

This project creates a small, explicit boundary:

```text
Formly fields + synthetic scenario
                |
       safe contract projection
                |
   deterministic versioned JSON
                |
 E2E planning / agent inspection
```

Consumers can inspect one contract to answer questions such as:

- Which controls exist, and in what order?
- What model value does each control edit?
- Which values and validation boundaries are known?
- Is a choice list empty, static, dynamic, or asynchronous?
- Which fields may be hidden, required, readonly, or disabled?
- Which `data-*`, role, label, placeholder, or DOM-ID locator candidates are
  available?
- Which facts are exact, derived, resolved for one scenario, or still unknown?

## Quick start

Prerequisites:

- Node.js `22.22.1`
- pnpm `10.23.0`

```sh
pnpm install --frozen-lockfile
pnpm demo
```

`pnpm demo` builds the package slice and prints one canonical JSON contract.
Run the complete repository gate with:

```sh
pnpm check
```

That command runs lint, all tests, package and Angular production builds, the
demo smoke test, and documentation checks.

## Extract declared form structure

Use `extractFormContract` when you have Formly configuration and want to inspect
it without running callbacks:

```ts
import { extractFormContract } from '@formly-agent-contracts/formly-adapter';
import type { FormlyFieldConfig } from '@ngx-formly/core';

const fields: FormlyFieldConfig[] = [
  {
    key: 'profile.name',
    type: 'input',
    props: {
      label: 'Name',
      required: true,
      attributes: { 'data-testid': 'profile-name' },
    },
  },
];

const { contract, diagnostics } = extractFormContract({
  formId: 'example.profile',
  fields,
});
```

This path is pure and non-mutating. It does not call expression functions,
subscribe to Observables, run validators, or render Angular components.
Recognized callbacks become dynamic-rule metadata; unsupported behavior becomes
an explicit diagnostic. The returned node has the stable ID
`example.profile::path:s_profile.s_name`, model path `['profile', 'name']`, its
required constraint, and an exact `data-testid` locator.

## Resolve a synthetic scenario

Use `compileFormContractScenario` when required, readonly, disabled, hidden,
options, or locator attributes depend on Formly expression callbacks:

```ts
import { inject } from '@angular/core';
import { FormlyFormBuilder } from '@ngx-formly/core';
import { compileFormContractScenario } from '@formly-agent-contracts/formly-adapter';

const builder = inject(FormlyFormBuilder);
const { contract, diagnostics } = compileFormContractScenario({
  formId: 'example.profile',
  builder,
  createFields: () => createProfileFields(),
  model: { contactMethod: 'email' },
  formState: { readonly: false },
});
```

This is a trusted build/CI API. It uses the application's configured
`FormlyFormBuilder`, so application and Formly callbacks may run. The model and
form state must be structured-cloneable; both are cloned before the field
factory or builder runs.

The built field tree still passes through the same allowlist as declared
extraction. For example, dynamic options are reduced to public
`label`/`value`/`disabled` records rather than copying arbitrary properties from
application objects.

Do not expose this compiler directly from an MCP or other untrusted request
handler. Query layers should read previously generated contract artifacts.

## Test locators

Every node has an ordered `locators` array. The adapter automatically reads
these common attributes from `props.attributes`:

- `data-testid`
- `data-test-id`
- `data-test`
- `data-cy`
- `data-pw`

It can also retain explicit role, accessible name, placeholder, and Formly
field-ID candidates. An empty array means no reliable locator was found; the
adapter never invents CSS or XPath.

Applications with their own naming convention can set `testIdAttributes` and
provide a deterministic `deriveLocators` callback. The callback receives only
frozen identity data, not the live Formly field. It may return several named
targets for a composite widget such as a date range; its output is marked
`confidence: "derived"`. See the
[v0.3 locator specification](docs/v0.3-test-locators-spec.md) for the complete
contract and example.

## Evidence model

The contract keeps three evidence levels separate:

| Evidence | Meaning | Available now? |
| --- | --- | --- |
| `declared` | Read safely from supplied Formly configuration | Yes |
| `resolved` | Read from a controlled Formly build for one synthetic scenario | Yes |
| `observed` | Seen in a real rendered browser DOM | Schema-ready; capture layer not implemented |

A resolved locator is not silently presented as browser-observed. Likewise,
opaque or asynchronous behavior is reported rather than guessed.

## Supported contract information

Schema v0.3 can represent:

- ordered controls, groups, display-only nodes, and array templates;
- stable semantic node IDs and cumulative model paths;
- Formly and common semantic control types;
- labels, descriptions, placeholders, JSON-safe defaults, and wrappers;
- required, min/max, length, string-pattern, and named constraints;
- static and resolved public options plus dynamic/async option-source metadata;
- string/boolean conditions and callback/async dynamic-rule metadata;
- resolved hidden, readonly, and disabled state;
- exact and derived locator candidates, including multiple named targets; and
- deterministic diagnostics, canonical JSON, and content hashing.

## Intentional limitations

- Forms must be supplied explicitly; the adapter does not discover arbitrary
  TypeScript exports or application routes.
- Declared extraction never evaluates functions or function source.
- The scenario compiler performs the initial controlled Formly build but does
  not wait for remote options or lifecycle-driven browser behavior.
- Formly `RegExp` patterns are diagnosed; v0.3 represents string patterns only.
- Custom widget actions and value codecs are not yet modeled.
- The project does not currently generate or execute Cypress/Playwright tests.
- No production MCP server or browser-observation layer is included.
- Compatibility is proven for Angular `20.3.29` with Formly `6.1.8`, not for
  every Angular/Formly combination.
- npm publication and release automation are not included yet.

## Synthetic test application

The Angular test application contains twelve invented forms covering native
and custom fields, wrappers, validators, extensions, presets, expressions,
validation, repeaters, opaque behavior, and legacy Formly v6 aliases.

```sh
pnpm app:serve
```

Open <http://127.0.0.1:4200/> and choose a fixture from the catalog.

Workplace forms and data should remain in a private work repository. A private
fixture module can implement `TestFormDefinition` and register a group through
`TEST_FORM_GROUPS` without copying workplace labels, identifiers, options, or
rules into this public project.

## Repository layout

```text
packages/
  contract-schema/   Versioned DTOs, validation, canonical JSON, and hashing
  formly-adapter/     Declared extraction and trusted Formly scenario builds
fixtures/
  synthetic-form/    Public golden form and real-builder compatibility fixture
apps/
  demo-cli/          Prints the deterministic golden contract
  formly-test-app/   Browser-rendered Angular/Formly fixture catalog
docs/                Specifications, ADRs, delivery plans, and evidence
```

## Roadmap

The intended delivery path is:

```text
Form Contract packages (current)
              |
      read-only MCP queries
              |
        typed E2E intent
              |
 deterministic Playwright/Cypress drivers
              |
 browser observation and parity checks
```

Future layers should consume immutable contracts. They should not move Angular
execution, arbitrary callback evaluation, or selector invention into routine
agent requests.

## Documentation

- [Architecture overview](docs/architecture-overview.md)
- [MVP specification](docs/mvp-spec.md)
- [v0.2 real-world semantics specification](docs/v0.2-real-world-semantics-spec.md)
- [v0.3 test locator specification](docs/v0.3-test-locators-spec.md)
- [Formly test application specification](docs/formly-test-app-spec.md)
- [Implementation plan](docs/implementation-plan.md)
- [Architecture decisions](docs/decisions/)

## Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating. Report security
issues through the private process described in [SECURITY.md](SECURITY.md).

This project is available under the [MIT License](LICENSE).
