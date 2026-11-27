import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from '@/features/authSlice.js';
import { processCheckoutPayment } from './checkoutThunks.js';

export const DEFAULT_DEMO_ITEM = {
  id: 'demo-item-taj',
  title: 'Taj Lake Palace - Luxury Heritage Suite',
  type: 'hotel',
  location: 'Lake Pichola, Udaipur, Rajasthan',
  date: '2026-11-10',
  checkIn: '2026-11-10',
  checkOut: '2026-11-14',
  guestCount: 2,
  basePrice: 7500,
  taxesAndFees: 1200,
  imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
};

export const DEFAULT_TRAVELLER_DETAILS = {
  firstName: 'Anjali',
  lastName: 'Sharma',
  email: 'anjali@xploreo.com',
  phone: '9123456780',
  specialRequests: 'High floor room preferred, quiet corner.',
};

export const checkoutInitialState = {
  selectedItem: null,
  sourceKey: null,
  currentStepIndex: 0,
  guestCount: 2,
  roomCount: 1,
  travellerDetails: { ...DEFAULT_TRAVELLER_DETAILS },
  selectedMethod: 'upi',
  simulatedOutcome: 'SUCCESS',
  isProcessing: false,
  paymentResult: null,
  errorMessage: '',
  createdExperience: null,
  hasPersisted: false,
  persistenceId: null,
};

const checkoutSlice = createSlice({
  name: 'traveller/checkout',
  initialState: checkoutInitialState,
  reducers: {
    initCheckoutSession(state, action) {
      const { item, guestCount, roomCount, travellerDetails, sourceKey } = action.payload || {};
      const shouldReset = Boolean(sourceKey && state.sourceKey !== sourceKey);
      if (shouldReset || !state.selectedItem) {
        state.selectedItem = item || state.selectedItem || DEFAULT_DEMO_ITEM;
        state.sourceKey = sourceKey || state.sourceKey;
        state.currentStepIndex = 0;
        state.paymentResult = null;
        state.errorMessage = '';
        state.createdExperience = null;
        state.hasPersisted = false;
        state.persistenceId = null;
        state.isProcessing = false;
        if (guestCount != null) state.guestCount = Number(guestCount) || 2;
        if (roomCount != null) state.roomCount = Math.max(1, Number(roomCount) || 1);
        if (travellerDetails) {
          state.travellerDetails = { ...DEFAULT_TRAVELLER_DETAILS, ...travellerDetails };
        }
      }
    },
    setCheckoutItem(state, action) {
      const item = action.payload || null;
      state.selectedItem = item;
      state.sourceKey = item
        ? `dispatch:${item.id || 'item'}:${item.checkIn || item.date || ''}:${item.roomType || ''}:${item.guestCount || ''}:${item.roomCount || ''}`
        : null;
      state.currentStepIndex = 0;
      state.paymentResult = null;
      state.errorMessage = '';
      state.createdExperience = null;
      state.hasPersisted = false;
      state.persistenceId = null;
      state.isProcessing = false;
      if (item?.guestCount != null) {
        state.guestCount = Math.max(1, Number(item.guestCount) || 2);
      }
      if (item?.roomCount != null) {
        state.roomCount = Math.max(1, Number(item.roomCount) || 1);
      }
    },
    setCheckoutStep(state, action) {
      state.currentStepIndex = Number(action.payload) || 0;
    },
    setGuestCount(state, action) {
      state.guestCount = Math.max(1, Number(action.payload) || 1);
    },
    setRoomCount(state, action) {
      state.roomCount = Math.max(1, Number(action.payload) || 1);
    },
    setTravellerDetails(state, action) {
      state.travellerDetails = {
        ...state.travellerDetails,
        ...(action.payload || {}),
      };
    },
    setPaymentMethod(state, action) {
      state.selectedMethod = action.payload || 'upi';
    },
    setSimulatedOutcome(state, action) {
      state.simulatedOutcome = action.payload || 'SUCCESS';
    },
    setCheckoutError(state, action) {
      state.errorMessage = action.payload || '';
    },
    resetCheckoutState: () => checkoutInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(processCheckoutPayment.pending, (state) => {
        state.isProcessing = true;
        state.errorMessage = '';
      })
      .addCase(processCheckoutPayment.fulfilled, (state, action) => {
        state.isProcessing = false;
        const payload = action.payload || {};
        state.paymentResult = payload.result || null;
        if (payload.outcome === 'NON_SUCCESS') {
          state.errorMessage = payload.errorMessage || 'Simulated payment was not successful.';
          state.currentStepIndex = 3;
        } else {
          state.errorMessage = '';
          if (payload.createdExperience) {
            state.createdExperience = payload.createdExperience;
          }
          state.hasPersisted = true;
          if (payload.persistenceId) {
            state.persistenceId = payload.persistenceId;
          }
          state.currentStepIndex = 3;
        }
      })
      .addCase(processCheckoutPayment.rejected, (state, action) => {
        state.isProcessing = false;
        const payload = action.payload;
        state.errorMessage =
          (typeof payload === 'string' ? payload : payload?.message) ||
          action.error?.message ||
          'Payment processing failed.';
        if (payload?.persistenceId && !state.persistenceId) {
          state.persistenceId = payload.persistenceId;
        }
      })
      .addCase(logoutUser, () => checkoutInitialState)
      .addCase(logoutSession.fulfilled, () => checkoutInitialState)
      .addCase(restoreAuthSession.rejected, () => checkoutInitialState)
      .addCase(setAuthUser, () => checkoutInitialState)
      .addCase(loginUser.fulfilled, () => checkoutInitialState)
      .addCase(registerUser.fulfilled, () => checkoutInitialState);
  },
});

export const {
  initCheckoutSession,
  setCheckoutItem,
  setCheckoutStep,
  setGuestCount,
  setRoomCount,
  setTravellerDetails,
  setPaymentMethod,
  setSimulatedOutcome,
  setCheckoutError,
  resetCheckoutState,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
