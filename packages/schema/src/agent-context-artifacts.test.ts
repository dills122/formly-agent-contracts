import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
  canonicalizeAgentContextArtifactSet,
  computeAgentContextArtifactSetHash,
  createAgentContextArtifactSet,
  parseAgentContextArtifactSet,
  type AgentContextArtifactReference,
  type AgentContextArtifactSet,
  type AgentContextArtifactSetDraft,
} from './index.js';

const HASH_A = `sha256:${'a'.repeat(64)}` as const;
const HASH_B = `sha256:${'b'.repeat(64)}` as const;
const HASH_C = `sha256:${'c'.repeat(64)}` as const;

function artifactReference(
  overrides: Partial<AgentContextArtifactReference> = {},
): AgentContextArtifactReference {
  return {
    schemaId: 'agent-context.lineage',
    schemaVersion: '1.0.0',
    contentHash: HASH_A,
    ...overrides,
  };
}

function artifactSetDraft(
  overrides: Partial<AgentContextArtifactSetDraft> = {},
): AgentContextArtifactSetDraft {
  return {
    schemaVersion: AGENT_CONTEXT_ARTIFACT_SET_SCHEMA_VERSION,
    repositoryRevision: 'git:0123456789abcdef',
    workspaceIndex: {
      schemaVersion: '0.2.0',
      contentHash: HASH_B,
    },
    artifacts: [],
    ...overrides,
  };
}

function createdArtifactSet(
  overrides: Partial<AgentContextArtifactSetDraft> = {},
): AgentContextArtifactSet {
  return createAgentContextArtifactSet(artifactSetDraft(overrides));
}

