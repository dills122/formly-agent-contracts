import type { FormlyFieldConfig } from '@ngx-formly/core';
import { describe, expect, it } from 'vitest';

import {
  compileFormContractScenario,
  extractFormContract,
} from './extract-form.js';

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

describe('extractFormContract basic projection', () => {
  it('projects exact test attributes and explicit accessibility candidates', () => {
    const result = extractFormContract({
      formId: 'locator.declared',
      fields: [
        {
          key: 'email',
          id: 'applicant-email',
          type: 'input',
          props: {
            placeholder: 'Email address',
            attributes: {
              'data-testid': 'applicant-email-control',
              role: 'textbox',
              'aria-label': 'Applicant email',
            },
          },
        },
        { key: 'legacy', type: 'custom-legacy' },
      ],
    });

    expect(result.contract.nodes[0]?.locators).toEqual([
      {
        target: 'control',
        strategy: 'testId',
        attribute: 'data-testid',
        value: 'applicant-email-control',
        evidence: 'declared',
        confidence: 'exact',
      },
      {
        target: 'control',
        strategy: 'role',
        value: 'textbox',
        accessibleName: 'Applicant email',
        evidence: 'declared',
        confidence: 'exact',
      },
      {
        target: 'control',
        strategy: 'label',
        value: 'Applicant email',
        evidence: 'declared',
        confidence: 'exact',
      },
      {
        target: 'control',
        strategy: 'placeholder',
        value: 'Email address',
        evidence: 'declared',
        confidence: 'exact',
      },
      {
        target: 'control',
        strategy: 'domId',
        value: 'applicant-email',
        evidence: 'declared',
        confidence: 'derived',
      },
    ]);
    expect(result.contract.nodes[1]?.locators).toEqual([]);
  });

  it('supports custom test attributes and multi-target derived locators', () => {
    const result = extractFormContract({
      formId: 'locator.composite',
      fields: [
        {
          key: 'period',
          type: 'date-range',
          props: {
            attributes: { 'data-qa': 'coverage-period' },
          },
        },
      ],
      locatorOptions: {
        testIdAttributes: ['data-qa'],
        deriveLocators: ({ modelPath }) => {
          const base = modelPath.join('-');
          return [
            {
              target: 'start',
              strategy: 'testId',
              attribute: 'data-qa',
              value: `${base}-start`,
            },
            {
              target: 'end',
              strategy: 'testId',
              attribute: 'data-qa',
              value: `${base}-end`,
            },
            {
              target: 'start',
              strategy: 'testId',
              attribute: 'data-qa',
              value: `${base}-start`,
            },
          ];
        },
      },
    });

    expect(result.contract.nodes[0]?.locators).toEqual([
      {
        target: 'control',
        strategy: 'testId',
        attribute: 'data-qa',
        value: 'coverage-period',
        evidence: 'declared',
        confidence: 'exact',
      },
      {
        target: 'start',
        strategy: 'testId',
        attribute: 'data-qa',
        value: 'period-start',
        evidence: 'declared',
        confidence: 'derived',
      },
      {
        target: 'end',
        strategy: 'testId',
        attribute: 'data-qa',
        value: 'period-end',
        evidence: 'declared',
        confidence: 'derived',
      },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('reports a stable diagnostic when locator derivation fails', () => {
    const result = extractFormContract({
      formId: 'locator.failure',
      fields: [{ key: 'value', type: 'input' }],
      locatorOptions: {
        deriveLocators: () => {
          throw new Error('Workplace details must not leak into diagnostics.');
        },
      },
    });

    expect(result.contract.nodes[0]?.locators).toEqual([]);
    expect(result.diagnostics).toContainEqual({
      code: 'LOCATOR_DERIVATION_FAILED',
      severity: 'warning',
      message: 'Locator derivation failed or returned malformed data.',
      evidence: 'declared',
      sourcePath: ['fields', 0, 'locatorOptions', 'deriveLocators'],
      nodeId: 'locator.failure::path:s_value',
    });
  });

  it('reports the same stable diagnostic for malformed derived locators', () => {
    const result = extractFormContract({
      formId: 'locator.malformed',
      fields: [{ key: 'value', type: 'input' }],
      locatorOptions: {
        deriveLocators: () =>
          [
            {
              strategy: 'testId',
              attribute: 'data-testid',
              value: 'must-be-discarded',
            },
            { strategy: 'testId', value: 'missing-attribute' } as never,
          ],
      },
    });

    expect(result.contract.nodes[0]?.locators).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'LOCATOR_DERIVATION_FAILED' }),
    );
  });

  it('extracts ordered nested fields, presentation, constraints, and options without mutation', () => {
    const fields = deepFreeze<FormlyFieldConfig[]>([
      {
        key: 'profile',
        props: { label: 'Profile' },
        fieldGroup: [
          {
            key: 'name',
            type: 'input',
            defaultValue: '',
            wrappers: ['section-card'],
            props: {
              label: 'Name',
              description: 'Synthetic display name.',
              placeholder: 'Enter a name',
              required: true,
              minLength: 2,
              maxLength: 40,
              pattern: '^[A-Za-z ]+$',
            },
          },
          {
            key: 'role',
            type: 'select',
            props: {
              label: 'Role',
              options: [
                { label: 'Reviewer', value: { code: 'reviewer' } },
                { label: 'Author', value: { code: 'author' }, disabled: true },
              ],
            },
          },
        ],
      },
    ]);

    const result = extractFormContract({
      formId: 'basic.profile',
      fields,
    });

    expect(result.contract.nodes.map(({ id }) => id)).toEqual([
      'basic.profile::path:s_profile',
    ]);
    expect(result.contract.nodes[0]?.children).toEqual([
      expect.objectContaining({
        id: 'basic.profile::path:s_profile.s_name',
        kind: 'control',
        modelPath: ['profile', 'name'],
        formlyType: 'input',
        semanticType: 'text',
        presentation: {
          label: 'Name',
          description: 'Synthetic display name.',
          placeholder: 'Enter a name',
        },
        defaultValue: '',
        wrappers: ['section-card'],
        constraints: [
          { kind: 'required' },
          { kind: 'minLength', value: 2 },
          { kind: 'maxLength', value: 40 },
          { kind: 'pattern', value: '^[A-Za-z ]+$' },
        ],
      }),
      expect.objectContaining({
        id: 'basic.profile::path:s_profile.s_role',
        modelPath: ['profile', 'role'],
        options: [
          { label: 'Reviewer', value: { code: 'reviewer' } },
          { label: 'Author', value: { code: 'author' }, disabled: true },
        ],
      }),
    ]);
    expect(result.contract.diagnostics).toEqual([]);
    expect(result.diagnostics).toBe(result.contract.diagnostics);
  });

  it('matches Formly v6 key-path semantics and gives keyless groups stable fallback IDs', () => {
    const createFields = (): FormlyFieldConfig[] => [
      { key: 0, type: 'input' },
      { key: 'account.owner.name', type: 'input' },
      { key: 'items[2].sku', type: 'input' },
      { key: ['literal.segment', 'value'], type: 'input' },
      {
        fieldGroup: [
          { key: 'insideKeylessGroup', type: 'checkbox' },
        ],
      },
    ];

    const first = extractFormContract({
      formId: 'edge.key-paths',
      fields: createFields(),
    });
    const second = extractFormContract({
      formId: 'edge.key-paths',
      fields: createFields(),
    });

    expect(first.contract.nodes.map(({ modelPath }) => modelPath)).toEqual([
      [0],
      ['account', 'owner', 'name'],
      ['items', 2, 'sku'],
      ['literal.segment', 'value'],
      [],
    ]);
    expect(first.contract.nodes.map(({ id }) => id)).toEqual([
      'edge.key-paths::path:n_0',
      'edge.key-paths::path:s_account.s_owner.s_name',
      'edge.key-paths::path:s_items.n_2.s_sku',
      'edge.key-paths::path:s_literal%2Esegment.s_value',
      'edge.key-paths::position:4',
    ]);
    expect(first.contract.nodes[4]?.children[0]?.modelPath).toEqual([
      'insideKeylessGroup',
    ]);
    expect(second.contract.contentHash).toBe(first.contract.contentHash);
  });

  it('diagnoses unsupported numeric keys and uses structural identity', () => {
    const result = extractFormContract({
      formId: 'edge.numeric-keys',
      fields: [
        { key: -1, type: 'input' },
        { key: 1.5, type: 'input' },
        { key: ['account', -2, 'name'], type: 'input' },
        { key: ['account', 2.5, 'name'], type: 'input' },
      ],
    });

    expect(result.contract.nodes.map(({ id, modelPath }) => ({
      id,
      modelPath,
    }))).toEqual([
      { id: 'edge.numeric-keys::position:0', modelPath: [] },
      { id: 'edge.numeric-keys::position:1', modelPath: [] },
      { id: 'edge.numeric-keys::position:2', modelPath: [] },
      { id: 'edge.numeric-keys::position:3', modelPath: [] },
    ]);
    expect(result.diagnostics).toHaveLength(4);
    for (const index of [0, 1, 2, 3]) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: 'UNKNOWN_FIELD_SHAPE',
          sourcePath: ['fields', index, 'key'],
        }),
      );
    }
  });

  it('uses structural identity for keyless layout groups under a keyed parent', () => {
    const result = extractFormContract({
      formId: 'layout.horizontal',
      fields: [
        {
          key: 'profile',
          fieldGroup: [
            {
              fieldGroupClassName: 'display-flex',
              fieldGroup: [{ key: 'givenName', type: 'input' }],
            },
            {
              fieldGroupClassName: 'display-flex',
              fieldGroup: [{ key: 'familyName', type: 'input' }],
            },
          ],
        },
      ],
    });

    expect(result.contract.nodes[0]?.children.map(({ id }) => id)).toEqual([
      'layout.horizontal::position:0.0',
      'layout.horizontal::position:0.1',
    ]);
    expect(
      result.diagnostics.some(({ message }) => message.includes('Duplicate')),
    ).toBe(false);
  });

  it('resolves duplicate-key IDs even when the first suffix is already a real path', () => {
    const result = extractFormContract({
      formId: 'edge.duplicate-ids',
      fields: [
        { key: 'value-duplicate-2', type: 'input' },
        { key: 'value', type: 'input' },
        { key: 'value', type: 'input' },
      ],
    });

    expect(result.contract.nodes.map(({ id }) => id)).toEqual([
      'edge.duplicate-ids::path:s_value-duplicate-2',
      'edge.duplicate-ids::path:s_value',
      'edge.duplicate-ids::path:s_value-duplicate-2-collision-1',
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'UNKNOWN_FIELD_SHAPE',
        nodeId:
          'edge.duplicate-ids::path:s_value-duplicate-2-collision-1',
      }),
    );
  });
});

