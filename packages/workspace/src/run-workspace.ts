import {
  canonicalStringify,
  type ContractDiagnostic,
  type ContractNode,
  type FormContract,
} from '@formly-contract/schema';
import {
  extractFormContract,
  prepareCrossFieldEffectExtractionRegistry,
  type CrossFieldEffectExtractionRegistry,
} from '@formly-contract/compiler';
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { posix } from 'node:path';

import {
  discoverWorkspaceProjects,
  type DiscoverWorkspaceProjectsOptions,
  type DiscoveredWorkspace,
  type DiscoveredWorkspaceProject,
} from './discover-projects.js';
import {
  resolveWorkspaceProjectConfig,
  type ResolvedWorkspaceProjectConfig,
  type WorkspaceCliOverrides,
} from './config.js';
import {
  parseDeclaredFormContractInstance,
  parseFormContractDefinitions,
  type FormContractDefinition,
  type FormContractSource,
} from './source.js';
import { WorkspaceConfigValidationError } from './validation-error.js';
import {
  canonicalizeWorkspaceContractIndex,
  computeWorkspaceConfigurationHash,
  createWorkspaceContractIndex,
  workspaceContractArtifactPath,
  type WorkspaceContractIndex,
  type WorkspaceContractIndexDraft,
  type WorkspaceIndexedDiagnostic,
} from './workspace-index.js';

const DEFAULT_OUTPUT_DIRECTORY = 'dist/formly-contracts';

export type WorkspaceGenerationErrorCode =
  | 'WORKSPACE_DISCOVERY_FAILED'
  | 'PROJECT_CONFIG_RESOLUTION_FAILED'
  | 'SOURCE_LIST_FAILED'
  | 'SOURCE_LIST_INVALID'
  | 'FORM_DEFINITION_INVALID'
  | 'DUPLICATE_FORM_ID'
  | 'FORM_FACTORY_FAILED'
  | 'FORM_INSTANCE_INVALID'
  | 'CONTRACT_EXTRACTION_FAILED'
  | 'DIAGNOSTIC_POLICY_FAILED'
  | 'OUTPUT_PATH_OUTSIDE_WORKSPACE'
  | 'OUTPUT_SYMLINK_UNSUPPORTED'
  | 'OUTPUT_WRITE_FAILED';

export type WorkspaceGenerationPhase = 'inventory' | 'extraction' | 'output';

interface WorkspaceGenerationErrorProvenance {
  readonly projectId?: string;
  readonly sourceId?: string;
  readonly formId?: string;
  readonly outputPath?: string;
}

const ERROR_MESSAGES: Readonly<Record<WorkspaceGenerationErrorCode, string>> = {
  WORKSPACE_DISCOVERY_FAILED: 'Workspace discovery failed.',
  PROJECT_CONFIG_RESOLUTION_FAILED: 'Workspace project configuration failed.',
  SOURCE_LIST_FAILED: 'A form contract source could not be listed.',
  SOURCE_LIST_INVALID: 'A form contract source returned an invalid list.',
  FORM_DEFINITION_INVALID: 'A form contract definition is invalid.',
  DUPLICATE_FORM_ID: 'A form ID is declared more than once.',
  FORM_FACTORY_FAILED: 'A form contract factory failed.',
  FORM_INSTANCE_INVALID:
    'A form contract factory returned an invalid instance.',
  CONTRACT_EXTRACTION_FAILED: 'Form contract extraction failed.',
  DIAGNOSTIC_POLICY_FAILED: 'A generated contract violates diagnostic policy.',
  OUTPUT_PATH_OUTSIDE_WORKSPACE: 'An output path is outside the workspace.',
  OUTPUT_SYMLINK_UNSUPPORTED: 'Symlinked output paths are not supported.',
  OUTPUT_WRITE_FAILED: 'Workspace contract output could not be written.',
};

export class WorkspaceGenerationError extends Error {
  readonly code: WorkspaceGenerationErrorCode;
  readonly phase: WorkspaceGenerationPhase;
  readonly projectId?: string;
  readonly sourceId?: string;
  readonly formId?: string;
  readonly outputPath?: string;

