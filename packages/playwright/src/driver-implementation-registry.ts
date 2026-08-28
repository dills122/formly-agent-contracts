import { types as utilTypes } from 'node:util';

import {
  AGENT_CONTEXT_DRIVER_CAPABILITIES,
  AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
  createAgentContextDriverRegistryManifest,
  parseAgentContextDriverRegistryManifest,
  type AgentContextDriverCapability,
  type AgentContextDriverReference,
  type AgentContextDriverRegistryManifest,
  type Sha256Digest,
} from '@formly-contract/schema';

export type AgentContextDriverImplementation = (
  ...args: never[]
) => unknown;

type NonEmptyCapabilities = readonly [
  AgentContextDriverCapability,
  ...AgentContextDriverCapability[],
];

export interface AgentContextDriverImplementationDefinition {
  readonly id: string;
  readonly version: number;
  readonly capabilities: NonEmptyCapabilities;
  readonly implementation: AgentContextDriverImplementation;
}

interface AgentContextDriverImplementationSourceBase {
  readonly sourceId: string;
  readonly drivers: readonly AgentContextDriverImplementationDefinition[];
}

export interface AgentContextGenericDriverImplementationSource
  extends AgentContextDriverImplementationSourceBase {
  readonly kind: 'generic';
}

export interface AgentContextApplicationDriverImplementationSource
  extends AgentContextDriverImplementationSourceBase {
  readonly kind: 'application';
}

export type AgentContextDriverImplementationSource =
  | AgentContextGenericDriverImplementationSource
  | AgentContextApplicationDriverImplementationSource;

export interface AgentContextDriverImplementationRegistry {
  readonly manifest: AgentContextDriverRegistryManifest;
}

export type AgentContextDriverImplementationBindingIssue =
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_MISSING';
      readonly driver: AgentContextDriverReference;
      readonly requiredCapabilities: NonEmptyCapabilities;
    }
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_NOT_ALLOWLISTED';
      readonly driver: AgentContextDriverReference;
      readonly implementedCapabilities: NonEmptyCapabilities;
    }
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_CAPABILITY_MISSING';
      readonly driver: AgentContextDriverReference;
      readonly missingCapabilities: NonEmptyCapabilities;
    }
  | {
      readonly code: 'DRIVER_IMPLEMENTATION_CAPABILITY_NOT_ALLOWLISTED';
      readonly driver: AgentContextDriverReference;
      readonly notAllowlistedCapabilities: NonEmptyCapabilities;
    };

export interface AgentContextDriverResolutionRequest {
  readonly driver: AgentContextDriverReference;
  readonly requiredCapabilities: NonEmptyCapabilities;
}

export type AgentContextDriverResolutionResult =
  | {
      readonly status: 'resolved';
      readonly driver: AgentContextDriverReference;
      readonly requiredCapabilities: NonEmptyCapabilities;
      readonly implementation: AgentContextDriverImplementation;
    }
  | {
      readonly status: 'refused';
      readonly driver: AgentContextDriverReference;
      readonly requiredCapabilities: NonEmptyCapabilities;
      readonly issue:
        | Extract<
            AgentContextDriverImplementationBindingIssue,
            { readonly code: 'DRIVER_IMPLEMENTATION_MISSING' }
          >
        | Extract<
            AgentContextDriverImplementationBindingIssue,
            {
              readonly code: 'DRIVER_IMPLEMENTATION_CAPABILITY_MISSING';
            }
          >;
    };

export type AgentContextBoundDriverResolver = (
  request: AgentContextDriverResolutionRequest,
) => AgentContextDriverResolutionResult;

interface AgentContextDriverImplementationBindingHashes {
  readonly inventoryManifestContentHash: Sha256Digest;
  readonly allowlistManifestContentHash: Sha256Digest;
}

export type AgentContextDriverImplementationBindingResult =
  | (AgentContextDriverImplementationBindingHashes & {
      readonly status: 'compatible';
      readonly issues: readonly [];
      readonly resolver: AgentContextBoundDriverResolver;
    })
  | (AgentContextDriverImplementationBindingHashes & {
      readonly status: 'incompatible';
      readonly issues: readonly [
        AgentContextDriverImplementationBindingIssue,
        ...AgentContextDriverImplementationBindingIssue[],
      ];
    });

