export const GUEST = { username: 'Guest', role: 'default' };
const STORAGE_KEY = 'xploreo_session';
let readUser = () => GUEST;
let token = null;
let onUnauthorized = null;

function isTokenExpired(jwtToken) {
  if (!jwtToken || typeof jwtToken !== 'string') return false;
  const parts = jwtToken.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000 <= Date.now();
    }
    return false;
  } catch {
    return true;
  }
}

export function loadPersistedSession() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { user: GUEST, token: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: GUEST, token: null };
    const parsed = JSON.parse(raw);
    if (!parsed?.user || !parsed.user.role || parsed.user.role === 'default') {
      return { user: GUEST, token: null };
    }
    if (parsed.token && isTokenExpired(parsed.token)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return { user: GUEST, token: null };
    }
    token = parsed.token || null;
    return { user: parsed.user, token };
  } catch {
    return { user: GUEST, token: null };
  }
}

export function persistSession(user, authToken) {
  token = authToken || null;
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (user && user.role && user.role !== 'default') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function clearPersistedSession() {
  token = null;
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('xploreoUser');
    window.localStorage.removeItem('currentUser');
    window.localStorage.removeItem('xploreoToken');
  } catch {
    // Ignore storage errors
  }
}

export function bindSession(reader) {
  readUser = reader;
}

export function bindUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === 'function' ? handler : null;
}

export function notifyUnauthorized() {
  if (onUnauthorized) onUnauthorized();
}

export function setSessionToken(value) {
  token = value || null;
}

export const getUser = () => readUser();
export const getToken = () => token;

// The bearer token authorizes API requests. Mock Kit also reads the identity headers.
export function identityHeaders() {
  const user = getUser();
  const role = user.role || user.userRole || user.partnerType;
  if (!role || role === 'default') return {};
  const userId = user.userId || user.id || user.username;
  const location = user.region || user.location;
  return {
    'x-user-role': role,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(userId && { 'x-user-id': String(userId) }),
    ...(location && { 'x-user-location': location }),
  };
}