  constructor(
    code: WorkspaceGenerationErrorCode,
    phase: WorkspaceGenerationPhase,
    provenance: WorkspaceGenerationErrorProvenance = {},
    cause?: unknown,
  ) {
    super(ERROR_MESSAGES[code], cause === undefined ? undefined : { cause });
    this.name = 'WorkspaceGenerationError';
    this.code = code;
    this.phase = phase;
    if (provenance.projectId !== undefined) {
      this.projectId = provenance.projectId;
    }
    if (provenance.sourceId !== undefined) {
      this.sourceId = provenance.sourceId;
    }
    if (provenance.formId !== undefined) {
      this.formId = provenance.formId;
    }
    if (provenance.outputPath !== undefined) {
      this.outputPath = provenance.outputPath;
    }
  }
}

export interface RunWorkspaceOptions extends DiscoverWorkspaceProjectsOptions {
  readonly cliOverrides?: WorkspaceCliOverrides;
}

export interface WorkspaceRunResult {
  readonly indexPath: string;
  readonly artifactPaths: readonly string[];
  readonly index: WorkspaceContractIndex;
}

interface ResolvedProject {
  readonly discovered: DiscoveredWorkspaceProject;
  readonly resolved: ResolvedWorkspaceProjectConfig;
}

interface InventoriedForm {
  readonly project: ResolvedProject;
  readonly sourceId: string;
  readonly definition: FormContractDefinition;
}

interface PendingArtifact {
  readonly relativePath: string;
  readonly bytes: string;
}

interface ExtractionOutput {
  readonly artifacts: readonly PendingArtifact[];
  readonly forms: WorkspaceContractIndexDraft['forms'];
}

function compareCodeUnits(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function normalizeRelativePath(path: string): string {
  return path.split(/[\\/]/u).join('/');
}

function canonicalOutputDirectory(path: string): string {
  return posix.normalize(normalizeRelativePath(path)).replace(/\/+$/u, '');
}

function isWithinWorkspace(
  workspaceRoot: string,
  candidatePath: string,
): boolean {
  const relativePath = relative(workspaceRoot, candidatePath);
  return (
    relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath))
  );
}

function workspaceRelativePath(
  workspaceRoot: string,
  relativePath: string,
  phase: WorkspaceGenerationPhase,
): string {
  const absolutePath = resolve(workspaceRoot, relativePath);
  if (!isWithinWorkspace(workspaceRoot, absolutePath)) {
    throw new WorkspaceGenerationError('OUTPUT_PATH_OUTSIDE_WORKSPACE', phase, {
      outputPath: normalizeRelativePath(relativePath),
    });
  }
  const normalized = normalizeRelativePath(
    relative(workspaceRoot, absolutePath),
  );
  if (normalized === '' || normalized === '.') {
    throw new WorkspaceGenerationError('OUTPUT_PATH_OUTSIDE_WORKSPACE', phase, {
      outputPath: normalized,
    });
  }
  return normalized;
}

function resolveProjects(
  discovered: DiscoveredWorkspace,
  cliOverrides: WorkspaceCliOverrides | undefined,
): readonly ResolvedProject[] {
  return discovered.projects.map((project) => {
    try {
      const resolved = resolveWorkspaceProjectConfig(
        discovered.root.config,
        project.config,
        cliOverrides,
      );
      return {
        discovered: project,
        resolved: {
          ...resolved,
          outputDirectory: canonicalOutputDirectory(resolved.outputDirectory),
        },
      };
    } catch (error) {
      if (
        error instanceof WorkspaceConfigValidationError &&
        error.path.endsWith('output.directory')
      ) {
        throw new WorkspaceGenerationError(
          'OUTPUT_PATH_OUTSIDE_WORKSPACE',
          'inventory',
          { projectId: project.projectId },
          error,
        );
      }
      throw new WorkspaceGenerationError(
        'PROJECT_CONFIG_RESOLUTION_FAILED',
        'inventory',
        { projectId: project.projectId },
        error,
      );
    }
  });
}

