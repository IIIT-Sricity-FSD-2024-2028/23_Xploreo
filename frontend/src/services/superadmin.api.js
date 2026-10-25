import { fetchData } from './api.js';
import { getToken, getUser } from './session.js';
import {
  DEMO_DASHBOARD_METRICS,
  DEMO_BOOKING_VELOCITY,
  DEMO_RECENT_BOOKINGS,
  DEMO_OPERATIONS_METRICS,
  DEMO_TRANSACTION_LEDGER,
  DEMO_REFUND_QUEUE,
  DEMO_DISPUTES,
  DEMO_USERS_AND_PARTNERS,
  DEMO_FINANCE_METRICS,
  DEMO_EARNINGS_SERIES,
  DEMO_PAYOUTS,
} from '../mocks/superadmin/superadmin.fixture.js';

/**
 * Backend base URL. Defaults to localhost:3000 if not specified in env.
 */
const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  'http://localhost:3000/api';

/**
 * Custom Error class that retains HTTP status and field messages.
 */
export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * In-memory mutable store for SuperAdmin mock operations.
 * Isolates demo actions from backend and avoids state leaks.
 */
let mockStore = {
  users: JSON.parse(JSON.stringify(DEMO_USERS_AND_PARTNERS)),
  recentBookings: JSON.parse(JSON.stringify(DEMO_RECENT_BOOKINGS)),
  ledger: JSON.parse(JSON.stringify(DEMO_TRANSACTION_LEDGER)),
  refunds: JSON.parse(JSON.stringify(DEMO_REFUND_QUEUE)),
  disputes: JSON.parse(JSON.stringify(DEMO_DISPUTES)),
  payouts: JSON.parse(JSON.stringify(DEMO_PAYOUTS)),
};

/**
 * Helper to determine if SuperAdmin mock mode is enabled.
 * Uses VITE_MOCKS environment variable (e.g. VITE_MOCKS=all or VITE_MOCKS=superadmin).
 * Defaults to true if no backend URL or explicitly set to mock.
 */
export function isSuperAdminMockMode() {
  const envMocks =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCKS
      ? import.meta.env.VITE_MOCKS
      : null;
  if (!envMocks) {
    return false;
  }
  return envMocks === 'all' || envMocks.split(',').map((s) => s.trim()).includes('superadmin');
}

/**
 * Resets in-memory mock store to initial demo fixtures.
 */
export function resetSuperAdminMockStore() {
  mockStore = {
    users: JSON.parse(JSON.stringify(DEMO_USERS_AND_PARTNERS)),
    recentBookings: JSON.parse(JSON.stringify(DEMO_RECENT_BOOKINGS)),
    ledger: JSON.parse(JSON.stringify(DEMO_TRANSACTION_LEDGER)),
    refunds: JSON.parse(JSON.stringify(DEMO_REFUND_QUEUE)),
    disputes: JSON.parse(JSON.stringify(DEMO_DISPUTES)),
    payouts: JSON.parse(JSON.stringify(DEMO_PAYOUTS)),
  };
}

/**
 * Builds standard SuperAdmin authorization headers for live backend calls.
 */
