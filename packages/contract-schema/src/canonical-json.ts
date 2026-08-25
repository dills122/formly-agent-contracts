import { createHash } from 'node:crypto';

import type { FormContract, FormContractDraft } from './contract.js';

const CONTENT_HASH_PROPERTY = 'contentHash';

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
      return `[${value
        .map((item, index) => canonicalize(item, `${path}[${index}]`, ancestors))
        .join(',')}]`;
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
