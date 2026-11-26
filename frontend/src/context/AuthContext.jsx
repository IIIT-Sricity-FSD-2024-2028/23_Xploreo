import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAuthError,
  loginThunk,
  logoutThunk,
  registerThunk,
  selectAuthError,
  selectAuthLoading,
  selectAuthRegion,
  selectAuthRole,
  selectAuthUser,
  selectIsAuthenticated,
} from '@/store/auth/index.js';

export function useAuth() {
  const user = useSelector(selectAuthUser);
  const role = useSelector(selectAuthRole);
  const region = useSelector(selectAuthRegion);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const dispatch = useDispatch();

  const login = useCallback((values) => dispatch(loginThunk(values)).unwrap(), [dispatch]);
  const register = useCallback((values) => dispatch(registerThunk(values)).unwrap(), [dispatch]);
  const logout = useCallback(() => dispatch(logoutThunk()), [dispatch]);
  const clearError = useCallback(() => dispatch(clearAuthError()), [dispatch]);

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
      logout,
      clearError,
    }),
    [user, role, region, isAuthenticated, loading, error, login, register, logout, clearError]
  );
}
