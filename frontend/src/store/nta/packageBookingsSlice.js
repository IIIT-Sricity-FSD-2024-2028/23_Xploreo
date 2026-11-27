import { createSlice } from '@reduxjs/toolkit';
import {
  dispatchNtaPackageBookingThunk,
  fetchNtaPackageBookingDetail,
  fetchNtaPackageBookings,
} from './packageBookingsThunks.js';

const initialState = {
  items: [],
  selectedId: null,
  selectedDetail: null,
  status: 'idle',
  error: null,
  detailStatus: 'idle',
  detailError: null,
  dispatchStatus: 'idle',
  dispatchError: null,
  lastDispatchResult: null,
};

const packageBookingsSlice = createSlice({
  name: 'nta/packageBookings',
  initialState,
  reducers: {
    setSelectedNtaPackageBookingId(state, action) {
      state.selectedId = action.payload ?? null;
      state.lastDispatchResult = null;
      state.dispatchError = null;
      if (!action.payload) {
        state.selectedDetail = null;
        state.detailError = null;
      }
    },
    clearNtaPackageDispatchResult(state) {
      state.lastDispatchResult = null;
      state.dispatchError = null;
      state.dispatchStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNtaPackageBookings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNtaPackageBookings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchNtaPackageBookings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? { status: null, message: action.error.message };
      })
      .addCase(fetchNtaPackageBookingDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchNtaPackageBookingDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.selectedDetail = action.payload ?? null;
        state.detailError = null;
      })
      .addCase(fetchNtaPackageBookingDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload ?? { status: null, message: action.error.message };
      })
      .addCase(dispatchNtaPackageBookingThunk.pending, (state) => {
        state.dispatchStatus = 'loading';
        state.dispatchError = null;
      })
      .addCase(dispatchNtaPackageBookingThunk.fulfilled, (state, action) => {
        state.dispatchStatus = 'succeeded';
        state.dispatchError = null;
        state.lastDispatchResult = action.payload?.result ?? null;
        const updatedPkg = action.payload?.result?.packageBooking;
        if (updatedPkg) {
          state.selectedDetail = updatedPkg;
          state.items = state.items.map((item) =>
            item.tripId === updatedPkg.tripId ? updatedPkg : item,
          );
        }
      })
      .addCase(dispatchNtaPackageBookingThunk.rejected, (state, action) => {
        state.dispatchStatus = 'failed';
        state.dispatchError = action.payload ?? { status: null, message: action.error.message };
      });
  },
});

export const {
  setSelectedNtaPackageBookingId,
  clearNtaPackageDispatchResult,
} = packageBookingsSlice.actions;

export default packageBookingsSlice.reducer;
