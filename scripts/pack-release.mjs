// Builds `npm pack` tarballs for every publishable package (per
// release-manifest.mjs) and verifies each one before it's allowed to ship:
// correct manifest fields, no leftover `workspace:` dependency ranges, the
// required files present, and (for packages/compiler) the Formly 6.x peer
// range retained. Invoked as `pnpm pack:check` (verify only) and
// `pnpm release:pack --destination <dir>` (also copy tarballs out) from
// `.github/workflows/release.yml`. Assumes `packages/*/dist` has already
// been built (e.g. via `pnpm build:demo`) — it does not build anything
// itself.
import { execFile as execFileCallback } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  FORMLY_6_PEER_RANGE,
  loadReleaseManifest,
  NPM_REGISTRY_URL,
  RELEASE_REPOSITORY_URL,
} from './release-manifest.mjs';
import {
  PNPM_EXECUTABLE,
  hasWorkspaceDependency,
  readPackedManifest,
} from './tarball.mjs';

const execFile = promisify(execFileCallback);
const REQUIRED_FILES = [
  'LICENSE',
  'README.md',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
];

export function verifyPackedPackage({
  packedFiles,
  packedManifest,
  releasePackage,
}) {
  if (
    packedManifest.name !== releasePackage.name ||
    packedManifest.version !== releasePackage.version
  ) {
    throw new Error(
      `${releasePackage.directory} tarball must be ${releasePackage.name}@${releasePackage.version}`,
    );
  }

  if (hasWorkspaceDependency(packedManifest)) {
    throw new Error(
      `${releasePackage.directory} tarball must not contain workspace: dependency ranges`,
    );
  }

  if (
    releasePackage.directory === 'packages/compiler' &&
    packedManifest.peerDependencies?.['@ngx-formly/core'] !==
      FORMLY_6_PEER_RANGE
  ) {
    throw new Error(
      `${releasePackage.directory} tarball must retain the supported Formly 6.x peer range`,
    );
  }

  if (
    packedManifest.repository?.type !== 'git' ||
    packedManifest.repository?.url !== RELEASE_REPOSITORY_URL ||
    packedManifest.repository?.directory !== releasePackage.directory ||
    packedManifest.publishConfig?.access !== 'public' ||
    packedManifest.publishConfig?.registry !== NPM_REGISTRY_URL
  ) {
    throw new Error(
      `${releasePackage.directory} tarball has invalid repository or npm publish metadata`,
    );
  }

  const filePaths = packedFiles.map(({ path }) => path);
  for (const requiredFile of REQUIRED_FILES) {
    if (!filePaths.includes(requiredFile)) {
      throw new Error(
        `${releasePackage.directory} tarball is missing ${requiredFile}`,
      );
    }
  }

  for (const filePath of filePaths) {
    if (
      !filePath.startsWith('dist/') &&
      !['LICENSE', 'README.md', 'package.json'].includes(filePath)
    ) {
      throw new Error(
        `${releasePackage.directory} tarball contains unexpected file ${filePath}`,
      );
    }
  }
}

// Packages with a known required export get a specific regression check.
// Any other released package still gets a generic "the tarball actually
// imports" smoke test below, so adding a new published package never needs
// this map to grow before it can release — only packages with a load-bearing
// entry point worth pinning do.
const REQUIRED_EXPORT_BY_PACKAGE_NAME = {
  '@formly-contract/schema': 'parseFormContract',
  '@formly-contract/compiler': 'extractFormContract',
};

async function smokeTestTarballs(packages, temporaryDirectory) {
  const installRoot = join(temporaryDirectory, 'packed-install');
  for (const packedPackage of packages) {
    const packageDirectory = join(
      installRoot,
      'node_modules',
      ...packedPackage.name.split('/'),
    );
    await mkdir(packageDirectory, { recursive: true });
    await execFile('tar', [
      '-xzf',
      packedPackage.filename,
      '--strip-components=1',
      '-C',
      packageDirectory,
    ]);
  }

  for (const packedPackage of packages) {
    const module_ = await import(
      pathToFileURL(
        join(
          installRoot,
          'node_modules',
          ...packedPackage.name.split('/'),
          'dist/index.js',
        ),
      ).href
    );

    const requiredExport = REQUIRED_EXPORT_BY_PACKAGE_NAME[packedPackage.name];
    if (
      requiredExport !== undefined &&
      typeof module_[requiredExport] !== 'function'
    ) {
      throw new Error(
        `${packedPackage.name} does not export ${requiredExport}`,
      );
    }
  }
}

export async function packReleasePackages({
  destinationDirectory,
  rootDirectory,
} = {}) {
  if (destinationDirectory === undefined) {
    throw new Error('destinationDirectory is required');
  }
  const resolvedRoot = resolve(
    rootDirectory ?? dirname(dirname(fileURLToPath(import.meta.url))),
  );
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), 'formly-agent-release-pack-'),
  );
  const resolvedDestination = resolve(destinationDirectory);
  await mkdir(resolvedDestination, { recursive: true });

  try {
    const release = await loadReleaseManifest({ rootDirectory: resolvedRoot });
    const packedPackages = [];

    for (const releasePackage of release.packages) {
      const { stdout } = await execFile(
        PNPM_EXECUTABLE,
        [
          '--dir',
          join(resolvedRoot, releasePackage.directory),
          'pack',
          '--json',
          '--pack-destination',
          resolvedDestination,
        ],
        { cwd: resolvedRoot },
      );
      const packResult = JSON.parse(stdout);
      const packedManifest = await readPackedManifest(packResult.filename);
      verifyPackedPackage({
        packedFiles: packResult.files,
        packedManifest,
        releasePackage,
      });
      packedPackages.push({
        ...releasePackage,
        filename: packResult.filename,
      });
    }

    await smokeTestTarballs(packedPackages, temporaryDirectory);
    return packedPackages;
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--destination') {
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
  const temporaryOutputDirectory =
    options.destination === undefined
      ? await mkdtemp(join(tmpdir(), 'formly-agent-pack-check-'))
      : undefined;
  const destinationDirectory =
    options.destination ?? join(temporaryOutputDirectory, 'tarballs');

  try {
    const packages = await packReleasePackages({ destinationDirectory });
    if (options.destination === undefined) {
      console.log(
        `Verified ${packages.map(({ name, version }) => `${name}@${version}`).join(', ')}`,
      );
    } else {
      console.log(JSON.stringify(packages, null, 2));
    }
  } finally {
    if (temporaryOutputDirectory !== undefined) {
      await rm(temporaryOutputDirectory, { force: true, recursive: true });
    }
  }
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ''
) {
  await main();
}
