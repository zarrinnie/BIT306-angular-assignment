/**
 * MODEL — QR code check-in on the day of the activity (Use Case 6).
 */

/** A single-use check-in code issued by the administrator for one activity. */
export interface QrToken {
  activityId: string;
  token: string;
  issuedAt: string;
  /** The URL encoded into the QR image; opening it checks the employee in. */
  checkInUrl: string;
}

/** Proof that an employee arrived, with the time recorded by the system. */
export interface CheckInRecord {
  id: string;
  activityId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  arrivalTime: string;
  method: 'qr' | 'manual';
}

/** Body of POST /api/check-ins. */
export interface CheckInRequest {
  activityId: string;
  token: string;
  employeeId: string;
  /**
   * `qr` when the employee scanned the code themselves, `manual` when an
   * administrator checked them in at the venue desk. Defaults to `qr`.
   */
  method?: 'qr' | 'manual';
}

/** A check-in joined to its activity, for the live attendance board. */
export interface CheckInView extends CheckInRecord {
  activityTitle: string;
  ngoName: string;
}

/** Post-event attendance summary for one activity. */
export interface AttendanceReport {
  activityId: string;
  activityTitle: string;
  ngoName: string;
  activityDate: string;
  registeredCount: number;
  checkedInCount: number;
  noShowCount: number;
  /** Checked in as a percentage of confirmed registrations, 0-100. */
  attendanceRate: number;
}
