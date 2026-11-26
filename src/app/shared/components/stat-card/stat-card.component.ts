import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Colour treatment of a figure, matching the badge tones used elsewhere. */
export type StatTone = 'neutral' | 'primary' | 'accent' | 'danger' | 'info';

/**
 * A single headline figure, used across the administrator's monitoring screens
 * (Use Case 4) and on the employee dashboard.
 */
@Component({
  selector: 'app-stat-card',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css',
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>('');
  readonly tone = input<StatTone>('neutral');
}
