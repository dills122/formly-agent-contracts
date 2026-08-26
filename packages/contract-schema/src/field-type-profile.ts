import { createHash } from 'node:crypto';

import { canonicalStringify } from './canonical-json.js';
import type { ContractEvidence, JsonValue } from './contract.js';

export const FIELD_TYPE_PROFILE_SCHEMA_VERSION = '0.4.0' as const;

export type ContractValueDomain =
  | {
      readonly kind: 'enumerated';
      readonly source:
        | 'static-options'
        | 'resolved-options'
        | 'semantic-type'
        | 'adapter';
      readonly completeness: 'complete' | 'scenario';
      readonly evidence: ContractEvidence;
      readonly values: readonly JsonValue[];
    }
  | {
      readonly kind: 'dynamic';
      readonly source: 'string' | 'function' | 'async';
      readonly evidence: ContractEvidence;
    }
  | {
      readonly kind: 'unknown';
      readonly evidence: ContractEvidence;
    };

export interface FieldTypeProfileIdentity {
  readonly id: string;
  readonly version: number;
}

export interface FieldTypeProfileReference {
  readonly id: string;
  readonly version: number;
}

export interface FieldTypeProfilePart {
  readonly name: string;
  readonly role: string;
  readonly cardinality: 'one' | 'many';
  readonly evidence: 'declared';
}

export type FieldTypeProfileOperation =
  | 'fill'
  | 'check'
  | 'select-option'
  | 'select-from-overlay'
  | 'type-and-pick'
  | 'select-row'
  | 'add-item'
  | 'expand-item';

export type FieldTypeProfileInteraction =
  | {
      readonly kind: 'fill';
      readonly operation: 'fill';
      readonly controlPart: string;
    }
  | {
      readonly kind: 'choice';
      readonly operation:
        | 'check'
        | 'select-option'
        | 'select-from-overlay';
      readonly optionPart: string;
      readonly triggerPart?: string;
      readonly popupPart?: string;
    }
  | {
      readonly kind: 'autocomplete';
      readonly operation: 'type-and-pick';
      readonly queryPart: string;
      readonly popupPart: string;
      readonly optionPart: string;
    }
  | {
      readonly kind: 'row-selection';
      readonly operation: 'select-row';
      readonly rowPart: string;
      readonly selectionPart: string;
    }
  | {
      readonly kind: 'repeater';
      readonly operation: 'add-item' | 'expand-item';
      readonly addPart: string;
      readonly itemPart: string;
      readonly expandPart?: string;
    };

export type FieldTypeProfileValueDomain =
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
  | {
      readonly kind: 'runtime-enumerable';
      readonly completeness: 'scenario';
      readonly optionPart: string;
      readonly evidence: ContractEvidence;
    }
  | {
      readonly kind: 'dynamic';
      readonly source: 'string' | 'function' | 'async';
      readonly evidence: ContractEvidence;
    }
  | {
      readonly kind: 'unknown';
      readonly reason: string;
      readonly evidence: ContractEvidence;
    }
  | {
      readonly kind: 'not-applicable';
      readonly evidence: 'declared';
    };

export type GenericFieldTypeDriverId =
  | 'generic.fill'
  | 'generic.choice'
  | 'generic.autocomplete'
  | 'generic.row-selection'
  | 'generic.repeater';

export type FieldTypeProfileDriver =
  | {
      readonly kind: 'generic';
      readonly id: GenericFieldTypeDriverId;
      readonly version: number;
      readonly capabilities: readonly FieldTypeProfileOperation[];
    }
  | {
      readonly kind: 'application';
      readonly id: string;
      readonly version: number;
      readonly capabilities: readonly FieldTypeProfileOperation[];
    };

export type FieldTypeProfileUnknownAspect =
  | 'semantic-role'
  | 'model-codec'
  | 'runtime-states'
  | 'locator-scope'
  | 'interaction-sequence';

export interface FieldTypeProfileUnknown {
  readonly aspect: FieldTypeProfileUnknownAspect;
  readonly reason: string;
  readonly evidence: ContractEvidence;
}

export interface FieldTypeProfile {
  readonly identity: FieldTypeProfileIdentity;
  readonly semanticType: string;
  readonly valueShape: 'scalar' | 'array' | 'object';
  readonly evidence: 'declared';
  readonly parts: readonly FieldTypeProfilePart[];
  readonly interaction: FieldTypeProfileInteraction;
  readonly valueDomain: FieldTypeProfileValueDomain;
  readonly driver: FieldTypeProfileDriver;
  readonly unknowns: readonly FieldTypeProfileUnknown[];
}

export interface FieldTypeProfileVariantRegistration {
  readonly name: string;
  readonly profile: FieldTypeProfileReference;
}

export interface FieldTypeProfileRegistration {
  readonly formlyType: string;
  readonly defaultProfile: FieldTypeProfileReference;
  readonly variants: readonly FieldTypeProfileVariantRegistration[];
}

export interface FieldTypeWrapperPrecondition {
  readonly kind: 'activate';
  readonly part: string;
  readonly operation: 'click' | 'check';
  readonly evidence: 'declared';
}

