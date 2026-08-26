import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import type { FormlyFieldConfig } from '@ngx-formly/core';

import { createClaimsAssignmentForm } from './claims-assignment.form.js';
import { createCustomerOnboardingForm } from './customer-onboarding.form.js';
import { createIncidentForm } from './incident.form.js';

interface GalleryCard {
  readonly id: string;
  readonly title: string;
  readonly form: FormGroup;
  readonly fields: FormlyFieldConfig[];
  readonly model: Record<string, unknown>;
}

@Component({
  selector: 'fixture-scenario-gallery-page',
  standalone: false,
  template: `
    <section aria-labelledby="scenario-gallery-title">
      <h2 id="scenario-gallery-title">Interaction scenario gallery</h2>
      <p>
        Structured values, multi-row choices, composite controls, conditional
        fields, and repeatable content from the same project catalogs.
      </p>
      <div class="fixture-grid">
        @for (card of cards; track card.id) {
          <article class="feature-card" [attr.data-form-id]="card.id">
            <h3>{{ card.title }}</h3>
            <form [formGroup]="card.form">
              <formly-form
                [form]="card.form"
                [fields]="card.fields"
                [model]="card.model"
              />
            </form>
            <pre class="model-output">{{ card.model | json }}</pre>
          </article>
        }
      </div>
    </section>
  `,
})
export class ScenarioGalleryPageComponent {
  readonly cards: readonly GalleryCard[] = [
    this.createCard(
      'claims.assignment',
      'Claim assignment',
      createClaimsAssignmentForm(),
    ),
    this.createCard(
      'customers.onboarding',
      'Customer onboarding',
      createCustomerOnboardingForm(),
    ),
    this.createCard(
      'operations.incident',
      'Incident follow-up',
      createIncidentForm(),
    ),
  ];

  private createCard(
    id: string,
    title: string,
    instance: {
      readonly fields: FormlyFieldConfig[];
      readonly model: Record<string, unknown>;
    },
  ): GalleryCard {
    return {
      id,
      title,
      form: new FormGroup({}),
      fields: instance.fields,
      model: instance.model,
    };
  }
}
