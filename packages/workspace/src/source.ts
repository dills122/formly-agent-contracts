import {
  invalid,
  rejectUnknownKeys,
  requireRecord,
  requireStableId,
} from './validation-error.js';

export interface FormContractScenario<TScenario = unknown> {
  readonly id: string;
  readonly description?: string;
  readonly create?: () => TScenario;
}

export interface FormContractDefinition<
  TInstance = unknown,
  TScenario = unknown,
> {
  readonly id: string;
  readonly create: () => TInstance;
  readonly scenarios?: readonly FormContractScenario<TScenario>[];
}

export interface FormContractSource<TInstance = unknown, TScenario = unknown> {
  readonly sourceId: string;
  readonly list: () =>
    | readonly FormContractDefinition<TInstance, TScenario>[]
    | Promise<readonly FormContractDefinition<TInstance, TScenario>[]>;
}

export function defineFormContractSource<
  TInstance,
  TScenario,
  const TSource extends FormContractSource<TInstance, TScenario>,
>(source: TSource): TSource {
  return source;
}

const SOURCE_KEYS = new Set(['sourceId', 'list']);

export function parseFormContractSource(
  value: unknown,
  path = 'source',
): FormContractSource {
  const source = requireRecord(value, path);
  rejectUnknownKeys(source, SOURCE_KEYS, path);
  requireStableId(source.sourceId, `${path}.sourceId`);
  if (typeof source.list !== 'function') {
    invalid(`${path}.list`, 'must be a function.');
  }
  return value as FormContractSource;
}
