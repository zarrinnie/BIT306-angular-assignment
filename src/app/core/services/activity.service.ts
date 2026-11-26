import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize, Observable, tap } from 'rxjs';

import {
  ActivityAvailability,
  ActivityDraft,
  ActivityView,
  ServiceActivity,
} from '../models';
import { apiErrorMessage } from './http-error.util';

/** How often the cut-off countdowns are recalculated, in milliseconds. */
const CLOCK_INTERVAL_MS = 30_000;

/** Slots remaining at or below which an activity is flagged as urgent. */
const URGENT_THRESHOLD = 3;

/**
 * Derives the availability of an activity at a point in time.
 *
 * Deliberately a pure function rather than a method on the model: the model
 * stays a plain data structure, and this rule can be unit-tested on its own.
 */
export function buildAvailability(
  activity: ServiceActivity,
  nowMs: number = Date.now(),
): ActivityAvailability {
  const slotsRemaining = Math.max(0, activity.maxEmployees - activity.slotsTaken);
  const isFull = slotsRemaining === 0;
  const isClosed = new Date(activity.registrationCutOff).getTime() <= nowMs;
  const fillRate =
    activity.maxEmployees === 0
      ? 0
      : Math.round((activity.slotsTaken / activity.maxEmployees) * 100);

  return {
    slotsRemaining,
    isFull,
    isClosed,
    isUrgent: !isFull && !isClosed && slotsRemaining <= URGENT_THRESHOLD,
    fillRate,
    isOpenForRegistration: !isFull && !isClosed && activity.status === 'published',
  };
}

/** Pairs an activity with its derived availability for use in templates. */
export function toActivityView(activity: ServiceActivity, nowMs: number): ActivityView {
  return { ...activity, availability: buildAvailability(activity, nowMs) };
}

/**
 * The single source of truth for NGO Service Day activities (Use Cases 1 and 2).
 *
 * The service owns the data; components only read the signals it exposes. Each
 * change is sent to the back end first and the stored list is then replaced
 * with what the server returned, so the slot counts on screen are always the
 * server's counts and never a local guess.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  private readonly items = signal<ServiceActivity[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  /** Ticks every half minute so "closes in ..." labels stay truthful. */
  private readonly clock = signal(Date.now());

  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** Every activity, including drafts — the administrator's view. */
  readonly activities = computed<ActivityView[]>(() => {
    const now = this.clock();
    return this.items().map((activity) => toActivityView(activity, now));
  });

  /** Approved activities only — this is what employees are allowed to see. */
  readonly published = computed(() =>
    this.activities().filter((activity) => activity.status === 'published'),
  );

  /** Published activities an employee can still join right now. */
  readonly openForRegistration = computed(() =>
    this.published().filter((activity) => activity.availability.isOpenForRegistration),
  );

  /** Company-wide slot utilisation, used by the administrator's dashboard. */
  readonly utilisation = computed(() => {
    const published = this.published();
    const slotsOffered = published.reduce((total, a) => total + a.maxEmployees, 0);
    const slotsTaken = published.reduce((total, a) => total + a.slotsTaken, 0);
    return {
      activityCount: published.length,
      slotsOffered,
      slotsTaken,
      slotsRemaining: slotsOffered - slotsTaken,
      fillRate: slotsOffered === 0 ? 0 : Math.round((slotsTaken / slotsOffered) * 100),
      fullActivities: published.filter((a) => a.availability.isFull).length,
      closedActivities: published.filter((a) => a.availability.isClosed).length,
    };
  });

  constructor() {
    const ticker = setInterval(() => this.clock.set(Date.now()), CLOCK_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(ticker));
  }

  /** Recalculates the countdowns immediately, after a change was saved. */
  touchClock(): void {
    this.clock.set(Date.now());
  }

  /** GET /api/activities — loads every activity into the store. */
  load(): Observable<ServiceActivity[]> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.http
      .get<ServiceActivity[]>('/api/activities', { params: new HttpParams().set('scope', 'all') })
      .pipe(
        tap({
          next: (activities) => this.items.set(activities),
          error: (error: unknown) => this.errorState.set(apiErrorMessage(error)),
        }),
        finalize(() => this.loadingState.set(false)),
      );
  }

  /** GET /api/activities/:id — used when a detail page is opened directly. */
  loadOne(id: string): Observable<ServiceActivity> {
    return this.http.get<ServiceActivity>(`/api/activities/${id}`).pipe(
      tap((activity) =>
        this.items.update((activities) => {
          const index = activities.findIndex((item) => item.id === activity.id);
          if (index === -1) {
            return [...activities, activity];
          }
          const next = [...activities];
          next[index] = activity;
          return next;
        }),
      ),
    );
  }

  /** POST /api/activities — Use Case 1, adding an NGO opportunity. */
  create(draft: ActivityDraft): Observable<ServiceActivity> {
    this.savingState.set(true);
    return this.http.post<ServiceActivity>('/api/activities', draft).pipe(
      tap((activity) => this.items.update((activities) => [...activities, activity])),
      finalize(() => this.savingState.set(false)),
    );
  }

  /** PUT /api/activities/:id — Use Case 1, updating availability details. */
  update(id: string, draft: ActivityDraft): Observable<ServiceActivity> {
    this.savingState.set(true);
    return this.http.put<ServiceActivity>(`/api/activities/${id}`, draft).pipe(
      tap((activity) =>
        this.items.update((activities) =>
          activities.map((item) => (item.id === activity.id ? activity : item)),
        ),
      ),
      finalize(() => this.savingState.set(false)),
    );
  }

  /**
   * DELETE /api/activities/:id — Use Case 1, removing an activity. The back end
   * withdraws every participant and notifies them, and reports how many.
   */
  remove(id: string): Observable<{ deleted: string; notified: number }> {
    this.savingState.set(true);
    return this.http.delete<{ deleted: string; notified: number }>(`/api/activities/${id}`).pipe(
      tap(() => this.items.update((activities) => activities.filter((item) => item.id !== id))),
      finalize(() => this.savingState.set(false)),
    );
  }

  /**
   * Replaces one stored activity with a fresher copy. Called after a
   * registration so that the new slot count appears straight away, without
   * reloading the page or re-fetching the whole list.
   */
  patch(activity: ServiceActivity): void {
    this.items.update((activities) =>
      activities.map((item) => (item.id === activity.id ? activity : item)),
    );
  }
}
