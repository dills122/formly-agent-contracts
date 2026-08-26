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
  type ContractNode,
  type ContractNodeState,
  type ContractOption,
  type ContractOptionSource,
  type ContractPresentation,
  type FormContract,
  type JsonValue,
  type ModelPathSegment,
} from '@formly-agent-contracts/contract-schema';
import type {
  FormlyFieldConfig,
  FormlyFormBuilder,
} from '@ngx-formly/core';

export interface ExtractFormInput {
  readonly formId: string;
  readonly fields: readonly FormlyFieldConfig[];
  readonly model?: Readonly<Record<string, unknown>>;
  readonly formState?: Readonly<Record<string, unknown>>;
}

export interface ExtractFormResult {
  readonly contract: FormContract;
  readonly diagnostics: readonly ContractDiagnostic[];
}

export interface CompileFormContractScenarioInput {
  readonly formId: string;
  readonly builder: Pick<FormlyFormBuilder, 'build'>;
  readonly createFields: () => FormlyFieldConfig[];
  readonly model?: Readonly<Record<string, unknown>>;
  readonly formState?: Readonly<Record<string, unknown>>;
}

interface ExtractionContext {
  readonly formId: string;
  readonly evidence: ContractEvidence;
  readonly diagnostics: ContractDiagnostic[];
  readonly nodeIds: Set<string>;
}

interface NodeLocation {
  readonly parentModelPath: readonly ModelPathSegment[];
  readonly position: readonly number[];
  readonly sourcePath: readonly ModelPathSegment[];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function addDiagnostic(
  context: ExtractionContext,
  code: ContractDiagnosticCode,
  message: string,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
): void {
  context.diagnostics.push({
    code,
    severity: 'warning',
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

function keyToPath(key: FormlyFieldConfig['key']): ModelPathSegment[] {
  if (key === undefined || key === null || key === '') {
    return [];
  }

  if (Array.isArray(key)) {
    return key.filter(
      (segment): segment is string | number =>
        (typeof segment === 'string' && segment.length > 0) ||
        (typeof segment === 'number' && Number.isSafeInteger(segment)),
    );
  }

  if (typeof key === 'number') {
    return Number.isSafeInteger(key) && key >= 0 ? [key] : [];
  }

  // This matches Formly 6.1.8's public field behavior: bracket segments are
  // translated before dotted strings are split. Array-form keys bypass this
  // parsing so literal dots remain intact.
  // Source: https://github.com/ngx-formly/ngx-formly/blob/v6.1.8/src/core/src/lib/utils.ts
  const normalized = key.replace(/\[([A-Za-z0-9_]+)\]/gu, '.$1');

  return normalized
    .split('.')
    .filter((segment) => segment.length > 0)
    .map(numericPathSegment);
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
): ContractOption[] {
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
    return [];
  }

  const labelProperty =
    typeof props.labelProp === 'string' ? props.labelProp : 'label';
  const valueProperty =
    typeof props.valueProp === 'string' ? props.valueProp : 'value';
  const options: ContractOption[] = [];

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

  return options;
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

function readRules(
  field: FormlyFieldConfig,
  sourcePath: readonly ModelPathSegment[],
  nodeId: string,
  context: ExtractionContext,
): RuleProjection {
  const conditions: ContractCondition[] = [];
  const dynamicRules: ContractDynamicRule[] = [];

  const addDynamicRule = (
    property: string,
    expression: unknown,
  ): boolean => {
    const source = isFunction(expression)
      ? 'function'
      : isAsyncLike(expression)
        ? 'async'
        : undefined;
    if (source === undefined) {
      return false;
    }

    const resolvedValue =
      context.evidence === 'resolved'
        ? toJsonValue(readPathValue(field, property))
        : undefined;
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
      } else if (!addDynamicRule(property, expression)) {
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
    !addDynamicRule('hide', hideExpression)
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

function extractNode(
  field: FormlyFieldConfig,
  location: NodeLocation,
  context: ExtractionContext,
): ContractNode {
  const keyPath = keyToPath(field.key);
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
  const propsValue = field.props ?? field.templateOptions;
  const props = isRecord(propsValue) ? propsValue : {};
  const formlyType = typeof field.type === 'string' ? field.type : undefined;
  const semanticType = readSemanticType(formlyType, props);
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
    ...readConstraints(props),
    ...readNamedConstraints(field, location.sourcePath, id, context),
  ];
  const { conditions, dynamicRules } = readRules(
    field,
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
  const options = readOptions(props, location.sourcePath, id, context);
  const optionSource = readOptionSource(
    field,
    props,
    semanticType,
    context,
  );
  const state = readState(field, props);

  return {
    id,
    kind:
      field.fieldArray !== undefined
        ? 'array'
        : field.fieldGroup !== undefined
          ? 'group'
          : field.template !== undefined || formlyType === 'formly-template'
            ? 'display'
            : 'control',
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
    conditions,
    dynamicRules,
    ...(state === undefined ? {} : { state }),
    children,
    ...(arrayTemplate === undefined ? {} : { arrayTemplate }),
  };
}

function projectFormContract(
  input: ExtractFormInput,
  evidence: ContractEvidence,
): ExtractFormResult {
  const diagnostics: ContractDiagnostic[] = [];
  const context: ExtractionContext = {
    formId: input.formId,
    evidence,
    diagnostics,
    nodeIds: new Set<string>(),
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

export function compileFormContractScenario(
  input: CompileFormContractScenarioInput,
): ExtractFormResult {
  const fields = input.createFields();
  if (!Array.isArray(fields)) {
    throw new TypeError('Scenario field factory must return an array.');
  }

  const formState = { ...(input.formState ?? {}) };
  const root: FormlyFieldConfig = {
    model: cloneSyntheticModel(input.model),
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
    },
    'resolved',
  );
}
