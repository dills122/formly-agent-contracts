import type {
  FieldTypeProfileDriver,
  FieldTypeProfileIdentity,
  FieldTypeProfileInteraction,
  FieldTypeProfilePart,
  FieldTypeProfileUnknownAspect,
  FieldTypeWrapperPrecondition,
} from './field-type-interaction.js';
import { CROSS_FIELD_EFFECT_SCHEMA_VERSION } from './cross-field-effect.js';
import type {
  DeclaredCrossFieldEffect,
  FieldTypeEffectCapabilities,
} from './cross-field-effect.js';
import { FIELD_TYPE_PROFILE_SCHEMA_VERSION } from './field-type-profile.js';

export const FORM_CONTRACT_SCHEMA_ID = 'formly-contract.form-contract' as const;
export const FORM_CONTRACT_SCHEMA_VERSION = '0.4.0' as const;

export const FIELD_TYPE_PROFILE_RESOLUTION_DIAGNOSTIC_CODES = [
  'UNMAPPED_FIELD_TYPE',
  'UNMAPPED_PROFILE_VARIANT',
  'UNMAPPED_WRAPPER_PROFILE',
  'DUPLICATE_WRAPPER_REQUEST',
  'PROFILE_PART_CONFLICT',
  'WRAPPER_BLOCKS_GENERIC_DRIVER',
] as const;

export const CONTRACT_DIAGNOSTIC_CODES = [
  'OPAQUE_FUNCTION',
  'ASYNC_VALUE',
  'UNKNOWN_FIELD_SHAPE',
  'UNSUPPORTED_RULE',
  'LOCATOR_DERIVATION_FAILED',
  'UNRELIABLE_DOM_ID',
  ...FIELD_TYPE_PROFILE_RESOLUTION_DIAGNOSTIC_CODES,
  'VALUE_DOMAIN_PROJECTION_FAILED',
  'AMBIGUOUS_VALUE_MAPPING',
  'UNKNOWN_EFFECT_SOURCE',
  'UNKNOWN_EFFECT_TARGET',
  'UNSUPPORTED_EFFECT_TARGET',
  'UNKNOWN_EFFECT_READINESS',
  'UNKNOWN_EFFECT_CONDITION',
  'EFFECT_CYCLE',
] as const;

export type ContractDiagnosticCode =
  (typeof CONTRACT_DIAGNOSTIC_CODES)[number];

export type ContractEvidence = 'declared' | 'resolved' | 'observed';
export type ContractNodeKind = 'control' | 'group' | 'array' | 'display';
export type ContractDiagnosticSeverity = 'warning' | 'error';
export type ModelPathSegment = string | number;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type ContractValueDomain =
  | {
      readonly kind: 'enumerated';
      readonly source:
        | 'static-options'
        | 'resolved-options'
        | 'semantic-type'
        | 'adapter';
      readonly completeness: 'complete' | 'scenario';
      readonly evidence: ContractEvidence;
      readonly values: readonly JsonValue[];
    }
  | {
      readonly kind: 'dynamic';
      readonly source: 'string' | 'function' | 'async';
      readonly evidence: ContractEvidence;
    }
  | {
      readonly kind: 'unknown';
      readonly evidence: ContractEvidence;
    };

export interface ContractPresentation {
  readonly label?: string;
  readonly description?: string;
  readonly placeholder?: string;
}

export type ContractConstraint =
  | { readonly kind: 'required' }
  | {
      readonly kind: 'min' | 'max' | 'minLength' | 'maxLength';
      readonly value: number;
    }
  | { readonly kind: 'pattern'; readonly value: string }
  | { readonly kind: 'named'; readonly name: string };

export interface ContractOption {
  readonly label: string;
  readonly value: JsonValue;
  readonly disabled?: boolean;
}

export interface ContractDisplay {
  readonly format: 'html';
  readonly content: string;
}

export type ContractDynamicRuleSource = 'function' | 'async';

export interface ContractDynamicRule {
  readonly id: string;
  readonly property: string;
  readonly source: ContractDynamicRuleSource;
  readonly evidence: ContractEvidence;
  readonly resolvedValue?: JsonValue;
}

export type ContractOptionSource =
  | {
      readonly kind: 'static';
      readonly evidence: ContractEvidence;
    }
  | {
      readonly kind: 'dynamic';
      readonly property: string;
      readonly source: 'string' | 'function';
      readonly evidence: ContractEvidence;
    }
  | {
      readonly kind: 'async';
      readonly property: string;
      readonly evidence: ContractEvidence;
    };