export interface FieldTypeWrapperProfile {
  readonly identity: FieldTypeProfileIdentity;
  readonly wrapperName: string;
  readonly evidence: 'declared';
  readonly parts: readonly FieldTypeProfilePart[];
  readonly preconditions: readonly FieldTypeWrapperPrecondition[];
  readonly unknowns: readonly FieldTypeProfileUnknown[];
}

export interface FieldTypeProfileRegistry {
  readonly schemaVersion: typeof FIELD_TYPE_PROFILE_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly profiles: readonly FieldTypeProfile[];
  readonly registrations: readonly FieldTypeProfileRegistration[];
  readonly wrappers: readonly FieldTypeWrapperProfile[];
}

const REGISTRY_KEYS = new Set([
  'schemaVersion',
  'id',
  'version',
  'profiles',
  'registrations',
  'wrappers',
]);
const IDENTITY_KEYS = new Set(['id', 'version']);
const PROFILE_KEYS = new Set([
  'identity',
  'semanticType',
  'valueShape',
  'evidence',
  'parts',
  'interaction',
  'valueDomain',
  'driver',
  'unknowns',
]);
const PART_KEYS = new Set(['name', 'role', 'cardinality', 'evidence']);
const DRIVER_KEYS = new Set([
  'kind',
  'id',
  'version',
  'capabilities',
]);
const UNKNOWN_KEYS = new Set(['aspect', 'reason', 'evidence']);
const REGISTRATION_KEYS = new Set([
  'formlyType',
  'defaultProfile',
  'variants',
]);
const VARIANT_KEYS = new Set(['name', 'profile']);
const WRAPPER_KEYS = new Set([
  'identity',
  'wrapperName',
  'evidence',
  'parts',
  'preconditions',
  'unknowns',
]);
const PRECONDITION_KEYS = new Set([
  'kind',
  'part',
  'operation',
  'evidence',
]);
const CONTRACT_ENUMERATED_DOMAIN_KEYS = new Set([
  'kind',
  'source',
  'completeness',
  'evidence',
  'values',
]);
const CONTRACT_DYNAMIC_DOMAIN_KEYS = new Set([
  'kind',
  'source',
  'evidence',
]);
const CONTRACT_UNKNOWN_DOMAIN_KEYS = new Set(['kind', 'evidence']);
const PROFILE_PROJECTED_DOMAIN_KEYS = new Set([
  'kind',
  'source',
  'completeness',
  'collectionPath',
  'labelPath',
  'valuePath',
  'disabledPath',
  'evidence',
]);
const PROFILE_RUNTIME_DOMAIN_KEYS = new Set([
  'kind',
  'completeness',
  'optionPart',
  'evidence',
]);
const PROFILE_DYNAMIC_DOMAIN_KEYS = CONTRACT_DYNAMIC_DOMAIN_KEYS;
const PROFILE_UNKNOWN_DOMAIN_KEYS = new Set([
  'kind',
  'reason',
  'evidence',
]);
const PROFILE_NOT_APPLICABLE_DOMAIN_KEYS = new Set(['kind', 'evidence']);

const INTERACTION_KEYS = {
  fill: new Set(['kind', 'operation', 'controlPart']),
  choice: new Set([
    'kind',
    'operation',
    'optionPart',
    'triggerPart',
    'popupPart',
  ]),
  autocomplete: new Set([
    'kind',
    'operation',
    'queryPart',
    'popupPart',
    'optionPart',
  ]),
  'row-selection': new Set([
    'kind',
    'operation',
    'rowPart',
    'selectionPart',
  ]),
  repeater: new Set([
    'kind',
    'operation',
    'addPart',
    'itemPart',
    'expandPart',
  ]),
} as const;

const OPERATIONS = [
  'fill',
  'check',
  'select-option',
  'select-from-overlay',
  'type-and-pick',
  'select-row',
  'add-item',
  'expand-item',
] as const satisfies readonly FieldTypeProfileOperation[];

const UNKNOWN_ASPECTS = [
  'semantic-role',
  'model-codec',
  'runtime-states',
  'locator-scope',
  'interaction-sequence',
] as const satisfies readonly FieldTypeProfileUnknownAspect[];

const GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECT_POLICY = new Set<
  FieldTypeProfileUnknownAspect
>([
  'model-codec',
  'locator-scope',
  'interaction-sequence',
]);

export const GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS = Object.freeze([
  ...GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECT_POLICY,
]);

const GENERIC_DRIVER_BY_INTERACTION = {
  fill: 'generic.fill',
  choice: 'generic.choice',
  autocomplete: 'generic.autocomplete',
  'row-selection': 'generic.row-selection',
  repeater: 'generic.repeater',
} as const satisfies Readonly<
  Record<FieldTypeProfileInteraction['kind'], GenericFieldTypeDriverId>
>;

const GENERIC_DRIVER_CAPABILITIES = {
  'generic.fill': new Set<FieldTypeProfileOperation>(['fill']),
  'generic.choice': new Set<FieldTypeProfileOperation>([
    'check',
    'select-option',
    'select-from-overlay',
  ]),
  'generic.autocomplete': new Set<FieldTypeProfileOperation>([
    'type-and-pick',
  ]),
  'generic.row-selection': new Set<FieldTypeProfileOperation>(['select-row']),
  'generic.repeater': new Set<FieldTypeProfileOperation>([
    'add-item',
    'expand-item',
  ]),
} as const satisfies Readonly<
  Record<GenericFieldTypeDriverId, ReadonlySet<FieldTypeProfileOperation>>
