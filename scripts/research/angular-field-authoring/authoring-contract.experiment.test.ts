import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  computeFieldTypeProfileRegistryHash,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';
import { describe, expect, it } from 'vitest';

import {
  classifyProfileCoverage,
  validateAuthoringEvidence,
  validateBoundBrowserScenario,
  type BoundBrowserScenarioExpectation,
} from './authoring-contract.experiment.js';

function createRegistry(): FieldTypeProfileRegistry {
  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id: 'research.authoring-profiles',
    version: 1,
    profiles: [
      {
        identity: { id: 'research.autocomplete', version: 2 },
        semanticType: 'entity-autocomplete',
        valueShape: 'object',
        evidence: 'declared',
        parts: [
          {
            name: 'query',
            role: 'combobox',
            cardinality: 'one',
            evidence: 'declared',
          },
          {
            name: 'popup',
            role: 'listbox',
            cardinality: 'one',
            evidence: 'declared',
          },
          {
            name: 'option',
            role: 'option',
            cardinality: 'many',
            evidence: 'declared',
          },
        ],
        interaction: {
          kind: 'autocomplete',
          operation: 'type-and-pick',
          queryPart: 'query',
          popupPart: 'popup',
          optionPart: 'option',
        },
        valueDomain: {
          kind: 'projected',
          source: 'adapter',
          completeness: 'scenario',
          collectionPath: 'props.options',
          labelPath: 'label',
          valuePath: 'value',
          evidence: 'declared',
        },
        driver: {
          kind: 'generic',
          id: 'generic.autocomplete',
          version: 1,
          capabilities: ['type-and-pick'],
        },
        effectCapabilities: { targetProperties: ['options'], readiness: [] },
        unknowns: [],
      },
    ],
    registrations: [
      {
        formlyType: 'autocomplete',
        defaultProfile: { id: 'research.autocomplete', version: 2 },
        variants: [],
      },
    ],
    wrappers: [
      {
        identity: { id: 'research.expansion', version: 1 },
        wrapperName: 'expansion',
        evidence: 'declared',
        parts: [
          {
            name: 'expand',
            role: 'button',
            cardinality: 'one',
            evidence: 'declared',
          },
        ],
        preconditions: [
          {
            kind: 'activate',
            part: 'expand',
            operation: 'click',
            evidence: 'declared',
          },
        ],
        unknowns: [],
      },
    ],
  };
}

function createExpectation(
  registry: FieldTypeProfileRegistry,
): BoundBrowserScenarioExpectation {
  return {
    scenarioId: 'research.autocomplete.expanded',
    resolution: {
      registryContentHash: computeFieldTypeProfileRegistryHash(registry),
      request: {
        formlyType: 'autocomplete',
        wrappers: ['expansion'],
      },
      profile: { id: 'research.autocomplete', version: 2 },
    },
    parts: [
      {
        name: 'option',
        role: 'option',
        cardinality: 'many',
        evidence: 'declared',
        accessibleName: 'Amber',
        root: { popupPart: 'popup' },
      },
      {
        name: 'popup',
        role: 'listbox',
        cardinality: 'one',
        evidence: 'declared',
        accessibleName: 'Records',
        root: 'document-root',
      },
      {
        name: 'query',
        role: 'combobox',
        cardinality: 'one',
        evidence: 'declared',
        accessibleName: 'Find record',
        root: 'scenario-root',
      },
      {
        name: 'expand',
        role: 'button',
        cardinality: 'one',
        evidence: 'declared',
        accessibleName: 'Expand',
        root: 'scenario-root',
      },
    ],
    driver: {
      kind: 'generic',
      id: 'generic.autocomplete',
      version: 1,
      capabilities: ['type-and-pick'],
    },
    steps: [
      { kind: 'wrapper-precondition', part: 'expand', operation: 'click' },
      {
        kind: 'open-popup',
        bindingVersion: 1,
        triggerPart: 'query',
        popupPart: 'popup',
        association: 'aria-controls',
      },
      {
        kind: 'profile-interaction',
        operation: 'type-and-pick',
        part: 'option',
      },
    ],
    modelSink: {
      id: 'research.formly-model-change',
      version: 1,
      fieldKeyPath: ['selectedRecord'],
      readProtocol: 'formly-model-change',
    },
  };
}

