---
title: One Formly form, end to end
description: Follow one maintained Angular Formly form from application code through workspace wiring, repeatable generation, and an agent-readable contract.
---

This is the complete path through Formly Contract, using one form that is
compiled and checked in this repository—not a disconnected documentation
sample. You will see the form first, then follow the exact code that owns it,
connect it to a workspace, generate it repeatedly, and read what the resulting
contract actually says.

<div class="status-line" aria-label="Walkthrough capability status">
  <span class="status status--current">Works today</span>
  <span>Formly code → source → project → contract</span>
  <span class="status status--current">Supported intent</span>
  <span>Hash-pinned context → validated plan → bound driver calls</span>
  <span class="status status--planned">Not shipped</span>
  <span>Driver invocation in a browser</span>
</div>

<nav class="walkthrough-map" aria-label="End-to-end walkthrough">
  <a href="#1-author-the-form"><span>01</span>Author</a>
  <a href="#2-connect-it"><span>02</span>Connect</a>
  <a href="#3-generate-and-regenerate"><span>03</span>Generate</a>
  <a href="#4-read-the-contract"><span>04</span>Inspect</a>
  <a href="#5-use-it-without-guessing"><span>05</span>Use</a>
</nav>

## Start with the thing a person sees

The maintained example is a small contact-preferences fragment from the
[Angular CLI workspace fixture](https://github.com/dills122/formly-contract/tree/main/fixtures/angular-monorepo).
It combines an ordinary Formly input with an application-owned radio type and
an expansion-panel wrapper.

<figure class="form-specimen">
  <figcaption>
    <span class="form-specimen__caption-title">
      <span>Maintained fixture</span>
      <strong>Claim contact preferences</strong>
    </span>
    <span>Fixture-backed controls · illustrative populated state and application shell</span>
  </figcaption>
  <div class="form-specimen__surface">
    <header class="form-specimen__header">
      <span class="form-specimen__step">Contact details</span>
      <div>
        <h3>How should we reach the claimant?</h3>
        <p>Confirm the claimant and choose one preferred contact channel.</p>
      </div>
      <span class="form-specimen__requirement">2 required fields</span>
    </header>
    <div class="form-specimen__body">
      <label class="form-specimen__field">
        <span>Claimant name <span aria-hidden="true">*</span></span>
        <input type="text" value="Maya Chen" disabled />
        <small>Use the name associated with the claim.</small>
      </label>
      <section class="form-specimen__panel" aria-label="Expanded contact method wrapper">
        <div class="form-specimen__panel-title">
          <span>Preferred contact method <span aria-hidden="true">*</span></span>
          <span>Expanded</span>
        </div>
        <fieldset disabled>
          <legend>Choose one option</legend>
          <label class="form-specimen__option">
            <input type="radio" name="contact-preview" checked />
            <span>Email</span>
            <span>Selected</span>
          </label>
          <label class="form-specimen__option">
            <input type="radio" name="contact-preview" />
            <span>Phone</span>
          </label>
        </fieldset>
      </section>
    </div>
    <footer class="form-specimen__model">
      <span>Illustrative after-interaction model</span>
      <code>{ claimant: { name: 'Maya Chen', contactPreference: 'email' } }</code>
    </footer>
  </div>
</figure>

The shell around the controls is intentionally presentational. The field
structure, labels, required state, option labels and values, type alias, and
wrapper configuration come from the maintained example. The populated name,
selected radio value, and expanded panel deliberately show an illustrative
**after-interaction** state. They are not fixture or contract evidence: the
maintained source starts with `model: {}`, and its wrapper starts collapsed.
This is the same separation you see in Formly's official advanced-layout and
Material stepper examples: Formly owns field configuration and state; the
application or UI package owns the visual composition.

The application owns this definition. Formly Contract does not replace the
form, add a parallel DSL, or scrape the rendered DOM:

```ts title="libs/forms-kit/src/lib/fragments/contact.fragment.ts"
import type { FormlyFieldConfig } from '@ngx-formly/core';

export function createContactFragment(): FormlyFieldConfig[] {
  return [
    {
      key: 'claimant.name',
      type: 'input',
      id: 'claimant-name',
      props: { label: 'Claimant name', required: true },
    },
    {
      key: 'claimant.contactPreference',
      type: 'cool-radio-btn-grp',
      id: 'contact-preference',
      wrappers: ['fixture-expansion-panel'],
      props: {
        label: 'Preferred contact method',
        required: true,
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'phone' },
        ],
      },
    },
  ];
}
```

Already present in ordinary Formly configuration are the model paths, labels,
required constraints, choices, Formly types, wrapper, and DOM IDs. The
compiler projects that evidence conservatively—it does not fill in missing
meaning.

## 1. Author the form

Keep form factories with the application or library that owns them. A contract
factory must return fresh fields and safe model state whenever generation calls
it. It must not fetch customer data, contact remote services, or depend on a
browser-only bootstrap path.

The same `createContactFragment()` factory can be composed into a real Angular
page and exposed to contract generation. There is no copied field tree to
become stale.

<div class="evidence-pair" role="list" aria-label="Application and contract ownership">
  <div role="listitem">
    <strong>Browser side</strong>
    <span>Angular registers and renders the input, custom radio component, and wrapper.</span>
  </div>
  <div role="listitem">
    <strong>Build side</strong>
    <span>A Node-safe source calls the same field factory under a stable form ID.</span>
  </div>
</div>

The browser side remains ordinary Angular/Formly code. The maintained custom
type extends `FieldType`, binds Formly's `formControl`, and forwards
`formlyAttributes` to the actual input. Those are the important integration
points; the surrounding markup and CSS are application-owned:

```ts title="cool-radio-button-group.component.ts (focused excerpt)"
@Component({
  selector: 'fixture-cool-radio-button-group',
  template: `
    <fieldset class="cool-radio-group" role="radiogroup">
      <legend>{{ props.label }}</legend>
      @for (option of props.options ?? []; track option.value) {
        <label>
          <input
            type="radio"
            [name]="field.name ?? id"
            [value]="option.value"
            [formControl]="formControl"
            [formlyAttributes]="field"
          />
          <span>{{ option.label }}</span>
        </label>
      }
    </fieldset>
  `,
})
export class CoolRadioButtonGroupComponent extends FieldType<
  FieldTypeConfig<CoolRadioProps>
> {}
```

### Declare the alias and its contract together

Formly registration tells Formly which component renders an alias. It does
**not** tell Formly Contract whether that component is a radio group, what its
model value looks like, or which reviewed interaction is safe. Declare those
semantics once with the browser-safe authoring entry point, then derive both
the Formly type registration and canonical contract profile from that
declaration:

```ts title="field-type-profiles.ts (maintained fixture)"
import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  defineContractedFormlyWrapper,
  radioChoice,
} from '@formly-contract/schema/field-type-authoring';

export const FIXTURE_COOL_RADIO_TYPE = defineContractedFormlyType({
  name: 'cool-radio-btn-grp',
  profile: { id: 'fixture.cool-radio', version: 1 },
  behavior: radioChoice(),
});

export const FIXTURE_EXPANSION_PANEL_WRAPPER = defineContractedFormlyWrapper({
  name: 'fixture-expansion-panel',
  profile: { id: 'fixture.expansion-panel-wrapper', version: 1 },
  activation: {
    part: 'wrapper-expand',
    operation: 'click',
    role: 'button',
  },
});
```

`radioChoice()` is a reviewed behavior declaration, not component
introspection. It lowers to the complete radio-group profile shown later,
including projected `props.options`, `generic.choice`, and the `check`
operation. The wrapper declaration lowers to the required activation
precondition. If the component behaves differently, choose a matching preset
or keep an explicit reviewed profile with unknowns.

### Register custom UI where Angular boots

Registration still happens in ordinary Angular/Formly code. The shared type
definition supplies the exact alias to `toFormlyTypeRegistration(...)`. Formly
does not have an equivalent contracted-wrapper registration helper, so the
wrapper registration remains the normal Formly object while reusing the
declaration's exact `name`.

This maintained fixture supports Formly 6.x and is NgModule-based. Its
application calls `FormlyModule.forRoot(...)` once; the feature library uses
`FormlyModule.forChild(...)` for its aliases:

```ts title="forms-kit.module.ts (maintained fixture, focused excerpt)"
import {
  toFormlyTypeRegistration,
} from '@formly-contract/schema/field-type-authoring';

import {
  FIXTURE_COOL_RADIO_TYPE,
  FIXTURE_EXPANSION_PANEL_WRAPPER,
} from './field-type-profiles.js';

@NgModule({
  declarations: [
    CoolRadioButtonGroupComponent,
    FixtureExpansionPanelWrapperComponent,
  ],
  imports: [
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [
        toFormlyTypeRegistration(
          FIXTURE_COOL_RADIO_TYPE,
          CoolRadioButtonGroupComponent,
        ),
      ],
      wrappers: [
        {
          name: FIXTURE_EXPANSION_PANEL_WRAPPER.name,
          component: FixtureExpansionPanelWrapperComponent,
        },
      ],
    }),
  ],
})
export class FormsKitModule {}
```

The result supplies the same aliases used by the field definition:

```ts
{
  type: 'cool-radio-btn-grp',
  wrappers: ['fixture-expansion-panel'],
}
```

If every use of a custom type always needs the same wrapper, extend the derived
Formly type registration with
`wrappers: [FIXTURE_EXPANSION_PANEL_WRAPPER.name]`. Keep the wrapper on the
individual field, as this fixture does, when wrapping is a per-usage decision.
Formly's API also accepts the component class directly, but stable string
aliases are the useful case for shared or JSON-powered field configuration—and
they are what Formly Contract can record as declared evidence.

See Formly 6's official guides for the underlying
[custom type](https://v6.formly.dev/docs/guide/custom-formly-field/) and
[custom wrapper](https://v6.formly.dev/docs/guide/custom-formly-wrapper/)
patterns. Formly 7 has different standalone provider APIs; this package's
published peer range is Formly 6.x, so this walkthrough does not present the
v7 provider surface as an equivalent supported setup.

:::caution[Keep the boundary Node-safe]
Contract discovery evaluates the project and source import graph in Node. Keep
Angular modules and browser-only barrels out of that graph. A small dedicated
`contracts` entry point is usually enough.
:::

## 2. Connect it

Three small declarations connect application code to a workspace. Each one has
one job.

<div class="connection-map" aria-label="Form contract connection map">
  <div><span>Form definition</span><strong>What the form is</strong></div>
  <div><span>Source</span><strong>Which forms belong together</strong></div>
  <div><span>Project</span><strong>Who owns sources and profiles</strong></div>
  <div><span>Workspace</span><strong>What to discover and where to write</strong></div>
</div>

### Give the form a stable identity

The source groups related forms and assigns a stable `formId`. The ID is the
semantic handle consumers use even when the generated filename changes.

```ts title="libs/forms-kit/src/lib/shared-forms.source.ts"
import { defineFormContractSource } from '@formly-contract/workspace';
import { createContactFragment } from './fragments/contact.fragment.js';

export const SHARED_FORMS_SOURCE = defineFormContractSource({
  sourceId: 'fixture/shared-forms',
  list: () => [
    {
      id: 'shared.contact-preferences',
      create: () => ({ fields: createContactFragment(), model: {} }),
    },
  ],
});
```

Use source boundaries that match feature or library ownership. They are not
required to mirror every folder.

### Put the source in an owning project

The project descriptor attaches the source and the reviewed custom-field
profiles owned by this library:

```ts title="libs/forms-kit/formly-contracts.project.ts"
import { defineFormContractProject } from '@formly-contract/workspace';
import {
  FIXTURE_FIELD_TYPE_PROFILES,
  SHARED_FORMS_SOURCE,
} from '@fixture/forms-kit/contracts';

export default defineFormContractProject({
  projectId: 'fixture-forms-kit',
  sources: [SHARED_FORMS_SOURCE],
  fieldTypeProfiles: FIXTURE_FIELD_TYPE_PROFILES,
});
```

The custom `cool-radio-btn-grp` becomes meaningful when the project attaches
the registry generated from the same declarations used above. The maintained
fixture combines this generated walkthrough slice with explicit profiles for
other controls whose richer semantics do not fit the current compact presets:

```ts title="field-type-profiles.ts (registry lowering)"
const generatedWalkthroughProfiles = buildFieldTypeProfileRegistry({
  id: 'fixture.angular-fields',
  version: 1,
  types: [FIXTURE_COOL_RADIO_TYPE],
  wrappers: [FIXTURE_EXPANSION_PANEL_WRAPPER],
});

export const FIXTURE_FIELD_TYPE_PROFILES = {
  schemaVersion: '0.4.0',
  id: 'fixture.angular-fields',
  version: 1,
  profiles: [
    ...generatedWalkthroughProfiles.profiles,
    // Other maintained explicit profiles are omitted here.
  ],
  registrations: [
    ...generatedWalkthroughProfiles.registrations,
    // Other maintained explicit registrations are omitted here.
  ],
  wrappers: generatedWalkthroughProfiles.wrappers,
};
```

The builder generates both joins:

1. `type: 'cool-radio-btn-grp'` → `registrations[].formlyType` →
   `fixture.cool-radio` → the single-choice profile.
2. `wrappers: ['fixture-expansion-panel']` → `wrappers[].wrapperName` → the
   `wrapper-expand` activation precondition.

Without the first mapping, compilation reports `UNMAPPED_FIELD_TYPE` and the
generated node will not contain the interaction profile shown later. Without
the wrapper profile, the contract cannot preserve the required expansion step.
Profiles describe reviewed semantics; they are not executable Playwright
implementations.

:::tip[This is the primary custom-field flow]
Define the contracted type first, derive its Formly registration, and lower the
same definition into the project registry. Use
`defineContractedFormlyWrapper(...)` for reviewed wrapper semantics while
reusing its name in Formly's ordinary wrapper registration. See
[Custom field profiles](../../reference/field-profiles/) for every shipped
preset, aliases, variants, and the legacy escape hatch.
:::

### Let the root discover projects

The root config sets workspace-wide policy and output location:

```ts title="formly-contracts.config.ts"
import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: [
    'apps/**/formly-contracts.project.ts',
    'libs/**/formly-contracts.project.ts',
  ],
  tsconfigPath: 'tsconfig.json',
  output: { directory: 'dist/formly-contracts' },
  diagnostics: { failOn: ['error'] },
});
```

Use the TypeScript config that owns aliases imported by the Node-safe contract
entry points: commonly `tsconfig.json` in Angular CLI or `tsconfig.base.json`
in Nx.

## 3. Generate and regenerate

Start with discovery. `list` loads configuration and inventories projects and
sources without calling the form factories:

```sh
pnpm exec formly-contracts list
```

Then generate the artifact set and verify it is current:

```sh
pnpm exec formly-contracts generate
pnpm exec formly-contracts check
```

<div class="regeneration-loop" aria-label="Regeneration workflow">
  <div><strong>Edit</strong><span>Change the Formly factory, profile, or config.</span></div>
  <div><strong>Generate</strong><span>Publish canonical contracts and the index.</span></div>
  <div><strong>Review</strong><span>Inspect the semantic diff and diagnostics.</span></div>
  <div><strong>Check</strong><span>Fail CI if expected output is stale.</span></div>
</div>

`generate` validates stable IDs, calls the trusted factories, writes each
content-addressed contract, and publishes `workspace-index.json` last. `check`
performs the same extraction in memory and exact-compares canonical bytes
without changing the output directory.

```text
dist/formly-contracts/
├── workspace-index.json
└── projects/
    └── id_Zml4dHVyZS1mb3Jtcy1raXQ/
        └── forms/
            └── id_c2hhcmVkLmNvbnRhY3QtcHJlZmVyZW5jZXM/
                └── sha256-322b…e6ca.contract.json
```

Do not construct that encoded path yourself. Look up stable IDs in the index
and open its recorded `artifactPath`:

```json title="workspace-index.json (focused excerpt)"
{
  "formId": "shared.contact-preferences",
  "projectId": "fixture-forms-kit",
  "sourceId": "fixture/shared-forms",
  "contractSchemaVersion": "0.4.0",
  "contentHash": "sha256:322b444e514927b3dbccaf9271e581d8fe7222dfed2c804dcdd96de143e6e6ca",
  "artifactPath": "dist/formly-contracts/projects/id_Zml4dHVyZS1mb3Jtcy1raXQ/forms/id_c2hhcmVkLmNvbnRhY3QtcHJlZmVyZW5jZXM/sha256-322b444e514927b3dbccaf9271e581d8fe7222dfed2c804dcdd96de143e6e6ca.contract.json"
}
```

The hash changes when canonical contract content changes. `formId`,
`projectId`, and `sourceId` are stable joins across generations.

:::note[Try the maintained example]
From this repository root, run
`pnpm exec vitest run fixtures/angular-monorepo/workspace-fixture.test.ts`.
The test generates the workspace twice, compares byte-identical output, and
checks it against the committed golden artifact used on this page.
:::

## 4. Read the contract

Here is the generated node for the application-owned radio field. This is a
formatted excerpt of the canonical
[`shared.contact-preferences` golden](https://github.com/dills122/formly-contract/blob/main/fixtures/angular-monorepo/goldens/projects/id_Zml4dHVyZS1mb3Jtcy1raXQ/forms/id_c2hhcmVkLmNvbnRhY3QtcHJlZmVyZW5jZXM/sha256-322b444e514927b3dbccaf9271e581d8fe7222dfed2c804dcdd96de143e6e6ca.contract.golden.json):

```json title="shared.contact-preferences · contactPreference node"
{
  "id": "shared.contact-preferences::path:s_claimant.s_contactPreference",
  "kind": "control",
  "modelPath": ["claimant", "contactPreference"],
  "formlyType": "cool-radio-btn-grp",
  "semanticType": "single-choice",
  "presentation": { "label": "Preferred contact method" },
  "constraints": [{ "kind": "required" }],
  "options": [
    { "label": "Email", "value": "email" },
    { "label": "Phone", "value": "phone" }
  ],
  "valueDomain": {
    "kind": "enumerated",
    "values": ["email", "phone"],
    "completeness": "complete",
    "source": "adapter",
    "evidence": "declared"
  },
  "locators": [
    {
      "strategy": "domId",
      "value": "contact-preference",
      "target": "control",
      "confidence": "derived",
      "evidence": "declared"
    }
  ],
  "wrappers": ["fixture-expansion-panel"],
  "interactionProfile": {
    "profile": { "id": "fixture.cool-radio", "version": 1 },
    "interaction": {
      "kind": "choice",
      "operation": "check",
      "optionPart": "option"
    },
    "preconditions": [
      {
        "kind": "activate",
        "part": "wrapper-expand",
        "operation": "click",
        "evidence": "declared"
      }
    ],
    "driver": {
      "kind": "generic",
      "id": "generic.choice",
      "version": 1,
      "capabilities": ["check"]
    },
    "unknowns": []
  },
  "evidence": "declared"
}
```

### What each part connects

<dl class="contract-anatomy">
  <div>
    <dt><code>formId</code> + <code>modelPath</code></dt>
    <dd>Stable semantic identity: this is the contact preference in this form, independent of DOM layout.</dd>
  </div>
  <div>
    <dt><code>presentation</code> + <code>constraints</code></dt>
    <dd>The human label and required rule projected from Formly props.</dd>
  </div>
  <div>
    <dt><code>options</code> + <code>valueDomain</code></dt>
    <dd>The two legal values are known and the profile says the set is complete.</dd>
  </div>
  <div>
    <dt><code>locators</code></dt>
    <dd>The application supplied an ID. The contract records declared, derived locator evidence—not a selector invented later.</dd>
  </div>
  <div>
    <dt><code>interactionProfile</code></dt>
    <dd>The custom component behaves as a single choice: check one option with the reviewed generic choice driver contract.</dd>
  </div>
  <div>
    <dt><code>preconditions</code></dt>
    <dd>The expansion wrapper must be activated before its radio option is available.</dd>
  </div>
  <div>
    <dt><code>evidence</code> + <code>unknowns</code></dt>
    <dd>Every claim states where it came from. Missing knowledge remains explicit instead of being silently guessed.</dd>
  </div>
  <div>
    <dt><code>contentHash</code></dt>
    <dd>The whole contract has deterministic content identity, so stale references and changed artifacts can be detected.</dd>
  </div>
</dl>

The form-level `diagnostics` array for this example is empty. That does not
mean all forms are always fully understood. Unsupported callbacks, async
values, unmapped types, or incomplete effect analysis appear as stable
diagnostics and unknowns in other artifacts.

## 5. Use it without guessing

A consumer begins with stable semantic intent, not a selector:

```text
Set claimant.contactPreference to "email"
```

The contract supplies the chain of authority:

```text
shared.contact-preferences
  └─ modelPath: claimant.contactPreference
      ├─ legal value: email
      ├─ precondition: click wrapper-expand
      ├─ operation: check option
      ├─ trusted driver contract: generic.choice@1
      └─ declared locator candidate: #contact-preference
```

For this exact field, the current typed-intent validator stops there. Its
declared wrapper activation precondition cannot yet be expanded into a lossless
plan step, so validation returns `UNSUPPORTED_INTERACTION` instead of silently
dropping the required click. The example is inspectable contract evidence, but
it is intentionally **refused for execution** today.

<div class="evidence-pair" role="list" aria-label="Current example boundary">
  <div role="listitem">
    <strong>Actionable as context</strong>
    <span>Identity, legal values, locator evidence, interaction, and wrapper precondition are explicit.</span>
  </div>
  <div role="listitem">
    <strong>Refused for execution</strong>
    <span>The current plan grammar cannot preserve the wrapper activation step, so no plan is returned.</span>
  </div>
</div>

For fields inside the currently supported synthetic proof slice, the remaining
path is deliberately fail-closed:

<ol class="authority-chain">
  <li><strong>Query</strong><span>Resolve one usage or form against an exact artifact-set hash.</span></li>
  <li><strong>Validate</strong><span>Compile supported typed intent only when the field, value, state, and driver authority are actionable.</span></li>
  <li><strong>Plan</strong><span>Produce a canonical plan and content hash bound to that exact context.</span></li>
  <li><strong>Revalidate</strong><span>Reject stale, ambiguous, changed, or newly refused authority before execution.</span></li>
  <li><strong>Bind</strong><span>Resolve every approved step to the exact implementation in an authenticated, allowlist-bound local driver registry.</span></li>
</ol>

That is the important shift. An agent or test author does not inspect the page
and improvise `page.locator('.radio:nth-child(1)')`. It asks for a semantic
field, verifies the requested value is inside a complete domain, observes the
wrapper precondition, and refuses when exact evidence is absent.

Current package surfaces can query an assembled agent-context dataset,
validate the supported typed-intent subset, revalidate its canonical plan, and
bind approved steps to exact trusted driver calls. The private Playwright
package does **not** invoke those calls in a browser, and the CLI does not yet
assemble or expose the query dataset. Generated JSON is usable context today;
production MCP transport and browser execution remain future layers.

The standalone plan-hash helper also strict-parses before hashing. Proxy,
accessor, hidden, cyclic, and unknown-key input is rejected; a valid canonical
plan retains the same deterministic hash.

<div class="walkthrough-finish">
  <strong>The loop is deliberately boring.</strong>
  <span>Change the real form. Regenerate. Review the semantic diff. Run <code>check</code> in CI. Let consumers follow stable identities and explicit evidence.</span>
</div>

For field-by-field DTO details, continue to
<a href="../../reference/artifacts/">Artifacts and source linkage</a>. For
alternate repository layouts, compare the
<a href="../../reference/examples/">maintained examples</a>.
