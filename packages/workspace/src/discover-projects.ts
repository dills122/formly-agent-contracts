import { lstat, readdir, realpath } from 'node:fs/promises';
import { posix, relative, resolve, sep } from 'node:path';

import picomatch from 'picomatch';
import { glob } from 'tinyglobby';

import {
  WORKSPACE_CONFIG_SCHEMA_VERSION,
  type FormContractProjectConfig,
  type WorkspaceRootConfig,
} from './config.js';
import {
  loadWorkspaceProjectConfig,
  loadWorkspaceRootConfig,
} from './load-config.js';
import type { WorkspaceConfigLoaderOptions } from './config-loader.js';
import {
  DEFAULT_OUTPUT_DIRECTORY,
  compareCodeUnits,
  errnoCode,
  isWithinWorkspace,
} from './workspace-paths.js';

const INTERNAL_PROJECT_TREE_IGNORES = [
  '.git',
  '.git/**',
  '**/.git',
  '**/.git/**',
  'node_modules',
  'node_modules/**',
  '**/node_modules',
  '**/node_modules/**',
] as const;

export type WorkspaceDiscoveryErrorCode =
  | 'CONFIG_PATH_OUTSIDE_WORKSPACE'
  | 'DUPLICATE_PROJECT_ID'
  | 'DUPLICATE_SOURCE_ID'
  | 'PROJECT_CONFIG_NOT_FOUND'
  | 'PROJECT_CONFIG_SYMLINK_UNSUPPORTED'
  | 'PROJECT_SELECTION_INVALID';

export class WorkspaceDiscoveryError extends Error {
  readonly code: WorkspaceDiscoveryErrorCode;
  readonly configPaths: readonly string[];
  readonly identity?: string;

  constructor(
    code: WorkspaceDiscoveryErrorCode,
    message: string,
    configPaths: readonly string[],
    identity?: string,
  ) {
    super(message);
    this.name = 'WorkspaceDiscoveryError';
    this.code = code;
    this.configPaths = [...configPaths];
    if (identity !== undefined) {
      this.identity = identity;
    }
  }
}

export interface DiscoverWorkspaceProjectsOptions {
  readonly workspaceRoot: string;
  readonly rootConfigPath: string;
  readonly rootLoaderOptions?: WorkspaceConfigLoaderOptions;
  /** Exact workspace-relative project-config paths to load. */
  readonly selectedProjectConfigPaths?: readonly string[];
  /** Stable project IDs to retain after project configs are loaded. */
  readonly selectedProjectIds?: readonly string[];
  /** Return safe per-config failures instead of aborting on the first one. */
  readonly continueOnProjectError?: boolean;
}

export interface DiscoverWorkspaceProjectConfigsOptions {
  readonly workspaceRoot: string;
  readonly rootConfigPath: string;
  readonly rootLoaderOptions?: WorkspaceConfigLoaderOptions;
  readonly selectedProjectConfigPaths?: readonly string[];
}

export interface LoadedWorkspaceRootConfig {
  readonly configPath: string;
  readonly config: WorkspaceRootConfig;
}

export interface DiscoveredWorkspaceProjectConfigs {
  /** Canonical local root. This is execution input, not portable output. */
  readonly workspaceRoot: string;
  readonly root: LoadedWorkspaceRootConfig;
  readonly configPaths: readonly string[];
}

export interface DiscoveredWorkspaceProject {
  readonly configPath: string;
  readonly projectId: string;
  readonly sourceIds: readonly string[];
  readonly config: FormContractProjectConfig;
}

export interface WorkspaceProjectInventoryEntry {
  readonly configPath: string;
  readonly projectId: string;
  readonly sourceIds: readonly string[];
}

export interface WorkspacePluginInventoryEntry {
  readonly id: string;
  readonly version: string;
  readonly configSchemaVersion: string;
}

export interface WorkspaceDiscoveryInventory {
  readonly schemaVersion: typeof WORKSPACE_CONFIG_SCHEMA_VERSION;
  readonly rootConfigPath: string;
  readonly plugins: readonly WorkspacePluginInventoryEntry[];
  readonly projects: readonly WorkspaceProjectInventoryEntry[];
}

export interface DiscoveredWorkspace {
  readonly root: LoadedWorkspaceRootConfig;
  readonly projects: readonly DiscoveredWorkspaceProject[];
  readonly inventory: WorkspaceDiscoveryInventory;
  readonly failures?: readonly WorkspaceProjectDiscoveryFailure[];
}

