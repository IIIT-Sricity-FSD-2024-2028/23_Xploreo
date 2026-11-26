import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test, { after, beforeEach, describe } from 'node:test';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '..');

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    _dump: () => Object.fromEntries(map.entries()),
  };
}

globalThis.localStorage = createMemoryStorage();
globalThis.sessionStorage = createMemoryStorage();

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

let fetchHandler = async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
});

globalThis.fetch = async (url, options = {}) => {
  const res = await fetchHandler(String(url), options);
  const payload = res.json ? await res.json() : (res.body ?? {});
  return {
    ok: res.ok,
    status: res.status ?? (res.ok ? 200 : 500),
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
};

const vite = await createServer({
  root: FRONTEND_ROOT,
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
});

const { configureStore } = await import('@reduxjs/toolkit');
const session = await vite.ssrLoadModule('/src/services/session.js');
const authModule = await vite.ssrLoadModule('/src/features/authSlice.js');
const dashboardModule = await vite.ssrLoadModule('/src/features/dashboardSlice.js');
const browseModule = await vite.ssrLoadModule('/src/features/browseSlice.js');
const bookingsModule = await vite.ssrLoadModule('/src/features/bookingsSlice.js');
const tripsModule = await vite.ssrLoadModule('/src/features/tripsSlice.js');
const reviewsModule = await vite.ssrLoadModule('/src/features/reviewsSlice.js');
const ticketsModule = await vite.ssrLoadModule('/src/features/supportTicketsSlice.js');
const checkoutModule = await vite.ssrLoadModule('/src/features/checkoutSlice.js');
const notificationsModule = await vite.ssrLoadModule('/src/features/notificationsSlice.js');
const validationModule = await vite.ssrLoadModule('/src/utils/bookingValidationUtils.js');

after(async () => {
  await vite.close();
});

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authModule.default,
      dashboard: dashboardModule.default,
      browse: browseModule.default,
      bookings: bookingsModule.default,
      trips: tripsModule.default,
      reviews: reviewsModule.default,
      supportTickets: ticketsModule.default,
      checkout: checkoutModule.default,
      notifications: notificationsModule.default,
    },
  });
}

function futureIso(daysFromNow = 5) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
}

beforeEach(() => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  session.clearUser();
  fetchHandler = async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  });
});

