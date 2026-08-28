import { describe, expect, it } from 'vitest';

import {
  AGENT_CONTEXT_JOURNEY_SCHEMA_ID,
  AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID,
  AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
  canonicalizeAgentContextJourneyCatalog,
  canonicalizeAgentContextSourceUsageCatalog,
  computeAgentContextJourneyCatalogHash,
  computeAgentContextSourceUsageCatalogHash,
  createAgentContextJourneyCatalog,
  createAgentContextSourceUsageCatalog,
  parseAgentContextJourneyCatalog,
  parseAgentContextSourceUsageCatalog,
  validateAgentContextUsageJourneyReferences,
  type AgentContextFormReference,
  type AgentContextJourney,
  type AgentContextJourneyCatalog,
  type AgentContextJourneyCatalogDraft,
  type AgentContextSourceUsage,
  type AgentContextSourceUsageCatalog,
  type AgentContextSourceUsageCatalogDraft,
  type AgentContextUsageReference,
} from './agent-context-usage.js';

const HASH_A = `sha256:${'a'.repeat(64)}` as const;
const HASH_B = `sha256:${'b'.repeat(64)}` as const;
const HASH_C = `sha256:${'c'.repeat(64)}` as const;

function declaredUsageReference(
  usageId = 'orders.new.stepper',
  version = 1
): AgentContextUsageReference {
  return { kind: 'declared', usageId, version };
}

function formReference(
  overrides: Partial<AgentContextFormReference> = {}
): AgentContextFormReference {
  return {
    projectId: 'orders-forms',
    formId: 'orders.entry',
    contractHash: HASH_A,
    ...overrides,
  };
}

function exactUsage(
  overrides: Partial<AgentContextSourceUsage> = {}
): AgentContextSourceUsage {
  return {
    identity: declaredUsageReference(),
    projectId: 'orders-app',
    invocation: {
      location: {
        kind: 'path',
        pathMode: 'workspace-relative',
        path: 'apps/orders/src/app/order-entry.page.ts',
        span: {
          start: { line: 42, column: 7 },
          end: { line: 42, column: 41 },
        },
      },
      symbol: {
        id: 'orders.OrderEntryPage.createForm',
        kind: 'method',
      },
      syntaxKind: 'construct',
      syntaxToken: {
        kind: 'ast-call-shape',
        version: 1,
        calleeForm: 'identifier',
        argumentCount: 1,
        typeArgumentCount: 0,
        optionalCall: false,
      },
      sourceFileHash: HASH_B,
    },
    resolution: {
      status: 'exact',
      candidate: {
        root: {
          projectId: 'orders-forms',
          rootAnchorId: 'orders.OrderEntryStepperForm',
        },
        form: formReference(),
        evidenceRefs: ['source.anchor', 'typescript.symbol'],
      },
    },
    contexts: [
      {
        kind: 'component',
        id: 'orders.OrderEntryPage',
        evidenceRefs: ['typescript.enclosing-symbol'],
      },
      {
        kind: 'route',
        id: 'orders.new',
        evidenceRefs: ['angular.route-candidate'],
      },
    ],
    evidenceRefs: ['source.direct-call'],
    ...overrides,
  };
}

function sourceUsageDraft(
  overrides: Partial<AgentContextSourceUsageCatalogDraft> = {}
): AgentContextSourceUsageCatalogDraft {
  return {
    schemaVersion: AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_VERSION,
    workspaceIndex: {
      schemaVersion: '0.2.0',
      contentHash: HASH_C,
    },
    coverage: {
      status: 'complete',
      scope: {
        projectIds: ['orders-app'],
        includedPurposes: ['application'],
        excludedPurposes: ['test'],
      },
      evidenceRefs: ['coverage.orders-app'],
    },
    usages: [exactUsage()],
    ...overrides,
  };
}

function createdSourceUsage(
  overrides: Partial<AgentContextSourceUsageCatalogDraft> = {}
): AgentContextSourceUsageCatalog {
  return createAgentContextSourceUsageCatalog(sourceUsageDraft(overrides));
}

function journey(
  overrides: Partial<AgentContextJourney> = {}
): AgentContextJourney {
  const usage = declaredUsageReference();
  const form = formReference();
  return {
    id: 'orders.new',
    version: 1,
    entry: {
      id: 'orders.new.open',
      usage,
      landingStepId: 'entry',
      evidenceRefs: ['journey.declared'],
    },
    steps: [
      {
        id: 'entry',
        ordinal: 0,
        label: 'Order details',
        forms: [form],
        usages: [usage],
        actionIds: ['continue'],
      },
      {
        id: 'review',
        ordinal: 1,
        label: 'Review',
        forms: [form],
        usages: [usage],
        actionIds: [],
      },
    ],
    actions: [
      {
        id: 'continue',
        kind: 'next',
        outcomeIds: ['entry-complete'],
        evidenceRefs: ['journey.declared'],
      },
    ],
    outcomes: [
      {
        id: 'entry-complete',
        kind: 'step-changed',
        evidenceRefs: ['journey.declared'],
      },
    ],
    transitions: [
      {
        id: 'entry-to-review',
        version: 1,
        fromStepId: 'entry',
        actionId: 'continue',
        outcomeId: 'entry-complete',
        toStepId: 'review',
        evidenceRefs: ['journey.declared'],
      },
    ],
    evidenceRefs: ['journey.orders-new'],
    ...overrides,
  };
}

function journeyDraft(
  overrides: Partial<AgentContextJourneyCatalogDraft> = {}
): AgentContextJourneyCatalogDraft {
  return {
    schemaVersion: AGENT_CONTEXT_JOURNEY_SCHEMA_VERSION,
    workspaceIndex: {
      schemaVersion: '0.2.0',
      contentHash: HASH_C,
    },
    journeys: [journey()],
    ...overrides,
  };
}

