import {
  canonicalStringify,
  createFormContract,
  FORM_CONTRACT_SCHEMA_VERSION,
  parseFormContract,
  type ContractCondition,
  type ContractConstraint,
  type ContractDiagnostic,
  type ContractDiagnosticCode,
  type ContractDisplay,
  type ContractDynamicRule,
  type ContractEvidence,
  type ContractLocator,
  type ContractLocatorStrategy,
  type ContractNode,
  type ContractNodeState,
  type ContractOption,
  type ContractOptionSource,
  type ContractPresentation,
  type ContractValueDomain,
  type FormContract,
  type JsonValue,
  type ModelPathSegment,
} from '@formly-contract/schema';
import type {
  FormlyFieldConfig,
  FormlyFormBuilder,
} from '@ngx-formly/core';

import {
  prepareFieldTypeProfileExtractionRegistry,
  projectFieldTypeProfile,
  type ContractFormlyFieldConfig,
  type FieldTypeProfileExtractionRegistry,
  type PreparedFieldTypeProfileExtractionRegistry,
} from './field-type-profile-projection.js';

export type FormContractFieldConfig = FormlyFieldConfig &
  ContractFormlyFieldConfig;

export interface ExtractFormInput {
  readonly formId: string;
  readonly fields: readonly FormContractFieldConfig[];
  readonly model?: Readonly<Record<string, unknown>>;
  readonly formState?: Readonly<Record<string, unknown>>;
  readonly locatorOptions?: LocatorExtractionOptions;
  readonly fieldTypeProfiles?: FieldTypeProfileExtractionRegistry;
}

export interface ExtractFormResult {
  readonly contract: FormContract;
  readonly diagnostics: readonly ContractDiagnostic[];
}

export interface CompileFormContractScenarioInput {
  readonly formId: string;
  readonly builder: Pick<FormlyFormBuilder, 'build'>;
  readonly createFields: () => FormContractFieldConfig[];
  readonly model?: Readonly<Record<string, unknown>>;
  readonly formState?: Readonly<Record<string, unknown>>;
  readonly locatorOptions?: LocatorExtractionOptions;
  readonly fieldTypeProfiles?: FieldTypeProfileExtractionRegistry;
}

interface DerivedLocatorBase {
  readonly target?: string;
  readonly value: string;
}

export type DerivedContractLocator =
  | (DerivedLocatorBase & {
      readonly strategy: 'testId';
      readonly attribute: string;
    })
  | (DerivedLocatorBase & {
      readonly strategy: 'role';
      readonly accessibleName?: string;
    })
  | (DerivedLocatorBase & {
      readonly strategy: 'label' | 'placeholder' | 'domId';
    });

export interface LocatorDerivationInput {
  readonly formId: string;
  readonly nodeId: string;
  readonly modelPath: readonly ModelPathSegment[];
  readonly keyPath: readonly ModelPathSegment[];
  readonly position: readonly number[];
  readonly evidence: ContractEvidence;
  readonly fieldId?: string;
  readonly formlyType?: string;
  readonly semanticType?: string;
}

export interface LocatorExtractionOptions {
  readonly testIdAttributes?: readonly string[];
  readonly deriveLocators?: (
    input: LocatorDerivationInput,
  ) => readonly DerivedContractLocator[];
}

interface NormalizedLocatorOptions {
  readonly testIdAttributes: readonly string[];
  readonly deriveLocators?: LocatorExtractionOptions['deriveLocators'];
}

interface ExtractionContext {
  readonly formId: string;
  readonly evidence: ContractEvidence;
  readonly diagnostics: ContractDiagnostic[];
  readonly nodeIds: Set<string>;
  readonly locatorOptions: NormalizedLocatorOptions;
  readonly fieldTypeProfiles?: PreparedFieldTypeProfileExtractionRegistry;
}

interface OptionProjection {
  readonly options: readonly ContractOption[];
  readonly collection: 'absent' | 'array' | 'opaque';
  readonly complete: boolean;
}

const DEFAULT_TEST_ID_ATTRIBUTES = [
  'data-testid',
  'data-test-id',
  'data-test',
  'data-cy',
  'data-pw',
] as const;

const LOCATOR_TARGET_PUNCTUATION = '._:[]*-%';

const BUILT_IN_FORM_TYPES = new Set([
  'checkbox',
  'formly-template',
  'input',
  'radio',
  'select',
  'textarea',
]);

interface NodeLocation {
  readonly parentModelPath: readonly ModelPathSegment[];
  readonly position: readonly number[];
  readonly sourcePath: readonly ModelPathSegment[];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readProfileMappedProps(
  field: FormContractFieldConfig,
): Readonly<Record<string, unknown>> {
  const props = Object.getOwnPropertyDescriptor(field, 'props');
  if (props !== undefined) {
    if (!('value' in props)) {
      return {};
    }
    if (props.value !== undefined) {
      return isRecord(props.value) ? props.value : {};
    }
  }

  const templateOptions = Object.getOwnPropertyDescriptor(
    field,
    'templateOptions',
  );
  return templateOptions !== undefined &&
    'value' in templateOptions &&
    isRecord(templateOptions.value)
    ? templateOptions.value
    : {};
}

function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function';
}

function isAsyncLike(value: unknown): boolean {
  return (
    isRecord(value) &&
    (isFunction(value.then) || isFunction(value.subscribe))
  );
}

function isAttributeName(value: string): boolean {
  return /^[A-Za-z_:][A-Za-z0-9:._-]*$/u.test(value);
}

