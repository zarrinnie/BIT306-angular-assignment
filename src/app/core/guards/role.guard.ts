import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Restricts the administration area to the administrator role (Use Cases 1, 4
 * and 5). An employee who follows an administrator link is sent back to the
 * activity list and told why.
 */
export const administratorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isSignedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isAdministrator()) {
    return true;
  }

  toast.error('That area of the dashboard is open to Service Day administrators only.');
  return router.createUrlTree(['/activities']);
};
