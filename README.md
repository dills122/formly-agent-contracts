# Formly Contract

Formly Contract turns Angular Formly field configuration into stable,
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

This repository currently provides schema v0.4 and three packages:

| Package                      | Purpose                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@formly-contract/schema`    | Contract DTOs, runtime validation, canonical JSON, and SHA-256 content hashing                                                                                                          |
| `@formly-contract/compiler`  | Safe declared extraction and trusted scenario compilation for Formly 6.x                                                                                                                |
| `@formly-contract/workspace` | Experimental trusted config loading, strict root/project/source descriptors, policy resolution, deterministic multi-project artifact generation, and opt-in static direct-call indexing |

The repository also contains a private `@formly-contract/playwright` `0.0.0`
experiment for trusted-local driver implementation binding. It is not a fourth
shipped user package and does not launch a browser or generate Playwright tests.
See the [`packages/` guide](packages/README.md) for the complete ownership map.

It also includes:

- a deterministic CLI demo using a synthetic golden form;
- a browser-rendered Angular test application with twelve synthetic Formly
  fixtures;
- two consumer-shaped monorepo anchors: a deep Angular CLI behavior corpus and
  a real Nx workspace with an app, base Formly setup, reusable custom-field
  library, consuming feature library, project graph, and cached build;
- an opt-in `direct-root-call-v1` source-usage catalog that links one supported
  Angular component call to a stable form ID and exact generated contract hash;
- a browser-safe compact `radioChoice()` authoring helper that drives both the
  real Formly type name and generated canonical field-type profile;
- a supported usage target of Angular 20 or newer with Formly 6.x; and
- deep compatibility coverage for the pinned Angular `20.3.29` and Formly
  `6.1.8` reference combination.

The parser, contract, programmatic workspace runner, opt-in static source-usage
producer, pure agent-context query API, and generic pilot CLI with `list`,
`generate`, and non-mutating `check` commands are the current product. A
production MCP server, automatic Playwright generation, browser observation,
and broader Angular application/route discovery are future layers and are not
shipped by this MVP.

## Start here

| If you want to... | Go to... |
| --- | --- |
| understand the product boundary before installing anything | the [hosted documentation](https://dills122.github.io/formly-contract/) and [product status](apps/docs/src/content/docs/start/product-status.md) |
| evaluate Formly Contract in an application repository | the [workplace pilot guide](docs/workplace-pilot.md) |
| choose a single-project, Angular workspace, or Nx example | the [maintained example matrix](apps/docs/src/content/docs/reference/examples.md) |
| understand which implementation package owns a change | the [`packages/` guide](packages/README.md) |
| understand runnable apps and test fixtures | the [`apps/` guide](apps/README.md) and [`fixtures/` guide](fixtures/README.md) |
| contribute code or documentation | [`CONTRIBUTING.md`](CONTRIBUTING.md) and the [`docs/` guide](docs/README.md) |

Directory READMEs explain local purpose and boundaries before implementation
details. Specifications and ADRs remain the canonical source when an example or
orientation page is less precise.

Evaluating the current product in a private application repository? Start with
the [workplace pilot guide](docs/workplace-pilot.md). It provides one complete
setup, configuration, generation, troubleshooting, privacy, and feedback path
for a fresh coding agent or maintainer.

## Documentation site

The [hosted Astro Starlight documentation](https://dills122.github.io/formly-contract/)
provides the product-oriented path through installation, workspace discovery,
custom-field profiles, generated artifacts, and reliable E2E context. Its
source lives under `apps/docs/`. Run it locally with:

```sh
pnpm docs:dev
```

Build and validate it with `pnpm check:docs`. Pushes to `main` that change the
site deploy the static output through GitHub Pages. Root documents,
specifications, and ADRs remain canonical; the site links and organizes that
source material without replacing it.

## Use it in your own Angular/Formly codebase

The compiler and workspace packages run as build/test tooling beside your
Angular application and do not enter its browser bundle. Production custom-field
registration may import the schema package's dedicated browser-safe
`field-type-authoring` subpath. A typical adoption flow is:

```text
application-owned Formly factories
              |
     generation script or CI job
              |
       versioned contract JSON
              |
 Playwright / Cypress / agent tooling
