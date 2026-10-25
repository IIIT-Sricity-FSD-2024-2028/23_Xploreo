import { fetchData } from './api.js';
import { identityHeaders, getToken, getUser } from './session.js';
import { MOCK_PLANS } from '../mocks/plans/plans.fixture.js';

/**
 * Backend base URL. Defaults to localhost:3000 if not specified in env.
 */
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

/**
 * Builds standard authorization headers for live backend calls.
 * Ensures the Authorization Bearer token is attached so NestJS AuthGuard does not reject with 401.
 */
function buildPlansHeaders(session = {}) {
  const activeUser = getUser();
  const userId = session.userId || session.userid || activeUser?.userId || activeUser?.id || activeUser?.username || 'NTA001';
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

/**
 * In-memory fallback copy of mock plans for development / offline mode.
 */
let localMockStore = [...MOCK_PLANS];

/**
 * Helper to determine if plans mock mode is enabled.
 * Uses VITE_MOCKS environment variable (e.g. VITE_MOCKS=all or VITE_MOCKS=plans).
 * Defaults to true if no backend URL or explicitly set to mock.
 */
export function isPlansMockMode() {
  const envMocks =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCKS
      ? import.meta.env.VITE_MOCKS
      : null;
  if (!envMocks) {
    return false;
  }
  return envMocks === 'all' || envMocks.split(',').map((s) => s.trim()).includes('plans');
}

/**
 * Resets in-memory mock store to initial demo fixtures.
 */
export function resetPlansMockStore() {
  localMockStore = JSON.parse(JSON.stringify(MOCK_PLANS));
}

/**
 * Accessor for the shared mock plans store (used by dashboard telemetry).
 * @returns {Array} List of plans in mock store
 */
export function getMockPlansStore() {
  return localMockStore;
}

/**
 * Custom Error class that retains HTTP status and details.
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
 * Normalizes an incoming client itinerary into a valid backend StructuredItinerary.
 * Handles silent backend compatibility for non-optional Day1 transport without
 * exposing transport or flight concepts in the UI.
 * 
 * @param {Object} rawItinerary - Client itinerary { day1: { hotel }, days: [...] }
 * @param {string} destination - Plan destination city
 * @returns {Object} StructuredItinerary compatible with NestJS backend
 */
function buildBackendItinerary(rawItinerary = {}, destination = 'Destination') {
  const day1Hotel = rawItinerary.day1?.hotel || {
    id: `hotel-default-${Date.now()}`,
    hotelId: 'HP-DEFAULT',
    name: `${destination} Partner Stay`,
    checkInDate: '2026-11-01',
    checkOutDate: '2026-11-05',
    roomType: 'Standard Room',
    status: 'planned',
  };

  // Construct silent transport compatibility record required by DayOneItinerary class
  const transportCompatibility = {
    id: `transport-compat-${Date.now()}`,
    provider: 'Independent / Self-Arranged',
    vehicleType: 'None',
    pickupLocation: destination,
    dropoffLocation: destination,
    pickupAt: `${day1Hotel.checkInDate || '2026-11-01'}T12:00:00.000Z`,
    status: 'planned',
  };

  const days = Array.isArray(rawItinerary.days)
    ? rawItinerary.days.map((dayGroup, idx) => ({
        dayNumber: Number(dayGroup.dayNumber || idx + 2),
        experiences: Array.isArray(dayGroup.experiences)
          ? dayGroup.experiences.map((exp, expIdx) => ({
              id: exp.id || `exp-local-${Date.now()}-${expIdx}`,
              experienceId: exp.experienceId || `EXP-${expIdx + 1}`,
              title: String(exp.title || 'Curated Activity').trim(),
              location: String(exp.location || destination).trim(),
              startsAt: String(exp.startsAt || '2026-11-02T10:00:00.000Z'),
              endsAt: String(exp.endsAt || '2026-11-02T12:00:00.000Z'),
              status: exp.status || 'planned',
            }))
          : [],
      }))
    : [];

  return {
    day1: {
      flight: null, // Product decision: No flights
      transport: transportCompatibility, // Silent backend compatibility bridge
      hotel: day1Hotel,
    },
    days,
  };
}

/**
 * Retrieves travel plans with optional query filters (pagination, destination, origin).
 * Calls GET /plans on NestJS backend.
 * 
 * @param {Object} [params] - { page, limit, destination, from, to }
 * @param {Object} [session] - User session identity { userId, role, region }
 * @returns {Promise<{ data: Array, total: number, page: number, limit: number }>}
 */
export async function getPlans(params = {}, session = {}) {
  const { page = 1, limit = 50, destination, from, to } = params;

  // Enforce selected region scoping for NTA users
  const isNTA = (session.role || '').toLowerCase().includes('nontech') || (session.role || '').toLowerCase() === 'nta';
  const effectiveDestination = isNTA && session.region ? session.region : destination;

  if (isPlansMockMode()) {
    let filtered = [...localMockStore];
    const isStaff = isNTA || (session.role || '').toLowerCase() === 'superadmin';
    if (!isStaff) {
      filtered = filtered.filter((p) => {
        const s = (p.status || 'available').toLowerCase();
        return s === 'available' || s === 'sold_out';
      });
    }

    if (effectiveDestination) {
      const q = effectiveDestination.toLowerCase().trim();
      filtered = filtered.filter((p) => p.destination?.toLowerCase() === q || p.destination?.toLowerCase().includes(q));
    }
    if (from) {
      const q = from.toLowerCase().trim();
      filtered = filtered.filter((p) => p.originCity?.toLowerCase().includes(q));
    }
    const total = filtered.length;
    const start = (Number(page) - 1) * Number(limit);
    const data = filtered.slice(start, start + Number(limit));
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  const queryParams = new URLSearchParams();
  if (page) queryParams.set('page', String(page));
  if (limit) queryParams.set('limit', String(limit));
  if (effectiveDestination) queryParams.set('destination', effectiveDestination);
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);

  try {
    const url = `${BASE_URL}/plans${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const result = await fetchData(url, {
      method: 'GET',
      headers: buildPlansHeaders(session),
    });
    return result;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    throw new ApiError(err.message || 'Failed to load travel plans.', status);
  }
}

/**
 * Retrieves a single travel plan by ID.
 * Calls GET /plans/:id on NestJS backend.
 * 
 * @param {string} id - Plan ID
 * @param {Object} [session] - User session identity { userId, role, region }
 * @returns {Promise<Object>} Plan Record
 */
export async function getPlanById(id, session = {}) {
  if (!id) throw new ApiError('Plan ID is required.', 400);

  if (isPlansMockMode()) {
    const plan = localMockStore.find((p) => p.id === id);
    if (!plan) throw new ApiError(`Plan #${id} not found.`, 404);

    const isStaff = isNTA || (session.role || '').toLowerCase() === 'superadmin';
    if (!isStaff) {
      const s = (plan.status || 'available').toLowerCase();
      if (s === 'draft' || s === 'unavailable') {
        throw new ApiError(`Plan #${id} not found.`, 404);
      }
    }
    // Regional scoping check for NTA
    const isNTA = (session.role || '').toLowerCase().includes('nontech') || (session.role || '').toLowerCase() === 'nta';
    if (isNTA && session.region && plan.destination?.toLowerCase() !== session.region.toLowerCase()) {
      throw new ApiError(`Plan #${id} does not belong to your assigned region (${session.region}).`, 403);
    }
    return { ...plan };
  }

  try {
    const plan = await fetchData(`${BASE_URL}/plans/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: buildPlansHeaders(session),
    });
    return plan;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    if (status === 404) {
      throw new ApiError(`Plan #${id} not found on server.`, 404);
    }
    throw new ApiError(err.message || `Failed to fetch plan #${id}.`, status);
  }
}

/**
 * Creates a new travel package / plan.
 * Calls POST /plans on NestJS backend.
 * Permitted roles: SUPERADMIN, NONTECHADMIN.
 * 
 * @param {Object} data - Plan form fields
 * @param {Object} [session] - User session identity { userId, role, region }
 * @returns {Promise<Object>} Created Plan Record
 */
export async function createPlan(data, session = {}) {
  const isNTA = (session.role || '').toLowerCase().includes('nontech') || (session.role || '').toLowerCase() === 'nta';
  const effectiveDestination = (isNTA && session.region ? session.region : data.destination || '').trim();

  const title = String(data.title || '').trim();
  const description = String(data.description || '').trim();
  const destination = effectiveDestination;
  // Backend compatibility: default originCity silently to destination if omitted
  const originCity = String(data.originCity || data.from || destination || 'Delhi').trim();
  const durationNights = Number(data.durationNights || data.duration || 0);
  const pricePerPerson = Number(data.pricePerPerson !== undefined ? data.pricePerPerson : data.price || 0);

  if (!title) throw new ApiError('Package title is required.', 400);
  if (!description) throw new ApiError('Package description is required.', 400);
  if (!destination) throw new ApiError('Destination city is required.', 400);
  if (durationNights < 1) throw new ApiError('Duration must be at least 1 night.', 400);
  if (pricePerPerson < 0) throw new ApiError('Price per person must be a non-negative number.', 400);

  const backendItinerary = buildBackendItinerary(data.itinerary, destination);

  const payload = {
    title,
    description,
    destination,
    originCity,
    durationNights,
    pricePerPerson,
    hotelStars: Number(data.hotelStars || 3),
    includesFlight: false, // Product requirement: No flights
    image: data.image || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    status: data.status || 'available',
    itinerary: backendItinerary,
  };

  if (isPlansMockMode()) {
    const newPlan = {
      id: `plan-${destination.toLowerCase()}-${Date.now().toString(36)}`,
      ...payload,
      status: data.status || 'available',
    };
    localMockStore.unshift(newPlan);
    return newPlan;
  }

  try {
    const created = await fetchData(`${BASE_URL}/plans`, {
      method: 'POST',
      headers: buildPlansHeaders(session),
      body: JSON.stringify(payload),
    });
    return created;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    if (status === 403) {
      throw new ApiError('You do not have permission to create travel plans.', 403);
    }
    if (status === 400) {
      throw new ApiError('Invalid plan payload provided. Please check all fields.', 400);
    }
    throw new ApiError(err.message || 'Failed to create plan.', status);
  }
}

/**
 * Updates an existing travel package / plan.
 * Calls PATCH /plans/:id on NestJS backend.
 * Permitted roles: SUPERADMIN, NONTECHADMIN.
 * 
 * @param {string} id - Plan ID to update
 * @param {Object} data - Update fields
 * @param {Object} [session] - User session identity { userId, role, region }
 * @returns {Promise<Object>} Updated Plan Record
 */
export async function updatePlan(id, data, session = {}) {
  if (!id) throw new ApiError('Plan ID is required for update.', 400);

  const isNTA = (session.role || '').toLowerCase().includes('nontech') || (session.role || '').toLowerCase() === 'nta';

  if (isPlansMockMode()) {
    const idx = localMockStore.findIndex((p) => p.id === id);
    if (idx === -1) throw new ApiError(`Plan #${id} not found.`, 404);

    const existing = localMockStore[idx];
    if (isNTA && session.region && existing.destination?.toLowerCase() !== session.region.toLowerCase()) {
      throw new ApiError(`Cannot edit package #${id}: package belongs to ${existing.destination}, but your active region is ${session.region}.`, 403);
    }

    const payload = {};
    if (data.title !== undefined) payload.title = String(data.title).trim();
    if (data.description !== undefined) payload.description = String(data.description).trim();
    if (data.destination !== undefined) {
      payload.destination = isNTA && session.region ? session.region : String(data.destination).trim();
    }
    if (data.originCity !== undefined || data.from !== undefined) {
      payload.originCity = String(data.originCity || data.from).trim();
    }
    if (data.durationNights !== undefined || data.duration !== undefined) {
      payload.durationNights = Number(data.durationNights || data.duration);
    }
    if (data.pricePerPerson !== undefined || data.price !== undefined) {
      payload.pricePerPerson = Number(data.pricePerPerson !== undefined ? data.pricePerPerson : data.price);
    }
    if (data.hotelStars !== undefined) payload.hotelStars = Number(data.hotelStars);
    if (data.image !== undefined) payload.image = String(data.image).trim();
    if (data.tags !== undefined) payload.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.status !== undefined) payload.status = data.status;

    payload.includesFlight = false;

    if (data.itinerary) {
      payload.itinerary = buildBackendItinerary(data.itinerary, payload.destination || existing.destination || 'Destination');
    }

    localMockStore[idx] = {
      ...localMockStore[idx],
      ...payload,
    };
    return { ...localMockStore[idx] };
  }

  const payload = {};
  if (data.title !== undefined) payload.title = String(data.title).trim();
  if (data.description !== undefined) payload.description = String(data.description).trim();
  if (data.destination !== undefined) {
    payload.destination = isNTA && session.region ? session.region : String(data.destination).trim();
  }
  if (data.originCity !== undefined || data.from !== undefined) {
    payload.originCity = String(data.originCity || data.from).trim();
  }
  if (data.durationNights !== undefined || data.duration !== undefined) {
    payload.durationNights = Number(data.durationNights || data.duration);
  }
  if (data.pricePerPerson !== undefined || data.price !== undefined) {
    payload.pricePerPerson = Number(data.pricePerPerson !== undefined ? data.pricePerPerson : data.price);
  }
  if (data.hotelStars !== undefined) payload.hotelStars = Number(data.hotelStars);
  if (data.image !== undefined) payload.image = String(data.image).trim();
  if (data.tags !== undefined) payload.tags = Array.isArray(data.tags) ? data.tags : [];
  if (data.status !== undefined) payload.status = data.status;

  payload.includesFlight = false;

  if (data.itinerary) {
    payload.itinerary = buildBackendItinerary(data.itinerary, payload.destination || 'Destination');
  }

  try {
    const updated = await fetchData(`${BASE_URL}/plans/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: buildPlansHeaders(session),
      body: JSON.stringify(payload),
    });
    return updated;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    if (status === 403) {
      throw new ApiError('You do not have permission to edit this plan.', 403);
    }
    if (status === 404) {
      throw new ApiError(`Plan #${id} not found on server.`, 404);
    }
    throw new ApiError(err.message || `Failed to update plan #${id}.`, status);
  }
}

