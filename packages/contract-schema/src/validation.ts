import {
  CONTRACT_DIAGNOSTIC_CODES,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractCondition,
  type ContractConstraint,
  type ContractDiagnostic,
  type ContractDisplay,
  type ContractDynamicRule,
  type ContractLocator,
  type ContractNode,
  type ContractNodeState,
  type ContractOption,
  type ContractOptionSource,
  type ContractPresentation,
  type FormContract,
  type JsonValue,
  type ModelPathSegment,
} from './contract.js';
import { verifyContentHash } from './canonical-json.js';

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

function assertStringArray(value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} must be an array`);
  }

  value.forEach((item, index) => assertString(item, `${path}[${index}]`));
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
    new Set(['schemaVersion', 'formId', 'contentHash', 'nodes', 'diagnostics']),
    'contract',
  );

  if (input.schemaVersion !== FORM_CONTRACT_SCHEMA_VERSION) {
    throw new TypeError('contract.schemaVersion is unsupported');
  }
  assertStableIdentifier(input.formId, 'contract.formId');
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