describe('Phase 1 — Browser Storage Compliance & Auth Restoration', () => {
  test('login stores ONLY minimal auth credentials (never xploreoUser profile or domain data)', async () => {
    const token = makeJwt({
      userId: 'T001',
      username: 'T001',
      role: 'traveller',
      region: 'Delhi',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    fetchHandler = async (url) => {
      assert.match(url, /\/auth\/login$/);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          token,
          user: {
            userId: 'T001',
            username: 'T001',
            role: 'traveller',
            name: 'Anjali Sharma',
            email: 'anjali@xploreo.com',
            phone: '9123456780',
            status: 'active',
            location: 'New Delhi',
            region: 'Delhi',
            token,
          },
        }),
      };
    };

    const store = createTestStore();
    await store.dispatch(authModule.loginUser({ username: 'T001', password: 'TRA@123' }));

    const lsDump = globalThis.localStorage._dump();
    const ssDump = globalThis.sessionStorage._dump();

    assert.equal(lsDump.xploreoUser, undefined);
    assert.equal(ssDump.xploreoUser, undefined);
    assert.ok(lsDump.xploreoAuthSession);
    assert.ok(ssDump.xploreoAuthSession);

    const storedLs = JSON.parse(lsDump.xploreoAuthSession);
    assert.deepEqual(storedLs, {
      role: 'traveller',
      token,
      userId: 'T001',
      username: 'T001',
    });
    assert.equal(storedLs.name, undefined);
    assert.equal(storedLs.email, undefined);
    assert.equal(storedLs.phone, undefined);
    assert.equal(storedLs.location, undefined);

    // Full profile remains strictly in Redux RAM
    const authUser = authModule.selectAuthUser(store.getState());
    assert.equal(authUser.name, 'Anjali Sharma');
    assert.equal(authUser.email, 'anjali@xploreo.com');
  });

  test('migrates legacy xploreoUser safely by stripping profile fields and removing legacy keys', async () => {
    const token = makeJwt({ userId: 'T002', username: 'T002', role: 'traveller' });
    globalThis.localStorage.setItem('xploreoUser', JSON.stringify({
      userId: 'T002',
      username: 'T002',
      role: 'traveller',
      name: 'Kunal Kapoor',
      email: 'kunal@example.com',
      phone: '9812345673',
      token,
    }));

    // Simulate cold browser boot with empty tab memory (`activeUser === undefined`).
    const freshSession = await vite.ssrLoadModule(`/src/services/session.js?cold=${Date.now()}`);
    const restored = freshSession.getUser();
    assert.deepEqual(restored, {
      role: 'traveller',
      token,
      userId: 'T002',
      username: 'T002',
    });
    assert.equal(globalThis.localStorage.getItem('xploreoUser'), null);
    assert.equal(globalThis.sessionStorage.getItem('xploreoUser'), null);
    const saved = JSON.parse(globalThis.localStorage.getItem('xploreoAuthSession'));
    assert.equal(saved.email, undefined);
    assert.equal(saved.name, undefined);
  });

  test('restoreAuthSession hydrates Traveller profile into Redux from /traveller/:id without writing to storage', async () => {
    const token = makeJwt({ userId: 'T001', username: 'T001', role: 'traveller' });
    session.storeUser({ token, userId: 'T001', username: 'T001', role: 'traveller' });

    fetchHandler = async (url, options) => {
      assert.match(url, /\/traveller\/T001$/);
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          userId: 'T001',
          fname: 'Anjali',
          lname: 'Sharma',
          email: 'anjali@xploreo.com',
          phno: 9123456780,
          interests: ['food', 'culture'],
        }),
      };
    };

    const store = createTestStore();
    store.dispatch(authModule.hydrateSession(session.getUser()));
    await store.dispatch(authModule.restoreAuthSession());

    const state = store.getState();
    assert.equal(authModule.selectIsAuthenticated(state), true);
    assert.equal(authModule.selectAuthUser(state).name, 'Anjali Sharma');
    assert.equal(authModule.selectAuthUser(state).email, 'anjali@xploreo.com');
    assert.equal(authModule.selectProfileHydrated(state), true);

    // Storage must still contain NO profile fields
    const saved = JSON.parse(globalThis.localStorage.getItem('xploreoAuthSession'));
    assert.equal(saved.email, undefined);
    assert.equal(saved.name, undefined);
  });

  test('restoreAuthSession falls back cleanly on 404 and clears session on 401/expired token', async () => {
    const validToken = makeJwt({ userId: 'NEW01', username: 'NEW01', role: 'traveller' });
    session.storeUser({ token: validToken, userId: 'NEW01', username: 'NEW01', role: 'traveller' });

    fetchHandler = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    });

    const store = createTestStore();
    store.dispatch(authModule.hydrateSession(session.getUser()));
    await store.dispatch(authModule.restoreAuthSession());
    assert.equal(authModule.selectIsAuthenticated(store.getState()), true);

    fetchHandler = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid token' }),
    });
    const res401 = await store.dispatch(authModule.restoreAuthSession());
    assert.equal(res401.meta.requestStatus, 'rejected');
    assert.equal(authModule.selectIsAuthenticated(store.getState()), false);
    assert.equal(globalThis.localStorage.getItem('xploreoAuthSession'), null);
  });

  test('logoutSession clears auth storage (zero GUEST placeholder), handles lifecycle, and resets all domain slices', async () => {
    const token = makeJwt({ userId: 'T001', username: 'T001', role: 'traveller' });
    session.storeUser({ token, userId: 'T001', username: 'T001', role: 'traveller' });

    const store = createTestStore();
    store.dispatch(authModule.setAuthUser({ userId: 'T001', role: 'traveller', name: 'Anjali', token }));
    store.dispatch(reviewsModule.addDemoReview({ id: 'rev-1', rating: 5, comment: 'Great experience here!' }));
    store.dispatch(checkoutModule.setGuestCount(4));

    const promise = store.dispatch(authModule.logoutSession());
    assert.equal(authModule.selectAuthLoading(store.getState()), true);
    await promise;

    assert.equal(authModule.selectAuthLoading(store.getState()), false);
    assert.equal(authModule.selectIsAuthenticated(store.getState()), false);
    assert.equal(authModule.selectAuthUser(store.getState()).role, 'default');
    assert.equal(globalThis.localStorage.length, 0);
    assert.equal(globalThis.sessionStorage.length, 0);
    assert.equal(reviewsModule.selectReviewsList(store.getState()).length, 0);
    assert.equal(checkoutModule.selectCheckoutGuestCount(store.getState()), 2);

    // Cross-tab logout without matching remembered localStorage account also must not persist GUEST in sessionStorage.
    session.storeUser({ token: makeJwt({ userId: 'T002', role: 'traveller' }), userId: 'T002', role: 'traveller' });
    session.storeUser({ token: makeJwt({ userId: 'T001', role: 'traveller' }), userId: 'T001', role: 'traveller' });
    globalThis.localStorage.setItem('xploreoAuthSession', JSON.stringify({
      role: 'traveller',
      token: makeJwt({ userId: 'T002', role: 'traveller' }),
      userId: 'T002',
      username: 'T002',
    }));
    session.clearUser();
    assert.equal(globalThis.sessionStorage.length, 0);
    assert.equal(session.getUser().role, 'default');
  });
});