```

### 1. Add the packages

The packages are not published to npm yet. Until the first release, clone this
repository next to the consuming application and build the three packages:

```sh
git clone https://github.com/dills122/formly-contract.git
cd formly-contract
pnpm install --frozen-lockfile
pnpm --filter @formly-contract/schema build
pnpm --filter @formly-contract/compiler build
pnpm --filter @formly-contract/workspace build
```

Then link them from the consuming application's `package.json` (adjust the
relative path for your checkout):

```json
{
  "dependencies": {
    "@formly-contract/schema": "link:../formly-contract/packages/schema"
  },
  "devDependencies": {
    "@formly-contract/compiler": "link:../formly-contract/packages/compiler",
    "@formly-contract/workspace": "link:../formly-contract/packages/workspace"
  }
}
```

`schema` is a regular dependency when production Angular code imports the
browser-safe `@formly-contract/schema/field-type-authoring` subpath. Keep the
compiler and workspace packages in `devDependencies`; their roots are Node-side
build tooling. A consumer that never imports schema from production code may
keep it dev-only.

Run `pnpm install` in the consuming application. The supported usage target is
Angular 20 or newer with Formly 6.x. The compatibility suite is pinned to
Angular `20.3.29` with Formly `6.1.8`, so that exact pairing has the strongest
test evidence. Other Angular major and Formly minor or patch combinations may
work, but validate them in the consuming application because they are not
covered to the same depth. Once the packages are published, normal versioned
dependencies will replace these local links: install `schema` as a regular
dependency when production Angular code imports its authoring subpath, and
install `compiler` and `workspace` as development dependencies.

### 2. Select the forms to expose

Form-root discovery is deliberately explicit. For a one-off extraction, create
a small application-owned registry that imports only the factories you want
the contract generator to inspect:

```ts
// tools/contract-forms.ts
import type { FormlyFieldConfig } from "@ngx-formly/core";
import { createClaimFields } from "../src/app/claims/claim.fields";
import { createCustomerFields } from "../src/app/customers/customer.fields";

export interface ContractFormTarget {
  id: string;
  createFields: () => FormlyFieldConfig[];
}

export const contractForms: ContractFormTarget[] = [
  { id: "claims.create", createFields: () => createClaimFields() },
  { id: "customers.edit", createFields: () => createCustomerFields() },
];
```

Each factory should return a fresh field tree. Do not invent service, stream,
callback, template, or business values merely to make a required-input factory
run; declared generation remains a trusted no-argument boundary.

For a repository-aware pilot, follow the
[workplace pilot guide](docs/workplace-pilot.md), using the
[workspace configuration reference](docs/workspace-configuration.md) when you
need the full configuration semantics. Define each complete form root with an
explicit ID and symbol, then group many definitions in one domain source:

```ts
import {
  defineFormContractDefinition,
  defineFormContractProject,
  defineFormContractSource,
} from "@formly-contract/workspace";

export const CLAIM_FORM_CONTRACT = defineFormContractDefinition({
  id: "claims.create",
  create: createClaimForm,
  lineage: { rootSymbol: createClaimForm },
});

export const CLAIMS_SOURCE = defineFormContractSource({
  sourceId: "claims/forms",
  list: () => [CLAIM_FORM_CONTRACT, CUSTOMER_FORM_CONTRACT],
});

