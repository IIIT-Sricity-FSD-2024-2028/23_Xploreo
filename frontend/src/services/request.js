// The shared HTTP client every domain service calls through.
//   request('/plans', { method: 'PATCH', body, params }) -> parsed JSON, or throws ApiError
// Routes registered with the Mock Kit (VITE_MOCKS) are answered locally; everything else goes
// to the real backend.
import { dispatchMock } from '@/lib/mockKit/registry.js';
import { getToken, identityHeaders, notifyUnauthorized } from './session.js';
import { ApiError } from './ApiError.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function buildQuery(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
}

export async function request(path, { method = 'GET', body, params } = {}) {
  const headers = { Accept: 'application/json', ...identityHeaders() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const url = `${path}${buildQuery(params)}`;

  const mocked = await dispatchMock(method, url, { body, headers });
  if (mocked.handled) return mocked.data;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0);
  }

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!res.ok) {
    if (res.status === 401 && getToken() && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      notifyUnauthorized();
    }
    throw ApiError.fromResponse(res.status, payload);
  }
  return payload?.data ?? payload;
}
