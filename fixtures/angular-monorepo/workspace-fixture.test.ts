import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import {
  loadWorkspaceConfigModule,
  parseProjectConfig,
  parseRootConfig,
  resolveWorkspaceProjectConfig,
  type FormContractProjectConfig,
} from '@formly-agent-contracts/workspace';
import { describe, expect, it } from 'vitest';

const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));
const fixtureTsconfig = resolve(fixtureRoot, 'tsconfig.json');

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
  });

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
});