export interface ContractNodeState {
  readonly hidden?: boolean;
  readonly readonly?: boolean;
  readonly disabled?: boolean;
}

export interface ContractFieldTypeProfileRegistryIdentity {
  readonly schemaVersion: typeof FIELD_TYPE_PROFILE_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface ContractCrossFieldEffectRegistryIdentity {
  readonly schemaVersion: typeof CROSS_FIELD_EFFECT_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly contentHash: string;
}

export type ContractEffectAnalysisReason =
  | 'declared-partial'
  | 'effect-cycle'
  | 'form-not-declared'
  | 'invalid-declared-effect'
  | 'opaque-dynamic-rule'
  | 'opaque-diagnostic';

export interface ContractEffectAnalysis {
  readonly completeness: 'complete' | 'incomplete';
  readonly reasons: readonly ContractEffectAnalysisReason[];
}

export interface ContractInteractionProfileUnknown {
  readonly scope: 'profile' | 'wrapper';
  readonly source: string;
  readonly aspect: FieldTypeProfileUnknownAspect;
  readonly reason: string;
  readonly evidence: ContractEvidence;
}

export interface ContractInteractionProfile {
  readonly profile: FieldTypeProfileIdentity;
  readonly semanticType: string;
  readonly valueShape: 'scalar' | 'array' | 'object';
  readonly evidence: 'declared';
  readonly parts: readonly FieldTypeProfilePart[];
  readonly interaction: FieldTypeProfileInteraction;
  readonly driver: FieldTypeProfileDriver;
  readonly effectCapabilities: FieldTypeEffectCapabilities;
  readonly preconditions: readonly FieldTypeWrapperPrecondition[];
  readonly unknowns: readonly ContractInteractionProfileUnknown[];
  readonly provenance: readonly string[];
}

export type ContractLocatorConfidence = 'exact' | 'derived';
export type ContractLocatorStrategy =
  | 'testId'
  | 'role'
  | 'label'
  | 'placeholder'
  | 'domId';

interface ContractLocatorBase {
  readonly target: string;
  readonly value: string;
  readonly evidence: ContractEvidence;
  readonly confidence: ContractLocatorConfidence;
}

export type ContractLocator =
  | (ContractLocatorBase & {
      readonly strategy: 'testId';
      readonly attribute: string;
    })
  | (ContractLocatorBase & {
      readonly strategy: 'role';
      readonly accessibleName?: string;
    })
  | (ContractLocatorBase & {
      readonly strategy: 'label' | 'placeholder' | 'domId';
    });

export interface ContractCondition {
  readonly id: string;
  readonly property: string;
  readonly expression: string;
  readonly evidence: ContractEvidence;
}

export interface ContractNode {
  readonly id: string;
  readonly kind: ContractNodeKind;
  readonly modelPath: readonly ModelPathSegment[];
  readonly formlyType?: string;
  readonly semanticType?: string;
  readonly evidence: ContractEvidence;
  readonly presentation?: ContractPresentation;
  readonly display?: ContractDisplay;
  readonly defaultValue?: JsonValue;
  readonly wrappers: readonly string[];
  readonly constraints: readonly ContractConstraint[];
  readonly options: readonly ContractOption[];
  readonly optionSource?: ContractOptionSource;
  readonly valueDomain?: ContractValueDomain;
  readonly interactionProfile?: ContractInteractionProfile;
  readonly conditions: readonly ContractCondition[];
  readonly dynamicRules: readonly ContractDynamicRule[];
  readonly state?: ContractNodeState;
  readonly locators: readonly ContractLocator[];
  readonly children: readonly ContractNode[];
  readonly arrayTemplate?: ContractNode;
}

export interface ContractDiagnostic {
  readonly code: ContractDiagnosticCode;
  readonly severity: ContractDiagnosticSeverity;
  readonly message: string;
  readonly evidence: ContractEvidence;
  readonly sourcePath: readonly ModelPathSegment[];
  readonly nodeId?: string;
}

export interface FormContractDraft {
  readonly schemaVersion: typeof FORM_CONTRACT_SCHEMA_VERSION;
  readonly formId: string;
  readonly fieldTypeProfileRegistry?: ContractFieldTypeProfileRegistryIdentity;
  readonly crossFieldEffectRegistry?: ContractCrossFieldEffectRegistryIdentity;
  readonly declaredEffects?: readonly DeclaredCrossFieldEffect[];
  readonly effectAnalysis?: ContractEffectAnalysis;
  readonly nodes: readonly ContractNode[];
  readonly diagnostics: readonly ContractDiagnostic[];
}

export interface FormContract extends FormContractDraft {
  readonly contentHash: string;
}
