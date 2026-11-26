import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a start and finish time as a length: `09:00`, `13:00` becomes
 * "4 hours". Used on the activity cards so an employee can judge the time
 * commitment without doing the subtraction themselves.
 */
@Pipe({ name: 'duration', standalone: false })
export class DurationPipe implements PipeTransform {
  transform(startTime: string | null | undefined, endTime: string | null | undefined): string {
    if (!startTime || !endTime) {
      return '';
    }

    const minutes = this.toMinutes(endTime) - this.toMinutes(startTime);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return '';
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours === 0) {
      return `${remainder} min`;
    }
    if (remainder === 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    return `${hours} h ${remainder} min`;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes ?? 0);
  }
}
