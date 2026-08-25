import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { FormlyModule } from '@ngx-formly/core';

import { AppComponent } from './app.component.js';
import { NativeFormlyFieldsModule } from './formly-types/native-formly-fields.module.js';
import { TestFormlyExtensionsModule } from './formly-types/test-formly-extensions.module.js';
import { ApplicantFormsModule } from './forms/applicant/applicant-forms.module.js';
import { EdgeCaseFormsModule } from './forms/edge-cases/edge-case-forms.module.js';
import { OperationsFormsModule } from './forms/operations/operations-forms.module.js';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
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
  bootstrap: [AppComponent],
})
export class AppModule {}
