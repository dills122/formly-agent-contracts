import {
  canonicalStringify,
  canonicalizeCrossFieldEffectRegistry,
  canonicalizeFieldTypeProfileRegistry,
  computeCrossFieldEffectRegistryHash,
  computeFieldTypeProfileRegistryHash,
  parseCrossFieldEffectRegistry,
  parseFieldTypeProfileRegistry,
  type ContractDiagnosticSeverity,
  type CrossFieldEffectRegistry,
  type FieldTypeProfileRegistry,
  type JsonValue,
} from '@formly-contract/schema';

import { parseFormContractSource, type FormContractSource } from './source.js';
import {
  invalid,
  outsideWorkspacePath,
  rejectUnknownKeys,
  requireRecord,
  requireStableId,
} from './validation-error.js';

export const WORKSPACE_CONFIG_SCHEMA_VERSION = '0.2.0' as const;
export const WORKSPACE_SOURCE_USAGE_CONVENTION =
  'direct-root-call-v1' as const;

const DEFAULT_OUTPUT_DIRECTORY = 'dist/formly-contracts';
const DEFAULT_TEST_ID_ATTRIBUTES = [
  'data-testid',
  'data-test-id',
  'data-test',
  'data-cy',
  'data-pw',
] as const;
const DEFAULT_FAIL_ON = ['error'] as const;
const DEFAULT_EFFECT_CYCLE_POLICY = 'error' as const;

export interface WorkspacePlugin {
  readonly id: string;
  readonly version: string;
  readonly configSchemaVersion: string;
  readonly options?: JsonValue;
}

export interface WorkspaceOutputConfig {
  readonly directory: string;
}

export interface WorkspaceLocatorConfig {
  readonly testIdAttributes: readonly string[];
}

export interface WorkspaceDiagnosticConfig {
  readonly failOn: readonly ContractDiagnosticSeverity[];
}

export interface WorkspaceEffectConfig {
  readonly cyclePolicy: ContractDiagnosticSeverity;
}

export interface WorkspaceSourceUsageConfig {
  readonly convention: typeof WORKSPACE_SOURCE_USAGE_CONVENTION;
  readonly tsconfigPath: string;
}

export interface WorkspaceProjectConfigOverride {
  readonly projectRoot?: string;
  readonly runtimeResolutionBase?: string;
  readonly tsconfigPath?: string;
}

export interface ResolvedWorkspaceProjectExecutionPaths {
  readonly configPath: string;
  readonly projectRoot: string;
  readonly runtimeResolutionBase: string;
  readonly tsconfigPath?: string;
}

export interface WorkspaceRootConfig {
  readonly projectConfigs: readonly string[];
  readonly excludeProjectConfigs?: readonly string[];
  readonly tsconfigPath?: string;
  readonly projectConfigOverrides?: Readonly<
    Record<string, WorkspaceProjectConfigOverride>
  >;
  readonly sourceUsage?: WorkspaceSourceUsageConfig;
  readonly output?: WorkspaceOutputConfig;
  readonly locators?: WorkspaceLocatorConfig;
  readonly diagnostics?: WorkspaceDiagnosticConfig;
  readonly effects?: WorkspaceEffectConfig;
  readonly plugins?: readonly WorkspacePlugin[];
}

export interface FormContractProjectConfig {
  readonly projectId: string;
  readonly sources?: readonly FormContractSource[];
  readonly fieldTypeProfiles?: FieldTypeProfileRegistry;
  readonly crossFieldEffects?: CrossFieldEffectRegistry;
  readonly output?: WorkspaceOutputConfig;
  readonly locators?: WorkspaceLocatorConfig;
  readonly diagnostics?: WorkspaceDiagnosticConfig;
}

export interface WorkspaceCliOverrides {
  readonly outputDirectory?: string;
  readonly testIdAttributes?: readonly string[];
  readonly failOn?: readonly ContractDiagnosticSeverity[];
}

export interface ResolvedWorkspacePluginIdentity {
  readonly id: string;
  readonly version: string;
  readonly configSchemaVersion: string;
  readonly options?: JsonValue;
}

/**
 * @internal Shared by config.ts and run-workspace.ts to project any
 * `{id, version, configSchemaVersion, options?}`-shaped plugin (declared or
 * already-resolved) down to its identity, omitting `options` when absent
 * instead of serializing it as `undefined`. Not part of the package barrel.
 */