export interface WorkspaceProjectDiscoveryFailure {
  readonly code: 'PROJECT_CONFIG_LOAD_FAILED';
  readonly configPath: string;
}

function normalizeWorkspacePath(path: string): string {
  return path.split(sep).join('/');
}

/**
 * Avoid traversing trees that cannot own project configuration. Dependency and
 * VCS trees are always internal; the root artifact directory is internal for
 * this discovery run. Generic `dist` directories remain discoverable unless
 * the root config names one as its output directory.
 */
function projectConfigIgnorePatterns(
  rootConfig: WorkspaceRootConfig,
): readonly string[] {
  const outputDirectory = normalizeWorkspacePath(
    rootConfig.output?.directory ?? DEFAULT_OUTPUT_DIRECTORY,
  ).replace(/\/+$/u, '');

  return [
    ...(rootConfig.excludeProjectConfigs ?? []),
    ...INTERNAL_PROJECT_TREE_IGNORES,
    outputDirectory,
    `${outputDirectory}/**`,
  ]
    .filter((pattern, index, patterns) => patterns.indexOf(pattern) === index)
    .sort(compareCodeUnits);
}

async function assertPathWithinWorkspace(
  workspaceRoot: string,
  absolutePath: string,
  configPath: string,
): Promise<void> {
  if (!isWithinWorkspace(workspaceRoot, absolutePath)) {
    throw new WorkspaceDiscoveryError(
      'CONFIG_PATH_OUTSIDE_WORKSPACE',
      `Config path is outside the workspace root: ${configPath}`,
      [configPath],
    );
  }

  let resolvedPath;
  try {
    resolvedPath = await realpath(absolutePath);
  } catch (error) {
    const code = errnoCode(error);
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return;
    }
    throw error;
  }
  if (!isWithinWorkspace(workspaceRoot, resolvedPath)) {
    throw new WorkspaceDiscoveryError(
      'CONFIG_PATH_OUTSIDE_WORKSPACE',
      `Matched config resolves outside the workspace root: ${configPath}`,
      [configPath],
    );
  }
}

async function expandProjectConfigPatterns(
  includes: readonly string[],
  excludes: readonly string[],
  workspaceRoot: string,
): Promise<Set<string>> {
  const sortedIncludes = [...includes].sort(compareCodeUnits);
  const sortedExcludes = [...excludes].sort(compareCodeUnits);
  const matches = await glob(sortedIncludes, {
    cwd: workspaceRoot,
    followSymbolicLinks: false,
    ignore: sortedExcludes,
    onlyFiles: true,
  });
  return new Set(matches.map(normalizeWorkspacePath));
}

async function rejectMatchedProjectConfigSymlinks(
  includes: readonly string[],
  excludes: readonly string[],
  workspaceRoot: string,
): Promise<void> {
  const sortedExcludes = [...excludes].sort(compareCodeUnits);
  const directoryPatterns = [
    '.',
    ...includes.map((pattern) => posix.dirname(pattern)),
  ].sort(compareCodeUnits);
  const directories = await glob(directoryPatterns, {
    cwd: workspaceRoot,
    followSymbolicLinks: false,
    ignore: sortedExcludes,
    onlyDirectories: true,
  });
  const matchesInclude = picomatch([...includes].sort(compareCodeUnits));
  const matchesExclude =
    sortedExcludes.length === 0 ? () => false : picomatch(sortedExcludes);
  const matchedSymlinks: string[] = [];

  const normalizedDirectories = directories.map(
    (directory) => directory.replace(/\/+$/u, '') || '.',
  );
  for (const directory of new Set([
    '.',
    ...normalizedDirectories.sort(compareCodeUnits),
  ])) {
    const entries = await readdir(resolve(workspaceRoot, directory), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isSymbolicLink()) {
        continue;
      }
      const configPath =
        directory === '.' ? entry.name : `${directory}/${entry.name}`;
      if (matchesInclude(configPath) && !matchesExclude(configPath)) {
        matchedSymlinks.push(configPath);
      }
    }
  }

  matchedSymlinks.sort(compareCodeUnits);
  const configPath = matchedSymlinks[0];
  if (configPath !== undefined) {
    throw new WorkspaceDiscoveryError(
      'PROJECT_CONFIG_SYMLINK_UNSUPPORTED',
      `Project config symlinks are not supported: ${configPath}`,
      [configPath],
    );
  }
}

function clonePluginIdentities(
  rootConfig: WorkspaceRootConfig,
): readonly WorkspacePluginInventoryEntry[] {
  return [...(rootConfig.plugins ?? [])]
    .sort((left, right) => compareCodeUnits(left.id, right.id))
    .map((plugin) => ({
      id: plugin.id,
      version: plugin.version,
      configSchemaVersion: plugin.configSchemaVersion,
    }));
}

