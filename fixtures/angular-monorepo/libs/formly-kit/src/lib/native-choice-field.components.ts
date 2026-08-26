import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

interface NativeChoiceOption {
  readonly label: string;
  readonly value: unknown;
  readonly disabled?: boolean;
}

function isChoiceOption(value: unknown): value is NativeChoiceOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as NativeChoiceOption).label === 'string' &&
    'value' in value
  );
}

@Component({
  selector: 'fixture-formly-select',
  standalone: false,
  template: `
    <label [for]="id">{{ props.label }}</label>
    <select
      [id]="id"
      [formControl]="formControl"
      [formlyAttributes]="field"
    >
      <option value="">Choose an option</option>
      @for (option of choiceOptions; track option.value) {
        <option [ngValue]="option.value" [disabled]="option.disabled === true">
          {{ option.label }}
        </option>
      }
    </select>
  `,
})
export class FixtureSelectFieldComponent extends FieldType<FieldTypeConfig> {
  get choiceOptions(): readonly NativeChoiceOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isChoiceOption) ? options : [];
  }
}

@Component({
  selector: 'fixture-formly-textarea',
  standalone: false,
  template: `
    <label [for]="id">{{ props.label }}</label>
    <textarea
      class="fixture-input"
      [id]="id"
      [placeholder]="props.placeholder ?? ''"
      [formControl]="formControl"
      [formlyAttributes]="field"
    ></textarea>
  `,
})
export class FixtureTextAreaFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'fixture-formly-checkbox',
  standalone: false,
  template: `
    <label [for]="id">
      <input
        type="checkbox"
        [id]="id"
        [formControl]="formControl"
        [formlyAttributes]="field"
      />
      {{ props.label }}
    </label>
  `,
})
export class FixtureCheckboxFieldComponent extends FieldType<FieldTypeConfig> {}
