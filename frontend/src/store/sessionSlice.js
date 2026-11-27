import { createSlice } from '@reduxjs/toolkit';
import { GUEST, getUser } from '@/services/session.js';
import {
  hydrateSession,
  loginUser,
  logoutSession,
  logoutUser,
  normalizeAuthAccount,
  registerUser,
  restoreAuthSession,
  setAuthUser,
} from '@/features/authSlice.js';

const initialUser = normalizeAuthAccount(getUser());

const sessionSlice = createSlice({
  name: 'session',
  initialState: { user: initialUser, version: 0 },
  reducers: {
    sessionStarted(state, { payload }) {
      state.user = normalizeAuthAccount(payload);
      state.version += 1;
    },
    sessionEnded(state) {
      state.user = GUEST;
      state.version += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.user = normalizeAuthAccount(payload);
        state.version += 1;
      })
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.user = normalizeAuthAccount(payload);
        state.version += 1;
      })
      .addCase(setAuthUser, (state, { payload }) => {
        state.user = normalizeAuthAccount(payload);
        state.version += 1;
      })
      .addCase(hydrateSession, (state, { payload }) => {
        state.user = normalizeAuthAccount(payload ?? GUEST);
      })
      .addCase(restoreAuthSession.fulfilled, (state, { payload }) => {
        state.user = payload?.user ?? GUEST;
      })
      .addCase(restoreAuthSession.rejected, (state) => {
        state.user = GUEST;
        state.version += 1;
      })
      .addCase(logoutSession.fulfilled, (state) => {
        state.user = GUEST;
        state.version += 1;
      })
      .addCase(logoutUser, (state) => {
        state.user = GUEST;
        state.version += 1;
      });
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
