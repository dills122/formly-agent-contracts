import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createJiti } from 'jiti';

export type WorkspaceConfigLoadErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_LOAD_FAILED'
  | 'CONFIG_EXPORT_INVALID';

export class WorkspaceConfigLoadError extends Error {
  readonly code: WorkspaceConfigLoadErrorCode;
  readonly configPath: string;

  constructor(
    code: WorkspaceConfigLoadErrorCode,
    configPath: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'WorkspaceConfigLoadError';
    this.code = code;
    this.configPath = configPath;
  }
}

export interface WorkspaceConfigLoaderOptions {
  readonly tsconfigPath?: string;
}

function isConfigObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function loadWorkspaceConfigModule(
  configPath: string,
  options: WorkspaceConfigLoaderOptions = {},
): Promise<Record<string, unknown>> {
  const absoluteConfigPath = resolve(configPath);

  try {
    const file = await stat(absoluteConfigPath);
    if (!file.isFile()) {
      throw new Error('Config path is not a file.');
    }
  } catch (error) {
    throw new WorkspaceConfigLoadError(
      'CONFIG_NOT_FOUND',
      absoluteConfigPath,
      `Workspace config was not found: ${absoluteConfigPath}`,
      error,
    );
  }

  const jiti = createJiti(import.meta.url, {
    fsCache: false,
    interopDefault: false,
    moduleCache: false,
    tsconfigPaths: options.tsconfigPath
      ? resolve(options.tsconfigPath)
      : false,
  });

  let loaded: unknown;
  try {
    const imported = await jiti.import<unknown>(absoluteConfigPath);
    loaded =
      isConfigObject(imported) && 'default' in imported
        ? imported.default
        : undefined;
  } catch (error) {
    throw new WorkspaceConfigLoadError(
      'CONFIG_LOAD_FAILED',
      absoluteConfigPath,
      `Unable to load workspace config: ${absoluteConfigPath}`,
      error,
    );
  }

  if (!isConfigObject(loaded)) {
    throw new WorkspaceConfigLoadError(
      'CONFIG_EXPORT_INVALID',
      absoluteConfigPath,
      `Workspace config must have an object default export: ${absoluteConfigPath}`,
    );
  }

  return loaded;
}
