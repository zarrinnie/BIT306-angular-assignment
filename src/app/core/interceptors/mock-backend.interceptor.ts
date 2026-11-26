import { inject, Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, switchMap, throwError, timer } from 'rxjs';

import { DbState, MockDb, SeedUser } from './mock-db';
import { formatDate, formatDateTime } from '../utils/date-format';
import {
  ActivityDraft,
  ApiErrorCode,
  AppNotification,
  BroadcastRequest,
  CheckInRecord,
  CheckInRequest,
  LoginRequest,
  LoginResponse,
  NotificationKind,
  QrToken,
  Registration,
  RegistrationChangeRequest,
  RegistrationRequest,
  ReminderOffsetDays,
  ReminderSchedule,
  ServiceActivity,
  User,
} from '../models';

const API_PREFIX = '/api/';

/** Formats a date as a local `YYYY-MM-DDTHH:mm:ss` string, matching the seed files. */
function localIso(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** Next identifier in a sequence such as `R001`, `R002`, ... */
function nextId(prefix: string, existing: readonly { id: string }[]): string {
  const highest = existing.reduce((max, item) => {
    const numeric = Number(item.id.replace(/\D/g, ''));
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

/** Strips the password before a user record is sent to the browser. */
function publicUser(user: SeedUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

/**
 * Simulated REST back end for the Service Day Dashboard.
 *
 * The assignment is front-end only, so there is no server to talk to. This
 * class implements Angular's {@link HttpInterceptor} contract and answers every
 * request whose URL starts with `/api/`, which lets the application's services
 * use `HttpClient` exactly as they would against a real API — same observables,
 * same status codes, same error handling.
 *
 * Two deliberate design decisions make the simulation realistic:
 *
 * 1. **Latency.** Each response is held back by 300-700 ms, so loading
 *    indicators and disabled buttons are genuinely exercised and the
 *    non-blocking nature of the UI is visible.
 * 2. **The server owns the business rules.** Slot counts, the registration
 *    cut-off and duplicate checks are enforced here and reported with HTTP 409
 *    Conflict. The client never adjusts a slot count by itself, so its view can
 *    never drift out of step with the stored data.
 */
@Injectable()
export class MockBackendInterceptor implements HttpInterceptor {
  private readonly db = inject(MockDb);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.url.startsWith(API_PREFIX)) {
      return next.handle(request);
    }

    // Restoring the demonstration data replaces the whole database.
    if (request.method === 'POST' && this.path(request) === 'admin/reset') {
      return this.withLatency(this.db.reset().pipe(switchMap(() => this.ok({ reset: true }))));
    }

    return this.withLatency(this.db.read().pipe(switchMap((state) => this.route(state, request))));
  }

  /** Delays the response — errors included — to imitate network round-trip time. */
  private withLatency(response$: Observable<HttpEvent<unknown>>): Observable<HttpEvent<unknown>> {
    const milliseconds = 300 + Math.floor(Math.random() * 400);
    return timer(milliseconds).pipe(switchMap(() => response$));
  }

  private path(request: HttpRequest<unknown>): string {
    return request.url.split('?')[0].slice(API_PREFIX.length).replace(/\/+$/, '');
  }

  // ---------------------------------------------------------------- routing

  private route(state: DbState, request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const segments = this.path(request).split('/');
    const method = request.method.toUpperCase();
    const resource = segments[0];

    switch (resource) {
      case 'auth':
        if (method === 'POST' && segments[1] === 'login') {
          return this.login(state, request.body as LoginRequest);
        }
        break;

      case 'employees':
        if (method === 'GET' && segments.length === 1) {
          return this.ok(state.users.filter((u) => u.role === 'employee').map(publicUser));
        }
        break;

      case 'activities':
        if (method === 'GET' && segments.length === 1) {
          return this.listActivities(state, request);
        }
        if (method === 'GET' && segments.length === 2) {
          return this.readActivity(state, segments[1]);
        }
        if (method === 'POST' && segments.length === 1) {
          return this.createActivity(state, request.body as ActivityDraft);
        }
        if (method === 'PUT' && segments.length === 2) {
          return this.updateActivity(state, segments[1], request.body as ActivityDraft);
        }
        if (method === 'DELETE' && segments.length === 2) {
          return this.deleteActivity(state, segments[1]);
        }
        if (method === 'POST' && segments.length === 3 && segments[2] === 'qr-token') {
          return this.issueQrToken(state, segments[1]);
        }
        break;

      case 'registrations':
        if (method === 'GET' && segments.length === 1) {
          return this.listRegistrations(state, request);
        }
        if (method === 'POST' && segments.length === 1) {
          return this.createRegistration(state, request.body as RegistrationRequest);
        }
        if (method === 'PUT' && segments.length === 2) {
          return this.changeRegistration(
            state,
            segments[1],
            request.body as RegistrationChangeRequest,
          );
        }
        if (method === 'DELETE' && segments.length === 2) {
          return this.withdrawRegistration(state, segments[1]);
        }
        break;

      case 'check-ins':
        if (method === 'GET' && segments.length === 1) {
          return this.listCheckIns(state, request);
        }
        if (method === 'POST' && segments.length === 1) {
          return this.createCheckIn(state, request.body as CheckInRequest);
        }
        break;

      case 'notifications':
        if (method === 'GET' && segments.length === 1) {
          return this.listNotifications(state, request);
        }
        if (method === 'POST' && segments[1] === 'broadcast') {
          return this.broadcast(state, request.body as BroadcastRequest);
        }
        if (method === 'PUT' && segments.length === 3 && segments[2] === 'read') {
          return this.markNotificationRead(state, segments[1]);
        }
        break;

      case 'reminders':
        if (method === 'GET' && segments.length === 1) {
          return this.ok(state.reminders);
        }
        if (method === 'POST' && segments.length === 1) {
          return this.createReminder(state, request.body as Omit<ReminderSchedule, 'id' | 'sendAt' | 'sent' | 'sentAt'>);
        }
        if (method === 'POST' && segments.length === 3 && segments[2] === 'send') {
          return this.sendReminder(state, segments[1]);
        }
        if (method === 'DELETE' && segments.length === 2) {
          return this.deleteReminder(state, segments[1]);
        }
        break;

      default:
        break;
    }

    return this.fail(404, 'NOT_FOUND', `No mock endpoint for ${method} ${request.url}.`);
  }

  // ------------------------------------------------------------------- auth

  private login(state: DbState, body: LoginRequest): Observable<HttpEvent<unknown>> {
    const email = (body?.email ?? '').trim().toLowerCase();
    const account = state.users.find((user) => user.email.toLowerCase() === email);

    if (!account || account.password !== body?.password) {
      return this.fail(
        401,
        'INVALID_CREDENTIALS',
        'That email address and password do not match any staff account.',
      );
    }

    const response: LoginResponse = {
      user: publicUser(account),
      token: `mock-session-${account.id}-${Date.now()}`,
    };
    return this.ok(response);
  }

  // ------------------------------------------------------------- activities

  private listActivities(state: DbState, request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const scope = request.params.get('scope') ?? 'published';
    const activities =
      scope === 'all' ? state.activities : state.activities.filter((a) => a.status === 'published');
    return this.ok(this.sortByDate(activities));
  }

  private readActivity(state: DbState, id: string): Observable<HttpEvent<unknown>> {
    const activity = state.activities.find((item) => item.id === id);
    return activity
      ? this.ok(activity)
      : this.fail(404, 'NOT_FOUND', 'That Service Day activity no longer exists.');
  }

  private createActivity(state: DbState, draft: ActivityDraft): Observable<HttpEvent<unknown>> {
    const invalid = this.validateDraft(draft);
    if (invalid) {
      return this.fail(400, 'BAD_REQUEST', invalid);
    }

    const timestamp = localIso();
    const activity: ServiceActivity = {
      ...draft,
      id: nextId('A', state.activities),
      slotsTaken: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.activities.push(activity);
    this.scheduleRemindersFor(state, activity);
    this.db.persist(state);
    return this.created(activity);
  }

  private updateActivity(
    state: DbState,
    id: string,
    draft: ActivityDraft,
  ): Observable<HttpEvent<unknown>> {
    const activity = state.activities.find((item) => item.id === id);
    if (!activity) {
      return this.fail(404, 'NOT_FOUND', 'That Service Day activity no longer exists.');
    }

    const invalid = this.validateDraft(draft);
    if (invalid) {
      return this.fail(400, 'BAD_REQUEST', invalid);
    }
    if (draft.maxEmployees < activity.slotsTaken) {
      return this.fail(
        409,
        'BAD_REQUEST',
        `${activity.slotsTaken} employees have already registered, so the maximum cannot be lowered to ${draft.maxEmployees}.`,
      );
    }

    const dateChanged =
      draft.activityDate !== activity.activityDate ||
      draft.startTime !== activity.startTime ||
      draft.location !== activity.location;

    Object.assign(activity, draft, { updatedAt: localIso() });

    if (dateChanged) {
      // Use Case 5: participants are notified automatically when details change.
      this.notifyParticipants(state, activity, {
        kind: 'change',
        subject: `Updated details: ${activity.activityTitle}`,
        message:
          `The schedule or venue of "${activity.activityTitle}" with ${activity.ngoName} has been updated. ` +
          `It now takes place on ${formatDate(activity.activityDate)} at ${activity.startTime}, ${activity.location}.`,
      });
      state.reminders = state.reminders.filter((reminder) => reminder.activityId !== activity.id);
      this.scheduleRemindersFor(state, activity);
    }

    this.db.persist(state);
    return this.ok(activity);
  }

  private deleteActivity(state: DbState, id: string): Observable<HttpEvent<unknown>> {
    const index = state.activities.findIndex((item) => item.id === id);
    if (index === -1) {
      return this.fail(404, 'NOT_FOUND', 'That Service Day activity no longer exists.');
    }

    const [activity] = state.activities.splice(index, 1);

    // Every confirmed participant is withdrawn and told why.
    const affected = state.registrations.filter(
      (registration) => registration.activityId === id && registration.status === 'confirmed',
    );
    this.notifyParticipants(state, activity, {
      kind: 'cancellation',
      subject: `Cancelled: ${activity.activityTitle}`,
      message:
        `"${activity.activityTitle}" with ${activity.ngoName} on ${formatDate(activity.activityDate)} has been withdrawn ` +
        `by the Service Day administrator. Please choose another activity from the dashboard.`,
    });
    for (const registration of affected) {
      registration.status = 'withdrawn';
      registration.updatedAt = localIso();
    }
    state.reminders = state.reminders.filter((reminder) => reminder.activityId !== id);
    state.qrTokens = state.qrTokens.filter((token) => token.activityId !== id);

    this.db.persist(state);
    return this.ok({ deleted: id, notified: affected.length });
  }

  private validateDraft(draft: ActivityDraft): string | null {
    if (!draft) {
      return 'No activity details were submitted.';
    }
    if (!draft.ngoName?.trim() || !draft.activityTitle?.trim()) {
      return 'The NGO name and the activity title are both required.';
    }
    if (draft.maxEmployees < 1) {
      return 'An activity must offer at least one volunteer slot.';
    }
    if (draft.startTime >= draft.endTime) {
      return 'The finishing time must be later than the starting time.';
    }
    if (new Date(draft.registrationCutOff) > new Date(`${draft.activityDate}T${draft.startTime}`)) {
      return 'The registration cut-off must fall before the activity begins.';
    }
    return null;
  }

  private sortByDate(activities: readonly ServiceActivity[]): ServiceActivity[] {
    return [...activities].sort((a, b) =>
      `${a.activityDate}T${a.startTime}`.localeCompare(`${b.activityDate}T${b.startTime}`),
    );
  }

  // ---------------------------------------------------------- registrations

  private listRegistrations(
    state: DbState,
    request: HttpRequest<unknown>,
  ): Observable<HttpEvent<unknown>> {
    const employeeId = request.params.get('employeeId');
    const activityId = request.params.get('activityId');

    let registrations = state.registrations;
    if (employeeId) {
      registrations = registrations.filter((item) => item.employeeId === employeeId);
    }
    if (activityId) {
      registrations = registrations.filter((item) => item.activityId === activityId);
    }
    return this.ok(registrations);
  }

  private createRegistration(
    state: DbState,
    body: RegistrationRequest,
  ): Observable<HttpEvent<unknown>> {
    const employee = state.users.find((user) => user.id === body?.employeeId);
    const activity = state.activities.find((item) => item.id === body?.activityId);

    if (!employee || !activity) {
      return this.fail(404, 'NOT_FOUND', 'That employee or activity could not be found.');
    }

    const refusal = this.refusalToJoin(state, activity, employee.id);
    if (refusal) {
      return this.fail(409, refusal.code, refusal.message);
    }

    const timestamp = localIso();
    const registration: Registration = {
      id: nextId('R', state.registrations),
      employeeId: employee.id,
      employeeName: employee.fullName,
      department: employee.department,
      activityId: activity.id,
      status: 'confirmed',
      registeredAt: timestamp,
      updatedAt: timestamp,
      checkInAt: null,
    };

    state.registrations.push(registration);
    activity.slotsTaken += 1;
    this.addNotification(state, {
      recipientId: employee.id,
      recipientName: employee.fullName,
      activityId: activity.id,
      kind: 'registration',
      subject: `Registration confirmed: ${activity.activityTitle}`,
      message:
        `You are registered for "${activity.activityTitle}" with ${activity.ngoName} on ` +
        `${formatDate(activity.activityDate)} from ${activity.startTime} to ${activity.endTime} at ${activity.location}. ` +
        `You may change or withdraw until ${formatDateTime(activity.registrationCutOff)}.`,
    });

    this.db.persist(state);
    return this.created(registration);
  }

  private changeRegistration(
    state: DbState,
    id: string,
    body: RegistrationChangeRequest,
  ): Observable<HttpEvent<unknown>> {
    const registration = state.registrations.find((item) => item.id === id);
    if (!registration) {
      return this.fail(404, 'NOT_FOUND', 'That registration could not be found.');
    }
    if (registration.status !== 'confirmed') {
      return this.fail(409, 'NOT_REGISTERED', 'Only a confirmed registration can be changed.');
    }

    const current = state.activities.find((item) => item.id === registration.activityId);
    const target = state.activities.find((item) => item.id === body?.activityId);
    if (!current || !target) {
      return this.fail(404, 'NOT_FOUND', 'That Service Day activity could not be found.');
    }
    if (current.id === target.id) {
      return this.fail(
        409,
        'ALREADY_REGISTERED',
        'You are already registered for that activity.',
      );
    }
    if (this.isPastCutOff(current)) {
      return this.fail(
        409,
        'CUT_OFF_PASSED',
        `The cut-off for "${current.activityTitle}" passed on ${formatDateTime(current.registrationCutOff)}, so this registration can no longer be changed.`,
      );
    }

    const refusal = this.refusalToJoin(state, target, registration.employeeId);
    if (refusal) {
      return this.fail(409, refusal.code, refusal.message);
    }

    // Release the old slot and take the new one together, so both counts stay correct.
    current.slotsTaken = Math.max(0, current.slotsTaken - 1);
    target.slotsTaken += 1;
    registration.activityId = target.id;
    registration.updatedAt = localIso();

    this.addNotification(state, {
      recipientId: registration.employeeId,
      recipientName: registration.employeeName,
      activityId: target.id,
      kind: 'change',
      subject: `Registration moved to ${target.activityTitle}`,
      message:
        `Your Service Day registration has been moved from "${current.activityTitle}" to ` +
        `"${target.activityTitle}" with ${target.ngoName} on ${formatDate(target.activityDate)} at ${target.startTime}.`,
    });

    this.db.persist(state);
    return this.ok(registration);
  }

  private withdrawRegistration(state: DbState, id: string): Observable<HttpEvent<unknown>> {
    const registration = state.registrations.find((item) => item.id === id);
    if (!registration) {
      return this.fail(404, 'NOT_FOUND', 'That registration could not be found.');
    }
    if (registration.status !== 'confirmed') {
      return this.fail(409, 'NOT_REGISTERED', 'That registration is not currently active.');
    }

    const activity = state.activities.find((item) => item.id === registration.activityId);
    if (!activity) {
      return this.fail(404, 'NOT_FOUND', 'That Service Day activity could not be found.');
    }
    if (this.isPastCutOff(activity)) {
      return this.fail(
        409,
        'CUT_OFF_PASSED',
        `The cut-off for "${activity.activityTitle}" passed on ${formatDateTime(activity.registrationCutOff)}, so you can no longer withdraw. Please contact the administrator.`,
      );
    }

    registration.status = 'withdrawn';
    registration.updatedAt = localIso();
    activity.slotsTaken = Math.max(0, activity.slotsTaken - 1);

    this.addNotification(state, {
      recipientId: registration.employeeId,
      recipientName: registration.employeeName,
      activityId: activity.id,
      kind: 'withdrawal',
      subject: `Withdrawn from ${activity.activityTitle}`,
      message:
        `You have withdrawn from "${activity.activityTitle}" with ${activity.ngoName}. ` +
        `The slot has been returned to the pool and is available to other employees.`,
    });

    this.db.persist(state);
    return this.ok(registration);
  }

  /** The three reasons an employee may not take a slot, checked in a fixed order. */
  private refusalToJoin(
    state: DbState,
    activity: ServiceActivity,
    employeeId: string,
  ): { code: ApiErrorCode; message: string } | null {
    if (activity.status !== 'published') {
      return {
        code: 'ACTIVITY_NOT_PUBLISHED',
        message: 'That activity has not been approved for registration yet.',
      };
    }
    if (this.isPastCutOff(activity)) {
      return {
        code: 'CUT_OFF_PASSED',
        message: `Registration for "${activity.activityTitle}" closed on ${formatDateTime(activity.registrationCutOff)}.`,
      };
    }
    if (activity.slotsTaken >= activity.maxEmployees) {
      return {
        code: 'ACTIVITY_FULL',
        message: `All ${activity.maxEmployees} slots for "${activity.activityTitle}" have been taken.`,
      };
    }
    const duplicate = state.registrations.some(
      (item) =>
        item.employeeId === employeeId &&
        item.activityId === activity.id &&
        item.status !== 'withdrawn',
    );
    if (duplicate) {
      return {
        code: 'ALREADY_REGISTERED',
        message: `You are already registered for "${activity.activityTitle}".`,
      };
    }
    return null;
  }

  private isPastCutOff(activity: ServiceActivity): boolean {
    return new Date(activity.registrationCutOff).getTime() <= Date.now();
  }

  // --------------------------------------------------------------- check-in

  private issueQrToken(state: DbState, activityId: string): Observable<HttpEvent<unknown>> {
    const activity = state.activities.find((item) => item.id === activityId);
    if (!activity) {
      return this.fail(404, 'NOT_FOUND', 'That Service Day activity no longer exists.');
    }

    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    const issued: QrToken = {
      activityId,
      token,
      issuedAt: localIso(),
      checkInUrl: `${window.location.origin}/check-in/${activityId}/${token}`,
    };

    state.qrTokens = [...state.qrTokens.filter((item) => item.activityId !== activityId), issued];
    this.db.persist(state);
    return this.created(issued);
  }

  private listCheckIns(state: DbState, request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const activityId = request.params.get('activityId');
    const checkIns = activityId
      ? state.checkIns.filter((item) => item.activityId === activityId)
      : state.checkIns;
    return this.ok([...checkIns].sort((a, b) => b.arrivalTime.localeCompare(a.arrivalTime)));
  }

  private createCheckIn(state: DbState, body: CheckInRequest): Observable<HttpEvent<unknown>> {
    const activity = state.activities.find((item) => item.id === body?.activityId);
    const employee = state.users.find((user) => user.id === body?.employeeId);
    if (!activity || !employee) {
      return this.fail(404, 'NOT_FOUND', 'That employee or activity could not be found.');
    }

    const issued = state.qrTokens.find((item) => item.activityId === activity.id);
    if (!issued || issued.token !== body.token) {
      return this.fail(
        409,
        'INVALID_QR_TOKEN',
        'This check-in code is not valid for the activity. Please scan the code displayed by the administrator.',
      );
    }

    const registration = state.registrations.find(
      (item) =>
        item.activityId === activity.id &&
        item.employeeId === employee.id &&
        item.status !== 'withdrawn',
    );
    if (!registration) {
      return this.fail(
        409,
        'NOT_REGISTERED',
        `You are not registered for "${activity.activityTitle}", so you cannot be checked in.`,
      );
    }
    if (registration.checkInAt) {
      return this.fail(
        409,
        'ALREADY_CHECKED_IN',
        `You were already checked in at ${formatDateTime(registration.checkInAt)}.`,
      );
    }

    const arrivalTime = localIso();
    const record: CheckInRecord = {
      id: nextId('C', state.checkIns),
      activityId: activity.id,
      employeeId: employee.id,
      employeeName: employee.fullName,
      department: employee.department,
      arrivalTime,
      method: body.method === 'manual' ? 'manual' : 'qr',
    };
    state.checkIns.push(record);
    registration.status = 'attended';
    registration.checkInAt = arrivalTime;
    registration.updatedAt = arrivalTime;

    this.db.persist(state);
    return this.created(record);
  }

  // ---------------------------------------------------------- notifications

  private listNotifications(
    state: DbState,
    request: HttpRequest<unknown>,
  ): Observable<HttpEvent<unknown>> {
    const recipientId = request.params.get('recipientId');
    const notifications = recipientId
      ? state.notifications.filter(
          (item) => item.recipientId === recipientId || item.recipientId === 'ALL',
        )
      : state.notifications;
    return this.ok([...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  private broadcast(state: DbState, body: BroadcastRequest): Observable<HttpEvent<unknown>> {
    if (!body?.subject?.trim() || !body?.message?.trim()) {
      return this.fail(400, 'BAD_REQUEST', 'A broadcast needs both a subject and a message.');
    }

    // Addressed either to one activity's participants, or to every employee.
    if (body.activityId) {
      const activity = state.activities.find((item) => item.id === body.activityId);
      if (!activity) {
        return this.fail(404, 'NOT_FOUND', 'That Service Day activity could not be found.');
      }
      const created = this.notifyParticipants(state, activity, {
        kind: body.kind ?? 'broadcast',
        subject: body.subject,
        message: body.message,
      });
      this.db.persist(state);
      return this.created({ delivered: created.length, notifications: created });
    }

    const notification = this.addNotification(state, {
      recipientId: 'ALL',
      recipientName: 'All employees',
      activityId: null,
      kind: body.kind ?? 'broadcast',
      subject: body.subject,
      message: body.message,
    });
    this.db.persist(state);
    return this.created({
      delivered: state.users.filter((user) => user.role === 'employee').length,
      notifications: [notification],
    });
  }

  private markNotificationRead(state: DbState, id: string): Observable<HttpEvent<unknown>> {
    const notification = state.notifications.find((item) => item.id === id);
    if (!notification) {
      return this.fail(404, 'NOT_FOUND', 'That message could not be found.');
    }
    notification.read = true;
    this.db.persist(state);
    return this.ok(notification);
  }

  /** Writes one message to every confirmed participant of an activity. */
  private notifyParticipants(
    state: DbState,
    activity: ServiceActivity,
    message: { kind: NotificationKind; subject: string; message: string },
  ): AppNotification[] {
    return state.registrations
      .filter((item) => item.activityId === activity.id && item.status !== 'withdrawn')
      .map((item) =>
        this.addNotification(state, {
          recipientId: item.employeeId,
          recipientName: item.employeeName,
          activityId: activity.id,
          ...message,
        }),
      );
  }

  private addNotification(
    state: DbState,
    draft: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
  ): AppNotification {
    const notification: AppNotification = {
      ...draft,
      id: nextId('N', state.notifications),
      createdAt: localIso(),
      read: false,
    };
    state.notifications.push(notification);
    return notification;
  }

  // -------------------------------------------------------------- reminders

  private createReminder(
    state: DbState,
    body: { activityId: string; offsetDays: ReminderOffsetDays },
  ): Observable<HttpEvent<unknown>> {
    const activity = state.activities.find((item) => item.id === body?.activityId);
    if (!activity) {
      return this.fail(404, 'NOT_FOUND', 'That Service Day activity could not be found.');
    }
    const duplicate = state.reminders.some(
      (item) => item.activityId === activity.id && item.offsetDays === body.offsetDays,
    );
    if (duplicate) {
      return this.fail(
        409,
        'BAD_REQUEST',
        `A ${body.offsetDays}-day reminder is already scheduled for that activity.`,
      );
    }

    const reminder = this.buildReminder(state, activity, body.offsetDays);
    state.reminders.push(reminder);
    this.db.persist(state);
    return this.created(reminder);
  }

  private sendReminder(state: DbState, id: string): Observable<HttpEvent<unknown>> {
    const reminder = state.reminders.find((item) => item.id === id);
    if (!reminder) {
      return this.fail(404, 'NOT_FOUND', 'That reminder could not be found.');
    }
    if (reminder.sent) {
      return this.fail(409, 'BAD_REQUEST', 'That reminder has already been released.');
    }
    const activity = state.activities.find((item) => item.id === reminder.activityId);
    if (!activity) {
      return this.fail(404, 'NOT_FOUND', 'That Service Day activity could not be found.');
    }

    const delivered = this.notifyParticipants(state, activity, {
      kind: 'reminder',
      subject: `Reminder: ${activity.activityTitle} in ${reminder.offsetDays} day(s)`,
      message:
        `"${activity.activityTitle}" with ${activity.ngoName} takes place on ${formatDate(activity.activityDate)} ` +
        `from ${activity.startTime} at ${activity.location}. Please arrive fifteen minutes early and ` +
        `remember to scan the check-in QR code on arrival.`,
    });

    reminder.sent = true;
    reminder.sentAt = localIso();
    this.db.persist(state);
    return this.ok({ reminder, delivered: delivered.length });
  }

  private deleteReminder(state: DbState, id: string): Observable<HttpEvent<unknown>> {
    const index = state.reminders.findIndex((item) => item.id === id);
    if (index === -1) {
      return this.fail(404, 'NOT_FOUND', 'That reminder could not be found.');
    }
    state.reminders.splice(index, 1);
    this.db.persist(state);
    return this.ok({ deleted: id });
  }

  /** Gives a newly created activity the standard 7, 3 and 1 day reminder schedule. */
  private scheduleRemindersFor(state: DbState, activity: ServiceActivity): void {
    if (activity.status !== 'published') {
      return;
    }
    for (const offset of [7, 3, 1] as ReminderOffsetDays[]) {
      state.reminders.push(this.buildReminder(state, activity, offset));
    }
  }

  private buildReminder(
    state: DbState,
    activity: ServiceActivity,
    offsetDays: ReminderOffsetDays,
  ): ReminderSchedule {
    const sendAt = new Date(`${activity.activityDate}T09:00:00`);
    sendAt.setDate(sendAt.getDate() - offsetDays);
    return {
      id: nextId('M', state.reminders),
      activityId: activity.id,
      offsetDays,
      sendAt: localIso(sendAt),
      sent: false,
      sentAt: null,
    };
  }

  // -------------------------------------------------------------- responses

  private ok(body: unknown): Observable<HttpEvent<unknown>> {
    return of(new HttpResponse({ status: 200, statusText: 'OK', body }));
  }

  private created(body: unknown): Observable<HttpEvent<unknown>> {
    return of(new HttpResponse({ status: 201, statusText: 'Created', body }));
  }

  private fail(status: number, code: ApiErrorCode, message: string): Observable<never> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status,
          statusText: code,
          error: { code, message },
        }),
    );
  }
}
