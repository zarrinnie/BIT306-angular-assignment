/**
 * MODEL — Employee registration for a Service Day activity (Use Case 3).
 */

/**
 * Life cycle of a registration. `withdrawn` rows are kept rather than deleted
 * so that the administrator's participation reports retain an audit trail.
 */
export type RegistrationStatus = 'confirmed' | 'withdrawn' | 'attended' | 'no-show';

/** A booking of one slot on one activity by one employee. */
export interface Registration {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  activityId: string;
  status: RegistrationStatus;
  registeredAt: string;
  updatedAt: string;
  /** Set when the employee checks in on the day via QR code (Use Case 6). */
  checkInAt?: string | null;
}

/** Body of POST /api/registrations. */
export interface RegistrationRequest {
  employeeId: string;
  activityId: string;
}

/**
 * Body of PUT /api/registrations/:id — moving an existing registration to a
 * different activity. The back end releases the old slot and takes the new one
 * in a single operation so that both slot counts stay correct.
 */
export interface RegistrationChangeRequest {
  activityId: string;
}

/** A registration joined to its activity, as shown on "My registrations". */
export interface RegistrationView extends Registration {
  activityTitle: string;
  ngoName: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  location: string;
  registrationCutOff: string;
  /** False once the cut-off has passed: the row becomes read-only. */
  canBeEdited: boolean;
}
