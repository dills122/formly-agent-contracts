import { describe, expect, it } from 'vitest';

import type { RuntimeProvenance } from '@formly-contract/schema';

import {
  WORKSPACE_INDEX_SCHEMA_VERSION,
  canonicalizeWorkspaceContractIndex,
  computeWorkspaceConfigurationHash,
  computeWorkspaceIndexHash,
  createWorkspaceContractIndex,
  encodeWorkspaceId,
  parseWorkspaceContractIndex,
  workspaceContractArtifactPath,
  type WorkspaceContractIndexDraft,
} from './workspace-index.js';

const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const HASH_C = `sha256:${'c'.repeat(64)}`;

function runtimeProvenance(): RuntimeProvenance {
  return {
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
        tsconfigPaths: 'configured',
        nativeModules: [],
      },
    },
    node: {
      version: '22.22.1',
      platform: 'linux',
      architecture: 'x64',
    },
    executionProfile: {
      id: 'trusted-local-v1',
      version: '1',
      network: 'not-enforced',
    },
    dependencySnapshot: {
      kind: 'pnpm-lock',
      workspaceRelativePath: 'pnpm-lock.yaml',
      sha256: HASH_A,
    },
    runtimePackages: [],
  };
}

function createDraft(): WorkspaceContractIndexDraft {
  return {
    schemaVersion: WORKSPACE_INDEX_SCHEMA_VERSION,
    workspaceConfigSchemaVersion: '0.2.0',
    rootConfigPath: 'formly-contract.config.ts',
    configurationHash: HASH_A,
    runtimeProvenance: runtimeProvenance(),
    plugins: [
      { id: 'z-plugin', version: '2.0.0', configSchemaVersion: '2' },
      { id: 'a-plugin', version: '1.0.0', configSchemaVersion: '1' },
    ],
    projects: [
      {
        configPath: 'libs/forms/project.formly-contract.ts',
        projectId: 'forms/shared',
        sourceIds: ['registry/z', 'registry/a'],
        outputDirectory: 'dist/formly-contracts/forms',
        configurationHash: HASH_B,
        runtimeProvenance: runtimeProvenance(),
        fieldTypeProfileRegistry: {
          schemaVersion: '0.4.0',
          id: 'profiles/shared',
          version: 3,
          contentHash: HASH_C,
        },
      },
      {
        configPath: 'apps/admin/project.formly-contract.ts',
        projectId: 'admin',
        sourceIds: ['pages'],
        outputDirectory: 'dist/formly-contracts/admin',
        configurationHash: HASH_C,
        runtimeProvenance: runtimeProvenance(),
      },
    ],
    forms: [
      {
        projectId: 'forms/shared',
        sourceId: 'registry/a',
        formId: 'z-form',
        evidence: 'declared',
        artifactPath: `dist/formly-contracts/forms/projects/id_Zm9ybXMvc2hhcmVk/forms/id_ei1mb3Jt/sha256-${'b'.repeat(
          64,
        )}.contract.json`,
        contractSchemaVersion: '0.4.0',
        contentHash: HASH_B,
        diagnostics: [],
      },
      {
        projectId: 'admin',
        sourceId: 'pages',
        formId: 'a-form',
        evidence: 'declared',
        artifactPath: `dist/formly-contracts/admin/projects/id_YWRtaW4/forms/id_YS1mb3Jt/sha256-${'a'.repeat(
          64,
        )}.contract.json`,
        contractSchemaVersion: '0.4.0',
        contentHash: HASH_A,
        diagnostics: [
          {
            code: 'UNMAPPED_FIELD_TYPE',
            severity: 'warning',
            message: 'Custom type is not registered.',
            evidence: 'declared',
            sourcePath: ['customer', 0],
            nodeId: 'customer.kind',
            formlyType: 'cool-radio-btn-grp',
          },
        ],
      },
    ],
  };
}