export default defineFormContractProject({
  projectId: "claims/forms",
  sources: [CLAIMS_SOURCE],
});
```

The MVP source index treats this exact project-to-source-to-definition chain as
authority. The discovered project config must directly export
`defineFormContractProject(...)`, its `sources` array must directly reference
the canonical `defineFormContractSource(...)` descriptor, and the
helper-created definition (or a direct reference to its helper-created
`const`) must be a direct element of the descriptor's expression-bodied list.
The literal project/source IDs must match the runtime inventory. A separate
descriptor with the same `sourceId` is not authority; wrapped, dynamic, spread,
or unreturned flows fail closed.

Register complete form roots, not every reusable piece. Shared fragments and
steps remain dependencies/lineage of a root unless they are deliberately
registered as independently generated forms.

With root `sourceUsage` configured for one leaf Angular tsconfig, a supported
direct component call to `createClaimForm(...)` resolves statically to the
stable form ID and exact generated hash. The root `tsconfigPath` is required for
this opt-in pass: a narrow authority Program uses its module-resolution options
and roots only discovered project configs, while the application Program uses
`sourceUsage.tsconfigPath`. Each authority import or re-export used by the
registered chain must also resolve to the same canonical file through the exact
Jiti runtime used to load project configs. Program disagreement or runtime
resolution mismatch fails closed. Source indexing never executes or serializes
call arguments, and unchecked, suppressed, or TypeScript-invalid invocations
are non-actionable. Contract generation still executes the
definition's no-argument `create`. Without explicit lineage, implicit root
inference accepts `create` only when TypeScript proves it has a
zero-argument-compatible call signature. With explicit
`lineage.rootSymbol`, the real root may require arguments while a deliberate
Node-safe `create` adapter supplies the generated declared form without
inventing runtime data.

For that explicit-lineage case, the read-only
`formly-contracts author-factory-inputs --form-id <stable-id>` command can
recover the real exported options type and supported direct-use patterns from
the same TypeScript Program. It prints a typed partial draft, mutually exclusive
property counts, coverage, and whether any ambiguity could not be attributed to
one property. It does not call the source `list()`, factory, callbacks,
Observables, or Angular views and does not create the suggested file.
Construction values and unsafe or ambiguous inputs remain explicit. Duplicate,
unsupported, tooling-only, or overlapping roots produce stable diagnostics
instead of an empty successful result.

The counts use final materialization precedence: an unsupported type hazard
stays `unsupported` even when its use is also ambiguous; ambiguity otherwise
precedes explicit or generated review categories. Direct `eval()` is refused
as unattributed reflection rather than inspected or executed.

Every workspace-contained project config, source descriptor, form definition,
root declaration, and authority alias traversed between them is checked against
the final file bytes used for catalog materialization. A changed or unreadable
authority file suppresses every exact usage that depends on it. In a nested
workspace, only the exact canonical `@formly-contract/workspace` package-export
chain may resolve outside that root; it establishes helper identity but is not
part of the consumer-source byte evidence. Unrelated external aliases fail
closed. Run `generate` and `check` against a quiescent checkout: the TypeScript
Programs are created before any form factory executes, but this MVP does not
capture every runtime/Jiti-loaded module and has a short
config-loading-to-Program boundary.

For this pilot, every discovered project config must use `.ts`, `.mts`, or
`.cts` when `sourceUsage` is enabled. JavaScript project configs remain valid
for ordinary workspace generation, but the opt-in source pass rejects them
with `SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED` instead of silently changing
the configured application program.

Every indexed consuming feature/view library needs a discovered project config,
even when it owns no sources. Otherwise the call emits
`SOURCE_PROJECT_UNRESOLVED` and no exact link. Then run:

```sh
pnpm exec formly-contracts list
pnpm exec formly-contracts generate
pnpm exec formly-contracts check
```

`list` reports configured project/source inventory without invoking source
lists or form factories. `generate` writes content-addressed contracts, an
opt-in `source-usage-catalog.json`, and publishes `workspace-index.json` last.
`check` reruns trusted extraction and source indexing, then exact-compares the
expected canonical bytes without modifying output. The manual script below
remains useful for a single-package or one-off extraction.

### 3. Generate contract artifacts

Add a build-time script in the application repository:

```ts
// tools/generate-form-contracts.ts
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalStringify } from "@formly-contract/schema";
import { extractFormContract } from "@formly-contract/compiler";
import { contractForms } from "./contract-forms";

const outputDirectory = resolve("artifacts/form-contracts");
await mkdir(outputDirectory, { recursive: true });

