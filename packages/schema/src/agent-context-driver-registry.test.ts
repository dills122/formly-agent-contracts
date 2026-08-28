import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
  AGENT_CONTEXT_DRIVER_CAPABILITIES,
  AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_ID,
  AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
  AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
  canonicalStringify,
  canonicalizeAgentContextDriverRegistryManifest,
  computeAgentContextDriverRegistryManifestHash,
  createAgentContextArtifactSet,
  createAgentContextDriverRegistryManifest,
  createAgentContextExecutionAuthority,
  parseAgentContextArtifactSet,
  parseAgentContextDriverRegistryManifest,
  parseAgentContextExecutionAuthority,
  validateAgentContextExecutionAuthorityDriverCompatibility,
  type AgentContextDriverCapability,
  type AgentContextDriverRegistration,
  type AgentContextDriverRegistryManifest,
  type AgentContextDriverRegistryManifestDraft,
  type AgentContextExecutionAuthority,
  type AgentContextExecutionAuthorityDriverCompatibilityIssue,
  type AgentContextExecutionAuthorityDriverCompatibilityResult,
  type AgentContextExecutionAuthorityDraft,
} from './index.js';

const HASH_A = `sha256:${'a'.repeat(64)}` as const;
const HASH_B = `sha256:${'b'.repeat(64)}` as const;

const ALL_CAPABILITIES = [
  'activate-validation',
  'activate-wrapper',
  'add-item',
  'assert-outcome',
  'assert-state',
  'assert-validation',
  'assert-value',
  'check',
  'commit-value',
  'expand-item',
  'fill',
  'invoke-usage-action',
  'open-usage',
  'select-from-overlay',
  'select-option',
  'select-row',
  'type-and-pick',
  'wait-readiness',
] as const satisfies readonly AgentContextDriverCapability[];

const GENERIC_AUTHORITY_CAPABILITIES = [
  'add-item',
  'assert-state',
  'check',
  'expand-item',
  'fill',
  'select-from-overlay',
  'select-option',
  'select-row',
  'type-and-pick',
  'wait-readiness',
] as const satisfies readonly AgentContextDriverCapability[];

const APPLICATION_AUTHORITY_CAPABILITIES = [
  'assert-outcome',
  'invoke-usage-action',
  'open-usage',
] as const satisfies readonly AgentContextDriverCapability[];

const AUTHORITY_BOUND_CAPABILITIES = [
  ...GENERIC_AUTHORITY_CAPABILITIES,
  ...APPLICATION_AUTHORITY_CAPABILITIES,
].sort() as AgentContextDriverCapability[];

const RESERVED_FOR_CTX_2 = [
  'activate-validation',
  'activate-wrapper',
  'assert-validation',
  'assert-value',
  'commit-value',
] as const satisfies readonly AgentContextDriverCapability[];

const GENERIC_DRIVER = {
  kind: 'generic',
  id: 'generic.all-authority',
  version: 1,
} as const;

const APPLICATION_DRIVER = {
  kind: 'application',
  id: 'orders.usage-driver',
  version: 2,
} as const;

interface MutableManifestDraft {
  schemaVersion: typeof AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION;
  registrations: {
    kind: 'generic' | 'application';
    id: string;
    version: number;
    capabilities: AgentContextDriverCapability[];
  }[];
}

