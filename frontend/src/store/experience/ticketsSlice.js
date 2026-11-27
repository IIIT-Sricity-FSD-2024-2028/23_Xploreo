import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createTicket, getTickets } from '@/services/tickets.api.js';
import { selectUser } from '../sessionSlice.js';

const isExperiencePartner = (state) => selectUser(state).role === 'experience';

export const fetchExperienceTickets = createAsyncThunk(
  'experience/tickets/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getTickets();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue({
        status: error?.status ?? null,
        message: error?.message || 'Failed to load support tickets',
      });
    }
  },
  {
    condition(_, { getState }) {
      return isExperiencePartner(getState());
    },
  }
);

export const submitExperienceTicket = createAsyncThunk(
  'experience/tickets/create',
  async ({ subject, message, category, priority }, { rejectWithValue }) => {
    try {
      const ticket = await createTicket({ subject, message, category, priority });
      return ticket;
    } catch (error) {
      return rejectWithValue({
        status: error?.status ?? null,
        message: error?.message || 'Failed to submit support ticket',
      });
    }
  }
);

const ticketsSlice = createSlice({
  name: 'experience/tickets',
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearTickets(state) {
      state.data = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExperienceTickets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExperienceTickets.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.data = payload;
        state.error = null;
      })
      .addCase(fetchExperienceTickets.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload ?? error;
      })
      .addCase(submitExperienceTicket.fulfilled, (state, { payload }) => {
        if (payload) {
          state.data.unshift(payload);
        }
      });
  },
});

export const { clearTickets } = ticketsSlice.actions;

export const selectExperienceTicketsState = (state) => state.experience.tickets;
export const selectExperienceTickets = (state) => state.experience.tickets?.data ?? [];
export const selectExperienceTicketsLoading = (state) => state.experience.tickets?.loading ?? false;
export const selectExperienceTicketsError = (state) => state.experience.tickets?.error ?? null;

export default ticketsSlice.reducer;
