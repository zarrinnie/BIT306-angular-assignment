import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize, Observable, tap } from 'rxjs';

import {
  AppNotification,
  BroadcastRequest,
  ReminderOffsetDays,
  ReminderSchedule,
  ReminderScheduleView,
} from '../models';
import { ActivityService } from './activity.service';
import { AuthService } from './auth.service';

/**
 * Notifications, broadcasts and scheduled reminders (Use Case 5).
 *
 * Reminders are stored as a schedule rather than fired by a timer: each row
 * carries the moment it becomes due, the dashboard marks the due ones, and the
 * administrator releases them to the confirmed participants. That keeps the
 * behaviour demonstrable in a front-end-only prototype, where no background
 * server process exists to send mail.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly activityService = inject(ActivityService);

  private readonly items = signal<AppNotification[]>([]);
  private readonly reminderItems = signal<ReminderSchedule[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);

  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();

  /** Messages for whoever is signed in, newest first. */
  readonly notifications = this.items.asReadonly();

  /** Drives the counter on the inbox button in the navigation bar. */
  readonly unreadCount = computed(
    () => this.items().filter((notification) => !notification.read).length,
  );

  /** Reminder schedules joined to their activity, with their due state. */
  readonly reminders = computed<ReminderScheduleView[]>(() => {
    const activities = this.activityService.activities();
    const now = Date.now();

    return this.reminderItems()
      .map((reminder) => {
        const activity = activities.find((item) => item.id === reminder.activityId);
        return {
          ...reminder,
          activityTitle: activity?.activityTitle ?? 'Activity removed',
          ngoName: activity?.ngoName ?? '—',
          activityDate: activity?.activityDate ?? '',
          recipientCount: activity?.slotsTaken ?? 0,
          isDue: !reminder.sent && new Date(reminder.sendAt).getTime() <= now,
        };
      })
      .sort((a, b) => a.sendAt.localeCompare(b.sendAt));
  });

  /** Reminders that are due now and have not been released yet. */
  readonly dueReminders = computed(() => this.reminders().filter((reminder) => reminder.isDue));

  /** GET /api/notifications?recipientId=… — the signed-in user's inbox. */
  loadMine(): Observable<AppNotification[]> {
    const recipientId = this.auth.requireUserId();
    this.loadingState.set(true);

    return this.http
      .get<AppNotification[]>('/api/notifications', {
        params: new HttpParams().set('recipientId', recipientId),
      })
      .pipe(
        tap((notifications) => this.items.set(notifications)),
        finalize(() => this.loadingState.set(false)),
      );
  }

  /** GET /api/notifications — every message sent, for the administrator's log. */
  loadAll(): Observable<AppNotification[]> {
    this.loadingState.set(true);
    return this.http.get<AppNotification[]>('/api/notifications').pipe(
      tap((notifications) => this.items.set(notifications)),
      finalize(() => this.loadingState.set(false)),
    );
  }

  /** GET /api/reminders — the stored reminder schedule. */
  loadReminders(): Observable<ReminderSchedule[]> {
    return this.http
      .get<ReminderSchedule[]>('/api/reminders')
      .pipe(tap((reminders) => this.reminderItems.set(reminders)));
  }

  /** PUT /api/notifications/:id/read — marks one message as read. */
  markRead(id: string): Observable<AppNotification> {
    return this.http.put<AppNotification>(`/api/notifications/${id}/read`, {}).pipe(
      tap((updated) =>
        this.items.update((notifications) =>
          notifications.map((item) => (item.id === updated.id ? updated : item)),
        ),
      ),
    );
  }

  /** POST /api/notifications/broadcast — a message to one activity or to all staff. */
  broadcast(request: BroadcastRequest): Observable<{ delivered: number }> {
    this.savingState.set(true);
    return this.http
      .post<{ delivered: number; notifications: AppNotification[] }>(
        '/api/notifications/broadcast',
        request,
      )
      .pipe(finalize(() => this.savingState.set(false)));
  }

  /** POST /api/reminders — schedules a reminder a number of days in advance. */
  scheduleReminder(activityId: string, offsetDays: ReminderOffsetDays): Observable<ReminderSchedule> {
    this.savingState.set(true);
    return this.http
      .post<ReminderSchedule>('/api/reminders', { activityId, offsetDays })
      .pipe(
        tap((reminder) => this.reminderItems.update((items) => [...items, reminder])),
        finalize(() => this.savingState.set(false)),
      );
  }

  /** POST /api/reminders/:id/send — releases a due reminder to the participants. */
  releaseReminder(id: string): Observable<{ reminder: ReminderSchedule; delivered: number }> {
    this.savingState.set(true);
    return this.http
      .post<{ reminder: ReminderSchedule; delivered: number }>(`/api/reminders/${id}/send`, {})
      .pipe(
        tap((result) =>
          this.reminderItems.update((items) =>
            items.map((item) => (item.id === result.reminder.id ? result.reminder : item)),
          ),
        ),
        finalize(() => this.savingState.set(false)),
      );
  }

  /** DELETE /api/reminders/:id — removes a schedule that is no longer wanted. */
  deleteReminder(id: string): Observable<{ deleted: string }> {
    this.savingState.set(true);
    return this.http.delete<{ deleted: string }>(`/api/reminders/${id}`).pipe(
      tap(() => this.reminderItems.update((items) => items.filter((item) => item.id !== id))),
      finalize(() => this.savingState.set(false)),
    );
  }
}
