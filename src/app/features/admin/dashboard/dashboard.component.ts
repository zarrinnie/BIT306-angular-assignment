import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { ActivityService } from '../../../core/services/activity.service';
import { AdminService } from '../../../core/services/admin.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { NotificationService } from '../../../core/services/notification.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Administrator overview — the monitoring half of Use Case 4.
 *
 * Three independent requests populate the page: the activities, every
 * registration, and the reminder schedule. Each arrives on its own and updates
 * its part of the screen, so the figures appear progressively instead of the
 * page waiting for the slowest response.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly registrationService = inject(RegistrationService);
  private readonly notificationService = inject(NotificationService);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly loading = this.activityService.loading;
  readonly activities = this.activityService.activities;
  readonly utilisation = this.activityService.utilisation;
  readonly participation = this.registrationService.participationByActivity;
  readonly dueReminders = this.notificationService.dueReminders;
  readonly resetting = this.adminService.busy;
  readonly confirmReset = signal(false);

  /** Activities that need the administrator's attention first. */
  readonly attention = computed(() => {
    const activities = this.activityService.activities();
    return {
      drafts: activities.filter((activity) => activity.status === 'draft'),
      full: activities.filter(
        (activity) => activity.status === 'published' && activity.availability.isFull,
      ),
      closingSoon: activities.filter(
        (activity) => activity.status === 'published' && activity.availability.isUrgent,
      ),
      underSubscribed: activities.filter(
        (activity) =>
          activity.status === 'published' &&
          !activity.availability.isClosed &&
          activity.availability.fillRate < 40,
      ),
    };
  });

  /** Hint lines beneath the headline figures, with correct singular wording. */
  readonly hints = computed(() => {
    const drafts = this.attention().drafts.length;
    const full = this.utilisation().fullActivities;
    const employees = this.participatingEmployees();
    return {
      drafts: `${drafts} awaiting approval`,
      full: full === 1 ? '1 activity is full' : `${full} activities are full`,
      employees: employees === 1 ? '1 employee registered' : `${employees} employees registered`,
    };
  });

  /** How many individual employees have taken at least one slot. */
  readonly participatingEmployees = computed(
    () =>
      new Set(
        this.registrationService
          .all()
          .filter((registration) => registration.status !== 'withdrawn')
          .map((registration) => registration.employeeId),
      ).size,
  );

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.activityService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.registrationService.loadAll().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.notificationService.loadReminders().subscribe({ error: () => undefined });
  }

  /** Puts the seeded demonstration data back, for a repeat walkthrough. */
  resetDemoData(): void {
    this.adminService.resetDemoData().subscribe({
      next: () => {
        this.confirmReset.set(false);
        this.toast.success('The demonstration data has been restored.');
        this.loadAll();
      },
      error: (error: unknown) => {
        this.confirmReset.set(false);
        this.toast.error(apiErrorMessage(error));
      },
    });
  }
}
