import { createHash } from 'node:crypto';

import { canonicalStringify } from './canonical-json.js';

export const RUNTIME_PROVENANCE_SCHEMA_VERSION = '1.0.0' as const;

export interface RuntimeWorkerIdentity {
  readonly id: string;
  readonly version: string;
  readonly protocolVersion: string;
}

export interface RuntimeAdapterIdentity {
  readonly id: string;
  readonly version: string;
  readonly mode: 'declared' | 'jit';
}

export interface RuntimeToolIdentity {
  readonly name: string;
  readonly version: string;
}

export interface RuntimePackageIdentity {
  readonly name: string;
  readonly version: string;
}

export interface RuntimeLoaderProvenance {
  readonly id: 'jiti';
  readonly version: string;
  readonly options: {
    readonly fsCache: boolean;
    readonly interopDefault: boolean;
    readonly moduleCache: boolean;
    readonly tsconfigPaths: 'disabled' | 'configured';
    readonly nativeModules: readonly string[];
  };
}

export interface RuntimeNodeProvenance {
  readonly version: string;
  readonly platform: string;
  readonly architecture: string;
}

export type RuntimeExecutionProfileProvenance =
  | {
      readonly id: 'trusted-local-v1';
      readonly version: string;
      readonly network: 'not-enforced';
    }
  | {
      readonly id: 'isolated-ci-v1';
      readonly version: string;
      readonly network: 'enforced';
    };

export interface RuntimeDependencySnapshot {
  readonly kind: 'pnpm-lock';
  readonly workspaceRelativePath: string;
  readonly sha256: string;
}

export interface RuntimeProvenance {
  readonly schemaVersion: typeof RUNTIME_PROVENANCE_SCHEMA_VERSION;
  readonly worker: RuntimeWorkerIdentity;
  readonly adapter: RuntimeAdapterIdentity;
  readonly tools: readonly RuntimeToolIdentity[];
  readonly loader: RuntimeLoaderProvenance;
  readonly node: RuntimeNodeProvenance;
  readonly executionProfile: RuntimeExecutionProfileProvenance;
  readonly dependencySnapshot: RuntimeDependencySnapshot;
  readonly runtimePackages: readonly RuntimePackageIdentity[];
}

type DataRecord = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?$/u;
const IDENTITY_PATTERN = /^@?[A-Za-z0-9](?:[A-Za-z0-9@._+/-]*[A-Za-z0-9])?$/u;
const TOKEN_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/u;

const PROVENANCE_KEYS = new Set([
  'schemaVersion',
  'worker',
  'adapter',
  'tools',
  'loader',
  'node',
  'executionProfile',
  'dependencySnapshot',
  'runtimePackages',
]);
const WORKER_KEYS = new Set(['id', 'version', 'protocolVersion']);
const ADAPTER_KEYS = new Set(['id', 'version', 'mode']);
const IDENTITY_KEYS = new Set(['name', 'version']);
const LOADER_KEYS = new Set(['id', 'version', 'options']);
const LOADER_OPTIONS_KEYS = new Set([
  'fsCache',
  'interopDefault',
  'moduleCache',
  'tsconfigPaths',
  'nativeModules',
]);
const NODE_KEYS = new Set(['version', 'platform', 'architecture']);
const EXECUTION_PROFILE_KEYS = new Set(['id', 'version', 'network']);
const DEPENDENCY_SNAPSHOT_KEYS = new Set([
  'kind',
  'workspaceRelativePath',
  'sha256',
]);
const REQUIRED_TOOL_NAMES = [
  '@formly-contract/compiler',
  '@formly-contract/schema',
  '@formly-contract/workspace',
] as const;
const REQUIRED_JIT_RUNTIME_PACKAGES = [
  '@angular/compiler',
  '@angular/core',
  '@ngx-formly/core',
] as const;

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function record(
  input: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): DataRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be an object.');
  }
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      fail(`${path}.${key}`, 'is not supported.');
    }
  }
  return input as DataRecord;
}

function required(value: DataRecord, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) {
    fail(`${path}.${key}`, 'is required.');
  }
  return value[key];
}

function stringValue(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length === 0) {
    fail(path, 'must be a non-empty string.');
  }
  return input;
}

function identity(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (
    !IDENTITY_PATTERN.test(value) ||
    value
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(path, 'must be a portable package or runtime identity.');
  }
  return value;
}

function version(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!VERSION_PATTERN.test(value)) {
    fail(path, 'must be a stable version string.');
  }
  return value;
}