>;

function assertCanonicalJsonShape(
  value: unknown,
  path: string,
  ancestors = new Set<object>(),
): void {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must be a finite JSON number`);
    }
    return;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`${path} must be a JSON value`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${path} must not contain a cycle`);
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new TypeError(`${path} must be a plain or null-prototype object`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol-keyed properties`);
  }

  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const itemPath = `${path}[${index}]`;
        const descriptor = descriptors[String(index)];
        if (descriptor === undefined) {
          throw new TypeError(
            `${itemPath} must not be a sparse array element`,
          );
        }
        if (!('value' in descriptor)) {
          throw new TypeError(`${itemPath} must not be an accessor property`);
        }
        assertCanonicalJsonShape(descriptor.value, itemPath, ancestors);
      }
      for (const key of Object.keys(descriptors)) {
        if (
          key !== 'length' &&
          !/^(?:0|[1-9][0-9]*)$/u.test(key)
        ) {
          throw new TypeError(
            `${path}.${key} must not be an additional array property`,
          );
        }
      }
      return;
    }

    for (const [key, descriptor] of Object.entries(descriptors)) {
      const propertyPath = `${path}.${key}`;
      if (!descriptor.enumerable) {
        throw new TypeError(
          `${propertyPath} must be an enumerable JSON property`,
        );
      }
      if (!('value' in descriptor)) {
        throw new TypeError(
          `${propertyPath} must not be an accessor property`,
        );
      }
      assertCanonicalJsonShape(descriptor.value, propertyPath, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function requireRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} must be an array`);
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

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function requireToken(value: unknown, path: string): string {
  const token = requireString(value, path);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(token)) {
    throw new TypeError(`${path} must be a stable token`);
  }
  return token;
}

function requireNamespacedId(value: unknown, path: string): string {
  const id = requireString(value, path);
  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u.test(id)) {
    throw new TypeError(`${path} must be a stable namespaced identifier`);
  }
  return id;
}

function requireVersion(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new TypeError(`${path} must be a positive safe integer`);
  }
  return value as number;
}

function requireEvidence(value: unknown, path: string): ContractEvidence {
  if (
    value !== 'declared' &&
    value !== 'resolved' &&
    value !== 'observed'
  ) {
    throw new TypeError(`${path} is unsupported`);
  }
  return value;
}

function requireDeclaredEvidence(
  value: unknown,
  path: string,
): 'declared' {
  if (value !== 'declared') {
    throw new TypeError(`${path} must be "declared"`);
  }
  return value;
}

function requireOperation(
  value: unknown,
  path: string,
): FieldTypeProfileOperation {
  if (!OPERATIONS.includes(value as FieldTypeProfileOperation)) {
    throw new TypeError(`${path} is unsupported`);
  }
  return value as FieldTypeProfileOperation;
}

function identityKey(identity: FieldTypeProfileReference): string {
  return `${identity.id}@${identity.version}`;
}

function validateIdentity(
  value: unknown,
  path: string,
): FieldTypeProfileIdentity {
  const identity = requireRecord(value, path);
  rejectUnknownKeys(identity, IDENTITY_KEYS, path);
  requireNamespacedId(identity.id, `${path}.id`);
  requireVersion(identity.version, `${path}.version`);
  return value as FieldTypeProfileIdentity;
}

function validatePart(value: unknown, path: string): FieldTypeProfilePart {
  const part = requireRecord(value, path);
  rejectUnknownKeys(part, PART_KEYS, path);
  requireToken(part.name, `${path}.name`);
  requireToken(part.role, `${path}.role`);
  if (part.cardinality !== 'one' && part.cardinality !== 'many') {
    throw new TypeError(`${path}.cardinality is unsupported`);
  }
  requireDeclaredEvidence(part.evidence, `${path}.evidence`);
  return value as FieldTypeProfilePart;
}

function validateParts(
  value: unknown,
  path: string,
): readonly FieldTypeProfilePart[] {
  const parts = requireArray(value, path);
  if (parts.length === 0) {
    throw new TypeError(`${path} must contain at least one part`);
  }
  const names = new Set<string>();
  return parts.map((part, index) => {
    const parsed = validatePart(part, `${path}[${index}]`);
    if (names.has(parsed.name)) {
      throw new TypeError(
        `${path}[${index}].name duplicates part name "${parsed.name}"`,
      );
    }
    names.add(parsed.name);
    return parsed;
  });
}

function requirePartReference(
  value: unknown,
  path: string,
  partNames: ReadonlySet<string>,
): string {
  const name = requireToken(value, path);
  if (!partNames.has(name)) {
    throw new TypeError(`${path} references missing part "${name}"`);
  }
  return name;
}

