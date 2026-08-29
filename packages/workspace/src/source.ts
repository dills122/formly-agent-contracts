import {
  invalid,
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

export type FormRootProduct =
  | DeclaredFormContractInstance
  | readonly object[];

export type FormRootSymbol =
  | ((...args: never[]) => FormRootProduct)
  | (abstract new (...args: never[]) => DeclaredFormContractInstance);

export interface FormContractLineage {
  readonly rootSymbol: FormRootSymbol;
}

export interface FormContractDefinition<TScenario = unknown> {
  readonly id: string;
  readonly create: () => DeclaredFormContractInstance;
  readonly scenarios?: readonly FormContractScenario<TScenario>[];
  readonly lineage?: FormContractLineage;
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

export function defineFormContractDefinition<
  const TDefinition extends FormContractDefinition,
>(definition: TDefinition): TDefinition {
  return definition;
}

const SOURCE_KEYS = new Set(['sourceId', 'list']);
const DEFINITION_KEYS = new Set(['id', 'create', 'lineage', 'scenarios']);
const LINEAGE_KEYS = new Set(['rootSymbol']);
const SCENARIO_KEYS = new Set(['id', 'description', 'create']);
const INSTANCE_KEYS = new Set(['fields', 'model', 'formState']);
const CONTRACT_STABLE_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u;

interface OwnDataProperties {
  readonly values: ReadonlyMap<string, unknown>;
  readonly present: ReadonlySet<string>;
}

function readExactOwnDataProperties(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  path: string,
): OwnDataProperties {
  const record = requireRecord(value, path);
  const values = new Map<string, unknown>();
  const present = new Set<string>();

  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== 'string' || !allowedKeys.has(key)) {
      invalid(
        typeof key === 'string' ? `${path}.${key}` : path,
        'is not supported.',
      );
    }

    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !('value' in descriptor)) {
      invalid(`${path}.${key}`, 'must be an own data property.');
    }
    present.add(key);
    values.set(key, descriptor.value);
  }

  for (const key of requiredKeys) {
    if (!present.has(key)) {
      invalid(`${path}.${key}`, 'is required.');
    }
  }

  return { values, present };
}

function readDenseArray(
  value: unknown,
  path: string,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    invalid(path, 'must be an array.');
  }

  const items: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const itemPath = `${path}[${index}]`;
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined) {
      invalid(itemPath, 'must be present; sparse arrays are not supported.');
    }
    if (!('value' in descriptor)) {
      invalid(itemPath, 'must be an own data property.');
    }
    items.push(descriptor.value);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') {
      continue;
    }
    if (
      typeof key === 'string' &&
      /^(?:0|[1-9][0-9]*)$/u.test(key) &&
      Number(key) < value.length
    ) {
      continue;
    }
    invalid(typeof key === 'string' ? `${path}.${key}` : path, 'is not supported.');
  }

  return items;
}

function parseFormContractScenario(
  value: unknown,
  path: string,
): FormContractScenario {
  const properties = readExactOwnDataProperties(
    value,
    SCENARIO_KEYS,
    new Set(['id']),
    path,
  );
  requireStableId(properties.values.get('id'), `${path}.id`);

  if (
    properties.present.has('description') &&
    typeof properties.values.get('description') !== 'string'
  ) {
    invalid(`${path}.description`, 'must be a string.');
  }
  if (
    properties.present.has('create') &&
    typeof properties.values.get('create') !== 'function'
  ) {
    invalid(`${path}.create`, 'must be a function.');
  }

  return value as FormContractScenario;
}

function parseFormContractLineage(
  value: unknown,
  path: string,
): FormContractLineage {
  const properties = readExactOwnDataProperties(
    value,
    LINEAGE_KEYS,
    LINEAGE_KEYS,
    path,
  );
  if (typeof properties.values.get('rootSymbol') !== 'function') {
    invalid(`${path}.rootSymbol`, 'must be a function or class.');
  }
  return value as FormContractLineage;
}

function requireContractStableIdentifier(
  value: unknown,
  path: string,
): string {
  if (
    typeof value !== 'string' ||
    !CONTRACT_STABLE_IDENTIFIER_PATTERN.test(value)
  ) {
    invalid(path, 'must be a contract stable identifier.');
  }
  return value;
}

export function parseFormContractDefinition(
  value: unknown,
  path = 'definition',
): FormContractDefinition {
  const properties = readExactOwnDataProperties(
    value,
    DEFINITION_KEYS,
    new Set(['id', 'create']),
    path,
  );
  requireContractStableIdentifier(properties.values.get('id'), `${path}.id`);
  if (typeof properties.values.get('create') !== 'function') {
    invalid(`${path}.create`, 'must be a function.');
  }

  if (properties.present.has('lineage')) {
    parseFormContractLineage(
      properties.values.get('lineage'),
      `${path}.lineage`,
    );
  }

  if (properties.present.has('scenarios')) {
    const scenarios = readDenseArray(
      properties.values.get('scenarios'),
      `${path}.scenarios`,
    );
    for (let index = 0; index < scenarios.length; index += 1) {
      parseFormContractScenario(
        scenarios[index],
        `${path}.scenarios[${index}]`,
      );
    }
  }

  return value as FormContractDefinition;
}

export function parseFormContractDefinitions(
  value: unknown,
  path = 'definitions',
): readonly FormContractDefinition[] {
  const definitions = readDenseArray(value, path);
  for (let index = 0; index < definitions.length; index += 1) {
    parseFormContractDefinition(definitions[index], `${path}[${index}]`);
  }
  return value as readonly FormContractDefinition[];
}

export function parseDeclaredFormContractInstance(
  value: unknown,
  path = 'instance',
): DeclaredFormContractInstance {
  const properties = readExactOwnDataProperties(
    value,
    INSTANCE_KEYS,
    new Set(['fields']),
    path,
  );
  const fields = readDenseArray(properties.values.get('fields'), `${path}.fields`);
  for (let index = 0; index < fields.length; index += 1) {
    requireRecord(fields[index], `${path}.fields[${index}]`);
  }

  for (const key of ['model', 'formState'] as const) {
    if (properties.present.has(key)) {
      requireRecord(properties.values.get(key), `${path}.${key}`);
    }
  }

  return value as DeclaredFormContractInstance;
}

export function parseFormContractSource(
  value: unknown,
  path = 'source',
): FormContractSource {
  const properties = readExactOwnDataProperties(
    value,
    SOURCE_KEYS,
    new Set(['sourceId', 'list']),
    path,
  );
  requireStableId(properties.values.get('sourceId'), `${path}.sourceId`);
  if (typeof properties.values.get('list') !== 'function') {
    invalid(`${path}.list`, 'must be a function.');
  }
  return value as FormContractSource;
}
