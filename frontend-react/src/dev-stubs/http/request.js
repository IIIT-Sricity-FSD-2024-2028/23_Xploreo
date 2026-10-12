// TEMP-STUB: stands in for M1's services/api.js request().
//   request('/experiences', { method: 'PATCH', body, params }) -> parsed JSON, or throws ApiError
// Mocked routes (VITE_MOCKS) are answered locally; everything else goes to the real API.
import { dispatchMock } from '../mock/registry.js';
import { identityHeaders } from '../auth/session.js';
import { ApiError } from './ApiError.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    res = await fetch(`${API_URL}${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw ApiError.fromResponse(res.status, data);
  return data;
}
