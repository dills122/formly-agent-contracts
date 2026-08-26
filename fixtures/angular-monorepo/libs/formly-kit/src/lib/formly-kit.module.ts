import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';

import { FixtureInputFieldComponent } from './input-field.component.js';
import {
  FixtureCheckboxFieldComponent,
  FixtureSelectFieldComponent,
  FixtureTextAreaFieldComponent,
} from './native-choice-field.components.js';

@NgModule({
  declarations: [
    FixtureCheckboxFieldComponent,
    FixtureInputFieldComponent,
    FixtureSelectFieldComponent,
    FixtureTextAreaFieldComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [
        { name: 'checkbox', component: FixtureCheckboxFieldComponent },
        { name: 'input', component: FixtureInputFieldComponent },
        { name: 'select', component: FixtureSelectFieldComponent },
        { name: 'textarea', component: FixtureTextAreaFieldComponent },
      ],
    }),
  ],
})
export class FormlyKitModule {}