export function toPluginIdentity(
  plugin: ResolvedWorkspacePluginIdentity,
): ResolvedWorkspacePluginIdentity {
  return {
    id: plugin.id,
    version: plugin.version,
    configSchemaVersion: plugin.configSchemaVersion,
    ...(plugin.options === undefined ? {} : { options: plugin.options }),
  };
}

export interface ResolvedFieldTypeProfileRegistry {
  readonly schemaVersion: FieldTypeProfileRegistry['schemaVersion'];
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
  readonly registry: FieldTypeProfileRegistry;
}

export interface ResolvedCrossFieldEffectRegistry {
  readonly schemaVersion: CrossFieldEffectRegistry['schemaVersion'];
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
  readonly registry: CrossFieldEffectRegistry;
}

export interface ResolvedWorkspaceProjectConfig {
  readonly schemaVersion: typeof WORKSPACE_CONFIG_SCHEMA_VERSION;
  readonly projectId: string;
  readonly projectConfigs: readonly string[];
  readonly excludeProjectConfigs: readonly string[];
  readonly outputDirectory: string;
  readonly testIdAttributes: readonly string[];
  readonly failOn: readonly ContractDiagnosticSeverity[];
  readonly effectCyclePolicy: ContractDiagnosticSeverity;
  readonly plugins: readonly ResolvedWorkspacePluginIdentity[];
  readonly sourceIds: readonly string[];
  readonly fieldTypeProfiles?: ResolvedFieldTypeProfileRegistry;
  readonly crossFieldEffects?: ResolvedCrossFieldEffectRegistry;
  readonly tsconfigPath?: string;
  readonly sourceUsage?: WorkspaceSourceUsageConfig;
}

export function defineConfig<const TConfig extends WorkspaceRootConfig>(
  config: TConfig,
): TConfig {
  return config;
}

export function defineFormContractProject<
  const TConfig extends FormContractProjectConfig,
>(config: TConfig): TConfig {
  return config;
}

const ROOT_KEYS = new Set([
  'projectConfigs',
  'excludeProjectConfigs',
  'tsconfigPath',
  'projectConfigOverrides',
  'sourceUsage',
  'output',
  'locators',
  'diagnostics',
  'effects',
  'plugins',
]);
const PROJECT_KEYS = new Set([
  'projectId',
  'sources',
  'fieldTypeProfiles',
  'crossFieldEffects',
  'output',
  'locators',
  'diagnostics',
]);
const OUTPUT_KEYS = new Set(['directory']);
const LOCATOR_KEYS = new Set(['testIdAttributes']);
const DIAGNOSTIC_KEYS = new Set(['failOn']);
const EFFECT_KEYS = new Set(['cyclePolicy']);
const SOURCE_USAGE_KEYS = new Set(['convention', 'tsconfigPath']);
const PROJECT_CONFIG_OVERRIDE_KEYS = new Set([
  'projectRoot',
  'runtimeResolutionBase',
  'tsconfigPath',
]);
const PLUGIN_KEYS = new Set([
  'id',
  'version',
  'configSchemaVersion',
  'options',
]);
const CLI_KEYS = new Set(['outputDirectory', 'testIdAttributes', 'failOn']);

function requireArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    invalid(path, 'must be an array.');
  }
  return value;
}

function readOptionalOwnDataProperty(
  value: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) {
    return undefined;
  }
  if (!('value' in descriptor)) {
    invalid(path, 'must be an own data property.');
  }
  return descriptor.value;
}

function isOutsideWorkspacePath(value: string): boolean {
  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(value)) {
    return true;
  }
  let depth = 0;
  for (const segment of value.split(/[\\/]/u)) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (depth === 0) {
        return true;
      }
      depth -= 1;
      continue;
    }
    depth += 1;
  }
  return false;
}

function requireRelativePath(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    invalid(path, 'must be a safe workspace-relative path.');
  }
  if (isOutsideWorkspacePath(value)) {
    outsideWorkspacePath(path);
  }
  if (value.split(/[\\/]/u).includes('..')) {
    invalid(path, 'must be a safe workspace-relative path.');
  }
  return value;
}