function createdJourney(
  overrides: Partial<AgentContextJourneyCatalogDraft> = {}
): AgentContextJourneyCatalog {
  return createAgentContextJourneyCatalog(journeyDraft(overrides));
}

function replaceOwnProperty(input: object, key: string, value: unknown): void {
  Object.defineProperty(input, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function deeplyNestedDataGraph(depth: number): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let cursor = root;
  for (let index = 0; index < depth; index += 1) {
    const next: Record<string, unknown> = {};
    cursor.next = next;
    cursor = next;
  }
  return root;
}

function expectBoundedTypeError(
  operation: () => unknown,
  expectedMessage: RegExp
): void {
  let thrown: unknown;
  try {
    operation();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(TypeError);
  expect(thrown).not.toBeInstanceOf(RangeError);
  expect(thrown instanceof Error ? thrown.message : '').toMatch(
    expectedMessage
  );
}

function catalogEntryOperations(extra: unknown): readonly (() => unknown)[] {
  const sourceDraftInput = { ...sourceUsageDraft(), unexpected: extra };
  const sourceCatalogInput = { ...createdSourceUsage(), unexpected: extra };
  const journeyDraftInput = { ...journeyDraft(), unexpected: extra };
  const journeyCatalogInput = { ...createdJourney(), unexpected: extra };

  return [
    () => createAgentContextSourceUsageCatalog(sourceDraftInput),
    () => computeAgentContextSourceUsageCatalogHash(sourceDraftInput),
    () => parseAgentContextSourceUsageCatalog(sourceCatalogInput),
    () => canonicalizeAgentContextSourceUsageCatalog(sourceCatalogInput),
    () => createAgentContextJourneyCatalog(journeyDraftInput),
    () => computeAgentContextJourneyCatalogHash(journeyDraftInput),
    () => parseAgentContextJourneyCatalog(journeyCatalogInput),
    () => canonicalizeAgentContextJourneyCatalog(journeyCatalogInput),
  ];
}

describe('agent context source-usage catalog identity', () => {
  it('exports canonical schema IDs for artifact-set integration', () => {
    expect(AGENT_CONTEXT_SOURCE_USAGE_SCHEMA_ID).toBe(
      'agent-context.source-usage'
    );
    expect(AGENT_CONTEXT_JOURNEY_SCHEMA_ID).toBe('agent-context.journey');
  });

  it('creates, parses, and canonicalizes an exact source usage', () => {
    const draft = sourceUsageDraft();
    const created = createAgentContextSourceUsageCatalog(draft);
    const canonical = canonicalizeAgentContextSourceUsageCatalog(created);
    const reparsed = parseAgentContextSourceUsageCatalog(JSON.parse(canonical));

    expect(created.contentHash).toBe(
      computeAgentContextSourceUsageCatalogHash(draft)
    );
    expect(created.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(reparsed).toEqual(created);
    expect(JSON.parse(canonical)).toEqual(created);
  });

  it('normalizes every set-like collection without mutating the caller', () => {
    const firstUsage = exactUsage({
      identity: declaredUsageReference('zeta.usage'),
      contexts: [...exactUsage().contexts].reverse(),
      evidenceRefs: ['zeta.evidence', 'alpha.evidence'],
    });
    const secondUsage = exactUsage({
      identity: declaredUsageReference('alpha.usage'),
      invocation: {
        ...exactUsage().invocation,
        location: { kind: 'opaque', fileId: 'opaque.orders-entry' },
      },
    });
    const draft = sourceUsageDraft({
      coverage: {
        status: 'incomplete',
        scope: {
          projectIds: ['zeta-app', 'orders-app'],
          includedPurposes: ['test', 'application'],
          excludedPurposes: ['tooling', 'library'],
        },
        reasons: ['coverage.unresolved-project', 'coverage.missing-program'],
        evidenceRefs: ['zeta.evidence', 'alpha.evidence'],
      },
      usages: [firstUsage, secondUsage],
    });
    const before = structuredClone(draft);
    const reversed = {
      ...draft,
      usages: [...draft.usages].reverse(),
    };

    const created = createAgentContextSourceUsageCatalog(draft);
    const other = createAgentContextSourceUsageCatalog(reversed);

    expect(draft).toEqual(before);
    expect(created).toEqual(other);
    expect(created.coverage.scope.projectIds).toEqual([
      'orders-app',
      'zeta-app',
    ]);
    expect(created.coverage.scope.includedPurposes).toEqual([
      'application',
      'test',
    ]);
    expect(created.usages.map(({ identity }) => identity)).toEqual([
      declaredUsageReference('alpha.usage'),
      declaredUsageReference('zeta.usage'),
    ]);
  });

  it('preserves exact, ambiguous, and unresolved resolution cardinality', () => {
    const ambiguous = exactUsage({
      identity: declaredUsageReference('orders.ambiguous'),
      resolution: {
        status: 'ambiguous',
        candidates: [
          {
            root: { projectId: 'zeta-forms', rootAnchorId: 'zeta.Root' },
            form: formReference({
              projectId: 'zeta-forms',
              formId: 'zeta.form',
              contractHash: HASH_B,
            }),
            evidenceRefs: ['typescript.symbol'],
          },
          {
            root: { projectId: 'alpha-forms', rootAnchorId: 'alpha.Root' },
            form: formReference({
              projectId: 'alpha-forms',
              formId: 'alpha.form',
            }),
            evidenceRefs: ['typescript.symbol'],
          },
        ],
      },
    });
    const unresolved = exactUsage({
      identity: declaredUsageReference('orders.unresolved'),
      resolution: {
        status: 'unresolved',
        reasons: ['source.unanchored', 'source.incomplete-program'],
      },
    });

    const created = createdSourceUsage({
      usages: [unresolved, ambiguous, exactUsage()],
    });

    expect(created.usages[0]?.resolution.status).toBe('ambiguous');
    expect(
      created.usages[0]?.resolution.status === 'ambiguous'
        ? created.usages[0].resolution.candidates.map(({ form }) => form.formId)
        : []
    ).toEqual(['alpha.form', 'zeta.form']);
    expect(created.usages[2]?.resolution).toEqual({
      status: 'unresolved',
      reasons: ['source.incomplete-program', 'source.unanchored'],
    });
  });

  it('supports path, module-only, and opaque source disclosure without source text', () => {
    const usages: readonly AgentContextSourceUsage[] = [
      exactUsage(),
      exactUsage({
        identity: declaredUsageReference('orders.module'),
        invocation: {
          ...exactUsage().invocation,
          location: {
            kind: 'module',
            moduleId: '@company/orders',
            exportName: 'OrderEntryPage',
          },
        },
      }),
      exactUsage({
        identity: {
          kind: 'callsite',
          projectId: 'orders-app',
          callsiteKey: 'sha256-callsite-0123',
        },
        invocation: {
          ...exactUsage().invocation,
          location: { kind: 'opaque', fileId: 'opaque.orders-entry' },
        },
      }),
    ];

    expect(createdSourceUsage({ usages }).usages).toHaveLength(3);
  });

  it('accepts only literal relative paths and bare package module specifiers', () => {
    const withPath = (path: string) =>
      exactUsage({
        invocation: {
          ...exactUsage().invocation,
          location: {
            kind: 'path',
            pathMode: 'workspace-relative',
            path,
            span: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 2 },
            },
          },
        },
      });
    for (const path of [
      'C:apps/orders.ts',
      'file:apps/orders.ts',
      'apps/**/*.ts',
      'apps/orders/{entry,review}.ts',
    ]) {
      expect(() => createdSourceUsage({ usages: [withPath(path)] })).toThrow(
        /location\.path.*relative POSIX path/u
      );
    }

    const withModule = (moduleId: string) =>
      exactUsage({
        invocation: {
          ...exactUsage().invocation,
          location: { kind: 'module', moduleId },
        },
      });
    expect(() =>
      createdSourceUsage({
        usages: [withModule('@company/orders/forms')],
      })
    ).not.toThrow();
    for (const moduleId of [
      '/private/orders',
      'C:orders',
      'file:///private/orders',
      '../orders',
      '@company/../orders',
      './orders',
      'https://example.test/orders',
      'export const secret = process.env.SECRET',
    ]) {
      expect(() =>
        createdSourceUsage({ usages: [withModule(moduleId)] })
      ).toThrow(/location\.moduleId.*package module specifier/u);
    }
  });

  it('uses a closed structural syntax token and rejects raw syntax text', () => {
    const invocation = exactUsage().invocation;
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            invocation: {
              location: invocation.location,
              symbol: invocation.symbol,
              syntaxKind: invocation.syntaxKind,
              syntaxToken: {
                kind: 'ast-call-shape',
                version: 1,
                calleeForm: 'identifier',
                argumentCount: 1,
                typeArgumentCount: 0,
                optionalCall: false,
              },
              sourceFileHash: invocation.sourceFileHash,
            },
          }),
        ],
      })
    ).not.toThrow();

    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            invocation: {
              ...invocation,
              syntaxFingerprint:
                'new OrderEntryStepperForm({ token: process.env.SECRET })',
            } as never,
          }),
        ],
      })
    ).toThrow(/invocation\.syntaxFingerprint.*not supported/u);

    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            invocation: {
              location: invocation.location,
              symbol: invocation.symbol,
              syntaxKind: invocation.syntaxKind,
              syntaxToken: {
                kind: 'ast-call-shape',
                version: 1,
                calleeForm: 'OrderEntry(secret)',
                argumentCount: 1,
                typeArgumentCount: 0,
                optionalCall: false,
              },
              sourceFileHash: invocation.sourceFileHash,
            } as never,
          }),
        ],
      })
    ).toThrow(/syntaxToken\.calleeForm/u);

    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            invocation: {
              ...invocation,
              syntaxToken: {
                ...invocation.syntaxToken,
                argumentText: 'process.env.SECRET',
              },
            } as never,
          }),
        ],
      })
    ).toThrow(/syntaxToken\.argumentText.*not supported/u);
  });

  it('uses domain-compatible project, form, and agent-context IDs', () => {
    const exact = exactUsage();
    if (exact.resolution.status !== 'exact') {
      throw new Error('test fixture must use exact resolution');
    }
    const compatible = exactUsage({
      identity: {
        kind: 'callsite',
        projectId: 'orders/app',
        callsiteKey: 'callsite.orders-entry',
      },
      projectId: 'orders/app',
      resolution: {
        status: 'exact',
        candidate: {
          root: {
            projectId: 'orders/forms',
            rootAnchorId: exact.resolution.candidate.root.rootAnchorId,
          },
          form: {
            projectId: 'orders/forms',
            formId: 'Orders[0]*%:Entry',
            contractHash: HASH_A,
          },
          evidenceRefs: ['typescript.symbol'],
        },
      },
    });
    expect(() =>
      createdSourceUsage({
        coverage: {
          status: 'complete',
          scope: {
            projectIds: ['orders/app'],
            includedPurposes: ['application'],
            excludedPurposes: [],
          },
          evidenceRefs: [],
        },
        usages: [compatible],
      })
    ).not.toThrow();

    expect(() =>
      createdSourceUsage({
        coverage: {
          status: 'complete',
          scope: {
            projectIds: ['OrdersApp'],
            includedPurposes: ['application'],
            excludedPurposes: [],
          },
          evidenceRefs: [],
        },
        usages: [exactUsage({ projectId: 'OrdersApp' })],
      })
    ).toThrow(/projectId.*lowercase workspace stable ID/u);
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            resolution: {
              status: 'exact',
              candidate: {
                root: {
                  projectId: 'orders-forms',
                  rootAnchorId: 'orders.OrderEntryStepperForm',
                },
                form: {
                  projectId: 'orders-forms',
                  formId: 'orders/entry',
                  contractHash: HASH_A,
                },
                evidenceRefs: ['typescript.symbol'],
              },
            },
          }),
        ],
      })
    ).toThrow(/formId.*Form Contract stable identifier/u);
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            identity: declaredUsageReference('orders/entry'),
          }),
        ],
      })
    ).toThrow(/usageId.*agent-context identifier/u);
  });

  it('orders declared usage versions numerically', () => {
    const created = createdSourceUsage({
      usages: [
        exactUsage({ identity: declaredUsageReference('orders.entry', 10) }),
        exactUsage({ identity: declaredUsageReference('orders.entry', 2) }),
      ],
    });
    expect(
      created.usages.map(({ identity }) =>
        identity.kind === 'declared' ? identity.version : undefined
      )
    ).toEqual([2, 10]);
  });

  it('normalizes negative-zero invocation arities before hashing and round-trip parsing', () => {
    const negativeZeroDraft = sourceUsageDraft({
      usages: [
        exactUsage({
          invocation: {
            ...exactUsage().invocation,
            syntaxToken: {
              ...exactUsage().invocation.syntaxToken,
              argumentCount: -0,
              typeArgumentCount: -0,
            },
          },
        }),
      ],
    });
    const positiveZeroDraft = sourceUsageDraft({
      usages: [
        exactUsage({
          invocation: {
            ...exactUsage().invocation,
            syntaxToken: {
              ...exactUsage().invocation.syntaxToken,
              argumentCount: 0,
              typeArgumentCount: 0,
            },
          },
        }),
      ],
    });

    const created = createAgentContextSourceUsageCatalog(negativeZeroDraft);
    const parseInput = structuredClone(created) as {
      usages: {
        invocation: {
          syntaxToken: { argumentCount: number; typeArgumentCount: number };
        };
      }[];
    } & AgentContextSourceUsageCatalog;
    parseInput.usages[0]!.invocation.syntaxToken.argumentCount = -0;
    parseInput.usages[0]!.invocation.syntaxToken.typeArgumentCount = -0;
    const parsed = parseAgentContextSourceUsageCatalog(parseInput);
    const reparsed = parseAgentContextSourceUsageCatalog(
      JSON.parse(canonicalizeAgentContextSourceUsageCatalog(parseInput))
    );

    expect(computeAgentContextSourceUsageCatalogHash(negativeZeroDraft)).toBe(
      computeAgentContextSourceUsageCatalogHash(positiveZeroDraft)
    );
    for (const catalog of [created, parsed, reparsed]) {
      expect(
        Object.is(catalog.usages[0]!.invocation.syntaxToken.argumentCount, -0)
      ).toBe(false);
      expect(
        Object.is(
          catalog.usages[0]!.invocation.syntaxToken.typeArgumentCount,
          -0
        )
      ).toBe(false);
    }
  });

  it('returns detached ordinary data after create and parse', () => {
    const draft = sourceUsageDraft();
    const created = createAgentContextSourceUsageCatalog(draft);
    const parseInput = structuredClone(created);
    const parsed = parseAgentContextSourceUsageCatalog(parseInput);
    const createdCanonical =
      canonicalizeAgentContextSourceUsageCatalog(created);
    const parsedCanonical = canonicalizeAgentContextSourceUsageCatalog(parsed);

    (draft.usages as AgentContextSourceUsage[]).push(
      exactUsage({ identity: declaredUsageReference('mutated.usage') })
    );
    (parseInput.usages[0] as { projectId: string }).projectId = 'mutated-app';

    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    expect(canonicalizeAgentContextSourceUsageCatalog(created)).toBe(
      createdCanonical
    );
    expect(canonicalizeAgentContextSourceUsageCatalog(parsed)).toBe(
      parsedCanonical
    );
  });
});