function token(input: unknown, path: string): string {
  const value = stringValue(input, path);
  if (!TOKEN_PATTERN.test(value)) {
    fail(path, 'must be a portable lowercase token.');
  }
  return value;
}

function booleanValue(input: unknown, path: string): boolean {
  if (typeof input !== 'boolean') {
    fail(path, 'must be a boolean.');
  }
  return input;
}

function array(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  return input;
}

function relativePath(input: unknown, path: string): string {
  const value = stringValue(input, path);
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

function sha256(input: unknown, path: string): string {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a sha256 digest.');
  }
  return input;
}

function parseNamedIdentities(
  input: unknown,
  path: string,
  duplicateLabel: string,
): readonly RuntimeToolIdentity[] {
  const names = new Set<string>();
  return array(input, path).map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    const value = record(entry, entryPath, IDENTITY_KEYS);
    const name = identity(
      required(value, 'name', entryPath),
      `${entryPath}.name`,
    );
    if (names.has(name)) {
      fail(
        `${entryPath}.name`,
        `duplicates ${duplicateLabel} ${JSON.stringify(name)}.`,
      );
    }
    names.add(name);
    return {
      name,
      version: version(
        required(value, 'version', entryPath),
        `${entryPath}.version`,
      ),
    };
  });
}

function parseWorker(input: unknown): RuntimeWorkerIdentity {
  const path = 'runtimeProvenance.worker';
  const value = record(input, path, WORKER_KEYS);
  return {
    id: identity(required(value, 'id', path), `${path}.id`),
    version: version(required(value, 'version', path), `${path}.version`),
    protocolVersion: version(
      required(value, 'protocolVersion', path),
      `${path}.protocolVersion`,
    ),
  };
}

function parseAdapter(input: unknown): RuntimeAdapterIdentity {
  const path = 'runtimeProvenance.adapter';
  const value = record(input, path, ADAPTER_KEYS);
  const mode = required(value, 'mode', path);
  if (mode !== 'declared' && mode !== 'jit') {
    fail(`${path}.mode`, 'must be "declared" or "jit".');
  }
  return {
    id: identity(required(value, 'id', path), `${path}.id`),
    version: version(required(value, 'version', path), `${path}.version`),
    mode,
  };
}

function parseLoader(input: unknown): RuntimeLoaderProvenance {
  const path = 'runtimeProvenance.loader';
  const value = record(input, path, LOADER_KEYS);
  if (required(value, 'id', path) !== 'jiti') {
    fail(`${path}.id`, 'must be "jiti".');
  }
  const optionsPath = `${path}.options`;
  const options = record(
    required(value, 'options', path),
    optionsPath,
    LOADER_OPTIONS_KEYS,
  );
  const tsconfigPaths = required(options, 'tsconfigPaths', optionsPath);
  if (tsconfigPaths !== 'disabled' && tsconfigPaths !== 'configured') {
    fail(`${optionsPath}.tsconfigPaths`, 'is unsupported.');
  }
  const nativeModuleNames = new Set<string>();
  const nativeModules = array(
    required(options, 'nativeModules', optionsPath),
    `${optionsPath}.nativeModules`,
  ).map((entry, index) => {
    const entryPath = `${optionsPath}.nativeModules[${index}]`;
    const name = identity(entry, entryPath);
    if (nativeModuleNames.has(name)) {
      fail(entryPath, `duplicates native module ${JSON.stringify(name)}.`);
    }
    nativeModuleNames.add(name);
    return name;
  });
  return {
    id: 'jiti',
    version: version(required(value, 'version', path), `${path}.version`),
    options: {
      fsCache: booleanValue(
        required(options, 'fsCache', optionsPath),
        `${optionsPath}.fsCache`,
      ),
      interopDefault: booleanValue(
        required(options, 'interopDefault', optionsPath),
        `${optionsPath}.interopDefault`,
      ),
      moduleCache: booleanValue(
        required(options, 'moduleCache', optionsPath),
        `${optionsPath}.moduleCache`,
      ),
      tsconfigPaths,
      nativeModules,
    },
  };
}

function parseNode(input: unknown): RuntimeNodeProvenance {
  const path = 'runtimeProvenance.node';
  const value = record(input, path, NODE_KEYS);
  return {
    version: version(required(value, 'version', path), `${path}.version`),
    platform: token(required(value, 'platform', path), `${path}.platform`),
    architecture: token(
      required(value, 'architecture', path),
      `${path}.architecture`,
    ),
  };
}

