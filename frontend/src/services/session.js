export const GUEST = { username: 'Guest', role: 'default' };
let readUser = () => GUEST;
let token = null;

export function bindSession(reader) {
  readUser = reader;
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
