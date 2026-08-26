import { describe, expect, it } from 'vitest';

import {
  canonicalStringify,
  computeContentHash,
  createFormContract,
  verifyContentHash,
} from './canonical-json.js';
import { FORM_CONTRACT_SCHEMA_VERSION } from './contract.js';

const draft = {
  schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
  formId: 'determinism.example',
  nodes: [],
  diagnostics: [],
} as const;

describe('canonicalStringify', () => {
  it('sorts object keys recursively while preserving array order', () => {
    const first = { z: 1, nested: { b: true, a: false }, rows: ['a', 'b'] };
    const second = {
      rows: ['a', 'b'],
      nested: { a: false, b: true },
      z: 1,
    };

    expect(canonicalStringify(first)).toBe(canonicalStringify(second));
    expect(canonicalStringify(first)).toBe(
      '{"nested":{"a":false,"b":true},"rows":["a","b"],"z":1}',
    );
    expect(canonicalStringify({ rows: ['b', 'a'] })).not.toBe(
      canonicalStringify({ rows: ['a', 'b'] }),
    );
  });

  it('rejects values that JSON contracts cannot represent', () => {
    expect(() => canonicalStringify({ unsafe: undefined })).toThrow(
      'Unsupported value at $.unsafe: undefined',
    );
    expect(() => canonicalStringify({ unsafe: Number.NaN })).toThrow(
      'Non-finite number at $.unsafe',
    );
  });

  it('rejects circular object and array values with their paths', () => {
    const object: Record<string, unknown> = {};
    object.self = object;
    const array: unknown[] = [];
    array.push(array);

    expect(() => canonicalStringify(object)).toThrow(
      'Circular value at $.self',
    );
    expect(() => canonicalStringify(array)).toThrow(
      'Circular value at $[0]',
    );
  });

  it('rejects sparse arrays instead of colliding with dense canonical JSON', () => {
    const leadingHole = new Array(1);
    const nestedHole = { values: [1, , 2] };

    expect(canonicalStringify([])).toBe('[]');
    expect(() => canonicalStringify(leadingHole)).toThrow(
      'Sparse array element at $[0]',
    );
    expect(() => canonicalStringify(nestedHole)).toThrow(
      'Sparse array element at $.values[1]',
    );
    expect(() => canonicalStringify([undefined])).toThrow(
      'Unsupported value at $[0]: undefined',
    );
  });

  it('rejects enumerable array properties that are not JavaScript array indexes', () => {
    const array: unknown[] = [];
    Object.defineProperty(array, '4294967295', {
      value: () => 'executable',
      enumerable: true,
    });

    expect(() => canonicalStringify(array)).toThrow(
      'Unsupported array property at $.4294967295',
    );
  });

  it('rejects huge sparse arrays without scanning their declared length', () => {
    const array: unknown[] = [];
    Object.defineProperty(array, '4294967294', {
      value: 'last-index',
      enumerable: true,
    });

    expect(() => canonicalStringify(array)).toThrow(
      'Sparse array element at $[0]',
    );
  });
});

describe('contract content hashing', () => {
  it('is stable for equivalent contracts and changes with meaningful content', () => {
    const first = computeContentHash(draft);
    const equivalent = computeContentHash({
      diagnostics: [],
      nodes: [],
      formId: 'determinism.example',
      schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
    });
    const changed = computeContentHash({
      ...draft,
      formId: 'determinism.changed',
    });

    expect(first).toBe(equivalent);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(changed).not.toBe(first);
  });

  it('excludes the contentHash property from its own input', () => {
    expect(
      computeContentHash({ ...draft, contentHash: `sha256:${'a'.repeat(64)}` }),
    ).toBe(
      computeContentHash({ ...draft, contentHash: `sha256:${'b'.repeat(64)}` }),
    );
  });

  it('creates and verifies a complete content-addressed contract', () => {
    const contract = createFormContract(draft);

    expect(verifyContentHash(contract)).toBe(true);
    expect(
      verifyContentHash({ ...contract, formId: 'determinism.tampered' }),
    ).toBe(false);
  });

  it('includes v0.4 profile provenance and interaction metadata in the hash', () => {
    const base = {
      ...draft,
      fieldTypeProfileRegistry: {
        schemaVersion: '0.4.0' as const,
        id: 'acme.fields',
        version: 1,
        contentHash: `sha256:${'a'.repeat(64)}`,
      },
    };
    const changedRegistry = {
      ...base,
      fieldTypeProfileRegistry: {
        ...base.fieldTypeProfileRegistry,
        version: 2,
      },
    };

    expect(computeContentHash(changedRegistry)).not.toBe(
      computeContentHash(base),
    );
  });
});
