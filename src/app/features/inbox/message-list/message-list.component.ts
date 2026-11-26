import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { AppNotification, NotificationKind } from '../../../core/models';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';

/** Which messages the reader wants to see. */
type MessageFilter = 'all' | 'unread';

/**
 * The staff member's message inbox — the receiving end of Use Case 5.
 *
 * Confirmations, change notices, withdrawals, reminders and company-wide
 * broadcasts all arrive here. Marking a message as read is sent to the back end
 * and the unread counter in the masthead follows immediately, because both the
 * counter and this list read the same signal.
 */
@Component({
  selector: 'app-message-list',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.css',
})
export class MessageListComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = this.notificationService.loading;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly currentUser = this.auth.currentUser;

  readonly filter = signal<MessageFilter>('all');

  readonly messages = computed(() => {
    const messages = this.notificationService.notifications();
    return this.filter() === 'unread' ? messages.filter((item) => !item.read) : messages;
  });

  ngOnInit(): void {
    this.notificationService.loadMine().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }

  setFilter(filter: MessageFilter): void {
    this.filter.set(filter);
  }

  markRead(message: AppNotification): void {
    if (message.read) {
      return;
    }
    this.notificationService.markRead(message.id).subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }

  /** Badge wording for the kind of message. */
  kindLabel(kind: NotificationKind): string {
    const labels: Record<NotificationKind, string> = {
      registration: 'Registration',
      change: 'Change',
      withdrawal: 'Withdrawal',
      reminder: 'Reminder',
      broadcast: 'Announcement',
      urgent: 'Urgent',
      cancellation: 'Cancelled',
    };
    return labels[kind];
  }

  /** Badge tone for the kind of message. */
  kindTone(kind: NotificationKind): string {
    if (kind === 'urgent' || kind === 'cancellation') {
      return 'full';
    }
    if (kind === 'reminder') {
      return 'urgent';
    }
    if (kind === 'registration') {
      return 'open';
    }
    return 'info';
  }
}
