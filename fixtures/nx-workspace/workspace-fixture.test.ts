import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadWorkspaceConfigModule,
  parseProjectConfig,
  parseRootConfig,
  resolveWorkspaceProjectConfig,
} from '@formly-contract/workspace';
import { extractFormContract } from '@formly-contract/compiler';
import { describe, expect, it } from 'vitest';

const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));
const fixtureTsconfig = resolve(fixtureRoot, 'tsconfig.json');

interface NxProjectJson {
  readonly name: string;
  readonly targets?: {
    readonly build?: { readonly executor?: string };
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function parseNxProjectJson(text: string): NxProjectJson {
  const value = JSON.parse(text) as unknown;
  const targets = isRecord(value) ? value.targets : undefined;
  const build = isRecord(targets) ? targets.build : undefined;
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new Error('Invalid Nx fixture project configuration.');
  }

  return {
    name: value.name,
    ...(isRecord(build) && typeof build.executor === 'string'
      ? { targets: { build: { executor: build.executor } } }
      : {}),
  };
}

describe('Nx workspace consumer fixture', () => {
  it('is a real Nx workspace with four independently owned projects', async () => {
    const nxConfig = JSON.parse(
      await readFile(resolve(fixtureRoot, 'nx.json'), 'utf8'),
    ) as {
      readonly cli?: { readonly cache?: { readonly enabled?: boolean } };
      readonly targetDefaults?: Readonly<Record<string, unknown>>;
    };
    const projectPaths = [
      'apps/test-app/project.json',
      'libs/formly-kit/project.json',
      'libs/forms-kit/project.json',
      'libs/feature-lib/project.json',
    ];
    const projects = await Promise.all(
      projectPaths.map(async (path) =>
        parseNxProjectJson(
          await readFile(resolve(fixtureRoot, path), 'utf8'),
        ),
      ),
    );

    expect(nxConfig.targetDefaults?.build).toEqual(
      expect.objectContaining({ cache: true }),
    );
    expect(nxConfig.cli?.cache?.enabled).toBe(false);
    expect(projects.map((project) => project.name).sort()).toEqual([
      'fixture-nx-app',
      'fixture-nx-feature-lib',
      'fixture-nx-formly-kit',
      'fixture-nx-forms-kit',
    ]);
    expect(projects[0]?.targets?.build?.executor).toBe(
      '@nx/angular:application',
    );
  });

  it('loads the root config and representative local source catalogs', async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'formly-contracts.config.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const formsProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'libs/forms-kit/formly-contracts.project.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const featureProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'libs/feature-lib/formly-contracts.project.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const definitions = [
      ...((await formsProject.sources?.[0]?.list()) ?? []),
      ...((await featureProject.sources?.[0]?.list()) ?? []),
    ];

    expect(root.projectConfigs).toEqual([
      'apps/**/formly-contracts.project.ts',
      'libs/**/formly-contracts.project.ts',
    ]);
    expect(definitions.map((definition) => definition.id).sort()).toEqual([
      'nx.claims.intake',
      'nx.shared.contact-preferences',
    ]);
    expect(
      definitions.flatMap((definition) => {
        const instance = definition.create() as {
          readonly fields: readonly { readonly type?: unknown }[];
        };
        return instance.fields.map((field) => field.type);
      }),
    ).toContain('cool-radio-btn-grp');
  }, 20_000);

  it('shares one canonical radio profile across source-owning projects', async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'formly-contracts.config.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const formsProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'libs/forms-kit/formly-contracts.project.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const featureProject = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'libs/feature-lib/formly-contracts.project.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const formsKit = resolveWorkspaceProjectConfig(root, formsProject);
    const feature = resolveWorkspaceProjectConfig(root, featureProject);

    expect(formsKit.fieldTypeProfiles).toBeDefined();
    expect(feature.fieldTypeProfiles).toEqual(formsKit.fieldTypeProfiles);
    expect(
      formsKit.fieldTypeProfiles?.registry.registrations.map(
        ({ formlyType }) => formlyType,
      ),
    ).toEqual(['cool-radio-btn-grp']);

    if (
      formsKit.fieldTypeProfiles === undefined ||
      feature.fieldTypeProfiles === undefined
    ) {
      return;
    }
    const projects = [
      { config: formsProject, fieldTypeProfiles: formsKit.fieldTypeProfiles },
      { config: featureProject, fieldTypeProfiles: feature.fieldTypeProfiles },
    ];
    const extracted = await Promise.all(
      projects.map(async ({ config, fieldTypeProfiles }) => {
        const definition = (await config.sources?.[0]?.list())?.[0];
        if (definition === undefined) {
          throw new Error('Expected one fixture form definition.');
        }
        const instance = definition.create();
        return extractFormContract({
          formId: definition.id,
          fields: instance.fields,
          fieldTypeProfiles,
        });
      }),
    );

    for (const result of extracted) {
      const radio = result.contract.nodes.find(
        ({ formlyType }) => formlyType === 'cool-radio-btn-grp',
      );
      expect(radio).toMatchObject({
        semanticType: 'single-choice',
        valueDomain: {
          kind: 'enumerated',
          values: ['email', 'phone'],
        },
        interactionProfile: {
          profile: { id: 'fixture.nx-cool-radio', version: 1 },
        },
      });
    }
    expect(extracted[0]?.contract.fieldTypeProfileRegistry).toEqual(
      extracted[1]?.contract.fieldTypeProfileRegistry,
    );
  });
});