function authorityDraft(): AgentContextExecutionAuthorityDraft {
  const basis = {
    formId: 'orders.entry',
    contractHash: HASH_A,
  } as const;

  const interaction = (
    id: string,
    nodeId: string,
    operation:
      | 'fill'
      | 'check'
      | 'select-option'
      | 'select-from-overlay'
      | 'type-and-pick'
      | 'select-row'
      | 'expand-item',
    readinessIds: readonly string[] = [],
  ) => ({
    id,
    nodeId,
    stepId: 'details',
    profile: { id: `profile.${operation}`, version: 1 },
    driver: GENERIC_DRIVER,
    operation,
    targets: [
      {
        purpose: 'control' as const,
        partRef: 'control',
        locatorTargetRef: 'control',
      },
    ] as const,
    readinessIds,
  });

  return {
    schemaVersion: AGENT_CONTEXT_EXECUTION_AUTHORITY_SCHEMA_VERSION,
    basis,
    scenario: {
      id: 'orders.entry.valid',
      version: 1,
      artifactHash: HASH_B,
      basis,
    },
    physicalOperations: [],
    readiness: [
      {
        id: 'readiness.fill',
        nodeId: 'node.fill',
        owner: { kind: 'interaction', interactionId: 'interaction.fill' },
        operation: 'wait-readiness',
        driver: GENERIC_DRIVER,
        partRef: 'control',
        locatorTargetRef: 'control',
      },
    ],
    interactions: [
      interaction(
        'interaction.fill',
        'node.fill',
        'fill',
        ['readiness.fill'],
      ),
      interaction('interaction.check', 'node.check', 'check'),
      interaction(
        'interaction.select-option',
        'node.select-option',
        'select-option',
      ),
      interaction(
        'interaction.select-overlay',
        'node.select-overlay',
        'select-from-overlay',
      ),
      interaction(
        'interaction.type-and-pick',
        'node.type-and-pick',
        'type-and-pick',
      ),
      interaction('interaction.select-row', 'node.select-row', 'select-row'),
      interaction('interaction.expand', 'node.repeater', 'expand-item'),
    ],
    commits: [],
    validationSurfaces: [],
    valueAssertions: [],
    stateAssertions: [
      {
        id: 'state.fill.visible',
        version: 1,
        nodeId: 'node.fill',
        operation: 'assert-state',
        states: ['visible'],
        driver: GENERIC_DRIVER,
        partRef: 'control',
        locatorTargetRef: 'control',
      },
    ],
    usage: {
      id: 'orders.entry.usage',
      version: 1,
      basis,
      entry: {
        id: 'orders.entry.open',
        operation: 'open-usage',
        landingStepId: 'details',
        driver: APPLICATION_DRIVER,
      },
      steps: [
        {
          id: 'details',
          ordinal: 0,
          nodeIds: [
            'node.fill',
            'node.check',
            'node.select-option',
            'node.select-overlay',
            'node.type-and-pick',
            'node.select-row',
            'node.repeater',
          ],
          actionIds: ['orders.submit'],
        },
      ],
      actions: [
        {
          id: 'orders.submit',
          operation: 'invoke-usage-action',
          kind: 'submit',
          driver: APPLICATION_DRIVER,
          outcomeIds: ['orders.saved'],
        },
      ],
      outcomes: [
        {
          id: 'orders.saved',
          operation: 'assert-outcome',
          kind: 'message',
          assertionDriver: APPLICATION_DRIVER,
          assertionTargetRef: 'saved-message',
        },
      ],
      transitions: [],
    },
    repeaterCaptures: [
      {
        id: 'capture.repeater.created-item',
        version: 1,
        repeaterNodeId: 'node.repeater',
        stepId: 'details',
        profile: { id: 'profile.repeater', version: 1 },
        operation: 'add-item',
        guarantee: 'exactly-one-created-item',
        captureMode: 'driver-returned-item-scope',
        driver: GENERIC_DRIVER,
        addTarget: { partRef: 'add', locatorTargetRef: 'add' },
        itemTarget: { partRef: 'item', locatorTargetRef: 'item' },
        readinessIds: [],
      },
    ],
  };
}

function createdAuthority(): AgentContextExecutionAuthority {
  return createAgentContextExecutionAuthority(authorityDraft());
}

function registration(
  overrides: Partial<AgentContextDriverRegistration> = {},
): AgentContextDriverRegistration {
  return {
    kind: 'generic',
    id: 'generic.fill',
    version: 1,
    capabilities: ['fill'],
    ...overrides,
  };
}

function manifestDraft(
  overrides: Partial<AgentContextDriverRegistryManifestDraft> = {},
): AgentContextDriverRegistryManifestDraft {
  return {
    schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
    registrations: [
      registration({
        kind: APPLICATION_DRIVER.kind,
        id: APPLICATION_DRIVER.id,
        version: APPLICATION_DRIVER.version,
        capabilities: APPLICATION_AUTHORITY_CAPABILITIES,
      }),
      registration({
        kind: GENERIC_DRIVER.kind,
        id: GENERIC_DRIVER.id,
        version: GENERIC_DRIVER.version,
        capabilities: GENERIC_AUTHORITY_CAPABILITIES,
      }),
    ],
    ...overrides,
  };
}

function createdManifest(
  overrides: Partial<AgentContextDriverRegistryManifestDraft> = {},
): AgentContextDriverRegistryManifest {
  return createAgentContextDriverRegistryManifest(manifestDraft(overrides));
}

