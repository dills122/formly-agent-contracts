import {
  CONTRACT_DIAGNOSTIC_CODES,
  FORM_CONTRACT_SCHEMA_VERSION,
  type ContractCondition,
  type ContractConstraint,
  type ContractDiagnostic,
  type ContractNode,
  type ContractOption,
  type ContractPresentation,
  type FormContract,
  type JsonValue,
  type ModelPathSegment,
} from './contract.js';
import { verifyContentHash } from './canonical-json.js';

const IDENTIFIER_PUNCTUATION = '._:[]*-';
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
  if (value.evidence !== 'declared' && value.evidence !== 'resolved') {
    throw new TypeError(`${path}.evidence is unsupported`);
  }
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
      'defaultValue',
      'wrappers',
      'constraints',
      'options',
      'conditions',
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

  if (!['control', 'group', 'array'].includes(String(value.kind))) {
    throw new TypeError(`${path}.kind is unsupported`);
  }
  assertPath(value.modelPath, `${path}.modelPath`);
  if (value.formlyType !== undefined) {
    assertString(value.formlyType, `${path}.formlyType`);
  }
  if (value.semanticType !== undefined) {
    assertString(value.semanticType, `${path}.semanticType`);
  }
  if (value.evidence !== 'declared' && value.evidence !== 'resolved') {
    throw new TypeError(`${path}.evidence is unsupported`);
  }
  if (value.presentation !== undefined) {
    assertPresentation(value.presentation, `${path}.presentation`);
  }
  if (value.defaultValue !== undefined) {
    assertJsonValue(value.defaultValue, `${path}.defaultValue`);
  }
  assertStringArray(value.wrappers, `${path}.wrappers`);

  for (const [property, assertion] of [
    ['constraints', assertConstraint],
    ['options', assertOption],
    ['conditions', assertCondition],
  ] as const) {
    const items = value[property];
    if (!Array.isArray(items)) {
      throw new TypeError(`${path}.${property} must be an array`);
    }
    items.forEach((item, index) =>
      assertion(item, `${path}.${property}[${index}]`),
    );
  }

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
  if (value.evidence !== 'declared' && value.evidence !== 'resolved') {
    throw new TypeError(`${path}.evidence is unsupported`);
  }
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
