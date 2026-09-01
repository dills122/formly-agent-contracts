# Formly Contract

Formly Contract turns selected Angular Formly configurations into deterministic,
versioned JSON. Test authors and coding agents can use that JSON to understand a
form without loading Formly runtime objects or inventing selectors.

> **Pre-release status:** the schema and compiler are prepared for an initial npm
> release but are not published yet. The workspace tooling is still private and
> experimental. A production MCP server, automatic Playwright generation, and
> live-browser observation are not shipped.

[Read the documentation](https://dills122.github.io/formly-contract/) ·
[See current product status](apps/docs/src/content/docs/start/product-status.md) ·
[Run a workplace pilot](docs/workplace-pilot.md)

## What you get

A Form Contract can describe:

- controls, groups, display content, and repeatable templates in source order;
- model paths, Formly types, labels, constraints, choices, and defaults;
- declared or scenario-resolved visibility, required, readonly, and disabled
  state;
- exact or application-derived locator candidates such as `data-testid` and
  `data-cy`;
- reviewed interaction semantics for custom field types; and
- explicit diagnostics and unknowns when behavior cannot be projected safely.

Contracts are strictly validated, canonically serialized, and content-hashed,
which makes unexpected form changes visible in source control or CI.

## Is this for your project?

Formly Contract is useful when your team:

- builds substantial Angular forms from Formly configuration;
- wants reviewable form metadata for E2E planning, CI checks, or coding agents;
- needs locator evidence without allowing tools to invent CSS or XPath; or
- wants unsupported and dynamic behavior reported explicitly instead of hidden
  behind a best-effort result.

It is build-time tooling, not a replacement for Formly or a browser test
runner. It is also still pre-release: use the repository-linked packages for an
evaluation today, but do not expect a drop-in npm install, MCP server, or
automatic Playwright suite yet.

## How it works

```text
application-owned Formly factories
                |
       explicitly registered roots
                |
   declared or scenario compilation
                |
  validated, content-hashed contracts
                |
 workspace index / CI / E2E tooling / agents
```

1. **Choose the forms.** The application explicitly registers complete form
   roots. Formly Contract does not guess which exports represent real forms.
2. **Generate trusted evidence.** Node-side tooling projects declared
   configuration or runs an intentionally configured synthetic scenario.
3. **Publish deterministic artifacts.** Contracts and indexes are validated,
   canonically serialized, and linked by stable IDs and hashes.
4. **Consume without guessing.** Tests and agents read semantic model paths,
   constraints, choices, states, and locator candidates. Missing evidence stays
   missing.

A generated contract has this representative shape (abridged):

```jsonc
{
  "schemaVersion": "0.4.0",
  "formId": "profile.edit",
  "nodes": [
    {
      "id": "profile.edit::path:s_profile.s_name",
      "kind": "control",
      "modelPath": ["profile", "name"],
      "semanticType": "text",
      "constraints": [{ "kind": "required" }],
      "locators": [
        {
          "strategy": "testId",
          "attribute": "data-testid",
          "value": "profile-name",
          "confidence": "exact",
          "evidence": "declared"
        }
      ],
      "evidence": "declared"
    }
  ],
  "diagnostics": [],
  "contentHash": "sha256:…"
}
```

The real schema contains additional normalized fields and strict validation;
this example highlights the information a consumer usually starts with.

<p align="center">
  <a href="https://dills122.github.io/formly-contract/start/end-to-end/">
    <img
      alt="Start the detailed Formly Contract onboarding guide"
      src="https://img.shields.io/badge/Start_the_detailed_onboarding_guide-2563eb?style=for-the-badge"
    >
  </a>
</p>

## Try the repository

Prerequisites:

- Node.js `22.22.1` (packages support `>=22.13.0 <23`)
- pnpm `10.23.0`

```sh
pnpm install --frozen-lockfile
pnpm demo
```

`pnpm demo` builds the core package slice and prints a canonical contract for a
synthetic form. Run the full repository gate with:

```sh
pnpm check
```

That command runs linting, tests, builds, package checks, the demo smoke test,
and documentation validation.

## Extract one form

Use the compiler in trusted Node-side build or test tooling when you already
have a fresh `FormlyFieldConfig[]`:

```ts
import type { FormlyFieldConfig } from '@ngx-formly/core';
import { extractFormContract } from '@formly-contract/compiler';

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
  formId: 'profile.edit',
  fields,
});
```

Declared extraction does not execute callbacks, subscribe to Observables, or
render Angular components. Unsupported behavior is reported in `diagnostics`
instead of being guessed or silently discarded.

For repository-wide generation, explicitly register application-owned form
roots and use the workspace CLI:

```sh
pnpm exec formly-contracts list
pnpm exec formly-contracts generate
pnpm exec formly-contracts check
```

- `list` inventories configured projects and sources without running form
  factories, retaining healthy inventory plus safe per-config failures.
- `generate` writes content-addressed contracts and publishes the workspace
  index last.
- `check` verifies the expected canonical bytes without changing generated
  output.
- `author-factory-inputs` is an optional, read-only aid for reviewing supported
  typed factory inputs.

Use repeatable `--project` selectors when every project config loads, or an
exact workspace-relative `--project-config` selector to avoid importing a
known browser-only sibling. Selected runs publish a separate deterministic
scoped index.

The packages are not available from npm yet. Follow the
[installation guide](apps/docs/src/content/docs/start/installation.md) to build
and link them from a sibling checkout or create a portable `pnpm pilot:pack`
tarball bundle, then use the
[end-to-end workspace guide](apps/docs/src/content/docs/start/end-to-end.md) for
configuration and form registration.

## Packages

| Package | Responsibility | Status |
| --- | --- | --- |
| [`@formly-contract/schema`](packages/schema/README.md) | Versioned DTOs, strict parsers, canonical JSON, hashing, profiles, effects, and pure query data | `0.4.0`; prepared for first npm release |
| [`@formly-contract/compiler`](packages/compiler/README.md) | Allowlisted declared extraction and trusted Formly scenario compilation | `0.4.0`; prepared for first npm release |
| [`@formly-contract/workspace`](packages/workspace/README.md) | Trusted config loading, discovery, generation, checking, source usage, and CLI tooling | `0.1.0`; private and experimental |
| [`@formly-contract/playwright`](packages/playwright/README.md) | Trusted-local driver inventory and validated-plan call-binding experiment | `0.0.0`; private, no browser execution |

The main dependency direction is:

```text
workspace -> compiler -> schema
playwright -----------> schema
```

See the [package guide](packages/README.md) for ownership boundaries and public
entry points.

## Evidence, not guesses

Formly Contract keeps three kinds of evidence separate:

| Evidence | Meaning | Available now? |
| --- | --- | --- |
| Declared | Safely projected from supplied Formly configuration | Yes |
| Resolved | Produced by a controlled Formly build for a synthetic scenario | Yes |
| Observed | Captured from a rendered browser DOM | Schema-ready; capture is not implemented |

A resolved value is never presented as browser-observed. Empty locator arrays,
opaque callbacks, asynchronous behavior, and incomplete source coverage remain
explicit rather than being replaced with inferred values.

## Current boundaries

Available today:

- Form Contract schema `0.4.0`, runtime validation, canonical JSON, and SHA-256
  hashes;
- declared extraction and trusted scenario compilation for Formly 6.x;
- deterministic multi-project discovery and artifact generation;
- explicit form registration and optional direct-call source indexing;
- custom-field profiles, cross-field effect metadata, and a browser-safe
  radio-choice authoring helper;
- pure agent-context queries plus strict typed test-intent validation and
  source-bound canonical plans over caller-assembled artifacts; and
- Angular CLI, Nx, and browser-rendered synthetic examples.

Not shipped:

- a production MCP server or CLI-managed query service;
- automatic test-intent generation or executable Playwright/Cypress tests;
- browser-executing field drivers or live DOM observation;
- automatic route/render discovery or complete interprocedural source tracing;
  and
- compact authoring presets for custom controls beyond the current radio-choice
  path.

The optional source index recognizes a deliberately narrow direct-call
convention and fails closed when it cannot prove an exact link. It does not
execute or serialize application call arguments. Read the
[product status](apps/docs/src/content/docs/start/product-status.md) for the
precise capability boundary.

## Supported environment

The intended consumer range is Angular 20 or newer with Formly 6.x. The deepest
compatibility coverage uses Angular `20.3.29` with Formly `6.1.8`; validate other
version combinations in the consuming application.

The compiler and workspace packages are Node-side tooling and should not enter
an Angular browser bundle. Production custom-field registration may use the
schema package's dedicated browser-safe
`@formly-contract/schema/field-type-authoring` entry point.

## Examples and documentation

| Start here | Use it for |
| --- | --- |
| [Hosted documentation](https://dills122.github.io/formly-contract/) | Product-oriented evaluation, concepts, and reference |
| [Public API reference](apps/docs/src/content/docs/reference/api.md) | Supported package entry points and their trust boundaries |
| [End-to-end workspace guide](apps/docs/src/content/docs/start/end-to-end.md) | A complete Angular or Nx integration path |
| [Workplace pilot](docs/workplace-pilot.md) | Evaluating a private application repository |
| [Workspace configuration](docs/workspace-configuration.md) | Detailed configuration semantics |
| [Maintained examples](apps/docs/src/content/docs/reference/examples.md) | Choosing the Angular, Nx, or single-project example |
| [Architecture overview](docs/architecture-overview.md) | Evidence, trust, identity, and package boundaries |

Repository navigation guides are also available for
[`packages/`](packages/README.md), [`apps/`](apps/README.md),
[`fixtures/`](fixtures/README.md), and [`docs/`](docs/README.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating. Report security
issues through the private process in [SECURITY.md](SECURITY.md).

Formly Contract is available under the [MIT License](LICENSE).
