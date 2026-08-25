import { describe, expect, it } from 'vitest';

import {
  FORM_CONTRACT_SCHEMA_VERSION,
  type FormContract,
} from './contract.js';
import { createFormContract } from './canonical-json.js';
import { parseFormContract } from './validation.js';

const completeContract: FormContract = createFormContract({
  schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
  formId: 'applicant.profile',
  nodes: [
    {
      id: 'applicant.profile::identity.legalName',
      kind: 'control',
      modelPath: ['identity', 'legalName'],
      formlyType: 'input',
      semanticType: 'text',
      evidence: 'declared',
      presentation: { label: 'Legal name' },
      defaultValue: '',
      wrappers: ['section-card'],
      constraints: [{ kind: 'required' }],
      options: [{ label: 'Example', value: { code: 'EXAMPLE' } }],
      conditions: [
        {
          property: 'props.disabled',
          expression: 'formState.readonly',
          evidence: 'declared',
        },
      ],
      children: [],
    },
  ],
  diagnostics: [
    {
      code: 'OPAQUE_FUNCTION',
      severity: 'warning',
      message: 'A function expression cannot be serialized.',
      evidence: 'declared',
      sourcePath: ['fields', 0, 'expressions', 'hide'],
      nodeId: 'applicant.profile::identity.legalName',
    },
  ],
});

describe('parseFormContract', () => {
  it('accepts a complete representative v0 contract', () => {
    expect(parseFormContract(completeContract)).toEqual(completeContract);
  });

  it('rejects malformed node identity', () => {
    const malformed = {
      ...completeContract,
      nodes: [
        { ...completeContract.nodes[0]!, id: 'contains whitespace' },
      ],
    };

    expect(() => parseFormContract(malformed)).toThrow(
      'nodes[0].id must be a stable identifier',
    );
  });

  it('rejects empty and negative model-path segments', () => {
    const emptySegment = {
      ...completeContract,
      nodes: [
        { ...completeContract.nodes[0]!, modelPath: ['identity', ''] },
      ],
    };
    const negativeSegment = {
      ...completeContract,
      nodes: [
        { ...completeContract.nodes[0]!, modelPath: ['items', -1] },
      ],
    };

    expect(() => parseFormContract(emptySegment)).toThrow(
      'nodes[0].modelPath[1]',
    );
    expect(() => parseFormContract(negativeSegment)).toThrow(
      'nodes[0].modelPath[1]',
    );
  });

  it('rejects unknown diagnostic codes and values', () => {
    const malformed = structuredClone(completeContract) as unknown as {
      diagnostics: Record<string, unknown>[];
    };
    malformed.diagnostics[0]!.code = 'MODEL_GUESSED';

    expect(() => parseFormContract(malformed)).toThrow(
      'diagnostics[0].code',
    );
  });

  it('rejects unknown properties instead of silently expanding v0', () => {
    const malformed = {
      ...structuredClone(completeContract),
      generatedAt: '2026-08-25T00:00:00.000Z',
    };

    expect(() => parseFormContract(malformed)).toThrow(
      'contract contains unknown property generatedAt',
    );
  });

  it('rejects a structurally valid contract with a stale content hash', () => {
    const malformed = { ...completeContract, formId: 'applicant.changed' };

    expect(() => parseFormContract(malformed)).toThrow(
      'contract.contentHash does not match contract content',
    );
  });
});
