// Shared by check-workspace-consumers.mjs, pack-release.mjs, and
// publish-release.mjs: small helpers for reading and validating packed
// npm tarballs, and for locating the platform's pnpm executable.

import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

/** The pnpm executable name for the current platform. */
export const PNPM_EXECUTABLE =
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

/** Extracts and parses `package/package.json` from a packed npm tarball. */
export async function readPackedManifest(tarballPath) {
  const { stdout } = await execFile('tar', [
    '-xOf',
    tarballPath,
    'package/package.json',
  ]);
  return JSON.parse(stdout);
}

/**
 * True if any of a package manifest's dependency fields still contain a
 * `workspace:` range, which must never reach a published/packed tarball.
 */
export function hasWorkspaceDependency(manifest) {
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
