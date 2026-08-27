import { createHash } from 'node:crypto';

import {
  CONTRACT_DIAGNOSTIC_CODES,
  CROSS_FIELD_EFFECT_SCHEMA_VERSION,
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  FORM_CONTRACT_SCHEMA_VERSION,
  canonicalStringify,
  canonicalizeRuntimeProvenance,
  contractEffectCycleComponents,
  parseCrossFieldEffectRegistry,
  type ContractDiagnosticCode,
  type ContractDiagnosticSeverity,
  type ContractEvidence,
  type ContractEffectAnalysis,
  type DeclaredCrossFieldEffect,
  type ModelPathSegment,
  type RuntimeProvenance,
} from '@formly-contract/schema';

import { WORKSPACE_CONFIG_SCHEMA_VERSION } from './config.js';

export const WORKSPACE_INDEX_SCHEMA_VERSION = '0.2.0' as const;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?$/u;
const CONTRACT_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;

export interface WorkspaceIndexPluginIdentity {
  readonly id: string;
  readonly version: string;
  readonly configSchemaVersion: string;
}

export interface WorkspaceIndexFieldTypeProfileRegistryIdentity {
  readonly schemaVersion: typeof FIELD_TYPE_PROFILE_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface WorkspaceIndexCrossFieldEffectRegistryIdentity {
  readonly schemaVersion: typeof CROSS_FIELD_EFFECT_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface WorkspaceIndexProject {
  readonly configPath: string;
  readonly projectId: string;
  readonly sourceIds: readonly string[];
  readonly outputDirectory: string;
  readonly configurationHash: string;
  readonly runtimeProvenance: RuntimeProvenance;
  readonly fieldTypeProfileRegistry?: WorkspaceIndexFieldTypeProfileRegistryIdentity;
  readonly crossFieldEffectRegistry?: WorkspaceIndexCrossFieldEffectRegistryIdentity;
}

export interface WorkspaceIndexedDiagnostic {
  readonly code: ContractDiagnosticCode;
  readonly severity: ContractDiagnosticSeverity;
  readonly message: string;
  readonly evidence: ContractEvidence;
  readonly sourcePath: readonly ModelPathSegment[];
  readonly nodeId?: string;
  readonly formlyType?: string;
}

export interface WorkspaceIndexForm {
  readonly projectId: string;
  readonly sourceId: string;
  readonly formId: string;
  readonly evidence: 'declared';
  readonly artifactPath: string;
  readonly contractSchemaVersion: typeof FORM_CONTRACT_SCHEMA_VERSION;
  readonly contentHash: string;
  readonly diagnostics: readonly WorkspaceIndexedDiagnostic[];
  readonly declaredEffects?: readonly DeclaredCrossFieldEffect[];
  readonly effectAnalysis?: ContractEffectAnalysis;
}

export interface WorkspaceContractIndexDraft {
  readonly schemaVersion: typeof WORKSPACE_INDEX_SCHEMA_VERSION;
  readonly workspaceConfigSchemaVersion: typeof WORKSPACE_CONFIG_SCHEMA_VERSION;
  readonly rootConfigPath: string;
  readonly configurationHash: string;
  readonly runtimeProvenance: RuntimeProvenance;
  readonly plugins: readonly WorkspaceIndexPluginIdentity[];
  readonly projects: readonly WorkspaceIndexProject[];
  readonly forms: readonly WorkspaceIndexForm[];
}

export interface WorkspaceContractIndex extends WorkspaceContractIndexDraft {
  readonly contentHash: string;
}

type DataRecord = Readonly<Record<string, unknown>>;

const INDEX_KEYS = new Set([
  'schemaVersion',
  'workspaceConfigSchemaVersion',
  'rootConfigPath',
  'configurationHash',
  'runtimeProvenance',
  'plugins',
  'projects',
  'forms',
  'contentHash',
]);
const DRAFT_KEYS = new Set(
  [...INDEX_KEYS].filter((key) => key !== 'contentHash'),
);
const PLUGIN_KEYS = new Set(['id', 'version', 'configSchemaVersion']);
const PROJECT_KEYS = new Set([
  'configPath',
  'projectId',
  'sourceIds',
  'outputDirectory',
  'configurationHash',
  'runtimeProvenance',
  'fieldTypeProfileRegistry',
  'crossFieldEffectRegistry',
]);
const PROFILE_REGISTRY_KEYS = new Set([
  'schemaVersion',
  'id',
  'version',
  'contentHash',
]);
const EFFECT_REGISTRY_KEYS = PROFILE_REGISTRY_KEYS;
const FORM_KEYS = new Set([
  'projectId',
  'sourceId',
  'formId',
  'evidence',
  'artifactPath',
  'contractSchemaVersion',
  'contentHash',
  'diagnostics',
  'declaredEffects',
  'effectAnalysis',
]);
const EFFECT_ANALYSIS_KEYS = new Set(['completeness', 'reasons']);
const DIAGNOSTIC_KEYS = new Set([
  'code',
  'severity',
  'message',
  'evidence',
  'sourcePath',
  'nodeId',
  'formlyType',
]);

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function readRecord(
  input: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object.');
  }
  if (Object.getOwnPropertySymbols(input).length > 0) {
    fail(path, 'must not contain symbol-keyed properties.');
  }

  const descriptors = Object.getOwnPropertyDescriptors(input);
  const result: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!allowedKeys.has(key)) {
      fail(`${path}.${key}`, 'is not supported.');
    }
    if (!descriptor.enumerable) {
      fail(`${path}.${key}`, 'must be enumerable.');
    }
    if (!('value' in descriptor)) {
      fail(`${path}.${key}`, 'must be a data property.');
    }
    result[key] = descriptor.value;
  }
  return result;
}

