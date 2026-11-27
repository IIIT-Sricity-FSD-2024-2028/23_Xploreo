import { createSlice } from '@reduxjs/toolkit';
import { fetchNtaExperiences, fetchNtaHotelRooms, fetchNtaHotels } from './inventoryThunks.js';

// Partner hotels, their room types and experiences, as the server returns them. Region filtering
// and the shapes PlanForm / ItineraryBuilder need are derived by selectors.
const emptyList = () => ({ items: [], status: 'idle', error: null, requestId: null });

const initialState = {
  hotels: emptyList(),
  experiences: emptyList(),
  roomsByHotel: {}, // hotelId -> { items, status, error, requestId }
};

// pending / fulfilled / rejected for one list. A response is ignored when it does not belong to
// the latest request — including after logout, when the root reducer resets this slice.
function addListCases(builder, thunk, key) {
  builder
    .addCase(thunk.pending, (state, { meta }) => {
      state[key].status = 'loading';
      state[key].error = null;
      state[key].requestId = meta.requestId;
    })
    .addCase(thunk.fulfilled, (state, { payload, meta }) => {
      if (state[key].requestId !== meta.requestId) return;
      state[key].items = payload;
      state[key].status = 'succeeded';
      state[key].requestId = null;
    })
    .addCase(thunk.rejected, (state, { payload, error, meta }) => {
      if (state[key].requestId !== meta.requestId) return;
      state[key].status = 'failed';
      state[key].error = payload ?? { status: null, message: error.message };
      state[key].requestId = null;
    });
}

const inventorySlice = createSlice({
  name: 'nta/inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchNtaHotels, 'hotels');
    addListCases(builder, fetchNtaExperiences, 'experiences');
    builder
      .addCase(fetchNtaHotelRooms.pending, (state, { meta }) => {
        const { hotelId } = meta.arg;
        const entry = state.roomsByHotel[hotelId] || emptyList();
        state.roomsByHotel[hotelId] = { ...entry, status: 'loading', error: null, requestId: meta.requestId };
      })
      .addCase(fetchNtaHotelRooms.fulfilled, (state, { payload, meta }) => {
        const entry = state.roomsByHotel[payload.hotelId];
        if (!entry || entry.requestId !== meta.requestId) return;
        entry.items = payload.rooms;
        entry.status = 'succeeded';
        entry.requestId = null;
      })
      .addCase(fetchNtaHotelRooms.rejected, (state, { payload, error, meta }) => {
        const entry = state.roomsByHotel[meta.arg.hotelId];
        if (!entry || entry.requestId !== meta.requestId) return;
        entry.status = 'failed';
        entry.error = payload ?? { status: null, message: error.message };
        entry.requestId = null;
      });
  },
});

export default inventorySlice.reducer;
