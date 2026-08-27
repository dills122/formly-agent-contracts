import { execFile as execFileCallback } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const PNPM_EXECUTABLE = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const PACKAGE_DIRECTORIES = [
  'packages/schema',
  'packages/compiler',
  'packages/workspace',
];
const WORKSPACE_PACKAGE_NAME = '@formly-contract/workspace';
const CLI_RELATIVE_PATH = 'dist/cli-main.js';

function hasWorkspaceDependency(manifest) {
  return [
    manifest.dependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
  ].some(
    (dependencies) =>
      dependencies !== undefined &&
      Object.values(dependencies).some(
        (version) =>
          typeof version === 'string' && version.startsWith('workspace:'),
      ),
  );
}

export function verifyPackedWorkspaceManifest(manifest) {
  if (manifest.name !== WORKSPACE_PACKAGE_NAME) {
    throw new Error(`Packed package must be ${WORKSPACE_PACKAGE_NAME}`);
  }
  if (manifest.bin?.['formly-contracts'] !== `./${CLI_RELATIVE_PATH}`) {
    throw new Error(
      'Packed workspace package must expose the formly-contracts binary',
    );
  }
  if (hasWorkspaceDependency(manifest)) {
    throw new Error(
      'Packed workspace package must not contain workspace: dependency ranges',
    );
  }
}

export function createPackedConsumerManifest(packages) {
  const byName = new Map(packages.map((package_) => [package_.name, package_]));
  const schema = byName.get('@formly-contract/schema');
  const compiler = byName.get('@formly-contract/compiler');
  const workspace = byName.get(WORKSPACE_PACKAGE_NAME);
  if (schema === undefined || compiler === undefined || workspace === undefined) {
    throw new Error('Packed smoke requires schema, compiler, and workspace');
  }

  const fileReference = (package_) => `file:${package_.tarballPath}`;
  return {
    name: 'formly-contract-packed-consumer-smoke',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: {
      '@angular/common': '20.3.29',
      '@angular/core': '20.3.29',
      '@angular/forms': '20.3.29',
      '@formly-contract/compiler': fileReference(compiler),
      '@formly-contract/schema': fileReference(schema),
      '@formly-contract/workspace': fileReference(workspace),
      '@ngx-formly/core': '6.1.8',
      rxjs: '7.8.2',
    },
    pnpm: {
      overrides: {
        [`@formly-contract/schema@${schema.version}`]: fileReference(schema),
        [`@formly-contract/compiler@${compiler.version}`]:
          fileReference(compiler),
      },
    },
  };
}