function buildAdminHeaders(session = {}) {
  const activeUser = getUser();
  const userId = session.userId || session.userid || activeUser?.userId || activeUser?.id || activeUser?.username || 'SA001';
  const role = session.role || activeUser?.role || 'superadmin';
  const headers = {
    'x-user-role': role,
    'x-user-id': String(userId),
  };
  const token = session.token || session.user?.token || getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ============================================================================
// 1. DASHBOARD & VELOCITY METHODS
// ============================================================================

/**
 * Fetches high-level executive dashboard KPI metrics.
 * 
 * @param {Object} [session] - User session identity
 * @returns {Promise<Object>} Dashboard KPI metrics
 */
export async function getDashboardMetrics(session = {}) {
  if (isSuperAdminMockMode()) {
    return { ...DEMO_DASHBOARD_METRICS, totalUsers: mockStore.users.length };
  }

  try {
    // Live mode: Aggregates real users and trips counts
    const headers = buildAdminHeaders(session);
    const [usersRes, tripsRes] = await Promise.all([
      fetchData(`${BASE_URL}/auth/users`, { headers }),
      fetchData(`${BASE_URL}/trips`, { headers }),
    ]);

    const usersCount = Array.isArray(usersRes) ? usersRes.length : 0;
    const trips = Array.isArray(tripsRes) ? tripsRes : [];
    const totalRevenue = trips.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
    const activeTripsCount = trips.filter((t) => t.status === 'started' || t.status === 'confirmed').length;

    return {
      totalUsers: usersCount,
      totalUsersChangePct: 0,
      grossRevenue: totalRevenue,
      grossRevenueChangePct: 0,
      totalBookings: trips.length,
      totalBookingsChangePct: 0,
      activeTrips: activeTripsCount,
      activeTripsChangePct: 0,
      periodLabel: 'Live Performance',
    };
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to load executive dashboard metrics.', status);
  }
}

/**
 * Fetches booking velocity & engagement series for charts.
 * 
 * @param {'weekly' | 'monthly' | 'quarterly'} [timeframe='weekly']
 * @returns {Promise<Array>} Series points [{ label, bookings, revenue }]
 */
export async function getBookingVelocity(timeframe = 'weekly') {
  // Chart time-series is client-side / simulated
  const series = DEMO_BOOKING_VELOCITY[timeframe] || DEMO_BOOKING_VELOCITY.weekly;
  return JSON.parse(JSON.stringify(series));
}

/**
 * Fetches recent bookings table.
 * 
 * @param {number} [limit=10]
 * @param {Object} [session]
 * @returns {Promise<Array>} Recent bookings records
 */
export async function getRecentBookings(limit = 10, session = {}) {
  if (isSuperAdminMockMode()) {
    return mockStore.recentBookings.slice(0, limit);
  }

  const headers = buildAdminHeaders(session);
  const trips = await fetchData(`${BASE_URL}/trips`, { headers });
  if (Array.isArray(trips)) {
    return trips.slice(0, limit).map((t, idx) => ({
      id: t.id || `BK-${idx + 1}`,
      customerName: `Traveller #${t.travellerId || 'Guest'}`,
      customerEmail: `user-${t.travellerId || 'guest'}@xploreo.com`,
      role: 'traveller',
      serviceTitle: t.itinerary?.day1?.hotel?.name || 'Custom Travel Itinerary',
      serviceType: 'package',
      amount: Number(t.totalAmount) || 25000,
      currency: 'INR',
      bookingDate: t.lastUpdatedAt || new Date().toISOString(),
      status: t.status || 'confirmed',
    }));
  }

  return [];
}

// ============================================================================
// 2. OPERATIONS & BOOKINGS METHODS (OPSBOOK)
// ============================================================================

/**
 * Fetches operations high-level summary metrics.
 * 
 * @returns {Promise<Object>} Operations metrics
 */
export async function getOperationsMetrics() {
  return { ...DEMO_OPERATIONS_METRICS };
}

export async function getLedgerTransactions(filters = {}, session = {}) {
  if (isSuperAdminMockMode()) {
    let list = [...mockStore.ledger];
    if (filters.status && filters.status !== 'all') {
      list = list.filter((item) => item.status === filters.status);
    }
    if (filters.partnerType && filters.partnerType !== 'all') {
      list = list.filter((item) => item.partnerType === filters.partnerType);
    }
    return list;
  }

  try {
    const headers = buildAdminHeaders(session);
    // Live mode: pull real booking transactions from backend /finance/summary and /trips
    const [financeRes, tripsRes] = await Promise.all([
      fetchData(`${BASE_URL}/finance/summary`, { headers }).catch(() => null),
      fetchData(`${BASE_URL}/trips`, { headers }).catch(() => []),
    ]);

    const liveRows = Array.isArray(financeRes?.transactions) ? financeRes.transactions : [];
    if (liveRows.length > 0) {
      let mapped = liveRows.map((row, idx) => {
        const partnerType = row.kind === 'hotel' ? 'hotel' : row.kind === 'experience' ? 'experience' : 'guide';
        const commission = Math.round((Number(row.amount) || 0) * 0.15);
        const netPayout = (Number(row.amount) || 0) - commission;
        const status = row.bucket === 'completed' ? 'settled' : row.bucket === 'refunded' ? 'refunded' : 'pending';

        return {
          transactionId: `TXN-${String(idx + 1).padStart(4, '0')}`,
          bookingId: row.id,
          customerName: `Traveller #${row.travellerId || 'Guest'}`,
          partnerName: row.title || 'Partner Service',
          partnerType,
          grossAmount: Number(row.amount) || 0,
          platformFee: commission,
          netPayout,
          currency: 'INR',
          transactionDate: row.date || new Date().toISOString().split('T')[0],
          status,
        };
      });

      if (filters.status && filters.status !== 'all') {
        mapped = mapped.filter((item) => item.status === filters.status);
      }
      if (filters.partnerType && filters.partnerType !== 'all') {
        mapped = mapped.filter((item) => item.partnerType === filters.partnerType);
      }
      return mapped;
    }

    // If backend returns trips but no ledger rows, map trips directly
    if (Array.isArray(tripsRes) && tripsRes.length > 0) {
      let mapped = tripsRes.map((trip, idx) => {
        const grossAmount = Number(trip.totalAmount) || 25000;
        const platformFee = Math.round(grossAmount * 0.15);
        const netPayout = grossAmount - platformFee;
        const status = trip.status === 'completed' ? 'settled' : trip.status === 'cancelled' ? 'refunded' : 'pending';

        return {
          transactionId: `TXN-TRIP-${String(idx + 1).padStart(4, '0')}`,
          bookingId: trip.id,
          customerName: `Traveller #${trip.travellerId || 'Guest'}`,
          partnerName: trip.itinerary?.day1?.hotel?.name || 'Package Itinerary',
          partnerType: 'hotel',
          grossAmount,
          platformFee,
          netPayout,
          currency: 'INR',
          transactionDate: trip.lastUpdatedAt || new Date().toISOString().split('T')[0],
          status,
        };
      });

      if (filters.status && filters.status !== 'all') {
        mapped = mapped.filter((item) => item.status === filters.status);
      }
      if (filters.partnerType && filters.partnerType !== 'all') {
        mapped = mapped.filter((item) => item.partnerType === filters.partnerType);
      }
      return mapped;
    }

    return [];
  } catch {
    // Graceful fallback to mock store if live endpoint throws
    let list = [...mockStore.ledger];
    if (filters.status && filters.status !== 'all') {
      list = list.filter((item) => item.status === filters.status);
    }
    if (filters.partnerType && filters.partnerType !== 'all') {
      list = list.filter((item) => item.partnerType === filters.partnerType);
    }
    return list;
  }
}

/**
 * Fetches revenue recovery / refund requests queue.
 * In live mode, surfaces cancelled trips that have pending or failed refunds.
 * In mock mode, uses mockStore.refunds.
 * 
 * @param {Object} [session]
 * @returns {Promise<Array>} Refund requests
 */
export async function getRefundRequests(session = {}) {
  if (isSuperAdminMockMode()) {
    return [...mockStore.refunds];
  }

  try {
    const headers = buildAdminHeaders(session);
    const trips = await fetchData(`${BASE_URL}/trips`, { headers }).catch(() => []);
    if (Array.isArray(trips) && trips.length > 0) {
      const cancelled = trips.filter(
        (t) => t.status === 'cancelled' || t.refundStatus === 'PENDING' || t.refundStatus === 'FAILED'
      );
      if (cancelled.length > 0) {
        return cancelled.map((t, idx) => ({
          refundId: `REF-${t.id || String(idx + 1).padStart(4, '0')}`,
          bookingId: t.id,
          customerName: `Traveller #${t.travellerId || 'Guest'}`,
          customerEmail: `user-${t.travellerId || 'guest'}@xploreo.com`,
          serviceTitle: t.itinerary?.day1?.hotel?.name || 'Custom Itinerary Package',
          amount: Number(t.refundAmount) || Number(t.totalAmount) || 25000,
          requestedAt: t.cancelledAt || t.lastUpdatedAt || new Date().toISOString(),
          reason: t.cancellationReason || 'Traveller itinerary cancellation',
          status: t.refundStatus === 'SUCCESS' ? 'approved' : t.refundStatus === 'NOT_ELIGIBLE' ? 'rejected' : 'pending',
          processedAt: t.refundedAt || null,
          reviewNotes: t.cancellationPolicyNote || 'Standard cancellation policy evaluation',
        }));
      }
    }
    return [...mockStore.refunds];
  } catch {
    return [...mockStore.refunds];
  }
}

/**
 * Processes a refund approval or rejection.
 * In live mode, triggers backend /trips/:id/refund/retry or updates the trip refund status.
 * In mock mode, updates the in-memory mock store.
 * 
 * @param {string} refundId
 * @param {'approve' | 'reject'} action
 * @param {string} [notes='']
 * @param {Object} [session]
 * @returns {Promise<Object>} Updated refund record
 */
export async function processRefundAction(refundId, action, notes = '', session = {}) {
  if (!refundId) throw new ApiError('Refund ID is required.', 400);

  if (isSuperAdminMockMode()) {
    const idx = mockStore.refunds.findIndex((r) => r.refundId === refundId);
    if (idx === -1) throw new ApiError(`Refund request ${refundId} not found.`, 404);

    const updated = {
      ...mockStore.refunds[idx],
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date().toISOString(),
      reviewNotes: notes || (action === 'approve' ? 'Approved by SuperAdmin.' : 'Rejected by SuperAdmin.'),
    };

    mockStore.refunds[idx] = updated;

    // If approved, update matching transaction in ledger to 'refunded'
    if (action === 'approve') {
      const bookingId = updated.bookingId;
      const ledgerIdx = mockStore.ledger.findIndex((l) => l.bookingId === bookingId);
      if (ledgerIdx !== -1) {
        mockStore.ledger[ledgerIdx] = {
          ...mockStore.ledger[ledgerIdx],
          status: 'refunded',
        };
      }
    }

    return updated;
  }

  // Live mode: check if refundId corresponds to a trip ID (e.g. REF-<tripId> or <tripId>)
  const cleanId = refundId.startsWith('REF-') ? refundId.slice(4) : refundId;
  const headers = buildAdminHeaders(session);

  try {
    if (action === 'approve') {
      // Trigger live backend refund retry endpoint for superadmin
      await fetchData(`${BASE_URL}/trips/${encodeURIComponent(cleanId)}/refund/retry`, {
        method: 'PATCH',
        headers,
      });
    }

    return {
      refundId,
      bookingId: cleanId,
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date().toISOString(),
      reviewNotes: notes || (action === 'approve' ? 'Approved by SuperAdmin.' : 'Rejected by SuperAdmin.'),
    };
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || `Failed to process refund for ${refundId}.`, status);
  }
}