interface SourceListRequest {
  readonly project: ResolvedProject;
  readonly source: FormContractSource;
}

interface SourceListResult extends SourceListRequest {
  readonly result: PromiseSettledResult<unknown>;
}

async function inventoryForms(
  projects: readonly ResolvedProject[],
): Promise<readonly InventoriedForm[]> {
  const requests: SourceListRequest[] = projects.flatMap((project) =>
    [...(project.discovered.config.sources ?? [])]
      .sort((left, right) => compareCodeUnits(left.sourceId, right.sourceId))
      .map((source) => ({ project, source })),
  );
  const settled = await Promise.allSettled(
    requests.map(({ source }) => Promise.resolve().then(() => source.list())),
  );
  const results: SourceListResult[] = requests.map((request, index) => ({
    ...request,
    result: settled[index] as PromiseSettledResult<unknown>,
  }));

  const failed = results.find(({ result }) => result.status === 'rejected');
  if (failed?.result.status === 'rejected') {
    throw new WorkspaceGenerationError(
      'SOURCE_LIST_FAILED',
      'inventory',
      {
        projectId: failed.project.resolved.projectId,
        sourceId: failed.source.sourceId,
      },
      failed.result.reason,
    );
  }

  const inventoried: InventoriedForm[] = [];
  for (const { project, source, result } of results) {
    if (result.status !== 'fulfilled') {
      continue;
    }
    if (!Array.isArray(result.value)) {
      throw new WorkspaceGenerationError('SOURCE_LIST_INVALID', 'inventory', {
        projectId: project.resolved.projectId,
        sourceId: source.sourceId,
      });
    }

    let definitions: readonly FormContractDefinition[];
    try {
      definitions = parseFormContractDefinitions(
        result.value,
        `source[${source.sourceId}].definitions`,
      );
    } catch (error) {
      throw new WorkspaceGenerationError(
        'FORM_DEFINITION_INVALID',
        'inventory',
        {
          projectId: project.resolved.projectId,
          sourceId: source.sourceId,
        },
        error,
      );
    }
    for (const definition of definitions) {
      inventoried.push({ project, sourceId: source.sourceId, definition });
    }
  }

  inventoried.sort(
    (left, right) =>
      compareCodeUnits(left.definition.id, right.definition.id) ||
      compareCodeUnits(
        left.project.resolved.projectId,
        right.project.resolved.projectId,
      ) ||
      compareCodeUnits(left.sourceId, right.sourceId),
  );
  const duplicate = inventoried.find(
    (form, index) =>
      index > 0 && inventoried[index - 1]?.definition.id === form.definition.id,
  );
  if (duplicate !== undefined) {
    throw new WorkspaceGenerationError('DUPLICATE_FORM_ID', 'inventory', {
      projectId: duplicate.project.resolved.projectId,
      sourceId: duplicate.sourceId,
      formId: duplicate.definition.id,
    });
  }
  return inventoried;
}

function findNodeFormlyType(
  nodes: readonly ContractNode[],
  nodeId: string,
): string | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node.formlyType;
    }
    const child = findNodeFormlyType(node.children, nodeId);
    if (child !== undefined) {
      return child;
    }
    if (node.arrayTemplate !== undefined) {
      const template = findNodeFormlyType([node.arrayTemplate], nodeId);
      if (template !== undefined) {
        return template;
      }
    }
  }
  return undefined;
}

function indexDiagnostic(
  contract: FormContract,
  diagnostic: ContractDiagnostic,
): WorkspaceIndexedDiagnostic {
  const formlyType =
    diagnostic.nodeId === undefined
      ? undefined
      : findNodeFormlyType(contract.nodes, diagnostic.nodeId);
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    evidence: diagnostic.evidence,
    sourcePath: diagnostic.sourcePath,
    ...(diagnostic.nodeId === undefined ? {} : { nodeId: diagnostic.nodeId }),
    ...(formlyType === undefined ? {} : { formlyType }),
  };
}

