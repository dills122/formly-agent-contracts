import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';

import { createClaimIntakeForm } from './claim-intake.form.js';

@Component({
  selector: 'fixture-claim-intake-page',
  standalone: false,
  template: `
    <article class="feature-card" data-feature="claims-intake">
      <h2>Claim intake</h2>
      <p>
        This page belongs to feature-lib and consumes fields from forms-kit.
      </p>
      <form [formGroup]="form">
        <formly-form [form]="form" [fields]="fields" [model]="model" />
      </form>
      <pre class="model-output">{{ model | json }}</pre>
    </article>
  `,
})
export class ClaimIntakePageComponent {
  readonly form = new FormGroup({});
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;

  constructor() {
    const instance = createClaimIntakeForm();
    this.fields = instance.fields;
    this.model = instance.model;
  }
}