for (const target of contractForms) {
  const { contract, diagnostics } = extractFormContract({
    formId: target.id,
    fields: target.createFields(),
  });

  await writeFile(
    resolve(outputDirectory, `${target.id}.json`),
    `${canonicalStringify(contract)}\n`
  );

  console.log(
    `${target.id}: ${contract.nodes.length} root nodes, ${diagnostics.length} diagnostics`
  );
}
```

Run this file with the TypeScript runner already used by the consuming
repository, or compile it as part of a Node-targeted tooling project. The
resulting JSON can be committed for review, uploaded as a CI artifact, or read
by downstream test-authoring tools. Because it is canonical and content-hashed,
an unexpected form-contract change is visible in source control or CI.

This declared path is the best starting point. It captures static structure and
records expression callbacks as dynamic metadata without executing arbitrary
application code.

### 4. Use a contract in Playwright

Validate stored JSON before trusting it, find the semantic node you need, and
use one of its exact locator candidates. For a standard `data-testid` locator:

```ts
import { readFile } from "node:fs/promises";
import {
  parseFormContract,
  type ContractNode,
  type ModelPathSegment,
} from "@formly-contract/schema";

function findNodeByPath(
  nodes: readonly ContractNode[],
  modelPath: readonly ModelPathSegment[]
): ContractNode | undefined {
  for (const node of nodes) {
    if (
      node.modelPath.length === modelPath.length &&
      node.modelPath.every((segment, index) => segment === modelPath[index])
    ) {
      return node;
    }

    const nested = findNodeByPath(
      node.arrayTemplate ? [...node.children, node.arrayTemplate] : node.children,
      modelPath
    );
    if (nested) return nested;
  }
}

const contract = parseFormContract(
  JSON.parse(await readFile("artifacts/form-contracts/claims.create.json", "utf8"))
);

const claimantName = findNodeByPath(contract.nodes, ["claimant", "name"]);

const testId = claimantName?.locators.find(
  (locator) => locator.strategy === "testId" && locator.attribute === "data-testid"
);

if (!claimantName || !testId) {
  throw new Error("claimant.name has no exact data-testid locator");
}

await page.getByTestId(testId.value).fill("Ada Lovelace");
```

Real consumers will normally put recursive node lookup and locator selection in
a shared Playwright or Cypress helper. Composite controls can expose several
locator targets, so helpers should select by `target` rather than assuming one
Formly node always maps to one DOM element. Empty locator arrays and diagnostics
must be handled as missing evidence, not replaced with invented selectors.

### 5. Resolve dynamic behavior when needed

If expressions determine visibility, required/readonly state, or option lists,
add synthetic scenarios and call `compileFormContractScenario`. Run that API in
a trusted Angular test/build environment configured with the application's real
Formly modules and custom types. Generate one artifact per meaningful scenario,
using only synthetic model and form-state data.

The [synthetic compatibility harness](fixtures/synthetic-form/src/compatibility.ts)
shows the complete Angular `TestBed` setup for obtaining a
`FormlyFormBuilder`. The detailed API example below shows the scenario call.

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

## Try this repository

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

That command runs lint, all tests, package and Angular production builds,
release metadata and tarball checks, the demo smoke test, and documentation
checks. Maintainers can find the tag, npm trusted-publishing, and first-release
procedure in [Releasing](docs/releasing.md).

## Extract declared form structure

Use `extractFormContract` when you have Formly configuration and want to inspect
it without running callbacks:

```ts
import { extractFormContract } from "@formly-contract/compiler";
import type { FormlyFieldConfig } from "@ngx-formly/core";

const fields: FormlyFieldConfig[] = [
  {
    key: "profile.name",
    type: "input",
    props: {
      label: "Name",
      required: true,
      attributes: { "data-testid": "profile-name" },
    },
  },
];

const { contract, diagnostics } = extractFormContract({
  formId: "example.profile",
  fields,
});
```

This path is pure and non-mutating. It does not call expression functions,
subscribe to Observables, run validators, or render Angular components.
Recognized callbacks become dynamic-rule metadata; unsupported behavior becomes
an explicit diagnostic. The returned node has the stable ID
`example.profile::path:s_profile.s_name`, model path `['profile', 'name']`, its
required constraint, and an exact `data-testid` locator.

For an application-owned custom radio, author one compact declaration through
the browser-safe `@formly-contract/schema/field-type-authoring` subpath:

```ts
import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
  toFormlyTypeRegistration,
} from "@formly-contract/schema/field-type-authoring";