describe('agent context source-usage strict semantics', () => {
  it.each(['0.0.9', '0.2.0'])(
    'rejects unsupported version %s',
    (schemaVersion) => {
      expect(() =>
        createAgentContextSourceUsageCatalog({
          ...sourceUsageDraft(),
          schemaVersion,
        } as never)
      ).toThrow(
        /agentContextSourceUsageCatalog\.schemaVersion.*must be 0\.1\.0/u
      );
    }
  );

  it('rejects unknown and missing properties at nested levels', () => {
    expect(() =>
      createAgentContextSourceUsageCatalog({
        ...sourceUsageDraft(),
        contentHash: HASH_A,
      } as never)
    ).toThrow(/agentContextSourceUsageCatalog\.contentHash.*not supported/u);
    expect(() =>
      createAgentContextSourceUsageCatalog({
        ...sourceUsageDraft(),
        usages: [
          {
            ...exactUsage(),
            route: '/orders/new',
          } as never,
        ],
      })
    ).toThrow(/usages\[0\]\.route.*not supported/u);
    const missingSourceHash = structuredClone(exactUsage().invocation) as {
      sourceFileHash?: string;
    };
    delete missingSourceHash.sourceFileHash;
    expect(() =>
      createAgentContextSourceUsageCatalog({
        ...sourceUsageDraft(),
        usages: [
          {
            ...exactUsage(),
            invocation: missingSourceHash,
          },
        ],
      } as never)
    ).toThrow(/invocation\.sourceFileHash.*required/u);
  });

  it('requires honest coverage and disjoint purpose scopes', () => {
    expect(() =>
      createAgentContextSourceUsageCatalog(
        sourceUsageDraft({
          coverage: {
            status: 'incomplete',
            scope: {
              projectIds: ['orders-app'],
              includedPurposes: ['application'],
              excludedPurposes: [],
            },
            reasons: [],
            evidenceRefs: [],
          },
        })
      )
    ).toThrow(/coverage\.reasons.*at least one/u);
    expect(() =>
      createAgentContextSourceUsageCatalog(
        sourceUsageDraft({
          coverage: {
            status: 'complete',
            scope: {
              projectIds: ['orders-app'],
              includedPurposes: ['application'],
              excludedPurposes: ['application'],
            },
            evidenceRefs: [],
          },
        })
      )
    ).toThrow(/coverage\.scope.*both included and excluded/u);
    expect(() =>
      createAgentContextSourceUsageCatalog(
        sourceUsageDraft({
          coverage: {
            status: 'complete',
            scope: {
              projectIds: ['orders-app'],
              includedPurposes: [],
              excludedPurposes: [],
            },
            evidenceRefs: [],
          },
        })
      )
    ).toThrow(/includedPurposes.*at least one/u);
  });

  it('rejects false ambiguous/unresolved cardinality and duplicate candidates', () => {
    const base = exactUsage();
    const candidate =
      base.resolution.status === 'exact'
        ? base.resolution.candidate
        : undefined;
    expect(candidate).toBeDefined();

    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            resolution: {
              status: 'ambiguous',
              candidates: [candidate!],
            },
          }),
        ],
      })
    ).toThrow(/resolution\.candidates.*at least two/u);
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            resolution: {
              status: 'ambiguous',
              candidates: [candidate!, candidate!],
            },
          }),
        ],
      })
    ).toThrow(/resolution\.candidates\[1\].*duplicate/u);
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            resolution: { status: 'unresolved', reasons: [] },
          }),
        ],
      })
    ).toThrow(/resolution\.reasons.*at least one/u);
  });

  it('requires an exact root/form project join and scoped consuming project', () => {
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            resolution: {
              status: 'exact',
              candidate: {
                root: {
                  projectId: 'other-forms',
                  rootAnchorId: 'orders.OrderEntryStepperForm',
                },
                form: formReference(),
                evidenceRefs: ['typescript.symbol'],
              },
            },
          }),
        ],
      })
    ).toThrow(/candidate\.root\.projectId.*form\.projectId/u);

    expect(() =>
      createdSourceUsage({
        coverage: {
          status: 'complete',
          scope: {
            projectIds: ['another-app'],
            includedPurposes: ['application'],
            excludedPurposes: [],
          },
          evidenceRefs: [],
        },
      })
    ).toThrow(/usages\[0\]\.projectId.*coverage\.scope\.projectIds/u);
  });

  it('rejects duplicate usage/context/evidence identities and callsite project mismatches', () => {
    expect(() =>
      createdSourceUsage({ usages: [exactUsage(), exactUsage()] })
    ).toThrow(/usages\[1\].*duplicate usage identity/u);
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            contexts: [exactUsage().contexts[0]!, exactUsage().contexts[0]!],
          }),
        ],
      })
    ).toThrow(/contexts\[1\].*duplicate context/u);
    expect(() =>
      createdSourceUsage({
        usages: [exactUsage({ evidenceRefs: ['same.ref', 'same.ref'] })],
      })
    ).toThrow(/evidenceRefs\[1\].*duplicate/u);
    expect(() =>
      createdSourceUsage({
        usages: [
          exactUsage({
            identity: {
              kind: 'callsite',
              projectId: 'another-app',
              callsiteKey: 'callsite.1',
            },
          }),
        ],
      })
    ).toThrow(/identity\.projectId.*must equal.*projectId/u);
  });

  it('rejects unsafe source paths and invalid spans', () => {
    const withPath = (path: string) =>
      exactUsage({
        invocation: {
          ...exactUsage().invocation,
          location: {
            kind: 'path',
            pathMode: 'workspace-relative',
            path,
            span: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 2 },
            },
          },
        },
      });

    for (const path of [
      '/absolute/file.ts',
      '../secret.ts',
      'apps/../secret.ts',
      'apps\\orders.ts',
      'C:/orders.ts',
    ]) {
      expect(() => createdSourceUsage({ usages: [withPath(path)] })).toThrow(
        /location\.path.*relative POSIX path/u
      );
    }

    const backwards = withPath('apps/orders.ts');
    const backwardsLocation = backwards.invocation.location;
    if (backwardsLocation.kind !== 'path') {
      throw new Error('test fixture must use path disclosure');
    }
    expect(() =>
      createdSourceUsage({
        usages: [
          {
            ...backwards,
            invocation: {
              ...backwards.invocation,
              location: {
                ...backwardsLocation,
                span: {
                  start: { line: 2, column: 1 },
                  end: { line: 1, column: 99 },
                },
              },
            },
          },
        ],
      })
    ).toThrow(/location\.span\.end.*before.*start/u);
  });

  it('requires canonical order when parsing a full artifact', () => {
    const first = exactUsage({
      identity: declaredUsageReference('alpha.usage'),
    });
    const second = exactUsage({
      identity: declaredUsageReference('zeta.usage'),
    });
    const canonical = createdSourceUsage({ usages: [first, second] });
    const reversed = { ...canonical, usages: [...canonical.usages].reverse() };

    expect(() => parseAgentContextSourceUsageCatalog(reversed)).toThrow(
      /usages.*canonical order/u
    );
  });

  it('rejects a verified source-usage hash after causal mutation', () => {
    const baseline = createdSourceUsage();
    const mutations: readonly AgentContextSourceUsageCatalog[] = [
      {
        ...baseline,
        workspaceIndex: { ...baseline.workspaceIndex, contentHash: HASH_A },
      },
      {
        ...baseline,
        coverage: {
          ...baseline.coverage,
          evidenceRefs: ['coverage.changed'],
        },
      },
      {
        ...baseline,
        usages: [
          {
            ...baseline.usages[0]!,
            invocation: {
              ...baseline.usages[0]!.invocation,
              syntaxToken: {
                ...baseline.usages[0]!.invocation.syntaxToken,
                argumentCount: 2,
              },
            },
          },
        ],
      },
    ];

    for (const mutation of mutations) {
      expect(() => parseAgentContextSourceUsageCatalog(mutation)).toThrow(
        /contentHash.*does not match/u
      );
    }
  });
});

