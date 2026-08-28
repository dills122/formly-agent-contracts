import {
  canonicalStringify,
  type ContractDiagnosticCode,
  type ContractEvidence,
  type ContractInteractionProfile,
  type ContractOption,
  type ContractValueDomain,
  type FieldTypeProfile,
  type FieldTypeProfileRegistry,
  type JsonValue,
} from '@formly-contract/schema';

import {
  FieldTypeProfileResolutionError,
  prepareFieldTypeProfileRegistry,
  type FieldTypeProfileResolutionDiagnosticCode,
  type PreparedFieldTypeProfileRegistry,
  type ResolvedFieldTypeProfileRegistryIdentity,
} from './field-type-profiles.js';

export interface FieldTypeProfileExtractionRegistry
  extends ResolvedFieldTypeProfileRegistryIdentity {
  readonly registry: FieldTypeProfileRegistry;
}

export interface ContractFormlyFieldMetadata {
  readonly profileVariant?: string;
}

/**
 * The data-only Formly surface consumed by profile projection. It is
 * structurally compatible with FormlyFieldConfig without importing Angular.
 */
export interface ContractFormlyFieldConfig {
  readonly type?: unknown;
  readonly wrappers?: readonly unknown[];
  readonly props?: unknown;
  readonly templateOptions?: unknown;
  readonly expressions?: unknown;
  readonly expressionProperties?: unknown;
  readonly formlyContract?: ContractFormlyFieldMetadata;
}

export type FieldTypeProfileProjectionDiagnosticCode =
  | ContractDiagnosticCode
  | FieldTypeProfileResolutionDiagnosticCode
  | 'VALUE_DOMAIN_PROJECTION_FAILED'
  | 'AMBIGUOUS_VALUE_MAPPING';

export interface FieldTypeProfileProjectionDiagnostic {
  readonly code: FieldTypeProfileProjectionDiagnosticCode;
  readonly severity: 'warning' | 'error';
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export interface PreparedFieldTypeProfileExtractionRegistry {
  readonly identity: ResolvedFieldTypeProfileRegistryIdentity;
  readonly profiles: PreparedFieldTypeProfileRegistry;
}

export interface FieldTypeProfileProjectionInput {
  readonly preparedRegistry: PreparedFieldTypeProfileExtractionRegistry;
  readonly field: ContractFormlyFieldConfig;
  readonly evidence: ContractEvidence;
}

export interface FieldTypeProfileProjection {
  readonly registry: ResolvedFieldTypeProfileRegistryIdentity;
  readonly semanticType?: string;
  readonly options: readonly ContractOption[];
  readonly valueDomain?: ContractValueDomain;
  readonly interactionProfile?: ContractInteractionProfile;
  readonly diagnostics: readonly FieldTypeProfileProjectionDiagnostic[];
}

type OwnPropertyResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'accessor' }
  | { readonly kind: 'value'; readonly value: unknown };

interface ProjectedDomain {
  readonly options: readonly ContractOption[];
  readonly valueDomain?: ContractValueDomain;
  readonly mappingFailure: boolean;
  readonly ambiguous: boolean;
  readonly diagnostics: readonly FieldTypeProfileProjectionDiagnostic[];
}

interface WrapperProjection {
  readonly wrappers: readonly string[];
  readonly diagnostics: readonly FieldTypeProfileProjectionDiagnostic[];
}

const STABLE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;

function ownProperty(value: unknown, property: string): OwnPropertyResult {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return { kind: 'missing' };
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, property);
  if (descriptor === undefined) {
    return { kind: 'missing' };
  }
  if (!('value' in descriptor)) {
    return { kind: 'accessor' };
  }
  return { kind: 'value', value: descriptor.value };
}

function requiredBundleValue(
  bundle: FieldTypeProfileExtractionRegistry,
  property: keyof FieldTypeProfileExtractionRegistry,
): unknown {
  const result = ownProperty(bundle, property);
  if (result.kind !== 'value') {
    throw new TypeError(`fieldTypeProfiles.${property} must be a data property`);
  }
  return result.value;
}

