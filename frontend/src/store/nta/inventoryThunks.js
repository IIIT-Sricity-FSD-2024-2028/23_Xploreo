import { createAsyncThunk } from '@reduxjs/toolkit';
import { listHotels, listRooms } from '@/services/hotels.api.js';
import { listMyExperiences } from '@/services/partners.api.js';

// Same rejection shape as the rest of store/nta — { status, message }.
function errorDetails(error, fallback) {
  return { status: error?.status ?? null, message: error?.message || fallback };
}

// Partner inventory an NTA builds packages from. Each load is skipped while one is in flight,
// and once loaded unless { force: true } is passed.

// READ — GET /hotels (active partner hotels; NONTECHADMIN allowed).
export const fetchNtaHotels = createAsyncThunk(
  'nta/inventory/fetchHotels',
  async (_args, { rejectWithValue }) => {
    try {
      const hotels = await listHotels();
      return Array.isArray(hotels) ? hotels : [];
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to load partner hotels.'));
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const { status } = getState().nta.inventory.hotels;
      if (status === 'loading') return false;
      return force || status !== 'succeeded';
    },
  },
);

// READ — GET /experiences (all partner experiences; filtered to the region by selectors).
export const fetchNtaExperiences = createAsyncThunk(
  'nta/inventory/fetchExperiences',
  async (_args, { rejectWithValue }) => {
    try {
      const experiences = await listMyExperiences();
      return Array.isArray(experiences) ? experiences : experiences?.data || [];
    } catch (error) {
      return rejectWithValue(errorDetails(error, 'Failed to load partner experiences.'));
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const { status } = getState().nta.inventory.experiences;
      if (status === 'loading') return false;
      return force || status !== 'succeeded';
    },
  },
);

// READ — GET /hotels/:id/rooms (room types of one hotel, for the package room-type picker).
export const fetchNtaHotelRooms = createAsyncThunk(
  'nta/inventory/fetchHotelRooms',
  async ({ hotelId }, { rejectWithValue }) => {
    try {
      const rooms = await listRooms(hotelId);
      return { hotelId, rooms: Array.isArray(rooms) ? rooms : [] };
    } catch (error) {
      return rejectWithValue({ hotelId, ...errorDetails(error, 'Failed to load room types.') });
    }
  },
  {
    condition: ({ hotelId, force = false } = {}, { getState }) => {
      if (!hotelId) return false;
      const entry = getState().nta.inventory.roomsByHotel[hotelId];
      if (entry?.status === 'loading') return false;
      return force || entry?.status !== 'succeeded';
    },
  },
);
