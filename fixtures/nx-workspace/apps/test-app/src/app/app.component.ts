import { Component } from '@angular/core';

@Component({
  selector: 'nx-fixture-root',
  standalone: false,
  template: `
    <header>
      <p class="eyebrow">Nx regulated-workflow corpus</p>
      <h1>Renewable microgrid deployment</h1>
      <p>
        Ten synthetic forms model project intake, site assessment, system
        design, funding, permitting, and commissioning across Nx-visible
        application and library boundaries.
      </p>
    </header>
    <main><nx-fixture-deployment-page /></main>
  `,
})
export class AppComponent {}
