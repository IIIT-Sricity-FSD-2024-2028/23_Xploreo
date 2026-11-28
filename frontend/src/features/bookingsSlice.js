import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  cancelBooking,
  createBooking,
  getBooking,
  getHotel,
  listHotelBookings,
  retryHotelRefund,
} from '../services/hotels.api.js';
import {
  cancelExperienceBooking,
  createExperienceBooking,
  listExperienceBookings,
  retryExperienceRefund,
  updateExperienceBookingStatus,
} from '../services/partners.api.js';
import {
  cancelExperienceGuide,
  listExperienceGuides,
  requestExperienceGuide,
} from '../services/tripGuides.api.js';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from './authSlice.js';
import { processCheckoutPayment } from './checkoutSlice.js';

export const fetchTravellerBookings = createAsyncThunk(
  'bookings/fetchTravellerBookings',
  async (_, { rejectWithValue }) => {
    try {
      const [expData, hotelData] = await Promise.all([
        listExperienceBookings(),
        listHotelBookings(),
      ]);

      const expList = (Array.isArray(expData) ? expData : expData?.data || []).map((b) => ({
        ...b,
        bookingType: 'experience',
      }));

      const hotelList = (Array.isArray(hotelData) ? hotelData : hotelData?.data || []).map((b) => ({
        ...b,
        bookingType: 'hotel',
      }));

      return [...expList, ...hotelList];
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load bookings from server.');
    }
  },
);

export const fetchBookingDetail = createAsyncThunk(
  'bookings/fetchBookingDetail',
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
  'bookings/createHotelBooking',
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
  'bookings/createExperienceSlotBooking',
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
  'bookings/cancelTravellerBooking',
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
  'bookings/retryBookingRefund',
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

export const confirmExperienceBookingEnd = createAsyncThunk(
  'bookings/confirmExperienceBookingEnd',
  async (bookingId, { rejectWithValue }) => {
    try {
      const updated = await updateExperienceBookingStatus(bookingId, 'COMPLETED');
      return { bookingId, updated };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to confirm end request.');
    }
  },
);

export const requestGuideForExperienceBooking = createAsyncThunk(
  'bookings/requestGuideForExperience',
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
  'bookings/fetchExperienceAvailableGuides',
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
  'bookings/cancelGuideForExperience',
  async (bookingId, { rejectWithValue }) => {
    try {
      await cancelExperienceGuide(bookingId);
      return bookingId;
    } catch (error) {
      return rejectWithValue(error?.message || 'Could not cancel the request.');
    }
  },
);

function applyBookingPatch(state, id, patch) {
  state.items = state.items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  if (state.selectedBookingDetail?.id === id) {
    state.selectedBookingDetail = { ...state.selectedBookingDetail, ...patch };
  }
}

const initialState = {
  items: [],
  loading: false,
  error: null,
  loaded: false,
  selectedBookingId: null,
  selectedBookingDetail: null,
  selectedBookingHotel: null,
  detailLoading: false,
  detailError: null,
  actionLoading: false,
  actionError: null,
  guideActionLoading: false,
  guideActionError: null,
  lastCancellation: null,
  availableGuidesByBookingId: {},
  availableGuidesLoading: {},
  availableGuidesError: {},
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setSelectedBookingId(state, action) {
      state.selectedBookingId = action.payload;
    },
    setSelectedBookingDetail(state, action) {
      state.selectedBookingDetail = action.payload?.booking ?? null;
      state.selectedBookingHotel = action.payload?.hotel ?? null;
      state.detailError = null;
    },
    clearBookingActionError(state) {
      state.actionError = null;
      state.guideActionError = null;
    },
    clearBookingCancellationResult(state) {
      state.lastCancellation = null;
    },
    resetBookingsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTravellerBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTravellerBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.loaded = true;
        state.error = null;
      })
      .addCase(fetchTravellerBookings.rejected, (state, action) => {
        state.loading = false;
        state.items = [];
        state.error = action.payload || action.error.message || 'Failed to load bookings from server.';
      })
      .addCase(fetchBookingDetail.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchBookingDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detailError = null;
        state.selectedBookingDetail = action.payload.booking;
        state.selectedBookingHotel = action.payload.hotel;
      })
      .addCase(fetchBookingDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload || { status: 500, message: action.error.message };
      })
      .addCase(createHotelBooking.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createHotelBooking.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        if (action.payload?.id) {
          state.items = [action.payload, ...state.items.filter((b) => b.id !== action.payload.id)];
          state.selectedBookingDetail = action.payload;
        }
      })
      .addCase(createHotelBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload?.message || action.error.message || 'Failed to complete booking.';
      })
      .addCase(createExperienceSlotBooking.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createExperienceSlotBooking.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        if (action.payload?.id) {
          state.items = [action.payload, ...state.items.filter((b) => b.id !== action.payload.id)];
        }
      })
      .addCase(createExperienceSlotBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error.message || 'Failed to book experience.';
      })
      .addCase(cancelTravellerBooking.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
        state.lastCancellation = null;
      })
      .addCase(cancelTravellerBooking.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const { id, bookingType, result } = action.payload;
        const cancellationPayload = result?.booking ?? result ?? {};
        const patch = result?.booking ? result.booking : {
          status: 'CANCELLED',
          refundEligibility: result?.refundEligibility,
          refundStatus: result?.refundStatus,
          refundAmount: result?.refundAmount,
          refundReference: result?.refundReference,
          cancellationPolicyNote: result?.cancellationPolicyNote,
          cancelledAt: result?.cancelledAt,
          cancellationReason: result?.cancellationReason,
        };
        applyBookingPatch(state, id, patch);
        state.lastCancellation = {
          id,
          bookingType: bookingType || 'hotel',
          result: cancellationPayload,
        };
      })
      .addCase(cancelTravellerBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.lastCancellation = null;
        state.actionError = action.payload || action.error.message || 'Failed to cancel booking.';
      })
      .addCase(retryBookingRefund.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(retryBookingRefund.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { id, result } = action.payload;
        const refundStatus = result?.refund?.status || result?.refundStatus;
        const patch = {
          ...(result?.booking || {}),
          ...(refundStatus ? { refundStatus } : {}),
          ...(result?.refundAmount !== undefined ? { refundAmount: result.refundAmount } : {}),
          ...(result?.refundReference ? { refundReference: result.refundReference } : {}),
        };
        applyBookingPatch(state, id, patch);
      })
      .addCase(retryBookingRefund.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error.message || 'Failed to retry refund.';
      })
      .addCase(confirmExperienceBookingEnd.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(confirmExperienceBookingEnd.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const { bookingId, updated } = action.payload;
        applyBookingPatch(state, bookingId, {
          status: 'COMPLETED',
          ...(updated || {}),
        });
      })
      .addCase(confirmExperienceBookingEnd.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error?.message || 'Failed to confirm end request.';
      })
      .addCase(requestGuideForExperienceBooking.pending, (state) => {
        state.guideActionLoading = true;
        state.guideActionError = null;
        state.actionError = null;
      })
      .addCase(requestGuideForExperienceBooking.fulfilled, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError = null;
        const { bookingId, updated } = action.payload;
        if (updated) {
          applyBookingPatch(state, bookingId, updated);
        }
      })
      .addCase(requestGuideForExperienceBooking.rejected, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError =
          action.payload || action.error?.message || 'Could not send the request.';
      })
      .addCase(cancelGuideForExperienceBooking.pending, (state) => {
        state.guideActionLoading = true;
        state.guideActionError = null;
        state.actionError = null;
      })
      .addCase(cancelGuideForExperienceBooking.fulfilled, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError = null;
        const bookingId = action.payload;
        applyBookingPatch(state, bookingId, {
          guideId: undefined,
          guideName: undefined,
          guideStatus: undefined,
          guideFee: undefined,
          guidePricePerPerson: undefined,
          guide: undefined,
        });
      })
      .addCase(cancelGuideForExperienceBooking.rejected, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError =
          action.payload || action.error?.message || 'Could not cancel the request.';
      })
      .addCase(fetchExperienceAvailableGuides.pending, (state, action) => {
        const bookingId = action.meta.arg;
        state.availableGuidesLoading[bookingId] = true;
        state.availableGuidesError[bookingId] = null;
      })
      .addCase(fetchExperienceAvailableGuides.fulfilled, (state, action) => {
        const { bookingId, guides } = action.payload;
        state.availableGuidesLoading[bookingId] = false;
        state.availableGuidesByBookingId[bookingId] = guides;
        state.availableGuidesError[bookingId] = null;
      })
      .addCase(fetchExperienceAvailableGuides.rejected, (state, action) => {
        const bookingId = action.payload?.bookingId || action.meta.arg;
        state.availableGuidesLoading[bookingId] = false;
        state.availableGuidesError[bookingId] =
          action.payload?.message || action.error?.message || 'Could not load guides.';
      })
      .addCase(processCheckoutPayment.fulfilled, (state, action) => {
        if (action.payload?.outcome === 'SUCCEEDED') {
          state.selectedBookingId = null;
          if (action.payload.createdBooking?.id) {
            const created = { ...action.payload.createdBooking, bookingType: 'hotel' };
            state.items = [created, ...state.items.filter((b) => b.id !== created.id)];
          }
          if (action.payload.createdExperience?.id) {
            const createdExp = { ...action.payload.createdExperience, bookingType: 'experience' };
            state.items = [createdExp, ...state.items.filter((b) => b.id !== createdExp.id)];
          }
        }
      })
      .addCase(logoutUser, () => initialState)
      .addCase(logoutSession.fulfilled, () => initialState)
      .addCase(restoreAuthSession.rejected, () => initialState)
      .addCase(setAuthUser, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState)
      .addCase(registerUser.fulfilled, () => initialState);
  },
});