/**
 * Fetches active dispute resolution items.
 * 
 * @returns {Promise<Array>} Dispute records
 */
export async function getDisputes() {
  return [...mockStore.disputes];
}

/**
 * Resolves a dispute with notes (in-memory mock-only action).
 * 
 * @param {string} disputeId
 * @param {string} resolutionSummary
 * @returns {Promise<Object>} Updated dispute record
 */
export async function resolveDisputeAction(disputeId, resolutionSummary = '') {
  if (!disputeId) throw new ApiError('Dispute ID is required.', 400);
  const idx = mockStore.disputes.findIndex((d) => d.disputeId === disputeId);
  if (idx === -1) throw new ApiError(`Dispute ${disputeId} not found.`, 404);

  const updated = {
    ...mockStore.disputes[idx],
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    summary: `${mockStore.disputes[idx].summary} | Resolution: ${resolutionSummary || 'Resolved by SuperAdmin.'}`,
  };

  mockStore.disputes[idx] = updated;
  return updated;
}

// ============================================================================
// 3. USERS & PARTNERS METHODS
// ============================================================================

/**
 * Fetches users and partners across 4 entity tabs:
 * 'guide', 'traveller', 'hotel', 'experience'.
 * 
 * @param {string} [roleFilter] - Optional role filter
 * @param {Object} [session]
 * @returns {Promise<Array>} Users and partners array
 */
