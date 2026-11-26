import { Pipe, PipeTransform } from '@angular/core';

/**
 * Turns a registration cut-off into plain language: "Closes in 3 days",
 * "Closes in 5 hours", or "Closed 2 days ago".
 *
 * A pipe is the right shape for this: it is pure, it keeps the arithmetic out
 * of the templates, and it is reused by the activity cards, the detail page and
 * the employee's registration list.
 */
@Pipe({ name: 'timeRemaining', standalone: false })
export class TimeRemainingPipe implements PipeTransform {
  transform(cutOff: string | null | undefined, reference: number = Date.now()): string {
    if (!cutOff) {
      return '';
    }

    const target = new Date(cutOff).getTime();
    if (Number.isNaN(target)) {
      return '';
    }

    const diffMs = target - reference;
    const past = diffMs <= 0;
    const minutes = Math.floor(Math.abs(diffMs) / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const amount =
      days >= 1
        ? `${days} day${days === 1 ? '' : 's'}`
        : hours >= 1
          ? `${hours} hour${hours === 1 ? '' : 's'}`
          : `${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'}`;

    return past ? `Closed ${amount} ago` : `Closes in ${amount}`;
  }
}
