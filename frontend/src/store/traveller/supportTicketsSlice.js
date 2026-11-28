import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from '@/features/authSlice.js';
import {
  createSupportTicket,
  fetchSupportTickets,
  resolveSupportTicket,
} from './supportTicketsThunks.js';

const initialState = {
  items: [],
  hasLoaded: false,
  loading: false,
  error: null,
  creating: false,
  createError: null,
  lastCreatedTicket: null,
  resolving: false,
  resolveError: null,
};

const supportTicketsSlice = createSlice({
  name: 'traveller/supportTickets',
  initialState,
  reducers: {
    clearSupportTicketsError(state) {
      state.error = null;
      state.resolveError = null;
    },
    clearCreateTicketState(state) {
      state.creating = false;
      state.createError = null;
      state.lastCreatedTicket = null;
    },
    resetSupportTicketsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupportTickets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupportTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.hasLoaded = true;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSupportTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Failed to load your support tickets.';
      })
      .addCase(createSupportTicket.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createSupportTicket.fulfilled, (state, action) => {
        state.creating = false;
        state.createError = null;
        state.lastCreatedTicket = action.payload || null;
        if (action.payload && typeof action.payload === 'object') {
          const id = action.payload.id;
          if (!id || !state.items.some((t) => t.id === id)) {
            state.items = [action.payload, ...state.items];
          }
        }
      })
      .addCase(createSupportTicket.rejected, (state, action) => {
        state.creating = false;
        state.createError =
          (typeof action.payload === 'string' ? action.payload : action.payload?.message) ||
          action.error?.message ||
          'An unexpected error occurred while submitting the ticket.';
      })
      // Note: PATCH /tickets/:id is restricted to Role.TECHADMIN on the backend and is
      // intentionally excluded from Traveller UI; lifecycle is still tracked completely here.
      .addCase(resolveSupportTicket.pending, (state) => {
        state.resolving = true;
        state.resolveError = null;
      })
      .addCase(resolveSupportTicket.fulfilled, (state, action) => {
        state.resolving = false;
        state.resolveError = null;
        const { ticketId, resolution, updated } = action.payload;
        state.items = state.items.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                ...(updated && typeof updated === 'object' ? updated : { status: 'resolved', resolution }),
              }
            : t,
        );
      })
      .addCase(resolveSupportTicket.rejected, (state, action) => {
        state.resolving = false;
        state.resolveError = action.payload || action.error?.message || 'Failed to resolve support ticket.';
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
  clearSupportTicketsError,
  clearCreateTicketState,
  resetSupportTicketsState,
} = supportTicketsSlice.actions;

export default supportTicketsSlice.reducer;
