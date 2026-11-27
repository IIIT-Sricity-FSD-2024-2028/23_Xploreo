import { fetchData } from './api.js';
import { getToken, getUser } from './session.js';

const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function isSuperAdminMockMode() {
  return false;
}

function buildAdminHeaders(session = {}) {
  const activeUser = getUser();
  const userId =
    session?.userId ||
    session?.userid ||
    activeUser?.userId ||
    activeUser?.id ||
    activeUser?.username;
  const role = session?.role || activeUser?.role;
  const headers = {};
  if (role && role !== 'default') {
    headers['x-user-role'] = role;
  }
  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  const token = session?.token || session?.user?.token || getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function toApiError(err, fallbackMessage) {
  const status = parseInt(err?.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
  return new ApiError(err?.message || fallbackMessage, status);
}

// ============================================================================
// 1. DASHBOARD & VELOCITY METHODS
// ============================================================================

export async function getDashboardMetrics(session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const [usersRes, tripsRes] = await Promise.all([
      fetchData(`${BASE_URL}/auth/users`, { headers }),
      fetchData(`${BASE_URL}/trips`, { headers }),
    ]);

    const usersCount = Array.isArray(usersRes) ? usersRes.length : 0;
    const trips = Array.isArray(tripsRes) ? tripsRes : [];
    const totalRevenue = trips.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
    const activeTripsCount = trips.filter(
      (t) => t.status === 'started' || t.status === 'confirmed'
    ).length;

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
    throw toApiError(err, 'Failed to load executive dashboard metrics.');
  }
}

export async function getBookingVelocity(timeframe = 'weekly', session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const trips = await fetchData(`${BASE_URL}/trips`, { headers });
    const list = Array.isArray(trips) ? trips : [];

    const buckets = new Map();
    const now = new Date();
    const labels =
      timeframe === 'quarterly'
        ? ['Q1', 'Q2', 'Q3', 'Q4']
        : timeframe === 'monthly'
          ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    labels.forEach((label) => buckets.set(label, { label, bookings: 0, revenue: 0 }));

    list.forEach((t) => {
      const rawDate = t.itinerary?.day1?.hotel?.checkInDate || t.lastUpdatedAt || now.toISOString();
      const d = new Date(rawDate);
      const validDate = isNaN(d.getTime()) ? now : d;
      let key;
      if (timeframe === 'quarterly') {
        key = `Q${Math.floor(validDate.getMonth() / 3) + 1}`;
      } else if (timeframe === 'monthly') {
        key = labels[validDate.getMonth()];
      } else {
        const dayIdx = (validDate.getDay() + 6) % 7;
        key = labels[dayIdx];
      }
      const entry = buckets.get(key);
      if (entry) {
        entry.bookings += 1;
        entry.revenue += Number(t.totalAmount) || 0;
      }
    });

    return Array.from(buckets.values());
  } catch (err) {
    throw toApiError(err, 'Failed to load booking velocity.');
  }
}

export async function getRecentBookings(limit = 10, session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const trips = await fetchData(`${BASE_URL}/trips`, { headers });
    if (!Array.isArray(trips)) return [];

    return trips.slice(0, limit).map((t, idx) => ({
      id: t.id || `BK-${idx + 1}`,
      customerName: `Traveller #${t.travellerId || 'Guest'}`,
      customerEmail: `user-${t.travellerId || 'guest'}@xploreo.com`,
      role: 'traveller',
      serviceTitle: t.itinerary?.day1?.hotel?.name || 'Custom Travel Itinerary',
      serviceType: 'package',
      amount: Number(t.totalAmount) || 0,
      currency: 'INR',
      bookingDate: t.lastUpdatedAt || new Date().toISOString(),
      status: t.status || 'confirmed',
    }));
  } catch (err) {
    throw toApiError(err, 'Failed to load recent bookings.');
  }
}

// ============================================================================
// 2. OPERATIONS & BOOKINGS METHODS (OPSBOOK)
// ============================================================================

export async function getOperationsMetrics(session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const trips = await fetchData(`${BASE_URL}/trips`, { headers });
    const list = Array.isArray(trips) ? trips : [];
    const total = list.length;
    const ongoing = list.filter((t) => t.status === 'started' || t.status === 'confirmed').length;
    const completed = list.filter((t) => t.status === 'completed').length;
    const cancelled = list.filter((t) => t.status === 'cancelled').length;
    const rate = total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0;

    return {
      totalAnnualBookings: total,
      ongoingExperiences: ongoing,
      successfulCompletions: completed,
      attritionRefundsRate: rate,
      attritionRefundsCount: cancelled,
    };
  } catch (err) {
    throw toApiError(err, 'Failed to load operations metrics.');
  }
}

