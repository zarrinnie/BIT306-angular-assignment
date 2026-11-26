import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { CheckInRecord } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { CheckInService } from '../../../core/services/check-in.service';

/**
 * The page a QR code opens (Use Case 6).
 *
 * The administrator displays a QR image that encodes
 * `/check-in/:activityId/:token`. An employee scanning it with a phone or
 * tablet lands here, sees which activity they are about to check in to, and
 * confirms. The back end then verifies the code and the employee's
 * registration before recording the arrival time.
 *
 * Confirmation is deliberately a separate step rather than automatic, so an
 * employee who scans the wrong code can back out, and so the recorded arrival
 * time is the moment they actually confirmed.
 */
@Component({
  selector: 'app-scan',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan.component.html',
  styleUrl: './scan.component.css',
})
export class ScanComponent {
  private readonly activityService = inject(ActivityService);
  private readonly checkInService = inject(CheckInService);
  private readonly auth = inject(AuthService);

  /** Both bound from the route: `/check-in/:activityId/:token`. */
  readonly activityId = input.required<string>();
  readonly token = input.required<string>();

  readonly busy = this.checkInService.saving;
  readonly currentUser = this.auth.currentUser;
  readonly record = signal<CheckInRecord | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly activity = computed(() =>
    this.activityService.activities().find((item) => item.id === this.activityId()),
  );

  constructor() {
    effect(() => {
      const id = this.activityId();
      if (!this.activity()) {
        this.activityService.loadOne(id).subscribe({
          error: () =>
            this.errorMessage.set(
              'That activity could not be found. Please ask the administrator for the current check-in code.',
            ),
        });
      }
    });
  }

  confirm(): void {
    this.errorMessage.set(null);

    this.checkInService
      .checkIn({
        activityId: this.activityId(),
        token: this.token(),
        employeeId: this.auth.requireUserId(),
      })
      .subscribe({
        next: (record) => this.record.set(record),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'The check-in could not be recorded.')),
      });
  }
}
