import { getAppStateValue } from "./appState.js";

function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
}

function createLiveProxy(key, fallback) {
    const baseTarget = Array.isArray(fallback) ? [] : {};

    return new Proxy(baseTarget, {
        get(_target, prop) {
            const source = getAppStateValue(key, fallback) ?? fallback;
            const value = Reflect.get(source, prop, source);
            const fallbackValue = fallback && typeof fallback === "object"
                ? Reflect.get(fallback, prop, fallback)
                : undefined;
            const resolvedValue = value === undefined ? fallbackValue : value;
            return typeof resolvedValue === "function" ? resolvedValue.bind(source) : resolvedValue;
        },
        set(_target, prop, value) {
            const source = cloneValue(getAppStateValue(key, fallback) ?? fallback);
            source[prop] = value;
            localStorage.setItem(key, JSON.stringify(source));
            return true;
        },
        ownKeys() {
            return Reflect.ownKeys(getAppStateValue(key, fallback) ?? fallback);
        },
        getOwnPropertyDescriptor(_target, prop) {
            const source = getAppStateValue(key, fallback) ?? fallback;
            const descriptor =
                Object.getOwnPropertyDescriptor(source, prop) ||
                (fallback && typeof fallback === "object"
                    ? Object.getOwnPropertyDescriptor(fallback, prop)
                    : undefined);
            return descriptor || {
                configurable: true,
                enumerable: true,
                writable: true,
                value: source[prop]
            };
        }
    });
}

const defaultTravelerData = {
    destinations: [
        {
            title: "Mumbai",
            subtitle: "City escapes and desert adventures",
            image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800",
            tours: "24 tours"
        },
        {
            title: "Delhi",
            subtitle: "Food, art, and classic city walks",
            image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=800",
            tours: "18 tours"
        },
        {
            title: "Goa",
            subtitle: "Beaches, temples, and wellness stays",
            image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800",
            tours: "21 tours"
        },
        {
            title: "Bangalore",
            subtitle: "Culture, food, and neon neighborhoods",
            image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&q=80&w=800",
            tours: "16 tours"
        }
    ],
    recommendedTours: [],
    categories: [],
    steps: [
        { number: 1, icon: "../components/ui/exploreIcon.jpg", title: "Search", desc: "Find flights, hotels, packages, and experiences." },
        { number: 2, icon: "../components/ui/tours.svg", title: "Book", desc: "Choose a plan and confirm your trip." },
        { number: 3, icon: "../components/ui/mytripsIcon.jpg", title: "Travel", desc: "Track your bookings from My Trips." }
    ],
    itineraries: [],
    reviews: [],
    continueExploring: [],
    searchCatalog: {
        flights: [],
        hotels: [],
        packages: [],
        experiences: []
    }
};

export const users = createLiveProxy("users", []);
export const travelerWorkspaceSeed = createLiveProxy("travelerWorkspaceSeed", {});
export const travelerData = createLiveProxy("travelerData", defaultTravelerData);
export const earningsData = createLiveProxy("experienceEarnings", []);
export const bookingsData = createLiveProxy("experienceBookings", []);
export const experiences = createLiveProxy("experienceCatalog", []);
export const profileData = createLiveProxy("experienceProfile", {});
export const homeData = createLiveProxy("experienceHome", {});
export const homeTestimonials = createLiveProxy("homeTestimonials", []);
export const flightsData = createLiveProxy("flightsData", {});
export const partners = createLiveProxy("partnerPerformanceData", []);
export const initialUsersData = createLiveProxy("platformUsers", []);
export const initialPartnersData = createLiveProxy("partners", []);
export const chartData = createLiveProxy("financeChartData", {});
export const financeStats = createLiveProxy("financeStats", []);
export const payoutData = createLiveProxy("financePayoutData", []);
export const opsData = createLiveProxy("opsData", []);

export const nontechAdminData = new Proxy(
    {},
    {
        get(_target, prop) {
            if (prop === "plans") {
                return getAppStateValue("ntaPlans", []);
            }
            if (prop === "recentActivity") {
                return getAppStateValue("ntaActivity", []);
            }
            return undefined;
        }
    }
);

export const userStatusStyles = {
    Active: { color: "#1e8e3e", bg: "#e6f4ea" },
    Pending: { color: "#d97706", bg: "#fef3c7" },
    Inactive: { color: "#e53e3e", bg: "#fff5f5" }
};

export const partnerStatusStyles = {
    Verified: { color: "#1e8e3e", bg: "#e6f4ea" },
    "Under Review": { color: "#d97706", bg: "#fef3c7" },
    Unverified: { color: "#e53e3e", bg: "#fff5f5" }
};

export const activityIcons = {
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    alert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
};

export function getOpsData() {
    const partnerRows = getAppStateValue("partners", []);

    let totalBookings = 0;
    let ongoing = 0;
    let refunds = 0;

    partnerRows.forEach((partner) => {
        totalBookings += Number(partner.bookings) || 0;
        ongoing += Number(partner.ongoingSessions) || 0;
        refunds += Number(partner.refunds) || 0;
    });

    if (totalBookings === 0) totalBookings = 12482;
    if (ongoing === 0) ongoing = Math.floor(totalBookings * 0.06);
    if (refunds === 0) refunds = Math.floor(totalBookings * 0.035);

    const successful = totalBookings - refunds - ongoing;
    const successRate = ((successful / totalBookings) * 100).toFixed(1);

    return [
        {
            label: "TOTAL ANNUAL BOOKINGS",
            value: totalBookings.toLocaleString(),
            subtext: "↗ Real-time volume",
            subClass: "green",
            color: "blue",
            icon: "../components/ui/operations.png"
        },
        {
            label: "ONGOING EXPERIENCES",
            value: ongoing.toLocaleString(),
            subtext: "live sessions right now",
            subClass: "blue-text",
            color: "dark-green",
            icon: "../components/ui/finance.png"
        },
        {
            label: "SUCCESSFUL COMPLETIONS",
            value: successful.toLocaleString(),
            subtext: `${successRate}% Success Rate`,
            subClass: "green",
            color: "violet",
            icon: "../components/ui/operations.png"
        },
        {
            label: "ATTRITION & REFUNDS",
            value: refunds.toLocaleString(),
            subtext: "tracked via SLAs",
            subClass: "red",
            color: "orange",
            icon: "../components/ui/users.png"
        }
    ];
}

export function getRevenueData() {
    return getAppStateValue("refunds", []);
}

export function getLedgerData() {
    return getAppStateValue("ledger", []);
}

export function getDisputesData() {
    return getAppStateValue("disputes", []);
}
