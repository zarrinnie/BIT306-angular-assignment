import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import {
  NotificationKind,
  REMINDER_OFFSETS,
  ReminderOffsetDays,
  ReminderScheduleView,
} from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { NotificationService } from '../../../core/services/notification.service';
import { formatDate, formatDateTime } from '../../../core/utils/date-format';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Use Case 5 — notifications and reminders.
 *
 * The screen has three parts: the reminder schedule (one week, three days and
 * one day before each activity, as the case study specifies), a composer for
 * broadcasting an announcement or an urgent "last slots" message, and a log of
 * everything the system has sent.
 *
 * A front-end prototype has no background process that could send mail on a
 * timer, so a reminder becomes *due* on its date and the administrator
 * releases it. That keeps the scheduling rules visible and testable.
 */
@Component({
  selector: 'app-admin-notifications',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly activityService = inject(ActivityService);
  private readonly toast = inject(ToastService);

  readonly offsets = REMINDER_OFFSETS;
  readonly saving = this.notificationService.saving;
  readonly loading = this.notificationService.loading;
  readonly reminders = this.notificationService.reminders;
  readonly dueReminders = this.notificationService.dueReminders;
  readonly messages = this.notificationService.notifications;
  readonly activities = this.activityService.published;

  readonly releasingId = signal<string | null>(null);
  readonly removing = signal<ReminderScheduleView | null>(null);

  /** Composer for an announcement or an urgent update. */
  readonly broadcastForm = this.formBuilder.nonNullable.group({
    activityId: [''],
    kind: ['broadcast', [Validators.required]],
    subject: ['', [Validators.required, Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(20)]],
  });

  /** Form for adding a reminder to the schedule. */
  readonly reminderForm = this.formBuilder.nonNullable.group({
    activityId: ['', [Validators.required]],
    offsetDays: [7, [Validators.required]],
  });

  readonly scheduleSummary = computed(() => {
    const reminders = this.reminders();
    return {
      total: reminders.length,
      due: reminders.filter((reminder) => reminder.isDue).length,
      sent: reminders.filter((reminder) => reminder.sent).length,
      pending: reminders.filter((reminder) => !reminder.sent && !reminder.isDue).length,
    };
  });

  ngOnInit(): void {
    this.activityService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.notificationService.loadReminders().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    // The administrator's log shows every message the system has produced.
    this.notificationService.loadAll().subscribe({ error: () => undefined });
  }

  /** Sends a due reminder to every confirmed participant of its activity. */
  release(reminder: ReminderScheduleView): void {
    this.releasingId.set(reminder.id);

    this.notificationService.releaseReminder(reminder.id).subscribe({
      next: (result) => {
        this.releasingId.set(null);
        this.toast.success(
          `Reminder sent to ${result.delivered} employee(s) registered for "${reminder.activityTitle}".`,
        );
        this.notificationService.loadAll().subscribe({ error: () => undefined });
      },
      error: (error: unknown) => {
        this.releasingId.set(null);
        this.toast.error(apiErrorMessage(error, 'That reminder could not be sent.'));
      },
    });
  }

  addReminder(): void {
    if (this.reminderForm.invalid) {
      this.reminderForm.markAllAsTouched();
      return;
    }

    const { activityId, offsetDays } = this.reminderForm.getRawValue();
    this.notificationService
      .scheduleReminder(activityId, Number(offsetDays) as ReminderOffsetDays)
      .subscribe({
        next: () => {
          this.toast.success('The reminder has been added to the schedule.');
          this.reminderForm.patchValue({ activityId: '' });
        },
        error: (error: unknown) =>
          this.toast.error(apiErrorMessage(error, 'That reminder could not be scheduled.')),
      });
  }

  confirmRemoveReminder(): void {
    const reminder = this.removing();
    if (!reminder) {
      return;
    }

    this.notificationService.deleteReminder(reminder.id).subscribe({
      next: () => {
        this.removing.set(null);
        this.toast.success('The reminder has been removed from the schedule.');
      },
      error: (error: unknown) => {
        this.removing.set(null);
        this.toast.error(apiErrorMessage(error));
      },
    });
  }

  /** Broadcasts to one activity's participants, or to every employee. */
  sendBroadcast(): void {
    if (this.broadcastForm.invalid) {
      this.broadcastForm.markAllAsTouched();
      return;
    }

    const value = this.broadcastForm.getRawValue();
    this.notificationService
      .broadcast({
        activityId: value.activityId || null,
        kind: value.kind as NotificationKind,
        subject: value.subject,
        message: value.message,
      })
      .subscribe({
        next: (result) => {
          this.toast.success(`Message delivered to ${result.delivered} employee(s).`);
          this.broadcastForm.patchValue({ subject: '', message: '' });
          this.notificationService.loadAll().subscribe({ error: () => undefined });
        },
        error: (error: unknown) =>
          this.toast.error(apiErrorMessage(error, 'That message could not be sent.')),
      });
  }

  /** Pre-fills the composer with an urgent "last slots" message. */
  prefillLastSlots(): void {
    const urgent = this.activities().find((activity) => activity.availability.isUrgent);
    if (!urgent) {
      this.toast.info('No activity is down to its last few slots at the moment.');
      return;
    }

    this.broadcastForm.setValue({
      activityId: '',
      kind: 'urgent',
      subject: `Last slots: ${urgent.activityTitle}`,
      message:
        `Only ${urgent.availability.slotsRemaining} slot(s) remain for "${urgent.activityTitle}" with ` +
        `${urgent.ngoName} on ${formatDate(urgent.activityDate)} at ${urgent.location}. ` +
        `Registration closes on ${formatDateTime(urgent.registrationCutOff)}.`,
    });
  }

  reminderStatus(reminder: ReminderScheduleView): { label: string; tone: string } {
    if (reminder.sent) {
      return { label: 'Sent', tone: 'open' };
    }
    return reminder.isDue ? { label: 'Due now', tone: 'urgent' } : { label: 'Scheduled', tone: 'info' };
  }
}
