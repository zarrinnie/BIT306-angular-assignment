import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { ActivityView, SERVICE_TYPES } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { apiErrorMessage } from '../../../core/services/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { ToastService } from '../../../core/services/toast.service';

/** Availability filter offered above the list. */
type AvailabilityFilter = 'all' | 'open' | 'urgent' | 'mine';

/**
 * Employee dashboard: every approved Service Day opportunity (Use Case 2),
 * with one-click registration (Use Case 3).
 *
 * The component holds only what belongs to the screen — the three filter
 * values — and derives everything else with `computed`, from the activity and
 * registration services. Because those are signals, a successful registration
 * moves the slot counter, the badge and the summary figures at once, with no
 * page reload and no manual refresh.
 */
@Component({
  selector: 'app-activity-list',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-list.component.html',
  styleUrl: './activity-list.component.css',
})
export class ActivityListComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly registrationService = inject(RegistrationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly serviceTypes = SERVICE_TYPES;
  readonly loading = this.activityService.loading;
  readonly error = this.activityService.error;
  readonly currentUser = this.auth.currentUser;

  /** The four choices offered by the segmented availability control. */
  readonly availabilityOptions: ReadonlyArray<{ value: AvailabilityFilter; label: string }> = [
    { value: 'all', label: 'Everything' },
    { value: 'open', label: 'Open' },
    { value: 'urgent', label: 'Last few slots' },
    { value: 'mine', label: 'Only mine' },
  ];

  /** Filter state owned by this screen. */
  readonly searchTerm = signal('');
  readonly serviceType = signal<string>('');
  readonly availability = signal<AvailabilityFilter>('all');

  /** The activity whose registration request is currently in flight. */
  readonly pendingActivityId = signal<string | null>(null);

  readonly myRegistrations = this.registrationService.mine;

  /** Approved activities narrowed down by the three filters. */
  readonly visibleActivities = computed<ActivityView[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const type = this.serviceType();
    const availability = this.availability();
    const registeredIds = new Set(this.myRegistrations().map((item) => item.activityId));

    const matching = this.activityService.published().filter((activity) => {
      const matchesTerm =
        !term ||
        activity.activityTitle.toLowerCase().includes(term) ||
        activity.ngoName.toLowerCase().includes(term) ||
        activity.location.toLowerCase().includes(term) ||
        activity.description.toLowerCase().includes(term);

      const matchesType = !type || activity.serviceType === type;

      const matchesAvailability =
        availability === 'all'
          ? true
          : availability === 'open'
            ? activity.availability.isOpenForRegistration
            : availability === 'urgent'
              ? activity.availability.isUrgent
              : registeredIds.has(activity.id);

      return matchesTerm && matchesType && matchesAvailability;
    });

    // Activities an employee can still join come first; everything that has
    // closed or filled up is moved to the end, each group by date.
    return [...matching].sort((a, b) => {
      const aOpen = a.availability.isOpenForRegistration ? 0 : 1;
      const bOpen = b.availability.isOpenForRegistration ? 0 : 1;
      return aOpen - bOpen || a.activityDate.localeCompare(b.activityDate);
    });
  });

  /** Headline figures shown above the list. */
  readonly summary = computed(() => {
    const published = this.activityService.published();
    const open = published.filter((activity) => activity.availability.isOpenForRegistration);
    return {
      totalCount: published.length,
      openCount: open.length,
      slotsRemaining: open.reduce(
        (total, activity) => total + activity.availability.slotsRemaining,
        0,
      ),
      myCount: this.registrationService.myConfirmedCount(),
      closingSoon: open.filter((activity) => activity.availability.isUrgent).length,
    };
  });

  /**
   * The span of the Service Day programme: the first and last activity date
   * across everything published. Shown in the summary panel, so the figures
   * are never hard-coded into the template.
   */
  readonly serviceWindow = computed(() => {
    const dates = this.activityService
      .published()
      .map((activity) => activity.activityDate)
      .sort((a, b) => a.localeCompare(b));

    return dates.length === 0 ? null : { from: dates[0], to: dates[dates.length - 1] };
  });

  /** How full the whole programme is, as a percentage of the slots offered. */
  readonly overallFillRate = computed(() => {
    const published = this.activityService.published();
    const offered = published.reduce((total, activity) => total + activity.maxEmployees, 0);
    const taken = published.reduce((total, activity) => total + activity.slotsTaken, 0);
    return offered === 0 ? 0 : Math.round((taken / offered) * 100);
  });

  readonly hasFilters = computed(
    () => Boolean(this.searchTerm() || this.serviceType()) || this.availability() !== 'all',
  );

  ngOnInit(): void {
    // Two independent requests, each updating the page as it arrives.
    this.activityService.load().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
    this.registrationService.loadMine().subscribe({
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }

  /** True when the signed-in employee already holds a slot on this activity. */
  isRegistered(activityId: string): boolean {
    return this.myRegistrations().some((item) => item.activityId === activityId);
  }

  /** Segmented control: one choice at a time, so a plain setter is enough. */
  setAvailability(value: AvailabilityFilter): void {
    this.availability.set(value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.serviceType.set('');
    this.availability.set('all');
  }

  /**
   * Use Case 3 — takes a slot. The decision belongs to the back end, so the
   * component simply reports whatever answer comes back.
   */
  register(activity: ActivityView): void {
    this.pendingActivityId.set(activity.id);

    this.registrationService.register(activity.id).subscribe({
      next: () => {
        this.pendingActivityId.set(null);
        this.toast.success(
          `You are registered for "${activity.activityTitle}". A confirmation message is in your inbox.`,
        );
      },
      error: (error: unknown) => {
        this.pendingActivityId.set(null);
        this.toast.error(apiErrorMessage(error, 'That registration could not be completed.'));
        // Re-read the activity so the user sees the real slot count.
        this.activityService.loadOne(activity.id).subscribe({ error: () => undefined });
      },
    });
  }
}
