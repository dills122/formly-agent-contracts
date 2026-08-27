import {
  canonicalStringify,
  computeFieldTypeProfileRegistryHash,
  type FieldTypeProfileDriver,
  type FieldTypeProfileOperation,
  type FieldTypeProfilePart,
  type FieldTypeProfileRegistry,
} from '@formly-contract/schema';
import {
  resolveFieldTypeProfile,
  type FieldTypeProfileResolutionRequest,
} from '@formly-contract/compiler';

export const BUILT_IN_FORM_TYPES_V1 = [
  'checkbox',
  'formly-template',
  'input',
  'radio',
  'select',
  'textarea',
] as const;

export type BuiltInFormTypeV1 = (typeof BUILT_IN_FORM_TYPES_V1)[number];

export type ProfileCoverageDisposition =
  | 'reviewed'
  | 'built-in-exempt'
  | 'missing';

export function classifyProfileCoverage(
  registry: FieldTypeProfileRegistry,
  formlyType: string,
): ProfileCoverageDisposition {
  if (
    registry.registrations.some(
      (registration) => registration.formlyType === formlyType,
    )
  ) {
    return 'reviewed';
  }
  return (BUILT_IN_FORM_TYPES_V1 as readonly string[]).includes(formlyType)
    ? 'built-in-exempt'
    : 'missing';
}

export type AuthoringEvidence =
  | {
      readonly source: 'formly-registry';
      readonly evidence: 'declared';
      readonly scenarioId?: never;
    }
  | {
      readonly source: 'angular-reflection';
      readonly evidence: 'derived';
      readonly scenarioId?: never;
    }
  | {
      readonly source: 'typescript-source' | 'template-ast';
      readonly evidence: 'derived';
      readonly scenarioId?: never;
    }
  | {
      readonly source: 'reviewed-profile';
      readonly evidence: 'declared';
      readonly scenarioId?: never;
    }
  | {
      readonly source: 'testbed-observation' | 'browser-observation';
      readonly evidence: 'observed';
      readonly scenarioId: string;
    };

export function validateAuthoringEvidence(value: AuthoringEvidence): void {
  const observed =
    value.source === 'testbed-observation' ||
    value.source === 'browser-observation';
  if (observed) {
    if (value.evidence !== 'observed' || value.scenarioId.trim() === '') {
      throw new Error('EVIDENCE_SCENARIO_REQUIRED');
    }
    return;
  }
  if ('scenarioId' in value && value.scenarioId !== undefined) {
    throw new Error('EVIDENCE_SCENARIO_FORBIDDEN');
  }
  const expected =
    value.source === 'formly-registry' || value.source === 'reviewed-profile'
      ? 'declared'
      : 'derived';
  if (value.evidence !== expected) {
    throw new Error('EVIDENCE_CLASS_MISMATCH');
  }
}

export type AuthoringUnknownCode =
  | 'PROPS_API_INCOMPLETE'
  | 'DYNAMIC_TEMPLATE'
  | 'OPAQUE_CHILD_SEMANTICS'
  | 'POSSIBLE_VALUES_RUNTIME_DEPENDENT'
  | 'MODEL_CODEC_UNDECLARED'
  | 'LOCATOR_SCOPE_UNDECLARED'
  | 'INTERACTION_SEQUENCE_UNDECLARED'
  | 'LAZY_SCOPE_NOT_CONFIGURED'
  | 'RUNTIME_DEFAULT_OMITTED'
  | 'RESOURCE_UNAVAILABLE'
  | 'PARTIAL_LIBRARY_SOURCE_UNAVAILABLE';

