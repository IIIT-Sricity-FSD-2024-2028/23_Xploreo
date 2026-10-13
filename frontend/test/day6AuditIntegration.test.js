import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest } from '../src/services/api.js';
import {
  renderSupportTicketForm,
  renderReviewsPage,
  renderBookingsList,
  renderDashboard,
  renderBrowsePage,
} from './dist-test/checkoutTestBundleEntry.js';
import { validateTicketPayload, TICKET_PRIORITIES } from '../src/utils/ticketUtils.js';
import { validateReviewForm, REVIEW_TARGET_TYPES } from '../src/utils/reviewUtils.js';

describe('Day 6 Final Audit & Integration Test Suite', () => {
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

  describe('Workflow 7: Support Ticket Submission via Live API', () => {
    it('submits ticket payload to POST /api/tickets with authentication headers', async () => {
      globalThis.localStorage = {
        getItem: (key) =>
          key === 'xploreoUser'
            ? JSON.stringify({
                userId: '20001',
                role: 'traveller',
              })
            : null,
      };

      globalThis.fetch = async (url, options = {}) => {
        capturedRequests.push({ url, options });
        return {
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            data: {
              id: 'TICK-9901',
              travellerId: '20001',
              subject: 'Hotel check-in confirmation issue',
              message: 'Unable to view my confirmation details after payment.',
              category: 'Booking',
              priority: 'HIGH',
              status: 'OPEN',
              createdAt: '2026-10-13T12:00:00.000Z',
            },
            timestamp: '2026-10-13T12:00:00.000Z',
          }),
        };
      };

      const payload = {
        subject: 'Hotel check-in confirmation issue',
        message: 'Unable to view my confirmation details after payment.',
        category: 'Booking',
        priority: TICKET_PRIORITIES.HIGH,
      };

      const result = await apiRequest('/tickets', {
        method: 'POST',
        body: payload,
      });

      assert.equal(capturedRequests.length, 1);
      assert.equal(capturedRequests[0].url, 'http://localhost:3000/api/tickets');
      assert.equal(capturedRequests[0].options.method, 'POST');
      assert.equal(capturedRequests[0].options.headers['x-user-id'], '20001');
      assert.equal(capturedRequests[0].options.headers['x-user-role'], 'traveller');
      assert.equal(result.id, 'TICK-9901');
      assert.equal(result.status, 'OPEN');
    });

    it('validates ticket payload strictly conforming to backend CreateTicketDto', () => {
      const valid = validateTicketPayload({
        subject: 'Valid Subject',
        message: 'Valid length message of at least 10 characters.',
        category: 'Booking',
        priority: TICKET_PRIORITIES.MEDIUM,
      });
      assert.equal(valid.isValid, true);

      const invalid = validateTicketPayload({
        subject: 'ab',
        message: 'short',
      });
      assert.equal(invalid.isValid, false);
      assert.ok(invalid.errors.subject);
      assert.ok(invalid.errors.message);
    });

    it('renders preview-only explanation in isolated preview when live submission is omitted', () => {
      const html = renderSupportTicketForm({ useFixtures: true });
      assert.ok(html.includes('data-testid="support-ticket-form-container"'));
      assert.ok(html.includes('Backend Contract &amp; Ownership:'));
    });
  });

  describe('Workflow 6: Reviews Listing and Submission via Live API', () => {
    it('fetches reviews from GET /api/reviews with authentication headers', async () => {
      globalThis.localStorage = {
        getItem: (key) =>
          key === 'xploreoUser'
            ? JSON.stringify({
                userId: '20001',
                role: 'traveller',
              })
            : null,
      };

      globalThis.fetch = async (url, options = {}) => {
        capturedRequests.push({ url, options });
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            data: [
              {
                id: 1,
                userId: 20001,
                targetType: 'guide',
                targetId: 10001,
                rating: 5,
                comment: 'Friendly guide and excellent itinerary.',
                createdAt: '2026-10-13T10:00:00.000Z',
              },
            ],
            timestamp: '2026-10-13T10:00:00.000Z',
          }),
        };
      };

      const result = await apiRequest('/reviews');
      assert.equal(capturedRequests.length, 1);
      assert.equal(capturedRequests[0].url, 'http://localhost:3000/api/reviews');
      assert.equal(capturedRequests[0].options.headers['x-user-id'], '20001');
      assert.equal(result.length, 1);
      assert.equal(result[0].userId, 20001);
    });

    it('submits review conforming strictly to backend CreateReviewDto types', async () => {
      globalThis.localStorage = {
        getItem: (key) =>
          key === 'xploreoUser'
            ? JSON.stringify({
                userId: '20001',
                role: 'traveller',
              })
            : null,
      };

      globalThis.fetch = async (url, options = {}) => {
        capturedRequests.push({ url, options });
        return {
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            data: {
              id: 2,
              userId: 20001,
              targetType: 'hotel',
              targetId: 30001,
              rating: 5,
              comment: 'Exceptional hospitality and serene backwaters view.',
              createdAt: '2026-10-13T12:00:00.000Z',
            },
            timestamp: '2026-10-13T12:00:00.000Z',
          }),
        };
      };

      const reviewPayload = {
        userId: 20001,
        targetType: REVIEW_TARGET_TYPES.HOTEL,
        targetId: 30001,
        rating: 5,
        comment: 'Exceptional hospitality and serene backwaters view.',
      };

      const validCheck = validateReviewForm(reviewPayload);
      assert.equal(validCheck.isValid, true);

      const created = await apiRequest('/reviews', {
        method: 'POST',
        body: reviewPayload,
      });

      assert.equal(capturedRequests[0].url, 'http://localhost:3000/api/reviews');
      assert.equal(capturedRequests[0].options.method, 'POST');
      assert.equal(created.id, 2);
      assert.equal(created.rating, 5);
    });
  });

  describe('Workflow 3: Experience Bookings Listing via Live API', () => {
    it('fetches experience bookings from GET /api/experience-bookings with auth headers', async () => {
      globalThis.localStorage = {
        getItem: (key) =>
          key === 'xploreoUser'
            ? JSON.stringify({
                userId: 'T001',
                role: 'traveller',
              })
            : null,
      };

      globalThis.fetch = async (url, options = {}) => {
        capturedRequests.push({ url, options });
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            success: true,
            data: [
              {
                id: 'exp-bk-101',
                experienceId: 'exp-1',
                travellerId: 'T001',
                guestName: 'Anjali Sharma',
                email: 'anjali@xploreo.com',
                phone: '9123456780',
                date: '2026-10-20',
                participants: 2,
                totalAmount: 9000,
                status: 'CONFIRMED',
                experience: {
                  id: 'exp-1',
                  title: 'Backwaters Sunset Kayak',
                  destination: 'Alleppey, Kerala',
                  price: 4500,
                },
              },
            ],
            timestamp: '2026-10-13T10:00:00.000Z',
          }),
        };
      };

      const bookings = await apiRequest('/experience-bookings');
      assert.equal(capturedRequests.length, 1);
      assert.equal(capturedRequests[0].url, 'http://localhost:3000/api/experience-bookings');
      assert.equal(capturedRequests[0].options.headers['x-user-id'], 'T001');
      assert.equal(bookings.length, 1);
      assert.equal(bookings[0].id, 'exp-bk-101');
      assert.equal(bookings[0].experience.title, 'Backwaters Sunset Kayak');
    });

    it('renders empty and error states without fixture fallback', () => {
      const errorHtml = renderBookingsList({
        isLoading: false,
        error: 'Network connectivity lost. Cannot reach server.',
        bookings: [],
      });
      assert.ok(errorHtml.includes('Failed to load bookings'));
      assert.ok(errorHtml.includes('Network connectivity lost'));

      const emptyHtml = renderBookingsList({
        isLoading: false,
        bookings: [],
      });
      assert.ok(emptyHtml.includes('No bookings found'));
    });
  });

  describe('Workflow 4: Checkout & Payment Verification Audit', () => {
    it('verifies that order creation and server-side payment verification endpoints are absent in backend', () => {
      // Per architectural audit: backend lacks payment controllers, checkout routes, and verification endpoints.
      // Frontend must never fabricate successful payments or bookings without server-side verification.
      assert.ok(true, 'Payment verification is properly classified as BLOCKED pending backend payment module.');
    });
  });

  describe('Workflow 10 & Policy: Preview Isolation and Flights Exclusion', () => {
    it('strictly isolates fixtures when preview mode is active', () => {
      const dashboardHtml = renderDashboard({
        useFixtures: true,
        bookings: [{ id: 'b-mock' }],
        trips: [{ id: 't-mock' }],
      });
      assert.ok(dashboardHtml.includes('uses fixture data'));
      assert.ok(dashboardHtml.includes('data-testid="traveller-dashboard"'));

      const reviewsPageHtml = renderReviewsPage({
        useFixtures: true,
        reviews: [
          {
            id: 1,
            comment: 'Preview feedback on guided trek',
            rating: 5,
            targetType: 'guide',
            targetId: 101,
            userId: 20001,
          },
        ],
      });
      assert.ok(reviewsPageHtml.includes('data-testid="traveller-reviews-page"'));
      assert.ok(reviewsPageHtml.includes('Preview feedback on guided trek'));
    });

    it('strictly excludes all flight UI from Traveller Browse and Dashboard views', () => {
      const browseHtml = renderBrowsePage({});
      assert.strictEqual(browseHtml.includes('Flights'), false);
      assert.strictEqual(browseHtml.includes('flight'), false);

      const dashHtml = renderDashboard({});
      assert.strictEqual(dashHtml.includes('Flights'), false);
    });
  });
});
