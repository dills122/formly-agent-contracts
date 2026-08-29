import { realpathSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createPathsMatcher, parseTsconfig } from "get-tsconfig";
import { createJiti } from "jiti";

export type WorkspaceConfigLoadErrorCode =
  | "CONFIG_NOT_FOUND"
  | "CONFIG_LOAD_FAILED"
  | "CONFIG_EXPORT_INVALID";

export class WorkspaceConfigLoadError extends Error {
  readonly code: WorkspaceConfigLoadErrorCode;
  readonly configPath: string;

  constructor(
    code: WorkspaceConfigLoadErrorCode,
    configPath: string,
    message: string,
    cause?: unknown
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "WorkspaceConfigLoadError";
    this.code = code;
    this.configPath = configPath;
  }
}

export interface WorkspaceConfigLoaderOptions {
  readonly tsconfigPath?: string;
}

/** @internal Shared Jiti runtime used for config evaluation and resolution parity. */
export interface WorkspaceConfigModuleRuntime {
  readonly importModule: <T = unknown>(modulePath: string) => Promise<T>;
  readonly resolveModule: (specifier: string, importerPath?: string) => string;
}

function isConfigObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readExactTsconfigAliases(
  tsconfigPath: string
): Readonly<Record<string, string>> | undefined {
  const config = parseTsconfig(tsconfigPath);
  const paths = config.compilerOptions?.paths;
  if (paths === undefined) {
    return undefined;
  }
  const matchPaths = createPathsMatcher({ path: tsconfigPath, config });
  if (matchPaths === null) {
    return undefined;
  }

  const aliases: Record<string, string> = {};
  for (const alias of Object.keys(paths).sort()) {
    if (alias.includes("*")) {
      continue;
    }
    const target = matchPaths(alias)[0];
    if (target !== undefined) {
      aliases[alias] = target;
    }
  }
  return Object.keys(aliases).length === 0 ? undefined : aliases;
}

/** @internal Not re-exported from the package entry point. */
export function createWorkspaceConfigModuleRuntime(
  configPath: string,
  options: WorkspaceConfigLoaderOptions = {}
): WorkspaceConfigModuleRuntime {
  const absoluteConfigPath = resolve(configPath);
  const tsconfigPath =
    options.tsconfigPath === undefined
      ? undefined
      : resolve(options.tsconfigPath);
  const alias =
    tsconfigPath === undefined
      ? undefined
      : readExactTsconfigAliases(tsconfigPath);
  const jiti = createJiti(absoluteConfigPath, {
    fsCache: false,
    interopDefault: false,
    moduleCache: false,
    ...(tsconfigPath === undefined
      ? { tsconfigPaths: false }
      : {
          ...(alias === undefined ? {} : { alias }),
          tsconfigPaths: tsconfigPath,
        }),
  });

  return {
    importModule: <T = unknown>(modulePath: string): Promise<T> =>
      jiti.import<T>(modulePath),
    resolveModule: (
      specifier: string,
      importerPath: string = absoluteConfigPath
    ): string => {
      const resolvedModule = jiti.esmResolve(
        specifier,
        pathToFileURL(resolve(importerPath)).href
      );
      const resolvedPath = resolvedModule.startsWith("file:")
        ? fileURLToPath(resolvedModule)
        : resolvedModule;
      return realpathSync(resolvedPath);
    },
  };
}

export async function loadWorkspaceConfigModule(
  configPath: string,
  options: WorkspaceConfigLoaderOptions = {}
): Promise<Record<string, unknown>> {
  const absoluteConfigPath = resolve(configPath);

  try {
    const file = await stat(absoluteConfigPath);
    if (!file.isFile()) {
      throw new Error("Config path is not a file.");
    }
  } catch (error) {
    throw new WorkspaceConfigLoadError(
      "CONFIG_NOT_FOUND",
      absoluteConfigPath,
      `Workspace config was not found: ${absoluteConfigPath}`,
      error
    );
  }

  let loaded: unknown;
  try {
    const runtime = createWorkspaceConfigModuleRuntime(
      absoluteConfigPath,
      options
    );
    const imported = await runtime.importModule<unknown>(absoluteConfigPath);
    loaded =
      isConfigObject(imported) && "default" in imported
        ? imported.default
        : undefined;
  } catch (error) {
    throw new WorkspaceConfigLoadError(
      "CONFIG_LOAD_FAILED",
      absoluteConfigPath,
      `Unable to load workspace config: ${absoluteConfigPath}`,
      error
    );
  }

  if (!isConfigObject(loaded)) {
    throw new WorkspaceConfigLoadError(
      "CONFIG_EXPORT_INVALID",
      absoluteConfigPath,
      `Workspace config must have an object default export: ${absoluteConfigPath}`
    );
  }

  return loaded;
}
