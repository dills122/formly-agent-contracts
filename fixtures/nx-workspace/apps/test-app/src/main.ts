import { platformBrowser } from '@angular/platform-browser';

import { AppModule } from './app/app.module.js';

platformBrowser()
  .bootstrapModule(AppModule)
  .catch((error: unknown) => {
    console.error('Unable to bootstrap the Nx consumer fixture.', error);
  });
