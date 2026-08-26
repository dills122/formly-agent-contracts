import { Component } from '@angular/core';

@Component({
  selector: 'fixture-root',
  standalone: false,
  template: `
    <header>
      <p class="eyebrow">Workspace discovery playground</p>
      <h1>Layered Angular Formly fixture</h1>
      <p>
        The application bootstraps a feature page that consumes reusable forms,
        fragments, and custom field types from independently owned libraries.
      </p>
    </header>
    <main>
      <fixture-claim-intake-page />
      <fixture-scenario-gallery-page />
    </main>
  `,
})
export class AppComponent {}
