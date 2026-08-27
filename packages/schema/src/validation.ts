import {
  CONTRACT_DIAGNOSTIC_CODES,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractCondition,
  type ContractConstraint,
  type ContractDiagnostic,
  type ContractDisplay,
  type ContractDynamicRule,
  type ContractFieldTypeProfileRegistryIdentity,
  type ContractInteractionProfile,
  type ContractLocator,
  type ContractNode,
  type ContractNodeState,
  type ContractOption,
  type ContractOptionSource,
  type ContractPresentation,
  type ContractValueDomain,
  type FormContract,
  type JsonValue,
  type ModelPathSegment,
} from './contract.js';
import { canonicalStringify, verifyContentHash } from './canonical-json.js';
import {
  FIELD_TYPE_PROFILE_SCHEMA_VERSION,
  parseContractValueDomain,
  type FieldTypeProfileInteraction,
  type FieldTypeProfileOperation,
  type FieldTypeProfilePart,
} from './field-type-profile.js';
import {
  validateGenericDriverSemantics,
} from './field-type-interaction-validation.js';

const IDENTIFIER_PUNCTUATION = '._:[]*-%';
const CONTENT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${path} must be an object`);
  }
}

function assertExactProperties(
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

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
}

function isAsciiLetterOrDigit(character: string): boolean {
  const code = character.codePointAt(0);
  if (code === undefined) {
    return false;
  }

  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  );
}

function isStableIdentifier(value: string): boolean {
  const characters = [...value];

  return (
    characters.length > 0 &&
    isAsciiLetterOrDigit(characters[0] ?? '') &&
    characters.every(
      (character) =>
        isAsciiLetterOrDigit(character) ||
        IDENTIFIER_PUNCTUATION.includes(character),
    )
  );
}

function assertStableIdentifier(
  value: unknown,
  path: string,
): asserts value is string {
  if (typeof value !== 'string' || !isStableIdentifier(value)) {
    throw new TypeError(`${path} must be a stable identifier`);
  }
}

function assertStringArray(
  value: unknown,
  path: string,
): asserts value is readonly string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} must be an array`);
  }

  value.forEach((item, index) => assertString(item, `${path}[${index}]`));
}

function assertPositiveVersion(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new TypeError(`${path} must be a positive safe integer`);
  }
}

function assertNamespacedIdentifier(value: unknown, path: string): void {
  if (
    typeof value !== 'string' ||
    !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u.test(value)
  ) {
    throw new TypeError(`${path} must be a stable namespaced identifier`);
  }
}

function assertToken(value: unknown, path: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value)
  ) {
    throw new TypeError(`${path} must be a stable token`);
  }
}

function assertPathSegment(value: unknown, path: string): void {
  if (typeof value === 'string') {
    assertString(value, path);
    return;
  }

  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError(
      `${path} must be a non-empty string or non-negative integer`,
    );
  }
}

