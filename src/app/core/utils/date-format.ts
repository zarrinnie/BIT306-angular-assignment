/**
 * Date formatting for strings that are built outside a template.
 *
 * Inside templates Angular's `DatePipe` does this job. These helpers exist for
 * the places where a date has to be embedded in a sentence — a validation
 * message from the simulated back end, or the reason a registration was
 * refused — so that a stored `2026-12-01T17:00:00` is never shown to a user
 * in its raw form.
 */

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

/** `2026-12-01T17:00:00` becomes `1 Dec 2026 at 17:00`. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleDateString('en-GB', DATE_OPTIONS)} at ${date.toLocaleTimeString('en-GB', TIME_OPTIONS)}`;
}

/** `2026-12-01` becomes `1 Dec 2026`. */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-GB', DATE_OPTIONS);
}