describe('agent context journey catalog identity and integrity', () => {
  it('creates, parses, and canonicalizes an exact multi-step journey', () => {
    const draft = journeyDraft();
    const created = createAgentContextJourneyCatalog(draft);
    const canonical = canonicalizeAgentContextJourneyCatalog(created);
    const reparsed = parseAgentContextJourneyCatalog(JSON.parse(canonical));

    expect(created.contentHash).toBe(
      computeAgentContextJourneyCatalogHash(draft)
    );
    expect(reparsed).toEqual(created);
    expect(JSON.parse(canonical)).toEqual(created);
  });

  it('normalizes nested sets while preserving ordinal step order', () => {
    const source = journey();
    const reversed = journey({
      steps: [...source.steps].reverse(),
      actions: [...source.actions].reverse(),
      outcomes: [...source.outcomes].reverse(),
      transitions: [...source.transitions].reverse(),
      evidenceRefs: ['zeta.evidence', 'alpha.evidence'],
    });

    const created = createdJourney({ journeys: [reversed] });

    expect(created.journeys[0]?.steps.map(({ id }) => id)).toEqual([
      'entry',
      'review',
    ]);
    expect(created.journeys[0]?.evidenceRefs).toEqual([
      'alpha.evidence',
      'zeta.evidence',
    ]);
  });

  it('orders journey and transition versions numerically', () => {
    const source = journey();
    const withVersionedTransitions = journey({
      steps: source.steps.map((step) =>
        step.id === 'review'
          ? { ...step, actionIds: ['return-to-entry'] }
          : step
      ),
      actions: [
        ...source.actions,
        {
          id: 'return-to-entry',
          kind: 'other',
          outcomeIds: ['review-complete'],
          evidenceRefs: [],
        },
      ],
      outcomes: [
        ...source.outcomes,
        {
          id: 'review-complete',
          kind: 'step-changed',
          evidenceRefs: [],
        },
      ],
      transitions: [
        {
          id: 'orders.step-transition',
          version: 10,
          fromStepId: 'review',
          actionId: 'return-to-entry',
          outcomeId: 'review-complete',
          toStepId: 'entry',
          evidenceRefs: [],
        },
        {
          ...source.transitions[0]!,
          id: 'orders.step-transition',
          version: 2,
        },
      ],
    });
    const created = createdJourney({
      journeys: [
        { ...withVersionedTransitions, version: 10 },
        { ...withVersionedTransitions, version: 2 },
      ],
    });

    expect(created.journeys.map(({ version }) => version)).toEqual([2, 10]);
    expect(
      created.journeys[0]?.transitions.map(({ version }) => version)
    ).toEqual([2, 10]);
  });

  it('normalizes negative-zero step ordinals before hashing and round-trip parsing', () => {
    const source = journey();
    const negativeZeroDraft = journeyDraft({
      journeys: [
        {
          ...source,
          steps: source.steps.map((step) =>
            step.id === 'entry' ? { ...step, ordinal: -0 } : step
          ),
        },
      ],
    });
    const positiveZeroDraft = journeyDraft();

    const created = createAgentContextJourneyCatalog(negativeZeroDraft);
    const parseInput = structuredClone(created) as {
      journeys: { steps: { ordinal: number }[] }[];
    } & AgentContextJourneyCatalog;
    parseInput.journeys[0]!.steps[0]!.ordinal = -0;
    const parsed = parseAgentContextJourneyCatalog(parseInput);
    const reparsed = parseAgentContextJourneyCatalog(
      JSON.parse(canonicalizeAgentContextJourneyCatalog(parseInput))
    );

    expect(computeAgentContextJourneyCatalogHash(negativeZeroDraft)).toBe(
      computeAgentContextJourneyCatalogHash(positiveZeroDraft)
    );
    for (const catalog of [created, parsed, reparsed]) {
      expect(Object.is(catalog.journeys[0]!.steps[0]!.ordinal, -0)).toBe(false);
    }
  });

  it.each([
    {
      name: 'missing landing step',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        entry: { ...value.entry, landingStepId: 'missing' },
      }),
      error: /entry\.landingStepId.*declared step/u,
    },
    {
      name: 'entry usage outside landing step',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        steps: value.steps.map((step) =>
          step.id === 'entry' ? { ...step, usages: [] } : step
        ),
      }),
      error: /entry\.usage.*landing step/u,
    },
    {
      name: 'missing step action',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        steps: value.steps.map((step) =>
          step.id === 'entry'
            ? { ...step, actionIds: ['missing-action'] }
            : step
        ),
      }),
      error: /actionIds\[0\].*declared action/u,
    },
    {
      name: 'missing action outcome',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        actions: value.actions.map((action) => ({
          ...action,
          outcomeIds: ['missing-outcome'],
        })),
      }),
      error: /outcomeIds\[0\].*declared outcome/u,
    },
    {
      name: 'same-step transition',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        transitions: value.transitions.map((transition) => ({
          ...transition,
          toStepId: transition.fromStepId,
        })),
      }),
      error: /toStepId.*must differ.*fromStepId/u,
    },
    {
      name: 'transition with non-step outcome',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        outcomes: value.outcomes.map((outcome) => ({
          ...outcome,
          kind: 'message' as const,
        })),
      }),
      error: /outcomeId.*step-changed/u,
    },
    {
      name: 'missing transition source step',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        transitions: value.transitions.map((transition) => ({
          ...transition,
          fromStepId: 'missing',
        })),
      }),
      error: /fromStepId.*declared step/u,
    },
    {
      name: 'transition action owned by another step',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        transitions: value.transitions.map((transition) => ({
          ...transition,
          fromStepId: 'review',
          toStepId: 'entry',
        })),
      }),
      error: /actionId.*belong.*fromStepId/u,
    },
    {
      name: 'step-changed outcome without a transition',
      mutate: (value: AgentContextJourney) => ({
        ...value,
        transitions: [],
      }),
      error: /outcomes\[0\]\.id.*exactly one transition/u,
    },
  ])('rejects $name', ({ mutate, error }) => {
    expect(() => createdJourney({ journeys: [mutate(journey())] })).toThrow(
      error
    );
  });

  it('rejects actions or outcomes owned by multiple parents', () => {
    const source = journey();
    expect(() =>
      createdJourney({
        journeys: [
          {
            ...source,
            steps: source.steps.map((step) => ({
              ...step,
              actionIds: ['continue'],
            })),
          },
        ],
      })
    ).toThrow(/actionIds\[0\].*already belongs to step/u);

    expect(() =>
      createdJourney({
        journeys: [
          {
            ...source,
            actions: [
              ...source.actions,
              {
                id: 'other-action',
                kind: 'other',
                outcomeIds: ['entry-complete'],
                evidenceRefs: [],
              },
            ],
          },
        ],
      })
    ).toThrow(/outcomeIds\[0\].*already belongs to action/u);
  });

  it('rejects unowned actions and outcomes and cross-action transitions', () => {
    const source = journey();
    expect(() =>
      createdJourney({
        journeys: [
          {
            ...source,
            actions: [
              ...source.actions,
              {
                id: 'unowned-action',
                kind: 'other',
                outcomeIds: ['unowned-action-outcome'],
                evidenceRefs: [],
              },
            ],
            outcomes: [
              ...source.outcomes,
              {
                id: 'unowned-action-outcome',
                kind: 'message',
                evidenceRefs: [],
              },
            ],
          },
        ],
      })
    ).toThrow(/actions\[1\]\.id.*exactly one declared step/u);

    expect(() =>
      createdJourney({
        journeys: [
          {
            ...source,
            outcomes: [
              ...source.outcomes,
              { id: 'unowned-outcome', kind: 'message', evidenceRefs: [] },
            ],
          },
        ],
      })
    ).toThrow(/outcomes\[1\]\.id.*exactly one declared action/u);

    expect(() =>
      createdJourney({
        journeys: [
          {
            ...source,
            steps: source.steps.map((step) =>
              step.id === 'review'
                ? { ...step, actionIds: ['other-action'] }
                : step
            ),
            actions: [
              ...source.actions,
              {
                id: 'other-action',
                kind: 'other',
                outcomeIds: ['other-outcome'],
                evidenceRefs: [],
              },
            ],
            outcomes: [
              ...source.outcomes,
              {
                id: 'other-outcome',
                kind: 'step-changed',
                evidenceRefs: [],
              },
            ],
            transitions: source.transitions.map((transition) => ({
              ...transition,
              outcomeId: 'other-outcome',
            })),
          },
        ],
      })
    ).toThrow(/outcomeId.*belong.*actionId/u);
  });

  it('rejects duplicate transition identity and semantic tuple', () => {
    const source = journey();
    const transition = source.transitions[0]!;
    expect(() =>
      createdJourney({
        journeys: [{ ...source, transitions: [transition, transition] }],
      })
    ).toThrow(/transitions\[1\].*duplicate transition identity/u);
    expect(() =>
      createdJourney({
        journeys: [
          {
            ...source,
            transitions: [
              transition,
              { ...transition, id: 'same-semantic-transition' },
            ],
          },
        ],
      })
    ).toThrow(/transitions\[1\].*duplicate transition tuple/u);
  });

  it('rejects unknown versions, properties, non-canonical order, and hash mutation', () => {
    expect(() =>
      createAgentContextJourneyCatalog({
        ...journeyDraft(),
        schemaVersion: '0.2.0',
      } as never)
    ).toThrow(/agentContextJourneyCatalog\.schemaVersion.*must be 0\.1\.0/u);
    expect(() =>
      createAgentContextJourneyCatalog({
        ...journeyDraft(),
        journeys: [{ ...journey(), route: '/orders' } as never],
      })
    ).toThrow(/journeys\[0\]\.route.*not supported/u);

    const second = journey({ id: 'zeta.journey' });
    const canonical = createdJourney({ journeys: [journey(), second] });
    expect(() =>
      parseAgentContextJourneyCatalog({
        ...canonical,
        journeys: [...canonical.journeys].reverse(),
      })
    ).toThrow(/journeys.*canonical order/u);
    expect(() =>
      parseAgentContextJourneyCatalog({
        ...canonical,
        workspaceIndex: { ...canonical.workspaceIndex, contentHash: HASH_A },
      })
    ).toThrow(/contentHash.*does not match/u);
  });
});

