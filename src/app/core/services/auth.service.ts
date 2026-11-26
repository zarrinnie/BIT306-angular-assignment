import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { LoginRequest, LoginResponse, User, UserRole } from '../models';

const SESSION_KEY = 'service-day-dashboard.session';

/**
 * Holds the signed-in staff member for the whole application.
 *
 * The signed-in user is kept in a signal, so every template that depends on it
 * — the navigation bar, the route guards, the registration buttons — updates by
 * itself the moment the user signs in or out, with no page reload.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly user = signal<User | null>(this.restoreSession());

  /** The signed-in staff member, or `null` when nobody is signed in. */
  readonly currentUser = this.user.asReadonly();
  readonly isSignedIn = computed(() => this.user() !== null);
  readonly isAdministrator = computed(() => this.user()?.role === 'administrator');
  readonly isEmployee = computed(() => this.user()?.role === 'employee');
  /** Initials used by the avatar in the navigation bar. */
  readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  /** Signs a staff member in against POST /api/auth/login. */
  signIn(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', credentials).pipe(
      tap((response) => {
        this.user.set(response.user);
        this.storeSession(response);
      }),
    );
  }

  /** Clears the session. */
  signOut(): void {
    this.user.set(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  /** True when the signed-in staff member holds the given role. */
  hasRole(role: UserRole): boolean {
    return this.user()?.role === role;
  }

  /** The signed-in employee's id, for requests that are scoped to one person. */
  requireUserId(): string {
    const id = this.user()?.id;
    if (!id) {
      throw new Error('No staff member is signed in.');
    }
    return id;
  }

  private storeSession(response: LoginResponse): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(response));
    } catch {
      /* ignore */
    }
  }

  /** Keeps the user signed in across a page refresh. */
  private restoreSession(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as LoginResponse).user : null;
    } catch {
      return null;
    }
  }
}
