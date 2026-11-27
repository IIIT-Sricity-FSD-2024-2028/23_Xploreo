// The real session: who is signed in, and what role/region guards and portal pages read.
// Backed by Redux authSlice so all roles (Traveller, Hotel, Guide, Experience, Admin) share one authoritative session state.
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { storeUser } from '@/services/session.js';
import {
  clearAuthError,
  loginUser,
  logoutSession,
  registerUser,
  restoreAuthSession,
  selectAuthError,
  selectAuthLoading,
  selectAuthRegion,
  selectAuthRole,
  selectAuthUser,
  selectIsAuthenticated,
  selectProfileHydrated,
  setAuthUser,
} from '@/features/authSlice.js';

const AuthContext = createContext(null);

function useReduxAuth() {
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const role = useSelector(selectAuthRole);
  const region = useSelector(selectAuthRegion);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const login = useCallback((values) => dispatch(loginUser(values)).unwrap(), [dispatch]);
  const register = useCallback((values) => dispatch(registerUser(values)).unwrap(), [dispatch]);
  const clearError = useCallback(() => dispatch(clearAuthError()), [dispatch]);

  const authenticate = useCallback((account) => {
    storeUser(account);
    dispatch(setAuthUser(account));
  }, [dispatch]);

  const logout = useCallback(() => dispatch(logoutSession()), [dispatch]);

  return useMemo(
    () => ({
      user,
      role,
      region,
      isAuthenticated,
      loading,
      error,
      login,
      register,
      authenticate,
      logout,
      clearError,
    }),
    [user, role, region, isAuthenticated, loading, error, login, register, authenticate, logout, clearError],
  );
}

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const value = useReduxAuth();
  const profileHydrated = useSelector(selectProfileHydrated);

  useEffect(() => {
    if (value.isAuthenticated && !profileHydrated && value.user?.token) {
      dispatch(restoreAuthSession());
    }
  }, [dispatch, value.isAuthenticated, profileHydrated, value.user?.token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  const fallback = useReduxAuth();
  return ctx || fallback;
}
