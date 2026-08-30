import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';

import { createNxMicrogridProjectForm } from './deployment.forms.js';

@Component({
  selector: 'nx-fixture-deployment-page',
  standalone: false,
  template: `
    <article class="feature-card">
      <h2>Microgrid deployment intake</h2>
      <p>
        A synthetic regulated-infrastructure workflow used to exercise complex
        Formly contracts without copying a production business domain.
      </p>
      <form [formGroup]="form">
        <formly-form [form]="form" [fields]="fields" [model]="model" />
      </form>
      <pre>{{ model | json }}</pre>
    </article>
  `,
})
export class DeploymentPageComponent {
  readonly form = new FormGroup({});
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;

  constructor() {
    const instance = createNxMicrogridProjectForm({
      initialProjectName: window.location.pathname,
      deploymentModel: 'owner-operated',
    });
    this.fields = instance.fields;
    this.model = instance.model;
  }
}
