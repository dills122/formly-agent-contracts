import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative, resolve, sep } from 'node:path';

import {
  loadWorkspaceConfigModule,
  parseProjectConfig,
  parseRootConfig,
  resolveWorkspaceProjectConfig,
  runWorkspace,
  type FormContractProjectConfig,
} from '@formly-contract/workspace';
import {
  extractFormContract,
  type ExtractFormResult,
  type FieldTypeProfileExtractionRegistry,
} from '@formly-contract/compiler';
import { describe, expect, it } from 'vitest';
import type { RuntimeProvenance } from '@formly-contract/schema';

const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));
const fixtureTsconfig = resolve(fixtureRoot, 'tsconfig.json');
const goldenRoot = resolve(fixtureRoot, 'goldens');
const generatedOutputPrefix = 'dist/formly-contracts/';
const goldenRuntimeProvenance: RuntimeProvenance = {
  schemaVersion: '1.0.0',
  worker: {
    id: '@formly-contract/workspace/in-process',
    version: '0.1.0',
    protocolVersion: '1',
  },
  adapter: {
    id: '@formly-contract/compiler/declared',
    version: '0.4.0',
    mode: 'declared',
  },
  tools: [
    { name: '@formly-contract/compiler', version: '0.4.0' },
    { name: '@formly-contract/schema', version: '0.4.0' },
    { name: '@formly-contract/workspace', version: '0.1.0' },
  ],
  loader: {
    id: 'jiti',
    version: '2.7.0',
    options: {
      fsCache: false,
      interopDefault: false,
      moduleCache: false,
      tsconfigPaths: {
        rootConfig: 'disabled',
        projectConfigs: 'configured',
      },
      nativeModules: [],
    },
  },
  node: { version: '22.22.1', platform: 'linux', architecture: 'x64' },
  executionProfile: {
    id: 'trusted-local-v1',
    version: '1',
    network: 'not-enforced',
  },
  dependencySnapshot: {
    kind: 'pnpm-lock',
    workspaceRelativePath: 'pnpm-lock.yaml',
    sha256: `sha256:${'a'.repeat(64)}`,
  },
  runtimePackages: [],
};

function goldenRelativePath(generatedPath: string): string {
  if (!generatedPath.startsWith(generatedOutputPrefix)) {
    throw new Error(`Unexpected generated fixture path: ${generatedPath}`);
  }
  return generatedPath
    .slice(generatedOutputPrefix.length)
    .replace(/\.json$/u, '.golden.json');
}

async function listRelativeFiles(
  directory: string,
  currentDirectory = directory,
): Promise<readonly string[]> {
  const entries = await readdir(currentDirectory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = resolve(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        return listRelativeFiles(directory, absolutePath);
      }
      return [relative(directory, absolutePath).replaceAll('\\', '/')];
    }),
  );
  return paths.flat().sort();
}

async function loadProject(
  relativePath: string,
): Promise<FormContractProjectConfig> {
  return parseProjectConfig(
    await loadWorkspaceConfigModule(resolve(fixtureRoot, relativePath), {
      tsconfigPath: fixtureTsconfig,
    }),
  );
}

interface FixtureField {
  readonly key?: unknown;
  readonly type?: unknown;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly fieldGroup?: readonly FixtureField[];
  readonly fieldArray?: FixtureField | (() => FixtureField);
  readonly expressions?: Readonly<Record<string, unknown>>;
  readonly hideExpression?: unknown;
}

function collectFields(fields: readonly FixtureField[]): FixtureField[] {
  return fields.flatMap((field) => {
    const arrayTemplate =
      typeof field.fieldArray === 'function'
        ? field.fieldArray()
        : field.fieldArray;
    return [
      field,
      ...collectFields(field.fieldGroup ?? []),
      ...(arrayTemplate === undefined ? [] : collectFields([arrayTemplate])),
    ];
  });
}