export function prepareFieldTypeProfileExtractionRegistry(
  input: FieldTypeProfileExtractionRegistry,
): PreparedFieldTypeProfileExtractionRegistry {
  const registry = requiredBundleValue(input, 'registry');
  const profiles = prepareFieldTypeProfileRegistry(
    registry as FieldTypeProfileRegistry,
  );

  for (const property of [
    'schemaVersion',
    'id',
    'version',
    'contentHash',
  ] as const) {
    if (requiredBundleValue(input, property) !== profiles.identity[property]) {
      throw new TypeError(
        `fieldTypeProfiles.${property} must match the canonical registry identity`,
      );
    }
  }

  return Object.freeze({ identity: profiles.identity, profiles });
}

function readPath(root: unknown, path: readonly string[]): OwnPropertyResult {
  let current = root;
  for (const segment of path) {
    const result = ownProperty(current, segment);
    if (result.kind !== 'value') {
      return result;
    }
    current = result.value;
  }
  return { kind: 'value', value: current };
}

function readProps(field: ContractFormlyFieldConfig): OwnPropertyResult {
  const props = ownProperty(field, 'props');
  if (props.kind === 'value' && props.value !== undefined) {
    return props;
  }
  if (props.kind === 'accessor') {
    return props;
  }
  return ownProperty(field, 'templateOptions');
}

const PROFILE_COLLECTION_PATH_PREFIX = 'props.';

function readProfileCollection(
  field: ContractFormlyFieldConfig,
  collectionPath: string,
): OwnPropertyResult {
  if (!collectionPath.startsWith(PROFILE_COLLECTION_PATH_PREFIX)) {
    throw new TypeError(
      `Field type profile collectionPath "${collectionPath}" must start with "${PROFILE_COLLECTION_PATH_PREFIX}".`,
    );
  }
  const segments = collectionPath
    .slice(PROFILE_COLLECTION_PATH_PREFIX.length)
    .split('.');
  const props = readProps(field);
  if (props.kind !== 'value') {
    return props;
  }
  return readPath(props.value, segments);
}

function readArrayItem(value: readonly unknown[], index: number): OwnPropertyResult {
  return ownProperty(value, String(index));
}

function cloneJsonValue(value: unknown): { canonical: string; value: JsonValue } | undefined {
  try {
    const canonical = canonicalStringify(value);
    return { canonical, value: JSON.parse(canonical) as JsonValue };
  } catch {
    return undefined;
  }
}

function projectionFailure(
  evidence: ContractEvidence,
  path: readonly (string | number)[],
): ProjectedDomain {
  return {
    options: [],
    valueDomain: { kind: 'unknown', evidence },
    mappingFailure: true,
    ambiguous: false,
    diagnostics: [
      {
        code: 'VALUE_DOMAIN_PROJECTION_FAILED',
        severity: 'warning',
        path,
        message:
          'The declared value-domain projection could not produce a complete JSON-safe label-to-value mapping.',
      },
    ],
  };
}

function normalizedVisibleLabel(label: string): string {
  return label.replace(/\p{White_Space}+/gu, ' ').trim();
}

function readExpressionForCollection(
  field: ContractFormlyFieldConfig,
  collectionPath: string,
): OwnPropertyResult {
  const candidatePaths = [
    collectionPath,
    collectionPath.replace(/^props\./u, 'templateOptions.'),
  ];
  for (const mapName of ['expressions', 'expressionProperties'] as const) {
    const map = ownProperty(field, mapName);
    if (map.kind !== 'value') {
      continue;
    }
    for (const candidate of candidatePaths) {
      const expression = ownProperty(map.value, candidate);
      if (expression.kind !== 'missing') {
        return expression;
      }
    }
  }
  return { kind: 'missing' };
}

function hasCallableProperty(value: unknown, property: string): boolean {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return false;
  }
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, property);
    if (descriptor !== undefined) {
      return !('value' in descriptor) || typeof descriptor.value === 'function';
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return false;
}

