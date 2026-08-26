import { Component } from '@angular/core';

import { FormHost } from './form-host.js';
import { TestFormRegistry } from './form-registry/form-registry.js';

@Component({
  selector: 'test-app-root',
  standalone: false,
  template: `
    <header class="app-header">
      <p class="app-eyebrow">Formly Contract</p>
      <h1>Formly 6.1 synthetic fixture laboratory</h1>
      <p>
        Twelve invented forms exercising module registration, custom controls,
        repeaters, expressions, validation, and compatibility edges.
      </p>
    </header>

    <main class="app-layout">
      <nav class="form-catalog" aria-label="Synthetic test forms">
        <p class="catalog-label">Fixture catalog</p>
        @for (definition of host.definitions; track definition.id) {
          <button
            type="button"
            [class.is-active]="definition.id === host.activeDefinition?.id"
            [attr.data-form-id]="definition.id"
            (click)="host.select(definition.id)"
          >
            <span>{{ definition.title }}</span>
            <small>{{ definition.id }}</small>
          </button>
        }
      </nav>

      @if (host.activeDefinition; as definition) {
        <article class="form-workbench" [attr.data-active-form]="definition.id">
          <header class="form-heading">
            <p class="form-id">{{ definition.id }}</p>
            <h2>{{ definition.title }}</h2>
            <p>{{ definition.description }}</p>
            <ul class="feature-list" aria-label="Fixture features">
              @for (feature of definition.features; track feature) {
                <li>{{ feature }}</li>
              }
            </ul>
          </header>

          <form class="rendered-form" [formGroup]="host.form">
            <formly-form
              [form]="host.form"
              [fields]="host.fields"
              [model]="host.model"
              [options]="host.options"
            />
          </form>

          <details class="model-inspector">
            <summary>Current synthetic model</summary>
            <pre>{{ host.model | json }}</pre>
          </details>
        </article>
      }
    </main>
  `,
})
export class AppComponent {
  readonly host: FormHost;

  constructor(registry: TestFormRegistry) {
    this.host = new FormHost(registry);
  }
}