function validateInteraction(
  value: unknown,
  path: string,
  partNames: ReadonlySet<string>,
): FieldTypeProfileInteraction {
  const interaction = requireRecord(value, path);
  const kind = requireString(interaction.kind, `${path}.kind`);
  if (!(kind in INTERACTION_KEYS)) {
    throw new TypeError(`${path}.kind is unsupported`);
  }
  rejectUnknownKeys(
    interaction,
    INTERACTION_KEYS[kind as keyof typeof INTERACTION_KEYS],
    path,
  );
  const operation = requireOperation(
    interaction.operation,
    `${path}.operation`,
  );

  switch (kind) {
    case 'fill':
      if (operation !== 'fill') {
        throw new TypeError(`${path}.operation is unsupported for fill`);
      }
      requirePartReference(
        interaction.controlPart,
        `${path}.controlPart`,
        partNames,
      );
      break;
    case 'choice':
      if (
        operation !== 'check' &&
        operation !== 'select-option' &&
        operation !== 'select-from-overlay'
      ) {
        throw new TypeError(`${path}.operation is unsupported for choice`);
      }
      requirePartReference(
        interaction.optionPart,
        `${path}.optionPart`,
        partNames,
      );
      if (interaction.triggerPart !== undefined) {
        requirePartReference(
          interaction.triggerPart,
          `${path}.triggerPart`,
          partNames,
        );
      }
      if (interaction.popupPart !== undefined) {
        requirePartReference(
          interaction.popupPart,
          `${path}.popupPart`,
          partNames,
        );
      }
      if (
        operation === 'select-from-overlay' &&
        (interaction.triggerPart === undefined ||
          interaction.popupPart === undefined)
      ) {
        throw new TypeError(
          `${path} select-from-overlay requires triggerPart and popupPart`,
        );
      }
      break;
    case 'autocomplete':
      if (operation !== 'type-and-pick') {
        throw new TypeError(
          `${path}.operation is unsupported for autocomplete`,
        );
      }
      for (const property of [
        'queryPart',
        'popupPart',
        'optionPart',
      ] as const) {
        requirePartReference(
          interaction[property],
          `${path}.${property}`,
          partNames,
        );
      }
      break;
    case 'row-selection':
      if (operation !== 'select-row') {
        throw new TypeError(
          `${path}.operation is unsupported for row-selection`,
        );
      }
      for (const property of ['rowPart', 'selectionPart'] as const) {
        requirePartReference(
          interaction[property],
          `${path}.${property}`,
          partNames,
        );
      }
      break;
    case 'repeater':
      if (operation !== 'add-item' && operation !== 'expand-item') {
        throw new TypeError(`${path}.operation is unsupported for repeater`);
      }
      for (const property of ['addPart', 'itemPart'] as const) {
        requirePartReference(
          interaction[property],
          `${path}.${property}`,
          partNames,
        );
      }
      if (interaction.expandPart !== undefined) {
        requirePartReference(
          interaction.expandPart,
          `${path}.expandPart`,
          partNames,
        );
      }
      if (operation === 'expand-item' && interaction.expandPart === undefined) {
        throw new TypeError(`${path} expand-item requires expandPart`);
      }
      break;
  }

  return value as FieldTypeProfileInteraction;
}

function validateJsonValue(value: unknown, path: string): JsonValue {
  try {
    canonicalStringify(value);
  } catch {
    throw new TypeError(`${path} must be JSON-safe`);
  }
  return value as JsonValue;
}

export function parseContractValueDomain(input: unknown): ContractValueDomain {
  const path = 'valueDomain';
  assertCanonicalJsonShape(input, path);
  const domain = requireRecord(input, path);
  const kind = requireString(domain.kind, `${path}.kind`);
  requireEvidence(domain.evidence, `${path}.evidence`);

  if (kind === 'enumerated') {
    rejectUnknownKeys(domain, CONTRACT_ENUMERATED_DOMAIN_KEYS, path);
    if (
      domain.source !== 'static-options' &&
      domain.source !== 'resolved-options' &&
      domain.source !== 'semantic-type' &&
      domain.source !== 'adapter'
    ) {
      throw new TypeError(`${path}.source is unsupported`);
    }
    const allowedCompleteness: readonly string[] =
      domain.source === 'resolved-options'
        ? ['scenario']
        : domain.source === 'adapter'
          ? ['complete', 'scenario']
          : ['complete'];
    if (!allowedCompleteness.includes(domain.completeness as string)) {
      const expectedCompleteness = allowedCompleteness
        .map((value) => `"${value}"`)
        .join(' or ');
      throw new TypeError(
        `${path}.completeness must be ${expectedCompleteness} for ${domain.source}`,
      );
    }
    const values = requireArray(domain.values, `${path}.values`);
    const canonicalValues = new Set<string>();
    values.forEach((value, index) => {
      const itemPath = `${path}.values[${index}]`;
      validateJsonValue(value, itemPath);
      const canonical = canonicalStringify(value);
      if (canonicalValues.has(canonical)) {
        throw new TypeError(`${itemPath} duplicates canonical value`);
      }
      canonicalValues.add(canonical);
    });
    return input as ContractValueDomain;
  }

  if (kind === 'dynamic') {
    rejectUnknownKeys(domain, CONTRACT_DYNAMIC_DOMAIN_KEYS, path);
    if (
      domain.source !== 'string' &&
      domain.source !== 'function' &&
      domain.source !== 'async'
    ) {
      throw new TypeError(`${path}.source is unsupported`);
    }
    return input as ContractValueDomain;
  }

  if (kind === 'unknown') {
    rejectUnknownKeys(domain, CONTRACT_UNKNOWN_DOMAIN_KEYS, path);
    return input as ContractValueDomain;
  }

  throw new TypeError(`${path}.kind is unsupported`);
}

