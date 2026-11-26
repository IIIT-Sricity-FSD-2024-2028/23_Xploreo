import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../services/api.js';
import { GUEST, clearUser, getUser, storeUser } from '../services/session.js';

function decodeTokenPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Preserves AuthContext normalization across all roles (Traveller, Guide, Hotel, Experience, NTA, Admin).
export function normalizeAuthAccount(account) {
  if (!account || account.role === 'default') return account ?? GUEST;
  const tokenClaims = decodeTokenPayload(account.token);
  const defaultNtaRegion = (
    account.userId === 'NTA001' || account.username === 'NTA001' ? 'Jaipur' :
    account.userId === 'NTA002' || account.username === 'NTA002' ? 'Goa' :
    account.userId === 'NTA003' || account.username === 'NTA003' ? 'Delhi' :
    account.userId === 'NTA004' || account.username === 'NTA004' ? 'Mumbai' :
    account.userId === 'NTA005' || account.username === 'NTA005' ? 'Kerala' : undefined
  );
  const region = account.region || account.location || account.destination || tokenClaims?.region || (
    account.userId === 'XP001' || account.username === 'XP001' || account.role === 'experience'
      ? 'Kerala'
      : defaultNtaRegion
  );
  return {
    ...account,
    id: account.id ?? account.userId ?? account.username,
    partnerType: account.role,
    region: region ?? account.region,
    location: region ?? account.location,
  };
}

function isUserAuthenticated(user) {
  return Boolean(user && user.role && user.role !== 'default');
}

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const result = await authApi.login(credentials);
      const authenticatedUser = result?.user || result;
      if (result?.token && !authenticatedUser.token) {
        authenticatedUser.token = result.token;
      }
      storeUser(authenticatedUser);
      return normalizeAuthAccount(authenticatedUser);
    } catch (error) {
      return rejectWithValue(error?.message || 'Login failed. Please check your credentials.');
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (details, { rejectWithValue }) => {
    try {
      const result = await authApi.register(details);
      const authenticatedUser = result?.user || result;
      if (result?.token && !authenticatedUser.token) {
        authenticatedUser.token = result.token;
      }
      storeUser(authenticatedUser);
      return normalizeAuthAccount(authenticatedUser);
    } catch (error) {
      return rejectWithValue(error?.message || 'Registration failed. Please try again.');
    }
  },
);

export const logoutSession = createAsyncThunk('auth/logoutSession', async () => {
  clearUser();
  return GUEST;
});

const initialUser = normalizeAuthAccount(getUser());

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    isAuthenticated: isUserAuthenticated(initialUser),
    loading: false,
    error: null,
  },
  reducers: {
    setAuthUser(state, action) {
      const normalized = normalizeAuthAccount(action.payload);
      state.user = normalized;
      state.isAuthenticated = isUserAuthenticated(normalized);
      state.error = null;
      state.loading = false;
    },
    hydrateSession(state, action) {
      const normalized = normalizeAuthAccount(action.payload ?? GUEST);
      state.user = normalized;
      state.isAuthenticated = isUserAuthenticated(normalized);
      state.error = null;
    },
    logoutUser(state) {
      state.user = GUEST;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = isUserAuthenticated(action.payload);
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Login failed. Please check your credentials.';
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = isUserAuthenticated(action.payload);
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Registration failed. Please try again.';
      })
      .addCase(logoutSession.fulfilled, (state) => {
        state.user = GUEST;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { setAuthUser, hydrateSession, logoutUser, clearAuthError } = authSlice.actions;

export const selectAuthUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthRole = (state) => (state.auth.isAuthenticated ? state.auth.user.role : null);
export const selectAuthRegion = (state) => {
  const user = state.auth.user;
  return user?.region ?? user?.location ?? user?.destination ?? null;
};
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectTravellerId = (state) => {
  const user = state.auth.user;
  if (!state.auth.isAuthenticated) return null;
  return user?.userId || user?.id || user?.username || null;
};

export default authSlice.reducer;
