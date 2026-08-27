import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Any package directly under packages/ that is not explicitly private is
// treated as part of the published family. This is the one place a new
// @formly-contract/* package needs to touch to start releasing: clear
// `private: true` and satisfy assertReleasePackageMetadata. apps/* and
// fixtures/* never auto-publish regardless of their private flag; they must
// always be private, checked below.
async function findPublishablePackageDirectories(rootDirectory) {
  const entries = await readdir(join(rootDirectory, 'packages'), {
    withFileTypes: true,
  });
  const directories = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const directory = `packages/${entry.name}`;
    const manifest = await readPackageManifest(rootDirectory, directory);
    if (manifest.private !== true) {
      directories.push(directory);
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
    directory === 'packages/compiler' &&
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

// Packages version independently (Changesets owns version selection; see
// .changeset/). There is deliberately no repo-wide "the release version" or
// "the release tag" here anymore: a release run publishes whichever
// packages/* have a version not already on npm and skips the rest. See
// docs/releasing.md and ADR 0009 for the full flow.
export async function loadReleaseManifest({ rootDirectory } = {}) {
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
  const publishedPackageDirectories = await findPublishablePackageDirectories(
    resolvedRoot,
  );
  for (const directory of workspaceDirectories) {
    if (!publishedPackageDirectories.includes(directory)) {
      const manifest = await readPackageManifest(resolvedRoot, directory);
      if (manifest.private !== true) {
        throw new Error(`${directory} must remain private`);
      }
    }
  }

  if (publishedPackageDirectories.length === 0) {
    throw new Error('No publishable packages found under packages/');
  }

  const packages = [];
  for (const directory of publishedPackageDirectories) {
    const manifest = await readPackageManifest(resolvedRoot, directory);
    assertReleasePackageMetadata(directory, manifest);
    packages.push({
      directory,
      name: manifest.name,
      version: manifest.version,
    });
  }

  return { packages };
}

async function main() {
  if (process.argv.length > 2) {
    throw new Error(`Unknown argument: ${process.argv[2]}`);
  }
  const release = await loadReleaseManifest();
  console.log(JSON.stringify(release, null, 2));
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ''
) {
  await main();
}