function findContractNode(
  nodes: ExtractFormResult['contract']['nodes'],
  modelPath: string,
): ExtractFormResult['contract']['nodes'][number] | undefined {
  for (const node of nodes) {
    if (node.modelPath.join('.') === modelPath) {
      return node;
    }
    const nested = findContractNode(
      [
        ...node.children,
        ...(node.arrayTemplate === undefined ? [] : [node.arrayTemplate]),
      ],
      modelPath,
    );
    if (nested !== undefined) {
      return nested;
    }
  }
  return undefined;
}

function extractFixtureDefinition(
  definition: {
    readonly id: string;
    readonly create: () => {
      readonly fields: readonly object[];
      readonly model?: Readonly<Record<string, unknown>>;
      readonly formState?: Readonly<Record<string, unknown>>;
    };
  },
  fieldTypeProfiles: FieldTypeProfileExtractionRegistry,
): ExtractFormResult {
  const instance = definition.create();
  return extractFormContract({
    formId: definition.id,
    fields: instance.fields,
    ...(instance.model === undefined ? {} : { model: instance.model }),
    ...(instance.formState === undefined
      ? {}
      : { formState: instance.formState }),
    fieldTypeProfiles,
  });
}

describe('Angular monorepo workspace fixture', () => {
  it('loads one root and four independently owned project descriptors', async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'formly-contracts.config.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const projects = await Promise.all([
      loadProject('apps/test-app/formly-contracts.project.ts'),
      loadProject('libs/formly-kit/formly-contracts.project.ts'),
      loadProject('libs/forms-kit/formly-contracts.project.ts'),
      loadProject('libs/feature-lib/formly-contracts.project.ts'),
    ]);

    expect(root.projectConfigs).toEqual([
      'apps/**/formly-contracts.project.ts',
      'libs/**/formly-contracts.project.ts',
    ]);
    expect(projects.map((project) => project.projectId).sort()).toEqual([
      'fixture-app',
      'fixture-feature-lib',
      'fixture-formly-kit',
      'fixture-forms-kit',
    ]);

    const resolved = projects.map((project) =>
      resolveWorkspaceProjectConfig(root, project),
    );
    expect(
      resolved.map(({ projectId, sourceIds }) => ({ projectId, sourceIds })),
    ).toEqual([
      { projectId: 'fixture-app', sourceIds: [] },
      { projectId: 'fixture-formly-kit', sourceIds: [] },
      {
        projectId: 'fixture-forms-kit',
        sourceIds: ['fixture/shared-forms'],
      },
      {
        projectId: 'fixture-feature-lib',
        sourceIds: ['fixture/claims-feature'],
      },
    ]);
  }, 20_000);

  it('shares one canonical custom-field registry across source-owning projects', async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'formly-contracts.config.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const formsKit = resolveWorkspaceProjectConfig(
      root,
      await loadProject('libs/forms-kit/formly-contracts.project.ts'),
    );
    const feature = resolveWorkspaceProjectConfig(
      root,
      await loadProject('libs/feature-lib/formly-contracts.project.ts'),
    );

    expect(formsKit.fieldTypeProfiles).toBeDefined();
    expect(feature.fieldTypeProfiles).toEqual(formsKit.fieldTypeProfiles);
    expect(formsKit.crossFieldEffects).toBeUndefined();
    expect(feature.crossFieldEffects?.id).toBe(
      'fixture.angular-cross-field-effects',
    );
    expect(
      feature.crossFieldEffects?.registry.forms.flatMap(({ effects }) =>
        effects.map(({ identity }) => identity.id),
      ),
    ).toEqual([
      'fixture.case-type-controls-other-details',
      'fixture.product-filters-case-type',
    ]);
    expect(
      formsKit.fieldTypeProfiles?.registry.registrations.map(
        ({ formlyType }) => formlyType,
      ),
    ).toEqual([
      'cool-radio-btn-grp',
      'dependent-select',
      'entity-autocomplete',
      'expandable-repeater',
      'table-select',
    ]);
    expect(
      formsKit.fieldTypeProfiles?.registry.registrations.some(
        ({ formlyType }) => formlyType === 'date-range',
      ),
    ).toBe(false);
    expect(
      formsKit.fieldTypeProfiles?.registry.wrappers.map(
        ({ wrapperName }) => wrapperName,
      ),
    ).toEqual(['fixture-expansion-panel']);
  }, 20_000);

  it('extracts the real custom-field matrix through the shared registry', async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'formly-contracts.config.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const formsProject = await loadProject(
      'libs/forms-kit/formly-contracts.project.ts',
    );
    const featureProject = await loadProject(
      'libs/feature-lib/formly-contracts.project.ts',
    );
    const formsKit = resolveWorkspaceProjectConfig(root, formsProject);
    const feature = resolveWorkspaceProjectConfig(root, featureProject);
    const registry = formsKit.fieldTypeProfiles;
    expect(registry).toBeDefined();
    if (registry === undefined) {
      return;
    }

    const sharedDefinitions = (await formsProject.sources?.[0]?.list()) ?? [];
    const featureDefinitions = (await featureProject.sources?.[0]?.list()) ?? [];
    const extract = (id: string) => {
      const definition = [...sharedDefinitions, ...featureDefinitions].find(
        (candidate) => candidate.id === id,
      );
      expect(definition).toBeDefined();
      return extractFixtureDefinition(definition!, registry);
    };

    const shared = extract('shared.contact-preferences');
    const radio = findContractNode(
      shared.contract.nodes,
      'claimant.contactPreference',
    );
    expect(radio).toMatchObject({
      semanticType: 'single-choice',
      wrappers: ['fixture-expansion-panel'],
      valueDomain: {
        kind: 'enumerated',
        source: 'adapter',
        completeness: 'complete',
        values: ['email', 'phone'],
      },
      interactionProfile: {
        profile: { id: 'fixture.cool-radio', version: 1 },
        interaction: { kind: 'choice', operation: 'check' },
        parts: [
          {
            name: 'group',
            role: 'radiogroup',
            evidence: 'declared',
          },
          { name: 'option', role: 'radio', evidence: 'declared' },
          {
            name: 'wrapper-expand',
            role: 'button',
            evidence: 'declared',
          },
        ],
        preconditions: [
          {
            kind: 'activate',
            part: 'wrapper-expand',
            operation: 'click',
            evidence: 'declared',
          },
        ],
        provenance: [
          'registry:fixture.angular-fields@1',
          'type:cool-radio-btn-grp',
          'wrapper:fixture-expansion-panel',
        ],
      },
    });

    const intake = extract('claims.intake');
    const dependent = findContractNode(
      intake.contract.nodes,
      'claimDetails.caseType',
    );
    expect(dependent?.valueDomain).toEqual({
      kind: 'dynamic',
      source: 'function',
      evidence: 'declared',
    });
    expect(dependent?.interactionProfile).toBeUndefined();

    const assignment = extract('claims.assignment');
    expect(
      findContractNode(assignment.contract.nodes, 'assignment.adjusters'),
    ).toMatchObject({
      options: [
        { label: 'Alex Morgan', value: 'adjuster-1' },
        { label: 'Sam Rivera', value: 'adjuster-2' },
      ],
      interactionProfile: {
        interaction: { kind: 'row-selection', operation: 'select-row' },
      },
    });

    const customer = extract('customers.onboarding');
    expect(
      findContractNode(customer.contract.nodes, 'customer.account'),
    ).toMatchObject({
      valueDomain: {
        values: [{ id: 'customer-ada' }, { id: 'customer-northwind' }],
      },
      interactionProfile: {
        interaction: { kind: 'autocomplete', operation: 'type-and-pick' },
      },
    });
    const unmapped = findContractNode(
      customer.contract.nodes,
      'customer.coveragePeriod',
    );
    expect(unmapped?.interactionProfile).toBeUndefined();
    expect(customer.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'UNMAPPED_FIELD_TYPE',
        nodeId: unmapped?.id,
      }),
    );

    const incident = extract('operations.incident');
    expect(
      findContractNode(incident.contract.nodes, 'incident.followUps'),
    ).toMatchObject({
      kind: 'array',
      semanticType: 'repeater',
      interactionProfile: {
        interaction: { kind: 'repeater', operation: 'expand-item' },
      },
    });
    expect(feature.fieldTypeProfiles).toEqual(formsKit.fieldTypeProfiles);
    expect(shared.contract.fieldTypeProfileRegistry).toEqual(
      intake.contract.fieldTypeProfileRegistry,
    );
  }, 20_000);

  it('composes reusable fragments and a custom field into a feature form', async () => {
    const formsKit = await loadProject(
      'libs/forms-kit/formly-contracts.project.ts',
    );
    const feature = await loadProject(
      'libs/feature-lib/formly-contracts.project.ts',
    );

    const sharedDefinitions = await formsKit.sources?.[0]?.list();
    const featureDefinitions = await feature.sources?.[0]?.list();
    expect(sharedDefinitions?.map((definition) => definition.id)).toEqual([
      'shared.contact-preferences',
      'shared.customer-lookup',
    ]);
    expect(featureDefinitions?.map((definition) => definition.id)).toEqual([
      'claims.assignment',
      'claims.intake',
      'customers.onboarding',
      'operations.incident',
    ]);

    const intakeDefinition = featureDefinitions?.find(
      (definition) => definition.id === 'claims.intake',
    );
    const intakeInstance = intakeDefinition?.create() as {
      readonly fields: readonly FixtureField[];
    };
    expect(intakeInstance.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'claimant.name', type: 'input' }),
        expect.objectContaining({
          key: 'claimant.contactPreference',
          type: 'cool-radio-btn-grp',
        }),
        expect.objectContaining({ key: 'claimDetails.summary', type: 'input' }),
      ]),
    );
  });

  it('covers the real-world interaction and data-shape matrix', async () => {
    const formsKit = await loadProject(
      'libs/forms-kit/formly-contracts.project.ts',
    );
    const feature = await loadProject(
      'libs/feature-lib/formly-contracts.project.ts',
    );
    const definitions = [
      ...((await formsKit.sources?.[0]?.list()) ?? []),
      ...((await feature.sources?.[0]?.list()) ?? []),
    ];
    const fields = definitions.flatMap((definition) => {
      const instance = definition.create() as {
        readonly fields: readonly FixtureField[];
      };
      return collectFields(instance.fields);
    });

    expect(definitions).toHaveLength(6);
    expect(
      [...new Set(fields.map((field) => field.type).filter(Boolean))].sort(),
    ).toEqual(
      expect.arrayContaining([
        'checkbox',
        'cool-radio-btn-grp',
        'date-range',
        'dependent-select',
        'entity-autocomplete',
        'expandable-repeater',
        'input',
        'select',
        'table-select',
        'textarea',
      ]),
    );
    expect(
      fields.some(
        (field) => field.expressions?.['props.options'] !== undefined,
      ),
    ).toBe(true);
    expect(
      fields.some(
        (field) =>
          field.hideExpression !== undefined ||
          field.expressions?.hide !== undefined,
      ),
    ).toBe(true);
    expect(fields.some((field) => field.fieldArray !== undefined)).toBe(true);

    expect(
      fields.find((field) => field.key === 'claimDetails.product')?.props
        ?.options,
    ).toEqual([
      { label: 'Auto', value: 'auto' },
      { label: 'Home', value: 'home' },
    ]);
    const caseTypeField = fields.find(
      (field) => field.key === 'claimDetails.caseType',
    );
    expect(caseTypeField?.props?.options).toEqual([]);
    expect(typeof caseTypeField?.expressions?.['props.options']).toBe(
      'function',
    );
    expect(
      fields.find((field) => field.key === 'customer.account')?.props?.options,
    ).toEqual(
      expect.arrayContaining([
        {
          label: 'Northwind Logistics',
          value: { id: 'customer-northwind' },
        },
      ]),
    );
    expect(
      fields.find((field) => field.key === 'assignment.adjusters')?.props
        ?.rowOptions,
    ).toEqual([
      { id: 'adjuster-1', label: 'Alex Morgan' },
      { id: 'adjuster-2', label: 'Sam Rivera' },
    ]);
  });

  it('generates a deterministic six-form workspace artifact set', async () => {
    const temporaryDirectory = await mkdtemp(
      resolve(fixtureRoot, '.workspace-runner-'),
    );
    const outputDirectory = relative(fixtureRoot, temporaryDirectory);

    try {
      const options = {
        workspaceRoot: fixtureRoot,
        rootConfigPath: 'formly-contracts.config.ts',
        rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
        cliOverrides: { outputDirectory },
        runtimeProvenance: goldenRuntimeProvenance,
      } as const;
      const first = await runWorkspace(options);
      const firstIndexBytes = await readFile(
        resolve(fixtureRoot, first.indexPath),
        'utf8',
      );
      const firstArtifactBytes = await Promise.all(
        first.artifactPaths.map((path) =>
          readFile(resolve(fixtureRoot, path), 'utf8'),
        ),
      );
      const second = await runWorkspace(options);
      const secondIndexBytes = await readFile(
        resolve(fixtureRoot, second.indexPath),
        'utf8',
      );
      const secondArtifactBytes = await Promise.all(
        second.artifactPaths.map((path) =>
          readFile(resolve(fixtureRoot, path), 'utf8'),
        ),
      );

      expect(first.index.forms.map(({ formId }) => formId)).toEqual([
        'claims.assignment',
        'claims.intake',
        'customers.onboarding',
        'operations.incident',
        'shared.contact-preferences',
        'shared.customer-lookup',
      ]);
      expect(first.artifactPaths).toHaveLength(6);
      expect(first.index.projects).toHaveLength(4);
      expect(first.index.plugins).toEqual([
        {
          id: 'fixture/angular',
          version: '1.0.0',
          configSchemaVersion: '1',
        },
      ]);
      expect(first.index.forms).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            formId: 'customers.onboarding',
            diagnostics: [
              expect.objectContaining({
                code: 'UNMAPPED_FIELD_TYPE',
                formlyType: 'date-range',
              }),
            ],
          }),
        ]),
      );
      const claimsProject = first.index.projects.find(
        ({ projectId }) => projectId === 'fixture-feature-lib',
      );
      const claimsForm = first.index.forms.find(
        ({ formId }) => formId === 'claims.intake',
      );
      const claimsArtifact = JSON.parse(
        await readFile(resolve(fixtureRoot, claimsForm!.artifactPath), 'utf8'),
      ) as {
        readonly declaredEffects: readonly {
          readonly identity: { readonly id: string };
        }[];
        readonly effectAnalysis: {
          readonly completeness: string;
          readonly reasons: readonly string[];
        };
      };
      expect(claimsProject?.crossFieldEffectRegistry).toMatchObject({
        id: 'fixture.angular-cross-field-effects',
        version: 1,
      });
      expect(claimsForm).toMatchObject({
        declaredEffects: [
          {
            identity: {
              id: 'fixture.case-type-controls-other-details',
              version: 1,
            },
          },
          {
            identity: {
              id: 'fixture.product-filters-case-type',
              version: 1,
            },
          },
        ],
        effectAnalysis: {
          completeness: 'incomplete',
          reasons: ['opaque-dynamic-rule'],
        },
      });
      expect(
        claimsArtifact.declaredEffects.map(({ identity }) => identity.id),
      ).toEqual([
        'fixture.case-type-controls-other-details',
        'fixture.product-filters-case-type',
      ]);
      expect(claimsArtifact.effectAnalysis).toEqual({
        completeness: 'incomplete',
        reasons: ['opaque-dynamic-rule'],
      });
      expect(first.index).toEqual(second.index);
      expect(first.indexPath).toBe(second.indexPath);
      expect(first.artifactPaths).toEqual(second.artifactPaths);
      expect(firstIndexBytes).toBe(secondIndexBytes);
      expect(firstArtifactBytes).toEqual(secondArtifactBytes);
      expect(firstIndexBytes).not.toContain('projectLayout');
      expect(firstIndexBytes).not.toContain('apps-and-libs');
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }, 20_000);

  it('matches committed canonical goldens with fully resolved effects', async () => {
    const temporaryWorkspace = await mkdtemp(
      resolve(fixtureRoot, '../.angular-monorepo-golden-'),
    );

    try {
      await cp(fixtureRoot, temporaryWorkspace, {
        recursive: true,
        filter: (source) =>
          ![
            goldenRoot,
            resolve(fixtureRoot, 'dist'),
            resolve(fixtureRoot, '.angular'),
          ].some(
            (excluded) =>
              source === excluded || source.startsWith(`${excluded}${sep}`),
          ),
      });

      const generated = await runWorkspace({
        workspaceRoot: temporaryWorkspace,
        rootConfigPath: 'formly-contracts.config.ts',
        rootLoaderOptions: {
          tsconfigPath: resolve(temporaryWorkspace, 'tsconfig.json'),
        },
        runtimeProvenance: goldenRuntimeProvenance,
      });
      const generatedPaths = [
        generated.indexPath,
        ...generated.artifactPaths,
      ].sort();
      const expectedGoldenPaths = generatedPaths.map(goldenRelativePath);

      expect(await listRelativeFiles(goldenRoot)).toEqual(expectedGoldenPaths);
      await Promise.all(
        generatedPaths.map(async (generatedPath) => {
          const [actual, expected] = await Promise.all([
            readFile(resolve(temporaryWorkspace, generatedPath)),
            readFile(resolve(goldenRoot, goldenRelativePath(generatedPath))),
          ]);
          expect(actual).toEqual(expected);
        }),
      );

      const claimsForm = generated.index.forms.find(
        ({ formId }) => formId === 'claims.intake',
      );
      expect(claimsForm).toBeDefined();
      const expectedEffects = [
        {
          identity: {
            id: 'fixture.case-type-controls-other-details',
            version: 1,
          },
          trigger: {
            nodeId: 'claims.intake::path:s_claimDetails.s_caseType',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'claims.intake::path:s_claimDetails.s_otherDetails',
            property: 'visibility',
          },
          kind: 'controls-state',
          timing: { mode: 'sync' },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
        {
          identity: {
            id: 'fixture.product-filters-case-type',
            version: 1,
          },
          trigger: {
            nodeId: 'claims.intake::path:s_claimDetails.s_product',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'claims.intake::path:s_claimDetails.s_caseType',
            property: 'options',
          },
          kind: 'filters',
          timing: { mode: 'sync' },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
      ];
      const claimsArtifact = JSON.parse(
        await readFile(
          resolve(
            goldenRoot,
            goldenRelativePath(claimsForm!.artifactPath),
          ),
          'utf8',
        ),
      ) as {
        readonly declaredEffects?: readonly unknown[];
        readonly effectAnalysis?: {
          readonly completeness: string;
          readonly reasons: readonly string[];
        };
        readonly nodes: readonly {
          readonly id: string;
          readonly dynamicRules: readonly unknown[];
        }[];
      };
      const goldenIndex = JSON.parse(
        await readFile(
          resolve(goldenRoot, goldenRelativePath(generated.indexPath)),
          'utf8',
        ),
      ) as {
        readonly forms: readonly {
          readonly formId: string;
          readonly declaredEffects?: readonly unknown[];
        }[];
      };

      expect(claimsArtifact.declaredEffects).toEqual(expectedEffects);
      expect(claimsArtifact.effectAnalysis).toEqual({
        completeness: 'incomplete',
        reasons: ['opaque-dynamic-rule'],
      });
      expect(
        claimsArtifact.nodes.find(
          ({ id }) =>
            id === 'claims.intake::path:s_claimDetails.s_caseType',
        )?.dynamicRules,
      ).toEqual([
        {
          evidence: 'declared',
          id: 'claims.intake::path:s_claimDetails.s_caseType::rule:expressions:props.options',
          property: 'props.options',
          source: 'function',
        },
      ]);
      expect(
        goldenIndex.forms.find(({ formId }) => formId === 'claims.intake')
          ?.declaredEffects,
      ).toEqual(expectedEffects);
    } finally {
      await rm(temporaryWorkspace, { recursive: true, force: true });
    }
  }, 30_000);
});