function requirePropertyPath(
  value: unknown,
  path: string,
  rootAtProps: boolean,
): string {
  const propertyPath = requireString(value, path);
  const segment = '[A-Za-z_$][A-Za-z0-9_$]*';
  const pattern = new RegExp(
    rootAtProps
      ? `^props(?:\\.${segment})+$`
      : `^${segment}(?:\\.${segment})*$`,
    'u',
  );
  if (!pattern.test(propertyPath)) {
    throw new TypeError(
      `${path} must be a dot-delimited property path${
        rootAtProps ? ' rooted at props' : ''
      }`,
    );
  }
  return propertyPath;
}

function validateProfileValueDomain(
  value: unknown,
  path: string,
  partNames: ReadonlySet<string>,
): FieldTypeProfileValueDomain {
  const domain = requireRecord(value, path);
  const kind = requireString(domain.kind, `${path}.kind`);
  requireEvidence(domain.evidence, `${path}.evidence`);

  switch (kind) {
    case 'projected':
      rejectUnknownKeys(domain, PROFILE_PROJECTED_DOMAIN_KEYS, path);
      requireDeclaredEvidence(domain.evidence, `${path}.evidence`);
      if (domain.source !== 'adapter') {
        throw new TypeError(`${path}.source must be "adapter"`);
      }
      if (
        domain.completeness !== 'complete' &&
        domain.completeness !== 'scenario'
      ) {
        throw new TypeError(`${path}.completeness is unsupported`);
      }
      requirePropertyPath(
        domain.collectionPath,
        `${path}.collectionPath`,
        true,
      );
      requirePropertyPath(domain.labelPath, `${path}.labelPath`, false);
      requirePropertyPath(domain.valuePath, `${path}.valuePath`, false);
      if (domain.disabledPath !== undefined) {
        requirePropertyPath(
          domain.disabledPath,
          `${path}.disabledPath`,
          false,
        );
      }
      break;
    case 'runtime-enumerable':
      rejectUnknownKeys(domain, PROFILE_RUNTIME_DOMAIN_KEYS, path);
      if (domain.completeness !== 'scenario') {
        throw new TypeError(`${path}.completeness must be "scenario"`);
      }
      requirePartReference(
        domain.optionPart,
        `${path}.optionPart`,
        partNames,
      );
      break;
    case 'dynamic':
      rejectUnknownKeys(domain, PROFILE_DYNAMIC_DOMAIN_KEYS, path);
      if (
        domain.source !== 'string' &&
        domain.source !== 'function' &&
        domain.source !== 'async'
      ) {
        throw new TypeError(`${path}.source is unsupported`);
      }
      break;
    case 'unknown':
      rejectUnknownKeys(domain, PROFILE_UNKNOWN_DOMAIN_KEYS, path);
      requireString(domain.reason, `${path}.reason`);
      break;
    case 'not-applicable':
      rejectUnknownKeys(domain, PROFILE_NOT_APPLICABLE_DOMAIN_KEYS, path);
      requireDeclaredEvidence(domain.evidence, `${path}.evidence`);
      break;
    default:
      throw new TypeError(`${path}.kind is unsupported`);
  }
  return value as FieldTypeProfileValueDomain;
}

function requireGenericPartSurface(
  parts: ReadonlyMap<string, FieldTypeProfilePart>,
  partName: string,
  driverId: GenericFieldTypeDriverId,
  roles: readonly string[],
  cardinality: 'one' | 'many',
): void {
  const part = parts.get(partName);
  if (part == null) {
    throw new TypeError(
      `driver: ${driverId} references missing part "${partName}"`,
    );
  }
  if (!roles.includes(part.role)) {
    const roleDescription =
      roles.length === 1
        ? roles[0]
        : `${roles.slice(0, -1).join(', ')}, or ${roles.at(-1)}`;
    throw new TypeError(
      `driver: ${driverId} requires part "${partName}" to have role ${roleDescription}`,
    );
  }
  if (part.cardinality !== cardinality) {
    throw new TypeError(
      `driver: ${driverId} requires part "${partName}" to have cardinality ${cardinality}`,
    );
  }
}

