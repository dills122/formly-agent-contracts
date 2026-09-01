import { describe, expect, it } from 'vitest';

import {
  createDynamicSemanticsCandidate,
  parseDynamicSemanticsCandidate,
} from './dynamic-semantics-candidate.js';

function draft() {
  return {
    schemaVersion: '0.1.0' as const,
    authority: 'proposal-only' as const,
    candidateId: 'fixture.dynamic.1',
    formId: 'fixture.form',
    model: { provider: 'local', model: 'formly-tuned', promptVersion: 'v1' },
    evidenceSpans: [{
      id: 'span.options',
      sourceId: 'fixture.forms',
      workspaceRelativePath: 'src/form.ts',
      startOffset: 10,
      endOffset: 20,
      sha256: `sha256:${'a'.repeat(64)}`,
    }],
    proposals: [{
      id: 'proposal.domain',
      kind: 'option-domain' as const,
      targetNodeId: 'fixture.form::path:s_status',
      values: [{ value: 'open', label: 'Open' }],
      evidenceSpanIds: ['span.options'],
      confidence: 'high' as const,
      assumptions: [],
      unknowns: [],
    }],
    assumptions: [],
    unknowns: ['Runtime authorization may filter values.'],
  };
}

describe('dynamic semantics candidates', () => {
  it('creates and verifies a proposal-only candidate', () => {
    const candidate = createDynamicSemanticsCandidate(draft());
    expect(parseDynamicSemanticsCandidate(candidate)).toEqual(candidate);
    expect(candidate.authority).toBe('proposal-only');
  });

  it('rejects invented evidence references', () => {
    const input = draft();
    input.proposals[0]!.evidenceSpanIds = ['span.invented'];
    expect(() => createDynamicSemanticsCandidate(input)).toThrow(/unknown span/u);
  });

  it('rejects executable authority and unknown properties', () => {
    expect(() => createDynamicSemanticsCandidate({ ...draft(), authority: 'declared' } as never)).toThrow(/proposal-only/u);
    expect(() => createDynamicSemanticsCandidate({ ...draft(), selector: '#unsafe' } as never)).toThrow(/selector/u);
  });
});
