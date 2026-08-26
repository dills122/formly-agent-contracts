import { appendFile, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLISHED_PACKAGE_DIRECTORIES = [
  'packages/contract-schema',
  'packages/formly-adapter',
];
const WORKSPACE_DIRECTORIES = ['apps', 'fixtures', 'packages'];
export const RELEASE_REPOSITORY_URL =
  'git+https://github.com/dills122/formly-contract.git';
export const NPM_REGISTRY_URL = 'https://registry.npmjs.org/';
export const FORMLY_6_PEER_RANGE = '>=6.0.0 <7.0.0';
const SEMVER_PATTERN =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

async function readPackageManifest(rootDirectory, directory) {
  const manifestPath = join(rootDirectory, directory, 'package.json');
  const contents = await readFile(manifestPath, 'utf8');
  return JSON.parse(contents);
}

async function findWorkspacePackageDirectories(rootDirectory) {
  const directories = [];

  for (const workspaceDirectory of WORKSPACE_DIRECTORIES) {
    const entries = await readdir(join(rootDirectory, workspaceDirectory), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories.push(`${workspaceDirectory}/${entry.name}`);
      }
    }
  }

  return directories.sort();
}

function assertReleasePackageMetadata(directory, manifest) {
  if (manifest.private === true) {
    throw new Error(`${directory} must not be private`);
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new Error(`${directory} must define a package name`);
  }
  if (
    typeof manifest.description !== 'string' ||
    manifest.description.length === 0
  ) {
    throw new Error(`${directory} must define a package description`);
  }
  if (!SEMVER_PATTERN.test(manifest.version)) {
    throw new Error(`${directory} must define a valid semantic version`);
  }
  if (!Array.isArray(manifest.files) || !manifest.files.includes('dist')) {
    throw new Error(`${directory} must publish the dist directory`);
  }
  if (
    manifest.publishConfig?.access !== 'public' ||
    manifest.publishConfig?.registry !== NPM_REGISTRY_URL
  ) {
    throw new Error(
      `${directory} must publish publicly to the npm registry`,
    );
  }
  if (
    manifest.repository?.type !== 'git' ||
    manifest.repository?.url !== RELEASE_REPOSITORY_URL ||
    manifest.repository?.directory !== directory
  ) {
    throw new Error(`${directory} must identify its monorepo source directory`);
  }
  if (
    directory === 'packages/formly-adapter' &&
    manifest.peerDependencies?.['@ngx-formly/core'] !== FORMLY_6_PEER_RANGE
  ) {
    throw new Error(
      `${directory} must declare the supported Formly 6.x peer range`,
    );
  }
}

export function npmTagForVersion(version) {
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return version.includes('-') ? 'next' : 'latest';
}

export async function loadReleaseManifest({ rootDirectory, tag } = {}) {
  const resolvedRoot = resolve(
    rootDirectory ?? dirname(dirname(fileURLToPath(import.meta.url))),
  );
  const rootManifest = await readPackageManifest(resolvedRoot, '.');
  if (rootManifest.private !== true) {
    throw new Error('The workspace root must remain private');
  }

  const workspaceDirectories = await findWorkspacePackageDirectories(
    resolvedRoot,
  );
  for (const directory of workspaceDirectories) {
    if (!PUBLISHED_PACKAGE_DIRECTORIES.includes(directory)) {
      const manifest = await readPackageManifest(resolvedRoot, directory);
      if (manifest.private !== true) {
        throw new Error(`${directory} must remain private`);
      }
    }
  }

  const packages = [];
  for (const directory of PUBLISHED_PACKAGE_DIRECTORIES) {
    const manifest = await readPackageManifest(resolvedRoot, directory);
    assertReleasePackageMetadata(directory, manifest);
    packages.push({
      directory,
      name: manifest.name,
      version: manifest.version,
    });
  }

  const versions = new Set(packages.map((manifest) => manifest.version));
  if (versions.size !== 1) {
    throw new Error('Published package versions must match');
  }

  const version = packages[0]?.version;
  if (version === undefined) {
    throw new Error('No published packages are configured');
  }
  if (tag !== undefined && tag !== `v${version}`) {
    throw new Error(`Release tag ${tag} must equal v${version}`);
  }

  return {
    version,
    npmTag: npmTagForVersion(version),
    packages,
  };
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--tag' || argument === '--github-output') {
      const value = arguments_[index + 1];
      if (value === undefined) {
        throw new Error(`${argument} requires a value`);
      }
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const release = await loadReleaseManifest({ tag: options.tag });
  if (options['github-output'] !== undefined) {
    await appendFile(
      options['github-output'],
      `version=${release.version}\nnpm_tag=${release.npmTag}\n`,
    );
  }
  console.log(JSON.stringify(release, null, 2));
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ''
) {
  await main();
}
