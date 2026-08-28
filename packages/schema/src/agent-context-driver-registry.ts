import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

import type { Sha256Digest } from './agent-context-artifacts.js';
import {
  parseAgentContextExecutionAuthority,
  type AgentContextDriverReference,
  type AgentContextExecutionAuthority,
} from './agent-context-execution-authority.js';
import {
  canonicalStringify,
  parseArrayIndexProperty,
} from './canonical-json.js';

export const AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_ID =
  'agent-context.driver-registry' as const;
export const AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION = '0.1.0' as const;

export const AGENT_CONTEXT_DRIVER_CAPABILITIES = Object.freeze([
  'activate-validation',
  'activate-wrapper',
  'add-item',
  'assert-outcome',
  'assert-state',
  'assert-validation',
  'assert-value',
  'check',
  'commit-value',
  'expand-item',
  'fill',
  'invoke-usage-action',
  'open-usage',
  'select-from-overlay',
  'select-option',
  'select-row',
  'type-and-pick',
  'wait-readiness',
] as const);

export type AgentContextDriverCapability =
  (typeof AGENT_CONTEXT_DRIVER_CAPABILITIES)[number];

export type AgentContextDriverKind = AgentContextDriverReference['kind'];

export interface AgentContextDriverRegistration {
  readonly kind: AgentContextDriverKind;
  readonly id: string;
  readonly version: number;
  readonly capabilities: readonly [
    AgentContextDriverCapability,
    ...AgentContextDriverCapability[],
  ];
}

export interface AgentContextDriverRegistryManifestDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION;
  readonly registrations: readonly AgentContextDriverRegistration[];
}

export interface AgentContextDriverRegistryManifest
  extends AgentContextDriverRegistryManifestDraft {
  readonly contentHash: Sha256Digest;
}

export type AgentContextExecutionAuthorityDriverCompatibilityIssue =
  | {
      readonly code: 'DRIVER_REGISTRATION_MISSING';
      readonly driver: AgentContextDriverReference;
      readonly requiredCapabilities: readonly [
        AgentContextDriverCapability,
        ...AgentContextDriverCapability[],
      ];
    }
  | {
      readonly code: 'DRIVER_CAPABILITY_MISSING';
      readonly driver: AgentContextDriverReference;
      readonly missingCapabilities: readonly [
        AgentContextDriverCapability,
        ...AgentContextDriverCapability[],
      ];
    };

interface AgentContextExecutionAuthorityDriverCompatibilityResultBase {
  readonly executionAuthorityContentHash: Sha256Digest;
  readonly driverRegistryContentHash: Sha256Digest;
}

export type AgentContextExecutionAuthorityDriverCompatibilityResult =
  | (AgentContextExecutionAuthorityDriverCompatibilityResultBase & {
      readonly status: 'compatible';
      readonly issues: readonly [];
    })
  | (AgentContextExecutionAuthorityDriverCompatibilityResultBase & {
      readonly status: 'incompatible';
      readonly issues: readonly [
        AgentContextExecutionAuthorityDriverCompatibilityIssue,
        ...AgentContextExecutionAuthorityDriverCompatibilityIssue[],
      ];
    });

type DataRecord = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;
const MAX_ID_LENGTH = 256;
const MAX_REGISTRATIONS = 10_000;
const MAX_DATA_GRAPH_DEPTH = 128;
const MAX_DATA_GRAPH_NODES = 100_000;

const MANIFEST_KEYS = new Set([
  'schemaVersion',
  'registrations',
  'contentHash',
]);
const MANIFEST_DRAFT_KEYS = new Set(
  [...MANIFEST_KEYS].filter((key) => key !== 'contentHash'),
);
const REGISTRATION_KEYS = new Set([
  'kind',
  'id',
  'version',
  'capabilities',
]);

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

type DataGraphPreflightFrame =
  | {
      readonly kind: 'visit';
      readonly input: unknown;
      readonly path: string;
      readonly depth: number;
    }
  | {
      readonly kind: 'leave';
      readonly input: object;
    };

