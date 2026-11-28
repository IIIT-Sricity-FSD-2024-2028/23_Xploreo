import { createAsyncThunk } from '@reduxjs/toolkit';
import { createTicket, getTickets, resolveTicket } from '@/services/tickets.api.js';

export const fetchSupportTickets = createAsyncThunk(
  'traveller/supportTickets/fetchSupportTickets',
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
  'traveller/supportTickets/createSupportTicket',
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

export const resolveSupportTicket = createAsyncThunk(
  'traveller/supportTickets/resolveSupportTicket',
  async ({ ticketId, resolution = '' }, { rejectWithValue }) => {
    try {
      const updated = await resolveTicket(ticketId, resolution);
      return { ticketId, resolution, updated };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to resolve support ticket.');
    }
  },
);
