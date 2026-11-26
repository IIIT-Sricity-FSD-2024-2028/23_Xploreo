import { createSlice } from '@reduxjs/toolkit';
import { fetchTickets, resolveTicketThunk } from './ticketsThunks.js';

// The one copy of the tech admin's tickets, shared by the TA dashboard and the ticket queue.
// Modal visibility, selection, filters and typed resolution text stay in the components.
const initialResolveState = { status: 'idle', error: null, ticketId: null, requestId: null };

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null, // { status, message } from the last failed load
  requestId: null,
  resolve: initialResolveState,
};

const ticketsSlice = createSlice({
  name: 'techadmin/tickets',
  initialState,
  reducers: {
    clearTicketsError(state) {
      state.error = null;
    },
    clearResolveError(state) {
      state.resolve.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickets.pending, (state, { meta }) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = meta.requestId;
      })
      .addCase(fetchTickets.fulfilled, (state, { payload, meta }) => {
        // Ignore a response that arrives after logout (the root reducer reset this slice) or
        // after a newer request was started.
        if (state.requestId !== meta.requestId) return;
        state.items = payload;
        state.status = 'succeeded';
        state.requestId = null;
      })
      .addCase(fetchTickets.rejected, (state, { payload, error, meta }) => {
        if (state.requestId !== meta.requestId) return;
        state.status = 'failed';
        state.error = payload ?? { status: null, message: error.message };
        state.requestId = null;
      })
      .addCase(resolveTicketThunk.pending, (state, { meta }) => {
        state.resolve = {
          status: 'loading',
          error: null,
          ticketId: meta.arg.ticketId,
          requestId: meta.requestId,
        };
      })
      .addCase(resolveTicketThunk.fulfilled, (state, { payload, meta }) => {
        // Update the ticket in place from the server's response — no refetch of the list.
        const index = state.items.findIndex((ticket) => ticket.id === meta.arg.ticketId);
        if (index >= 0) {
          const updated = payload && typeof payload === 'object' ? payload : {};
          state.items[index] = { ...state.items[index], ...updated, status: 'RESOLVED' };
        }
        if (state.resolve.requestId === meta.requestId) {
          state.resolve = { ...initialResolveState, status: 'succeeded', ticketId: meta.arg.ticketId };
        }
      })
      .addCase(resolveTicketThunk.rejected, (state, { payload, error, meta }) => {
        if (state.resolve.requestId !== meta.requestId) return;
        state.resolve = {
          status: 'failed',
          error: payload ?? { status: null, message: error.message },
          ticketId: meta.arg.ticketId,
          requestId: null,
        };
      });
  },
});

export const { clearTicketsError, clearResolveError } = ticketsSlice.actions;
export default ticketsSlice.reducer;