function dynamicSource(
  value: unknown,
): 'string' | 'function' | 'async' | undefined {
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'function') {
    return 'function';
  }
  if (hasCallableProperty(value, 'then') || hasCallableProperty(value, 'subscribe')) {
    return 'async';
  }
  return undefined;
}

function projectedDynamicDomain(
  source: 'string' | 'function' | 'async',
): ProjectedDomain {
  return {
    options: [],
    valueDomain: { kind: 'dynamic', source, evidence: 'declared' },
    mappingFailure: false,
    ambiguous: false,
    diagnostics: [],
  };
}

function projectDeclaredCollection(
  field: ContractFormlyFieldConfig,
  profile: FieldTypeProfile,
  evidence: ContractEvidence,
): ProjectedDomain {
  if (profile.valueDomain.kind !== 'projected') {
    throw new TypeError('Projected collection requires a projected profile domain.');
  }
  const domain = profile.valueDomain;
  const expression = readExpressionForCollection(field, domain.collectionPath);
  if (evidence === 'declared' && expression.kind !== 'missing') {
    const source =
      expression.kind === 'value' ? dynamicSource(expression.value) : undefined;
    return source === undefined
      ? projectionFailure(evidence, domain.collectionPath.split('.'))
      : projectedDynamicDomain(source);
  }
  const collectionPath = domain.collectionPath.split('.');
  const collection = readProfileCollection(field, domain.collectionPath);
  const diagnosticPath: readonly (string | number)[] = collectionPath;
  if (collection.kind !== 'value' || !Array.isArray(collection.value)) {
    const directSource =
      collection.kind === 'value' ? dynamicSource(collection.value) : undefined;
    const expressionSource =
      expression.kind === 'value' ? dynamicSource(expression.value) : undefined;
    const source = directSource ?? expressionSource;
    if (source !== undefined) {
      return projectedDynamicDomain(source);
    }
    return projectionFailure(evidence, diagnosticPath);
  }

  const options: ContractOption[] = [];
  const values: JsonValue[] = [];
  const canonicalValues = new Set<string>();
  const normalizedLabels = new Map<string, string>();
  let ambiguous = false;

  for (let index = 0; index < collection.value.length; index += 1) {
    const item = readArrayItem(collection.value, index);
    if (item.kind !== 'value') {
      return projectionFailure(evidence, [...diagnosticPath, index]);
    }
    const label = readPath(item.value, domain.labelPath.split('.'));
    const modelValue = readPath(item.value, domain.valuePath.split('.'));
    if (label.kind !== 'value' || modelValue.kind !== 'value') {
      return projectionFailure(evidence, [...diagnosticPath, index]);
    }
    if (
      (typeof label.value !== 'string' && typeof label.value !== 'number') ||
      (typeof label.value === 'number' && !Number.isFinite(label.value))
    ) {
      return projectionFailure(evidence, [...diagnosticPath, index]);
    }
    const displayLabel = String(label.value);
    if (normalizedVisibleLabel(displayLabel).length === 0) {
      return projectionFailure(evidence, [...diagnosticPath, index]);
    }
    const jsonValue = cloneJsonValue(modelValue.value);
    if (jsonValue === undefined || canonicalValues.has(jsonValue.canonical)) {
      return projectionFailure(evidence, [...diagnosticPath, index]);
    }

    const normalizedLabel = normalizedVisibleLabel(displayLabel);
    const priorValue = normalizedLabels.get(normalizedLabel);
    if (priorValue !== undefined && priorValue !== jsonValue.canonical) {
      ambiguous = true;
    } else {
      normalizedLabels.set(normalizedLabel, jsonValue.canonical);
    }

    let disabled: boolean | undefined;
    if (domain.disabledPath !== undefined) {
      const disabledResult = readPath(
        item.value,
        domain.disabledPath.split('.'),
      );
      if (disabledResult.kind === 'value' && disabledResult.value !== undefined) {
        if (typeof disabledResult.value !== 'boolean') {
          return projectionFailure(evidence, [...diagnosticPath, index]);
        }
        disabled = disabledResult.value;
      } else if (disabledResult.kind === 'accessor') {
        return projectionFailure(evidence, [...diagnosticPath, index]);
      }
    }

    canonicalValues.add(jsonValue.canonical);
    values.push(jsonValue.value);
    options.push({
      label: displayLabel,
      value: jsonValue.value,
      ...(disabled === undefined ? {} : { disabled }),
    });
  }

  const materializedExpression =
    evidence === 'resolved' &&
    expression.kind === 'value' &&
    dynamicSource(expression.value) !== undefined;

  return {
    options,
    valueDomain: {
      kind: 'enumerated',
      source: 'adapter',
      completeness: materializedExpression
        ? 'scenario'
        : domain.completeness,
      evidence: materializedExpression ? 'resolved' : domain.evidence,
      values,
    },
    mappingFailure: false,
    ambiguous,
    diagnostics: ambiguous
      ? [
          {
            code: 'AMBIGUOUS_VALUE_MAPPING',
            severity: 'warning',
            path: diagnosticPath,
            message:
              'Projected visible labels do not identify model values one-to-one after whitespace normalization.',
          },
        ]
      : [],
  };
}

