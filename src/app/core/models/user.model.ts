/**
 * MODEL — User
 * Part of the Model layer of the MVC architecture. Models are plain interfaces:
 * they describe the shape of the data only and contain no behaviour, so that
 * views and components can never depend on business logic hidden in a model.
 */

/** The two actors described in the case study. */
export type UserRole = 'administrator' | 'employee';

/** A member of staff who can sign in to the Service Day Dashboard. */
export interface User {
  id: string;
  staffId: string;
  fullName: string;
  email: string;
  department: string;
  role: UserRole;
}

/** Credentials posted to POST /api/auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Payload returned by the mock back end on a successful sign-in. */
export interface LoginResponse {
  user: User;
  token: string;
}