interface InstalledDriver {
  readonly driver: AgentContextDriverReference;
  readonly capabilities: NonEmptyCapabilities;
  readonly implementation: AgentContextDriverImplementation;
}

interface RegistryState {
  readonly implementationsByIdentity: ReadonlyMap<string, InstalledDriver>;
}

type DataDescriptor = PropertyDescriptor & { readonly value: unknown };
type DescriptorRecord = Readonly<Record<string, DataDescriptor>>;

const MAX_SOURCES = 10_000;
const MAX_DRIVERS = 10_000;
const MAX_ID_LENGTH = 256;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;

const SOURCE_KEYS = new Set(['sourceId', 'kind', 'drivers']);
const DRIVER_KEYS = new Set([
  'id',
  'version',
  'capabilities',
  'implementation',
]);
const RESOLUTION_REQUEST_KEYS = new Set(['driver', 'requiredCapabilities']);
const DRIVER_REFERENCE_KEYS = new Set(['kind', 'id', 'version']);

const BINDING_ISSUE_ORDER = new Map<
  AgentContextDriverImplementationBindingIssue['code'],
  number
>([
  ['DRIVER_IMPLEMENTATION_MISSING', 0],
  ['DRIVER_IMPLEMENTATION_NOT_ALLOWLISTED', 1],
  ['DRIVER_IMPLEMENTATION_CAPABILITY_MISSING', 2],
  ['DRIVER_IMPLEMENTATION_CAPABILITY_NOT_ALLOWLISTED', 3],
]);

const registryStates = new WeakMap<
  AgentContextDriverImplementationRegistry,
  RegistryState
>();

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareDrivers(
  left: AgentContextDriverReference,
  right: AgentContextDriverReference,
): number {
  return (
    compareText(left.kind, right.kind) ||
    compareText(left.id, right.id) ||
    (left.version < right.version ? -1 : left.version > right.version ? 1 : 0)
  );
}

function driverIdentityKey(driver: AgentContextDriverReference): string {
  return `${driver.kind}\0${driver.id}\0${driver.version}`;
}

function stableId(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > MAX_ID_LENGTH ||
    !STABLE_ID_PATTERN.test(input)
  ) {
    fail(path, 'must be a 1-256 character contract stable identifier.');
  }
  return input;
}

function positiveInteger(input: unknown, path: string): number {
  if (!Number.isSafeInteger(input) || (input as number) <= 0) {
    fail(path, 'must be a positive safe integer.');
  }
  return input as number;
}

function dataDescriptor(
  descriptor: PropertyDescriptor | undefined,
  path: string,
): DataDescriptor {
  if (descriptor === undefined) {
    fail(path, 'is required.');
  }
  if (!descriptor.enumerable) {
    fail(path, 'must be enumerable.');
  }
  if (!('value' in descriptor)) {
    fail(path, 'must be a data property.');
  }
  return descriptor as DataDescriptor;
}

function plainObjectDescriptors(
  input: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): DescriptorRecord {
  const inputType = typeof input;
  if (
    ((inputType === 'object' && input !== null) || inputType === 'function') &&
    utilTypes.isProxy(input)
  ) {
    fail(path, 'must not be a proxy.');
  }
  if (inputType !== 'object' || input === null || Array.isArray(input)) {
    fail(path, 'must be a plain object.');
  }
  const objectInput = input as object;
  const prototype = Object.getPrototypeOf(objectInput) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object or null-prototype object.');
  }

  const result: Record<string, DataDescriptor> = Object.create(null) as Record<
    string,
    DataDescriptor
  >;
  for (const key of Reflect.ownKeys(objectInput)) {
    if (typeof key === 'symbol') {
      fail(path, 'must not contain symbol-keyed properties.');
    }
    if (!allowedKeys.has(key)) {
      fail(`${path}.${key}`, 'is not supported.');
    }
    result[key] = dataDescriptor(
      Object.getOwnPropertyDescriptor(objectInput, key),
      `${path}.${key}`,
    );
  }
  return result;
}

