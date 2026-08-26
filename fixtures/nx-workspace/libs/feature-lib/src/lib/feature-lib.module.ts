import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsKitModule } from '@nx-fixture/forms-kit';
import { FormlyModule } from '@ngx-formly/core';

import { ClaimPageComponent } from './claim-page.component.js';

@NgModule({
  declarations: [ClaimPageComponent],
  imports: [CommonModule, ReactiveFormsModule, FormlyModule, FormsKitModule],
  exports: [ClaimPageComponent],
})
export class FeatureLibModule {}
