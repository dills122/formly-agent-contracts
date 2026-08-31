import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  FORM_CONTRACT_SCHEMA_ID,
  FORM_CONTRACT_SCHEMA_VERSION,
  canonicalStringify,
  computeAgentContextValidatedPlanHash,
  createAgentContextDriverRegistryManifest,
  createAgentContextPinnedLiveOwners,
  createSyntheticRh05AgentContextFixtureSet,
  validateAgentContextTestIntent,
  type AgentContextArtifactReference,
  type AgentContextDriverCapability,
  type AgentContextDriverReference,
  type AgentContextDriverRegistration,
  type AgentContextExecutionAuthority,
  type AgentContextLiveOwnerState,
  type AgentContextQueryDataset,
  type AgentContextQuerySelection,
  type AgentContextTestIntent,
  type AgentContextValidatedExecutionPlan,
  type AgentContextValidatedExecutionStep,
} from '@formly-contract/schema';

import {
  bindAgentContextDriverImplementationRegistry,
  createAgentContextDriverImplementationRegistry,
  type AgentContextDriverImplementation,
  type AgentContextDriverImplementationBindingResult,
  type AgentContextDriverResolutionRequest,
} from './driver-implementation-registry.js';
import { bindAgentContextValidatedPlanDriverCalls } from './validated-plan-driver-call-binding.js';

function compareReference(
  left: AgentContextArtifactReference,
  right: AgentContextArtifactReference,
): number {
  return (
    left.schemaId.localeCompare(right.schemaId) ||
    left.schemaVersion.localeCompare(right.schemaVersion) ||
    left.contentHash.localeCompare(right.contentHash)
  );
}

function exactReference(
  artifacts: readonly AgentContextArtifactReference[],
  schemaId: string,
  schemaVersion: string,
  contentHash: string,
): AgentContextArtifactReference {
  const reference = artifacts.find(
    (candidate) =>
      candidate.schemaId === schemaId &&
      candidate.schemaVersion === schemaVersion &&
      candidate.contentHash === contentHash,
  );
  if (reference === undefined) {
    throw new Error(`Missing ${schemaId} ${contentHash}.`);
  }
  return reference;
}

function selectionFor(
  fixture: ReturnType<typeof createSyntheticRh05AgentContextFixtureSet>,
  polarity: 'positive' | 'negative',
  sourceUsageCatalog: AgentContextArtifactReference,
  journeyCatalog: AgentContextArtifactReference,
): AgentContextQuerySelection {
  const walkthrough = fixture.walkthroughs[polarity];
  const usage = fixture.sourceUsageCatalog.usages.find(
    ({ identity }) =>
      canonicalStringify(identity) === canonicalStringify(walkthrough.usage),
  );
  if (usage?.resolution.status !== 'exact') {
    throw new Error('Synthetic usage must resolve exactly.');
  }
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: {
      schemaVersion: fixture.artifactSet.schemaVersion,
      contentHash: fixture.artifactSet.contentHash,
    },
    workspaceIndex: fixture.workspaceIndex,
    owners: {
      sourceUsageCatalog,
      journeyCatalog,
      formContract: exactReference(
        fixture.artifactSet.artifacts,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        walkthrough.declaredContract.contentHash,
      ),
      scenarioArtifact: exactReference(
        fixture.artifactSet.artifacts,
        FORM_CONTRACT_SCHEMA_ID,
        FORM_CONTRACT_SCHEMA_VERSION,
        walkthrough.resolvedContract.contentHash,
      ),
      executionAuthority: exactReference(
        fixture.artifactSet.artifacts,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
        AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
        walkthrough.executionAuthority.contentHash,
      ),
    },
    usage: walkthrough.usage,
    journey: walkthrough.journey,
    form: usage.resolution.candidate.form,
    scenario: walkthrough.executionAuthority.scenario,
    executionAuthority: {
      usageId: walkthrough.executionAuthority.usage.id,
      usageVersion: walkthrough.executionAuthority.usage.version,
      basis: walkthrough.executionAuthority.basis,
    },
  };
}

