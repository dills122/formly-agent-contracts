# Workplace Pilot Guide

Use this guide to evaluate Formly Contract against a private Angular/Formly
repository without copying workplace source, labels, identifiers, options, or
model data into this public project.

The pilot is intentionally configuration-first. It proves that a consuming
repository can identify its form-owning project boundaries, expose trusted form
factories in bulk, link one supported Angular component call to the exact
generated contract, describe one custom radio through a compact reviewed
declaration, generate deterministic artifacts, resolve a hash-pinned context,
validate supported typed intent, and bind an approved canonical plan to exact
trusted driver calls. It does not generate Playwright tests, invoke those
calls, prove route reachability, or inspect a live browser DOM.

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
- project, source, configuration, plugin, and field-profile provenance;
- declared cross-field effects whose configured endpoints and capabilities can
  be resolved safely;
- a static, symbol-resolved link from one supported direct factory call to a
  stable form ID and exact generated contract hash;
- source-usage lookup by workspace-relative source path or stable form ID;
- whether an exact hash-pinned field is actionable or refused by current
  context authority;
- positive and negative typed-intent validation with canonical intent and plan
  content identities; and
- exact, all-or-nothing binding of an approved plan to an authenticated local
  driver implementation allowlist, without invoking the implementations;
- whether generated artifacts are current at byte level.

The pilot cannot yet prove:

- that a declared cross-field effect actually occurs in the live browser;
- runtime-only option values or lifecycle behavior that the controlled scenario
  compiler did not resolve;
- the real DOM/ARIA output of an undeclared custom Angular component;
- browser-conformant application driver behavior or invocation;
- automatic discovery of arbitrary form exports or routes;
- indirect, wrapped, callback, dynamic-dispatch, or multi-program form usages;
  or
- that a statically linked component is reachable, rendered, or part of a
  particular business journey.

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
pnpm --filter @formly-contract/playwright build
```

Run `pnpm check` when the machine can afford the complete repository gate. It
runs lint, unit tests, package builds, both Angular fixture builds, linked and
packed workspace-consumer smokes, package and release checks, the demo smoke
test, and documentation validation.

For fast known-good fixture verification from the Formly Contract root:

```sh
pnpm exec vitest run \
  fixtures/angular-monorepo/workspace-fixture.test.ts \
  fixtures/nx-workspace/workspace-fixture.test.ts
```

These retained tests inject explicit deterministic fixture provenance. The
fixture directories deliberately do not pretend to be independent dependency
workspaces with their own lockfiles. Run the CLI against the real workplace
workspace root, where its canonical `pnpm-lock.yaml` is present.

## 2. Link the four pilot packages

Until the first npm release, add sibling links to the workplace repository.
Adjust the relative path to match the two checkouts:

```json
{
  "dependencies": {
    "@formly-contract/schema": "link:../formly-contract/packages/schema"
  },
  "devDependencies": {
    "@formly-contract/compiler": "link:../formly-contract/packages/compiler",
    "@formly-contract/workspace": "link:../formly-contract/packages/workspace",
    "@formly-contract/playwright": "link:../formly-contract/packages/playwright"
  }
}
```

`schema` must be a regular dependency when the Angular application imports the
browser-safe field-type-authoring subpath. Compiler, workspace, and the private
Playwright binding experiment remain Node-side dev dependencies. The latter
does not depend on Playwright or invoke a browser despite its package name.

If a sibling checkout is not portable to the work machine, run
`pnpm pilot:pack` in Formly Contract and copy `artifacts/pilot/` for the
compiler/workspace portion of the pilot. Its `formly-contract-pilot.json`
records the schema, compiler, and workspace tarballs, SHA-256 digests, and
exact pnpm install arguments. The separate Playwright experiment is not part of
that compiler bundle.

Install with the workplace repository's normal pnpm workflow, then verify the
linked binary:

```sh
pnpm install
pnpm exec formly-contracts --help
```

The binary accepts `list`, `generate`, `check`, and the read-only
`author-factory-inputs` command. A successful help check starts with
`Usage: formly-contracts <command> [options]`.

When one project imports an Angular browser barrel that Node cannot load, use
an exact config-path selection to continue with a healthy project without
importing the broken sibling:

```sh
pnpm exec formly-contracts generate \
  --project-config libs/forms-kit/formly-contracts.project.ts
