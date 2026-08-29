import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inspectWorkspaceFactoryInputs } from '@formly-contract/workspace';
import { beforeAll, describe, expect, it } from 'vitest';

const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));
const fixtureTsconfig = resolve(fixtureRoot, 'tsconfig.json');
type AuthoringResult = Awaited<
  ReturnType<typeof inspectWorkspaceFactoryInputs>
>;
let firstResult: AuthoringResult;
let secondResult: AuthoringResult;

beforeAll(async () => {
  firstResult = await inspectWorkspaceFactoryInputs({
    workspaceRoot: fixtureRoot,
    rootConfigPath: 'formly-contracts.config.ts',
    rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
    formIds: ['nx.workplace.indexing', 'nx.workplace.nigo-add'],
  });
  secondResult = await inspectWorkspaceFactoryInputs({
    workspaceRoot: fixtureRoot,
    rootConfigPath: 'formly-contracts.config.ts',
    rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
    formIds: ['nx.workplace.nigo-add', 'nx.workplace.indexing'],
  });
}, 30_000);

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('Nx workplace factory-input authoring', () => {
  it('discovers Indexing and NIGO roots through their existing definitions', () => {
    expect(secondResult).toEqual(firstResult);
    expect(firstResult.diagnostics).toEqual([]);
    expect(
      firstResult.drafts.map(
        ({ formId, projectId, sourceId, factorySymbol }) => ({
          formId,
          projectId,
          sourceId,
          factorySymbol,
        }),
      ),
    ).toEqual([
      {
        formId: 'nx.workplace.indexing',
        projectId: 'fixture-nx-forms-kit',
        sourceId: 'fixture/nx-workplace-forms',
        factorySymbol: 'IndexingFormConfig',
      },
      {
        formId: 'nx.workplace.nigo-add',
        projectId: 'fixture-nx-forms-kit',
        sourceId: 'fixture/nx-workplace-forms',
        factorySymbol: 'NigoAddFormConfig',
      },
    ]);
  }, 30_000);

  it('retains accepted authoring-burden measurements for both workplace shapes', () => {
    expect(
      firstResult.drafts.map(({ formId, metrics }) => ({ formId, ...metrics })),
    ).toEqual([
      {
        formId: 'nx.workplace.indexing',
        generated: 6,
        explicit: 5,
        ambiguous: 0,
        unsupported: 1,
      },
      {
        formId: 'nx.workplace.nigo-add',
        generated: 2,
        explicit: 6,
        ambiguous: 0,
        unsupported: 0,
      },
    ]);
  }, 30_000);

  it('is local, deterministic, privacy-bounded, and read-only', async () => {
    const sentinel = globalThis as typeof globalThis &
      Record<string, boolean | undefined>;
    sentinel.__FORMlyContractAuthoringMustNotExecute = true;
    let result: Awaited<ReturnType<typeof inspectWorkspaceFactoryInputs>>;
    try {
      result = await inspectWorkspaceFactoryInputs({
        workspaceRoot: fixtureRoot,
        rootConfigPath: 'formly-contracts.config.ts',
        rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
        formIds: ['nx.workplace.indexing', 'nx.workplace.nigo-add'],
      });
    } finally {
      delete sentinel.__FORMlyContractAuthoringMustNotExecute;
    }
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(fixtureRoot);
    expect(serialized).not.toContain('WORKPLACE-CUSTOMER-SECRET');
    expect(serialized).not.toContain('subscribe(');
    for (const draft of result.drafts) {
      expect(draft.suggestedPath).toMatch(
        /^libs\/forms-kit\/src\/lib\/workplace\/.+\.factory-input\.generated\.ts$/u,
      );
      expect(await pathExists(resolve(fixtureRoot, draft.suggestedPath))).toBe(
        false,
      );
      expect(draft.code).toContain('satisfies Partial<');
    }
  }, 30_000);

  it('fails closed when a requested stable form ID has no exact authoring root', async () => {
    const result = await inspectWorkspaceFactoryInputs({
      workspaceRoot: fixtureRoot,
      rootConfigPath: 'formly-contracts.config.ts',
      rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
      formIds: ['nx.workplace.missing'],
    });

    expect(result.drafts).toEqual([]);
    expect(result.diagnostics).toEqual([
      {
        code: 'FACTORY_INPUT_AUTHORING_FORM_NOT_FOUND',
        formId: 'nx.workplace.missing',
      },
    ]);
  }, 30_000);

  it('rejects an unbounded form ID before target selection', async () => {
    const formId = 'x'.repeat(121);
    const result = await inspectWorkspaceFactoryInputs({
      workspaceRoot: fixtureRoot,
      rootConfigPath: 'formly-contracts.config.ts',
      rootLoaderOptions: { tsconfigPath: fixtureTsconfig },
      formIds: [formId],
    });

    expect(result.drafts).toEqual([]);
    expect(result.diagnostics).toEqual([
      {
        code: 'FACTORY_INPUT_AUTHORING_FORM_ID_INVALID',
        formId,
      },
    ]);
  });
});
