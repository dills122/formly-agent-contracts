import { Component } from '@angular/core';
import {
  FieldArrayType,
  FieldType,
  type FieldTypeConfig,
  FieldWrapper,
} from '@ngx-formly/core';

@Component({
  selector: 'test-formly-currency',
  standalone: false,
  template: `
    <div class="test-currency">
      <span aria-hidden="true">$</span>
      <input
        class="test-control"
        [id]="id"
        [attr.aria-label]="props.label"
        type="number"
        step="0.01"
        [formControl]="formControl"
        [formlyAttributes]="field"
      />
    </div>
  `,
})
export class CurrencyFieldComponent extends FieldType<FieldTypeConfig> {}

@Component({
  selector: 'test-formly-rating',
  standalone: false,
  template: `
    <div class="test-rating" role="group" [attr.aria-label]="props.label">
      @for (rating of ratings; track rating) {
        <label>
          <input
            type="radio"
            [name]="field.name ?? id"
            [value]="rating"
            [formControl]="formControl"
            [formlyAttributes]="field"
          />
          <span>{{ rating }}</span>
        </label>
      }
    </div>
  `,
})
export class RatingFieldComponent extends FieldType<FieldTypeConfig> {
  get ratings(): number[] {
    const minimum = this.props.min ?? 1;
    const maximum = this.props.max ?? 5;
    return Array.from(
      { length: Math.max(0, maximum - minimum + 1) },
      (_, index) => minimum + index,
    );
  }
}

@Component({
  selector: 'test-formly-repeat-section',
  standalone: false,
  template: `
    <div class="test-repeat">
      @for (child of field.fieldGroup; track child.key; let index = $index) {
        <div class="test-repeat__row">
          <formly-field [field]="child" />
          <button type="button" (click)="remove(index)">Remove</button>
        </div>
      }
      <button type="button" (click)="add()">
        {{ props['addText'] ?? 'Add row' }}
      </button>
    </div>
  `,
})
export class RepeatSectionFieldComponent extends FieldArrayType {}

@Component({
  selector: 'test-formly-section-card',
  standalone: false,
  template: `
    <section class="test-section">
      @if (props.label) {
        <h3>{{ props.label }}</h3>
      }
      @if (props.description) {
        <p>{{ props.description }}</p>
      }
      <ng-container #fieldComponent />
    </section>
  `,
})
export class SectionCardWrapperComponent extends FieldWrapper {}