function contractArtifactPath(
  project: ResolvedWorkspaceProjectConfig,
  contract: FormContract,
): string {
  return workspaceContractArtifactPath({
    outputDirectory: project.outputDirectory,
    projectId: project.projectId,
    formId: contract.formId,
    contentHash: contract.contentHash,
  });
}

function extractContracts(
  workspaceRoot: string,
  forms: readonly InventoriedForm[],
): ExtractionOutput {
  const artifacts: PendingArtifact[] = [];
  const indexedForms: WorkspaceContractIndexDraft['forms'][number][] = [];
  const preparedEffectRegistries = new WeakMap<
    object,
    CrossFieldEffectExtractionRegistry
  >();

  for (const form of forms) {
    const provenance = {
      projectId: form.project.resolved.projectId,
      sourceId: form.sourceId,
      formId: form.definition.id,
    };
    let unvalidatedInstance: unknown;
    try {
      unvalidatedInstance = form.definition.create();
    } catch (error) {
      throw new WorkspaceGenerationError(
        'FORM_FACTORY_FAILED',
        'extraction',
        provenance,
        error,
      );
    }

    let instance;
    try {
      instance = parseDeclaredFormContractInstance(
        unvalidatedInstance,
        `form[${form.definition.id}].instance`,
      );
    } catch (error) {
      throw new WorkspaceGenerationError(
        'FORM_INSTANCE_INVALID',
        'extraction',
        provenance,
        error,
      );
    }

    let contract: FormContract;
    try {
      contract = extractFormContract({
        formId: form.definition.id,
        fields: instance.fields,
        ...(instance.model === undefined ? {} : { model: instance.model }),
        ...(instance.formState === undefined
          ? {}
          : { formState: instance.formState }),
        locatorOptions: {
          testIdAttributes: form.project.resolved.testIdAttributes,
        },
        ...(form.project.resolved.fieldTypeProfiles === undefined
          ? {}
          : { fieldTypeProfiles: form.project.resolved.fieldTypeProfiles }),
        ...(form.project.resolved.crossFieldEffects === undefined
          ? {}
          : {
              crossFieldEffects: (() => {
                const configured = form.project.resolved.crossFieldEffects;
                const cached = preparedEffectRegistries.get(configured);
                if (cached !== undefined) {
                  return cached;
                }
                const prepared = prepareCrossFieldEffectExtractionRegistry(
                  configured,
                );
                preparedEffectRegistries.set(configured, prepared);
                return prepared;
              })(),
            }),
        effectCyclePolicy: form.project.resolved.effectCyclePolicy,
      }).contract;
    } catch (error) {
      throw new WorkspaceGenerationError(
        'CONTRACT_EXTRACTION_FAILED',
        'extraction',
        provenance,
        error,
      );
    }

    if (
      contract.diagnostics.some((diagnostic) =>
        form.project.resolved.failOn.includes(diagnostic.severity),
      )
    ) {
      throw new WorkspaceGenerationError(
        'DIAGNOSTIC_POLICY_FAILED',
        'extraction',
        provenance,
      );
    }

    const relativePath = workspaceRelativePath(
      workspaceRoot,
      contractArtifactPath(form.project.resolved, contract),
      'extraction',
    );
    artifacts.push({
      relativePath,
      bytes: `${canonicalStringify(contract)}\n`,
    });
    indexedForms.push({
      ...provenance,
      evidence: 'declared',
      artifactPath: relativePath,
      contractSchemaVersion: contract.schemaVersion,
      contentHash: contract.contentHash,
      diagnostics: contract.diagnostics.map((diagnostic) =>
        indexDiagnostic(contract, diagnostic),
      ),
      ...(contract.crossFieldEffectRegistry === undefined
        ? {}
        : {
            declaredEffects: contract.declaredEffects!,
            effectAnalysis: contract.effectAnalysis!,
          }),
    });
  }

  const sortedArtifacts = [...artifacts].sort((left, right) =>
    compareCodeUnits(left.relativePath, right.relativePath),
  );
  const duplicatePath = sortedArtifacts.find(
    (artifact, index) =>
      index > 0 &&
      sortedArtifacts[index - 1]?.relativePath === artifact.relativePath,
  );
  if (duplicatePath !== undefined) {
    throw new WorkspaceGenerationError('OUTPUT_WRITE_FAILED', 'extraction', {
      outputPath: duplicatePath.relativePath,
    });
  }
  return { artifacts: sortedArtifacts, forms: indexedForms };
}