function parseExecutionProfile(
  input: unknown,
): RuntimeExecutionProfileProvenance {
  const path = 'runtimeProvenance.executionProfile';
  const value = record(input, path, EXECUTION_PROFILE_KEYS);
  const id = required(value, 'id', path);
  const network = required(value, 'network', path);
  const profileVersion = version(
    required(value, 'version', path),
    `${path}.version`,
  );
  if (id === 'trusted-local-v1') {
    if (network !== 'not-enforced') {
      fail(path, 'trusted-local-v1 must record network as not-enforced.');
    }
    return { id, version: profileVersion, network };
  }
  if (id === 'isolated-ci-v1') {
    if (network !== 'enforced') {
      fail(path, 'isolated-ci-v1 must record network as enforced.');
    }
    return { id, version: profileVersion, network };
  }
  fail(`${path}.id`, 'is unsupported.');
}

function parseDependencySnapshot(input: unknown): RuntimeDependencySnapshot {
  const path = 'runtimeProvenance.dependencySnapshot';
  const value = record(input, path, DEPENDENCY_SNAPSHOT_KEYS);
  if (required(value, 'kind', path) !== 'pnpm-lock') {
    fail(`${path}.kind`, 'must be "pnpm-lock".');
  }
  return {
    kind: 'pnpm-lock',
    workspaceRelativePath: relativePath(
      required(value, 'workspaceRelativePath', path),
      `${path}.workspaceRelativePath`,
    ),
    sha256: sha256(required(value, 'sha256', path), `${path}.sha256`),
  };
}

export function parseRuntimeProvenance(input: unknown): RuntimeProvenance {
  const normalized = JSON.parse(canonicalStringify(input)) as unknown;
  const path = 'runtimeProvenance';
  const value = record(normalized, path, PROVENANCE_KEYS);
  if (
    required(value, 'schemaVersion', path) !==
    RUNTIME_PROVENANCE_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${RUNTIME_PROVENANCE_SCHEMA_VERSION}.`,
    );
  }
  const tools = parseNamedIdentities(
    required(value, 'tools', path),
    `${path}.tools`,
    'tool name',
  );
  for (const requiredName of REQUIRED_TOOL_NAMES) {
    if (!tools.some(({ name }) => name === requiredName)) {
      fail(
        `${path}.tools`,
        `must record required tool ${JSON.stringify(requiredName)}.`,
      );
    }
  }
  const adapter = parseAdapter(required(value, 'adapter', path));
  const runtimePackages = parseNamedIdentities(
    required(value, 'runtimePackages', path),
    `${path}.runtimePackages`,
    'runtime package name',
  );
  if (adapter.mode === 'jit') {
    for (const requiredName of REQUIRED_JIT_RUNTIME_PACKAGES) {
      if (!runtimePackages.some(({ name }) => name === requiredName)) {
        fail(
          `${path}.runtimePackages`,
          `must record JIT runtime package ${JSON.stringify(requiredName)}.`,
        );
      }
    }
  }
  return {
    schemaVersion: RUNTIME_PROVENANCE_SCHEMA_VERSION,
    worker: parseWorker(required(value, 'worker', path)),
    adapter,
    tools,
    loader: parseLoader(required(value, 'loader', path)),
    node: parseNode(required(value, 'node', path)),
    executionProfile: parseExecutionProfile(
      required(value, 'executionProfile', path),
    ),
    dependencySnapshot: parseDependencySnapshot(
      required(value, 'dependencySnapshot', path),
    ),
    runtimePackages,
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalRuntimeProvenance(
  provenance: RuntimeProvenance,
): RuntimeProvenance {
  return {
    ...provenance,
    tools: [...provenance.tools].sort((left, right) =>
      compareText(left.name, right.name),
    ),
    loader: {
      ...provenance.loader,
      options: {
        ...provenance.loader.options,
        nativeModules: [...provenance.loader.options.nativeModules].sort(
          compareText,
        ),
      },
    },
    runtimePackages: [...provenance.runtimePackages].sort((left, right) =>
      compareText(left.name, right.name),
    ),
  };
}

export function canonicalizeRuntimeProvenance(input: unknown): string {
  return canonicalStringify(
    canonicalRuntimeProvenance(parseRuntimeProvenance(input)),
  );
}

export function computeRuntimeProvenanceHash(input: unknown): string {
  return `sha256:${createHash('sha256')
    .update(canonicalizeRuntimeProvenance(input))
    .digest('hex')}`;
}