describe('Phase 2 & 3 — Browse, Bookings, Guides, Trips, Reviews, Tickets, Notifications, Checkout & Lifecycles', () => {
  test('browseSlice updates filters, loads hotels/experiences/plans, and handles detail error', async () => {
    fetchHandler = async (url) => {
      if (url.endsWith('/hotels')) {
        return { ok: true, status: 200, json: async () => ([{ id: 'H1', name: 'Royal Palace', city: 'Jaipur', status: 'active' }]) };
      }
      if (url.includes('/hotels/MISSING')) {
        return { ok: false, status: 404, json: async () => ({ message: 'Hotel not found' }) };
      }
      return { ok: true, status: 200, json: async () => ([]) };
    };

    const store = createTestStore();
    store.dispatch(browseModule.setBrowseFilters({ searchQuery: 'Jaipur', minStars: 4 }));
    store.dispatch(browseModule.toggleBrowseAmenity('wifi'));
    assert.equal(browseModule.selectBrowseFilters(store.getState()).selectedAmenities.includes('wifi'), true);

    await store.dispatch(browseModule.fetchBrowseHotels());
    assert.equal(browseModule.selectBrowseHotels(store.getState()).items.length, 1);

    await store.dispatch(browseModule.fetchBrowseItemDetail({ type: 'hotel', id: 'MISSING' }));
    assert.equal(browseModule.selectBrowseDetail(store.getState()).error.status, 404);
  });

  test('bookingsSlice & capacity validation: booking creation, guide picker selection, and cancellation result cleanup', async () => {
    const checkIn = futureIso(10);
    const checkOut = futureIso(12);
    const validCapacity = validationModule.validateHotelRoomBooking({
      hotel: { id: 'H1', status: 'active' },
      room: { id: 'R1', status: 'active', maxOccupancy: 2, availableRooms: 2 },
      roomsCount: 1,
      guestsCount: 2,
      checkIn,
      checkOut,
      today: futureIso(0),
    });
    assert.equal(validCapacity.valid, true);

    const overflowCapacity = validationModule.validateHotelRoomBooking({
      hotel: { id: 'H1', status: 'active' },
      room: { id: 'R1', status: 'active', maxOccupancy: 2, availableRooms: 2 },
      roomsCount: 1,
      guestsCount: 4,
      checkIn,
      checkOut,
      today: futureIso(0),
    });
    assert.equal(overflowCapacity.valid, false);
    assert.match(overflowCapacity.error, /occup|guest|capacity/i);

    const store = createTestStore();
    assert.equal(bookingsModule.selectExperienceAvailableGuides(store.getState(), 'eb-1'), null);

    fetchHandler = async (url, opts) => {
      if (url.endsWith('/experience-guides/eb-1/available')) {
        return { ok: true, status: 200, json: async () => ([{ guideId: 'G001', name: 'Sreekar', pricePerPerson: 500, rating: 4.8 }]) };
      }
      if (url.endsWith('/experience-guides/eb-1/request')) {
        if (opts.method === 'POST') {
          return { ok: true, status: 200, json: async () => ({ id: 'eb-1', guideId: 'G001', guideStatus: 'requested' }) };
        }
        if (opts.method === 'DELETE') {
          return { ok: true, status: 200, json: async () => ({ message: 'cancelled' }) };
        }
      }
      if (url.endsWith('/bookings/b-1/cancel')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'b-1',
            status: 'CANCELLED',
            refundEligibility: 'ELIGIBLE',
            refundStatus: 'SUCCESS',
            refundAmount: 4200,
            refundReference: 'REF-100',
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const gReq = store.dispatch(bookingsModule.fetchExperienceAvailableGuides('eb-1'));
    assert.equal(bookingsModule.selectExperienceGuidesLoading(store.getState(), 'eb-1'), true);
    await gReq;
    assert.equal(bookingsModule.selectExperienceAvailableGuides(store.getState(), 'eb-1').length, 1);

    const reqPromise = store.dispatch(bookingsModule.requestGuideForExperienceBooking({ bookingId: 'eb-1', guideId: 'G001' }));
    assert.equal(bookingsModule.selectBookingGuideActionLoading(store.getState()), true);
    await reqPromise;
    assert.equal(bookingsModule.selectBookingGuideActionLoading(store.getState()), false);

    // Rejected cancel transitions clear loading and populate guideActionError
    fetchHandler = async () => ({ ok: false, status: 400, json: async () => ({ message: 'Cannot cancel guide now' }) });
    const failCancel = await store.dispatch(bookingsModule.cancelGuideForExperienceBooking('eb-1'));
    assert.equal(failCancel.meta.requestStatus, 'rejected');
    assert.equal(bookingsModule.selectBookingGuideActionLoading(store.getState()), false);
    assert.match(bookingsModule.selectBookingGuideActionError(store.getState()), /Cannot cancel guide now/);

    // Cancellation result stored in Redux instead of CancellationModal local state
    fetchHandler = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'b-1',
        status: 'CANCELLED',
        refundEligibility: 'ELIGIBLE',
        refundStatus: 'SUCCESS',
        refundAmount: 4200,
      }),
    });
    await store.dispatch(bookingsModule.cancelTravellerBooking({ id: 'b-1', bookingType: 'hotel', reason: 'Schedule conflict' }));
    assert.equal(bookingsModule.selectBookingCancellationResult(store.getState()).result.refundAmount, 4200);
    store.dispatch(bookingsModule.clearBookingCancellationResult());
    assert.equal(bookingsModule.selectBookingCancellationResult(store.getState()), null);
  });

  test('tripsSlice full AsyncThunk lifecycles (pending/fulfilled/rejected) across trips, refund retry, and guide requests', async () => {
    const store = createTestStore();

    fetchHandler = async (url, opts) => {
      if (url.endsWith('/trips') && opts.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ id: 'TR1', travellerId: 'T001', planId: 'P1', status: 'confirmed', totalAmount: 9000 }) };
      }
      if (url.endsWith('/trips/TR1') && opts.method === 'PATCH') {
        return { ok: true, status: 200, json: async () => ({ id: 'TR1', travellers: 3, status: 'confirmed' }) };
      }
      if (url.endsWith('/trips/TR1/guide-request') && opts.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ id: 'TR1', status: 'pending_guide_confirm', guideId: 'G001', guideName: 'Sreekar' }) };
      }
      if (url.endsWith('/trips/TR1/cancel')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'TR1',
            status: 'cancelled',
            refundEligibility: 'ELIGIBLE',
            refundStatus: 'SUCCESS',
            refundAmount: 9000,
            refundReference: 'TR-REF-1',
          }),
        };
      }
      return { ok: false, status: 400, json: async () => ({ message: 'Refund retry failed' }) };
    };

    const createP = store.dispatch(tripsModule.createTravellerTrip({ planId: 'P1' }));
    assert.equal(tripsModule.selectTripActionLoading(store.getState()), true);
    await createP;
    assert.equal(tripsModule.selectTripsList(store.getState())[0].id, 'TR1');

    await store.dispatch(tripsModule.updateTravellerTrip({ tripId: 'TR1', patch: { travellers: 3 } }));
    const guideP = store.dispatch(tripsModule.requestGuideForTrip({ tripId: 'TR1', guideId: 'G001' }));
    assert.equal(tripsModule.selectTripGuideActionLoading(store.getState()), true);
    await guideP;
    assert.equal(tripsModule.selectTripsList(store.getState())[0].guideId, 'G001');

    await store.dispatch(tripsModule.cancelTravellerTrip({ id: 'TR1', reason: 'Change of travel plans' }));
    assert.equal(tripsModule.selectTripCancellationResult(store.getState()).result.refundReference, 'TR-REF-1');

    const failRetry = await store.dispatch(tripsModule.retryTravellerTripRefund('TR1'));
    assert.equal(failRetry.meta.requestStatus, 'rejected');
    assert.equal(tripsModule.selectTripActionLoading(store.getState()), false);
    assert.equal(tripsModule.selectTripActionError(store.getState()), 'Refund retry failed');

    const failGuideCancel = await store.dispatch(tripsModule.cancelGuideForTrip('TR1'));
    assert.equal(failGuideCancel.meta.requestStatus, 'rejected');
    assert.equal(tripsModule.selectTripGuideActionLoading(store.getState()), false);
    assert.ok(tripsModule.selectTripGuideActionError(store.getState()));

    const failDetail = await store.dispatch(tripsModule.fetchTripDetail('NOPE'));
    assert.equal(failDetail.meta.requestStatus, 'rejected');
    assert.ok(tripsModule.selectTripDetailError(store.getState()));
  });

  test('reviewsSlice, supportTicketsSlice, notificationsSlice lifecycles and error handling', async () => {
    const store = createTestStore();

    fetchHandler = async (url, opts) => {
      if (url.endsWith('/reviews') && opts.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ id: 55, rating: 5, comment: 'Wonderful stay!', tripId: 'TR1' }) };
      }
      if (url.endsWith('/reviews/55') && opts.method === 'PATCH') {
        return { ok: true, status: 200, json: async () => ({ id: 55, rating: 4, comment: 'Updated stay comment!' }) };
      }
      if (url.endsWith('/reviews/55') && opts.method === 'DELETE') {
        return { ok: false, status: 500, json: async () => ({ message: 'Delete restricted' }) };
      }
      if (url.endsWith('/tickets') && opts.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ id: 'TK-1', subject: 'Refund issue', status: 'open' }) };
      }
      if (url.endsWith('/tickets/TK-1') && opts.method === 'PATCH') {
        return { ok: false, status: 403, json: async () => ({ message: 'TechAdmin only' }) };
      }
      if (url.endsWith('/notifications')) {
        return { ok: true, status: 200, json: async () => ([{ id: 'N1', message: 'Confirmed', read: false }]) };
      }
      if (url.endsWith('/notifications/unread-count')) {
        return { ok: true, status: 200, json: async () => ({ unreadCount: 1 }) };
      }
      if (url.endsWith('/notifications/N1/read')) {
        return { ok: true, status: 200, json: async () => ({ id: 'N1', read: true }) };
      }
      if (url.endsWith('/notifications/read-all')) {
        return { ok: false, status: 500, json: async () => ({ message: 'Read all failed' }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    await store.dispatch(reviewsModule.submitReview({ rating: 5, comment: 'Wonderful stay!', tripId: 'TR1', targetType: 'hotel', targetId: 'H1' }));
    assert.equal(reviewsModule.selectLastSubmittedReview(store.getState()).id, 55);

    const updP = store.dispatch(reviewsModule.updateReviewItem({ id: 55, patch: { rating: 4, comment: 'Updated stay comment!' } }));
    assert.equal(reviewsModule.selectReviewActionLoading(store.getState()), true);
    await updP;
    assert.equal(reviewsModule.selectReviewsList(store.getState())[0].rating, 4);

    const delFail = await store.dispatch(reviewsModule.deleteReviewItem(55));
    assert.equal(delFail.meta.requestStatus, 'rejected');
    assert.equal(reviewsModule.selectReviewActionError(store.getState()), 'Delete restricted');

    // Tickets lifecycle
    await store.dispatch(ticketsModule.createSupportTicket({ subject: 'Refund issue', message: 'Need help with refund' }));
    assert.equal(ticketsModule.selectLastCreatedTicket(store.getState()).id, 'TK-1');
    const resolveFail = await store.dispatch(ticketsModule.resolveSupportTicket({ ticketId: 'TK-1', resolution: 'Fixed' }));
    assert.equal(resolveFail.meta.requestStatus, 'rejected');
    assert.equal(ticketsModule.selectSupportTicketResolving(store.getState()), false);
    assert.equal(ticketsModule.selectSupportTicketResolveError(store.getState()), 'TechAdmin only');

    // Notifications lifecycle
    await store.dispatch(notificationsModule.fetchNotifications());
    assert.equal(notificationsModule.selectUnreadNotificationCount(store.getState()), 1);
    const readOneP = store.dispatch(notificationsModule.markNotificationRead('N1'));
    assert.equal(notificationsModule.selectNotificationActionLoading(store.getState()), true);
    await readOneP;
    assert.equal(notificationsModule.selectUnreadNotificationCount(store.getState()), 0);

    const readAllFail = await store.dispatch(notificationsModule.markAllNotificationsRead());
    assert.equal(readAllFail.meta.requestStatus, 'rejected');
    assert.equal(notificationsModule.selectNotificationActionLoading(store.getState()), false);
    assert.equal(notificationsModule.selectNotificationsError(store.getState()), 'Read all failed');
  });

  test('checkoutSlice enforces capacity validation, handles NON_SUCCESS outcomes, and persists succeeded booking cleanly', async () => {
    const store = createTestStore();
    const checkIn = futureIso(5);
    const checkOut = futureIso(7);

    fetchHandler = async (url, opts) => {
      if (url.endsWith('/hotels/H1')) {
        return { ok: true, status: 200, json: async () => ({ id: 'H1', name: 'Lake Resort', status: 'active' }) };
      }
      if (url.endsWith('/hotels/H1/rooms')) {
        return { ok: true, status: 200, json: async () => ([{ id: 'R1', type: 'Deluxe Room', status: 'active', maxOccupancy: 2, availableRooms: 2 }]) };
      }
      if (url.endsWith('/bookings') && opts.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ id: 'BK-901', hotelId: 'H1', status: 'CONFIRMED', totalAmount: 16800 }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    // Capacity exceeded -> rejected before payment
    const badCap = await store.dispatch(checkoutModule.processCheckoutPayment({
      selectedItem: { id: 'H1', type: 'hotel', roomId: 'R1', roomType: 'Deluxe Room', checkIn, checkOut },
      guestCount: 5,
      roomCount: 1,
      travellerDetails: { firstName: 'Anjali', lastName: 'Sharma', email: 'anjali@xploreo.com', phone: '9123456780' },
      totalAmount: 16800,
      activeUserId: 'T001',
    }));
    assert.equal(badCap.meta.requestStatus, 'rejected');
    assert.match(checkoutModule.selectCheckoutErrorMessage(store.getState()), /max|occup|2|room/i);

    // Simulated FAILURE outcome -> Step 3 with error message, does not create booking
    const simFail = await store.dispatch(checkoutModule.processCheckoutPayment({
      selectedItem: { id: 'H1', type: 'hotel', roomId: 'R1', roomType: 'Deluxe Room', checkIn, checkOut },
      guestCount: 2,
      roomCount: 1,
      travellerDetails: { firstName: 'Anjali', lastName: 'Sharma', email: 'anjali@xploreo.com', phone: '9123456780' },
      simulatedOutcome: 'FAILURE',
      totalAmount: 16800,
      activeUserId: 'T001',
    }));
    assert.equal(simFail.meta.requestStatus, 'fulfilled');
    assert.equal(simFail.payload.outcome, 'NON_SUCCESS');
    assert.equal(bookingsModule.selectBookingsList(store.getState()).length, 0);

    // Simulated SUCCESS outcome -> creates booking in bookingsSlice
    const simOk = await store.dispatch(checkoutModule.processCheckoutPayment({
      selectedItem: { id: 'H1', type: 'hotel', roomId: 'R1', roomType: 'Deluxe Room', checkIn, checkOut },
      guestCount: 2,
      roomCount: 1,
      travellerDetails: { firstName: 'Anjali', lastName: 'Sharma', email: 'anjali@xploreo.com', phone: '9123456780' },
      simulatedOutcome: 'SUCCESS',
      totalAmount: 16800,
      activeUserId: 'T001',
    }));
    assert.equal(simOk.meta.requestStatus, 'fulfilled');
    assert.equal(simOk.payload.outcome, 'SUCCEEDED');
    assert.equal(bookingsModule.selectBookingsList(store.getState())[0].id, 'BK-901');

    store.dispatch(checkoutModule.resetCheckoutState());
    assert.equal(checkoutModule.selectCheckoutItem(store.getState()), null);
  });
});