describe('extractFormContract arrays, conditions, and unknowns', () => {
  it('classifies template-only fields as display nodes', () => {
    const result = extractFormContract({
      formId: 'display.review',
      fields: [{ template: '<p>Review your answers before submitting.</p>' }],
    });

    expect(result.contract.nodes[0]).toEqual(
      expect.objectContaining({
        kind: 'display',
        display: {
          format: 'html',
          content: '<p>Review your answers before submitting.</p>',
        },
      }),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('represents callback-driven rules and dynamic choices without executing them', () => {
    let callbackWasCalled = false;
    const dynamicValue = (): boolean => {
      callbackWasCalled = true;
      return true;
    };
    const result = extractFormContract({
      formId: 'dynamic.choice',
      fields: [
        {
          key: 'emptyChoice',
          type: 'select',
          props: { options: [] },
        },
        {
          key: 'dependentChoice',
          type: 'radio',
          hideExpression: dynamicValue,
          expressionProperties: {
            'props.required': dynamicValue,
            'props.readonly': dynamicValue,
            'props.options': dynamicValue,
          },
        },
      ],
    });

    expect(result.contract.nodes[0]?.optionSource).toEqual({
      kind: 'static',
      evidence: 'declared',
    });
    expect(result.contract.nodes[1]?.optionSource).toEqual({
      kind: 'dynamic',
      property: 'props.options',
      source: 'function',
      evidence: 'declared',
    });
    expect(result.contract.nodes[1]?.dynamicRules).toEqual([
      {
        id: 'dynamic.choice::path:s_dependentChoice::rule:hideExpression:hide',
        property: 'hide',
        source: 'function',
        evidence: 'declared',
      },
      {
        id: 'dynamic.choice::path:s_dependentChoice::rule:expressionProperties:props.options',
        property: 'props.options',
        source: 'function',
        evidence: 'declared',
      },
      {
        id: 'dynamic.choice::path:s_dependentChoice::rule:expressionProperties:props.readonly',
        property: 'props.readonly',
        source: 'function',
        evidence: 'declared',
      },
      {
        id: 'dynamic.choice::path:s_dependentChoice::rule:expressionProperties:props.required',
        property: 'props.required',
        source: 'function',
        evidence: 'declared',
      },
    ]);
    expect(
      result.diagnostics.some(({ sourcePath }) =>
        sourcePath.includes('expressionProperties'),
      ),
    ).toBe(false);
    expect(callbackWasCalled).toBe(false);
  });

  it('allowlists resolved option values instead of copying raw objects', () => {
    const result = compileFormContractScenario({
      formId: 'resolved.option-allowlist',
      builder: {
        build: (root) => {
          const field = root.fieldGroup?.[0];
          if (field?.props !== undefined) {
            field.props.options = [
              {
                label: 'Public choice',
                value: 'public',
                internalRecord: { secret: true },
              },
            ];
          }
        },
      },
      createFields: () => [
        {
          key: 'choice',
          type: 'select',
          props: { options: [] },
          expressionProperties: {
            'props.options': () => [],
          },
        },
      ],
    });

    expect(result.contract.nodes[0]?.options).toEqual([
      { label: 'Public choice', value: 'public' },
    ]);
    expect(result.contract.nodes[0]?.dynamicRules).toEqual([
      {
        id: 'resolved.option-allowlist::path:s_choice::rule:expressionProperties:props.options',
        property: 'props.options',
        source: 'function',
        evidence: 'resolved',
        resolvedValue: [{ label: 'Public choice', value: 'public' }],
      },
    ]);
  });

  it('does not copy unsupported resolved expression targets', () => {
    const result = compileFormContractScenario({
      formId: 'resolved.unsupported-target',
      builder: {
        build: (root) => {
          const field = root.fieldGroup?.[0];
          if (field?.props !== undefined) {
            (field.props as Record<string, unknown>).internalRecord = {
              secret: true,
            };
          }
        },
      },
      createFields: () => [
        {
          key: 'value',
          type: 'input',
          expressionProperties: {
            'props.internalRecord': () => ({ secret: true }),
          },
        },
      ],
    });

    expect(result.contract.nodes[0]?.dynamicRules).toEqual([
      {
        id: 'resolved.unsupported-target::path:s_value::rule:expressionProperties:props.internalRecord',
        property: 'props.internalRecord',
        source: 'function',
        evidence: 'declared',
      },
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_RULE',
        sourcePath: [
          'fields',
          0,
          'expressionProperties',
          'props.internalRecord',
        ],
      }),
    );
  });

  it('isolates nested scenario form state from builder mutation', () => {
    const formState = { workflow: { attempts: 0 } };

    compileFormContractScenario({
      formId: 'resolved.form-state-isolation',
      builder: {
        build: (root) => {
          const state = root.options?.formState as {
            workflow: { attempts: number };
          };
          state.workflow.attempts += 1;
        },
      },
      createFields: () => [],
      formState,
    });

    expect(formState).toEqual({ workflow: { attempts: 0 } });
  });

  it('rejects scenario form state that cannot be structured-cloned', () => {
    let factoryCalls = 0;
    let builderCalls = 0;

    expect(() =>
      compileFormContractScenario({
        formId: 'resolved.form-state-clone-failure',
        builder: {
          build: () => {
            builderCalls += 1;
          },
        },
        createFields: () => {
          factoryCalls += 1;
          return [];
        },
        formState: { service: () => undefined },
      }),
    ).toThrow('Scenario form state must be structured-cloneable.');
    expect(factoryCalls).toBe(0);
    expect(builderCalls).toBe(0);
  });

  it('rejects scenario models before application-controlled code runs', () => {
    let factoryCalls = 0;
    let builderCalls = 0;

    expect(() =>
      compileFormContractScenario({
        formId: 'resolved.model-clone-failure',
        builder: {
          build: () => {
            builderCalls += 1;
          },
        },
        createFields: () => {
          factoryCalls += 1;
          return [];
        },
        model: { service: () => undefined },
      }),
    ).toThrow('Scenario model must be structured-cloneable.');
    expect(factoryCalls).toBe(0);
    expect(builderCalls).toBe(0);
  });

  it('diagnoses RegExp pattern constraints that v0.3 cannot represent', () => {
    const result = extractFormContract({
      formId: 'constraints.regexp',
      fields: [
        {
          key: 'postalCode',
          type: 'input',
          props: { pattern: /^[A-Z]\d[A-Z] \d[A-Z]\d$/u },
        },
      ],
    });

    expect(result.contract.nodes[0]?.constraints).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_RULE',
        sourcePath: ['fields', 0, 'props', 'pattern'],
      }),
    );
  });

  it('retains an unrealized array template with wildcard model paths', () => {
    const fields: FormlyFieldConfig[] = [
      {
        key: 'members',
        type: 'repeat-section',
        fieldArray: {
          fieldGroup: [
            {
              key: 'name',
              type: 'input',
              props: { label: 'Member name', required: true },
            },
            {
              key: 'relationship',
              type: 'select',
              props: {
                label: 'Relationship',
                options: [
                  { label: 'Self', value: 'self' },
                  { label: 'Dependent', value: 'dependent' },
                ],
              },
            },
          ],
        },
      },
    ];

    const result = extractFormContract({ formId: 'array.example', fields });
    const arrayNode = result.contract.nodes[0];

    expect(arrayNode).toEqual(
      expect.objectContaining({
        kind: 'array',
        modelPath: ['members'],
        children: [],
      }),
    );
    expect(arrayNode?.arrayTemplate).toEqual(
      expect.objectContaining({
        kind: 'group',
        modelPath: ['members', '*'],
        children: [
          expect.objectContaining({ modelPath: ['members', '*', 'name'] }),
          expect.objectContaining({
            modelPath: ['members', '*', 'relationship'],
            options: [
              { label: 'Self', value: 'self' },
              { label: 'Dependent', value: 'dependent' },
            ],
          }),
        ],
      }),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('does not advertise declared DOM IDs from an array template as stable locators', () => {
    const result = extractFormContract({
      formId: 'array.locator',
      fields: [
        {
          key: 'cases',
          type: 'repeat-section',
          fieldArray: {
            fieldGroup: [
              {
                key: 'caseType',
                id: 'case-type-select',
                type: 'select',
                props: { label: 'Select Case Type' },
              },
            ],
          },
        },
      ],
    });

    expect(result.contract.nodes[0]?.arrayTemplate?.children[0]?.locators).toEqual(
      [],
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'UNRELIABLE_DOM_ID',
        sourcePath: ['fields', 0, 'fieldArray', 'fieldGroup', 0, 'id'],
      }),
    );
  });

  it('preserves string conditions and diagnoses every opaque behavior class without evaluating it', () => {
    let functionWasCalled = false;
    const opaqueFunction = (): boolean => {
      functionWasCalled = true;
      return true;
    };
    const fields: FormlyFieldConfig[] = [
      {
        key: 'email',
        type: 'input',
        expressions: {
          hide: "model.channel !== 'email'",
          'props.required': "model.channel === 'email'",
        },
        validators: {
          validation: ['postalCode'],
        },
      },
      {
        key: 'legacyDetails',
        type: 'textarea',
        hideExpression: '!model.legacyName',
        expressionProperties: {
          'templateOptions.required': '!!model.legacyName',
        },
      },
      {
        key: 'opaque',
        type: 'select',
        props: { options: { subscribe: opaqueFunction } as never },
        expressions: { 'props.disabled': opaqueFunction },
        validators: {
          even: { expression: opaqueFunction, message: 'Must be even.' },
        },
        asyncValidators: {
          unique: {
            expression: () => Promise.resolve(true),
            message: 'Must be unique.',
          },
        },
        parsers: [opaqueFunction],
        hooks: { onInit: opaqueFunction },
        modelOptions: { updateOn: 'blur' },
      },
      {
        key: 'generatedRows',
        type: 'repeat-section',
        fieldArray: () => ({ type: 'input' }),
      },
      {},
    ];

    const result = extractFormContract({ formId: 'opaque.example', fields });

    expect(result.contract.nodes[0]?.conditions).toEqual([
      {
        id: 'opaque.example::path:s_email::rule:expressions:hide',
        property: 'hide',
        expression: "model.channel !== 'email'",
        evidence: 'declared',
      },
      {
        id: 'opaque.example::path:s_email::rule:expressions:props.required',
        property: 'props.required',
        expression: "model.channel === 'email'",
        evidence: 'declared',
      },
    ]);
    expect(result.contract.nodes[0]?.constraints).toContainEqual({
      kind: 'named',
      name: 'postalCode',
    });
    expect(result.contract.nodes[1]?.conditions).toEqual([
      {
        id: 'opaque.example::path:s_legacyDetails::rule:hideExpression:hide',
        property: 'hide',
        expression: '!model.legacyName',
        evidence: 'declared',
      },
      {
        id: 'opaque.example::path:s_legacyDetails::rule:expressionProperties:templateOptions.required',
        property: 'templateOptions.required',
        expression: '!!model.legacyName',
        evidence: 'declared',
      },
    ]);
    expect(result.contract.nodes[2]?.constraints).toEqual([
      { kind: 'named', name: 'even' },
      { kind: 'named', name: 'unique' },
    ]);
    expect(new Set(result.diagnostics.map(({ code }) => code))).toEqual(
      new Set([
        'OPAQUE_FUNCTION',
        'ASYNC_VALUE',
        'UNKNOWN_FIELD_SHAPE',
        'UNSUPPORTED_RULE',
      ]),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'OPAQUE_FUNCTION' }),
    );
    expect(result.contract.nodes[2]?.dynamicRules).toContainEqual(
      expect.objectContaining({
        property: 'props.disabled',
        source: 'function',
        evidence: 'declared',
      }),
    );
    expect(functionWasCalled).toBe(false);
  });

  it('uses collision-free fixed-width encoding for non-ASCII rule properties', () => {
    const result = extractFormContract({
      formId: 'rules.unicode',
      fields: [
        {
          key: 'value',
          type: 'input',
          expressions: {
            '\u123A': 'model.first',
            '\u0123A': 'model.second',
          },
        },
      ],
    });

    const ids = result.contract.nodes[0]!.conditions.map(({ id }) => id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids)).toHaveLength(2);
    expect(ids).toContain(
      'rules.unicode::path:s_value::rule:expressions:%00123A',
    );
    expect(ids).toContain(
      'rules.unicode::path:s_value::rule:expressions:%000123A',
    );
  });
});