function replaceOwnProperty(
  input: object,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(input, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

describe('agent context artifact-set identity', () => {
  it('creates, parses, and canonicalizes a minimal incomplete artifact set', () => {
    const draft = artifactSetDraft();

    const created = createAgentContextArtifactSet(draft);
    const canonical = canonicalizeAgentContextArtifactSet(created);
    const reparsed = parseAgentContextArtifactSet(JSON.parse(canonical));

    expect(created).toEqual({
      ...draft,
      workspaceIndex: { ...draft.workspaceIndex },
      artifacts: [],
      contentHash: computeAgentContextArtifactSetHash(draft),
    });
    expect(created.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(reparsed).toEqual(created);
    expect(JSON.parse(canonical)).toEqual(created);
    expect(canonical).toContain(`"contentHash":"${created.contentHash}"`);
  });

  it('uses one normalized reference order for direct compute and create', () => {
    const references: readonly AgentContextArtifactReference[] = [
      artifactReference({
        schemaId: 'zeta-context.result',
        schemaVersion: '2',
        contentHash: HASH_C,
      }),
      artifactReference({
        schemaId: 'agent-context.behavior',
        schemaVersion: '2',
        contentHash: HASH_B,
      }),
      artifactReference({
        schemaId: 'agent-context.behavior',
        schemaVersion: '1',
        contentHash: HASH_C,
      }),
      artifactReference({
        schemaId: 'agent-context.behavior',
        schemaVersion: '1',
        contentHash: HASH_A,
      }),
    ];
    const first = artifactSetDraft({ artifacts: references });
    const second = artifactSetDraft({ artifacts: [...references].reverse() });

    const firstHash = computeAgentContextArtifactSetHash(first);
    const secondHash = computeAgentContextArtifactSetHash(second);
    const firstCreated = createAgentContextArtifactSet(first);
    const secondCreated = createAgentContextArtifactSet(second);

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toBe(firstCreated.contentHash);
    expect(secondHash).toBe(secondCreated.contentHash);
    expect(firstCreated.artifacts).toEqual([
      artifactReference({
        schemaId: 'agent-context.behavior',
        schemaVersion: '1',
        contentHash: HASH_A,
      }),
      artifactReference({
        schemaId: 'agent-context.behavior',
        schemaVersion: '1',
        contentHash: HASH_C,
      }),
      artifactReference({
        schemaId: 'agent-context.behavior',
        schemaVersion: '2',
        contentHash: HASH_B,
      }),
      artifactReference({
        schemaId: 'zeta-context.result',
        schemaVersion: '2',
        contentHash: HASH_C,
      }),
    ]);
    expect(canonicalizeAgentContextArtifactSet(firstCreated)).toBe(
      canonicalizeAgentContextArtifactSet(secondCreated),
    );
  });

  it('orders reference components by code unit rather than locale', () => {
    const created = createdArtifactSet({
      artifacts: [
        artifactReference({ schemaVersion: 'a' }),
        artifactReference({ schemaVersion: 'Z' }),
      ],
    });

    expect(created.artifacts.map(({ schemaVersion }) => schemaVersion)).toEqual(
      ['Z', 'a'],
    );
  });

  it('hashes every causal repository, workspace-index, and artifact field', () => {
    const baseline = artifactSetDraft({ artifacts: [artifactReference()] });
    const baselineHash = computeAgentContextArtifactSetHash(baseline);
    const causalChanges: readonly AgentContextArtifactSetDraft[] = [
      { ...baseline, repositoryRevision: 'git:fedcba9876543210' },
      {
        ...baseline,
        workspaceIndex: {
          ...baseline.workspaceIndex,
          schemaVersion: '0.2.1',
        },
      },
      {
        ...baseline,
        workspaceIndex: {
          ...baseline.workspaceIndex,
          contentHash: HASH_C,
        },
      },
      {
        ...baseline,
        artifacts: [
          artifactReference({ schemaId: 'agent-context.journey' }),
        ],
      },
      {
        ...baseline,
        artifacts: [artifactReference({ schemaVersion: '1.0.1' })],
      },
      {
        ...baseline,
        artifacts: [artifactReference({ contentHash: HASH_C })],
      },
      {
        ...baseline,
        artifacts: [artifactReference(), artifactReference({ contentHash: HASH_C })],
      },
    ];

    for (const changed of causalChanges) {
      expect(computeAgentContextArtifactSetHash(changed)).not.toBe(
        baselineHash,
      );
    }
  });

  it('round-trips unknown open schema IDs without treating workspace-index likeness as a duplicate', () => {
    const set = createdArtifactSet({
      artifacts: [
        artifactReference({
          schemaId: 'future-owner.opaque-evidence',
          schemaVersion: '99_preview+4',
          contentHash: HASH_C,
        }),
        artifactReference({
          schemaId: 'formly-contract.workspace-index',
          schemaVersion: '0.2.0',
          contentHash: HASH_B,
        }),
      ],
    });

    expect(parseAgentContextArtifactSet(set)).toEqual(set);
  });

  it('does not mutate caller drafts while normalizing compute or create', () => {
    const draft = artifactSetDraft({
      artifacts: [
        artifactReference({ schemaId: 'zeta-context.result' }),
        artifactReference({ schemaId: 'agent-context.behavior' }),
      ],
    });
    const before = structuredClone(draft);

    computeAgentContextArtifactSetHash(draft);
    createAgentContextArtifactSet(draft);

    expect(draft).toEqual(before);
    expect(draft.artifacts.map(({ schemaId }) => schemaId)).toEqual([
      'zeta-context.result',
      'agent-context.behavior',
    ]);
  });

  it('returns detached data after both create and parse', () => {
    const createInput = artifactSetDraft({ artifacts: [artifactReference()] });
    const created = createAgentContextArtifactSet(createInput);
    const parseInput = structuredClone(created);
    const parsed = parseAgentContextArtifactSet(parseInput);
    const createdCanonical = canonicalizeAgentContextArtifactSet(created);
    const parsedCanonical = canonicalizeAgentContextArtifactSet(parsed);

    (
      createInput.workspaceIndex as {
        schemaVersion: string;
      }
    ).schemaVersion = 'mutated';
    (createInput.artifacts[0] as { schemaId: string }).schemaId =
      'mutated.invalid';
    (createInput.artifacts as AgentContextArtifactReference[]).push(
      artifactReference({ contentHash: HASH_C }),
    );
    const mutableParseInput = parseInput as unknown as {
      repositoryRevision: string;
      workspaceIndex: { contentHash: string };
      artifacts: { schemaVersion: string }[];
    };
    mutableParseInput.repositoryRevision = 'mutated';
    mutableParseInput.workspaceIndex.contentHash = HASH_A;
    mutableParseInput.artifacts[0]!.schemaVersion = 'mutated';
    mutableParseInput.artifacts.push(
      artifactReference({ contentHash: HASH_C }),
    );

    expect(canonicalizeAgentContextArtifactSet(created)).toBe(
      createdCanonical,
    );
    expect(canonicalizeAgentContextArtifactSet(parsed)).toBe(parsedCanonical);
  });
});

describe('agent context artifact-set strict semantics', () => {
  it.each(['0.0.9', '0.2.0'])(
    'rejects unsupported top-level schema version %s',
    (schemaVersion) => {
      expect(() =>
        createAgentContextArtifactSet({
          ...artifactSetDraft(),
          schemaVersion,
        } as never),
      ).toThrow(/agentContextArtifactSet\.schemaVersion.*must be 0\.1\.0/u);
    },
  );

  it('rejects unknown and missing properties at every object level', () => {
    expect(() =>
      computeAgentContextArtifactSetHash({
        ...artifactSetDraft(),
        contentHash: HASH_A,
      }),
    ).toThrow(/agentContextArtifactSet\.contentHash.*not supported/u);
    expect(() =>
      createAgentContextArtifactSet({
        repositoryRevision: 'git:revision',
        workspaceIndex: { schemaVersion: '0.2.0', contentHash: HASH_A },
        artifacts: [],
      } as never),
    ).toThrow(/agentContextArtifactSet\.schemaVersion.*required/u);
    expect(() =>
      parseAgentContextArtifactSet({
        ...createdArtifactSet(),
        producedAt: '2026-08-27T00:00:00Z',
      }),
    ).toThrow(/agentContextArtifactSet\.producedAt.*not supported/u);
    expect(() =>
      parseAgentContextArtifactSet({
        ...artifactSetDraft(),
      }),
    ).toThrow(/agentContextArtifactSet\.contentHash.*required/u);

    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          workspaceIndex: {
            schemaVersion: '0.2.0',
            contentHash: HASH_A,
            schemaId: 'formly-contract.workspace-index',
          } as never,
        }),
      ),
    ).toThrow(/agentContextArtifactSet\.workspaceIndex\.schemaId.*not supported/u);
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          workspaceIndex: { schemaVersion: '0.2.0' } as never,
        }),
      ),
    ).toThrow(/agentContextArtifactSet\.workspaceIndex\.contentHash.*required/u);

    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          artifacts: [
            {
              ...artifactReference(),
              logicalId: 'journey:checkout',
            } as never,
          ],
        }),
      ),
    ).toThrow(/agentContextArtifactSet\.artifacts\[0\]\.logicalId.*not supported/u);
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          artifacts: [
            {
              schemaId: 'agent-context.lineage',
              contentHash: HASH_A,
            } as never,
          ],
        }),
      ),
    ).toThrow(/agentContextArtifactSet\.artifacts\[0\]\.schemaVersion.*required/u);
  });

  it.each([
    'form',
    'Formly.contract',
    'form..contract',
    'form_contract',
    'form/contract',
    'form.',
    '.form',
    `a.${'b'.repeat(127)}`,
  ])('rejects malformed or overlong schema ID %s', (schemaId) => {
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: [artifactReference({ schemaId })] }),
      ),
    ).toThrow(/artifacts\[0\]\.schemaId.*namespaced schema ID/u);
  });

  it('accepts the exact schema-ID and referenced-version bounds', () => {
    const maxSchemaId = `a.${'b'.repeat(126)}`;
    const maxVersion = '1'.repeat(64);
    const set = createdArtifactSet({
      workspaceIndex: { schemaVersion: maxVersion, contentHash: HASH_A },
      artifacts: [
        artifactReference({
          schemaId: maxSchemaId,
          schemaVersion: maxVersion,
        }),
      ],
    });

    expect(set.artifacts[0]).toMatchObject({
      schemaId: maxSchemaId,
      schemaVersion: maxVersion,
    });
    expect(set.workspaceIndex.schemaVersion).toBe(maxVersion);
  });

  it.each([
    '',
    '.1',
    '1.',
    '_1',
    '1_',
    '+1',
    '1+',
    '-1',
    '1-',
    '1 0',
    'v/1',
    'é',
    '1'.repeat(65),
  ])('rejects malformed referenced version %s', (schemaVersion) => {
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          artifacts: [artifactReference({ schemaVersion })],
        }),
      ),
    ).toThrow(/artifacts\[0\]\.schemaVersion.*version string/u);
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          workspaceIndex: { schemaVersion, contentHash: HASH_A },
        }),
      ),
    ).toThrow(/workspaceIndex\.schemaVersion.*version string/u);
  });

  it.each([
    '',
    ' git:revision',
    'git:revision ',
    'git:\trevision',
    'git:\nrevision',
    'git:\0revision',
    'git:révision',
    `git:${String.fromCharCode(127)}revision`,
    'r'.repeat(257),
  ])('rejects malformed repository revision %j', (repositoryRevision) => {
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ repositoryRevision }),
      ),
    ).toThrow(/repositoryRevision.*printable ASCII provenance/u);
  });

  it('accepts exact repository revision bounds and internal spaces', () => {
    expect(
      createdArtifactSet({ repositoryRevision: 'r' }).repositoryRevision,
    ).toBe('r');
    expect(
      createdArtifactSet({ repositoryRevision: 'git:feature branch' })
        .repositoryRevision,
    ).toBe('git:feature branch');
    expect(
      createdArtifactSet({ repositoryRevision: 'r'.repeat(256) })
        .repositoryRevision,
    ).toHaveLength(256);
  });

  it.each([
    'sha256:ABCDEF',
    `sha256:${'A'.repeat(64)}`,
    `sha256:${'a'.repeat(63)}`,
    `sha256:${'a'.repeat(65)}`,
    `sha512:${'a'.repeat(64)}`,
    `${'a'.repeat(64)}`,
  ])('rejects malformed digest %s', (contentHash) => {
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          workspaceIndex: { schemaVersion: '0.2.0', contentHash } as never,
        }),
      ),
    ).toThrow(/workspaceIndex\.contentHash.*sha256 digest/u);
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          artifacts: [artifactReference({ contentHash: contentHash as never })],
        }),
      ),
    ).toThrow(/artifacts\[0\]\.contentHash.*sha256 digest/u);
    expect(() =>
      parseAgentContextArtifactSet({
        ...createdArtifactSet(),
        contentHash,
      }),
    ).toThrow(/agentContextArtifactSet\.contentHash.*sha256 digest/u);
  });

  it('accepts 10,000 references and rejects the 10,001st', () => {
    const references = Array.from({ length: 10_001 }, (_, index) =>
      artifactReference({
        contentHash: `sha256:${index.toString(16).padStart(64, '0')}`,
      }),
    );

    expect(
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: references.slice(0, 10_000) }),
      ).artifacts,
    ).toHaveLength(10_000);
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: references }),
      ),
    ).toThrow(/agentContextArtifactSet\.artifacts.*at most 10000/u);
  });

  it('rejects only exact duplicate reference triples', () => {
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({
          artifacts: [artifactReference(), artifactReference()],
        }),
      ),
    ).toThrow(/artifacts\[1\].*duplicates.*reference/u);

    expect(
      createdArtifactSet({
        artifacts: [
          artifactReference(),
          artifactReference({ contentHash: HASH_C }),
          artifactReference({ schemaVersion: '2' }),
          artifactReference({ schemaId: 'agent-context.journey' }),
        ],
      }).artifacts,
    ).toHaveLength(4);
  });

  it('rejects non-canonical reference order in a full set even when its hash is valid', () => {
    const canonical = createdArtifactSet({
      artifacts: [
        artifactReference({ schemaId: 'agent-context.behavior' }),
        artifactReference({ schemaId: 'agent-context.lineage' }),
      ],
    });
    const reversed = {
      ...canonical,
      artifacts: [...canonical.artifacts].reverse(),
    };

    expect(() => parseAgentContextArtifactSet(reversed)).toThrow(
      /agentContextArtifactSet\.artifacts.*canonical order/u,
    );
    expect(() => canonicalizeAgentContextArtifactSet(reversed)).toThrow(
      /agentContextArtifactSet\.artifacts.*canonical order/u,
    );
  });

  it('rejects a verified hash after each causal field is mutated', () => {
    const baseline = createdArtifactSet({ artifacts: [artifactReference()] });
    const mutations: readonly AgentContextArtifactSet[] = [
      { ...baseline, repositoryRevision: 'git:changed' },
      {
        ...baseline,
        workspaceIndex: { ...baseline.workspaceIndex, schemaVersion: '0.2.1' },
      },
      {
        ...baseline,
        workspaceIndex: { ...baseline.workspaceIndex, contentHash: HASH_C },
      },
      {
        ...baseline,
        artifacts: [artifactReference({ schemaId: 'agent-context.journey' })],
      },
      {
        ...baseline,
        artifacts: [artifactReference({ schemaVersion: '1.0.1' })],
      },
      {
        ...baseline,
        artifacts: [artifactReference({ contentHash: HASH_C })],
      },
      { ...baseline, artifacts: [] },
    ];

    for (const mutation of mutations) {
      expect(() => parseAgentContextArtifactSet(mutation)).toThrow(
        /agentContextArtifactSet\.contentHash.*does not match/u,
      );
    }
  });
});

