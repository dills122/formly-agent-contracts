import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsKitModule } from '@nx-fixture/forms-kit';
import { FormlyModule } from '@ngx-formly/core';

import { DeploymentPageComponent } from './deployment-page.component.js';
import { WorkplacePilotComponent } from './workplace-pilot.component.js';

@NgModule({
  declarations: [DeploymentPageComponent, WorkplacePilotComponent],
  imports: [CommonModule, ReactiveFormsModule, FormlyModule, FormsKitModule],
  exports: [DeploymentPageComponent, WorkplacePilotComponent],
})
export class FeatureLibModule {}
