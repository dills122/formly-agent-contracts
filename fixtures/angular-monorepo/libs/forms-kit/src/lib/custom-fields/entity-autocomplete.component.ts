import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

import {
  isChoiceOption,
  type FixtureChoiceOption,
} from './choice-utils.js';

@Component({
  selector: 'fixture-entity-autocomplete',
  standalone: false,
  template: `
    <div class="fixture-autocomplete">
      <label [for]="id">{{ props.label }}</label>
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        [id]="id"
        [attr.aria-expanded]="filteredOptions.length > 0"
        [attr.aria-controls]="id + '-options'"
        [value]="query"
        (input)="updateQuery($event)"
      />
      @if (filteredOptions.length > 0) {
        <div role="listbox" [id]="id + '-options'">
          @for (option of filteredOptions; track option.label) {
            <button
              type="button"
              role="option"
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
export class EntityAutocompleteComponent extends FieldType<FieldTypeConfig> {
  query = '';

  get choiceOptions(): readonly FixtureChoiceOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isChoiceOption) ? options : [];
  }

  get filteredOptions(): readonly FixtureChoiceOption[] {
    const query = this.query.trim().toLocaleLowerCase();
    return query === ''
      ? []
      : this.choiceOptions.filter(({ label }) =>
          label.toLocaleLowerCase().includes(query),
        );
  }

  updateQuery(event: Event): void {
    this.query =
      event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  select(option: FixtureChoiceOption): void {
    this.formControl.setValue(option.value);
    this.query = option.label;
  }
}
