# Formly Agent Contracts

Formly Agent Contracts turns Angular Formly configuration into a deterministic,
agent-readable contract for reliable end-to-end test authoring.

The central idea is to compile Formly configuration once and query it many times. Formly and application code run in a controlled build process; the MCP server reads versioned semantic artifacts instead of evaluating arbitrary Angular code for every agent request.

## Intended flow

```text
Formly configs and shared fragments
                |
       contract compiler
                |
     versioned form bundle
                |
          MCP queries
                |
       typed E2E intent
                |
      Playwright compiler
                |
       runtime verification
```

## Principles

- Treat the output as an E2E contract, not as a serialization of Formly internals.
- Keep declared, scenario-resolved, and browser-observed form state distinct.
- Address controls by stable semantic IDs rather than model-generated selectors.
- Represent dynamic conditions declaratively when possible and explicitly mark opaque behavior.
- Let custom field adapters own widget-specific actions, value codecs, and locators.
- Have agents produce typed test intent; compile that intent deterministically into Playwright.
- Run application and Formly code in a controlled compiler or verification process, never inside routine MCP queries.

## MVP status

The repository now contains the first real-world parser slice: a versioned
contract schema, strict runtime validation, canonical serialization and
hashing, a Formly 6.1 adapter, twelve synthetic integration forms, and a
runnable golden-contract demo. Angular 20.3.29 and Formly 6.1.8 are pinned and
tested together. Contract schema v0.3 adds structural keyless-group identity,
display nodes, dynamic-rule and option-source metadata, trusted synthetic
scenario resolution, and evidence-tagged locators for Cypress and Playwright.
Playwright generation and a production MCP server remain post-MVP work.

## Development

Prerequisites are Node.js 22.22.1 and pnpm 10.23.0.

```sh
pnpm install --frozen-lockfile
pnpm check
```

The individual gates are `pnpm lint`, `pnpm test`, `pnpm build`, and
`pnpm check:demo`. Documentation checks are available as `pnpm check:docs`.

## Run the golden demo

```sh
pnpm demo
```

The command builds the four demo packages and prints one deterministic JSON
contract. Its `contentHash` covers the contract content excluding the hash
property itself. The synthetic form includes nested text, number, checkbox,
and select controls; constraints and static options; an unrealized array
template; a declared visibility condition; a display-only node; callback-driven
state and options represented as dynamic rules; and one deliberately opaque
lifecycle hook reported as `OPAQUE_FUNCTION`.
The demo also includes exact `data-testid` and `data-cy` locator metadata.

## Extract a form

Install the future published packages in a Formly 6.1 host, or use their
workspace names inside this repository:

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

The adapter retains declaration order, nested groups, Formly v6 key paths,
stable semantic IDs, types, labels and hints, JSON-safe defaults, wrappers,
ordinary and named constraints, static options, array templates, and string or
boolean conditions. Recognized expression callbacks are recorded as dynamic
rules without being called. Output is validated and hashed before it is
returned.

Every node has a `locators` array. The adapter reads common dedicated test
attributes from `props.attributes`; exact values retain their attribute name so
both Cypress selectors and Playwright's configurable `getByTestId` convention
can consume them. An empty array means no reliable locator was found.

Applications with a derived convention can opt in without hardcoding that
convention into the package. A deriver receives only frozen identity data and
may return several named targets for a composite widget:

```ts
const { contract } = extractFormContract({
  formId: 'coverage.form',
  fields,
  locatorOptions: {
    testIdAttributes: ['data-test-id'],
    deriveLocators: ({ modelPath, formlyType }) =>
      formlyType === 'date-range'
        ? [
            {
              target: 'start',
              strategy: 'testId',
              attribute: 'data-test-id',
              value: `${modelPath.join('-')}-start`,
            },
            {
              target: 'end',
              strategy: 'testId',
              attribute: 'data-test-id',
              value: `${modelPath.join('-')}-end`,
            },
          ]
        : [],
  },
});
```

Derived entries are marked `confidence: "derived"`. Configuration read before
a build is `declared`; values from the controlled Formly build are `resolved`.
Only a future browser observer may emit `observed` evidence.

For a named synthetic scenario, use the trusted compiler with the application's
configured Formly builder and a fresh field factory:

```ts
import { inject } from '@angular/core';
import { FormlyFormBuilder } from '@ngx-formly/core';
import { compileFormContractScenario } from '@formly-agent-contracts/formly-adapter';

const builder = inject(FormlyFormBuilder);
const { contract } = compileFormContractScenario({
  formId: 'example.profile',
  builder,
  createFields: () => createProfileFields(),
  model: { contactMethod: 'email' },
  formState: { readonly: false },
});
```

This API runs Formly callbacks and therefore belongs only in a trusted build or
CI process with synthetic inputs. MCP/query handlers read the resulting
artifact and never invoke it.

Current limitations are intentional:

- The adapter accepts explicitly supplied Formly configuration; it does not
  discover or evaluate arbitrary application source.
- Declared extraction does not execute functions. Expression callbacks become
  structured dynamic rules; validators, hooks, parsers, function array
  templates, and unsupported model rules remain stable diagnostics.
- Async option sources are identified, but remote values and lifecycle-driven
  changes are not awaited by the initial scenario compiler.
- Custom widget semantics, rendered DOM evidence, Playwright actions, and MCP
  transport are not part of this MVP.
- The compatibility claim is the exact pinned Angular 20.3.29 and Formly 6.1.8
  pairing, not all Angular or Formly versions.

## Formly test application

The workspace includes a browser-rendered Angular application with twelve
synthetic Formly 6.1 fixtures. It exercises root and child module registration,
three fixture-provider modules, native and custom field types, a wrapper,
validator, extension, preset, expressions, validation, repeaters, opaque
behavior, and isolated legacy-v6 aliases.

```sh
pnpm app:serve
```

Open <http://127.0.0.1:4200/> and select a fixture from the catalog. The
production AOT build is part of `pnpm build`; registry and Formly integration
coverage is part of `pnpm test`.

Workplace-only forms should remain in a private repository on the work
computer. They can implement the `TestFormDefinition` shape from
`apps/formly-test-app/src/app/form-registry/form-definition.ts` and provide a
group through `TEST_FORM_GROUPS`, without copying workplace labels, options,
models, identifiers, or rules into this public repository.

## Documentation

- [Architecture overview](docs/architecture-overview.md)
- [MVP specification](docs/mvp-spec.md)
- [v0.2 real-world semantics specification](docs/v0.2-real-world-semantics-spec.md)
- [v0.3 test locator specification](docs/v0.3-test-locators-spec.md)
- [Implementation plan](docs/implementation-plan.md)
- [Project delivery process](docs/project-process.md)
- [Parser MVP task plan](docs/planning/mvp-2026-08-26/task_plan.md)
- [Formly test application plan](docs/planning/formly-test-app/task_plan.md)
- [Architecture decisions](docs/decisions/)

## Contributing and Security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating, and use the
repository's private vulnerability-reporting flow described in
[SECURITY.md](SECURITY.md) for security issues.

This project is available under the [MIT License](LICENSE).
