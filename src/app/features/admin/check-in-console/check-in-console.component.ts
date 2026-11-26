import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, interval, switchMap } from 'rxjs';
import { toDataURL } from 'qrcode';

import { buildAttendanceReport } from '../../../core/services/check-in.service';
import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { CheckInService } from '../../../core/services/check-in.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';

/** How often the live arrivals board re-reads the check-ins. */
const POLL_INTERVAL_MS = 10_000;

/**
 * Use Case 6 — QR check-in, administrator side.
 *
 * The administrator picks an activity and asks the back end for a check-in
 * code. The code is rendered as a QR image with the `qrcode` package, encoding
 * the address `/check-in/:activityId/:token`; an employee scanning it with a
 * phone lands on the check-in page and confirms their arrival.
 *
 * The board below refreshes itself every ten seconds. The poll uses
 * `interval` with `switchMap`, so a slow response can never overtake a newer
 * one, and `takeUntilDestroyed` stops it when the page is left.
 */
@Component({
  selector: 'app-check-in-console',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './check-in-console.component.html',
  styleUrl: './check-in-console.component.css',
})
export class CheckInConsoleComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly checkInService = inject(CheckInService);
  private readonly registrationService = inject(RegistrationService);
  private readonly toast = inject(ToastService);

  /** Optional `?activityId=` so the activity list can link straight here. */
  readonly activityId = input<string>();

  readonly busy = this.checkInService.saving;
  readonly checkIns = this.checkInService.checkIns;
  readonly stillExpected = this.checkInService.stillExpected;
  readonly activities = this.activityService.activities;
  readonly reports = this.checkInService.attendanceReports;

  readonly selectedId = signal<string>('');
  readonly qrImage = signal<string | null>(null);
  readonly qrError = signal<string | null>(null);
  /** Employee chosen for a desk check-in. */
  readonly deskEmployeeId = signal<string>('');
  readonly livePolling = signal(true);

  readonly selectedActivity = computed(() =>
    this.activities().find((activity) => activity.id === this.selectedId()),
  );

  readonly token = computed(() => {
    const id = this.selectedId();
    return id ? this.checkInService.tokenFor(id) : undefined;
  });

  /** Arrivals at the selected activity, newest first. */
  readonly arrivals = computed(() => {
    const id = this.selectedId();
    return id ? this.checkIns().filter((record) => record.activityId === id) : this.checkIns();
  });

  /** Attendance figures for the selected activity. */
  readonly report = computed(() => {
    const activity = this.selectedActivity();
    if (!activity) {
      return null;
    }
    return buildAttendanceReport(activity, this.checkInService.expected(), this.checkIns());
  });

  constructor() {
    // Honour `?activityId=`, otherwise start on the first activity available.
    effect(() => {
      const requested = this.activityId();
      if (requested && this.selectedId() !== requested) {
        this.selectedId.set(requested);
      } else if (!this.selectedId() && this.activities().length > 0) {
        this.selectedId.set(this.activities()[0].id);
      }
    });

    // Whenever the chosen activity changes, read who is expected there.
    effect(() => {
      const id = this.selectedId();
      if (!id) {
        return;
      }
      this.qrImage.set(null);
      this.deskEmployeeId.set('');
      this.checkInService.loadExpected(id).subscribe({ error: () => undefined });
    });

    // The live board: a quiet refresh every ten seconds while enabled.
    interval(POLL_INTERVAL_MS)
      .pipe(
        // Paused by the switch above the board.
        filter(() => this.livePolling()),
        // switchMap drops an in-flight read when the next tick arrives, so a
        // slow response can never overwrite a newer one.
        switchMap(() => this.checkInService.refreshQuietly()),
        takeUntilDestroyed(),
      )
      .subscribe({ error: () => undefined });
  }

  ngOnInit(): void {
    this.activityService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.checkInService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.registrationService.loadAll().subscribe({ error: () => undefined });
  }

  select(activityId: string): void {
    this.selectedId.set(activityId);
  }

  /** Issues a code for the activity and renders it as a QR image. */
  generateCode(): void {
    const activity = this.selectedActivity();
    if (!activity) {
      return;
    }

    this.qrError.set(null);
    this.checkInService.issueToken(activity.id).subscribe({
      next: (token) => {
        toDataURL(token.checkInUrl, { width: 320, margin: 2 })
          .then((dataUrl) => this.qrImage.set(dataUrl))
          .catch(() => this.qrError.set('The QR image could not be generated in this browser.'));
        this.toast.success(`Check-in code issued for "${activity.activityTitle}".`);
      },
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }

  /** Copies the check-in address, for pasting into a phone or a tablet. */
  copyLink(): void {
    const url = this.token()?.checkInUrl;
    if (!url) {
      return;
    }
    navigator.clipboard
      ?.writeText(url)
      .then(() => this.toast.info('The check-in address has been copied to the clipboard.'))
      .catch(() => this.toast.error('The address could not be copied. Please select it manually.'));
  }

  /**
   * Desk check-in: the administrator records an arrival at the venue for an
   * employee who cannot scan the code themselves.
   */
  deskCheckIn(): void {
    const activity = this.selectedActivity();
    const employeeId = this.deskEmployeeId();
    const token = this.token();

    if (!activity || !employeeId) {
      this.toast.info('Choose the employee who has arrived.');
      return;
    }
    if (!token) {
      this.toast.info('Generate the check-in code for this activity first.');
      return;
    }

    this.checkInService
      .checkIn({
        activityId: activity.id,
        token: token.token,
        employeeId,
        method: 'manual',
      })
      .subscribe({
        next: (record) => {
          this.deskEmployeeId.set('');
          this.toast.success(`${record.employeeName} checked in at ${record.arrivalTime.slice(11)}.`);
          this.checkInService.loadExpected(activity.id).subscribe({ error: () => undefined });
        },
        error: (error: unknown) =>
          this.toast.error(apiErrorMessage(error, 'That check-in could not be recorded.')),
      });
  }

  /** Reads the arrivals again straight away. */
  refreshNow(): void {
    this.checkInService.refreshQuietly().subscribe({
      next: () => this.toast.info('The arrivals board has been refreshed.'),
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }
}