function normalizeLocatorOptions(
  options: LocatorExtractionOptions | undefined,
): NormalizedLocatorOptions {
  const requested =
    options?.testIdAttributes ?? DEFAULT_TEST_ID_ATTRIBUTES;
  const testIdAttributes: string[] = [];
  for (const attribute of requested) {
    if (!isAttributeName(attribute)) {
      throw new TypeError(
        'locatorOptions.testIdAttributes must contain valid attribute names.',
      );
    }
    if (!testIdAttributes.includes(attribute)) {
      testIdAttributes.push(attribute);
    }
  }

  return {
    testIdAttributes,
    ...(options?.deriveLocators === undefined
      ? {}
      : { deriveLocators: options.deriveLocators }),
  };
}

function addDiagnostic(
  context: ExtractionContext,
  code: ContractDiagnosticCode,
  message: string,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  severity: ContractDiagnostic['severity'] = 'warning',
): void {
  context.diagnostics.push({
    code,
    severity,
    message,
    evidence: context.evidence,
    sourcePath,
    nodeId,
  });
}

function diagnoseOpaqueValue(
  value: unknown,
  description: string,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): void {
  if (isFunction(value)) {
    addDiagnostic(
      context,
      'OPAQUE_FUNCTION',
      `${description} is an executable function and was not evaluated.`,
      sourcePath,
      nodeId,
    );
    return;
  }

  if (isAsyncLike(value)) {
    addDiagnostic(
      context,
      'ASYNC_VALUE',
      `${description} is asynchronous or Observable-like and was not resolved.`,
      sourcePath,
      nodeId,
    );
    return;
  }

  addDiagnostic(
    context,
    'UNSUPPORTED_RULE',
    `${description} cannot be represented safely by the v0 contract.`,
    sourcePath,
    nodeId,
  );
}

function numericPathSegment(segment: string): ModelPathSegment {
  if (/^(?:0|[1-9][0-9]*)$/u.test(segment)) {
    const number = Number(segment);
    if (Number.isSafeInteger(number)) {
      return number;
    }
  }

  return segment;
}

interface KeyPathProjection {
  readonly path: ModelPathSegment[];
  readonly hasUnsupportedNumericSegment: boolean;
}

function keyToPath(key: FormlyFieldConfig['key']): KeyPathProjection {
  if (key === undefined || key === null || key === '') {
    return { path: [], hasUnsupportedNumericSegment: false };
  }

  if (Array.isArray(key)) {
    const hasUnsupportedNumericSegment = key.some(
      (segment) =>
        typeof segment === 'number' &&
        (!Number.isSafeInteger(segment) || segment < 0),
    );
    if (hasUnsupportedNumericSegment) {
      return { path: [], hasUnsupportedNumericSegment: true };
    }

    return {
      path: key.filter(
        (segment): segment is string | number =>
          (typeof segment === 'string' && segment.length > 0) ||
          (typeof segment === 'number' &&
            Number.isSafeInteger(segment) &&
            segment >= 0),
      ),
      hasUnsupportedNumericSegment: false,
    };
  }

  if (typeof key === 'number') {
    return Number.isSafeInteger(key) && key >= 0
      ? { path: [key], hasUnsupportedNumericSegment: false }
      : { path: [], hasUnsupportedNumericSegment: true };
  }

  // This matches Formly 6.1.8's public field behavior: bracket segments are
  // translated before dotted strings are split. Array-form keys bypass this
  // parsing so literal dots remain intact.
  // Source: https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/utils.ts
  const normalized = key.replace(/\[([A-Za-z0-9_]+)\]/gu, '.$1');

  return {
    path: normalized
      .split('.')
      .filter((segment) => segment.length > 0)
      .map(numericPathSegment),
    hasUnsupportedNumericSegment: false,
  };
}

function strictPercentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[.!'()*~]/gu, (character) => {
    const code = character.codePointAt(0);
    return `%${code?.toString(16).toUpperCase().padStart(2, '0') ?? '00'}`;
  });
}

function pathToken(segment: ModelPathSegment): string {
  return typeof segment === 'number'
    ? `n_${segment}`
    : `s_${strictPercentEncode(segment)}`;
}

function createNodeId(
  context: ExtractionContext,
  modelPath: readonly ModelPathSegment[],
  hasSemanticKey: boolean,
  position: readonly number[],
  sourcePath: readonly ModelPathSegment[],
): string {
  const baseId =
    hasSemanticKey
      ? `${context.formId}::path:${modelPath.map(pathToken).join('.')}`
      : `${context.formId}::position:${position.join('.')}`;

  if (!context.nodeIds.has(baseId)) {
    context.nodeIds.add(baseId);
    return baseId;
  }

  const duplicateId = `${baseId}-duplicate-${position.join('-')}`;
  let id = duplicateId;
  let collision = 1;
  while (context.nodeIds.has(id)) {
    id = `${duplicateId}-collision-${collision}`;
    collision += 1;
  }
  context.nodeIds.add(id);
  context.diagnostics.push({
    code: 'UNKNOWN_FIELD_SHAPE',
    severity: 'warning',
    message: `Duplicate semantic node identity ${baseId}.`,
    evidence: context.evidence,
    sourcePath,
    nodeId: id,
  });
  return id;
}

function readPresentation(
  props: Readonly<Record<string, unknown>>,
): ContractPresentation | undefined {
  const presentation: {
    label?: string;
    description?: string;
    placeholder?: string;
  } = {};

  for (const property of [
    'label',
    'description',
    'placeholder',
  ] as const) {
    const value = props[property];
    if (typeof value === 'string' && value.length > 0) {
      presentation[property] = value;
    }
  }

  return Object.keys(presentation).length > 0 ? presentation : undefined;
}

