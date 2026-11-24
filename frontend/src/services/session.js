// AuthContext and API requests share the active account for this tab. The remembered
// account is only used when a tab has no session of its own yet.
const KEY = 'xploreoUser';
export const GUEST = { username: 'Guest', role: 'default' };
let activeUser;

function readRememberedUser() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('currentUser');
    if (!raw) return GUEST;
    const stored = JSON.parse(raw);
    const user = stored?.user || stored;
    if (!user) return GUEST;
    const token = user.token || stored.token || localStorage.getItem('xploreoToken');
    return token ? { ...user, token } : user;
  } catch {
    return GUEST;
  }
}

function setTabUser(user) {
  activeUser = user;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // Keep the account in memory if tab storage is unavailable.
  }
}

export function getUser() {
  if (activeUser) return activeUser;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) activeUser = JSON.parse(raw);
  } catch {
    // Fall back to the remembered account.
  }
  if (!activeUser) setTabUser(readRememberedUser());
  return activeUser;
}

export function storeUser(user) {
  setTabUser(user);
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
    localStorage.removeItem('xploreoToken');
  } catch {
    /* storage unavailable */
  }
}

export function clearUser() {
  const user = getUser();
  const remembered = readRememberedUser();
  setTabUser(GUEST);
  if (user.role !== remembered.role || accountId(user) !== accountId(remembered)) return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('xploreoToken');
  } catch {
    /* storage unavailable */
  }
}

export function getToken() {
  return getUser().token || null;
}

const accountId = (user) => user.userId || user.id || user.username;

// The server authorizes the bearer token. The headers also identify the account to Mock Kit.
export function identityHeaders() {
  const user = getUser();
  const role = user?.role || user?.userRole || user?.partnerType;
  if (!user || !role || role === 'default') return {};
  const userId = accountId(user);
  const token = user.token;

  const headers = {
    'x-user-role': role,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  const location = user.region || user.location;
  if (location) headers['x-user-location'] = location;
  return headers;
}
