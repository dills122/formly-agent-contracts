import { Component } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';

@Component({
  selector: 'fixture-expansion-panel-wrapper',
  standalone: false,
  template: `
    <section class="fixture-expansion-panel">
      <button
        type="button"
        [attr.aria-expanded]="expanded"
        (click)="expanded = !expanded"
      >
        {{ expanded ? 'Collapse' : 'Expand' }} {{ props.label }}
      </button>
      <div [hidden]="!expanded">
        <ng-container #fieldComponent />
      </div>
    </section>
  `,
})
export class FixtureExpansionPanelWrapperComponent extends FieldWrapper {
  protected expanded = false;
}
