import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_INTENT_DIAGNOSTIC_CODES,
  AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY,
  AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION,
  canonicalizeAgentContextTestIntent,
  parseAgentContextIntentDiagnostic,
  parseAgentContextTestIntent,
  type AgentContextIntentDiagnostic,
  type AgentContextTestIntent,
} from './agent-context-test-intent.js';
import { parseAgentContextValidatedExecutionPlan } from './agent-context-intent-validator.js';
import { AGENT_CONTEXT_QUERY_SCHEMA_VERSION } from './agent-context-query.js';

const HASH = `sha256:${'a'.repeat(64)}` as const;
const OTHER_HASH = `sha256:${'b'.repeat(64)}` as const;

function intent(): AgentContextTestIntent {
  const nodeId = 'example.form::path:s_choice';
  return {
    schemaVersion: AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION,
    contextRef: {
      selection: {
        schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
        artifactSet: { schemaVersion: '0.1.0', contentHash: HASH },
        workspaceIndex: {
          schemaVersion: '0.1.0',
          contentHash: HASH,
        },
        owners: {
          sourceUsageCatalog: {
            schemaId: 'agent-context.source-usage',
            schemaVersion: '0.1.0',
            contentHash: HASH,
          },
          journeyCatalog: {
            schemaId: 'agent-context.journey',
            schemaVersion: '0.1.0',
            contentHash: HASH,
          },
          formContract: {
            schemaId: 'formly-contract.form-contract',
            schemaVersion: '0.4.0',
            contentHash: HASH,
          },
          scenarioArtifact: {
            schemaId: 'formly-contract.form-contract',
            schemaVersion: '0.4.0',
            contentHash: OTHER_HASH,
          },
          executionAuthority: {
            schemaId: 'agent-context.execution-authority',
            schemaVersion: '0.1.0',
            contentHash: HASH,
          },
        },
        usage: { kind: 'declared', usageId: 'example.usage', version: 1 },
        journey: { id: 'example.journey', version: 1 },
        form: {
          projectId: 'example.project',
          formId: 'example.form',
          contractHash: HASH,
        },
        scenario: {
          id: 'example.scenario',
          version: 1,
          artifactHash: OTHER_HASH,
          basis: { formId: 'example.form', contractHash: HASH },
        },
        executionAuthority: {
          usageId: 'example.usage',
          usageVersion: 1,
          basis: { formId: 'example.form', contractHash: HASH },
        },
      },
      driverRegistryHash: HASH,
    },
    case: {
      id: 'example.positive',
      title: 'accepts a valid choice',
      polarity: 'positive',
    },
    steps: [
      { op: 'openUsage' },
      {
        op: 'set',
        nodeId,
        value: { kind: 'domain-value', value: 'one' },
      },
      {
        op: 'expectState',
        nodeId,
        assertionId: 'example.visible',
        state: 'visible',
      },
      {
        op: 'expectValue',
        nodeId,
        assertionId: 'example.value',
        value: {
          kind: 'literal',
          value: 'one',
          expectedClassification: 'valid',
        },
      },
      { op: 'commitValue', nodeId, commitId: 'example.commit' },
      {
        op: 'activateValidation',
        nodeId,
        validationId: 'example.required',
      },
      {
        op: 'expectValidation',
        nodeId,
        validationId: 'example.required',
        constraint: 'required',
        state: 'absent',
      },
      {
        op: 'addItem',
        nodeId: 'example.form::path:s_items',
        captureId: 'example.capture',
        captureAs: 'created',
      },
      {
        op: 'expandItem',
        nodeId: 'example.form::path:s_items',
        itemContext: {
          kind: 'created-item',
          repeaterNodeId: 'example.form::path:s_items',
          capture: 'created',
        },
      },
      {
        op: 'invokeUsageAction',
        actionId: 'example.next',
        transitionId: 'example.to-step-two',
      },
      { op: 'expectOutcome', outcomeId: 'example.step-two' },
    ],
  };
}

function staleDiagnostic(): AgentContextIntentDiagnostic {
  return {
    schemaVersion: '0.1.0',
    code: 'STALE_CONTEXT',
    phase: 'context',
    severity: 'error',
    blocking: true,
    at: { kind: 'context', usageId: 'example.usage' },
    remediation: [{ kind: 'regenerate-artifacts' }],
    evidenceRefs: [],
    sourceDiagnostics: [],
  };
}

