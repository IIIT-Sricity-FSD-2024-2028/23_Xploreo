import { travelerData } from "../api/legacyData.js";
import { TRAVELER_BOOKING_KEYS } from "./dashboard.js";

const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const WISHLIST_STORAGE_KEY = "traveler_wishlist";
const ROOM_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const GUEST_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const PACKAGE_RESULTS = (travelerData?.searchCatalog?.packages || []).map((item) => ({
    ...item,
    budgetBucket:
        item.pricePerPerson < 500 ? "under-500" :
        item.pricePerPerson <= 1000 ? "500-1000" :
        item.pricePerPerson <= 2000 ? "1000-2000" :
        "above-2000"
}));

document.addEventListener("DOMContentLoaded", () => {
    renderTravelerPackageSearchPage("traveler-package-search-app");
});

function renderTravelerPackageSearchPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const state = {
        searchValues: getSearchValues(),
        minDuration: 1,
        flightMode: "with",
        maxBudget: 5000,
        selectedBudgets: new Set(),
        selectedCategories: new Set(),
        occupancyOpen: false
    };

    function render() {
        const { items, matchMode } = getFilteredPackages(state);
        const resultMessage = getResultMessage(state.searchValues, items.length, matchMode);

        container.innerHTML = `
            <main class="traveler-package-page">
                <div class="traveler-package-frame">
                    <section class="traveler-package-toolbar">
                        ${renderTextField("fromCity", "Starting From", state.searchValues.fromCity, "Your city")}
                        ${renderTextField("destination", "Going To", state.searchValues.destination, "Destination")}
                        ${renderDateField("departureDate", "Starting Date", state.searchValues.departureDate)}
                        ${renderOccupancyField(state)}
                        <button class="traveler-package-search-btn" type="button" id="traveler-package-search-btn">
                            ${searchIcon()}
                            <span>SEARCH</span>
                        </button>
                    </section>

                    <section class="traveler-package-layout">
                        <aside class="traveler-package-filters">
                            <h2>FILTERS</h2>

                            <div class="traveler-package-filter-group">
                                <h3>Duration</h3>
                                <div class="traveler-package-slider-wrap">
                                    <input id="traveler-package-duration" type="range" min="1" max="7" step="1" value="${state.minDuration}">
                                </div>
                                <div class="traveler-package-slider-labels">
                                    <span>1N</span>
                                    <span class="active">${state.minDuration}N</span>
                                    <span>7N</span>
                                </div>
                            </div>

                            <div class="traveler-package-filter-group">
                                <h3>Flights</h3>
                                <div class="traveler-package-flight-toggle">
                                    <button type="button" class="${state.flightMode === "with" ? "active" : ""}" data-package-flight="with">With Flight</button>
                                    <button type="button" class="${state.flightMode === "without" ? "active" : ""}" data-package-flight="without">Without Flight</button>
                                </div>
                            </div>

                            <div class="traveler-package-filter-group">
                                <h3>Budget</h3>
                                <div class="traveler-package-slider-wrap">
                                    <input id="traveler-package-budget" type="range" min="0" max="10000" step="100" value="${state.maxBudget}">
                                </div>
                                <div class="traveler-package-slider-labels traveler-package-budget-labels">
                                    <span>₹0</span>
                                    <span class="active">${formatCurrency(state.maxBudget)}</span>
                                    <span>₹10,000</span>
                                </div>
                                <div class="traveler-package-checkbox-list">
                                    ${renderBudgetCheck("under-500", "Under ₹500", state.selectedBudgets.has("under-500"))}
                                    ${renderBudgetCheck("500-1000", "₹500 - ₹1000", state.selectedBudgets.has("500-1000"))}
                                    ${renderBudgetCheck("1000-2000", "₹1000 - ₹2000", state.selectedBudgets.has("1000-2000"))}
                                    ${renderBudgetCheck("above-2000", "Above ₹2000", state.selectedBudgets.has("above-2000"))}
                                </div>
                            </div>

                            <div class="traveler-package-filter-group traveler-package-filter-group-last">
                                <h3>Hotel Category</h3>
                                <div class="traveler-package-category-pills">
                                    ${renderCategoryPill("3", state.selectedCategories.has("3"))}
                                    ${renderCategoryPill("4", state.selectedCategories.has("4"))}
                                    ${renderCategoryPill("5", state.selectedCategories.has("5"))}
                                </div>
                            </div>
                        </aside>

                        <section class="traveler-package-results">
                            <div class="traveler-package-results-meta">
                                ${escapeHtml(resultMessage)}
                            </div>

                            ${items.length ? `
                                <div class="traveler-package-grid">
                                    ${items.map(renderPackageCard).join("")}
                                </div>
                            ` : `
                                <div class="traveler-package-empty">
                                    No holiday packages found for the selected filters.
                                </div>
                            `}
                        </section>
                    </section>
                </div>
            </main>
        `;

        bindEvents();
    }

    function bindEvents() {
        container.querySelectorAll("[data-package-field]").forEach((field) => {
            field.addEventListener("input", () => {
                state.searchValues = normalizeSearchValues({
                    ...state.searchValues,
                    [field.dataset.packageField]: field.value
                });
            });

            field.addEventListener("change", () => {
                state.searchValues = normalizeSearchValues({
                    ...state.searchValues,
                    [field.dataset.packageField]: field.value
                });
            });
        });

        container.querySelector("#traveler-package-search-btn")?.addEventListener("click", () => {
            state.searchValues = normalizeSearchValues(state.searchValues);
            persistSearchValues(state.searchValues);
            render();
        });

        container.querySelector("#traveler-package-duration")?.addEventListener("input", (event) => {
            state.minDuration = Number(event.target.value);
            render();
        });

        container.querySelector("#traveler-package-budget")?.addEventListener("input", (event) => {
            state.maxBudget = Number(event.target.value);
            render();
        });

        container.querySelectorAll("[data-package-flight]").forEach((button) => {
            button.addEventListener("click", () => {
                state.flightMode = button.dataset.packageFlight;
                render();
            });
        });

        container.querySelectorAll("[data-package-budget]").forEach((input) => {
            input.addEventListener("change", () => {
                const value = input.dataset.packageBudget;
                if (state.selectedBudgets.has(value)) {
                    state.selectedBudgets.delete(value);
                } else {
                    state.selectedBudgets.add(value);
                }
                render();
            });
        });

        container.querySelectorAll("[data-package-category]").forEach((button) => {
            button.addEventListener("click", () => {
                const value = button.dataset.packageCategory;
                if (state.selectedCategories.has(value)) {
                    state.selectedCategories.delete(value);
                } else {
                    state.selectedCategories.add(value);
                }
                render();
            });
        });

        container.querySelector("#traveler-package-occupancy-toggle")?.addEventListener("click", () => {
            state.occupancyOpen = !state.occupancyOpen;
            render();
        });

        container.querySelector('[data-package-field="rooms"]')?.addEventListener("change", (event) => {
            state.searchValues = normalizeSearchValues({
                ...state.searchValues,
                rooms: event.target.value
            });
            persistSearchValues(state.searchValues);
            render();
        });

        container.querySelector('[data-package-field="guestCount"]')?.addEventListener("change", (event) => {
            state.searchValues = normalizeSearchValues({
                ...state.searchValues,
                guestCount: event.target.value
            });
            persistSearchValues(state.searchValues);
            render();
        });

        container.querySelectorAll("[data-package-wishlist]").forEach((button) => {
            button.addEventListener("click", () => {
                const packageId = button.dataset.packageWishlist;
                const item = PACKAGE_RESULTS.find((entry) => entry.id === packageId);
                if (!item) return;
                toggleWishlist(item);
                render();
            });
        });

        container.querySelectorAll("[data-package-details]").forEach((button) => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const packageId = button.dataset.packageDetails;
                const selectedPackage = PACKAGE_RESULTS.find((item) => String(item.id) === String(packageId));
                if (selectedPackage) {
                    persistSelectedPackage(selectedPackage);
                }
                window.location.href = `./traveller_booking-details.html?plan=${encodeURIComponent(packageId)}`;
            });
        });

    }

    render();
}

