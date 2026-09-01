import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import type { JsonValue } from '@formly-contract/schema';
import { parseTsconfig } from 'get-tsconfig';

import {
  RUNTIME_HOST_PROTOCOL_VERSION,
  type RuntimeHostModuleDescriptor,
} from './protocol.js';

export interface RuntimePackageResolution {
  readonly specifier: string;
  readonly entryUrl: string;
  readonly packageJsonUrl: string;
}

export interface WorkspaceRuntimeBootstrapContext {
  readonly configPath: string;
  readonly runtimeResolutionBase: string;
  readonly tsconfigPath?: string;
  resolveRuntimePackage(
    specifier: string,
  ): Promise<RuntimePackageResolution | undefined>;
  readRuntimePackageMetadata(
    resolution: RuntimePackageResolution,
  ): Promise<Readonly<Record<string, unknown>>>;
  importResolvedRuntime(resolution: RuntimePackageResolution): Promise<unknown>;
  assertRuntimePackageAliasesAbsent(specifiers: readonly string[]): void;
}

export interface WorkspaceRuntimeBootstrapResult {
  readonly nativeModules?: readonly string[];
  readonly runtimePackages?: readonly {
    readonly name: string;
    readonly version: string;
  }[];
}

export interface WorkspaceRuntimeHost {
  readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
  readonly id: string;
  readonly version: string;
  beforeConfigLoad(
    context: WorkspaceRuntimeBootstrapContext,
  ): Promise<WorkspaceRuntimeBootstrapResult | void>;
}

export type WorkspaceRuntimeHostFactory = (
  options: JsonValue | undefined,
) => WorkspaceRuntimeHost | Promise<WorkspaceRuntimeHost>;

const PACKAGE_NAME_PATTERN = /^(?:@[^/]+\/[^/]+|[^/]+)$/u;

async function findPackageJson(entryPath: string): Promise<string> {
  let current = dirname(entryPath);
  for (;;) {
    const candidate = resolve(current, 'package.json');
    try {
      await realpath(candidate);
      return candidate;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        throw new Error('Resolved runtime package has no package.json.');
      }
      current = parent;
    }
  }
}

export function createWorkspaceRuntimeBootstrapContext(input: {
  readonly configPath: string;
  readonly runtimeResolutionBase: string;
  readonly tsconfigPath?: string;
}): WorkspaceRuntimeBootstrapContext {
  const requireFromProject = createRequire(
    resolve(input.runtimeResolutionBase, '__formly_contract_runtime__.cjs'),
  );
  return {
    configPath: input.configPath,
    runtimeResolutionBase: input.runtimeResolutionBase,
    ...(input.tsconfigPath === undefined ? {} : { tsconfigPath: input.tsconfigPath }),
    async resolveRuntimePackage(specifier) {
      if (!PACKAGE_NAME_PATTERN.test(specifier)) {
        throw new TypeError('Runtime package specifier must name a package root.');
      }
      let entryPath: string;
      try {
        entryPath = await realpath(requireFromProject.resolve(specifier));
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND')
        ) {
          return undefined;
        }
        throw error;
      }
      const packageJsonPath = await realpath(await findPackageJson(entryPath));
      return {
        specifier,
        entryUrl: pathToFileURL(entryPath).href,
        packageJsonUrl: pathToFileURL(packageJsonPath).href,
      };
    },
    async readRuntimePackageMetadata(resolution) {
      const packageJsonPath = new URL(resolution.packageJsonUrl);
      const parsed: unknown = JSON.parse(await readFile(packageJsonPath, 'utf8'));
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new TypeError('Runtime package metadata must be an object.');
      }
      return parsed as Readonly<Record<string, unknown>>;
    },
    importResolvedRuntime: (resolution) => import(resolution.entryUrl),
    assertRuntimePackageAliasesAbsent(specifiers) {
      if (input.tsconfigPath === undefined) return;
      const paths = parseTsconfig(input.tsconfigPath).compilerOptions?.paths;
      if (paths === undefined) return;
      const patterns = Object.keys(paths);
      const matches = (pattern: string, specifier: string): boolean => {
        const escaped = pattern
          .replace(/[.+?^${}()|[\]\\]/gu, '\\$&')
          .replaceAll('*', '.*');
        return new RegExp(`^${escaped}$`, 'u').test(specifier);
      };
      const conflict = patterns
        .sort()
        .find((pattern) =>
          specifiers.some(
            (specifier) =>
              matches(pattern, specifier) || matches(pattern, `${specifier}/testing`),
          ),
        );
      if (conflict !== undefined) {
        throw new TypeError(
          `tsconfig paths mapping ${JSON.stringify(conflict)} may replace a reserved runtime package.`,
        );
      }
    },
  };
}

export async function loadWorkspaceRuntimeHost(
  descriptor: RuntimeHostModuleDescriptor,
): Promise<WorkspaceRuntimeHost> {
  const imported: unknown = await import(descriptor.moduleUrl);
  if (typeof imported !== 'object' || imported === null) {
    throw new TypeError('Runtime host module must export an object namespace.');
  }
  const factory = Reflect.get(imported, descriptor.exportName) as unknown;
  if (typeof factory !== 'function') {
    throw new TypeError('Runtime host module factory is unavailable.');
  }
  const host = await (factory as WorkspaceRuntimeHostFactory)(descriptor.options);
  if (
    typeof host !== 'object' ||
    host?.protocolVersion !== descriptor.protocolVersion ||
    host.id !== descriptor.id ||
    host.version !== descriptor.version ||
    typeof host.beforeConfigLoad !== 'function'
  ) {
    throw new TypeError('Runtime host identity does not match its descriptor.');
  }
  return host;
}