```

The selected index is written beneath a deterministic
`scopes/projects/<selection-hash>/` directory, leaving the complete workspace
index untouched. Run unfiltered `list` to see both healthy inventory and safe
per-config failure records.

Repository CI also packs the three built packages and runs the workspace CLI in
an isolated temporary consumer. That is a technical tarball boundary check,
not an npm release: `@formly-contract/workspace` remains private until the
release-readiness work adds package documentation and publication metadata.

## 3. Add one root configuration

Create `formly-contracts.config.ts` at the workplace root:

```ts
import { defineConfig } from "@formly-contract/workspace";

export default defineConfig({
  projectConfigs: [
    "apps/**/formly-contracts.project.ts",
    "libs/**/formly-contracts.project.ts",
    "packages/**/formly-contracts.project.ts",
  ],
  tsconfigPath: "tsconfig.base.json",
  sourceUsage: {
    convention: "direct-root-call-v1",
    tsconfigPath: "apps/claims/tsconfig.app.json",
  },
  output: { directory: "dist/formly-contracts-pilot" },
  diagnostics: { failOn: ["error"] },
});
```

Use the repository's real root TypeScript config. Angular CLI workspaces often
use `tsconfig.json`; Nx workspaces commonly use `tsconfig.base.json`. The config
loader resolves TypeScript aliases only when `tsconfigPath` is explicit. Exact
scoped mappings such as `@work/forms-kit` and wildcard mappings such as
`@work/*` are both supported. The loader evaluates each config relative to the
consuming workspace rather than the linked Formly Contract checkout.

`sourceUsage.tsconfigPath` is a separate opt-in boundary. Point it at one leaf
Angular application config containing the component/page calls to link. Keep
the root `tsconfigPath` explicit as well: the runner uses its resolution options
for a narrow authority Program rooted only at discovered project configs,
compares traversed authority imports and re-exports with the exact Jiti config
runtime, then uses the leaf config for the application Program. Exact linkage
requires both Programs and Jiti to resolve the same
project/source/definition/root chain. This avoids
adding tooling imports to the browser application while preventing divergent
path aliases from attaching a call to the wrong runtime contract. The path must
be a literal workspace-relative file, not a glob. Invalid, empty, missing, or
outside-workspace inputs fail closed with `SOURCE_USAGE_INDEX_FAILED`; omitting
the root resolver config is `CONFIG_INVALID` at `root.tsconfigPath`.
While this MVP source pass is enabled, all discovered project configs must use
`.ts`, `.mts`, or `.cts`. Existing `.mjs` and `.cjs` configs still work when
the pass is disabled; with it enabled they fail early as
`SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED` rather than broadening the leaf
application program with `allowJs`.

Project patterns and output paths are relative to the workplace root. Keep the
output directory inside the repository and do not point it through a symlink.

## 4. Expose forms through project-owned sources

Add `formly-contracts.project.ts` only to meaningful project boundaries. A
base Formly library or application shell may declare a project without sources:

```ts
import { defineFormContractProject } from "@formly-contract/workspace";

export default defineFormContractProject({
  projectId: "claims/formly-kit",
});
```

A form-owning library should define a stable contract beside each complete form
root. The definition gives it a durable ID and anchors lineage to the same
exported factory used by application code:

```ts
// libs/forms-kit/src/forms/claim.contract.ts
import { defineFormContractDefinition } from "@formly-contract/workspace";
import { createClaimForm } from "./claim.form.js";

export const CLAIM_FORM_CONTRACT = defineFormContractDefinition({
  id: "claims.create",
  create: createClaimForm, // This factory has a safe no-argument/default path.
  lineage: { rootSymbol: createClaimForm },
});
```

Do not register every fragment or step as a form. Shared fragments, field
groups, and wizard steps remain dependencies/lineage of the complete root
unless they are intentionally useful as independently generated contracts.

One Node-oriented source can expose many definitions from the domain:

```ts
// libs/forms-kit/src/contracts.ts
import { defineFormContractSource } from "@formly-contract/workspace";
import { CLAIM_FORM_CONTRACT } from "./forms/claim.contract.js";
import { CUSTOMER_FORM_CONTRACT } from "./forms/customer.contract.js";

export const FORMS_KIT_SOURCE = defineFormContractSource({
  sourceId: "claims/forms-kit",
  list: () => [CLAIM_FORM_CONTRACT, CUSTOMER_FORM_CONTRACT],
});
```

For the MVP source index, the helper-created definition—or a direct reference
to that helper-created `const`—must be a direct element of this
expression-bodied list. Its literal `sourceId` must match the runtime source
that lists the form. Wrapped, dynamic, spread, or unreturned descriptor flows
are not linked by name.

Reference that source from the local project config:

```ts
// libs/forms-kit/formly-contracts.project.ts
import { defineFormContractProject } from "@formly-contract/workspace";
import { FORMS_KIT_SOURCE } from "./src/contracts.js";

export default defineFormContractProject({
  projectId: "claims/forms-kit",
  sources: [FORMS_KIT_SOURCE],
});
```

This project config is part of the authority chain, not merely discovery
metadata. It must directly default-export canonical
`defineFormContractProject(...)` syntax and directly reference the canonical
source descriptor in `sources`. Its literal `projectId` must match discovery.
A different descriptor with the same `sourceId` does not authorize the form.
Unsupported or conflicting chains fail closed rather than choosing by name or
source order.

Source indexing assigns callsites only under discovered project-config roots.
If a feature/view library calls a factory owned by a separate forms library,
give the consuming library a config even when it owns no sources:

```ts
// libs/claims-feature/formly-contracts.project.ts
export default defineFormContractProject({
  projectId: "claims/feature",
});
```

Without that manual MVP ownership anchor, the call emits
`SOURCE_PROJECT_UNRESOLVED` and no exact usage. Application code still calls the
original factory normally; the indexer resolves its TypeScript symbol without
executing or serializing arguments such as `window.location.pathname`.

### Author a typed factory-input adapter from the real root

When the real factory requires an options object, the same explicit
`lineage.rootSymbol` can drive a local typed authoring draft. No second map of
factory paths or symbol names is needed:

```sh
pnpm exec formly-contracts author-factory-inputs \
  --workspace-root . \
  --config formly-contracts.config.ts \
  --form-id claims.create
```

This command reuses the configured source-usage TypeScript Programs and the
exact project/source/definition/root relationship. It statically reads the real
exported options type and supported direct uses in the factory, then prints:

- a workspace-relative suggested path beside the definition;
- a typed `satisfies Partial<Options>` draft;
- generated placeholders for supported captured callbacks, canonical inert
  Observables, and unavailable Angular view handles; and
- mutually exclusive generated, explicit, ambiguous, and unsupported property
  counts, plus overall coverage and an unattributed-ambiguity flag.

The summary is followed by stable review diagnostics with safe bounded
property, type-path, ambiguity-reason, and storage-path context. Unsafe paths
are redacted or refused rather than copied from source.

Unsupported final materialization has count precedence over keyed ambiguity,
so a type hazard remains visible even when its flow is also ambiguous. Direct
`eval()` is an unattributed reflective refusal and blocks generated helpers; it
is never inspected or executed.
Any type-analysis truncation likewise blocks every generated helper for that
factory input; the tool does not automate from a partial property view.

The output is a review aid, not a runtime harness. The command does not invoke
the source `list()`, the real factory, callbacks, streams, or Angular views and
does not create the suggested file. Copy it only after review. Business data,
service objects, and construction-time values remain explicit; ambiguous or
unsafe inputs stay unresolved. This keeps the Node-safe definition adapter
truthful while removing much of the hand-written callback/Observable/view
boilerplate.

The current bounded grammar requires one identifier options parameter and a
named exported options type. Direct reads, reviewed Formly callback storage,
canonical Observable escapes, and recognized view handles are supported.
Destructuring, aliases, getters, computed access, unknown higher-order flows,
`any`, and overlapping application Programs fail closed. A missing or duplicate
stable form ID is a diagnostic, not a best-effort match.

Generation still executes each definition's `create` with no arguments. When
`lineage` is omitted, implicit root inference accepts that `create` symbol only
when TypeScript proves a zero-argument-compatible signature. With explicit
`lineage.rootSymbol`, the real factory may require arguments while a truthful
Node-safe `create` adapter supplies declared generation. The helper/adapter call
is excluded from application usage. Do not invent services, streams, templates,
callbacks, or business data to make generation pass. Never perform network
requests or use production model values, credentials, or customer data.

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

Jiti evaluates imported modules; it does not tree-shake a browser barrel before
running it. If a barrel re-exports partially compiled Angular modules or
dependencies such as NgRx or Apollo Angular, plain Node may request the Angular
JIT compiler before the form factories are reached. The durable fix is a
secondary entry point that exports only Node-safe source descriptors, form
factories, types, constants, and pure utilities.

When a secondary entry point cannot be published during the pilot, use a
tool-only shim and a dedicated TypeScript config. The shim must import safe
implementation files directly rather than re-exporting the Angular barrel:

```ts
// tools/formly-contract/forms-kit-shim.ts
export { createClaimFields } from "../../libs/forms-kit/src/forms/claim.js";
export type { ClaimFormModel } from "../../libs/forms-kit/src/models/claim.js";
```

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@work/forms-kit": ["tools/formly-contract/forms-kit-shim.ts"]
    }
  }
}
```

Point `tsconfigPath` at that tool-only config and keep it out of application
builds. Preserve every other alias the pilot imports because `paths` overrides
from an extended config are not merged entry by entry.

### Dynamic options require named synthetic scenarios

Declared extraction intentionally reports a function- or async-backed option
source as dynamic and leaves `options` empty. Do not guess a visible label or
model value from another field, a semantic type, or a test recording.

For a meaningful branch, run `compileFormContractScenario` in an
application-controlled Angular build with a synthetic model that selects the
upstream value. For example, retain one base artifact for structure and compile
one synthetic product-selected scenario for each option branch an E2E author
must use. Resolved values are scenario-complete, not globally complete. The
[scenario compiler example](../apps/docs/src/content/docs/reference/api.md#controlled-scenario-compilation) shows
the API and trust boundary.

The pilot workspace CLI currently generates declared artifacts only;
`author-factory-inputs` emits a separate local draft and does not execute named
Angular scenarios. Record required scenario artifacts as a follow-up rather
than adding private runtime values to a declared source.

## 5. Contract one custom radio type once

Unknown Formly types remain visible, but Formly Contract will not guess their
DOM role or operation. For the MVP radio path, define one compact reviewed type
beside the custom component using the browser-safe authoring subpath:

```ts
// libs/forms-kit/src/lib/field-type-profiles.ts (data only)
import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
} from "@formly-contract/schema/field-type-authoring";

export const COOL_RADIO_TYPE = defineContractedFormlyType({
  name: "cool-radio-btn-grp",
  profile: { id: "claims.cool-radio", version: 1 },
  behavior: radioChoice({ disabledPath: "disabled" }),
});

export const WORKPLACE_FIELD_TYPE_PROFILES = buildFieldTypeProfileRegistry({
  id: "claims.field-types",
  version: 1,
  types: [COOL_RADIO_TYPE],
});
```

The real Angular module imports that data-only descriptor and binds the
component without exposing it through the Node-oriented contracts entry point:

```ts
import { toFormlyTypeRegistration } from "@formly-contract/schema/field-type-authoring";

FormlyModule.forChild({
  types: [toFormlyTypeRegistration(COOL_RADIO_TYPE, CoolRadioComponent)],
});
```

Attach the generated registry to each current project consuming the type:

```ts
export default defineFormContractProject({
  projectId: "claims/forms-kit",
  sources: [FORMS_KIT_SOURCE],
  fieldTypeProfiles: WORKPLACE_FIELD_TYPE_PROFILES,
});
```

The generated profile declares `radiogroup`/`radio` parts, `check`, a generic
choice driver, and possible values projected from reviewed property paths.
Static options are exact; function-, expression-, or async-backed options stay
dynamic unless a trusted scenario resolves them. The helper never inspects a
template or infers behavior from the type name. `radioChoice()` is the only
compact MVP preset; other widgets still need the verbose legacy registry or
remain non-actionable. Repeated project attachment is transitional until named
global Formly environments exist.

## 6. Generate and inspect artifacts

Run from the workplace repository root:

```sh
pnpm exec formly-contracts list \
  --workspace-root . \
  --config formly-contracts.config.ts

pnpm exec formly-contracts generate \
  --workspace-root . \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot

pnpm exec formly-contracts check \
  --workspace-root . \
  --config formly-contracts.config.ts \
  --output dist/formly-contracts-pilot
```

Success prints the contract count, index path, and, when opted in,
`Source usage: dist/formly-contracts-pilot/source-usage-catalog.json` followed
by any fail-closed source diagnostics. The output contains:

```text
dist/formly-contracts-pilot/
  workspace-index.json
  source-usage-catalog.json
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

Inspect `source-usage-catalog.json` next. A happy-path component call has a
workspace-relative path/span, direct call symbol, optional component context,
and `resolution.status: 'exact'` with the expected project, form ID, and exact
contract hash. It must not contain source text, arguments, absolute paths, or
browser-only expressions. Coverage remains incomplete with
`bounded-programs-mvp`: this is `static-convention` evidence, not proof of route
reachability or rendering.

`invocation.sourceFileHash` hashes the byte snapshot accepted only after it
decodes exactly to the TypeScript `SourceFile.text` analyzed by the program.
That validation covers every workspace-contained project config, source
descriptor, definition, root declaration, callsite, and traversed authority
alias. A concurrent edit to an authority file suppresses every exact usage that
depends on it, not only usages located in that file. For a nested workspace,
the exact canonical `@formly-contract/workspace` package-export chain may be
external solely to establish helper identity; an unrelated external alias fails
closed.

Run `generate` and `check` against a quiescent workspace and pause formatters or
generators that rewrite these files. The runner loads trusted configuration,
then creates the authority and application TypeScript Programs before it
invokes any source list or form factory. This MVP does not capture a complete
snapshot of all runtime/Jiti
modules, so a short config-loading-to-Program boundary remains.

The CLI does not yet expose a query command or MCP server. A caller can assemble
a hash-pinned agent-context dataset and use `executeAgentContextQuery` with
`operation: 'search-form-usages'`, filtering by either:

```ts
{
  sourcePath: "libs/feature/src/lib/claim-page.component.ts";
}
{
  formId: "claims.create";
}
```

The retained
[Nx acceptance test](../fixtures/nx-workspace/workspace-fixture.test.ts)
contains the complete artifact-set/scope assembly and proves both filters
return the same exact candidate hash.

Treat `domId` entries as lower-confidence hints. Formly field types may render
the configured ID on a wrapper rather than the interactive control. IDs inside
`fieldArray` templates are omitted and reported as `UNRELIABLE_DOM_ID` because
runtime rows may omit them or rewrite them with indices. Prefer exact test IDs,
roles, and accessible names when they are declared.

Formly Contract cannot manufacture application-level test IDs. Legacy template
buttons, section containers, and controls without `props.attributes` remain
outside declared field metadata. Add stable attributes in the consumer when
possible; for Formly controls, declare them under
`props.attributes['data-testid']` so the contract can emit an exact locator.

After generation, `check` recomputes the same trusted source/factory output and
source catalog, then exact-compares canonical bytes without rewriting them. Run
it again after any form/config/profile/effect change; missing output and a stale
index can be refreshed by an intentional `generate` run. A stale
content-addressed contract is an integrity failure and generation will not
overwrite it: inspect the mismatch, remove the corrupt artifact only after
confirming it is safe to do so, then regenerate.

## 7. Exercise the current query, validation, and binding boundary

The CLI stops at generated artifacts and source linkage. The next boundary is
a library-level pilot: assemble and strictly parse the agent-context artifact
set, source-usage catalog, contracts, execution authority, driver manifest, and
live-owner hashes before calling the pure query and validation APIs. Do not
invent missing journey, driver, state, or runtime-value authority merely to
make the exercise pass.

Use `executeAgentContextQuery` twice—once by the workspace-relative component
path and once by stable `formId`. Both searches must resolve the same exact
usage, form, project, and contract hash. Open the resulting E2E slice only when
the candidate is exact and current; a stale owner, ambiguous usage, refused
field, incomplete slice, or mismatched artifact-set hash is a negative result,
not a prompt to broaden the query.

Run at least two typed intents against that pinned context:

1. a positive intent that targets an actionable field, legal value, supported
   operation, exact state, and manifest-authorized driver capability; and
2. a negative intent that deliberately crosses one known boundary, such as a
   refused field, value outside a complete domain, stale context hash, missing
   driver capability, or unsupported wrapper precondition.

`validateAgentContextTestIntent` must return a canonical plan only for the
positive case and stable blocking diagnostics with no plan for the negative
case. Retain the exact source intent beside the plan. Its intent and plan hashes
are deterministic content identities—not signatures or authorization tokens.
`computeAgentContextValidatedPlanHash` strict-parses before hashing and rejects
proxy, accessor, hidden, cyclic, and unknown-key values.

Finally, create the local implementation registry, bind it to the exact driver
manifest with `bindAgentContextDriverImplementationRegistry`, and pass that
authentic binding plus the complete revalidation input to
`bindAgentContextValidatedPlanDriverCalls`. Record:

- the exact usage, project, form, artifact-set hash, and contract hash;
- the actionable field and any refused comparison field;
- the positive plan hash and negative diagnostic codes;
- each bound plan-step ID, driver ID/version, required capability, physical
  target, and argument shape; and
- confirmation that the implementation invocation count remained zero.

Binding is all-or-nothing. A stale plan, changed current authority, incompatible
allowlist, unauthentic binding object, or unresolved implementation returns no
partial call set. The package deliberately returns data-only call descriptions
paired with opaque callable identities and does not invoke them. Browser
execution, application-driver conformance, remaining repeaters/transitions,
and automatic dataset assembly are still implementation gaps.

The retained schema walkthrough and Playwright binding tests are the canonical
public-data rehearsal for this step:

```sh
pnpm exec vitest run \
  packages/schema/src/agent-context-walkthrough-fixtures.test.ts \
  packages/schema/src/agent-context-test-intent.test.ts \
  packages/playwright/src/validated-plan-driver-call-binding.test.ts
```

Keep the corresponding workplace harness and detailed output private. Share
only the sanitized identities, counts, result classes, diagnostic codes, and
implementation gaps described below.

## 8. Troubleshoot common pilot failures

The pilot CLI reports stable workspace-generation codes and deliberately hides
underlying stack traces and callback details. The lower-level config loader APIs
use the more specific `CONFIG_*` classifications named below.

| Symptom or code                                                        | What to check                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `formly-contracts: command not found`                                  | Build `@formly-contract/workspace`, confirm `packages/workspace/dist/cli-main.js` exists, then reinstall the workplace links.                                                                                                                                                                                                                          |
| An existing checkout tries to load `@formly-agent-contracts/workspace` | A pre-rename pnpm bin shim is stale. From the Formly Contract root, run `pnpm install --force --frozen-lockfile` once, then rebuild the three packages. Fresh clones do not need this recovery step.                                                                                                                                                   |
| `WORKSPACE_DISCOVERY_FAILED`                                           | Confirm `--workspace-root`, `--config`, filename casing, project globs, exclusions, duplicate project/source IDs, and project-config symlinks. The config path is relative to the supplied workspace root.                                                                                                                                             |
| Underlying `CONFIG_NOT_FOUND`                                          | Confirm the root/project config exists and its casing matches.                                                                                                                                                                                                                                                                                         |
| Underlying `CONFIG_LOAD_FAILED`                                        | Check imported aliases, Node-safe entry points, and `tsconfigPath`. The CLI prints the same safe guidance without exposing private import details. If an Angular browser barrel triggers JIT compilation, use a secondary contracts entry point or the tool-only shim pattern above.                                                                   |
| `SOURCE_USAGE_INDEX_FAILED`                                            | Check the literal leaf `sourceUsage.tsconfigPath`, its include/files set, and discovered project configs. Configured paths and workspace-owned program roots and sources, including declaration files, must resolve inside the workspace. TypeScript-classified external-library declarations remain allowed.                                          |
| `SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED`                              | Rename or add a TypeScript (`.ts`, `.mts`, or `.cts`) project-config entry point for this source-usage pilot.                                                                                                                                                                                                                                          |
| `SOURCE_RUNTIME_RESOLUTION_MISMATCH`                                   | Align the root TypeScript resolver options with the Jiti-supported runtime path for the registered authority import or re-export. Exact linkage is withheld when the two select different files.                                                                                                                                                       |
| `SOURCE_DESCRIPTOR_UNSUPPORTED`                                        | Make the discovered project config a direct canonical `defineFormContractProject(...)` default export; put only direct canonical source references in `sources`; and keep the canonical source's list dense, expression-bodied, and direct. Verify literal project/source IDs match runtime discovery. Same-ID descriptors are not fallback authority. |
| `SOURCE_DESCRIPTOR_CONFLICT`                                           | More than one canonical registration claims the same project/source authority. Remove the duplicate or make ownership explicit; the indexer will not select by file or source order.                                                                                                                                                                   |
| `SOURCE_PROJECT_UNRESOLVED`                                            | Add a source-empty `formly-contracts.project.ts` to the consuming feature/view library so the callsite has a stable owner.                                                                                                                                                                                                                             |
| `FORM_DEFINITION_MISSING`                                              | Add a colocated `defineFormContractDefinition` with explicit `lineage.rootSymbol`, then return that exact helper-created definition directly from the matching canonical source's expression-bodied list. The indexer will not infer provenance by name.                                                                                               |
| `SOURCE_FILE_SNAPSHOT_MISMATCH`                                        | Final file bytes no longer match the TypeScript snapshot used for authority or usage analysis. Every exact usage depending on that file is suppressed. Stop concurrent writes or fix the host reader, then rerun from a quiescent workspace.                                                                                                           |
| Other `Source usage diagnostic [...]` output                           | Treat recognized unsupported or unresolved usages as non-actionable. Ambiguity is represented as a non-actionable catalog resolution. These diagnostics are separate from Form Contract `diagnostics.failOn`. Because coverage is incomplete, unsupported out-of-grammar calls are not guaranteed to emit a per-call diagnostic.                       |
| `UNRELIABLE_DOM_ID`                                                    | A field inside `fieldArray` declares an ID that may be omitted or rewritten for runtime rows. Add an exact test ID or accessible locator convention instead of treating the configured ID as a selector.                                                                                                                                               |
| Underlying `CONFIG_EXPORT_INVALID` or `CONFIG_INVALID`                 | Export one default object created by `defineConfig` or `defineFormContractProject`; remove unknown keys and non-JSON plugin options.                                                                                                                                                                                                                   |
| `FORM_FACTORY_FAILED`                                                  | Run the definition factory with its safe defaults or deliberate Node-safe adapter in isolation. Remove network, service, or environment dependencies.                                                                                                                                                                                                  |
| `UNMAPPED_FIELD_TYPE`                                                  | Add a reviewed field profile for that exact Formly type, or accept that it remains visible but non-operable.                                                                                                                                                                                                                                           |
| `UNMAPPED_PROFILE_VARIANT`                                             | Correct `formlyContract.profileVariant` or declare the named variant in the registry.                                                                                                                                                                                                                                                                  |
| `UNMAPPED_WRAPPER_PROFILE`                                             | Register the wrapper and its preconditions, or remove it from the pilot field. Unknown wrappers intentionally block interaction projection.                                                                                                                                                                                                            |
| `DIAGNOSTIC_POLICY_FAILED`                                             | Inspect the indexed diagnostic and adjust the form/profile. Relax `failOn` only when the warning is explicitly accepted for the pilot.                                                                                                                                                                                                                 |
| `OUTPUT_PATH_OUTSIDE_WORKSPACE` or `OUTPUT_SYMLINK_UNSUPPORTED`        | Use a normal workspace-relative output directory without `..`, an absolute path, or a symlink.                                                                                                                                                                                                                                                         |

Discovery, generation, stale-check, and check failures exit with code `1`;
command-usage failures exit with code `2`. The CLI intentionally omits stack
traces and underlying callback details.

## 9. Capture a useful, sanitized report

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

## Source linkage

- Leaf Angular tsconfig:
- Consuming project ownership config:
- Component call path and root symbol:
- Stable form ID and exact contract hash:
- Query by source path / form ID:
- Fail-closed source diagnostics:

## Agent-context query

- Artifact-set and workspace-index hash:
- Exact usage / project / form / contract hash:
- Source-path and form-ID queries agree: yes/no
- Actionable field and authority basis:
- Refused field and refusal reason:

## Typed intent and plan

- Positive intent operation and result:
- Canonical intent hash / plan hash:
- Negative intent boundary and diagnostic codes:
- Revalidation result against current authority:

## Trusted driver-call binding

- Manifest and implementation allowlist identity:
- Bound step / driver / capability / physical target summary:
- Partial calls on refusal: none/issue
- Implementation invocation count: 0/issue

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
- Cross-field effects the contract could not configure or resolve:
- Runtime-only behavior:
- Remaining dataset-assembly, semantic-plan, driver, or browser-execution gap:
- Information that would have helped deterministic Playwright execution:

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
form and one custom field profile. Use the compact radio helper only when it
matches reviewed behavior; record other types as unknown. Add one colocated form
definition with an explicit root symbol, one direct component call under a
discovered project root, and the leaf Angular source-usage tsconfig. Generate,
inspect the index/catalog/contracts, query by source path and form ID, rerun for
determinism, and assemble one hash-pinned E2E context without inventing missing
authority. Validate one supported positive intent and one deliberate negative
intent, revalidate the positive canonical plan, then bind it through an
authenticated local driver implementation registry. Record exact
usage/form/hash resolution, actionable and refused fields, validation outcomes,
bound call identities/capabilities/physical targets, and proof that no
implementation was invoked. Report remaining dataset, semantic-plan, driver,
and browser-execution gaps.
```

## Pilot completion checklist

- [ ] The linked CLI prints help.
- [ ] One root config discovers the intended project configs.
- [ ] At least one bulk source generates more than one form.
- [ ] One complete form has a colocated definition and explicit root symbol.
- [ ] One direct component call resolves to the exact form ID and contract hash.
- [ ] Every indexed consuming library has a discovered project ownership root.
- [ ] The source catalog contains no source text, arguments, or absolute paths.
- [ ] Source-path and form-ID queries return the same exact candidate.
- [ ] The query is pinned to the exact artifact-set, workspace-index, usage,
      form, and contract hashes.
- [ ] One supported field is actionable and one known boundary remains
      explicitly refused.
- [ ] A positive typed intent produces a canonical plan; a negative intent
      produces stable blocking diagnostics and no plan.
- [ ] Revalidation accepts the unchanged current authority and refuses a stale
      or mutated comparison.
- [ ] Every approved plan step binds to the exact allowlisted driver identity,
      capability, physical target, and argument shape.
- [ ] Binding refusal returns no partial calls, and implementation invocation
      count remains zero.
- [ ] One custom radio drives both real registration and generated profile data.
- [ ] Static values are enumerated and dynamic values remain explicitly dynamic.
- [ ] The workspace index and every referenced artifact validate by generation.
- [ ] Two unchanged runs produce identical paths and hashes.
- [ ] No private model/form-state data or executable callbacks appear in output.
- [ ] Remaining effects, runtime behavior, and DOM uncertainty are documented.
- [ ] Remaining dataset assembly, semantic operations, application drivers,
      and browser invocation gaps are documented.
- [ ] The sanitized feedback report is ready for the next implementation pass.
