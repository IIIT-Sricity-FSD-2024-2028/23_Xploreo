import { identityHeaders } from "./session.js";
import { dispatchMock } from "@/lib/mockKit/registry.js";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    ...identityHeaders(),
    ...options.headers,
  };
  if (!(options.body instanceof FormData) && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  let body;
  try {
    body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  } catch {
    body = options.body;
  }

  // If MockKit has registered mock interceptors (VITE_MOCKS enabled), route locally
  const mocked = await dispatchMock(method, path, { body, headers });
  if (mocked.handled) {
    return mocked.data;
  }


  

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message || "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return payload.data ?? payload;
}

export const authApi = {
  login: (credentials) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  register: (details) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(details) }),
  requestPasswordReset: (details) => apiRequest("/auth/password-reset/request", { method: "POST", body: JSON.stringify(details) }),
  confirmPasswordReset: (details) => apiRequest("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify(details) }),
};

export async function fetchData(url, options = {}) {
  const headers = {
    ...identityHeaders(),
    ...options.headers,
  };
  if (!(options.body instanceof FormData) && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = Array.isArray(payload.message)
      ? payload.message[0]
      : payload.message || `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }

  const json = await response.json();
  return json?.data !== undefined ? json.data : json;
}

export function getSavedUser() {
  try {
    const raw = localStorage.getItem("xploreoUser") || localStorage.getItem("currentUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user || parsed;
  } catch {
    return null;
  }
}

export { API_BASE_URL, identityHeaders };

