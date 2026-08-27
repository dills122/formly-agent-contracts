import { canonicalStringify } from '@formly-contract/schema';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkWorkspace,
  runWorkspace,
  WorkspaceGenerationError,
} from './run-workspace.js';

const temporaryDirectories: string[] = [];

async function createTemporaryWorkspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'formly workspace runner '));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeModule(
  workspaceRoot: string,
  relativePath: string,
  source: string,
): Promise<void> {
  const path = join(workspaceRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}

async function seedRoot(workspaceRoot: string, extra = ''): Promise<void> {
  await writeModule(
    workspaceRoot,
    'formly-contracts.config.mjs',
    `export default {
      projectConfigs: ['projects/*.project.mjs']
      ${extra}
    };`,
  );
}

function runnerOptions(workspaceRoot: string) {
  return {
    workspaceRoot,
    rootConfigPath: 'formly-contracts.config.mjs',
  } as const;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }
    throw error;
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('runWorkspace', () => {
  it('deterministically inventories unordered bulk sources and emits byte-identical consecutive runs', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/zeta.project.mjs',
      `export default {
        projectId: 'zeta/forms',
        sources: [{
          sourceId: 'zeta/source',
          list: async () => [
            { id: 'zeta.second', create: () => ({ fields: [{ key: 'second', type: 'input' }] }) },
            { id: 'zeta.first', create: () => ({ fields: [{ key: 'first', type: 'input' }] }) }
          ]
        }]
      };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/alpha.project.mjs',
      `export default {
        projectId: 'alpha/forms',
        sources: [{
          sourceId: 'alpha/source',
          list: () => [{ id: 'alpha.only', create: () => ({ fields: [{ key: 'only', type: 'checkbox' }] }) }]
        }]
      };`,
    );

    const first = await runWorkspace(runnerOptions(workspaceRoot));
    const firstIndexBytes = await readFile(
      join(workspaceRoot, first.indexPath),
      'utf8',
    );
    const firstArtifactBytes = await Promise.all(
      first.artifactPaths.map((path) =>
        readFile(join(workspaceRoot, path), 'utf8'),
      ),
    );
    const second = await runWorkspace(runnerOptions(workspaceRoot));

    expect(first.artifactPaths).toEqual([...first.artifactPaths].sort());
    expect(first.index.forms.map(({ formId }) => formId)).toEqual([
      'alpha.only',
      'zeta.first',
      'zeta.second',
    ]);
    expect(first.indexPath).toBe('dist/formly-contracts/workspace-index.json');
    expect(first.index).toEqual(second.index);
    expect(await readFile(join(workspaceRoot, second.indexPath), 'utf8')).toBe(
      firstIndexBytes,
    );
    await expect(
      Promise.all(
        second.artifactPaths.map((path) =>
          readFile(join(workspaceRoot, path), 'utf8'),
        ),
      ),
    ).resolves.toEqual(firstArtifactBytes);
    expect(firstIndexBytes).toBe(`${canonicalStringify(first.index)}\n`);
  });

  it('reports generated artifacts as current without rewriting them', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`,
    );
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const indexPath = join(workspaceRoot, generated.indexPath);
    const artifactPath = join(workspaceRoot, generated.artifactPaths[0]!);
    const indexBytes = await readFile(indexPath, 'utf8');
    const artifactBytes = await readFile(artifactPath, 'utf8');

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked).toEqual({
      indexPath: generated.indexPath,
      artifactPaths: generated.artifactPaths,
      differences: [],
    });
    expect(await readFile(indexPath, 'utf8')).toBe(indexBytes);
    expect(await readFile(artifactPath, 'utf8')).toBe(artifactBytes);
  });

  it('reports missing artifacts without creating output', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`,
    );

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked.differences).toEqual([
      { path: checked.artifactPaths[0], status: 'missing' },
      { path: checked.indexPath, status: 'missing' },
    ]);
    expect(await pathExists(join(workspaceRoot, 'dist'))).toBe(false);
  });

  it('reports stale artifact bytes without replacing them', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`,
    );
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const artifactPath = join(workspaceRoot, generated.artifactPaths[0]!);
    await writeFile(artifactPath, 'stale artifact bytes\n');

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked.differences).toEqual([
      { path: generated.artifactPaths[0], status: 'stale' },
    ]);
    expect(await readFile(artifactPath, 'utf8')).toBe('stale artifact bytes\n');
  });

  it('reports distinct invalid UTF-8 bytes as stale without replacing them', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({
            fields: [{ key: 'name', type: 'input', props: { label: '\uFFFD' } }]
          })
        }] }]
      };`,
    );
    const generated = await runWorkspace(runnerOptions(workspaceRoot));
    const artifactPath = join(workspaceRoot, generated.artifactPaths[0]!);
    const artifactBytes = await readFile(artifactPath);
    const replacementCharacter = Buffer.from('\uFFFD');
    const replacementOffset = artifactBytes.indexOf(replacementCharacter);
    expect(replacementOffset).toBeGreaterThanOrEqual(0);
    const corruptedBytes = Buffer.concat([
      artifactBytes.subarray(0, replacementOffset),
      Buffer.from([0xff]),
      artifactBytes.subarray(replacementOffset + replacementCharacter.length),
    ]);
    await writeFile(artifactPath, corruptedBytes);

    const checked = await checkWorkspace(runnerOptions(workspaceRoot));

    expect(checked.differences).toEqual([
      { path: generated.artifactPaths[0], status: 'stale' },
    ]);
    expect(await readFile(artifactPath)).toEqual(corruptedBytes);

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toMatchObject({
      code: 'OUTPUT_WRITE_FAILED',
      phase: 'output',
      outputPath: generated.artifactPaths[0],
    });
    await expect(checkWorkspace(runnerOptions(workspaceRoot))).resolves.toMatchObject({
      differences: [
        { path: generated.artifactPaths[0], status: 'stale' },
      ],
    });
    expect(await readFile(artifactPath)).toEqual(corruptedBytes);
  });

  it('rejects globally duplicate form IDs before invoking any factory or writing output', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [
          { sourceId: 'one', list: () => [{ id: 'duplicate.form', create: () => { throw new Error('factory must not run'); } }] },
          { sourceId: 'two', list: () => [{ id: 'duplicate.form', create: () => { throw new Error('factory must not run'); } }] }
        ]
      };`,
    );

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
      expect.objectContaining({
        name: 'WorkspaceGenerationError',
        code: 'DUPLICATE_FORM_ID',
        phase: 'inventory',
        formId: 'duplicate.form',
      }),
    );
    expect(await pathExists(join(workspaceRoot, 'dist'))).toBe(false);
  });

  it.each([
    {
      label: 'source listing',
      code: 'SOURCE_LIST_FAILED',
      source: `{ sourceId: 'forms', list: () => { throw new Error('private list failure'); } }`,
    },
    {
      label: 'form factory',
      code: 'FORM_FACTORY_FAILED',
      source: `{ sourceId: 'forms', list: () => [{ id: 'claims.form', create: () => { throw new Error('private factory failure'); } }] }`,
    },
    {
      label: 'diagnostic policy',
      code: 'DIAGNOSTIC_POLICY_FAILED',
      rootExtra: `, diagnostics: { failOn: ['warning'] }`,
      source: `{ sourceId: 'forms', list: () => [{ id: 'claims.form', create: () => ({ fields: [{}] }) }] }`,
    },
  ])(
    'publishes no index when $label fails',
    async ({ code, rootExtra, source }) => {
      const workspaceRoot = await createTemporaryWorkspace();
      await seedRoot(workspaceRoot, rootExtra);
      await writeModule(
        workspaceRoot,
        'projects/forms.project.mjs',
        `export default { projectId: 'forms', sources: [${source}] };`,
      );

      let captured: unknown;
      try {
        await runWorkspace(runnerOptions(workspaceRoot));
      } catch (error) {
        captured = error;
      }
      expect(captured).toEqual(
        expect.objectContaining({
          name: 'WorkspaceGenerationError',
          code,
        }),
      );
      expect(captured).toBeInstanceOf(WorkspaceGenerationError);
      expect((captured as Error).message).not.toContain('private');
      expect(
        await pathExists(
          join(workspaceRoot, 'dist/formly-contracts/workspace-index.json'),
        ),
      ).toBe(false);
    },
  );

  it('preserves the prior successful index when a later generation fails', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{ id: 'stable.form', create: () => ({ fields: [{ key: 'name', type: 'input' }] }) }] }]
      };`,
    );
    const successful = await runWorkspace(runnerOptions(workspaceRoot));
    const indexPath = join(workspaceRoot, successful.indexPath);
    const successfulBytes = await readFile(indexPath, 'utf8');

    await writeModule(
      workspaceRoot,
      'formly-contracts.failed.config.mjs',
      `export default { projectConfigs: ['projects/failed.project.mjs'] };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/failed.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{ id: 'stable.form', create: () => { throw new Error('later failure'); } }] }]
      };`,
    );

    await expect(
      runWorkspace({
        workspaceRoot,
        rootConfigPath: 'formly-contracts.failed.config.mjs',
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'FORM_FACTORY_FAILED' }));
    expect(await readFile(indexPath, 'utf8')).toBe(successfulBytes);
  });

  it('indexes only profile identity and enriches unmapped diagnostics with formly type provenance', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(
      workspaceRoot,
      `, plugins: [{
        id: 'fixture/plugin', version: '1.0.0', configSchemaVersion: '1',
        options: { forbiddenPluginSecret: 'do-not-emit' }
      }]`,
    );
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        fieldTypeProfiles: {
          schemaVersion: '0.4.0', id: 'fixture.profiles', version: 1,
          profiles: [{
            identity: { id: 'fixture.text', version: 1 },
            semanticType: 'text', valueShape: 'scalar', evidence: 'declared',
            parts: [{ name: 'control', role: 'textbox', cardinality: 'one', evidence: 'declared' }],
            interaction: { kind: 'fill', operation: 'fill', controlPart: 'control' },
            valueDomain: { kind: 'not-applicable', evidence: 'declared' },
            driver: { kind: 'generic', id: 'generic.fill', version: 1, capabilities: ['fill'] },
            effectCapabilities: { targetProperties: [], readiness: [] },
            unknowns: []
          }],
          registrations: [{ formlyType: 'known-text', defaultProfile: { id: 'fixture.text', version: 1 }, variants: [] }],
          wrappers: []
        },
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'unmapped.form',
          create: () => ({
            fields: [{ key: 'mystery', type: 'cool-unregistered' }],
            model: { forbiddenModelSecret: 'do-not-emit' },
            formState: { forbiddenStateSecret: 'do-not-emit' }
          })
        }] }]
      };`,
    );

    const result = await runWorkspace(runnerOptions(workspaceRoot));
    const serializedOutputs = (
      await Promise.all(
        [result.indexPath, ...result.artifactPaths].map((path) =>
          readFile(join(workspaceRoot, path), 'utf8'),
        ),
      )
    ).join('\n');
    const project = result.index.projects[0];
    const profileIdentity = project?.fieldTypeProfileRegistry;
    const diagnostic = result.index.forms[0]?.diagnostics.find(
      ({ code }) => code === 'UNMAPPED_FIELD_TYPE',
    );

    expect(profileIdentity?.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(profileIdentity).toEqual({
      schemaVersion: '0.4.0',
      id: 'fixture.profiles',
      version: 1,
      contentHash: profileIdentity?.contentHash,
    });
    expect(diagnostic).toMatchObject({
      code: 'UNMAPPED_FIELD_TYPE',
      formlyType: 'cool-unregistered',
    });
    expect(result.index.plugins).toEqual([
      {
        id: 'fixture/plugin',
        version: '1.0.0',
        configSchemaVersion: '1',
      },
    ]);
    expect(serializedOutputs).not.toContain('forbiddenModelSecret');
    expect(serializedOutputs).not.toContain('forbiddenStateSecret');
    expect(serializedOutputs).not.toContain('forbiddenPluginSecret');
  });

  it('resolves configured effects into artifacts and indexes their full semantics', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/effects.project.mjs',
      `export default {
        projectId: 'claims',
        crossFieldEffects: {
          schemaVersion: '0.4.0', id: 'fixture.claim-effects', version: 1,
          forms: [{
            formId: 'claims.intake', coverage: 'complete', effects: [{
              identity: { id: 'fixture.product-controls-details', version: 1 },
              trigger: { nodeId: 'claims.intake::path:s_product', event: 'selectionChanged' },
              target: { nodeId: 'claims.intake::path:s_details', property: 'visibility' },
              kind: 'controls-state', timing: { mode: 'sync' },
              ordering: 'source-before-target', evidence: 'declared', opacity: 'transparent'
            }]
          }]
        },
        sources: [{ sourceId: 'claims/forms', list: () => [{
          id: 'claims.intake',
          create: () => ({ fields: [
            { key: 'product', type: 'select', props: { options: [{ label: 'Auto', value: 'auto' }] } },
            { key: 'details', type: 'textarea' }
          ] })
        }] }]
      };`,
    );

    const result = await runWorkspace(runnerOptions(workspaceRoot));
    const artifact = JSON.parse(
      await readFile(join(workspaceRoot, result.artifactPaths[0]!), 'utf8'),
    ) as Record<string, unknown>;

    expect(result.index.projects[0]?.crossFieldEffectRegistry).toMatchObject({
      schemaVersion: '0.4.0',
      id: 'fixture.claim-effects',
      version: 1,
    });
    expect(result.index.forms[0]).toMatchObject({
      declaredEffects: [
        {
          identity: { id: 'fixture.product-controls-details', version: 1 },
          trigger: {
            nodeId: 'claims.intake::path:s_product',
            event: 'selectionChanged',
          },
          target: {
            nodeId: 'claims.intake::path:s_details',
            property: 'visibility',
          },
          kind: 'controls-state',
          timing: { mode: 'sync' },
          ordering: 'source-before-target',
          evidence: 'declared',
          opacity: 'transparent',
        },
      ],
      effectAnalysis: { completeness: 'complete', reasons: [] },
    });
    expect(artifact).toMatchObject({
      declaredEffects: [
        {
          identity: {
            id: 'fixture.product-controls-details',
            version: 1,
          },
        },
      ],
      effectAnalysis: { completeness: 'complete', reasons: [] },
    });
  });

  it('honors CLI warning policy overrides', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        diagnostics: { failOn: [] },
        sources: [{ sourceId: 'forms', list: () => [{ id: 'warning.form', create: () => ({ fields: [{}] }) }] }]
      };`,
    );

    await expect(
      runWorkspace({
        ...runnerOptions(workspaceRoot),
        cliOverrides: { failOn: ['warning'] },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'DIAGNOSTIC_POLICY_FAILED',
        phase: 'extraction',
        formId: 'warning.form',
      }),
    );
  });

  it('hashes plugin options without emitting their keys or values', async () => {
    const firstWorkspace = await createTemporaryWorkspace();
    const secondWorkspace = await createTemporaryWorkspace();
    for (const [workspaceRoot, optionValue] of [
      [firstWorkspace, 'private-alpha'],
      [secondWorkspace, 'private-beta'],
    ] as const) {
      await seedRoot(
        workspaceRoot,
        `, plugins: [{
          id: 'fixture/plugin', version: '1.0.0', configSchemaVersion: '1',
          options: { privateOptionKey: '${optionValue}' }
        }]`,
      );
      await writeModule(
        workspaceRoot,
        'projects/forms.project.mjs',
        `export default {
          projectId: 'forms',
          sources: [{ sourceId: 'forms', list: () => [{
            id: 'stable.form',
            create: () => ({ fields: [{ key: 'name', type: 'input' }] })
          }] }]
        };`,
      );
    }

    const first = await runWorkspace(runnerOptions(firstWorkspace));
    const second = await runWorkspace(runnerOptions(secondWorkspace));
    const serializedOutputs = (
      await Promise.all([
        ...[first.indexPath, ...first.artifactPaths].map((path) =>
          readFile(join(firstWorkspace, path), 'utf8'),
        ),
        ...[second.indexPath, ...second.artifactPaths].map((path) =>
          readFile(join(secondWorkspace, path), 'utf8'),
        ),
      ])
    ).join('\n');

    expect(first.index.configurationHash).not.toBe(
      second.index.configurationHash,
    );
    expect(first.index.projects[0]?.configurationHash).not.toBe(
      second.index.projects[0]?.configurationHash,
    );
    expect(serializedOutputs).not.toContain('privateOptionKey');
    expect(serializedOutputs).not.toContain('private-alpha');
    expect(serializedOutputs).not.toContain('private-beta');
  });

  it('keeps project output paths contained within the workspace', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        output: { directory: '../outside' },
        sources: [{ sourceId: 'forms', list: () => [] }]
      };`,
    );

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
      expect.objectContaining({
        name: 'WorkspaceGenerationError',
        code: 'OUTPUT_PATH_OUTSIDE_WORKSPACE',
      }),
    );
  });

  it('canonicalizes safe output-directory spellings before hashing and indexing', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await seedRoot(
      workspaceRoot,
      `, output: { directory: './dist//contracts/' }`,
    );
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.form',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`,
    );

    const result = await runWorkspace(runnerOptions(workspaceRoot));

    expect(result.indexPath).toBe('dist/contracts/workspace-index.json');
    expect(result.index.projects[0]?.outputDirectory).toBe('dist/contracts');
    expect(result.artifactPaths[0]).toMatch(/^dist\/contracts\/projects\//u);
  });

  it.each(['./', '././', '.\\'])(
    'rejects workspace-root output alias %s through the stable runner error boundary',
    async (outputDirectory) => {
      const workspaceRoot = await createTemporaryWorkspace();
      await seedRoot(
        workspaceRoot,
        `, output: { directory: ${JSON.stringify(outputDirectory)} }`,
      );

      await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
        expect.objectContaining({
          name: 'WorkspaceGenerationError',
          code: 'OUTPUT_PATH_OUTSIDE_WORKSPACE',
          phase: 'inventory',
        }),
      );
    },
  );

  it('rejects symlinked output components without writing through them', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    const outside = await createTemporaryWorkspace();
    await seedRoot(workspaceRoot);
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{ id: 'claims.form', create: () => ({ fields: [{ key: 'name', type: 'input' }] }) }] }]
      };`,
    );
    await mkdir(join(workspaceRoot, 'dist'), { recursive: true });
    await symlink(outside, join(workspaceRoot, 'dist/formly-contracts'));

    await expect(runWorkspace(runnerOptions(workspaceRoot))).rejects.toEqual(
      expect.objectContaining({
        code: 'OUTPUT_SYMLINK_UNSUPPORTED',
        phase: 'output',
      }),
    );
    expect(await readdir(outside)).toEqual([]);
  });
});
