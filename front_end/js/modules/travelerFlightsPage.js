import { flightsData } from "../api/legacyData.js";

const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const SAVED_FLIGHTS_KEY = "traveler_saved_mock_flights";

export function renderTravelerFlightsPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const searchValues = getSearchValues();
    const dateTabs = buildDateTabs(flightsData);
    const state = {
        selectedDate: getDefaultSelectedDate(dateTabs),
        filters: {
            price: 2000,
            stops: new Set(),
            time: new Set()
        },
        sortType: "cheapest",
        savedFlights: new Set(readSavedFlights()),
        expandedFlightId: null
    };

    function render() {
        const filteredFlights = getVisibleFlightsForDate(flightsData, state);

        container.innerHTML = `
            <main class="traveler-flights-page">
                <div class="traveler-flights-frame">
                    <section class="traveler-flights-searchbar">
                        <div class="traveler-flights-searchbar-top">
                            <div class="traveler-trip-badges">
                                <button type="button" class="traveler-trip-badge ${searchValues.tripType === "Round Trip" ? "" : "active"}" disabled>One Way</button>
                                <button type="button" class="traveler-trip-badge ${searchValues.tripType === "Round Trip" ? "active" : ""}" disabled>Round Trip</button>
                            </div>
                            <a class="traveler-search-edit-link" href="./traveller_dashboard.html">Modify Search</a>
                        </div>

                        <div class="traveler-search-grid ${searchValues.tripType === "Round Trip" ? "round-trip" : "one-way"}">
                            ${renderSearchCell("From", searchValues.from)}
                            ${renderSearchSwap()}
                            ${renderSearchCell("To", searchValues.to)}
                            ${renderSearchCell("Departure", formatSearchDate(searchValues.departure))}
                            ${searchValues.tripType === "Round Trip" ? renderSearchCell("Return", formatSearchDate(searchValues.returnDate)) : ""}
                            ${renderSearchCell("Travellers", searchValues.travellers)}
                        </div>
                    </section>

                    <section class="traveler-flights-layout">
                        <aside class="traveler-filters-panel">
                            <div class="traveler-panel-header">
                                <h2>Filters</h2>
                            </div>

                            <div class="traveler-filter-block">
                                <div class="traveler-filter-title-row">
                                    <h3>Price</h3>
                                    <span>₹${state.filters.price}</span>
                                </div>
                                <input
                                    id="traveler-price-slider"
                                    class="traveler-price-slider"
                                    type="range"
                                    min="0"
                                    max="2000"
                                    step="25"
                                    value="${state.filters.price}"
                                    style="--slider-progress:${(state.filters.price / 2000) * 100}%"
                                >
                                <div class="traveler-filter-scale">
                                    <span>₹0</span>
                                    <span>₹2000</span>
                                </div>
                            </div>

                            <div class="traveler-filter-block">
                                <h3>Stops</h3>
                                <div class="traveler-filter-options">
                                    ${renderFilterOption("stops", "0", "Non-stop", state.filters.stops.has("0"))}
                                    ${renderFilterOption("stops", "1", "1 Stop", state.filters.stops.has("1"))}
                                    ${renderFilterOption("stops", "2", "2+ Stops", state.filters.stops.has("2"))}
                                </div>
                            </div>

                            <div class="traveler-filter-block traveler-filter-block-last">
                                <h3>Departure time</h3>
                                <div class="traveler-filter-options">
                                    ${renderFilterOption("time", "early", "Early", state.filters.time.has("early"), "6AM - 12PM")}
                                    ${renderFilterOption("time", "late", "Late", state.filters.time.has("late"), "12PM - 12AM")}
                                </div>
                            </div>
                        </aside>

                        <section class="traveler-results-panel">
                            <div class="traveler-date-strip">
                                <button class="traveler-date-nav" type="button" data-date-nav="prev" aria-label="Scroll dates left">
                                    <span></span>
                                </button>
                                <div class="traveler-date-scroll" id="traveler-date-scroll">
                                    ${dateTabs.map((date) => `
                                        <button
                                            type="button"
                                            class="traveler-date-tab ${state.selectedDate === date.value ? "active" : ""}"
                                            data-date-value="${date.value}"
                                        >
                                            <span class="traveler-date-day">${date.day}</span>
                                            <strong>${date.label}</strong>
                                            <small>from ₹${date.price}</small>
                                        </button>
                                    `).join("")}
                                </div>
                                <button class="traveler-date-nav" type="button" data-date-nav="next" aria-label="Scroll dates right">
                                    <span></span>
                                </button>
                            </div>

                            <div class="traveler-results-toolbar">
                                <div class="traveler-sort-group">
                                    ${renderSortButton("cheapest", "Cheapest", state.sortType)}
                                    ${renderSortButton("best", "Best", state.sortType)}
                                    ${renderSortButton("fastest", "Fastest", state.sortType)}
                                </div>
                                <p class="traveler-results-count">${filteredFlights.length} ${filteredFlights.length === 1 ? "flight" : "flights"} found</p>
                            </div>

                            <div class="traveler-flight-cards">
                                ${filteredFlights.length ? filteredFlights.map((flight) => renderFlightCard(flight, state)).join("") : `
                                    <div class="traveler-empty-state">
                                        <h3>No flights available for selected filters</h3>
                                        <p>Adjust your filters to see more options.</p>
                                    </div>
                                `}
                            </div>
                        </section>
                    </section>
                </div>
            </main>
        `;

        bindEvents();
    }

    function bindEvents() {
        const priceSlider = container.querySelector("#traveler-price-slider");
        if (priceSlider) {
            priceSlider.addEventListener("input", (event) => {
                state.filters.price = Number(event.target.value);
                render();
            });
        }

        container.querySelectorAll("[data-filter-group='stops']").forEach((button) => {
            button.addEventListener("click", () => {
                toggleSetValue(state.filters.stops, button.dataset.filterValue);
                render();
            });
        });

        container.querySelectorAll("[data-filter-group='time']").forEach((button) => {
            button.addEventListener("click", () => {
                toggleSetValue(state.filters.time, button.dataset.filterValue);
                render();
            });
        });

        container.querySelectorAll("[data-sort-value]").forEach((button) => {
            button.addEventListener("click", () => {
                state.sortType = button.dataset.sortValue;
                render();
            });
        });

        container.querySelectorAll("[data-date-value]").forEach((button) => {
            button.addEventListener("click", () => {
                state.selectedDate = button.dataset.dateValue;
                state.expandedFlightId = null;
                render();
            });
        });

        container.querySelectorAll("[data-save-flight]").forEach((button) => {
            button.addEventListener("click", () => {
                const flightId = Number(button.dataset.saveFlight);
                toggleSetValue(state.savedFlights, flightId);
                persistSavedFlights(state.savedFlights);
                render();
            });
        });

        container.querySelectorAll("[data-toggle-details]").forEach((button) => {
            button.addEventListener("click", () => {
                const flightId = Number(button.dataset.toggleDetails);
                state.expandedFlightId = state.expandedFlightId === flightId ? null : flightId;
                render();
            });
        });

        container.querySelectorAll("[data-date-nav]").forEach((button) => {
            button.addEventListener("click", () => {
                const rail = container.querySelector("#traveler-date-scroll");
                if (!rail) return;
                const offset = button.dataset.dateNav === "next" ? 228 : -228;
                rail.scrollBy({ left: offset, behavior: "smooth" });
            });
        });
    }

    render();
}

