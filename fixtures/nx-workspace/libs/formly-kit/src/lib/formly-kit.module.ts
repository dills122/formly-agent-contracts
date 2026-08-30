import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';

import { InputFieldComponent } from './input-field.component.js';
import {
  CheckboxFieldComponent,
  SelectFieldComponent,
  TextareaFieldComponent,
} from './native-field.components.js';

@NgModule({
  declarations: [
    InputFieldComponent,
    TextareaFieldComponent,
    CheckboxFieldComponent,
    SelectFieldComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [
        { name: 'input', component: InputFieldComponent },
        { name: 'textarea', component: TextareaFieldComponent },
        { name: 'checkbox', component: CheckboxFieldComponent },
        { name: 'select', component: SelectFieldComponent },
      ],
    }),
  ],
})
export class FormlyKitModule {}