function readConstraints(
  props: Readonly<Record<string, unknown>>,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): ContractConstraint[] {
  const constraints: ContractConstraint[] = [];

  if (props.required === true) {
    constraints.push({ kind: 'required' });
  }

  for (const property of [
    'min',
    'max',
    'minLength',
    'maxLength',
  ] as const) {
    const value = props[property];
    if (typeof value === 'number' && Number.isFinite(value)) {
      constraints.push({ kind: property, value });
    }
  }

  if (typeof props.pattern === 'string' && props.pattern.length > 0) {
    constraints.push({ kind: 'pattern', value: props.pattern });
  } else if (props.pattern instanceof RegExp) {
    addDiagnostic(
      context,
      'UNSUPPORTED_RULE',
      'RegExp pattern constraints cannot be represented safely by the v0.3 contract.',
      [...sourcePath, 'props', 'pattern'],
      nodeId,
    );
  }

  return constraints;
}

function readNamedConstraints(
  field: FormlyFieldConfig,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): ContractConstraint[] {
  const names: string[] = [];
  const addName = (name: string): void => {
    if (name.length > 0 && !names.includes(name)) {
      names.push(name);
    }
  };
  const validators = field.validators as unknown;

  if (isRecord(validators)) {
    const validation = validators.validation;
    if (Array.isArray(validation)) {
      for (const item of validation) {
        if (typeof item === 'string') {
          addName(item);
        } else {
          diagnoseOpaqueValue(
            item,
            'Validator declaration',
            [...sourcePath, 'validators', 'validation'],
            nodeId,
            context,
          );
        }
      }
    } else if (typeof validation === 'string') {
      addName(validation);
    } else if (validation !== undefined) {
      diagnoseOpaqueValue(
        validation,
        'Validator declaration',
        [...sourcePath, 'validators', 'validation'],
        nodeId,
        context,
      );
    }

    for (const name of Object.keys(validators).sort()) {
      if (name === 'validation') {
        continue;
      }

      addName(name);
      const validator = validators[name];
      const expression = isRecord(validator)
        ? validator.expression
        : validator;
      if (expression !== undefined && typeof expression !== 'string') {
        diagnoseOpaqueValue(
          expression,
          `Validator ${name}`,
          [...sourcePath, 'validators', name, 'expression'],
          nodeId,
          context,
        );
      }
    }
  } else if (validators !== undefined) {
    diagnoseOpaqueValue(
      validators,
      'Validator declaration',
      [...sourcePath, 'validators'],
      nodeId,
      context,
    );
  }

  const asyncValidators = field.asyncValidators as unknown;
  if (isRecord(asyncValidators)) {
    for (const name of Object.keys(asyncValidators).sort()) {
      addName(name);
      addDiagnostic(
        context,
        'ASYNC_VALUE',
        `Async validator ${name} was not evaluated.`,
        [...sourcePath, 'asyncValidators', name],
        nodeId,
      );
    }
  } else if (asyncValidators !== undefined) {
    addDiagnostic(
      context,
      'ASYNC_VALUE',
      'Async validator declaration was not evaluated.',
      [...sourcePath, 'asyncValidators'],
      nodeId,
    );
  }

  return names.map((name) => ({ kind: 'named', name }));
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(canonicalStringify(value)) as JsonValue;
  } catch {
    return undefined;
  }
}

function readJsonValue(
  value: unknown,
  description: string,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): JsonValue | undefined {
  const projected = toJsonValue(value);
  if (value !== undefined && projected === undefined) {
    if (isFunction(value)) {
      addDiagnostic(
        context,
        'OPAQUE_FUNCTION',
        `${description} is a function and was not evaluated.`,
        sourcePath,
        nodeId,
      );
    } else if (isAsyncLike(value)) {
      addDiagnostic(
        context,
        'ASYNC_VALUE',
        `${description} is asynchronous or Observable-like and was not resolved.`,
        sourcePath,
        nodeId,
      );
    } else {
      addDiagnostic(
        context,
        'UNKNOWN_FIELD_SHAPE',
        `${description} is not JSON-safe.`,
        sourcePath,
        nodeId,
      );
    }
  }

  return projected;
}

function readOptions(
  props: Readonly<Record<string, unknown>>,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): OptionProjection {
  if (!Array.isArray(props.options)) {
    if (props.options !== undefined) {
      diagnoseOpaqueValue(
        props.options,
        'Field options',
        [...sourcePath, 'props', 'options'],
        nodeId,
        context,
      );
    }
    return {
      options: [],
      collection: props.options === undefined ? 'absent' : 'opaque',
      complete: false,
    };
  }

  const labelProperty =
    typeof props.labelProp === 'string' ? props.labelProp : 'label';
  const valueProperty =
    typeof props.valueProp === 'string' ? props.valueProp : 'value';
  const options: ContractOption[] = [];
  let complete = true;

  for (const rawOption of props.options) {
    if (!isRecord(rawOption)) {
      const value = readJsonValue(
        rawOption,
        'Static option value',
        [...sourcePath, 'props', 'options'],
        nodeId,
        context,
      );
      if (value !== undefined) {
        options.push({ label: String(rawOption), value });
      } else {
        complete = false;
      }
      continue;
    }

    const value = readJsonValue(
      rawOption[valueProperty],
      'Static option value',
      [...sourcePath, 'props', 'options', valueProperty],
      nodeId,
      context,
    );
    const label = rawOption[labelProperty];
    if (value === undefined || (typeof label !== 'string' && typeof label !== 'number')) {
      complete = false;
      continue;
    }

    options.push({
      label: String(label),
      value,
      ...(typeof rawOption.disabled === 'boolean'
        ? { disabled: rawOption.disabled }
        : {}),
    });
  }

  return { options, collection: 'array', complete };
}

function hasDuplicateCanonicalOptionValues(
  options: readonly ContractOption[],
): boolean {
  const values = new Set<string>();
  for (const option of options) {
    const canonical = canonicalStringify(option.value);
    if (values.has(canonical)) {
      return true;
    }
    values.add(canonical);
  }
  return false;
}

