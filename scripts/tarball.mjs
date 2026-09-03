// Shared by check-workspace-consumers.mjs, pack-release.mjs, and
// publish-release.mjs: small helpers for reading and validating packed
// npm tarballs, and for locating the platform's pnpm executable.

import { execFile as execFileCallback } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const rootManifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

if (
  typeof rootManifest.packageManager !== 'string' ||
  !/^pnpm@[^\s]+$/u.test(rootManifest.packageManager)
) {
  throw new Error('Root package.json must pin packageManager to pnpm');
}

/** Exact pnpm package-manager identity pinned by the workspace. */
export const PINNED_PNPM_PACKAGE_MANAGER = rootManifest.packageManager;
export const PINNED_PNPM_VERSION = PINNED_PNPM_PACKAGE_MANAGER.slice(
  'pnpm@'.length,
);

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
