import { createSlice } from '@reduxjs/toolkit';
import { GUEST } from '@/services/session.js';

const sessionSlice = createSlice({
  name: 'session',
  initialState: { user: GUEST, version: 0 },
  reducers: {
    sessionStarted(state, { payload }) {
      state.user = payload;
      state.version += 1;
    },
    sessionEnded(state) {
      state.user = GUEST;
      state.version += 1;
    },
  },
});

export const { sessionStarted, sessionEnded } = sessionSlice.actions;
export const selectUser = (state) => state.session.user;
export const selectSessionVersion = (state) => state.session.version;
export const selectHotelAccountId = (state) => {
  const user = selectUser(state);
  const id = user.userId || user.id || user.username;
  return user.role === 'hotel' && id ? String(id) : null;
};

export default sessionSlice.reducer;
