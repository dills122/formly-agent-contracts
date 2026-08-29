import {
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  canonicalStringify,
  computeCrossFieldEffectRegistryHash,
  computeFieldTypeProfileRegistryHash,
  type CrossFieldEffectRegistry,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

import {
  defineConfig,
  defineFormContractProject,
  parseProjectConfig,
  parseRootConfig,
  resolveWorkspaceProjectConfig,
  WORKSPACE_CONFIG_SCHEMA_VERSION,
  type WorkspacePlugin,
} from './config.js';
import { defineFormContractSource } from './source.js';

function createPlugin(id: string): WorkspacePlugin {
  return {
    id,
    version: '1.0.0',
    configSchemaVersion: '1',
  };
}

function createSource(sourceId: string) {
  return defineFormContractSource({ sourceId, list: () => [] });
}

function createEffectRegistry(reversed = false): CrossFieldEffectRegistry {
  const effects: CrossFieldEffectRegistry['forms'][number]['effects'] = [
    {
      identity: { id: 'claims.product-filters-case-type', version: 1 },
      trigger: {
        nodeId: 'claims.intake::path:s_product',
        event: 'selectionChanged',
      },
      target: {
        nodeId: 'claims.intake::path:s_caseType',
        property: 'options',
      },
      kind: 'filters',
      timing: {
        mode: 'async',
        readinessId: 'claims.case-type-options-ready',
      },
      ordering: 'source-before-target',
      evidence: 'declared',
      opacity: 'transparent',
    },
    {
      identity: { id: 'claims.product-clears-case', version: 1 },
      trigger: {
        nodeId: 'claims.intake::path:s_product',
        event: 'valueChanged',
      },
      target: {
        nodeId: 'claims.intake::path:s_case',
        property: 'value',
      },
      kind: 'clears',
      timing: { mode: 'sync' },
      ordering: 'source-before-target',
      evidence: 'declared',
      opacity: 'transparent',
    },
  ];

  return {
    schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
    id: 'claims.cross-field-effects',
    version: 1,
    forms: [
      {
        formId: 'claims.intake',
        coverage: 'complete',
        effects: reversed ? [...effects].reverse() : effects,
      },
    ],
  };
}

function createProfileRegistry(
  version = 1,
  reversed = false,
): FieldTypeProfileRegistry {
  const profiles: FieldTypeProfileRegistry['profiles'] = [
    {
      identity: { id: 'fixture.text', version },
      semanticType: 'text',
      valueShape: 'scalar',
      evidence: 'declared',
      parts: [
        {
          name: 'control',
          role: 'textbox',
          cardinality: 'one',
          evidence: 'declared',
        },
      ],
      interaction: {
        kind: 'fill',
        operation: 'fill',
        controlPart: 'control',
      },
      valueDomain: { kind: 'not-applicable', evidence: 'declared' },
      driver: {
        kind: 'generic',
        id: 'generic.fill',
        version: 1,
        capabilities: ['fill'],
      },
      effectCapabilities: { targetProperties: [], readiness: [] },
      unknowns: [],
    },
    {
      identity: { id: 'fixture.currency', version: 1 },
      semanticType: 'currency',
      valueShape: 'scalar',
      evidence: 'declared',
      parts: [
        {
          name: 'control',
          role: 'spinbutton',
          cardinality: 'one',
          evidence: 'declared',
        },
      ],
      interaction: {
        kind: 'fill',
        operation: 'fill',
        controlPart: 'control',
      },
      valueDomain: { kind: 'not-applicable', evidence: 'declared' },
      driver: {
        kind: 'generic',
        id: 'generic.fill',
        version: 1,
        capabilities: ['fill'],
      },
      effectCapabilities: { targetProperties: [], readiness: [] },
      unknowns: [],
    },
  ];
  const registrations: FieldTypeProfileRegistry['registrations'] = [
    {
      formlyType: 'input',
      defaultProfile: { id: 'fixture.text', version },
      variants: [],
    },
    {
      formlyType: 'currency',
      defaultProfile: { id: 'fixture.currency', version: 1 },
      variants: [],
    },
  ];
  const canonicalProfiles = [...profiles].sort((left, right) =>
    left.identity.id < right.identity.id ? -1 : 1,
  );
  const canonicalRegistrations = [...registrations].sort((left, right) =>
    left.formlyType < right.formlyType ? -1 : 1,
  );

  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id: 'fixture.workspace-profiles',
    version,
    profiles: reversed ? [...canonicalProfiles].reverse() : canonicalProfiles,
    registrations: reversed
      ? [...canonicalRegistrations].reverse()
      : canonicalRegistrations,
    wrappers: [],
  };
}

