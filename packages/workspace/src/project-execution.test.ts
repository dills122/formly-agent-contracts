import { describe, expect, it, vi } from 'vitest';

import { inventoryProjectExecution } from './project-execution.js';

describe('project worker execution phases', () => {
  it('inventories definitions without invoking factories and compiles from the retained graph', async () => {
    const create = vi.fn(() => ({ fields: [{ key: 'name', type: 'input' }] }));
    const list = vi.fn(() => [{ id: 'fixture.form', create }]);
    const project = await inventoryProjectExecution({
      configPath: 'projects/forms.project.ts',
      rootConfig: { projectConfigs: ['projects/*.project.ts'] },
      projectConfig: {
        projectId: 'fixture-project',
        sources: [{ sourceId: 'fixture-source', list }],
      },
    });
    expect(project.inventory).toEqual({
      projectId: 'fixture-project',
      sourceIds: ['fixture-source'],
      formIds: ['fixture.form'],
    });
    expect(create).not.toHaveBeenCalled();
    expect(project.compile().forms).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate form IDs before either factory runs', async () => {
    const first = vi.fn(() => ({ fields: [] }));
    const second = vi.fn(() => ({ fields: [] }));
    await expect(inventoryProjectExecution({
      configPath: 'projects/forms.project.ts',
      rootConfig: { projectConfigs: ['projects/*.project.ts'] },
      projectConfig: {
        projectId: 'fixture-project',
        sources: [
          { sourceId: 'first', list: () => [{ id: 'fixture.form', create: first }] },
          { sourceId: 'second', list: () => [{ id: 'fixture.form', create: second }] },
        ],
      },
    })).rejects.toThrow(/Duplicate form ID/u);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });
});
