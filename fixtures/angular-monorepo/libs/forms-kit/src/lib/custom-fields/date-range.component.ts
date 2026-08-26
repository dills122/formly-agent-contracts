import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

interface DateRangeValue {
  readonly start?: string;
  readonly end?: string;
}

@Component({
  selector: 'fixture-date-range',
  standalone: false,
  template: `
    <fieldset class="fixture-date-range" role="group">
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
    return typeof value === 'object' && value !== null
      ? value
      : {};
  }

  update(part: keyof DateRangeValue, event: Event): void {
    const value =
      event.target instanceof HTMLInputElement ? event.target.value : '';
    this.formControl.setValue({ ...this.value, [part]: value });
  }
}
