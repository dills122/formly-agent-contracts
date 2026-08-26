import { Component } from '@angular/core';
import { FieldArrayType } from '@ngx-formly/core';

@Component({
  selector: 'fixture-expandable-repeater',
  standalone: false,
  template: `
    <section class="fixture-repeater" [attr.aria-label]="props.label">
      @for (child of field.fieldGroup; track child.key; let index = $index) {
        <div role="group" [attr.aria-label]="'Follow-up ' + (index + 1)">
          <button
            type="button"
            [attr.aria-expanded]="expanded.has(index)"
            (click)="toggle(index)"
          >
            Follow-up {{ index + 1 }}
          </button>
          @if (expanded.has(index)) {
            <formly-field [field]="child" />
            <button type="button" (click)="remove(index)">Remove</button>
          }
        </div>
      }
      <button type="button" (click)="addAndExpand()">
        {{ props['addText'] ?? 'Add follow-up' }}
      </button>
    </section>
  `,
})
export class ExpandableRepeaterComponent extends FieldArrayType {
  readonly expanded = new Set<number>();

  toggle(index: number): void {
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