/**
 * Deletes a travel plan by ID.
 * Calls DELETE /plans/:id on NestJS backend.
 * Permitted role: SUPERADMIN ONLY. (NonTechAdmin receives 403 Forbidden).
 * 
 * @param {string} id - Plan ID to delete
 * @param {Object} [session] - User session identity { userId, role, region }
 * @returns {Promise<{ message: string }>}
 */
export async function deletePlan(id, session = {}) {
  if (!id) throw new ApiError('Plan ID is required for deletion.', 400);

  const isNTA = (session.role || '').toLowerCase().includes('nontech') || (session.role || '').toLowerCase() === 'nta';

  if (isPlansMockMode()) {
    const idx = localMockStore.findIndex((p) => p.id === id);
    if (idx === -1) throw new ApiError(`Plan #${id} not found.`, 404);

    const existing = localMockStore[idx];
    if (isNTA) {
      if (session.region && existing.destination?.toLowerCase() !== session.region.toLowerCase()) {
        throw new ApiError(`Cannot delete package #${id}: package belongs to ${existing.destination}, but your active region is ${session.region}.`, 403);
      }
      // NTA delete restriction
      throw new ApiError('Only SuperAdmins are permitted to delete travel packages. NonTechAdmins may pause availability.', 403);
    }

    localMockStore.splice(idx, 1);
    return { message: `Plan ${id} deleted` };
  }

  try {
    const result = await fetchData(`${BASE_URL}/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: buildPlansHeaders(session),
    });
    return result;
  } catch (err) {
    const status = parseInt(err.message?.match(/status:\s*(\d+)/)?.[1], 10) || 500;
    if (status === 403) {
      throw new ApiError('Only SuperAdmins are permitted to delete travel plans.', 403);
    }
    if (status === 404) {
      throw new ApiError(`Plan #${id} not found on server.`, 404);
    }
    throw new ApiError(err.message || `Failed to delete plan #${id}.`, status);
  }
}
