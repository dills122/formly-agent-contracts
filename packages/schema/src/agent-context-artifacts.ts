import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

import {
  canonicalStringify,
  parseArrayIndexProperty,
} from './canonical-json.js';

export const AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION = '0.1.0' as const;

export type Sha256Digest = `sha256:${string}`;

export interface AgentContextArtifactReference {
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly contentHash: Sha256Digest;
}

export interface AgentContextWorkspaceIndexReference {
  readonly schemaVersion: string;
  readonly contentHash: Sha256Digest;
}

export interface AgentContextArtifactSetDraft {
  readonly schemaVersion: typeof AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION;
  readonly repositoryRevision: string;
  readonly workspaceIndex: AgentContextWorkspaceIndexReference;
  readonly artifacts: readonly AgentContextArtifactReference[];
}

export interface AgentContextArtifactSet extends AgentContextArtifactSetDraft {
  readonly contentHash: Sha256Digest;
}

type DataRecord = Readonly<Record<string, unknown>>;

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SCHEMA_ID_PATTERN = new RegExp(
  '^[a-z][a-z0-9]*' + '(?:[.-][a-z0-9]+)+$',
  'u',
);
const VERSION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?$/u;
const REVISION_PATTERN = /^(?:[\x21-\x7e]|[\x21-\x7e][\x20-\x7e]{0,254}[\x21-\x7e])$/u;
const MAX_ARTIFACT_REFERENCES = 10_000;

const ARTIFACT_SET_KEYS = new Set([
  'schemaVersion',
  'repositoryRevision',
  'workspaceIndex',
  'artifacts',
  'contentHash',
]);
const ARTIFACT_SET_DRAFT_KEYS = new Set(
  [...ARTIFACT_SET_KEYS].filter((key) => key !== 'contentHash'),
);
const WORKSPACE_INDEX_REFERENCE_KEYS = new Set([
  'schemaVersion',
  'contentHash',
]);
const ARTIFACT_REFERENCE_KEYS = new Set([
  'schemaId',
  'schemaVersion',
  'contentHash',
]);

function fail(path: string, message: string): never {
  throw new TypeError(`${path}: ${message}`);
}