function assertPath(value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} must be an array`);
  }

  value.forEach((segment, index) =>
    assertPathSegment(segment, `${path}[${index}]`),
  );
}

function assertJsonValue(
  value: unknown,
  path: string,
  ancestors = new Set<object>(),
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite numbers`);
    }
    return;
  }

  if (typeof value !== 'object') {
    throw new TypeError(`${path} must be a JSON value`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`${path} must not contain a cycle`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        assertJsonValue(item, `${path}[${index}]`, ancestors),
      );
      return;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError(`${path} must contain only plain JSON objects`);
    }

    for (const [key, item] of Object.entries(value)) {
      assertJsonValue(item, `${path}.${key}`, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function assertPresentation(
  value: unknown,
  path: string,
): asserts value is ContractPresentation {
  assertRecord(value, path);
  assertExactProperties(
    value,
    new Set(['label', 'description', 'placeholder']),
    path,
  );

  for (const property of ['label', 'description', 'placeholder'] as const) {
    if (value[property] !== undefined) {
      assertString(value[property], `${path}.${property}`);
    }
  }
}

function assertConstraint(
  value: unknown,
  path: string,
): asserts value is ContractConstraint {
  assertRecord(value, path);
  assertString(value.kind, `${path}.kind`);

  switch (value.kind) {
    case 'required':
      assertExactProperties(value, new Set(['kind']), path);
      return;
    case 'min':
    case 'max':
    case 'minLength':
    case 'maxLength':
      assertExactProperties(value, new Set(['kind', 'value']), path);
      if (typeof value.value !== 'number' || !Number.isFinite(value.value)) {
        throw new TypeError(`${path}.value must be a finite number`);
      }
      return;
    case 'pattern':
      assertExactProperties(value, new Set(['kind', 'value']), path);
      assertString(value.value, `${path}.value`);
      return;
    case 'named':
      assertExactProperties(value, new Set(['kind', 'name']), path);
      assertString(value.name, `${path}.name`);
      return;
    default:
      throw new TypeError(`${path}.kind is unsupported`);
  }
}

function assertOption(
  value: unknown,
  path: string,
): asserts value is ContractOption {
  assertRecord(value, path);
  assertExactProperties(value, new Set(['label', 'value', 'disabled']), path);
  assertString(value.label, `${path}.label`);
  assertJsonValue(value.value, `${path}.value`);
  if (value.disabled !== undefined && typeof value.disabled !== 'boolean') {
    throw new TypeError(`${path}.disabled must be a boolean`);
  }
}

function assertEvidence(value: unknown, path: string): void {
  if (
    value !== 'declared' &&
    value !== 'resolved' &&
    value !== 'observed'
  ) {
    throw new TypeError(`${path} is unsupported`);
  }
}

function assertAttributeName(value: unknown, path: string): void {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z_:][A-Za-z0-9:._-]*$/u.test(value)
  ) {
    throw new TypeError(`${path} must be a valid attribute name`);
  }
}

function assertLocator(
  value: unknown,
  path: string,
): asserts value is ContractLocator {
  assertRecord(value, path);
  assertString(value.strategy, `${path}.strategy`);

  const common = new Set([
    'target',
    'strategy',
    'value',
    'evidence',
    'confidence',
  ]);
  if (value.strategy === 'testId') {
    assertExactProperties(value, new Set([...common, 'attribute']), path);
    assertAttributeName(value.attribute, `${path}.attribute`);
  } else if (value.strategy === 'role') {
    assertExactProperties(value, new Set([...common, 'accessibleName']), path);
    if (value.accessibleName !== undefined) {
      assertString(value.accessibleName, `${path}.accessibleName`);
    }
  } else if (
    value.strategy === 'label' ||
    value.strategy === 'placeholder' ||
    value.strategy === 'domId'
  ) {
    assertExactProperties(value, common, path);
  } else {
    throw new TypeError(`${path}.strategy is unsupported`);
  }

  assertStableIdentifier(value.target, `${path}.target`);
  assertString(value.value, `${path}.value`);
  assertEvidence(value.evidence, `${path}.evidence`);
  if (value.confidence !== 'exact' && value.confidence !== 'derived') {
    throw new TypeError(`${path}.confidence is unsupported`);
  }
}

function assertDisplay(
  value: unknown,
  path: string,
): asserts value is ContractDisplay {
  assertRecord(value, path);
  assertExactProperties(value, new Set(['format', 'content']), path);
  if (value.format !== 'html') {
    throw new TypeError(`${path}.format is unsupported`);
  }
  assertString(value.content, `${path}.content`);
}

function assertDynamicRule(
  value: unknown,
  path: string,
): asserts value is ContractDynamicRule {
  assertRecord(value, path);
  assertExactProperties(
    value,
    new Set(['property', 'source', 'evidence', 'resolvedValue']),
    path,
  );
  assertString(value.property, `${path}.property`);
  if (value.source !== 'function' && value.source !== 'async') {
    throw new TypeError(`${path}.source is unsupported`);
  }
  assertEvidence(value.evidence, `${path}.evidence`);
  if (value.resolvedValue !== undefined) {
    if (value.evidence !== 'resolved') {
      throw new TypeError(`${path}.resolvedValue requires resolved evidence`);
    }
    assertJsonValue(value.resolvedValue, `${path}.resolvedValue`);
  }
}

