import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from '../models';

/**
 * Turns anything thrown by `HttpClient` into a sentence that can be shown to
 * the user.
 *
 * The simulated back end rejects a request that breaks a business rule with
 * HTTP 409 Conflict and an {@link ApiError} body, so in those cases the message
 * the user sees is the one the server supplied — the component itself never has
 * to know why the registration was refused.
 */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiError> | string | null;

    if (body && typeof body === 'object' && typeof body.message === 'string') {
      return body.message;
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (error.status === 0) {
      return 'The application could not reach its data source. Please check that the development server is running.';
    }
  }
  return fallback;
}
