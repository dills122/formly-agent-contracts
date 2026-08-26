import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

interface RadioOption {
  readonly label: string;
  readonly value: string;
}

function isRadioOption(value: unknown): value is RadioOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RadioOption).label === 'string' &&
    typeof (value as RadioOption).value === 'string'
  );
}

@Component({
  selector: 'nx-fixture-cool-radio',
  standalone: false,
  template: `
    <fieldset role="radiogroup">
      <legend>{{ props.label }}</legend>
      @for (option of radioOptions; track option.value) {
        <label>
          <input
            type="radio"
            [name]="field.name ?? id"
            [value]="option.value"
            [formControl]="formControl"
            [formlyAttributes]="field"
          />
          {{ option.label }}
        </label>
      }
    </fieldset>
  `,
})
export class CoolRadioComponent extends FieldType<FieldTypeConfig> {
  get radioOptions(): readonly RadioOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isRadioOption) ? options : [];
  }
}