export async function getUsersAndPartners(roleFilter = '', session = {}) {
  if (isSuperAdminMockMode()) {
    let list = [...mockStore.users];
    if (roleFilter && roleFilter !== 'all') {
      list = list.filter((u) => u.role === roleFilter);
    }
    return list;
  }

  try {
    const headers = buildAdminHeaders(session);
    const users = await fetchData(`${BASE_URL}/auth/users`, { headers });
    if (Array.isArray(users)) {
      let mapped = users.map((u) => {
        const resolvedLocation =
          (typeof u.location === 'string' && u.location.trim()) ||
          (typeof u.region === 'string' && u.region.trim()) ||
          (typeof u.city === 'string' && u.city.trim()) ||
          (typeof u.businessLocation === 'string' && u.businessLocation.trim()) ||
          (u.role === 'guide' ? 'Regional Guide' : 'India');

        return {
          userId: u.userId || u.id,
          username: u.username,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          status: u.status || 'active',
          location: resolvedLocation,
          region: u.region || resolvedLocation,
          rating: u.rating ?? 4.8,
          joinedAt: u.joinedAt || '2025-06-01',
          totalTripsOrBookings: u.totalTripsOrBookings ?? 12,
          verified: u.verified !== undefined ? u.verified : (u.status === 'active'),
        };
      });

      if (roleFilter && roleFilter !== 'all') {
        mapped = mapped.filter((u) => u.role === roleFilter);
      }
      return mapped;
    }
    return [];
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to fetch users and partners from backend.', status);
  }
}