function cloneDataOnly(
  input: unknown,
  path: string,
  ancestors = new Set<object>(),
): unknown {
  const inputType = typeof input;
  if (
    (inputType === 'object' && input !== null) ||
    inputType === 'function'
  ) {
    if (utilTypes.isProxy(input)) {
      fail(path, 'must not be a proxy.');
    }
  }

  if (
    input === null ||
    inputType === 'string' ||
    inputType === 'boolean'
  ) {
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
  const detached = cloneDataOnly(input, path);
  let roundTripDetached: unknown;
  try {
    roundTripDetached = cloneDataOnly(structuredClone(input), path);
  } catch {
    fail(
      path,
      'must round-trip through structured clone as plain JSON data.',
    );
  }
  if (
    canonicalStringify(roundTripDetached) !== canonicalStringify(detached)
  ) {
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

function schemaVersion(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length > 64 ||
    !VERSION_PATTERN.test(input)
  ) {
    fail(path, 'must be a 1-64 character ASCII version string.');
  }
  return input;
}

function schemaId(input: unknown, path: string): string {
  if (
    typeof input !== 'string' ||
    input.length > 128 ||
    !SCHEMA_ID_PATTERN.test(input)
  ) {
    fail(path, 'must be a 1-128 character ASCII namespaced schema ID.');
  }
  return input;
}

function repositoryRevision(input: unknown, path: string): string {
  if (typeof input !== 'string' || !REVISION_PATTERN.test(input)) {
    fail(
      path,
      'must be 1-256 printable ASCII provenance without surrounding whitespace.',
    );
  }
  return input;
}

function sha256(input: unknown, path: string): Sha256Digest {
  if (typeof input !== 'string' || !HASH_PATTERN.test(input)) {
    fail(path, 'must be a lowercase sha256 digest.');
  }
  return input as Sha256Digest;
}

function parseWorkspaceIndexReference(
  input: unknown,
  path: string,
): AgentContextWorkspaceIndexReference {
  const value = record(input, path, WORKSPACE_INDEX_REFERENCE_KEYS);
  return {
    schemaVersion: schemaVersion(
      required(value, 'schemaVersion', path),
      `${path}.schemaVersion`,
    ),
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function parseArtifactReference(
  input: unknown,
  path: string,
): AgentContextArtifactReference {
  const value = record(input, path, ARTIFACT_REFERENCE_KEYS);
  return {
    schemaId: schemaId(
      required(value, 'schemaId', path),
      `${path}.schemaId`,
    ),
    schemaVersion: schemaVersion(
      required(value, 'schemaVersion', path),
      `${path}.schemaVersion`,
    ),
    contentHash: sha256(
      required(value, 'contentHash', path),
      `${path}.contentHash`,
    ),
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareArtifactReferences(
  left: AgentContextArtifactReference,
  right: AgentContextArtifactReference,
): number {
  return (
    compareText(left.schemaId, right.schemaId) ||
    compareText(left.schemaVersion, right.schemaVersion) ||
    compareText(left.contentHash, right.contentHash)
  );
}

function parseArtifactReferences(
  input: unknown,
  path: string,
  requireCanonicalOrder: boolean,
): readonly AgentContextArtifactReference[] {
  if (!Array.isArray(input)) {
    fail(path, 'must be an array.');
  }
  if (input.length > MAX_ARTIFACT_REFERENCES) {
    fail(path, `must contain at most ${MAX_ARTIFACT_REFERENCES} references.`);
  }

  const references = input.map((entry, index) =>
    parseArtifactReference(entry, `${path}[${index}]`),
  );
  const exactReferences = new Set<string>();
  for (const [index, reference] of references.entries()) {
    const identity = [
      reference.schemaId,
      reference.schemaVersion,
      reference.contentHash,
    ].join('\0');
    if (exactReferences.has(identity)) {
      fail(`${path}[${index}]`, 'duplicates an exact artifact reference.');
    }
    exactReferences.add(identity);
  }

  if (requireCanonicalOrder) {
    for (let index = 1; index < references.length; index += 1) {
      const previous = references[index - 1];
      const current = references[index];
      if (
        previous !== undefined &&
        current !== undefined &&
        compareArtifactReferences(previous, current) > 0
      ) {
        fail(path, 'must be in canonical order.');
      }
    }
  }
  return references;
}

function normalizeArtifactSetInput(
  input: unknown,
  requireContentHash: boolean,
  requireCanonicalOrder: boolean,
): AgentContextArtifactSetDraft & { readonly contentHash?: Sha256Digest } {
  const path = 'agentContextArtifactSet';
  const detached = cloneValidatedDataOnly(input, path);
  const value = record(
    detached,
    path,
    requireContentHash ? ARTIFACT_SET_KEYS : ARTIFACT_SET_DRAFT_KEYS,
  );
  if (
    required(value, 'schemaVersion', path) !==
    AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION
  ) {
    fail(
      `${path}.schemaVersion`,
      `must be ${AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION}.`,
    );
  }

  const normalized: AgentContextArtifactSetDraft = {
    schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
    repositoryRevision: repositoryRevision(
      required(value, 'repositoryRevision', path),
      `${path}.repositoryRevision`,
    ),
    workspaceIndex: parseWorkspaceIndexReference(
      required(value, 'workspaceIndex', path),
      `${path}.workspaceIndex`,
    ),
    artifacts: parseArtifactReferences(
      required(value, 'artifacts', path),
      `${path}.artifacts`,
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

function canonicalDraft(
  input: AgentContextArtifactSetDraft,
): AgentContextArtifactSetDraft {
  return {
    schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
    repositoryRevision: input.repositoryRevision,
    workspaceIndex: {
      schemaVersion: input.workspaceIndex.schemaVersion,
      contentHash: input.workspaceIndex.contentHash,
    },
    artifacts: [...input.artifacts]
      .sort(compareArtifactReferences)
      .map((reference) => ({
        schemaId: reference.schemaId,
        schemaVersion: reference.schemaVersion,
        contentHash: reference.contentHash,
      })),
  };
}

function computeNormalizedHash(input: AgentContextArtifactSetDraft): Sha256Digest {
  const canonical = canonicalStringify(canonicalDraft(input));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function parseAgentContextArtifactSet(
  input: unknown,
): AgentContextArtifactSet {
  const normalized = normalizeArtifactSetInput(input, true, true);
  const artifactSet = normalized as AgentContextArtifactSet;
  if (artifactSet.contentHash !== computeNormalizedHash(artifactSet)) {
    fail(
      'agentContextArtifactSet.contentHash',
      'does not match artifact content.',
    );
  }
  return artifactSet;
}

export function canonicalizeAgentContextArtifactSet(input: unknown): string {
  return canonicalStringify(parseAgentContextArtifactSet(input));
}

export function computeAgentContextArtifactSetHash(
  input: unknown,
): Sha256Digest {
  const normalized = normalizeArtifactSetInput(input, false, false);
  return computeNormalizedHash(normalized);
}

export function createAgentContextArtifactSet(
  draft: AgentContextArtifactSetDraft,
): AgentContextArtifactSet {
  const normalized = canonicalDraft(
    normalizeArtifactSetInput(draft, false, false),
  );
  return {
    ...normalized,
    contentHash: computeNormalizedHash(normalized),
  };
}
