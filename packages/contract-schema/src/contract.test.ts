import { describe, expect, it } from 'vitest';

import {
  FORM_CONTRACT_SCHEMA_VERSION,
  type FormContract,
  type FormContractDraft,
} from './contract.js';
import { createFormContract } from './canonical-json.js';
import { parseFormContract } from './validation.js';

const completeContract: FormContract = createFormContract({
  schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
  formId: 'applicant.profile',
  fieldTypeProfileRegistry: {
    schemaVersion: '0.4.0',
    id: 'acme.formly-fields',
    version: 2,
    contentHash: `sha256:${'a'.repeat(64)}`,
  },
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
      valueDomain: {
        kind: 'enumerated',
        source: 'adapter',
        completeness: 'complete',
        evidence: 'declared',
        values: [{ code: 'EXAMPLE' }],
      },
      interactionProfile: {
        profile: { id: 'acme.legal-name', version: 3 },
        semanticType: 'text',
        valueShape: 'scalar',
        evidence: 'declared',
        parts: [
          {
            name: 'control',
            role: 'textbox',
            cardinality: 'one',
            evidence: 'declared',
          },
          {
            name: 'section-toggle',
            role: 'button',
            cardinality: 'one',
            evidence: 'declared',
          },
        ],
        interaction: {
          kind: 'fill',
          operation: 'fill',
          controlPart: 'control',
        },
        driver: {
          kind: 'generic',
          id: 'generic.fill',
          version: 1,
          capabilities: ['fill'],
        },
        preconditions: [
          {
            kind: 'activate',
            part: 'section-toggle',
            operation: 'click',
            evidence: 'declared',
          },
        ],
        unknowns: [
          {
            scope: 'profile',
            source: 'acme.legal-name@3',
            aspect: 'runtime-states',
            reason: 'Application validation states are not declared.',
            evidence: 'declared',
          },
        ],
        provenance: [
          'registry:acme.formly-fields@2',
          'type:input',
          'wrapper:section-card',
        ],
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
  it('accepts a complete representative v0.4 contract', () => {
    expect(parseFormContract(completeContract)).toEqual(completeContract);
  });

  it('accepts every value-domain branch', () => {
    const domains = [
      {
        kind: 'enumerated',
        source: 'static-options',
        completeness: 'complete',
        evidence: 'declared',
        values: [false, true],
      },
      { kind: 'dynamic', source: 'async', evidence: 'declared' },
      { kind: 'unknown', evidence: 'declared' },
    ] as const;

    for (const valueDomain of domains) {
      const draft: FormContractDraft = {
        schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
        formId: `domain.${valueDomain.kind}`,
        fieldTypeProfileRegistry: completeContract.fieldTypeProfileRegistry!,
        nodes: [{ ...completeContract.nodes[0]!, valueDomain }],
        diagnostics: [],
      };
      expect(parseFormContract(createFormContract(draft))).toEqual(
        createFormContract(draft),
      );
    }
  });

  it.each([
    [
      'registry hash',
      {
        ...completeContract,
        fieldTypeProfileRegistry: {
          ...completeContract.fieldTypeProfileRegistry,
          contentHash: 'not-a-hash',
        },
      },
      'contract.fieldTypeProfileRegistry.contentHash',
    ],
    [
      'registry schema',
      {
        ...completeContract,
        fieldTypeProfileRegistry: {
          ...completeContract.fieldTypeProfileRegistry,
          schemaVersion: '0.3.0',
        },
      },
      'contract.fieldTypeProfileRegistry.schemaVersion',
    ],
    [
      'registry identity',
      {
        ...completeContract,
        fieldTypeProfileRegistry: {
          ...completeContract.fieldTypeProfileRegistry,
          id: 'not_namespaced',
        },
      },
      'contract.fieldTypeProfileRegistry.id',
    ],
    [
      'registry version',
      {
        ...completeContract,
        fieldTypeProfileRegistry: {
          ...completeContract.fieldTypeProfileRegistry,
          version: 0,
        },
      },
      'contract.fieldTypeProfileRegistry.version',
    ],
    [
      'profile evidence',
      {
        ...completeContract,
        nodes: [
          {
            ...completeContract.nodes[0],
            interactionProfile: {
              ...completeContract.nodes[0]!.interactionProfile,
              evidence: 'resolved',
            },
          },
        ],
      },
      'nodes[0].interactionProfile.evidence',
    ],
    [
      'profile semantic type',
      {
        ...completeContract,
        nodes: [
          {
            ...completeContract.nodes[0],
            interactionProfile: {
              ...completeContract.nodes[0]!.interactionProfile,
              semanticType: 'different-type',
            },
          },
        ],
      },
      'nodes[0].semanticType must match interactionProfile.semanticType',
    ],
    [
      'generic driver identity',
      {
        ...completeContract,
        nodes: [
          {
            ...completeContract.nodes[0],
            interactionProfile: {
              ...completeContract.nodes[0]!.interactionProfile,
              driver: {
                ...completeContract.nodes[0]!.interactionProfile!.driver,
                id: 'generic.choice',
              },
            },
          },
        ],
      },
      'nodes[0].interactionProfile.driver.id must be "generic.fill"',
    ],
    [
      'unknown profile property',
      {
        ...completeContract,
        nodes: [
          {
            ...completeContract.nodes[0],
            interactionProfile: {
              ...completeContract.nodes[0]!.interactionProfile,
              component: 'UnsafeAngularComponent',
            },
          },
        ],
      },
      'nodes[0].interactionProfile contains unknown property component',
    ],
    [
      'non-JSON domain value',
      {
        ...completeContract,
        nodes: [
          {
            ...completeContract.nodes[0],
            valueDomain: {
              kind: 'enumerated',
              source: 'adapter',
              completeness: 'complete',
              evidence: 'declared',
              values: [Number.NaN],
            },
          },
        ],
      },
      'nodes[0].valueDomain.values[0]',
    ],
  ])('rejects malformed v0.4 %s metadata', (_label, draft, expectedPath) => {
    expect(() => parseFormContract(createFormContract(draft as FormContractDraft))).toThrow(
      expectedPath,
    );
  });

  it('requires form-level registry provenance for resolved node profiles', () => {
    const withoutRegistry = Object.fromEntries(
      Object.entries(completeContract).filter(
        ([key]) => key !== 'fieldTypeProfileRegistry',
      ),
    );

    expect(() => parseFormContract(withoutRegistry)).toThrow(
      'contract.fieldTypeProfileRegistry is required when a node has interactionProfile',
    );
  });

  it('changes the content hash when resolved interaction metadata changes', () => {
    const changed = createFormContract({
      ...completeContract,
      nodes: [
        {
          ...completeContract.nodes[0]!,
          interactionProfile: {
            ...completeContract.nodes[0]!.interactionProfile!,
            profile: { id: 'acme.legal-name', version: 4 },
          },
        },
      ],
    });

    expect(changed.contentHash).not.toBe(completeContract.contentHash);
    expect(parseFormContract(changed)).toEqual(changed);
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
