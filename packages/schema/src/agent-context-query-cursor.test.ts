import { describe, expect, it, vi } from 'vitest';

import {
  AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS,
  createAgentContextQueryCursor,
  parseAgentContextQueryCursor,
} from './agent-context-query-cursor.js';
import {
  AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
  type AgentContextQuerySelection,
  type AgentContextUsageSearchScope,
} from './agent-context-query.js';

const HASH_A = `sha256:${'a'.repeat(64)}` as const;
const HASH_B = `sha256:${'b'.repeat(64)}` as const;
const HASH_C = `sha256:${'c'.repeat(64)}` as const;
const HASH_D = `sha256:${'d'.repeat(64)}` as const;
const HASH_E = `sha256:${'e'.repeat(64)}` as const;
const HASH_F = `sha256:${'f'.repeat(64)}` as const;
const NOW = 1_788_000_000_000;
const SECRET = 'cursor-test-signing-material-32bytes';

function selection(
  overrides: Partial<AgentContextQuerySelection> = {},
): AgentContextQuerySelection {
  const basis = { formId: 'orders.entry', contractHash: HASH_D } as const;
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: { schemaVersion: '0.1.0', contentHash: HASH_A },
    workspaceIndex: { schemaVersion: '0.2.0', contentHash: HASH_B },
    owners: {
      sourceUsageCatalog: {
        schemaId: 'agent-context.source-usage',
        schemaVersion: '0.1.0',
        contentHash: HASH_C,
      },
      journeyCatalog: {
        schemaId: 'agent-context.journey',
        schemaVersion: '0.1.0',
        contentHash: HASH_E,
      },
      formContract: {
        schemaId: 'formly-contract.form-contract',
        schemaVersion: '0.4.0',
        contentHash: HASH_D,
      },
      scenarioArtifact: {
        schemaId: 'formly-contract.form-contract',
        schemaVersion: '0.4.0',
        contentHash: HASH_F,
      },
      executionAuthority: {
        schemaId: 'agent-context.execution-authority',
        schemaVersion: '0.1.0',
        contentHash: HASH_A,
      },
    },
    usage: { kind: 'declared', usageId: 'orders.new', version: 1 },
    journey: { id: 'orders.new', version: 1 },
    form: { projectId: 'orders-app', ...basis },
    scenario: {
      id: 'orders.ready',
      version: 1,
      artifactHash: HASH_F,
      basis,
    },
    executionAuthority: {
      usageId: 'orders.new',
      usageVersion: 1,
      basis,
    },
    ...overrides,
  };
}

function nodesQuery(
  querySelection: AgentContextQuerySelection = selection(),
  include: readonly ('constraints' | 'domain' | 'interaction')[] = [
    'constraints',
    'interaction',
  ],
) {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'find-form-nodes',
    selection: querySelection,
    withinStepId: 'entry',
    filters: { semanticType: 'single-choice' },
    include,
    page: { collection: 'nodes', limit: 25 },
  } as const;
}

function contextDiagnosticsQuery() {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'get-form-context',
    selection: selection(),
    view: 'diagnostics',
    page: { collection: 'diagnostics', limit: 25 },
  } as const;
}

function usageSearchScope(
  sourceHash: AgentContextUsageSearchScope['sourceUsageCatalogs'][number]['contentHash'] =
    HASH_C,
): AgentContextUsageSearchScope {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    artifactSet: { schemaVersion: '0.1.0', contentHash: HASH_A },
    workspaceIndex: { schemaVersion: '0.2.0', contentHash: HASH_B },
    sourceUsageCatalogs: [
      {
        schemaId: 'agent-context.source-usage',
        schemaVersion: '0.1.0',
        contentHash: sourceHash,
      },
    ],
  };
}

function usageSearchQuery(
  scope: AgentContextUsageSearchScope = usageSearchScope(),
) {
  return {
    schemaVersion: AGENT_CONTEXT_QUERY_SCHEMA_VERSION,
    operation: 'search-form-usages',
    scope,
    filters: { text: 'orders' },
    page: { collection: 'candidates', limit: 25 },
  } as const;
}

function createCursor(
  overrides: Partial<Parameters<typeof createAgentContextQueryCursor>[0]> = {},
): string {
  return createAgentContextQueryCursor({
    collection: 'nodes',
    query: nodesQuery(),
    position: 25,
    now: NOW,
    ttlMs: 60_000,
    signingMaterial: SECRET,
    ...overrides,
  });
}

function continueCursor(
  cursor: string,
  overrides: Partial<Parameters<typeof parseAgentContextQueryCursor>[0]> = {},
) {
  return parseAgentContextQueryCursor({
    cursor,
    collection: 'nodes',
    query: nodesQuery(),
    now: NOW + 1,
    signingMaterial: SECRET,
    ...overrides,
  });
}

