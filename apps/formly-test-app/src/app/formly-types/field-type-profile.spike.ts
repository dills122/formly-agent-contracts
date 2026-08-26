import { createHash } from 'node:crypto';

import { canonicalStringify } from '@formly-contract/contract-schema';

export interface ProfilePart {
  name: string;
  role: string;
  multiple?: boolean;
}

export type ProfileInteraction =
  | {
      kind: 'fill';
      controlPart: string;
    }
  | {
      kind: 'choice';
      optionPart: string;
      triggerPart?: string;
      popupPart?: string;
      activation: 'check' | 'click';
    }
  | {
      kind: 'autocomplete';
      queryPart: string;
      popupPart: string;
      optionPart: string;
    }
  | {
      kind: 'row-selection';
      rowPart: string;
      selectionPart: string;
      activation: 'check' | 'click';
    }
  | {
      kind: 'repeater';
      addPart: string;
      itemPart: string;
      expandPart?: string;
    };

export type ProfileValueDomain =
  | {
      kind: 'projected';
      completeness: 'declared' | 'scenario';
      collectionPath: string;
      labelPath: string;
      valuePath: string;
      disabledPath?: string;
    }
  | {
      kind: 'runtime-enumerable';
      completeness: 'scenario';
      optionPart: string;
    }
  | {
      kind: 'unknown';
      reason: string;
    }
  | {
      kind: 'not-applicable';
    };

export type GenericDriverId =
  | 'generic.fill'
  | 'generic.choice'
  | 'generic.autocomplete'
  | 'generic.row-selection'
  | 'generic.repeater';

export type ProfileDriver =
  | {
      kind: 'generic';
      id: GenericDriverId;
      version: number;
    }
  | {
      kind: 'application';
      id: string;
      version: number;
    };

export interface FieldTypeProfile {
  id: string;
  version: number;
  semanticType: string;
  valueShape: 'scalar' | 'array' | 'object';
  parts: ProfilePart[];
  interaction: ProfileInteraction;
  valueDomain: ProfileValueDomain;
  driver: ProfileDriver;
}

export interface FieldTypeProfileRegistration {
  formlyType: string;
  defaultProfileId: string;
  variants?: Readonly<Record<string, string>>;
}

export interface WrapperPrecondition {
  kind: 'activate';
  part: string;
}

export interface WrapperProfile {
  id: string;
  version: number;
  wrapperName: string;
  parts: ProfilePart[];
  preconditions: WrapperPrecondition[];
}

export interface FieldTypeProfileRegistry {
  profiles: FieldTypeProfile[];
  registrations: FieldTypeProfileRegistration[];
  wrappers: WrapperProfile[];
}

export interface ProfileRegistryDiagnostic {
  code:
    | 'DUPLICATE_PROFILE_ID'
    | 'DUPLICATE_FORMLY_TYPE'
    | 'DUPLICATE_WRAPPER_NAME'
    | 'UNKNOWN_PROFILE_REFERENCE'
    | 'UNKNOWN_PART_REFERENCE'
    | 'INCOMPATIBLE_GENERIC_DRIVER'
    | 'GENERIC_DRIVER_VALUE_MAPPING_REQUIRED'
    | 'INVALID_APPLICATION_DRIVER';
  subject: string;
  message: string;
}

export interface ResolvedFieldTypeProfile {
  profile: FieldTypeProfile;
  parts: ProfilePart[];
  preconditions: WrapperPrecondition[];
  provenance: string[];
}

export interface FieldTypeProfileRequest {
  formlyType: string;
  variant?: string;
  wrappers: string[];
}

const genericDriverByInteraction = {
  fill: 'generic.fill',
  choice: 'generic.choice',
  autocomplete: 'generic.autocomplete',
  'row-selection': 'generic.row-selection',
  repeater: 'generic.repeater',
} as const satisfies Readonly<
  Record<ProfileInteraction['kind'], GenericDriverId>
>;

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
}

function interactionPartNames(interaction: ProfileInteraction): string[] {
  switch (interaction.kind) {
    case 'fill':
      return [interaction.controlPart];
    case 'choice':
      return [
        interaction.optionPart,
        ...(interaction.triggerPart == null ? [] : [interaction.triggerPart]),
        ...(interaction.popupPart == null ? [] : [interaction.popupPart]),
      ];
    case 'autocomplete':
      return [
        interaction.queryPart,
        interaction.popupPart,
        interaction.optionPart,
      ];
    case 'row-selection':
      return [interaction.rowPart, interaction.selectionPart];
    case 'repeater':
      return [
        interaction.addPart,
        interaction.itemPart,
        ...(interaction.expandPart == null ? [] : [interaction.expandPart]),
      ];
  }
}

