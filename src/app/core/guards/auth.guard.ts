import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Keeps every dashboard route behind a sign-in, as required by all six use
 * cases ("the employee/administrator logs into the dashboard").
 *
 * The URL that was asked for is carried along as `redirectTo`, so the user
 * lands where they intended once they have signed in.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isSignedIn()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
};