describe('agent context artifact-set data-only parsing', () => {
  it('accepts null-prototype objects and returns ordinary detached DTOs', () => {
    const draft = artifactSetDraft({ artifacts: [artifactReference()] });
    const nullPrototypeReference = Object.assign(
      Object.create(null) as Record<string, unknown>,
      draft.artifacts[0],
    );
    const nullPrototypeWorkspace = Object.assign(
      Object.create(null) as Record<string, unknown>,
      draft.workspaceIndex,
    );
    const nullPrototypeDraft = Object.assign(
      Object.create(null) as Record<string, unknown>,
      draft,
      {
        workspaceIndex: nullPrototypeWorkspace,
        artifacts: [nullPrototypeReference],
      },
    );

    const created = createAgentContextArtifactSet(nullPrototypeDraft);

    expect(Object.getPrototypeOf(created)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(created.workspaceIndex)).toBe(
      Object.prototype,
    );
    expect(Object.getPrototypeOf(created.artifacts[0]!)).toBe(
      Object.prototype,
    );
  });

  it('rejects sparse, non-enumerable, and additional array properties', () => {
    const sparse = new Array(1);
    expect(() =>
      createAgentContextArtifactSet(artifactSetDraft({ artifacts: sparse })),
    ).toThrow(/artifacts\[0\].*sparse/u);

    const nonEnumerable = [artifactReference()];
    Object.defineProperty(nonEnumerable, '0', {
      enumerable: false,
      value: nonEnumerable[0],
      writable: true,
    });
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: nonEnumerable }),
      ),
    ).toThrow(/artifacts\[0\].*enumerable/u);

    const enumerableExtra = [artifactReference()] as unknown[] & {
      execute?: unknown;
    };
    enumerableExtra.execute = () => undefined;
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: enumerableExtra as never }),
      ),
    ).toThrow(/artifacts\.execute.*supported array property/u);

    const hiddenExtra = [artifactReference()];
    Object.defineProperty(hiddenExtra, 'hidden', {
      enumerable: false,
      value: 'data',
    });
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: hiddenExtra }),
      ),
    ).toThrow(/artifacts\.hidden.*supported array property/u);
  });

  it('rejects symbols, accessors, and non-enumerable object data without invoking getters', () => {
    const symbolKeyed = artifactSetDraft() as unknown as Record<
      string | symbol,
      unknown
    >;
    symbolKeyed[Symbol('hidden')] = 'data';
    expect(() =>
      createAgentContextArtifactSet(symbolKeyed as never),
    ).toThrow(/agentContextArtifactSet.*symbol-keyed/u);

    const accessor = artifactSetDraft({ artifacts: [artifactReference()] });
    let getterCalls = 0;
    Object.defineProperty(accessor.artifacts[0]!, 'schemaId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'agent-context.lineage';
      },
    });
    expect(() => createAgentContextArtifactSet(accessor)).toThrow(
      /artifacts\[0\]\.schemaId.*data property/u,
    );
    expect(getterCalls).toBe(0);

    const nonEnumerable = artifactSetDraft();
    Object.defineProperty(nonEnumerable.workspaceIndex, 'schemaVersion', {
      enumerable: false,
      value: '0.2.0',
    });
    expect(() => createAgentContextArtifactSet(nonEnumerable)).toThrow(
      /workspaceIndex\.schemaVersion.*enumerable/u,
    );
  });

  it('rejects class instances, dates, and exotic array prototypes', () => {
    const classInstance = Object.assign(
      new (class ArtifactSet {})(),
      artifactSetDraft(),
    );
    expect(() =>
      createAgentContextArtifactSet(classInstance as never),
    ).toThrow(/agentContextArtifactSet.*plain object/u);

    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ workspaceIndex: new Date() as never }),
      ),
    ).toThrow(/workspaceIndex.*plain object/u);

    const disguisedDate = Object.assign(new Date(0), artifactSetDraft());
    Object.setPrototypeOf(disguisedDate, null);
    expect(() =>
      createAgentContextArtifactSet(disguisedDate as never),
    ).toThrow(/agentContextArtifactSet.*plain JSON data/u);

    const disguisedMap = Object.assign(new Map(), {
      schemaVersion: '0.2.0',
      contentHash: HASH_B,
    });
    Object.setPrototypeOf(disguisedMap, null);
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ workspaceIndex: disguisedMap as never }),
      ),
    ).toThrow(/agentContextArtifactSet.*plain JSON data/u);

    const exotic = [artifactReference()];
    Object.setPrototypeOf(exotic, null);
    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: exotic }),
      ),
    ).toThrow(/artifacts.*ordinary array/u);
  });

  it('rejects prototype-disguised built-ins outside the util.types brand set', () => {
    const weakReferenceTarget = {};
    const moduleBytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const WebAssemblyModule = (
      globalThis as unknown as {
        readonly WebAssembly: {
          readonly Module: new (bytes: Uint8Array) => object;
        };
      }
    ).WebAssembly.Module;
    const disguisedBuiltIns: object[] = [
      new URL('https://example.test'),
      new URLSearchParams('key=value'),
      new WeakRef(weakReferenceTarget),
      new FinalizationRegistry(() => undefined),
      new WebAssemblyModule(moduleBytes),
    ];

    for (const [index, disguisedBuiltIn] of disguisedBuiltIns.entries()) {
      Object.assign(disguisedBuiltIn, artifactSetDraft());
      Object.setPrototypeOf(
        disguisedBuiltIn,
        index % 2 === 0 ? null : Object.prototype,
      );
      expect(() =>
        createAgentContextArtifactSet(disguisedBuiltIn as never),
      ).toThrow(/agentContextArtifactSet.*plain JSON data/u);
    }
  });

  it('rejects detectable proxies before Array.isArray or reflective traps run', () => {
    let reflectiveTraps = 0;
    const proxiedArtifacts = new Proxy([artifactReference()], {
      getOwnPropertyDescriptor() {
        reflectiveTraps += 1;
        throw new Error('descriptor trap must not run');
      },
      getPrototypeOf() {
        reflectiveTraps += 1;
        throw new Error('prototype trap must not run');
      },
      ownKeys() {
        reflectiveTraps += 1;
        throw new Error('ownKeys trap must not run');
      },
    });

    expect(() =>
      createAgentContextArtifactSet(
        artifactSetDraft({ artifacts: proxiedArtifacts }),
      ),
    ).toThrow(/agentContextArtifactSet\.artifacts.*proxy/u);
    expect(reflectiveTraps).toBe(0);

    const proxiedRoot = new Proxy(artifactSetDraft(), {
      getOwnPropertyDescriptor() {
        reflectiveTraps += 1;
        throw new Error('descriptor trap must not run');
      },
      getPrototypeOf() {
        reflectiveTraps += 1;
        throw new Error('prototype trap must not run');
      },
      ownKeys() {
        reflectiveTraps += 1;
        throw new Error('ownKeys trap must not run');
      },
    });

    expect(() => createAgentContextArtifactSet(proxiedRoot)).toThrow(
      /agentContextArtifactSet.*proxy/u,
    );
    expect(reflectiveTraps).toBe(0);
  });

  it('rejects cycles without canonicalizing the caller input', () => {
    const cyclic = artifactSetDraft() as unknown as Record<string, unknown>;
    replaceOwnProperty(cyclic, 'workspaceIndex', cyclic);

    expect(() => createAgentContextArtifactSet(cyclic as never)).toThrow(
      /agentContextArtifactSet\.workspaceIndex.*cycle/u,
    );
  });

  it('rejects full-set extras in compute instead of silently omitting contentHash', () => {
    const fullSet = createdArtifactSet();

    expect(() => computeAgentContextArtifactSetHash(fullSet)).toThrow(
      /agentContextArtifactSet\.contentHash.*not supported/u,
    );
  });
});