function requireLiteralRelativePath(
  value: unknown,
  path: string,
  allowWorkspaceRoot = false,
): string {
  const literalPath = requireRelativePath(value, path);
  const resolvesToWorkspaceRoot = literalPath
    .split(/[\\/]/u)
    .every((segment) => segment === '' || segment === '.');
  if (
    (!allowWorkspaceRoot && resolvesToWorkspaceRoot) ||
    /[*?[\]{}]/u.test(literalPath)
  ) {
    invalid(path, 'must be a literal workspace-relative path.');
  }
  return literalPath;
}

function canonicalRelativePath(value: string): string {
  const segments = value
    .split(/[\\/]/u)
    .filter((segment) => segment !== '' && segment !== '.');
  return segments.length === 0 ? '.' : segments.join('/');
}

function projectConfigOverridePath(path: string, configPath: string): string {
  return `${path}[${JSON.stringify(configPath)}]`;
}

function validateProjectConfigOverrides(value: unknown, path: string): void {
  const overrides = requireRecord(value, path);
  const canonicalConfigPaths = new Set<string>();
  for (const configPath of Object.keys(overrides)) {
    const overridePath = projectConfigOverridePath(path, configPath);
    const parsedConfigPath = requireLiteralRelativePath(
      configPath,
      `${overridePath}.configPath`,
    );
    const canonicalConfigPath = canonicalRelativePath(parsedConfigPath);
    if (canonicalConfigPaths.has(canonicalConfigPath)) {
      invalid(
        `${overridePath}.configPath`,
        `duplicates project config path "${canonicalConfigPath}".`,
      );
    }
    canonicalConfigPaths.add(canonicalConfigPath);

    const override = requireRecord(
      readOptionalOwnDataProperty(overrides, configPath, overridePath),
      overridePath,
    );
    rejectUnknownKeys(override, PROJECT_CONFIG_OVERRIDE_KEYS, overridePath);
    if (Object.keys(override).length === 0) {
      invalid(overridePath, 'must configure at least one override.');
    }
    if (Object.hasOwn(override, 'projectRoot')) {
      requireLiteralRelativePath(
        readOptionalOwnDataProperty(
          override,
          'projectRoot',
          `${overridePath}.projectRoot`,
        ),
        `${overridePath}.projectRoot`,
        true,
      );
    }
    if (Object.hasOwn(override, 'runtimeResolutionBase')) {
      requireLiteralRelativePath(
        readOptionalOwnDataProperty(
          override,
          'runtimeResolutionBase',
          `${overridePath}.runtimeResolutionBase`,
        ),
        `${overridePath}.runtimeResolutionBase`,
        true,
      );
    }
    if (Object.hasOwn(override, 'tsconfigPath')) {
      requireLiteralRelativePath(
        readOptionalOwnDataProperty(
          override,
          'tsconfigPath',
          `${overridePath}.tsconfigPath`,
        ),
        `${overridePath}.tsconfigPath`,
      );
    }
  }
}

export function resolveWorkspaceProjectExecutionPaths(
  rootInput: WorkspaceRootConfig,
  configPathInput: string,
): ResolvedWorkspaceProjectExecutionPaths {
  const root = parseRootConfig(rootInput);
  const configPath = canonicalRelativePath(
    requireLiteralRelativePath(configPathInput, 'projectConfigPath'),
  );
  const overrideEntry = Object.entries(root.projectConfigOverrides ?? {}).find(
    ([candidate]) => canonicalRelativePath(candidate) === configPath,
  );
  const override = overrideEntry?.[1];
  const configDirectory = canonicalRelativePath(
    configPath.includes('/')
      ? configPath.slice(0, configPath.lastIndexOf('/'))
      : '.',
  );
  const projectRoot = canonicalRelativePath(
    override?.projectRoot ?? configDirectory,
  );
  const runtimeResolutionBase = canonicalRelativePath(
    override?.runtimeResolutionBase ?? configDirectory,
  );
  const tsconfigPath = override?.tsconfigPath ?? root.tsconfigPath;
  return {
    configPath,
    projectRoot,
    runtimeResolutionBase,
    ...(tsconfigPath === undefined
      ? {}
      : { tsconfigPath: canonicalRelativePath(tsconfigPath) }),
  };
}

function requireGlob(value: unknown, path: string): string {
  const glob = requireRelativePath(value, path);
  if (glob.startsWith('!')) {
    invalid(path, 'must not use negation; use excludeProjectConfigs instead.');
  }
  return glob;
}