function projectConfigurationHash(
  project: ResolvedWorkspaceProjectConfig,
): string {
  return computeWorkspaceConfigurationHash({
    schemaVersion: project.schemaVersion,
    projectId: project.projectId,
    outputDirectory: project.outputDirectory,
    testIdAttributes: project.testIdAttributes,
    failOn: project.failOn,
    plugins: project.plugins.map(
      ({ id, version, configSchemaVersion, options }) => ({
        id,
        version,
        configSchemaVersion,
        ...(options === undefined ? {} : { options }),
      }),
    ),
    sourceIds: project.sourceIds,
    ...(project.fieldTypeProfiles === undefined
      ? {}
      : {
          fieldTypeProfileRegistry: {
            schemaVersion: project.fieldTypeProfiles.schemaVersion,
            id: project.fieldTypeProfiles.id,
            version: project.fieldTypeProfiles.version,
            contentHash: project.fieldTypeProfiles.contentHash,
          },
        }),
    ...(project.crossFieldEffects === undefined
      ? {}
      : {
          crossFieldEffectRegistry: {
            schemaVersion: project.crossFieldEffects.schemaVersion,
            id: project.crossFieldEffects.id,
            version: project.crossFieldEffects.version,
            contentHash: project.crossFieldEffects.contentHash,
          },
        }),
    effectCyclePolicy: project.effectCyclePolicy,
  });
}

function buildIndex(
  discovered: DiscoveredWorkspace,
  projects: readonly ResolvedProject[],
  forms: WorkspaceContractIndexDraft['forms'],
  aggregateOutputDirectory: string,
): WorkspaceContractIndex {
  const plugins = discovered.inventory.plugins.map((plugin) => ({ ...plugin }));
  const configurationPlugins = [...(discovered.root.config.plugins ?? [])]
    .sort((left, right) => compareCodeUnits(left.id, right.id))
    .map(({ id, version, configSchemaVersion, options }) => ({
      id,
      version,
      configSchemaVersion,
      ...(options === undefined ? {} : { options }),
    }));
  return createWorkspaceContractIndex({
    schemaVersion: '0.1.0',
    workspaceConfigSchemaVersion: discovered.inventory.schemaVersion,
    rootConfigPath: discovered.inventory.rootConfigPath,
    configurationHash: computeWorkspaceConfigurationHash({
      schemaVersion: discovered.inventory.schemaVersion,
      rootConfigPath: discovered.inventory.rootConfigPath,
      projectConfigs: [...discovered.root.config.projectConfigs].sort(
        compareCodeUnits,
      ),
      excludeProjectConfigs: [
        ...(discovered.root.config.excludeProjectConfigs ?? []),
      ].sort(compareCodeUnits),
      ...(discovered.root.config.tsconfigPath === undefined
        ? {}
        : { tsconfigPath: discovered.root.config.tsconfigPath }),
      outputDirectory: aggregateOutputDirectory,
      ...(discovered.root.config.locators === undefined
        ? {}
        : {
            testIdAttributes: discovered.root.config.locators.testIdAttributes,
          }),
      ...(discovered.root.config.diagnostics === undefined
        ? {}
        : { failOn: discovered.root.config.diagnostics.failOn }),
      effectCyclePolicy:
        discovered.root.config.effects?.cyclePolicy ?? 'error',
      plugins: configurationPlugins,
      projects: projects.map(({ discovered: project, resolved }) => ({
        configPath: project.configPath,
        projectId: resolved.projectId,
        configurationHash: projectConfigurationHash(resolved),
      })),
    }),
    plugins,
    projects: projects.map(({ discovered: project, resolved }) => ({
      configPath: project.configPath,
      projectId: resolved.projectId,
      sourceIds: resolved.sourceIds,
      outputDirectory: normalizeRelativePath(resolved.outputDirectory),
      configurationHash: projectConfigurationHash(resolved),
      ...(resolved.fieldTypeProfiles === undefined
        ? {}
        : {
            fieldTypeProfileRegistry: {
              schemaVersion: resolved.fieldTypeProfiles.schemaVersion,
              id: resolved.fieldTypeProfiles.id,
              version: resolved.fieldTypeProfiles.version,
              contentHash: resolved.fieldTypeProfiles.contentHash,
            },
          }),
      ...(resolved.crossFieldEffects === undefined
        ? {}
        : {
            crossFieldEffectRegistry: {
              schemaVersion: resolved.crossFieldEffects.schemaVersion,
              id: resolved.crossFieldEffects.id,
              version: resolved.crossFieldEffects.version,
              contentHash: resolved.crossFieldEffects.contentHash,
            },
          }),
    })),
    forms,
  });
}

function errnoCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error
    ? error.code
    : undefined;
}

async function inspectOutputPath(
  workspaceRoot: string,
  relativePath: string,
  leafKind: 'file' | 'directory' = 'file',
): Promise<void> {
  const normalized = workspaceRelativePath(
    workspaceRoot,
    relativePath,
    'output',
  );
  const segments = normalized.split('/');
  let current = workspaceRoot;
  for (let index = 0; index < segments.length; index += 1) {
    current = resolve(current, segments[index]!);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (errnoCode(error) === 'ENOENT') {
        continue;
      }
      throw new WorkspaceGenerationError(
        'OUTPUT_WRITE_FAILED',
        'output',
        { outputPath: normalized },
        error,
      );
    }
    if (stats.isSymbolicLink()) {
      throw new WorkspaceGenerationError(
        'OUTPUT_SYMLINK_UNSUPPORTED',
        'output',
        { outputPath: normalized },
      );
    }
    const isLeaf = index === segments.length - 1;
    if (
      (!isLeaf && !stats.isDirectory()) ||
      (isLeaf && leafKind === 'file' && !stats.isFile()) ||
      (isLeaf && leafKind === 'directory' && !stats.isDirectory())
    ) {
      throw new WorkspaceGenerationError('OUTPUT_WRITE_FAILED', 'output', {
        outputPath: normalized,
      });
    }
  }
}

let temporaryFileCounter = 0;

async function atomicWrite(
  workspaceRoot: string,
  relativePath: string,
  bytes: string,
  replace: boolean,
): Promise<void> {
  const normalized = workspaceRelativePath(
    workspaceRoot,
    relativePath,
    'output',
  );
  const absolutePath = resolve(workspaceRoot, normalized);
  await inspectOutputPath(workspaceRoot, normalized);

  if (!replace) {
    try {
      const existing = await readFile(absolutePath, 'utf8');
      if (existing === bytes) {
        return;
      }
      throw new WorkspaceGenerationError('OUTPUT_WRITE_FAILED', 'output', {
        outputPath: normalized,
      });
    } catch (error) {
      if (error instanceof WorkspaceGenerationError) {
        throw error;
      }
      if (errnoCode(error) !== 'ENOENT') {
        throw new WorkspaceGenerationError(
          'OUTPUT_WRITE_FAILED',
          'output',
          { outputPath: normalized },
          error,
        );
      }
    }
  }

  const parent = resolve(absolutePath, '..');
  try {
    await mkdir(parent, { recursive: true });
    await inspectOutputPath(
      workspaceRoot,
      normalizeRelativePath(relative(workspaceRoot, parent)),
      'directory',
    );
  } catch (error) {
    if (error instanceof WorkspaceGenerationError) {
      throw error;
    }
    throw new WorkspaceGenerationError(
      'OUTPUT_WRITE_FAILED',
      'output',
      { outputPath: normalized },
      error,
    );
  }

  temporaryFileCounter += 1;
  const temporaryPath = `${absolutePath}.tmp-${process.pid}-${temporaryFileCounter}`;
  try {
    await writeFile(temporaryPath, bytes, { flag: 'wx' });
    await rename(temporaryPath, absolutePath);
  } catch (error) {
    try {
      await unlink(temporaryPath);
    } catch {
      // The temporary file either was never created or was already renamed.
    }
    throw new WorkspaceGenerationError(
      'OUTPUT_WRITE_FAILED',
      'output',
      { outputPath: normalized },
      error,
    );
  }
}

