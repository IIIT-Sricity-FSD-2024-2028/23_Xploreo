import { createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '@/services/api.js';
import { clearPersistedSession, persistSession } from '@/services/session.js';
import { sessionEnded, sessionStarted } from '@/store/sessionSlice.js';

function readRegion(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).region;
  } catch {
    return undefined;
  }
}

const ntaRegions = {
  NTA001: 'Jaipur',
  NTA002: 'Goa',
  NTA003: 'Delhi',
  NTA004: 'Mumbai',
  NTA005: 'Kerala',
};

function normalizeAuthenticatedUser(result) {
  const { token: userToken, ...account } = result.user ?? result;
  const token = result.token ?? userToken;
  const region =
    account.region ||
    account.location ||
    account.destination ||
    readRegion(token) ||
    (account.role === 'experience'
      ? 'Kerala'
      : ntaRegions[account.userId] ?? ntaRegions[account.username]);

  const user = {
    ...account,
    id: account.id ?? account.userId ?? account.username,
    partnerType: account.role,
    region: region ?? account.region,
    location: region ?? account.location,
  };

  return { user, token };
}

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials, { dispatch, rejectWithValue }) => {
    try {
      const result = await authApi.login(credentials);
      const { user, token } = normalizeAuthenticatedUser(result);
      persistSession(user, token);
      dispatch(sessionStarted(user));
      return user;
    } catch (err) {
      return rejectWithValue(err?.message || 'Login failed. Please check your credentials.');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (details, { dispatch, rejectWithValue }) => {
    try {
      const result = await authApi.register(details);
      const { user, token } = normalizeAuthenticatedUser(result);
      persistSession(user, token);
      dispatch(sessionStarted(user));
      return user;
    } catch (err) {
      return rejectWithValue(err?.message || 'Registration failed. Please try again.');
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    clearPersistedSession();
    dispatch(sessionEnded());
    return null;
  }
);

export const requestPasswordResetThunk = createAsyncThunk(
  'auth/requestPasswordReset',
  async (details, { rejectWithValue }) => {
    try {
      return await authApi.requestPasswordReset(details);
    } catch (err) {
      return rejectWithValue(err?.message || 'We could not send a reset email. Please try again.');
    }
  }
);

export const confirmPasswordResetThunk = createAsyncThunk(
  'auth/confirmPasswordReset',
  async (details, { rejectWithValue }) => {
    try {
      return await authApi.confirmPasswordReset(details);
    } catch (err) {
      return rejectWithValue(err?.message || 'We could not reset your password. Please request a new link.');
    }
  }
);
