import {
  canonicalStringify,
  parseFormContract,
  type ContractDiagnosticSeverity,
  type FormContract,
} from '@formly-contract/schema';
import {
  extractFormContract,
  prepareCrossFieldEffectExtractionRegistry,
  type CrossFieldEffectExtractionRegistry,
} from '@formly-contract/compiler';

import {
  resolveWorkspaceProjectConfig,
  toPluginIdentity,
  WORKSPACE_CONFIG_SCHEMA_VERSION,
  type FormContractProjectConfig,
  type ResolvedWorkspaceProjectConfig,
  type WorkspaceCliOverrides,
  type WorkspaceRootConfig,
} from './config.js';
import {
  parseDeclaredFormContractInstance,
  parseFormContractDefinitions,
  type FormContractDefinition,
} from './source.js';
import { compareCodeUnits } from './workspace-paths.js';

export interface ProjectExecutionInventory {
  readonly projectId: string;
  readonly sourceIds: readonly string[];
  readonly formIds: readonly string[];
}

export interface SerializableResolvedProject {
  readonly schemaVersion: ResolvedWorkspaceProjectConfig['schemaVersion'];
  readonly configPath: string;
  readonly projectId: string;
  readonly sourceIds: readonly string[];
  readonly outputDirectory: string;
  readonly testIdAttributes: readonly string[];
  readonly failOn: readonly ContractDiagnosticSeverity[];
  readonly effectCyclePolicy: ContractDiagnosticSeverity;
  readonly plugins: readonly ReturnType<typeof toPluginIdentity>[];
  readonly fieldTypeProfileRegistry?: {
    readonly schemaVersion: string;
    readonly id: string;
    readonly version: number;
    readonly contentHash: string;
  };
  readonly crossFieldEffectRegistry?: {
    readonly schemaVersion: string;
    readonly id: string;
    readonly version: number;
    readonly contentHash: string;
  };
}

export interface ProjectExecutionFormResult {
  readonly sourceId: string;
  readonly formId: string;
  readonly contract: FormContract;
}

export interface ProjectExecutionResult {
  readonly project: SerializableResolvedProject;
  readonly forms: readonly ProjectExecutionFormResult[];
  readonly runtimePackages?: readonly {
    readonly name: string;
    readonly version: string;
  }[];
}

export interface ExpectedProjectExecutionResult {
  readonly configPath: string;
  readonly inventory: ProjectExecutionInventory;
}

export interface InventoriedProjectExecution {
  readonly inventory: ProjectExecutionInventory;
  compile(): ProjectExecutionResult;
}

interface InventoriedDefinition {
  readonly sourceId: string;
  readonly definition: FormContractDefinition;
}

function registryIdentity(
  registry:
    | ResolvedWorkspaceProjectConfig['fieldTypeProfiles']
    | ResolvedWorkspaceProjectConfig['crossFieldEffects'],
) {
  return registry === undefined
    ? undefined
    : {
        schemaVersion: registry.schemaVersion,
        id: registry.id,
        version: registry.version,
        contentHash: registry.contentHash,
      };
}

function serializableProject(
  configPath: string,
  project: ResolvedWorkspaceProjectConfig,
): SerializableResolvedProject {
  const fieldTypeProfileRegistry = registryIdentity(project.fieldTypeProfiles);
  const crossFieldEffectRegistry = registryIdentity(project.crossFieldEffects);
  return {
    schemaVersion: project.schemaVersion,
    configPath,
    projectId: project.projectId,
    sourceIds: project.sourceIds,
    outputDirectory: project.outputDirectory,
    testIdAttributes: project.testIdAttributes,
    failOn: project.failOn,
    effectCyclePolicy: project.effectCyclePolicy,
    plugins: project.plugins.map((plugin) => toPluginIdentity(plugin)),
    ...(fieldTypeProfileRegistry === undefined
      ? {}
      : { fieldTypeProfileRegistry }),
    ...(crossFieldEffectRegistry === undefined
      ? {}
      : { crossFieldEffectRegistry }),
  };
}

function compileForm(
  project: ResolvedWorkspaceProjectConfig,
  item: InventoriedDefinition,
  preparedEffects: CrossFieldEffectExtractionRegistry | undefined,
): ProjectExecutionFormResult {
  const unvalidated = item.definition.create();
  const instance = parseDeclaredFormContractInstance(
    unvalidated,
    `form[${item.definition.id}].instance`,
  );
  const contract = extractFormContract({
    formId: item.definition.id,
    fields: instance.fields,
    ...(instance.model === undefined ? {} : { model: instance.model }),
    ...(instance.formState === undefined
      ? {}
      : { formState: instance.formState }),
    locatorOptions: { testIdAttributes: project.testIdAttributes },
    ...(project.fieldTypeProfiles === undefined
      ? {}
      : { fieldTypeProfiles: project.fieldTypeProfiles }),
    ...(preparedEffects === undefined
      ? {}
      : { crossFieldEffects: preparedEffects }),
    effectCyclePolicy: project.effectCyclePolicy,
  }).contract;
  if (
    contract.diagnostics.some((diagnostic) =>
      project.failOn.includes(diagnostic.severity),
    )
  ) {
    throw new Error('Generated contract violates project diagnostic policy.');
  }
  return {
    sourceId: item.sourceId,
    formId: item.definition.id,
    contract,
  };
}

