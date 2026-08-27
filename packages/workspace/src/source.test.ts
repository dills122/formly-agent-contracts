import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  defineFormContractSource,
  parseDeclaredFormContractInstance,
  parseFormContractDefinition,
  parseFormContractDefinitions,
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

  it('rejects source accessors without invoking them', () => {
    let reads = 0;
    const source = Object.defineProperty(
      { sourceId: 'claims' },
      'list',
      {
        enumerable: true,
        get: () => {
          reads += 1;
          return () => [];
        },
      },
    );

    expect(() => parseFormContractSource(source)).toThrow(
      expect.objectContaining({
        code: 'CONFIG_INVALID',
        path: 'source.list',
      }),
    );
    expect(reads).toBe(0);
  });
});

describe('source result validation', () => {
  it('preserves valid definition and scenario identity and order', () => {
    const firstCreate = () => ({ fields: [{ key: 'first' }] });
    const scenarioCreate = () => ({ product: 'auto' });
    const first = {
      id: 'claims.first',
      create: firstCreate,
      scenarios: [
        {
          id: 'new-claim',
          description: 'A new claim',
          create: scenarioCreate,
        },
      ],
    };
    const second = {
      id: 'claims.second',
      create: () => ({ fields: [] }),
    };
    const definitions = [first, second] as const;

    const parsed = parseFormContractDefinitions(definitions, 'source.list()');

    expect(parsed).toBe(definitions);
    expect(parsed[0]).toBe(first);
    expect(parsed[1]).toBe(second);
    expect(parsed[0]?.create).toBe(firstCreate);
    expect(parsed[0]?.scenarios?.[0]?.create).toBe(scenarioCreate);
  });

  it('validates callbacks without executing them', () => {
    let calls = 0;
    const definition = {
      id: 'claims.create',
      create: () => {
        calls += 1;
        return { fields: [] };
      },
      scenarios: [
        {
          id: 'new-claim',
          create: () => {
            calls += 1;
            return {};
          },
        },
      ],
    };

    expect(parseFormContractDefinition(definition, 'definition')).toBe(
      definition,
    );
    expect(calls).toBe(0);
  });

  it('accepts the contract stable-identifier grammar for definition IDs', () => {
    const definition = {
      id: 'Claims:Create[0]*%-v2',
      create: () => ({ fields: [] }),
    };

    expect(parseFormContractDefinition(definition, 'definition')).toBe(
      definition,
    );
  });

  it.each([
    [null, 'source.list()'],
    [{}, 'source.list()'],
    [[{ id: 'claims.create', create: () => ({ fields: [] }) }, ,], 'source.list()[1]'],
    [
      [{ id: 'claims/create', create: () => ({ fields: [] }) }],
      'source.list()[0].id',
    ],
    [[{ id: 'claims.create', create: true }], 'source.list()[0].create'],
    [
      [{ id: 'claims.create', create: () => ({ fields: [] }), extra: true }],
      'source.list()[0].extra',
    ],
    [
      [{ id: 'claims.create', create: () => ({ fields: [] }), scenarios: undefined }],
      'source.list()[0].scenarios',
    ],
    [
      [{ id: 'claims.create', create: () => ({ fields: [] }), scenarios: {} }],
      'source.list()[0].scenarios',
    ],
    [
      [{ id: 'claims.create', create: () => ({ fields: [] }), scenarios: [,] }],
      'source.list()[0].scenarios[0]',
    ],
    [
      [
        {
          id: 'claims.create',
          create: () => ({ fields: [] }),
          scenarios: [{ id: 'new', description: 42 }],
        },
      ],
      'source.list()[0].scenarios[0].description',
    ],
    [
      [
        {
          id: 'claims.create',
          create: () => ({ fields: [] }),
          scenarios: [{ id: 'new', create: false }],
        },
      ],
      'source.list()[0].scenarios[0].create',
    ],
    [
      [
        {
          id: 'claims.create',
          create: () => ({ fields: [] }),
          scenarios: [{ id: 'new', unexpected: true }],
        },
      ],
      'source.list()[0].scenarios[0].unexpected',
    ],
  ] satisfies readonly (readonly [unknown, string])[]) (
    'rejects malformed source results at a stable path',
    (value, expectedPath) => {
      expect(() =>
        parseFormContractDefinitions(value, 'source.list()'),
      ).toThrow(
        expect.objectContaining({
          code: 'CONFIG_INVALID',
          path: expectedPath,
        }),
      );
    },
  );

  it('rejects definition, scenario, and array accessors without invoking them', () => {
    let reads = 0;
    const definition = Object.defineProperty(
      { id: 'claims.create', create: () => ({ fields: [] }) },
      'scenarios',
      {
        enumerable: true,
        get: () => {
          reads += 1;
          return [];
        },
      },
    );
    const scenario = Object.defineProperty({ id: 'new-claim' }, 'create', {
      enumerable: true,
      get: () => {
        reads += 1;
        return () => ({});
      },
    });
    const scenarios = [scenario];
    const definitionWithScenario = {
      id: 'claims.scenario',
      create: () => ({ fields: [] }),
      scenarios,
    };
    const definitions = Object.defineProperty([], '0', {
      enumerable: true,
      get: () => {
        reads += 1;
        return definitionWithScenario;
      },
    });
    Object.defineProperty(definitions, 'length', { value: 1 });

    expect(() =>
      parseFormContractDefinition(definition, 'definition'),
    ).toThrow(expect.objectContaining({ path: 'definition.scenarios' }));
    expect(() =>
      parseFormContractDefinition(
        definitionWithScenario,
        'definitionWithScenario',
      ),
    ).toThrow(
      expect.objectContaining({
        path: 'definitionWithScenario.scenarios[0].create',
      }),
    );
    expect(() =>
      parseFormContractDefinitions(definitions, 'source.list()'),
    ).toThrow(expect.objectContaining({ path: 'source.list()[0]' }));
    expect(reads).toBe(0);
  });
});

