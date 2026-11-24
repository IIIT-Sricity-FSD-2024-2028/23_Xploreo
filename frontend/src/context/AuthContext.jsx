// The real session: who is signed in, and the role/region guards and portal pages read.
// Pages and API requests read the account from the same tab session.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { GUEST, clearUser, getUser, storeUser } from '@/services/session.js';

const AuthContext = createContext(null);

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

// Ported pages (Guide/Experience/Partner) read user.id and user.partnerType; the rest of the
// app reads user.userId/username and user.role. Both names point at the same account.
function normalize(account) {
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => normalize(getUser()));

  const authenticate = useCallback((account) => {
    storeUser(account);
    setUser(normalize(account));
  }, []);

  const logout = useCallback(() => {
    clearUser();
    setUser(GUEST);
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = Boolean(user && user.role && user.role !== 'default');
    return {
      user,
      role: isAuthenticated ? user.role : null,
      region: user?.region ?? user?.location ?? user?.destination ?? null,
      isAuthenticated,
      authenticate,
      logout,
    };
  }, [user, authenticate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}
