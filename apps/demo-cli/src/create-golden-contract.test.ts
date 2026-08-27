import {
  canonicalStringify,
  type ContractNode,
  verifyContentHash,
} from '@formly-contract/schema';
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
      new Set(['control', 'group', 'array', 'display']),
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
    const displayName = nodes.find(
      ({ modelPath }) => modelPath.join('.') === 'profile.displayName',
    );
    expect(displayName?.locators).toContainEqual({
      target: 'control',
      strategy: 'testId',
      attribute: 'data-testid',
      value: 'profile-display-name',
      evidence: 'declared',
      confidence: 'exact',
    });
    expect(nodes).toContainEqual(
      expect.objectContaining({
        modelPath: ['profile', 'email'],
        conditions: [
          {
            id: 'demo.golden-form::path:s_profile.s_email::rule:expressions:hide',
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
    const eligibility = nodes.find(
      ({ modelPath }) => modelPath.join('.') === 'eligibilityReview',
    );
    expect(eligibility?.optionSource).toEqual({
      kind: 'dynamic',
      property: 'props.options',
      source: 'function',
      evidence: 'declared',
    });
    expect(eligibility?.dynamicRules).toEqual(
      expect.arrayContaining([
        {
          id: 'demo.golden-form::path:s_eligibilityReview::rule:expressions:props.disabled',
          property: 'props.disabled',
          source: 'function',
          evidence: 'declared',
        },
        {
          id: 'demo.golden-form::path:s_eligibilityReview::rule:expressionProperties:props.options',
          property: 'props.options',
          source: 'function',
          evidence: 'declared',
        },
      ]),
    );
  });
});
