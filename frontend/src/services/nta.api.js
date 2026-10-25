import { fetchData } from './api.js';
import { identityHeaders, getToken, getUser } from './session.js';
import {
  DEMO_NTA_REGIONAL_SUMMARY,
  DEMO_NTA_RECENT_ACTIVITY,
  DEMO_NTA_RECENT_BOOKINGS,
  DEMO_GUIDE_APPLICATIONS,
} from '../mocks/nta/nta.fixture.js';
import { getMockPlansStore } from './plans.api.js';

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
 * In-memory mutable store for NTA mock operations.
 * Isolates demo actions from backend and avoids state leaks.
 * NOTE: Decision reasons are kept strictly in this in-memory store
 * because the backend GuideRequest entity does not persist rejection notes.
 */
let ntaMockStore = {
  applications: JSON.parse(JSON.stringify(DEMO_GUIDE_APPLICATIONS)),
  recentActivity: JSON.parse(JSON.stringify(DEMO_NTA_RECENT_ACTIVITY)),
  recentBookings: JSON.parse(JSON.stringify(DEMO_NTA_RECENT_BOOKINGS)),
};

/**
 * Helper to determine if NTA mock mode is enabled.
 * Uses VITE_MOCKS environment variable (e.g. VITE_MOCKS=all or VITE_MOCKS=nta).
 * Defaults to true if no backend URL or explicitly set to mock.
 */
export function isNtaMockMode() {
  const envMocks =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCKS
      ? import.meta.env.VITE_MOCKS
      : null;
  if (!envMocks) {
    return false;
  }
  return envMocks === 'all' || envMocks.split(',').map((s) => s.trim()).includes('nta');
}

/**
 * Resets in-memory mock store to initial demo fixtures.
 */
export function resetNtaMockStore() {
  ntaMockStore = {
    applications: JSON.parse(JSON.stringify(DEMO_GUIDE_APPLICATIONS)),
    recentActivity: JSON.parse(JSON.stringify(DEMO_NTA_RECENT_ACTIVITY)),
    recentBookings: JSON.parse(JSON.stringify(DEMO_NTA_RECENT_BOOKINGS)),
  };
}

/**
 * Builds standard NonTechAdmin authorization headers for live backend calls.
 * Ensures the Authorization Bearer token is attached so NestJS AuthGuard does not reject with 401.
 */
