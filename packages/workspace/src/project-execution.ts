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

export function parseProjectExecutionResult(input: unknown): ProjectExecutionResult {
  const canonical = canonicalStringify(input);
  const value = JSON.parse(canonical) as unknown;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('projectResult must be an object.');
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.forms)) {
    throw new TypeError('projectResult.forms must be an array.');
  }
  for (const [index, form] of record.forms.entries()) {
    if (typeof form !== 'object' || form === null || Array.isArray(form)) {
      throw new TypeError(`projectResult.forms[${index}] must be an object.`);
    }
    const formRecord = form as Record<string, unknown>;
    const contract = parseFormContract(formRecord.contract);
    formRecord.contract = contract;
    if (
      typeof formRecord.sourceId !== 'string' ||
      typeof formRecord.formId !== 'string' ||
      contract.formId !== formRecord.formId
    ) {
      throw new TypeError(`projectResult.forms[${index}] identity is invalid.`);
    }
  }
  if (typeof record.project !== 'object' || record.project === null) {
    throw new TypeError('projectResult.project must be an object.');
  }
  return value as ProjectExecutionResult;
}
