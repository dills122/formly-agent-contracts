import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  defineFormContractSource,
  parseFormContractSource,
  type DeclaredFormContractInstance,
  type FormContractDefinition,
} from './source.js';

describe('FormContractSource', () => {
  it('preserves a typed source without executing it', () => {
    const definition: FormContractDefinition<{ readonly product: string }> = {
      id: 'claims.create',
      create: () => ({ fields: [{ key: 'product', type: 'input' }] }),
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
    expectTypeOf(definition.create).returns.toEqualTypeOf<DeclaredFormContractInstance>();
    expectTypeOf(source.list).returns.toMatchTypeOf<
      | readonly FormContractDefinition<{ readonly product: string }>[]
      | Promise<
          readonly FormContractDefinition<{ readonly product: string }>[]
        >
    >();
  });

  it('does not type arbitrary source instances as declared Formly input', () => {
    const definition: FormContractDefinition = {
      id: 'claims.invalid',
      // @ts-expect-error source adapters must normalize to Formly field configs
      create: () => ({ fields: ['product'] }),
    };

    expect(definition.id).toBe('claims.invalid');
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