export type AuthoringDiagnosticCode =
  | 'AMBIGUOUS_COMPONENT_SOURCE'
  | 'SOURCE_OUTSIDE_ROOTS'
  | 'DECLARATION_ONLY_COMPONENT'
  | 'DYNAMIC_COMPONENT_METADATA'
  | 'EXTERNAL_TEMPLATE_UNRESOLVED'
  | 'TEMPLATE_PARSE_FAILED'
  | 'OPAQUE_CHILD_COMPONENT'
  | 'FORM_TYPE_INHERITANCE_CYCLE'
  | 'FORM_TYPE_MISSING_BASE'
  | 'FORM_TYPE_RESOLUTION_FAILED'
  | 'RAW_DEFAULT_OMITTED'
  | 'PROFILE_MISSING'
  | 'PROFILE_RESOLUTION_FAILED'
  | 'SCENARIO_REGISTRY_MISMATCH'
  | 'SCENARIO_RESOLUTION_MISMATCH'
  | 'SCENARIO_PART_MISMATCH'
  | 'SCENARIO_DRIVER_MISMATCH'
  | 'SCENARIO_OPERATION_MISMATCH'
  | 'SCENARIO_MODEL_SINK_MISMATCH'
  | 'POPUP_ASSOCIATION_MISMATCH'
  | 'BROWSER_REQUEST_BLOCKED'
  | 'BROWSER_WEBSOCKET_BLOCKED'
  | 'CONFORMANCE_DRIFT'
  | 'HOST_RESULT_INVALID'
  | 'HOST_TIMEOUT'
  | 'HOST_TEARDOWN_FAILED';

export interface ScenarioRegistryResolutionIdentity {
  readonly registryContentHash: string;
  readonly request: FieldTypeProfileResolutionRequest;
  readonly profile: { readonly id: string; readonly version: number };
}

export interface ScenarioPartExpectation extends FieldTypeProfilePart {
  readonly accessibleName: string;
  readonly root:
    | 'scenario-root'
    | 'document-root'
    | { readonly popupPart: string };
}

export type ScenarioDriverBinding = FieldTypeProfileDriver;

export interface WrapperPreconditionStep {
  readonly kind: 'wrapper-precondition';
  readonly part: string;
  readonly operation: 'click' | 'check';
}

export interface PopupOpenStep {
  readonly kind: 'open-popup';
  readonly bindingVersion: 1;
  readonly triggerPart: string;
  readonly popupPart: string;
  readonly association:
    | 'aria-controls'
    | 'aria-owns'
    | 'reviewed-contract-id'
    | 'harness-binding';
}

export interface ProfileInteractionStep {
  readonly kind: 'profile-interaction';
  readonly operation: FieldTypeProfileOperation;
  readonly part: string;
}

export interface ReviewedModelSinkBinding {
  readonly id: string;
  readonly version: number;
  readonly fieldKeyPath: readonly string[];
  readonly readProtocol: 'formly-model-change';
}

export interface BoundBrowserScenarioExpectation {
  readonly scenarioId: string;
  readonly resolution: ScenarioRegistryResolutionIdentity;
  readonly parts: readonly ScenarioPartExpectation[];
  readonly driver: ScenarioDriverBinding;
  readonly steps: readonly (
    | WrapperPreconditionStep
    | PopupOpenStep
    | ProfileInteractionStep
  )[];
  readonly modelSink: ReviewedModelSinkBinding;
}

function canonical(value: unknown): string {
  return canonicalStringify(value);
}

function fail(code: AuthoringDiagnosticCode): never {
  throw new Error(code);
}

