import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { SharedModule } from './shared/shared.module';

/**
 * The root module of the application.
 *
 * It wires together the three kinds of module this project uses:
 *
 * - `CoreModule`   — application-wide services, imported here and nowhere else;
 * - `SharedModule` — the reusable user-interface kit, imported by every feature;
 * - `AppRoutingModule` — the route table, which pulls in each feature module
 *   lazily as the user navigates.
 *
 * `AppComponent` is bootstrapped from `main.ts` and is the only component this
 * module declares besides the not-found page, because every screen belongs to
 * a feature module.
 */
@NgModule({
  declarations: [AppComponent, NotFoundComponent],
  imports: [BrowserModule, AppRoutingModule, CoreModule, SharedModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
