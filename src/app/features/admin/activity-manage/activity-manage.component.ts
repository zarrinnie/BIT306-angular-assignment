import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { ActivityStatus, ActivityView } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Use Case 1 — managing NGO availability.
 *
 * Lists every activity the company has registered, drafts included, and offers
 * the administrator the three operations the case study calls for: add, update
 * and remove. Removing an activity is confirmed first, because the back end
 * withdraws every participant and notifies them.
 */
@Component({
  selector: 'app-activity-manage',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-manage.component.html',
  styleUrl: './activity-manage.component.css',
})
export class ActivityManageComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly registrationService = inject(RegistrationService);
  private readonly toast = inject(ToastService);

  readonly loading = this.activityService.loading;
  readonly busy = this.activityService.saving;

  readonly searchTerm = signal('');
  readonly statusFilter = signal<ActivityStatus | 'all'>('all');
  readonly removing = signal<ActivityView | null>(null);

  readonly activities = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.activityService.activities().filter((activity) => {
      const matchesTerm =
        !term ||
        activity.activityTitle.toLowerCase().includes(term) ||
        activity.ngoName.toLowerCase().includes(term) ||
        activity.location.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || activity.status === status;
      return matchesTerm && matchesStatus;
    });
  });

  readonly counts = computed(() => {
    const activities = this.activityService.activities();
    return {
      all: activities.length,
      published: activities.filter((activity) => activity.status === 'published').length,
      draft: activities.filter((activity) => activity.status === 'draft').length,
      cancelled: activities.filter((activity) => activity.status === 'cancelled').length,
    };
  });

  ngOnInit(): void {
    this.activityService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.registrationService.loadAll().subscribe({ error: () => undefined });
  }

  /** How many employees would be affected if this activity were removed. */
  participantsOf(activityId: string): number {
    return this.registrationService
      .all()
      .filter(
        (registration) =>
          registration.activityId === activityId && registration.status !== 'withdrawn',
      ).length;
  }

  removalMessage(): string {
    const activity = this.removing();
    if (!activity) {
      return '';
    }
    const participants = this.participantsOf(activity.id);
    return participants === 0
      ? `"${activity.activityTitle}" will be removed from the dashboard. No employee has registered for it.`
      : `"${activity.activityTitle}" will be removed and all ${participants} registered employee(s) will be withdrawn and notified automatically.`;
  }

  confirmRemoval(): void {
    const activity = this.removing();
    if (!activity) {
      return;
    }

    this.activityService.remove(activity.id).subscribe({
      next: (result) => {
        this.removing.set(null);
        this.toast.success(
          result.notified > 0
            ? `"${activity.activityTitle}" was removed and ${result.notified} employee(s) were notified.`
            : `"${activity.activityTitle}" was removed.`,
        );
        this.registrationService.loadAll().subscribe({ error: () => undefined });
      },
      error: (error: unknown) => {
        this.removing.set(null);
        this.toast.error(apiErrorMessage(error, 'That activity could not be removed.'));
      },
    });
  }
}
