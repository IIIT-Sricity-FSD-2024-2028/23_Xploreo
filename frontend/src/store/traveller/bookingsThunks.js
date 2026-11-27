import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  cancelBooking,
  createBooking,
  getBooking,
  getHotel,
  listHotelBookings,
  retryHotelRefund,
} from '@/services/hotels.api.js';
import {
  cancelExperienceBooking,
  createExperienceBooking,
  listExperienceBookings,
  retryExperienceRefund,
} from '@/services/partners.api.js';
import {
  cancelExperienceGuide,
  getTravellerTrips,
  listExperienceGuides,
  requestExperienceGuide,
} from '@/services/tripGuides.api.js';
import { getUser } from '@/services/session.js';

export const fetchTravellerBookings = createAsyncThunk(
  'traveller/bookings/fetchTravellerBookings',
  async (_, { getState, rejectWithValue }) => {
    try {
      const authUser = getState()?.auth?.user ?? getUser();
      const travellerId = authUser?.userId || authUser?.id;

      const [expData, hotelData, tripsData] = await Promise.all([
        listExperienceBookings(),
        listHotelBookings(),
        travellerId ? getTravellerTrips(travellerId).catch(() => []) : Promise.resolve([]),
      ]);

      const expList = (Array.isArray(expData) ? expData : expData?.data || [])
        .filter((b) => !b.isPackageComponent && !b.tripId)
        .map((b) => ({
          ...b,
          bookingType: 'experience',
        }));

      const hotelList = (Array.isArray(hotelData) ? hotelData : hotelData?.data || [])
        .filter((b) => !b.isPackageComponent && !b.tripId)
        .map((b) => ({
          ...b,
          bookingType: 'hotel',
        }));

      const seenPackageIds = new Set();
      const packageList = (Array.isArray(tripsData) ? tripsData : [])
        .filter((t) => {
          if (!t?.id || seenPackageIds.has(t.id)) return false;
          seenPackageIds.add(t.id);
          return true;
        })
        .map((t) => ({
          ...t,
          bookingType: 'package',
          status: String(t.status || 'CONFIRMED').toUpperCase(),
          guests: t.travellers ?? 1,
          checkIn: t.itinerary?.day1?.hotel?.checkInDate || null,
          checkOut: t.itinerary?.day1?.hotel?.checkOutDate || null,
        }));

      return [...packageList, ...expList, ...hotelList];
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load bookings from server.');
    }
  },
);

export const fetchBookingDetail = createAsyncThunk(
  'traveller/bookings/fetchBookingDetail',
  async (bookingId, { rejectWithValue }) => {
    try {
      if (!bookingId || String(bookingId).trim() === '') {
        return rejectWithValue({ status: 400, message: 'Invalid booking reference ID provided.' });
      }
      const bookingData = await getBooking(bookingId);
      let hotel = null;
      if (bookingData?.hotelId) {
        try {
          hotel = await getHotel(bookingData.hotelId);
        } catch {
          hotel = null;
        }
      }
      return { booking: bookingData, hotel };
    } catch (error) {
      return rejectWithValue({
        status: error?.status || error?.response?.status || 500,
        message: error?.message || 'Failed to load booking details.',
      });
    }
  },
);

export const createHotelBooking = createAsyncThunk(
  'traveller/bookings/createHotelBooking',
  async (payload, { rejectWithValue }) => {
    try {
      const booking = await createBooking(payload);
      return { ...booking, bookingType: 'hotel' };
    } catch (error) {
      return rejectWithValue({
        status: error?.status || error?.response?.status || 500,
        message: error?.message || 'Failed to complete booking. Please review your details.',
        fieldErrors: error?.fieldErrors || error?.errors || null,
      });
    }
  },
);

export const createExperienceSlotBooking = createAsyncThunk(
  'traveller/bookings/createExperienceSlotBooking',
  async (payload, { rejectWithValue }) => {
    try {
      const booking = await createExperienceBooking(payload);
      return { ...booking, bookingType: 'experience' };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to book this experience. Please try again.');
    }
  },
);

export const cancelTravellerBooking = createAsyncThunk(
  'traveller/bookings/cancelTravellerBooking',
  async ({ id, bookingType, reason }, { rejectWithValue }) => {
    try {
      const result = bookingType === 'experience'
        ? await cancelExperienceBooking(id, { reason })
        : await cancelBooking(id, { reason });
      return { id, bookingType, result };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to cancel booking. Please try again.');
    }
  },
);

export const retryBookingRefund = createAsyncThunk(
  'traveller/bookings/retryBookingRefund',
  async ({ id, bookingType }, { rejectWithValue }) => {
    try {
      const result = bookingType === 'experience'
        ? await retryExperienceRefund(id)
        : await retryHotelRefund(id);
      return { id, bookingType, result };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to retry refund.');
    }
  },
);

export const requestGuideForExperienceBooking = createAsyncThunk(
  'traveller/bookings/requestGuideForExperience',
  async ({ bookingId, guideId }, { rejectWithValue }) => {
    try {
      const updated = await requestExperienceGuide(bookingId, guideId);
      return { bookingId, updated };
    } catch (error) {
      return rejectWithValue(error?.message || 'Could not send the request.');
    }
  },
);

export const fetchExperienceAvailableGuides = createAsyncThunk(
  'traveller/bookings/fetchExperienceAvailableGuides',
  async (bookingId, { rejectWithValue }) => {
    try {
      const guides = await listExperienceGuides(bookingId);
      return { bookingId, guides: Array.isArray(guides) ? guides : [] };
    } catch (error) {
      return rejectWithValue({
        bookingId,
        message: error?.message || 'Could not load guides.',
      });
    }
  },
);

export const cancelGuideForExperienceBooking = createAsyncThunk(
  'traveller/bookings/cancelGuideForExperience',
  async (bookingId, { rejectWithValue }) => {
    try {
      await cancelExperienceGuide(bookingId);
      return bookingId;
    } catch (error) {
      return rejectWithValue(error?.message || 'Could not cancel the request.');
    }
  },
);