function requiredDescriptor(
  descriptors: DescriptorRecord,
  key: string,
  path: string,
): DataDescriptor {
  const descriptor = descriptors[key];
  if (descriptor === undefined) {
    fail(`${path}.${key}`, 'is required.');
  }
  return descriptor;
}

function arrayIndex(key: string, length: number): number | undefined {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(key)) {
    return undefined;
  }
  const index = Number(key);
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= length ||
    index >= 4_294_967_295 ||
    String(index) !== key
  ) {
    return undefined;
  }
  return index;
}

function ordinaryArrayValues(
  input: unknown,
  path: string,
  maximumLength: number,
): readonly unknown[] {
  const inputType = typeof input;
  if (
    ((inputType === 'object' && input !== null) || inputType === 'function') &&
    utilTypes.isProxy(input)
  ) {
    fail(path, 'must not be a proxy.');
  }
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  if (Object.getPrototypeOf(input) !== Array.prototype) {
    fail(path, 'must be an ordinary array.');
  }
  if (input.length > maximumLength) {
    fail(path, `must contain at most ${maximumLength} entries.`);
  }

  const values = new Array<unknown>(input.length);
  let indexedPropertyCount = 0;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === 'symbol') {
      fail(path, 'must not contain symbol-keyed properties.');
    }
    if (key === 'length') {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        lengthDescriptor === undefined ||
        !('value' in lengthDescriptor) ||
        lengthDescriptor.value !== input.length
      ) {
        fail(`${path}.length`, 'must be an array length data property.');
      }
      continue;
    }
    const index = arrayIndex(key, input.length);
    if (index === undefined) {
      fail(`${path}.${key}`, 'is not a supported array property.');
    }
    values[index] = dataDescriptor(
      Object.getOwnPropertyDescriptor(input, key),
      `${path}[${index}]`,
    ).value;
    indexedPropertyCount += 1;
  }
  if (indexedPropertyCount !== input.length) {
    const missingIndex = values.findIndex(
      (_value, index) => !Object.hasOwn(values, index),
    );
    fail(`${path}[${missingIndex}]`, 'must not be sparse.');
  }
  return values;
}

function driverKind(
  input: unknown,
  path: string,
): AgentContextDriverReference['kind'] {
  if (input !== 'generic' && input !== 'application') {
    fail(path, 'must be one of "application", "generic".');
  }
  return input;
}

function capabilities(
  input: unknown,
  path: string,
): NonEmptyCapabilities {
  const values = ordinaryArrayValues(
    input,
    path,
    AGENT_CONTEXT_DRIVER_CAPABILITIES.length,
  );
  if (values.length === 0) {
    fail(path, 'must contain at least one capability.');
  }

  const parsed: AgentContextDriverCapability[] = [];
  const seen = new Set<AgentContextDriverCapability>();
  for (const [index, value] of values.entries()) {
    if (
      typeof value !== 'string' ||
      !AGENT_CONTEXT_DRIVER_CAPABILITIES.includes(
        value as AgentContextDriverCapability,
      )
    ) {
      fail(
        `${path}[${index}]`,
        `must be one of ${AGENT_CONTEXT_DRIVER_CAPABILITIES.map(
          (capability) => `"${capability}"`,
        ).join(', ')}.`,
      );
    }
    const parsedValue = value as AgentContextDriverCapability;
    if (seen.has(parsedValue)) {
      fail(`${path}[${index}]`, `duplicates capability "${parsedValue}".`);
    }
    seen.add(parsedValue);
    parsed.push(parsedValue);
  }
  parsed.sort(compareText);
  return [parsed[0]!, ...parsed.slice(1)];
}