/**
 * Updates a user or partner's status ('active' | 'inactive' / restricted).
 * 
 * @param {string} userId
 * @param {'active' | 'inactive'} newStatus
 * @param {Object} [session]
 * @returns {Promise<Object>} Updated user record
 */
export async function updateUserStatus(userId, newStatus, session = {}) {
  if (!userId) throw new ApiError('User ID is required.', 400);
  if (!['active', 'inactive'].includes(newStatus)) {
    throw new ApiError('Status must be either "active" or "inactive".', 400);
  }

  if (isSuperAdminMockMode()) {
    const idx = mockStore.users.findIndex((u) => u.userId === userId || u.username === userId);
    if (idx === -1) throw new ApiError(`User ${userId} not found.`, 404);
    mockStore.users[idx] = {
      ...mockStore.users[idx],
      status: newStatus,
      verified: newStatus === 'active',
    };
    return mockStore.users[idx];
  }

  try {
    const headers = buildAdminHeaders(session);
    const updated = await fetchData(`${BASE_URL}/auth/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: newStatus }),
    });
    return updated;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to update user status.', status);
  }
}

/**
 * Updates a user or partner profile details.
 * 
 * @param {string} userId
 * @param {Object} data - { name, email, phone, location }
 * @param {Object} [session]
 * @returns {Promise<Object>} Updated user record
 */
export async function updateUserProfile(userId, data = {}, session = {}) {
  if (!userId) throw new ApiError('User ID is required.', 400);

  if (isSuperAdminMockMode()) {
    const idx = mockStore.users.findIndex((u) => u.userId === userId || u.username === userId);
    if (idx === -1) throw new ApiError(`User ${userId} not found.`, 404);
    mockStore.users[idx] = {
      ...mockStore.users[idx],
      ...data,
    };
    return mockStore.users[idx];
  }

  try {
    const headers = buildAdminHeaders(session);
    const updated = await fetchData(`${BASE_URL}/auth/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        location: data.location,
      }),
    });
    return updated;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to update user profile.', status);
  }
}

