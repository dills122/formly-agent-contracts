import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'nx-fixture-input',
  standalone: false,
  template: `
    <label [for]="id">{{ props.label }}</label>
    <input
      class="fixture-input"
      [id]="id"
      [type]="props.type ?? 'text'"
      [formControl]="formControl"
      [formlyAttributes]="field"
    />
  `,
})
export class InputFieldComponent extends FieldType<FieldTypeConfig> {}
