import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { concatMap, finalize, forkJoin, map, Observable, tap } from 'rxjs';

import {
  Registration,
  RegistrationChangeRequest,
  RegistrationRequest,
  RegistrationView,
} from '../models';
import { ActivityService } from './activity.service';
import { AuthService } from './auth.service';

/**
 * Employee registrations (Use Case 3) and the figures the administrator
 * monitors (Use Case 4).
 *
 * Every rule that decides whether a slot may be taken — the cut-off date, a
 * full activity, a duplicate booking — is enforced by the back end. This
 * service sends the request, stores the result and then re-reads only the
 * activities whose slot count has actually changed, which is what makes the
 * counters on screen move without the page being reloaded.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly activityService = inject(ActivityService);

  private readonly myItems = signal<Registration[]>([]);
  private readonly allItems = signal<Registration[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);

  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();

  /** Raw registrations of every employee — the administrator's data set. */
  readonly all = this.allItems.asReadonly();

  /** The signed-in employee's registrations, joined to their activity. */
  readonly mine = computed<RegistrationView[]>(() => {
    const activities = this.activityService.activities();
    return this.myItems()
      .filter((registration) => registration.status !== 'withdrawn')
      .map((registration) => {
        const activity = activities.find((item) => item.id === registration.activityId);
        return {
          ...registration,
          activityTitle: activity?.activityTitle ?? 'Activity withdrawn by administrator',
          ngoName: activity?.ngoName ?? '—',
          activityDate: activity?.activityDate ?? '',
          startTime: activity?.startTime ?? '',
          endTime: activity?.endTime ?? '',
          location: activity?.location ?? '—',
          registrationCutOff: activity?.registrationCutOff ?? '',
          canBeEdited:
            registration.status === 'confirmed' && activity !== undefined && !activity.availability.isClosed,
        };
      })
      .sort((a, b) => a.activityDate.localeCompare(b.activityDate));
  });

  /** Count of activities the signed-in employee is confirmed for. */
  readonly myConfirmedCount = computed(
    () => this.mine().filter((registration) => registration.status === 'confirmed').length,
  );

  /** Confirmed registrations grouped by activity, for the monitoring screen. */
  readonly participationByActivity = computed(() => {
    const registrations = this.allItems().filter((item) => item.status !== 'withdrawn');
    return this.activityService
      .published()
      .map((activity) => {
        const participants = registrations.filter((item) => item.activityId === activity.id);
        return {
          activity,
          participants,
          participantCount: participants.length,
          checkedInCount: participants.filter((item) => item.checkInAt).length,
        };
      })
      .sort((a, b) => b.activity.availability.fillRate - a.activity.availability.fillRate);
  });

  /** Confirmed registrations grouped by department, for workforce planning. */
  readonly participationByDepartment = computed(() => {
    const totals = new Map<string, { department: string; employees: Set<string>; slots: number }>();

    for (const registration of this.allItems()) {
      if (registration.status === 'withdrawn') {
        continue;
      }
      const entry = totals.get(registration.department) ?? {
        department: registration.department,
        employees: new Set<string>(),
        slots: 0,
      };
      entry.employees.add(registration.employeeId);
      entry.slots += 1;
      totals.set(registration.department, entry);
    }

    return [...totals.values()]
      .map((entry) => ({
        department: entry.department,
        employeeCount: entry.employees.size,
        slotCount: entry.slots,
      }))
      .sort((a, b) => b.slotCount - a.slotCount);
  });

  /** The signed-in employee's live registration for an activity, if any. */
  registrationFor(activityId: string): Registration | undefined {
    return this.myItems().find(
      (registration) =>
        registration.activityId === activityId && registration.status !== 'withdrawn',
    );
  }

  /** GET /api/registrations?employeeId=… — the signed-in employee's bookings. */
  loadMine(): Observable<Registration[]> {
    const employeeId = this.auth.requireUserId();
    this.loadingState.set(true);

    return this.http
      .get<Registration[]>('/api/registrations', {
        params: new HttpParams().set('employeeId', employeeId),
      })
      .pipe(
        tap((registrations) => this.myItems.set(registrations)),
        finalize(() => this.loadingState.set(false)),
      );
  }

  /** GET /api/registrations — every registration, for the administrator. */
  loadAll(): Observable<Registration[]> {
    this.loadingState.set(true);
    return this.http.get<Registration[]>('/api/registrations').pipe(
      tap((registrations) => this.allItems.set(registrations)),
      finalize(() => this.loadingState.set(false)),
    );
  }

  /** POST /api/registrations — takes a slot on an activity. */
  register(activityId: string): Observable<Registration> {
    const body: RegistrationRequest = { employeeId: this.auth.requireUserId(), activityId };
    this.savingState.set(true);

    return this.http.post<Registration>('/api/registrations', body).pipe(
      tap((registration) => this.myItems.update((items) => [...items, registration])),
      // Re-read only the activity that changed, so its slot count updates in place.
      concatMap((registration) =>
        this.activityService.loadOne(activityId).pipe(map(() => registration)),
      ),
      tap(() => this.activityService.touchClock()),
      finalize(() => this.savingState.set(false)),
    );
  }

  /**
   * PUT /api/registrations/:id — moves a booking to a different activity.
   * Both affected activities are re-read, because one slot is released and
   * another is taken.
   */
  changeActivity(registrationId: string, activityId: string): Observable<Registration> {
    const previousActivityId = this.myItems().find((item) => item.id === registrationId)?.activityId;
    const body: RegistrationChangeRequest = { activityId };
    this.savingState.set(true);

    return this.http.put<Registration>(`/api/registrations/${registrationId}`, body).pipe(
      tap((registration) =>
        this.myItems.update((items) =>
          items.map((item) => (item.id === registration.id ? registration : item)),
        ),
      ),
      concatMap((registration) =>
        forkJoin(
          [activityId, previousActivityId]
            .filter((id): id is string => Boolean(id))
            .map((id) => this.activityService.loadOne(id)),
        ).pipe(map(() => registration)),
      ),
      tap(() => this.activityService.touchClock()),
      finalize(() => this.savingState.set(false)),
    );
  }

  /** DELETE /api/registrations/:id — withdraws and returns the slot to the pool. */
  withdraw(registrationId: string): Observable<Registration> {
    const activityId = this.myItems().find((item) => item.id === registrationId)?.activityId;
    this.savingState.set(true);

    return this.http.delete<Registration>(`/api/registrations/${registrationId}`).pipe(
      tap((registration) =>
        this.myItems.update((items) =>
          items.map((item) => (item.id === registration.id ? registration : item)),
        ),
      ),
      concatMap((registration) =>
        activityId
          ? this.activityService.loadOne(activityId).pipe(map(() => registration))
          : [registration],
      ),
      tap(() => this.activityService.touchClock()),
      finalize(() => this.savingState.set(false)),
    );
  }
}
