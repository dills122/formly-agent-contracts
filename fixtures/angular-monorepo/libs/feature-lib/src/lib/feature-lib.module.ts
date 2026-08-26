import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsKitModule } from '@fixture/forms-kit';
import { FormlyModule } from '@ngx-formly/core';

import { ClaimIntakePageComponent } from './claim-intake-page.component.js';
import { ScenarioGalleryPageComponent } from './scenario-gallery-page.component.js';

@NgModule({
  declarations: [ClaimIntakePageComponent, ScenarioGalleryPageComponent],
  imports: [CommonModule, ReactiveFormsModule, FormlyModule, FormsKitModule],
  exports: [ClaimIntakePageComponent, ScenarioGalleryPageComponent],
})
export class FeatureLibModule {}
