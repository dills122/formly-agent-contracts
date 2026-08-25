import { NgModule } from '@angular/core';

import { TEST_FORM_DEFINITION_GROUPS } from '../../form-registry/form-registry.js';
import { APPLICANT_TEST_FORMS } from './applicant-forms.js';

@NgModule({
  providers: [
    {
      provide: TEST_FORM_DEFINITION_GROUPS,
      useValue: APPLICANT_TEST_FORMS,
      multi: true,
    },
  ],
})
export class ApplicantFormsModule {}