function assertOptionSource(
  value: unknown,
  path: string,
): asserts value is ContractOptionSource {
  assertRecord(value, path);
  assertString(value.kind, `${path}.kind`);
  assertEvidence(value.evidence, `${path}.evidence`);

  if (value.kind === 'static') {
    assertExactProperties(value, new Set(['kind', 'evidence']), path);
    return;
  }

  if (value.kind === 'dynamic') {
    assertExactProperties(
      value,
      new Set(['kind', 'property', 'source', 'evidence']),
      path,
    );
    assertString(value.property, `${path}.property`);
    if (value.source !== 'string' && value.source !== 'function') {
      throw new TypeError(`${path}.source is unsupported`);
    }
    return;
  }

  if (value.kind === 'async') {
    assertExactProperties(
      value,
      new Set(['kind', 'property', 'evidence']),
      path,
    );
    assertString(value.property, `${path}.property`);
    return;
  }

  throw new TypeError(`${path}.kind is unsupported`);
}

function assertNodeState(
  value: unknown,
  path: string,
): asserts value is ContractNodeState {
  assertRecord(value, path);
  assertExactProperties(value, new Set(['hidden', 'readonly', 'disabled']), path);
  for (const property of ['hidden', 'readonly', 'disabled'] as const) {
    if (value[property] !== undefined && typeof value[property] !== 'boolean') {
      throw new TypeError(`${path}.${property} must be a boolean`);
    }
  }
}

function assertCondition(
  value: unknown,
  path: string,
): asserts value is ContractCondition {
  assertRecord(value, path);
  assertExactProperties(
    value,
    new Set(['property', 'expression', 'evidence']),
    path,
  );
  assertString(value.property, `${path}.property`);
  assertString(value.expression, `${path}.expression`);
  assertEvidence(value.evidence, `${path}.evidence`);
}

function assertValueDomain(value: unknown, path: string): void {
  try {
    parseContractValueDomain(value);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new TypeError(error.message.replace(/^valueDomain/u, path));
    }
    throw error;
  }
}

const PROFILE_OPERATIONS = [
  'fill',
  'check',
  'select-option',
  'select-from-overlay',
  'type-and-pick',
  'select-row',
  'add-item',
  'expand-item',
] as const satisfies readonly FieldTypeProfileOperation[];

const PROFILE_UNKNOWN_ASPECTS = [
  'semantic-role',
  'model-codec',
  'runtime-states',
  'locator-scope',
  'interaction-sequence',
] as const;

