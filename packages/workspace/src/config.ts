import {
  canonicalStringify,
  type ContractDiagnosticSeverity,
  type JsonValue,
} from '@formly-contract/contract-schema';

import { parseFormContractSource, type FormContractSource } from './source.js';
import {
  invalid,
  rejectUnknownKeys,
  requireRecord,
  requireStableId,
} from './validation-error.js';

export const WORKSPACE_CONFIG_SCHEMA_VERSION = '0.1.0' as const;

const DEFAULT_OUTPUT_DIRECTORY = 'dist/formly-contracts';
const DEFAULT_TEST_ID_ATTRIBUTES = [
  'data-testid',
  'data-test-id',
  'data-test',
  'data-cy',
  'data-pw',
] as const;
const DEFAULT_FAIL_ON = ['error'] as const;

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

export interface WorkspaceRootConfig {
  readonly projectConfigs: readonly string[];
  readonly excludeProjectConfigs?: readonly string[];
  readonly tsconfigPath?: string;
  readonly output?: WorkspaceOutputConfig;
  readonly locators?: WorkspaceLocatorConfig;
  readonly diagnostics?: WorkspaceDiagnosticConfig;
  readonly plugins?: readonly WorkspacePlugin[];
}

export interface FormContractProjectConfig {
  readonly projectId: string;
  readonly sources?: readonly FormContractSource[];
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

export interface ResolvedWorkspaceProjectConfig {
  readonly schemaVersion: typeof WORKSPACE_CONFIG_SCHEMA_VERSION;
  readonly projectId: string;
  readonly projectConfigs: readonly string[];
  readonly excludeProjectConfigs: readonly string[];
  readonly outputDirectory: string;
  readonly testIdAttributes: readonly string[];
  readonly failOn: readonly ContractDiagnosticSeverity[];
  readonly plugins: readonly ResolvedWorkspacePluginIdentity[];
  readonly sourceIds: readonly string[];
  readonly tsconfigPath?: string;
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
  'output',
  'locators',
  'diagnostics',
  'plugins',
]);
const PROJECT_KEYS = new Set([
  'projectId',
  'sources',
  'output',
  'locators',
  'diagnostics',
]);
const OUTPUT_KEYS = new Set(['directory']);
const LOCATOR_KEYS = new Set(['testIdAttributes']);
const DIAGNOSTIC_KEYS = new Set(['failOn']);
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

function isUnsafeRelativePath(value: string): boolean {
  return (
    value.length === 0 ||
    value.includes('\0') ||
    value.startsWith('/') ||
    /^[A-Za-z]:[\\/]/u.test(value) ||
    value.split(/[\\/]/u).some((segment) => segment === '..')
  );
}

function requireRelativePath(value: unknown, path: string): string {
  if (typeof value !== 'string' || isUnsafeRelativePath(value)) {
    invalid(path, 'must be a safe workspace-relative path.');
  }
  return value;
}

function requireLiteralRelativePath(value: unknown, path: string): string {
  const literalPath = requireRelativePath(value, path);
  if (literalPath === '.' || /[*?[\]{}]/u.test(literalPath)) {
    invalid(path, 'must be a literal workspace-relative path.');
  }
  return literalPath;
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
  if (root.output !== undefined) {
    validateOutput(root.output, 'root.output');
  }
  if (root.locators !== undefined) {
    validateLocators(root.locators, 'root.locators');
  }
  if (root.diagnostics !== undefined) {
    validateDiagnostics(root.diagnostics, 'root.diagnostics');
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
  return value as FormContractProjectConfig;
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

  return {
    schemaVersion: WORKSPACE_CONFIG_SCHEMA_VERSION,
    projectId: project.projectId,
    projectConfigs: [...root.projectConfigs].sort(),
    excludeProjectConfigs: [...(root.excludeProjectConfigs ?? [])].sort(),
    outputDirectory,
    testIdAttributes: [...testIdAttributes],
    failOn: [...failOn],
    plugins: [...(root.plugins ?? [])].sort(compareIds).map((plugin) => ({
      id: plugin.id,
      version: plugin.version,
      configSchemaVersion: plugin.configSchemaVersion,
      ...(plugin.options === undefined ? {} : { options: plugin.options }),
    })),
    sourceIds: (project.sources ?? [])
      .map((source) => source.sourceId)
      .sort(),
    ...(root.tsconfigPath === undefined
      ? {}
      : { tsconfigPath: root.tsconfigPath }),
  };
}