function renderSearchCell(label, value) {
    return `
        <div class="traveler-search-cell">
            <span>${label}</span>
            <strong>${escapeHtml(value || "-")}</strong>
        </div>
    `;
}

function renderSearchSwap() {
    return `
        <div class="traveler-search-swap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 9h13"></path>
                <path d="m13 4 5 5-5 5"></path>
                <path d="M20 15H7"></path>
                <path d="m11 20-5-5 5-5"></path>
            </svg>
        </div>
    `;
}

function renderFilterOption(group, value, label, active, meta = "") {
    return `
        <button
            type="button"
            class="traveler-filter-option ${active ? "active" : ""}"
            data-filter-group="${group}"
            data-filter-value="${value}"
        >
            <span class="traveler-filter-option-check"></span>
            <span class="traveler-filter-option-copy">
                <strong>${label}</strong>
                ${meta ? `<small>${meta}</small>` : ""}
            </span>
        </button>
    `;
}

function renderSortButton(value, label, activeValue) {
    return `
        <button
            type="button"
            class="traveler-sort-button ${activeValue === value ? "active" : ""}"
            data-sort-value="${value}"
        >
            ${label}
        </button>
    `;
}

function renderFlightCard(flight, state) {
    const isSaved = state.savedFlights.has(flight.id);
    const isExpanded = state.expandedFlightId === flight.id;

    return `
        <article class="traveler-flight-card">
            <div class="traveler-flight-card-top">
                <div class="traveler-flight-brand">
                    <div class="traveler-airline-mark">${getAirlineInitials(flight.airline)}</div>
                    <div class="traveler-airline-copy">
                        <h3>${escapeHtml(flight.airline)}</h3>
                        <p>${escapeHtml(flight.code)}</p>
                    </div>
                </div>

                <button
                    type="button"
                    class="traveler-save-button ${isSaved ? "active" : ""}"
                    data-save-flight="${flight.id}"
                    aria-label="${isSaved ? "Remove saved flight" : "Save flight"}"
                >
                    <svg viewBox="0 0 24 24" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8">
                        <path d="m12 21-1.45-1.32C5.4 15.03 2 11.92 2 8.08 2 5 4.42 2.6 7.5 2.6c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 2.6C19.58 2.6 22 5 22 8.08c0 3.84-3.4 6.95-8.55 11.6z"></path>
                    </svg>
                </button>
            </div>

            <div class="traveler-flight-main">
                <div class="traveler-flight-times">
                    <div class="traveler-flight-terminal">
                        <strong>${escapeHtml(flight.departureTime)}</strong>
                        <span>${escapeHtml(flight.from)}</span>
                        <small>${escapeHtml(flight.fromCity)}</small>
                    </div>

                    <div class="traveler-flight-path">
                        <span class="traveler-flight-duration">${escapeHtml(flight.duration)}</span>
                        <div class="traveler-flight-line">
                            <span class="traveler-flight-line-dot"></span>
                            <span class="traveler-flight-line-plane">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                                    <path d="M2 16.5 22 12 2 7.5l5 4.5z"></path>
                                </svg>
                            </span>
                        </div>
                        <small>${escapeHtml(flight.stopLabel)}</small>
                    </div>

                    <div class="traveler-flight-terminal traveler-flight-terminal-arrival">
                        <strong>${escapeHtml(flight.arrivalTime)}</strong>
                        <span>${escapeHtml(flight.to)}</span>
                        <small>${escapeHtml(flight.toCity)}</small>
                    </div>
                </div>

                <div class="traveler-flight-price">
                    <span class="traveler-flight-badge">${getFlightBadge(flight)}</span>
                    <strong>₹${flight.price}</strong>
                    <small>per person</small>
                    <button type="button" class="traveler-details-button" data-toggle-details="${flight.id}">View Details</button>
                </div>
            </div>

            ${isExpanded ? `
                <div class="traveler-flight-details">
                    <div>
                        <span>Terminal</span>
                        <strong>${escapeHtml(flight.terminal)}</strong>
                    </div>
                    <div>
                        <span>Gate</span>
                        <strong>${escapeHtml(flight.gate)}</strong>
                    </div>
                    <div>
                        <span>Aircraft</span>
                        <strong>${escapeHtml(flight.aircraft)}</strong>
                    </div>
                </div>
            ` : ""}
        </article>
    `;
}