function getSearchValues() {
    const fallback = {
        fromCity: "New Delhi",
        destination: "Goa",
        departureDate: "",
        rooms: "1",
        guestCount: "2",
        guests: "1 Room, 2 Guests"
    };

    if (typeof localStorage === "undefined") {
        return fallback;
    }

    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
        const values = stored.values?.packages || {};
        return normalizeSearchValues({
            fromCity: values.fromCity || fallback.fromCity,
            destination: values.destination || fallback.destination,
            departureDate: values.departureDate || fallback.departureDate,
            rooms: values.rooms || "1",
            guestCount: values.guestCount || "2",
            guests: values.guests || fallback.guests
        });
    } catch (error) {
        return fallback;
    }
}

function persistSearchValues(searchValues) {
    if (typeof localStorage === "undefined") return;

    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
        stored.values = stored.values || {};
        stored.values.packages = {
            ...searchValues,
            guests: formatRoomsGuests(searchValues.rooms, searchValues.guestCount)
        };
        localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
        console.warn("Unable to persist package search values", error);
    }
}

function getFilteredPackages(state) {
    const originTerm = normalizeText(state.searchValues.fromCity);
    const destinationTerm = normalizeText(state.searchValues.destination);
    const guestCount = Number.parseInt(state.searchValues.guestCount, 10) || 2;

    const exactMatches = PACKAGE_RESULTS.filter((item) => {
        const originMatched = !originTerm || includesText(item.origin, originTerm);
        const destinationMatched = !destinationTerm || includesText(item.destination, destinationTerm) || includesText(item.title, destinationTerm);
        return originMatched && destinationMatched;
    });

    const destinationMatches = PACKAGE_RESULTS.filter((item) =>
        !destinationTerm || includesText(item.destination, destinationTerm) || includesText(item.title, destinationTerm)
    );

    const originMatches = PACKAGE_RESULTS.filter((item) =>
        !originTerm || includesText(item.origin, originTerm)
    );

    const basePool = exactMatches.length
        ? { items: exactMatches, matchMode: "exact" }
        : destinationMatches.length
            ? { items: destinationMatches, matchMode: "destination" }
            : originMatches.length
                ? { items: originMatches, matchMode: "origin" }
                : { items: PACKAGE_RESULTS, matchMode: "all" };

    const items = basePool.items
        .filter((item) => item.nights >= state.minDuration)
        .filter((item) => state.flightMode === "with" ? item.withFlight : !item.withFlight)
        .filter((item) => item.pricePerPerson <= state.maxBudget)
        .filter((item) => !state.selectedBudgets.size || state.selectedBudgets.has(item.budgetBucket))
        .filter((item) => !state.selectedCategories.size || state.selectedCategories.has(String(item.hotelCategory)))
        .map((item) => ({
            ...item,
            totalPriceDisplay: item.pricePerPerson * guestCount
        }));

    return {
        items,
        matchMode: basePool.matchMode
    };
}

