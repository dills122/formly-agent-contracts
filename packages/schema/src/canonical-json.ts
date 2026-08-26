import { createHash } from 'node:crypto';

import type { FormContract, FormContractDraft } from './contract.js';

const CONTENT_HASH_PROPERTY = 'contentHash';
const MAX_ARRAY_INDEX = 2 ** 32 - 2;

/** @internal Shared by strict contract DTO validators; not part of the package barrel. */
export function parseArrayIndexProperty(
  key: string,
  length: number,
): number | undefined {
  const index = Number(key);
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > MAX_ARRAY_INDEX ||
    index >= length ||
    String(index) !== key
  ) {
    return undefined;
  }
  return index;
}

function firstMissingArrayIndex(
  sortedIndexes: readonly number[],
): number {
  let expected = 0;
  for (const index of sortedIndexes) {
    if (index !== expected) {
      return expected;
    }
    expected += 1;
  }
  return expected;
}

function describeUnsupportedValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function canonicalize(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): string {
  if (value === null || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number at ${path}`);
    }

    return JSON.stringify(value);
  }

  if (typeof value !== 'object') {
    throw new TypeError(
      `Unsupported value at ${path}: ${describeUnsupportedValue(value)}`,
    );
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Circular value at ${path}`);
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new TypeError(`Symbol-keyed property at ${path}`);
      }

      const descriptors = Object.getOwnPropertyDescriptors(value);
      const indexedDescriptors: [number, PropertyDescriptor][] = [];
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (key === 'length') {
          continue;
        }
        const index = parseArrayIndexProperty(key, value.length);
        if (index === undefined) {
          if (descriptor.enumerable) {
            throw new TypeError(`Unsupported array property at ${path}.${key}`);
          }
          continue;
        }
        if (!('value' in descriptor)) {
          throw new TypeError(`Accessor property at ${path}[${index}]`);
        }
        indexedDescriptors.push([index, descriptor]);
      }

      indexedDescriptors.sort(([left], [right]) => left - right);
      if (indexedDescriptors.length !== value.length) {
        const missingIndex = firstMissingArrayIndex(
          indexedDescriptors.map(([index]) => index),
        );
        throw new TypeError(`Sparse array element at ${path}[${missingIndex}]`);
      }

      const items = indexedDescriptors.map(([index, descriptor]) =>
        canonicalize(descriptor.value, `${path}[${index}]`, ancestors),
      );
      return `[${items.join(',')}]`;
    }

    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Unsupported object at ${path}`);
    }

    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`Symbol-keyed property at ${path}`);
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const entries: string[] = [];

    for (const key of Object.keys(descriptors).sort()) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable) {
        continue;
      }
      if (!('value' in descriptor)) {
        throw new TypeError(`Accessor property at ${path}.${key}`);
      }

      entries.push(
        `${JSON.stringify(key)}:${canonicalize(
          descriptor.value,
          `${path}.${key}`,
          ancestors,
        )}`,
      );
    }

    return `{${entries.join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalStringify(value: unknown): string {
  return canonicalize(value, '$', new Set<object>());
}

function withoutContentHash(
  contract: FormContract | FormContractDraft,
): FormContractDraft {
  const entries = Object.entries(contract).filter(
    ([key]) => key !== CONTENT_HASH_PROPERTY,
  );

  return Object.fromEntries(entries) as unknown as FormContractDraft;
}

export function computeContentHash(
  contract: FormContract | FormContractDraft,
): string {
  const canonical = canonicalStringify(withoutContentHash(contract));

  // Source: https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function createFormContract(draft: FormContractDraft): FormContract {
  return {
    ...draft,
    contentHash: computeContentHash(draft),
  };
}

export function verifyContentHash(contract: FormContract): boolean {
  return contract.contentHash === computeContentHash(contract);
}