function replaceOwnProperty(input: object, key: string, value: unknown): void {
  Object.defineProperty(input, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function deeplyNestedData(depth: number): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let cursor = root;
  for (let level = 0; level < depth; level += 1) {
    const child: Record<string, unknown> = {};
    cursor.child = child;
    cursor = child;
  }
  return root;
}

function captureThrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

function recomputeAuthorityHash(
  authority: AgentContextExecutionAuthority,
): AgentContextExecutionAuthority {
  const draft = Object.fromEntries(
    Object.entries(authority).filter(([key]) => key !== 'contentHash'),
  );
  return {
    ...authority,
    contentHash: `sha256:${createHash('sha256')
      .update(canonicalStringify(draft))
      .digest('hex')}`,
  };
}

function incompatibilityIssues(
  result: AgentContextExecutionAuthorityDriverCompatibilityResult,
): readonly AgentContextExecutionAuthorityDriverCompatibilityIssue[] {
  expect(result.status).toBe('incompatible');
  if (result.status !== 'incompatible') {
    throw new Error('Expected an incompatible driver result.');
  }
  return result.issues;
}

const PUBLIC_MANIFEST_ENTRY_POINTS = [
  {
    name: 'create',
    input: () => manifestDraft() as unknown,
    invoke: (input: unknown) =>
      createAgentContextDriverRegistryManifest(
        input as AgentContextDriverRegistryManifestDraft,
      ),
  },
  {
    name: 'compute',
    input: () => manifestDraft() as unknown,
    invoke: (input: unknown) =>
      computeAgentContextDriverRegistryManifestHash(input),
  },
  {
    name: 'parse',
    input: () => createdManifest() as unknown,
    invoke: (input: unknown) => parseAgentContextDriverRegistryManifest(input),
  },
  {
    name: 'canonicalize',
    input: () => createdManifest() as unknown,
    invoke: (input: unknown) =>
      canonicalizeAgentContextDriverRegistryManifest(input),
  },
  {
    name: 'compatibility',
    input: () => createdManifest() as unknown,
    invoke: (input: unknown) =>
      validateAgentContextExecutionAuthorityDriverCompatibility(
        createdAuthority(),
        input,
      ),
  },
] as const;

describe('agent context driver-registry manifest identity', () => {
  it('exports the closed RH-05 capability vocabulary in canonical order', () => {
    expect(AGENT_CONTEXT_DRIVER_CAPABILITIES).toEqual(ALL_CAPABILITIES);
    expect(new Set(AGENT_CONTEXT_DRIVER_CAPABILITIES)).toHaveLength(18);
  });

  it('strictly creates, hashes, parses, and canonicalizes the sibling artifact', () => {
    const draft = manifestDraft({
      registrations: [...manifestDraft().registrations].reverse().map(
        (entry) => ({
          ...entry,
          capabilities: [...entry.capabilities].reverse() as [
            AgentContextDriverCapability,
            ...AgentContextDriverCapability[],
          ],
        }),
      ),
    });

    const created = createAgentContextDriverRegistryManifest(draft);
    const canonical = canonicalizeAgentContextDriverRegistryManifest(created);
    const reparsed = parseAgentContextDriverRegistryManifest(
      JSON.parse(canonical),
    );

    expect(created.contentHash).toBe(
      computeAgentContextDriverRegistryManifestHash(draft),
    );
    expect(created.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(created.registrations.map(({ kind }) => kind)).toEqual([
      'application',
      'generic',
    ]);
    expect(created.registrations[0]?.capabilities).toEqual(
      APPLICATION_AUTHORITY_CAPABILITIES,
    );
    expect(reparsed).toEqual(created);
    expect(JSON.parse(canonical)).toEqual(created);
  });

  it('matches the fixed canonical hash vector independently of mutation checks', () => {
    const expectedCanonical =
      '{"registrations":[{"capabilities":["fill","open-usage"],"id":"app.alpha","kind":"application","version":2},{"capabilities":["fill"],"id":"generic.fill","kind":"generic","version":1}],"schemaVersion":"0.1.0"}';
    const expectedHash =
      'sha256:00be52e47026a221770383005563de3c48efef3c6bb9e3d97aa83a53ce8a85a7';
    const draft: AgentContextDriverRegistryManifestDraft = {
      schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
      registrations: [
        registration({
          kind: 'application',
          id: 'app.alpha',
          version: 2,
          capabilities: ['fill', 'open-usage'],
        }),
        registration({
          kind: 'generic',
          id: 'generic.fill',
          version: 1,
          capabilities: ['fill'],
        }),
      ],
    };

    expect(canonicalStringify(draft)).toBe(expectedCanonical);
    expect(
      `sha256:${createHash('sha256').update(expectedCanonical).digest('hex')}`,
    ).toBe(expectedHash);
    expect(computeAgentContextDriverRegistryManifestHash(draft)).toBe(
      expectedHash,
    );
    expect(createAgentContextDriverRegistryManifest(draft).contentHash).toBe(
      expectedHash,
    );
  });

  it('accepts every capability, including the five reserved for CTX-2 bindings', () => {
    const manifest = createAgentContextDriverRegistryManifest(
      manifestDraft({
        registrations: [
          registration({
            id: 'generic.future-authority',
            capabilities: AGENT_CONTEXT_DRIVER_CAPABILITIES,
          }),
        ],
      }),
    );

    expect(manifest.registrations[0]?.capabilities).toEqual(ALL_CAPABILITIES);
    expect(
      RESERVED_FOR_CTX_2.every((capability) =>
        manifest.registrations[0]?.capabilities.includes(capability),
      ),
    ).toBe(true);
  });

  it('is accepted by the existing open artifact-set reference envelope', () => {
    const manifest = createdManifest();
    const artifactSet = createAgentContextArtifactSet({
      schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
      repositoryRevision: 'git:driver-registry-test',
      workspaceIndex: { schemaVersion: '0.4.0', contentHash: HASH_A },
      artifacts: [
        {
          schemaId: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_ID,
          schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
          contentHash: manifest.contentHash,
        },
      ],
    });

    expect(parseAgentContextArtifactSet(artifactSet).artifacts).toEqual([
      {
        schemaId: 'agent-context.driver-registry',
        schemaVersion: '0.1.0',
        contentHash: manifest.contentHash,
      },
    ]);
  });

  it('changes and invalidates the hash for every registration field', () => {
    const baseline = createAgentContextDriverRegistryManifest({
      schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
      registrations: [
        registration({
          kind: 'application',
          id: 'app.driver',
          version: 1,
          capabilities: ['fill'],
        }),
      ],
    });
    const mutations: readonly AgentContextDriverRegistryManifestDraft[] = [
      {
        schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
        registrations: [
          { ...baseline.registrations[0]!, kind: 'generic' },
        ],
      },
      {
        schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
        registrations: [
          { ...baseline.registrations[0]!, id: 'app.changed' },
        ],
      },
      {
        schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
        registrations: [
          { ...baseline.registrations[0]!, version: 2 },
        ],
      },
      {
        schemaVersion: AGENT_CONTEXT_DRIVER_REGISTRY_SCHEMA_VERSION,
        registrations: [
          { ...baseline.registrations[0]!, capabilities: ['check'] },
        ],
      },
    ];

    for (const mutation of mutations) {
      const mutated = createAgentContextDriverRegistryManifest(mutation);
      expect(mutated.contentHash).not.toBe(baseline.contentHash);
      expect(() =>
        parseAgentContextDriverRegistryManifest({
          ...baseline,
          registrations: mutated.registrations,
        }),
      ).toThrow(/driverRegistryManifest\.contentHash.*does not match/u);
    }
  });

  it('rejects stale hashes and non-canonical full artifacts', () => {
    const manifest = createdManifest();
    expect(() =>
      parseAgentContextDriverRegistryManifest({
        ...manifest,
        contentHash: HASH_A,
      }),
    ).toThrow(/driverRegistryManifest\.contentHash.*does not match/u);

    expect(() =>
      parseAgentContextDriverRegistryManifest({
        ...manifest,
        registrations: [...manifest.registrations].reverse(),
      }),
    ).toThrow(/driverRegistryManifest\.registrations.*canonical order/u);

    const reversedCapabilities = structuredClone(manifest) as unknown as {
      registrations: { capabilities: string[] }[];
    };
    reversedCapabilities.registrations[0]?.capabilities.reverse();
    expect(() =>
      parseAgentContextDriverRegistryManifest(reversedCapabilities),
    ).toThrow(/registrations\[0\]\.capabilities.*canonical order/u);
  });

  it('rejects unsupported schema versions and malformed content hashes', () => {
    expect(() =>
      createAgentContextDriverRegistryManifest({
        ...manifestDraft(),
        schemaVersion: '0.2.0',
      } as never),
    ).toThrow(/driverRegistryManifest\.schemaVersion.*must be 0\.1\.0/u);

    expect(() =>
      parseAgentContextDriverRegistryManifest({
        ...createdManifest(),
        contentHash: 'sha256:ABC',
      }),
    ).toThrow(/driverRegistryManifest\.contentHash.*lowercase sha256/u);
  });

  it('rejects full manifests passed to the draft hash API', () => {
    expect(() =>
      computeAgentContextDriverRegistryManifestHash(createdManifest()),
    ).toThrow(/driverRegistryManifest\.contentHash.*not supported/u);
  });
});

describe('agent context driver-registry strict registration validation', () => {
  it.each(['', '.driver', 'driver/name', 'driver name', `a${'b'.repeat(256)}`])(
    'rejects malformed driver ID %s',
    (id) => {
      expect(() =>
        createAgentContextDriverRegistryManifest(
          manifestDraft({ registrations: [registration({ id })] }),
        ),
      ).toThrow(/registrations\[0\]\.id.*stable identifier/u);
    },
  );

  it.each([0, -1, -0, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects non-positive or unsafe driver version %s',
    (version) => {
      expect(() =>
        createAgentContextDriverRegistryManifest(
          manifestDraft({ registrations: [registration({ version })] }),
        ),
      ).toThrow(/registrations\[0\]\.version.*positive safe integer/u);
    },
  );

  it('rejects unknown manifest and registration keys', () => {
    expect(() =>
      createAgentContextDriverRegistryManifest({
        ...manifestDraft(),
        module: './drivers.js',
      } as never),
    ).toThrow(/driverRegistryManifest\.module.*not supported/u);

    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [
            {
              ...registration(),
              factory: () => undefined,
            } as never,
          ],
        }),
      ),
    ).toThrow(/registrations\[0\]\.factory.*JSON value/u);

    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [
            { ...registration(), package: '@app/driver' } as never,
          ],
        }),
      ),
    ).toThrow(/registrations\[0\]\.package.*not supported/u);
  });

  it('rejects empty, duplicate, and unsupported capability sets', () => {
    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [registration({ capabilities: [] as never })],
        }),
      ),
    ).toThrow(/capabilities.*at least one/u);

    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [
            registration({ capabilities: ['fill', 'fill'] as never }),
          ],
        }),
      ),
    ).toThrow(/capabilities\[1\].*duplicates capability/u);

    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [
            registration({ capabilities: ['execute-module'] as never }),
          ],
        }),
      ),
    ).toThrow(/capabilities\[0\].*must be one of/u);
  });

  it('rejects duplicate exact identities but allows multiple versions', () => {
    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [registration(), registration()],
        }),
      ),
    ).toThrow(/registrations\[1\].*duplicates.*identity/u);

    const manifest = createAgentContextDriverRegistryManifest(
      manifestDraft({
        registrations: [
          registration({ version: 2 }),
          registration({ version: 1 }),
          registration({ kind: 'application', id: 'app.fill', version: 1 }),
        ],
      }),
    );
    expect(
      manifest.registrations.map(({ kind, id, version }) => ({
        kind,
        id,
        version,
      })),
    ).toEqual([
      { kind: 'application', id: 'app.fill', version: 1 },
      { kind: 'generic', id: 'generic.fill', version: 1 },
      { kind: 'generic', id: 'generic.fill', version: 2 },
    ]);
  });

  it('refuses the reserved generic namespace for application registrations', () => {
    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [
            registration({ kind: 'application', id: 'generic.custom' }),
          ],
        }),
      ),
    ).toThrow(/registrations\[0\]\.id.*reserved "generic\." namespace/u);
  });

  it('bounds registration collection size', () => {
    const registrations = Array.from({ length: 10_001 }, (_, index) =>
      registration({ id: `generic.driver-${index}` }),
    );
    expect(() =>
      createAgentContextDriverRegistryManifest(
        manifestDraft({ registrations }),
      ),
    ).toThrow(/driverRegistryManifest\.registrations.*at most 10000/u);
  });
});

