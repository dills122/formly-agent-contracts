export const FORM_CONTRACT_SCHEMA_VERSION = '0.2.0' as const;

export const CONTRACT_DIAGNOSTIC_CODES = [
  'OPAQUE_FUNCTION',
  'ASYNC_VALUE',
  'UNKNOWN_FIELD_SHAPE',
  'UNSUPPORTED_RULE',
] as const;

export type ContractDiagnosticCode =
  (typeof CONTRACT_DIAGNOSTIC_CODES)[number];

export type ContractEvidence = 'declared' | 'resolved';
export type ContractNodeKind = 'control' | 'group' | 'array' | 'display';
export type ContractDiagnosticSeverity = 'warning' | 'error';
export type ModelPathSegment = string | number;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

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

export interface ContractCondition {
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
  readonly conditions: readonly ContractCondition[];
  readonly dynamicRules: readonly ContractDynamicRule[];
  readonly state?: ContractNodeState;
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
  readonly nodes: readonly ContractNode[];
  readonly diagnostics: readonly ContractDiagnostic[];
}

export interface FormContract extends FormContractDraft {
  readonly contentHash: string;
}