function preflightDataGraph(input: unknown, path: string): void {
  const frames: DataGraphPreflightFrame[] = [
    { kind: 'visit', input, path, depth: 0 },
  ];
  const ancestors = new Set<object>();
  let scheduledNodeCount = 1;

  while (frames.length > 0) {
    const frame = frames.pop()!;
    if (frame.kind === 'leave') {
      ancestors.delete(frame.input);
      continue;
    }

    const inputType = typeof frame.input;
    if (
      ((inputType === 'object' && frame.input !== null) ||
        inputType === 'function') &&
      utilTypes.isProxy(frame.input)
    ) {
      fail(frame.path, 'must not be a proxy.');
    }
    if (inputType !== 'object' || frame.input === null) {
      continue;
    }

    const objectInput = frame.input as object;
    if (ancestors.has(objectInput)) {
      fail(frame.path, 'must not contain a cycle.');
    }
    ancestors.add(objectInput);
    frames.push({ kind: 'leave', input: objectInput });

    const isArray = Array.isArray(objectInput);
    const childFrames: DataGraphPreflightFrame[] = [];
    for (const key of Reflect.ownKeys(objectInput)) {
      if (typeof key === 'symbol') {
        fail(frame.path, 'must not contain symbol-keyed properties.');
      }
      if (isArray && key === 'length') {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(objectInput, key);
      if (descriptor === undefined || !('value' in descriptor)) {
        continue;
      }

      const childPath = isArray
        ? `${frame.path}[${key}]`
        : `${frame.path}.${key}`;
      const childDepth = frame.depth + 1;
      if (childDepth > MAX_DATA_GRAPH_DEPTH) {
        fail(
          childPath,
          `must not exceed the maximum data graph depth of ${MAX_DATA_GRAPH_DEPTH}.`,
        );
      }
      scheduledNodeCount += 1;
      if (scheduledNodeCount > MAX_DATA_GRAPH_NODES) {
        fail(
          childPath,
          `must not exceed the maximum data graph node count of ${MAX_DATA_GRAPH_NODES}.`,
        );
      }
      childFrames.push({
        kind: 'visit',
        input: descriptor.value,
        path: childPath,
        depth: childDepth,
      });
    }

    for (let index = childFrames.length - 1; index >= 0; index -= 1) {
      frames.push(childFrames[index]!);
    }
  }
}

function cloneDataOnly(
  input: unknown,
  path: string,
  ancestors = new Set<object>(),
): unknown {
  const inputType = typeof input;
  if (
    ((inputType === 'object' && input !== null) || inputType === 'function') &&
    utilTypes.isProxy(input)
  ) {
    fail(path, 'must not be a proxy.');
  }

  if (input === null || inputType === 'string' || inputType === 'boolean') {
    return input;
  }
  if (inputType === 'number') {
    if (!Number.isFinite(input)) {
      fail(path, 'must be a finite JSON number.');
    }
    return input;
  }
  if (inputType !== 'object' || input === null) {
    fail(path, 'must be a JSON value.');
  }

  const objectInput = input as object;
  if (ancestors.has(objectInput)) {
    fail(path, 'must not contain a cycle.');
  }

  const isArray = Array.isArray(objectInput);
  const prototype = Object.getPrototypeOf(objectInput) as unknown;
  if (isArray) {
    if (prototype !== Array.prototype) {
      fail(path, 'must be an ordinary array.');
    }
  } else if (prototype !== Object.prototype && prototype !== null) {
    fail(path, 'must be a plain object or null-prototype object.');
  }
  if (Object.getOwnPropertySymbols(objectInput).length > 0) {
    fail(path, 'must not contain symbol-keyed properties.');
  }

  ancestors.add(objectInput);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(objectInput);
    if (isArray) {
      const lengthDescriptor = descriptors.length;
      if (
        lengthDescriptor === undefined ||
        !('value' in lengthDescriptor) ||
        typeof lengthDescriptor.value !== 'number'
      ) {
        fail(`${path}.length`, 'must be an array length data property.');
      }
      const length = lengthDescriptor.value;
      const indexedDescriptors: [number, PropertyDescriptor][] = [];
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (key === 'length') {
          continue;
        }
        const index = parseArrayIndexProperty(key, length);
        if (index === undefined) {
          fail(`${path}.${key}`, 'is not a supported array property.');
        }
        const itemPath = `${path}[${index}]`;
        if (!descriptor.enumerable) {
          fail(itemPath, 'must be enumerable.');
        }
        if (!('value' in descriptor)) {
          fail(itemPath, 'must be a data property.');
        }
        indexedDescriptors.push([index, descriptor]);
      }
      indexedDescriptors.sort(([left], [right]) => left - right);
      if (indexedDescriptors.length !== length) {
        let missingIndex = 0;
        for (const [index] of indexedDescriptors) {
          if (index !== missingIndex) {
            break;
          }
          missingIndex += 1;
        }
        fail(`${path}[${missingIndex}]`, 'must not be sparse.');
      }
      return indexedDescriptors.map(([index, descriptor]) =>
        cloneDataOnly(descriptor.value, `${path}[${index}]`, ancestors),
      );
    }

    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      const propertyPath = `${path}.${key}`;
      if (!descriptor.enumerable) {
        fail(propertyPath, 'must be enumerable.');
      }
      if (!('value' in descriptor)) {
        fail(propertyPath, 'must be a data property.');
      }
      result[key] = cloneDataOnly(descriptor.value, propertyPath, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(objectInput);
  }
}