function validateStringArray(
  value: unknown,
  path: string,
  validate: (item: unknown, itemPath: string) => string,
  allowEmpty: boolean,
): readonly string[] {
  const input = requireArray(value, path);
  if (!allowEmpty && input.length === 0) {
    invalid(path, 'must contain at least one entry.');
  }
  const seen = new Set<string>();
  return input.map((item, index) => {
    const itemPath = `${path}[${index}]`;
    const parsed = validate(item, itemPath);
    if (seen.has(parsed)) {
      invalid(itemPath, 'must not contain duplicate entries.');
    }
    seen.add(parsed);
    return parsed;
  });
}

function validateOutput(value: unknown, path: string): void {
  const output = requireRecord(value, path);
  rejectUnknownKeys(output, OUTPUT_KEYS, path);
  requireLiteralRelativePath(output.directory, `${path}.directory`);
}

function requireAttribute(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z_:][A-Za-z0-9:._-]*$/u.test(value)
  ) {
    invalid(path, 'must be a valid attribute name.');
  }
  return value;
}

function validateLocators(value: unknown, path: string): void {
  const locators = requireRecord(value, path);
  rejectUnknownKeys(locators, LOCATOR_KEYS, path);
  validateStringArray(
    locators.testIdAttributes,
    `${path}.testIdAttributes`,
    requireAttribute,
    true,
  );
}

function requireSeverity(
  value: unknown,
  path: string,
): ContractDiagnosticSeverity {
  if (value !== 'warning' && value !== 'error') {
    invalid(path, 'must be "warning" or "error".');
  }
  return value;
}

function validateDiagnostics(value: unknown, path: string): void {
  const diagnostics = requireRecord(value, path);
  rejectUnknownKeys(diagnostics, DIAGNOSTIC_KEYS, path);
  validateStringArray(
    diagnostics.failOn,
    `${path}.failOn`,
    requireSeverity,
    true,
  );
}

function validateEffects(value: unknown, path: string): void {
  const effects = requireRecord(value, path);
  rejectUnknownKeys(effects, EFFECT_KEYS, path);
  if (!('cyclePolicy' in effects)) {
    invalid(`${path}.cyclePolicy`, 'is required.');
  }
  requireSeverity(
    readOptionalOwnDataProperty(effects, 'cyclePolicy', `${path}.cyclePolicy`),
    `${path}.cyclePolicy`,
  );
}

function validateSourceUsage(value: unknown, path: string): void {
  const sourceUsage = requireRecord(value, path);
  rejectUnknownKeys(sourceUsage, SOURCE_USAGE_KEYS, path);
  const convention = readOptionalOwnDataProperty(
    sourceUsage,
    'convention',
    `${path}.convention`,
  );
  if (convention !== WORKSPACE_SOURCE_USAGE_CONVENTION) {
    invalid(
      `${path}.convention`,
      `must be "${WORKSPACE_SOURCE_USAGE_CONVENTION}".`,
    );
  }
  requireLiteralRelativePath(
    readOptionalOwnDataProperty(
      sourceUsage,
      'tsconfigPath',
      `${path}.tsconfigPath`,
    ),
    `${path}.tsconfigPath`,
  );
}

function requireVersion(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?$/u.test(value)
  ) {
    invalid(path, 'must be a stable version string.');
  }
  return value;
}

function validatePlugins(value: unknown, path: string): void {
  const plugins = requireArray(value, path);
  const ids = new Set<string>();
  plugins.forEach((entry, index) => {
    const pluginPath = `${path}[${index}]`;
    const plugin = requireRecord(entry, pluginPath);
    rejectUnknownKeys(plugin, PLUGIN_KEYS, pluginPath);
    const id = requireStableId(plugin.id, `${pluginPath}.id`);
    requireVersion(plugin.version, `${pluginPath}.version`);
    requireVersion(
      plugin.configSchemaVersion,
      `${pluginPath}.configSchemaVersion`,
    );
    if (Object.hasOwn(plugin, 'options')) {
      try {
        canonicalStringify(plugin.options);
      } catch {
        invalid(`${pluginPath}.options`, 'must be JSON-safe.');
      }
    }
    if (ids.has(id)) {
      invalid(`${pluginPath}.id`, `duplicates plugin ID "${id}".`);
    }
    ids.add(id);
  });
}