function readArray(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  if (Object.getOwnPropertySymbols(input).length > 0) {
    fail(path, 'must not contain symbol-keyed properties.');
  }

  const descriptors = Object.getOwnPropertyDescriptors(input);
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined) {
      fail(`${path}[${index}]`, 'must not be sparse.');
    }
    if (!descriptor.enumerable) {
      fail(`${path}[${index}]`, 'must be enumerable.');
    }
    if (!('value' in descriptor)) {
      fail(`${path}[${index}]`, 'must be a data property.');
    }
    values.push(descriptor.value);
  }
  for (const key of Object.keys(descriptors)) {
    if (
      key === 'length' ||
      (/^(?:0|[1-9][0-9]*)$/u.test(key) && Number(key) < input.length)
    ) {
      continue;
    }
    fail(`${path}.${key}`, 'is not a supported array property.');
  }
  return values;
}

function required(record: DataRecord, key: string, path: string): unknown {
  if (!Object.hasOwn(record, key)) {
    fail(`${path}.${key}`, 'is required.');
  }
  return record[key];
}

function nonEmptyString(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length === 0) {
    fail(path, 'must be a non-empty string.');
  }
  return input;
}

function isWorkspaceStableId(value: string): boolean {
  return (
    /^[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/u.test(value) &&
    !value
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  );
}

function stableId(input: unknown, path: string): string {
  const value = nonEmptyString(input, path);
  if (!isWorkspaceStableId(value)) {
    fail(
      path,
      'must be a lowercase stable ID using letters, numbers, dot, slash, underscore, or hyphen.',
    );
  }
  return value;
}

function contractIdentifier(input: unknown, path: string): string {
  const value = nonEmptyString(input, path);
  if (!isContractIdentifier(value)) {
    fail(path, 'must be a stable contract identifier.');
  }
  return value;
}

function isContractIdentifier(value: string): boolean {
  return CONTRACT_IDENTIFIER_PATTERN.test(value);
}

function versionString(input: unknown, path: string): string {
  const value = nonEmptyString(input, path);
  if (!VERSION_PATTERN.test(value)) {
    fail(path, 'must be a stable version string.');
  }
  return value;
}

function contentHash(input: unknown, path: string): string {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a sha256 digest.');
  }
  return input;
}

function relativePath(input: unknown, path: string): string {
  const value = nonEmptyString(input, path);
  if (
    value.includes('\0') ||
    value.includes('\\') ||
    value.startsWith('/') ||
    /^[A-Za-z]:/u.test(value) ||
    /[*?[\]{}]/u.test(value) ||
    value
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(path, 'must be a safe workspace-relative path.');
  }
  return value;
}

