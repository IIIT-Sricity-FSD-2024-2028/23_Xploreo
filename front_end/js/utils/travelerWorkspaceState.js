import { apiGetAndSync, apiFetch } from "./api.js";

const travelerWorkspaceSeed = (() => { try { return JSON.parse(localStorage.getItem("travelerWorkspaceSeed") || "{}"); } catch { return {}; } })();

const STORAGE_KEYS = {
    plans: "traveler_workspace_plans",
    bookings: "tours", // Points to the unified tours data
    profile: "traveler_workspace_profile",
    selectedBookingId: "traveler_selected_booking_id",
    lastTransport: "traveler_last_transport",
    travellerRole: "traveler_active_role"
};

function clone(value) {
    if (value === undefined || value === null) {
        return value;
    }
    return JSON.parse(JSON.stringify(value));
}

function getTravelerProfilePreset(user) {
    
    const fallback = clone(travelerWorkspaceSeed.profile);

    if (!user) {
        return fallback;
    }

    fallback.fullName = user.name || fallback.fullName;
    fallback.email = user.email || fallback.email;
    fallback.phone = user.phone || (user.phno ? `+91 ${user.phno}` : fallback.phone);
    fallback.location = user.address || fallback.location;
    fallback.gender = user.gender ? `${user.gender}`.charAt(0).toUpperCase() + `${user.gender}`.slice(1) : fallback.gender;
    fallback.dob = user.dob ? new Date(user.dob).toISOString().split("T")[0] : fallback.dob;

    return fallback;
}

export async function ensureTravelerSession() {
    let currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser || !currentUser.role) {
        // Try to get from API, fall back to localStorage users
        const users = await apiGetAndSync("/auth/users", "users", []);
        currentUser = (Array.isArray(users) ? users : []).find((user) => user.role === "traveller") || {
            id: "traveller-fallback",
            name: "Alex Rivera",
            email: "alex@gmail.com",
            username: "alex_r",
            role: "traveller"
        };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }

    if (!localStorage.getItem(STORAGE_KEYS.travellerRole)) {
        localStorage.setItem(STORAGE_KEYS.travellerRole, currentUser.role);
    }

    return currentUser;
}

export function isTravellerRole(user) {
    return user && user.role === "traveller";
}

export async function seedTravelerWorkspace() {
    const currentUser = await ensureTravelerSession();

    if (!localStorage.getItem(STORAGE_KEYS.plans)) {
        localStorage.setItem(STORAGE_KEYS.plans, JSON.stringify(clone(travelerWorkspaceSeed.plans)));
    }

    // Bookings are now seeded via app.js initializeData into "tours"

    const storedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.profile) || "null");
    const nextProfile = getTravelerProfilePreset(currentUser);
    const hasLegacyDefaultProfile = storedProfile
        && storedProfile.fullName === travelerWorkspaceSeed.profile.fullName
        && storedProfile.email === travelerWorkspaceSeed.profile.email;

    if (!storedProfile || hasLegacyDefaultProfile) {
        localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(nextProfile));
    }
}

export function getTravelerPlans() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.plans) || "[]");
}

export function saveTravelerPlans(plans) {
    localStorage.setItem(STORAGE_KEYS.plans, JSON.stringify(plans));
}

export async function getTravelerBookings() {
    const allTours = await apiGetAndSync("/trips", "tours", []);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    
    if (!currentUser) return [];
    
    // Filter tours where this user is the customer
    return allTours.filter(t => String(t.customerId) === String(currentUser.id));
}

export function saveTravelerBookings(updatedTravelerBookings) {
    const allTours = JSON.parse(localStorage.getItem("tours") || "[]");
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    
    if (!currentUser) return;

    // Merge updated bookings back into global list
    const otherUserTours = allTours.filter(t => String(t.customerId) !== String(currentUser.id));
    const mergedTours = [...otherUserTours, ...updatedTravelerBookings];
    
    localStorage.setItem("tours", JSON.stringify(mergedTours));
}

export function getTravelerProfile() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.profile) || "{}");
}

export function saveTravelerProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export function setSelectedBookingId(id) {
    localStorage.setItem(STORAGE_KEYS.selectedBookingId, String(id));
}

export function getSelectedBookingId() {
    const value = localStorage.getItem(STORAGE_KEYS.selectedBookingId);
    return value === null ? null : Number(value);
}

export function saveLastTransport(transport) {
    localStorage.setItem(STORAGE_KEYS.lastTransport, transport);
}

export function getLastTransport() {
    return localStorage.getItem(STORAGE_KEYS.lastTransport) || "Flight";
}

export function getTravelerWorkspaceSeed() {
    return travelerWorkspaceSeed;
}