function getResultMessage(searchValues, count, matchMode) {
    if (!count) {
        return `No packages matched ${searchValues.destination || "your search"} after applying filters.`;
    }

    if (matchMode === "destination") {
        return `Showing ${count} package${count > 1 ? "s" : ""} for ${searchValues.destination}. Exact origin matches were not available in the traveler mock data.`;
    }

    if (matchMode === "origin") {
        return `Showing ${count} package${count > 1 ? "s" : ""} from ${searchValues.fromCity}.`;
    }

    if (matchMode === "all") {
        return `Showing ${count} mock package${count > 1 ? "s" : ""} from traveler data.`;
    }

    return `Showing ${count} package${count > 1 ? "s" : ""} for ${searchValues.fromCity} to ${searchValues.destination}.`;
}

function persistSelectedPackage(selectedPackage) {
    if (typeof localStorage === "undefined") return;

    try {
        localStorage.setItem(
            TRAVELER_BOOKING_KEYS.selectedPackage[0],
            JSON.stringify(selectedPackage)
        );
    } catch (error) {
        console.warn("Unable to store selected package", error);
    }
}

function normalizeSearchValues(values) {
    const rooms = clampCount(values.rooms, 1, 8);
    const guestCount = clampCount(values.guestCount, 1, 8);
    return {
        fromCity: String(values.fromCity || "").trim(),
        destination: String(values.destination || "").trim(),
        departureDate: values.departureDate || "",
        rooms: String(rooms),
        guestCount: String(guestCount),
        guests: formatRoomsGuests(rooms, guestCount)
    };
}

