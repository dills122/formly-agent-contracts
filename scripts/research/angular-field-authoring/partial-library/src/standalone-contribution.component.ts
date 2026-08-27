import { Component, NgModule, importProvidersFrom } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FormlyModule, type FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'research-partial-standalone-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  template:
    '<input type="text" [attr.aria-label]="props.label" [formControl]="formControl" />',
})
export class PartialStandaloneFieldComponent extends FieldType<FieldTypeConfig> {}

@NgModule({
  imports: [
    FormlyModule.forChild({
      types: [
        {
          name: 'partial-standalone',
          component: PartialStandaloneFieldComponent,
        },
      ],
    }),
  ],
})
class PartialStandaloneRegistrationModule {}

@Component({
  selector: 'research-partial-standalone-contribution',
  standalone: true,
  imports: [PartialStandaloneRegistrationModule],
  template: '',
})
export class PartialStandaloneContributionComponent {}

export function providePartialStandaloneFormly(): EnvironmentProviders {
  return importProvidersFrom(PartialStandaloneRegistrationModule);
}
