// The real session: who is signed in, and the role/region guards and portal pages read.
// Backed by Redux authSlice so all roles and Traveller pages share one authoritative session state.
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser, storeUser } from '@/services/session.js';
import {
  logoutUser,
  selectAuthRegion,
  selectAuthRole,
  selectAuthUser,
  selectIsAuthenticated,
  setAuthUser,
} from '@/features/authSlice.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const role = useSelector(selectAuthRole);
  const region = useSelector(selectAuthRegion);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const authenticate = useCallback((account) => {
    storeUser(account);
    dispatch(setAuthUser(account));
  }, [dispatch]);

  const logout = useCallback(() => {
    clearUser();
    dispatch(logoutUser());
  }, [dispatch]);

  const value = useMemo(() => ({
    user,
    role,
    region,
    isAuthenticated,
    authenticate,
    logout,
  }), [user, role, region, isAuthenticated, authenticate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}
