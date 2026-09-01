import { canonicalStringify, type JsonValue } from '@formly-contract/schema';

export const RUNTIME_HOST_PROTOCOL_VERSION = '1' as const;

export type RuntimeHostOperation = 'inventory' | 'generate' | 'check';

export interface RuntimeHostModuleDescriptor {
  readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
  readonly id: string;
  readonly version: string;
  /** Parent-resolved local URL. This value is IPC-only and never portable. */
  readonly moduleUrl: string;
  readonly exportName: 'createWorkspaceRuntimeHost';
  readonly options?: JsonValue;
}

export interface ProjectExecutionRequest {
  readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
  readonly requestId: string;
  readonly operation: RuntimeHostOperation;
  /** Canonical absolute path used only inside local IPC. */
  readonly workspaceRoot: string;
  readonly rootConfigPath: string;
  readonly configPath: string;
  readonly projectRoot: string;
  readonly runtimeResolutionBase: string;
  readonly tsconfigPath?: string;
  readonly rootPolicy: JsonValue;
  readonly cliOverrides?: JsonValue;
  readonly runtimeHost?: RuntimeHostModuleDescriptor;
}

export interface RuntimeHostProjectInventory {
  readonly projectId: string;
  readonly sourceIds: readonly string[];
  readonly formIds: readonly string[];
}

export type RuntimeHostParentMessage =
  | {
      readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
      readonly kind: 'initialize';
      readonly request: ProjectExecutionRequest;
    }
  | {
      readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
      readonly kind: 'approve';
      readonly requestId: string;
    }
  | {
      readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
      readonly kind: 'abort';
      readonly requestId: string;
    };

export type RuntimeHostWorkerMessage =
  | {
      readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
      readonly kind: 'inventory';
      readonly requestId: string;
      readonly inventory: RuntimeHostProjectInventory;
    }
  | {
      readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
      readonly kind: 'result';
      readonly requestId: string;
      readonly result: JsonValue;
    }
  | {
      readonly protocolVersion: typeof RUNTIME_HOST_PROTOCOL_VERSION;
      readonly kind: 'failure';
      readonly requestId: string;
      readonly code: RuntimeHostFailureCode;
      readonly phase: 'bootstrap' | 'inventory' | 'compile';
    };

export type RuntimeHostFailureCode =
  | 'HOST_DESCRIPTOR_INVALID'
  | 'HOST_IDENTITY_MISMATCH'
  | 'HOST_LOAD_FAILED'
  | 'PROJECT_CONFIG_LOAD_FAILED'
  | 'PROJECT_INVENTORY_FAILED'
  | 'PROJECT_COMPILE_FAILED'
  | 'PROTOCOL_INVALID'
  | 'WORKER_ABORTED';

type DataRecord = Readonly<Record<string, unknown>>;

const VERSION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?$/u;
const ID_PATTERN = /^@?[A-Za-z0-9](?:[A-Za-z0-9@._+/-]*[A-Za-z0-9])?$/u;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const DESCRIPTOR_KEYS = new Set([
  'protocolVersion',
  'id',
  'version',
  'moduleUrl',
  'exportName',
  'options',
]);
const REQUEST_KEYS = new Set([
  'protocolVersion',
  'requestId',
  'operation',
  'workspaceRoot',
  'rootConfigPath',
  'configPath',
  'projectRoot',
  'runtimeResolutionBase',
  'tsconfigPath',
  'rootPolicy',
  'cliOverrides',
  'runtimeHost',
]);
const INVENTORY_KEYS = new Set(['projectId', 'sourceIds', 'formIds']);
const PARENT_KEYS = new Set([
  'protocolVersion',
  'kind',
  'request',
  'requestId',
]);
const WORKER_KEYS = new Set([
  'protocolVersion',
  'kind',
  'requestId',
  'inventory',
  'result',
  'code',
  'phase',
]);
const OPERATIONS = new Set<RuntimeHostOperation>([
  'inventory',
  'generate',
  'check',
]);
const FAILURE_CODES = new Set<RuntimeHostFailureCode>([
  'HOST_DESCRIPTOR_INVALID',
  'HOST_IDENTITY_MISMATCH',
  'HOST_LOAD_FAILED',
  'PROJECT_CONFIG_LOAD_FAILED',
  'PROJECT_INVENTORY_FAILED',
  'PROJECT_COMPILE_FAILED',
  'PROTOCOL_INVALID',
  'WORKER_ABORTED',
]);

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function record(
  input: unknown,
  path: string,
  keys: ReadonlySet<string>,
): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  const prototype: unknown = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object.');
  }
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(input),
  )) {
    if (!keys.has(key)) fail(`${path}.${key}`, 'is not supported.');
    if (!descriptor.enumerable || !('value' in descriptor)) {
      fail(`${path}.${key}`, 'must be an enumerable data property.');
    }
  }
  if (Object.getOwnPropertySymbols(input).length > 0) {
    fail(path, 'must not contain symbol properties.');
  }
  return input as DataRecord;
}

