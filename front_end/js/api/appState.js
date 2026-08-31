import { API_ENDPOINTS } from "./contracts.js";
import { apiGet, apiPatch } from "./http.js";

const REMOTE_STATE_KEYS = new Set([
    "users",
    "tours",
    "reviews",
    "experienceHome",
    "homeTestimonials",
    "experienceEarnings",
    "experienceBookings",
    "experienceCatalog",
    "experienceProfile",
    "hotelBookings",
    "hotelReviews",
    "hotelActivity",
    "hotelServices",
    "scheduleData",
    "profileData",
    "supportData",
    "techAdminData",
    "travelerWorkspaceSeed",
    "traveler_workspace_plans",
    "traveler_workspace_profile",
    "travelerData",
    "ntaPlans",
    "ntaActivity",
    "partnerPerformanceData",
    "opsData",
    "platformUsers",
    "partners"
    ,
    "flightsData",
    "financeChartData",
    "financeStats",
    "financePayoutData",
    "refunds",
    "ledger",
    "disputes"
]);

const stateCache = new Map();
const pendingWrites = new Map();

let bridgeInstalled = false;
let bootstrapPromise = null;

function normalizeStateValue(value) {
    return value === undefined ? null : value;
}

function serializeStateValue(value) {
    if (value === undefined) {
        return null;
    }

    return JSON.stringify(value);
}

function deserializeStateValue(value) {
    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return value;
    }
}

function queueStatePersist(key, value) {
    if (pendingWrites.has(key)) {
        clearTimeout(pendingWrites.get(key));
    }

    const timeoutId = setTimeout(async () => {
        pendingWrites.delete(key);

        if (!API_ENDPOINTS.appState) {
            // Backend endpoint not mapped yet; skip sync to avoid 404
            return;
        }

        try {
            await apiPatch(`${API_ENDPOINTS.appState}/${encodeURIComponent(key)}`, {
                value: normalizeStateValue(value)
            });
        } catch (error) {
            console.error(`Failed to persist app-state key "${key}"`, error);
        }
    }, 0);

    pendingWrites.set(key, timeoutId);
}

export function installRemoteStorageBridge() {
    if (bridgeInstalled || typeof window === "undefined" || typeof Storage === "undefined") {
        return;
    }

    bridgeInstalled = true;

    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    Storage.prototype.getItem = function getItem(key) {
        if (this === window.localStorage && REMOTE_STATE_KEYS.has(key)) {
            return stateCache.has(key) ? serializeStateValue(stateCache.get(key)) : null;
        }

        return originalGetItem.call(this, key);
    };

    Storage.prototype.setItem = function setItem(key, value) {
        if (this === window.localStorage && REMOTE_STATE_KEYS.has(key)) {
            const parsedValue = deserializeStateValue(value);
            stateCache.set(key, parsedValue);
            queueStatePersist(key, parsedValue);
            return;
        }

        return originalSetItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function removeItem(key) {
        if (this === window.localStorage && REMOTE_STATE_KEYS.has(key)) {
            stateCache.delete(key);
            queueStatePersist(key, null);
            return;
        }

        return originalRemoveItem.call(this, key);
    };
}

export async function bootstrapAppState() {
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            const payload = await apiGet(API_ENDPOINTS.appStateBootstrap);
            const entries = Object.entries(payload || {});

            entries.forEach(([key, value]) => {
                stateCache.set(key, value);
                REMOTE_STATE_KEYS.add(key);
            });
        })();
    }

    return bootstrapPromise;
}

export function getAppStateValue(key, fallback = null) {
    return stateCache.has(key) ? stateCache.get(key) : fallback;
}

installRemoteStorageBridge();
