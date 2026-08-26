import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'fixture-formly-input',
  standalone: false,
  template: `
    <label [for]="id">{{ props.label }}</label>
    <input
      class="fixture-input"
      [id]="id"
      [type]="props.type ?? 'text'"
      [placeholder]="props.placeholder ?? ''"
      [formControl]="formControl"
      [formlyAttributes]="field"
    />
  `,
})
export class FixtureInputFieldComponent extends FieldType<FieldTypeConfig> {}