function directlyCallableImplementation(
  input: unknown,
  path: string,
): AgentContextDriverImplementation {
  const inputType = typeof input;
  if (
    ((inputType === 'object' && input !== null) || inputType === 'function') &&
    utilTypes.isProxy(input)
  ) {
    fail(path, 'must not be a proxy.');
  }
  if (inputType !== 'function') {
    fail(path, 'must be directly callable.');
  }
  const source = Function.prototype.toString.call(input);
  if (/^\s*class(?:\s|\{)/u.test(source)) {
    fail(path, 'must be directly callable, not a class constructor.');
  }
  const nameDescriptor = Object.getOwnPropertyDescriptor(input, 'name');
  if (
    nameDescriptor !== undefined &&
    'value' in nameDescriptor &&
    typeof nameDescriptor.value === 'string' &&
    nameDescriptor.value.startsWith('bound ')
  ) {
    fail(path, 'must be an authored callable, not a bound function.');
  }
  return input as AgentContextDriverImplementation;
}

function parseDriverReference(
  input: unknown,
  path: string,
): AgentContextDriverReference {
  const descriptors = plainObjectDescriptors(
    input,
    path,
    DRIVER_REFERENCE_KEYS,
  );
  const kind = driverKind(
    requiredDescriptor(descriptors, 'kind', path).value,
    `${path}.kind`,
  );
  const id = stableId(
    requiredDescriptor(descriptors, 'id', path).value,
    `${path}.id`,
  );
  if (kind === 'application' && id.startsWith('generic.')) {
    fail(
      `${path}.id`,
      'application drivers must not use the reserved "generic." namespace.',
    );
  }
  return Object.freeze({
    kind,
    id,
    version: positiveInteger(
      requiredDescriptor(descriptors, 'version', path).value,
      `${path}.version`,
    ),
  });
}

function freezeManifest(
  manifest: AgentContextDriverRegistryManifest,
): AgentContextDriverRegistryManifest {
  for (const registration of manifest.registrations) {
    Object.freeze(registration.capabilities);
    Object.freeze(registration);
  }
  Object.freeze(manifest.registrations);
  return Object.freeze(manifest);
}

function nonEmptyCapabilities(
  input: readonly AgentContextDriverCapability[],
): NonEmptyCapabilities {
  if (input.length === 0) {
    throw new Error('Internal invariant: capability list must be nonempty.');
  }
  return [input[0]!, ...input.slice(1)];
}

function freezeIssue<T extends AgentContextDriverImplementationBindingIssue>(
  issue: T,
): T {
  if ('requiredCapabilities' in issue) {
    Object.freeze(issue.requiredCapabilities);
  } else if ('implementedCapabilities' in issue) {
    Object.freeze(issue.implementedCapabilities);
  } else if ('missingCapabilities' in issue) {
    Object.freeze(issue.missingCapabilities);
  } else {
    Object.freeze(issue.notAllowlistedCapabilities);
  }
  Object.freeze(issue.driver);
  return Object.freeze(issue);
}

export function createAgentContextDriverImplementationRegistry(
  sourcesInput: readonly AgentContextDriverImplementationSource[],
): AgentContextDriverImplementationRegistry {
  const sources = ordinaryArrayValues(sourcesInput, 'sources', MAX_SOURCES);
  const sourceIds = new Set<string>();
  const implementationsByIdentity = new Map<string, InstalledDriver>();
  let driverCount = 0;

  for (const [sourceIndex, sourceInput] of sources.entries()) {
    const sourcePath = `sources[${sourceIndex}]`;
    const sourceDescriptors = plainObjectDescriptors(
      sourceInput,
      sourcePath,
      SOURCE_KEYS,
    );
    const sourceId = stableId(
      requiredDescriptor(sourceDescriptors, 'sourceId', sourcePath).value,
      `${sourcePath}.sourceId`,
    );
    if (sourceIds.has(sourceId)) {
      fail(`${sourcePath}.sourceId`, 'duplicates a source identity.');
    }
    sourceIds.add(sourceId);
    const kind = driverKind(
      requiredDescriptor(sourceDescriptors, 'kind', sourcePath).value,
      `${sourcePath}.kind`,
    );
    const drivers = ordinaryArrayValues(
      requiredDescriptor(sourceDescriptors, 'drivers', sourcePath).value,
      `${sourcePath}.drivers`,
      MAX_DRIVERS,
    );

    driverCount += drivers.length;
    if (driverCount > MAX_DRIVERS) {
      fail('sources', `must contain at most ${MAX_DRIVERS} drivers.`);
    }

    for (const [driverIndex, driverInput] of drivers.entries()) {
      const driverPath = `${sourcePath}.drivers[${driverIndex}]`;
      const driverDescriptors = plainObjectDescriptors(
        driverInput,
        driverPath,
        DRIVER_KEYS,
      );
      const id = stableId(
        requiredDescriptor(driverDescriptors, 'id', driverPath).value,
        `${driverPath}.id`,
      );
      if (kind === 'application' && id.startsWith('generic.')) {
        fail(
          `${driverPath}.id`,
          'application drivers must not use the reserved "generic." namespace.',
        );
      }
      const driver = Object.freeze({
        kind,
        id,
        version: positiveInteger(
          requiredDescriptor(driverDescriptors, 'version', driverPath).value,
          `${driverPath}.version`,
        ),
      });
      const parsedCapabilities = capabilities(
        requiredDescriptor(driverDescriptors, 'capabilities', driverPath)
          .value,
        `${driverPath}.capabilities`,
      );
      const implementation = directlyCallableImplementation(
        requiredDescriptor(driverDescriptors, 'implementation', driverPath)
          .value,
        `${driverPath}.implementation`,
      );
      const identity = driverIdentityKey(driver);
      if (implementationsByIdentity.has(identity)) {
        fail(driverPath, 'duplicates an exact driver implementation identity.');
      }
      implementationsByIdentity.set(identity, {
        driver,
        capabilities: Object.freeze(parsedCapabilities),
        implementation,
      });
    }
  }

  const manifest = freezeManifest(
    createAgentContextDriverRegistryManifest({
      schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
      registrations: [...implementationsByIdentity.values()].map(
        ({ driver, capabilities: installedCapabilities }) => ({
          ...driver,
          capabilities: installedCapabilities,
        }),
      ),
    }),
  );
  const registry = Object.freeze({ manifest });
  registryStates.set(registry, { implementationsByIdentity });
  return registry;
}

function compareBindingIssues(
  left: AgentContextDriverImplementationBindingIssue,
  right: AgentContextDriverImplementationBindingIssue,
): number {
  return (
    compareDrivers(left.driver, right.driver) ||
    (BINDING_ISSUE_ORDER.get(left.code)! -
      BINDING_ISSUE_ORDER.get(right.code)!)
  );
}

function createResolver(state: RegistryState): AgentContextBoundDriverResolver {
  return (requestInput) => {
    const path = 'driverResolutionRequest';
    const descriptors = plainObjectDescriptors(
      requestInput,
      path,
      RESOLUTION_REQUEST_KEYS,
    );
    const driver = parseDriverReference(
      requiredDescriptor(descriptors, 'driver', path).value,
      `${path}.driver`,
    );
    const requiredCapabilities = Object.freeze(
      capabilities(
        requiredDescriptor(descriptors, 'requiredCapabilities', path).value,
        `${path}.requiredCapabilities`,
      ),
    );
    const installed = state.implementationsByIdentity.get(
      driverIdentityKey(driver),
    );
    if (installed === undefined) {
      const issue = freezeIssue({
        code: 'DRIVER_IMPLEMENTATION_MISSING',
        driver,
        requiredCapabilities,
      });
      return Object.freeze({
        status: 'refused',
        driver,
        requiredCapabilities,
        issue,
      });
    }

    const installedCapabilities = new Set(installed.capabilities);
    const missingCapabilities = requiredCapabilities.filter(
      (capability) => !installedCapabilities.has(capability),
    );
    if (missingCapabilities.length > 0) {
      const frozenMissingCapabilities = Object.freeze(
        nonEmptyCapabilities(missingCapabilities),
      );
      const issue = freezeIssue({
        code: 'DRIVER_IMPLEMENTATION_CAPABILITY_MISSING',
        driver,
        missingCapabilities: frozenMissingCapabilities,
      });
      return Object.freeze({
        status: 'refused',
        driver,
        requiredCapabilities,
        issue,
      });
    }

    return Object.freeze({
      status: 'resolved',
      driver,
      requiredCapabilities,
      implementation: installed.implementation,
    });
  };
}

export function bindAgentContextDriverImplementationRegistry(
  registry: AgentContextDriverImplementationRegistry,
  allowlistManifestInput: unknown,
): AgentContextDriverImplementationBindingResult {
  const state = registryStates.get(registry);
  if (state === undefined) {
    fail(
      'registry',
      'must be a registry created by createAgentContextDriverImplementationRegistry.',
    );
  }
  const allowlist = parseAgentContextDriverRegistryManifest(
    allowlistManifestInput,
  );
  const inventoryRegistrations = new Map(
    registry.manifest.registrations.map((entry) => [
      driverIdentityKey(entry),
      entry,
    ]),
  );
  const allowlistRegistrations = new Map(
    allowlist.registrations.map((entry) => [driverIdentityKey(entry), entry]),
  );
  const issues: AgentContextDriverImplementationBindingIssue[] = [];

  for (const allowed of allowlist.registrations) {
    const driver = Object.freeze({
      kind: allowed.kind,
      id: allowed.id,
      version: allowed.version,
    });
    const installed = inventoryRegistrations.get(driverIdentityKey(allowed));
    if (installed === undefined) {
      issues.push(
        freezeIssue({
          code: 'DRIVER_IMPLEMENTATION_MISSING',
          driver,
          requiredCapabilities: Object.freeze(
            nonEmptyCapabilities(allowed.capabilities),
          ),
        }),
      );
      continue;
    }
    const installedCapabilities = new Set(installed.capabilities);
    const allowedCapabilities = new Set(allowed.capabilities);
    const missingCapabilities = allowed.capabilities.filter(
      (capability) => !installedCapabilities.has(capability),
    );
    const notAllowlistedCapabilities = installed.capabilities.filter(
      (capability) => !allowedCapabilities.has(capability),
    );
    if (missingCapabilities.length > 0) {
      issues.push(
        freezeIssue({
          code: 'DRIVER_IMPLEMENTATION_CAPABILITY_MISSING',
          driver,
          missingCapabilities: Object.freeze(
            nonEmptyCapabilities(missingCapabilities),
          ),
        }),
      );
    }
    if (notAllowlistedCapabilities.length > 0) {
      issues.push(
        freezeIssue({
          code: 'DRIVER_IMPLEMENTATION_CAPABILITY_NOT_ALLOWLISTED',
          driver,
          notAllowlistedCapabilities: Object.freeze(
            nonEmptyCapabilities(notAllowlistedCapabilities),
          ),
        }),
      );
    }
  }

  for (const installed of registry.manifest.registrations) {
    if (!allowlistRegistrations.has(driverIdentityKey(installed))) {
      issues.push(
        freezeIssue({
          code: 'DRIVER_IMPLEMENTATION_NOT_ALLOWLISTED',
          driver: Object.freeze({
            kind: installed.kind,
            id: installed.id,
            version: installed.version,
          }),
          implementedCapabilities: Object.freeze(
            nonEmptyCapabilities(installed.capabilities),
          ),
        }),
      );
    }
  }

  issues.sort(compareBindingIssues);
  const hashes = {
    inventoryManifestContentHash: registry.manifest.contentHash,
    allowlistManifestContentHash: allowlist.contentHash,
  } as const;
  if (issues.length > 0) {
    const frozenIssues: readonly [
      AgentContextDriverImplementationBindingIssue,
      ...AgentContextDriverImplementationBindingIssue[],
    ] = Object.freeze([
      issues[0]!,
      ...issues.slice(1),
    ]);
    return Object.freeze({
      status: 'incompatible',
      ...hashes,
      issues: frozenIssues,
    });
  }
  const noIssues: readonly [] = Object.freeze([]);
  return Object.freeze({
    status: 'compatible',
    ...hashes,
    issues: noIssues,
    resolver: createResolver(state),
  });
}