async function publishOutputs(
  workspaceRoot: string,
  artifacts: readonly PendingArtifact[],
  indexPath: string,
  index: WorkspaceContractIndex,
): Promise<void> {
  const allPaths = [
    ...artifacts.map(({ relativePath }) => relativePath),
    indexPath,
  ];
  await Promise.all(
    allPaths.map((path) => inspectOutputPath(workspaceRoot, path)),
  );
  for (const artifact of artifacts) {
    await atomicWrite(
      workspaceRoot,
      artifact.relativePath,
      artifact.bytes,
      false,
    );
  }
  await atomicWrite(
    workspaceRoot,
    indexPath,
    `${canonicalizeWorkspaceContractIndex(index)}\n`,
    true,
  );
}

export async function runWorkspace(
  options: RunWorkspaceOptions,
): Promise<WorkspaceRunResult> {
  let workspaceRoot: string;
  try {
    workspaceRoot = await realpath(resolve(options.workspaceRoot));
  } catch (error) {
    throw new WorkspaceGenerationError(
      'WORKSPACE_DISCOVERY_FAILED',
      'inventory',
      {},
      error,
    );
  }
  let discovered: DiscoveredWorkspace;
  try {
    discovered = await discoverWorkspaceProjects(options);
  } catch (error) {
    if (
      error instanceof WorkspaceConfigValidationError &&
      error.path.endsWith('output.directory')
    ) {
      throw new WorkspaceGenerationError(
        'OUTPUT_PATH_OUTSIDE_WORKSPACE',
        'inventory',
        {},
        error,
      );
    }
    throw new WorkspaceGenerationError(
      'WORKSPACE_DISCOVERY_FAILED',
      'inventory',
      {},
      error,
    );
  }
  const projects = resolveProjects(discovered, options.cliOverrides);
  const inventoried = await inventoryForms(projects);
  const extracted = extractContracts(workspaceRoot, inventoried);
  const aggregateOutputDirectory = canonicalOutputDirectory(
    options.cliOverrides?.outputDirectory ??
      discovered.root.config.output?.directory ??
      DEFAULT_OUTPUT_DIRECTORY,
  );
  const indexPath = workspaceRelativePath(
    workspaceRoot,
    posix.join(
      normalizeRelativePath(aggregateOutputDirectory),
      'workspace-index.json',
    ),
    'extraction',
  );
  const plannedOutputPaths = [
    ...extracted.artifacts.map(({ relativePath }) => relativePath),
    indexPath,
  ].sort(compareCodeUnits);
  const duplicateOutputPath = plannedOutputPaths.find(
    (path, index) => index > 0 && plannedOutputPaths[index - 1] === path,
  );
  if (duplicateOutputPath !== undefined) {
    throw new WorkspaceGenerationError('OUTPUT_WRITE_FAILED', 'extraction', {
      outputPath: duplicateOutputPath,
    });
  }
  const index = buildIndex(
    discovered,
    projects,
    extracted.forms,
    aggregateOutputDirectory,
  );
  await publishOutputs(workspaceRoot, extracted.artifacts, indexPath, index);
  return {
    indexPath,
    artifactPaths: extracted.artifacts.map(({ relativePath }) => relativePath),
    index,
  };
}
