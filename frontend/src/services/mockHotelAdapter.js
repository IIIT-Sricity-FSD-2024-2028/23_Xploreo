/**
 * mockHotelAdapter.js
 * Explicit mock adapter for Traveller Hotel Booking history and details.
 * 
 * Purpose:
 * The NestJS backend BookingsController currently provides only POST /api/bookings.
 * It lacks GET /api/bookings and GET /api/bookings/:id for travellers.
 * 
 * Rules:
 * - Clear identification of mock data (all sample records flagged with isDemo: true, source: 'mock').
 * - Matching service interface with live requests.
 * - In live mode, requests are sent via apiRequest('/bookings') and failures are surfaced
 *   rather than silently substituting mock data.
 * - Does not send mock data to the live backend.
 */

import { apiRequest } from './api.js';

export const SAMPLE_HOTEL_BOOKINGS = [
  {
    id: 'demo-htl-101',
    hotelId: 'hotel-1',
    travellerId: 'T001',
    guestName: 'Anjali Sharma',
    email: 'anjali@xploreo.com',
    phone: '9123456780',
    checkIn: '2026-11-10',
    checkOut: '2026-11-14',
    guests: 2,
    roomType: 'Deluxe Lake View Suite',
    totalAmount: 32000,
    status: 'CONFIRMED',
    createdAt: '2026-10-12T14:30:00.000Z',
    isDemo: true,
    source: 'mock',
    bookingType: 'hotel',
    hotel: {
      id: 'hotel-1',
      name: 'Taj Lake Palace',
      city: 'Udaipur',
      address: 'Lake Pichola, Udaipur, Rajasthan 313001',
      rating: 4.9,
      pricePerNight: 7500,
      taxesAndFees: 1200,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    },
  },
  {
    id: 'demo-htl-102',
    hotelId: 'hotel-2',
    travellerId: 'T001',
    guestName: 'Anjali Sharma',
    email: 'anjali@xploreo.com',
    phone: '9123456780',
    checkIn: '2026-12-01',
    checkOut: '2026-12-03',
    guests: 1,
    roomType: 'Royal Premier Room',
    totalAmount: 18500,
    status: 'CONFIRMED',
    createdAt: '2026-10-10T10:15:00.000Z',
    isDemo: true,
    source: 'mock',
    bookingType: 'hotel',
    hotel: {
      id: 'hotel-2',
      name: 'The Leela Palace',
      city: 'New Delhi',
      address: 'Diplomatic Enclave, Chanakyapuri, New Delhi 110023',
      rating: 4.8,
      pricePerNight: 8500,
      taxesAndFees: 1500,
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    },
  },
  {
    id: 'demo-htl-103',
    hotelId: 'hotel-3',
    travellerId: 'T001',
    guestName: 'Anjali Sharma',
    email: 'anjali@xploreo.com',
    phone: '9123456780',
    checkIn: '2026-09-15',
    checkOut: '2026-09-18',
    guests: 2,
    roomType: 'Luxury Safari Pool Hut',
    totalAmount: 24000,
    status: 'CANCELLED',
    createdAt: '2026-09-01T09:00:00.000Z',
    isDemo: true,
    source: 'mock',
    bookingType: 'hotel',
    hotel: {
      id: 'hotel-3',
      name: 'Evolve Back Kabini',
      city: 'Kabini',
      address: 'Bheeramballi Village, H.D. Kote Taluk, Karnataka 571116',
      rating: 4.7,
      pricePerNight: 7000,
      taxesAndFees: 1000,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    },
  },
];

/**
 * Fetch hotel bookings list.
 * 
 * @param {Object} options
 * @param {string} [options.mode='mock'] - 'mock' or 'live'
 * @param {string} [options.travellerId] - Filter by traveller ID
 * @param {boolean} [options.simulateError=false] - For test verification of mock error state
 * @param {boolean} [options.simulateEmpty=false] - For test verification of mock empty state
 * @returns {Promise<Array>}
 */
export async function fetchHotelBookings({
  mode = 'mock',
  travellerId = null,
  simulateError = false,
  simulateEmpty = false,
} = {}) {
  if (mode === 'live') {
    // Send real authenticated request to backend endpoint.
    // Surfaces live error directly without fallback when backend returns 404.
    const res = await apiRequest('/bookings');
    return Array.isArray(res) ? res : res?.data || [];
  }

  // Explicit Mock Mode
  if (simulateError) {
    throw new Error('Simulated Mock Hotel Adapter error: network failure.');
  }

  if (simulateEmpty) {
    return [];
  }

  // Realistic sample bookings with demo tags
  const list = travellerId
    ? SAMPLE_HOTEL_BOOKINGS.filter((b) => !b.travellerId || b.travellerId === travellerId)
    : SAMPLE_HOTEL_BOOKINGS;

  return list.map((b) => ({ ...b, isDemo: true, source: 'mock' }));
}

/**
 * Fetch hotel booking details by ID.
 * 
 * @param {string} id
 * @param {Object} options
 * @param {string} [options.mode='mock'] - 'mock' or 'live'
 * @returns {Promise<Object>}
 */
export async function fetchHotelBookingById(id, { mode = 'mock' } = {}) {
  if (mode === 'live') {
    return await apiRequest(`/bookings/${id}`);
  }

  const match = SAMPLE_HOTEL_BOOKINGS.find((b) => b.id === id);
  if (!match) {
    throw new Error(`Mock hotel booking #${id} not found.`);
  }

  return { ...match, isDemo: true, source: 'mock' };
}

export const hotelBookingsService = {
  fetchBookings: fetchHotelBookings,
  fetchById: fetchHotelBookingById,
  SAMPLE_HOTEL_BOOKINGS,
};
