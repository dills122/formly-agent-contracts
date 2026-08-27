import { createHash } from 'node:crypto';

import {
  canonicalStringify,
  parseArrayIndexProperty,
} from './canonical-json.js';

export const CROSS_FIELD_EFFECT_SCHEMA_VERSION = '0.4.0' as const;

export interface CrossFieldEffectIdentity {
  readonly id: string;
  readonly version: number;
}

export type CrossFieldEffectTriggerEvent =
  | 'selectionChanged'
  | 'valueChanged';

export type CrossFieldEffectTargetProperty =
  | 'enabled'
  | 'options'
  | 'required'
  | 'value'
  | 'visibility';

export type CrossFieldEffectKind =
  | 'clears'
  | 'controls-state'
  | 'filters'
  | 'loads'
  | 'toggles';

export type CrossFieldEffectTiming =
  | { readonly mode: 'sync' }
  | { readonly mode: 'async'; readonly readinessId: string }
  | { readonly mode: 'unknown' };

export interface DeclaredCrossFieldEffect {
  readonly identity: CrossFieldEffectIdentity;
  readonly trigger: {
    readonly nodeId: string;
    readonly event: CrossFieldEffectTriggerEvent;
  };
  readonly target: {
    readonly nodeId: string;
    readonly property: CrossFieldEffectTargetProperty;
  };
  readonly kind: CrossFieldEffectKind;
  readonly timing: CrossFieldEffectTiming;
  readonly conditionRuleId?: string;
  readonly ordering: 'none' | 'source-before-target';
  readonly evidence: 'declared';
  readonly opacity: 'transparent';
}

export interface FormCrossFieldEffects {
  readonly formId: string;
  readonly effects: readonly DeclaredCrossFieldEffect[];
}

export interface CrossFieldEffectRegistry {
  readonly schemaVersion: typeof CROSS_FIELD_EFFECT_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly forms: readonly FormCrossFieldEffects[];
}

const REGISTRY_KEYS = new Set(['schemaVersion', 'id', 'version', 'forms']);
const FORM_KEYS = new Set(['formId', 'effects']);
const EFFECT_KEYS = new Set([
  'identity',
  'trigger',
  'target',
  'kind',
  'timing',
  'conditionRuleId',
  'ordering',
  'evidence',
  'opacity',
]);
const IDENTITY_KEYS = new Set(['id', 'version']);
const TRIGGER_KEYS = new Set(['nodeId', 'event']);
const TARGET_KEYS = new Set(['nodeId', 'property']);
const SYNC_TIMING_KEYS = new Set(['mode']);
const ASYNC_TIMING_KEYS = new Set(['mode', 'readinessId']);

const TARGET_PROPERTIES = [
  'enabled',
  'options',
  'required',
  'value',
  'visibility',
] as const satisfies readonly CrossFieldEffectTargetProperty[];

const EFFECT_KINDS = [
  'clears',
  'controls-state',
  'filters',
  'loads',
  'toggles',
] as const satisfies readonly CrossFieldEffectKind[];

const ALLOWED_TARGET_PROPERTIES: Readonly<
  Record<CrossFieldEffectKind, readonly CrossFieldEffectTargetProperty[]>
> = {
  clears: ['value'],
  'controls-state': ['enabled', 'required', 'visibility'],
  filters: ['options'],
  loads: ['options'],
  toggles: ['enabled', 'required', 'visibility'],
};

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
      const indexedDescriptors: [number, PropertyDescriptor][] = [];
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (key === 'length') {
          continue;
        }
        const index = parseArrayIndexProperty(key, value.length);
        if (index === undefined) {
          throw new TypeError(
            `${path}.${key} must not be an additional array property`,
          );
        }
        const itemPath = `${path}[${index}]`;
        if (!('value' in descriptor)) {
          throw new TypeError(`${itemPath} must not be an accessor property`);
        }
        indexedDescriptors.push([index, descriptor]);
      }

      indexedDescriptors.sort(([left], [right]) => left - right);
      if (indexedDescriptors.length !== value.length) {
        let missingIndex = 0;
        for (const [index] of indexedDescriptors) {
          if (index !== missingIndex) {
            break;
          }
          missingIndex += 1;
        }
        throw new TypeError(
          `${path}[${missingIndex}] must not be a sparse array element`,
        );
      }
      for (const [index, descriptor] of indexedDescriptors) {
        assertCanonicalJsonShape(
          descriptor.value,
          `${path}[${index}]`,
          ancestors,
        );
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

function requireNamespacedId(value: unknown, path: string): string {
  const id = requireString(value, path);
  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u.test(id)) {
    throw new TypeError(`${path} must be a stable namespaced identifier`);
  }
  return id;
}

function requireContractStableIdentifier(
  value: unknown,
  path: string,
): string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:\[\]*%\-]*$/u.test(value)
  ) {
    throw new TypeError(`${path} must be a contract stable identifier`);
  }
  return value;
}

function requireVersion(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new TypeError(`${path} must be a positive safe integer`);
  }
  return value as number;
}

function validateIdentity(
  value: unknown,
  path: string,
): CrossFieldEffectIdentity {
  const identity = requireRecord(value, path);
  rejectUnknownKeys(identity, IDENTITY_KEYS, path);
  requireNamespacedId(identity.id, `${path}.id`);
  requireVersion(identity.version, `${path}.version`);
  return value as CrossFieldEffectIdentity;
}