function parsePlugin(
  input: unknown,
  path: string,
): WorkspaceIndexPluginIdentity {
  const record = readRecord(input, path, PLUGIN_KEYS);
  return {
    id: stableId(required(record, 'id', path), `${path}.id`),
    version: versionString(
      required(record, 'version', path),
      `${path}.version`,
    ),
    configSchemaVersion: versionString(
      required(record, 'configSchemaVersion', path),
      `${path}.configSchemaVersion`,
    ),
  };
}

function parseProfileRegistry(
  input: unknown,
  path: string,
): WorkspaceIndexFieldTypeProfileRegistryIdentity {
  const record = readRecord(input, path, PROFILE_REGISTRY_KEYS);
  if (
    required(record, 'schemaVersion', path) !==
    FIELD_TYPE_PROFILE_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${FIELD_TYPE_PROFILE_SCHEMA_VERSION}.`,
    );
  }
  const version = required(record, 'version', path);
  if (!Number.isSafeInteger(version) || Number(version) <= 0) {
    fail(`${path}.version`, 'must be a positive safe integer.');
  }
  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id: stableId(required(record, 'id', path), `${path}.id`),
    version: Number(version),
    contentHash: contentHash(
      required(record, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function parseEffectRegistry(
  input: unknown,
  path: string,
): WorkspaceIndexCrossFieldEffectRegistryIdentity {
  const record = readRecord(input, path, EFFECT_REGISTRY_KEYS);
  if (
    required(record, 'schemaVersion', path) !==
    CROSS_FIELD_EFFECT_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${CROSS_FIELD_EFFECT_SCHEMA_VERSION}.`,
    );
  }
  const version = required(record, 'version', path);
  if (!Number.isSafeInteger(version) || Number(version) <= 0) {
    fail(`${path}.version`, 'must be a positive safe integer.');
  }
  return {
    schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
    id: stableId(required(record, 'id', path), `${path}.id`),
    version: Number(version),
    contentHash: contentHash(
      required(record, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function assertNoDuplicates(
  values: readonly string[],
  path: string,
  label: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      fail(
        path,
        `must not contain duplicate ${label} ${JSON.stringify(value)}.`,
      );
    }
    seen.add(value);
  }
}

function compareCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseProject(input: unknown, path: string): WorkspaceIndexProject {
  const record = readRecord(input, path, PROJECT_KEYS);
  const rawSourceIds = readArray(
    required(record, 'sourceIds', path),
    `${path}.sourceIds`,
  );
  const sourceIds = rawSourceIds.map((sourceId, index) =>
    stableId(sourceId, `${path}.sourceIds[${index}]`),
  );
  assertNoDuplicates(sourceIds, `${path}.sourceIds`, 'source ID');

  const fieldTypeProfileRegistry = Object.hasOwn(
    record,
    'fieldTypeProfileRegistry',
  )
    ? parseProfileRegistry(
        record.fieldTypeProfileRegistry,
        `${path}.fieldTypeProfileRegistry`,
      )
    : undefined;
  const crossFieldEffectRegistry = Object.hasOwn(
    record,
    'crossFieldEffectRegistry',
  )
    ? parseEffectRegistry(
        record.crossFieldEffectRegistry,
        `${path}.crossFieldEffectRegistry`,
      )
    : undefined;

  return {
    configPath: relativePath(
      required(record, 'configPath', path),
      `${path}.configPath`,
    ),
    projectId: stableId(
      required(record, 'projectId', path),
      `${path}.projectId`,
    ),
    sourceIds,
    outputDirectory: relativePath(
      required(record, 'outputDirectory', path),
      `${path}.outputDirectory`,
    ),
    configurationHash: contentHash(
      required(record, 'configurationHash', path),
      `${path}.configurationHash`,
    ),
    runtimeProvenance: JSON.parse(
      canonicalizeRuntimeProvenance(
        required(record, 'runtimeProvenance', path),
      ),
    ) as RuntimeProvenance,
    ...(fieldTypeProfileRegistry === undefined
      ? {}
      : { fieldTypeProfileRegistry }),
    ...(crossFieldEffectRegistry === undefined
      ? {}
      : { crossFieldEffectRegistry }),
  };
}

function parseSourcePath(
  input: unknown,
  path: string,
): readonly ModelPathSegment[] {
  return readArray(input, path).map((segment, index) => {
    if (typeof segment === 'string' && segment.length > 0) {
      return segment;
    }
    if (
      typeof segment === 'number' &&
      Number.isSafeInteger(segment) &&
      segment >= 0
    ) {
      return segment;
    }
    fail(
      `${path}[${index}]`,
      'must be a non-empty string or non-negative integer.',
    );
  });
}

function parseDiagnostic(
  input: unknown,
  path: string,
): WorkspaceIndexedDiagnostic {
  const record = readRecord(input, path, DIAGNOSTIC_KEYS);
  const code = required(record, 'code', path);
  if (
    typeof code !== 'string' ||
    !CONTRACT_DIAGNOSTIC_CODES.includes(
      code as typeof CONTRACT_DIAGNOSTIC_CODES[number],
    )
  ) {
    fail(`${path}.code`, 'is unsupported.');
  }
  const severity = required(record, 'severity', path);
  if (severity !== 'warning' && severity !== 'error') {
    fail(`${path}.severity`, 'is unsupported.');
  }
  const evidence = required(record, 'evidence', path);
  if (
    evidence !== 'declared' &&
    evidence !== 'resolved' &&
    evidence !== 'observed'
  ) {
    fail(`${path}.evidence`, 'is unsupported.');
  }
  const nodeId = Object.hasOwn(record, 'nodeId')
    ? contractIdentifier(record.nodeId, `${path}.nodeId`)
    : undefined;
  const formlyType = Object.hasOwn(record, 'formlyType')
    ? nonEmptyString(record.formlyType, `${path}.formlyType`)
    : undefined;

  return {
    code: code as ContractDiagnosticCode,
    severity,
    message: nonEmptyString(
      required(record, 'message', path),
      `${path}.message`,
    ),
    evidence,
    sourcePath: parseSourcePath(
      required(record, 'sourcePath', path),
      `${path}.sourcePath`,
    ),
    ...(nodeId === undefined ? {} : { nodeId }),
    ...(formlyType === undefined ? {} : { formlyType }),
  };
}

function parseDeclaredEffects(
  input: unknown,
  formId: string,
  path: string,
): readonly DeclaredCrossFieldEffect[] {
  const effects = JSON.parse(
    canonicalStringify(readArray(input, path)),
  ) as readonly unknown[];
  try {
    return parseCrossFieldEffectRegistry({
      schemaVersion: CROSS_FIELD_EFFECT_SCHEMA_VERSION,
      id: 'workspace.index-effects',
      version: 1,
      forms: [{ formId, coverage: 'complete', effects }],
    }).forms[0]!.effects;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'is invalid';
    fail(path, message);
  }
}

function parseEffectAnalysis(
  input: unknown,
  path: string,
): ContractEffectAnalysis {
  const record = readRecord(input, path, EFFECT_ANALYSIS_KEYS);
  const completeness = required(record, 'completeness', path);
  if (completeness !== 'complete' && completeness !== 'incomplete') {
    fail(`${path}.completeness`, 'is unsupported.');
  }
  const allowedReasons = new Set([
    'declared-partial',
    'effect-cycle',
    'form-not-declared',
    'invalid-declared-effect',
    'opaque-dynamic-rule',
    'opaque-diagnostic',
  ]);
  const reasons = readArray(
    required(record, 'reasons', path),
    `${path}.reasons`,
  ).map((reason, index) => {
    if (typeof reason !== 'string' || !allowedReasons.has(reason)) {
      fail(`${path}.reasons[${index}]`, 'is unsupported.');
    }
    return reason as ContractEffectAnalysis['reasons'][number];
  });
  assertNoDuplicates(reasons, `${path}.reasons`, 'analysis reason');
  if (completeness === 'complete' && reasons.length > 0) {
    fail(`${path}.reasons`, 'must be empty for complete analysis.');
  }
  if (completeness === 'incomplete' && reasons.length === 0) {
    fail(`${path}.reasons`, 'must explain incomplete analysis.');
  }
  return { completeness, reasons };
}

function parseForm(input: unknown, path: string): WorkspaceIndexForm {
  const record = readRecord(input, path, FORM_KEYS);
  const formId = contractIdentifier(
    required(record, 'formId', path),
    `${path}.formId`,
  );
  if (required(record, 'evidence', path) !== 'declared') {
    fail(`${path}.evidence`, 'must be "declared".');
  }
  if (
    required(record, 'contractSchemaVersion', path) !==
    FORM_CONTRACT_SCHEMA_VERSION
  ) {
    fail(
      `${path}.contractSchemaVersion`,
      `must be ${FORM_CONTRACT_SCHEMA_VERSION}.`,
    );
  }
  const diagnostics = readArray(
    required(record, 'diagnostics', path),
    `${path}.diagnostics`,
  ).map((diagnostic, index) =>
    parseDiagnostic(diagnostic, `${path}.diagnostics[${index}]`),
  );
  const hasDeclaredEffects = Object.hasOwn(record, 'declaredEffects');
  const hasEffectAnalysis = Object.hasOwn(record, 'effectAnalysis');
  if (hasDeclaredEffects !== hasEffectAnalysis) {
    fail(path, 'declaredEffects and effectAnalysis must appear together.');
  }
  const declaredEffects = hasDeclaredEffects
    ? parseDeclaredEffects(
        record.declaredEffects,
        formId,
        `${path}.declaredEffects`,
      )
    : undefined;
  if (declaredEffects !== undefined) {
    assertNoDuplicates(
      declaredEffects.map(({ identity }) => identity.id),
      `${path}.declaredEffects`,
      'effect ID',
    );
  }
  const effectAnalysis = hasEffectAnalysis
    ? parseEffectAnalysis(record.effectAnalysis, `${path}.effectAnalysis`)
    : undefined;
  if (
    declaredEffects !== undefined &&
    contractEffectCycleComponents(declaredEffects).length > 0 &&
    !effectAnalysis?.reasons.includes('effect-cycle')
  ) {
    fail(
      `${path}.effectAnalysis`,
      'must report effect-cycle for cyclic declaredEffects.',
    );
  }
  return {
    projectId: stableId(
      required(record, 'projectId', path),
      `${path}.projectId`,
    ),
    sourceId: stableId(required(record, 'sourceId', path), `${path}.sourceId`),
    formId,
    evidence: 'declared',
    artifactPath: relativePath(
      required(record, 'artifactPath', path),
      `${path}.artifactPath`,
    ),
    contractSchemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
    contentHash: contentHash(
      required(record, 'contentHash', path),
      `${path}.contentHash`,
    ),
    diagnostics,
    ...(declaredEffects === undefined ? {} : { declaredEffects }),
    ...(effectAnalysis === undefined ? {} : { effectAnalysis }),
  };
}

function comparePlugins(
  left: WorkspaceIndexPluginIdentity,
  right: WorkspaceIndexPluginIdentity,
): number {
  return compareCodeUnit(left.id, right.id);
}

function compareProjects(
  left: WorkspaceIndexProject,
  right: WorkspaceIndexProject,
): number {
  return (
    compareCodeUnit(left.configPath, right.configPath) ||
    compareCodeUnit(left.projectId, right.projectId)
  );
}

function compareForms(
  left: WorkspaceIndexForm,
  right: WorkspaceIndexForm,
): number {
  return (
    compareCodeUnit(left.formId, right.formId) ||
    compareCodeUnit(left.projectId, right.projectId) ||
    compareCodeUnit(left.sourceId, right.sourceId)
  );
}

function assertCanonicalOrder<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
  path: string,
): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      compare(previous, current) > 0
    ) {
      fail(path, 'must be in canonical order.');
    }
  }
}

