import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest, authApi } from '../services/api.js';
import { getTravellerProfile, updateTravellerProfile as updateTravellerProfileApi } from '../services/traveller.api.js';
import { GUEST, clearUser, decodeTokenClaims, getUser, storeUser } from '../services/session.js';

function hasRichProfileData(account) {
  return Boolean(account && (account.name || account.email || account.phone || account.travellerProfile));
}

function mergeTravellerProfileIntoAccount(baseAccount, profile) {
  if (!profile) return baseAccount;
  const fullName = [profile.fname, profile.lname].filter(Boolean).join(' ').trim();
  return {
    ...baseAccount,
    name: fullName || baseAccount.name,
    email: profile.email || baseAccount.email,
    phone: profile.phno != null ? String(profile.phno) : baseAccount.phone,
    travellerProfile: profile,
  };
}

// Preserves AuthContext normalization across all roles (Traveller, Guide, Hotel, Experience, NTA, Admin).
export function normalizeAuthAccount(account) {
  if (!account || account.role === 'default') return account ?? GUEST;
  const tokenClaims = decodeTokenClaims(account.token);
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
    userId: account.userId ?? account.id ?? tokenClaims?.userId ?? account.username,
    username: account.username ?? tokenClaims?.username ?? account.userId ?? account.id,
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

export const restoreAuthSession = createAsyncThunk(
  'auth/restoreAuthSession',
  async (_, { getState, rejectWithValue }) => {
    const currentSession = getUser();
    const stateUser = getState()?.auth?.user;
    const baseAccount = normalizeAuthAccount(
      isUserAuthenticated(currentSession) ? currentSession : stateUser,
    );

    if (!isUserAuthenticated(baseAccount)) {
      return { user: GUEST, hydrated: true };
    }

    const claims = decodeTokenClaims(baseAccount.token);
    if (claims && typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
      clearUser();
      return rejectWithValue('Your session has expired. Please sign in again.');
    }

    const lookupId = baseAccount.userId || baseAccount.id || baseAccount.username;
    try {
      if (baseAccount.role === 'traveller' && lookupId) {
        const profile = await getTravellerProfile(lookupId);
        return {
          user: normalizeAuthAccount(mergeTravellerProfileIntoAccount(baseAccount, profile)),
          hydrated: true,
        };
      }
      if (baseAccount.role === 'superadmin' && lookupId) {
        const safeUser = await apiRequest(`/auth/users/${encodeURIComponent(lookupId)}`);
        return {
          user: normalizeAuthAccount({ ...baseAccount, ...safeUser, token: baseAccount.token }),
          hydrated: true,
        };
      }
      return { user: baseAccount, hydrated: true };
    } catch (error) {
      if (error?.status === 401) {
        clearUser();
        return rejectWithValue(error?.message || 'Your session is invalid. Please sign in again.');
      }
      // Graceful fallback when backend has no separate profile record (e.g., newly registered traveller)
      return { user: baseAccount, hydrated: true };
    }
  },
  {
    condition: (_, { getState }) => {
      const auth = getState()?.auth;
      return !auth?.sessionRestoring;
    },
  },
);

export const updateTravellerProfile = createAsyncThunk(
  'auth/updateTravellerProfile',
  async ({ userId, updates } = {}, { getState, rejectWithValue }) => {
    try {
      const authUser = getState()?.auth?.user;
      const targetId = userId || authUser?.userId || authUser?.id;
      const updated = await updateTravellerProfileApi(targetId, updates);
      return updated;
    } catch (error) {
      return rejectWithValue(error?.message || 'Unable to update traveller profile.');
    }
  },
);

export const logoutSession = createAsyncThunk(
  'auth/logoutSession',
  async (_, { rejectWithValue }) => {
    try {
      clearUser();
      return GUEST;
    } catch (error) {
      return rejectWithValue(error?.message || 'Unable to complete logout cleanly.');
    }
  },
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (details, { rejectWithValue }) => {
    try {
      const result = await authApi.requestPasswordReset(details);
      return result;
    } catch (error) {
      return rejectWithValue(error?.message || 'Unable to process password reset request.');
    }
  },
);

export const confirmPasswordReset = createAsyncThunk(
  'auth/confirmPasswordReset',
  async (details, { rejectWithValue }) => {
    try {
      const result = await authApi.confirmPasswordReset(details);
      return result;
    } catch (error) {
      return rejectWithValue(error?.message || 'Unable to reset password. Please check your token.');
    }
  },
);

const initialUser = normalizeAuthAccount(getUser());

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    isAuthenticated: isUserAuthenticated(initialUser),
    profileHydrated: !isUserAuthenticated(initialUser) || hasRichProfileData(initialUser),
    sessionRestoring: false,
    profileUpdating: false,
    loading: false,
    error: null,
    resetLoading: false,
    resetMessage: null,
    resetError: null,
  },
  reducers: {
    setAuthUser(state, action) {
      const normalized = normalizeAuthAccount(action.payload);
      state.user = normalized;
      state.isAuthenticated = isUserAuthenticated(normalized);
      state.profileHydrated = !state.isAuthenticated || hasRichProfileData(normalized);
      state.error = null;
      state.loading = false;
    },
    hydrateSession(state, action) {
      const normalized = normalizeAuthAccount(action.payload ?? GUEST);
      state.user = normalized;
      state.isAuthenticated = isUserAuthenticated(normalized);
      state.profileHydrated = !state.isAuthenticated || hasRichProfileData(normalized);
      state.error = null;
    },
    logoutUser(state) {
      state.user = GUEST;
      state.isAuthenticated = false;
      state.profileHydrated = true;
      state.sessionRestoring = false;
      state.profileUpdating = false;
      state.loading = false;
      state.error = null;
      state.resetLoading = false;
      state.resetMessage = null;
      state.resetError = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
    clearResetFeedback(state) {
      state.resetLoading = false;
      state.resetMessage = null;
      state.resetError = null;
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
        state.profileHydrated = true;
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
        state.profileHydrated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Registration failed. Please try again.';
      })
      .addCase(restoreAuthSession.pending, (state) => {
        state.sessionRestoring = true;
        state.error = null;
      })
      .addCase(restoreAuthSession.fulfilled, (state, action) => {
        state.sessionRestoring = false;
        state.profileHydrated = true;
        const restoredUser = action.payload?.user ?? GUEST;
        state.user = restoredUser;
        state.isAuthenticated = isUserAuthenticated(restoredUser);
      })
      .addCase(restoreAuthSession.rejected, (state, action) => {
        state.sessionRestoring = false;
        state.profileHydrated = true;
        state.user = GUEST;
        state.isAuthenticated = false;
        state.error = action.payload || action.error?.message || 'Unable to restore authentication session.';
      })
      .addCase(updateTravellerProfile.pending, (state) => {
        state.profileUpdating = true;
        state.error = null;
      })
      .addCase(updateTravellerProfile.fulfilled, (state, action) => {
        state.profileUpdating = false;
        if (action.payload && isUserAuthenticated(state.user)) {
          state.user = normalizeAuthAccount(mergeTravellerProfileIntoAccount(state.user, action.payload));
        }
      })
      .addCase(updateTravellerProfile.rejected, (state, action) => {
        state.profileUpdating = false;
        state.error = action.payload || action.error?.message || 'Unable to update traveller profile.';
      })
      .addCase(logoutSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutSession.fulfilled, (state) => {
        state.user = GUEST;
        state.isAuthenticated = false;
        state.profileHydrated = true;
        state.sessionRestoring = false;
        state.profileUpdating = false;
        state.loading = false;
        state.error = null;
        state.resetLoading = false;
        state.resetMessage = null;
        state.resetError = null;
      })
      .addCase(logoutSession.rejected, (state, action) => {
        state.user = GUEST;
        state.isAuthenticated = false;
        state.profileHydrated = true;
        state.sessionRestoring = false;
        state.profileUpdating = false;
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Unable to complete logout cleanly.';
        state.resetLoading = false;
        state.resetMessage = null;
        state.resetError = null;
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.resetLoading = true;
        state.resetMessage = null;
        state.resetError = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.resetLoading = false;
        state.resetMessage =
          action.payload?.message ||
          'If your account exists, a password reset link has been sent to your email.';
        state.resetError = null;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.resetLoading = false;
        state.resetMessage = null;
        state.resetError =
          action.payload || action.error?.message || 'Unable to process password reset request.';
      })
      .addCase(confirmPasswordReset.pending, (state) => {
        state.resetLoading = true;
        state.resetMessage = null;
        state.resetError = null;
      })
      .addCase(confirmPasswordReset.fulfilled, (state, action) => {
        state.resetLoading = false;
        state.resetMessage =
          action.payload?.message || 'Password updated successfully! Redirecting to login...';
        state.resetError = null;
      })
      .addCase(confirmPasswordReset.rejected, (state, action) => {
        state.resetLoading = false;
        state.resetMessage = null;
        state.resetError =
          action.payload || action.error?.message || 'Unable to reset password. Please check your token.';
      })
      .addMatcher(
        (action) =>
          action.type === 'auth/login/pending' || action.type === 'auth/register/pending',
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) =>
          action.type === 'auth/login/fulfilled' ||
          action.type === 'auth/register/fulfilled' ||
          action.type === 'session/sessionStarted',
        (state, action) => {
          const normalized = normalizeAuthAccount(action.payload);
          state.loading = false;
          state.user = normalized;
          state.isAuthenticated = isUserAuthenticated(normalized);
          state.profileHydrated = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) =>
          action.type === 'auth/login/rejected' || action.type === 'auth/register/rejected',
        (state, action) => {
          state.loading = false;
          state.error = action.payload || action.error?.message || 'Authentication failed.';
        },
      )
      .addMatcher(
        (action) =>
          action.type === 'auth/logout/fulfilled' || action.type === 'session/sessionEnded',
        (state) => {
          state.user = GUEST;
          state.isAuthenticated = false;
          state.profileHydrated = true;
          state.sessionRestoring = false;
          state.profileUpdating = false;
          state.loading = false;
          state.error = null;
          state.resetLoading = false;
          state.resetMessage = null;
          state.resetError = null;
        },
      );
  },
});

export const {
  setAuthUser,
  hydrateSession,
  logoutUser,
  clearAuthError,
  clearResetFeedback,
} = authSlice.actions;

export const selectAuthUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectProfileHydrated = (state) => state.auth.profileHydrated;
export const selectSessionRestoring = (state) => state.auth.sessionRestoring;
export const selectAuthRole = (state) => (state.auth.isAuthenticated ? state.auth.user.role : null);
export const selectAuthRegion = (state) => {
  const user = state.auth.user;
  return user?.region ?? user?.location ?? user?.destination ?? null;
};
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectResetLoading = (state) => Boolean(state.auth?.resetLoading);
export const selectResetMessage = (state) => state.auth?.resetMessage || null;
export const selectResetError = (state) => state.auth?.resetError || null;
export const selectTravellerId = (state) => {
  const user = state.auth.user;
  if (!state.auth.isAuthenticated) return null;
  return user?.userId || user?.id || user?.username || null;
};

export default authSlice.reducer;
