import { API_SESSION_KEY } from "./contracts.js";

export function getApiBaseUrl() {
    return (
        window.__XPLOREO_API_BASE__ ||
        localStorage.getItem("xploreo_api_base_url") ||
        "http://localhost:3000/api"
    ).replace(/\/$/, "");
}

export function getApiSession() {
    try {
        return JSON.parse(localStorage.getItem(API_SESSION_KEY) || "null");
    } catch (error) {
        return null;
    }
}

export function storeApiSession(session) {
    localStorage.setItem(API_SESSION_KEY, JSON.stringify(session));
}

export function clearApiSession() {
    localStorage.removeItem(API_SESSION_KEY);
}

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch (error) {
        return null;
    }
}

export function storeCurrentUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
}

export function toFrontendUser(apiUser) {
    const existingUsers = readJson("users", []);
    const existing = existingUsers.find((user) =>
        String(user.id) === String(apiUser.id) ||
        String(user.username).toLowerCase() === String(apiUser.username).toLowerCase()
    );

    return {
        ...(existing || {}),
        id: apiUser.id,
        userId: apiUser.id,
        username: apiUser.username,
        name: apiUser.name,
        email: apiUser.email,
        phone: apiUser.phone,
        phno: apiUser.phone,
        role: apiUser.role,
        location: apiUser.location || (existing && existing.location) || undefined,
        status: apiUser.status || "active"
    };
}

export function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
        return fallback;
    }
}
