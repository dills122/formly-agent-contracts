import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runWorkspaceCli } from './cli.js';
import { WorkspaceConfigLoadError } from './config-loader.js';
import { WorkspaceGenerationError } from './run-workspace.js';

const temporaryDirectories: string[] = [];

async function createTemporaryWorkspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'formly workspace cli '));
  temporaryDirectories.push(directory);
  await writeFile(
    join(directory, 'pnpm-lock.yaml'),
    "lockfileVersion: '9.0'\n",
  );
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

function captureIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: { write: (value: string) => void stdout.push(value) },
      stderr: { write: (value: string) => void stderr.push(value) },
    },
  };
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

describe('workspace CLI', () => {
  it('prints help without invoking generation', async () => {
    const captured = captureIo();
    const generate = vi.fn();
    const list = vi.fn();
    const check = vi.fn();
    const authorFactoryInputs = vi.fn();

    await expect(
      runWorkspaceCli(['--help'], {
        ...captured.io,
        generate,
        list,
        check,
        authorFactoryInputs,
      }),
    ).resolves.toBe(0);

    expect(generate).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
    expect(authorFactoryInputs).not.toHaveBeenCalled();
    expect(captured.stdout.join('')).toContain('formly-contracts <command>');
    expect(captured.stdout.join('')).toContain('generate');
    expect(captured.stdout.join('')).toContain('list');
    expect(captured.stdout.join('')).toContain('check');
    expect(captured.stdout.join('')).toContain('author-factory-inputs');
    expect(captured.stderr).toEqual([]);
  });

  it('prints deterministic local factory-input drafts without writing them', async () => {
    const captured = captureIo();
    const authorFactoryInputs = vi.fn().mockResolvedValue({
      drafts: [
        {
          projectId: 'claims',
          sourceId: 'claims/forms',
          formId: 'claims.indexing',
          factorySymbol: 'IndexingFormConfig',
          suggestedPath:
            'libs/forms/indexing-form.contract.factory-input.generated.ts',
          metrics: {
            generated: 3,
            explicit: 2,
            ambiguous: 0,
            unsupported: 1,
            coverage: 'incomplete',
            unattributedAmbiguity: true,
          },
          code: 'export const draft = {} as const;\n',
          review: {
            formId: 'claims.indexing',
            coverage: 'incomplete',
            generated: [],
            explicit: [],
            unsupported: [],
            diagnostics: [],
          },
        },
      ],
      diagnostics: [],
    });

    await expect(
      runWorkspaceCli(
        [
          'author-factory-inputs',
          '--workspace-root',
          '/workspace',
          '--config',
          'config/formly.ts',
          '--form-id',
          'claims.indexing',
        ],
        { ...captured.io, authorFactoryInputs },
      ),
    ).resolves.toBe(0);

    expect(authorFactoryInputs).toHaveBeenCalledWith({
      workspaceRoot: '/workspace',
      rootConfigPath: 'config/formly.ts',
      formIds: ['claims.indexing'],
    });
    expect(captured.stdout.join('')).toBe(
      'Factory input draft: project=claims source=claims/forms form=claims.indexing factory=IndexingFormConfig\n' +
        'Suggested path: libs/forms/indexing-form.contract.factory-input.generated.ts\n' +
        'Review: generated=3 explicit=2 ambiguous=0 unsupported=1 coverage=incomplete unattributedAmbiguity=true\n' +
        'export const draft = {} as const;\n',
    );
    expect(captured.stderr).toEqual([]);
  });

  it('returns a stable failure for an unavailable requested authoring root', async () => {
    const captured = captureIo();
    const authorFactoryInputs = vi.fn().mockResolvedValue({
      drafts: [],
      diagnostics: [
        {
          code: 'FACTORY_INPUT_AUTHORING_FORM_NOT_FOUND',
          formId: 'claims.missing',
        },
      ],
    });

    await expect(
      runWorkspaceCli(
        ['author-factory-inputs', '--form-id', 'claims.missing'],
        { ...captured.io, authorFactoryInputs },
      ),
    ).resolves.toBe(1);

    expect(captured.stdout).toEqual([]);
    expect(captured.stderr.join('')).toBe(
      'Factory input authoring diagnostic [FACTORY_INPUT_AUTHORING_FORM_NOT_FOUND] form=claims.missing\n',
    );
  });

  it('reports safe workspace failures while authoring factory inputs', async () => {
    const captured = captureIo();
    const authorFactoryInputs = vi.fn().mockRejectedValue(
      new WorkspaceGenerationError(
        'SOURCE_USAGE_INDEX_FAILED',
        'extraction',
        { projectId: 'claims', formId: 'claims.indexing' },
        new Error('private TypeScript program detail'),
      ),
    );

    await expect(
      runWorkspaceCli(['author-factory-inputs'], {
        ...captured.io,
        authorFactoryInputs,
      }),
    ).resolves.toBe(1);

    expect(captured.stderr.join('')).toBe(
      'Authoring failed [SOURCE_USAGE_INDEX_FAILED] phase=extraction project=claims form=claims.indexing\n' +
        'Source-usage indexing failed.\n',
    );
    expect(captured.stderr.join('')).not.toContain(
      'private TypeScript program detail',
    );
  });

  it('uses safe config-load guidance for factory-input authoring', async () => {
    const captured = captureIo();
    const privateConfigPath = '/private/workspace/apps/claims/project.ts';
    const authorFactoryInputs = vi.fn().mockRejectedValue(
      new WorkspaceConfigLoadError(
        'CONFIG_LOAD_FAILED',
        privateConfigPath,
        `Unable to load workspace config: ${privateConfigPath}`,
        new Error('Cannot import private Angular package @company/forms'),
      ),
    );

    await expect(
      runWorkspaceCli(['author-factory-inputs'], {
        ...captured.io,
        authorFactoryInputs,
      }),
    ).resolves.toBe(1);

    expect(captured.stderr.join('')).toBe(
      'Authoring failed [WORKSPACE_DISCOVERY_FAILED]\n' +
        'Workspace factory input inspection failed.\n' +
        'Hint: verify tsconfigPath and import a Node-safe contracts entry point; Angular browser barrels may require a dedicated contracts shim.\n',
    );
    expect(captured.stderr.join('')).not.toContain(privateConfigPath);
    expect(captured.stderr.join('')).not.toContain('@company/forms');
  });

  it('lists deterministic project and source inventory', async () => {
    const captured = captureIo();
    const list = vi.fn().mockResolvedValue({
      inventory: {
        schemaVersion: '0.2.0',
        rootConfigPath: 'config/formly.ts',
        plugins: [],
        projects: [
          {
            configPath: 'apps/claims/formly-contracts.project.ts',
            projectId: 'claims',
            sourceIds: ['claims/core', 'claims/shared'],
          },
        ],
      },
    });

    await expect(
      runWorkspaceCli(
        [
          'list',
          '--workspace-root',
          '/workspace',
          '--config',
          'config/formly.ts',
        ],
        { ...captured.io, list },
      ),
    ).resolves.toBe(0);

    expect(list).toHaveBeenCalledWith({
      workspaceRoot: '/workspace',
      rootConfigPath: 'config/formly.ts',
    });
    expect(captured.stdout.join('')).toBe(
      'Discovered 1 project and 2 sources.\n' +
        'Project: claims config="apps/claims/formly-contracts.project.ts" sources=claims/core,claims/shared\n',
    );
    expect(captured.stderr).toEqual([]);
  });

  it('reports a current artifact set from check', async () => {
    const captured = captureIo();
    const check = vi.fn().mockResolvedValue({
      indexPath: 'dist/contracts/workspace-index.json',
      artifactPaths: ['dist/contracts/claims.json'],
      differences: [],
    });

    await expect(
      runWorkspaceCli(['check'], {
        ...captured.io,
        cwd: () => '/workspace',
        check,
      }),
    ).resolves.toBe(0);

    expect(check).toHaveBeenCalledWith({
      workspaceRoot: '/workspace',
      rootConfigPath: 'formly-contracts.config.ts',
    });
    expect(captured.stdout.join('')).toBe(
      '1 contract is current.\nIndex: dist/contracts/workspace-index.json\n',
    );
    expect(captured.stderr).toEqual([]);
  });

  it('prints an opted-in source-usage catalog and its fail-closed diagnostics', async () => {
    const captured = captureIo();
    const check = vi.fn().mockResolvedValue({
      indexPath: 'dist/contracts/workspace-index.json',
      artifactPaths: ['dist/contracts/claims.json'],
      sourceUsageCatalogPath: 'dist/contracts/source-usage-catalog.json',
      sourceUsageDiagnostics: [
        {
          code: 'FORM_DEFINITION_MISSING',
          projectId: 'claims',
          formId: 'claims.legacy',
        },
      ],
      differences: [],
    });

    await expect(
      runWorkspaceCli(['check'], {
        ...captured.io,
        cwd: () => '/workspace',
        check,
      }),
    ).resolves.toBe(0);

    expect(captured.stdout.join('')).toBe(
      '1 contract is current.\n' +
        'Index: dist/contracts/workspace-index.json\n' +
        'Source usage: dist/contracts/source-usage-catalog.json\n' +
        'Source usage diagnostic [FORM_DEFINITION_MISSING] project=claims form=claims.legacy\n',
    );
    expect(captured.stderr).toEqual([]);
  });

  it('reports missing and stale artifact paths from check', async () => {
    const captured = captureIo();
    const check = vi.fn().mockResolvedValue({
      indexPath: 'dist/contracts/workspace-index.json',
      artifactPaths: ['dist/contracts/claims.json'],
      differences: [
        { path: 'dist/contracts/claims.json', status: 'stale' },
        { path: 'dist/contracts/workspace-index.json', status: 'missing' },
      ],
    });

    await expect(
      runWorkspaceCli(['check'], { ...captured.io, check }),
    ).resolves.toBe(1);

    expect(captured.stdout).toEqual([]);
    expect(captured.stderr.join('')).toBe(
      'Contract artifacts are not current.\n' +
        'Stale: "dist/contracts/claims.json"\n' +
        'Missing: "dist/contracts/workspace-index.json"\n',
    );
  });

  it('forwards explicit generate options and prints a concise result', async () => {
    const captured = captureIo();
    const generate = vi.fn().mockResolvedValue({
      indexPath: 'artifacts/workspace-index.json',
      artifactPaths: ['artifacts/one.contract.json'],
      index: { forms: [{}] },
    });

    const exitCode = await runWorkspaceCli(
      [
        'generate',
        '--workspace-root',
        '/workspace',
        '--config',
        'config/formly.ts',
        '--output',
        'artifacts',
        '--fail-on',
        'warning',
        '--fail-on',
        'error',
      ],
      { ...captured.io, generate },
    );

    expect(exitCode).toBe(0);
    expect(generate).toHaveBeenCalledWith({
      workspaceRoot: '/workspace',
      rootConfigPath: 'config/formly.ts',
      cliOverrides: {
        outputDirectory: 'artifacts',
        failOn: ['warning', 'error'],
      },
    });
    expect(captured.stdout.join('')).toBe(
      'Generated 1 contract.\nIndex: artifacts/workspace-index.json\n',
    );
    expect(captured.stderr).toEqual([]);
  });

  it('prints the generated source-usage catalog when configured', async () => {
    const captured = captureIo();
    const generate = vi.fn().mockResolvedValue({
      indexPath: 'artifacts/workspace-index.json',
      artifactPaths: ['artifacts/one.contract.json'],
      sourceUsageCatalogPath: 'artifacts/source-usage-catalog.json',
      sourceUsageDiagnostics: [],
    });

    await expect(
      runWorkspaceCli(['generate'], {
        ...captured.io,
        generate,
      }),
    ).resolves.toBe(0);

    expect(captured.stdout.join('')).toBe(
      'Generated 1 contract.\n' +
        'Index: artifacts/workspace-index.json\n' +
        'Source usage: artifacts/source-usage-catalog.json\n',
    );
    expect(captured.stderr).toEqual([]);
  });

  it('returns a stable usage exit code for invalid input', async () => {
    const captured = captureIo();

    await expect(
      runWorkspaceCli(['observe'], captured.io),
    ).resolves.toBe(2);

    expect(captured.stderr.join('')).toContain('Usage error:');
    expect(captured.stderr.join('')).toContain('formly-contracts --help');
    expect(captured.stderr.join('')).not.toContain('at runWorkspaceCli');
  });

  it('reports stable generation provenance without exposing a cause or stack', async () => {
    const captured = captureIo();
    const generate = vi.fn().mockRejectedValue(
      new WorkspaceGenerationError(
        'FORM_FACTORY_FAILED',
        'extraction',
        {
          projectId: 'claims',
          sourceId: 'claims/forms',
          formId: 'claims.create',
          outputPath: 'dist/contracts\nforged-line',
        },
        new Error('private factory detail'),
      ),
    );

    await expect(
      runWorkspaceCli(['generate'], {
        ...captured.io,
        cwd: () => '/workspace',
        generate,
      }),
    ).resolves.toBe(1);

    expect(captured.stderr.join('')).toBe(
      'Generation failed [FORM_FACTORY_FAILED] phase=extraction project=claims source=claims/forms form=claims.create output="dist/contracts\\nforged-line"\nA form contract factory failed.\n',
    );
    expect(captured.stderr.join('')).not.toContain('private factory detail');
    expect(captured.stderr.join('').split('\n')).toHaveLength(3);
    expect(captured.stderr.join('')).not.toContain(' at ');
  });

  it('suggests Node-safe contract imports for config-load failures without exposing the cause', async () => {
    const captured = captureIo();
    const privateConfigPath = '/private/workspace/apps/claims/project.ts';
    const privateCause = new WorkspaceConfigLoadError(
      'CONFIG_LOAD_FAILED',
      privateConfigPath,
      `Unable to load workspace config: ${privateConfigPath}`,
      new Error('Cannot import private Angular package @company/forms'),
    );
    const generate = vi.fn().mockRejectedValue(
      new WorkspaceGenerationError(
        'WORKSPACE_DISCOVERY_FAILED',
        'inventory',
        {},
        privateCause,
      ),
    );

    await expect(
      runWorkspaceCli(['generate'], {
        ...captured.io,
        cwd: () => '/workspace',
        generate,
      }),
    ).resolves.toBe(1);

    expect(captured.stderr.join('')).toBe(
      'Generation failed [WORKSPACE_DISCOVERY_FAILED] phase=inventory\n' +
        'Workspace discovery failed.\n' +
        'Hint: verify tsconfigPath and import a Node-safe contracts entry point; Angular browser barrels may require a dedicated contracts shim.\n',
    );
    expect(captured.stderr.join('')).not.toContain(privateConfigPath);
    expect(captured.stderr.join('')).not.toContain('@company/forms');
  });

  it('uses the same safe config-load guidance for list failures', async () => {
    const captured = captureIo();
    const privateConfigPath = '/private/workspace/apps/claims/project.ts';
    const list = vi.fn().mockRejectedValue(
      new WorkspaceConfigLoadError(
        'CONFIG_LOAD_FAILED',
        privateConfigPath,
        `Unable to load workspace config: ${privateConfigPath}`,
        new Error('Cannot import private Angular package @company/forms'),
      ),
    );

    await expect(
      runWorkspaceCli(['list'], {
        ...captured.io,
        cwd: () => '/workspace',
        list,
      }),
    ).resolves.toBe(1);

    expect(captured.stderr.join('')).toBe(
      'List failed [WORKSPACE_DISCOVERY_FAILED]\n' +
        'Workspace discovery failed.\n' +
        'Hint: verify tsconfigPath and import a Node-safe contracts entry point; Angular browser barrels may require a dedicated contracts shim.\n',
    );
    expect(captured.stderr.join('')).not.toContain(privateConfigPath);
    expect(captured.stderr.join('')).not.toContain('@company/forms');
  });

  it('executes generate against a real temporary workspace', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.mjs',
      `export default { projectConfigs: ['projects/*.project.mjs'] };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.create',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`,
    );
    const captured = captureIo();

    await expect(
      runWorkspaceCli(
        [
          'generate',
          '--workspace-root',
          workspaceRoot,
          '--config',
          'formly-contracts.config.mjs',
        ],
        captured.io,
      ),
    ).resolves.toBe(0);

    const indexPath = join(
      workspaceRoot,
      'dist/formly-contracts/workspace-index.json',
    );
    const index = JSON.parse(await readFile(indexPath, 'utf8')) as {
      readonly forms: readonly { readonly formId: string }[];
    };
    expect(index.forms).toEqual([
      expect.objectContaining({ formId: 'claims.create' }),
    ]);
    expect(captured.stdout.join('')).toContain('Generated 1 contract.');
    expect(captured.stderr).toEqual([]);
  });

  it('executes list, generate, and check against one real workspace without listing factories', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    const factoryMarker = join(workspaceRoot, 'factory-ran.txt');
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.mjs',
      `export default { projectConfigs: ['projects/*.project.mjs'] };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `import { writeFileSync } from 'node:fs';
       export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.create',
          create: () => {
            writeFileSync(${JSON.stringify(factoryMarker)}, 'ran');
            return { fields: [{ key: 'name', type: 'input' }] };
          }
        }] }]
      };`,
    );
    const listIo = captureIo();

    await expect(
      runWorkspaceCli(
        [
          'list',
          '--workspace-root',
          workspaceRoot,
          '--config',
          'formly-contracts.config.mjs',
        ],
        listIo.io,
      ),
    ).resolves.toBe(0);

    expect(await pathExists(factoryMarker)).toBe(false);
    expect(listIo.stdout.join('')).toContain(
      'Discovered 1 project and 1 source.',
    );
    const generateIo = captureIo();
    await expect(
      runWorkspaceCli(
        [
          'generate',
          '--workspace-root',
          workspaceRoot,
          '--config',
          'formly-contracts.config.mjs',
        ],
        generateIo.io,
      ),
    ).resolves.toBe(0);
    expect(await pathExists(factoryMarker)).toBe(true);
    await rm(factoryMarker);
    const checkIo = captureIo();
    await expect(
      runWorkspaceCli(
        [
          'check',
          '--workspace-root',
          workspaceRoot,
          '--config',
          'formly-contracts.config.mjs',
        ],
        checkIo.io,
      ),
    ).resolves.toBe(0);
    expect(await pathExists(factoryMarker)).toBe(true);
    expect(checkIo.stdout.join('')).toContain('1 contract is current.');
  });

  it('detects missing and stale files through real check commands without repairing them', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.mjs',
      `export default { projectConfigs: ['projects/*.project.mjs'] };`,
    );
    await writeModule(
      workspaceRoot,
      'projects/forms.project.mjs',
      `export default {
        projectId: 'forms',
        sources: [{ sourceId: 'forms', list: () => [{
          id: 'claims.create',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }] }]
      };`,
    );
    const args = [
      '--workspace-root',
      workspaceRoot,
      '--config',
      'formly-contracts.config.mjs',
    ];
    await expect(
      runWorkspaceCli(['generate', ...args], captureIo().io),
    ).resolves.toBe(0);
    const outputDirectory = join(workspaceRoot, 'dist/formly-contracts');
    const indexPath = join(outputDirectory, 'workspace-index.json');
    const index = JSON.parse(await readFile(indexPath, 'utf8')) as {
      readonly forms: readonly { readonly artifactPath: string }[];
    };
    const artifactPath = join(workspaceRoot, index.forms[0]!.artifactPath);
    await writeFile(artifactPath, 'stale bytes\n');
    const staleIo = captureIo();

    await expect(
      runWorkspaceCli(['check', ...args], staleIo.io),
    ).resolves.toBe(1);

    expect(staleIo.stderr.join('')).toContain('Stale:');
    expect(await readFile(artifactPath, 'utf8')).toBe('stale bytes\n');
    await rm(indexPath);
    const missingIo = captureIo();
    await expect(
      runWorkspaceCli(['check', ...args], missingIo.io),
    ).resolves.toBe(1);
    expect(missingIo.stderr.join('')).toContain('Missing:');
    expect(await pathExists(indexPath)).toBe(false);
  });

  it('generates from a consumer project loaded through an exact scoped tsconfig alias', async () => {
    const workspaceRoot = await createTemporaryWorkspace();
    await writeModule(
      workspaceRoot,
      'tsconfig.base.json',
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          module: 'esnext',
          moduleResolution: 'node',
          paths: {
            '@consumer/forms-ui-kit': [
              'libs/forms-ui-kit/src/contracts-shim.ts',
            ],
          },
        },
      }),
    );
    await writeModule(
      workspaceRoot,
      'formly-contracts.config.ts',
      `export default {
        projectConfigs: ['apps/**/formly-contracts.project.ts'],
        tsconfigPath: 'tsconfig.base.json'
      };`,
    );
    await writeModule(
      workspaceRoot,
      'libs/forms-ui-kit/src/contracts-shim.ts',
      `export const FORMS_SOURCE = {
        sourceId: 'consumer/forms',
        list: () => [{
          id: 'consumer.claim',
          create: () => ({ fields: [{ key: 'name', type: 'input' }] })
        }]
      };`,
    );
    await writeModule(
      workspaceRoot,
      'apps/claims/formly-contracts.project.ts',
      `import { FORMS_SOURCE } from '@consumer/forms-ui-kit';
       export default { projectId: 'consumer/claims', sources: [FORMS_SOURCE] };`,
    );
    const captured = captureIo();

    await expect(
      runWorkspaceCli(
        [
          'generate',
          '--workspace-root',
          workspaceRoot,
          '--config',
          'formly-contracts.config.ts',
        ],
        captured.io,
      ),
    ).resolves.toBe(0);

    expect(captured.stdout.join('')).toContain('Generated 1 contract.');
    expect(captured.stderr).toEqual([]);
  });
});