describe('declared form instance validation', () => {
  it('preserves a valid instance and its field identity and order', () => {
    const first = { key: 'product', type: 'select' };
    const second = { key: 'caseType', type: 'radio' };
    const instance = {
      fields: [first, second],
      model: { product: 'auto' },
      formState: { readonly: false },
    };

    const parsed = parseDeclaredFormContractInstance(
      instance,
      'definition.create()',
    );

    expect(parsed).toBe(instance);
    expect(parsed.fields[0]).toBe(first);
    expect(parsed.fields[1]).toBe(second);
  });

  it.each([
    [null, 'definition.create()'],
    [{}, 'definition.create().fields'],
    [{ fields: undefined }, 'definition.create().fields'],
    [{ fields: {} }, 'definition.create().fields'],
    [{ fields: [,] }, 'definition.create().fields[0]'],
    [{ fields: [null] }, 'definition.create().fields[0]'],
    [{ fields: [[]] }, 'definition.create().fields[0]'],
    [{ fields: [], model: undefined }, 'definition.create().model'],
    [{ fields: [], model: [] }, 'definition.create().model'],
    [{ fields: [], formState: null }, 'definition.create().formState'],
    [{ fields: [], unexpected: true }, 'definition.create().unexpected'],
  ] satisfies readonly (readonly [unknown, string])[]) (
    'rejects malformed declared instances at a stable path',
    (value, expectedPath) => {
      expect(() =>
        parseDeclaredFormContractInstance(value, 'definition.create()'),
      ).toThrow(
        expect.objectContaining({
          code: 'CONFIG_INVALID',
          path: expectedPath,
        }),
      );
    },
  );

  it('rejects instance and field-array accessors without invoking them', () => {
    let reads = 0;
    const instance = Object.defineProperty({}, 'fields', {
      enumerable: true,
      get: () => {
        reads += 1;
        return [];
      },
    });
    const fields = Object.defineProperty([], '0', {
      enumerable: true,
      get: () => {
        reads += 1;
        return {};
      },
    });
    Object.defineProperty(fields, 'length', { value: 1 });

    expect(() =>
      parseDeclaredFormContractInstance(instance, 'definition.create()'),
    ).toThrow(
      expect.objectContaining({ path: 'definition.create().fields' }),
    );
    expect(() =>
      parseDeclaredFormContractInstance(
        { fields },
        'definition.create()',
      ),
    ).toThrow(
      expect.objectContaining({ path: 'definition.create().fields[0]' }),
    );
    expect(reads).toBe(0);
  });
});
