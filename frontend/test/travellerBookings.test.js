import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderBookingsList,
  renderBookingDetails,
} from './dist-test/checkoutTestBundleEntry.js';

describe('Day 2 Traveller Bookings & Details UI Tests', () => {
  const sampleBookings = [
    {
      id: 'bk-exp-001',
      experienceId: 'exp-sunset-walk',
      travellerId: 'usr-trav-101',
      guestName: 'Anjali Sharma',
      email: 'anjali@example.com',
      phone: '+91 9876543210',
      date: '2026-10-28',
      participants: 2,
      totalAmount: 3998,
      status: 'CONFIRMED',
      createdAt: '2026-10-10T12:00:00Z',
      experience: {
        id: 'exp-sunset-walk',
        title: 'Sunset Heritage Walk',
        destination: 'Jaipur',
        price: 1999,
        image: 'https://images.unsplash.com/photo-sunset.jpg',
      },
    },
    {
      id: 'bk-exp-002',
      experienceId: 'exp-kayak-goa',
      travellerId: 'usr-trav-101',
      guestName: 'Anjali Sharma',
      email: 'anjali@example.com',
      phone: '+91 9876543210',
      date: '2026-11-05',
      participants: 1,
      totalAmount: 1499,
      status: 'CANCELLED',
      createdAt: '2026-10-09T08:00:00Z',
      experience: {
        id: 'exp-kayak-goa',
        title: 'Mangrove Kayaking Session',
        destination: 'Goa',
        price: 1499,
      },
    },
    {
      id: 'bk-exp-003',
      experienceId: 'exp-scuba',
      travellerId: 'usr-other-999', // Different traveller
      guestName: 'Other Person',
      email: 'other@example.com',
      phone: '+91 9999999999',
      date: '2026-11-12',
      participants: 4,
      totalAmount: 12000,
      status: 'CONFIRMED',
      createdAt: '2026-10-08T08:00:00Z',
      experience: {
        id: 'exp-scuba',
        title: 'Deep Sea Scuba',
        destination: 'Andamans',
        price: 3000,
      },
    },
  ];

  describe('Loading State', () => {
    it('renders accessible loading skeleton when isLoading is true', () => {
      const html = renderBookingsList({
        isLoading: true,
        bookings: [],
      });

      assert.ok(html.includes('role="status"'), 'Must have role=status for screen readers');
      assert.ok(html.includes('aria-label="Loading bookings"'), 'Must have accessible label');
      assert.ok(html.includes('trav-skeleton-card'), 'Must render skeleton placeholder');
      assert.strictEqual(html.includes('trav-booking-item-card'), false, 'Should not render cards');
    });
  });

  describe('Error State', () => {
    it('renders error message and retry button when error prop is present', () => {
      const html = renderBookingsList({
        isLoading: false,
        error: 'Network connection lost. Please check your internet.',
        bookings: [],
        onRetry: () => {},
      });

      assert.ok(html.includes('role="alert"'), 'Must have role=alert for errors');
      assert.ok(html.includes('Failed to load bookings'));
      assert.ok(html.includes('Network connection lost'));
      assert.ok(html.includes('Try Again'), 'Must render retry trigger');
    });
  });

  describe('Empty State', () => {
    it('renders empty state illustration and message when no bookings exist', () => {
      const html = renderBookingsList({
        isLoading: false,
        bookings: [],
      });

      assert.ok(html.includes('data-testid="traveller-empty-state"'));
      assert.ok(html.includes('No bookings found'));
      assert.ok(html.includes('You have not booked any trips or experiences yet'));
    });
  });

  describe('Populated State & Traveller Authorization Filtering', () => {
    it('renders only records authorized for the current traveller', () => {
      const html = renderBookingsList({
        isLoading: false,
        bookings: sampleBookings,
        currentTravellerId: 'usr-trav-101',
      });

      // Must render usr-trav-101 bookings
      assert.ok(html.includes('Sunset Heritage Walk'), 'Must include authorized booking 1');
      assert.ok(html.includes('Mangrove Kayaking Session'), 'Must include authorized booking 2');
      assert.ok(html.includes('#bk-exp-001'));
      assert.ok(html.includes('#bk-exp-002'));

      // Must NOT render other traveller's booking
      assert.strictEqual(
        html.includes('Deep Sea Scuba'),
        false,
        'Must NOT leak bookings of unauthorized traveller'
      );
      assert.strictEqual(
        html.includes('bk-exp-003'),
        false,
        'Must NOT leak unauthorized booking ID'
      );
    });

    it('displays status badges conforming to backend enum values (CONFIRMED, CANCELLED)', () => {
      const html = renderBookingsList({
        isLoading: false,
        bookings: sampleBookings,
        currentTravellerId: 'usr-trav-101',
      });

      assert.ok(html.includes('CONFIRMED'));
      assert.ok(html.includes('CANCELLED'));
      assert.ok(html.includes('is-confirmed'));
      assert.ok(html.includes('is-cancelled'));
    });
  });

  describe('Booking Details View (Reusing Day 1 BookingSummaryCard)', () => {
    it('renders full traveller contact info and reuses Day 1 BookingSummaryCard', () => {
      const html = renderBookingDetails({
        booking: sampleBookings[0],
        onBack: () => {},
      });

      assert.ok(html.includes('data-testid="traveller-booking-details-view"'));
      assert.ok(html.includes('#bk-exp-001'), 'Must display booking ID');
      assert.ok(html.includes('Anjali Sharma'), 'Must display guest name');
      assert.ok(html.includes('anjali@example.com'), 'Must display email');
      assert.ok(html.includes('+91 9876543210'), 'Must display phone');
      assert.ok(html.includes('CONFIRMED'), 'Must display status');

      // Check reuse of Day 1 BookingSummaryCard
      assert.ok(html.includes('trav-summary-card'), 'Reuses Day 1 summary card class');
      assert.ok(html.includes('Sunset Heritage Walk'), 'Displays title in reused card');
      assert.ok(html.includes('Estimated Total'), 'Displays pricing breakdown in reused card');
      assert.ok(html.includes('Back to My Bookings'), 'Renders back navigation');
    });

    it('renders empty fallback when booking is null or not found', () => {
      const html = renderBookingDetails({
        booking: null,
      });

      assert.ok(html.includes('Booking Not Found'));
      assert.ok(html.includes('The requested booking could not be located'));
    });
  });
});
