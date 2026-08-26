import { Component } from '@angular/core';
import {
  FieldArrayType,
  FieldType,
  type FieldTypeConfig,
} from '@ngx-formly/core';

interface MatrixOption {
  label: string;
  value: unknown;
  disabled?: boolean;
}

interface MatrixRow {
  id: string;
  label: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isMatrixOption(value: unknown): value is MatrixOption {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    (!('disabled' in value) || typeof value.disabled === 'boolean')
  );
}

function isMatrixRow(value: unknown): value is MatrixRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string'
  );
}

@Component({
  selector: 'test-formly-button-toggle',
  standalone: false,
  template: `
    <div role="radiogroup" [attr.aria-label]="props.label">
      @for (option of choiceOptions; track option.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="formControl.value === option.value"
          [disabled]="option.disabled === true"
          [value]="option.value"
          (click)="select(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class ButtonToggleFieldComponent extends FieldType<FieldTypeConfig> {
  get choiceOptions(): readonly MatrixOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isMatrixOption) ? options : [];
  }

  select(value: unknown): void {
    this.formControl.setValue(value);
  }
}

@Component({
  selector: 'test-formly-overlay-select',
  standalone: false,
  template: `
    <div class="test-overlay-select">
      <button
        type="button"
        aria-haspopup="listbox"
        [attr.aria-label]="props.label"
        [attr.aria-expanded]="open"
        (click)="toggle()"
      >
        {{ selectedLabel ?? props.placeholder ?? 'Choose an option' }}
      </button>
      @if (open) {
        <div
          role="listbox"
          [attr.aria-label]="props.label + ' options'"
        >
          @for (option of choiceOptions; track option.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="formControl.value === option.value"
              [disabled]="option.disabled === true"
              (click)="select(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class OverlaySelectFieldComponent extends FieldType<FieldTypeConfig> {
  open = false;

  get choiceOptions(): readonly MatrixOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isMatrixOption) ? options : [];
  }

  get selectedLabel(): string | undefined {
    return this.choiceOptions.find(
      ({ value }) => value === this.formControl.value,
    )?.label;
  }

  toggle(): void {
    this.open = !this.open;
  }

  select(value: unknown): void {
    this.formControl.setValue(value);
    this.open = false;
  }
}

@Component({
  selector: 'test-formly-autocomplete',
  standalone: false,
  template: `
    <div class="test-autocomplete">
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        [id]="id"
        [attr.aria-label]="props.label"
        [attr.aria-expanded]="filteredOptions.length > 0"
        [attr.aria-controls]="id + '-options'"
        [value]="query"
        (input)="updateQuery($event)"
      />
      @if (filteredOptions.length > 0) {
        <div
          role="listbox"
          [id]="id + '-options'"
          [attr.aria-label]="props.label + ' options'"
        >
          @for (option of filteredOptions; track option.value) {
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
export class AutocompleteFieldComponent extends FieldType<FieldTypeConfig> {
  query = '';

  get choiceOptions(): readonly MatrixOption[] {
    const options: unknown = this.props.options;
    return Array.isArray(options) && options.every(isMatrixOption) ? options : [];
  }

  get filteredOptions(): readonly MatrixOption[] {
    const normalizedQuery = this.query.trim().toLocaleLowerCase();
    return normalizedQuery === ''
      ? []
      : this.choiceOptions.filter(({ label }) =>
          label.toLocaleLowerCase().includes(normalizedQuery),
        );
  }

  updateQuery(event: Event): void {
    this.query =
      event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  select(option: MatrixOption): void {
    this.formControl.setValue(option.value);
    this.query = option.label;
  }
}

@Component({
  selector: 'test-formly-table-select',
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
                (change)="toggleRow(row.id, $event)"
              />
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class TableSelectFieldComponent extends FieldType<FieldTypeConfig> {
  get rows(): readonly MatrixRow[] {
    const rows: unknown = this.props.rowOptions;
    return Array.isArray(rows) && rows.every(isMatrixRow) ? rows : [];
  }

  isSelected(id: string): boolean {
    const selected: unknown = this.formControl.value;
    return Array.isArray(selected) && selected.includes(id);
  }

  toggleRow(id: string, event: Event): void {
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
  selector: 'test-formly-expandable-repeater',
  standalone: false,
  template: `
    <div class="test-expandable-repeater">
      @for (child of field.fieldGroup; track child.key; let index = $index) {
        <div role="group" [attr.aria-label]="'Item ' + (index + 1)">
          <button
            type="button"
            [attr.aria-expanded]="isExpanded(index)"
            (click)="toggleItem(index)"
          >
            Item {{ index + 1 }}
          </button>
          @if (isExpanded(index)) {
            <formly-field [field]="child" />
            <button type="button" (click)="remove(index)">Remove</button>
          }
        </div>
      }
      <button type="button" (click)="addAndExpand()">
        {{ props['addText'] ?? 'Add item' }}
      </button>
    </div>
  `,
})
export class ExpandableRepeaterFieldComponent extends FieldArrayType {
  readonly expandedItems = new Set<number>();

  isExpanded(index: number): boolean {
    return this.expandedItems.has(index);
  }

  toggleItem(index: number): void {
    if (this.expandedItems.has(index)) {
      this.expandedItems.delete(index);
    } else {
      this.expandedItems.add(index);
    }
  }

  addAndExpand(): void {
    const newIndex = this.field.fieldGroup?.length ?? 0;
    this.add();
    this.expandedItems.add(newIndex);
  }
}
