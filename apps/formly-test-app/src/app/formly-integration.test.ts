import 'zone.js';
import 'zone.js/testing';
import '@angular/compiler';

import { getTestBed, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import {
  FormlyConfig,
  FormlyFormBuilder,
  FormlyModule,
  type FormlyFieldConfig,
} from '@ngx-formly/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { TestFormRegistry } from './form-registry/form-registry.js';
import { NativeFormlyFieldsModule } from './formly-types/native-formly-fields.module.js';
import { TestFormlyExtensionsModule } from './formly-types/test-formly-extensions.module.js';
import { ApplicantFormsModule } from './forms/applicant/applicant-forms.module.js';
import { EdgeCaseFormsModule } from './forms/edge-cases/edge-case-forms.module.js';
import { OperationsFormsModule } from './forms/operations/operations-forms.module.js';

let testEnvironmentInitialized = false;

function ensureTestEnvironment(): void {
  if (testEnvironmentInitialized) {
    return;
  }

  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
  testEnvironmentInitialized = true;
}

function createRoot(
  fields: FormlyFieldConfig[],
  model: Record<string, unknown>,
  formState: Record<string, unknown>,
): FormlyFieldConfig {
  return {
    form: new FormGroup({}),
    model,
    options: { formState },
    fieldGroup: fields,
  };
}

describe('modular Angular and Formly integration', () => {
  beforeAll(() => {
    ensureTestEnvironment();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        FormlyModule.forRoot({
          extras: {
            lazyRender: true,
            resetFieldOnHide: true,
          },
        }),
        NativeFormlyFieldsModule,
        TestFormlyExtensionsModule,
        ApplicantFormsModule,
        OperationsFormsModule,
        EdgeCaseFormsModule,
      ],
    });
  });

  it('collects all form definitions contributed by feature modules', () => {
    const registry = TestBed.inject(TestFormRegistry);

    expect(registry.list()).toHaveLength(12);
    expect(registry.list().map(({ id }) => id)).toEqual([
      'applicant.address-history',
      'applicant.communication',
      'applicant.household',
      'applicant.profile',
      'edge.key-paths',
      'edge.legacy-v6',
      'edge.opaque-behavior',
      'edge.validation',
      'operations.access-request',
      'operations.equipment-inspection',
      'operations.incident-report',
      'operations.purchase-order',
    ]);
  });

  it('registers native and custom types, a wrapper, and a validator', () => {
    const config = TestBed.inject(FormlyConfig);

    for (const typeName of [
      'input',
      'textarea',
      'checkbox',
      'select',
      'radio',
      'currency',
      'rating',
      'repeat-section',
    ]) {
      expect(config.getType(typeName).component, typeName).toBeDefined();
    }

    expect(config.getWrapper('section-card').component).toBeDefined();
    expect(config.getValidator('postalCode').validation).toBeTypeOf('function');
  });

  it('builds every registered fixture through the configured Formly builder', () => {
    const builder = TestBed.inject(FormlyFormBuilder);
    const registry = TestBed.inject(TestFormRegistry);

    for (const definition of registry.list()) {
      const instance = registry.create(definition.id);
      const root = createRoot(
        instance.fields,
        instance.model,
        instance.formState,
      );

      builder.build(root);

      expect(root.fieldGroup, definition.id).toHaveLength(
        instance.fields.length,
      );
      expect(root.form, definition.id).toBeInstanceOf(FormGroup);
      expect(root.fieldGroup?.[0]?.parent, definition.id).toBe(root);
    }
  });

  it('substitutes the applicant-name preset during the build', () => {
    const builder = TestBed.inject(FormlyFormBuilder);
    const registry = TestBed.inject(TestFormRegistry);
    const instance = registry.create('applicant.profile');
    const root = createRoot(
      instance.fields,
      instance.model,
      instance.formState,
    );

    builder.build(root);

    const presetField = root.fieldGroup?.[0]?.fieldGroup?.[0];
    expect(presetField?.type).toBe('input');
    expect(presetField?.key).toBe('identity.legalName');
    expect(presetField?.props?.label).toBe('Legal name');
  });
});
