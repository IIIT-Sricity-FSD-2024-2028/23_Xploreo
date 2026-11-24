/* ================================================================
   api.js — Central API Client Helper with LocalStorage Sync
   Targeting NestJS backend on http://localhost:3000/api
================================================================ */

export const API_BASE_URL = "http://localhost:3000/api";

/**
 * Helper to retrieve active user credentials from localStorage
 * and format them into NestJS AuthGuard headers.
 */
export function getAuthHeaders() {
    const userId   = localStorage.getItem("userID")   || "";
    const userRole = localStorage.getItem("userRole") || "";
    
    const headers = {
        "Content-Type": "application/json"
    };

    if (userId)   headers["x-user-id"]   = userId;
    if (userRole) headers["x-user-role"] = userRole;

    return headers;
}

/**
 * Universal wrapper around window.fetch
 * 
 * @param {string} endpoint - API path (e.g. "/trips" or "/auth/login")
 * @param {object} options  - fetch configuration (method, body, headers, etc.)
 */
export async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const config = {
        method: options.method || "GET",
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        },
        ...options
    };

    if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data     = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = data.message || `API Error (${response.status})`;
            return { success: false, error: errorMsg, status: response.status, data };
        }

        return { success: true, data, status: response.status };
    } catch (err) {
        console.error(`[API Fetch Error] ${config.method} ${endpoint}:`, err);
        return { success: false, error: err.message };
    }
}

/**
 * GET request with automatic LocalStorage synchronization
 */
export async function apiGetAndSync(endpoint, storageKey, fallbackValue = []) {
    const res = await apiFetch(endpoint, { method: "GET" });
    if (res.success && res.data) {
        const resultData = res.data.data !== undefined ? res.data.data : res.data;

        const resultArray = Array.isArray(resultData)
            ? resultData
            : [resultData];

        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(resultArray));
        }
        return resultArray;
    }
    // Fallback to local storage if request fails or server is offline
if (storageKey) {
        try {
            const raw = localStorage.getItem(storageKey);

            if (raw !== null) {
                const parsed = JSON.parse(raw);

                return Array.isArray(parsed)
                    ? parsed
                    : [parsed];
            }

            return fallbackValue;
        } catch {
            return fallbackValue;
        }
    }
    return fallbackValue;
}

/**
 * POST request with LocalStorage synchronization
 */
export async function apiPostAndSync(endpoint, body, storageKey) {
    const res = await apiFetch(endpoint, { method: "POST", body });
    if (res.success && res.data) {
        const newItem = res.data.data !== undefined ? res.data.data : res.data;
        if (storageKey) {
            let currentList = [];
            try {
                currentList = JSON.parse(localStorage.getItem(storageKey) || "[]");
                if (!Array.isArray(currentList)) currentList = [];
            } catch {
                currentList = [];
            }
            currentList.push(newItem);
            localStorage.setItem(storageKey, JSON.stringify(currentList));
        }
        return { success: true, data: newItem };
    }
    return { success: false, error: res.error || "Failed to create resource" };
}

/**
 * PATCH request with LocalStorage synchronization
 */
export async function apiPatchAndSync(endpoint, body, storageKey, idField = "id") {
    const res = await apiFetch(endpoint, { method: "PATCH", body });
    if (res.success && res.data) {
        const updatedItem = res.data.data !== undefined ? res.data.data : res.data;
        if (storageKey && updatedItem && updatedItem[idField]) {
            try {
                let currentList = JSON.parse(localStorage.getItem(storageKey) || "[]");
                if (Array.isArray(currentList)) {
                    const idx = currentList.findIndex(item => item[idField] == updatedItem[idField]);
                    if (idx !== -1) {
                        currentList[idx] = { ...currentList[idx], ...updatedItem };
                        localStorage.setItem(storageKey, JSON.stringify(currentList));
                    }
                }
            } catch {
                // ignore storage parse errors
            }
        }
        return { success: true, data: updatedItem };
    }
    return { success: false, error: res.error || "Failed to update resource" };
}

/**
 * DELETE request with LocalStorage synchronization
 */
export async function apiDeleteAndSync(endpoint, storageKey, itemId, idField = "id") {
    const res = await apiFetch(endpoint, { method: "DELETE" });
    if (res.success) {
        if (storageKey && itemId) {
            try {
                let currentList = JSON.parse(localStorage.getItem(storageKey) || "[]");
                if (Array.isArray(currentList)) {
                    currentList = currentList.filter(item => item[idField] != itemId);
                    localStorage.setItem(storageKey, JSON.stringify(currentList));
                }
            } catch {
                // ignore
            }
        }
        return { success: true };
    }
    return { success: false, error: res.error || "Failed to delete resource" };
}

/**
 * Convenience Shortcuts
 */
export const apiGet    = (endpoint) => apiFetch(endpoint, { method: "GET" });
export const apiPost   = (endpoint, body) => apiFetch(endpoint, { method: "POST", body });
export const apiPatch  = (endpoint, body) => apiFetch(endpoint, { method: "PATCH", body });
export const apiDelete = (endpoint) => apiFetch(endpoint, { method: "DELETE" });