async function rejectProjectConfigSymlink(
  absoluteConfigPath: string,
  configPath: string,
): Promise<void> {
  const configFile = await lstat(absoluteConfigPath);
  if (configFile.isSymbolicLink()) {
    throw new WorkspaceDiscoveryError(
      'PROJECT_CONFIG_SYMLINK_UNSUPPORTED',
      `Project config symlinks are not supported: ${configPath}`,
      [configPath],
    );
  }
}

function duplicateIdentity(
  occurrences: ReadonlyMap<string, readonly string[]>,
): readonly [identity: string, configPaths: readonly string[]] | undefined {
  const duplicate = [...occurrences.entries()]
    .filter(([, configPaths]) => configPaths.length > 1)
    .sort(([left], [right]) => compareCodeUnits(left, right))[0];
  return duplicate == null
    ? undefined
    : [duplicate[0], [...duplicate[1]].sort(compareCodeUnits)];
}

function recordOccurrence(
  occurrences: Map<string, string[]>,
  identity: string,
  configPath: string,
): void {
  const paths = occurrences.get(identity);
  if (paths == null) {
    occurrences.set(identity, [configPath]);
    return;
  }
  paths.push(configPath);
}

function assertUniqueIdentities(
  projects: readonly DiscoveredWorkspaceProject[],
): void {
  const projectOccurrences = new Map<string, string[]>();
  const sourceOccurrences = new Map<string, string[]>();
  for (const project of projects) {
    recordOccurrence(projectOccurrences, project.projectId, project.configPath);
    for (const sourceId of project.sourceIds) {
      recordOccurrence(sourceOccurrences, sourceId, project.configPath);
    }
  }

  const duplicateProject = duplicateIdentity(projectOccurrences);
  if (duplicateProject != null) {
    const [projectId, configPaths] = duplicateProject;
    throw new WorkspaceDiscoveryError(
      'DUPLICATE_PROJECT_ID',
      `Duplicate project ID "${projectId}" in: ${configPaths.join(', ')}`,
      configPaths,
      projectId,
    );
  }

  const duplicateSource = duplicateIdentity(sourceOccurrences);
  if (duplicateSource != null) {
    const [sourceId, configPaths] = duplicateSource;
    throw new WorkspaceDiscoveryError(
      'DUPLICATE_SOURCE_ID',
      `Duplicate source ID "${sourceId}" in: ${configPaths.join(', ')}`,
      configPaths,
      sourceId,
    );
  }
}

function selectProjectConfigPaths(
  projectConfigPaths: readonly string[],
  selectedPaths: readonly string[] | undefined,
): readonly string[] {
  if (selectedPaths === undefined || selectedPaths.length === 0) {
    return projectConfigPaths;
  }
  const normalizedSelections = [...new Set(selectedPaths.map(normalizeWorkspacePath))]
    .sort(compareCodeUnits);
  const available = new Set(projectConfigPaths);
  const missing = normalizedSelections.find((path) => !available.has(path));
  if (missing !== undefined) {
    throw new WorkspaceDiscoveryError(
      'PROJECT_CONFIG_NOT_FOUND',
      `Selected project config was not discovered: ${missing}`,
      [missing],
    );
  }
  return normalizedSelections;
}

function selectProjectsById(
  projects: readonly DiscoveredWorkspaceProject[],
  selectedIds: readonly string[] | undefined,
): readonly DiscoveredWorkspaceProject[] {
  if (selectedIds === undefined || selectedIds.length === 0) {
    return projects;
  }
  const normalizedSelections = [...new Set(selectedIds)].sort(compareCodeUnits);
  const available = new Set(projects.map(({ projectId }) => projectId));
  const missing = normalizedSelections.find((projectId) => !available.has(projectId));
  if (missing !== undefined) {
    throw new WorkspaceDiscoveryError(
      'PROJECT_CONFIG_NOT_FOUND',
      `Selected project ID was not discovered: ${missing}`,
      [],
      missing,
    );
  }
  const selected = new Set(normalizedSelections);
  return projects.filter(({ projectId }) => selected.has(projectId));
}