function readBuiltInValueDomain(
  field: FormlyFieldConfig,
  formlyType: string | undefined,
  optionProjection: OptionProjection,
  optionSource: ContractOptionSource | undefined,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): ContractValueDomain | undefined {
  if (formlyType === 'checkbox') {
    return {
      kind: 'enumerated',
      source: 'semantic-type',
      completeness: 'complete',
      evidence: 'declared',
      values: [false, true],
    };
  }

  if (formlyType !== 'radio' && formlyType !== 'select') {
    return undefined;
  }

  const dynamic = findOptionsExpression(field);
  if (
    context.evidence === 'resolved' &&
    dynamic !== undefined &&
    optionProjection.collection === 'array' &&
    optionProjection.complete &&
    !hasDuplicateCanonicalOptionValues(optionProjection.options)
  ) {
    return {
      kind: 'enumerated',
      source: 'resolved-options',
      completeness: 'scenario',
      evidence: 'resolved',
      values: optionProjection.options.map(({ value }) => value),
    };
  }

  if (dynamic !== undefined && context.evidence === 'declared') {
    if (isAsyncLike(dynamic.expression)) {
      return { kind: 'dynamic', source: 'async', evidence: 'declared' };
    }
    if (typeof dynamic.expression === 'string') {
      return { kind: 'dynamic', source: 'string', evidence: 'declared' };
    }
    if (isFunction(dynamic.expression)) {
      return { kind: 'dynamic', source: 'function', evidence: 'declared' };
    }
  }

  if (optionProjection.collection === 'array') {
    if (
      !optionProjection.complete ||
      hasDuplicateCanonicalOptionValues(optionProjection.options)
    ) {
      addDiagnostic(
        context,
        'VALUE_DOMAIN_PROJECTION_FAILED',
        'Static options could not be projected as one complete value domain.',
        [...sourcePath, 'props', 'options'],
        nodeId,
      );
      return { kind: 'unknown', evidence: context.evidence };
    }
    return {
      kind: 'enumerated',
      source: 'static-options',
      completeness: 'complete',
      evidence: 'declared',
      values: optionProjection.options.map(({ value }) => value),
    };
  }

  if (optionSource?.kind === 'async') {
    return {
      kind: 'dynamic',
      source: 'async',
      evidence: optionSource.evidence,
    };
  }
  if (optionSource?.kind === 'dynamic') {
    return {
      kind: 'dynamic',
      source: optionSource.source,
      evidence: optionSource.evidence,
    };
  }

  return undefined;
}

