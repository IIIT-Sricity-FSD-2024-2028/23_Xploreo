import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createTicket, getTickets } from '../services/tickets.api.js';
import { loginUser, logoutSession, logoutUser, registerUser, setAuthUser } from './authSlice.js';

const EMPTY_LIST = [];

export const fetchSupportTickets = createAsyncThunk(
  'supportTickets/fetchSupportTickets',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getTickets();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load your support tickets.');
    }
  },
);

export const createSupportTicket = createAsyncThunk(
  'supportTickets/createSupportTicket',
  async (payload, { rejectWithValue }) => {
    try {
      const created = await createTicket(payload);
      return created;
    } catch (error) {
      return rejectWithValue({
        status: error?.status || error?.response?.status || 500,
        message: error?.message || 'An unexpected error occurred while submitting the ticket.',
      });
    }
  },
);

const initialState = {
  items: [],
  hasLoaded: false,
  loading: false,
  error: null,
  creating: false,
  createError: null,
  lastCreatedTicket: null,
};

const supportTicketsSlice = createSlice({
  name: 'supportTickets',
  initialState,
  reducers: {
    clearSupportTicketsError(state) {
      state.error = null;
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
      .addCase(logoutUser, () => initialState)
      .addCase(logoutSession.fulfilled, () => initialState)
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

export const selectSupportTickets = (state) => state.supportTickets?.items || EMPTY_LIST;
export const selectSupportTicketsHasLoaded = (state) => Boolean(state.supportTickets?.hasLoaded);
export const selectSupportTicketsLoading = (state) => Boolean(state.supportTickets?.loading);
export const selectSupportTicketsError = (state) => state.supportTickets?.error || null;
export const selectSupportTicketCreating = (state) => Boolean(state.supportTickets?.creating);
export const selectSupportTicketCreateError = (state) => state.supportTickets?.createError || null;
export const selectLastCreatedTicket = (state) => state.supportTickets?.lastCreatedTicket || null;

export default supportTicketsSlice.reducer;
