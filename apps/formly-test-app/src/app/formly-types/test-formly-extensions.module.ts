import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  type ValidationErrors,
} from '@angular/forms';
import {
  type FormlyExtension,
  type FormlyFieldConfig,
  FormlyModule,
} from '@ngx-formly/core';
import { FormlyPresetModule } from '@ngx-formly/core/preset';

import {
  CurrencyFieldComponent,
  RatingFieldComponent,
  RepeatSectionFieldComponent,
  SectionCardWrapperComponent,
} from './custom-field-types.js';

const postalCodePattern = /^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$/;

function postalCodeValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value == null || control.value === '') {
    return null;
  }

  return typeof control.value === 'string' &&
    postalCodePattern.test(control.value)
    ? null
    : { postalCode: true };
}

const stableTestIdExtension: FormlyExtension = {
  prePopulate(field: FormlyFieldConfig): void {
    if (field.key == null || field.props?.attributes?.['data-testid']) {
      return;
    }

    const key = Array.isArray(field.key) ? field.key.join('.') : String(field.key);
    field.props = {
      ...field.props,
      attributes: {
        ...field.props?.attributes,
        'data-testid': `fixture-field-${key.replaceAll(/[^a-zA-Z0-9]+/g, '-')}`,
      },
    };
  },
};

@NgModule({
  declarations: [
    CurrencyFieldComponent,
    RatingFieldComponent,
    RepeatSectionFieldComponent,
    SectionCardWrapperComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyPresetModule,
    FormlyModule.forChild({
      types: [
        { name: 'currency', component: CurrencyFieldComponent },
        { name: 'rating', component: RatingFieldComponent },
        { name: 'repeat-section', component: RepeatSectionFieldComponent },
      ],
      wrappers: [
        { name: 'section-card', component: SectionCardWrapperComponent },
      ],
      validators: [
        { name: 'postalCode', validation: postalCodeValidator },
      ],
      validationMessages: [
        { name: 'postalCode', message: 'Enter a synthetic Canadian postal code.' },
      ],
      extensions: [
        { name: 'stable-test-id', extension: stableTestIdExtension, priority: 2 },
      ],
      presets: [
        {
          name: 'applicantName',
          config: {
            key: 'identity.legalName',
            type: 'input',
            props: {
              label: 'Legal name',
              required: true,
              minLength: 2,
              maxLength: 80,
            },
          },
        },
      ],
    }),
  ],
})
export class TestFormlyExtensionsModule {}
