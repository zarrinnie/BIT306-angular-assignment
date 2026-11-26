/**
 * Barrel export for the Model layer.
 *
 * Every consumer imports models from `@app/core/models` (or a relative path to
 * this file) rather than reaching into individual files, which keeps the public
 * surface of the model layer in one place and the import statements short.
 */
export * from './user.model';
export * from './activity.model';
export * from './registration.model';
export * from './notification.model';
export * from './check-in.model';
export * from './api-error.model';
