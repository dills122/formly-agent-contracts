import {
  GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS,
  canonicalizeFieldTypeProfileRegistry,
  computeFieldTypeProfileRegistryHash,
  type FieldTypeProfile,
  type FieldTypeProfilePart,
  type FieldTypeProfileReference,
  type FieldTypeProfileRegistry,
  type FieldTypeProfileUnknown,
  type FieldTypeWrapperPrecondition,
} from '@formly-contract/contract-schema';

export const FIELD_TYPE_PROFILE_RESOLUTION_DIAGNOSTIC_CODES = [
  'UNMAPPED_FIELD_TYPE',
  'UNMAPPED_PROFILE_VARIANT',
  'UNMAPPED_WRAPPER_PROFILE',
  'DUPLICATE_WRAPPER_REQUEST',
  'PROFILE_PART_CONFLICT',
  'WRAPPER_BLOCKS_GENERIC_DRIVER',
] as const;

export type FieldTypeProfileResolutionDiagnosticCode =
  typeof FIELD_TYPE_PROFILE_RESOLUTION_DIAGNOSTIC_CODES[number];

export class FieldTypeProfileResolutionError extends Error {
  readonly code: FieldTypeProfileResolutionDiagnosticCode;
  readonly subject: string;

  constructor(
    code: FieldTypeProfileResolutionDiagnosticCode,
    subject: string,
    message: string,
  ) {
    super(message);
    this.name = 'FieldTypeProfileResolutionError';
    this.code = code;
    this.subject = subject;
  }
}

export interface FieldTypeProfileResolutionRequest {
  readonly formlyType: string;
  readonly variant?: string;
  readonly wrappers: readonly string[];
}

export interface ResolvedFieldTypeProfileRegistryIdentity {
  readonly schemaVersion: FieldTypeProfileRegistry['schemaVersion'];
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface ResolvedFieldTypeProfileUnknown {
  readonly scope: 'profile' | 'wrapper';
  readonly source: string;
  readonly aspect: FieldTypeProfileUnknown['aspect'];
  readonly reason: string;
  readonly evidence: FieldTypeProfileUnknown['evidence'];
}

export interface ResolvedFieldTypeProfile {
  readonly registry: ResolvedFieldTypeProfileRegistryIdentity;
  readonly profile: FieldTypeProfile;
  readonly parts: readonly FieldTypeProfilePart[];
  readonly preconditions: readonly FieldTypeWrapperPrecondition[];
  readonly unknowns: readonly ResolvedFieldTypeProfileUnknown[];
  readonly provenance: readonly string[];
}

function profileReferenceKey(reference: FieldTypeProfileReference): string {
  return `${reference.id}@${reference.version}`;
}

function normalizeRegistry(
  input: FieldTypeProfileRegistry,
): FieldTypeProfileRegistry {
  return JSON.parse(
    canonicalizeFieldTypeProfileRegistry(input),
  ) as FieldTypeProfileRegistry;
}

function fail(
  code: FieldTypeProfileResolutionDiagnosticCode,
  subject: string,
  message: string,
): never {
  throw new FieldTypeProfileResolutionError(code, subject, message);
}

export function resolveFieldTypeProfile(
  input: FieldTypeProfileRegistry,
  request: FieldTypeProfileResolutionRequest,
): ResolvedFieldTypeProfile {
  const registry = normalizeRegistry(input);
  const registration = registry.registrations.find(
    ({ formlyType }) => formlyType === request.formlyType,
  );
  if (registration === undefined) {
    fail(
      'UNMAPPED_FIELD_TYPE',
      request.formlyType,
      `No field-type profile is registered for Formly type "${request.formlyType}".`,
    );
  }

  const reference =
    request.variant === undefined
      ? registration.defaultProfile
      : registration.variants.find(({ name }) => name === request.variant)
          ?.profile;
  if (reference === undefined) {
    const subject = `${request.formlyType}/${request.variant ?? ''}`;
    fail(
      'UNMAPPED_PROFILE_VARIANT',
      subject,
      `Formly type "${request.formlyType}" has no declared profile variant "${
        request.variant ?? ''
      }".`,
    );
  }

  const referenceKey = profileReferenceKey(reference);
  const profile = registry.profiles.find(
    ({ identity }) => profileReferenceKey(identity) === referenceKey,
  );
  if (profile === undefined) {
    // Strict registry parsing checks this invariant. Keep this branch explicit
    // so future registry composition cannot silently return an empty profile.
    throw new TypeError(
      `Validated profile registry lost reference "${referenceKey}".`,
    );
  }

  const parts = [...profile.parts];
  const partNames = new Set(parts.map(({ name }) => name));
  const preconditions: FieldTypeWrapperPrecondition[] = [];
  const unknowns: ResolvedFieldTypeProfileUnknown[] = profile.unknowns.map(
    (unknown) => ({
      scope: 'profile',
      source: profileReferenceKey(profile.identity),
      aspect: unknown.aspect,
      reason: unknown.reason,
      evidence: unknown.evidence,
    }),
  );
  const provenance = [
    `registry:${registry.id}@${registry.version}`,
    `type:${request.formlyType}`,
    ...(request.variant === undefined ? [] : [`variant:${request.variant}`]),
  ];
  const requestedWrappers = new Set<string>();

  for (const wrapperName of request.wrappers) {
    if (requestedWrappers.has(wrapperName)) {
      fail(
        'DUPLICATE_WRAPPER_REQUEST',
        wrapperName,
        `Wrapper "${wrapperName}" is requested more than once.`,
      );
    }
    requestedWrappers.add(wrapperName);

    const wrapper = registry.wrappers.find(
      (candidate) => candidate.wrapperName === wrapperName,
    );
    if (wrapper === undefined) {
      fail(
        'UNMAPPED_WRAPPER_PROFILE',
        wrapperName,
        `No wrapper profile is registered for "${wrapperName}".`,
      );
    }

    if (profile.driver.kind === 'generic') {
      const blockingUnknown = wrapper.unknowns.find(({ aspect }) =>
        GENERIC_DRIVER_BLOCKING_UNKNOWN_ASPECTS.includes(aspect),
      );
      if (blockingUnknown !== undefined) {
        const subject = `${wrapperName}/${blockingUnknown.aspect}`;
        fail(
          'WRAPPER_BLOCKS_GENERIC_DRIVER',
          subject,
          `Wrapper "${wrapperName}" cannot compose with generic driver "${profile.driver.id}" while "${blockingUnknown.aspect}" is unknown.`,
        );
      }
    }

    for (const part of wrapper.parts) {
      if (partNames.has(part.name)) {
        fail(
          'PROFILE_PART_CONFLICT',
          part.name,
          `Wrapper "${wrapperName}" contributes duplicate part "${part.name}".`,
        );
      }
      partNames.add(part.name);
      parts.push(part);
    }
    preconditions.push(...wrapper.preconditions);
    unknowns.push(
      ...wrapper.unknowns.map((unknown) => ({
        scope: 'wrapper' as const,
        source: wrapperName,
        aspect: unknown.aspect,
        reason: unknown.reason,
        evidence: unknown.evidence,
      })),
    );
    provenance.push(`wrapper:${wrapperName}`);
  }

  return {
    registry: {
      schemaVersion: registry.schemaVersion,
      id: registry.id,
      version: registry.version,
      contentHash: computeFieldTypeProfileRegistryHash(registry),
    },
    profile,
    parts,
    preconditions,
    unknowns,
    provenance,
  };
}
