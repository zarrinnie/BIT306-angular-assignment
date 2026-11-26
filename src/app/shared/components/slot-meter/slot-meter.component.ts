import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Horizontal bar showing how much of an activity's capacity has been taken.
 *
 * Built from two nested elements and a percentage width rather than an image,
 * so it scales with the card and stays readable at any size. The underlying
 * figures are also exposed as text for screen readers.
 */
@Component({
  selector: 'app-slot-meter',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slot-meter.component.html',
  styleUrl: './slot-meter.component.css',
})
export class SlotMeterComponent {
  readonly slotsTaken = input.required<number>();
  readonly maxEmployees = input.required<number>();
  /** Hides the figures above the bar when several meters sit in a table. */
  readonly compact = input(false);

  readonly fillRate = computed(() => {
    const max = this.maxEmployees();
    return max === 0 ? 0 : Math.min(100, Math.round((this.slotsTaken() / max) * 100));
  });

  readonly slotsRemaining = computed(() =>
    Math.max(0, this.maxEmployees() - this.slotsTaken()),
  );

  /** Blue while there is room, amber when nearly full, red when full. */
  readonly tone = computed(() => {
    if (this.slotsRemaining() === 0) {
      return 'full';
    }
    return this.fillRate() >= 80 ? 'tight' : 'open';
  });
}
