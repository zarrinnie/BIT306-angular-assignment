/**
 * MODEL — Service Day activity (an NGO opportunity offered to employees).
 * Mirrors the attributes required by Use Case 1 of the case study: date, time,
 * service type, location, description, maximum number of employees and the
 * cut-off date/time for employee registration.
 */

/** Categories of volunteering work offered by the participating NGOs. */
export type ServiceType =
  | 'Education'
  | 'Environment'
  | 'Elderly Care'
  | 'Food Security'
  | 'Animal Welfare'
  | 'Healthcare'
  | 'Community Building';

/** Selectable service types, used to populate filters and form drop-downs. */
export const SERVICE_TYPES: readonly ServiceType[] = [
  'Education',
  'Environment',
  'Elderly Care',
  'Food Security',
  'Animal Welfare',
  'Healthcare',
  'Community Building',
];

/**
 * Publication state. Only `published` activities are visible to employees,
 * which satisfies the Use Case 1 requirement that "only verified and approved
 * NGO activities are available for employee registration".
 */
export type ActivityStatus = 'draft' | 'published' | 'cancelled';

/** A single Service Day activity hosted by an NGO. */
export interface ServiceActivity {
  id: string;
  ngoName: string;
  activityTitle: string;
  serviceType: ServiceType;
  description: string;
  location: string;
  /** Calendar date of the activity, ISO `yyyy-mm-dd`. */
  activityDate: string;
  /** 24-hour `HH:mm`. */
  startTime: string;
  /** 24-hour `HH:mm`. */
  endTime: string;
  maxEmployees: number;
  /** Maintained by the back end only; the client never increments it locally. */
  slotsTaken: number;
  /** ISO date-time after which registrations, changes and withdrawals close. */
  registrationCutOff: string;
  contactPerson: string;
  contactEmail: string;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * The editable subset of an activity, used by the administrator's create and
 * update forms. Server-maintained fields are deliberately excluded.
 */
export type ActivityDraft = Omit<
  ServiceActivity,
  'id' | 'slotsTaken' | 'createdAt' | 'updatedAt'
>;

/**
 * Derived availability of an activity. Computed in the service layer from a
 * `ServiceActivity` so that templates only ever read ready-made values.
 */
export interface ActivityAvailability {
  slotsRemaining: number;
  /** All slots are taken. */
  isFull: boolean;
  /** The registration cut-off date/time has passed. */
  isClosed: boolean;
  /** Open, but three or fewer slots remain — drives the "last slots" badge. */
  isUrgent: boolean;
  /** Percentage of offered slots that have been taken, 0-100. */
  fillRate: number;
  /** True when an employee may still register, change or withdraw. */
  isOpenForRegistration: boolean;
}

/** An activity together with its derived availability, as rendered by views. */
export interface ActivityView extends ServiceActivity {
  availability: ActivityAvailability;
}
