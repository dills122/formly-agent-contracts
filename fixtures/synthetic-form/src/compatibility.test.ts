// Angular's partial-compiled packages use the JIT fallback in this Node-based
// compatibility test, so the compiler must load before Angular Forms.
// Source: https://angular.dev/tools/libraries/creating-libraries#consuming-partial-ivy-code-outside-the-angular-cli
import '@angular/compiler';

import { FormGroup } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';
import { describe, expect, it } from 'vitest';

import { buildSyntheticForm } from './compatibility.js';

describe('Angular 20.3 and Formly 6.1 compatibility', () => {
  it('builds a typed Formly configuration with the registered core extensions', () => {
    const result = buildSyntheticForm();
    const fields: readonly FormlyFieldConfig[] = result.fields;
    const displayName = fields[0]?.fieldGroup?.[0];

    expect(result.root.form).toBeInstanceOf(FormGroup);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.parent).toBe(result.root);
    expect(fields[0]?.formControl).toBeDefined();
    expect(displayName?.formControl).toBeDefined();
    expect(displayName?.props?.type).toBe('text');
  });
});
