import { FIELD_TYPE_PROFILE_SCHEMA_VERSION } from './field-type-profile-version.js';
import type {
  FieldTypeProfileDriver,
  FieldTypeProfileInteraction,
  FieldTypeProfilePart,
  FieldTypeWrapperPrecondition,
} from './field-type-interaction.js';

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

export interface TypedInputOptions {
  readonly semanticType: string;
  readonly role?: 'textbox' | 'searchbox' | 'spinbutton';
}

export interface TypedInputBehavior {
  readonly kind: 'typed-input';
  readonly semanticType: string;
  readonly role: 'textbox' | 'searchbox' | 'spinbutton';
}

export interface ChoiceControlOptions extends RadioChoiceOptions {
  readonly multiple?: boolean;
  readonly presentation?: 'radio' | 'checkbox' | 'select' | 'overlay';
}

export interface ChoiceControlBehavior {
  readonly kind: 'choice-control';
  readonly collectionPath: string;
  readonly labelPath: string;
  readonly valuePath: string;
  readonly disabledPath?: string;
  readonly completeness: 'complete' | 'scenario';
  readonly multiple: boolean;
  readonly presentation: 'radio' | 'checkbox' | 'select' | 'overlay';
}

export type AutocompleteChoiceOptions = RadioChoiceOptions;

export interface AutocompleteChoiceBehavior {
  readonly kind: 'autocomplete-choice';
  readonly collectionPath: string;
  readonly labelPath: string;
  readonly valuePath: string;
  readonly disabledPath?: string;
  readonly completeness: 'complete' | 'scenario';
}

export interface RowSelectionOptions extends RadioChoiceOptions {
  readonly multiple?: boolean;
}

export interface RowSelectionBehavior {
  readonly kind: 'row-selection';
  readonly collectionPath: string;
  readonly labelPath: string;
  readonly valuePath: string;
  readonly disabledPath?: string;
  readonly completeness: 'complete' | 'scenario';
  readonly multiple: boolean;
}

export interface RepeaterBehavior {
  readonly kind: 'repeater';
  readonly expandable: boolean;
}

export interface RepeaterOptions {
  readonly expandable?: boolean;
}

export interface StepperOptions {
  readonly previous?: boolean;
  readonly submit?: boolean;
}

export interface StepperBehavior {
  readonly kind: 'stepper';
  readonly previous: boolean;
  readonly submit: boolean;
}

export type ContractedFormlyTypeBehavior =
  | RadioChoiceBehavior
  | TypedInputBehavior
  | ChoiceControlBehavior
  | AutocompleteChoiceBehavior
  | RowSelectionBehavior
  | RepeaterBehavior
  | StepperBehavior;

export interface ContractedFormlyTypeDefinition {
  readonly name: string;
  readonly profile: ContractedFieldTypeProfileReference;
  readonly behavior: ContractedFormlyTypeBehavior;
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
  readonly wrappers?: readonly ContractedFormlyWrapperDefinition[];
}

export interface ContractedFormlyWrapperDefinition {
  readonly name: string;
  readonly profile: ContractedFieldTypeProfileReference;
  readonly activation?: {
    readonly part?: string;
    readonly operation?: 'click' | 'check';
    readonly role?: 'button' | 'checkbox' | 'radio';
  };
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
  readonly profiles: readonly GeneratedFieldTypeProfile[];
  readonly registrations: readonly {
    readonly formlyType: string;
    readonly defaultProfile: ContractedFieldTypeProfileReference;
    readonly variants: readonly [];
  }[];
  readonly wrappers: readonly GeneratedFieldTypeWrapperProfile[];
}

export interface GeneratedFieldTypeProfile {
  readonly identity: ContractedFieldTypeProfileReference;
  readonly semanticType: string;
  readonly valueShape: 'scalar' | 'array' | 'object';
  readonly evidence: 'declared';
  readonly parts: readonly FieldTypeProfilePart[];
  readonly interaction: FieldTypeProfileInteraction;
  readonly valueDomain:
    | {
        readonly kind: 'projected';
        readonly source: 'adapter';
        readonly completeness: 'complete' | 'scenario';
        readonly collectionPath: string;
        readonly labelPath: string;
        readonly valuePath: string;
        readonly disabledPath?: string;
        readonly evidence: 'declared';
      }
    | { readonly kind: 'not-applicable'; readonly evidence: 'declared' };
  readonly driver: FieldTypeProfileDriver;
  readonly effectCapabilities: {
    readonly targetProperties: readonly ['options'] | readonly [];
    readonly readiness: readonly [];
  };
  readonly unknowns: readonly [];
}

