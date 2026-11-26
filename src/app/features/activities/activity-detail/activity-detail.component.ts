import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { formatDateTime } from '../../../core/utils/date-format';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Full details of one Service Day activity, with the actions an employee is
 * allowed to take on it (Use Cases 2 and 3).
 *
 * The activity id arrives as a component input, bound from the route
 * parameter. Whether the register, withdraw or change action is offered is
 * derived from the activity's availability and from the employee's own
 * registration, so the page never offers an action the back end would refuse.
 */
@Component({
  selector: 'app-activity-detail',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-detail.component.html',
  styleUrl: './activity-detail.component.css',
})
export class ActivityDetailComponent {
  private readonly activityService = inject(ActivityService);
  private readonly registrationService = inject(RegistrationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  readonly isAdministrator = this.auth.isAdministrator;
  readonly busy = this.registrationService.saving;
  readonly notFound = signal(false);
  readonly confirmWithdraw = signal(false);

  /** The activity itself, read straight out of the service's signal. */
  readonly activity = computed(() =>
    this.activityService.activities().find((item) => item.id === this.id()),
  );

  /** The signed-in employee's live registration for this activity, if any. */
  readonly myRegistration = computed(() =>
    this.registrationService.mine().find((item) => item.activityId === this.id()),
  );

  /** One sentence explaining why registration is not possible, if it is not. */
  readonly refusalReason = computed(() => {
    const activity = this.activity();
    if (!activity) {
      return null;
    }
    if (activity.status === 'draft') {
      return 'This activity is still awaiting approval and is not open for registration yet.';
    }
    if (activity.availability.isClosed) {
      return `Registration closed on ${formatDateTime(activity.registrationCutOff)}.`;
    }
    if (activity.availability.isFull) {
      return `All ${activity.maxEmployees} slots have been taken. Choose another activity, or check back in case somebody withdraws.`;
    }
    return null;
  });

  constructor() {
    // Opening the page by its address, with nothing loaded yet, fetches just
    // this one activity — and the employee's own registrations alongside it.
    effect(() => {
      const id = this.id();
      if (!this.activity()) {
        this.activityService.loadOne(id).subscribe({
          error: () => this.notFound.set(true),
        });
      }
    });

    effect(() => {
      if (this.auth.isSignedIn() && this.registrationService.mine().length === 0) {
        this.registrationService.loadMine().subscribe({ error: () => undefined });
      }
    });
  }

  register(): void {
    const activity = this.activity();
    if (!activity) {
      return;
    }

    this.registrationService.register(activity.id).subscribe({
      next: () =>
        this.toast.success(
          `You are registered for "${activity.activityTitle}". A confirmation message is in your inbox.`,
        ),
      error: (error: unknown) =>
        this.toast.error(apiErrorMessage(error, 'That registration could not be completed.')),
    });
  }

  withdraw(): void {
    const registration = this.myRegistration();
    const activity = this.activity();
    if (!registration || !activity) {
      return;
    }

    this.registrationService.withdraw(registration.id).subscribe({
      next: () => {
        this.confirmWithdraw.set(false);
        this.toast.success(
          `You have withdrawn from "${activity.activityTitle}" and the slot is back in the pool.`,
        );
      },
      error: (error: unknown) => {
        this.confirmWithdraw.set(false);
        this.toast.error(apiErrorMessage(error, 'That withdrawal could not be completed.'));
      },
    });
  }
}