function manifestFor(authority: AgentContextExecutionAuthority) {
  const registrations = new Map<
    string,
    {
      driver: AgentContextDriverReference;
      capabilities: Set<AgentContextDriverCapability>;
    }
  >();
  const add = (
    driver: AgentContextDriverReference,
    capability: AgentContextDriverCapability,
  ): void => {
    const key = `${driver.kind}\0${driver.id}\0${driver.version}`;
    const entry = registrations.get(key) ?? {
      driver,
      capabilities: new Set<AgentContextDriverCapability>(),
    };
    entry.capabilities.add(capability);
    registrations.set(key, entry);
  };
  add(authority.usage.entry.driver, 'open-usage');
  for (const interaction of authority.interactions) {
    add(interaction.driver, interaction.operation);
    if (
      authority.commits.some(
        ({ interactionId }) => interactionId === interaction.id,
      )
    ) {
      add(interaction.driver, 'commit-value');
    }
    if (
      authority.validationSurfaces.some(
        ({ nodeId }) => nodeId === interaction.nodeId,
      )
    ) {
      add(interaction.driver, 'activate-validation');
      add(interaction.driver, 'assert-validation');
    }
    if (
      authority.valueAssertions.some(
        ({ nodeId }) => nodeId === interaction.nodeId,
      )
    ) {
      add(interaction.driver, 'assert-value');
    }
  }
  for (const readiness of authority.readiness) {
    add(readiness.driver, 'wait-readiness');
  }
  for (const assertion of authority.stateAssertions) {
    add(assertion.driver, 'assert-state');
  }
  return createAgentContextDriverRegistryManifest({
    schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
    registrations: [...registrations.values()].map(
      ({ driver, capabilities }): AgentContextDriverRegistration => ({
        ...driver,
        capabilities: [...capabilities] as [
          AgentContextDriverCapability,
          ...AgentContextDriverCapability[],
        ],
      }),
    ),
  });
}

function boundary(polarity: 'positive' | 'negative') {
  const fixture = createSyntheticRh05AgentContextFixtureSet();
  const sourceUsageCatalog = exactReference(
    fixture.artifactSet.artifacts,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
    AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    fixture.sourceUsageCatalog.contentHash,
  );
  const journeyCatalog = exactReference(
    fixture.artifactSet.artifacts,
    AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
    AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    fixture.journeyCatalog.contentHash,
  );
  const dataset: AgentContextQueryDataset = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: fixture.artifactSet,
    sourceUsageCatalogs: [
      { reference: sourceUsageCatalog, artifact: fixture.sourceUsageCatalog },
    ],
    journeyCatalogs: [
      { reference: journeyCatalog, artifact: fixture.journeyCatalog },
    ],
    formContracts: Object.values(fixture.walkthroughs)
      .flatMap(({ declaredContract, resolvedContract }) => [
        declaredContract,
        resolvedContract,
      ])
      .map((artifact) => ({
        reference: exactReference(
          fixture.artifactSet.artifacts,
          FORM_CONTRACT_SCHEMA_ID,
          FORM_CONTRACT_SCHEMA_VERSION,
          artifact.contentHash,
        ),
        artifact,
      }))
      .sort((left, right) => compareReference(left.reference, right.reference)),
    executionAuthorities: Object.values(fixture.walkthroughs)
      .map(({ executionAuthority: artifact }) => ({
        reference: exactReference(
          fixture.artifactSet.artifacts,
          AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_ID,
          AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
          artifact.contentHash,
        ),
        artifact,
      }))
      .sort((left, right) => compareReference(left.reference, right.reference)),
  };
  const selection = selectionFor(
    fixture,
    polarity,
    sourceUsageCatalog,
    journeyCatalog,
  );
  const authority = fixture.walkthroughs[polarity].executionAuthority;
  const manifest = manifestFor(authority);
  const liveOwners: AgentContextLiveOwnerState = {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    owners: createAgentContextPinnedLiveOwners(selection),
  };
  return { fixture, dataset, selection, authority, manifest, liveOwners };
}

