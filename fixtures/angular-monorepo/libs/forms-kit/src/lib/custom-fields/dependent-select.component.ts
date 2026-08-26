import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

import {
  isChoiceOption,
  type FixtureChoiceOption,
} from './choice-utils.js';

@Component({
  selector: 'fixture-dependent-select',
  standalone: false,
  template: `
    <div class="fixture-overlay-select">
      <button
        type="button"
        aria-haspopup="listbox"
        [attr.aria-label]="props.label"
        [attr.aria-expanded]="open"
        (click)="open = !open"
      >
        {{ selectedLabel ?? props.placeholder ?? 'Choose an option' }}
      </button>
      @if (open) {
        <div role="listbox" [attr.aria-label]="props.label + ' options'">
          @for (option of choiceOptions; track option.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="formControl.value === option.value"
              [disabled]="option.disabled === true"
              (click)="select(option)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class DependentSelectComponent extends FieldType<FieldTypeConfig> {
  open = false;

  get choiceOptions(): readonly FixtureChoiceOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isChoiceOption) ? options : [];
  }

  get selectedLabel(): string | undefined {
    return this.choiceOptions.find(
      ({ value }) => value === this.formControl.value,
    )
      ?.label;
  }

  select(option: FixtureChoiceOption): void {
    this.formControl.setValue(option.value);
    this.open = false;
  }
}
