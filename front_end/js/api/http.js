import { getApiBaseUrl, getApiSession, getCurrentUser } from "./session.js";

async function request(path, options = {}) {
    const session = getApiSession();
    const currentUser = getCurrentUser();
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    // Send the JWT Bearer token for all authenticated requests
    if (session?.token) {
        headers["Authorization"] = `Bearer ${session.token}`;
    }

    // Also send x-user-id, x-user-role, and x-user-location for RBAC/Location guards
    const userId = session?.headers?.["x-user-id"] || session?.user?.userId || session?.user?.id || currentUser?.userId || currentUser?.id;
    const userRole = session?.headers?.["x-user-role"] || session?.user?.role || currentUser?.role;
    const userLocation = session?.headers?.["x-user-location"] || session?.user?.location || currentUser?.location;

    if (userId) {
        headers["x-user-id"] = String(userId);
    }
    if (userRole) {
        headers["x-user-role"] = String(userRole);
    }
    if (userLocation) {
        headers["x-user-location"] = String(userLocation);
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...options,
        headers
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = payload?.message || payload?.error || "Request failed";
        throw new Error(Array.isArray(message) ? message.join(", ") : message);
    }

    return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}

export function apiGet(path) {
    return request(path, { cache: "no-store" });
}

export function apiPost(path, body) {
    return request(path, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

export function apiPatch(path, body) {
    return request(path, {
        method: "PATCH",
        body: JSON.stringify(body)
    });
}

export function apiPut(path, body) {
    return request(path, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

export function apiDelete(path) {
    return request(path, {
        method: "DELETE"
    });
}
