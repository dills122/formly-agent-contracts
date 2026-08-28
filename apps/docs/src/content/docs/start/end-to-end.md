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
libs/claims/
├── formly-contracts.project.ts
└── src/
    ├── forms/claim.fields.ts
    ├── contracts.ts
    └── field-type-profiles.ts
dist/formly-contracts/
├── workspace-index.json
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
  output: { directory: 'dist/formly-contracts' },
  locators: { testIdAttributes: ['data-testid', 'data-cy'] },
  diagnostics: { failOn: ['error'] },
});
```

Use `tsconfig.json` in an Angular CLI workspace or `tsconfig.base.json` in an
Nx workspace when that is the file that owns the aliases imported by your
Node-safe contracts entry points. Paths are workspace-relative. Project config
globs do not follow symlinks.

## 2. Expose an application-owned form

Keep the existing Formly factory in application code. Add a small Node-safe
source descriptor that gives the form a stable ID:

```ts title="libs/claims/src/contracts.ts"
import { defineFormContractSource } from '@formly-contract/workspace';
import { createClaimFields } from './forms/claim.fields.js';

export const CLAIMS_SOURCE = defineFormContractSource({
  sourceId: 'claims/forms',
  list: () => [
    {
      id: 'claims.create',
      create: () => ({
        fields: createClaimFields(),
        model: {},
        formState: { mode: 'create' },
      }),
    },
  ],
});
```

Every `list()` call and `create()` call must return fresh data. Use synthetic
model and form-state values; never load customer data, credentials, or remote
options during discovery.

This is explicit registration, not source-code guessing. Automatic discovery
of arbitrary form exports is planned rather than implemented.

## 3. Describe one custom Formly field

Assume `createClaimFields()` includes an application type named
`cool-radio-btn-grp`. A serializable field profile tells the compiler what the
widget means and which generic interaction it supports:

```ts title="libs/claims/src/field-type-profiles.ts"
import type { FormContractProjectConfig } from '@formly-contract/workspace';

export const CLAIM_FIELD_PROFILES: NonNullable<
  FormContractProjectConfig['fieldTypeProfiles']
> = {
  schemaVersion: '0.4.0',
  id: 'claims.fields',
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
        evidence: 'declared',
      },
      driver: {
        kind: 'generic',
        id: 'generic.choice',
        version: 1,
        capabilities: ['check'],
      },
      effectCapabilities: {
        targetProperties: ['options'],
        readiness: [],
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

Profiles are reviewed data, not executable Playwright code. If the component’s
model codec, locator scope, or interaction sequence is unknown, record that in
`unknowns` instead of claiming generic-driver compatibility.

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
libraries may declare a project with no sources.

## 5. Discover before executing factories

```sh
pnpm exec formly-contracts list
```

`list` loads configuration and inventories projects and source IDs without
calling source lists or form factories. Use it to diagnose paths and aliases
before trusted application code executes.

Expected shape:

```text
Discovered 1 project and 1 source.
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

Treat diagnostics as contract output. A warning such as
`UNMAPPED_FIELD_TYPE` means the field stays visible in the contract but does
not gain invented operational semantics.

## 7. Find the contract from application code

Application code knows the stable project and form IDs because it declared them
in the project config and `contracts.ts`. Use those IDs to resolve the current
content-addressed artifact through the index:

```ts title="e2e/support/load-form-contract.ts"
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseFormContract } from '@formly-contract/schema';
import { parseWorkspaceContractIndex } from '@formly-contract/workspace';

const workspaceRoot = resolve(import.meta.dirname, '../..');

export async function loadFormContract(projectId: string, formId: string) {
  const indexPath = resolve(
    workspaceRoot,
    'dist/formly-contracts/workspace-index.json',
  );
  const index = parseWorkspaceContractIndex(
    JSON.parse(await readFile(indexPath, 'utf8')),
  );

  const matches = index.forms.filter(
    (entry) => entry.projectId === projectId && entry.formId === formId,
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected one workspace contract for ${projectId}/${formId}; ` +
        `found ${matches.length}.`,
    );
  }

  const [entry] = matches;
  if (!entry) {
    throw new Error(
      `Workspace index entry disappeared for ${projectId}/${formId}.`,
    );
  }

  const artifactPath = resolve(workspaceRoot, entry.artifactPath);
  return parseFormContract(
    JSON.parse(await readFile(artifactPath, 'utf8')),
  );
}
```

The current index links the artifact to `projectId`, `sourceId`, `formId`, and
the owning project config. It does **not** yet record a TypeScript symbol and
line number for the factory. Symbol-level source indexing is planned. Keep the
stable form ID beside the application-owned factory so the identity join stays
reviewable today.

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
import { loadFormContract } from './support/load-form-contract.js';

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
  const contract = await loadFormContract('claims/forms', 'claims.create');
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

The repository contains research for a read-only MCP query surface, typed E2E
intent, deterministic drivers, and browser parity. Those layers are not
available to import. Today, an agent or test author can use the validated JSON
as trustworthy context and write a strict consumer helper like the one above.

:::note[Maintained examples]
The [Nx fixture root config](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/formly-contracts.config.ts),
[project config](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/formly-contracts.project.ts),
[source descriptor](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/src/lib/shared.source.ts),
and [field profiles](https://github.com/dills122/formly-contract/blob/main/fixtures/nx-workspace/libs/forms-kit/src/lib/field-type-profiles.ts)
are executable, test-covered references for this vertical.
:::
