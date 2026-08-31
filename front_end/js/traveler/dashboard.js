import { travelerData } from "../api/legacyData.js";

export const TRAVELER_BOOKING_KEYS = {
    selectedPackage: [
        "traveler_selected_package",
        "traveler_selected_package_id",
        "traveler_package_selection",
        "selectedTravelerPackage",
        "selectedPackage"
    ],
    bookingDraft: "traveler_package_booking_draft",
    bookingConfirmation: "traveler_package_booking_confirmation"
};

export function initTravelerDashboardInteractions(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;

    const searchTabs = root.querySelectorAll(".search-tab");
    searchTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            searchTabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");
        });
    });

    const toggleButtons = root.querySelectorAll(".toggle-btn");
    toggleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            toggleButtons.forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
        });
    });

    const heartButtons = root.querySelectorAll(".heart-btn, .heart-btn-circle");
    heartButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const svg = button.querySelector("svg");
            const isActive = button.dataset.active === "true";

            button.dataset.active = String(!isActive);
            button.style.color = isActive ? "#9CA3AF" : "#EF4444";

            if (svg) {
                svg.style.fill = isActive ? "none" : "#EF4444";
            }
        });
    });
}

export function getTravelerPackageCatalog() {
    return Array.isArray(travelerData?.searchCatalog?.packages)
        ? travelerData.searchCatalog.packages
        : [];
}

export function getSelectedTravelerPackage() {
    const catalog = getTravelerPackageCatalog();
    const selections = [
        readFromStorage(localStorage, TRAVELER_BOOKING_KEYS.selectedPackage),
        readFromStorage(sessionStorage, TRAVELER_BOOKING_KEYS.selectedPackage)
    ].filter(Boolean);

    for (const selection of selections) {
        const normalized = resolvePackageSelection(selection, catalog);
        if (normalized) {
            return normalized;
        }
    }

    return normalizePackage(catalog[0]) || createFallbackPackage();
}

export function getTravelerBookingDraft() {
    return normalizeBookingRecord(readJson(localStorage, TRAVELER_BOOKING_KEYS.bookingDraft));
}

export function saveTravelerBookingDraft(draft) {
    writeJson(localStorage, TRAVELER_BOOKING_KEYS.bookingDraft, normalizeBookingRecord(draft));
}

export function getTravelerBookingConfirmation() {
    return normalizeBookingRecord(readJson(localStorage, TRAVELER_BOOKING_KEYS.bookingConfirmation));
}

