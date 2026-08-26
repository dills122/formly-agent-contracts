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
      optionSource: {
        kind: 'dynamic',
        property: 'props.options',
        source: 'function',
        evidence: 'resolved',
      },
      conditions: [
        {
          property: 'props.disabled',
          expression: 'formState.readonly',
          evidence: 'declared',
        },
      ],
      dynamicRules: [
        {
          property: 'props.options',
          source: 'function',
          evidence: 'resolved',
          resolvedValue: [{ label: 'Example', value: { code: 'EXAMPLE' } }],
        },
      ],
      state: { hidden: false, readonly: true, disabled: false },
      locators: [
        {
          target: 'control',
          strategy: 'testId',
          attribute: 'data-pw',
          value: 'applicant-legal-name',
          evidence: 'declared',
          confidence: 'exact',
        },
        {
          target: 'control',
          strategy: 'role',
          value: 'textbox',
          accessibleName: 'Legal name',
          evidence: 'observed',
          confidence: 'exact',
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
  it('accepts a complete representative v0.3 contract', () => {
    expect(parseFormContract(completeContract)).toEqual(completeContract);
  });

  it('accepts a display-only node with declared template content', () => {
    const displayContract = createFormContract({
      schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
      formId: 'display.example',
      nodes: [
        {
          id: 'display.example::position:0',
          kind: 'display',
          modelPath: [],
          evidence: 'declared',
          display: { format: 'html', content: '<p>Review your answers.</p>' },
          wrappers: [],
          constraints: [],
          options: [],
          conditions: [],
          dynamicRules: [],
          locators: [],
          children: [],
        },
      ],
      diagnostics: [],
    });

    expect(parseFormContract(displayContract)).toEqual(displayContract);
  });

  it('accepts multiple named locator targets for one composite field', () => {
    const compositeContract = createFormContract({
      schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
      formId: 'coverage.period',
      nodes: [
        {
          id: 'coverage.period::path:s_period',
          kind: 'control',
          modelPath: ['period'],
          formlyType: 'date-range',
          evidence: 'declared',
          wrappers: [],
          constraints: [],
          options: [],
          conditions: [],
          dynamicRules: [],
          locators: [
            {
              target: 'start',
              strategy: 'testId',
              attribute: 'data-testid',
              value: 'coverage-period-start',
              evidence: 'declared',
              confidence: 'derived',
            },
            {
              target: 'end',
              strategy: 'label',
              value: 'Coverage end',
              evidence: 'observed',
              confidence: 'exact',
            },
          ],
          children: [],
        },
      ],
      diagnostics: [],
    });

    expect(parseFormContract(compositeContract)).toEqual(compositeContract);
  });

  it('rejects a test-id locator without its configured attribute', () => {
    const malformed = structuredClone(completeContract) as unknown as {
      nodes: { locators: Record<string, unknown>[] }[];
    };
    delete malformed.nodes[0]?.locators[0]?.attribute;

    expect(() => parseFormContract(malformed)).toThrow(
      'nodes[0].locators[0].attribute',
    );
  });

  it('rejects test-id-only properties on another locator strategy', () => {
    const malformed = structuredClone(completeContract) as unknown as {
      nodes: { locators: Record<string, unknown>[] }[];
    };
    malformed.nodes[0]!.locators[1]!.attribute = 'data-testid';

    expect(() => parseFormContract(malformed)).toThrow(
      'nodes[0].locators[1] contains unknown property attribute',
    );
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

  it('rejects cycles inside contract JSON values', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const malformed = structuredClone(completeContract) as unknown as {
      nodes: { defaultValue?: unknown }[];
    };
    malformed.nodes[0]!.defaultValue = cyclic;

    expect(() => parseFormContract(malformed)).toThrow(
      'nodes[0].defaultValue.self must not contain a cycle',
    );
  });
});