function cloneValidatedDataOnly(input: unknown, path: string): unknown {
  preflightDataGraph(input, path);
  const detached = cloneDataOnly(input, path);
  let roundTripDetached: unknown;
  try {
    roundTripDetached = cloneDataOnly(structuredClone(input), path);
  } catch {
    fail(path, 'must round-trip through structured clone as plain JSON data.');
  }
  if (canonicalStringify(roundTripDetached) !== canonicalStringify(detached)) {
    fail(
      path,
      'must round-trip through structured clone as identical plain JSON data.',
    );
  }
  return detached;
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

function sha256(input: unknown, path: string): Sha256Digest {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a lowercase sha256 digest.');
  }
  return input as Sha256Digest;
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

function compareRegistrations(
  left: AgentContextDriverRegistration,
  right: AgentContextDriverRegistration,
): number {
  return compareDrivers(left, right);
}

function driverIdentityKey(driver: AgentContextDriverReference): string {
  return `${driver.kind}\0${driver.id}\0${driver.version}`;
}

function parseCapabilities(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
): AgentContextDriverRegistration['capabilities'] {
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  if (input.length === 0) {
    fail(path, 'must contain at least one capability.');
  }
  if (input.length > AGENT_CONTEXT_DRIVER_CAPABILITIES.length) {
    fail(
      path,
      `must contain at most ${AGENT_CONTEXT_DRIVER_CAPABILITIES.length} capabilities.`,
    );
  }

  const parsed = input.map((entry, index) => {
    if (
      typeof entry !== 'string' ||
      !AGENT_CONTEXT_DRIVER_CAPABILITIES.includes(
        entry as AgentContextDriverCapability,
      )
    ) {
      fail(
        `${path}[${index}]`,
        `must be one of ${AGENT_CONTEXT_DRIVER_CAPABILITIES.map(
          (capability) => `"${capability}"`,
        ).join(', ')}.`,
      );
    }
    return entry as AgentContextDriverCapability;
  });

  const seen = new Set<AgentContextDriverCapability>();
  for (const [index, capability] of parsed.entries()) {
    if (seen.has(capability)) {
      fail(`${path}[${index}]`, `duplicates capability "${capability}".`);
    }
    seen.add(capability);
  }

  if (requireCanonicalOrder) {
    for (let index = 1; index < parsed.length; index += 1) {
      if (compareText(parsed[index - 1]!, parsed[index]!) > 0) {
        fail(path, 'must be in canonical order.');
      }
    }
    return [parsed[0]!, ...parsed.slice(1)];
  }

  const sorted = [...parsed].sort(compareText);
  return [sorted[0]!, ...sorted.slice(1)];
}

function parseRegistration(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
): AgentContextDriverRegistration {
  const value = record(input, path, REGISTRATION_KEYS);
  const kindInput = required(value, 'kind', path);
  if (kindInput !== 'generic' && kindInput !== 'application') {
    fail(`${path}.kind`, 'must be one of "application", "generic".');
  }
  const id = stableId(required(value, 'id', path), `${path}.id`);
  if (kindInput === 'application' && id.startsWith('generic.')) {
    fail(
      `${path}.id`,
      'application registrations must not use the reserved "generic." namespace.',
    );
  }
  return {
    kind: kindInput,
    id,
    version: positiveInteger(
      required(value, 'version', path),
      `${path}.version`,
    ),
    capabilities: parseCapabilities(
      required(value, 'capabilities', path),
      `${path}.capabilities`,
      requireCanonicalOrder,
    ),
  };
}

function parseRegistrations(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
): readonly AgentContextDriverRegistration[] {
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  if (input.length > MAX_REGISTRATIONS) {
    fail(path, `must contain at most ${MAX_REGISTRATIONS} registrations.`);
  }

  const registrations = input.map((entry, index) =>
    parseRegistration(entry, `${path}[${index}]`, requireCanonicalOrder),
  );
  const identities = new Set<string>();
  for (const [index, registration] of registrations.entries()) {
    const identity = driverIdentityKey(registration);
    if (identities.has(identity)) {
      fail(
        `${path}[${index}]`,
        'duplicates an exact driver registration identity.',
      );
    }
    identities.add(identity);
  }

  if (requireCanonicalOrder) {
    for (let index = 1; index < registrations.length; index += 1) {
      if (
        compareRegistrations(registrations[index - 1]!, registrations[index]!) >
        0
      ) {
        fail(path, 'must be in canonical order.');
      }
    }
    return registrations;
  }
  return [...registrations].sort(compareRegistrations);
}

function normalizeManifestInput(
  input: unknown,
  requireContentHash: boolean,
  requireCanonicalOrder: boolean,
): AgentContextDriverRegistryManifestDraft & {
  readonly contentHash?: Sha256Digest;
} {
  const path = 'driverRegistryManifest';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    requireContentHash ? MANIFEST_KEYS : MANIFEST_DRAFT_KEYS,
  );
  if (
    required(value, 'schemaVersion', path) !==
    AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION}.`,
    );
  }

  const normalized: AgentContextDriverRegistryManifestDraft = {
    schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
    registrations: parseRegistrations(
      required(value, 'registrations', path),
      `${path}.registrations`,
      requireCanonicalOrder,
    ),
  };
  if (!requireContentHash) {
    return normalized;
  }
  return {
    ...normalized,
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function computeNormalizedHash(
  input: AgentContextDriverRegistryManifestDraft,
): Sha256Digest {
  const canonical = canonicalStringify({
    schemaVersion: input.schemaVersion,
    registrations: input.registrations,
  });
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function parseAgentContextDriverRegistryManifest(
  input: unknown,
): AgentContextDriverRegistryManifest {
  const normalized = normalizeManifestInput(input, true, true);
  const manifest = normalized as AgentContextDriverRegistryManifest;
  if (manifest.contentHash !== computeNormalizedHash(manifest)) {
    fail('driverRegistryManifest.contentHash', 'does not match manifest content.');
  }
  return manifest;
}

export function canonicalizeAgentContextDriverRegistryManifest(
  input: unknown,
): string {
  return canonicalStringify(parseAgentContextDriverRegistryManifest(input));
}

export function computeAgentContextDriverRegistryManifestHash(
  input: unknown,
): Sha256Digest {
  const normalized = normalizeManifestInput(input, false, false);
  return computeNormalizedHash(normalized);
}

export function createAgentContextDriverRegistryManifest(
  draft: AgentContextDriverRegistryManifestDraft,
): AgentContextDriverRegistryManifest {
  const normalized = normalizeManifestInput(draft, false, false);
  return {
    ...normalized,
    contentHash: computeNormalizedHash(normalized),
  };
}

interface DriverRequirement {
  readonly driver: AgentContextDriverReference;
  readonly capabilities: Set<AgentContextDriverCapability>;
}

function collectDriverRequirements(
  authority: AgentContextExecutionAuthority,
): readonly DriverRequirement[] {
  const requirementsByIdentity = new Map<string, DriverRequirement>();
  const requireCapability = (
    driver: AgentContextDriverReference,
    capability: AgentContextDriverCapability,
  ): void => {
    const identity = driverIdentityKey(driver);
    let requirement = requirementsByIdentity.get(identity);
    if (requirement === undefined) {
      requirement = {
        driver: {
          kind: driver.kind,
          id: driver.id,
          version: driver.version,
        },
        capabilities: new Set<AgentContextDriverCapability>(),
      };
      requirementsByIdentity.set(identity, requirement);
    }
    requirement.capabilities.add(capability);
  };

  requireCapability(authority.usage.entry.driver, 'open-usage');
  for (const interaction of authority.interactions) {
    requireCapability(interaction.driver, interaction.operation);
  }
  for (const readiness of authority.readiness) {
    requireCapability(readiness.driver, 'wait-readiness');
  }
  for (const assertion of authority.stateAssertions) {
    requireCapability(assertion.driver, 'assert-state');
  }
  for (const action of authority.usage.actions) {
    requireCapability(action.driver, 'invoke-usage-action');
  }
  for (const outcome of authority.usage.outcomes) {
    requireCapability(outcome.assertionDriver, 'assert-outcome');
  }
  for (const capture of authority.repeaterCaptures) {
    requireCapability(capture.driver, 'add-item');
  }

  return [...requirementsByIdentity.values()].sort((left, right) =>
    compareDrivers(left.driver, right.driver),
  );
}

function sortedNonEmptyCapabilities(
  capabilities: Iterable<AgentContextDriverCapability>,
): readonly [
  AgentContextDriverCapability,
  ...AgentContextDriverCapability[],
] {
  const sorted = [...capabilities].sort(compareText);
  if (sorted.length === 0) {
    throw new Error('Internal invariant: capability set must be nonempty.');
  }
  return [sorted[0]!, ...sorted.slice(1)];
}

export function validateAgentContextExecutionAuthorityDriverCompatibility(
  executionAuthorityInput: unknown,
  driverRegistryManifestInput: unknown,
): AgentContextExecutionAuthorityDriverCompatibilityResult {
  const executionAuthority = parseAgentContextExecutionAuthority(
    executionAuthorityInput,
  );
  const driverRegistry = parseAgentContextDriverRegistryManifest(
    driverRegistryManifestInput,
  );
  const registrationsByIdentity = new Map(
    driverRegistry.registrations.map((registration) => [
      driverIdentityKey(registration),
      registration,
    ]),
  );
  const issues: AgentContextExecutionAuthorityDriverCompatibilityIssue[] = [];

  for (const requirement of collectDriverRequirements(executionAuthority)) {
    const registration = registrationsByIdentity.get(
      driverIdentityKey(requirement.driver),
    );
    if (registration === undefined) {
      issues.push({
        code: 'DRIVER_REGISTRATION_MISSING',
        driver: requirement.driver,
        requiredCapabilities: sortedNonEmptyCapabilities(
          requirement.capabilities,
        ),
      });
      continue;
    }

    const registeredCapabilities = new Set(registration.capabilities);
    const missingCapabilities = [...requirement.capabilities].filter(
      (capability) => !registeredCapabilities.has(capability),
    );
    if (missingCapabilities.length > 0) {
      issues.push({
        code: 'DRIVER_CAPABILITY_MISSING',
        driver: requirement.driver,
        missingCapabilities: sortedNonEmptyCapabilities(missingCapabilities),
      });
    }
  }

  const hashes = {
    executionAuthorityContentHash: executionAuthority.contentHash,
    driverRegistryContentHash: driverRegistry.contentHash,
  } as const;
  if (issues.length === 0) {
    return {
      status: 'compatible',
      ...hashes,
      issues: [],
    };
  }
  return {
    status: 'incompatible',
    ...hashes,
    issues: [issues[0]!, ...issues.slice(1)],
  };
}
