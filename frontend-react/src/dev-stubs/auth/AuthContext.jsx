// TEMP-STUB: same useAuth() shape the plan promises, backed by a dev-user switcher.
//
//   useAuth() -> {
//     user: { id, name, email, phone, businessName, role: 'partner', partnerType, region } | null,
//     role: 'partner' | null,
//     region: string | null,
//     isAuthenticated: boolean,
//     loginAs(id), logout()          <- dev-only extras, pages must not use them
//   }
//
// Region and role are derived from the "token" (the dev identity), never from forms.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getIdentity, storeIdentity } from './session.js';

const AuthContext = createContext(null);

function toUser(identity) {
  return { ...identity, role: 'partner' };
}

export function AuthProvider({ children }) {
  const [identity, setIdentity] = useState(() => getIdentity());

  const loginAs = useCallback((id) => {
    storeIdentity(id);
    setIdentity(getIdentity());
  }, []);

  const logout = useCallback(() => {
    storeIdentity('none');
    setIdentity(null);
  }, []);

  const value = useMemo(
    () => ({
      user: identity ? toUser(identity) : null,
      role: identity ? 'partner' : null,
      region: identity ? identity.region : null,
      isAuthenticated: Boolean(identity),
      loginAs,
      logout,
    }),
    [identity, loginAs, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}
