import { DurationPipe } from './duration.pipe';
import { TimeRemainingPipe } from './time-remaining.pipe';

/** Unit tests for the two shared pipes. */

const NOW = new Date('2026-11-10T12:00:00').getTime();

describe('TimeRemainingPipe', () => {
  const pipe = new TimeRemainingPipe();

  it('counts the days left before a cut-off', () => {
    expect(pipe.transform('2026-11-13T12:00:00', NOW)).toBe('Closes in 3 days');
  });

  it('switches to hours inside the last day', () => {
    expect(pipe.transform('2026-11-10T17:00:00', NOW)).toBe('Closes in 5 hours');
  });

  it('switches to minutes inside the last hour', () => {
    expect(pipe.transform('2026-11-10T12:20:00', NOW)).toBe('Closes in 20 minutes');
  });

  it('reports a cut-off that has already passed', () => {
    expect(pipe.transform('2026-11-05T17:00:00', NOW)).toBe('Closed 4 days ago');
  });

  it('returns nothing for a missing or unreadable date', () => {
    expect(pipe.transform(null, NOW)).toBe('');
    expect(pipe.transform('not a date', NOW)).toBe('');
  });
});

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('reports whole hours', () => {
    expect(pipe.transform('09:00', '13:00')).toBe('4 hours');
    expect(pipe.transform('09:00', '10:00')).toBe('1 hour');
  });

  it('reports hours and minutes', () => {
    expect(pipe.transform('08:00', '12:30')).toBe('4 h 30 min');
  });

  it('reports minutes alone for a short activity', () => {
    expect(pipe.transform('09:00', '09:45')).toBe('45 min');
  });

  it('returns nothing when the times are missing or reversed', () => {
    expect(pipe.transform('13:00', '09:00')).toBe('');
    expect(pipe.transform(null, '13:00')).toBe('');
  });
});
