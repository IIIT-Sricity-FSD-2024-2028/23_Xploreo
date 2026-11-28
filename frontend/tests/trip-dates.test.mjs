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
  extractTripDateRange,
  formatTripDates,
  mapBackendTrip,
} from '../src/utils/tripTrackingUtils.js';

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

describe('Traveller Portal - Travel Dates Display & Mapping Validation', () => {
  describe('1. Data Mapping & Date Extraction (extractTripDateRange)', () => {
    test('Scenario 1: Upcoming trip with valid start/end dates (e.g. trip-kerala-1)', () => {
      const upcomingTrip = {
        id: 'trip-kerala-1',
        title: 'Kerala Backwaters & Hills Exploration',
        status: 'UPCOMING',
        startDate: '2026-12-10T10:00:00Z',
        endDate: '2026-12-15T18:00:00Z',
      };
      const range = extractTripDateRange(upcomingTrip);
      assert.ok(range, 'Should extract date range');
      assert.equal(range.startDate, '2026-12-10');
      assert.equal(range.endDate, '2026-12-15');

      const formatted = formatTripDates(range.startDate, range.endDate);
      assert.equal(formatted, '10 Dec 2026 – 15 Dec 2026');
    });

    test('Scenario 2: Ongoing trip with valid itinerary dates (e.g. trip-jaipur-1)', () => {
      const ongoingTrip = {
        id: 'trip-jaipur-1',
        title: 'Royal Rajasthan Heritage',
        status: 'ONGOING',
        itinerary: {
          day1: {
            hotel: {
              hotelName: 'Heritage Haveli',
              checkInDate: '2026-05-18T14:00:00Z',
              checkOutDate: '2026-05-25T11:00:00Z',
            },
          },
          days: [],
        },
      };
      const range = extractTripDateRange(ongoingTrip);
      assert.ok(range, 'Should extract date range from itinerary');
      assert.equal(range.startDate, '2026-05-18');
      assert.equal(range.endDate, '2026-05-25');

      const formatted = formatTripDates(range.startDate, range.endDate);
      assert.equal(formatted, '18 May 2026 – 25 May 2026');
    });

    test('Scenario 3: Completed trips with valid dates (e.g. trip-kerala-completed & trip-goa-completed)', () => {
      const completedTripKerala = {
        id: 'trip-kerala-completed',
        title: 'Kerala Backwaters & Hills Exploration',
        status: 'COMPLETED',
        startDate: '2026-04-10T10:00:00Z',
        endDate: '2026-04-15T18:00:00Z',
      };
      const rangeKerala = extractTripDateRange(completedTripKerala);
      assert.ok(rangeKerala);
      assert.equal(rangeKerala.startDate, '2026-04-10');
      assert.equal(rangeKerala.endDate, '2026-04-15');
      assert.equal(formatTripDates(rangeKerala.startDate, rangeKerala.endDate), '10 Apr 2026 – 15 Apr 2026');

      const completedTripGoa = {
        id: 'trip-goa-completed',
        title: 'Goa Coastal Getaway',
        status: 'COMPLETED',
        itinerary: {
          day1: {
            hotel: {
              checkInDate: '2026-03-02T12:00:00Z',
              checkOutDate: '2026-03-05T11:00:00Z',
            },
          },
        },
      };
      const rangeGoa = extractTripDateRange(completedTripGoa);
      assert.ok(rangeGoa);
      assert.equal(rangeGoa.startDate, '2026-03-02');
      assert.equal(rangeGoa.endDate, '2026-03-05');
      assert.equal(formatTripDates(rangeGoa.startDate, rangeGoa.endDate), '2 Mar 2026 – 5 Mar 2026');
    });

    test('Scenario 4: Trip with missing dates (e.g. trip-manali-refunded)', () => {
      const tripWithNoDates = {
        id: 'trip-manali-refunded',
        title: 'Manali Snow Explorer',
        status: 'CANCELLED',
        createdAt: '2026-01-01T00:00:00Z', // Must NOT be used as travel date
        itinerary: { day1: {}, days: [] },
      };
      const range = extractTripDateRange(tripWithNoDates);
      assert.equal(range.startDate, null, 'Must return null and not assume or generate dates');
      assert.equal(range.endDate, null, 'Must return null and not assume or generate dates');
      const formatted = formatTripDates(range.startDate, range.endDate);
      assert.equal(formatted, null, 'Must return null for missing dates');
    });

    test('Scenario 5: Cancelled trip with valid dates preserves and displays dates', () => {
      const cancelledTripWithDates = {
        id: 'trip-cancelled-valid',
        title: 'Shimla Summer Trek',
        status: 'CANCELLED',
        startDate: '2026-06-01T09:00:00Z',
        endDate: '2026-06-05T17:00:00Z',
      };
      const range = extractTripDateRange(cancelledTripWithDates);
      assert.ok(range);
      assert.equal(range.startDate, '2026-06-01');
      assert.equal(range.endDate, '2026-06-05');
      assert.equal(formatTripDates(range.startDate, range.endDate), '1 Jun 2026 – 5 Jun 2026');
    });

    test('Scenario 6: Single-day trip formatting', () => {
      const singleDayTrip = {
        id: 'trip-singleday-1',
        title: 'One-Day Old Delhi Heritage Walk',
        startDate: '2026-11-15T09:00:00Z',
        endDate: '2026-11-15T18:00:00Z',
      };
      const range = extractTripDateRange(singleDayTrip);
      assert.ok(range);
      assert.equal(range.startDate, '2026-11-15');
      assert.equal(range.endDate, '2026-11-15');
      assert.equal(formatTripDates(range.startDate, range.endDate), '15 Nov 2026');
    });

    test('Scenario 7: mapBackendTrip attaches travelDates, startDate, endDate consistently', () => {
      const raw = {
        id: 'trip-kerala-1',
        title: 'Kerala Backwaters & Hills Exploration',
        destination: 'Kerala',
        trackingStatus: 'UPCOMING',
        startDate: '2026-12-10T10:00:00Z',
        endDate: '2026-12-15T18:00:00Z',
      };
      const mapped = mapBackendTrip(raw);
      assert.equal(mapped.startDate, '2026-12-10T10:00:00Z');
      assert.equal(mapped.endDate, '2026-12-15T18:00:00Z');
      assert.equal(mapped.travelDates, '10 Dec 2026 – 15 Dec 2026');
    });
  });

  describe('2. UI Component Rendering Verification', () => {
    test('TravellerTripsList renders travel dates on trip cards', async () => {
      const TravellerTripsList = (await vite.ssrLoadModule('/src/pages/Traveller/TravellerTripsList.jsx')).default;
      const { travellerReducer } = await vite.ssrLoadModule('/src/store/traveller/index.js');
      const notificationsSlice = (await vite.ssrLoadModule('/src/features/notificationsSlice.js')).default;
      const authSlice = (await vite.ssrLoadModule('/src/features/authSlice.js')).default;

      const store = configureStore({
        reducer: {
          auth: authSlice,
          traveller: travellerReducer,
          notifications: notificationsSlice,
        },
      });

      const trips = [
        {
          id: 'trip-kerala-1',
          title: 'Kerala Backwaters & Hills Exploration',
          destination: 'Kerala',
          trackingStatus: 'UPCOMING',
          startDate: '2026-12-10T10:00:00Z',
          endDate: '2026-12-15T18:00:00Z',
        },
        {
          id: 'trip-manali-refunded',
          title: 'Manali Snow Explorer',
          destination: 'Manali',
          trackingStatus: 'CANCELLED',
          itinerary: { day1: {}, days: [] },
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(
          Provider,
          { store },
          React.createElement(TravellerTripsList, {
            trips,
            isLoading: false,
            error: null,
            activeTab: 'all',
            onTabChange: () => {},
            onSelectTrip: () => {},
          })
        )
      );

      assert.ok(html.includes('trip-dates-trip-kerala-1'), 'Must include trip dates container');
      assert.ok(html.includes('10 Dec 2026 – 15 Dec 2026'), 'Must display formatted date range');
      assert.ok(!html.includes('trip-dates-trip-manali-refunded'), 'Trip without dates should not render date badge');
    });

    test('TravellerTripDetailsView renders travel dates in header meta and Day 1 arrival', async () => {
      const TravellerTripDetailsView = (await vite.ssrLoadModule('/src/pages/Traveller/TravellerTripDetailsView.jsx')).default;
      const tripsSlice = (await vite.ssrLoadModule('/src/store/traveller/tripsSlice.js')).default;
      const notificationsSlice = (await vite.ssrLoadModule('/src/features/notificationsSlice.js')).default;
      const authSlice = (await vite.ssrLoadModule('/src/features/authSlice.js')).default;

      const store = configureStore({
        reducer: {
          auth: authSlice,
          trips: tripsSlice,
          notifications: notificationsSlice,
        },
      });

      const trip = {
        id: 'trip-kerala-1',
        planId: 'PLAN-001',
        title: 'Kerala Backwaters & Hills Exploration',
        destination: 'Kerala',
        trackingStatus: 'UPCOMING',
        startDate: '2026-12-10T10:00:00Z',
        endDate: '2026-12-15T18:00:00Z',
        itinerary: {
          day1: {
            title: 'Arrival in Kochi & Hotel Check-in',
            hotel: {
              name: 'Grand Hyatt Kochi',
              checkInTime: '14:00',
              checkInDate: '2026-12-10T14:00:00Z',
              checkOutDate: '2026-12-15T11:00:00Z',
            },
          },
          days: [],
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(
          Provider,
          { store },
          React.createElement(TravellerTripDetailsView, {
            trip,
            onBack: () => {},
          })
        )
      );

      assert.ok(html.includes('10 Dec 2026 – 15 Dec 2026'), 'Must render travel dates in header metadata');
      assert.ok(html.includes('Grand Hyatt Kochi'), 'Must render Day 1 hotel details');
      assert.ok(html.includes('Stay: 10 Dec 2026 – 15 Dec 2026'), 'Must render stay dates in Day 1 timeline');
    });
  });
});
