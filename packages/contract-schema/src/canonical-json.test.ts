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
});