export interface GeneratedFieldTypeWrapperProfile {
  readonly identity: ContractedFieldTypeProfileReference;
  readonly wrapperName: string;
  readonly evidence: 'declared';
  readonly parts: readonly FieldTypeProfilePart[];
  readonly preconditions: readonly FieldTypeWrapperPrecondition[];
  readonly unknowns: readonly [];
}

const RADIO_CHOICE_OPTION_KEYS = new Set([
  'collectionPath',
  'labelPath',
  'valuePath',
  'disabledPath',
  'completeness',
]);
const CHOICE_CONTROL_OPTION_KEYS = new Set([
  ...RADIO_CHOICE_OPTION_KEYS,
  'multiple',
  'presentation',
]);
const ROW_SELECTION_OPTION_KEYS = new Set([
  ...RADIO_CHOICE_OPTION_KEYS,
  'multiple',
]);
const TYPED_INPUT_OPTION_KEYS = new Set(['semanticType', 'role']);
const REPEATER_OPTION_KEYS = new Set(['expandable']);
const STEPPER_OPTION_KEYS = new Set(['previous', 'submit']);
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
const CHOICE_CONTROL_BEHAVIOR_KEYS = new Set([
  ...RADIO_CHOICE_BEHAVIOR_KEYS,
  'multiple',
  'presentation',
]);
const ROW_SELECTION_BEHAVIOR_KEYS = new Set([
  ...RADIO_CHOICE_BEHAVIOR_KEYS,
  'multiple',
]);
const TYPED_INPUT_BEHAVIOR_KEYS = new Set([
  'kind',
  'semanticType',
  'role',
]);
const REPEATER_BEHAVIOR_KEYS = new Set(['kind', 'expandable']);
const STEPPER_BEHAVIOR_KEYS = new Set(['kind', 'previous', 'submit']);
const REGISTRY_INPUT_KEYS = new Set(['id', 'version', 'types', 'wrappers']);
const WRAPPER_KEYS = new Set(['name', 'profile', 'activation']);
const WRAPPER_ACTIVATION_KEYS = new Set(['part', 'operation', 'role']);

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

function validateProjectedChoiceBehavior(
  input: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): void {
  const behavior = requireRecord(input, path);
  rejectUnknownKeys(behavior, allowedKeys, path);
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
}

