import { inject, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { administratorGuard } from './core/guards/role.guard';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';
import { NotFoundComponent } from './features/not-found/not-found.component';

/**
 * Top-level route table.
 *
 * Every feature is reached through `loadChildren`, so each feature module and
 * its templates are compiled into a separate JavaScript chunk that the browser
 * downloads only when that part of the dashboard is first opened. The initial
 * download therefore contains the shell, the core services and the shared
 * user-interface kit, and nothing else.
 *
 * Access is decided by two route guards: `authGuard` requires a signed-in user,
 * and `administratorGuard` additionally requires the administrator role.
 */
const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    // Sends each visitor to the right home page for their role.
    redirectTo: () => {
      const auth = inject(AuthService);
      if (!auth.isSignedIn()) {
        return '/login';
      }
      return auth.isAdministrator() ? '/admin' : '/activities';
    },
  },
  {
    path: 'login',
    title: 'Sign in — Service Day Dashboard',
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'activities',
    title: 'Service Day opportunities',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/activities/activities.module').then((m) => m.ActivitiesModule),
  },
  {
    path: 'my-registrations',
    title: 'My registrations',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/registrations/registrations.module').then((m) => m.RegistrationsModule),
  },
  {
    path: 'inbox',
    title: 'Messages',
    canActivate: [authGuard],
    loadChildren: () => import('./features/inbox/inbox.module').then((m) => m.InboxModule),
  },
  {
    path: 'check-in',
    title: 'Service Day check-in',
    canActivate: [authGuard],
    loadChildren: () => import('./features/check-in/check-in.module').then((m) => m.CheckInModule),
  },
  {
    path: 'admin',
    title: 'Administration',
    canActivate: [administratorGuard],
    loadChildren: () => import('./features/admin/admin.module').then((m) => m.AdminModule),
  },
  { path: '**', title: 'Page not found', component: NotFoundComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // Restores the reading position when the user goes back.
      scrollPositionRestoration: 'enabled',
      // Route parameters are delivered straight into component inputs, so a
      // detail page declares `input.required<string>()` instead of subscribing
      // to the ActivatedRoute itself.
      bindToComponentInputs: true,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