export async function discoverWorkspaceProjects(
  options: DiscoverWorkspaceProjectsOptions,
): Promise<DiscoveredWorkspace> {
  if (
    (options.selectedProjectConfigPaths?.length ?? 0) > 0 &&
    (options.selectedProjectIds?.length ?? 0) > 0
  ) {
    throw new WorkspaceDiscoveryError(
      'PROJECT_SELECTION_INVALID',
      'Project ID and project-config path selection cannot be combined.',
      [],
    );
  }
  const discoveredConfigs = await discoverWorkspaceProjectConfigs(options);
  const { workspaceRoot, configPaths: projectConfigPaths } = discoveredConfigs;
  const { configPath: rootConfigPath, config: rootConfig } =
    discoveredConfigs.root;
  const tsconfigPath =
    rootConfig.tsconfigPath === undefined
      ? undefined
      : resolve(workspaceRoot, rootConfig.tsconfigPath);

  const projects: DiscoveredWorkspaceProject[] = [];
  const failures: WorkspaceProjectDiscoveryFailure[] = [];
  for (const configPath of projectConfigPaths) {
    try {
      const absoluteConfigPath = resolve(workspaceRoot, configPath);
      await rejectProjectConfigSymlink(absoluteConfigPath, configPath);
      await assertPathWithinWorkspace(
        workspaceRoot,
        absoluteConfigPath,
        configPath,
      );
      const config = await loadWorkspaceProjectConfig(
        absoluteConfigPath,
        tsconfigPath === undefined ? {} : { tsconfigPath },
      );
      projects.push({
        configPath,
        projectId: config.projectId,
        sourceIds: (config.sources ?? [])
          .map(({ sourceId }) => sourceId)
          .sort(compareCodeUnits),
        config,
      });
    } catch (error) {
      if (options.continueOnProjectError !== true) {
        throw error;
      }
      failures.push({ code: 'PROJECT_CONFIG_LOAD_FAILED', configPath });
    }
  }
  projects.sort(
    (left, right) =>
      compareCodeUnits(left.configPath, right.configPath) ||
      compareCodeUnits(left.projectId, right.projectId),
  );
  assertUniqueIdentities(projects);
  const selectedProjects = selectProjectsById(
    projects,
    options.selectedProjectIds,
  );

  const plugins = clonePluginIdentities(rootConfig);
  return {
    root: { configPath: rootConfigPath, config: rootConfig },
    projects: selectedProjects,
    inventory: {
      schemaVersion: WORKSPACE_CONFIG_SCHEMA_VERSION,
      rootConfigPath,
      plugins,
      projects: selectedProjects.map(({ configPath, projectId, sourceIds }) => ({
        configPath,
        projectId,
        sourceIds,
      })),
    },
    ...(failures.length === 0 ? {} : { failures }),
  };
}

/**
 * Expands and validates project-config paths without evaluating any project
 * config. This is the parent-side discovery boundary used before workers are
 * allowed to import trusted project code.
 */
export async function discoverWorkspaceProjectConfigs(
  options: DiscoverWorkspaceProjectConfigsOptions,
): Promise<DiscoveredWorkspaceProjectConfigs> {
  const workspaceRoot = await realpath(resolve(options.workspaceRoot));
  const absoluteRootConfigPath = resolve(workspaceRoot, options.rootConfigPath);
  const rootConfigPath = normalizeWorkspacePath(
    relative(workspaceRoot, absoluteRootConfigPath),
  );
  await assertPathWithinWorkspace(
    workspaceRoot,
    absoluteRootConfigPath,
    rootConfigPath,
  );

  const rootConfig = await loadWorkspaceRootConfig(
    absoluteRootConfigPath,
    options.rootLoaderOptions,
  );
  const ignoredProjectConfigPatterns = projectConfigIgnorePatterns(rootConfig);
  if ((options.selectedProjectConfigPaths?.length ?? 0) === 0) {
    await rejectMatchedProjectConfigSymlinks(
      rootConfig.projectConfigs,
      ignoredProjectConfigPatterns,
      workspaceRoot,
    );
  }
  const discoveredProjectConfigPaths = [
    ...(await expandProjectConfigPatterns(
      rootConfig.projectConfigs,
      ignoredProjectConfigPatterns,
      workspaceRoot,
    )),
  ].sort(compareCodeUnits);
  const configPaths = selectProjectConfigPaths(
    discoveredProjectConfigPaths,
    options.selectedProjectConfigPaths,
  );
  for (const configPath of configPaths) {
    const absoluteConfigPath = resolve(workspaceRoot, configPath);
    await rejectProjectConfigSymlink(absoluteConfigPath, configPath);
    await assertPathWithinWorkspace(workspaceRoot, absoluteConfigPath, configPath);
  }

  return {
    workspaceRoot,
    root: { configPath: rootConfigPath, config: rootConfig },
    configPaths,
  };
}
