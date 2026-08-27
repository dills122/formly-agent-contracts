import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';

import {
  OpaqueLibraryChildComponent,
  PartialExternalFieldComponent,
} from './external-field.component.js';
import {
  PartialInfoPanelComponent,
  PartialOverlayFieldComponent,
} from './feature-fields.component.js';

@NgModule({
  declarations: [PartialExternalFieldComponent, OpaqueLibraryChildComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'partial-external',
          component: PartialExternalFieldComponent,
        },
      ],
    }),
  ],
})
export class PartialRootFormlyModule {}

@NgModule({
  declarations: [PartialOverlayFieldComponent, PartialInfoPanelComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'partial-feature-overlay',
          component: PartialOverlayFieldComponent,
        },
        {
          name: 'partial-info-panel',
          component: PartialInfoPanelComponent,
        },
      ],
    }),
  ],
})
export class PartialFeatureFormlyModule {}
