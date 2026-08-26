import { canonicalStringify } from '@formly-contract/contract-schema';
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
      output: { directory: 'dist/contracts' },
      locators: { testIdAttributes: ['data-testid', 'data-cy'] },
      diagnostics: { failOn: ['error', 'warning'] },
      plugins: [createPlugin('workspace/angular')],
    });
    const project = defineFormContractProject({
      projectId: 'claims/forms',
      sources: [createSource('claims')],
      output: { directory: 'dist/claims-contracts' },
    });

    expect(parseRootConfig(root)).toBe(root);
    expect(parseProjectConfig(project)).toBe(project);
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
      { projectId: 'Claims With Spaces', sources: [] },
      'project.projectId',
    ],
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
});
