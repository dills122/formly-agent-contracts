import type { FormlyFieldConfig } from '@ngx-formly/core';

export interface NxFixtureFormInstance {
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;
  readonly formState?: Record<string, unknown>;
}