function assertReferences(
  projects: readonly WorkspaceIndexProject[],
  forms: readonly WorkspaceIndexForm[],
): void {
  const projectsById = new Map(
    projects.map((project) => [project.projectId, project]),
  );
  for (const [index, form] of forms.entries()) {
    const project = projectsById.get(form.projectId);
    if (project === undefined) {
      fail(
        `workspaceIndex.forms[${index}].projectId`,
        'must reference an indexed project.',
      );
    }
    if (!project.sourceIds.includes(form.sourceId)) {
      fail(
        `workspaceIndex.forms[${index}].sourceId`,
        'must reference an indexed project source.',
      );
    }
    if (
      (project.crossFieldEffectRegistry === undefined) !==
      (form.declaredEffects === undefined)
    ) {
      fail(
        `workspaceIndex.forms[${index}].declaredEffects`,
        'must match the project cross-field effect registry configuration.',
      );
    }
    const expectedArtifactPath = workspaceContractArtifactPath({
      outputDirectory: project.outputDirectory,
      projectId: form.projectId,
      formId: form.formId,
      contentHash: form.contentHash,
    });
    if (form.artifactPath !== expectedArtifactPath) {
      fail(
        `workspaceIndex.forms[${index}].artifactPath`,
        'must match its canonical content-addressed path.',
      );
    }
  }
}