describe('workspace contract index', () => {
  it('creates a canonical, deterministically ordered, content-addressed index', () => {
    const first = createWorkspaceContractIndex(createDraft());
    const reorderedDraft = createDraft();
    const second = createWorkspaceContractIndex({
      ...reorderedDraft,
      plugins: [...reorderedDraft.plugins].reverse(),
      projects: [...reorderedDraft.projects].reverse().map((project) => ({
        ...project,
        sourceIds: [...project.sourceIds].reverse(),
      })),
      forms: [...reorderedDraft.forms].reverse(),
    });

    expect(first.plugins.map(({ id }) => id)).toEqual(['a-plugin', 'z-plugin']);
    expect(first.projects.map(({ projectId }) => projectId)).toEqual([
      'admin',
      'forms/shared',
    ]);
    expect(first.projects[1]?.sourceIds).toEqual(['registry/a', 'registry/z']);
    expect(first.forms.map(({ formId }) => formId)).toEqual([
      'a-form',
      'z-form',
    ]);
    expect(first).toEqual(second);
    expect(first.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(canonicalizeWorkspaceContractIndex(first)).toBe(
      canonicalizeWorkspaceContractIndex(second),
    );
    expect(
      parseWorkspaceContractIndex(JSON.parse(JSON.stringify(first))),
    ).toEqual(first);
  });

  it('hashes normalized configuration data independently of object key order', () => {
    expect(
      computeWorkspaceConfigurationHash({
        project: 'admin',
        nested: { enabled: true, attributes: ['data-testid'] },
      }),
    ).toBe(
      computeWorkspaceConfigurationHash({
        nested: { attributes: ['data-testid'], enabled: true },
        project: 'admin',
      }),
    );
    expect(computeWorkspaceConfigurationHash({ project: 'admin' })).not.toBe(
      computeWorkspaceConfigurationHash({ project: 'portal' }),
    );
  });

  it('excludes only the index contentHash from its hash input', () => {
    const index = createWorkspaceContractIndex(createDraft());

    expect(computeWorkspaceIndexHash(index)).toBe(index.contentHash);
    expect(computeWorkspaceIndexHash({ ...index, contentHash: HASH_A })).toBe(
      index.contentHash,
    );
    expect(
      computeWorkspaceIndexHash({
        ...index,
        forms: index.forms.map((form, indexPosition) =>
          indexPosition === 0 ? { ...form, contentHash: HASH_C } : form,
        ),
      }),
    ).not.toBe(index.contentHash);
  });

  it('rejects mutations, unknown privacy-sensitive properties, and stale hashes', () => {
    const index = createWorkspaceContractIndex(createDraft());

    expect(() =>
      parseWorkspaceContractIndex({ ...index, generatedAt: '2026-08-26' }),
    ).toThrow(/workspaceIndex\.generatedAt/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        plugins: [{ ...index.plugins[0], options: { token: 'secret' } }],
      }),
    ).toThrow(/workspaceIndex\.plugins\[0\]\.options/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        projects: [{ ...index.projects[0], registry: { profiles: [] } }],
      }),
    ).toThrow(/workspaceIndex\.projects\[0\]\.registry/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        forms: [{ ...index.forms[0], model: { private: true } }],
      }),
    ).toThrow(/workspaceIndex\.forms\[0\]\.model/u);
    expect(() =>
      parseWorkspaceContractIndex({ ...index, rootConfigPath: 'other.ts' }),
    ).toThrow(/contentHash: does not match/u);
  });

  it('rejects prior workspace index/configuration versions explicitly', () => {
    const index = createWorkspaceContractIndex(createDraft());

    expect(() =>
      parseWorkspaceContractIndex({ ...index, schemaVersion: '0.1.0' }),
    ).toThrow(/schemaVersion.*must be 0\.2\.0/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        workspaceConfigSchemaVersion: '0.1.0',
      }),
    ).toThrow(/workspaceConfigSchemaVersion.*must be 0\.2\.0/u);
  });

  it('rejects accessors without evaluating them', () => {
    const index = createWorkspaceContractIndex(createDraft());
    let getterCalls = 0;
    const hostile = Object.defineProperty({ ...index }, 'rootConfigPath', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'formly-contract.config.ts';
      },
    });

    expect(() => parseWorkspaceContractIndex(hostile)).toThrow(
      /workspaceIndex\.rootConfigPath.*data property/u,
    );
    expect(getterCalls).toBe(0);
  });

  it('rejects duplicate identities and non-canonical ordering', () => {
    const index = createWorkspaceContractIndex(createDraft());

    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        plugins: [index.plugins[0], index.plugins[0]],
      }),
    ).toThrow(/duplicate plugin ID/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        projects: [...index.projects].reverse(),
      }),
    ).toThrow(/projects.*canonical order/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        forms: [...index.forms].reverse(),
      }),
    ).toThrow(/forms.*canonical order/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        projects: index.projects.map((project, position) =>
          position === 0
            ? { ...project, sourceIds: ['pages', 'pages'] }
            : project,
        ),
      }),
    ).toThrow(/duplicate source ID/u);

    expect(() =>
      createWorkspaceContractIndex({
        ...createDraft(),
        projects: createDraft().projects.map((project) => ({
          ...project,
          sourceIds: ['shared/source'],
        })),
        forms: [],
      }),
    ).toThrow(/duplicate source ID/u);
  });

  it('rejects artifact paths that do not match project, form, and content identity', () => {
    const draft = createDraft();

    expect(() =>
      createWorkspaceContractIndex({
        ...draft,
        forms: draft.forms.map((form, position) =>
          position === 0 ? { ...form, artifactPath: 'package.json' } : form,
        ),
      }),
    ).toThrow(/artifactPath.*canonical content-addressed path/u);
  });

  it('rejects unsupported numeric properties on arrays', () => {
    const draft = createDraft();
    const plugins = [...draft.plugins];
    Object.defineProperty(plugins, '4294967295', {
      enumerable: true,
      value: { id: 'hidden', version: '1', configSchemaVersion: '1' },
    });

    expect(() => createWorkspaceContractIndex({ ...draft, plugins })).toThrow(
      /plugins\.4294967295.*not a supported array property/u,
    );
  });

  it.each([
    ['/absolute/config.ts', 'rootConfigPath'],
    ['../config.ts', 'rootConfigPath'],
    ['./config.ts', 'rootConfigPath'],
    ['configs\\root.ts', 'rootConfigPath'],
  ])('rejects unsafe workspace paths: %s', (unsafePath, property) => {
    const index = createWorkspaceContractIndex(createDraft());

    expect(() =>
      parseWorkspaceContractIndex({ ...index, [property]: unsafePath }),
    ).toThrow(/safe workspace-relative path/u);
  });

  it('rejects unsafe nested paths and malformed digests', () => {
    const index = createWorkspaceContractIndex(createDraft());

    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        projects: index.projects.map((project, position) =>
          position === 0
            ? { ...project, configPath: '/private/project.ts' }
            : project,
        ),
      }),
    ).toThrow(/configPath.*safe workspace-relative path/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        forms: index.forms.map((form, position) =>
          position === 0 ? { ...form, artifactPath: '../private.json' } : form,
        ),
      }),
    ).toThrow(/artifactPath.*safe workspace-relative path/u);
    expect(() =>
      parseWorkspaceContractIndex({
        ...index,
        configurationHash: 'sha256:not-a-digest',
      }),
    ).toThrow(/configurationHash.*sha256 digest/u);
  });

  it('encodes stable IDs injectively beneath one safe path segment', () => {
    const encodedSlash = encodeWorkspaceId('forms/shared');
    const encodedUnderscore = encodeWorkspaceId('forms_shared');
    const encodedFormId = encodeWorkspaceId('CustomerForm:v2');

    expect(encodedSlash).not.toBe(encodedUnderscore);
    expect(encodedSlash).toMatch(/^id_[A-Za-z0-9_-]+$/u);
    expect(encodedFormId).toMatch(/^id_[A-Za-z0-9_-]+$/u);
    expect(encodedFormId).not.toBe(encodedSlash);
    expect(encodedSlash).not.toContain('/');
    expect(encodeWorkspaceId('con')).not.toBe('con');
    expect(encodeWorkspaceId('aux')).not.toBe('aux');
    expect(() => encodeWorkspaceId('../escape')).toThrow(/stable ID/u);
  });

  it('accepts Form Contract form IDs but rejects slash-delimited form IDs', () => {
    const draft = createDraft();
    const uppercaseForm = createWorkspaceContractIndex({
      ...draft,
      forms: draft.forms.map((form, position) =>
        position === 0
          ? {
              ...form,
              formId: 'CustomerForm:v2',
              artifactPath: workspaceContractArtifactPath({
                outputDirectory: draft.projects[0]!.outputDirectory,
                projectId: form.projectId,
                formId: 'CustomerForm:v2',
                contentHash: form.contentHash,
              }),
            }
          : form,
      ),
    });

    expect(
      uppercaseForm.forms.some(({ formId }) => formId === 'CustomerForm:v2'),
    ).toBe(true);
    expect(() =>
      createWorkspaceContractIndex({
        ...draft,
        forms: draft.forms.map((form, position) =>
          position === 0 ? { ...form, formId: 'customer/form' } : form,
        ),
      }),
    ).toThrow(/formId.*stable contract identifier/u);
  });

  it('does not retain nested effect aliases from parsed index input', () => {
    const draft = createDraft();
    const index = createWorkspaceContractIndex({
      ...draft,
      projects: draft.projects.map((project) =>
        project.projectId === 'admin'
          ? {
              ...project,
              crossFieldEffectRegistry: {
                schemaVersion: '0.4.0',
                id: 'fixture.effects',
                version: 1,
                contentHash: HASH_A,
              },
            }
          : project,
      ),
      forms: draft.forms.map((form) =>
        form.projectId === 'admin'
          ? {
              ...form,
              declaredEffects: [
                {
                  identity: { id: 'fixture.a-to-b', version: 1 },
                  trigger: {
                    nodeId: 'a-form::a',
                    event: 'valueChanged' as const,
                  },
                  target: {
                    nodeId: 'a-form::b',
                    property: 'visibility' as const,
                  },
                  kind: 'controls-state' as const,
                  timing: { mode: 'sync' as const },
                  ordering: 'source-before-target' as const,
                  evidence: 'declared' as const,
                  opacity: 'transparent' as const,
                },
              ],
              effectAnalysis: { completeness: 'complete', reasons: [] },
            }
          : form,
      ),
    });
    const input = structuredClone(index);
    const parsed = parseWorkspaceContractIndex(input);
    const mutableInput = input as unknown as {
      forms: {
        projectId: string;
        declaredEffects?: { target: { property: string } }[];
      }[];
    };
    mutableInput.forms.find(
      ({ projectId }) => projectId === 'admin',
    )!.declaredEffects![0]!.target.property = 'value';

    expect(
      parsed.forms.find(({ projectId }) => projectId === 'admin')
        ?.declaredEffects?.[0]?.target.property,
    ).toBe('visibility');
    expect(computeWorkspaceIndexHash(parsed)).toBe(parsed.contentHash);
  });
});
