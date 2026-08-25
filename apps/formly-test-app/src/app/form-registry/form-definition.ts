import type { FormlyFieldConfig } from '@ngx-formly/core';

export const REQUIRED_TEST_FORM_FEATURES = [
  'basic-controls',
  'nested-groups',
  'key-paths',
  'constraints',
  'defaults',
  'static-options',
  'observable-options',
  'repeaters',
  'string-expressions',
  'function-expressions',
  'named-validation',
  'inline-validation',
  'async-validation',
  'model-options',
  'parsers',
  'hooks',
  'form-state',
  'wrappers',
  'presets',
  'custom-types',
  'legacy-v6-aliases',
  'opaque-values',
] as const;

export type TestFormFeature = (typeof REQUIRED_TEST_FORM_FEATURES)[number];

export interface TestFormInstance {
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;
  readonly formState: Record<string, unknown>;
}

export interface TestFormDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly features: readonly TestFormFeature[];
  readonly create: () => TestFormInstance;
}