function validateTiming(value: unknown, path: string): CrossFieldEffectTiming {
  const timing = requireRecord(value, path);
  if (timing.mode === 'async') {
    rejectUnknownKeys(timing, ASYNC_TIMING_KEYS, path);
    if (timing.readinessId === undefined) {
      throw new TypeError(`${path}.readinessId is required`);
    }
    requireNamespacedId(timing.readinessId, `${path}.readinessId`);
    return value as CrossFieldEffectTiming;
  }
  if (timing.mode === 'sync' || timing.mode === 'unknown') {
    rejectUnknownKeys(timing, SYNC_TIMING_KEYS, path);
    return value as CrossFieldEffectTiming;
  }
  throw new TypeError(`${path}.mode is unsupported`);
}

function validateEffect(
  value: unknown,
  path: string,
): DeclaredCrossFieldEffect {
  const effect = requireRecord(value, path);
  rejectUnknownKeys(effect, EFFECT_KEYS, path);
  validateIdentity(effect.identity, `${path}.identity`);

  const trigger = requireRecord(effect.trigger, `${path}.trigger`);
  rejectUnknownKeys(trigger, TRIGGER_KEYS, `${path}.trigger`);
  requireContractStableIdentifier(
    trigger.nodeId,
    `${path}.trigger.nodeId`,
  );
  if (
    trigger.event !== 'selectionChanged' &&
    trigger.event !== 'valueChanged'
  ) {
    throw new TypeError(`${path}.trigger.event is unsupported`);
  }

  const target = requireRecord(effect.target, `${path}.target`);
  rejectUnknownKeys(target, TARGET_KEYS, `${path}.target`);
  requireContractStableIdentifier(target.nodeId, `${path}.target.nodeId`);
  if (
    !TARGET_PROPERTIES.includes(
      target.property as CrossFieldEffectTargetProperty,
    )
  ) {
    throw new TypeError(`${path}.target.property is unsupported`);
  }

  if (!EFFECT_KINDS.includes(effect.kind as CrossFieldEffectKind)) {
    throw new TypeError(`${path}.kind is unsupported`);
  }
  const kind = effect.kind as CrossFieldEffectKind;
  const property = target.property as CrossFieldEffectTargetProperty;
  if (!ALLOWED_TARGET_PROPERTIES[kind].includes(property)) {
    throw new TypeError(
      `${path}.target.property is unsupported for ${kind}`,
    );
  }

  validateTiming(effect.timing, `${path}.timing`);
  if (effect.conditionRuleId !== undefined) {
    requireNamespacedId(
      effect.conditionRuleId,
      `${path}.conditionRuleId`,
    );
  }
  if (
    effect.ordering !== 'none' &&
    effect.ordering !== 'source-before-target'
  ) {
    throw new TypeError(`${path}.ordering is unsupported`);
  }
  if (
    effect.ordering === 'source-before-target' &&
    trigger.nodeId === target.nodeId
  ) {
    throw new TypeError(
      `${path}.ordering cannot order one node before itself`,
    );
  }
  if (effect.evidence !== 'declared') {
    throw new TypeError(`${path}.evidence must be "declared"`);
  }
  if (effect.opacity !== 'transparent') {
    throw new TypeError(`${path}.opacity must be "transparent"`);
  }

  return value as DeclaredCrossFieldEffect;
}

function validateForm(value: unknown, path: string): FormCrossFieldEffects {
  const form = requireRecord(value, path);
  rejectUnknownKeys(form, FORM_KEYS, path);
  requireContractStableIdentifier(form.formId, `${path}.formId`);
  const effects = requireArray(form.effects, `${path}.effects`);
  const effectIds = new Set<string>();
  effects.forEach((entry, index) => {
    const effect = validateEffect(entry, `${path}.effects[${index}]`);
    if (effectIds.has(effect.identity.id)) {
      throw new TypeError(
        `${path}.effects[${index}].identity.id duplicates effect ID "${effect.identity.id}"`,
      );
    }
    effectIds.add(effect.identity.id);
  });
  return value as FormCrossFieldEffects;
}

export function parseCrossFieldEffectRegistry(
  input: unknown,
): CrossFieldEffectRegistry {
  const path = 'registry';
  assertCanonicalJsonShape(input, path);
  const registry = requireRecord(input, path);
  rejectUnknownKeys(registry, REGISTRY_KEYS, path);
  if (registry.schemaVersion !== CROSS_FIELD_EFFECT_SCHEMA_VERSION) {
    throw new TypeError(`${path}.schemaVersion is unsupported`);
  }
  requireNamespacedId(registry.id, `${path}.id`);
  requireVersion(registry.version, `${path}.version`);

  const forms = requireArray(registry.forms, `${path}.forms`);
  const formIds = new Set<string>();
  forms.forEach((entry, index) => {
    const form = validateForm(entry, `${path}.forms[${index}]`);
    if (formIds.has(form.formId)) {
      throw new TypeError(
        `${path}.forms[${index}].formId duplicates form ID "${form.formId}"`,
      );
    }
    formIds.add(form.formId);
  });

  return input as CrossFieldEffectRegistry;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalRegistry(
  registry: CrossFieldEffectRegistry,
): CrossFieldEffectRegistry {
  return {
    ...registry,
    forms: [...registry.forms]
      .sort((left, right) => compareText(left.formId, right.formId))
      .map((form) => ({
        ...form,
        effects: [...form.effects].sort((left, right) =>
          compareText(left.identity.id, right.identity.id),
        ),
      })),
  };
}

export function canonicalizeCrossFieldEffectRegistry(input: unknown): string {
  const registry = parseCrossFieldEffectRegistry(input);
  return canonicalStringify(canonicalRegistry(registry));
}

export function computeCrossFieldEffectRegistryHash(input: unknown): string {
  const canonical = canonicalizeCrossFieldEffectRegistry(input);
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}
