import { createAsyncThunk } from '@reduxjs/toolkit';
import { getTickets, resolveTicket } from '@/services/tickets.api.js';

// Same rejection shape as store/hotel/resource.js — { status, message } — so pages keep the
// backend's HTTP status (400 already resolved, 403, 404) and its message.
function errorDetails(error, fallback) {
  return { status: error?.status ?? null, message: error?.message || fallback };
}

// READ — GET /tickets (a tech admin receives every ticket).
// Skipped while a request is in flight, and once loaded unless { force: true } is passed, so
// moving between the dashboard and the queue reuses the tickets already in the store.
export const fetchTickets = createAsyncThunk(
  'techadmin/tickets/fetch',
  async (_options, { rejectWithValue }) => {
    try {
      const tickets = await getTickets();
      return Array.isArray(tickets) ? tickets : [];
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to load support tickets.'));
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const { status } = getState().techadmin.tickets;
      if (status === 'loading') return false;
      return force || status !== 'succeeded';
    },
  },
);

// UPDATE — PATCH /tickets/:id { resolution? } (tech admin only). The server answers with the
// resolved ticket; a second resolve is rejected with 400 and an unknown id with 404.
export const resolveTicketThunk = createAsyncThunk(
  'techadmin/tickets/resolve',
  async ({ ticketId, resolution = '' }, { rejectWithValue }) => {
    try {
      return await resolveTicket(ticketId, resolution);
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to resolve ticket.'));
    }
  },
);
