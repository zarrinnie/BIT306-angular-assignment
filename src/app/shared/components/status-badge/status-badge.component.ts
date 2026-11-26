import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ActivityView } from '../../../core/models';

/**
 * Translates an activity's derived availability into one short label.
 *
 * The decision sits in this component rather than in each template, so that
 * "Full", "Closed" and "Last slots" always mean the same thing everywhere.
 */
@Component({
  selector: 'app-status-badge',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge-' + state().tone">{{ state().label }}</span>`,
})
export class StatusBadgeComponent {
  readonly activity = input.required<ActivityView>();

  readonly state = computed(() => {
    const activity = this.activity();

    if (activity.status === 'draft') {
      return { tone: 'info', label: 'Awaiting approval' };
    }
    if (activity.status === 'cancelled') {
      return { tone: 'closed', label: 'Cancelled' };
    }
    if (activity.availability.isFull) {
      return { tone: 'full', label: 'Full' };
    }
    if (activity.availability.isClosed) {
      return { tone: 'closed', label: 'Registration closed' };
    }
    if (activity.availability.isUrgent) {
      return {
        tone: 'urgent',
        label: `Last ${activity.availability.slotsRemaining} slot${activity.availability.slotsRemaining === 1 ? '' : 's'}`,
      };
    }
    return { tone: 'open', label: 'Open' };
  });
}
