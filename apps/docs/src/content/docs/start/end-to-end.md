---
title: End-to-end workspace vertical
description: Configure a workspace, expose a form and custom field, generate a contract, trace it from application code, and use it as Playwright context.
---

This vertical uses only current package surfaces through contract generation.
The final Playwright lookup is consumer-owned code because the planned
Playwright package and executable drivers are not shipped.

<div class="status-line">
  <span class="status status--current">Current</span>
  <span>Configure → discover → generate → validate → locate</span>
  <span class="status status--planned">Planned</span>
  <span>Generate typed intents and execute profile drivers</span>
</div>

## Resulting layout

```text
formly-contracts.config.ts
apps/claims/formly-contracts.project.ts
libs/claims/
├── formly-contracts.project.ts
└── src/
    ├── forms/claim.fields.ts
    ├── contracts.ts
    └── field-type-profiles.ts
dist/formly-contracts/
├── workspace-index.json
├── source-usage-catalog.json
└── projects/.../sha256-….contract.json
```

The stable join keys are `projectId`, `sourceId`, and `formId`. Generated file
names are content-addressed and must be discovered through
`workspace-index.json`, not reconstructed by consumers.

## 1. Configure the workspace root

Create `formly-contracts.config.ts` beside the consumer’s root `package.json`:

```ts title="formly-contracts.config.ts"
import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: [
    'apps/**/formly-contracts.project.ts',
    'libs/**/formly-contracts.project.ts',
  ],
  tsconfigPath: 'tsconfig.base.json',
  sourceUsage: {
    convention: 'direct-root-call-v1',
    tsconfigPath: 'apps/claims/tsconfig.app.json',
  },
  output: { directory: 'dist/formly-contracts' },
  locators: { testIdAttributes: ['data-testid', 'data-cy'] },
  diagnostics: { failOn: ['error'] },
});
```

Use `tsconfig.json` in an Angular CLI workspace or `tsconfig.base.json` in an
Nx workspace when that is the file that owns the aliases imported by your
Node-safe contracts entry points. Paths are workspace-relative. Project config
globs do not follow symlinks.

The MVP source pass accepts TypeScript project configs (`.ts`, `.mts`, or
`.cts`) only. JavaScript project configs remain supported for generation when
the pass is off; with `sourceUsage` enabled they fail as
`SOURCE_USAGE_PROJECT_CONFIG_UNSUPPORTED` so the runner never broadens the
leaf application program with `allowJs`.

## 2. Expose an application-owned form

Keep the existing Formly factory in application code. Add a small Node-safe
source descriptor that gives the form a stable ID:

```ts title="libs/claims/src/contracts.ts"
import {
  defineFormContractDefinition,
  defineFormContractSource,
} from '@formly-contract/workspace';
import { createClaimFields } from './forms/claim.fields.js';

export const CLAIM_FORM = defineFormContractDefinition({
  id: 'claims.create',
  create: () => ({ fields: createClaimFields() }),
  lineage: { rootSymbol: createClaimFields },
});

export const CLAIMS_SOURCE = defineFormContractSource({
  sourceId: 'claims/forms',
  list: () => [CLAIM_FORM],
});
```

Every `list()` call and `create()` call must return fresh data. Prefer the
factory's inherent safe defaults. Do not invent service, model, form-state, or
business values merely to make discovery run, and never load customer data,
credentials, or remote options during discovery.

This is explicit registration, not guessing arbitrary form exports.
`lineage.rootSymbol` anchors the definition to the real application factory.
The no-argument `create()` callback still runs during generation, so factories
with required runtime inputs need safe defaults or a deliberate Node-safe
adapter.

The optional source-usage pass only reads TypeScript syntax. It never executes
or serializes arguments passed by application code.

## 3. Describe one custom Formly field

Assume `createClaimFields()` includes an application type named
`cool-radio-btn-grp`. Define its supported radio behavior once and use that
same definition for production Formly registration and canonical metadata:

```ts title="libs/claims/src/field-type-profiles.ts"
import {
  buildFieldTypeProfileRegistry,
  defineContractedFormlyType,
  radioChoice,
} from '@formly-contract/schema/field-type-authoring';

export const COOL_RADIO_TYPE = defineContractedFormlyType({
  name: 'cool-radio-btn-grp',
  profile: { id: 'claims.cool-radio', version: 1 },
  behavior: radioChoice(),
});

export const CLAIM_FIELD_PROFILES = buildFieldTypeProfileRegistry({
  id: 'claims.fields',
  version: 1,
  types: [COOL_RADIO_TYPE],
});
```