function validateGenericCapabilitySurface(
  capability: FieldTypeProfileOperation,
  driverId: GenericFieldTypeDriverId,
  interaction: FieldTypeProfileInteraction,
  parts: ReadonlyMap<string, FieldTypeProfilePart>,
  path: string,
): void {
  switch (capability) {
    case 'fill':
      if (interaction.kind !== 'fill') {
        throw new TypeError(`${path}: capability "fill" requires fill interaction`);
      }
      requireGenericPartSurface(
        parts,
        interaction.controlPart,
        driverId,
        ['textbox', 'searchbox', 'spinbutton'],
        'one',
      );
      return;
    case 'check':
      if (interaction.kind !== 'choice') {
        throw new TypeError(
          `${path}: capability "check" requires choice interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['radio', 'checkbox'],
        'many',
      );
      return;
    case 'select-option':
      if (interaction.kind !== 'choice') {
        throw new TypeError(
          `${path}: capability "select-option" requires choice interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['option'],
        'many',
      );
      return;
    case 'select-from-overlay':
      if (interaction.kind !== 'choice') {
        throw new TypeError(
          `${path}: capability "select-from-overlay" requires choice interaction`,
        );
      }
      if (
        interaction.triggerPart === undefined ||
        interaction.popupPart === undefined
      ) {
        throw new TypeError(
          `${path}: capability "select-from-overlay" requires triggerPart and popupPart`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.triggerPart,
        driverId,
        ['button', 'combobox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.popupPart,
        driverId,
        ['listbox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['option'],
        'many',
      );
      return;
    case 'type-and-pick':
      if (interaction.kind !== 'autocomplete') {
        throw new TypeError(
          `${path}: capability "type-and-pick" requires autocomplete interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.queryPart,
        driverId,
        ['combobox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.popupPart,
        driverId,
        ['listbox'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.optionPart,
        driverId,
        ['option'],
        'many',
      );
      return;
    case 'select-row':
      if (interaction.kind !== 'row-selection') {
        throw new TypeError(
          `${path}: capability "select-row" requires row-selection interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.rowPart,
        driverId,
        ['row'],
        'many',
      );
      requireGenericPartSurface(
        parts,
        interaction.selectionPart,
        driverId,
        ['checkbox', 'radio'],
        'many',
      );
      return;
    case 'add-item':
      if (interaction.kind !== 'repeater') {
        throw new TypeError(
          `${path}: capability "add-item" requires repeater interaction`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.addPart,
        driverId,
        ['button'],
        'one',
      );
      requireGenericPartSurface(
        parts,
        interaction.itemPart,
        driverId,
        ['group'],
        'many',
      );
      return;
    case 'expand-item':
      if (interaction.kind !== 'repeater') {
        throw new TypeError(
          `${path}: capability "expand-item" requires repeater interaction`,
        );
      }
      if (interaction.expandPart === undefined) {
        throw new TypeError(
          `${path}: capability "expand-item" requires expandPart`,
        );
      }
      requireGenericPartSurface(
        parts,
        interaction.expandPart,
        driverId,
        ['button'],
        'many',
      );
      requireGenericPartSurface(
        parts,
        interaction.itemPart,
        driverId,
        ['group'],
        'many',
      );
      return;
  }
}

function validateDriver(
  value: unknown,
  path: string,
  interaction: FieldTypeProfileInteraction,
  valueDomain: FieldTypeProfileValueDomain,
  parts: readonly FieldTypeProfilePart[],
  unknowns: readonly FieldTypeProfileUnknown[],
): FieldTypeProfileDriver {
  const driver = requireRecord(value, path);
  rejectUnknownKeys(driver, DRIVER_KEYS, path);
  if (driver.kind !== 'generic' && driver.kind !== 'application') {
    throw new TypeError(`${path}.kind is unsupported`);
  }
  const id = requireNamespacedId(driver.id, `${path}.id`);
  requireVersion(driver.version, `${path}.version`);
  const capabilities = requireArray(
    driver.capabilities,
    `${path}.capabilities`,
  );
  if (capabilities.length === 0) {
    throw new TypeError(`${path}.capabilities must contain at least one entry`);
  }
  const parsedCapabilities = new Set<FieldTypeProfileOperation>();
  capabilities.forEach((capability, index) => {
    const parsed = requireOperation(
      capability,
      `${path}.capabilities[${index}]`,
    );
    if (parsedCapabilities.has(parsed)) {
      throw new TypeError(
        `${path}.capabilities[${index}] duplicates capability "${parsed}"`,
      );
    }
    parsedCapabilities.add(parsed);
  });
  if (!parsedCapabilities.has(interaction.operation)) {
    throw new TypeError(
      `${path} capabilities must include interaction operation "${interaction.operation}"`,
    );
  }

  if (driver.kind === 'generic') {
    const expected = GENERIC_DRIVER_BY_INTERACTION[interaction.kind];
    if (id !== expected) {
      throw new TypeError(
        `${path}: interaction ${interaction.kind} requires ${expected}`,
      );
    }
    if (driver.version !== 1) {
      throw new TypeError(
        `${path}: generic driver ${expected} only supports version 1`,
      );
    }
    const blockingUnknown = unknowns.find(({ aspect }) =>
      GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECT_POLICY.has(aspect),
    );
    if (blockingUnknown !== undefined) {
      throw new TypeError(
        `${path}: generic driver ${expected} is blocked by unknown aspect "${blockingUnknown.aspect}"`,
      );
    }
    const supported = GENERIC_DRIVER_CAPABILITIES[expected];
    const partsByName = new Map(parts.map((part) => [part.name, part]));
    for (const capability of parsedCapabilities) {
      if (!supported.has(capability)) {
        throw new TypeError(
          `${path}: ${expected} does not support capability "${capability}"`,
        );
      }
      validateGenericCapabilitySurface(
        capability,
        expected,
        interaction,
        partsByName,
        path,
      );
    }
    if (
      (interaction.kind === 'choice' ||
        interaction.kind === 'autocomplete' ||
        interaction.kind === 'row-selection') &&
      valueDomain.kind !== 'projected'
    ) {
      throw new TypeError(
        `${path}: generic ${interaction.kind} requires a projected label-to-model-value mapping`,
      );
    }
  } else if (id.startsWith('generic.')) {
    throw new TypeError(
      `${path}: application driver IDs must not use the reserved "generic." prefix`,
    );
  }
  return value as FieldTypeProfileDriver;
}

function validateUnknowns(
  value: unknown,
  path: string,
): readonly FieldTypeProfileUnknown[] {
  const unknowns = requireArray(value, path);
  const aspects = new Set<FieldTypeProfileUnknownAspect>();
  return unknowns.map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const unknown = requireRecord(entry, itemPath);
    rejectUnknownKeys(unknown, UNKNOWN_KEYS, itemPath);
    if (
      !UNKNOWN_ASPECTS.includes(
        unknown.aspect as FieldTypeProfileUnknownAspect,
      )
    ) {
      throw new TypeError(`${itemPath}.aspect is unsupported`);
    }
    const aspect = unknown.aspect as FieldTypeProfileUnknownAspect;
    if (aspects.has(aspect)) {
      throw new TypeError(
        `${itemPath}.aspect duplicates unknown aspect "${aspect}"`,
      );
    }
    aspects.add(aspect);
    requireString(unknown.reason, `${itemPath}.reason`);
    requireEvidence(unknown.evidence, `${itemPath}.evidence`);
    return entry as FieldTypeProfileUnknown;
  });
}

function validateProfile(value: unknown, path: string): FieldTypeProfile {
  const profile = requireRecord(value, path);
  rejectUnknownKeys(profile, PROFILE_KEYS, path);
  validateIdentity(profile.identity, `${path}.identity`);
  requireToken(profile.semanticType, `${path}.semanticType`);
  if (
    profile.valueShape !== 'scalar' &&
    profile.valueShape !== 'array' &&
    profile.valueShape !== 'object'
  ) {
    throw new TypeError(`${path}.valueShape is unsupported`);
  }
  requireDeclaredEvidence(profile.evidence, `${path}.evidence`);
  const parts = validateParts(profile.parts, `${path}.parts`);
  const partNames = new Set(parts.map(({ name }) => name));
  const interaction = validateInteraction(
    profile.interaction,
    `${path}.interaction`,
    partNames,
  );
  const valueDomain = validateProfileValueDomain(
    profile.valueDomain,
    `${path}.valueDomain`,
    partNames,
  );
  const unknowns = validateUnknowns(profile.unknowns, `${path}.unknowns`);
  validateDriver(
    profile.driver,
    `${path}.driver`,
    interaction,
    valueDomain,
    parts,
    unknowns,
  );
  return value as FieldTypeProfile;
}

function validateReference(
  value: unknown,
  path: string,
  profiles: ReadonlySet<string>,
): FieldTypeProfileReference {
  const reference = validateIdentity(value, path);
  const key = identityKey(reference);
  if (!profiles.has(key)) {
    throw new TypeError(`${path} references missing profile "${key}"`);
  }
  return reference;
}

function validateRegistration(
  value: unknown,
  path: string,
  profiles: ReadonlySet<string>,
): FieldTypeProfileRegistration {
  const registration = requireRecord(value, path);
  rejectUnknownKeys(registration, REGISTRATION_KEYS, path);
  requireToken(registration.formlyType, `${path}.formlyType`);
  validateReference(
    registration.defaultProfile,
    `${path}.defaultProfile`,
    profiles,
  );
  const variants = requireArray(registration.variants, `${path}.variants`);
  const names = new Set<string>();
  variants.forEach((entry, index) => {
    const itemPath = `${path}.variants[${index}]`;
    const variant = requireRecord(entry, itemPath);
    rejectUnknownKeys(variant, VARIANT_KEYS, itemPath);
    const name = requireToken(variant.name, `${itemPath}.name`);
    if (names.has(name)) {
      throw new TypeError(
        `${itemPath}.name duplicates variant name "${name}"`,
      );
    }
    names.add(name);
    validateReference(variant.profile, `${itemPath}.profile`, profiles);
  });
  return value as FieldTypeProfileRegistration;
}

function validateWrapper(
  value: unknown,
  path: string,
): FieldTypeWrapperProfile {
  const wrapper = requireRecord(value, path);
  rejectUnknownKeys(wrapper, WRAPPER_KEYS, path);
  validateIdentity(wrapper.identity, `${path}.identity`);
  requireToken(wrapper.wrapperName, `${path}.wrapperName`);
  requireDeclaredEvidence(wrapper.evidence, `${path}.evidence`);
  const parts = validateParts(wrapper.parts, `${path}.parts`);
  const partsByName = new Map(parts.map((part) => [part.name, part]));
  const partNames = new Set(partsByName.keys());
  const preconditions = requireArray(
    wrapper.preconditions,
    `${path}.preconditions`,
  );
  preconditions.forEach((entry, index) => {
    const itemPath = `${path}.preconditions[${index}]`;
    const precondition = requireRecord(entry, itemPath);
    rejectUnknownKeys(precondition, PRECONDITION_KEYS, itemPath);
    if (precondition.kind !== 'activate') {
      throw new TypeError(`${itemPath}.kind is unsupported`);
    }
    const partName = requirePartReference(
      precondition.part,
      `${itemPath}.part`,
      partNames,
    );
    if (
      precondition.operation !== 'click' &&
      precondition.operation !== 'check'
    ) {
      throw new TypeError(`${itemPath}.operation is unsupported`);
    }
    const part = partsByName.get(partName)!;
    const allowedRoles =
      precondition.operation === 'click'
        ? (['button'] as const)
        : (['checkbox', 'radio'] as const);
    if (!(allowedRoles as readonly string[]).includes(part.role)) {
      throw new TypeError(
        `wrapper activation operation "${precondition.operation}" requires part "${partName}" to have role ${allowedRoles.join(' or ')}`,
      );
    }
    if (part.cardinality !== 'one') {
      throw new TypeError(
        `wrapper activation operation "${precondition.operation}" requires part "${partName}" to have cardinality one`,
      );
    }
    requireDeclaredEvidence(precondition.evidence, `${itemPath}.evidence`);
  });
  validateUnknowns(wrapper.unknowns, `${path}.unknowns`);
  return value as FieldTypeWrapperProfile;
}

export function parseFieldTypeProfileRegistry(
  input: unknown,
): FieldTypeProfileRegistry {
  const path = 'registry';
  assertCanonicalJsonShape(input, path);
  const registry = requireRecord(input, path);
  rejectUnknownKeys(registry, REGISTRY_KEYS, path);
  if (registry.schemaVersion !== FIELD_TYPE_PROFILE_SCHEMA_VERSION) {
    throw new TypeError(`${path}.schemaVersion is unsupported`);
  }
  requireNamespacedId(registry.id, `${path}.id`);
  requireVersion(registry.version, `${path}.version`);

  const profiles = requireArray(registry.profiles, `${path}.profiles`);
  const profileIdentities = new Set<string>();
  profiles.forEach((entry, index) => {
    const profile = validateProfile(entry, `${path}.profiles[${index}]`);
    const key = identityKey(profile.identity);
    if (profileIdentities.has(key)) {
      throw new TypeError(
        `${path}.profiles[${index}].identity duplicates profile identity "${key}"`,
      );
    }
    profileIdentities.add(key);
  });

  const registrations = requireArray(
    registry.registrations,
    `${path}.registrations`,
  );
  const formlyTypes = new Set<string>();
  registrations.forEach((entry, index) => {
    const registration = validateRegistration(
      entry,
      `${path}.registrations[${index}]`,
      profileIdentities,
    );
    if (formlyTypes.has(registration.formlyType)) {
      throw new TypeError(
        `${path}.registrations[${index}].formlyType duplicates Formly type "${registration.formlyType}"`,
      );
    }
    formlyTypes.add(registration.formlyType);
  });

  const wrappers = requireArray(registry.wrappers, `${path}.wrappers`);
  const wrapperNames = new Set<string>();
  const wrapperIdentities = new Set<string>();
  wrappers.forEach((entry, index) => {
    const wrapper = validateWrapper(entry, `${path}.wrappers[${index}]`);
    const key = identityKey(wrapper.identity);
    if (wrapperIdentities.has(key)) {
      throw new TypeError(
        `${path}.wrappers[${index}].identity duplicates wrapper identity "${key}"`,
      );
    }
    wrapperIdentities.add(key);
    if (wrapperNames.has(wrapper.wrapperName)) {
      throw new TypeError(
        `${path}.wrappers[${index}].wrapperName duplicates wrapper name "${wrapper.wrapperName}"`,
      );
    }
    wrapperNames.add(wrapper.wrapperName);
  });

  return input as FieldTypeProfileRegistry;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareIdentity(
  left: { readonly identity: FieldTypeProfileIdentity },
  right: { readonly identity: FieldTypeProfileIdentity },
): number {
  return (
    compareText(left.identity.id, right.identity.id) ||
    left.identity.version - right.identity.version
  );
}

function canonicalProfile(profile: FieldTypeProfile): FieldTypeProfile {
  return {
    ...profile,
    parts: [...profile.parts].sort((left, right) =>
      compareText(left.name, right.name),
    ),
    driver: {
      ...profile.driver,
      capabilities: [...profile.driver.capabilities].sort(compareText),
    },
    unknowns: [...profile.unknowns].sort((left, right) =>
      compareText(left.aspect, right.aspect),
    ),
  };
}

function canonicalWrapper(
  wrapper: FieldTypeWrapperProfile,
): FieldTypeWrapperProfile {
  return {
    ...wrapper,
    parts: [...wrapper.parts].sort((left, right) =>
      compareText(left.name, right.name),
    ),
    unknowns: [...wrapper.unknowns].sort((left, right) =>
      compareText(left.aspect, right.aspect),
    ),
  };
}

function canonicalRegistry(
  registry: FieldTypeProfileRegistry,
): FieldTypeProfileRegistry {
  return {
    ...registry,
    profiles: [...registry.profiles]
      .sort(compareIdentity)
      .map(canonicalProfile),
    registrations: [...registry.registrations]
      .sort((left, right) => compareText(left.formlyType, right.formlyType))
      .map((registration) => ({
        ...registration,
        variants: [...registration.variants].sort((left, right) =>
          compareText(left.name, right.name),
        ),
      })),
    wrappers: [...registry.wrappers]
      .sort((left, right) =>
        compareText(left.wrapperName, right.wrapperName),
      )
      .map(canonicalWrapper),
  };
}

export function canonicalizeFieldTypeProfileRegistry(input: unknown): string {
  const registry = parseFieldTypeProfileRegistry(input);
  return canonicalStringify(canonicalRegistry(registry));
}

export function computeFieldTypeProfileRegistryHash(input: unknown): string {
  const canonical = canonicalizeFieldTypeProfileRegistry(input);
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}