describe('opaque agent-context query cursors', () => {
  it('is deterministic for fixed inputs and returns only bounded continuation state', () => {
    const first = createCursor();
    const second = createCursor();

    expect(first).toBe(second);
    expect(first).toMatch(/^acq1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
    expect(continueCursor(first)).toEqual({ position: 25 });
  });

  it('uses only caller-supplied time and expires at the exact boundary', () => {
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('wall clock must not be read');
    });
    try {
      const cursor = createCursor({ ttlMs: 10 });
      expect(continueCursor(cursor, { now: NOW + 9 })).toEqual({
        position: 25,
      });
      expect(() => continueCursor(cursor, { now: NOW + 10 })).toThrow(
        /cursor.*invalid|invalid.*cursor/iu,
      );
    } finally {
      dateNow.mockRestore();
    }
  });

  it('refuses collection, normalized-query, context, and include-scope replay', () => {
    const cursor = createCursor();

    expect(() =>
      continueCursor(cursor, {
        collection: 'diagnostics',
        query: contextDiagnosticsQuery(),
      }),
    ).toThrow(/cursor.*invalid|invalid.*cursor/iu);
    expect(() =>
      continueCursor(cursor, {
        query: {
          ...nodesQuery(),
          filters: { semanticType: 'decimal-currency' },
        },
      }),
    ).toThrow(/cursor.*invalid|invalid.*cursor/iu);
    expect(() =>
      continueCursor(cursor, {
        query: nodesQuery(
          selection({
            artifactSet: { schemaVersion: '0.1.0', contentHash: HASH_B },
          }),
        ),
      }),
    ).toThrow(/cursor.*invalid|invalid.*cursor/iu);
    expect(() =>
      continueCursor(cursor, {
        query: nodesQuery(selection(), ['constraints', 'domain']),
      }),
    ).toThrow(/cursor.*invalid|invalid.*cursor/iu);
  });

  it('binds usage-search cursors to the exact multi-catalog search scope', () => {
    const cursor = createAgentContextQueryCursor({
      collection: 'candidates',
      query: usageSearchQuery(),
      position: 25,
      now: NOW,
      ttlMs: 60_000,
      signingMaterial: SECRET,
    });

    expect(
      parseAgentContextQueryCursor({
        cursor,
        collection: 'candidates',
        query: usageSearchQuery(),
        now: NOW + 1,
        signingMaterial: SECRET,
      }),
    ).toEqual({ position: 25 });
    expect(() =>
      parseAgentContextQueryCursor({
        cursor,
        collection: 'candidates',
        query: usageSearchQuery(usageSearchScope(HASH_D)),
        now: NOW + 1,
        signingMaterial: SECRET,
      }),
    ).toThrow(/cursor.*invalid|invalid.*cursor/iu);
  });

  it('refuses tampering, non-canonical encoding, another secret, and malformed data', () => {
    const cursor = createCursor();
    const finalCharacter = cursor.at(-1);
    if (finalCharacter === undefined) throw new Error('empty cursor');
    const tampered = `${cursor.slice(0, -1)}${finalCharacter === 'A' ? 'B' : 'A'}`;

    expect(() => continueCursor(tampered)).toThrow(
      /cursor.*invalid|invalid.*cursor/iu,
    );
    expect(() =>
      continueCursor(cursor, { signingMaterial: `${SECRET}-different` }),
    ).toThrow(/cursor.*invalid|invalid.*cursor/iu);
    expect(() => continueCursor(`${cursor}=`)).toThrow(
      /cursor.*invalid|invalid.*cursor/iu,
    );
    expect(() => continueCursor('not-a-cursor')).toThrow(
      /cursor.*invalid|invalid.*cursor/iu,
    );
  });

  it('bounds signing material, cursor inputs, TTL, position, and collection names', () => {
    expect(() => createCursor({ signingMaterial: 'too-short' })).toThrow(
      /signingMaterial/u,
    );
    expect(() =>
      createCursor({ signingMaterial: 'x'.repeat(4_097) }),
    ).toThrow(/signingMaterial/u);
    expect(() => createCursor({ ttlMs: 0 })).toThrow(/ttlMs/u);
    expect(() =>
      createCursor({ ttlMs: AGENT_CONTEXT_QUERY_CURSOR_MAX_TTL_MS + 1 }),
    ).toThrow(/ttlMs/u);
    expect(() => createCursor({ position: -1 })).toThrow(/position/u);
    expect(() =>
      createCursor({ collection: 'effects' as 'nodes' }),
    ).toThrow(/collection/u);
    expect(() => continueCursor('x'.repeat(8_193))).toThrow(
      /cursor.*invalid|invalid.*cursor/iu,
    );
  });
});
