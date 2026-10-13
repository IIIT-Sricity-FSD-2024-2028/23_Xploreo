const API_BASE_URL =
  (typeof globalThis.process !== 'undefined' && globalThis.process.env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:3000/api';

/**
 * Retrieves the currently saved user from localStorage.
 * Login responses store `result.user` under the `xploreoUser` key.
 *
 * @returns {object|null} The parsed user object, or null if absent/invalid.
 */
export function getSavedUser() {
  if (typeof globalThis.localStorage === 'undefined') return null;
  try {
    const raw = globalThis.localStorage.getItem('xploreoUser');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Normalizes API path against API_BASE_URL, preventing duplicated `/api` segments.
 *
 * @param {string} path - URL path (e.g. '/auth/login', 'hotels', '/api/trips')
 * @returns {string} Fully resolved URL.
 */
function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${base}${cleanPath.slice(4)}`;
  }
  return `${base}${cleanPath}`;
}

/**
 * Centralized API request helper adhering to NestJS backend conventions.
 *
 * Features:
 * - Unwraps backend `{ success: true, data: T, timestamp }` response envelopes.
 * - Parses class-validator array or string errors from backend `{ success: false, message }`.
 * - Injects `x-user-id` and `x-user-role` headers for authenticated endpoints.
 * - Enforces explicit `auth: false` for public endpoints. Protected requests reject missing/malformed identity.
 * - Extracts `auth` so internal options are not forwarded to native `fetch()`.
 *
 * @param {string} path - Endpoint path.
 * @param {object} [options={}] - Fetch options plus internal `auth` flag.
 * @returns {Promise<any>} Unwrapped payload data.
 */
export async function apiRequest(path, options = {}) {
  const { auth = true, headers: customHeaders = {}, ...fetchOptions } = options;

  const headers = { ...customHeaders };

  // Determine auth requirement
  if (auth) {
    const user = getSavedUser();
    const userId = user?.userId ?? user?.id;
    const role = user?.role;

    if (
      !user ||
      userId == null ||
      String(userId).trim() === '' ||
      !role ||
      typeof role !== 'string' ||
      role.trim() === ''
    ) {
      throw new Error('Authentication required. Missing or invalid saved session.');
    }

    // Attach headers without overwriting explicitly supplied headers
    if (!headers['x-user-id'] && !headers['X-User-Id']) {
      headers['x-user-id'] = String(userId).trim();
    }
    if (!headers['x-user-role'] && !headers['X-User-Role']) {
      headers['x-user-role'] = String(role).trim().toLowerCase();
    }
  }

  // Default Content-Type to application/json when sending standard payload
  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === 'content-type'
  );
  if (!hasContentType && !(fetchOptions.body instanceof (globalThis.FormData || class {}))) {
    headers['Content-Type'] = 'application/json';
  }

  const url = buildUrl(path);
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  const contentType = response.headers?.get?.('content-type') || '';
  let payload;
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.message)) {
        message = payload.message[0];
      } else if (payload.message) {
        message = payload.message;
      }
    } else if (typeof payload === 'string' && payload.trim() !== '') {
      message = payload;
    }
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

export const authApi = {
  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      auth: false,
    }),
  register: (details) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(details),
      auth: false,
    }),
};

export { API_BASE_URL };
