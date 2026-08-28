// Publishes already-packed release tarballs to npm. Invoked as
// `node scripts/publish-release.mjs <tarball...>` from the "Publish
// tarballs with npm trusted publishing" step in
// `.github/workflows/release.yml`, after npm has been upgraded to a
// version with OIDC trusted-publishing support — there is no NPM_TOKEN;
// npm authenticates via the GitHub Actions OIDC token instead. Safe to
// re-run: a tarball whose version already exists on the registry is
// skipped (or fails loudly if its contents don't match what's already
// published), so a partially-failed release run can simply be retried.
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { npmTagForVersion } from './release-manifest.mjs';
import { readPackedManifest } from './tarball.mjs';

const execFile = promisify(execFileCallback);

/**
 * Publishes one already-packed tarball to npm, unless a matching version is
 * already there.
 *
 * @param {object} options
 * @param {(identity: string) => Promise<string | undefined>} options.getRegistryIntegrity
 *   Looks up the `sha512-...` integrity hash npm has on record for
 *   `name@version`, or `undefined` if that version isn't published yet.
 * @param {{name: string, version: string}} options.manifest - The packed
 *   tarball's `package.json` (as read by `readPackedManifest`).
 * @param {string} options.npmTag - The dist-tag to publish under (see
 *   `npmTagForVersion`).
 * @param {(input: {npmTag: string, tarballPath: string}) => Promise<void>} options.publish
 *   Performs the actual `npm publish`.
 * @param {Buffer} options.tarball - The tarball's raw bytes, used to compute
 *   its local integrity hash for comparison.
 * @param {string} options.tarballPath - Filesystem path to the tarball,
 *   passed through to `publish`.
 * @returns {Promise<'existing' | 'published'>} `'existing'` when a matching
 *   version was already on npm and nothing was published; `'published'`
 *   when this call published it.
 * @throws {Error} if `name@version` already exists on npm with different
 *   integrity than the local tarball (a version was reused with different
 *   contents).
 */
export async function publishReleaseTarball({
  getRegistryIntegrity,
  manifest,
  npmTag,
  publish,
  tarball,
  tarballPath,
}) {
  const identity = `${manifest.name}@${manifest.version}`;
  const localIntegrity = `sha512-${createHash('sha512')
    .update(tarball)
    .digest('base64')}`;
  const registryIntegrity = await getRegistryIntegrity(identity);

  if (registryIntegrity !== undefined) {
    if (registryIntegrity !== localIntegrity) {
      throw new Error(`${identity} already exists with different integrity`);
    }
    return 'existing';
  }

  await publish({ npmTag, tarballPath });
  return 'published';
}

async function getRegistryIntegrity(identity) {
  try {
    const { stdout } = await execFile('npm', [
      'view',
      identity,
      'dist.integrity',
      '--json',
    ]);
    const value = stdout.trim();
    return value.length === 0 ? undefined : JSON.parse(value);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'stderr' in error &&
      typeof error.stderr === 'string' &&
      error.stderr.includes('E404')
    ) {
      return undefined;
    }
    throw error;
  }
}

async function publish({ npmTag, tarballPath }) {
  const { stderr, stdout } = await execFile('npm', [
    'publish',
    tarballPath,
    '--access',
    'public',
    '--tag',
    npmTag,
  ]);
  if (stdout.length > 0) {
    process.stdout.write(stdout);
  }
  if (stderr.length > 0) {
    process.stderr.write(stderr);
  }
}

// Packages version independently now, so there is no single release-wide
// npm dist-tag to pass in. Each tarball's own version decides its dist-tag
// (`latest` for a stable version, `next` for a prerelease).
function parseArguments(arguments_) {
  const tarballPaths = [];
  for (const argument of arguments_) {
    if (argument.startsWith('-')) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    tarballPaths.push(resolve(argument));
  }
  if (tarballPaths.length === 0) {
    throw new Error('At least one release tarball is required');
  }
  return { tarballPaths: tarballPaths.sort() };
}

async function main() {
  const { tarballPaths } = parseArguments(process.argv.slice(2));
  for (const tarballPath of tarballPaths) {
    const manifest = await readPackedManifest(tarballPath);
    const npmTag = npmTagForVersion(manifest.version);

    const status = await publishReleaseTarball({
      getRegistryIntegrity,
      manifest,
      npmTag,
      publish,
      tarball: await readFile(tarballPath),
      tarballPath,
    });
    console.log(`${manifest.name}@${manifest.version}: ${status}`);
  }
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  relative(resolve(scriptPath), fileURLToPath(import.meta.url)) === ''
) {
  await main();
}
