import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize, Observable, tap } from 'rxjs';

import {
  AttendanceReport,
  CheckInRecord,
  CheckInRequest,
  CheckInView,
  QrToken,
  Registration,
  ServiceActivity,
} from '../models';
import { ActivityService } from './activity.service';
import { RegistrationService } from './registration.service';

/**
 * Builds the post-event attendance summary for one activity.
 *
 * Pure function so that the figures in the report can be verified in isolation
 * from the HTTP layer and the templates.
 */
export function buildAttendanceReport(
  activity: ServiceActivity,
  registrations: readonly Registration[],
  checkIns: readonly CheckInRecord[],
): AttendanceReport {
  const expected = registrations.filter(
    (registration) =>
      registration.activityId === activity.id && registration.status !== 'withdrawn',
  );
  const arrived = checkIns.filter((record) => record.activityId === activity.id);

  return {
    activityId: activity.id,
    activityTitle: activity.activityTitle,
    ngoName: activity.ngoName,
    activityDate: activity.activityDate,
    registeredCount: expected.length,
    checkedInCount: arrived.length,
    noShowCount: Math.max(0, expected.length - arrived.length),
    attendanceRate:
      expected.length === 0 ? 0 : Math.round((arrived.length / expected.length) * 100),
  };
}

/**
 * QR code check-in on the day of the activity (Use Case 6).
 *
 * The administrator asks the back end for a code, which is rendered as a QR
 * image. Scanning it opens the check-in page, which posts the code together
 * with the employee's id; the back end verifies both the code and the
 * registration before recording the arrival time.
 */
@Injectable({ providedIn: 'root' })
export class CheckInService {
  private readonly http = inject(HttpClient);
  private readonly activityService = inject(ActivityService);
  private readonly registrationService = inject(RegistrationService);

  private readonly records = signal<CheckInRecord[]>([]);
  private readonly expectedItems = signal<Registration[]>([]);
  private readonly tokens = signal<QrToken[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);

  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();

  /** Arrivals joined to their activity, newest first — the live board. */
  readonly checkIns = computed<CheckInView[]>(() => {
    const activities = this.activityService.activities();
    return this.records()
      .map((record) => {
        const activity = activities.find((item) => item.id === record.activityId);
        return {
          ...record,
          activityTitle: activity?.activityTitle ?? 'Activity removed',
          ngoName: activity?.ngoName ?? '—',
        };
      })
      .sort((a, b) => b.arrivalTime.localeCompare(a.arrivalTime));
  });

  /** One attendance report per activity that has at least one registration. */
  readonly attendanceReports = computed<AttendanceReport[]>(() => {
    const registrations = this.registrationService.all();
    const records = this.records();

    return this.activityService
      .activities()
      .map((activity) => buildAttendanceReport(activity, registrations, records))
      .filter((report) => report.registeredCount > 0)
      .sort((a, b) => b.activityDate.localeCompare(a.activityDate));
  });

  /** Everybody registered for the activity currently being checked in. */
  readonly expected = this.expectedItems.asReadonly();

  /** Registered employees of that activity who have not arrived yet. */
  readonly stillExpected = computed(() =>
    this.expectedItems().filter((registration) => !registration.checkInAt),
  );

  /** GET /api/registrations?activityId=… — who should be at this activity. */
  loadExpected(activityId: string): Observable<Registration[]> {
    return this.http
      .get<Registration[]>('/api/registrations', {
        params: new HttpParams().set('activityId', activityId),
      })
      .pipe(
        tap((registrations) =>
          this.expectedItems.set(
            registrations.filter((registration) => registration.status !== 'withdrawn'),
          ),
        ),
      );
  }

  /** The code currently issued for an activity, if the administrator made one. */
  tokenFor(activityId: string): QrToken | undefined {
    return this.tokens().find((token) => token.activityId === activityId);
  }

  /** GET /api/check-ins — every arrival, or those for a single activity. */
  load(activityId?: string): Observable<CheckInRecord[]> {
    this.loadingState.set(true);
    const options = activityId
      ? { params: new HttpParams().set('activityId', activityId) }
      : {};

    return this.http.get<CheckInRecord[]>('/api/check-ins', options).pipe(
      tap((records) => this.records.set(records)),
      finalize(() => this.loadingState.set(false)),
    );
  }

  /**
   * Re-reads the arrivals without switching on the loading indicator, so the
   * live board can poll quietly in the background.
   */
  refreshQuietly(activityId?: string): Observable<CheckInRecord[]> {
    const options = activityId
      ? { params: new HttpParams().set('activityId', activityId) }
      : {};
    return this.http
      .get<CheckInRecord[]>('/api/check-ins', options)
      .pipe(tap((records) => this.records.set(records)));
  }

  /** POST /api/activities/:id/qr-token — issues the code for an activity. */
  issueToken(activityId: string): Observable<QrToken> {
    this.savingState.set(true);
    return this.http.post<QrToken>(`/api/activities/${activityId}/qr-token`, {}).pipe(
      tap((token) =>
        this.tokens.update((tokens) => [
          ...tokens.filter((item) => item.activityId !== token.activityId),
          token,
        ]),
      ),
      finalize(() => this.savingState.set(false)),
    );
  }

  /** POST /api/check-ins — records an arrival after a successful scan. */
  checkIn(request: CheckInRequest): Observable<CheckInRecord> {
    this.savingState.set(true);
    return this.http.post<CheckInRecord>('/api/check-ins', request).pipe(
      tap((record) => this.records.update((records) => [record, ...records])),
      finalize(() => this.savingState.set(false)),
    );
  }
}
