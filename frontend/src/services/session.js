// AuthContext and API requests share the minimal session credentials for this tab.
// Browser storage persists ONLY authentication token/session metadata — never complete
// user profile objects or application/domain data.
const AUTH_SESSION_KEY = 'xploreoAuthSession';
const LEGACY_KEYS = ['xploreoUser', 'currentUser', 'xploreoToken', 'xploreo_session'];

export const GUEST = { username: 'Guest', role: 'default' };
let activeUser;
let sessionToken = null;
let readUser = null;
let onUnauthorized = null;

export function decodeTokenClaims(token) {
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

function isTokenExpired(token) {
  const claims = decodeTokenClaims(token);
  return Boolean(claims && typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now());
}

const accountId = (user) => user?.userId || user?.id || user?.username;

/**
 * Strips complete profile/domain attributes so browser storage retains ONLY the
 * authentication token and minimum session metadata needed to preserve the session.
 */
export function sanitizeSessionCredentials(account, fallbackToken = null) {
  if (!account || account.role === 'default') return GUEST;

  const unwrapped = account?.user || account;
  const token = unwrapped?.token || account?.token || fallbackToken || null;
  if (token && isTokenExpired(token)) return GUEST;

  const claims = decodeTokenClaims(token);
  const role = unwrapped?.role || unwrapped?.userRole || unwrapped?.partnerType || claims?.role;
  if (!role || role === 'default') return GUEST;

  const userId = unwrapped?.userId ?? unwrapped?.id ?? claims?.userId ?? unwrapped?.username;
  const username = unwrapped?.username ?? claims?.username ?? (userId != null ? String(userId) : undefined);

  const session = {
    role: String(role),
  };
  if (token) session.token = String(token);
  if (userId != null && userId !== '') session.userId = String(userId);
  if (username != null && username !== '') session.username = String(username);

  // Preserve region claim only for partner/admin RBAC scoping; avoid storing Traveller profile/location fields.
  const rbacRegion = String(role) !== 'traveller' ? (unwrapped?.region || claims?.region) : null;
  if (rbacRegion) session.region = String(rbacRegion);

  return session;
}

function purgeLegacyKeys(storage) {
  try {
    LEGACY_KEYS.forEach((legacyKey) => storage?.removeItem(legacyKey));
  } catch {
    /* storage unavailable */
  }
}

function readRawSessionFromStorage(storage) {
  try {
    const raw = storage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const sanitized = sanitizeSessionCredentials(JSON.parse(raw));
      if (sanitized.role === 'default') {
        storage.removeItem(AUTH_SESSION_KEY);
        return null;
      }
      return sanitized;
    }

    // One-time migration: extract only minimal auth credentials if legacy keys exist, then purge them.
    const legacyRaw = storage.getItem('xploreoUser') || storage.getItem('currentUser');
    const legacyToken = storage.getItem('xploreoToken');
    const legacySessionRaw = storage.getItem('xploreo_session');
    if (legacyRaw || legacyToken || legacySessionRaw) {
      const parsed = legacyRaw
        ? JSON.parse(legacyRaw)
        : (legacySessionRaw ? JSON.parse(legacySessionRaw) : {});
      const sanitized = sanitizeSessionCredentials(parsed, legacyToken || parsed?.token || null);
      purgeLegacyKeys(storage);
      if (sanitized.role !== 'default') {
        storage.setItem(AUTH_SESSION_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
      storage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

function readRememberedUser() {
  if (typeof localStorage === 'undefined') return GUEST;
  const remembered = readRawSessionFromStorage(localStorage);
  return remembered || GUEST;
}

function setTabUser(user) {
  const sanitized = sanitizeSessionCredentials(user);
  activeUser = sanitized;
  sessionToken = sanitized.token || null;
  if (typeof sessionStorage === 'undefined') return;
  try {
    purgeLegacyKeys(sessionStorage);
    // Guest state is derived in Redux/memory only — never persist a GUEST placeholder in browser storage.
    if (sanitized.role === 'default') {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // Keep minimal session in memory if tab storage is unavailable.
  }
}

function readStoredUser() {
  if (activeUser) {
    if (activeUser.token && isTokenExpired(activeUser.token)) {
      clearUser();
      return GUEST;
    }
    return activeUser;
  }

  if (typeof sessionStorage !== 'undefined') {
    const tabSession = readRawSessionFromStorage(sessionStorage);
    if (tabSession) {
      activeUser = tabSession;
      sessionToken = tabSession.token || null;
      return activeUser;
    }
  }

  const remembered = readRememberedUser();
  setTabUser(remembered);
  return activeUser;
}

export function bindSession(reader) {
  readUser = typeof reader === 'function' ? reader : null;
}

export function bindUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === 'function' ? handler : null;
}

export function notifyUnauthorized() {
  if (onUnauthorized) onUnauthorized();
}

export function setSessionToken(value) {
  sessionToken = value || null;
}

export function getUser() {
  if (readUser) {
    const bound = readUser();
    if (!bound || !bound.role || bound.role === 'default') {
      return GUEST;
    }
    const boundToken = bound.token || sessionToken;
    if (boundToken && isTokenExpired(boundToken)) {
      clearUser();
      notifyUnauthorized();
      return GUEST;
    }
    return bound;
  }
  return readStoredUser();
}

export function storeUser(user, fallbackToken = null) {
  const sanitized = sanitizeSessionCredentials(user, fallbackToken);
  setTabUser(sanitized);
  if (typeof localStorage === 'undefined') return;
  try {
    purgeLegacyKeys(localStorage);
    if (sanitized.role === 'default') {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } else {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sanitized));
    }
  } catch {
    /* storage unavailable */
  }
}

export function clearUser() {
  const user = getUser();
  const remembered = readRememberedUser();
  const sameRememberedAccount =
    remembered.role === 'default' ||
    (user.role === remembered.role && accountId(user) === accountId(remembered));

  if (sameRememberedAccount && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      purgeLegacyKeys(localStorage);
    } catch {
      /* storage unavailable */
    }
  }

  setTabUser(GUEST);
}

export function loadPersistedSession() {
  const user = readStoredUser();
  return { user, token: user?.token || sessionToken || null };
}

export function persistSession(user, authToken) {
  storeUser(user, authToken);
}

export function clearPersistedSession() {
  clearUser();
}

export function getToken() {
  const user = getUser();
  if (!user || !user.role || user.role === 'default') return null;
  return user.token || sessionToken || null;
}

// The server authorizes the bearer token. The headers also identify the account to Mock Kit.
export function identityHeaders() {
  const user = getUser();
  const role = user?.role || user?.userRole || user?.partnerType;
  if (!user || !role || role === 'default') return {};
  const userId = accountId(user);
  const authToken = getToken();

  const headers = {
    'x-user-role': role,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  const location = user.region || user.location;
  if (location) headers['x-user-location'] = location;
  return headers;
}
