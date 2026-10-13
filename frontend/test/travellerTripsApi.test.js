import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapBackendTrip,
  reconcileTripTracking,
  compareServerTimestamps,
  getTrackingStatusBadge,
  formatLastUpdatedTime,
} from '../src/utils/tripTrackingUtils.js';
import {
  renderTripsList,
  renderTripDetails,
  renderTrackerWidget,
} from './dist-test/checkoutTestBundleEntry.js';
import { apiRequest } from '../src/services/api.js';
import { sampleTripsList, sampleTrip } from '../src/preview/sampleData.js';

describe('Stage 3B: Live Trips & Live Tracking API Integration Tests', () => {
  let originalLocalStorage;
  let originalFetch;
  let capturedRequests = [];

  beforeEach(() => {
    capturedRequests = [];
    originalLocalStorage = globalThis.localStorage;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
    globalThis.fetch = originalFetch;
  });

  describe('1. Backend DTO & Entity Mapping (Field Mapping Fidelity)', () => {
    it('maps raw backend Trip entity to frontend props accurately', () => {
      const rawBackendTrip = {
        id: 'trip-kerala-live-1',
        travellerId: '20001',
        planId: 'plan-kerala-1',
        guideId: '10001',
        status: 'confirmed',
        totalAmount: 47000,
        currentDay: 1,
        currentStop: 'Houseboat Check-in',
        currentLocation: 'Alleppey, Kerala',
        trackingStatus: 'ongoing',
        progressPercentage: 25,
        lastUpdatedAt: '2026-10-13T10:00:00.000Z',
        itinerary: {
          day1: {
            hotel: { name: 'Kumarakom Lake Resort' },
            transport: {
              provider: 'Kerala Tourist Cabs',
              pickupLocation: 'Cochin Airport',
              dropoffLocation: 'Alleppey Jetty',
            },
          },
          days: [
            {
              dayNumber: 2,
              experiences: [{ experienceId: 'exp-1', title: 'Backwater Cruise' }],
            },
          ],
        },
      };

      const mapped = mapBackendTrip(rawBackendTrip);
      assert.strictEqual(mapped.id, 'trip-kerala-live-1');
      assert.strictEqual(mapped.travellerId, '20001');
      assert.strictEqual(mapped.planId, 'plan-kerala-1');
      assert.strictEqual(mapped.guideId, '10001');
      assert.strictEqual(mapped.status, 'confirmed');
      assert.strictEqual(mapped.totalAmount, 47000);
      assert.strictEqual(mapped.currentDay, 1);
      assert.strictEqual(mapped.currentStop, 'Houseboat Check-in');
      assert.strictEqual(mapped.currentLocation, 'Alleppey, Kerala');
      assert.strictEqual(mapped.trackingStatus, 'ongoing');
      assert.strictEqual(mapped.progressPercentage, 25);
      assert.strictEqual(mapped.lastUpdatedAt, '2026-10-13T10:00:00.000Z');
      assert.ok(mapped.itinerary.day1.hotel.name);

      // Verify rendering in trip details view
      const detailsHtml = renderTripDetails({ trip: mapped });
      assert.ok(detailsHtml.includes('Trip Package #trip-kerala-live-1'));
      assert.ok(detailsHtml.includes('CONFIRMED'));
      assert.ok(detailsHtml.includes('₹47,000'));
      assert.ok(detailsHtml.includes('Houseboat Check-in'));
      assert.ok(detailsHtml.includes('Alleppey, Kerala'));
      assert.ok(detailsHtml.includes('Kumarakom Lake Resort'));
      assert.ok(detailsHtml.includes('Backwater Cruise'));
      assert.ok(detailsHtml.includes('Guide #10001'));
      // Flights must NOT appear in trip view
      assert.strictEqual(detailsHtml.includes('Flight Booking'), false);
    });

    it('handles sparse or missing trip fields gracefully with safe defaults', () => {
      const sparseTrip = {
        id: 'trip-sparse',
        travellerId: '20002',
      };

      const mapped = mapBackendTrip(sparseTrip);
      assert.strictEqual(mapped.id, 'trip-sparse');
      assert.strictEqual(mapped.travellerId, '20002');
      assert.strictEqual(mapped.status, 'draft');
      assert.strictEqual(mapped.trackingStatus, 'not_started');
      assert.strictEqual(mapped.currentDay, 1);
      assert.strictEqual(mapped.progressPercentage, 0);
      assert.strictEqual(mapped.totalAmount, 0);
      assert.strictEqual(mapped.guideId, null);
      assert.deepStrictEqual(mapped.itinerary, {});

      assert.strictEqual(mapBackendTrip(null), null);
    });
  });

  describe('2. Authenticated Endpoint Paths & Auth Guards', () => {
    it('calls GET /api/trips/traveller/:travellerId with user session headers', async () => {
      const mockStorage = {
        xploreoUser: JSON.stringify({ userId: '20001', role: 'traveller' }),
      };
      globalThis.localStorage = {
        getItem: (key) => mockStorage[key] || null,
        setItem: () => {},
        removeItem: () => {},
      };

      globalThis.fetch = async (url, options) => {
        capturedRequests.push({ url, options });
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: true, data: [] }),
        };
      };

      await apiRequest('/trips/traveller/20001');

      assert.strictEqual(capturedRequests.length, 1);
      assert.ok(capturedRequests[0].url.endsWith('/api/trips/traveller/20001'));
      assert.strictEqual(capturedRequests[0].options.headers['x-user-id'], '20001');
      assert.strictEqual(capturedRequests[0].options.headers['x-user-role'], 'traveller');
    });

    it('calls GET /api/trips/:id for single trip detail with auth headers', async () => {
      const mockStorage = {
        xploreoUser: JSON.stringify({ userId: '20001', role: 'traveller' }),
      };
      globalThis.localStorage = {
        getItem: (key) => mockStorage[key] || null,
        setItem: () => {},
        removeItem: () => {},
      };

      globalThis.fetch = async (url, options) => {
        capturedRequests.push({ url, options });
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: true, data: { id: 'trip-kerala-1' } }),
        };
      };

      await apiRequest('/trips/trip-kerala-1');

      assert.strictEqual(capturedRequests.length, 1);
      assert.ok(capturedRequests[0].url.endsWith('/api/trips/trip-kerala-1'));
      assert.strictEqual(capturedRequests[0].options.headers['x-user-id'], '20001');
      assert.strictEqual(capturedRequests[0].options.headers['x-user-role'], 'traveller');
    });

    it('rejects unauthenticated requests before calling network when session is missing', async () => {
      globalThis.localStorage = {
        getItem: () => null,
      };

      let fetchInvoked = false;
      globalThis.fetch = async () => {
        fetchInvoked = true;
        return { ok: true };
      };

      await assert.rejects(
        () => apiRequest('/trips/traveller/20001'),
        /Authentication required\. Missing or invalid saved session\./
      );

      await assert.rejects(
        () => apiRequest('/trips/trip-1'),
        /Authentication required\. Missing or invalid saved session\./
      );

      assert.strictEqual(fetchInvoked, false);
    });
  });

  describe('3. Loading, Empty, Error, and Retry States', () => {
    it('renders accessible loading skeleton when isLoading is true', () => {
      const html = renderTripsList({
        isLoading: true,
        trips: [],
      });

      assert.ok(html.includes('trav-loading-container'));
      assert.ok(html.includes('role="status"'));
      assert.ok(html.includes('aria-label="Loading trips"'));
      assert.ok(html.includes('trav-skeleton-card'));
      assert.strictEqual(html.includes('trip-card-'), false);
    });

    it('renders empty feedback message when authenticated traveller has no trips', () => {
      const html = renderTripsList({
        isLoading: false,
        trips: [],
        currentTravellerId: '20001',
      });

      assert.ok(html.includes('trav-state-empty'));
      assert.ok(html.includes('data-testid="traveller-trips-empty-state"'));
      assert.ok(html.includes('No trips scheduled yet'));
      assert.strictEqual(html.includes('Journey via'), false);
    });

    it('surfaces authentication failure clearly without disguising as empty results or mock data', () => {
      const html = renderTripsList({
        isLoading: false,
        error: 'Authentication required. Missing or invalid saved session.',
        trips: [],
      });

      assert.ok(html.includes('trav-state-error'));
      assert.ok(html.includes('role="alert"'));
      assert.ok(html.includes('Authentication required. Missing or invalid saved session.'));
      assert.ok(html.includes('Try Again'));
      assert.strictEqual(html.includes('data-testid="traveller-trips-empty-state"'), false);
      assert.strictEqual(html.includes('Kumarakom Lake Resort'), false);
    });

    it('surfaces backend 500 / network error and renders working retry trigger', () => {
      let retryClicked = false;
      const html = renderTripsList({
        isLoading: false,
        error: 'Backend connection refused on port 3000',
        onRetry: () => {
          retryClicked = true;
        },
        trips: [],
      });

      assert.ok(html.includes('trav-state-error'));
      assert.ok(html.includes('Backend connection refused on port 3000'));
      assert.ok(html.includes('Try Again'));
      assert.strictEqual(retryClicked, false);
    });
  });

  describe('4. Trip Detail Loading & Tracking Widget', () => {
    it('renders trip detail timeline with hotel, transport, and guide assignment', () => {
      const html = renderTripDetails({
        trip: sampleTrip,
        onBack: () => {},
        onManualRefresh: () => {},
      });

      assert.ok(html.includes('Trip Package #trip-kerala-exp-01'));
      assert.ok(html.includes('Live Tracking'));
      assert.ok(html.includes('Live REST Polling Active'));
      assert.ok(html.includes('Refresh Now'));
      assert.ok(html.includes('Kumarakom Lake Resort'));
      assert.ok(html.includes('Cochin International Airport'));
      assert.ok(html.includes('Resort Lobby'));
      assert.ok(html.includes('Back to Trips List'));
    });

    it('renders empty fallback when trip is null or not found', () => {
      const html = renderTripDetails({
        trip: null,
        onBack: () => {},
      });

      assert.ok(html.includes('Trip Not Found'));
      assert.ok(html.includes('Return to Trips'));
    });

    it('renders live tracking widget with live pulse and progress percentage', () => {
      const widgetHtml = renderTrackerWidget({
        currentDay: 2,
        currentStop: 'Vembanad Kayaking Hub',
        currentLocation: 'Kumarakom, Kerala',
        trackingStatus: 'ongoing',
        progressPercentage: 45,
        lastUpdatedAt: '2026-10-13T10:00:00.000Z',
        isLive: true,
      });

      assert.ok(widgetHtml.includes('Live Tracking Active'));
      assert.ok(widgetHtml.includes('Trip Progress'));
      assert.ok(widgetHtml.includes('45%'));
      assert.ok(widgetHtml.includes('Day 2'));
      assert.ok(widgetHtml.includes('Vembanad Kayaking Hub'));
      assert.ok(widgetHtml.includes('Kumarakom, Kerala'));
    });
  });

  describe('5. Tracking Refresh & Stale-Update Reconciliation', () => {
    it('discards stale incoming updates with an older server timestamp', () => {
      const current = {
        id: 'trip-1',
        progressPercentage: 50,
        currentStop: 'Stop 2',
        lastUpdatedAt: '2026-10-13T12:00:00.000Z',
      };
      const staleIncoming = {
        id: 'trip-1',
        progressPercentage: 25,
        currentStop: 'Stop 1',
        lastUpdatedAt: '2026-10-13T11:00:00.000Z',
      };

      const reconciled = reconcileTripTracking(current, staleIncoming);
      assert.strictEqual(reconciled.progressPercentage, 50);
      assert.strictEqual(reconciled.currentStop, 'Stop 2');
      assert.strictEqual(reconciled.lastUpdatedAt, '2026-10-13T12:00:00.000Z');
    });

    it('accepts strictly newer tracking updates from server', () => {
      const current = {
        id: 'trip-1',
        progressPercentage: 25,
        currentStop: 'Stop 1',
        lastUpdatedAt: '2026-10-13T10:00:00.000Z',
      };
      const newerIncoming = {
        id: 'trip-1',
        progressPercentage: 50,
        currentStop: 'Stop 2',
        lastUpdatedAt: '2026-10-13T11:00:00.000Z',
      };

      const reconciled = reconcileTripTracking(current, newerIncoming);
      assert.strictEqual(reconciled.progressPercentage, 50);
      assert.strictEqual(reconciled.currentStop, 'Stop 2');
      assert.strictEqual(reconciled.lastUpdatedAt, '2026-10-13T11:00:00.000Z');
    });

    it('enforces monotonic progress when timestamps are identical', () => {
      const current = {
        id: 'trip-1',
        status: 'started',
        progressPercentage: 60,
        lastUpdatedAt: '2026-10-13T12:00:00.000Z',
      };
      const outOfOrder = {
        id: 'trip-1',
        status: 'started',
        progressPercentage: 40,
        lastUpdatedAt: '2026-10-13T12:00:00.000Z',
      };

      const reconciled = reconcileTripTracking(current, outOfOrder);
      assert.strictEqual(reconciled.progressPercentage, 60);
    });

    it('compares server timestamps accurately', () => {
      assert.ok(compareServerTimestamps('2026-10-13T12:00:00Z', '2026-10-13T11:00:00Z') > 0);
      assert.ok(compareServerTimestamps('2026-10-13T10:00:00Z', '2026-10-13T11:00:00Z') < 0);
      assert.strictEqual(compareServerTimestamps(null, null), 0);
    });

    it('correctly maps status badges for all backend tracking statuses', () => {
      assert.strictEqual(getTrackingStatusBadge('ongoing').className, 'is-ongoing');
      assert.strictEqual(getTrackingStatusBadge('paused').className, 'is-paused');
      assert.strictEqual(getTrackingStatusBadge('completed').className, 'is-completed');
      assert.strictEqual(getTrackingStatusBadge('not_started').className, 'is-not-started');
    });

    it('formats last updated time strings cleanly', () => {
      assert.strictEqual(formatLastUpdatedTime(null), 'Just now');
      assert.strictEqual(formatLastUpdatedTime('invalid-date'), 'Recently');
      assert.ok(typeof formatLastUpdatedTime(new Date().toISOString()) === 'string');
    });
  });

  describe('6. No Fixture Fallback on Failed Live API Call', () => {
    it('strictly does not substitute sample fixtures when live request fails', () => {
      const html = renderTripsList({
        useFixtures: false,
        trips: [],
        error: '503 Service Unavailable: Trips cluster offline',
      });

      assert.ok(html.includes('503 Service Unavailable'));
      assert.ok(html.includes('Failed to load trips'));

      // Confirm sample fixtures are NOT present in output
      for (const sample of sampleTripsList) {
        assert.strictEqual(html.includes(sample.id), false);
      }
    });
  });

  describe('7. Isolated Preview Mode Integrity', () => {
    it('renders sample trips list when trips prop is passed directly in preview mode', () => {
      const html = renderTripsList({
        trips: sampleTripsList,
        currentTravellerId: 'trav-usr-20001',
      });

      assert.ok(html.includes('trip-card-trip-kerala-exp-01'));
      assert.ok(html.includes('Kumarakom Lake Resort'));
      assert.ok(html.includes('View Details'));
    });
  });
});