export const {
  setSelectedBookingId,
  setSelectedBookingDetail,
  clearBookingActionError,
  clearBookingCancellationResult,
  resetBookingsState,
} = bookingsSlice.actions;

export const selectBookingsList = (state) => state.bookings.items;
export const selectBookingsLoading = (state) => state.bookings.loading;
export const selectBookingsError = (state) => state.bookings.error;
export const selectSelectedBookingId = (state) => state.bookings.selectedBookingId;
export const selectSelectedBookingDetail = (state) => state.bookings.selectedBookingDetail;
export const selectSelectedBookingHotel = (state) => state.bookings.selectedBookingHotel;
export const selectBookingDetailLoading = (state) => state.bookings.detailLoading;
export const selectBookingDetailError = (state) => state.bookings.detailError;
export const selectBookingActionLoading = (state) => Boolean(state.bookings.actionLoading);
export const selectBookingActionError = (state) => state.bookings.actionError || null;
export const selectBookingCancellationResult = (state) => state.bookings.lastCancellation || null;
export const selectBookingGuideActionLoading = (state) => Boolean(state.bookings.guideActionLoading);
export const selectBookingGuideActionError = (state) => state.bookings.guideActionError || null;
export const selectExperienceAvailableGuides = (state, bookingId) =>
  state.bookings.availableGuidesByBookingId?.[bookingId] ?? null;
export const selectExperienceGuidesLoading = (state, bookingId) =>
  Boolean(state.bookings.availableGuidesLoading?.[bookingId]);
export const selectExperienceGuidesError = (state, bookingId) =>
  state.bookings.availableGuidesError?.[bookingId] || null;

export default bookingsSlice.reducer;
