import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadWorkspaceConfigModule,
  parseProjectConfig,
  parseRootConfig,
  runWorkspace,
} from '@formly-contract/workspace';
import {
  parseFormContract,
  type ContractNode,
  type FormContract,
  type RuntimeProvenance,
} from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));
const fixtureTsconfig = resolve(fixtureRoot, 'tsconfig.json');
const fixtureRuntimeProvenance: RuntimeProvenance = {
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
        rootConfig: 'configured',
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

function findNode(
  nodes: readonly ContractNode[],
  modelPath: string,
): ContractNode | undefined {
  for (const node of nodes) {
    if (node.modelPath.join('.') === modelPath) {
      return node;
    }
    const nested = findNode(
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

async function readContract(
  artifactPath: string | undefined,
): Promise<FormContract> {
  if (artifactPath === undefined) {
    throw new Error('Expected the generated contract artifact to exist.');
  }
  const bytes = await readFile(resolve(fixtureRoot, artifactPath), 'utf8');
  return parseFormContract(JSON.parse(bytes) as unknown);
}

describe('single Angular project workspace fixture', () => {
  it('loads one project with three feature-owned sources and reviewed profiles', async () => {
    const root = parseRootConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'formly-contracts.config.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );
    const project = parseProjectConfig(
      await loadWorkspaceConfigModule(
        resolve(fixtureRoot, 'formly-contracts.project.ts'),
        { tsconfigPath: fixtureTsconfig },
      ),
    );

    expect(root.projectConfigs).toEqual(['formly-contracts.project.ts']);
    expect(project.projectId).toBe('fixture-single-angular-app');
    expect(project.sources?.map(({ sourceId }) => sourceId)).toEqual([
      'fixture/applicant-forms',
      'fixture/operations-forms',
      'fixture/edge-case-forms',
    ]);
    expect(
      project.fieldTypeProfiles?.registrations.map(({ formlyType }) =>
        formlyType,
      ),
    ).toEqual([
      'autocomplete',
      'button-toggle',
      'currency',
      'expandable-repeater',
      'overlay-select',
      'rating',
      'repeat-section',
      'table-select',
    ]);

    const definitions = (
      await Promise.all(
        project.sources?.map(({ list }) => Promise.resolve(list())) ?? [],
      )
    ).flat();
    expect(definitions).toHaveLength(12);
    expect(new Set(definitions.map(({ id }) => id)).size).toBe(12);
    for (const definition of definitions) {
      expect(definition.create().fields.length, definition.id).toBeGreaterThan(
        0,
      );
    }
  }, 20_000);

  it('generates a deterministic twelve-form artifact set with portable paths', async () => {
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
        runtimeProvenance: fixtureRuntimeProvenance,
      } as const;
      const first = await runWorkspace(options);
      const firstIndexBytes = await readFile(
        resolve(fixtureRoot, first.indexPath),
        'utf8',
      );
      const firstArtifacts = await Promise.all(
        first.artifactPaths.map((path) =>
          readFile(resolve(fixtureRoot, path), 'utf8'),
        ),
      );
      const second = await runWorkspace(options);
      const secondIndexBytes = await readFile(
        resolve(fixtureRoot, second.indexPath),
        'utf8',
      );
      const secondArtifacts = await Promise.all(
        second.artifactPaths.map((path) =>
          readFile(resolve(fixtureRoot, path), 'utf8'),
        ),
      );

      expect(first.index.projects).toHaveLength(1);
      expect(first.index.forms).toHaveLength(12);
      expect(first.index.forms.map(({ formId }) => formId)).toEqual([
        'applicant.address-history',
        'applicant.communication',
        'applicant.household',
        'applicant.profile',
        'edge.key-paths',
        'edge.legacy-v6',
        'edge.opaque-behavior',
        'edge.validation',
        'operations.access-request',
        'operations.equipment-inspection',
        'operations.incident-report',
        'operations.purchase-order',
      ]);
      expect(first.index.plugins).toEqual([
        {
          id: 'fixture/angular-single-project',
          version: '1.0.0',
          configSchemaVersion: '1',
        },
      ]);
      expect(first.index).toEqual(second.index);
      expect(firstIndexBytes).toBe(secondIndexBytes);
      expect(firstArtifacts).toEqual(secondArtifacts);
      expect(firstIndexBytes).not.toContain(fixtureRoot);
      expect(firstIndexBytes).not.toContain('"layout"');
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }, 45_000);

  it('preserves representative native, repeated, custom, and opaque semantics', async () => {
    const temporaryDirectory = await mkdtemp(
      resolve(fixtureRoot, '.workspace-runner-'),
    );

    try {
      const result = await runWorkspace({
        workspaceRoot: fixtureRoot,
        rootConfigPath: 'formly-contracts.config.ts',
        rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
        cliOverrides: {
          outputDirectory: relative(fixtureRoot, temporaryDirectory),
        },
        runtimeProvenance: fixtureRuntimeProvenance,
      });
      const contractFor = async (formId: string) =>
        readContract(
          result.index.forms.find((form) => form.formId === formId)
            ?.artifactPath,
        );

      const communication = await contractFor('applicant.communication');
      expect(findNode(communication.nodes, 'email')?.conditions).toContainEqual(
        {
          id: 'applicant.communication::path:s_email::rule:expressions:hide',
          property: 'hide',
          expression: "model.channel !== 'email'",
          evidence: 'declared',
        },
      );

      const household = await contractFor('applicant.household');
      expect(findNode(household.nodes, 'members.*')).toMatchObject({
        kind: 'group',
        modelPath: ['members', '*'],
      });
      expect(
        findNode(household.nodes, 'members')?.interactionProfile,
      ).toMatchObject({
        profile: { id: 'fixture.repeat-section', version: 1 },
        interaction: { kind: 'repeater', operation: 'add-item' },
      });

      const opaque = await contractFor('edge.opaque-behavior');
      expect(
        findNode(opaque.nodes, 'interaction.autocomplete')?.interactionProfile,
      ).toMatchObject({
        profile: { id: 'fixture.autocomplete', version: 1 },
        interaction: { kind: 'autocomplete', operation: 'type-and-pick' },
      });
      expect(
        findNode(opaque.nodes, 'interaction.selectedRows')?.options,
      ).toEqual([
        { label: 'Synthetic row A', value: 'row-a' },
        { label: 'Synthetic row B', value: 'row-b' },
      ]);
      expect(new Set(opaque.diagnostics.map(({ code }) => code))).toEqual(
        new Set(['ASYNC_VALUE', 'OPAQUE_FUNCTION', 'UNSUPPORTED_RULE']),
      );

      const validation = await contractFor('edge.validation');
      expect(
        new Set(validation.diagnostics.map(({ code }) => code)),
      ).toContain('OPAQUE_FUNCTION');
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }, 45_000);
});