export function parseRootConfig(value: unknown): WorkspaceRootConfig {
  const root = requireRecord(value, 'root');
  rejectUnknownKeys(root, ROOT_KEYS, 'root');
  validateStringArray(
    root.projectConfigs,
    'root.projectConfigs',
    requireGlob,
    false,
  );
  if (root.excludeProjectConfigs !== undefined) {
    validateStringArray(
      root.excludeProjectConfigs,
      'root.excludeProjectConfigs',
      requireGlob,
      true,
    );
  }
  if (root.tsconfigPath !== undefined) {
    requireLiteralRelativePath(root.tsconfigPath, 'root.tsconfigPath');
  }
  const projectConfigOverrides = readOptionalOwnDataProperty(
    root,
    'projectConfigOverrides',
    'root.projectConfigOverrides',
  );
  if (projectConfigOverrides !== undefined) {
    validateProjectConfigOverrides(
      projectConfigOverrides,
      'root.projectConfigOverrides',
    );
  }
  const sourceUsage = readOptionalOwnDataProperty(
    root,
    'sourceUsage',
    'root.sourceUsage',
  );
  if (sourceUsage !== undefined) {
    validateSourceUsage(sourceUsage, 'root.sourceUsage');
    if (root.tsconfigPath === undefined) {
      invalid(
        'root.tsconfigPath',
        'is required when root.sourceUsage is configured.',
      );
    }
  }
  if (root.output !== undefined) {
    validateOutput(root.output, 'root.output');
  }
  if (root.locators !== undefined) {
    validateLocators(root.locators, 'root.locators');
  }
  if (root.diagnostics !== undefined) {
    validateDiagnostics(root.diagnostics, 'root.diagnostics');
  }
  const effects = readOptionalOwnDataProperty(root, 'effects', 'root.effects');
  if (effects !== undefined) {
    validateEffects(effects, 'root.effects');
  }
  if (root.plugins !== undefined) {
    validatePlugins(root.plugins, 'root.plugins');
  }
  return value as WorkspaceRootConfig;
}

export function parseProjectConfig(value: unknown): FormContractProjectConfig {
  const project = requireRecord(value, 'project');
  rejectUnknownKeys(project, PROJECT_KEYS, 'project');
  requireStableId(project.projectId, 'project.projectId');
  const sources =
    project.sources === undefined
      ? []
      : requireArray(project.sources, 'project.sources');
  const sourceIds = new Set<string>();
  sources.forEach((source, index) => {
    const sourcePath = `project.sources[${index}]`;
    const parsed = parseFormContractSource(source, sourcePath);
    if (sourceIds.has(parsed.sourceId)) {
      invalid(
        `${sourcePath}.sourceId`,
        `duplicates source ID "${parsed.sourceId}".`,
      );
    }
    sourceIds.add(parsed.sourceId);
  });
  if (project.output !== undefined) {
    validateOutput(project.output, 'project.output');
  }
  if (project.locators !== undefined) {
    validateLocators(project.locators, 'project.locators');
  }
  if (project.diagnostics !== undefined) {
    validateDiagnostics(project.diagnostics, 'project.diagnostics');
  }
  if (project.fieldTypeProfiles !== undefined) {
    try {
      parseFieldTypeProfileRegistry(project.fieldTypeProfiles);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown validation failure';
      invalid('project.fieldTypeProfiles', `is invalid: ${message}`);
    }
  }
  const crossFieldEffects = readOptionalOwnDataProperty(
    project,
    'crossFieldEffects',
    'project.crossFieldEffects',
  );
  if (crossFieldEffects !== undefined) {
    try {
      parseCrossFieldEffectRegistry(crossFieldEffects);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown validation failure';
      invalid('project.crossFieldEffects', `is invalid: ${message}`);
    }
  }
  return value as FormContractProjectConfig;
}

function resolveFieldTypeProfiles(
  registry: FieldTypeProfileRegistry,
): ResolvedFieldTypeProfileRegistry {
  const canonical = canonicalizeFieldTypeProfileRegistry(registry);
  const normalized = JSON.parse(canonical) as FieldTypeProfileRegistry;
  return {
    schemaVersion: normalized.schemaVersion,
    id: normalized.id,
    version: normalized.version,
    contentHash: computeFieldTypeProfileRegistryHash(normalized),
    registry: normalized,
  };
}

