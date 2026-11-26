import { NgModule, Optional, SkipSelf } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { MockBackendInterceptor } from './interceptors/mock-backend.interceptor';

/**
 * The application's core module.
 *
 * It contains no components. Its only job is to configure the services that
 * must exist exactly once for the whole application: Angular's HTTP client and
 * the interceptor that simulates the back end.
 *
 * `withInterceptorsFromDi()` tells `HttpClient` to use interceptors registered
 * through the `HTTP_INTERCEPTORS` token, which is the dependency-injection
 * style that suits a module-based application.
 *
 * The constructor refuses a second import. A core module that is loaded by a
 * lazy feature module would create a second copy of every singleton, so
 * failing loudly during development is safer than a subtle duplicate-state bug.
 */
@NgModule({
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: MockBackendInterceptor, multi: true },
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent?: CoreModule) {
    if (parent) {
      throw new Error(
        'CoreModule is already loaded. Import it in AppModule only, never in a feature module.',
      );
    }
  }
}
