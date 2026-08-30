import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

interface NativeOption {
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
}

function isNativeOption(value: unknown): value is NativeOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Readonly<Record<string, unknown>>).label === 'string' &&
    typeof (value as Readonly<Record<string, unknown>>).value === 'string'
  );
}

@Component({
  selector: 'nx-fixture-textarea',
  standalone: false,
  template: `
    <label [for]="id">{{ props.label }}</label>
    <textarea
      [id]="id"
      [rows]="props.rows ?? 4"
      [formControl]="formControl"
      [formlyAttributes]="field"
    ></textarea>
  `,
})
export class TextareaFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'nx-fixture-checkbox',
  standalone: false,
  template: `
    <label>
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
export class CheckboxFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'nx-fixture-select',
  standalone: false,
  template: `
    <label [for]="id">{{ props.label }}</label>
    <select
      [id]="id"
      [formControl]="formControl"
      [formlyAttributes]="field"
    >
      @for (option of choiceOptions; track option.value) {
        <option [value]="option.value" [disabled]="option.disabled === true">
          {{ option.label }}
        </option>
      }
    </select>
  `,
})
export class SelectFieldComponent extends FieldType<FieldTypeConfig> {
  get choiceOptions(): readonly NativeOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isNativeOption) ? options : [];
  }
}
