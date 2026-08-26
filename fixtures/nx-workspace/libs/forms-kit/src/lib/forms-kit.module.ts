import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyKitModule } from '@nx-fixture/formly-kit';
import { FormlyModule } from '@ngx-formly/core';

import { CoolRadioComponent } from './cool-radio.component.js';

@NgModule({
  declarations: [CoolRadioComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyKitModule,
    FormlyModule.forChild({
      types: [{ name: 'cool-radio-btn-grp', component: CoolRadioComponent }],
    }),
  ],
})
export class FormsKitModule {}
