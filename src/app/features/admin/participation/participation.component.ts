import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { ActivityService } from '../../../core/services/activity.service';
import { AdminService } from '../../../core/services/admin.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { CheckInService } from '../../../core/services/check-in.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';

/** Which breakdown of the figures is on screen. */
type ParticipationTab = 'activity' | 'department' | 'employee';

/**
 * Use Case 4 — monitoring employee participation and slot utilisation.
 *
 * The same registration data is presented three ways: by activity (is any NGO
 * over- or under-subscribed?), by department (is participation balanced across
 * the company?) and by employee (who has not taken part at all?). All three
 * views are `computed` from one set of signals, so a registration made in
 * another browser tab is reflected in every table as soon as the figures are
 * reloaded.
 */
@Component({
  selector: 'app-participation',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participation.component.html',
  styleUrl: './participation.component.css',
})
export class ParticipationComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly registrationService = inject(RegistrationService);
  private readonly checkInService = inject(CheckInService);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly loading = this.registrationService.loading;
  readonly utilisation = this.activityService.utilisation;
  readonly byActivity = this.registrationService.participationByActivity;
  readonly byDepartment = this.registrationService.participationByDepartment;
  readonly attendanceReports = this.checkInService.attendanceReports;

  readonly tab = signal<ParticipationTab>('activity');

  /** Every employee with the activities they are registered for. */
  readonly byEmployee = computed(() => {
    const registrations = this.registrationService
      .all()
      .filter((registration) => registration.status !== 'withdrawn');
    const activities = this.activityService.activities();

    return this.adminService
      .employees()
      .map((employee) => {
        const theirs = registrations.filter(
          (registration) => registration.employeeId === employee.id,
        );
        return {
          employee,
          count: theirs.length,
          attended: theirs.filter((registration) => registration.checkInAt).length,
          activities: theirs
            .map(
              (registration) =>
                activities.find((activity) => activity.id === registration.activityId)
                  ?.activityTitle ?? 'Removed activity',
            )
            .sort((a, b) => a.localeCompare(b)),
        };
      })
      .sort((a, b) => b.count - a.count || a.employee.fullName.localeCompare(b.employee.fullName));
  });

  readonly summary = computed(() => {
    const registrations = this.registrationService
      .all()
      .filter((registration) => registration.status !== 'withdrawn');
    const participants = new Set(registrations.map((registration) => registration.employeeId));
    const employeeCount = this.adminService.employees().length;

    return {
      registrations: registrations.length,
      participants: participants.size,
      employeeCount,
      coverage:
        employeeCount === 0 ? 0 : Math.round((participants.size / employeeCount) * 100),
      averagePerParticipant:
        participants.size === 0
          ? '0.0'
          : (registrations.length / participants.size).toFixed(1),
      withdrawals: this.registrationService
        .all()
        .filter((registration) => registration.status === 'withdrawn').length,
    };
  });

  /** Employees who have not registered for anything yet. */
  readonly nonParticipants = computed(() =>
    this.byEmployee().filter((row) => row.count === 0),
  );

  ngOnInit(): void {
    this.activityService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.registrationService.loadAll().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.adminService.loadEmployees().subscribe({ error: () => undefined });
    this.checkInService.load().subscribe({ error: () => undefined });
  }

  setTab(tab: ParticipationTab): void {
    this.tab.set(tab);
  }
}