function readPathValue(field: FormlyFieldConfig, property: string): unknown {
  if (property === 'hide') {
    return field.hide;
  }

  const normalized = property.replace(/^templateOptions\./u, 'props.');
  const segments = normalized.split('.');
  let current: unknown = field;

  for (const segment of segments) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

interface RuleProjection {
  readonly conditions: ContractCondition[];
  readonly dynamicRules: ContractDynamicRule[];
}

interface ResolvedRuleProjection {
  readonly represented: boolean;
  readonly resolvedValue?: JsonValue;
}

const BOOLEAN_RULE_TARGETS = new Set([
  'hide',
  'props.required',
  'props.readonly',
  'props.disabled',
]);

const TEXT_RULE_TARGETS = new Set([
  'props.label',
  'props.description',
  'props.placeholder',
  'props.type',
]);

function projectResolvedRuleValue(
  field: FormlyFieldConfig,
  property: string,
  options: readonly ContractOption[],
  context: ExtractionContext,
): ResolvedRuleProjection {
  const normalized = property.replace(/^templateOptions\./u, 'props.');
  const value = readPathValue(field, property);

  if (BOOLEAN_RULE_TARGETS.has(normalized)) {
    return {
      represented: true,
      ...(typeof value === 'boolean' ? { resolvedValue: value } : {}),
    };
  }

  if (normalized === 'props.options') {
    const resolvedValue = Array.isArray(value)
      ? toJsonValue(options)
      : undefined;
    return {
      represented: true,
      ...(resolvedValue === undefined ? {} : { resolvedValue }),
    };
  }

  if (TEXT_RULE_TARGETS.has(normalized)) {
    const resolvedValue =
      typeof value === 'string' && value.length > 0 ? value : undefined;
    return {
      represented: true,
      ...(resolvedValue === undefined ? {} : { resolvedValue }),
    };
  }

  if (normalized === 'props.attributes') {
    return { represented: true };
  }

  const attributePrefix = 'props.attributes.';
  if (normalized.startsWith(attributePrefix)) {
    const attribute = normalized.slice(attributePrefix.length);
    const supportedAttributes = new Set([
      ...context.locatorOptions.testIdAttributes,
      'role',
      'aria-label',
    ]);
    if (supportedAttributes.has(attribute)) {
      const resolvedValue = textAttributeValue(value);
      return {
        represented: true,
        ...(resolvedValue === undefined ? {} : { resolvedValue }),
      };
    }
  }

  return { represented: false };
}

function readRules(
  field: FormlyFieldConfig,
  options: readonly ContractOption[],
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): RuleProjection {
  const conditions: ContractCondition[] = [];
  const dynamicRules: ContractDynamicRule[] = [];

  const addDynamicRule = (
    property: string,
    expression: unknown,
    expressionSourcePath: readonly ModelPathSegment[],
  ): boolean => {
    const source = isFunction(expression)
      ? 'function'
      : isAsyncLike(expression)
        ? 'async'
        : undefined;
    if (source === undefined) {
      return false;
    }

    const projection =
      context.evidence === 'resolved'
        ? projectResolvedRuleValue(field, property, options, context)
        : { represented: true };
    if (!projection.represented) {
      addDiagnostic(
        context,
        'UNSUPPORTED_RULE',
        `Resolved expression target ${property} is outside the adapter allowlist.`,
        expressionSourcePath,
        nodeId,
      );
    }
    const resolvedValue = projection.resolvedValue;
    dynamicRules.push({
      property,
      source,
      evidence: resolvedValue === undefined ? 'declared' : 'resolved',
      ...(resolvedValue === undefined ? {} : { resolvedValue }),
    });
    return true;
  };

  const readExpressionMap = (
    value: unknown,
    propertyName: 'expressions' | 'expressionProperties',
  ): void => {
    if (value === undefined) {
      return;
    }
    if (!isRecord(value)) {
      diagnoseOpaqueValue(
        value,
        `${propertyName} declaration`,
        [...sourcePath, propertyName],
        nodeId,
        context,
      );
      return;
    }

    for (const property of Object.keys(value).sort()) {
      const expression = value[property];
      if (typeof expression === 'string' && expression.length > 0) {
        conditions.push({ property, expression, evidence: 'declared' });
      } else if (typeof expression === 'boolean') {
        conditions.push({
          property,
          expression: String(expression),
          evidence: 'declared',
        });
      } else if (
        !addDynamicRule(
          property,
          expression,
          [...sourcePath, propertyName, property],
        )
      ) {
        diagnoseOpaqueValue(
          expression,
          `Expression for ${property}`,
          [...sourcePath, propertyName, property],
          nodeId,
          context,
        );
      }
    }
  };

  readExpressionMap(field.expressions, 'expressions');

  const hideExpression = field.hideExpression as unknown;
  if (typeof hideExpression === 'string' && hideExpression.length > 0) {
    conditions.push({
      property: 'hide',
      expression: hideExpression,
      evidence: 'declared',
    });
  } else if (typeof hideExpression === 'boolean') {
    conditions.push({
      property: 'hide',
      expression: String(hideExpression),
      evidence: 'declared',
    });
  } else if (
    hideExpression !== undefined &&
    !addDynamicRule(
      'hide',
      hideExpression,
      [...sourcePath, 'hideExpression'],
    )
  ) {
    diagnoseOpaqueValue(
      hideExpression,
      'Legacy hide expression',
      [...sourcePath, 'hideExpression'],
      nodeId,
      context,
    );
  }

  readExpressionMap(field.expressionProperties, 'expressionProperties');

  return { conditions, dynamicRules };
}

function findOptionsExpression(
  field: FormlyFieldConfig,
): { readonly property: string; readonly expression: unknown } | undefined {
  for (const expressionMap of [
    field.expressions,
    field.expressionProperties,
  ]) {
    if (!isRecord(expressionMap)) {
      continue;
    }
    for (const property of ['props.options', 'templateOptions.options']) {
      if (expressionMap[property] !== undefined) {
        return { property, expression: expressionMap[property] };
      }
    }
  }

  return undefined;
}

function readOptionSource(
  field: FormlyFieldConfig,
  props: Readonly<Record<string, unknown>>,
  semanticType: string | undefined,
  context: ExtractionContext,
): ContractOptionSource | undefined {
  if (semanticType !== 'choice') {
    return undefined;
  }

  const dynamic = findOptionsExpression(field);
  if (dynamic !== undefined) {
    const resolved =
      context.evidence === 'resolved' && Array.isArray(props.options);
    if (isAsyncLike(dynamic.expression)) {
      return {
        kind: 'async',
        property: dynamic.property,
        evidence: resolved ? 'resolved' : 'declared',
      };
    }
    if (
      typeof dynamic.expression === 'string' ||
      isFunction(dynamic.expression)
    ) {
      return {
        kind: 'dynamic',
        property: dynamic.property,
        source:
          typeof dynamic.expression === 'string' ? 'string' : 'function',
        evidence: resolved ? 'resolved' : 'declared',
      };
    }
  }

  if (isAsyncLike(props.options)) {
    return {
      kind: 'async',
      property: 'props.options',
      evidence: 'declared',
    };
  }
  if (isFunction(props.options)) {
    return {
      kind: 'dynamic',
      property: 'props.options',
      source: 'function',
      evidence: 'declared',
    };
  }

  return { kind: 'static', evidence: 'declared' };
}

function readState(
  field: FormlyFieldConfig,
  props: Readonly<Record<string, unknown>>,
): ContractNodeState | undefined {
  const state: {
    hidden?: boolean;
    readonly?: boolean;
    disabled?: boolean;
  } = {};

  if (typeof field.hide === 'boolean') {
    state.hidden = field.hide;
  }
  if (typeof props.readonly === 'boolean') {
    state.readonly = props.readonly;
  }
  if (typeof props.disabled === 'boolean') {
    state.disabled = props.disabled;
  }

  return Object.keys(state).length > 0 ? state : undefined;
}

function readDisplay(
  field: FormlyFieldConfig,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): ContractDisplay | undefined {
  if (typeof field.template === 'string' && field.template.length > 0) {
    return { format: 'html', content: field.template };
  }
  if (field.template !== undefined) {
    diagnoseOpaqueValue(
      field.template,
      'Display template',
      [...sourcePath, 'template'],
      nodeId,
      context,
    );
  }
  return undefined;
}

function textAttributeValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function isAsciiLetterOrDigit(value: string): boolean {
  return /^[A-Za-z0-9]$/u.test(value);
}

function isLocatorTarget(value: string): boolean {
  const characters = [...value];
  return (
    characters.length > 0 &&
    isAsciiLetterOrDigit(characters[0] ?? '') &&
    characters.every(
      (character) =>
        isAsciiLetterOrDigit(character) ||
        LOCATOR_TARGET_PUNCTUATION.includes(character),
    )
  );
}

function isLocatorStrategy(
  value: unknown,
): value is ContractLocatorStrategy {
  return (
    value === 'testId' ||
    value === 'role' ||
    value === 'label' ||
    value === 'placeholder' ||
    value === 'domId'
  );
}

function hasOnlyProperties(
  value: Readonly<Record<string, unknown>>,
  properties: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => properties.has(key));
}

