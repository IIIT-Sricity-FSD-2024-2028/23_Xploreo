import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchHotelBookings,
  fetchHotelBookingById,
  SAMPLE_HOTEL_BOOKINGS,
  hotelBookingsService,
} from '../src/services/mockHotelAdapter.js';
import {
  mockPaymentAdapter,
  livePaymentAdapter,
  getPaymentAdapter,
  paymentService,
} from '../src/services/paymentService.js';
import {
  renderBookingsList,
  renderBookingDetails,
  renderCheckoutPage,
  renderReviewForm,
  renderReviewsPage,
} from './dist-test/checkoutTestBundleEntry.js';

describe('M5 Explicit Mock Adapters & Checkout Demonstration Tests', () => {
  describe('1. Mock Hotel Adapter & Live/Mock Separation', () => {
    it('returns sample hotel bookings with explicit isDemo and source properties in mock mode', async () => {
      const bookings = await fetchHotelBookings({ mode: 'mock' });
      assert.ok(Array.isArray(bookings));
      assert.ok(bookings.length >= 3);
      bookings.forEach((b) => {
        assert.equal(b.isDemo, true, 'Each booking must be flagged as isDemo');
        assert.equal(b.source, 'mock', 'Source must be mock');
        assert.ok(b.hotel, 'Must include hotel metadata');
        assert.ok(b.checkIn, 'Must include checkIn date');
        assert.ok(b.checkOut, 'Must include checkOut date');
      });
    });

    it('filters mock hotel bookings by travellerId when provided', async () => {
      const bookings = await fetchHotelBookings({ mode: 'mock', travellerId: 'T001' });
      assert.ok(bookings.length > 0);
      bookings.forEach((b) => {
        assert.equal(b.travellerId, 'T001');
      });
    });

    it('handles simulated empty state in mock mode', async () => {
      const bookings = await fetchHotelBookings({ mode: 'mock', simulateEmpty: true });
      assert.deepEqual(bookings, []);
    });

    it('handles simulated error state in mock mode without crashing', async () => {
      await assert.rejects(
        async () => {
          await fetchHotelBookings({ mode: 'mock', simulateError: true });
        },
        {
          message: /Simulated Mock Hotel Adapter error/,
        }
      );
    });

    it('finds hotel booking by ID with demo tags', async () => {
      const booking = await fetchHotelBookingById('demo-htl-101', { mode: 'mock' });
      assert.equal(booking.id, 'demo-htl-101');
      assert.equal(booking.hotel.name, 'Taj Lake Palace');
      assert.equal(booking.isDemo, true);
    });

    it('rejects when booking ID is not found in mock store', async () => {
      await assert.rejects(
        async () => {
          await fetchHotelBookingById('non-existent-id', { mode: 'mock' });
        },
        {
          message: /Mock hotel booking #non-existent-id not found/,
        }
      );
    });

    it('in live mode, surfaces API failures rather than substituting mock data', async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => ({
          ok: false,
          status: 404,
          headers: { get: () => 'application/json' },
          json: async () => ({ message: 'Cannot GET /api/bookings' }),
        });

        // Setup mock user for apiRequest auth requirement
        globalThis.localStorage = {
          getItem: () => JSON.stringify({ userId: 'T001', role: 'traveller' }),
        };

        await assert.rejects(
          async () => {
            await fetchHotelBookings({ mode: 'live' });
          },
          {
            message: /Cannot GET \/api\/bookings/,
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('2. Hotel Bookings UI & Detail Rendering', () => {
    it('renders demo notice banner and demo badges when mock hotel bookings are displayed', () => {
      const sampleList = [
        SAMPLE_HOTEL_BOOKINGS[0],
        {
          id: 'exp-live-1',
          guestName: 'Anjali Sharma',
          date: '2026-11-20',
          totalAmount: 4500,
          status: 'CONFIRMED',
          participants: 2,
          experience: { title: 'Old Delhi Walk', destination: 'Delhi' },
        },
      ];

      const html = renderBookingsList({
        bookings: sampleList,
        useFixtures: true,
      });

      assert.ok(html.includes('data-testid="mock-hotels-banner"'), 'Must render demo mode banner');
      assert.ok(html.includes('Mock Hotel Adapter'), 'Banner must document Mock Hotel Adapter');
      assert.ok(html.includes('Demo Data'), 'Card must have Demo Data badge');
      assert.ok(html.includes('Taj Lake Palace'), 'Must render hotel name');
      assert.ok(html.includes('Deluxe Lake View Suite'), 'Must render room type');
    });

    it('renders category filter pills for All Categories, Experiences, and Hotels', () => {
      const html = renderBookingsList({
        bookings: SAMPLE_HOTEL_BOOKINGS,
        useFixtures: true,
      });

      assert.ok(html.includes('All Categories'));
      assert.ok(html.includes('Experiences (Live API)'));
      assert.ok(html.includes('Hotels (Demo Adapter)'));
    });

    it('renders BookingDetailsView for hotel bookings with check-in/out dates, room type, and demo banner', () => {
      const html = renderBookingDetails({
        booking: SAMPLE_HOTEL_BOOKINGS[0],
        onBack: () => {},
      });

      assert.ok(html.includes('data-testid="booking-details-demo-banner"'), 'Must render demo banner');
      assert.ok(html.includes('Taj Lake Palace'), 'Must render hotel title');
      assert.ok(html.includes('Deluxe Lake View Suite'), 'Must render room type');
      assert.ok(html.includes('Check-in / Check-out'), 'Must display check-in/out header');
      assert.ok(html.includes('Hotel Booking Reference'), 'Must label as Hotel Booking Reference');
      assert.ok(html.includes('Back to My Bookings'), 'Must render back navigation');
    });
  });

  describe('3. Payment Service & Mock Payment Adapter', () => {
    it('creates simulated order with explicit isSimulated and isDemo flags', async () => {
      const order = await mockPaymentAdapter.createOrder({
        bookingId: 'demo-htl-101',
        bookingType: 'hotel',
        amount: 32000,
        currency: 'INR',
      });

      assert.equal(order.success, true);
      assert.equal(order.isSimulated, true);
      assert.equal(order.isDemo, true);
      assert.equal(order.mode, 'mock');
      assert.ok(order.orderId.startsWith('demo_order_'));
      assert.ok(order.gatewayNotes.includes('SIMULATED ORDER'));
    });

    it('rejects order creation with non-positive amount', async () => {
      await assert.rejects(
        async () => {
          await mockPaymentAdapter.createOrder({
            bookingId: 'demo-htl-101',
            amount: 0,
          });
        },
        {
          message: /Invalid order amount/,
        }
      );
    });

    it('simulates SUCCESS outcome with demo receipt and 0 real charge', async () => {
      const result = await mockPaymentAdapter.verifyPayment({
        orderId: 'demo_order_123',
        method: 'upi',
        simulatedOutcome: 'SUCCESS',
      });

      assert.equal(result.success, true);
      assert.equal(result.status, 'PAID');
      assert.equal(result.isSimulated, true);
      assert.equal(result.isDemo, true);
      assert.equal(result.amountPaid, 0, 'Must not claim real financial charge');
      assert.ok(result.receiptId.startsWith('RCPT-DEMO-'));
      assert.ok(result.note.includes('Mock Payment Adapter'));
    });

    it('simulates FAILURE outcome with decline error code', async () => {
      const result = await mockPaymentAdapter.verifyPayment({
        orderId: 'demo_order_123',
        method: 'card',
        simulatedOutcome: 'FAILURE',
      });

      assert.equal(result.success, false);
      assert.equal(result.status, 'FAILED');
      assert.equal(result.errorCode, 'SIMULATED_PAYMENT_DECLINED');
      assert.ok(result.errorMessage.includes('Simulated payment declined'));
    });

    it('simulates CANCEL outcome when user aborts payment', async () => {
      const result = await mockPaymentAdapter.verifyPayment({
        orderId: 'demo_order_123',
        method: 'upi',
        simulatedOutcome: 'CANCEL',
      });

      assert.equal(result.success, false);
      assert.equal(result.status, 'CANCELLED');
      assert.equal(result.errorCode, 'SIMULATED_USER_CANCELLED');
    });

    it('allows cancelling an active payment session', async () => {
      const result = await mockPaymentAdapter.cancelPayment({
        orderId: 'demo_order_123',
        reason: 'User abandoned checkout',
      });

      assert.equal(result.success, true);
      assert.equal(result.status, 'CANCELLED');
    });

    it('getPaymentAdapter returns mock adapter for mock mode and live adapter for live mode', () => {
      const mockAd = getPaymentAdapter({ mode: 'mock' });
      assert.equal(mockAd.name, 'MockPaymentAdapter');

      const liveAd = getPaymentAdapter({ mode: 'live' });
      assert.equal(liveAd.name, 'LivePaymentAdapter');
    });
  });

  describe('4. Checkout UI & Demonstration Flow', () => {
    it('renders checkout page with warning banner, stepper, and initial review step', () => {
      const html = renderCheckoutPage({
        user: { name: 'Anjali Sharma', email: 'anjali@xploreo.com', phone: '9123456780' },
      });

      assert.ok(html.includes('data-testid="traveller-checkout-page"'));
      assert.ok(html.includes('data-testid="checkout-demo-banner"'));
      assert.ok(html.includes('MockPaymentAdapter'));
      assert.ok(html.includes('Review Itinerary'));
      assert.ok(html.includes('Proceed to Traveller Details →'));
    });
  });

  describe('5. Review Submission Compatibility & Contract Handling', () => {
    it('renders mode switch and documents CreateReviewDto integer requirement blocker', () => {
      const html = renderReviewForm({
        currentUserId: 'T001', // Alphanumeric user ID
      });

      assert.ok(html.includes('data-testid="review-submission-form"'));
      assert.ok(html.includes('Submission Mode:'));
      assert.ok(html.includes('Demo Review Notice'));
      assert.ok(html.includes('@IsInt()'), 'Documents @IsInt() blocker');
    });

    it('preserves live reviews listing in TravellerReviewsPage while allowing demo submission', () => {
      const html = renderReviewsPage({
        reviews: [
          {
            id: 1,
            userId: 20001,
            targetType: 'guide',
            targetId: 10001,
            rating: 5,
            comment: 'Fantastic local tour guide!',
            createdAt: '2026-10-12T10:00:00Z',
          },
        ],
        useFixtures: true,
      });

      assert.ok(html.includes('data-testid="traveller-reviews-page"'));
      assert.ok(html.includes('Fantastic local tour guide!'));
      assert.ok(html.includes('Write a Review'));
    });
  });
});
