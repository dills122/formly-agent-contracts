import { NgModule } from '@angular/core';

import { TEST_FORM_DEFINITION_GROUPS } from '../../form-registry/form-registry.js';
import { EDGE_CASE_TEST_FORMS } from './edge-case-forms.js';

@NgModule({
  providers: [
    {
      provide: TEST_FORM_DEFINITION_GROUPS,
      useValue: EDGE_CASE_TEST_FORMS,
      multi: true,
    },
  ],
})
export class EdgeCaseFormsModule {}