function normalizeDerivedLocator(
  value: unknown,
  evidence: ContractEvidence,
): ContractLocator | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const target = value.target === undefined ? 'control' : value.target;
  if (
    typeof target !== 'string' ||
    !isLocatorTarget(target) ||
    typeof value.value !== 'string' ||
    value.value.length === 0 ||
    !isLocatorStrategy(value.strategy)
  ) {
    return undefined;
  }

  const commonProperties = new Set(['target', 'strategy', 'value']);
  if (value.strategy === 'testId') {
    if (
      !hasOnlyProperties(
        value,
        new Set([...commonProperties, 'attribute']),
      ) ||
      typeof value.attribute !== 'string' ||
      !isAttributeName(value.attribute)
    ) {
      return undefined;
    }
    return {
      target,
      strategy: 'testId',
      attribute: value.attribute,
      value: value.value,
      evidence,
      confidence: 'derived',
    };
  }

  if (value.strategy === 'role') {
    if (
      !hasOnlyProperties(
        value,
        new Set([...commonProperties, 'accessibleName']),
      ) ||
      (value.accessibleName !== undefined &&
        (typeof value.accessibleName !== 'string' ||
          value.accessibleName.length === 0))
    ) {
      return undefined;
    }
    return {
      target,
      strategy: 'role',
      value: value.value,
      ...(typeof value.accessibleName === 'string'
        ? { accessibleName: value.accessibleName }
        : {}),
      evidence,
      confidence: 'derived',
    };
  }

  if (
    (value.strategy !== 'label' &&
      value.strategy !== 'placeholder' &&
      value.strategy !== 'domId') ||
    !hasOnlyProperties(value, commonProperties)
  ) {
    return undefined;
  }
  return {
    target,
    strategy: value.strategy,
    value: value.value,
    evidence,
    confidence: 'derived',
  };
}

function locatorIdentity(locator: ContractLocator): string {
  return [
    locator.target,
    locator.strategy,
    'attribute' in locator ? locator.attribute : '',
    locator.value,
    'accessibleName' in locator ? (locator.accessibleName ?? '') : '',
    locator.evidence,
    locator.confidence,
  ].join('\u0000');
}

function deduplicateLocators(
  locators: readonly ContractLocator[],
): ContractLocator[] {
  const identities = new Set<string>();
  return locators.filter((locator) => {
    const identity = locatorIdentity(locator);
    if (identities.has(identity)) {
      return false;
    }
    identities.add(identity);
    return true;
  });
}

function readLocators(
  field: FormlyFieldConfig,
  props: Readonly<Record<string, unknown>>,
  keyPath: readonly ModelPathSegment[],
  modelPath: readonly ModelPathSegment[],
  formlyType: string | undefined,
  semanticType: string | undefined,
  location: NodeLocation,
  nodeId: string,
  context: ExtractionContext,
): ContractLocator[] {
  const exactTestIds: ContractLocator[] = [];
  const derived: ContractLocator[] = [];
  const explicitSemantics: ContractLocator[] = [];
  const domIds: ContractLocator[] = [];
  const attributes = isRecord(props.attributes) ? props.attributes : {};

  for (const attribute of context.locatorOptions.testIdAttributes) {
    const value = textAttributeValue(attributes[attribute]);
    if (value !== undefined) {
      exactTestIds.push({
        target: 'control',
        strategy: 'testId',
        attribute,
        value,
        evidence: context.evidence,
        confidence: 'exact',
      });
    }
  }

  const deriveLocators = context.locatorOptions.deriveLocators;
  if (deriveLocators !== undefined) {
    try {
      const input: LocatorDerivationInput = Object.freeze({
        formId: context.formId,
        nodeId,
        modelPath: Object.freeze([...modelPath]),
        keyPath: Object.freeze([...keyPath]),
        position: Object.freeze([...location.position]),
        evidence: context.evidence,
        ...(typeof field.id === 'string' ? { fieldId: field.id } : {}),
        ...(formlyType === undefined ? {} : { formlyType }),
        ...(semanticType === undefined ? {} : { semanticType }),
      });
      const values = deriveLocators(input);
      if (!Array.isArray(values)) {
        throw new TypeError('Malformed locator derivation result.');
      }
      const normalizedDerived: ContractLocator[] = [];
      for (const value of values) {
        const locator = normalizeDerivedLocator(value, context.evidence);
        if (locator === undefined) {
          throw new TypeError('Malformed locator derivation result.');
        }
        normalizedDerived.push(locator);
      }
      derived.push(...normalizedDerived);
    } catch {
      addDiagnostic(
        context,
        'LOCATOR_DERIVATION_FAILED',
        'Locator derivation failed or returned malformed data.',
        [...location.sourcePath, 'locatorOptions', 'deriveLocators'],
        nodeId,
      );
    }
  }

  const role = textAttributeValue(attributes.role);
  const accessibleName = textAttributeValue(attributes['aria-label']);
  if (role !== undefined) {
    explicitSemantics.push({
      target: 'control',
      strategy: 'role',
      value: role,
      ...(accessibleName === undefined ? {} : { accessibleName }),
      evidence: context.evidence,
      confidence: 'exact',
    });
  }
  if (accessibleName !== undefined) {
    explicitSemantics.push({
      target: 'control',
      strategy: 'label',
      value: accessibleName,
      evidence: context.evidence,
      confidence: 'exact',
    });
  }

  const placeholder = textAttributeValue(props.placeholder);
  if (placeholder !== undefined) {
    explicitSemantics.push({
      target: 'control',
      strategy: 'placeholder',
      value: placeholder,
      evidence: context.evidence,
      confidence: 'exact',
    });
  }

  if (typeof field.id === 'string' && field.id.length > 0) {
    domIds.push({
      target: 'control',
      strategy: 'domId',
      value: field.id,
      evidence: context.evidence,
      confidence: 'derived',
    });
  }

  return deduplicateLocators([
    ...exactTestIds,
    ...derived,
    ...explicitSemantics,
    ...domIds,
  ]);
}