function intentFor(
  value: ReturnType<typeof boundary>,
  polarity: 'positive' | 'negative',
): AgentContextTestIntent {
  if (polarity === 'positive') {
    const [supplier, currency, total] =
      value.fixture.walkthroughs.positive.focusNodeIds;
    if (supplier === undefined || currency === undefined || total === undefined) {
      throw new Error('Positive synthetic fixture is incomplete.');
    }
    return {
      schemaVersion: '0.1.0',
      contextRef: {
        selection: value.selection,
        driverRegistryHash: value.manifest.contentHash,
      },
      case: {
        id: 'synthetic.purchase-order.positive',
        title: 'accepts a valid order total',
        polarity,
      },
      steps: [
        { op: 'openUsage' },
        {
          op: 'set',
          nodeId: supplier,
          value: { kind: 'domain-value', value: 'synthetic-supplier-a' },
        },
        {
          op: 'set',
          nodeId: currency,
          value: { kind: 'domain-value', value: 'CAD' },
        },
        {
          op: 'set',
          nodeId: total,
          value: {
            kind: 'literal',
            value: 125,
            expectedClassification: 'valid',
          },
        },
        {
          op: 'commitValue',
          nodeId: total,
          commitId: 'synthetic.rh05.purchase-order.total.commit-on-blur',
        },
        {
          op: 'activateValidation',
          nodeId: total,
          validationId: 'synthetic.rh05.purchase-order.total.min',
        },
        {
          op: 'expectValue',
          nodeId: total,
          assertionId:
            'synthetic.rh05.purchase-order.total.committed-value',
          value: {
            kind: 'literal',
            value: 125,
            expectedClassification: 'valid',
          },
        },
        {
          op: 'expectValidation',
          nodeId: total,
          validationId: 'synthetic.rh05.purchase-order.total.min',
          constraint: 'min',
          state: 'absent',
        },
      ],
    };
  }

  const [product, caseType, otherDetails] =
    value.fixture.walkthroughs.negative.expectedNodeIds;
  if (
    product === undefined ||
    caseType === undefined ||
    otherDetails === undefined
  ) {
    throw new Error('Negative synthetic fixture is incomplete.');
  }
  return {
    schemaVersion: '0.1.0',
    contextRef: {
      selection: value.selection,
      driverRegistryHash: value.manifest.contentHash,
    },
    case: {
      id: 'synthetic.claims.negative',
      title: 'requires details when case type is Other',
      polarity,
    },
    steps: [
      { op: 'openUsage' },
      {
        op: 'set',
        nodeId: product,
        value: { kind: 'domain-value', value: 'auto' },
      },
      {
        op: 'set',
        nodeId: caseType,
        value: { kind: 'domain-value', value: 'other' },
      },
      { op: 'expectState', nodeId: otherDetails, state: 'visible' },
      {
        op: 'set',
        nodeId: otherDetails,
        value: {
          kind: 'literal',
          value: '',
          expectedClassification: 'invalid',
        },
      },
      {
        op: 'activateValidation',
        nodeId: otherDetails,
        validationId: 'synthetic.rh05.claims.other-details.required',
      },
      {
        op: 'expectValidation',
        nodeId: otherDetails,
        validationId: 'synthetic.rh05.claims.other-details.required',
        constraint: 'required',
        state: 'present',
      },
    ],
  };
}

function validatedCase(polarity: 'positive' | 'negative') {
  const value = boundary(polarity);
  const intent = intentFor(value, polarity);
  const validated = validateAgentContextTestIntent({
    intent,
    dataset: value.dataset,
    liveOwners: value.liveOwners,
    driverRegistryManifest: value.manifest,
  });
  if (validated.status !== 'valid') {
    throw new Error(`Expected the ${polarity} fixture intent to validate.`);
  }
  return { ...value, intent, validated };
}

function implementationBindingFor(
  value: ReturnType<typeof validatedCase>,
  invocationCount: { value: number },
) {
  const implementations = new Map<string, AgentContextDriverImplementation>();
  const sources = (['application', 'generic'] as const).map((kind) => ({
    sourceId: `synthetic.${kind}`,
    kind,
    drivers: value.manifest.registrations
      .filter((registration) => registration.kind === kind)
      .map((registration) => {
        const implementation: AgentContextDriverImplementation = () => {
          invocationCount.value += 1;
          throw new Error('Call binding must not invoke driver implementations.');
        };
        implementations.set(
          `${kind}\0${registration.id}\0${registration.version}`,
          implementation,
        );
        return {
          id: registration.id,
          version: registration.version,
          capabilities: registration.capabilities,
          implementation,
        };
      }),
  }));
  const registry = createAgentContextDriverImplementationRegistry(sources);
  const binding = bindAgentContextDriverImplementationRegistry(
    registry,
    value.manifest,
  );
  if (binding.status !== 'compatible') {
    throw new Error('Expected the synthetic implementation inventory to bind.');
  }
  return { binding, implementations };
}

function revalidationInput(value: ReturnType<typeof validatedCase>) {
  return {
    intent: value.intent,
    contextRef: value.validated.contextRef,
    plan: value.validated.plan,
    planHash: value.validated.planHash,
    dataset: value.dataset,
    liveOwners: value.liveOwners,
    driverRegistryManifest: value.manifest,
  };
}

function dataCalls(
  result: ReturnType<typeof bindAgentContextValidatedPlanDriverCalls>,
) {
  if (result.status !== 'bound') {
    throw new Error(`Expected bound calls, received ${result.status}.`);
  }
  return result.calls.map(({ call }) => call);
}

