import type { FormlyFieldConfig } from '@ngx-formly/core';

export interface FixtureFormInstance {
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;
}