function diagnoseUnsupportedFieldBehavior(
  field: FormlyFieldConfig,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): void {
  const hooks = field.hooks as unknown;
  if (isRecord(hooks)) {
    for (const name of Object.keys(hooks).sort()) {
      diagnoseOpaqueValue(
        hooks[name],
        `Lifecycle hook ${name}`,
        [...sourcePath, 'hooks', name],
        nodeId,
        context,
      );
    }
  } else if (hooks !== undefined) {
    diagnoseOpaqueValue(
      hooks,
      'Lifecycle hooks',
      [...sourcePath, 'hooks'],
      nodeId,
      context,
    );
  }

  const parsers = field.parsers as unknown;
  if (Array.isArray(parsers)) {
    parsers.forEach((parser, index) =>
      diagnoseOpaqueValue(
        parser,
        'Model parser',
        [...sourcePath, 'parsers', index],
        nodeId,
        context,
      ),
    );
  } else if (parsers !== undefined) {
    diagnoseOpaqueValue(
      parsers,
      'Model parsers',
      [...sourcePath, 'parsers'],
      nodeId,
      context,
    );
  }

  const modelOptions = field.modelOptions as unknown;
  if (
    modelOptions !== undefined &&
    (!isRecord(modelOptions) || Object.keys(modelOptions).length > 0)
  ) {
    addDiagnostic(
      context,
      'UNSUPPORTED_RULE',
      'Model update options are not represented by the v0.2 contract.',
      [...sourcePath, 'modelOptions'],
      nodeId,
    );
  }

  if (
    field.type === undefined &&
    field.template === undefined &&
    field.fieldGroup === undefined &&
    field.fieldArray === undefined
  ) {
    addDiagnostic(
      context,
      'UNKNOWN_FIELD_SHAPE',
      'Field has no type, template, field group, or array template.',
      sourcePath,
      nodeId,
    );
  } else if (field.type !== undefined && typeof field.type !== 'string') {
    addDiagnostic(
      context,
      'UNKNOWN_FIELD_SHAPE',
      'Non-string Formly field types are not identified by v0.',
      [...sourcePath, 'type'],
      nodeId,
    );
  }
}

function readWrappers(field: FormlyFieldConfig): string[] {
  return (field.wrappers ?? []).filter(
    (wrapper): wrapper is string => typeof wrapper === 'string',
  );
}

function readSemanticType(
  formlyType: string | undefined,
  props: Readonly<Record<string, unknown>>,
): string | undefined {
  if (formlyType === 'input') {
    return typeof props.type === 'string' ? props.type : 'text';
  }

  const semanticTypes: Readonly<Record<string, string>> = {
    checkbox: 'boolean',
    radio: 'choice',
    select: 'choice',
    textarea: 'multiline-text',
  };

  return formlyType === undefined ? undefined : semanticTypes[formlyType];
}

function projectConfiguredFieldTypeProfile(
  field: FormContractFieldConfig,
  formlyType: string | undefined,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): ReturnType<typeof projectFieldTypeProfile> | undefined {
  const preparedRegistry = context.fieldTypeProfiles;
  if (preparedRegistry === undefined || formlyType === undefined) {
    return undefined;
  }

  const isRegistered = preparedRegistry.profiles.registry.registrations.some(
    (registration) => registration.formlyType === formlyType,
  );
  if (!isRegistered && BUILT_IN_FORM_TYPES.has(formlyType)) {
    return undefined;
  }

  const projection = projectFieldTypeProfile({
    preparedRegistry,
    field,
    evidence: context.evidence,
  });
  for (const diagnostic of projection.diagnostics) {
    addDiagnostic(
      context,
      diagnostic.code,
      diagnostic.message,
      [...sourcePath, ...diagnostic.path],
      nodeId,
      diagnostic.severity,
    );
  }
  return projection;
}