function validateContractedBehavior(
  input: unknown,
  path: string,
): ContractedFormlyTypeBehavior {
  const behavior = requireRecord(input, path);
  switch (behavior.kind) {
    case 'radio-choice':
      validateProjectedChoiceBehavior(
        input,
        path,
        RADIO_CHOICE_BEHAVIOR_KEYS,
      );
      break;
    case 'choice-control':
      validateProjectedChoiceBehavior(
        input,
        path,
        CHOICE_CONTROL_BEHAVIOR_KEYS,
      );
      if (typeof behavior.multiple !== 'boolean') {
        throw new TypeError(`${path}.multiple must be a boolean`);
      }
      if (
        behavior.presentation !== 'radio' &&
        behavior.presentation !== 'checkbox' &&
        behavior.presentation !== 'select' &&
        behavior.presentation !== 'overlay'
      ) {
        throw new TypeError(`${path}.presentation is unsupported`);
      }
      if (behavior.presentation === 'radio' && behavior.multiple) {
        throw new TypeError(`${path}.multiple is unsupported for radio`);
      }
      if (behavior.presentation === 'checkbox' && !behavior.multiple) {
        throw new TypeError(`${path}.multiple must be true for checkbox`);
      }
      break;
    case 'autocomplete-choice':
      validateProjectedChoiceBehavior(
        input,
        path,
        RADIO_CHOICE_BEHAVIOR_KEYS,
      );
      break;
    case 'row-selection':
      validateProjectedChoiceBehavior(
        input,
        path,
        ROW_SELECTION_BEHAVIOR_KEYS,
      );
      if (typeof behavior.multiple !== 'boolean') {
        throw new TypeError(`${path}.multiple must be a boolean`);
      }
      break;
    case 'typed-input':
      rejectUnknownKeys(behavior, TYPED_INPUT_BEHAVIOR_KEYS, path);
      requireStableToken(behavior.semanticType, `${path}.semanticType`);
      if (
        behavior.role !== 'textbox' &&
        behavior.role !== 'searchbox' &&
        behavior.role !== 'spinbutton'
      ) {
        throw new TypeError(`${path}.role is unsupported`);
      }
      break;
    case 'repeater':
      rejectUnknownKeys(behavior, REPEATER_BEHAVIOR_KEYS, path);
      if (typeof behavior.expandable !== 'boolean') {
        throw new TypeError(`${path}.expandable must be a boolean`);
      }
      break;
    case 'stepper':
      rejectUnknownKeys(behavior, STEPPER_BEHAVIOR_KEYS, path);
      if (typeof behavior.previous !== 'boolean') {
        throw new TypeError(`${path}.previous must be a boolean`);
      }
      if (typeof behavior.submit !== 'boolean') {
        throw new TypeError(`${path}.submit must be a boolean`);
      }
      break;
    default:
      throw new TypeError(
        `${path}.kind ${JSON.stringify(behavior.kind)} is unsupported`,
      );
  }
  return input as ContractedFormlyTypeBehavior;
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
  validateContractedBehavior(type.behavior, `${path}.behavior`);
  return input as ContractedFormlyTypeDefinition;
}

function validateContractedWrapper(
  input: unknown,
  path: string,
): ContractedFormlyWrapperDefinition {
  const wrapper = requireRecord(input, path);
  rejectUnknownKeys(wrapper, WRAPPER_KEYS, path);
  requireStableToken(wrapper.name, `${path}.name`);
  const profile = requireRecord(wrapper.profile, `${path}.profile`);
  rejectUnknownKeys(profile, PROFILE_KEYS, `${path}.profile`);
  requireNamespacedId(profile.id, `${path}.profile.id`);
  requireVersion(profile.version, `${path}.profile.version`);
  if (wrapper.activation !== undefined) {
    const activation = requireRecord(wrapper.activation, `${path}.activation`);
    rejectUnknownKeys(activation, WRAPPER_ACTIVATION_KEYS, `${path}.activation`);
    const operation = activation.operation ?? 'click';
    const role = activation.role ?? (operation === 'click' ? 'button' : 'checkbox');
    requireStableToken(activation.part ?? 'activate', `${path}.activation.part`);
    if (operation !== 'click' && operation !== 'check') {
      throw new TypeError(`${path}.activation.operation is unsupported`);
    }
    if (role !== 'button' && role !== 'checkbox' && role !== 'radio') {
      throw new TypeError(`${path}.activation.role is unsupported`);
    }
    if (operation === 'click' && role !== 'button') {
      throw new TypeError(`${path}.activation click requires role button`);
    }
    if (operation === 'check' && role !== 'checkbox' && role !== 'radio') {
      throw new TypeError(`${path}.activation check requires checkbox or radio`);
    }
  }
  return input as ContractedFormlyWrapperDefinition;
}

