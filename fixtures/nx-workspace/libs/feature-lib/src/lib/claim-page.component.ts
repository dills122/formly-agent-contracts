import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';

import { createNxClaimForm } from './claim.form.js';

@Component({
  selector: 'nx-fixture-claim-page',
  standalone: false,
  template: `
    <article class="feature-card">
      <h2>Claim intake</h2>
      <form [formGroup]="form">
        <formly-form [form]="form" [fields]="fields" [model]="model" />
      </form>
      <pre>{{ model | json }}</pre>
    </article>
  `,
})
export class ClaimPageComponent {
  readonly form = new FormGroup({});
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;

  constructor() {
    const instance = createNxClaimForm({
      initialReference: window.location.pathname,
    });
    this.fields = instance.fields;
    this.model = instance.model;
  }
}