describe('agent context usage/journey cross-catalog integrity', () => {
  it('accepts exact declared and build-scoped callsite usage references', () => {
    const declaredCatalog = createdSourceUsage();
    const declaredJourney = createdJourney();
    expect(() =>
      validateAgentContextUsageJourneyReferences(
        declaredCatalog,
        declaredJourney
      )
    ).not.toThrow();

    const callsite: AgentContextUsageReference = {
      kind: 'callsite',
      projectId: 'orders-app',
      callsiteKey: 'callsite.orders-entry',
    };
    const callsiteUsage = exactUsage({ identity: callsite });
    const callsiteJourney = journey({
      entry: { ...journey().entry, usage: callsite },
      steps: journey().steps.map((step) => ({
        ...step,
        usages: [callsite],
      })),
    });

    expect(() =>
      validateAgentContextUsageJourneyReferences(
        createdSourceUsage({ usages: [callsiteUsage] }),
        createdJourney({ journeys: [callsiteJourney] })
      )
    ).not.toThrow();
  });

  it('rejects mixed workspace bases and missing usage references', () => {
    expect(() =>
      validateAgentContextUsageJourneyReferences(
        createdSourceUsage(),
        createdJourney({
          workspaceIndex: { schemaVersion: '0.2.0', contentHash: HASH_A },
        })
      )
    ).toThrow(/workspaceIndex.*same exact basis/u);

    const missing = declaredUsageReference('missing.usage');
    const missingJourney = journey({
      entry: { ...journey().entry, usage: missing },
      steps: journey().steps.map((step) => ({
        ...step,
        usages: [missing],
      })),
    });
    expect(() =>
      validateAgentContextUsageJourneyReferences(
        createdSourceUsage(),
        createdJourney({ journeys: [missingJourney] })
      )
    ).toThrow(/journeys\[0\].*usage.*source-usage catalog/u);
  });

  it('never reports absence from incomplete coverage as authoritative', () => {
    const missing = declaredUsageReference('missing.usage');
    const missingJourney = journey({
      entry: { ...journey().entry, usage: missing },
      steps: journey().steps.map((step) => ({
        ...step,
        usages: [missing],
      })),
    });
    expect(() =>
      validateAgentContextUsageJourneyReferences(
        createdSourceUsage({
          coverage: {
            status: 'incomplete',
            scope: {
              projectIds: ['orders-app'],
              includedPurposes: ['application'],
              excludedPurposes: ['test'],
            },
            reasons: ['coverage.partial-program'],
            evidenceRefs: [],
          },
        }),
        createdJourney({ journeys: [missingJourney] })
      )
    ).toThrow(/coverage is incomplete.*not an authoritative negative/iu);
  });

  it.each(['ambiguous', 'unresolved'] as const)(
    'rejects a journey reference to an %s usage',
    (status) => {
      const base = exactUsage();
      const candidate =
        base.resolution.status === 'exact'
          ? base.resolution.candidate
          : undefined;
      const resolution =
        status === 'ambiguous'
          ? {
              status,
              candidates: [
                candidate!,
                {
                  ...candidate!,
                  form: formReference({
                    formId: 'orders.alternate',
                    contractHash: HASH_B,
                  }),
                },
              ],
            }
          : { status, reasons: ['source.unresolved'] };

      expect(() =>
        validateAgentContextUsageJourneyReferences(
          createdSourceUsage({
            usages: [exactUsage({ resolution })],
          }),
          createdJourney()
        )
      ).toThrow(/journeys\[0\].*usage.*must resolve exactly/u);
    }
  );

  it('rejects a journey step whose form does not match its exact usage', () => {
    const source = journey();
    const wrongForm = formReference({
      formId: 'orders.other',
      contractHash: HASH_B,
    });
    expect(() =>
      validateAgentContextUsageJourneyReferences(
        createdSourceUsage(),
        createdJourney({
          journeys: [
            {
              ...source,
              steps: source.steps.map((step) => ({
                ...step,
                forms: [wrongForm],
              })),
            },
          ],
        })
      )
    ).toThrow(/journeys\[0\].*forms.*exact usage form/u);
  });
});

