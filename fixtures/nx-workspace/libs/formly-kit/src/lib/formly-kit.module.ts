import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';

import { InputFieldComponent } from './input-field.component.js';

@NgModule({
  declarations: [InputFieldComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [{ name: 'input', component: InputFieldComponent }],
    }),
  ],
})
export class FormlyKitModule {}
