import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

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

const browseUtils = await vite.ssrLoadModule('/src/utils/browseUtils.js');
const { getExperienceAvailability, getHotelAvailability, getPlanAvailability } = browseUtils;

describe('Traveller Portal - Item Availability & Session Slot Accuracy', () => {
  // Reference date: 2026-11-28
  const referenceDate = new Date('2026-11-28T12:00:00Z');

  describe('1. Experience Slot Availability (getExperienceAvailability)', () => {
    test('Scenario 1: Experience with past slots only (e.g. EXP-DEL-302 on 2026-10-26)', () => {
      const expDel302 = {
        id: 'EXP-DEL-302',
        title: 'Mehrauli Archaeological Park & Qutub Minar Walk',
        capacity: 15,
        booked: 4,
        nextSlot: '2026-10-26 08:30',
        slots: [
          {
            id: 'slot-del-302',
            date: '2026-10-26',
            time: '08:30',
            booked: 4,
            capacity: 15,
            available: true,
          },
        ],
      };

      const availability = getExperienceAvailability(expDel302, referenceDate);
      assert.equal(availability.hasUpcomingSlots, false, 'Should have no upcoming slots');
      assert.equal(availability.isSoldOut, true, 'Should be marked as sold out / unavailable');
      assert.equal(availability.isPast, true, 'Should be recognized as past');
      assert.equal(availability.spotsRemaining, 0, 'Spots remaining on upcoming slots must be 0');
      assert.equal(availability.statusText, 'Session passed');
      assert.equal(availability.nextSlotText, 'No upcoming sessions');
    });

    test('Scenario 2: Experience with mix of past and future slots (e.g. exp-1)', () => {
      const exp1 = {
        id: 'exp-1',
        title: 'Old Delhi Dawn Cycling & Chai Trail',
        capacity: 15,
        booked: 9,
        nextSlot: '2026-11-06 07:00', // Stale past slot in seed
        slots: [
          { date: '2026-09-28', time: '07:00', booked: 12, capacity: 15 }, // Past
          { date: '2026-11-06', time: '07:00', booked: 9, capacity: 15 }, // Past
          { date: '2026-12-05', time: '07:00', booked: 0, capacity: 15 }, // Upcoming future
        ],
      };

      const availability = getExperienceAvailability(exp1, referenceDate);
      assert.equal(availability.hasUpcomingSlots, true);
      assert.equal(availability.isSoldOut, false);
      assert.equal(availability.nextSlotText, '2026-12-05 07:00', 'Should advance to the earliest upcoming available slot');
      assert.equal(availability.spotsRemaining, 15);
      assert.equal(availability.statusText, '15 spots left');
    });

    test('Scenario 3: Experience where all upcoming slots are fully booked', () => {
      const fullExp = {
        id: 'exp-full',
        title: 'Full Moon Taj Mahal Night Tour',
        capacity: 10,
        slots: [
          { date: '2026-12-15', time: '20:00', booked: 10, capacity: 10, available: true },
        ],
      };

      const availability = getExperienceAvailability(fullExp, referenceDate);
      assert.equal(availability.hasUpcomingSlots, true);
      assert.equal(availability.isSoldOut, true);
      assert.equal(availability.spotsRemaining, 0);
      assert.equal(availability.statusText, 'Fully Booked');
    });
  });

  describe('2. Hotel Room Availability (getHotelAvailability)', () => {
    test('Scenario 1: Hotel with zero available rooms or sold out status', () => {
      const soldOutHotel = {
        id: 'h-soldout',
        name: 'The Heritage Palace',
        status: 'active',
        totalRooms: 20,
        availableRooms: 0,
      };

      const availability = getHotelAvailability(soldOutHotel);
      assert.equal(availability.isSoldOut, true);
      assert.equal(availability.roomsLeft, 0);
      assert.equal(availability.statusText, 'Sold Out');
    });

    test('Scenario 2: Hotel with low room count (<= 3 rooms)', () => {
      const lowHotel = {
        id: 'h-low',
        name: 'Boutique Haveli',
        status: 'active',
        totalRooms: 10,
        availableRooms: 2,
      };

      const availability = getHotelAvailability(lowHotel);
      assert.equal(availability.isSoldOut, false);
      assert.equal(availability.roomsLeft, 2);
      assert.equal(availability.statusText, 'Only 2 rooms left!');
    });

    test('Scenario 3: Hotel with ample available rooms', () => {
      const hotel = {
        id: 'h-ample',
        name: 'Grand Hyatt Kochi',
        status: 'active',
        totalRooms: 30,
        availableRooms: 18,
      };

      const availability = getHotelAvailability(hotel);
      assert.equal(availability.isSoldOut, false);
      assert.equal(availability.roomsLeft, 18);
      assert.equal(availability.statusText, '18 rooms available');
    });
  });

  describe('3. Tour Package / Plan Availability (getPlanAvailability)', () => {
    test('Scenario 1: Plan with status unavailable or sold_out', () => {
      const unavailablePlan = {
        id: 'plan-unavail',
        title: 'Jaipur 3-Day Express',
        status: 'unavailable',
      };

      const availability = getPlanAvailability(unavailablePlan, referenceDate);
      assert.equal(availability.isSoldOut, true);
      assert.equal(availability.statusText, 'Sold Out');
    });

    test('Scenario 2: Plan with past fixed departure date', () => {
      const pastPlan = {
        id: 'plan-past',
        title: 'Diwali Heritage Expedition',
        status: 'available',
        startDate: '2026-10-15',
        isFlexible: false,
      };

      const availability = getPlanAvailability(pastPlan, referenceDate);
      assert.equal(availability.isSoldOut, true);
      assert.equal(availability.statusText, 'Departed');
    });

    test('Scenario 3: Active upcoming plan', () => {
      const activePlan = {
        id: 'plan-active',
        title: 'Kerala Backwaters & Hills Exploration',
        status: 'available',
        startDate: '2026-12-10',
      };

      const availability = getPlanAvailability(activePlan, referenceDate);
      assert.equal(availability.isSoldOut, false);
      assert.equal(availability.statusText, 'Available');
    });
  });

  describe('4. UI Card Rendering Component Verification', () => {
    test('BrowseExperienceCard displays Session Passed and 0 spots for expired slot (e.g. EXP-DEL-302)', async () => {
      const BrowseExperienceCard = (await vite.ssrLoadModule('/src/pages/Traveller/BrowseExperienceCard.jsx')).default;

      const expDel302 = {
        id: 'EXP-DEL-302',
        title: 'Mehrauli Archaeological Park & Qutub Minar Walk',
        destination: 'Delhi',
        category: 'culture',
        capacity: 15,
        booked: 4,
        nextSlot: '2026-10-26 08:30',
        slots: [
          {
            id: 'slot-del-302',
            date: '2026-10-26',
            time: '08:30',
            booked: 4,
            capacity: 15,
            available: true,
          },
        ],
      };

      const html = renderToStaticMarkup(
        React.createElement(BrowseExperienceCard, {
          experience: expDel302,
          onSelect: () => {},
        })
      );

      assert.ok(html.includes('Session Passed') || html.includes('Sold Out'), 'Should render sold out / session passed badge');
      assert.ok(html.includes('No upcoming sessions'), 'Should indicate no upcoming sessions');
      assert.ok(html.includes('Session passed'), 'Pill should display session passed');
      assert.ok(!html.includes('11 spots left'), 'Must NOT deceive traveller with 11 spots left when session has passed');
    });

    test('BrowseHotelCard displays Sold Out badge and pill when rooms are 0', async () => {
      const BrowseHotelCard = (await vite.ssrLoadModule('/src/pages/Traveller/BrowseHotelCard.jsx')).default;

      const hotel = {
        id: 'hotel-soldout-1',
        name: 'The Vintage Palace',
        city: 'Jaipur',
        totalRooms: 10,
        availableRooms: 0,
      };

      const html = renderToStaticMarkup(
        React.createElement(BrowseHotelCard, {
          hotel,
          onSelect: () => {},
        })
      );

      assert.ok(html.includes('Sold Out'), 'Should render Sold Out badge or status');
      assert.ok(html.includes('hotel-rooms-hotel-soldout-1'), 'Should render rooms indicator');
    });

    test('BrowsePlanCard displays Sold Out badge and pill when status is unavailable', async () => {
      const BrowsePlanCard = (await vite.ssrLoadModule('/src/pages/Traveller/BrowsePlanCard.jsx')).default;

      const plan = {
        id: 'plan-soldout-1',
        title: 'Jaipur 3-Day Express',
        destination: 'Jaipur',
        status: 'unavailable',
      };

      const html = renderToStaticMarkup(
        React.createElement(BrowsePlanCard, {
          plan,
          onSelect: () => {},
        })
      );

      assert.ok(html.includes('Sold Out'), 'Should render Sold Out badge');
      assert.ok(html.includes('plan-status-plan-soldout-1'), 'Should render plan status container');
    });
  });
});
