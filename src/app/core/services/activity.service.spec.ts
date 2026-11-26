import { buildAvailability } from './activity.service';
import { ServiceActivity } from '../models';

/**
 * Unit tests for the availability rules.
 *
 * `buildAvailability` is the single place that decides whether an activity is
 * open, full or closed, and every screen reads its answer, so it is the piece
 * of logic most worth testing on its own. Because it is a pure function it can
 * be tested without Angular's TestBed, HTTP or a browser.
 */

const NOW = new Date('2026-11-10T12:00:00').getTime();

function activity(overrides: Partial<ServiceActivity> = {}): ServiceActivity {
  return {
    id: 'A001',
    ngoName: 'Hope Children’s Home',
    activityTitle: 'Weekend Literacy Coaching',
    serviceType: 'Education',
    description: 'Reading support for primary school residents.',
    location: 'Kuala Lumpur',
    activityDate: '2026-12-05',
    startTime: '09:00',
    endTime: '13:00',
    maxEmployees: 20,
    slotsTaken: 12,
    registrationCutOff: '2026-12-01T17:00:00',
    contactPerson: 'Mr. Lim',
    contactEmail: 'volunteer@example.org',
    status: 'published',
    createdAt: '2026-09-15T10:00:00',
    updatedAt: '2026-09-15T10:00:00',
    ...overrides,
  };
}

describe('buildAvailability', () => {
  it('reports an approved activity with free slots as open', () => {
    const availability = buildAvailability(activity(), NOW);

    expect(availability.slotsRemaining).toBe(8);
    expect(availability.isFull).toBe(false);
    expect(availability.isClosed).toBe(false);
    expect(availability.isOpenForRegistration).toBe(true);
    expect(availability.fillRate).toBe(60);
  });

  it('closes registration once the cut-off has passed', () => {
    const availability = buildAvailability(
      activity({ registrationCutOff: '2026-11-05T17:00:00' }),
      NOW,
    );

    expect(availability.isClosed).toBe(true);
    expect(availability.isOpenForRegistration).toBe(false);
    // Slots may still be free; the cut-off alone closes the activity.
    expect(availability.slotsRemaining).toBe(8);
  });

  it('refuses registration when every slot has been taken', () => {
    const availability = buildAvailability(activity({ slotsTaken: 20 }), NOW);

    expect(availability.isFull).toBe(true);
    expect(availability.slotsRemaining).toBe(0);
    expect(availability.isOpenForRegistration).toBe(false);
    expect(availability.fillRate).toBe(100);
  });

  it('flags an activity as urgent at three slots or fewer', () => {
    expect(buildAvailability(activity({ slotsTaken: 17 }), NOW).isUrgent).toBe(true);
    expect(buildAvailability(activity({ slotsTaken: 16 }), NOW).isUrgent).toBe(false);
  });

  it('never marks a full or closed activity as urgent', () => {
    expect(buildAvailability(activity({ slotsTaken: 20 }), NOW).isUrgent).toBe(false);
    expect(
      buildAvailability(
        activity({ slotsTaken: 18, registrationCutOff: '2026-11-05T17:00:00' }),
        NOW,
      ).isUrgent,
    ).toBe(false);
  });

  it('keeps a draft activity out of registration even when slots are free', () => {
    const availability = buildAvailability(activity({ status: 'draft' }), NOW);

    expect(availability.isOpenForRegistration).toBe(false);
  });
});
