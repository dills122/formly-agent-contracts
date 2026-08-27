import { readFile } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

type RuntimeDependencyName =
  | '@formly-contract/compiler'
  | '@formly-contract/schema'
  | 'jiti';

interface PackageManifest {
  readonly name?: unknown;
  readonly version?: unknown;
}

export interface RuntimeToolVersions {
  readonly workspaceVersion: string;
  readonly compilerVersion: string;
  readonly schemaVersion: string;
  readonly jitiVersion: string;
}

export interface ReadRuntimeToolVersionsOptions {
  readonly workspaceManifestUrl?: URL;
  readonly resolveModule?: (name: RuntimeDependencyName) => string;
}

async function readPackageManifest(path: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(path, 'utf8')) as PackageManifest;
}

function exactPackageVersion(
  manifest: PackageManifest,
  expectedName: string,
  manifestPath: string,
): string {
  if (
    manifest.name !== expectedName ||
    typeof manifest.version !== 'string' ||
    manifest.version.length === 0
  ) {
    throw new TypeError(
      `Invalid package metadata for ${expectedName} at ${manifestPath}.`,
    );
  }
  return manifest.version;
}

async function readResolvedPackageVersion(
  name: RuntimeDependencyName,
  resolveModule: (name: RuntimeDependencyName) => string,
): Promise<string> {
  const entryUrl = new URL(resolveModule(name));
  if (entryUrl.protocol !== 'file:') {
    throw new TypeError(`Resolved ${name} entry must use the file: protocol.`);
  }
  let directory = dirname(fileURLToPath(entryUrl));
  const root = parse(directory).root;
  while (directory !== root) {
    const manifestPath = join(directory, 'package.json');
    try {
      const manifest = await readPackageManifest(manifestPath);
      if (manifest.name === name) {
        return exactPackageVersion(manifest, name, manifestPath);
      }
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : undefined;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') {
        throw error;
      }
    }
    directory = dirname(directory);
  }
  throw new TypeError(`Unable to locate the resolved package manifest for ${name}.`);
}

export async function readRuntimeToolVersions(
  options: ReadRuntimeToolVersionsOptions = {},
): Promise<RuntimeToolVersions> {
  const workspaceManifestUrl =
    options.workspaceManifestUrl ?? new URL('../package.json', import.meta.url);
  if (workspaceManifestUrl.protocol !== 'file:') {
    throw new TypeError('Workspace package metadata must use the file: protocol.');
  }
  const workspaceManifestPath = fileURLToPath(workspaceManifestUrl);
  const workspaceManifest = await readPackageManifest(workspaceManifestPath);
  const resolveModule =
    options.resolveModule ?? ((name: RuntimeDependencyName) => import.meta.resolve(name));
  const [compilerVersion, schemaVersion, jitiVersion] = await Promise.all([
    readResolvedPackageVersion('@formly-contract/compiler', resolveModule),
    readResolvedPackageVersion('@formly-contract/schema', resolveModule),
    readResolvedPackageVersion('jiti', resolveModule),
  ]);
  return {
    workspaceVersion: exactPackageVersion(
      workspaceManifest,
      '@formly-contract/workspace',
      workspaceManifestPath,
    ),
    compilerVersion,
    schemaVersion,
    jitiVersion,
  };
}