describe('agent-context typed test intent', () => {
  it('strictly round-trips the complete closed intent operation union', () => {
    const parsed = parseAgentContextTestIntent(intent());

    expect(parsed).toEqual(intent());
    expect(canonicalizeAgentContextTestIntent(parsed)).toBe(
      canonicalizeAgentContextTestIntent(intent()),
    );
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.steps)).toBe(true);
  });

  it('rejects unknown versions, keys, operations, and raw selector authority', () => {
    expect(() =>
      parseAgentContextTestIntent({ ...intent(), schemaVersion: '9.9.9' }),
    ).toThrow(/schemaVersion/u);
    expect(() =>
      parseAgentContextTestIntent({ ...intent(), surprise: true }),
    ).toThrow(/surprise/u);
    expect(() =>
      parseAgentContextTestIntent({
        ...intent(),
        steps: [{ op: 'click', selector: '#invented' }],
      }),
    ).toThrow(/op/u);
    expect(() =>
      parseAgentContextTestIntent({
        ...intent(),
        steps: [
          {
            op: 'set',
            nodeId: 'example.form::path:s_choice',
            selector: '#invented',
            value: { kind: 'domain-value', value: 'one' },
          },
        ],
      }),
    ).toThrow(/selector/u);
  });

  it('rejects hostile object graphs without invoking caller accessors', () => {
    expect(() => parseAgentContextTestIntent(new Proxy(intent(), {}))).toThrow(
      /proxy/u,
    );

    let getterCalled = false;
    const accessor: Record<string, unknown> = { ...intent() };
    Object.defineProperty(accessor, 'selector', {
      enumerable: true,
      get() {
        getterCalled = true;
        return '#caller-code';
      },
    });
    expect(() => parseAgentContextTestIntent(accessor)).toThrow(
      /data property/u,
    );
    expect(getterCalled).toBe(false);

    const hidden: Record<string, unknown> = { ...intent() };
    Object.defineProperty(hidden, 'selector', {
      value: '#hidden',
      enumerable: false,
    });
    expect(() => parseAgentContextTestIntent(hidden)).toThrow(/enumerable/u);

    const cyclic: Record<string, unknown> = { ...intent() };
    cyclic.cycle = cyclic;
    expect(() => parseAgentContextTestIntent(cyclic)).toThrow(/cycle/u);

    let inheritedGetterCalled = false;
    const priorSchemaVersion = Object.getOwnPropertyDescriptor(
      Object.prototype,
      'schemaVersion',
    );
    Object.defineProperty(Object.prototype, 'schemaVersion', {
      configurable: true,
      get() {
        inheritedGetterCalled = true;
        return AGENT_CONTEXT_TEST_INTENT_SCHEMA_VERSION;
      },
    });
    try {
      const source = intent();
      const missingVersion = {
        contextRef: source.contextRef,
        case: source.case,
        steps: source.steps,
      };
      expect(() => parseAgentContextTestIntent(missingVersion)).toThrow(
        /schemaVersion/u,
      );
      expect(inheritedGetterCalled).toBe(false);

      expect(() =>
        parseAgentContextValidatedExecutionPlan({
          semanticPolicyVersion: '0.1.0',
          intentHash: HASH,
          contextRef: intent().contextRef,
          caseId: 'example.positive',
          steps: [],
        }),
      ).toThrow(/schemaVersion/u);
      expect(inheritedGetterCalled).toBe(false);
    } finally {
      if (priorSchemaVersion === undefined) {
        delete (Object.prototype as Record<string, unknown>).schemaVersion;
      } else {
        Object.defineProperty(
          Object.prototype,
          'schemaVersion',
          priorSchemaVersion,
        );
      }
    }

    let deep: unknown = 'leaf';
    for (let index = 0; index < 130; index += 1) deep = { next: deep };
    expect(() =>
      parseAgentContextTestIntent({ ...intent(), surprise: deep }),
    ).toThrow(/deeply nested/u);

    expect(() =>
      parseAgentContextTestIntent({
        ...intent(),
        surprise: Array.from({ length: 100_001 }, () => null),
      }),
    ).toThrow(/too large/u);
  });

  it('rejects malformed item contexts and duplicate plan-local capture aliases', () => {
    expect(() =>
      parseAgentContextTestIntent({
        ...intent(),
        steps: [
          {
            op: 'expandItem',
            nodeId: 'example.form::path:s_items',
          },
        ],
      }),
    ).toThrow(/itemContext/u);

    const add = intent().steps.find(({ op }) => op === 'addItem');
    expect(add).toBeDefined();
    expect(() =>
      parseAgentContextTestIntent({ ...intent(), steps: [add, add] }),
    ).toThrow(/captureAs/u);
    expect(() =>
      parseAgentContextTestIntent({
        ...intent(),
        steps: [
          { op: 'openUsage' },
          {
            op: 'expandItem',
            nodeId: 'example.form::path:s_items',
            itemContext: {
              kind: 'created-item',
              repeaterNodeId: 'example.form::path:s_items',
              capture: 'not-created-yet',
            },
          },
        ],
      }),
    ).toThrow(/capture/u);
  });

  it('requires one openUsage operation at the start of every intent', () => {
    expect(() =>
      parseAgentContextTestIntent({ ...intent(), steps: intent().steps.slice(1) }),
    ).toThrow(/openUsage/u);
    expect(() =>
      parseAgentContextTestIntent({
        ...intent(),
        steps: [{ op: 'openUsage' }, { op: 'openUsage' }],
      }),
    ).toThrow(/openUsage/u);
  });
});

