import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyKitModule } from '@nx-fixture/formly-kit';
import { FormlyModule } from '@ngx-formly/core';
import { toFormlyTypeRegistration } from '@formly-contract/schema/field-type-authoring';

import { CoolRadioComponent } from './cool-radio.component.js';
import { NX_COOL_RADIO_TYPE } from './field-type-profiles.js';

@NgModule({
  declarations: [CoolRadioComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyKitModule,
    FormlyModule.forChild({
      types: [
        toFormlyTypeRegistration(NX_COOL_RADIO_TYPE, CoolRadioComponent),
      ],
    }),
  ],
})
export class FormsKitModule {}