function projectValueDomain(
  field: ContractFormlyFieldConfig,
  profile: FieldTypeProfile,
  evidence: ContractEvidence,
): ProjectedDomain {
  const domain = profile.valueDomain;
  switch (domain.kind) {
    case 'projected':
      return projectDeclaredCollection(field, profile, evidence);
    case 'dynamic':
      return {
        options: [],
        valueDomain: {
          kind: 'dynamic',
          source: domain.source,
          evidence: domain.evidence,
        },
        mappingFailure: false,
        ambiguous: false,
        diagnostics: [],
      };
    case 'runtime-enumerable':
    case 'unknown':
      return {
        options: [],
        valueDomain: { kind: 'unknown', evidence: domain.evidence },
        mappingFailure: false,
        ambiguous: false,
        diagnostics: [],
      };
    case 'not-applicable':
      return {
        options: [],
        mappingFailure: false,
        ambiguous: false,
        diagnostics: [],
      };
  }
}

function readVariant(
  field: ContractFormlyFieldConfig,
): { readonly variant?: string; readonly invalid: boolean } {
  const metadata = ownProperty(field, 'formlyContract');
  if (metadata.kind === 'missing' ||
      (metadata.kind === 'value' && metadata.value === undefined)) {
    return { invalid: false };
  }
  if (metadata.kind !== 'value') {
    return { invalid: true };
  }
  if (typeof metadata.value !== 'object' || metadata.value === null) {
    return { invalid: true };
  }
  const variant = ownProperty(metadata.value, 'profileVariant');
  if (variant.kind === 'missing' ||
      (variant.kind === 'value' && variant.value === undefined)) {
    return { invalid: false };
  }
  if (
    variant.kind !== 'value' ||
    typeof variant.value !== 'string' ||
    !STABLE_TOKEN_PATTERN.test(variant.value)
  ) {
    return { invalid: true };
  }
  return { variant: variant.value, invalid: false };
}

function malformedWrapperDiagnostic(
  path: readonly (string | number)[],
): FieldTypeProfileProjectionDiagnostic {
  return {
    code: 'UNKNOWN_FIELD_SHAPE',
    severity: 'error',
    path,
    message:
      'Wrapper metadata must contain only directly declared string wrapper names.',
  };
}

function readStringWrappers(
  field: ContractFormlyFieldConfig,
): WrapperProjection {
  const wrappers = ownProperty(field, 'wrappers');
  if (
    wrappers.kind === 'missing' ||
    (wrappers.kind === 'value' && wrappers.value === undefined)
  ) {
    return { wrappers: [], diagnostics: [] };
  }
  if (wrappers.kind !== 'value' || !Array.isArray(wrappers.value)) {
    return {
      wrappers: [],
      diagnostics: [malformedWrapperDiagnostic(['wrappers'])],
    };
  }
  const names: string[] = [];
  const diagnostics: FieldTypeProfileProjectionDiagnostic[] = [];
  for (let index = 0; index < wrappers.value.length; index += 1) {
    const item = readArrayItem(wrappers.value, index);
    if (item.kind === 'value' && typeof item.value === 'string') {
      names.push(item.value);
    } else {
      diagnostics.push(malformedWrapperDiagnostic(['wrappers', index]));
    }
  }
  return { wrappers: names, diagnostics };
}

