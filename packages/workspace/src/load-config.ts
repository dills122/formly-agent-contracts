import {
  parseProjectConfig,
  parseRootConfig,
  type FormContractProjectConfig,
  type WorkspaceRootConfig,
} from './config.js';
import {
  loadWorkspaceConfigModule,
  type WorkspaceConfigLoaderOptions,
} from './config-loader.js';

export async function loadWorkspaceRootConfig(
  configPath: string,
  options: WorkspaceConfigLoaderOptions = {},
): Promise<WorkspaceRootConfig> {
  return parseRootConfig(await loadWorkspaceConfigModule(configPath, options));
}

export async function loadWorkspaceProjectConfig(
  configPath: string,
  options: WorkspaceConfigLoaderOptions = {},
): Promise<FormContractProjectConfig> {
  return parseProjectConfig(
    await loadWorkspaceConfigModule(configPath, options),
  );
}
