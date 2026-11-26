import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@/store/sessionSlice.js';
import { registerAccount, signIn, signOut } from '@/store/sessionThunks.js';

export function useAuth() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const login = useCallback((values) => dispatch(signIn(values)), [dispatch]);
  const register = useCallback((values) => dispatch(registerAccount(values)), [dispatch]);
  const logout = useCallback(() => dispatch(signOut()), [dispatch]);

  return useMemo(() => {
    const isAuthenticated = Boolean(user.role && user.role !== 'default');
    return {
      user,
      role: isAuthenticated ? user.role : null,
      region: user.region ?? user.location ?? user.destination ?? null,
      isAuthenticated,
      login,
      register,
      logout,
    };
  }, [user, login, register, logout]);
}