function renderTextField(field, label, value, placeholder) {
    return `
        <label class="traveler-package-toolbar-field">
            <span class="traveler-package-toolbar-label">${label}</span>
            <span class="traveler-package-toolbar-row">
                ${locationIcon()}
                <input type="text" class="traveler-package-toolbar-input" data-package-field="${field}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
            </span>
        </label>
    `;
}

function renderDateField(field, label, value) {
    return `
        <label class="traveler-package-toolbar-field">
            <span class="traveler-package-toolbar-label">${label}</span>
            <span class="traveler-package-toolbar-row">
                ${calendarIcon()}
                <input type="date" class="traveler-package-toolbar-input traveler-package-toolbar-date" data-package-field="${field}" value="${escapeHtml(value)}">
            </span>
        </label>
    `;
}

function renderOccupancyField(state) {
    return `
        <div class="traveler-package-toolbar-field traveler-package-occupancy-field ${state.occupancyOpen ? "open" : ""}">
            <span class="traveler-package-toolbar-label">Rooms & Guests</span>
            <button type="button" class="traveler-package-toolbar-row traveler-package-occupancy-toggle" id="traveler-package-occupancy-toggle">
                ${guestsIcon()}
                <strong>${formatRoomsGuests(state.searchValues.rooms, state.searchValues.guestCount)}</strong>
            </button>
            ${state.occupancyOpen ? `
                <div class="traveler-package-occupancy-panel">
                    <label>
                        <span>Rooms</span>
                        <select data-package-field="rooms">
                            ${ROOM_OPTIONS.map((option) => `<option value="${option}" ${option === state.searchValues.rooms ? "selected" : ""}>${option}</option>`).join("")}
                        </select>
                    </label>
                    <label>
                        <span>Guests</span>
                        <select data-package-field="guestCount">
                            ${GUEST_OPTIONS.map((option) => `<option value="${option}" ${option === state.searchValues.guestCount ? "selected" : ""}>${option}</option>`).join("")}
                        </select>
                    </label>
                </div>
            ` : ""}
        </div>
    `;
}

function renderBudgetCheck(value, label, checked) {
    return `
        <label class="traveler-package-check">
            <input type="checkbox" data-package-budget="${value}" ${checked ? "checked" : ""}>
            <span>${escapeHtml(label)}</span>
        </label>
    `;
}

function renderCategoryPill(value, active) {
    return `
        <button type="button" class="traveler-package-category-pill ${active ? "active" : ""}" data-package-category="${value}">
            ${value}★
        </button>
    `;
}