export async function getLedgerTransactions(filters = {}, session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const [financeRes, tripsRes] = await Promise.all([
      fetchData(`${BASE_URL}/finance/summary`, { headers }),
      fetchData(`${BASE_URL}/trips`, { headers }),
    ]);

    const liveRows = Array.isArray(financeRes?.transactions) ? financeRes.transactions : [];
    let mapped = [];

    if (liveRows.length > 0) {
      mapped = liveRows.map((row, idx) => {
        const partnerType =
          row.kind === 'hotel' ? 'hotel' : row.kind === 'experience' ? 'experience' : 'guide';
        const commission = Math.round((Number(row.amount) || 0) * 0.15);
        const netPayout = (Number(row.amount) || 0) - commission;
        const status =
          row.bucket === 'completed'
            ? 'settled'
            : row.bucket === 'refunded'
              ? 'refunded'
              : 'pending';

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
    } else if (Array.isArray(tripsRes) && tripsRes.length > 0) {
      mapped = tripsRes.map((trip, idx) => {
        const grossAmount = Number(trip.totalAmount) || 0;
        const platformFee = Math.round(grossAmount * 0.15);
        const netPayout = grossAmount - platformFee;
        const status =
          trip.status === 'completed'
            ? 'settled'
            : trip.status === 'cancelled'
              ? 'refunded'
              : 'pending';

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
    }

    if (filters.status && filters.status !== 'all') {
      mapped = mapped.filter((item) => item.status === filters.status);
    }
    if (filters.partnerType && filters.partnerType !== 'all') {
      mapped = mapped.filter((item) => item.partnerType === filters.partnerType);
    }
    return mapped;
  } catch (err) {
    throw toApiError(err, 'Failed to load ledger transactions.');
  }
}

export async function getRefundRequests(session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const trips = await fetchData(`${BASE_URL}/trips`, { headers });
    if (!Array.isArray(trips)) return [];

    const cancelled = trips.filter(
      (t) =>
        t.status === 'cancelled' ||
        t.refundStatus === 'PENDING' ||
        t.refundStatus === 'FAILED'
    );

    return cancelled.map((t, idx) => ({
      refundId: `REF-${t.id || String(idx + 1).padStart(4, '0')}`,
      bookingId: t.id,
      customerName: `Traveller #${t.travellerId || 'Guest'}`,
      customerEmail: `user-${t.travellerId || 'guest'}@xploreo.com`,
      serviceTitle: t.itinerary?.day1?.hotel?.name || 'Custom Itinerary Package',
      requestedAmount: Number(t.refundAmount) || Number(t.totalAmount) || 0,
      amount: Number(t.refundAmount) || Number(t.totalAmount) || 0,
      requestedAt: t.cancelledAt || t.lastUpdatedAt || new Date().toISOString(),
      reason: t.cancellationReason || 'Traveller itinerary cancellation',
      status:
        t.refundStatus === 'SUCCESS'
          ? 'approved'
          : t.refundStatus === 'NOT_ELIGIBLE'
            ? 'rejected'
            : 'pending',
      processedAt: t.refundedAt || null,
      reviewNotes: t.cancellationPolicyNote || 'Standard cancellation policy evaluation',
    }));
  } catch (err) {
    throw toApiError(err, 'Failed to load refund requests.');
  }
}

export async function processRefundAction(refundId, action, notes = '', session = {}) {
  if (!refundId) throw new ApiError('Refund ID is required.', 400);

  const cleanId = refundId.startsWith('REF-') ? refundId.slice(4) : refundId;
  const headers = buildAdminHeaders(session);

  try {
    if (action === 'approve') {
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
      reviewNotes:
        notes || (action === 'approve' ? 'Approved by SuperAdmin.' : 'Rejected by SuperAdmin.'),
    };
  } catch (err) {
    throw toApiError(err, `Failed to process refund for ${refundId}.`);
  }
}

export async function getDisputes(session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const data = await fetchData(`${BASE_URL}/superadmin/disputes`, { headers });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw toApiError(err, 'Failed to load disputes.');
  }
}

export async function resolveDisputeAction(disputeId, resolutionSummary = '', session = {}) {
  if (!disputeId) throw new ApiError('Dispute ID is required.', 400);
  try {
    const headers = buildAdminHeaders(session);
    return await fetchData(
      `${BASE_URL}/superadmin/disputes/${encodeURIComponent(disputeId)}/resolve`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ resolutionSummary }),
      }
    );
  } catch (err) {
    throw toApiError(err, `Failed to resolve dispute ${disputeId}.`);
  }
}

// ============================================================================
// 3. USERS & PARTNERS METHODS
// ============================================================================

export async function getUsersAndPartners(roleFilter = '', session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const users = await fetchData(`${BASE_URL}/auth/users`, { headers });
    if (!Array.isArray(users)) return [];

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
        rating: u.rating ?? null,
        joinedAt: u.joinedAt || null,
        totalTripsOrBookings: u.totalTripsOrBookings ?? null,
        verified: u.verified !== undefined ? u.verified : u.status === 'active',
      };
    });

    if (roleFilter && roleFilter !== 'all') {
      mapped = mapped.filter((u) => u.role === roleFilter);
    }
    return mapped;
  } catch (err) {
    throw toApiError(err, 'Failed to fetch users and partners from backend.');
  }
}