export function validateBoundBrowserScenario(
  registry: FieldTypeProfileRegistry,
  expectation: BoundBrowserScenarioExpectation,
): void {
  if (expectation.scenarioId.trim() === '') {
    fail('SCENARIO_RESOLUTION_MISMATCH');
  }
  const expectedRegistryHash = computeFieldTypeProfileRegistryHash(registry);
  if (expectation.resolution.registryContentHash !== expectedRegistryHash) {
    fail('SCENARIO_REGISTRY_MISMATCH');
  }

  let resolved: ReturnType<typeof resolveFieldTypeProfile>;
  try {
    resolved = resolveFieldTypeProfile(
      registry,
      expectation.resolution.request,
    );
  } catch {
    fail('SCENARIO_RESOLUTION_MISMATCH');
  }
  if (
    canonical(expectation.resolution.profile) !==
    canonical(resolved.profile.identity)
  ) {
    fail('SCENARIO_RESOLUTION_MISMATCH');
  }

  const expectedParts = resolved.parts.map((part) => ({
    name: part.name,
    role: part.role,
    cardinality: part.cardinality,
    evidence: part.evidence,
  }));
  const declaredParts = expectation.parts.map(
    ({ accessibleName: _accessibleName, root: _root, ...part }) => part,
  );
  if (canonical(declaredParts) !== canonical(expectedParts)) {
    fail('SCENARIO_PART_MISMATCH');
  }
  const partNames = new Set(resolved.parts.map(({ name }) => name));
  for (const part of expectation.parts) {
    if (part.accessibleName.trim() === '') {
      fail('SCENARIO_PART_MISMATCH');
    }
    if (
      typeof part.root === 'object' &&
      !partNames.has(part.root.popupPart)
    ) {
      fail('POPUP_ASSOCIATION_MISMATCH');
    }
  }

  if (canonical(expectation.driver) !== canonical(resolved.profile.driver)) {
    fail('SCENARIO_DRIVER_MISMATCH');
  }

  const expectedWrapperSteps = resolved.preconditions.map((precondition) => ({
    kind: 'wrapper-precondition' as const,
    part: precondition.part,
    operation: precondition.operation,
  }));
  const wrapperSteps = expectation.steps.slice(
    0,
    expectedWrapperSteps.length,
  );
  if (canonical(wrapperSteps) !== canonical(expectedWrapperSteps)) {
    fail('SCENARIO_RESOLUTION_MISMATCH');
  }

  const interactionSteps = expectation.steps.filter(
    (step): step is ProfileInteractionStep =>
      step.kind === 'profile-interaction',
  );
  if (
    interactionSteps.length !== 1 ||
    interactionSteps[0]?.operation !== resolved.profile.interaction.operation ||
    !resolved.profile.driver.capabilities.includes(
      interactionSteps[0].operation,
    )
  ) {
    fail('SCENARIO_OPERATION_MISMATCH');
  }

  const interaction = resolved.profile.interaction;
  const requiredInteractionPart =
    interaction.kind === 'fill'
      ? interaction.controlPart
      : interaction.kind === 'choice'
        ? interaction.optionPart
        : interaction.kind === 'autocomplete'
          ? interaction.optionPart
          : interaction.kind === 'row-selection'
            ? interaction.rowPart
            : interaction.operation === 'add-item'
              ? interaction.addPart
              : interaction.itemPart;
  if (interactionSteps[0]?.part !== requiredInteractionPart) {
    fail('SCENARIO_OPERATION_MISMATCH');
  }

  const openSteps = expectation.steps.filter(
    (step): step is PopupOpenStep => step.kind === 'open-popup',
  );
  const popupParts =
    interaction.kind === 'autocomplete'
      ? { trigger: interaction.queryPart, popup: interaction.popupPart }
      : interaction.kind === 'choice' &&
          interaction.triggerPart !== undefined &&
          interaction.popupPart !== undefined
        ? {
            trigger: interaction.triggerPart,
            popup: interaction.popupPart,
          }
        : undefined;
  if (popupParts === undefined) {
    if (openSteps.length !== 0) {
      fail('POPUP_ASSOCIATION_MISMATCH');
    }
  } else {
    const openStep = openSteps[0];
    if (
      openSteps.length !== 1 ||
      openStep?.bindingVersion !== 1 ||
      openStep.triggerPart !== popupParts.trigger ||
      openStep.popupPart !== popupParts.popup ||
      expectation.steps.indexOf(openStep) >=
        expectation.steps.indexOf(interactionSteps[0])
    ) {
      fail('POPUP_ASSOCIATION_MISMATCH');
    }
  }

  if (
    expectation.modelSink.id.trim() === '' ||
    !Number.isSafeInteger(expectation.modelSink.version) ||
    expectation.modelSink.version < 1 ||
    expectation.modelSink.fieldKeyPath.length === 0
  ) {
    fail('SCENARIO_MODEL_SINK_MISMATCH');
  }
}