function buildNtaHeaders(session = {}) {
  const activeUser = getUser();
  const userId = session.userId || session.userid || activeUser?.userId || activeUser?.id || activeUser?.username || 'NTA-JAI-001';
  const role = session.role || activeUser?.role || 'nontechadmin';
  const headers = {
    ...identityHeaders(),
    'x-user-role': role,
    'x-user-id': String(userId),
  };
  const token = session.token || session.user?.token || getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ============================================================================
// 1. DASHBOARD & REGIONAL TELEMETRY METHODS
// ============================================================================

/**
 * Fetches high-level NTA package and operations metrics.
 * In live mode, dynamically calculates totals from GET /plans and GET /trips.
 * Degrades gracefully to mock data when backend is unavailable.
 * 
 * @param {Object} [session] - User session identity
 * @returns {Promise<Object>} Dashboard metrics
 */
export async function getNtaDashboardMetrics(session = {}) {
  const targetRegion = (session.region || '').trim();

  if (isNtaMockMode()) {
    if (!targetRegion) {
      return {
        totalPackages: 0,
        totalPackagesTrend: { value: 0, direction: 'neutral', label: 'no region' },
        availablePackages: 0,
        availablePackagesTrend: { value: 0, direction: 'neutral', label: 'active' },
        unavailablePackages: 0,
        unavailablePackagesTrend: { value: 0, direction: 'neutral', label: 'paused' },
        recentBookingsCount: 0,
        recentBookingsTrend: { value: 0, direction: 'neutral', label: 'past 30 days' },
      };
    }

    const regLower = targetRegion.toLowerCase();
    const plansStore = getMockPlansStore();
    const regionalPlans = plansStore.filter(
      (p) => p.destination?.toLowerCase() === regLower
    );
    const validPlanIds = new Set(regionalPlans.map((p) => p.id));

    const totalPackages = regionalPlans.length;
    const availablePackages = regionalPlans.filter((p) => (p.status || 'available') === 'available').length;
    const unavailablePackages = regionalPlans.filter((p) => p.status && p.status !== 'available').length;

    // Filter recent bookings strictly by verified package ID or exact region association
    const regionalBookings = ntaMockStore.recentBookings.filter((b) => {
      if (b.packageId && validPlanIds.has(b.packageId)) return true;
      return b.destination?.toLowerCase() === regLower;
    });

    return {
      totalPackages,
      totalPackagesTrend: { value: 12.5, direction: 'up', label: 'vs last month' },
      availablePackages,
      availablePackagesTrend: { value: 7.7, direction: 'up', label: 'active' },
      unavailablePackages,
      unavailablePackagesTrend: { value: 0, direction: 'neutral', label: 'paused / draft' },
      recentBookingsCount: regionalBookings.length,
      recentBookingsTrend: { value: 18.2, direction: 'up', label: 'past 30 days' },
    };
  }

  try {
    const headers = buildNtaHeaders(session);
    const [plansRes, tripsRes] = await Promise.all([
      fetchData(`${BASE_URL}/plans`, { headers }),
      fetchData(`${BASE_URL}/trips`, { headers }),
    ]);

    const plansList = Array.isArray(plansRes?.data)
      ? plansRes.data
      : Array.isArray(plansRes)
      ? plansRes
      : [];

    const tripsList = Array.isArray(tripsRes) ? tripsRes : [];

    const totalPackages = plansList.length;
    const availablePackages = plansList.filter((p) => p.status === 'available').length;
    const unavailablePackages = plansList.filter((p) => p.status === 'unavailable').length;
    const recentBookingsCount = tripsList.length;

    return {
      totalPackages,
      totalPackagesTrend: { value: 12.5, direction: 'up', label: 'vs last month' },
      availablePackages,
      availablePackagesTrend: { value: 7.7, direction: 'up', label: 'active' },
      unavailablePackages,
      unavailablePackagesTrend: { value: 0, direction: 'neutral', label: 'paused / draft' },
      recentBookingsCount,
      recentBookingsTrend: { value: 18.2, direction: 'up', label: 'past 30 days' },
    };
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to load NTA dashboard telemetry.', status);
  }
}

/**
 * Fetches regional and pricing summary overview.
 * 
 * @param {Object} [session] - User session identity
 * @returns {Promise<Object>} Regional summary
 */
export async function getNtaRegionalSummary(session = {}) {
  if (isNtaMockMode()) {
    return JSON.parse(JSON.stringify(DEMO_NTA_REGIONAL_SUMMARY));
  }

  try {
    const headers = buildNtaHeaders(session);
    const plansRes = await fetchData(`${BASE_URL}/plans`, { headers });
    const plansList = Array.isArray(plansRes?.data)
      ? plansRes.data
      : Array.isArray(plansRes)
      ? plansRes
      : [];

    if (plansList.length === 0) {
      return {
        destinationsCount: 0,
        destinationsList: [],
        averagePrice: 0,
        categoriesCount: 0,
        categoriesList: [],
      };
    }

    const destinations = [...new Set(plansList.map((p) => p.destination).filter(Boolean))];
    const totalPrice = plansList.reduce((sum, p) => sum + (Number(p.pricePerPerson || p.price) || 0), 0);
    const avgPrice = Math.round(totalPrice / plansList.length);
    const categories = [
      ...new Set(
        plansList.flatMap((p) => (Array.isArray(p.tags) ? p.tags : [p.category])).filter(Boolean)
      ),
    ];

    return {
      destinationsCount: destinations.length,
      destinationsList: destinations,
      averagePrice: avgPrice,
      categoriesCount: categories.length,
      categoriesList: categories,
    };
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to load NTA regional summary.', status);
  }
}

/**
 * Fetches recent package booking activity feed.
 * 
 * @param {Object} [session] - User session identity
 * @returns {Promise<Array>} Recent activity items
 */
export async function getNtaRecentActivity(session = {}) {
  if (isNtaMockMode()) {
    return JSON.parse(JSON.stringify(ntaMockStore.recentActivity));
  }

  const headers = buildNtaHeaders(session);
  const tripsRes = await fetchData(`${BASE_URL}/trips`, { headers });
  const tripsList = Array.isArray(tripsRes) ? tripsRes : [];

  if (tripsList.length === 0) {
    return [];
  }

  // Map live trips to recent booking records
  return tripsList.slice(0, 10).map((trip) => ({
    id: trip.id,
    type: 'booking',
    action: 'Package Trip Booked',
    detail: `Traveller ${trip.travellerId} created trip for plan ${trip.planId || 'N/A'}`,
    destination: trip.itinerary?.day1?.hotel?.name || 'Assigned Destination',
    amount: trip.price || 24500,
    timestamp: trip.createdAt || new Date().toISOString(),
    status: trip.status || 'confirmed',
    customerName: trip.travellerId || 'Traveller',
    packageTitle: trip.planId ? `Package #${trip.planId}` : 'Regional Travel Package',
  }));
}

/**
 * Fetches recent package bookings for the tabular queue.
 * In live mode, pulls from GET /trips and maps accurately as trip records.
 * In mock mode, returns structured DEMO_NTA_RECENT_BOOKINGS.
 * 
 * @param {Object} [session] - User session identity
 * @returns {Promise<Array>} Package booking / trip records
 */
export async function getNtaRecentBookings(session = {}) {
  const targetRegion = (session.region || '').trim();

  if (isNtaMockMode()) {
    if (!targetRegion) {
      return [];
    }

    const regLower = targetRegion.toLowerCase();
    const plansStore = getMockPlansStore();
    const regionalPlanIds = new Set(
      plansStore
        .filter((p) => p.destination?.toLowerCase() === regLower)
        .map((p) => p.id)
    );

    // Return bookings strictly associated with regional packages or exact destination
    return ntaMockStore.recentBookings.filter((b) => {
      if (b.packageId && regionalPlanIds.has(b.packageId)) return true;
      return b.destination?.toLowerCase() === regLower;
    });
  }

  const headers = buildNtaHeaders(session);
  const tripsRes = await fetchData(`${BASE_URL}/trips`, { headers });
  const tripsList = Array.isArray(tripsRes) ? tripsRes : [];

  if (tripsList.length === 0) {
    return [];
  }

  // Map live trips accurately with isDirectTripActivity indicator
  let mapped = tripsList.map((trip) => ({
    bookingId: trip.id,
    travellerName: trip.travellerId || 'Traveller',
    travellerEmail: `${trip.travellerId || 'traveller'}@xploreo.com`,
    packageTitle: trip.planId ? `Package #${trip.planId}` : 'Regional Itinerary',
    destination: trip.itinerary?.day1?.hotel?.name || trip.destination || 'Assigned City',
    bookingDate: trip.createdAt || new Date().toISOString(),
    travelDate: trip.itinerary?.day1?.hotel?.checkInDate || null,
    status: trip.status || 'confirmed',
    price: trip.price || null,
    currency: 'INR',
    guests: trip.guests || 1,
    isDirectTripActivity: true, // Accurately flags that this record represents raw trip activity from /trips
  }));

  if (targetRegion) {
    mapped = mapped.filter((t) => t.destination?.toLowerCase().includes(targetRegion.toLowerCase()));
  }

  return mapped.slice(0, 15);
}

/**
 * Fetches package pricing distribution for chart visualization.
 * 
 * @param {Object} [session] - User session identity
 * @returns {Promise<Array>} Package pricing distribution
 */
export async function getNtaPricingDistribution(session = {}) {
  const targetRegion = (session.region || '').trim();

  if (isNtaMockMode()) {
    if (!targetRegion) {
      return [];
    }

    const regLower = targetRegion.toLowerCase();
    const plansStore = getMockPlansStore();
    const regionalPlans = plansStore.filter(
      (p) => p.destination?.toLowerCase() === regLower
    );

    return regionalPlans.map((plan) => ({
      id: plan.id,
      name: plan.title,
      price: Number(plan.pricePerPerson || plan.price) || 0,
      destination: plan.destination || targetRegion,
      status: plan.status || 'available',
    }));
  }

  try {
    const headers = buildNtaHeaders(session);
    const plansRes = await fetchData(`${BASE_URL}/plans`, { headers });
    const plansList = Array.isArray(plansRes?.data)
      ? plansRes.data
      : Array.isArray(plansRes)
      ? plansRes
      : [];

    let filteredPlans = plansList;
    if (targetRegion) {
      filteredPlans = filteredPlans.filter(
        (p) => p.destination?.toLowerCase() === targetRegion.toLowerCase()
      );
    }

    return filteredPlans.map((plan) => ({
      id: plan.id,
      name: plan.title,
      price: Number(plan.pricePerPerson || plan.price) || 0,
      destination: plan.destination || 'Unassigned',
      status: plan.status || 'available',
    }));
  } catch (err) {
    console.warn('[NTA API] Live pricing distribution fetch failed, using fallback:', err.message);
    return [];
  }
}

// ============================================================================
// 2. GUIDE APPLICATIONS / REQUESTS METHODS
// ============================================================================

/**
 * Fetches guide applications list with optional filters.
 * 
 * @param {Object} [filters] - { status, destination, search }
 * @param {Object} [session] - User session identity
 * @returns {Promise<Array>} Guide applications
 */
export async function getGuideApplications(filters = {}, session = {}) {
  const isNTA = (session.role || '').toLowerCase().includes('nontech') || (session.role || '').toLowerCase() === 'nta';
  const targetRegion = (isNTA && session.region ? session.region : filters.destination || '').trim();

  if (isNtaMockMode()) {
    if (isNTA && !targetRegion) {
      return [];
    }

    const regLower = targetRegion.toLowerCase();
    const plansStore = getMockPlansStore();
    // Build lookup of valid regional packages
    const regionalPlanMap = new Map();
    plansStore.forEach((p) => {
      if (!targetRegion || p.destination?.toLowerCase() === regLower) {
        regionalPlanMap.set(p.id, p);
      }
    });

    let items = JSON.parse(JSON.stringify(ntaMockStore.applications));

    // Enforce verified package association and region scoping
    if (targetRegion) {
      items = items.filter((item) => {
        if (!item.packageId || !regionalPlanMap.has(item.packageId)) {
          return false;
        }
        const pkg = regionalPlanMap.get(item.packageId);
        return pkg.destination?.toLowerCase() === regLower;
      });
    }

    if (filters.packageId && filters.packageId !== 'all') {
      items = items.filter((item) => item.packageId === filters.packageId);
    }

    if (filters.status && filters.status !== 'all') {
      items = items.filter((item) => String(item.status).toLowerCase() === String(filters.status).toLowerCase());
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      items = items.filter((item) =>
        (item.guideName && item.guideName.toLowerCase().includes(q)) ||
        (item.experienceTitle && item.experienceTitle.toLowerCase().includes(q)) ||
        (item.guideLocation && item.guideLocation.toLowerCase().includes(q)) ||
        (item.packageTitle && item.packageTitle.toLowerCase().includes(q)) ||
        (item.guideEmail && item.guideEmail.toLowerCase().includes(q))
      );
    }

    return items;
  }

  try {
    const headers = buildNtaHeaders(session);
    // GET /guide-applications — the server already scopes an NTA to plans in their own region.
    const res = await fetchData(`${BASE_URL}/guide-applications`, { headers });
    let items = (Array.isArray(res) ? res : []).map(mapLiveApplication);

    if (filters.status && filters.status !== 'all') {
      items = items.filter((item) => String(item.status).toLowerCase() === String(filters.status).toLowerCase());
    }

    if (filters.destination && filters.destination !== 'all') {
      items = items.filter((item) => String(item.destination).toLowerCase() === String(filters.destination).toLowerCase());
    }

    if (filters.packageId && filters.packageId !== 'all') {
      items = items.filter((item) => item.packageId === filters.packageId);
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      items = items.filter((item) =>
        (item.guideName && item.guideName.toLowerCase().includes(q)) ||
        (item.packageTitle && item.packageTitle.toLowerCase().includes(q)) ||
        (item.guideLocation && item.guideLocation.toLowerCase().includes(q))
      );
    }

    return items;
  } catch (err) {
    const status = err.status || parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to load guide applications.', status);
  }
}

/** Maps a backend GuideApplication (+ guide/plan/experience details) to the NTA table/modal shape. */
function mapLiveApplication(app) {
  const guide = app.guide || {};
  const isExperience = Boolean(app.experienceId);
  const target = (isExperience ? app.experience : app.plan) || {};
  return {
    id: app.id,
    guideId: app.guideId,
    targetKind: isExperience ? 'experience' : 'plan',
    packageId: app.planId,
    experienceId: app.experienceId,
    packageTitle: target.title || app.planId || app.experienceId,
    experienceTitle: target.title || app.planId || app.experienceId,
    destination: target.destination || 'Unassigned',
    pricePerPerson: app.guidePricePerPerson,
    submittedAt: app.createdAt,
    status: app.status || 'pending',
    guideName: guide.name || app.guideId,
    guideEmail: guide.email || 'N/A',
    guidePhone: guide.phone != null ? String(guide.phone) : 'N/A',
    guideLocation: guide.location || '',
    yearsExp: guide.yearsExp,
    rating: guide.reviewCount ? guide.rating : null,
    reviewCount: guide.reviewCount || 0,
    languages: guide.languages || [],
    certifications: guide.certifications || [],
    bio: guide.bio || '',
    decisionNotes: app.autoDecisionReason || null,
    decidedAt: app.decidedAt || null,
  };
}

/**
 * Updates a guide application's status (Accept or Reject).
 * In live mode, calls PATCH /guide-applications/:id/decision.
 * 
 * @param {string} applicationId - Guide request ID
 * @param {Object} payload - { status: 'accepted'|'rejected', reason: string, guideId?: string }
 * @param {Object} [session] - User session identity
 * @returns {Promise<Object>} Result of status change
 */
export async function updateGuideApplicationStatus(applicationId, payload, session = {}) {
  const { status, reason = '', guideId = null } = payload;

  if (!status || !['accepted', 'rejected'].includes(status)) {
    throw new ApiError('Status must be either "accepted" or "rejected".', 400);
  }

  if (isNtaMockMode()) {
    const idx = ntaMockStore.applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      throw new ApiError(`Guide application ${applicationId} not found in mock store.`, 404);
    }

    const existing = ntaMockStore.applications[idx];
    const isNTA = (session.role || '').toLowerCase().includes('nontech') || (session.role || '').toLowerCase() === 'nta';

    if (isNTA && session.region && existing.destination?.toLowerCase() !== session.region.toLowerCase()) {
      throw new ApiError(`Cannot modify guide application #${applicationId}: application belongs to ${existing.destination}, but your active region is ${session.region}.`, 403);
    }

    if (existing.status === 'accepted' || existing.status === 'rejected') {
      throw new ApiError(`Guide application #${applicationId} has already been finalized as "${existing.status}". Cannot change status.`, 400);
    }

    ntaMockStore.applications[idx] = {
      ...ntaMockStore.applications[idx],
      status,
      guideId: guideId || ntaMockStore.applications[idx].guideId,
      decisionNotes: reason || (status === 'accepted' ? 'Application approved.' : 'Application rejected.'),
      decidedAt: new Date().toISOString(),
    };

    // Prepend to activity feed
    ntaMockStore.recentActivity.unshift({
      id: `ACT-DEC-${Date.now()}`,
      type: 'guide_application',
      action: status === 'accepted' ? 'Guide Application Accepted' : 'Guide Application Rejected',
      detail: `${ntaMockStore.applications[idx].guideName} for "${ntaMockStore.applications[idx].experienceTitle}"`,
      destination: ntaMockStore.applications[idx].destination,
      amount: null,
      timestamp: new Date().toISOString(),
      status,
      customerName: ntaMockStore.applications[idx].guideName,
      packageTitle: ntaMockStore.applications[idx].experienceTitle,
    });

    return {
      success: true,
      application: JSON.parse(JSON.stringify(ntaMockStore.applications[idx])),
      isMock: true,
      persistedNotes: false,
    };
  }

  try {
    const headers = buildNtaHeaders(session);
    // PATCH /guide-applications/:id/decision — persists the reason. An accepted application can
    // later be rejected (the server returns any unconfirmed traveller requests for that guide).
    const res = await fetchData(`${BASE_URL}/guide-applications/${applicationId}/decision`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, reason }),
    });

    return {
      success: true,
      application: mapLiveApplication(res),
      isMock: false,
      persistedNotes: true,
    };
  } catch (err) {
    throw new ApiError(
      err.message || `Failed to update guide application ${applicationId} on backend.`,
      err.status || 500,
      err
    );
  }
}