```ts title="libs/claims/src/claims-formly.module.ts"
import { NgModule } from '@angular/core';
import { FormlyModule } from '@ngx-formly/core';
import { toFormlyTypeRegistration } from '@formly-contract/schema/field-type-authoring';
import { CoolRadioComponent } from './cool-radio.component.js';
import { COOL_RADIO_TYPE } from './field-type-profiles.js';

@NgModule({
  imports: [
    FormlyModule.forChild({
      types: [
        toFormlyTypeRegistration(COOL_RADIO_TYPE, CoolRadioComponent),
      ],
    }),
  ],
})
export class ClaimsFormlyModule {}
```

The compact API currently supports radio choices only. Other custom types use
the legacy reviewed registry or remain explicitly unmapped/unknown. Profiles
are metadata, not executable Playwright code.

## 4. Attach the source and profile to the project

```ts title="libs/claims/formly-contracts.project.ts"
import { defineFormContractProject } from '@formly-contract/workspace';
import { CLAIMS_SOURCE } from './src/contracts.js';
import { CLAIM_FIELD_PROFILES } from './src/field-type-profiles.js';

export default defineFormContractProject({
  projectId: 'claims/forms',
  sources: [CLAIMS_SOURCE],
  fieldTypeProfiles: CLAIM_FIELD_PROFILES,
});
```

The project config is the ownership boundary. Infrastructure or base Formly
libraries may declare a project with no sources. The application or feature
library containing the consuming component also needs a discovered project
config, even when it owns no form source:

```ts title="apps/claims/formly-contracts.project.ts"
import { defineFormContractProject } from '@formly-contract/workspace';

export default defineFormContractProject({
  projectId: 'claims/feature',
  sources: [],
});
```

The real component continues to call the ordinary factory with runtime data:

```ts title="apps/claims/src/app/claim-page.component.ts"
const fields = createClaimFields({ initialStep: this.route.snapshot.url });
```

The source index records the invocation shape and location, not the argument or
its value.

## 5. Discover before executing factories

```sh
pnpm exec formly-contracts list
```

`list` loads configuration and inventories projects and source IDs without
calling source lists or form factories. Use it to diagnose paths and aliases
before trusted application code executes.

Expected shape:

```text
Discovered 2 projects and 1 source.
Project: claims/feature config="apps/claims/formly-contracts.project.ts" sources=-
Project: claims/forms config="libs/claims/formly-contracts.project.ts" sources=claims/forms
```

## 6. Generate and verify the artifacts

```sh
pnpm exec formly-contracts generate
pnpm exec formly-contracts check
```

`generate` validates IDs, extracts every registered form, writes
content-addressed contracts, and publishes `workspace-index.json` last.
`check` repeats trusted extraction and exact-compares canonical bytes without
modifying the output directory.

`source-usage-catalog.json` has an explicit opt-in lifecycle. If `sourceUsage`
is later removed from the root config, `check` reports an existing catalog as
`stale` without modifying it. The next successful `generate` removes that
obsolete fixed-name catalog before publishing the new workspace index. This
prevents consumers from accidentally trusting linkage generated under a
disabled configuration.

Treat diagnostics as contract output. A warning such as
`UNMAPPED_FIELD_TYPE` means the field stays visible in the contract but does
not gain invented operational semantics.

## 7. Resolve application usage to the exact contract

When `sourceUsage` is enabled, generation also writes
`source-usage-catalog.json`. A consumer can start from a source file, require
one exact resolution, and join its form identity and hash to the workspace
index:

```ts title="e2e/support/load-form-contract.ts"
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  parseAgentContextSourceUsageCatalog,
  parseFormContract,
} from '@formly-contract/schema';
import { parseWorkspaceContractIndex } from '@formly-contract/workspace';

const workspaceRoot = resolve(import.meta.dirname, '../..');

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export async function loadFormContractForSource(sourcePath: string) {
  const output = resolve(workspaceRoot, 'dist/formly-contracts');
  const indexPath = resolve(output, 'workspace-index.json');
  const usagePath = resolve(output, 'source-usage-catalog.json');
  const index = parseWorkspaceContractIndex(
    JSON.parse(await readFile(indexPath, 'utf8')),
  );
  const catalog = parseAgentContextSourceUsageCatalog(
    JSON.parse(await readFile(usagePath, 'utf8')),
  );
  if (
    catalog.workspaceIndex.schemaVersion !== index.schemaVersion ||
    catalog.workspaceIndex.contentHash !== index.contentHash
  ) {
    throw new Error('Source-usage catalog targets a different workspace index.');
  }

  const matches = catalog.usages.filter(
    (usage) =>
      usage.invocation.location.kind === 'path' &&
      usage.invocation.location.path === sourcePath &&
      usage.resolution.status === 'exact',
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected one exact form usage for ${sourcePath}; found ${matches.length}.`,
    );
  }

  const usage = matches[0];
  if (!usage || usage.resolution.status !== 'exact') {
    throw new Error('Exact source usage disappeared.');
  }
  const sourceBytes = await readFile(resolve(workspaceRoot, sourcePath));
  if (sha256(sourceBytes) !== usage.invocation.sourceFileHash) {
    throw new Error('Application source changed after source-usage generation.');
  }

  const form = usage.resolution.candidate.form;
  const entry = index.forms.find(
    (candidate) =>
      candidate.projectId === form.projectId &&
      candidate.formId === form.formId &&
      candidate.contentHash === form.contractHash,
  );
  if (!entry) throw new Error('Resolved contract is absent from the index.');

  const artifactPath = resolve(workspaceRoot, entry.artifactPath);
  const contract = parseFormContract(
    JSON.parse(await readFile(artifactPath, 'utf8')),
  );
  if (
    contract.contentHash !== entry.contentHash ||
    contract.contentHash !== form.contractHash
  ) {
    throw new Error('Resolved contract hash does not match its pinned lineage.');
  }
  return contract;
}
```

This is a static convention, not runtime tracing. It supports direct calls and
constructor uses of the registered symbol (including aliases and re-export
barrels) and reports incomplete coverage. Recognized unsafe optional or computed
rooted calls may emit a diagnostic; wrappers and dynamic aliases or dispatch can
remain unindexed. All are fail-closed because they produce no exact actionable
link. Angular component context is lexical evidence only; the catalog does not
prove a route, rendered page, or executed invocation.

## 8. Use the contract as Playwright context

The following is consumer-owned helper code, not a shipped Formly Contract
Playwright API. It validates JSON, searches by semantic model path, and refuses
to continue when exact locator evidence is absent:

```ts title="e2e/claims-create.spec.ts"
import { expect, test } from '@playwright/test';
import type {
  ContractNode,
  ModelPathSegment,
} from '@formly-contract/schema';
import { loadFormContractForSource } from './support/load-form-contract.js';

function findNodeByPath(
  nodes: readonly ContractNode[],
  modelPath: readonly ModelPathSegment[],
): ContractNode | undefined {
  for (const node of nodes) {
    const matches =
      node.modelPath.length === modelPath.length &&
      node.modelPath.every((segment, index) => segment === modelPath[index]);
    if (matches) return node;

    const nested = findNodeByPath(
      node.arrayTemplate
        ? [...node.children, node.arrayTemplate]
        : node.children,
      modelPath,
    );
    if (nested) return nested;
  }
}

test('creates a claim using contract evidence', async ({ page }) => {
  const contract = await loadFormContractForSource(
    'apps/claims/src/app/claim-page.component.ts',
  );
  const claimantName = findNodeByPath(
    contract.nodes,
    ['claimant', 'name'],
  );
  const testId = claimantName?.locators.find(
    (locator) =>
      locator.strategy === 'testId' &&
      locator.attribute === 'data-testid',
  );

  if (!claimantName || !testId) {
    throw new Error(
      'claimant.name has no declared data-testid locator; refusing to guess.',
    );
  }

  await page.goto('/claims/new');
  await page.getByTestId(testId.value).fill('Ada Lovelace');
  await expect(page.getByTestId(testId.value)).toHaveValue('Ada Lovelace');
});
```

For composite fields, select a locator by its `target` rather than assuming one
node maps to one control. Empty locator arrays, diagnostics, and unknown profile
aspects are missing evidence—not invitations to fall back to CSS selectors.

## 9. Know where the current vertical ends

<div class="status-line">
  <span class="status status--planned">Planned layer</span>
  <span>Agent query → typed intent → validated driver → Playwright execution</span>
</div>

The pure `executeAgentContextQuery` API can search an assembled, validated
agent-context dataset by source path or form ID. The CLI does not yet assemble
that dataset or expose a query/MCP command, and executable Playwright drivers,
typed intent compilation, and browser parity remain planned. Today, an agent or
test author can use the generated JSON as trustworthy context and write a
strict consumer helper like the one above.

:::note[Maintained examples]
The [Nx fixture root config](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/formly-contracts.config.ts),
[project config](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/feature-lib/formly-contracts.project.ts),
[source descriptor](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/feature-lib/src/lib/claims.source.ts),
and [field profiles](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/src/lib/field-type-profiles.ts)
are executable, test-covered references for this vertical.
:::
