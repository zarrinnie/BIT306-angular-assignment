/**
 * MODEL — Notifications and scheduled reminders (Use Case 5).
 */

/** Why a message was generated, used for grouping and for the inbox icon. */
export type NotificationKind =
  | 'registration'
  | 'change'
  | 'withdrawal'
  | 'reminder'
  | 'broadcast'
  | 'urgent'
  | 'cancellation';

/** A message delivered to one employee, or to everyone when `recipientId` is `ALL`. */
export interface AppNotification {
  id: string;
  /** An employee id, or the literal `ALL` for a company-wide broadcast. */
  recipientId: string;
  recipientName?: string;
  activityId?: string | null;
  kind: NotificationKind;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

/** Supported reminder lead times, in days before the activity date. */
export type ReminderOffsetDays = 7 | 3 | 1;

/** Selectable lead times offered to the administrator. */
export const REMINDER_OFFSETS: readonly ReminderOffsetDays[] = [7, 3, 1];

/**
 * A reminder the administrator has scheduled for an activity. The dashboard
 * marks a schedule as *due* once `sendAt` has passed, and the administrator
 * releases it to every confirmed participant.
 */
export interface ReminderSchedule {
  id: string;
  activityId: string;
  offsetDays: ReminderOffsetDays;
  /** Computed as activity date minus `offsetDays`. */
  sendAt: string;
  sent: boolean;
  sentAt?: string | null;
}

/** A reminder joined to its activity and its current due state, for the admin view. */
export interface ReminderScheduleView extends ReminderSchedule {
  activityTitle: string;
  ngoName: string;
  activityDate: string;
  recipientCount: number;
  /** `sendAt` has passed and the reminder has not been released yet. */
  isDue: boolean;
}

/** Body of POST /api/notifications/broadcast. */
export interface BroadcastRequest {
  /** Target one activity's participants, or `null` for every employee. */
  activityId: string | null;
  subject: string;
  message: string;
  kind: NotificationKind;
}