const COOL_RADIO_TYPE = defineContractedFormlyType({
  name: "cool-radio-btn-grp",
  profile: { id: "claims.cool-radio", version: 1 },
  behavior: radioChoice(),
});

const fieldTypeProfiles = buildFieldTypeProfileRegistry({
  id: "claims.field-types",
  version: 1,
  types: [COOL_RADIO_TYPE],
});

// Bind the component only in the Angular module.
const registration = toFormlyTypeRegistration(COOL_RADIO_TYPE, CoolRadioComponent);
```

The same reviewed declaration supplies the real registration name and the
canonical profile DTO. The helper does not inspect an Angular template or
infer behavior from a type name. The helper snapshots and runtime-freezes its
validated data so later mutation of caller-owned input cannot desynchronize
registration and profile generation. `radioChoice()` is the only compact MVP preset;
other custom types still need the lower-level registry or remain visible but
non-operable with a stable diagnostic. Named variants use the data-only root
field metadata `formlyContract: { profileVariant: 'variant-name' }`.

Static radio/select options and boolean controls expose complete value domains.
Unresolved option functions, expressions, and asynchronous sources remain
dynamic and are never executed by declared extraction. Trusted scenario
extraction may expose the scenario-specific resolved domain.

## Resolve a synthetic scenario

Use `compileFormContractScenario` when required, readonly, disabled, hidden,
options, or locator attributes depend on Formly expression callbacks:

```ts
import { inject } from "@angular/core";
import { FormlyFormBuilder } from "@ngx-formly/core";
import { compileFormContractScenario } from "@formly-contract/compiler";

