import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyKitModule } from '@nx-fixture/formly-kit';
import { FormlyModule } from '@ngx-formly/core';
import { toFormlyTypeRegistration } from '@formly-contract/schema/field-type-authoring';

import { CoolRadioComponent } from './cool-radio.component.js';
import { NX_COOL_RADIO_TYPE } from './field-type-profiles.js';
import {
  DateRangeComponent,
  DependentSelectComponent,
  EntityAutocompleteComponent,
  ExpandableRepeaterComponent,
  SectionWrapperComponent,
  TableSelectComponent,
} from './interaction-field.components.js';

@NgModule({
  declarations: [
    CoolRadioComponent,
    DateRangeComponent,
    DependentSelectComponent,
    EntityAutocompleteComponent,
    ExpandableRepeaterComponent,
    SectionWrapperComponent,
    TableSelectComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyKitModule,
    FormlyModule.forChild({
      types: [
        toFormlyTypeRegistration(NX_COOL_RADIO_TYPE, CoolRadioComponent),
        { name: 'date-range', component: DateRangeComponent },
        { name: 'dependent-select', component: DependentSelectComponent },
        { name: 'entity-autocomplete', component: EntityAutocompleteComponent },
        {
          name: 'expandable-repeater',
          component: ExpandableRepeaterComponent,
        },
        { name: 'table-select', component: TableSelectComponent },
      ],
      wrappers: [
        {
          name: 'nx-section',
          component: SectionWrapperComponent,
        },
      ],
    }),
  ],
})
export class FormsKitModule {}