describe('workspace configuration', () => {
  it('provides typed identity helpers for root and project configs', () => {
    const root = {
      projectConfigs: ['apps/**/formly-contracts.project.ts'],
    } as const;
    const project = {
      projectId: 'claims/forms',
      sources: [createSource('claims')],
    } as const;

    expect(defineConfig(root)).toBe(root);
    expect(defineFormContractProject(project)).toBe(project);
  });

  it('strictly validates a complete root and project configuration', () => {
    const root = defineConfig({
      projectConfigs: [
        'libs/**/formly-contracts.project.ts',
        'apps/**/formly-contracts.project.ts',
      ],
      excludeProjectConfigs: ['apps/legacy/**'],
      tsconfigPath: 'tsconfig.base.json',
      sourceUsage: {
        convention: 'direct-root-call-v1',
        tsconfigPath: 'apps/test-app/tsconfig.app.json',
      },
      output: { directory: 'dist/contracts' },
      locators: { testIdAttributes: ['data-testid', 'data-cy'] },
      diagnostics: { failOn: ['error', 'warning'] },
      effects: { cyclePolicy: 'warning' },
      plugins: [createPlugin('workspace/angular')],
    });
    const project = defineFormContractProject({
      projectId: 'claims/forms',
      sources: [createSource('claims')],
      crossFieldEffects: createEffectRegistry(),
      output: { directory: 'dist/claims-contracts' },
    });

    expect(parseRootConfig(root)).toBe(root);
    expect(parseProjectConfig(project)).toBe(project);
  });

  it('resolves an explicit source-usage program without reusing the config-loader tsconfig', () => {
    const resolved = resolveWorkspaceProjectConfig(
      defineConfig({
        projectConfigs: ['apps/**/config.ts'],
        tsconfigPath: 'tsconfig.base.json',
        sourceUsage: {
          convention: 'direct-root-call-v1',
          tsconfigPath: 'apps/test-app/tsconfig.app.json',
        },
      }),
      defineFormContractProject({ projectId: 'claims' }),
    );

    expect(resolved.tsconfigPath).toBe('tsconfig.base.json');
    expect(resolved.sourceUsage).toEqual({
      convention: 'direct-root-call-v1',
      tsconfigPath: 'apps/test-app/tsconfig.app.json',
    });
  });

  it('requires a project-config resolver authority when source-usage indexing is enabled', () => {
    expect(() =>
      parseRootConfig({
        projectConfigs: ['apps/**/config.ts'],
        sourceUsage: {
          convention: 'direct-root-call-v1',
          tsconfigPath: 'apps/test-app/tsconfig.app.json',
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'root.tsconfigPath',
      }),
    );
  });

  it('resolves canonical cross-field effects and root cycle policy', () => {
    const root = defineConfig({
      projectConfigs: ['apps/**/config.ts'],
      effects: { cyclePolicy: 'warning' },
    });
    const registry = createEffectRegistry(true);
    const project = defineFormContractProject({
      projectId: 'claims',
      crossFieldEffects: registry,
    });

    const resolved = resolveWorkspaceProjectConfig(root, project);

    expect(resolved.effectCyclePolicy).toBe('warning');
    expect(resolved.crossFieldEffects?.schemaVersion).toBe(
      CROSS_FIELD_EFFECT_SCHEMA_VERSION,
    );
    expect(resolved.crossFieldEffects?.id).toBe(registry.id);
    expect(resolved.crossFieldEffects?.version).toBe(registry.version);
    expect(resolved.crossFieldEffects?.contentHash).toBe(
      computeCrossFieldEffectRegistryHash(registry),
    );
    expect(
      resolved.crossFieldEffects?.registry.forms[0]?.effects.map(
        (effect) => effect.identity.id,
      ),
    ).toEqual([
      'claims.product-clears-case',
      'claims.product-filters-case-type',
    ]);
    expect(registry.forms[0]!.effects[0]!.identity.id).toBe(
      'claims.product-clears-case',
    );
  });

  it('defaults effect-cycle policy to error', () => {
    const resolved = resolveWorkspaceProjectConfig(
      defineConfig({ projectConfigs: ['apps/**/config.ts'] }),
      defineFormContractProject({ projectId: 'claims' }),
    );

    expect(resolved.effectCyclePolicy).toBe('error');
  });

  it('rejects accessor-backed effect policy without invoking it', () => {
    let invoked = false;
    const effects: Record<string, unknown> = {};
    Object.defineProperty(effects, 'cyclePolicy', {
      enumerable: true,
      get: () => {
        invoked = true;
        return 'error';
      },
    });

    expect(() =>
      parseRootConfig({
        projectConfigs: ['apps/**/config.ts'],
        effects: effects as { readonly cyclePolicy: 'error' },
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'root.effects.cyclePolicy',
      }),
    );
    expect(invoked).toBe(false);
  });

  it('rejects accessor-backed root and project effect registries without invoking them', () => {
    let rootInvoked = false;
    const root: Record<string, unknown> = {
      projectConfigs: ['apps/**/config.ts'],
    };
    Object.defineProperty(root, 'effects', {
      enumerable: true,
      get: () => {
        rootInvoked = true;
        return { cyclePolicy: 'error' };
      },
    });

    expect(() => parseRootConfig(root)).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'root.effects',
      }),
    );
    expect(rootInvoked).toBe(false);

    let projectInvoked = false;
    const project: Record<string, unknown> = { projectId: 'claims' };
    Object.defineProperty(project, 'crossFieldEffects', {
      enumerable: true,
      get: () => {
        projectInvoked = true;
        return createEffectRegistry();
      },
    });

    expect(() => parseProjectConfig(project)).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'project.crossFieldEffects',
      }),
    );
    expect(projectInvoked).toBe(false);
  });

  it('accepts a configuration-only project with no form sources', () => {
    const project = defineFormContractProject({
      projectId: 'formly-kit',
    });

    expect(parseProjectConfig(project)).toBe(project);
    expect(
      resolveWorkspaceProjectConfig(
        defineConfig({ projectConfigs: ['libs/**/config.ts'] }),
        project,
      ).sourceIds,
    ).toEqual([]);
  });

  it.each([
    [
      { projectConfigs: ['apps/**/config.ts'], unexpected: true },
      'root.unexpected',
    ],
    [{ projectConfigs: ['/absolute/config.ts'] }, 'root.projectConfigs[0]'],
    [{ projectConfigs: ['../outside/config.ts'] }, 'root.projectConfigs[0]'],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        output: { directory: '../../outside' },
      },
      'root.output.directory',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        output: { directory: 'dist/**' },
      },
      'root.output.directory',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        output: { directory: '.' },
      },
      'root.output.directory',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        output: { directory: './' },
      },
      'root.output.directory',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        output: { directory: '././' },
      },
      'root.output.directory',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        output: { directory: '.\\' },
      },
      'root.output.directory',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        effects: { cyclePolicy: 'allow' },
      },
      'root.effects.cyclePolicy',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        sourceUsage: {
          convention: 'guess-form-call-v1',
          tsconfigPath: 'apps/test-app/tsconfig.app.json',
        },
      },
      'root.sourceUsage.convention',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        sourceUsage: {
          convention: 'direct-root-call-v1',
          tsconfigPath: 'apps/**/tsconfig.app.json',
        },
      },
      'root.sourceUsage.tsconfigPath',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        sourceUsage: {
          convention: 'direct-root-call-v1',
          tsconfigPath: 'apps/test-app/tsconfig.app.json',
          unexpected: true,
        },
      },
      'root.sourceUsage.unexpected',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        plugins: [createPlugin('duplicate'), createPlugin('duplicate')],
      },
      'root.plugins[1].id',
    ],
    [
      {
        projectConfigs: ['apps/**/config.ts'],
        plugins: [
          {
            ...createPlugin('workspace/angular'),
            options: { bootstrap: () => undefined },
          },
        ],
      },
      'root.plugins[0].options',
    ],
  ])('rejects invalid root configuration at %s', (root, expectedPath) => {
    expect(() => parseRootConfig(root)).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: expectedPath,
      }),
    );
  });

  it('rejects accessor-backed source-usage configuration without invoking it', () => {
    let rootInvoked = false;
    const root: Record<string, unknown> = {
      projectConfigs: ['apps/**/config.ts'],
    };
    Object.defineProperty(root, 'sourceUsage', {
      enumerable: true,
      get: () => {
        rootInvoked = true;
        return {
          convention: 'direct-root-call-v1',
          tsconfigPath: 'apps/test-app/tsconfig.app.json',
        };
      },
    });

    expect(() => parseRootConfig(root)).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'root.sourceUsage',
      }),
    );
    expect(rootInvoked).toBe(false);

    let nestedInvoked = false;
    const sourceUsage: Record<string, unknown> = {
      convention: 'direct-root-call-v1',
    };
    Object.defineProperty(sourceUsage, 'tsconfigPath', {
      enumerable: true,
      get: () => {
        nestedInvoked = true;
        return 'apps/test-app/tsconfig.app.json';
      },
    });

    expect(() =>
      parseRootConfig({
        projectConfigs: ['apps/**/config.ts'],
        sourceUsage,
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'root.sourceUsage.tsconfigPath',
      }),
    );
    expect(nestedInvoked).toBe(false);
  });

  it.each([
    [
      { projectId: 'claims', sources: [], unexpected: true },
      'project.unexpected',
    ],
    [
      {
        projectId: 'claims',
        sources: [createSource('duplicate'), createSource('duplicate')],
      },
      'project.sources[1].sourceId',
    ],
    [
      {
        projectId: 'claims',
        crossFieldEffects: {
          ...createEffectRegistry(),
          forms: [
            {
              formId: 'claims.intake',
              effects: [
                {
                  ...createEffectRegistry().forms[0]!.effects[0]!,
                  authority: 'candidate',
                },
              ],
            },
          ],
        },
      },
      'project.crossFieldEffects',
    ],
    [{ projectId: 'Claims With Spaces', sources: [] }, 'project.projectId'],
  ])('rejects invalid project configuration at %s', (project, expectedPath) => {
    expect(() => parseProjectConfig(project)).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: expectedPath,
      }),
    );
  });

  it('resolves defaults, root, project, then CLI overrides without deep merging arrays', () => {
    const root = defineConfig({
      projectConfigs: ['apps/**/config.ts'],
      output: { directory: 'dist/root' },
      locators: { testIdAttributes: ['data-root'] },
      diagnostics: { failOn: ['error'] },
      plugins: [createPlugin('workspace/angular')],
    });
    const project = defineFormContractProject({
      projectId: 'claims',
      sources: [createSource('z-source'), createSource('a-source')],
      output: { directory: 'dist/project' },
      locators: { testIdAttributes: ['data-project'] },
      diagnostics: { failOn: ['warning'] },
    });

    const projectResolved = resolveWorkspaceProjectConfig(root, project);
    expect(projectResolved.outputDirectory).toBe('dist/project');
    expect(projectResolved.testIdAttributes).toEqual(['data-project']);
    expect(projectResolved.failOn).toEqual(['warning']);

    const resolved = resolveWorkspaceProjectConfig(root, project, {
      outputDirectory: 'dist/cli',
      testIdAttributes: ['data-cli'],
      failOn: ['error', 'warning'],
    });

    expect(resolved).toEqual({
      schemaVersion: WORKSPACE_CONFIG_SCHEMA_VERSION,
      projectId: 'claims',
      projectConfigs: ['apps/**/config.ts'],
      excludeProjectConfigs: [],
      outputDirectory: 'dist/cli',
      testIdAttributes: ['data-cli'],
      failOn: ['error', 'warning'],
      effectCyclePolicy: 'error',
      plugins: [
        {
          id: 'workspace/angular',
          version: '1.0.0',
          configSchemaVersion: '1',
        },
      ],
      sourceIds: ['a-source', 'z-source'],
    });
  });

  it('uses documented defaults and root policy when higher layers omit overrides', () => {
    const defaults = resolveWorkspaceProjectConfig(
      defineConfig({ projectConfigs: ['apps/**/config.ts'] }),
      defineFormContractProject({
        projectId: 'claims',
        sources: [createSource('claims')],
      }),
    );
    expect(defaults.outputDirectory).toBe('dist/formly-contracts');
    expect(defaults.testIdAttributes).toEqual([
      'data-testid',
      'data-test-id',
      'data-test',
      'data-cy',
      'data-pw',
    ]);
    expect(defaults.failOn).toEqual(['error']);

    const rootPolicy = resolveWorkspaceProjectConfig(
      defineConfig({
        projectConfigs: ['apps/**/config.ts'],
        output: { directory: 'dist/root' },
        locators: { testIdAttributes: ['data-root'] },
        diagnostics: { failOn: ['warning'] },
      }),
      defineFormContractProject({
        projectId: 'claims',
        sources: [createSource('claims')],
      }),
    );
    expect(rootPolicy.outputDirectory).toBe('dist/root');
    expect(rootPolicy.testIdAttributes).toEqual(['data-root']);
    expect(rootPolicy.failOn).toEqual(['warning']);
  });

  it('sorts plugin identities with locale-independent code-unit ordering', () => {
    const resolved = resolveWorkspaceProjectConfig(
      defineConfig({
        projectConfigs: ['apps/**/config.ts'],
        plugins: [createPlugin('a/plugin'), createPlugin('a-plugin')],
      }),
      defineFormContractProject({
        projectId: 'claims',
        sources: [createSource('claims')],
      }),
    );

    expect(resolved.plugins.map((plugin) => plugin.id)).toEqual([
      'a-plugin',
      'a/plugin',
    ]);
  });

  it('retains JSON-safe preset options in resolved plugin metadata', () => {
    const resolved = resolveWorkspaceProjectConfig(
      defineConfig({
        projectConfigs: ['apps/**/config.ts'],
        plugins: [
          {
            ...createPlugin('workspace/angular'),
            options: {
              bootstrap: 'claims-app',
              includeLazyFeatures: false,
            },
          },
        ],
      }),
      defineFormContractProject({
        projectId: 'claims',
        sources: [createSource('claims')],
      }),
    );

    expect(resolved.plugins).toEqual([
      {
        id: 'workspace/angular',
        version: '1.0.0',
        configSchemaVersion: '1',
        options: {
          bootstrap: 'claims-app',
          includeLazyFeatures: false,
        },
      },
    ]);
    expect(() => structuredClone(resolved)).not.toThrow();
  });

  it('produces byte-identical JSON-safe resolved configuration for equivalent inputs', () => {
    const first = resolveWorkspaceProjectConfig(
      defineConfig({
        projectConfigs: ['libs/**/config.ts', 'apps/**/config.ts'],
        plugins: [createPlugin('z/plugin'), createPlugin('a/plugin')],
      }),
      defineFormContractProject({
        projectId: 'claims',
        sources: [createSource('z-source'), createSource('a-source')],
      }),
    );
    const second = resolveWorkspaceProjectConfig(
      defineConfig({
        projectConfigs: ['apps/**/config.ts', 'libs/**/config.ts'],
        plugins: [createPlugin('a/plugin'), createPlugin('z/plugin')],
      }),
      defineFormContractProject({
        projectId: 'claims',
        sources: [createSource('a-source'), createSource('z-source')],
      }),
    );

    expect(canonicalStringify(first)).toBe(canonicalStringify(second));
    expect(() => structuredClone(first)).not.toThrow();
  });

  it('strictly parses and carries canonical project-owned field profiles with stable identity', () => {
    const fieldTypeProfiles = createProfileRegistry();
    const project = defineFormContractProject({
      projectId: 'claims',
      fieldTypeProfiles,
    });

    expect(parseProjectConfig(project)).toBe(project);
    const resolved = resolveWorkspaceProjectConfig(
      defineConfig({ projectConfigs: ['apps/**/config.ts'] }),
      project,
    );

    expect(resolved.fieldTypeProfiles).toEqual({
      schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
      id: 'fixture.workspace-profiles',
      version: 1,
      contentHash: computeFieldTypeProfileRegistryHash(fieldTypeProfiles),
      registry: fieldTypeProfiles,
    });
    expect(() => structuredClone(resolved.fieldTypeProfiles)).not.toThrow();
  });

  it('normalizes equivalent registry ordering while profile versions change project identity', () => {
    const root = defineConfig({ projectConfigs: ['apps/**/config.ts'] });
    const first = resolveWorkspaceProjectConfig(
      root,
      defineFormContractProject({
        projectId: 'claims',
        fieldTypeProfiles: createProfileRegistry(),
      }),
    );
    const reordered = resolveWorkspaceProjectConfig(
      root,
      defineFormContractProject({
        projectId: 'claims',
        fieldTypeProfiles: createProfileRegistry(1, true),
      }),
    );
    const changed = resolveWorkspaceProjectConfig(
      root,
      defineFormContractProject({
        projectId: 'claims',
        fieldTypeProfiles: createProfileRegistry(2),
      }),
    );

    expect(canonicalStringify(reordered)).toBe(canonicalStringify(first));
    expect(reordered.fieldTypeProfiles?.contentHash).toBe(
      first.fieldTypeProfiles?.contentHash,
    );
    expect(changed.fieldTypeProfiles?.contentHash).not.toBe(
      first.fieldTypeProfiles?.contentHash,
    );
  });

  it('keeps profile registries isolated across independently resolved projects', () => {
    const root = defineConfig({ projectConfigs: ['libs/**/config.ts'] });
    const claims = resolveWorkspaceProjectConfig(
      root,
      defineFormContractProject({
        projectId: 'claims',
        fieldTypeProfiles: createProfileRegistry(),
      }),
    );
    const policy = resolveWorkspaceProjectConfig(
      root,
      defineFormContractProject({
        projectId: 'policy',
        fieldTypeProfiles: {
          ...createProfileRegistry(),
          id: 'fixture.policy-profiles',
        },
      }),
    );

    expect(claims.fieldTypeProfiles?.id).toBe('fixture.workspace-profiles');
    expect(policy.fieldTypeProfiles?.id).toBe('fixture.policy-profiles');
    expect(claims.fieldTypeProfiles?.contentHash).not.toBe(
      policy.fieldTypeProfiles?.contentHash,
    );
  });

  it('rejects malformed or executable profile registry content through project validation', () => {
    const malformed = structuredClone(createProfileRegistry()) as unknown as {
      profiles: { driver: Record<string, unknown> }[];
    };
    malformed.profiles[0]!.driver.execute = () => undefined;

    expect(() =>
      parseProjectConfig({
        projectId: 'claims',
        fieldTypeProfiles: malformed,
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'project.fieldTypeProfiles',
      }),
    );
  });

  it('rejects explicit undefined in optional profile fields during project parsing', () => {
    const malformed = structuredClone(createProfileRegistry()) as unknown as {
      profiles: { valueDomain: Record<string, unknown> }[];
    };
    malformed.profiles[0]!.valueDomain = {
      kind: 'projected',
      source: 'adapter',
      completeness: 'complete',
      collectionPath: 'props.options',
      labelPath: 'label',
      valuePath: 'value',
      disabledPath: undefined,
      evidence: 'declared',
    };

    try {
      parseProjectConfig({
        projectId: 'claims',
        fieldTypeProfiles: malformed,
      });
      throw new Error('Expected project profile parsing to fail.');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'CONFIG_INVALID',
        path: 'project.fieldTypeProfiles',
      });
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toContain(
          'registry.profiles[0].valueDomain.disabledPath must be a JSON value',
        );
      }
    }
  });
});
