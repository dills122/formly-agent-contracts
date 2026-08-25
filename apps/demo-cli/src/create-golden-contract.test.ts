import {
  canonicalStringify,
  type ContractNode,
  verifyContentHash,
} from '@formly-agent-contracts/contract-schema';
import { describe, expect, it } from 'vitest';

import { createGoldenContract } from './create-golden-contract.js';

function flattenNodes(nodes: readonly ContractNode[]): ContractNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenNodes(node.children),
    ...(node.arrayTemplate === undefined
      ? []
      : flattenNodes([node.arrayTemplate])),
  ]);
}

describe('createGoldenContract', () => {
  it('creates a valid deterministic contract covering the MVP shapes', () => {
    const first = createGoldenContract();
    const second = createGoldenContract();
    const nodes = flattenNodes(first.nodes);

    expect(first.formId).toBe('demo.golden-form');
    expect(verifyContentHash(first)).toBe(true);
    expect(canonicalStringify(second)).toBe(canonicalStringify(first));
    expect(new Set(nodes.map(({ kind }) => kind))).toEqual(
      new Set(['control', 'group', 'array']),
    );
    expect(nodes).toContainEqual(
      expect.objectContaining({
        modelPath: ['profile', 'contactMethod'],
        options: [
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'phone' },
        ],
      }),
    );
    expect(nodes).toContainEqual(
      expect.objectContaining({
        modelPath: ['profile', 'email'],
        conditions: [
          {
            property: 'hide',
            expression: "model.contactMethod !== 'email'",
            evidence: 'declared',
          },
        ],
      }),
    );
    expect(first.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'OPAQUE_FUNCTION' }),
    );
  });
});
