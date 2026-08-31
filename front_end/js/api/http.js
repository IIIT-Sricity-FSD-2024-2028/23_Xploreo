import { getApiBaseUrl, getApiSession } from "./session.js";

async function request(path, options = {}) {
    const session = getApiSession();
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    // Send the JWT Bearer token for all authenticated requests
    if (session?.token) {
        headers["Authorization"] = `Bearer ${session.token}`;
    }

    // Also send x-user-id and x-user-role for RBAC guards
    if (session?.headers?.["x-user-id"]) {
        headers["x-user-id"] = session.headers["x-user-id"];
    }
    if (session?.headers?.["x-user-role"]) {
        headers["x-user-role"] = session.headers["x-user-role"];
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