function getVisibleFlightsForDate(allFlightsByDate, state) {
    const dateFlights = Array.isArray(allFlightsByDate?.[state.selectedDate]) ? allFlightsByDate[state.selectedDate] : [];
    const validFlights = dateFlights.filter((flight) =>
        typeof flight.price === "number" &&
        typeof flight.durationMinutes === "number" &&
        typeof flight.stops === "number"
    );

    const filteredFlights = validFlights.filter((flight) => {
        if (flight.price > state.filters.price) {
            return false;
        }

        if (state.filters.stops.size) {
            const stopBucket = flight.stops >= 2 ? "2" : String(flight.stops);
            if (!state.filters.stops.has(stopBucket)) {
                return false;
            }
        }

        if (state.filters.time.size) {
            const hour = Number(String(flight.departureTime).split(":")[0]);
            const inEarlyWindow = hour >= 6 && hour < 12;
            const inLateWindow = hour >= 12 && hour < 24;

            if (
                !(state.filters.time.has("early") && inEarlyWindow) &&
                !(state.filters.time.has("late") && inLateWindow)
            ) {
                return false;
            }
        }

        return true;
    });

    const sortedFlights = [...filteredFlights];

    if (state.sortType === "cheapest") {
        sortedFlights.sort((left, right) => left.price - right.price);
    } else if (state.sortType === "fastest") {
        sortedFlights.sort((left, right) => left.durationMinutes - right.durationMinutes);
    } else {
        sortedFlights.sort((left, right) => getBestScore(left) - getBestScore(right));
    }

    return sortedFlights;
}

