import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ActivityView } from '../../../core/models';

/**
 * One NGO opportunity, as shown on the employee dashboard (Use Case 2).
 *
 * A presentation-only component: it receives an activity and reports a click,
 * and holds no state and no business rules of its own. The same card can
 * therefore be reused anywhere a list of opportunities is needed.
 */
@Component({
  selector: 'app-activity-card',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-card.component.html',
  styleUrl: './activity-card.component.css',
})
export class ActivityCardComponent {
  readonly activity = input.required<ActivityView>();
  /** True when the signed-in employee already holds a slot on this activity. */
  readonly registered = input(false);
  /** True while a registration request for this activity is in flight. */
  readonly busy = input(false);

  readonly register = output<ActivityView>();

  /**
   * The NGO's initials, drawn in the card's mark. Derived here rather than in
   * the template so the view stays free of logic: up to two words, first
   * letter of each, upper case.
   */
  readonly monogram = computed(() =>
    this.activity()
      .ngoName.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join(''),
  );
}