const builder = inject(FormlyFormBuilder);
const { contract, diagnostics } = compileFormContractScenario({
  formId: "example.profile",
  builder,
  createFields: () => createProfileFields(),
  model: { contactMethod: "email" },
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
adapter never invents CSS or XPath. Field IDs are derived hints because a
custom type may render the ID on a wrapper. IDs declared inside `fieldArray`
templates are omitted with an `UNRELIABLE_DOM_ID` diagnostic because runtime
rows may omit or index them.

Applications with their own naming convention can set `testIdAttributes` and
provide a deterministic `deriveLocators` callback. The callback receives only
frozen identity data, not the live Formly field. It may return several named
targets for a composite widget such as a date range; its output is marked
`confidence: "derived"`. See the
[v0.3 locator specification](docs/v0.3-test-locators-spec.md) for the complete
contract and example.

## Evidence model

The contract keeps three evidence levels separate:

| Evidence   | Meaning                                                        | Available now?                              |
| ---------- | -------------------------------------------------------------- | ------------------------------------------- |
| `declared` | Read safely from supplied Formly configuration                 | Yes                                         |
| `resolved` | Read from a controlled Formly build for one synthetic scenario | Yes                                         |
| `observed` | Seen in a real rendered browser DOM                            | Schema-ready; capture layer not implemented |

A resolved locator is not silently presented as browser-observed. Likewise,
opaque or asynchronous behavior is reported rather than guessed.

## Supported contract information

Schema v0.4 can represent:

- ordered controls, groups, display-only nodes, and array templates;
- stable semantic node IDs and cumulative model paths;
- Formly and common semantic control types;
- labels, descriptions, placeholders, JSON-safe defaults, and wrappers;
- required, min/max, length, string-pattern, and named constraints;
- static and resolved public options plus dynamic/async option-source metadata;
- explicit finite, dynamic, and unknown value domains plus resolved
  interaction-profile metadata;
- string/boolean conditions and callback/async dynamic-rule metadata;
- resolved hidden, readonly, and disabled state;
- exact and derived locator candidates, including multiple named targets; and
- deterministic diagnostics, canonical JSON, and content hashing.

## Intentional limitations

- Forms must be supplied explicitly. The opt-in source index recognizes one
  leaf TypeScript program, explicit exported root symbols, and direct function
  or constructor calls (including resolved import aliases and barrels). It does
  not follow wrapped calls, callbacks, dynamic dispatch, routes, or runtime
  render reachability.
- Each indexed definition must be returned directly by the canonical source
  descriptor that the discovered canonical project config directly registers.
  Literal IDs must match runtime inventory; a same-ID descriptor elsewhere is
  not authority.
- Indexed callsites must be under a discovered project-config root. A consuming
  feature library may need a source-empty config to establish MVP ownership.
- Declared extraction never evaluates functions or function source.
- The scenario compiler performs the initial controlled Formly build but does
  not wait for remote options or lifecycle-driven browser behavior.
- Formly `RegExp` patterns are diagnosed; v0.4 represents string patterns only.
- Compact custom-widget authoring currently covers only reviewed radio-choice
  behavior. Other widgets require an application-supplied serializable
  registry; executable application drivers remain a later integration.
- The project does not currently generate or execute Cypress/Playwright tests.
- No production MCP server or browser-observation layer is included.
- The supported usage target is Angular 20 or newer with Formly 6.x, but
  compatibility testing is concentrated on Angular `20.3.29` with Formly
  `6.1.8`. Mileage may vary across other major, minor, and patch combinations.
- The packages are not on npm yet. Their `@formly-contract/*` names are settled,
  but the one-time npm bootstrap release still needs maintainer approval; the
  automated release path is ready and documented in
  [Releasing](docs/releasing.md).

## Synthetic test application

The Angular test application contains twelve invented forms covering native
and custom fields, wrappers, validators, extensions, presets, expressions,
validation, repeaters, opaque behavior, and legacy Formly v6 aliases. It is
also a complete single-project workspace example: one adjacent root config and
project descriptor expose the same browser factories through three form
sources and a reviewed custom-field profile registry.

```sh
pnpm app:serve
```

Open <http://127.0.0.1:4200/> and choose a fixture from the catalog.

Workplace forms and data should remain in a private work repository. A private
fixture module can implement `TestFormDefinition` and register a group through
`TEST_FORM_DEFINITION_GROUPS` without copying workplace labels, identifiers,
options, or rules into this public project.

Run the contract compliance tests for this application, the multi-project
Angular CLI fixture, and the Nx fixture together with `pnpm test:examples`.

## Repository layout

```text
packages/
  schema/            Versioned DTOs, validation, canonical JSON, and hashing
  compiler/          Declared extraction and trusted Formly scenario builds
  workspace/         Config loading, discovery, artifact runner, index, and CLI
fixtures/
  synthetic-form/            Public golden form and real-builder compatibility fixture
  angular-monorepo/          Deep six-form Angular CLI discovery/interaction corpus
  nx-workspace/              Ten-form microgrid corpus in a real four-project Nx graph
  workspace-config-loader/   ESM/CJS/TS config-loading fixtures for workspace tests
apps/
  demo-cli/          Prints the deterministic golden contract
  formly-test-app/   Single-project Angular example and twelve-form browser corpus
  docs/              Astro Starlight documentation site
docs/                Specifications, ADRs, delivery plans, and evidence
```

Each top-level group has its own navigation README:
[`packages/`](packages/README.md), [`apps/`](apps/README.md),
[`fixtures/`](fixtures/README.md), and [`docs/`](docs/README.md).

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

- [Workplace pilot guide](docs/workplace-pilot.md)
- [Workspace configuration reference](docs/workspace-configuration.md)
- [Architecture overview](docs/architecture-overview.md)
- [MVP specification](docs/mvp-spec.md)
- [v0.2 real-world semantics specification](docs/v0.2-real-world-semantics-spec.md)
- [v0.3 test locator specification](docs/v0.3-test-locators-spec.md)
- [Formly test application specification](docs/formly-test-app-spec.md)
- [Maintained example matrix](apps/docs/src/content/docs/reference/examples.md)
- [Parser MVP implementation plan](docs/implementation-plan.md)
- [Workspace discovery implementation
  plan](docs/planning/workspace-discovery/implementation-plan.md)
- [Architecture decisions](docs/decisions/)

## Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating. Report security
issues through the private process described in [SECURITY.md](SECURITY.md).

This project is available under the [MIT License](LICENSE).