function expectedDriverCallAuthority(
  step: AgentContextValidatedExecutionStep,
) {
  if (step.op === 'open-usage') {
    return {
      driver: step.driver,
      requiredCapabilities: ['open-usage'],
    };
  }
  if (step.op === 'expect-state') {
    return {
      driver: step.assertion.driver,
      requiredCapabilities: ['assert-state'],
    };
  }
  return {
    driver: step.binding.driver,
    requiredCapabilities: [...step.binding.operations].sort(),
  };
}

describe('validated-plan driver-call binding', () => {
  it.each(['positive', 'negative'] as const)(
    'lowers and binds the exact %s plan deterministically without invoking a driver',
    (polarity) => {
      const value = validatedCase(polarity);
      const invocationCount = { value: 0 };
      const { binding, implementations } = implementationBindingFor(
        value,
        invocationCount,
      );

      const first = bindAgentContextValidatedPlanDriverCalls(
        revalidationInput(value),
        binding,
      );
      const second = bindAgentContextValidatedPlanDriverCalls(
        revalidationInput(value),
        binding,
      );

      expect(first.status).toBe('bound');
      expect(second.status).toBe('bound');
      expect(dataCalls(first)).toEqual(dataCalls(second));
      expect(dataCalls(first).map(({ planStepId }) => planStepId)).toEqual(
        value.validated.plan.steps.map(({ planStepId }) => planStepId),
      );
      expect(dataCalls(first).map(({ approvedStep }) => approvedStep)).toEqual(
        value.validated.plan.steps,
      );
      expect(
        dataCalls(first).map(({ driver, requiredCapabilities }) => ({
          driver,
          requiredCapabilities,
        })),
      ).toEqual(
        value.validated.plan.steps.map(expectedDriverCallAuthority),
      );
      expect(
        dataCalls(first).every(
          (call) =>
            Object.keys(call).sort().join(',') ===
            'approvedStep,driver,planStepId,requiredCapabilities',
        ),
      ).toBe(true);
      if (first.status === 'bound') {
        for (const { call, implementation } of first.calls) {
          expect(implementation).toBe(
            implementations.get(
              `${call.driver.kind}\0${call.driver.id}\0${call.driver.version}`,
            ),
          );
          expect(Object.isFrozen(call)).toBe(true);
          expect(Object.isFrozen(call.requiredCapabilities)).toBe(true);
          expect(Object.isFrozen(call.approvedStep)).toBe(true);
        }
      }
      expect(invocationCount.value).toBe(0);
    },
  );

  it('binds all four currently reachable CTX-2-reserved capabilities and preserves physical authority', () => {
    const value = validatedCase('positive');
    const { binding } = implementationBindingFor(value, { value: 0 });
    const result = bindAgentContextValidatedPlanDriverCalls(
      revalidationInput(value),
      binding,
    );
    const calls = dataCalls(result);
    const capabilities = new Set(
      calls.flatMap(({ requiredCapabilities }) => requiredCapabilities),
    );

    expect(capabilities).toEqual(
      new Set([
        'open-usage',
        'wait-readiness',
        'select-option',
        'fill',
        'commit-value',
        'activate-validation',
        'assert-value',
        'assert-validation',
      ]),
    );
    const physicalCall = calls.find(
      ({ approvedStep }) =>
        approvedStep.op === 'perform-node-operation',
    );
    expect(physicalCall?.requiredCapabilities).toEqual([
      'activate-validation',
      'commit-value',
    ]);
    if (physicalCall?.approvedStep.op === 'perform-node-operation') {
      expect(physicalCall.approvedStep.mechanic).toBe('blur');
      expect(physicalCall.approvedStep.authorities).toEqual([
        {
          kind: 'value-commit',
          commitId: 'synthetic.rh05.purchase-order.total.commit-on-blur',
        },
        {
          kind: 'validation-activation',
          validationId: 'synthetic.rh05.purchase-order.total.min',
          activationId:
            'synthetic.rh05.purchase-order.total.min.on-blur',
        },
      ]);
    }
  });

  it('rejects a caller-rehashed semantic mutation before implementation-binding access', () => {
    const value = validatedCase('positive');
    const { binding } = implementationBindingFor(value, { value: 0 });
    let bindingReadCount = 0;
    const unreadableBinding = new Proxy(binding, {
      get() {
        bindingReadCount += 1;
        throw new Error('Invalid plans must not inspect implementation bindings.');
      },
    });
    const sourceSet = value.validated.plan.steps.find(
      ({ op }) => op === 'set-value',
    );
    if (sourceSet?.op !== 'set-value') {
      throw new Error('Expected a set-value plan step.');
    }
    const mutated: AgentContextValidatedExecutionPlan = {
      ...value.validated.plan,
      steps: value.validated.plan.steps.map((step) =>
        step.planStepId === sourceSet.planStepId
          ? {
              ...sourceSet,
              binding: { ...sourceSet.binding, nodeId: 'invented.node' },
            }
          : step,
      ),
    };

    const result = bindAgentContextValidatedPlanDriverCalls(
      {
        ...revalidationInput(value),
        plan: mutated,
        planHash: computeAgentContextValidatedPlanHash(mutated),
      },
      unreadableBinding,
    );

    expect(result.status).toBe('invalid-plan');
    if (result.status === 'invalid-plan') {
      expect(result.diagnostics.map(({ code }) => code)).toEqual([
        'PLAN_SEMANTIC_INVALID',
      ]);
    }
    expect(bindingReadCount).toBe(0);
  });

  it('refuses a mismatched implementation allowlist and returns no partial calls', () => {
    const positive = validatedCase('positive');
    const negative = validatedCase('negative');
    const { binding: negativeBinding } = implementationBindingFor(negative, {
      value: 0,
    });

    const result = bindAgentContextValidatedPlanDriverCalls(
      revalidationInput(positive),
      negativeBinding,
    );

    expect(result).toMatchObject({
      status: 'refused',
      reason: 'implementation-binding-context-mismatch',
      canonicalPlanHash: positive.validated.planHash,
      planDriverRegistryHash: positive.manifest.contentHash,
      boundAllowlistManifestContentHash:
        negativeBinding.allowlistManifestContentHash,
    });
    expect('calls' in result).toBe(false);
  });

  it('rejects cloned, altered, or proxied compatible bindings before untrusted code can run', () => {
    const value = validatedCase('positive');
    const { binding } = implementationBindingFor(value, { value: 0 });
    expect(binding.status).toBe('compatible');
    if (binding.status !== 'compatible') {
      throw new Error('Expected a compatible implementation binding.');
    }
    let injectedResolverCalls = 0;
    let proxyTrapCalls = 0;
    const forgedImplementation: AgentContextDriverImplementation = () =>
      'unreviewed';
    const clonedBinding = {
      ...binding,
    };
    const alteredBinding = {
      ...binding,
      resolver: (request: AgentContextDriverResolutionRequest) => {
        injectedResolverCalls += 1;
        return {
          status: 'resolved' as const,
          driver: request.driver,
          requiredCapabilities: request.requiredCapabilities,
          implementation: forgedImplementation,
        };
      },
    };
    const proxiedBinding = new Proxy(binding, {
      get() {
        proxyTrapCalls += 1;
        throw new Error('implementation-binding proxy trap must not run');
      },
    });

    // The public type must not allow an authentic binding to be cloned or have
    // its resolver replaced while retaining the nominal provenance boundary.
    // @ts-expect-error object spread must not preserve binding provenance
    const typedClone: AgentContextDriverImplementationBindingResult =
      clonedBinding;
    // @ts-expect-error resolver replacement must not preserve provenance
    const typedAlteration: AgentContextDriverImplementationBindingResult =
      alteredBinding;
    void typedClone;
    void typedAlteration;

    for (const candidate of [clonedBinding, alteredBinding]) {
      expect(() =>
        bindAgentContextValidatedPlanDriverCalls(
          revalidationInput(value),
          candidate as AgentContextDriverImplementationBindingResult,
        ),
      ).toThrowError(
        'implementationBinding: must be a binding returned by bindAgentContextDriverImplementationRegistry.',
      );
    }
    expect(() =>
      bindAgentContextValidatedPlanDriverCalls(
        revalidationInput(value),
        proxiedBinding,
      ),
    ).toThrowError(
      'implementationBinding: must be a binding returned by bindAgentContextDriverImplementationRegistry.',
    );
    expect(injectedResolverCalls).toBe(0);
    expect(proxyTrapCalls).toBe(0);
  });

  it('refuses an incompatible whole-inventory binding only after semantic revalidation', () => {
    const value = validatedCase('positive');
    const incompatible = bindAgentContextDriverImplementationRegistry(
      createAgentContextDriverImplementationRegistry([]),
      value.manifest,
    );
    expect(incompatible.status).toBe('incompatible');

    const result = bindAgentContextValidatedPlanDriverCalls(
      revalidationInput(value),
      incompatible,
    );

    expect(result.status).toBe('refused');
    if (
      result.status === 'refused' &&
      result.reason === 'implementation-binding-incompatible'
    ) {
      expect(result.issues).toEqual(incompatible.issues);
    }
    expect('calls' in result).toBe(false);
  });
});