const CONTRACT_INTERACTION_KEYS = {
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

function assertProfileIdentity(value: unknown, path: string): void {
  assertRecord(value, path);
  assertExactProperties(value, new Set(['id', 'version']), path);
  assertNamespacedIdentifier(value.id, `${path}.id`);
  assertPositiveVersion(value.version, `${path}.version`);
}

function assertInteractionParts(
  value: unknown,
  path: string,
): readonly FieldTypeProfilePart[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${path} must contain at least one part`);
  }
  const names = new Set<string>();
  const parts: FieldTypeProfilePart[] = [];
  value.forEach((entry, index) => {
    const itemPath = `${path}[${index}]`;
    assertRecord(entry, itemPath);
    assertExactProperties(
      entry,
      new Set(['name', 'role', 'cardinality', 'evidence']),
      itemPath,
    );
    assertToken(entry.name, `${itemPath}.name`);
    if (names.has(entry.name)) {
      throw new TypeError(
        `${itemPath}.name duplicates part name "${entry.name}"`,
      );
    }
    names.add(entry.name);
    assertToken(entry.role, `${itemPath}.role`);
    if (entry.cardinality !== 'one' && entry.cardinality !== 'many') {
      throw new TypeError(`${itemPath}.cardinality is unsupported`);
    }
    if (entry.evidence !== 'declared') {
      throw new TypeError(`${itemPath}.evidence must be "declared"`);
    }
    parts.push({
      name: entry.name,
      role: entry.role,
      cardinality: entry.cardinality,
      evidence: entry.evidence,
    });
  });
  return parts;
}

function assertPartReference(
  value: unknown,
  path: string,
  partNames: ReadonlySet<string>,
): void {
  assertToken(value, path);
  if (!partNames.has(value)) {
    throw new TypeError(`${path} references missing part "${value}"`);
  }
}

function assertInteraction(
  value: unknown,
  path: string,
  partNames: ReadonlySet<string>,
): asserts value is FieldTypeProfileInteraction {
  assertRecord(value, path);
  assertString(value.kind, `${path}.kind`);
  if (!(value.kind in CONTRACT_INTERACTION_KEYS)) {
    throw new TypeError(`${path}.kind is unsupported`);
  }
  assertExactProperties(
    value,
    CONTRACT_INTERACTION_KEYS[
      value.kind as keyof typeof CONTRACT_INTERACTION_KEYS
    ],
    path,
  );
  if (
    !PROFILE_OPERATIONS.includes(
      value.operation as FieldTypeProfileOperation,
    )
  ) {
    throw new TypeError(`${path}.operation is unsupported`);
  }

  switch (value.kind) {
    case 'fill':
      if (value.operation !== 'fill') {
        throw new TypeError(`${path}.operation is unsupported for fill`);
      }
      assertPartReference(value.controlPart, `${path}.controlPart`, partNames);
      return;
    case 'choice':
      if (
        value.operation !== 'check' &&
        value.operation !== 'select-option' &&
        value.operation !== 'select-from-overlay'
      ) {
        throw new TypeError(`${path}.operation is unsupported for choice`);
      }
      assertPartReference(value.optionPart, `${path}.optionPart`, partNames);
      if (value.triggerPart !== undefined) {
        assertPartReference(value.triggerPart, `${path}.triggerPart`, partNames);
      }
      if (value.popupPart !== undefined) {
        assertPartReference(value.popupPart, `${path}.popupPart`, partNames);
      }
      if (
        value.operation === 'select-from-overlay' &&
        (value.triggerPart === undefined || value.popupPart === undefined)
      ) {
        throw new TypeError(
          `${path} select-from-overlay requires triggerPart and popupPart`,
        );
      }
      return;
    case 'autocomplete':
      if (value.operation !== 'type-and-pick') {
        throw new TypeError(
          `${path}.operation is unsupported for autocomplete`,
        );
      }
      for (const property of [
        'queryPart',
        'popupPart',
        'optionPart',
      ] as const) {
        assertPartReference(value[property], `${path}.${property}`, partNames);
      }
      return;
    case 'row-selection':
      if (value.operation !== 'select-row') {
        throw new TypeError(
          `${path}.operation is unsupported for row-selection`,
        );
      }
      for (const property of ['rowPart', 'selectionPart'] as const) {
        assertPartReference(value[property], `${path}.${property}`, partNames);
      }
      return;
    case 'repeater':
      if (value.operation !== 'add-item' && value.operation !== 'expand-item') {
        throw new TypeError(`${path}.operation is unsupported for repeater`);
      }
      for (const property of ['addPart', 'itemPart'] as const) {
        assertPartReference(value[property], `${path}.${property}`, partNames);
      }
      if (value.expandPart !== undefined) {
        assertPartReference(value.expandPart, `${path}.expandPart`, partNames);
      }
      if (value.operation === 'expand-item' && value.expandPart === undefined) {
        throw new TypeError(`${path} expand-item requires expandPart`);
      }
      return;
  }
}

function assertInteractionProfile(
  value: unknown,
  path: string,
): asserts value is ContractInteractionProfile {
  assertRecord(value, path);
  assertExactProperties(
    value,
    new Set([
      'profile',
      'semanticType',
      'valueShape',
      'evidence',
      'parts',
      'interaction',
      'driver',
      'preconditions',
      'unknowns',
      'provenance',
    ]),
    path,
  );
  assertProfileIdentity(value.profile, `${path}.profile`);
  assertToken(value.semanticType, `${path}.semanticType`);
  if (
    value.valueShape !== 'scalar' &&
    value.valueShape !== 'array' &&
    value.valueShape !== 'object'
  ) {
    throw new TypeError(`${path}.valueShape is unsupported`);
  }
  if (value.evidence !== 'declared') {
    throw new TypeError(`${path}.evidence must be "declared"`);
  }

  const parts = assertInteractionParts(value.parts, `${path}.parts`);
  const partNames = new Set(parts.map(({ name }) => name));
  assertInteraction(value.interaction, `${path}.interaction`, partNames);

  assertRecord(value.driver, `${path}.driver`);
  assertExactProperties(
    value.driver,
    new Set(['kind', 'id', 'version', 'capabilities']),
    `${path}.driver`,
  );
  if (value.driver.kind !== 'generic' && value.driver.kind !== 'application') {
    throw new TypeError(`${path}.driver.kind is unsupported`);
  }
  assertNamespacedIdentifier(value.driver.id, `${path}.driver.id`);
  assertPositiveVersion(value.driver.version, `${path}.driver.version`);
  if (
    !Array.isArray(value.driver.capabilities) ||
    value.driver.capabilities.length === 0
  ) {
    throw new TypeError(
      `${path}.driver.capabilities must contain at least one entry`,
    );
  }
  const capabilities = new Set<FieldTypeProfileOperation>();
  value.driver.capabilities.forEach((capability, index) => {
    const capabilityPath = `${path}.driver.capabilities[${index}]`;
    if (!PROFILE_OPERATIONS.includes(capability as FieldTypeProfileOperation)) {
      throw new TypeError(`${capabilityPath} is unsupported`);
    }
    if (capabilities.has(capability as FieldTypeProfileOperation)) {
      throw new TypeError(
        `${capabilityPath} duplicates capability "${String(capability)}"`,
      );
    }
    capabilities.add(capability as FieldTypeProfileOperation);
  });
  if (!capabilities.has(value.interaction.operation)) {
    throw new TypeError(
      `${path}.driver.capabilities must include interaction operation "${value.interaction.operation}"`,
    );
  }
  if (!Array.isArray(value.preconditions)) {
    throw new TypeError(`${path}.preconditions must be an array`);
  }
  const partsByName = new Map(parts.map((part) => [part.name, part]));
  value.preconditions.forEach((entry, index) => {
    const itemPath = `${path}.preconditions[${index}]`;
    assertRecord(entry, itemPath);
    assertExactProperties(
      entry,
      new Set(['kind', 'part', 'operation', 'evidence']),
      itemPath,
    );
    if (entry.kind !== 'activate') {
      throw new TypeError(`${itemPath}.kind is unsupported`);
    }
    assertPartReference(entry.part, `${itemPath}.part`, partNames);
    if (entry.operation !== 'click' && entry.operation !== 'check') {
      throw new TypeError(`${itemPath}.operation is unsupported`);
    }
    if (entry.evidence !== 'declared') {
      throw new TypeError(`${itemPath}.evidence must be "declared"`);
    }
    const part = partsByName.get(entry.part as string)!;
    const allowedRoles =
      entry.operation === 'click' ? ['button'] : ['checkbox', 'radio'];
    if (!allowedRoles.includes(part.role)) {
      throw new TypeError(
        `${itemPath}.operation cannot drive part role "${part.role}"`,
      );
    }
    if (part.cardinality !== 'one') {
      throw new TypeError(`${itemPath}.part must have cardinality one`);
    }
  });

  if (!Array.isArray(value.unknowns)) {
    throw new TypeError(`${path}.unknowns must be an array`);
  }
  value.unknowns.forEach((entry, index) => {
    const itemPath = `${path}.unknowns[${index}]`;
    assertRecord(entry, itemPath);
    assertExactProperties(
      entry,
      new Set(['scope', 'source', 'aspect', 'reason', 'evidence']),
      itemPath,
    );
    if (entry.scope !== 'profile' && entry.scope !== 'wrapper') {
      throw new TypeError(`${itemPath}.scope is unsupported`);
    }
    assertString(entry.source, `${itemPath}.source`);
    if (
      !PROFILE_UNKNOWN_ASPECTS.includes(
        entry.aspect as (typeof PROFILE_UNKNOWN_ASPECTS)[number],
      )
    ) {
      throw new TypeError(`${itemPath}.aspect is unsupported`);
    }
    assertString(entry.reason, `${itemPath}.reason`);
    assertEvidence(entry.evidence, `${itemPath}.evidence`);
  });

  validateGenericDriverSemantics({
    path: `${path}.driver`,
    driver: value.driver as ContractInteractionProfile['driver'],
    interaction: value.interaction,
    valueShape: value.valueShape,
    parts,
    unknowns: value.unknowns as ContractInteractionProfile['unknowns'],
  });

  assertStringArray(value.provenance, `${path}.provenance`);
  if (value.provenance.length === 0) {
    throw new TypeError(`${path}.provenance must contain at least one entry`);
  }
}

function assertFieldTypeProfileRegistryIdentity(
  value: unknown,
  path: string,
): asserts value is ContractFieldTypeProfileRegistryIdentity {
  assertRecord(value, path);
  assertExactProperties(
    value,
    new Set(['schemaVersion', 'id', 'version', 'contentHash']),
    path,
  );
  if (value.schemaVersion !== FIELD_TYPE_PROFILE_SCHEMA_VERSION) {
    throw new TypeError(`${path}.schemaVersion is unsupported`);
  }
  assertNamespacedIdentifier(value.id, `${path}.id`);
  assertPositiveVersion(value.version, `${path}.version`);
  if (
    typeof value.contentHash !== 'string' ||
    !CONTENT_HASH_PATTERN.test(value.contentHash)
  ) {
    throw new TypeError(`${path}.contentHash must be a sha256 digest`);
  }
}

function nodeHasInteractionProfile(node: ContractNode): boolean {
  return (
    node.interactionProfile !== undefined ||
    node.children.some(nodeHasInteractionProfile) ||
    (node.arrayTemplate !== undefined &&
      nodeHasInteractionProfile(node.arrayTemplate))
  );
}

function normalizeVisibleOptionLabel(label: string): string {
  return label.replace(/\p{White_Space}+/gu, ' ').trim();
}

function assertGenericDriverValueMapping(
  profile: ContractInteractionProfile,
  valueDomain: ContractValueDomain | undefined,
  options: readonly ContractOption[],
  path: string,
): void {
  if (
    profile.driver.kind !== 'generic' ||
    (profile.interaction.kind !== 'choice' &&
      profile.interaction.kind !== 'autocomplete' &&
      profile.interaction.kind !== 'row-selection')
  ) {
    return;
  }

  if (valueDomain?.kind !== 'enumerated') {
    throw new TypeError(
      `${path}.valueDomain must be enumerated for generic ${profile.interaction.kind}`,
    );
  }

  const optionsByValue = new Map<
    string,
    { readonly count: number; readonly label: string }
  >();
  const optionCountsByLabel = new Map<string, number>();
  for (const [index, option] of options.entries()) {
    const key = canonicalStringify(option.value);
    const normalizedLabel = normalizeVisibleOptionLabel(option.label);
    if (normalizedLabel.length === 0) {
      throw new TypeError(
        `${path}.options[${index}].label must contain visible text after whitespace normalization`,
      );
    }
    const existing = optionsByValue.get(key);
    optionsByValue.set(key, {
      count: (existing?.count ?? 0) + 1,
      label: existing?.label ?? normalizedLabel,
    });
    optionCountsByLabel.set(
      normalizedLabel,
      (optionCountsByLabel.get(normalizedLabel) ?? 0) + 1,
    );
  }

  const domainValueKeys = new Set(
    valueDomain.values.map((domainValue) => canonicalStringify(domainValue)),
  );

  valueDomain.values.forEach((domainValue, index) => {
    const mapping = optionsByValue.get(canonicalStringify(domainValue));
    if (mapping?.count !== 1) {
      throw new TypeError(
        `${path}.options must contain exactly one label mapping for valueDomain.values[${index}]`,
      );
    }
    if (optionCountsByLabel.get(mapping.label) !== 1) {
      throw new TypeError(
        `${path}.options label ${JSON.stringify(mapping.label)} must identify exactly one value`,
      );
    }
  });

  options.forEach((option, index) => {
    if (!domainValueKeys.has(canonicalStringify(option.value))) {
      throw new TypeError(
        `${path}.options[${index}] must map to exactly one valueDomain value`,
      );
    }
  });
}

function assertNode(
  value: unknown,
  path: string,
  nodeIds: Set<string>,
): asserts value is ContractNode {
  assertRecord(value, path);
  assertExactProperties(
    value,
    new Set([
      'id',
      'kind',
      'modelPath',
      'formlyType',
      'semanticType',
      'evidence',
      'presentation',
      'display',
      'defaultValue',
      'wrappers',
      'constraints',
      'options',
      'optionSource',
      'valueDomain',
      'interactionProfile',
      'conditions',
      'dynamicRules',
      'state',
      'locators',
      'children',
      'arrayTemplate',
    ]),
    path,
  );

  assertStableIdentifier(value.id, `${path}.id`);
  if (nodeIds.has(value.id)) {
    throw new TypeError(`${path}.id must be unique`);
  }
  nodeIds.add(value.id);

  if (!['control', 'group', 'array', 'display'].includes(String(value.kind))) {
    throw new TypeError(`${path}.kind is unsupported`);
  }
  assertPath(value.modelPath, `${path}.modelPath`);
  if (value.formlyType !== undefined) {
    assertString(value.formlyType, `${path}.formlyType`);
  }
  if (value.semanticType !== undefined) {
    assertString(value.semanticType, `${path}.semanticType`);
  }
  assertEvidence(value.evidence, `${path}.evidence`);
  if (value.presentation !== undefined) {
    assertPresentation(value.presentation, `${path}.presentation`);
  }
  if (value.display !== undefined) {
    assertDisplay(value.display, `${path}.display`);
  }
  if (value.defaultValue !== undefined) {
    assertJsonValue(value.defaultValue, `${path}.defaultValue`);
  }
  assertStringArray(value.wrappers, `${path}.wrappers`);

  for (const [property, assertion] of [
    ['constraints', assertConstraint],
    ['options', assertOption],
    ['conditions', assertCondition],
    ['dynamicRules', assertDynamicRule],
  ] as const) {
    const items = value[property];
    if (!Array.isArray(items)) {
      throw new TypeError(`${path}.${property} must be an array`);
    }
    items.forEach((item, index) =>
      assertion(item, `${path}.${property}[${index}]`),
    );
  }

  if (value.optionSource !== undefined) {
    assertOptionSource(value.optionSource, `${path}.optionSource`);
  }
  if (value.valueDomain !== undefined) {
    assertValueDomain(value.valueDomain, `${path}.valueDomain`);
  }
  if (value.interactionProfile !== undefined) {
    assertInteractionProfile(
      value.interactionProfile,
      `${path}.interactionProfile`,
    );
    if (value.semanticType === undefined) {
      throw new TypeError(
        `${path}.semanticType is required with interactionProfile`,
      );
    }
    if (value.semanticType !== value.interactionProfile.semanticType) {
      throw new TypeError(
        `${path}.semanticType must match interactionProfile.semanticType`,
      );
    }
    assertGenericDriverValueMapping(
      value.interactionProfile,
      value.valueDomain as ContractValueDomain | undefined,
      value.options as readonly ContractOption[],
      path,
    );
  }
  if (value.state !== undefined) {
    assertNodeState(value.state, `${path}.state`);
  }

  if (!Array.isArray(value.locators)) {
    throw new TypeError(`${path}.locators must be an array`);
  }
  value.locators.forEach((locator, index) =>
    assertLocator(locator, `${path}.locators[${index}]`),
  );

  if (!Array.isArray(value.children)) {
    throw new TypeError(`${path}.children must be an array`);
  }
  value.children.forEach((child, index) =>
    assertNode(child, `${path}.children[${index}]`, nodeIds),
  );
  if (value.arrayTemplate !== undefined) {
    assertNode(value.arrayTemplate, `${path}.arrayTemplate`, nodeIds);
  }
}

function assertDiagnostic(
  value: unknown,
  path: string,
  nodeIds: ReadonlySet<string>,
): asserts value is ContractDiagnostic {
  assertRecord(value, path);
  assertExactProperties(
    value,
    new Set(['code', 'severity', 'message', 'evidence', 'sourcePath', 'nodeId']),
    path,
  );
  if (
    typeof value.code !== 'string' ||
    !CONTRACT_DIAGNOSTIC_CODES.includes(
      value.code as (typeof CONTRACT_DIAGNOSTIC_CODES)[number],
    )
  ) {
    throw new TypeError(`${path}.code is unsupported`);
  }
  if (value.severity !== 'warning' && value.severity !== 'error') {
    throw new TypeError(`${path}.severity is unsupported`);
  }
  assertString(value.message, `${path}.message`);
  assertEvidence(value.evidence, `${path}.evidence`);
  assertPath(value.sourcePath, `${path}.sourcePath`);
  if (value.nodeId !== undefined) {
    assertStableIdentifier(value.nodeId, `${path}.nodeId`);
    if (!nodeIds.has(value.nodeId)) {
      throw new TypeError(`${path}.nodeId must reference a contract node`);
    }
  }
}

export function parseFormContract(input: unknown): FormContract {
  assertRecord(input, 'contract');
  assertExactProperties(
    input,
    new Set([
      'schemaVersion',
      'formId',
      'fieldTypeProfileRegistry',
      'contentHash',
      'nodes',
      'diagnostics',
    ]),
    'contract',
  );

  if (input.schemaVersion !== FORM_CONTRACT_SCHEMA_VERSION) {
    throw new TypeError('contract.schemaVersion is unsupported');
  }
  assertStableIdentifier(input.formId, 'contract.formId');
  if (input.fieldTypeProfileRegistry !== undefined) {
    assertFieldTypeProfileRegistryIdentity(
      input.fieldTypeProfileRegistry,
      'contract.fieldTypeProfileRegistry',
    );
  }
  if (
    typeof input.contentHash !== 'string' ||
    !CONTENT_HASH_PATTERN.test(input.contentHash)
  ) {
    throw new TypeError('contract.contentHash must be a sha256 digest');
  }
  if (!Array.isArray(input.nodes)) {
    throw new TypeError('contract.nodes must be an array');
  }

  const nodeIds = new Set<string>();
  input.nodes.forEach((node, index) =>
    assertNode(node, `nodes[${index}]`, nodeIds),
  );

  if (!Array.isArray(input.diagnostics)) {
    throw new TypeError('contract.diagnostics must be an array');
  }
  input.diagnostics.forEach((diagnostic, index) =>
    assertDiagnostic(diagnostic, `diagnostics[${index}]`, nodeIds),
  );

  const contract = input as unknown as FormContract;
  if (
    contract.fieldTypeProfileRegistry === undefined &&
    contract.nodes.some(nodeHasInteractionProfile)
  ) {
    throw new TypeError(
      'contract.fieldTypeProfileRegistry is required when a node has interactionProfile',
    );
  }
  if (!verifyContentHash(contract)) {
    throw new TypeError('contract.contentHash does not match contract content');
  }

  return contract;
}

export function isModelPathSegment(
  value: unknown,
): value is ModelPathSegment {
  return (
    (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  );
}