describe('agent context usage/journey data-only parsing', () => {
  it('rejects a 20,000-level malformed extra with TypeError at every public catalog entry point', () => {
    const deepExtra = deeplyNestedDataGraph(20_000);

    for (const operation of catalogEntryOperations(deepExtra)) {
      expectBoundedTypeError(operation, /maximum data graph depth of 128/u);
    }
  });

  it('rejects malformed graphs over the 100,000-node budget at every public catalog entry point', () => {
    const oversizedExtra = Array.from({ length: 100_001 }, () => null);

    for (const operation of catalogEntryOperations(oversizedExtra)) {
      expectBoundedTypeError(
        operation,
        /maximum data graph node count of 100000/u
      );
    }
  });

  it('rejects symbols, accessors, sparse arrays, exotic objects, and cycles', () => {
    const symbolKeyed = sourceUsageDraft() as unknown as Record<
      string | symbol,
      unknown
    >;
    symbolKeyed[Symbol('hidden')] = 'data';
    expect(() =>
      createAgentContextSourceUsageCatalog(symbolKeyed as never)
    ).toThrow(/agentContextSourceUsageCatalog.*symbol-keyed/u);

    const accessor = sourceUsageDraft();
    let getterCalls = 0;
    Object.defineProperty(accessor.usages[0]!, 'projectId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'orders-app';
      },
    });
    expect(() => createAgentContextSourceUsageCatalog(accessor)).toThrow(
      /usages\[0\]\.projectId.*data property/u
    );
    expect(getterCalls).toBe(0);

    const sparse = new Array(1);
    expect(() =>
      createAgentContextJourneyCatalog(journeyDraft({ journeys: sparse }))
    ).toThrow(/journeys\[0\].*sparse/u);

    expect(() =>
      createAgentContextSourceUsageCatalog(
        Object.assign(new (class UsageCatalog {})(), sourceUsageDraft())
      )
    ).toThrow(/agentContextSourceUsageCatalog.*plain object/u);

    const cyclic = journeyDraft() as unknown as Record<string, unknown>;
    replaceOwnProperty(cyclic, 'workspaceIndex', cyclic);
    expect(() => createAgentContextJourneyCatalog(cyclic as never)).toThrow(
      /agentContextJourneyCatalog\.workspaceIndex.*cycle/u
    );
  });

  it('rejects prototype-disguised built-ins and detectable proxies', () => {
    const disguised = Object.assign(
      new URL('https://example.test'),
      sourceUsageDraft()
    );
    Object.setPrototypeOf(disguised, null);
    expect(() =>
      createAgentContextSourceUsageCatalog(disguised as never)
    ).toThrow(/agentContextSourceUsageCatalog.*plain JSON data/u);

    let reflectiveTraps = 0;
    const proxiedJourneys = new Proxy([journey()], {
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
      createAgentContextJourneyCatalog(
        journeyDraft({ journeys: proxiedJourneys })
      )
    ).toThrow(/agentContextJourneyCatalog\.journeys.*proxy/u);
    expect(reflectiveTraps).toBe(0);
  });
});
