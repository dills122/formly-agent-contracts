import { FIELD_TYPE_PROFILE_SCHEMA_VERSION } from './field-type-profile-version.js';

const STABLE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const NAMESPACED_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u;
const PROPERTY_SEGMENT = '[A-Za-z_$][A-Za-z0-9_$]*';
const PROPERTY_PATH_PATTERN = new RegExp(
  `^${PROPERTY_SEGMENT}(?:\\.${PROPERTY_SEGMENT})*$`,
  'u',
);
const PROPS_PROPERTY_PATH_PATTERN = new RegExp(
  `^props(?:\\.${PROPERTY_SEGMENT})+$`,
  'u',
);

export interface RadioChoiceOptions {
  readonly collectionPath?: string;
  readonly labelPath?: string;
  readonly valuePath?: string;
  readonly disabledPath?: string;
  readonly completeness?: 'complete' | 'scenario';
}

export interface RadioChoiceBehavior {
  readonly kind: 'radio-choice';
  readonly collectionPath: string;
  readonly labelPath: string;
  readonly valuePath: string;
  readonly disabledPath?: string;
  readonly completeness: 'complete' | 'scenario';
}

export interface ContractedFormlyTypeDefinition {
  readonly name: string;
  readonly profile: ContractedFieldTypeProfileReference;
  readonly behavior: RadioChoiceBehavior;
}

export interface ContractedFieldTypeProfileReference {
  readonly id: string;
  readonly version: number;
}

export type FormlyTypeComponentConstructor = new (
  ...args: never[]
) => object;

export interface ContractedFormlyTypeRegistration<
  TComponent extends FormlyTypeComponentConstructor,
> {
  readonly name: string;
  readonly component: TComponent;
}

export interface FieldTypeProfileRegistryAuthoringInput {
  readonly id: string;
  readonly version: number;
  readonly types: readonly ContractedFormlyTypeDefinition[];
}

export interface GeneratedRadioChoiceFieldTypeProfile {
  readonly identity: ContractedFieldTypeProfileReference;
  readonly semanticType: 'single-choice';
  readonly valueShape: 'scalar';
  readonly evidence: 'declared';
  readonly parts: readonly [
    {
      readonly name: 'group';
      readonly role: 'radiogroup';
      readonly cardinality: 'one';
      readonly evidence: 'declared';
    },
    {
      readonly name: 'option';
      readonly role: 'radio';
      readonly cardinality: 'many';
      readonly evidence: 'declared';
    },
  ];
  readonly interaction: {
    readonly kind: 'choice';
    readonly operation: 'check';
    readonly optionPart: 'option';
  };
  readonly valueDomain: {
    readonly kind: 'projected';
    readonly source: 'adapter';
    readonly completeness: 'complete' | 'scenario';
    readonly collectionPath: string;
    readonly labelPath: string;
    readonly valuePath: string;
    readonly disabledPath?: string;
    readonly evidence: 'declared';
  };
  readonly driver: {
    readonly kind: 'generic';
    readonly id: 'generic.choice';
    readonly version: 1;
    readonly capabilities: readonly ['check'];
  };
  readonly effectCapabilities: {
    readonly targetProperties: readonly ['options'];
    readonly readiness: readonly [];
  };
  readonly unknowns: readonly [];
}

export interface GeneratedFieldTypeProfileRegistry {
  readonly schemaVersion: typeof FIELD_TYPE_PROFILE_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly profiles: readonly GeneratedRadioChoiceFieldTypeProfile[];
  readonly registrations: readonly {
    readonly formlyType: string;
    readonly defaultProfile: ContractedFieldTypeProfileReference;
    readonly variants: readonly [];
  }[];
  readonly wrappers: readonly [];
}

const RADIO_CHOICE_OPTION_KEYS = new Set([
  'collectionPath',
  'labelPath',
  'valuePath',
  'disabledPath',
  'completeness',
]);
const TYPE_KEYS = new Set(['name', 'profile', 'behavior']);
const PROFILE_KEYS = new Set(['id', 'version']);
const RADIO_CHOICE_BEHAVIOR_KEYS = new Set([
  'kind',
  'collectionPath',
  'labelPath',
  'valuePath',
  'disabledPath',
  'completeness',
]);
const REGISTRY_INPUT_KEYS = new Set(['id', 'version', 'types']);

function requireRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain or null-prototype object`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      throw new TypeError(`${path} must contain only string-keyed properties`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new TypeError(`${path} must contain only data properties`);
    }
    if (!descriptor.enumerable) {
      throw new TypeError(`${path} properties must be enumerable`);
    }
  }
  return value as Readonly<Record<string, unknown>>;
}

function requireDensePlainArray(
  value: unknown,
  path: string,
): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${path} must be a dense plain array`);
  }
  const keys = Reflect.ownKeys(value).filter((key) => key !== 'length');
  if (
    keys.length !== value.length ||
    keys.some((key, index) => key !== String(index))
  ) {
    throw new TypeError(`${path} must be a dense plain array`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !('value' in descriptor) ||
      !descriptor.enumerable
    ) {
      throw new TypeError(`${path} must be a dense plain array`);
    }
  }
  return value;
}

function rejectUnknownKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${path} contains unknown property ${key}`);
    }
  }
}

function requireStableToken(value: unknown, path: string): string {
  if (typeof value !== 'string' || !STABLE_TOKEN_PATTERN.test(value)) {
    throw new TypeError(`${path} must be a stable token`);
  }
  return value;
}

function requireNamespacedId(value: unknown, path: string): string {
  if (typeof value !== 'string' || !NAMESPACED_ID_PATTERN.test(value)) {
    throw new TypeError(`${path} must be a stable namespaced identifier`);
  }
  return value;
}

function requireVersion(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new TypeError(`${path} must be a positive safe integer`);
  }
  return Number(value);
}

function requirePropertyPath(
  value: unknown,
  path: string,
  rootAtProps: boolean,
): string {
  const pattern = rootAtProps
    ? PROPS_PROPERTY_PATH_PATTERN
    : PROPERTY_PATH_PATTERN;
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new TypeError(
      `${path} must be a dot-delimited property path${
        rootAtProps ? ' rooted at props' : ''
      }`,
    );
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateRadioChoiceBehavior(
  input: unknown,
  path: string,
): RadioChoiceBehavior {
  const behavior = requireRecord(input, path);
  rejectUnknownKeys(behavior, RADIO_CHOICE_BEHAVIOR_KEYS, path);
  if (behavior.kind !== 'radio-choice') {
    throw new TypeError(
      `${path}.kind ${JSON.stringify(behavior.kind)} is unsupported`,
    );
  }
  requirePropertyPath(
    behavior.collectionPath,
    `${path}.collectionPath`,
    true,
  );
  requirePropertyPath(behavior.labelPath, `${path}.labelPath`, false);
  requirePropertyPath(behavior.valuePath, `${path}.valuePath`, false);
  if (behavior.disabledPath !== undefined) {
    requirePropertyPath(
      behavior.disabledPath,
      `${path}.disabledPath`,
      false,
    );
  }
  if (
    behavior.completeness !== 'complete' &&
    behavior.completeness !== 'scenario'
  ) {
    throw new TypeError(`${path}.completeness is unsupported`);
  }
  return input as RadioChoiceBehavior;
}

function validateContractedType(
  input: unknown,
  path = 'type',
): ContractedFormlyTypeDefinition {
  const type = requireRecord(input, path);
  rejectUnknownKeys(type, TYPE_KEYS, path);
  requireStableToken(type.name, `${path}.name`);
  const profile = requireRecord(type.profile, `${path}.profile`);
  rejectUnknownKeys(profile, PROFILE_KEYS, `${path}.profile`);
  requireNamespacedId(profile.id, `${path}.profile.id`);
  requireVersion(profile.version, `${path}.profile.version`);
  validateRadioChoiceBehavior(type.behavior, `${path}.behavior`);
  return input as ContractedFormlyTypeDefinition;
}

export function radioChoice(
  options: RadioChoiceOptions = {},
): RadioChoiceBehavior {
  const input = requireRecord(options, 'radioChoice');
  rejectUnknownKeys(input, RADIO_CHOICE_OPTION_KEYS, 'radioChoice');
  const collectionPath = requirePropertyPath(
    input.collectionPath ?? 'props.options',
    'radioChoice.collectionPath',
    true,
  );
  const labelPath = requirePropertyPath(
    input.labelPath ?? 'label',
    'radioChoice.labelPath',
    false,
  );
  const valuePath = requirePropertyPath(
    input.valuePath ?? 'value',
    'radioChoice.valuePath',
    false,
  );
  const disabledPath =
    input.disabledPath === undefined
      ? undefined
      : requirePropertyPath(
          input.disabledPath,
          'radioChoice.disabledPath',
          false,
        );
  const completeness = input.completeness ?? 'complete';
  if (completeness !== 'complete' && completeness !== 'scenario') {
    throw new TypeError('radioChoice.completeness is unsupported');
  }

  return {
    kind: 'radio-choice',
    collectionPath,
    labelPath,
    valuePath,
    ...(disabledPath === undefined ? {} : { disabledPath }),
    completeness,
  };
}

export function defineContractedFormlyType<
  const TDefinition extends ContractedFormlyTypeDefinition,
>(definition: TDefinition): TDefinition {
  const validated = validateContractedType(definition);
  const profile = Object.freeze({
    id: validated.profile.id,
    version: validated.profile.version,
  });
  const behavior = Object.freeze({
    kind: validated.behavior.kind,
    collectionPath: validated.behavior.collectionPath,
    labelPath: validated.behavior.labelPath,
    valuePath: validated.behavior.valuePath,
    ...(validated.behavior.disabledPath === undefined
      ? {}
      : { disabledPath: validated.behavior.disabledPath }),
    completeness: validated.behavior.completeness,
  });
  return Object.freeze({
    name: validated.name,
    profile,
    behavior,
  }) as TDefinition;
}

export function toFormlyTypeRegistration<
  TComponent extends FormlyTypeComponentConstructor,
>(
  type: ContractedFormlyTypeDefinition,
  component: TComponent,
): ContractedFormlyTypeRegistration<TComponent> {
  const validated = validateContractedType(type);
  try {
    Reflect.construct(Object, [], component);
  } catch {
    throw new TypeError('component must be a component constructor');
  }
  return { name: validated.name, component };
}

function lowerRadioChoice(
  type: ContractedFormlyTypeDefinition,
): GeneratedRadioChoiceFieldTypeProfile {
  const { behavior } = type;
  return {
    identity: { id: type.profile.id, version: type.profile.version },
    semanticType: 'single-choice',
    valueShape: 'scalar',
    evidence: 'declared',
    parts: [
      {
        name: 'group',
        role: 'radiogroup',
        cardinality: 'one',
        evidence: 'declared',
      },
      {
        name: 'option',
        role: 'radio',
        cardinality: 'many',
        evidence: 'declared',
      },
    ],
    interaction: {
      kind: 'choice',
      operation: 'check',
      optionPart: 'option',
    },
    valueDomain: {
      kind: 'projected',
      source: 'adapter',
      completeness: behavior.completeness,
      collectionPath: behavior.collectionPath,
      labelPath: behavior.labelPath,
      valuePath: behavior.valuePath,
      ...(behavior.disabledPath === undefined
        ? {}
        : { disabledPath: behavior.disabledPath }),
      evidence: 'declared',
    },
    driver: {
      kind: 'generic',
      id: 'generic.choice',
      version: 1,
      capabilities: ['check'],
    },
    effectCapabilities: { targetProperties: ['options'], readiness: [] },
    unknowns: [],
  };
}

export function buildFieldTypeProfileRegistry(
  input: FieldTypeProfileRegistryAuthoringInput,
): GeneratedFieldTypeProfileRegistry {
  const registry = requireRecord(input, 'registry');
  rejectUnknownKeys(registry, REGISTRY_INPUT_KEYS, 'registry');
  const id = requireNamespacedId(registry.id, 'registry.id');
  const version = requireVersion(registry.version, 'registry.version');
  const authoredTypes = requireDensePlainArray(
    registry.types,
    'registry.types',
  );

  const types = authoredTypes.map((entry, index) =>
    validateContractedType(entry, `registry.types[${index}]`),
  );
  const names = new Set<string>();
  const profileIdentities = new Set<string>();
  for (const type of types) {
    if (names.has(type.name)) {
      throw new TypeError(
        `registry.types duplicates Formly type name "${type.name}"`,
      );
    }
    names.add(type.name);
    const profileIdentity = `${type.profile.id}@${type.profile.version}`;
    if (profileIdentities.has(profileIdentity)) {
      throw new TypeError(
        `registry.types duplicates profile identity "${profileIdentity}"`,
      );
    }
    profileIdentities.add(profileIdentity);
  }

  const profiles = types
    .map(lowerRadioChoice)
    .sort(
      (left, right) =>
        compareText(left.identity.id, right.identity.id) ||
        left.identity.version - right.identity.version,
    );
  const registrations = types
    .map((type) => ({
      formlyType: type.name,
      defaultProfile: {
        id: type.profile.id,
        version: type.profile.version,
      },
      variants: [] as const,
    }))
    .sort((left, right) => compareText(left.formlyType, right.formlyType));

  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id,
    version,
    profiles,
    registrations,
    wrappers: [] as const,
  };
}
