import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { npmTagForVersion } from './release-manifest.mjs';

const execFile = promisify(execFileCallback);

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

async function readPackedManifest(tarballPath) {
  const { stdout } = await execFile('tar', [
    '-xOf',
    tarballPath,
    'package/package.json',
  ]);
  return JSON.parse(stdout);
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
