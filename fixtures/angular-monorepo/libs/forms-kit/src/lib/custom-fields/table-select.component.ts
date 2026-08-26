import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

import { isTableRow, type FixtureTableRow } from './choice-utils.js';

@Component({
  selector: 'fixture-table-select',
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
  get rows(): readonly FixtureTableRow[] {
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
