import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import {
  getBookingCancellationEligibility,
  isBookingCancellationEligible,
  parseScheduledMomentToMs,
} from '../src/utils/bookingValidationUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '..');

const vite = await createServer({
  root: FRONTEND_ROOT,
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
});

after(async () => {
  await vite.close();
});

describe('Traveller Portal - Booking Cancellation Date & Time Validation', () => {
  // Reference time: 2026-11-28 12:00:00 IST (UTC+05:30) = 2026-11-28 06:30:00 UTC
  const fixedNow = new Date('2026-11-28T12:00:00+05:30');

  describe('1. Hotel Bookings', () => {
    test('Scenario 1: Past hotel booking is blocked', () => {
      const booking = {
        id: 'hotel-past-1',
        bookingType: 'hotel',
        status: 'CONFIRMED',
        checkIn: '2026-11-25',
        checkOut: '2026-11-27',
        checkInTime: '14:00',
      };
      const result = getBookingCancellationEligibility(booking, 'hotel', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'date_passed');
      assert.equal(result.message, 'This booking can no longer be cancelled because its scheduled date has passed.');
      assert.equal(isBookingCancellationEligible(booking, 'hotel', fixedNow), false);
    });

    test("Scenario 2: Today's hotel booking with start time NOT passed is allowed", () => {
      const booking = {
        id: 'hotel-today-future',
        bookingType: 'hotel',
        status: 'CONFIRMED',
        checkIn: '2026-11-28',
        checkOut: '2026-11-30',
        checkInTime: '15:00', // 3:00 PM IST > 12:00 PM IST
      };
      const result = getBookingCancellationEligibility(booking, 'hotel', fixedNow);
      assert.equal(result.canCancel, true);
      assert.equal(result.reason, 'eligible');
      assert.equal(result.message, '');
      assert.equal(isBookingCancellationEligible(booking, 'hotel', fixedNow), true);
    });

    test("Scenario 3: Today's hotel booking with start time passed is blocked", () => {
      const booking = {
        id: 'hotel-today-passed',
        bookingType: 'hotel',
        status: 'CONFIRMED',
        checkIn: '2026-11-28',
        checkOut: '2026-11-30',
        checkInTime: '10:00', // 10:00 AM IST < 12:00 PM IST
      };
      const result = getBookingCancellationEligibility(booking, 'hotel', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'date_passed');
      assert.equal(result.message, 'This booking can no longer be cancelled because its scheduled date has passed.');
      assert.equal(isBookingCancellationEligible(booking, 'hotel', fixedNow), false);
    });

    test('Scenario 4: Future hotel booking is allowed', () => {
      const booking = {
        id: 'hotel-future-1',
        bookingType: 'hotel',
        status: 'CONFIRMED',
        checkIn: '2026-12-10',
        checkOut: '2026-12-14',
        checkInTime: '14:00',
      };
      const result = getBookingCancellationEligibility(booking, 'hotel', fixedNow);
      assert.equal(result.canCancel, true);
      assert.equal(result.reason, 'eligible');
      assert.equal(isBookingCancellationEligible(booking, 'hotel', fixedNow), true);
    });

    test('Scenario 5: Already cancelled hotel booking is blocked', () => {
      const booking = {
        id: 'hotel-cancelled-1',
        bookingType: 'hotel',
        status: 'CANCELLED',
        checkIn: '2026-12-10',
        checkOut: '2026-12-14',
      };
      const result = getBookingCancellationEligibility(booking, 'hotel', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'already_cancelled');
      assert.equal(result.message, 'Booking is already cancelled.');
    });

    test('Scenario 6: Missing or invalid hotel check-in date is blocked safely', () => {
      const booking1 = {
        id: 'hotel-invalid-1',
        bookingType: 'hotel',
        status: 'CONFIRMED',
        checkIn: 'invalid-date',
      };
      const result1 = getBookingCancellationEligibility(booking1, 'hotel', fixedNow);
      assert.equal(result1.canCancel, false);
      assert.equal(result1.reason, 'invalid_date');
      assert.equal(result1.message, 'This booking cannot be cancelled because its scheduled date is missing or invalid.');

      const booking2 = {
        id: 'hotel-missing-1',
        bookingType: 'hotel',
        status: 'CONFIRMED',
        checkIn: '',
      };
      const result2 = getBookingCancellationEligibility(booking2, 'hotel', fixedNow);
      assert.equal(result2.canCancel, false);
      assert.equal(result2.reason, 'invalid_date');
      assert.equal(result2.message, 'This booking cannot be cancelled because its scheduled date is missing or invalid.');
    });
  });

  describe('2. Experience Bookings', () => {
    test('Scenario 1: Past experience booking is blocked', () => {
      const booking = {
        id: 'exp-past-1',
        bookingType: 'experience',
        status: 'CONFIRMED',
        date: '2026-11-20',
        time: '09:00',
      };
      const result = getBookingCancellationEligibility(booking, 'experience', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'date_passed');
      assert.equal(result.message, 'This booking can no longer be cancelled because its scheduled date has passed.');
    });

    test("Scenario 2: Today's experience booking with start time NOT passed is allowed", () => {
      const booking = {
        id: 'exp-today-future',
        bookingType: 'experience',
        status: 'CONFIRMED',
        date: '2026-11-28',
        time: '16:00', // 4:00 PM IST > 12:00 PM IST
      };
      const result = getBookingCancellationEligibility(booking, 'experience', fixedNow);
      assert.equal(result.canCancel, true);
      assert.equal(result.reason, 'eligible');
      assert.equal(result.message, '');
    });

    test("Scenario 3: Today's experience booking with start time passed is blocked", () => {
      const booking = {
        id: 'exp-today-passed',
        bookingType: 'experience',
        status: 'CONFIRMED',
        date: '2026-11-28',
        time: '10:00', // 10:00 AM IST < 12:00 PM IST
      };
      const result = getBookingCancellationEligibility(booking, 'experience', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'date_passed');
      assert.equal(result.message, 'This booking can no longer be cancelled because its scheduled date has passed.');
    });

    test('Scenario 4: Future experience booking is allowed', () => {
      const booking = {
        id: 'exp-future-1',
        bookingType: 'experience',
        status: 'CONFIRMED',
        date: '2026-12-05',
        time: '09:00',
      };
      const result = getBookingCancellationEligibility(booking, 'experience', fixedNow);
      assert.equal(result.canCancel, true);
      assert.equal(result.reason, 'eligible');
    });

    test('Scenario 5: Already cancelled experience booking is blocked', () => {
      const booking = {
        id: 'exp-cancelled-1',
        bookingType: 'experience',
        status: 'CANCELLED',
        date: '2026-12-05',
      };
      const result = getBookingCancellationEligibility(booking, 'experience', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'already_cancelled');
      assert.equal(result.message, 'Booking is already cancelled.');
    });

    test('Scenario 6: Missing or invalid experience date is blocked safely', () => {
      const booking = {
        id: 'exp-invalid-1',
        bookingType: 'experience',
        status: 'CONFIRMED',
        date: '2026-02-31', // invalid calendar date
      };
      const result = getBookingCancellationEligibility(booking, 'experience', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'invalid_date');
      assert.equal(result.message, 'This booking cannot be cancelled because its scheduled date is missing or invalid.');
    });
  });

  describe('3. Holiday Package / Trip Bookings', () => {
    test('Scenario 1: Past trip package is blocked', () => {
      const trip = {
        id: 'trip-past-1',
        status: 'confirmed',
        itinerary: {
          day1: {
            hotel: { checkInDate: '2026-11-15', checkInTime: '14:00' },
          },
        },
      };
      const result = getBookingCancellationEligibility(trip, 'trip', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'date_passed');
      assert.equal(result.message, 'This booking can no longer be cancelled because its scheduled date has passed.');
    });

    test("Scenario 2: Today's trip package with start time NOT passed is allowed", () => {
      const trip = {
        id: 'trip-today-future',
        status: 'confirmed',
        itinerary: {
          day1: {
            hotel: { checkInDate: '2026-11-28', checkInTime: '15:00' }, // 3:00 PM IST > 12:00 PM IST
          },
        },
      };
      const result = getBookingCancellationEligibility(trip, 'trip', fixedNow);
      assert.equal(result.canCancel, true);
      assert.equal(result.reason, 'eligible');
      assert.equal(result.message, '');
    });

    test("Scenario 3: Today's trip package with start time passed is blocked", () => {
      const trip = {
        id: 'trip-today-passed',
        status: 'confirmed',
        itinerary: {
          day1: {
            transport: { pickupAt: '2026-11-28T09:00:00+05:30' }, // 9:00 AM IST < 12:00 PM IST
          },
        },
      };
      const result = getBookingCancellationEligibility(trip, 'trip', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'date_passed');
      assert.equal(result.message, 'This booking can no longer be cancelled because its scheduled date has passed.');
    });

    test('Scenario 4: Future trip package is allowed', () => {
      const trip = {
        id: 'trip-future-1',
        status: 'confirmed',
        startDate: '2026-12-20',
      };
      const result = getBookingCancellationEligibility(trip, 'trip', fixedNow);
      assert.equal(result.canCancel, true);
      assert.equal(result.reason, 'eligible');
    });

    test('Scenario 5: Already cancelled trip package is blocked', () => {
      const trip = {
        id: 'trip-cancelled-1',
        status: 'cancelled',
        startDate: '2026-12-20',
      };
      const result = getBookingCancellationEligibility(trip, 'trip', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'already_cancelled');
      assert.equal(result.message, 'Booking is already cancelled.');
    });

    test('Scenario 6: Missing or invalid trip start date is blocked safely', () => {
      const trip = {
        id: 'trip-invalid-1',
        status: 'confirmed',
        itinerary: {},
      };
      const result = getBookingCancellationEligibility(trip, 'trip', fixedNow);
      assert.equal(result.canCancel, false);
      assert.equal(result.reason, 'invalid_date');
      assert.equal(result.message, 'This booking cannot be cancelled because its scheduled date is missing or invalid.');
    });
  });

  describe('4. UI Component Rendering Verification', () => {
    test('BookingDetailsView renders disabled Cancel button and expired date message for past booking', async () => {
      const BookingDetailsView = (await vite.ssrLoadModule('/src/pages/traveller/BookingDetailsView.jsx')).default;
      const bookingsSlice = (await vite.ssrLoadModule('/src/features/bookingsSlice.js')).default;
      const notificationsSlice = (await vite.ssrLoadModule('/src/features/notificationsSlice.js')).default;

      const store = configureStore({
        reducer: {
          bookings: bookingsSlice,
          notifications: notificationsSlice,
        },
      });

      const pastBooking = {
        id: 'bkg-past-99',
        hotelId: 'h-1',
        hotel: { name: 'Goa Heritage Resort' },
        status: 'CONFIRMED',
        checkIn: '2026-11-10',
        checkOut: '2026-11-15',
        totalAmount: 12000,
      };

      const html = renderToStaticMarkup(
        React.createElement(
          Provider,
          { store },
          React.createElement(BookingDetailsView, {
            booking: pastBooking,
            onCancelClick: () => {},
          })
        )
      );

      assert.ok(html.includes('disabled=""') || html.includes('disabled'), 'Cancel button should be disabled');
      assert.ok(
        html.includes('This booking can no longer be cancelled because its scheduled date has passed.'),
        'Should display the scheduled date passed warning message',
      );
      assert.ok(html.includes('trav-cancellation-expired-msg'), 'Should render the expired msg container');
    });

    test('BookingDetailsView renders active Cancel button for future booking', async () => {
      const BookingDetailsView = (await vite.ssrLoadModule('/src/pages/traveller/BookingDetailsView.jsx')).default;
      const bookingsSlice = (await vite.ssrLoadModule('/src/features/bookingsSlice.js')).default;
      const notificationsSlice = (await vite.ssrLoadModule('/src/features/notificationsSlice.js')).default;

      const store = configureStore({
        reducer: {
          bookings: bookingsSlice,
          notifications: notificationsSlice,
        },
      });

      const futureBooking = {
        id: 'bkg-future-99',
        hotelId: 'h-1',
        hotel: { name: 'Goa Heritage Resort' },
        status: 'CONFIRMED',
        checkIn: '2026-12-25',
        checkOut: '2026-12-28',
        totalAmount: 12000,
      };

      const html = renderToStaticMarkup(
        React.createElement(
          Provider,
          { store },
          React.createElement(BookingDetailsView, {
            booking: futureBooking,
            onCancelClick: () => {},
          })
        )
      );

      assert.ok(html.includes('Cancel Reservation'), 'Should render Cancel Reservation button');
      assert.ok(!html.includes('This booking can no longer be cancelled'), 'Should NOT render expired message');
    });

    test('CancellationModal displays warning banner and disables confirmation for past bookings', async () => {
      const CancellationModal = (await vite.ssrLoadModule('/src/components/checkout/CancellationModal.jsx')).default;
      const bookingsSlice = (await vite.ssrLoadModule('/src/features/bookingsSlice.js')).default;
      const tripsSlice = (await vite.ssrLoadModule('/src/features/tripsSlice.js')).default;
      const notificationsSlice = (await vite.ssrLoadModule('/src/features/notificationsSlice.js')).default;

      const store = configureStore({
        reducer: {
          bookings: bookingsSlice,
          trips: tripsSlice,
          notifications: notificationsSlice,
        },
      });

      const pastBooking = {
        id: 'bkg-past-modal',
        hotel: { name: 'Heritage Villa' },
        status: 'CONFIRMED',
        checkIn: '2026-11-10',
        totalAmount: 5000,
      };

      const html = renderToStaticMarkup(
        React.createElement(
          Provider,
          { store },
          React.createElement(CancellationModal, {
            isOpen: true,
            booking: pastBooking,
            bookingType: 'hotel',
            onClose: () => {},
          })
        )
      );

      assert.ok(
        html.includes('This booking can no longer be cancelled because its scheduled date has passed.'),
        'Modal must show clear warning message',
      );
      assert.ok(html.includes('trav-cancel-alert is-error'), 'Modal must render error alert');
      assert.ok(html.includes('cursor:not-allowed') || html.includes('disabled'), 'Confirm button must be disabled');
    });
  });
});
