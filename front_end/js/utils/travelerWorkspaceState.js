import { users, travelerWorkspaceSeed } from "../api/legacyData.js";

const STORAGE_KEYS = {
    plans: "traveler_workspace_plans",
    bookings: "tours", // Points to the unified tours data
    profile: "traveler_workspace_profile",
    selectedBookingId: "traveler_selected_booking_id",
    lastTransport: "traveler_last_transport",
    travellerRole: "traveler_active_role"
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function getTravelerProfilePreset(user) {
    const presets = {
        "20001": {
            fullName: "Anjali Sharma",
            email: "anjali@xploreo.com",
            phone: "+91 91234 56780",
            location: "Mumbai, Maharashtra",
            language: "English (IN)",
            gender: "Female",
            dob: "2001-08-15",
            bio: "Avid explorer and photography enthusiast who loves experiencing premium heritage stays, local culinary trails, and beach retreats across India.",
            reputation: "Elite Explorer",
            level: 4,
            totalTrips: 18,
            countries: 0,
            preferences: {
                transport: "First Class Trains / Flights",
                stay: "5-Star Resorts / Heritage Villas",
                budget: "Premium (Rs30k - Rs70k / day)",
                activityStyle: "Sightseeing / Food Walks / Spa"
            },
            interestPreferences: ["Beach", "Heritage", "Food"],
            hobbies: ["Photography", "Nature trails", "Wellness retreats", "Historical tours"],
            security: {
                twoFactorAuth: true,
                emailNotifications: true,
                publicProfile: true
            }
        },
        "20002": {
            fullName: "Meera Iyer",
            email: "meera@xploreo.com",
            phone: "+91 88776 65544",
            location: "Chennai, Tamil Nadu",
            language: "English (US)",
            gender: "Female",
            dob: "2002-04-12",
            bio: "Curious traveller and culture-first planner who loves coastal getaways, heritage neighborhoods, boutique stays, and thoughtfully paced itineraries.",
            reputation: "Explorer Status",
            level: 5,
            totalTrips: 11,
            countries: 9,
            preferences: {
                transport: "Premium Economy / Trains",
                stay: "Boutique Hotels / Heritage Stays",
                budget: "Premium (Rs30k - Rs80k / day)",
                activityStyle: "Culture / Food / Nature"
            },
            interestPreferences: ["Culture", "Food"],
            hobbies: ["Photography", "Food trails", "Wellness retreats", "Temple visits", "Beach escapes", "Art museums"],
            security: {
                twoFactorAuth: true,
                emailNotifications: true,
                publicProfile: false
            }
        }
    };

    if (user?.id && presets[user.id]) {
        return clone(presets[user.id]);
    }

    const fallback = clone(travelerWorkspaceSeed.profile || {
        fullName: "Alex Rivera",
        email: "alex@xploreo.com",
        phone: "+91 91234 56789",
        location: "Mumbai, Maharashtra",
        language: "English (US)",
        gender: "Female",
        dob: "1995-01-01",
        bio: "Curious explorer...",
        reputation: "Explorer",
        level: 1,
        totalTrips: 0,
        countries: 0,
        interestPreferences: [],
        hobbies: []
    });

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

export function ensureTravelerSession() {
    let currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser || !currentUser.role) {
        currentUser = users.find((user) => user.role === "traveller") || {
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

export function seedTravelerWorkspace() {
    const currentUser = ensureTravelerSession();

    if (!localStorage.getItem(STORAGE_KEYS.plans)) {
        localStorage.setItem(STORAGE_KEYS.plans, JSON.stringify(clone(travelerWorkspaceSeed.plans || [])));
    }

    // Bookings are now seeded via app.js initializeData into "tours"

    const storedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.profile) || "null");
    const nextProfile = getTravelerProfilePreset(currentUser);
    const hasLegacyDefaultProfile = storedProfile
        && travelerWorkspaceSeed.profile
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

export function getTravelerBookings() {
    const allTours = JSON.parse(localStorage.getItem("tours") || "[]");
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
