import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';

import { AppModule } from './app/app.module';

/**
 * Application entry point.
 *
 * The project uses the module-based bootstrap: `platformBrowser()` compiles and
 * starts `AppModule`, which declares the root component and imports the core,
 * shared and routing modules. Providers that belong to the whole application
 * rather than to a module — here the global error listeners — are passed as
 * `applicationProviders`.
 */
platformBrowser()
  .bootstrapModule(AppModule, {
    applicationProviders: [provideBrowserGlobalErrorListeners()],
  })
  .catch((error: unknown) => console.error(error));
