import type {
  RuntimePackageResolution,
  WorkspaceRuntimeBootstrapContext,
  WorkspaceRuntimeBootstrapResult,
  WorkspaceRuntimeHost,
} from '@formly-contract/workspace/runtime-host';

import {
  ANGULAR_JIT_RUNTIME_HOST_ID,
  ANGULAR_JIT_RUNTIME_HOST_VERSION,
} from './jit.js';

const RUNTIME_PACKAGES = [
  '@angular/compiler',
  '@angular/core',
  '@ngx-formly/core',
] as const;

function packageVersion(
  metadata: Readonly<Record<string, unknown>>,
  expectedName: string,
): string {
  if (metadata.name !== expectedName || typeof metadata.version !== 'string') {
    throw new TypeError(`Runtime metadata is invalid for ${expectedName}.`);
  }
  return metadata.version;
}

function isSupportedAngularVersion(version: string): boolean {
  return /^20\.[0-9]+\.[0-9]+(?:[-+].+)?$/u.test(version);
}

async function requireResolution(
  context: WorkspaceRuntimeBootstrapContext,
  specifier: string,
): Promise<RuntimePackageResolution> {
  const resolution = await context.resolveRuntimePackage(specifier);
  if (resolution === undefined) {
    throw new TypeError(`Required runtime package is unavailable: ${specifier}.`);
  }
  return resolution;
}

function ambientCompilerFacadePresent(): boolean {
  const angularGlobal = Reflect.get(globalThis, 'ng') as unknown;
  return (
    typeof angularGlobal === 'object' &&
    angularGlobal !== null &&
    Reflect.has(angularGlobal, 'ɵcompilerFacade')
  );
}

export function createWorkspaceRuntimeHost(): WorkspaceRuntimeHost {
  return {
    protocolVersion: '1',
    id: ANGULAR_JIT_RUNTIME_HOST_ID,
    version: ANGULAR_JIT_RUNTIME_HOST_VERSION,
    async beforeConfigLoad(
      context: WorkspaceRuntimeBootstrapContext,
    ): Promise<WorkspaceRuntimeBootstrapResult> {
      context.assertRuntimePackageAliasesAbsent([
        '@angular/compiler',
        '@angular/core',
      ]);
      const resolutions = await Promise.all(
        RUNTIME_PACKAGES.map((specifier) =>
          requireResolution(context, specifier),
        ),
      );
      const metadata = await Promise.all(
        resolutions.map((resolution) =>
          context.readRuntimePackageMetadata(resolution),
        ),
      );
      const versions = RUNTIME_PACKAGES.map((name, index) => ({
        name,
        version: packageVersion(metadata[index]!, name),
      }));
      const coreVersion = versions.find(({ name }) => name === '@angular/core')!
        .version;
      const compilerVersion = versions.find(
        ({ name }) => name === '@angular/compiler',
      )!.version;
      if (
        !isSupportedAngularVersion(coreVersion) ||
        coreVersion !== compilerVersion
      ) {
        throw new TypeError(
          'Angular core/compiler must be an exact supported version pair.',
        );
      }
      if (ambientCompilerFacadePresent()) {
        throw new TypeError(
          'Angular compiler facade was installed before runtime reservation.',
        );
      }
      const compiler = resolutions[RUNTIME_PACKAGES.indexOf('@angular/compiler')]!;
      await context.importResolvedRuntime(compiler);
      return {
        nativeModules: ['@angular/compiler', '@angular/core'],
        runtimePackages: versions,
      };
    },
  };
}
