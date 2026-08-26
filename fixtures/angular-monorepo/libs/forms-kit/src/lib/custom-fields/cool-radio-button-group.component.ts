import { Component } from '@angular/core';
import {
  FieldType,
  type FieldTypeConfig,
  type FormlyFieldProps,
} from '@ngx-formly/core';

interface CoolRadioOption {
  readonly label: string;
  readonly value: string;
}

interface CoolRadioProps extends FormlyFieldProps {
  readonly options?: CoolRadioOption[];
}

@Component({
  selector: 'fixture-cool-radio-button-group',
  standalone: false,
  template: `
    <fieldset class="cool-radio-group" role="radiogroup">
      <legend>{{ props.label }}</legend>
      @for (option of props.options ?? []; track option.value) {
        <label>
          <input
            type="radio"
            [name]="field.name ?? id"
            [value]="option.value"
            [formControl]="formControl"
            [formlyAttributes]="field"
          />
          <span>{{ option.label }}</span>
        </label>
      }
    </fieldset>
  `,
})
export class CoolRadioButtonGroupComponent extends FieldType<
  FieldTypeConfig<CoolRadioProps>
> {}
