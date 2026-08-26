import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  defineFormContractSource,
  parseFormContractSource,
  type FormContractDefinition,
} from './source.js';

describe('FormContractSource', () => {
  it('preserves a typed source without executing it', () => {
    const definition: FormContractDefinition<{ readonly fields: string[] }> = {
      id: 'claims.create',
      create: () => ({ fields: ['product'] }),
      scenarios: [
        {
          id: 'new-claim',
          create: () => ({ product: 'auto' }),
        },
      ],
    };
    const source = defineFormContractSource({
      sourceId: 'claims/forms',
      list: () => [definition],
    });

    expect(parseFormContractSource(source)).toBe(source);
    expectTypeOf(source.list).returns.toMatchTypeOf<
      | readonly FormContractDefinition<{ readonly fields: string[] }>[]
      | Promise<
          readonly FormContractDefinition<{ readonly fields: string[] }>[]
        >
    >();
  });

  it.each([
    [{ sourceId: '', list: () => [] }, 'source.sourceId'],
    [{ sourceId: 'claims/../admin', list: () => [] }, 'source.sourceId'],
    [{ sourceId: 'claims', list: [] }, 'source.list'],
    [
      { sourceId: 'claims', list: () => [], unexpected: true },
      'source.unexpected',
    ],
  ])('rejects malformed source definitions', (source, expectedPath) => {
    expect(() => parseFormContractSource(source)).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: expectedPath,
      }),
    );
  });
});