function required(value: DataRecord, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'is required.');
  return value[key];
}

function stringValue(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length === 0 || input.includes('\0')) {
    fail(path, 'must be a non-empty string.');
  }
  return input;
}

function identity(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!ID_PATTERN.test(value)) fail(path, 'must be a stable runtime identity.');
  return value;
}

function version(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!VERSION_PATTERN.test(value)) fail(path, 'must be a stable version.');
  return value;
}

function requestId(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!REQUEST_ID_PATTERN.test(value)) fail(path, 'must be a stable request ID.');
  return value;
}

function relativePath(input: unknown, path: string, allowDot = false): string {
  const value = stringValue(input, path).replaceAll('\\', '/');
  if (allowDot && value === '.') return value;
  if (
    value.startsWith('/') ||
    /^[A-Za-z]:/u.test(value) ||
    /[*?[\]{}]/u.test(value) ||
    value.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(path, 'must be a safe workspace-relative path.');
  }
  return value;
}

function absolutePath(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!value.startsWith('/') && !/^[A-Za-z]:[\\/]/u.test(value)) {
    fail(path, 'must be an absolute path.');
  }
  return value;
}

function jsonValue(input: unknown, path: string): JsonValue {
  try {
    canonicalStringify(input);
  } catch {
    fail(path, 'must be JSON-safe.');
  }
  return input as JsonValue;
}

function stringArray(input: unknown, path: string): readonly string[] {
  if (!Array.isArray(input)) fail(path, 'must be an array.');
  const values = input.map((entry, index) =>
    identity(entry, `${path}[${index}]`),
  );
  if (new Set(values).size !== values.length) fail(path, 'must not contain duplicates.');
  return values;
}

export function parseRuntimeHostModuleDescriptor(
  input: unknown,
): RuntimeHostModuleDescriptor {
  const path = 'runtimeHost';
  const value = record(input, path, DESCRIPTOR_KEYS);
  if (required(value, 'protocolVersion', path) !== RUNTIME_HOST_PROTOCOL_VERSION) {
    fail(`${path}.protocolVersion`, 'is unsupported.');
  }
  const rawModuleUrl = stringValue(required(value, 'moduleUrl', path), `${path}.moduleUrl`);
  let moduleUrl: URL;
  try {
    moduleUrl = new URL(rawModuleUrl);
  } catch {
    fail(`${path}.moduleUrl`, 'must be an absolute file URL.');
  }
  if (moduleUrl.protocol !== 'file:' || moduleUrl.search || moduleUrl.hash) {
    fail(`${path}.moduleUrl`, 'must be an unmodified absolute file URL.');
  }
  if (required(value, 'exportName', path) !== 'createWorkspaceRuntimeHost') {
    fail(`${path}.exportName`, 'is unsupported.');
  }
  return {
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    id: identity(required(value, 'id', path), `${path}.id`),
    version: version(required(value, 'version', path), `${path}.version`),
    moduleUrl: moduleUrl.href,
    exportName: 'createWorkspaceRuntimeHost',
    ...(Object.hasOwn(value, 'options')
      ? { options: jsonValue(value.options, `${path}.options`) }
      : {}),
  };
}

export function defineRuntimeHostModuleDescriptor(
  descriptor: RuntimeHostModuleDescriptor,
): RuntimeHostModuleDescriptor {
  return Object.freeze(parseRuntimeHostModuleDescriptor(descriptor));
}