function renderPackageCard(item) {
    const wishlisted = getWishlistItems().some((entry) => entry.title === item.title);

    return `
        <article class="traveler-package-card">
            <div class="traveler-package-card-media" style="background-image:url('${item.image}')">
                <button class="traveler-package-fav ${wishlisted ? "active" : ""}" type="button" data-package-wishlist="${item.id}" aria-label="Save package">
                    ${heartIcon()}
                </button>
                <span class="traveler-package-duration-badge">${item.nights}N/${item.days}D</span>
            </div>

            <div class="traveler-package-card-body">
                <h3 class="traveler-package-title">${escapeHtml(item.title)}</h3>
                <ul class="traveler-package-meta">
                    <li>${hotelIcon()}<span>${escapeHtml(item.stayLine)}</span></li>
                    <li>${mealIcon()}<span>${escapeHtml(item.mealsLine)}</span></li>
                    <li>${transferIcon()}<span>${escapeHtml(item.transferLine)}</span></li>
                    <li>${sparkleIcon()}<span>${escapeHtml(item.activityLine)}</span></li>
                </ul>

                <div class="traveler-package-perk">
                    ${checkIcon()}
                    <span>${escapeHtml(item.perk)}</span>
                </div>

                <div class="traveler-package-card-footer">
                    <div class="traveler-package-pricing">
                        <small>Starting from (per person)</small>
                        <div class="traveler-package-price-row">
                            <strong>${formatCurrency(item.pricePerPerson)}</strong>
                            <span class="traveler-package-total-copy">Total: ${formatCurrency(item.totalPriceDisplay)}</span>
                        </div>

                    </div>

                    <button class="traveler-package-view-btn" type="button" data-package-details="${item.id}">View Details</button>
                </div>
            </div>
        </article>
    `;
}

function toggleWishlist(item) {
    const wishlist = getWishlistItems();
    const existingIndex = wishlist.findIndex((entry) => entry.title === item.title);

    if (existingIndex >= 0) {
        wishlist.splice(existingIndex, 1);
        saveWishlistItems(wishlist);
        showPackageToast("Removed from Wishlist");
        return;
    }

    wishlist.push({
        title: item.title,
        location: `${item.destination} Holiday Package`,
        image: item.image,
        likes: Math.max(18, item.pricePerPerson / 40)
    });
    saveWishlistItems(wishlist);
    showPackageToast("Added to Wishlist");
}

function getWishlistItems() {
    if (typeof localStorage === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
    } catch (error) {
        return [];
    }
}

function saveWishlistItems(items) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
}

function showPackageToast(message) {
    let toast = document.getElementById("traveler-package-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "traveler-package-toast";
        toast.className = "traveler-package-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._timeoutId);
    toast._timeoutId = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function clampCount(value, min, max) {
    const parsed = Number.parseInt(String(value || min), 10);
    if (Number.isNaN(parsed)) return min;
    return Math.min(max, Math.max(min, parsed));
}

function includesText(source, query) {
    return normalizeText(source).includes(normalizeText(query));
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function formatRoomsGuests(rooms, guests) {
    const roomCount = clampCount(rooms, 1, 8);
    const guestCount = clampCount(guests, 1, 8);
    return `${roomCount} Room${roomCount === 1 ? "" : "s"}, ${guestCount} Guest${guestCount === 1 ? "" : "s"}`;
}

function formatCurrency(value) {
    return `$${Number(value).toLocaleString("en-US")}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function locationIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

function calendarIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
}

function guestsIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
}

function searchIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
}

function heartIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
}

function hotelIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 22v-6.57"></path><path d="M14 22v-6.57"></path><path d="M22 22H2"></path><path d="M22 15a2 2 0 0 0-2-2h-3"></path><path d="M2 15a2 2 0 0 1 2-2h3"></path><path d="M7 2v10"></path><path d="M17 2v10"></path><path d="M7 12V6a5 5 0 0 1 10 0v6"></path></svg>`;
}

function mealIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12"></path><path d="M10 3v12"></path><path d="M14 3a5 5 0 0 1 5 5v7"></path><path d="M4 15h8"></path><path d="M17 21v-8"></path></svg>`;
}

function transferIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="11" width="15" height="7" rx="2"></rect><path d="M16 13h3l3 3v2h-6"></path><circle cx="5.5" cy="18.5" r="1.5"></circle><circle cx="18.5" cy="18.5" r="1.5"></circle></svg>`;
}

function sparkleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"></path><path d="M5 19h.01"></path><path d="M19 19h.01"></path></svg>`;
}

function checkIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"></path></svg>`;
}
