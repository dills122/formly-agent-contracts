import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createDynamicSemanticsCandidate } from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

import {
  createDynamicSemanticsCandidateFromModelOutput,
  createDynamicSemanticsContextPack,
  evaluateDynamicSemanticsCandidates,
  runDynamicSemanticsEnrichment,
} from './dynamic-semantics.js';

describe('dynamic semantics model boundary', () => {
  it('packs only an explicitly selected byte range with integrity evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'formly-context-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/form.ts'), 'before OPTIONS after');
    const pack = await createDynamicSemanticsContextPack({
      workspaceRoot: root,
      formId: 'fixture.form',
      spans: [{ id: 'span.options', sourceId: 'fixture.forms', workspaceRelativePath: 'src/form.ts', startOffset: 7, endOffset: 14 }],
    });
    expect(pack.spans[0]?.content).toBe('OPTIONS');
    expect(pack.spans[0]?.sha256).toMatch(/^sha256:[a-f0-9]{64}$/u);
    const span = pack.spans[0]!;
    const output = {
      schemaVersion: '0.1.0' as const,
      authority: 'proposal-only' as const,
      candidateId: 'fixture.candidate',
      formId: 'fixture.form',
      model: { provider: 'local', model: 'test', promptVersion: 'v1' },
      evidenceSpans: [{
        id: span.id,
        sourceId: span.sourceId,
        workspaceRelativePath: span.workspaceRelativePath,
        startOffset: span.startOffset,
        endOffset: span.endOffset,
        sha256: span.sha256,
      }],
      proposals: [], assumptions: [], unknowns: [],
    };
    expect(createDynamicSemanticsCandidateFromModelOutput(pack, output).contentHash).toMatch(/^sha256:/u);
    await expect(runDynamicSemanticsEnrichment({
      context: pack,
      provider: {
        provider: 'local',
        model: 'test',
        promptVersion: 'v1',
        generate: () => Promise.resolve(output),
      },
    })).resolves.toEqual(createDynamicSemanticsCandidateFromModelOutput(pack, output));
    expect(() => createDynamicSemanticsCandidateFromModelOutput(pack, {
      ...output,
      evidenceSpans: [{ ...output.evidenceSpans[0]!, sha256: `sha256:${'b'.repeat(64)}` }],
    })).toThrow(/trusted context/u);
    await expect(createDynamicSemanticsContextPack({
      workspaceRoot: root,
      formId: 'fixture.form',
      spans: [{ id: 'outside', sourceId: 'fixture.forms', workspaceRelativePath: '../secret', startOffset: 0, endOffset: 1 }],
    })).rejects.toThrow(/outside|relative/u);
  });

  it('scores valid abstention and unknown recall without invoking a provider', () => {
    const candidate = createDynamicSemanticsCandidate({
      schemaVersion: '0.1.0', authority: 'proposal-only', candidateId: 'fixture.candidate', formId: 'fixture.form',
      model: { provider: 'local', model: 'test', promptVersion: 'v1' }, evidenceSpans: [], proposals: [], assumptions: [],
      unknowns: ['No emitted values were observed.'],
    });
    expect(evaluateDynamicSemanticsCandidates([{ case: {
      id: 'observable', category: 'edge', allowedEvidenceSpanIds: [], requiredUnknowns: ['No emitted values were observed.'], expectAbstention: true,
    }, candidate }])).toMatchObject({ schemaValidity: 1, unsafePromotionRate: 0, unknownRecall: 1, abstentionAccuracy: 1 });
  });
});