export function validateFieldTypeProfileRegistry(
  registry: FieldTypeProfileRegistry,
): ProfileRegistryDiagnostic[] {
  const diagnostics: ProfileRegistryDiagnostic[] = [];
  const profilesById = new Map(
    registry.profiles.map((profile) => [profile.id, profile]),
  );

  for (const id of duplicateValues(registry.profiles.map(({ id }) => id))) {
    diagnostics.push({
      code: 'DUPLICATE_PROFILE_ID',
      subject: id,
      message: `Profile ID ${id} is registered more than once.`,
    });
  }
  for (const formlyType of duplicateValues(
    registry.registrations.map(({ formlyType }) => formlyType),
  )) {
    diagnostics.push({
      code: 'DUPLICATE_FORMLY_TYPE',
      subject: formlyType,
      message: `Formly type ${formlyType} is registered more than once.`,
    });
  }
  for (const wrapperName of duplicateValues(
    registry.wrappers.map(({ wrapperName }) => wrapperName),
  )) {
    diagnostics.push({
      code: 'DUPLICATE_WRAPPER_NAME',
      subject: wrapperName,
      message: `Wrapper ${wrapperName} is registered more than once.`,
    });
  }

  for (const profile of registry.profiles) {
    const partNames = new Set(profile.parts.map(({ name }) => name));
    for (const partName of interactionPartNames(profile.interaction)) {
      if (!partNames.has(partName)) {
        diagnostics.push({
          code: 'UNKNOWN_PART_REFERENCE',
          subject: profile.id,
          message: `Interaction ${profile.interaction.kind} references missing part ${partName}.`,
        });
      }
    }

    if (profile.valueDomain.kind === 'runtime-enumerable') {
      if (!partNames.has(profile.valueDomain.optionPart)) {
        diagnostics.push({
          code: 'UNKNOWN_PART_REFERENCE',
          subject: profile.id,
          message: `Runtime value domain references missing part ${profile.valueDomain.optionPart}.`,
        });
      }
    }

    if (profile.driver.kind === 'generic') {
      const expected = genericDriverByInteraction[profile.interaction.kind];
      if (profile.driver.id !== expected) {
        diagnostics.push({
          code: 'INCOMPATIBLE_GENERIC_DRIVER',
          subject: profile.id,
          message: `Interaction ${profile.interaction.kind} requires ${expected}, received ${profile.driver.id}.`,
        });
      }
      if (
        ['choice', 'autocomplete', 'row-selection'].includes(
          profile.interaction.kind,
        ) &&
        profile.valueDomain.kind !== 'projected'
      ) {
        diagnostics.push({
          code: 'GENERIC_DRIVER_VALUE_MAPPING_REQUIRED',
          subject: profile.id,
          message: `Generic ${profile.interaction.kind} execution requires a projected label-to-model-value mapping.`,
        });
      }
    } else if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u.test(profile.driver.id)) {
      diagnostics.push({
        code: 'INVALID_APPLICATION_DRIVER',
        subject: profile.id,
        message: `Application driver ID ${profile.driver.id} is not stable and namespaced.`,
      });
    }
  }

  for (const registration of registry.registrations) {
    const references = [
      registration.defaultProfileId,
      ...Object.values(registration.variants ?? {}),
    ];
    for (const profileId of references) {
      if (!profilesById.has(profileId)) {
        diagnostics.push({
          code: 'UNKNOWN_PROFILE_REFERENCE',
          subject: registration.formlyType,
          message: `Formly type ${registration.formlyType} references unknown profile ${profileId}.`,
        });
      }
    }
  }

  for (const wrapper of registry.wrappers) {
    const partNames = new Set(wrapper.parts.map(({ name }) => name));
    for (const precondition of wrapper.preconditions) {
      if (!partNames.has(precondition.part)) {
        diagnostics.push({
          code: 'UNKNOWN_PART_REFERENCE',
          subject: wrapper.id,
          message: `Wrapper precondition references missing part ${precondition.part}.`,
        });
      }
    }
  }

  return diagnostics;
}

export function resolveFieldTypeProfile(
  registry: FieldTypeProfileRegistry,
  request: FieldTypeProfileRequest,
): ResolvedFieldTypeProfile {
  const firstDiagnostic = validateFieldTypeProfileRegistry(registry)[0];
  if (firstDiagnostic != null) {
    throw new Error(
      `INVALID_PROFILE_REGISTRY: ${firstDiagnostic.code} ${firstDiagnostic.subject}`,
    );
  }

  const registration = registry.registrations.find(
    ({ formlyType }) => formlyType === request.formlyType,
  );
  if (registration == null) {
    throw new Error(`UNMAPPED_FIELD_TYPE: ${request.formlyType}`);
  }

  const profileId =
    request.variant == null
      ? registration.defaultProfileId
      : registration.variants?.[request.variant];
  if (profileId == null) {
    throw new Error(
      `UNMAPPED_PROFILE_VARIANT: ${request.formlyType}/${request.variant ?? ''}`,
    );
  }
  const profile = registry.profiles.find(({ id }) => id === profileId);
  if (profile == null) {
    throw new Error(`UNKNOWN_PROFILE_REFERENCE: ${profileId}`);
  }

  const parts = [...profile.parts];
  const preconditions: WrapperPrecondition[] = [];
  const provenance = [
    `type:${request.formlyType}`,
    ...(request.variant == null ? [] : [`variant:${request.variant}`]),
  ];
  const partNames = new Set(parts.map(({ name }) => name));

  for (const wrapperName of request.wrappers) {
    const wrapper = registry.wrappers.find(
      (candidate) => candidate.wrapperName === wrapperName,
    );
    if (wrapper == null) {
      throw new Error(`UNMAPPED_WRAPPER_PROFILE: ${wrapperName}`);
    }
    for (const part of wrapper.parts) {
      if (partNames.has(part.name)) {
        throw new Error(`PROFILE_PART_CONFLICT: ${part.name}`);
      }
      partNames.add(part.name);
      parts.push(part);
    }
    preconditions.push(...wrapper.preconditions);
    provenance.push(`wrapper:${wrapperName}`);
  }

  return { profile, parts, preconditions, provenance };
}

function canonicalRegistry(registry: FieldTypeProfileRegistry): unknown {
  return {
    profiles: [...registry.profiles].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    registrations: [...registry.registrations].sort((left, right) =>
      left.formlyType.localeCompare(right.formlyType),
    ),
    wrappers: [...registry.wrappers].sort((left, right) =>
      left.wrapperName.localeCompare(right.wrapperName),
    ),
  };
}

export function computeProfileRegistryHash(
  registry: FieldTypeProfileRegistry,
): string {
  const canonical = canonicalStringify(canonicalRegistry(registry));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}