export async function inventoryProjectExecution(input: {
  readonly configPath: string;
  readonly rootConfig: WorkspaceRootConfig;
  readonly projectConfig: FormContractProjectConfig;
  readonly cliOverrides?: WorkspaceCliOverrides;
}): Promise<InventoriedProjectExecution> {
  const resolved = resolveWorkspaceProjectConfig(
    input.rootConfig,
    input.projectConfig,
    input.cliOverrides,
  );
  const definitions: InventoriedDefinition[] = [];
  for (const source of [...(input.projectConfig.sources ?? [])].sort(
    (left, right) => compareCodeUnits(left.sourceId, right.sourceId),
  )) {
    const listed: unknown = await Promise.resolve().then(() => source.list());
    const parsed = parseFormContractDefinitions(
      listed,
      `source[${source.sourceId}].definitions`,
    );
    for (const definition of parsed) {
      definitions.push({ sourceId: source.sourceId, definition });
    }
  }
  definitions.sort(
    (left, right) =>
      compareCodeUnits(left.definition.id, right.definition.id) ||
      compareCodeUnits(left.sourceId, right.sourceId),
  );
  const duplicate = definitions.find(
    (definition, index) =>
      index > 0 &&
      definitions[index - 1]?.definition.id === definition.definition.id,
  );
  if (duplicate !== undefined) {
    throw new Error(`Duplicate form ID: ${duplicate.definition.id}`);
  }
  const inventory: ProjectExecutionInventory = {
    projectId: resolved.projectId,
    sourceIds: resolved.sourceIds,
    formIds: definitions.map(({ definition }) => definition.id),
  };
  return {
    inventory,
    compile() {
      const preparedEffects =
        resolved.crossFieldEffects === undefined
          ? undefined
          : prepareCrossFieldEffectExtractionRegistry(
              resolved.crossFieldEffects,
            );
      const result: ProjectExecutionResult = {
        project: serializableProject(input.configPath, resolved),
        forms: definitions.map((definition) =>
          compileForm(resolved, definition, preparedEffects),
        ),
      };
      return JSON.parse(canonicalStringify(result)) as ProjectExecutionResult;
    },
  };
}

const PROJECT_RESULT_KEYS = new Set(['forms', 'project', 'runtimePackages']);
const PROJECT_KEYS = new Set([
  'configPath',
  'crossFieldEffectRegistry',
  'effectCyclePolicy',
  'failOn',
  'fieldTypeProfileRegistry',
  'outputDirectory',
  'plugins',
  'projectId',
  'schemaVersion',
  'sourceIds',
  'testIdAttributes',
]);
const FORM_RESULT_KEYS = new Set(['contract', 'formId', 'sourceId']);
const PLUGIN_KEYS = new Set([
  'configSchemaVersion',
  'id',
  'options',
  'version',
]);
const REGISTRY_IDENTITY_KEYS = new Set([
  'contentHash',
  'id',
  'schemaVersion',
  'version',
]);
const RUNTIME_PACKAGE_KEYS = new Set(['name', 'version']);
const CONTRACT_DIAGNOSTIC_SEVERITIES = new Set([
  'error',
  'warning',
]);
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;

function resultRecord(input: unknown, path: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError(`${path} must be an object.`);
  }
  return input as Record<string, unknown>;
}

function rejectResultKeys(
  record: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: string,
): void {
  const unknown = Object.keys(record).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new TypeError(`${path}.${unknown} is not supported.`);
  }
}

function resultString(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length === 0) {
    throw new TypeError(`${path} must be a non-empty string.`);
  }
  return input;
}

