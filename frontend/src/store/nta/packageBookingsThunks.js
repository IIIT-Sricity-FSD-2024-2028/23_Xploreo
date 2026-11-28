import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  dispatchNtaPackageBooking,
  getNtaPackageBookingDetail,
  getNtaPackageBookings,
} from '@/services/nta.api.js';
import { selectUser } from '../sessionSlice.js';

function errorDetails(error, fallback) {
  return { status: error?.status ?? null, message: error?.message || fallback };
}

const sessionFor = (session, getState) => session ?? selectUser(getState());

export const fetchNtaPackageBookings = createAsyncThunk(
  'nta/packageBookings/fetchAll',
  async ({ session } = {}, { getState, rejectWithValue }) => {
    try {
      const list = await getNtaPackageBookings(sessionFor(session, getState));
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to load package bookings.'));
    }
  },
);

export const fetchNtaPackageBookingDetail = createAsyncThunk(
  'nta/packageBookings/fetchDetail',
  async ({ tripId, session }, { getState, rejectWithValue }) => {
    try {
      return await getNtaPackageBookingDetail(tripId, sessionFor(session, getState));
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to load package booking details.'));
    }
  },
);

export const dispatchNtaPackageBookingThunk = createAsyncThunk(
  'nta/packageBookings/dispatch',
  async ({ tripId, session }, { getState, rejectWithValue }) => {
    try {
      const result = await dispatchNtaPackageBooking(tripId, sessionFor(session, getState));
      return { tripId, result };
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to dispatch package components.'));
    }
  },
);
