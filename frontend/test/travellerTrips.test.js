import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTripsList,
  renderTripDetails,
  renderTrackerWidget,
} from './dist-test/checkoutTestBundleEntry.js';

describe('Day 3 Traveller Trips & Live Tracking UI Tests', () => {
  const sampleTrips = [
    {
      id: 'trip-kerala-1',
      travellerId: 'usr-trav-20001',
      planId: 'plan-1',
      guideId: '10001',
      status: 'confirmed',
      totalAmount: 47000,
      currentDay: 1,
      currentStop: 'Arrival in Kochi',
      currentLocation: 'Kochi',
      trackingStatus: 'not_started',
      progressPercentage: 0,
      lastUpdatedAt: '2026-10-12T08:00:00.000Z',
      itinerary: {
        day1: {
          hotel: { name: 'Lake Palace Alleppey' },
          transport: { provider: 'Private Cab', pickupLocation: 'Kochi Airport', dropoffLocation: 'Alleppey' },
        },
        days: [
          { dayNumber: 2, experiences: [{ experienceId: 'exp-1', title: 'Backwater Houseboat Cruise' }] },
        ],
      },
    },
    {
      id: 'trip-jaipur-1',
      travellerId: 'usr-trav-20001',
      planId: 'plan-2',
      guideId: '10001',
      status: 'started',
      totalAmount: 38500,
      currentDay: 1,
      currentStop: 'City Palace Tour',
      currentLocation: 'Jaipur',
      trackingStatus: 'ongoing',
      progressPercentage: 45,
      lastUpdatedAt: '2026-10-12T10:30:00.000Z',
      itinerary: {
        day1: {
          hotel: { name: 'Heritage Haveli Jaipur' },
          transport: { provider: 'AC Coach', pickupLocation: 'Jaipur Junction', dropoffLocation: 'Hotel' },
        },
        days: [
          { dayNumber: 2, experiences: [{ experienceId: 'exp-amber', title: 'Amber Fort Guided Excursion' }] },
        ],
      },
    },
    {
      id: 'trip-unauthorized-99',
      travellerId: 'usr-other-99999', // Different traveller ID
      planId: 'plan-9',
      status: 'started',
      totalAmount: 15000,
      currentDay: 1,
      currentStop: 'Secret Stop',
      currentLocation: 'Goa',
      trackingStatus: 'ongoing',
      progressPercentage: 20,
      lastUpdatedAt: '2026-10-12T10:00:00.000Z',
    },
  ];

  describe('Loading State', () => {
    it('renders accessible loading skeleton when isLoading is true', () => {
      const html = renderTripsList({
        isLoading: true,
        trips: [],
      });

      assert.ok(html.includes('role="status"'), 'Must have role=status for screen readers');
      assert.ok(html.includes('aria-label="Loading trips"'), 'Must have accessible label');
      assert.ok(html.includes('trav-skeleton-card'), 'Must render skeleton cards');
      assert.strictEqual(html.includes('trav-trip-card'), false, 'Should not render trip cards');
    });
  });

  describe('Error State & Retry', () => {
    it('renders error alert and retry button when error prop is present', () => {
      const html = renderTripsList({
        isLoading: false,
        error: 'Unable to reach backend trips service.',
        trips: [],
        onRetry: () => {},
      });

      assert.ok(html.includes('role="alert"'), 'Must have role=alert for errors');
      assert.ok(html.includes('Failed to load trips'));
      assert.ok(html.includes('Unable to reach backend trips service.'));
      assert.ok(html.includes('Try Again'), 'Must render retry trigger');
    });
  });

  describe('Empty State', () => {
    it('renders empty state illustration and message when authorized trips list is empty', () => {
      const html = renderTripsList({
        isLoading: false,
        trips: [],
      });

      assert.ok(html.includes('data-testid="traveller-trips-empty-state"'));
      assert.ok(html.includes('No trips scheduled yet'));
      assert.ok(html.includes('You do not have any planned or ongoing journeys'));
    });
  });

  describe('Populated State & Ownership Isolation', () => {
    it('renders only trips belonging to the authenticated traveller', () => {
      const html = renderTripsList({
        isLoading: false,
        trips: sampleTrips,
        currentTravellerId: 'usr-trav-20001',
      });

      // Authorized trips must render
      assert.ok(html.includes('#trip-kerala-1'));
      assert.ok(html.includes('#trip-jaipur-1'));
      assert.ok(html.includes('Lake Palace Alleppey'));
      assert.ok(html.includes('Heritage Haveli Jaipur'));

      // Unauthorized trip must NOT leak
      assert.strictEqual(
        html.includes('trip-unauthorized-99'),
        false,
        'Must NOT leak trips of another traveller'
      );
      assert.strictEqual(
        html.includes('Secret Stop'),
        false,
        'Must NOT leak locations of another traveller'
      );
    });
  });

  describe('TripLiveTrackerWidget & Monotonic Progress', () => {
    it('renders live pulse indicator, progress bar, current stop, and location', () => {
      const html = renderTrackerWidget({
        currentDay: 1,
        currentStop: 'Amber Fort Gate',
        currentLocation: 'Jaipur',
        trackingStatus: 'ongoing',
        progressPercentage: 60,
        lastUpdatedAt: '2026-10-12T10:30:00.000Z',
        isLive: true,
      });

      assert.ok(html.includes('data-testid="trip-live-tracker-widget"'));
      assert.ok(html.includes('role="progressbar"'));
      assert.ok(html.includes('aria-valuenow="60"'));
      assert.ok(html.includes('Amber Fort Gate'));
      assert.ok(html.includes('Jaipur'));
      assert.ok(html.includes('Live'));
      assert.ok(html.includes('trav-live-pulse-dot'));
    });

    it('renders paused or completed status accurately', () => {
      const html = renderTrackerWidget({
        currentDay: 2,
        currentStop: 'Lunch Break',
        currentLocation: 'Udaipur',
        trackingStatus: 'paused',
        progressPercentage: 40,
        lastUpdatedAt: '2026-10-12T12:00:00.000Z',
        isLive: false,
      });

      assert.ok(html.includes('is-paused'));
      assert.ok(html.includes('Paused / Break'));
    });
  });

  describe('TravellerTripDetailsView Drill-down', () => {
    it('renders comprehensive itinerary and polling refresh controls', () => {
      const html = renderTripDetails({
        trip: sampleTrips[1],
        onBack: () => {},
        onManualRefresh: () => {},
      });

      assert.ok(html.includes('data-testid="traveller-trip-details-view"'));
      assert.ok(html.includes('Trip Package #trip-jaipur-1'));
      assert.ok(html.includes('Heritage Haveli Jaipur'));
      assert.ok(html.includes('Amber Fort Guided Excursion'));
      assert.ok(html.includes('Live REST Polling Active'));
      assert.ok(html.includes('Refresh Now'));
      assert.ok(html.includes('Back to Trips List'));
    });
  });
});
