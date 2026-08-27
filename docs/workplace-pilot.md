# Workplace Pilot Guide

Use this guide to evaluate Formly Contract against a private Angular/Formly
repository without copying workplace source, labels, identifiers, options, or
model data into this public project.

The pilot is intentionally configuration-first. It proves that a consuming
repository can identify its form-owning project boundaries, expose trusted form
factories in bulk, describe custom Formly field types, and generate deterministic
contract artifacts. It does not yet generate Playwright tests or inspect a live
browser DOM.

## What this pilot can answer

The current `main` branch can show:

- which configured projects and form factories are discoverable;
- each form's ordered fields, model paths, constraints, static options, dynamic
  option-source metadata, locators, and diagnostics;
- which custom field types have reviewed interaction profiles;
- which custom fields remain visible but non-operable because a type, variant,
  wrapper, or value mapping is unknown;
- the possible values of static choice controls and safely projected custom
  controls;
- project, source, configuration, plugin, and field-profile provenance; and
- whether two identical runs produce the same canonical artifacts and hashes.

The pilot cannot yet prove:

- cross-field cause and effect such as “selecting product loads case types”;
- runtime-only option values or lifecycle behavior that the controlled scenario
  compiler did not resolve;
- the real DOM/ARIA output of an undeclared custom Angular component;
- executable application-specific Playwright driver behavior;
- automatic discovery of arbitrary form exports or routes; or
- the planned `formly-contracts list` and `check` commands.

Record those as findings rather than filling the gaps with guessed selectors or
interaction verbs.

## 1. Prepare the Formly Contract checkout

The strongest tested reference environment is:

- Node.js `22.22.1` (the package engine supports `>=22.13.0 <23`);
- pnpm `10.23.0`;
- Angular `20.3.29`; and
- Formly `6.1.8`.

Other Angular 20+ and Formly 6.x combinations may work, but record their exact
versions in the pilot report.

From a private parent directory beside the workplace repository:

```sh
git clone https://github.com/dills122/formly-contract.git
cd formly-contract
git checkout main
git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter @formly-contract/schema build
pnpm --filter @formly-contract/compiler build
pnpm --filter @formly-contract/workspace build
```

Run `pnpm check` when the machine can afford the complete repository gate. It
runs lint, unit tests, package builds, both Angular fixture builds, package and
release checks, the demo smoke test, and documentation validation.

For a fast known-good generation smoke from the Formly Contract root:

```sh
pnpm --dir fixtures/angular-monorepo exec formly-contracts generate \
  --workspace-root . \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot

pnpm --dir fixtures/nx-workspace exec formly-contracts generate \
  --workspace-root . \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot
```

The Angular fixture generates six contracts; the Nx fixture generates two.

## 2. Link the three pilot packages

Until the first npm release, add sibling links to the workplace repository's
`devDependencies`. Adjust the relative path to match the two checkouts:

```json
{
  "devDependencies": {
    "@formly-contract/schema": "link:../formly-contract/packages/schema",
    "@formly-contract/compiler": "link:../formly-contract/packages/compiler",
    "@formly-contract/workspace": "link:../formly-contract/packages/workspace"
  }
}
```

Install with the workplace repository's normal pnpm workflow, then verify the
linked binary:

```sh
pnpm install
pnpm exec formly-contracts --help
```

The current binary accepts only `generate`. A successful help check starts with
`Usage: formly-contracts generate [options]`.

## 3. Add one root configuration

Create `formly-contracts.config.ts` at the workplace root:

```ts
import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: [
    'apps/**/formly-contracts.project.ts',
    'libs/**/formly-contracts.project.ts',
    'packages/**/formly-contracts.project.ts',
  ],
  tsconfigPath: 'tsconfig.base.json',
  output: { directory: 'dist/formly-contracts-pilot' },
  diagnostics: { failOn: ['error'] },
});
```

Use the repository's real root TypeScript config. Angular CLI workspaces often
use `tsconfig.json`; Nx workspaces commonly use `tsconfig.base.json`. The config
loader resolves TypeScript aliases only when `tsconfigPath` is explicit.

Project patterns and output paths are relative to the workplace root. Keep the
output directory inside the repository and do not point it through a symlink.

## 4. Expose forms through project-owned sources

Add `formly-contracts.project.ts` only to meaningful project boundaries. A
base Formly library or application shell may declare a project without sources:

```ts
import { defineFormContractProject } from '@formly-contract/workspace';

export default defineFormContractProject({
  projectId: 'claims/formly-kit',
});
```

A form-owning library should expose a Node-oriented contracts entry point that
adapts existing factories or registries in bulk:

```ts
// libs/forms-kit/src/contracts.ts
import { defineFormContractSource } from '@formly-contract/workspace';
import { createClaimFields, createCustomerFields } from './forms.js';

export const FORMS_KIT_SOURCE = defineFormContractSource({
  sourceId: 'claims/forms-kit',
  list: () => [
    {
      id: 'claims.create',
      create: () => ({ fields: createClaimFields() }),
    },
    {
      id: 'customers.edit',
      create: () => ({ fields: createCustomerFields() }),
    },
  ],
});
```