function getBestScore(flight) {
    return flight.price + flight.durationMinutes * 0.45 + flight.stops * 180;
}

function buildDateTabs(allFlightsByDate) {
    const entries = Object.entries(allFlightsByDate || {});
    if (!entries.length) {
        return [];
    }

    return entries
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, flights]) => {
            const current = new Date(`${date}T00:00:00`);
            const numericPrices = (Array.isArray(flights) ? flights : [])
                .map((flight) => flight.price)
                .filter((price) => typeof price === "number");

            return {
                value: date,
                day: current.toLocaleDateString("en-US", { weekday: "short" }),
                label: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                price: numericPrices.length ? Math.min(...numericPrices) : 0
            };
        });
}

function getDefaultSelectedDate(dateTabs) {
    return dateTabs.find((item) => item.value === "2026-06-15")?.value || dateTabs[0]?.value || "";
}

function getSearchValues() {
    const fallback = {
        from: "Chennai (MAA)",
        to: "Mumbai (BOM)",
        departure: "2026-06-15",
        returnDate: "",
        travellers: "1 Traveller, Economy",
        tripType: "One Way"
    };

    if (typeof localStorage === "undefined") {
        return fallback;
    }

    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
        const values = stored.values?.flights || {};

        return {
            from: values.from || fallback.from,
            to: values.to || fallback.to,
            departure: values.departure || fallback.departure,
            returnDate: values.returnDate || fallback.returnDate,
            travellers: values.travellers || fallback.travellers,
            tripType: stored.tripType || fallback.tripType
        };
    } catch (error) {
        return fallback;
    }
}

function readSavedFlights() {
    if (typeof localStorage === "undefined") {
        return [];
    }

    try {
        return JSON.parse(localStorage.getItem(SAVED_FLIGHTS_KEY) || "[]");
    } catch (error) {
        return [];
    }
}

function persistSavedFlights(savedFlights) {
    if (typeof localStorage === "undefined") {
        return;
    }

    localStorage.setItem(SAVED_FLIGHTS_KEY, JSON.stringify([...savedFlights]));
}

function toggleSetValue(setRef, value) {
    if (setRef.has(value)) {
        setRef.delete(value);
        return;
    }

    setRef.add(value);
}

function formatSearchDate(dateValue) {
    if (!dateValue) return "-";

    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return dateValue;
    }

    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function getFlightBadge(flight) {
    if (flight.tag === "best") {
        return "Best";
    }

    if (flight.tag === "cheapest") {
        return "Cheapest";
    }

    if (flight.tag === "fastest") {
        return "Fastest";
    }

    return "Popular";
}

function getAirlineInitials(name) {
    return String(name)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