function extractNode(
  field: FormContractFieldConfig,
  location: NodeLocation,
  context: ExtractionContext,
): ContractNode {
  const keyProjection = keyToPath(field.key);
  const keyPath = keyProjection.path;
  const modelPath = [
    ...location.parentModelPath,
    ...keyPath,
  ];
  const hasSemanticKey = keyPath.length > 0;
  const id = createNodeId(
    context,
    modelPath,
    hasSemanticKey,
    location.position,
    location.sourcePath,
  );
  if (keyProjection.hasUnsupportedNumericSegment) {
    addDiagnostic(
      context,
      'UNKNOWN_FIELD_SHAPE',
      'Field key contains a negative, fractional, or unsafe numeric segment and was represented structurally.',
      [...location.sourcePath, 'key'],
      id,
    );
  }
  const formlyType = typeof field.type === 'string' ? field.type : undefined;
  const profileProjection = projectConfiguredFieldTypeProfile(
    field,
    formlyType,
    location.sourcePath,
    id,
    context,
  );
  const profileMapped = profileProjection?.semanticType !== undefined;
  const propsValue = profileMapped
    ? readProfileMappedProps(field)
    : field.props ?? field.templateOptions;
  const props = isRecord(propsValue) ? propsValue : {};
  const semanticType =
    profileProjection?.semanticType ?? readSemanticType(formlyType, props);
  const presentation = readPresentation(props);
  const display = readDisplay(field, location.sourcePath, id, context);
  const defaultValue = readJsonValue(
    field.defaultValue,
    'Default value',
    [...location.sourcePath, 'defaultValue'],
    id,
    context,
  );
  const children = (field.fieldGroup ?? []).map((child, index) =>
    extractNode(
      child,
      {
        parentModelPath: modelPath,
        position: [...location.position, index],
        sourcePath: [...location.sourcePath, 'fieldGroup', index],
      },
      context,
    ),
  );
  let arrayTemplate: ContractNode | undefined;

  if (field.fieldArray !== undefined) {
    if (isFunction(field.fieldArray)) {
      addDiagnostic(
        context,
        'OPAQUE_FUNCTION',
        'Function array templates are not executed by the adapter.',
        [...location.sourcePath, 'fieldArray'],
        id,
      );
    } else {
      arrayTemplate = extractNode(
        field.fieldArray,
        {
          parentModelPath: [...modelPath, '*'],
          position: [...location.position, 0],
          sourcePath: [...location.sourcePath, 'fieldArray'],
        },
        context,
      );
    }
  }

  const constraints = [
    ...readConstraints(props, location.sourcePath, id, context),
    ...readNamedConstraints(field, location.sourcePath, id, context),
  ];
  const optionProjection: OptionProjection = profileMapped
    ? { options: [], collection: 'absent', complete: false }
    : readOptions(props, location.sourcePath, id, context);
  const options = profileMapped
    ? profileProjection.options
    : optionProjection.options;
  const { conditions, dynamicRules } = readRules(
    field,
    options,
    location.sourcePath,
    id,
    context,
  );
  diagnoseUnsupportedFieldBehavior(
    field,
    location.sourcePath,
    id,
    context,
  );
  const optionSource = profileMapped
    ? undefined
    : readOptionSource(field, props, semanticType, context);
  const valueDomain = profileMapped
    ? profileProjection.valueDomain
    : readBuiltInValueDomain(
        field,
        formlyType,
        optionProjection,
        optionSource,
        location.sourcePath,
        id,
        context,
      );
  const state = readState(field, props);
  const kind: ContractNode['kind'] =
    field.fieldArray !== undefined
      ? 'array'
      : field.fieldGroup !== undefined
        ? 'group'
        : field.template !== undefined || formlyType === 'formly-template'
          ? 'display'
          : 'control';
  const locators = readLocators(
    field,
    props,
    keyPath,
    modelPath,
    formlyType,
    semanticType,
    location,
    id,
    context,
  );

  return {
    id,
    kind,
    modelPath,
    ...(formlyType === undefined ? {} : { formlyType }),
    ...(semanticType === undefined ? {} : { semanticType }),
    evidence: context.evidence,
    ...(presentation === undefined ? {} : { presentation }),
    ...(display === undefined ? {} : { display }),
    ...(defaultValue === undefined ? {} : { defaultValue }),
    wrappers: readWrappers(field),
    constraints,
    options,
    ...(optionSource === undefined ? {} : { optionSource }),
    ...(valueDomain === undefined ? {} : { valueDomain }),
    ...(profileProjection?.interactionProfile === undefined
      ? {}
      : { interactionProfile: profileProjection.interactionProfile }),
    conditions,
    dynamicRules,
    ...(state === undefined ? {} : { state }),
    locators,
    children,
    ...(arrayTemplate === undefined ? {} : { arrayTemplate }),
  };
}

function projectFormContract(
  input: ExtractFormInput,
  evidence: ContractEvidence,
): ExtractFormResult {
  const diagnostics: ContractDiagnostic[] = [];
  const fieldTypeProfiles =
    input.fieldTypeProfiles === undefined
      ? undefined
      : prepareFieldTypeProfileExtractionRegistry(input.fieldTypeProfiles);
  const context: ExtractionContext = {
    formId: input.formId,
    evidence,
    diagnostics,
    nodeIds: new Set<string>(),
    locatorOptions: normalizeLocatorOptions(input.locatorOptions),
    ...(fieldTypeProfiles === undefined ? {} : { fieldTypeProfiles }),
  };
  const nodes = input.fields.map((field, index) =>
    extractNode(
      field,
      {
        parentModelPath: [],
        position: [index],
        sourcePath: ['fields', index],
      },
      context,
    ),
  );
  const contract = parseFormContract(
    createFormContract({
      schemaVersion: FORM_CONTRACT_SCHEMA_VERSION,
      formId: input.formId,
      ...(fieldTypeProfiles === undefined
        ? {}
        : { fieldTypeProfileRegistry: fieldTypeProfiles.identity }),
      nodes,
      diagnostics,
    }),
  );

  return { contract, diagnostics: contract.diagnostics };
}

export function extractFormContract(
  input: ExtractFormInput,
): ExtractFormResult {
  return projectFormContract(input, 'declared');
}

function cloneSyntheticModel(
  model: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
  try {
    return structuredClone(model ?? {});
  } catch (error) {
    throw new TypeError('Scenario model must be structured-cloneable.', {
      cause: error,
    });
  }
}

function cloneSyntheticFormState(
  formState: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
  try {
    return structuredClone(formState ?? {});
  } catch (error) {
    throw new TypeError('Scenario form state must be structured-cloneable.', {
      cause: error,
    });
  }
}

export function compileFormContractScenario(
  input: CompileFormContractScenarioInput,
): ExtractFormResult {
  const formState = cloneSyntheticFormState(input.formState);
  const model = cloneSyntheticModel(input.model);
  const fields = input.createFields();
  if (!Array.isArray(fields)) {
    throw new TypeError('Scenario field factory must return an array.');
  }

  const root: FormlyFieldConfig = {
    model,
    options: { formState },
    fieldGroup: fields,
  };
  input.builder.build(root);

  return projectFormContract(
    {
      formId: input.formId,
      fields: root.fieldGroup ?? [],
      ...(isRecord(root.model) ? { model: root.model } : {}),
      formState,
      ...(input.locatorOptions === undefined
        ? {}
        : { locatorOptions: input.locatorOptions }),
      ...(input.fieldTypeProfiles === undefined
        ? {}
        : { fieldTypeProfiles: input.fieldTypeProfiles }),
    },
    'resolved',
  );
}