function parseIndexDraft(
  input: unknown,
  includeHash: boolean,
  requireCanonicalOrder: boolean,
): WorkspaceContractIndexDraft & { readonly contentHash?: string } {
  const path = 'workspaceIndex';
  const record = readRecord(input, path, includeHash ? INDEX_KEYS : DRAFT_KEYS);
  if (
    required(record, 'schemaVersion', path) !== WORKSPACE_INDEX_SCHEMA_VERSION
  ) {
    fail(`${path}.schemaVersion`, `must be ${WORKSPACE_INDEX_SCHEMA_VERSION}.`);
  }
  if (
    required(record, 'workspaceConfigSchemaVersion', path) !==
    WORKSPACE_CONFIG_SCHEMA_VERSION
  ) {
    fail(
      `${path}.workspaceConfigSchemaVersion`,
      `must be ${WORKSPACE_CONFIG_SCHEMA_VERSION}.`,
    );
  }
  const plugins = readArray(
    required(record, 'plugins', path),
    `${path}.plugins`,
  ).map((plugin, index) => parsePlugin(plugin, `${path}.plugins[${index}]`));
  const projects = readArray(
    required(record, 'projects', path),
    `${path}.projects`,
  ).map((project, index) =>
    parseProject(project, `${path}.projects[${index}]`),
  );
  const forms = readArray(required(record, 'forms', path), `${path}.forms`).map(
    (form, index) => parseForm(form, `${path}.forms[${index}]`),
  );

  assertNoDuplicates(
    plugins.map((plugin) => plugin.id),
    `${path}.plugins`,
    'plugin ID',
  );
  assertNoDuplicates(
    projects.map((project) => project.projectId),
    `${path}.projects`,
    'project ID',
  );
  assertNoDuplicates(
    projects.map((project) => project.configPath),
    `${path}.projects`,
    'project config path',
  );
  assertNoDuplicates(
    projects.flatMap((project) => project.sourceIds),
    `${path}.projects`,
    'source ID',
  );
  assertNoDuplicates(
    forms.map((form) => form.formId),
    `${path}.forms`,
    'form ID',
  );
  assertNoDuplicates(
    forms.map((form) => form.artifactPath),
    `${path}.forms`,
    'artifact path',
  );
  assertReferences(projects, forms);

  if (requireCanonicalOrder) {
    assertCanonicalOrder(plugins, comparePlugins, `${path}.plugins`);
    assertCanonicalOrder(projects, compareProjects, `${path}.projects`);
    assertCanonicalOrder(forms, compareForms, `${path}.forms`);
    for (const [index, project] of projects.entries()) {
      assertCanonicalOrder(
        project.sourceIds,
        compareCodeUnit,
        `${path}.projects[${index}].sourceIds`,
      );
    }
    for (const [index, form] of forms.entries()) {
      if (form.declaredEffects !== undefined) {
        assertCanonicalOrder(
          form.declaredEffects,
          (left, right) =>
            compareCodeUnit(left.identity.id, right.identity.id),
          `${path}.forms[${index}].declaredEffects`,
        );
      }
      if (form.effectAnalysis !== undefined) {
        assertCanonicalOrder(
          form.effectAnalysis.reasons,
          compareCodeUnit,
          `${path}.forms[${index}].effectAnalysis.reasons`,
        );
      }
    }
  }

  const hash = includeHash
    ? contentHash(required(record, 'contentHash', path), `${path}.contentHash`)
    : undefined;
  return {
    schemaVersion: WORKSPACE_INDEX_SCHEMA_VERSION,
    workspaceConfigSchemaVersion: WORKSPACE_CONFIG_SCHEMA_VERSION,
    rootConfigPath: relativePath(
      required(record, 'rootConfigPath', path),
      `${path}.rootConfigPath`,
    ),
    configurationHash: contentHash(
      required(record, 'configurationHash', path),
      `${path}.configurationHash`,
    ),
    runtimeProvenance: JSON.parse(
      canonicalizeRuntimeProvenance(
        required(record, 'runtimeProvenance', path),
      ),
    ) as RuntimeProvenance,
    plugins,
    projects,
    forms,
    ...(hash === undefined ? {} : { contentHash: hash }),
  };
}