export function defineContractedFormlyWrapper(
  input: ContractedFormlyWrapperDefinition,
): ContractedFormlyWrapperDefinition {
  const wrapper = validateContractedWrapper(input, 'wrapper');
  const activation = wrapper.activation;
  if (activation === undefined) return wrapper;
  const operation = activation.operation ?? 'click';
  return {
    name: wrapper.name,
    profile: wrapper.profile,
    activation: {
      part: activation.part ?? 'activate',
      operation,
      role: activation.role ?? (operation === 'click' ? 'button' : 'checkbox'),
    },
  };
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

function projectedChoiceFields(
  input: Readonly<Record<string, unknown>>,
  functionName: string,
): Omit<RadioChoiceBehavior, 'kind'> {
  const collectionPath = requirePropertyPath(
    input.collectionPath ?? 'props.options',
    `${functionName}.collectionPath`,
    true,
  );
  const labelPath = requirePropertyPath(
    input.labelPath ?? 'label',
    `${functionName}.labelPath`,
    false,
  );
  const valuePath = requirePropertyPath(
    input.valuePath ?? 'value',
    `${functionName}.valuePath`,
    false,
  );
  const disabledPath =
    input.disabledPath === undefined
      ? undefined
      : requirePropertyPath(
          input.disabledPath,
          `${functionName}.disabledPath`,
          false,
        );
  const completeness = input.completeness ?? 'complete';
  if (completeness !== 'complete' && completeness !== 'scenario') {
    throw new TypeError(`${functionName}.completeness is unsupported`);
  }
  return {
    collectionPath,
    labelPath,
    valuePath,
    ...(disabledPath === undefined ? {} : { disabledPath }),
    completeness,
  };
}

export function typedInput(options: TypedInputOptions): TypedInputBehavior {
  const input = requireRecord(options, 'typedInput');
  rejectUnknownKeys(input, TYPED_INPUT_OPTION_KEYS, 'typedInput');
  const semanticType = requireStableToken(
    input.semanticType,
    'typedInput.semanticType',
  );
  const role = input.role ?? 'textbox';
  if (role !== 'textbox' && role !== 'searchbox' && role !== 'spinbutton') {
    throw new TypeError('typedInput.role is unsupported');
  }
  return { kind: 'typed-input', semanticType, role };
}

export function choiceControl(
  options: ChoiceControlOptions = {},
): ChoiceControlBehavior {
  const input = requireRecord(options, 'choiceControl');
  rejectUnknownKeys(input, CHOICE_CONTROL_OPTION_KEYS, 'choiceControl');
  const multiple = input.multiple ?? false;
  if (typeof multiple !== 'boolean') {
    throw new TypeError('choiceControl.multiple must be a boolean');
  }
  const presentation = input.presentation ?? 'select';
  if (
    presentation !== 'radio' &&
    presentation !== 'checkbox' &&
    presentation !== 'select' &&
    presentation !== 'overlay'
  ) {
    throw new TypeError('choiceControl.presentation is unsupported');
  }
  if (presentation === 'radio' && multiple) {
    throw new TypeError('choiceControl.multiple is unsupported for radio');
  }
  if (presentation === 'checkbox' && !multiple) {
    throw new TypeError('choiceControl.multiple must be true for checkbox');
  }
  return {
    kind: 'choice-control',
    ...projectedChoiceFields(input, 'choiceControl'),
    multiple,
    presentation,
  };
}

export function autocompleteChoice(
  options: AutocompleteChoiceOptions = {},
): AutocompleteChoiceBehavior {
  const input = requireRecord(options, 'autocompleteChoice');
  rejectUnknownKeys(input, RADIO_CHOICE_OPTION_KEYS, 'autocompleteChoice');
  return {
    kind: 'autocomplete-choice',
    ...projectedChoiceFields(input, 'autocompleteChoice'),
  };
}

export function rowSelection(
  options: RowSelectionOptions = {},
): RowSelectionBehavior {
  const input = requireRecord(options, 'rowSelection');
  rejectUnknownKeys(input, ROW_SELECTION_OPTION_KEYS, 'rowSelection');
  const multiple = input.multiple ?? true;
  if (typeof multiple !== 'boolean') {
    throw new TypeError('rowSelection.multiple must be a boolean');
  }
  return {
    kind: 'row-selection',
    ...projectedChoiceFields(input, 'rowSelection'),
    multiple,
  };
}

export function repeater(
  options: RepeaterOptions = {},
): RepeaterBehavior {
  const input = requireRecord(options, 'repeater');
  rejectUnknownKeys(input, REPEATER_OPTION_KEYS, 'repeater');
  const expandable = input.expandable ?? false;
  if (typeof expandable !== 'boolean') {
    throw new TypeError('repeater.expandable must be a boolean');
  }
  return { kind: 'repeater', expandable };
}

export function stepper(options: StepperOptions = {}): StepperBehavior {
  const input = requireRecord(options, 'stepper');
  rejectUnknownKeys(input, STEPPER_OPTION_KEYS, 'stepper');
  const previous = input.previous ?? true;
  const submit = input.submit ?? true;
  if (typeof previous !== 'boolean') {
    throw new TypeError('stepper.previous must be a boolean');
  }
  if (typeof submit !== 'boolean') {
    throw new TypeError('stepper.submit must be a boolean');
  }
  return { kind: 'stepper', previous, submit };
}

export function defineContractedFormlyType<
  const TDefinition extends ContractedFormlyTypeDefinition,
>(definition: TDefinition): TDefinition {
  const validated = validateContractedType(definition);
  const profile = Object.freeze({
    id: validated.profile.id,
    version: validated.profile.version,
  });
  const behavior = Object.freeze({ ...validated.behavior });
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
  type: ContractedFormlyTypeDefinition & { behavior: RadioChoiceBehavior },
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

function projectedValueDomain(
  behavior:
    | RadioChoiceBehavior
    | ChoiceControlBehavior
    | AutocompleteChoiceBehavior
    | RowSelectionBehavior,
): GeneratedFieldTypeProfile['valueDomain'] {
  return {
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
  };
}

function profileIdentity(
  type: ContractedFormlyTypeDefinition,
): ContractedFieldTypeProfileReference {
  return { id: type.profile.id, version: type.profile.version };
}

function lowerTypedInput(
  type: ContractedFormlyTypeDefinition & { behavior: TypedInputBehavior },
): GeneratedFieldTypeProfile {
  return {
    identity: profileIdentity(type),
    semanticType: type.behavior.semanticType,
    valueShape: 'scalar',
    evidence: 'declared',
    parts: [
      {
        name: 'control',
        role: type.behavior.role,
        cardinality: 'one',
        evidence: 'declared',
      },
    ],
    interaction: {
      kind: 'fill',
      operation: 'fill',
      controlPart: 'control',
    },
    valueDomain: { kind: 'not-applicable', evidence: 'declared' },
    driver: {
      kind: 'generic',
      id: 'generic.fill',
      version: 1,
      capabilities: ['fill'],
    },
    effectCapabilities: { targetProperties: [], readiness: [] },
    unknowns: [],
  };
}

function lowerChoiceControl(
  type: ContractedFormlyTypeDefinition & { behavior: ChoiceControlBehavior },
): GeneratedFieldTypeProfile {
  const { behavior } = type;
  const operation =
    behavior.presentation === 'radio' || behavior.presentation === 'checkbox'
      ? 'check'
      : behavior.presentation === 'overlay'
        ? 'select-from-overlay'
        : 'select-option';
  const optionRole =
    behavior.presentation === 'radio'
      ? 'radio'
      : behavior.presentation === 'checkbox'
        ? 'checkbox'
        : 'option';
  const parts: GeneratedFieldTypeProfile['parts'] = [
    {
      name: 'option',
      role: optionRole,
      cardinality: 'many',
      evidence: 'declared',
    },
    ...(behavior.presentation === 'overlay'
      ? ([
          {
            name: 'trigger',
            role: 'combobox',
            cardinality: 'one',
            evidence: 'declared',
          },
          {
            name: 'popup',
            role: 'listbox',
            cardinality: 'one',
            evidence: 'declared',
          },
        ] as const)
      : []),
  ];
  return {
    identity: profileIdentity(type),
    semanticType: behavior.multiple ? 'multi-choice' : 'single-choice',
    valueShape: behavior.multiple ? 'array' : 'scalar',
    evidence: 'declared',
    parts,
    interaction: {
      kind: 'choice',
      operation,
      optionPart: 'option',
      ...(behavior.presentation === 'overlay'
        ? { triggerPart: 'trigger', popupPart: 'popup' }
        : {}),
    },
    valueDomain: projectedValueDomain(behavior),
    driver: {
      kind: 'generic',
      id: 'generic.choice',
      version: 1,
      capabilities: [operation],
    },
    effectCapabilities: { targetProperties: ['options'], readiness: [] },
    unknowns: [],
  };
}

function lowerAutocompleteChoice(
  type: ContractedFormlyTypeDefinition & {
    behavior: AutocompleteChoiceBehavior;
  },
): GeneratedFieldTypeProfile {
  return {
    identity: profileIdentity(type),
    semanticType: 'single-choice',
    valueShape: 'scalar',
    evidence: 'declared',
    parts: [
      {
        name: 'query',
        role: 'combobox',
        cardinality: 'one',
        evidence: 'declared',
      },
      {
        name: 'popup',
        role: 'listbox',
        cardinality: 'one',
        evidence: 'declared',
      },
      {
        name: 'option',
        role: 'option',
        cardinality: 'many',
        evidence: 'declared',
      },
    ],
    interaction: {
      kind: 'autocomplete',
      operation: 'type-and-pick',
      queryPart: 'query',
      popupPart: 'popup',
      optionPart: 'option',
    },
    valueDomain: projectedValueDomain(type.behavior),
    driver: {
      kind: 'generic',
      id: 'generic.autocomplete',
      version: 1,
      capabilities: ['type-and-pick'],
    },
    effectCapabilities: { targetProperties: ['options'], readiness: [] },
    unknowns: [],
  };
}

function lowerRowSelection(
  type: ContractedFormlyTypeDefinition & { behavior: RowSelectionBehavior },
): GeneratedFieldTypeProfile {
  return {
    identity: profileIdentity(type),
    semanticType: type.behavior.multiple
      ? 'multi-row-selection'
      : 'single-row-selection',
    valueShape: 'array',
    evidence: 'declared',
    parts: [
      {
        name: 'row',
        role: 'row',
        cardinality: 'many',
        evidence: 'declared',
      },
      {
        name: 'selection',
        role: type.behavior.multiple ? 'checkbox' : 'radio',
        cardinality: 'many',
        evidence: 'declared',
      },
    ],
    interaction: {
      kind: 'row-selection',
      operation: 'select-row',
      rowPart: 'row',
      selectionPart: 'selection',
    },
    valueDomain: projectedValueDomain(type.behavior),
    driver: {
      kind: 'generic',
      id: 'generic.row-selection',
      version: 1,
      capabilities: ['select-row'],
    },
    effectCapabilities: { targetProperties: ['options'], readiness: [] },
    unknowns: [],
  };
}

function lowerRepeater(
  type: ContractedFormlyTypeDefinition & { behavior: RepeaterBehavior },
): GeneratedFieldTypeProfile {
  return {
    identity: profileIdentity(type),
    semanticType: 'repeater',
    valueShape: 'array',
    evidence: 'declared',
    parts: [
      {
        name: 'add',
        role: 'button',
        cardinality: 'one',
        evidence: 'declared',
      },
      {
        name: 'item',
        role: 'group',
        cardinality: 'many',
        evidence: 'declared',
      },
      ...(type.behavior.expandable
        ? ([
            {
              name: 'expand',
              role: 'button',
              cardinality: 'many',
              evidence: 'declared',
            },
          ] as const)
        : []),
    ],
    interaction: {
      kind: 'repeater',
      operation: 'add-item',
      addPart: 'add',
      itemPart: 'item',
      ...(type.behavior.expandable ? { expandPart: 'expand' } : {}),
    },
    valueDomain: { kind: 'not-applicable', evidence: 'declared' },
    driver: {
      kind: 'generic',
      id: 'generic.repeater',
      version: 1,
      capabilities: [
        'add-item',
        ...(type.behavior.expandable ? (['expand-item'] as const) : []),
      ],
    },
    effectCapabilities: { targetProperties: [], readiness: [] },
    unknowns: [],
  };
}

function lowerStepper(
  type: ContractedFormlyTypeDefinition & { behavior: StepperBehavior },
): GeneratedFieldTypeProfile {
  return {
    identity: profileIdentity(type),
    semanticType: 'stepper',
    valueShape: 'object',
    evidence: 'declared',
    parts: [
      {
        name: 'step',
        role: 'group',
        cardinality: 'many',
        evidence: 'declared',
      },
      {
        name: 'next',
        role: 'button',
        cardinality: 'one',
        evidence: 'declared',
      },
      ...(type.behavior.previous
        ? ([
            {
              name: 'previous',
              role: 'button',
              cardinality: 'one',
              evidence: 'declared',
            },
          ] as const)
        : []),
      ...(type.behavior.submit
        ? ([
            {
              name: 'submit',
              role: 'button',
              cardinality: 'one',
              evidence: 'declared',
            },
          ] as const)
        : []),
    ],
    interaction: {
      kind: 'stepper',
      operation: 'next-step',
      stepPart: 'step',
      nextPart: 'next',
      ...(type.behavior.previous ? { previousPart: 'previous' } : {}),
      ...(type.behavior.submit ? { submitPart: 'submit' } : {}),
    },
    valueDomain: { kind: 'not-applicable', evidence: 'declared' },
    driver: {
      kind: 'generic',
      id: 'generic.stepper',
      version: 1,
      capabilities: [
        'next-step',
        ...(type.behavior.previous ? (['previous-step'] as const) : []),
        ...(type.behavior.submit ? (['submit-stepper'] as const) : []),
      ],
    },
    effectCapabilities: { targetProperties: [], readiness: [] },
    unknowns: [],
  };
}

function lowerContractedType(
  type: ContractedFormlyTypeDefinition,
): GeneratedFieldTypeProfile {
  switch (type.behavior.kind) {
    case 'radio-choice':
      return lowerRadioChoice(type as ContractedFormlyTypeDefinition & {
        behavior: RadioChoiceBehavior;
      });
    case 'typed-input':
      return lowerTypedInput(type as ContractedFormlyTypeDefinition & {
        behavior: TypedInputBehavior;
      });
    case 'choice-control':
      return lowerChoiceControl(type as ContractedFormlyTypeDefinition & {
        behavior: ChoiceControlBehavior;
      });
    case 'autocomplete-choice':
      return lowerAutocompleteChoice(
        type as ContractedFormlyTypeDefinition & {
          behavior: AutocompleteChoiceBehavior;
        },
      );
    case 'row-selection':
      return lowerRowSelection(type as ContractedFormlyTypeDefinition & {
        behavior: RowSelectionBehavior;
      });
    case 'repeater':
      return lowerRepeater(type as ContractedFormlyTypeDefinition & {
        behavior: RepeaterBehavior;
      });
    case 'stepper':
      return lowerStepper(type as ContractedFormlyTypeDefinition & {
        behavior: StepperBehavior;
      });
  }
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
  const authoredWrappers = requireDensePlainArray(
    registry.wrappers ?? [],
    'registry.wrappers',
  );

  const types = authoredTypes.map((entry, index) =>
    validateContractedType(entry, `registry.types[${index}]`),
  );
  const wrappers = authoredWrappers.map((entry, index) =>
    defineContractedFormlyWrapper(
      validateContractedWrapper(entry, `registry.wrappers[${index}]`),
    ),
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
  const wrapperNames = new Set<string>();
  for (const wrapper of wrappers) {
    if (wrapperNames.has(wrapper.name)) {
      throw new TypeError(
        `registry.wrappers duplicates wrapper name "${wrapper.name}"`,
      );
    }
    wrapperNames.add(wrapper.name);
    const profileIdentity = `${wrapper.profile.id}@${wrapper.profile.version}`;
    if (profileIdentities.has(profileIdentity)) {
      throw new TypeError(
        `registry duplicates profile identity "${profileIdentity}"`,
      );
    }
    profileIdentities.add(profileIdentity);
  }

  const profiles = types
    .map(lowerContractedType)
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
  const wrapperProfiles: GeneratedFieldTypeWrapperProfile[] = wrappers
    .map((wrapper) => {
      const activation = wrapper.activation;
      return {
        identity: wrapper.profile,
        wrapperName: wrapper.name,
        evidence: 'declared' as const,
        parts:
          activation === undefined
            ? []
            : [{
                name: activation.part!,
                role: activation.role!,
                cardinality: 'one' as const,
                evidence: 'declared' as const,
              }],
        preconditions:
          activation === undefined
            ? []
            : [{
                kind: 'activate' as const,
                part: activation.part!,
                operation: activation.operation!,
                evidence: 'declared' as const,
              }],
        unknowns: [] as const,
      };
    })
    .sort((left, right) => compareText(left.wrapperName, right.wrapperName));

  return {
    schemaVersion: FIELD_TYPE_PROFILE_SCHEMA_VERSION,
    id,
    version,
    profiles,
    registrations,
    wrappers: wrapperProfiles,
  };
}