Reference that source from the local project config:

```ts
// libs/forms-kit/formly-contracts.project.ts
import {
  defineFormContractProject,
} from '@formly-contract/workspace';
import { FORMS_KIT_SOURCE } from './src/contracts.js';

export default defineFormContractProject({
  projectId: 'claims/forms-kit',
  sources: [FORMS_KIT_SOURCE],
});
```

Every `list` call and form factory must return fresh data. Use synthetic inputs
for required context. Do not perform network requests or use production model
values, credentials, or customer data.

Keep trusted discovery exports separate from Angular browser barrels:

```text
@work/forms-kit            Angular modules and components
@work/forms-kit/forms      reusable form factories and fragments
@work/forms-kit/contracts  Node-oriented source descriptors
```

This separation prevents Jiti and other Node-only dependencies from entering
the browser bundle. The maintained
[Angular fixture](../fixtures/angular-monorepo/formly-contracts.config.ts) and
[Nx fixture](../fixtures/nx-workspace/formly-contracts.config.ts) demonstrate
the complete project layout.

## 5. Describe custom field types once per project

An unknown Formly type remains in the generated contract, but Formly Contract
will not guess its DOM role or operation. Add a reviewed field-type profile for
each custom widget you want an E2E author to operate.

The following profile states that `cool-radio-btn-grp` renders a radio group,
is operated by checking one radio, and exposes values through
`props.options`:

```ts
// libs/forms-kit/src/field-type-profiles.ts
import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';

export const WORKPLACE_FIELD_TYPE_PROFILES: FieldTypeProfileRegistry = {
  schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  id: 'claims.field-types',
  version: 1,
  profiles: [
    {
      identity: { id: 'claims.cool-radio', version: 1 },
      semanticType: 'single-choice',
      valueShape: 'scalar',
      evidence: 'declared',
      parts: [
        {
          name: 'group',
          role: 'radiogroup',
          cardinality: 'one',
          evidence: 'declared',
        },
        {
          name: 'option',
          role: 'radio',
          cardinality: 'many',
          evidence: 'declared',
        },
      ],
      interaction: {
        kind: 'choice',
        operation: 'check',
        optionPart: 'option',
      },
      valueDomain: {
        kind: 'projected',
        source: 'adapter',
        completeness: 'complete',
        collectionPath: 'props.options',
        labelPath: 'label',
        valuePath: 'value',
        disabledPath: 'disabled',
        evidence: 'declared',
      },
      driver: {
        kind: 'generic',
        id: 'generic.choice',
        version: 1,
        capabilities: ['check'],
      },
      unknowns: [],
    },
  ],
  registrations: [
    {
      formlyType: 'cool-radio-btn-grp',
      defaultProfile: { id: 'claims.cool-radio', version: 1 },
      variants: [],
    },
  ],
  wrappers: [],
};
```

Attach the same registry to every project that consumes those custom types:

```ts
export default defineFormContractProject({
  projectId: 'claims/forms-kit',
  sources: [FORMS_KIT_SOURCE],
  fieldTypeProfiles: WORKPLACE_FIELD_TYPE_PROFILES,
});
```

Start with one representative custom radio/select widget. Expand only after its
rendered roles, parts, operation, option mapping, wrappers, and unknowns have
been reviewed. The
[full Angular profile fixture](../fixtures/angular-monorepo/libs/forms-kit/src/lib/field-type-profiles.ts)
covers radios, overlays, autocomplete, row selection, repeaters, and composite
controls.

## 6. Generate and inspect artifacts

Run from the workplace repository root:

```sh
pnpm exec formly-contracts generate \
  --workspace-root . \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot
```

Success prints the number of contracts and the index path. The output contains:

```text
dist/formly-contracts-pilot/
  workspace-index.json
  projects/<encoded-project-id>/
    forms/<encoded-form-id>/
      sha256-<content-hash>.contract.json
```

Review `workspace-index.json` first. Confirm:

- every expected project, source, and form appears once;
- each form points to an existing content-addressed artifact;
- configuration and field-profile identities are present;
- diagnostics contain safe provenance without model or form-state values; and
- no secrets, customer data, production model values, or unexpected absolute
  workplace paths were serialized.

Labels, field IDs, declared option catalogs, and source-relative provenance may
legitimately appear in form artifacts. Treat the entire pilot output as private
workplace data even when the compiler's privacy boundary is behaving correctly.

Then inspect one representative artifact for each custom field family. Check
`formlyType`, `semanticType`, `options`, `valueDomain`, `interactionProfile`,
`locators`, `dynamicRules`, and `diagnostics`.

Run the command twice without changing inputs. The second run should retain the
same index bytes, artifact paths, and content hashes.

## 7. Troubleshoot common pilot failures

The pilot CLI reports stable workspace-generation codes and deliberately hides
underlying stack traces and callback details. The lower-level config loader APIs
use the more specific `CONFIG_*` classifications named below.

