import {
  invalid,
  rejectUnknownKeys,
  requireRecord,
  requireStableId,
} from './validation-error.js';

export interface DeclaredFormContractInstance {
  readonly fields: readonly object[];
  readonly model?: Readonly<Record<string, unknown>>;
  readonly formState?: Readonly<Record<string, unknown>>;
}

export interface FormContractScenario<TScenario = unknown> {
  readonly id: string;
  readonly description?: string;
  readonly create?: () => TScenario;
}

export interface FormContractDefinition<TScenario = unknown> {
  readonly id: string;
  readonly create: () => DeclaredFormContractInstance;
  readonly scenarios?: readonly FormContractScenario<TScenario>[];
}

export interface FormContractSource<TScenario = unknown> {
  readonly sourceId: string;
  readonly list: () =>
    | readonly FormContractDefinition<TScenario>[]
    | Promise<readonly FormContractDefinition<TScenario>[]>;
}

export function defineFormContractSource<
  const TSource extends FormContractSource,
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