describe('agent-context intent diagnostics', () => {
  it('materializes one exhaustive runtime policy entry for every stable code', () => {
    expect(Object.keys(AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY).sort()).toEqual(
      [...AGENT_CONTEXT_INTENT_DIAGNOSTIC_CODES].sort(),
    );
    expect(new Set(AGENT_CONTEXT_INTENT_DIAGNOSTIC_CODES).size).toBe(
      AGENT_CONTEXT_INTENT_DIAGNOSTIC_CODES.length,
    );
    for (const candidate of Object.values(
      AGENT_CONTEXT_INTENT_DIAGNOSTIC_POLICY,
    )) {
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(Object.isFrozen(candidate.locationRequired)).toBe(true);
      expect(Object.isFrozen(candidate.locationOptional)).toBe(true);
    }
  });

  it('round-trips a fixed diagnostic and rejects policy overrides or messages', () => {
    expect(parseAgentContextIntentDiagnostic(staleDiagnostic())).toEqual(
      staleDiagnostic(),
    );
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        severity: 'warning',
      }),
    ).toThrow(/severity/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        message: 'trust me',
      }),
    ).toThrow(/message/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        remediation: [{ kind: 'choose-node', nodeIds: ['example.node'] }],
      }),
    ).toThrow(/remediation/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        at: { ...staleDiagnostic().at, nodeId: 'not-allowed-here' },
      }),
    ).toThrow(/nodeId/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        at: { kind: 'context', usageId: 42 },
      }),
    ).toThrow(/usageId/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        remediation: [{ kind: 'regenerate-artifacts', arbitrary: true }],
      }),
    ).toThrow(/arbitrary/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        sourceDiagnostics: [{ kind: 'unparsed-source-evidence' }],
      }),
    ).toThrow(/sourceDiagnostics/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        schemaVersion: '0.1.0',
        code: 'NODE_NOT_FOUND',
        phase: 'validation',
        severity: 'error',
        blocking: true,
        at: { kind: 'intent-step', stepIndex: 1, usageId: 'example.usage' },
        remediation: [{ kind: 'choose-node', nodeIds: [] }],
        evidenceRefs: [],
        sourceDiagnostics: [],
      }),
    ).toThrow(/nodeId/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        schemaVersion: '0.1.0',
        code: 'NODE_NOT_FOUND',
        phase: 'validation',
        severity: 'error',
        blocking: true,
        at: {
          kind: 'intent-step',
          stepIndex: 1,
          usageId: 'example.usage',
          nodeId: 'example.node',
          actionId: 'not-allowed-for-this-code',
        },
        remediation: [{ kind: 'choose-node', nodeIds: [] }],
        evidenceRefs: [],
        sourceDiagnostics: [],
      }),
    ).toThrow(/actionId/u);
  });

  it('rejects hidden diagnostic fields and values outside closed location unions', () => {
    const hidden: Record<string, unknown> = { ...staleDiagnostic() };
    Object.defineProperty(hidden, 'message', {
      value: 'hidden caller text',
      enumerable: false,
    });
    expect(() => parseAgentContextIntentDiagnostic(hidden)).toThrow(
      /enumerable/u,
    );
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        at: {
          kind: 'context',
          usageId: 'example.usage',
          view: 'invented-view',
        },
      }),
    ).toThrow(/view/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        ...staleDiagnostic(),
        at: {
          kind: 'context',
          usageId: 'example.usage',
          recordKind: 'invented-record',
        },
      }),
    ).toThrow(/recordKind/u);
    expect(() =>
      parseAgentContextIntentDiagnostic({
        schemaVersion: '0.1.0',
        code: 'CROSS_STEP_TRANSITION_AMBIGUOUS',
        phase: 'context',
        severity: 'error',
        blocking: true,
        at: {
          kind: 'context',
          usageId: 'example.usage',
          requestedStepId: 'step.target',
          sourceStepId: 'step.source',
          sourceNodeId: 'node.source',
          targetNodeId: 'node.target',
        },
        remediation: [
          {
            kind: 'choose-declared-transition',
            transitionIds: ['only-one'],
          },
        ],
        evidenceRefs: [],
        sourceDiagnostics: [],
      }),
    ).toThrow(/at least two/u);
  });
});