function resolveCrossFieldEffects(
  registry: CrossFieldEffectRegistry,
): ResolvedCrossFieldEffectRegistry {
  const canonical = canonicalizeCrossFieldEffectRegistry(registry);
  const normalized = JSON.parse(canonical) as CrossFieldEffectRegistry;
  return {
    schemaVersion: normalized.schemaVersion,
    id: normalized.id,
    version: normalized.version,
    contentHash: computeCrossFieldEffectRegistryHash(normalized),
    registry: normalized,
  };
}

function validateCliOverrides(value: WorkspaceCliOverrides): void {
  const overrides = requireRecord(value, 'cli');
  rejectUnknownKeys(overrides, CLI_KEYS, 'cli');
  if (overrides.outputDirectory !== undefined) {
    requireLiteralRelativePath(
      overrides.outputDirectory,
      'cli.outputDirectory',
    );
  }
  if (overrides.testIdAttributes !== undefined) {
    validateStringArray(
      overrides.testIdAttributes,
      'cli.testIdAttributes',
      requireAttribute,
      true,
    );
  }
  if (overrides.failOn !== undefined) {
    validateStringArray(
      overrides.failOn,
      'cli.failOn',
      requireSeverity,
      true,
    );
  }
}

function compareIds(
  left: { readonly id: string },
  right: { readonly id: string },
): number {
  if (left.id === right.id) {
    return 0;
  }
  return left.id < right.id ? -1 : 1;
}

export function resolveWorkspaceProjectConfig(
  rootInput: WorkspaceRootConfig,
  projectInput: FormContractProjectConfig,
  cliOverrides: WorkspaceCliOverrides = {},
): ResolvedWorkspaceProjectConfig {
  const root = parseRootConfig(rootInput);
  const project = parseProjectConfig(projectInput);
  validateCliOverrides(cliOverrides);
  const rootEffects = readOptionalOwnDataProperty(
    root as unknown as Readonly<Record<string, unknown>>,
    'effects',
    'root.effects',
  ) as WorkspaceEffectConfig | undefined;
  const crossFieldEffects = readOptionalOwnDataProperty(
    project as unknown as Readonly<Record<string, unknown>>,
    'crossFieldEffects',
    'project.crossFieldEffects',
  ) as CrossFieldEffectRegistry | undefined;
  const sourceUsage = readOptionalOwnDataProperty(
    root as unknown as Readonly<Record<string, unknown>>,
    'sourceUsage',
    'root.sourceUsage',
  ) as WorkspaceSourceUsageConfig | undefined;

  const outputDirectory =
    cliOverrides.outputDirectory ??
    project.output?.directory ??
    root.output?.directory ??
    DEFAULT_OUTPUT_DIRECTORY;
  const testIdAttributes =
    cliOverrides.testIdAttributes ??
    project.locators?.testIdAttributes ??
    root.locators?.testIdAttributes ??
    DEFAULT_TEST_ID_ATTRIBUTES;
  const failOn =
    cliOverrides.failOn ??
    project.diagnostics?.failOn ??
    root.diagnostics?.failOn ??
    DEFAULT_FAIL_ON;
  const effectCyclePolicy =
    rootEffects?.cyclePolicy ?? DEFAULT_EFFECT_CYCLE_POLICY;

  return {
    schemaVersion: WORKSPACE_CONFIG_SCHEMA_VERSION,
    projectId: project.projectId,
    projectConfigs: [...root.projectConfigs].sort(),
    excludeProjectConfigs: [...(root.excludeProjectConfigs ?? [])].sort(),
    outputDirectory,
    testIdAttributes: [...testIdAttributes],
    failOn: [...failOn],
    effectCyclePolicy,
    plugins: [...(root.plugins ?? [])]
      .sort(compareIds)
      .map((plugin) => toPluginIdentity(plugin)),
    sourceIds: (project.sources ?? [])
      .map((source) => source.sourceId)
      .sort(),
    ...(project.fieldTypeProfiles === undefined
      ? {}
      : {
          fieldTypeProfiles: resolveFieldTypeProfiles(
            project.fieldTypeProfiles,
          ),
        }),
    ...(crossFieldEffects === undefined
      ? {}
      : {
          crossFieldEffects: resolveCrossFieldEffects(crossFieldEffects),
        }),
    ...(root.tsconfigPath === undefined
      ? {}
      : { tsconfigPath: root.tsconfigPath }),
    ...(sourceUsage === undefined
      ? {}
      : {
          sourceUsage: {
            convention: sourceUsage.convention,
            tsconfigPath: sourceUsage.tsconfigPath,
          },
        }),
  };
}