describe('execution-authority driver compatibility', () => {
  it('returns a hash-bound compatible result for all 13 CTX-0C driver operations', () => {
    const authority = createdAuthority();
    const manifest = createdManifest();

    expect(
      validateAgentContextExecutionAuthorityDriverCompatibility(
        authority,
        manifest,
      ),
    ).toEqual({
      status: 'compatible',
      executionAuthorityContentHash: authority.contentHash,
      driverRegistryContentHash: manifest.contentHash,
      issues: [],
    });
  });

  it.each(AUTHORITY_BOUND_CAPABILITIES)(
    'requires the explicitly bound CTX-0C capability %s',
    (capability) => {
      const draft = structuredClone(
        manifestDraft(),
      ) as unknown as MutableManifestDraft;
      const owner = draft.registrations.find((entry) =>
        entry.capabilities.includes(capability),
      )!;
      owner.capabilities = owner.capabilities.filter(
        (candidate) => candidate !== capability,
      );
      const result = validateAgentContextExecutionAuthorityDriverCompatibility(
        createdAuthority(),
        createAgentContextDriverRegistryManifest(
          draft as unknown as AgentContextDriverRegistryManifestDraft,
        ),
      );

      expect(incompatibilityIssues(result)).toEqual([
        {
          code: 'DRIVER_CAPABILITY_MISSING',
          driver:
            owner.kind === 'application'
              ? APPLICATION_DRIVER
              : GENERIC_DRIVER,
          missingCapabilities: [capability],
        },
      ]);
    },
  );

  it('does not claim CTX-2-reserved capabilities from authority records that do not bind drivers', () => {
    const manifest = createdManifest();
    const registeredCapabilities = new Set(
      manifest.registrations.flatMap(({ capabilities }) => capabilities),
    );
    expect(
      RESERVED_FOR_CTX_2.every(
        (capability) => !registeredCapabilities.has(capability),
      ),
    ).toBe(true);
    expect(
      validateAgentContextExecutionAuthorityDriverCompatibility(
        createdAuthority(),
        manifest,
      ).status,
    ).toBe('compatible');
  });

  it('distinguishes an exact missing registration from missing capabilities', () => {
    const missingRegistration = validateAgentContextExecutionAuthorityDriverCompatibility(
      createdAuthority(),
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [manifestDraft().registrations[1]!],
        }),
      ),
    );
    expect(incompatibilityIssues(missingRegistration)).toEqual([
      {
        code: 'DRIVER_REGISTRATION_MISSING',
        driver: APPLICATION_DRIVER,
        requiredCapabilities: APPLICATION_AUTHORITY_CAPABILITIES,
      },
    ]);

    const missingCapabilities = validateAgentContextExecutionAuthorityDriverCompatibility(
      createdAuthority(),
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [
            registration({
              kind: APPLICATION_DRIVER.kind,
              id: APPLICATION_DRIVER.id,
              version: APPLICATION_DRIVER.version,
              capabilities: ['open-usage'],
            }),
            manifestDraft().registrations[1]!,
          ],
        }),
      ),
    );
    expect(incompatibilityIssues(missingCapabilities)).toEqual([
      {
        code: 'DRIVER_CAPABILITY_MISSING',
        driver: APPLICATION_DRIVER,
        missingCapabilities: ['assert-outcome', 'invoke-usage-action'],
      },
    ]);
  });

  it.each([
    { field: 'kind', registration: { kind: 'generic' as const } },
    { field: 'id', registration: { id: 'orders.other-driver' } },
    { field: 'version', registration: { version: 3 } },
  ])('requires exact driver $field identity', ({ registration: override }) => {
    const application = registration({
      kind: APPLICATION_DRIVER.kind,
      id: APPLICATION_DRIVER.id,
      version: APPLICATION_DRIVER.version,
      capabilities: APPLICATION_AUTHORITY_CAPABILITIES,
      ...override,
    });
    const result = validateAgentContextExecutionAuthorityDriverCompatibility(
      createdAuthority(),
      createAgentContextDriverRegistryManifest(
        manifestDraft({
          registrations: [application, manifestDraft().registrations[1]!],
        }),
      ),
    );

    expect(incompatibilityIssues(result)).toContainEqual({
      code: 'DRIVER_REGISTRATION_MISSING',
      driver: APPLICATION_DRIVER,
      requiredCapabilities: APPLICATION_AUTHORITY_CAPABILITIES,
    });
  });

  it('allows multiple versions to coexist but never falls back to another version', () => {
    const genericRegistration = manifestDraft().registrations[1]!;
    const withSelectedAndNewer = createAgentContextDriverRegistryManifest(
      manifestDraft({
        registrations: [
          manifestDraft().registrations[0]!,
          genericRegistration,
          { ...genericRegistration, version: 2 },
        ],
      }),
    );
    expect(
      validateAgentContextExecutionAuthorityDriverCompatibility(
        createdAuthority(),
        withSelectedAndNewer,
      ).status,
    ).toBe('compatible');

    const onlyOtherVersions = createAgentContextDriverRegistryManifest(
      manifestDraft({
        registrations: [
          manifestDraft().registrations[0]!,
          { ...genericRegistration, version: 2 },
          { ...genericRegistration, version: 3 },
        ],
      }),
    );
    expect(
      incompatibilityIssues(
        validateAgentContextExecutionAuthorityDriverCompatibility(
          createdAuthority(),
          onlyOtherVersions,
        ),
      ),
    ).toContainEqual({
      code: 'DRIVER_REGISTRATION_MISSING',
      driver: GENERIC_DRIVER,
      requiredCapabilities: GENERIC_AUTHORITY_CAPABILITIES,
    });
  });

  it('rejects a driver-reference mutation even after the authority hash is recomputed', () => {
    const authority = structuredClone(createdAuthority()) as unknown as {
      interactions: {
        operation: string;
        driver: { kind: 'generic'; id: string; version: number };
      }[];
    } & AgentContextExecutionAuthority;
    const check = authority.interactions.find(
      ({ operation }) => operation === 'check',
    )!;
    check.driver.version = 99;
    const rehashed = recomputeAuthorityHash(authority);

    expect(() => parseAgentContextExecutionAuthority(rehashed)).not.toThrow();
    expect(
      incompatibilityIssues(
        validateAgentContextExecutionAuthorityDriverCompatibility(
          rehashed,
          createdManifest(),
        ),
      ),
    ).toContainEqual({
      code: 'DRIVER_REGISTRATION_MISSING',
      driver: { ...GENERIC_DRIVER, version: 99 },
      requiredCapabilities: ['check'],
    });
  });

  it('returns compatibility issues in canonical identity order', () => {
    const result = validateAgentContextExecutionAuthorityDriverCompatibility(
      createdAuthority(),
      createAgentContextDriverRegistryManifest(
        manifestDraft({ registrations: [] }),
      ),
    );

    expect(incompatibilityIssues(result).map(({ driver }) => driver.kind)).toEqual(
      ['application', 'generic'],
    );
  });
});

