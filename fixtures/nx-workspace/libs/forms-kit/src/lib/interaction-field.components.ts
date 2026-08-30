import { Component } from '@angular/core';
import {
  FieldArrayType,
  FieldType,
  type FieldTypeConfig,
  FieldWrapper,
} from '@ngx-formly/core';

interface ChoiceOption {
  readonly label: string;
  readonly value: unknown;
  readonly disabled?: boolean;
}

interface TableRow {
  readonly id: string;
  readonly label: string;
}

interface DateRangeValue {
  readonly start?: string;
  readonly end?: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isChoiceOption(value: unknown): value is ChoiceOption {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    'value' in value &&
    (!('disabled' in value) || typeof value.disabled === 'boolean')
  );
}

function isTableRow(value: unknown): value is TableRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string'
  );
}

@Component({
  selector: 'nx-fixture-dependent-select',
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
          @for (option of choiceOptions; track option.label) {
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

  get choiceOptions(): readonly ChoiceOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isChoiceOption) ? options : [];
  }

  get selectedLabel(): string | undefined {
    return this.choiceOptions.find(
      ({ value }) => value === this.formControl.value,
    )?.label;
  }

  select(option: ChoiceOption): void {
    this.formControl.setValue(option.value);
    this.open = false;
  }
}

@Component({
  selector: 'nx-fixture-entity-autocomplete',
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

  get choiceOptions(): readonly ChoiceOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isChoiceOption) ? options : [];
  }

  get filteredOptions(): readonly ChoiceOption[] {
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

  select(option: ChoiceOption): void {
    this.formControl.setValue(option.value);
    this.query = option.label;
  }
}

@Component({
  selector: 'nx-fixture-table-select',
  standalone: false,
  template: `
    <table role="grid" [attr.aria-label]="props.label">
      <tbody>
        @for (row of rows; track row.id) {
          <tr role="row" [attr.aria-selected]="isSelected(row.id)">
            <td>{{ row.label }}</td>
            <td>
              <input
                type="checkbox"
                [attr.aria-label]="'Select ' + row.label"
                [checked]="isSelected(row.id)"
                (change)="toggle(row.id, $event)"
              />
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class TableSelectComponent extends FieldType<FieldTypeConfig> {
  get rows(): readonly TableRow[] {
    const rows: unknown = this.props.rowOptions;
    return Array.isArray(rows) && rows.every(isTableRow) ? rows : [];
  }

  isSelected(id: string): boolean {
    const selected: unknown = this.formControl.value;
    return Array.isArray(selected) && selected.includes(id);
  }

  toggle(id: string, event: Event): void {
    const checked =
      event.target instanceof HTMLInputElement && event.target.checked;
    const current: unknown = this.formControl.value;
    const selected = Array.isArray(current)
      ? current.filter((value): value is string => typeof value === 'string')
      : [];
    this.formControl.setValue(
      checked
        ? [...new Set([...selected, id])]
        : selected.filter((value) => value !== id),
    );
  }
}

@Component({
  selector: 'nx-fixture-expandable-repeater',
  standalone: false,
  template: `
    <section class="fixture-repeater" [attr.aria-label]="props.label">
      @for (child of field.fieldGroup; track child.key; let index = $index) {
        <div role="group" [attr.aria-label]="'Item ' + (index + 1)">
          <button
            type="button"
            [attr.aria-expanded]="expanded.has(index)"
            (click)="toggleItem(index)"
          >
            Item {{ index + 1 }}
          </button>
          @if (expanded.has(index)) {
            <formly-field [field]="child" />
            <button type="button" (click)="remove(index)">Remove</button>
          }
        </div>
      }
      <button type="button" (click)="addAndExpand()">
        {{ props['addText'] ?? 'Add item' }}
      </button>
    </section>
  `,
})
export class ExpandableRepeaterComponent extends FieldArrayType {
  readonly expanded = new Set<number>();

  toggleItem(index: number): void {
    if (this.expanded.has(index)) {
      this.expanded.delete(index);
    } else {
      this.expanded.add(index);
    }
  }

  addAndExpand(): void {
    const index = this.field.fieldGroup?.length ?? 0;
    this.add();
    this.expanded.add(index);
  }
}

@Component({
  selector: 'nx-fixture-date-range',
  standalone: false,
  template: `
    <fieldset role="group">
      <legend>{{ props.label }}</legend>
      <label [for]="id + '-start'">Start</label>
      <input
        type="date"
        [id]="id + '-start'"
        [value]="value.start ?? ''"
        (change)="update('start', $event)"
      />
      <label [for]="id + '-end'">End</label>
      <input
        type="date"
        [id]="id + '-end'"
        [value]="value.end ?? ''"
        (change)="update('end', $event)"
      />
    </fieldset>
  `,
})
export class DateRangeComponent extends FieldType<FieldTypeConfig> {
  get value(): DateRangeValue {
    const value: unknown = this.formControl.value;
    return isRecord(value) ? value : {};
  }

  update(part: keyof DateRangeValue, event: Event): void {
    const value =
      event.target instanceof HTMLInputElement ? event.target.value : '';
    this.formControl.setValue({ ...this.value, [part]: value });
  }
}

@Component({
  selector: 'nx-fixture-section-wrapper',
  standalone: false,
  template: `
    <section class="fixture-section">
      <button
        type="button"
        [attr.aria-expanded]="expanded"
        (click)="expanded = !expanded"
      >
        {{ expanded ? 'Collapse' : 'Expand' }} {{ props.label }}
      </button>
      <div [hidden]="!expanded"><ng-container #fieldComponent /></div>
    </section>
  `,
})
export class SectionWrapperComponent extends FieldWrapper {
  protected expanded = true;
}