export function saveTravelerBookingConfirmation(record) {
    const normalized = normalizeBookingRecord(record);
    writeJson(localStorage, TRAVELER_BOOKING_KEYS.bookingConfirmation, normalized);

    // Sync with unified 'tours' data for guide visibility
    if (normalized) {
        const allTours = JSON.parse(localStorage.getItem("tours") || "[]");
        
        // Map to unified tour format
        const newTour = {
            id: String(normalized.bookingId),
            guideId: "10001", // Default to Sreekar (demo)
            customerId: "20001",
            customer: normalized.travelers[0]?.name || "Anjali Sharma",
            title: normalized.packageData.title,
            destination: normalized.packageData.destination,
            location: normalized.packageData.destination,
            plan_iternary: (normalized.packageData.itinerary || []).flatMap(day => 
                (day.items && day.items.length > 0) ? day.items.map(item => item.name) : [day.title || day.day]
            ),
            itinerary: normalized.packageData.itinerary || [],
            currentloction: null,
            dateTime: `${normalized.packageData.departureDate || "Date TBD"} | 10:00 AM`,
            status: "pending",
            guests: normalized.travelerCount,
            amount: normalized.totalPrice,
            duration: `${normalized.packageData.days} days`,
            coverImage: normalized.packageData.image,
            accommodation: normalized.packageData.stayLine,
            paymentBreakdown: { total: normalized.totalPrice, paid: normalized.totalPrice, status: "Paid" },
            documents: []
        };

        // Add if not already present
        if (!allTours.find(t => t.id === newTour.id)) {
            allTours.push(newTour);
            localStorage.setItem("tours", JSON.stringify(allTours));
        }

        const myTrips = JSON.parse(localStorage.getItem("traveler_my_trips") || "[]");
        if (!myTrips.find(t => String(t.id) === String(newTour.id) || String(t.bookingId) === String(newTour.id))) {
            myTrips.push(newTour);
            localStorage.setItem("traveler_my_trips", JSON.stringify(myTrips));
        }

        // Sync with NTA activity & bookings
        const ntaActivity = JSON.parse(localStorage.getItem("ntaActivity") || "[]");
        ntaActivity.unshift({
            type: "booking",
            action: "New Package Booking",
            detail: `${newTour.customer} booked ${newTour.title} (${newTour.destination})`,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem("ntaActivity", JSON.stringify(ntaActivity));

        const ntaBookings = JSON.parse(localStorage.getItem("ntaBookings") || "[]");
        if (!ntaBookings.find(b => String(b.id) === String(newTour.id))) {
            ntaBookings.unshift({
                id: newTour.id,
                packageName: newTour.title,
                traveller: newTour.customer,
                date: normalized.packageData.departureDate || new Date().toISOString().slice(0, 10),
                status: "Confirmed",
                amount: newTour.amount,
                destination: newTour.destination
            });
            localStorage.setItem("ntaBookings", JSON.stringify(ntaBookings));
        }

        // Sync with Hotel partner bookings & activity
        const hotelBookings = JSON.parse(localStorage.getItem("hotelBookings") || "[]");
        const hotelCheckIn = normalized.packageData.departureDate || new Date().toISOString().slice(0, 10);
        const nights = normalized.packageData.nights || 3;
        const hotelCheckOut = new Date(Date.now() + 86400000 * nights).toISOString().slice(0, 10);
        if (!hotelBookings.find(hb => String(hb.id) === String(newTour.id) || String(hb.bookingId) === String(newTour.id))) {
            hotelBookings.unshift({
                id: newTour.id,
                hotelId: normalized.packageData.hotelId || "delhi-boutique",
                customer: newTour.customer,
                guestName: newTour.customer,
                email: normalized.travelers[0]?.email || "traveler@xploreo.com",
                phone: normalized.travelers[0]?.phone || "+91 9876543210",
                checkIn: hotelCheckIn,
                checkOut: hotelCheckOut,
                room: normalized.packageData.stayLine || "Deluxe Room",
                roomType: "Deluxe Room",
                guests: normalized.travelerCount,
                totalAmount: Math.round(normalized.totalPrice * 0.45),
                status: "CONFIRMED",
                hotel: {
                    name: normalized.packageData.stayLine || `${normalized.packageData.destination} Heritage Stay`,
                    city: normalized.packageData.destination
                }
            });
            localStorage.setItem("hotelBookings", JSON.stringify(hotelBookings));
        }

        const hotelActivity = JSON.parse(localStorage.getItem("hotelActivity") || "[]");
        hotelActivity.unshift({
            text: `New reservation for ${newTour.customer} (${normalized.packageData.stayLine || 'Deluxe Room'})`,
            time: "Just now"
        });
        localStorage.setItem("hotelActivity", JSON.stringify(hotelActivity));

        // Sync with Experience partner bookings
        const expBookings = JSON.parse(localStorage.getItem("experienceBookings") || "[]");
        const itinerary = normalized.packageData.itinerary || [];
        const expDate = normalized.packageData.departureDate || new Date().toISOString().slice(0, 10);

        let addedExp = false;
        itinerary.forEach((day, dIdx) => {
            (day.items || []).forEach((item, iIdx) => {
                const expTitle = item.name || `${normalized.packageData.destination} Guided Experience`;
                let group = expBookings.find(g => g.title === expTitle && g.date === expDate);
                if (!group) {
                    group = {
                        title: expTitle,
                        date: expDate,
                        time: "10:00 AM",
                        users: []
                    };
                    expBookings.unshift(group);
                }
                if (!group.users.find(u => String(u.id) === `${newTour.id}-${dIdx}-${iIdx}`)) {
                    group.users.push({
                        id: `${newTour.id}-${dIdx}-${iIdx}`,
                        name: newTour.customer,
                        email: "traveler@xploreo.com",
                        phone: "+91 9876543210",
                        seats: normalized.travelerCount,
                        status: "confirmed",
                        totalAmount: Math.round(normalized.totalPrice * 0.35)
                    });
                    addedExp = true;
                }
            });
        });

        if (!addedExp) {
            const expTitle = `${normalized.packageData.destination} Sightseeing & Cultural Tour`;
            let group = expBookings.find(g => g.title === expTitle && g.date === expDate);
            if (!group) {
                group = {
                    title: expTitle,
                    date: expDate,
                    time: "10:00 AM",
                    users: []
                };
                expBookings.unshift(group);
            }
            if (!group.users.find(u => String(u.id) === `exp-${newTour.id}`)) {
                group.users.push({
                    id: `exp-${newTour.id}`,
                    name: newTour.customer,
                    email: "traveler@xploreo.com",
                    phone: "+91 9876543210",
                    seats: normalized.travelerCount,
                    status: "confirmed",
                    totalAmount: Math.round(normalized.totalPrice * 0.35)
                });
            }
        }
        localStorage.setItem("experienceBookings", JSON.stringify(expBookings));
    }
}

export function createTravelerDraft(packageData, travelers) {
    const normalizedPackage = normalizePackage(packageData);
    const normalizedTravelers = travelers.map((traveler, index) => normalizeTraveler(traveler, index));

    return {
        packageId: normalizedPackage.id,
        packageData: normalizedPackage,
        travelers: normalizedTravelers,
        travelerCount: normalizedTravelers.length,
        totalPrice: calculateTravelerBookingTotal(normalizedPackage, normalizedTravelers.length),
        updatedAt: new Date().toISOString()
    };
}

export function createTravelerConfirmation(draft) {
    const normalizedDraft = normalizeBookingRecord(draft);

    return {
        ...normalizedDraft,
        bookingId: normalizedDraft.bookingId || generateBookingId(),
        confirmedAt: new Date().toISOString()
    };
}

export function normalizeTraveler(traveler = {}, index = 0) {
    return {
        id: traveler.id || `traveler-${Date.now()}-${index + 1}`,
        name: String(traveler.name || "").trim(),
        age: normalizeAge(traveler.age),
        gender: String(traveler.gender || "").trim()
    };
}

export function createEmptyTraveler(index = 0) {
    return {
        id: `traveler-${Date.now()}-${index + 1}`,
        name: "",
        age: "",
        gender: ""
    };
}

export function inferTravelerCount(packageData) {
    const normalizedPackage = normalizePackage(packageData);
    const pricePerPerson = Number(normalizedPackage.pricePerPerson) || 0;
    const totalPrice = Number(normalizedPackage.totalPrice) || 0;

    if (pricePerPerson > 0 && totalPrice >= pricePerPerson) {
        return Math.max(1, Math.round(totalPrice / pricePerPerson));
    }

    return 2;
}

export function calculateTravelerBookingTotal(packageData, travelerCount) {
    const normalizedPackage = normalizePackage(packageData);
    const safeCount = Math.max(1, Number(travelerCount) || 1);
    return safeCount * (Number(normalizedPackage.pricePerPerson) || 0);
}

export function formatBookingCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

export function formatBookingDate(value) {
    if (!value) return "Flexible dates";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function normalizeBookingRecord(record) {
    if (!record || typeof record !== "object") return null;

    const packageData = normalizePackage(record.packageData);
    const travelers = Array.isArray(record.travelers)
        ? record.travelers.map((traveler, index) => normalizeTraveler(traveler, index))
        : [];

    return {
        bookingId: record.bookingId || "",
        packageId: record.packageId || packageData.id,
        packageData,
        travelers,
        travelerCount: travelers.length,
        totalPrice: calculateTravelerBookingTotal(packageData, travelers.length || 1),
        updatedAt: record.updatedAt || "",
        confirmedAt: record.confirmedAt || "",
        assignedGuide: record.assignedGuide || null
    };
}

function normalizePackage(packageData) {
    const fallback = createFallbackPackage();
    const source = packageData && typeof packageData === "object" ? packageData : fallback;

    return {
        id: source.id || fallback.id,
        origin: source.origin || fallback.origin,
        destination: source.destination || fallback.destination,
        title: source.title || fallback.title,
        image: source.image || fallback.image,
        nights: Number(source.nights) || fallback.nights,
        days: Number(source.days) || fallback.days,
        withFlight: Boolean(source.withFlight),
        hotelCategory: Number(source.hotelCategory) || fallback.hotelCategory,
        stayLine: source.stayLine || fallback.stayLine,
        mealsLine: source.mealsLine || fallback.mealsLine,
        transferLine: source.transferLine || fallback.transferLine,
        activityLine: source.activityLine || fallback.activityLine,
        perk: source.perk || fallback.perk,
        pricePerPerson: Number(source.pricePerPerson) || fallback.pricePerPerson,
        totalPrice: Number(source.totalPrice) || fallback.totalPrice,
        emi: Number(source.emi) || fallback.emi,
        departureDate: source.departureDate || source.departure || "",
        itinerary: source.itinerary || fallback.itinerary || []
    };
}

function resolvePackageSelection(selection, catalog) {
    if (!selection) return null;

    if (typeof selection === "string") {
        const matched = catalog.find((item) => item.id === selection);
        return matched ? normalizePackage(matched) : null;
    }

    if (typeof selection === "object") {
        if (selection.id) {
            const matched = catalog.find((item) => item.id === selection.id);
            if (matched) return normalizePackage({ ...matched, ...selection });
        }

        if (selection.packageId) {
            const matched = catalog.find((item) => item.id === selection.packageId);
            if (matched) return normalizePackage({ ...matched, ...selection.packageData, id: selection.packageId });
        }

        if (selection.packageData) {
            return normalizePackage(selection.packageData);
        }

        return normalizePackage(selection);
    }

    return null;
}

function createFallbackPackage() {
    return {
        id: "package-goa-escape",
        origin: "New Delhi",
        destination: "Goa",
        title: "Magical Goa - Island Paradise Escape",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1400",
        nights: 5,
        days: 6,
        withFlight: true,
        hotelCategory: 4,
        stayLine: "4★ Resort with Pool",
        mealsLine: "Breakfast & Dinner Included",
        transferLine: "Airport Transfers Included",
        activityLine: "2 Tours & 1 Water Activity",
        perk: "FREE Couple Spa Session",
        pricePerPerson: 899,
        totalPrice: 1798,
        emi: 150,
        departureDate: ""
    };
}

function readFromStorage(storage, keys) {
    if (!storage) return null;

    for (const key of keys) {
        try {
            const raw = storage.getItem(key);
            if (!raw) continue;

            try {
                return JSON.parse(raw);
            } catch (error) {
                return raw;
            }
        } catch (error) {
            return null;
        }
    }

    return null;
}

function readJson(storage, key) {
    if (!storage) return null;

    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function writeJson(storage, key, value) {
    if (!storage) return;

    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Unable to persist ${key}`, error);
    }
}

function generateBookingId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return Number(`${year}${random}`);
}

function normalizeAge(age) {
    if (age === "") return "";
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge)) return "";
    return Math.max(0, Math.trunc(numericAge));
}

if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => initTravelerDashboardInteractions());
    } else {
        initTravelerDashboardInteractions();
    }
}