describe('agent context driver-registry bounded data-only parsing', () => {
  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects dense and sparse over-limit registration arrays before visiting entries',
    ({ input, invoke }) => {
      for (const registrations of [
        Array(1_000_000).fill(null),
        new Array(1_000_000),
      ]) {
        let trapCalls = 0;
        registrations[0] = new Proxy(
          {},
          {
            getOwnPropertyDescriptor() {
              trapCalls += 1;
              throw new Error('descriptor trap must not run');
            },
            getPrototypeOf() {
              trapCalls += 1;
              throw new Error('prototype trap must not run');
            },
            ownKeys() {
              trapCalls += 1;
              throw new Error('ownKeys trap must not run');
            },
          },
        );
        const candidate = input() as object;
        replaceOwnProperty(candidate, 'registrations', registrations);

        expect(() => invoke(candidate)).toThrow(
          /driverRegistryManifest\.registrations.*at most 10000/u,
        );
        expect(trapCalls).toBe(0);
      }
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects over-limit capability arrays before visiting entries',
    ({ input, invoke }) => {
      for (const capabilities of [
        Array(19).fill('fill'),
        new Array(1_000_000),
      ]) {
        let trapCalls = 0;
        capabilities[0] = new Proxy(
          {},
          {
            getOwnPropertyDescriptor() {
              trapCalls += 1;
              throw new Error('descriptor trap must not run');
            },
            getPrototypeOf() {
              trapCalls += 1;
              throw new Error('prototype trap must not run');
            },
            ownKeys() {
              trapCalls += 1;
              throw new Error('ownKeys trap must not run');
            },
          },
        );
        const candidate = input() as {
          registrations: { capabilities: unknown }[];
        };
        replaceOwnProperty(
          candidate.registrations[0]!,
          'capabilities',
          capabilities,
        );

        expect(() => invoke(candidate)).toThrow(
          /driverRegistryManifest\.registrations\[0\]\.capabilities.*at most 18/u,
        );
        expect(trapCalls).toBe(0);
      }
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects an exotic root before visiting its properties',
    ({ input, invoke }) => {
      let trapCalls = 0;
      const candidate = input() as Record<string, unknown>;
      candidate.lateProxy = new Proxy(
        {},
        {
          getOwnPropertyDescriptor() {
            trapCalls += 1;
            throw new Error('descriptor trap must not run');
          },
          getPrototypeOf() {
            trapCalls += 1;
            throw new Error('prototype trap must not run');
          },
          ownKeys() {
            trapCalls += 1;
            throw new Error('ownKeys trap must not run');
          },
        },
      );
      Object.setPrototypeOf(candidate, { exotic: true });

      expect(() => invoke(candidate)).toThrow(
        /driverRegistryManifest.*plain object or null-prototype object/u,
      );
      expect(trapCalls).toBe(0);
    },
  );

  it('rejects a 10 MB driver ID before visiting later accessors or proxies', () => {
    const candidate = structuredClone(
      manifestDraft(),
    ) as unknown as MutableManifestDraft;
    const first = candidate.registrations[0]! as (typeof candidate.registrations)[number] &
      Record<string, unknown>;
    first.id = 'x'.repeat(10 * 1024 * 1024);
    let getterCalls = 0;
    let trapCalls = 0;
    Object.defineProperty(first, 'lateAccessor', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'must not run';
      },
    });
    first.lateProxy = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          trapCalls += 1;
          throw new Error('descriptor trap must not run');
        },
        getPrototypeOf() {
          trapCalls += 1;
          throw new Error('prototype trap must not run');
        },
        ownKeys() {
          trapCalls += 1;
          throw new Error('ownKeys trap must not run');
        },
      },
    );

    expect(() =>
      createAgentContextDriverRegistryManifest(
        candidate as unknown as AgentContextDriverRegistryManifestDraft,
      ),
    ).toThrow(/driverRegistryManifest\.registrations\[0\]\.id.*stable identifier/u);
    expect(getterCalls).toBe(0);
    expect(trapCalls).toBe(0);
  });

  it('rejects overlong primitive strings and property keys before canonicalization', () => {
    const overlongString = manifestDraft() as unknown as Record<
      string,
      unknown
    >;
    overlongString.extra = 'x'.repeat(4_097);
    expect(() =>
      createAgentContextDriverRegistryManifest(overlongString as never),
    ).toThrow(/driverRegistryManifest\.extra.*data string length of 4096/u);

    const overlongKey = manifestDraft() as unknown as Record<string, unknown>;
    Object.defineProperty(overlongKey, 'x'.repeat(1_025), {
      enumerable: true,
      value: 'bounded',
    });
    expect(() =>
      createAgentContextDriverRegistryManifest(overlongKey as never),
    ).toThrow(/driverRegistryManifest.*property key length of 1024/u);
  });

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects function values',
    ({ input, invoke }) => {
      const candidate = input() as object;
      replaceOwnProperty(candidate, 'execute', () => undefined);
      expect(() => invoke(candidate)).toThrow(
        /driverRegistryManifest\.execute.*JSON value/u,
      );
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects symbol-keyed values',
    ({ input, invoke }) => {
      const candidate = input() as Record<string | symbol, unknown>;
      candidate[Symbol('module')] = './driver.js';
      expect(() => invoke(candidate)).toThrow(
        /driverRegistryManifest.*symbol-keyed/u,
      );
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects accessors without invoking getters',
    ({ input, invoke }) => {
      const candidate = input() as {
        registrations: Record<string, unknown>[];
      };
      let getterCalls = 0;
      Object.defineProperty(candidate.registrations[0], 'id', {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 'generic.unsafe';
        },
      });

      expect(() => invoke(candidate)).toThrow(
        /registrations\[0\]\.id.*data property/u,
      );
      expect(getterCalls).toBe(0);
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects proxies without invoking reflective traps',
    ({ input, invoke }) => {
      let trapCalls = 0;
      const candidate = new Proxy(input() as object, {
        getOwnPropertyDescriptor() {
          trapCalls += 1;
          throw new Error('descriptor trap must not run');
        },
        getPrototypeOf() {
          trapCalls += 1;
          throw new Error('prototype trap must not run');
        },
        ownKeys() {
          trapCalls += 1;
          throw new Error('ownKeys trap must not run');
        },
      });

      expect(() => invoke(candidate)).toThrow(
        /driverRegistryManifest.*proxy/u,
      );
      expect(trapCalls).toBe(0);
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects sparse arrays',
    ({ input, invoke }) => {
      const candidate = input() as object;
      replaceOwnProperty(candidate, 'registrations', new Array(1));
      expect(() => invoke(candidate)).toThrow(
        /driverRegistryManifest\.registrations\[0\].*sparse/u,
      );
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects cycles',
    ({ input, invoke }) => {
      const candidate = input() as object;
      replaceOwnProperty(candidate, 'cycle', candidate);
      expect(() => invoke(candidate)).toThrow(
        /driverRegistryManifest\.cycle.*cycle/u,
      );
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects excessive graph depth with a bounded TypeError',
    ({ input, invoke }) => {
      const candidate = input() as object;
      replaceOwnProperty(candidate, 'extra', deeplyNestedData(20_000));

      const error = captureThrown(() => invoke(candidate));

      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toMatch(
        /driverRegistryManifest\.extra.*maximum data graph depth of 128/u,
      );
    },
  );

  it.each(PUBLIC_MANIFEST_ENTRY_POINTS)(
    '$name rejects oversized graphs with the shared node budget',
    ({ input, invoke }) => {
      const candidate = input() as object;
      replaceOwnProperty(candidate, 'extra', Array(100_001).fill(null));

      const error = captureThrown(() => invoke(candidate));

      expect(error).toBeInstanceOf(TypeError);
      expect((error as Error).message).toMatch(
        /maximum data graph node count of 100000/u,
      );
    },
  );
});
