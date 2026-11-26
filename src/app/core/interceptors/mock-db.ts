import { inject, Injectable } from '@angular/core';
import { HttpBackend, HttpRequest, HttpResponse } from '@angular/common/http';
import { forkJoin, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { filter } from 'rxjs/operators';

import {
  AppNotification,
  CheckInRecord,
  QrToken,
  Registration,
  ReminderSchedule,
  ServiceActivity,
  User,
} from '../models';

/** A seeded user record. The password never leaves this file. */
export interface SeedUser extends User {
  password: string;
}

/** Everything the simulated back end keeps in memory. */
export interface DbState {
  users: SeedUser[];
  activities: ServiceActivity[];
  registrations: Registration[];
  notifications: AppNotification[];
  reminders: ReminderSchedule[];
  checkIns: CheckInRecord[];
  qrTokens: QrToken[];
}

const SNAPSHOT_KEY = 'service-day-dashboard.db';

/**
 * The simulated database behind {@link MockBackendInterceptor}.
 *
 * The seed data lives in real JSON files under `public/data/` and is loaded
 * with Angular's HTTP stack, exactly as the assignment requires. The files are
 * requested through {@link HttpBackend} rather than `HttpClient`, because
 * `HttpBackend` is the final handler *after* the interceptor chain — using it
 * here means the seed request is not itself intercepted, so there is no
 * infinite recursion.
 *
 * Once loaded, the state is held in memory and mirrored into `sessionStorage`,
 * so a page refresh during a demonstration does not throw away the
 * registrations that were just made. `reset()` restores the original seed.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  private readonly backend = inject(HttpBackend);

  /** Cached loader. `shareReplay` guarantees the seed is read only once. */
  private state$?: Observable<DbState>;

  /** Returns the database, loading and caching it on first use. */
  read(): Observable<DbState> {
    if (!this.state$) {
      this.state$ = this.restore().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.state$;
  }

  /** Writes the current state back to `sessionStorage`. */
  persist(state: DbState): void {
    try {
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or a full quota: the in-memory copy still works.
    }
  }

  /** Discards every change made during the session and re-reads the seed files. */
  reset(): Observable<DbState> {
    try {
      sessionStorage.removeItem(SNAPSHOT_KEY);
    } catch {
      /* ignore */
    }
    this.state$ = this.loadSeed().pipe(
      tap((state) => this.persist(state)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.state$;
  }

  /** Session snapshot if one exists, otherwise the JSON seed files. */
  private restore(): Observable<DbState> {
    let snapshot: string | null = null;
    try {
      snapshot = sessionStorage.getItem(SNAPSHOT_KEY);
    } catch {
      snapshot = null;
    }

    if (snapshot) {
      try {
        return of(JSON.parse(snapshot) as DbState);
      } catch {
        // Corrupt snapshot: fall through and start again from the seed files.
      }
    }
    return this.loadSeed().pipe(tap((state) => this.persist(state)));
  }

  /** Loads all six seed files in parallel. */
  private loadSeed(): Observable<DbState> {
    return forkJoin({
      users: this.json<SeedUser[]>('users.json'),
      activities: this.json<ServiceActivity[]>('activities.json'),
      registrations: this.json<Registration[]>('registrations.json'),
      notifications: this.json<AppNotification[]>('notifications.json'),
      reminders: this.json<ReminderSchedule[]>('reminders.json'),
      checkIns: this.json<CheckInRecord[]>('check-ins.json'),
    }).pipe(
      switchMap((seed) =>
        of<DbState>({
          users: seed.users,
          activities: seed.activities,
          registrations: seed.registrations,
          notifications: seed.notifications,
          reminders: seed.reminders,
          checkIns: seed.checkIns,
          qrTokens: [],
        }),
      ),
    );
  }

  /** GETs one JSON file straight from the browser's HTTP backend. */
  private json<T>(file: string): Observable<T> {
    const request = new HttpRequest<T>('GET', `data/${file}`, { responseType: 'json' });
    return this.backend.handle(request).pipe(
      filter((event): event is HttpResponse<T> => event instanceof HttpResponse),
      map((response) => response.body as T),
    );
  }
}
