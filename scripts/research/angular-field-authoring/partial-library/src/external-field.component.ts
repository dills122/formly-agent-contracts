import { Component } from '@angular/core';
import { FieldType, type FieldTypeConfig } from '@ngx-formly/core';

@Component({
  selector: 'research-partial-external-field',
  standalone: false,
  templateUrl: './external-field.component.html',
  styleUrl: './external-field.component.css',
})
export class PartialExternalFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'research-opaque-child',
  standalone: false,
  template: '<span data-opaque-child="true">Opaque library child</span>',
})
export class OpaqueLibraryChildComponent {}