function interactionProjection(
  resolved: ReturnType<PreparedFieldTypeProfileRegistry['resolve']>,
): ContractInteractionProfile {
  return {
    profile: resolved.profile.identity,
    semanticType: resolved.profile.semanticType,
    valueShape: resolved.profile.valueShape,
    evidence: 'declared',
    parts: resolved.parts,
    interaction: resolved.profile.interaction,
    driver: resolved.profile.driver,
    effectCapabilities: resolved.profile.effectCapabilities,
    preconditions: resolved.preconditions,
    unknowns: resolved.unknowns,
    provenance: resolved.provenance,
  };
}

function resolutionDiagnostic(
  error: FieldTypeProfileResolutionError,
): FieldTypeProfileProjectionDiagnostic {
  const path =
    error.code === 'UNMAPPED_FIELD_TYPE'
      ? ['type']
      : error.code === 'UNMAPPED_PROFILE_VARIANT'
        ? ['formlyContract', 'profileVariant']
        : ['wrappers'];
  return {
    code: error.code,
    severity: error.code === 'UNMAPPED_FIELD_TYPE' ? 'warning' : 'error',
    path,
    message: error.message,
  };
}

export function projectFieldTypeProfile(
  input: FieldTypeProfileProjectionInput,
): FieldTypeProfileProjection {
  const { field, evidence, preparedRegistry } = input;
  const type = ownProperty(field, 'type');
  if (type.kind !== 'value' || typeof type.value !== 'string') {
    return {
      registry: preparedRegistry.identity,
      options: [],
      diagnostics: [],
    };
  }

  const variant = readVariant(field);
  if (variant.invalid) {
    return {
      registry: preparedRegistry.identity,
      options: [],
      diagnostics: [
        {
          code: 'UNMAPPED_PROFILE_VARIANT',
          severity: 'error',
          path: ['formlyContract', 'profileVariant'],
          message:
            'Field profile variant metadata must be a non-empty stable token.',
        },
      ],
    };
  }

  let resolved;
  const wrapperProjection = readStringWrappers(field);
  if (wrapperProjection.diagnostics.length > 0) {
    return {
      registry: preparedRegistry.identity,
      options: [],
      diagnostics: wrapperProjection.diagnostics,
    };
  }
  try {
    resolved = preparedRegistry.profiles.resolve({
      formlyType: type.value,
      ...(variant.variant === undefined ? {} : { variant: variant.variant }),
      wrappers: wrapperProjection.wrappers,
    });
  } catch (error) {
    if (!(error instanceof FieldTypeProfileResolutionError)) {
      throw error;
    }
    return {
      registry: preparedRegistry.identity,
      options: [],
      diagnostics: [resolutionDiagnostic(error)],
    };
  }

  const domain = projectValueDomain(field, resolved.profile, evidence);
  const unsafeGenericInteraction =
    resolved.profile.driver.kind === 'generic' &&
    (domain.mappingFailure ||
      domain.ambiguous ||
      ((resolved.profile.interaction.kind === 'choice' ||
        resolved.profile.interaction.kind === 'autocomplete' ||
        resolved.profile.interaction.kind === 'row-selection') &&
        domain.valueDomain?.kind !== 'enumerated'));

  return {
    registry: preparedRegistry.identity,
    semanticType: resolved.profile.semanticType,
    options: domain.options,
    ...(domain.valueDomain === undefined
      ? {}
      : { valueDomain: domain.valueDomain }),
    ...(unsafeGenericInteraction
      ? {}
      : { interactionProfile: interactionProjection(resolved) }),
    diagnostics: domain.diagnostics,
  };
}