function resultStringArray(input: unknown, path: string): string[] {
  if (!Array.isArray(input)) {
    throw new TypeError(`${path} must be an array.`);
  }
  const values = input.map((value, index) =>
    resultString(value, `${path}[${index}]`),
  );
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${path} must not contain duplicates.`);
  }
  return values;
}

function parseRegistryIdentity(input: unknown, path: string): void {
  const record = resultRecord(input, path);
  rejectResultKeys(record, REGISTRY_IDENTITY_KEYS, path);
  resultString(record.schemaVersion, `${path}.schemaVersion`);
  resultString(record.id, `${path}.id`);
  if (!Number.isSafeInteger(record.version) || Number(record.version) < 1) {
    throw new TypeError(`${path}.version must be a positive safe integer.`);
  }
  if (
    typeof record.contentHash !== 'string' ||
    !SHA256_PATTERN.test(record.contentHash)
  ) {
    throw new TypeError(`${path}.contentHash must be a SHA-256 digest.`);
  }
}

function sameStrings(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    canonicalStringify([...actual].sort(compareCodeUnits)) ===
    canonicalStringify([...expected].sort(compareCodeUnits))
  );
}

export function parseProjectExecutionResult(
  input: unknown,
  expected?: ExpectedProjectExecutionResult,
): ProjectExecutionResult {
  const canonical = canonicalStringify(input);
  const value = JSON.parse(canonical) as unknown;
  const record = resultRecord(value, 'projectResult');
  rejectResultKeys(record, PROJECT_RESULT_KEYS, 'projectResult');
  if (!Array.isArray(record.forms)) {
    throw new TypeError('projectResult.forms must be an array.');
  }
  for (const [index, form] of record.forms.entries()) {
    const formPath = `projectResult.forms[${index}]`;
    const formRecord = resultRecord(form, formPath);
    rejectResultKeys(formRecord, FORM_RESULT_KEYS, formPath);
    const contract = parseFormContract(formRecord.contract);
    formRecord.contract = contract;
    resultString(formRecord.sourceId, `${formPath}.sourceId`);
    const formId = resultString(formRecord.formId, `${formPath}.formId`);
    if (contract.formId !== formId) {
      throw new TypeError(`${formPath} identity is invalid.`);
    }
  }

  const project = resultRecord(record.project, 'projectResult.project');
  rejectResultKeys(project, PROJECT_KEYS, 'projectResult.project');
  if (project.schemaVersion !== WORKSPACE_CONFIG_SCHEMA_VERSION) {
    throw new TypeError('projectResult.project.schemaVersion is unsupported.');
  }
  const configPath = resultString(
    project.configPath,
    'projectResult.project.configPath',
  );
  const projectId = resultString(
    project.projectId,
    'projectResult.project.projectId',
  );
  const sourceIds = resultStringArray(
    project.sourceIds,
    'projectResult.project.sourceIds',
  );
  resultString(project.outputDirectory, 'projectResult.project.outputDirectory');
  resultStringArray(
    project.testIdAttributes,
    'projectResult.project.testIdAttributes',
  );
  const failOn = resultStringArray(
    project.failOn,
    'projectResult.project.failOn',
  );
  if (failOn.some((severity) => !CONTRACT_DIAGNOSTIC_SEVERITIES.has(severity))) {
    throw new TypeError('projectResult.project.failOn is invalid.');
  }
  if (
    typeof project.effectCyclePolicy !== 'string' ||
    !CONTRACT_DIAGNOSTIC_SEVERITIES.has(project.effectCyclePolicy)
  ) {
    throw new TypeError('projectResult.project.effectCyclePolicy is invalid.');
  }
  if (!Array.isArray(project.plugins)) {
    throw new TypeError('projectResult.project.plugins must be an array.');
  }
  for (const [index, plugin] of project.plugins.entries()) {
    const pluginPath = `projectResult.project.plugins[${index}]`;
    const pluginRecord = resultRecord(plugin, pluginPath);
    rejectResultKeys(pluginRecord, PLUGIN_KEYS, pluginPath);
    resultString(pluginRecord.id, `${pluginPath}.id`);
    resultString(pluginRecord.version, `${pluginPath}.version`);
    resultString(
      pluginRecord.configSchemaVersion,
      `${pluginPath}.configSchemaVersion`,
    );
  }
  if (project.fieldTypeProfileRegistry !== undefined) {
    parseRegistryIdentity(
      project.fieldTypeProfileRegistry,
      'projectResult.project.fieldTypeProfileRegistry',
    );
  }
  if (project.crossFieldEffectRegistry !== undefined) {
    parseRegistryIdentity(
      project.crossFieldEffectRegistry,
      'projectResult.project.crossFieldEffectRegistry',
    );
  }

  if (record.runtimePackages !== undefined) {
    if (!Array.isArray(record.runtimePackages)) {
      throw new TypeError('projectResult.runtimePackages must be an array.');
    }
    for (const [index, runtimePackage] of record.runtimePackages.entries()) {
      const packagePath = `projectResult.runtimePackages[${index}]`;
      const packageRecord = resultRecord(runtimePackage, packagePath);
      rejectResultKeys(packageRecord, RUNTIME_PACKAGE_KEYS, packagePath);
      resultString(packageRecord.name, `${packagePath}.name`);
      resultString(packageRecord.version, `${packagePath}.version`);
    }
  }

  if (expected !== undefined) {
    if (
      configPath !== expected.configPath ||
      projectId !== expected.inventory.projectId ||
      !sameStrings(sourceIds, expected.inventory.sourceIds)
    ) {
      throw new TypeError('projectResult.project does not match inventory.');
    }
    const formIds = record.forms.map(
      (form) => (form as Record<string, unknown>).formId as string,
    );
    if (!sameStrings(formIds, expected.inventory.formIds)) {
      throw new TypeError('projectResult.forms do not match inventory.');
    }
    const sourceIdSet = new Set(expected.inventory.sourceIds);
    if (
      record.forms.some(
        (form) =>
          !sourceIdSet.has(
            (form as Record<string, unknown>).sourceId as string,
          ),
      )
    ) {
      throw new TypeError('projectResult form source does not match inventory.');
    }
  }
  return value as ProjectExecutionResult;
}