/**
 * Registers a new user or partner entity.
 * 
 * @param {Object} data - { username, password, name, email, phone, role }
 * @param {Object} [session]
 * @returns {Promise<Object>} Created user record
 */
export async function createUserOrPartner(data = {}) {
  const { username, password, name, email, phone, role } = data;
  if (!username || !password || !name || !email || !role) {
    throw new ApiError('Missing required user fields: username, password, name, email, role.', 400);
  }

  if (isSuperAdminMockMode()) {
    const newUser = {
      userId: username,
      username,
      name,
      email,
      phone: phone || '9000000000',
      role,
      status: 'active',
      location: data.location || 'India',
      rating: 5.0,
      joinedAt: new Date().toISOString().split('T')[0],
      totalTripsOrBookings: 0,
      verified: true,
    };
    mockStore.users.unshift(newUser);
    return newUser;
  }

  try {
    const created = await fetchData(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        name,
        email,
        phone: phone || '9000000000',
        role,
      }),
    });
    return created?.user || created;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to create user or partner.', status);
  }
}

// ============================================================================
// 4. FINANCE & REPORTS METHODS
// ============================================================================

/**
 * Fetches finance executive KPI metrics.
 * 
 * @returns {Promise<Object>} Finance metrics
 */
export async function getFinanceMetrics() {
  return { ...DEMO_FINANCE_METRICS };
}

/**
 * Fetches earnings performance chart data.
 * 
 * @param {'weekly' | 'monthly' | 'yearly'} [timeframe='weekly']
 * @returns {Promise<Array>} Earnings series points
 */
export async function getEarningsSeries(timeframe = 'weekly') {
  const series = DEMO_EARNINGS_SERIES[timeframe] || DEMO_EARNINGS_SERIES.weekly;
  return JSON.parse(JSON.stringify(series));
}

/**
 * Fetches partner payouts table.
 * 
 * @param {Object} [filters={}] - { status, partnerType }
 * @returns {Promise<Array>} Payout records
 */
export async function getPayouts(filters = {}) {
  let list = [...mockStore.payouts];
  if (filters.status && filters.status !== 'all') {
    list = list.filter((p) => p.status === filters.status);
  }
  if (filters.partnerType && filters.partnerType !== 'all') {
    list = list.filter((p) => p.partnerType === filters.partnerType);
  }
  return list;
}

/**
 * Processes payout action (e.g. approve / mark paid / retry failed).
 * Mock-only action.
 * 
 * @param {string} payoutId
 * @param {'pay' | 'retry'} action
 * @returns {Promise<Object>} Updated payout record
 */
export async function processPayoutAction(payoutId, action = 'pay') {
  if (!payoutId) throw new ApiError('Payout ID is required.', 400);
  const idx = mockStore.payouts.findIndex((p) => p.payoutId === payoutId);
  if (idx === -1) throw new ApiError(`Payout ${payoutId} not found.`, 404);

  const updatedStatus = action === 'retry' ? 'pending' : 'paid';
  const updated = {
    ...mockStore.payouts[idx],
    status: updatedStatus,
    completedAt: updatedStatus === 'paid' ? new Date().toISOString() : null,
    failureReason: null,
  };

  mockStore.payouts[idx] = updated;
  return updated;
}
