/**
 * Barrel export for the service layer.
 *
 * Services hold the application's state and own every call to the back end.
 * Components read the signals these services expose and call their methods;
 * no component talks to `HttpClient` directly, which keeps the business rules
 * in one testable place.
 */
export * from './auth.service';
export * from './activity.service';
export * from './registration.service';
export * from './notification.service';
export * from './check-in.service';
export * from './admin.service';
export * from './toast.service';
export * from './http-error.util';