describe('Angular authoring contract experiment', () => {
  it('binds a scenario to the exact registry hash, request, resolved surface, driver, operation, and sink', () => {
    const registry = createRegistry();
    expect(() =>
      validateBoundBrowserScenario(registry, createExpectation(registry)),
    ).not.toThrow();
  });

  it.each([
    ['registry hash', (value: BoundBrowserScenarioExpectation) => {
      (value.resolution as { registryContentHash: string }).registryContentHash =
        'sha256-wrong';
    }, 'SCENARIO_REGISTRY_MISMATCH'],
    ['wrapper sequence', (value: BoundBrowserScenarioExpectation) => {
      (
        value.resolution.request as unknown as { wrappers: string[] }
      ).wrappers = [];
    }, 'SCENARIO_PART_MISMATCH'],
    ['part role', (value: BoundBrowserScenarioExpectation) => {
      (value.parts[0] as { role: string }).role = 'textbox';
    }, 'SCENARIO_PART_MISMATCH'],
    ['driver version', (value: BoundBrowserScenarioExpectation) => {
      (value.driver as { version: number }).version = 2;
    }, 'SCENARIO_DRIVER_MISMATCH'],
    ['operation', (value: BoundBrowserScenarioExpectation) => {
      (
        value.steps.find(({ kind }) => kind === 'profile-interaction') as {
          operation: string;
        }
      ).operation = 'select-option';
    }, 'SCENARIO_OPERATION_MISMATCH'],
    ['model sink', (value: BoundBrowserScenarioExpectation) => {
      (value.modelSink as { id: string }).id = '';
    }, 'SCENARIO_MODEL_SINK_MISMATCH'],
    ['wrapper step order', (value: BoundBrowserScenarioExpectation) => {
      const steps = value.steps as unknown as unknown[];
      [steps[0], steps[1]] = [steps[1], steps[0]];
    }, 'SCENARIO_RESOLUTION_MISMATCH'],
    ['popup binding', (value: BoundBrowserScenarioExpectation) => {
      (
        value.steps.find(({ kind }) => kind === 'open-popup') as {
          triggerPart: string;
        }
      ).triggerPart = 'popup';
    }, 'POPUP_ASSOCIATION_MISMATCH'],
    ['interaction part', (value: BoundBrowserScenarioExpectation) => {
      (
        value.steps.find(({ kind }) => kind === 'profile-interaction') as {
          part: string;
        }
      ).part = 'query';
    }, 'SCENARIO_OPERATION_MISMATCH'],
    ['accessible name', (value: BoundBrowserScenarioExpectation) => {
      (value.parts[0] as { accessibleName: string }).accessibleName = '';
    }, 'SCENARIO_PART_MISMATCH'],
  ] as const)('rejects independent %s drift', (_label, mutate, code) => {
    const registry = createRegistry();
    const expectation = structuredClone(createExpectation(registry));
    mutate(expectation);
    expect(() => validateBoundBrowserScenario(registry, expectation)).toThrow(
      code,
    );
  });

  it('types profile interaction operations with the closed repository union', () => {
    const registry = createRegistry();
    const expectation = createExpectation(registry);
    expect(
      expectation.steps.find(({ kind }) => kind === 'profile-interaction'),
    ).toMatchObject({ operation: 'type-and-pick' });
  });

  it('exempts a built-in only when no exact reviewed registration exists', () => {
    const unregistered: FieldTypeProfileRegistry = {
      ...createRegistry(),
      registrations: [],
    };
    expect(classifyProfileCoverage(unregistered, 'input')).toBe(
      'built-in-exempt',
    );
    const explicitBuiltIn: FieldTypeProfileRegistry = {
      ...createRegistry(),
      registrations: [
        {
          formlyType: 'input',
          defaultProfile: { id: 'research.autocomplete', version: 2 },
          variants: [],
        },
      ],
    };
    expect(classifyProfileCoverage(explicitBuiltIn, 'input')).toBe('reviewed');
  });

  it('enforces the source-to-evidence matrix and scenario ownership', () => {
    expect(() =>
      validateAuthoringEvidence({
        source: 'angular-reflection',
        evidence: 'derived',
      }),
    ).not.toThrow();
    expect(() =>
      validateAuthoringEvidence({
        source: 'browser-observation',
        evidence: 'observed',
        scenarioId: 'research.overlay',
      }),
    ).not.toThrow();
    expect(() =>
      validateAuthoringEvidence({
        source: 'browser-observation',
        evidence: 'observed',
        scenarioId: '',
      }),
    ).toThrow('EVIDENCE_SCENARIO_REQUIRED');
    expect(() =>
      validateAuthoringEvidence({
        source: 'angular-reflection',
        evidence: 'derived',
        scenarioId: 'not-allowed',
      } as never),
    ).toThrow('EVIDENCE_SCENARIO_FORBIDDEN');
    expect(() =>
      validateAuthoringEvidence({
        source: 'angular-reflection',
        evidence: 'observed',
      } as never),
    ).toThrow('EVIDENCE_CLASS_MISMATCH');
  });
});