async function writeText(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

async function writeJson(path, value) {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runPnpm(arguments_, options = {}) {
  return execFile(PNPM_EXECUTABLE, arguments_, {
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
}

export function createConsumerInstallArguments(consumerRoot) {
  return [
    '--dir',
    consumerRoot,
    'install',
    '--prefer-offline',
    '--ignore-scripts',
    '--no-frozen-lockfile',
  ];
}

async function installConsumer(consumerRoot) {
  await runPnpm(createConsumerInstallArguments(consumerRoot), {
    cwd: consumerRoot,
  });
}

async function runConsumerCli(consumerRoot, arguments_, environment = {}) {
  return runPnpm(
    [
      '--dir',
      consumerRoot,
      'exec',
      'formly-contracts',
      ...arguments_,
    ],
    {
      cwd: consumerRoot,
      env: { ...process.env, ...environment },
    },
  );
}

async function assertGeneratedContract(consumerRoot, outputDirectory) {
  const indexPath = join(consumerRoot, outputDirectory, 'workspace-index.json');
  const index = JSON.parse(await readFile(indexPath, 'utf8'));
  if (index.forms?.length !== 1 || index.forms[0]?.formId !== 'consumer.claim') {
    throw new Error('Consumer smoke did not generate the expected form index');
  }
  const artifactPath = index.forms[0].artifactPath;
  const artifact = JSON.parse(
    await readFile(join(consumerRoot, artifactPath), 'utf8'),
  );
  if (
    artifact.formId !== 'consumer.claim' ||
    typeof artifact.contentHash !== 'string'
  ) {
    throw new Error('Consumer smoke generated an invalid contract artifact');
  }
}

async function seedLinkedConsumer(rootDirectory, consumerRoot) {
  await writeJson(join(consumerRoot, 'package.json'), {
    name: 'formly-contract-linked-consumer-smoke',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: {
      '@angular/common': '20.3.29',
      '@angular/core': '20.3.29',
      '@angular/forms': '20.3.29',
      '@formly-contract/compiler': `link:${join(rootDirectory, 'packages/compiler')}`,
      '@formly-contract/schema': `link:${join(rootDirectory, 'packages/schema')}`,
      '@formly-contract/workspace': `link:${join(rootDirectory, 'packages/workspace')}`,
      '@ngx-formly/core': '6.1.8',
      rxjs: '7.8.2',
    },
  });
  await writeJson(join(consumerRoot, 'tsconfig.json'), {
    compilerOptions: {
      baseUrl: '.',
      module: 'ES2022',
      moduleResolution: 'Bundler',
      paths: {
        '@consumer/forms': ['./src/forms.ts'],
      },
    },
  });
  await writeText(
    join(consumerRoot, 'formly-contracts.config.ts'),
    `import { defineConfig } from '@formly-contract/workspace';

export default defineConfig({
  projectConfigs: ['projects/*.project.ts'],
  tsconfigPath: 'tsconfig.json',
  output: { directory: 'output' },
});
`,
  );
  await writeText(
    join(consumerRoot, 'projects/consumer.project.ts'),
    `import { defineFormContractProject } from '@formly-contract/workspace';
import { consumerSource } from '@consumer/forms';

export default defineFormContractProject({
  projectId: 'consumer',
  sources: [consumerSource],
});
`,
  );
  await writeText(
    join(consumerRoot, 'src/forms.ts'),
    `import { writeFileSync } from 'node:fs';
import { defineFormContractSource } from '@formly-contract/workspace';

export const consumerSource = defineFormContractSource({
  sourceId: 'consumer/forms',
  list: () => [{
    id: 'consumer.claim',
    create: () => {
      const marker = process.env.FORMLY_CONTRACT_FACTORY_MARKER;
      if (marker === undefined) throw new Error('Factory marker is required.');
      writeFileSync(marker, 'invoked');
      return { fields: [{ key: 'claimant.name', type: 'input' }] };
    },
  }],
});
`,
  );
}

async function runLinkedSmoke(rootDirectory, temporaryDirectory) {
  const consumerRoot = join(temporaryDirectory, 'linked-consumer');
  const markerPath = join(consumerRoot, 'factory-invoked');
  await seedLinkedConsumer(rootDirectory, consumerRoot);
  await installConsumer(consumerRoot);

  const commonArguments = [
    '--workspace-root',
    consumerRoot,
    '--config',
    'formly-contracts.config.ts',
  ];
  const environment = { FORMLY_CONTRACT_FACTORY_MARKER: markerPath };
  const listed = await runConsumerCli(
    consumerRoot,
    ['list', ...commonArguments],
    environment,
  );
  if (!listed.stdout.includes('consumer/forms')) {
    throw new Error('Linked list smoke did not report the configured source');
  }
  if (await exists(markerPath)) {
    throw new Error('Linked list smoke invoked a form factory');
  }

  await runConsumerCli(
    consumerRoot,
    ['generate', ...commonArguments],
    environment,
  );
  if (!(await exists(markerPath))) {
    throw new Error('Linked generate smoke did not invoke the form factory');
  }
  await assertGeneratedContract(consumerRoot, 'output');
  const checked = await runConsumerCli(
    consumerRoot,
    ['check', ...commonArguments],
    environment,
  );
  if (!checked.stdout.includes('1 contract is current.')) {
    throw new Error('Linked check smoke did not validate current artifacts');
  }
}

async function readPackedManifest(tarballPath) {
  const { stdout } = await execFile('tar', [
    '-xOf',
    tarballPath,
    'package/package.json',
  ]);
  return JSON.parse(stdout);
}

async function packPackage(rootDirectory, packageDirectory, tarballDirectory) {
  const { stdout } = await runPnpm(
    [
      '--dir',
      join(rootDirectory, packageDirectory),
      'pack',
      '--json',
      '--pack-destination',
      tarballDirectory,
    ],
    { cwd: rootDirectory },
  );
  const parsed = JSON.parse(stdout);
  const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
  const tarballPath = resolve(packResult.filename);
  const manifest = await readPackedManifest(tarballPath);
  return {
    name: manifest.name,
    version: manifest.version,
    tarballPath,
    manifest,
  };
}

async function verifyPackedWorkspaceCli(workspacePackage, temporaryDirectory) {
  verifyPackedWorkspaceManifest(workspacePackage.manifest);
  const extractionRoot = join(temporaryDirectory, 'workspace-package');
  await mkdir(extractionRoot, { recursive: true });
  await execFile('tar', [
    '-xzf',
    workspacePackage.tarballPath,
    '--strip-components=1',
    '-C',
    extractionRoot,
  ]);
  const cliPath = join(extractionRoot, CLI_RELATIVE_PATH);
  const [cliBytes, cliStats] = await Promise.all([
    readFile(cliPath, 'utf8'),
    stat(cliPath),
  ]);
  if (!cliBytes.startsWith('#!/usr/bin/env node\n')) {
    throw new Error('Packed workspace CLI must retain its Node shebang');
  }
  if (process.platform !== 'win32' && (cliStats.mode & 0o111) === 0) {
    throw new Error('Packed workspace CLI must be executable');
  }
}

async function seedPackedConsumer(consumerRoot, packages) {
  await writeJson(
    join(consumerRoot, 'package.json'),
    createPackedConsumerManifest(packages),
  );
  await writeText(
    join(consumerRoot, 'formly-contracts.config.mjs'),
    `export default {
  projectConfigs: ['projects/*.project.mjs'],
  output: { directory: 'output' },
};
`,
  );
  await writeText(
    join(consumerRoot, 'projects/consumer.project.mjs'),
    `export default {
  projectId: 'consumer',
  sources: [{
    sourceId: 'consumer/forms',
    list: () => [{
      id: 'consumer.claim',
      create: () => ({ fields: [{ key: 'claimant.name', type: 'input' }] }),
    }],
  }],
};
`,
  );
}

async function runPackedSmoke(rootDirectory, temporaryDirectory) {
  const tarballDirectory = join(temporaryDirectory, 'tarballs');
  await mkdir(tarballDirectory, { recursive: true });
  const packages = [];
  for (const packageDirectory of PACKAGE_DIRECTORIES) {
    packages.push(
      await packPackage(rootDirectory, packageDirectory, tarballDirectory),
    );
  }
  const workspacePackage = packages.find(
    ({ name }) => name === WORKSPACE_PACKAGE_NAME,
  );
  if (workspacePackage === undefined) {
    throw new Error('Workspace tarball was not produced');
  }
  await verifyPackedWorkspaceCli(workspacePackage, temporaryDirectory);

  const consumerRoot = join(temporaryDirectory, 'packed-consumer');
  await seedPackedConsumer(consumerRoot, packages);
  await installConsumer(consumerRoot);
  const installedWorkspace = await realpath(
    join(consumerRoot, 'node_modules/@formly-contract/workspace'),
  );
  if (
    installedWorkspace === rootDirectory ||
    installedWorkspace.startsWith(`${rootDirectory}/`)
  ) {
    throw new Error('Packed consumer resolved workspace code from the repo');
  }

  await runConsumerCli(consumerRoot, [
    'generate',
    '--workspace-root',
    consumerRoot,
    '--config',
    'formly-contracts.config.mjs',
  ]);
  await assertGeneratedContract(consumerRoot, 'output');
}

export async function checkWorkspaceConsumers({ rootDirectory } = {}) {
  const resolvedRoot = resolve(
    rootDirectory ?? dirname(dirname(fileURLToPath(import.meta.url))),
  );
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), 'formly-contract-workspace-consumers-'),
  );
  try {
    await runLinkedSmoke(resolvedRoot, temporaryDirectory);
    await runPackedSmoke(resolvedRoot, temporaryDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  await checkWorkspaceConsumers();
  console.log('Verified linked and packed workspace CLI consumers.');
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ''
) {
  await main();
}
