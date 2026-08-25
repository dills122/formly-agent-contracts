import { Component } from '@angular/core';
import {
  FieldType,
  type FieldTypeConfig,
  type FormlyFieldProps,
} from '@ngx-formly/core';
import { isObservable, Observable, of } from 'rxjs';

interface SelectOption {
  readonly disabled?: boolean;
  readonly label?: unknown;
  readonly value?: unknown;
  readonly [key: string]: unknown;
}

interface ChoiceFieldProps extends FormlyFieldProps {
  readonly labelProp?: string;
  readonly valueProp?: string;
}

type ChoiceFieldConfig = FieldTypeConfig<ChoiceFieldProps>;

function normalizeOptions(
  options: FormlyFieldProps['options'],
): Observable<SelectOption[]> {
  if (isObservable(options)) {
    return options as Observable<SelectOption[]>;
  }

  return of((options ?? []) as SelectOption[]);
}

@Component({
  selector: 'test-formly-input',
  standalone: false,
  template: `
    <input
      class="test-control"
      [id]="id"
      [attr.aria-label]="props.label"
      [type]="props.type ?? 'text'"
      [formControl]="formControl"
      [formlyAttributes]="field"
    />
  `,
})
export class InputFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'test-formly-textarea',
  standalone: false,
  template: `
    <textarea
      class="test-control"
      [id]="id"
      [attr.aria-label]="props.label"
      [rows]="props.rows ?? 4"
      [formControl]="formControl"
      [formlyAttributes]="field"
    ></textarea>
  `,
})
export class TextareaFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'test-formly-checkbox',
  standalone: false,
  template: `
    <label class="test-checkbox" [for]="id">
      <input
        [id]="id"
        type="checkbox"
        [formControl]="formControl"
        [formlyAttributes]="field"
      />
      <span>{{ props.label }}</span>
    </label>
  `,
})
export class CheckboxFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'test-formly-select',
  standalone: false,
  template: `
    <select
      class="test-control"
      [id]="id"
      [attr.aria-label]="props.label"
      [formControl]="formControl"
      [formlyAttributes]="field"
    >
      @for (option of options$ | async; track optionValue(option)) {
        <option
          [ngValue]="optionValue(option)"
          [disabled]="option.disabled === true"
        >
          {{ optionLabel(option) }}
        </option>
      }
    </select>
  `,
})
export class SelectFieldComponent extends FieldType<ChoiceFieldConfig> {
  get options$(): Observable<SelectOption[]> {
    return normalizeOptions(this.props.options);
  }

  optionLabel(option: SelectOption): unknown {
    return option[this.props.labelProp ?? 'label'];
  }

  optionValue(option: SelectOption): unknown {
    return option[this.props.valueProp ?? 'value'];
  }
}

@Component({
  selector: 'test-formly-radio',
  standalone: false,
  template: `
    <div class="test-radio-group" [attr.aria-label]="props.label">
      @for (option of options$ | async; track optionValue(option)) {
        <label>
          <input
            type="radio"
            [name]="field.name ?? id"
            [value]="optionValue(option)"
            [formControl]="formControl"
            [formlyAttributes]="field"
          />
          <span>{{ optionLabel(option) }}</span>
        </label>
      }
    </div>
  `,
})
export class RadioFieldComponent extends FieldType<ChoiceFieldConfig> {
  get options$(): Observable<SelectOption[]> {
    return normalizeOptions(this.props.options);
  }

  optionLabel(option: SelectOption): unknown {
    return option[this.props.labelProp ?? 'label'];
  }

  optionValue(option: SelectOption): unknown {
    return option[this.props.valueProp ?? 'value'];
  }
}
