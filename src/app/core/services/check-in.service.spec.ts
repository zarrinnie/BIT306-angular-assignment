import { buildAttendanceReport } from './check-in.service';
import { CheckInRecord, Registration, ServiceActivity } from '../models';

/**
 * Unit tests for the post-event attendance figures (Use Case 6).
 */

const ACTIVITY: ServiceActivity = {
  id: 'A000',
  ngoName: 'Clean Shores Society',
  activityTitle: 'Beach Clean-Up',
  serviceType: 'Environment',
  description: 'Collect and sort marine debris.',
  location: 'Port Dickson',
  activityDate: '2026-10-24',
  startTime: '08:00',
  endTime: '12:30',
  maxEmployees: 20,
  slotsTaken: 4,
  registrationCutOff: '2026-10-20T17:00:00',
  contactPerson: 'Ms. Rohani',
  contactEmail: 'rohani@example.org',
  status: 'published',
  createdAt: '2026-09-01T10:00:00',
  updatedAt: '2026-09-01T10:00:00',
};

function registration(id: string, overrides: Partial<Registration> = {}): Registration {
  return {
    id,
    employeeId: `U${id}`,
    employeeName: `Employee ${id}`,
    department: 'Operations',
    activityId: 'A000',
    status: 'confirmed',
    registeredAt: '2026-10-05T09:00:00',
    updatedAt: '2026-10-05T09:00:00',
    checkInAt: null,
    ...overrides,
  };
}

function checkIn(id: string): CheckInRecord {
  return {
    id,
    activityId: 'A000',
    employeeId: `U${id}`,
    employeeName: `Employee ${id}`,
    department: 'Operations',
    arrivalTime: '2026-10-24T08:05:00',
    method: 'qr',
  };
}

describe('buildAttendanceReport', () => {
  it('counts arrivals against registrations and reports the rate', () => {
    const report = buildAttendanceReport(
      ACTIVITY,
      [registration('1'), registration('2'), registration('3'), registration('4')],
      [checkIn('1'), checkIn('2'), checkIn('3')],
    );

    expect(report.registeredCount).toBe(4);
    expect(report.checkedInCount).toBe(3);
    expect(report.noShowCount).toBe(1);
    expect(report.attendanceRate).toBe(75);
  });

  it('ignores employees who withdrew before the activity', () => {
    const report = buildAttendanceReport(
      ACTIVITY,
      [registration('1'), registration('2', { status: 'withdrawn' })],
      [checkIn('1')],
    );

    expect(report.registeredCount).toBe(1);
    expect(report.attendanceRate).toBe(100);
    expect(report.noShowCount).toBe(0);
  });

  it('ignores check-ins belonging to a different activity', () => {
    const report = buildAttendanceReport(
      ACTIVITY,
      [registration('1')],
      [{ ...checkIn('9'), activityId: 'A001' }],
    );

    expect(report.checkedInCount).toBe(0);
    expect(report.noShowCount).toBe(1);
    expect(report.attendanceRate).toBe(0);
  });

  it('reports nothing rather than dividing by zero when nobody registered', () => {
    const report = buildAttendanceReport(ACTIVITY, [], []);

    expect(report.registeredCount).toBe(0);
    expect(report.attendanceRate).toBe(0);
  });
});
