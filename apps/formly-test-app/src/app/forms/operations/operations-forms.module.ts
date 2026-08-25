import { NgModule } from '@angular/core';

import { TEST_FORM_DEFINITION_GROUPS } from '../../form-registry/form-registry.js';
import { OPERATIONS_TEST_FORMS } from './operations-forms.js';

@NgModule({
  providers: [
    {
      provide: TEST_FORM_DEFINITION_GROUPS,
      useValue: OPERATIONS_TEST_FORMS,
      multi: true,
    },
  ],
})
export class OperationsFormsModule {}
