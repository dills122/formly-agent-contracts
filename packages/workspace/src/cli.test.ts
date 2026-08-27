import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

    await expect(
      runWorkspaceCli(['--help'], { ...captured.io, generate }),
    ).resolves.toBe(0);

    expect(generate).not.toHaveBeenCalled();
    expect(captured.stdout.join('')).toContain(
      'formly-contracts generate [options]',
    );
    expect(captured.stderr).toEqual([]);
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