function sha256(canonical: string): string {
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

function withoutIndexContentHash(
  input: WorkspaceContractIndex | WorkspaceContractIndexDraft,
): WorkspaceContractIndexDraft {
  const record = readRecord(input, 'workspaceIndex', INDEX_KEYS);
  const result: Record<string, unknown> = {};
  for (const key of DRAFT_KEYS) {
    if (Object.hasOwn(record, key)) {
      result[key] = record[key];
    }
  }
  return result as unknown as WorkspaceContractIndexDraft;
}

export function computeWorkspaceConfigurationHash(value: unknown): string {
  return sha256(canonicalStringify(value));
}

export function computeWorkspaceIndexHash(
  index: WorkspaceContractIndex | WorkspaceContractIndexDraft,
): string {
  return sha256(canonicalStringify(withoutIndexContentHash(index)));
}

export function createWorkspaceContractIndex(
  draft: WorkspaceContractIndexDraft,
): WorkspaceContractIndex {
  const parsed = parseIndexDraft(draft, false, false);
  const normalized: WorkspaceContractIndexDraft = {
    ...parsed,
    plugins: [...parsed.plugins].sort(comparePlugins),
    projects: [...parsed.projects]
      .map((project) => ({
        ...project,
        sourceIds: [...project.sourceIds].sort(compareCodeUnit),
      }))
      .sort(compareProjects),
    forms: [...parsed.forms]
      .map((form) => ({
        ...form,
        ...(form.declaredEffects === undefined
          ? {}
          : {
              declaredEffects: [...form.declaredEffects].sort((left, right) =>
                compareCodeUnit(left.identity.id, right.identity.id),
              ),
              effectAnalysis: {
                ...form.effectAnalysis!,
                reasons: [...form.effectAnalysis!.reasons].sort(compareCodeUnit),
              },
            }),
      }))
      .sort(compareForms),
  };
  return {
    ...normalized,
    contentHash: computeWorkspaceIndexHash(normalized),
  };
}

export function parseWorkspaceContractIndex(
  input: unknown,
): WorkspaceContractIndex {
  const parsed = parseIndexDraft(input, true, true);
  const index = parsed as WorkspaceContractIndex;
  if (index.contentHash !== computeWorkspaceIndexHash(index)) {
    fail('workspaceIndex.contentHash', 'does not match index content.');
  }
  return index;
}

export function canonicalizeWorkspaceContractIndex(
  index: WorkspaceContractIndex,
): string {
  return canonicalStringify(parseWorkspaceContractIndex(index));
}

export function encodeWorkspaceId(stableIdentifier: string): string {
  if (
    !isWorkspaceStableId(stableIdentifier) &&
    !isContractIdentifier(stableIdentifier)
  ) {
    fail(
      'stableId',
      'must be a workspace stable ID or Form Contract stable identifier.',
    );
  }
  return `id_${Buffer.from(stableIdentifier, 'utf8').toString('base64url')}`;
}

export function workspaceContractArtifactPath(identity: {
  readonly outputDirectory: string;
  readonly projectId: string;
  readonly formId: string;
  readonly contentHash: string;
}): string {
  const outputDirectory = relativePath(
    identity.outputDirectory,
    'artifactIdentity.outputDirectory',
  );
  const projectId = stableId(identity.projectId, 'artifactIdentity.projectId');
  const formId = contractIdentifier(identity.formId, 'artifactIdentity.formId');
  const hash = contentHash(
    identity.contentHash,
    'artifactIdentity.contentHash',
  );
  return `${outputDirectory}/projects/${encodeWorkspaceId(
    projectId,
  )}/forms/${encodeWorkspaceId(formId)}/${hash.replace(
    /^sha256:/u,
    'sha256-',
  )}.contract.json`;
}
