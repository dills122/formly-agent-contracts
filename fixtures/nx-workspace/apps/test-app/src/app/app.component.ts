import { Component } from '@angular/core';

@Component({
  selector: 'nx-fixture-root',
  standalone: false,
  template: `
    <header>
      <p class="eyebrow">Nx integration anchor</p>
      <h1>Project-aware Formly workspace</h1>
      <p>
        The app consumes a feature library, reusable forms library, and base
        Formly configuration through Nx-visible project dependencies.
      </p>
    </header>
    <main><nx-fixture-claim-page /></main>
  `,
})
export class AppComponent {}