export async function updateUserStatus(userId, newStatus, session = {}) {
  if (!userId) throw new ApiError('User ID is required.', 400);
  if (!['active', 'inactive'].includes(newStatus)) {
    throw new ApiError('Status must be either "active" or "inactive".', 400);
  }

  try {
    const headers = buildAdminHeaders(session);
    return await fetchData(`${BASE_URL}/auth/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: newStatus }),
    });
  } catch (err) {
    throw toApiError(err, 'Failed to update user status.');
  }
}

export async function updateUserProfile(userId, data = {}, session = {}) {
  if (!userId) throw new ApiError('User ID is required.', 400);

  try {
    const headers = buildAdminHeaders(session);
    const body = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      location: data.location,
    };
    if (data.role) {
      body.role = data.role;
    }
    return await fetchData(`${BASE_URL}/auth/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw toApiError(err, 'Failed to update user profile.');
  }
}

export async function getUserDetails(userId, session = {}) {
  if (!userId) throw new ApiError('User ID is required.', 400);

  try {
    const headers = buildAdminHeaders(session);
    return await fetchData(`${BASE_URL}/auth/users/${encodeURIComponent(userId)}`, { headers });
  } catch (err) {
    throw toApiError(err, 'Failed to fetch user details.');
  }
}

export async function deleteUserOrPartner(userId, session = {}) {
  if (!userId) throw new ApiError('User ID is required.', 400);

  try {
    const headers = buildAdminHeaders(session);
    return await fetchData(`${BASE_URL}/auth/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers,
    });
  } catch (err) {
    throw toApiError(err, 'Failed to delete user.');
  }
}

export async function createUserOrPartner(data = {}) {
  const { username, password, name, email, phone, role } = data;
  if (!username || !password || !name || !email || !role) {
    throw new ApiError('Missing required user fields: username, password, name, email, role.', 400);
  }

  try {
    const payload = {
      username,
      password,
      name,
      email,
      phone: phone || '9000000000',
      role,
    };
    if (data.location && String(data.location).trim()) {
      payload.location = String(data.location).trim();
    }
    const created = await fetchData(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return created?.user || created;
  } catch (err) {
    throw toApiError(err, 'Failed to create user or partner.');
  }
}

// ============================================================================
// 4. FINANCE & REPORTS METHODS
// ============================================================================

export async function getFinanceMetrics(session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const summary = await fetchData(`${BASE_URL}/finance/summary`, { headers });
    const totals = summary?.totals || {};
    const gross = (Number(totals.completed) || 0) + (Number(totals.upcoming) || 0);
    const netPlatformRevenue = Math.round(gross * 0.15);
    const partnerPayoutsTotal = gross - netPlatformRevenue;

    return {
      totalGrossProcessing: gross,
      netPlatformRevenue,
      partnerPayoutsTotal,
      averageCommissionRate: 15.0,
    };
  } catch (err) {
    throw toApiError(err, 'Failed to load finance metrics.');
  }
}

export async function getEarningsSeries(timeframe = 'weekly', session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const summary = await fetchData(`${BASE_URL}/finance/summary`, { headers });
    const transactions = Array.isArray(summary?.transactions) ? summary.transactions : [];

    const now = new Date();
    const labels =
      timeframe === 'yearly'
        ? [String(now.getFullYear() - 2), String(now.getFullYear() - 1), String(now.getFullYear())]
        : timeframe === 'monthly'
          ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const buckets = new Map();
    labels.forEach((label) =>
      buckets.set(label, { label, platformRevenue: 0, partnerPayout: 0 })
    );

    transactions.forEach((tx) => {
      if (tx.bucket === 'refunded') return;
      const d = new Date(tx.date || now.toISOString());
      const validDate = isNaN(d.getTime()) ? now : d;
      let key;
      if (timeframe === 'yearly') {
        key = String(validDate.getFullYear());
      } else if (timeframe === 'monthly') {
        key = labels[validDate.getMonth()];
      } else {
        key = labels[(validDate.getDay() + 6) % 7];
      }
      const entry = buckets.get(key);
      if (entry) {
        const amount = Number(tx.amount) || 0;
        const fee = Math.round(amount * 0.15);
        entry.platformRevenue += fee;
        entry.partnerPayout += amount - fee;
      }
    });

    return Array.from(buckets.values());
  } catch (err) {
    throw toApiError(err, 'Failed to load earnings series.');
  }
}

export async function getPayouts(filters = {}, session = {}) {
  try {
    const headers = buildAdminHeaders(session);
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.partnerType && filters.partnerType !== 'all') {
      params.set('partnerType', filters.partnerType);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await fetchData(`${BASE_URL}/superadmin/payouts${qs}`, { headers });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw toApiError(err, 'Failed to load partner payouts.');
  }
}

export async function processPayoutAction(payoutId, action = 'pay', session = {}) {
  if (!payoutId) throw new ApiError('Payout ID is required.', 400);
  try {
    const headers = buildAdminHeaders(session);
    return await fetchData(
      `${BASE_URL}/superadmin/payouts/${encodeURIComponent(payoutId)}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action }),
      }
    );
  } catch (err) {
    throw toApiError(err, `Failed to process payout ${payoutId}.`);
  }
}