export function parseProjectExecutionRequest(
  input: unknown,
): ProjectExecutionRequest {
  const path = 'request';
  const value = record(input, path, REQUEST_KEYS);
  if (required(value, 'protocolVersion', path) !== RUNTIME_HOST_PROTOCOL_VERSION) {
    fail(`${path}.protocolVersion`, 'is unsupported.');
  }
  const operation = required(value, 'operation', path);
  if (!OPERATIONS.has(operation as RuntimeHostOperation)) {
    fail(`${path}.operation`, 'is unsupported.');
  }
  return {
    protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
    requestId: requestId(required(value, 'requestId', path), `${path}.requestId`),
    operation: operation as RuntimeHostOperation,
    workspaceRoot: absolutePath(required(value, 'workspaceRoot', path), `${path}.workspaceRoot`),
    rootConfigPath: relativePath(required(value, 'rootConfigPath', path), `${path}.rootConfigPath`),
    configPath: relativePath(required(value, 'configPath', path), `${path}.configPath`),
    projectRoot: relativePath(required(value, 'projectRoot', path), `${path}.projectRoot`, true),
    runtimeResolutionBase: relativePath(
      required(value, 'runtimeResolutionBase', path),
      `${path}.runtimeResolutionBase`,
      true,
    ),
    ...(Object.hasOwn(value, 'tsconfigPath')
      ? { tsconfigPath: relativePath(value.tsconfigPath, `${path}.tsconfigPath`) }
      : {}),
    rootPolicy: jsonValue(required(value, 'rootPolicy', path), `${path}.rootPolicy`),
    ...(Object.hasOwn(value, 'cliOverrides')
      ? { cliOverrides: jsonValue(value.cliOverrides, `${path}.cliOverrides`) }
      : {}),
    ...(Object.hasOwn(value, 'runtimeHost')
      ? { runtimeHost: parseRuntimeHostModuleDescriptor(value.runtimeHost) }
      : {}),
  };
}

function parseInventory(input: unknown, path: string): RuntimeHostProjectInventory {
  const value = record(input, path, INVENTORY_KEYS);
  return {
    projectId: identity(required(value, 'projectId', path), `${path}.projectId`),
    sourceIds: stringArray(required(value, 'sourceIds', path), `${path}.sourceIds`),
    formIds: stringArray(required(value, 'formIds', path), `${path}.formIds`),
  };
}

export function parseRuntimeHostParentMessage(
  input: unknown,
): RuntimeHostParentMessage {
  const path = 'parentMessage';
  const value = record(input, path, PARENT_KEYS);
  if (required(value, 'protocolVersion', path) !== RUNTIME_HOST_PROTOCOL_VERSION) {
    fail(`${path}.protocolVersion`, 'is unsupported.');
  }
  if (value.kind === 'initialize') {
    if (Object.hasOwn(value, 'requestId')) fail(`${path}.requestId`, 'is not supported.');
    return {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'initialize',
      request: parseProjectExecutionRequest(required(value, 'request', path)),
    };
  }
  if (value.kind === 'approve' || value.kind === 'abort') {
    if (Object.hasOwn(value, 'request')) fail(`${path}.request`, 'is not supported.');
    return {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: value.kind,
      requestId: requestId(required(value, 'requestId', path), `${path}.requestId`),
    };
  }
  fail(`${path}.kind`, 'is unsupported.');
}

export function parseRuntimeHostWorkerMessage(
  input: unknown,
): RuntimeHostWorkerMessage {
  const path = 'workerMessage';
  const value = record(input, path, WORKER_KEYS);
  if (required(value, 'protocolVersion', path) !== RUNTIME_HOST_PROTOCOL_VERSION) {
    fail(`${path}.protocolVersion`, 'is unsupported.');
  }
  const parsedRequestId = requestId(required(value, 'requestId', path), `${path}.requestId`);
  if (value.kind === 'inventory') {
    return {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'inventory',
      requestId: parsedRequestId,
      inventory: parseInventory(required(value, 'inventory', path), `${path}.inventory`),
    };
  }
  if (value.kind === 'result') {
    return {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'result',
      requestId: parsedRequestId,
      result: jsonValue(required(value, 'result', path), `${path}.result`),
    };
  }
  if (value.kind === 'failure') {
    const code = required(value, 'code', path);
    const phase = required(value, 'phase', path);
    if (!FAILURE_CODES.has(code as RuntimeHostFailureCode)) fail(`${path}.code`, 'is unsupported.');
    if (phase !== 'bootstrap' && phase !== 'inventory' && phase !== 'compile') {
      fail(`${path}.phase`, 'is unsupported.');
    }
    return {
      protocolVersion: RUNTIME_HOST_PROTOCOL_VERSION,
      kind: 'failure',
      requestId: parsedRequestId,
      code: code as RuntimeHostFailureCode,
      phase,
    };
  }
  fail(`${path}.kind`, 'is unsupported.');
}
