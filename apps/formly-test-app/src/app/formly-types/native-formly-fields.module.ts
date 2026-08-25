import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';

import {
  CheckboxFieldComponent,
  InputFieldComponent,
  RadioFieldComponent,
  SelectFieldComponent,
  TextareaFieldComponent,
} from './native-field-types.js';

@NgModule({
  declarations: [
    InputFieldComponent,
    TextareaFieldComponent,
    CheckboxFieldComponent,
    SelectFieldComponent,
    RadioFieldComponent,
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
        { name: 'radio', component: RadioFieldComponent },
      ],
    }),
  ],
})
export class NativeFormlyFieldsModule {}
