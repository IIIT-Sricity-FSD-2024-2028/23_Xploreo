import { createSlice } from '@reduxjs/toolkit';
import { GUEST, loadPersistedSession } from '@/services/session.js';
import { sessionEnded, sessionStarted } from '@/store/sessionSlice.js';
import {
  confirmPasswordResetThunk,
  loginThunk,
  logoutThunk,
  registerThunk,
  requestPasswordResetThunk,
} from './authThunks.js';

const persisted = loadPersistedSession();
const hasUser = Boolean(persisted.user?.role && persisted.user.role !== 'default');

const initialState = {
  user: hasUser ? persisted.user : GUEST,
  isAuthenticated: hasUser,
  loading: false,
  error: null,
  resetMessage: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    clearResetMessage: (state) => {
      state.resetMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = Boolean(action.payload?.role && action.payload.role !== 'default');
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed.';
      })
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = Boolean(action.payload?.role && action.payload.role !== 'default');
        state.error = null;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed.';
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = GUEST;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(requestPasswordResetThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.resetMessage = null;
      })
      .addCase(requestPasswordResetThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.resetMessage = action.payload?.message || 'Reset link sent.';
      })
      .addCase(requestPasswordResetThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to request password reset.';
      })
      .addCase(confirmPasswordResetThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.resetMessage = null;
      })
      .addCase(confirmPasswordResetThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.resetMessage = action.payload?.message || 'Password updated.';
      })
      .addCase(confirmPasswordResetThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to reset password.';
      })
      .addCase(sessionStarted, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = Boolean(action.payload?.role && action.payload.role !== 'default');
        state.loading = false;
        state.error = null;
      })
      .addCase(sessionEnded, (state) => {
        state.user = GUEST;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearAuthError, clearResetMessage } = authSlice.actions;
export default authSlice.reducer;