| Symptom or code | What to check |
| --- | --- |
| `formly-contracts: command not found` | Build `@formly-contract/workspace`, confirm `packages/workspace/dist/cli-main.js` exists, then reinstall the workplace links. |
| An existing checkout tries to load `@formly-agent-contracts/workspace` | A pre-rename pnpm bin shim is stale. From the Formly Contract root, run `pnpm install --force --frozen-lockfile` once, then rebuild the three packages. Fresh clones do not need this recovery step. |
| `WORKSPACE_DISCOVERY_FAILED` | Confirm `--workspace-root`, `--config`, filename casing, project globs, exclusions, duplicate project/source IDs, and project-config symlinks. The config path is relative to the supplied workspace root. |
| Underlying `CONFIG_NOT_FOUND` | Confirm the root/project config exists and its casing matches. |
| Underlying `CONFIG_LOAD_FAILED` | Check imported aliases, Node-safe entry points, and `tsconfigPath`. Avoid importing an Angular browser barrel from a project config. |
| Underlying `CONFIG_EXPORT_INVALID` or `CONFIG_INVALID` | Export one default object created by `defineConfig` or `defineFormContractProject`; remove unknown keys and non-JSON plugin options. |
| `FORM_FACTORY_FAILED` | Run the named factory with the same synthetic inputs in isolation. Remove network, service, or environment dependencies from the pilot source. |
| `UNMAPPED_FIELD_TYPE` | Add a reviewed field profile for that exact Formly type, or accept that it remains visible but non-operable. |
| `UNMAPPED_PROFILE_VARIANT` | Correct `formlyContract.profileVariant` or declare the named variant in the registry. |
| `UNMAPPED_WRAPPER_PROFILE` | Register the wrapper and its preconditions, or remove it from the pilot field. Unknown wrappers intentionally block interaction projection. |
| `DIAGNOSTIC_POLICY_FAILED` | Inspect the indexed diagnostic and adjust the form/profile. Relax `failOn` only when the warning is explicitly accepted for the pilot. |
| `OUTPUT_PATH_OUTSIDE_WORKSPACE` or `OUTPUT_SYMLINK_UNSUPPORTED` | Use a normal workspace-relative output directory without `..`, an absolute path, or a symlink. |

Generation failures exit with code `1`; command-usage failures exit with code
`2`. The CLI intentionally omits stack traces and underlying callback details.

## 8. Capture a useful, sanitized report

Keep the detailed report in the private workplace repository. Share only
sanitized conclusions with this public project.

```md
# Formly Contract workplace pilot

## Environment
- Formly Contract commit:
- Node / pnpm:
- Angular / Formly / Nx:
- Workspace shape:

## Configuration effort
- Root config location:
- Project configs added:
- Existing registries/factory maps reused:
- New adapters required:

## Generation result
- Command:
- Projects / sources / forms discovered:
- Expected forms missing or duplicated:
- Repeat run byte-identical: yes/no

## Custom-field coverage
- Formly type:
- Angular component or registration source:
- Rendered roles and interactive parts:
- Interaction operation:
- Static, dynamic, or scenario-resolved values:
- Wrappers or activation preconditions:
- Stable locator evidence:
- Remaining unknowns:

## Diagnostics and gaps
- Unexpected diagnostics:
- Cross-field effects the contract could not express:
- Runtime-only behavior:
- Information that would have helped Playwright authoring:

## Usability
- Setup friction:
- Documentation gaps:
- Recommended next change:
```

Do not paste private source, credentials, customer data, production model
values, internal URLs, or proprietary option catalogs into a public issue or
chat.

## Agent handoff prompt

The following prompt gives a fresh coding agent the intended boundary:

```text
Read README.md, docs/workplace-pilot.md, docs/workspace-configuration.md,
and the Angular or Nx fixture matching this repository before changing code.

Help me run a private Formly Contract pilot. Preserve workplace privacy: do not
copy private source, labels, IDs, option catalogs, credentials, URLs, or model
values outside this repository. Inspect the workspace structure and existing
form registries/factory maps, then propose the smallest root config, project
configs, and Node-safe contracts entry points. Start with one representative
form and one custom field profile. Do not infer DOM roles or interactions from
the Formly type name; record unknowns. Run `formly-contracts generate`, inspect
the workspace index and artifacts, rerun for determinism, and summarize setup
effort, diagnostics, missing forms, custom-field coverage, and remaining
Playwright-authoring gaps using the pilot report template.
```

## Pilot completion checklist

- [ ] The linked CLI prints help.
- [ ] One root config discovers the intended project configs.
- [ ] At least one bulk source generates more than one form.
- [ ] One representative custom field has a reviewed profile.
- [ ] Static values are enumerated and dynamic values remain explicitly dynamic.
- [ ] The workspace index and every referenced artifact validate by generation.
- [ ] Two unchanged runs produce identical paths and hashes.
- [ ] No private model/form-state data or executable callbacks appear in output.
- [ ] Remaining effects, runtime behavior, and DOM uncertainty are documented.
- [ ] The sanitized feedback report is ready for the next implementation pass.
