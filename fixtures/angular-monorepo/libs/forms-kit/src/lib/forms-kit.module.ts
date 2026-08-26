import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyKitModule } from '@fixture/formly-kit';
import { FormlyModule } from '@ngx-formly/core';

import { CoolRadioButtonGroupComponent } from './custom-fields/cool-radio-button-group.component.js';
import { DateRangeComponent } from './custom-fields/date-range.component.js';
import { DependentSelectComponent } from './custom-fields/dependent-select.component.js';
import { EntityAutocompleteComponent } from './custom-fields/entity-autocomplete.component.js';
import { ExpandableRepeaterComponent } from './custom-fields/expandable-repeater.component.js';
import { TableSelectComponent } from './custom-fields/table-select.component.js';

@NgModule({
  declarations: [
    CoolRadioButtonGroupComponent,
    DateRangeComponent,
    DependentSelectComponent,
    EntityAutocompleteComponent,
    ExpandableRepeaterComponent,
    TableSelectComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyKitModule,
    FormlyModule.forChild({
      types: [
        {
          name: 'cool-radio-btn-grp',
          component: CoolRadioButtonGroupComponent,
        },
        { name: 'date-range', component: DateRangeComponent },
        { name: 'dependent-select', component: DependentSelectComponent },
        { name: 'entity-autocomplete', component: EntityAutocompleteComponent },
        {
          name: 'expandable-repeater',
          component: ExpandableRepeaterComponent,
        },
        { name: 'table-select', component: TableSelectComponent },
      ],
    }),
  ],
})
export class FormsKitModule {}
