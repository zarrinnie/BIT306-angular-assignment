import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { RegistrationView } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * "My registrations" — the editing half of Use Case 3.
 *
 * An employee may move to another activity or withdraw entirely, but only
 * until the cut-off date and time of the activity they currently hold. Both
 * actions are single requests to the back end, which releases one slot and
 * takes the other in the same operation so the two counters can never disagree.
 */
@Component({
  selector: 'app-my-registrations',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-registrations.component.html',
  styleUrl: './my-registrations.component.css',
})
export class MyRegistrationsComponent implements OnInit {
  private readonly registrationService = inject(RegistrationService);
  private readonly activityService = inject(ActivityService);
  private readonly toast = inject(ToastService);

  readonly loading = this.registrationService.loading;
  readonly busy = this.registrationService.saving;

  readonly registrations = this.registrationService.mine;

  /** The registration whose "change activity" panel is open. */
  readonly changingId = signal<string | null>(null);
  /** The activity chosen in that panel. */
  readonly replacementId = signal<string>('');
  /** The registration awaiting withdrawal confirmation. */
  readonly withdrawing = signal<RegistrationView | null>(null);

  readonly summary = computed(() => {
    const registrations = this.registrations();
    return {
      total: registrations.length,
      editable: registrations.filter((item) => item.canBeEdited).length,
      attended: registrations.filter((item) => item.status === 'attended').length,
    };
  });

  /**
   * Activities the employee could move to: open for registration and not one
   * they already hold.
   */
  readonly alternatives = computed(() => {
    const taken = new Set(this.registrations().map((item) => item.activityId));
    return this.activityService
      .openForRegistration()
      .filter((activity) => !taken.has(activity.id));
  });

  ngOnInit(): void {
    this.activityService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.registrationService.loadMine().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }

  startChange(registration: RegistrationView): void {
    this.changingId.set(registration.id);
    this.replacementId.set('');
  }

  cancelChange(): void {
    this.changingId.set(null);
    this.replacementId.set('');
  }

  /** Moves the booking to the chosen activity. */
  confirmChange(registration: RegistrationView): void {
    const target = this.replacementId();
    if (!target) {
      this.toast.info('Choose the activity you would like to move to.');
      return;
    }

    this.registrationService.changeActivity(registration.id, target).subscribe({
      next: () => {
        this.cancelChange();
        this.toast.success(
          'Your registration has been moved. Both activities now show their updated slot counts.',
        );
      },
      error: (error: unknown) =>
        this.toast.error(apiErrorMessage(error, 'That change could not be completed.')),
    });
  }

  withdraw(): void {
    const registration = this.withdrawing();
    if (!registration) {
      return;
    }

    this.registrationService.withdraw(registration.id).subscribe({
      next: () => {
        this.withdrawing.set(null);
        this.toast.success(
          `You have withdrawn from "${registration.activityTitle}". The slot is available to other employees again.`,
        );
      },
      error: (error: unknown) => {
        this.withdrawing.set(null);
        this.toast.error(apiErrorMessage(error, 'That withdrawal could not be completed.'));
      },
    });
  }

  /** Badge wording for a registration's status. */
  statusLabel(registration: RegistrationView): string {
    switch (registration.status) {
      case 'attended':
        return 'Attended';
      case 'no-show':
        return 'Did not attend';
      case 'withdrawn':
        return 'Withdrawn';
      default:
        return 'Confirmed';
    }
  }

  statusTone(registration: RegistrationView): string {
    switch (registration.status) {
      case 'attended':
        return 'open';
      case 'no-show':
        return 'full';
      case 'withdrawn':
        return 'closed';
      default:
        return 'info';
    }
  }
}
