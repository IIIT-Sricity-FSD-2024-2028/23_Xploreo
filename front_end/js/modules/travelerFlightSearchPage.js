import { travelerData } from "../api/legacyData.js";

const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const SELECTED_FLIGHT_KEY = "traveler_selected_flight";
const FLIGHT_DETAIL_PAGE = "./traveller_flight-detail.html";

export function renderTravelerFlightSearchPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const state = getStoredSearchState();
    applyFlightSearchDefaults(state);
    const activeStops = new Set();
    let priceLimit = 2000;
    let sortMode = "Cheapest";
    let visibleCount = 4;
    let selectedDate = getInitialSelectedDate(state);
    let dateWindowStart = 0;
    const VISIBLE_DATE_CHIPS = 6;

    function render() {
        const routeFlights = getRouteFlights();
        const flights = getFilteredFlights(routeFlights);
        const searchValues = state.values?.flights || {};
        const routeMeta = getRouteMeta(searchValues);
        const allDates = buildDateChips(routeFlights, searchValues);
        const maxWindowStart = Math.max(0, allDates.length - VISIBLE_DATE_CHIPS);

        if (!allDates.some(item => item.value === selectedDate)) {
            selectedDate = allDates[0]?.value || selectedDate;
        }

        const selectedIndex = allDates.findIndex(item => item.value === selectedDate);
        if (selectedIndex >= 0) {
            if (selectedIndex < dateWindowStart) {
                dateWindowStart = selectedIndex;
            } else if (selectedIndex >= dateWindowStart + VISIBLE_DATE_CHIPS) {
                dateWindowStart = Math.max(0, Math.min(maxWindowStart, selectedIndex - VISIBLE_DATE_CHIPS + 1));
            }
        }

        dateWindowStart = Math.max(0, Math.min(maxWindowStart, dateWindowStart));
        const visibleDates = allDates.slice(dateWindowStart, dateWindowStart + VISIBLE_DATE_CHIPS);

        if (!visibleDates.some(item => item.value === selectedDate)) {
            selectedDate = visibleDates[0]?.value || selectedDate;
        }

        const limitedFlights = flights.slice(0, visibleCount);
        const hasMoreFlights = flights.length > visibleCount;

        container.innerHTML = `
            <main class="flight-search-page">
                <section class="flight-search-shell">
                    <div class="flight-search-topbar">
                        <div class="flight-search-summary-grid one-way-layout">
                            <div class="flight-search-field field-with-icon">
                                <span>From</span>
                                <strong>${getSummaryLocationLabel(searchValues.from || "Chennai (MAA)")}</strong>
                            </div>
                            <div class="flight-search-swap">→</div>
                            <div class="flight-search-field field-with-icon">
                                <span>To</span>
                                <strong>${getSummaryLocationLabel(searchValues.to || "Mumbai")}</strong>
                            </div>
                            <div class="flight-search-field field-with-icon">
                                <span>Departure</span>
                                <strong>${formatDate(searchValues.departure || selectedDate)}</strong>
                            </div>
                            <div class="flight-search-field field-with-icon traveler-count-field">
                                <span>Travellers</span>
                                <strong>${searchValues.travellers || "1 Traveller, Economy"}</strong>
                            </div>
                            <button class="flight-search-cta" id="flight-search-back-btn">Search</button>
                        </div>
                    </div>
                </section>

                <section class="flight-results-layout">
                    <aside class="flight-filters-card">
                        <h2>Filters</h2>

                        <div class="filter-block">
                            <div class="filter-head">
                                <span>Price Range</span>
                            </div>
                            <input
                                type="range"
                                min="500"
                                max="2000"
                                step="25"
                                value="${priceLimit}"
                                id="price-range-input"
                                class="flight-range-input"
                                style="--range-progress: ${getRangeProgress(priceLimit)}%;"
                            >
                            <div class="filter-range-values">
                                <span>₹0</span>
                                <strong>₹${priceLimit}</strong>
                            </div>
                        </div>

                        <div class="filter-block">
                            <span class="filter-title">Stops</span>
                            <div class="filter-pill-stack">
                                ${["Non-stop", "1 stop", "2+ stops"].map(stop => `
                                    <button class="filter-pill ${activeStops.has(stop) ? "active" : ""}" data-stop-filter="${stop}">${stop}</button>
                                `).join("")}
                            </div>
                        </div>
                    </aside>

                    <section class="flight-results-main">
                        <div class="date-strip-card">
                            <button class="date-nav-btn" data-date-nav="prev" aria-label="Previous dates">‹</button>
                            <div class="date-chip-rail-wrap">
                            <div class="date-chip-rail" id="date-chip-rail">
                                ${visibleDates.map(item => `
                                    <button class="date-chip ${item.value === selectedDate ? "active" : ""}" data-date-chip="${item.value}">
                                        <strong>${item.label}</strong>
                                        <span>₹${item.price}</span>
                                    </button>
                                `).join("")}
                            </div>
                            </div>
                            <button class="date-nav-btn" data-date-nav="next" aria-label="Next dates">›</button>
                        </div>

                        <div class="sort-bar">
                            ${["Cheapest", "Non-stop First", "Best", "Fastest"].map(mode => `
                                <button class="sort-chip ${sortMode === mode ? "active" : ""}" data-sort-mode="${mode}">${mode}</button>
                            `).join("")}
                        </div>

                        <p class="results-counter">Showing ${limitedFlights.length} of ${routeMeta?.totalCount || routeFlights.length} flights</p>

                        <div class="flight-card-list">
                            ${limitedFlights.length ? limitedFlights.map(flight => `
                                <article class="flight-result-card">
                                    <div class="flight-card-save-corner">
                                        <span class="save-chip">${getSaveLabel(flight, sortMode)}</span>
                                    </div>

                                    <div class="flight-card-left">
                                        <div class="airline-badge">${getAirlineCode(flight.airline)}</div>
                                        <div class="flight-airline-meta">
                                            <h3>${flight.airline}</h3>
                                            <p>${getFlightNumber(flight)}</p>
                                        </div>
                                    </div>

                                    <div class="flight-card-middle">
                                        <div class="flight-time-block flight-time-departure">
                                            <strong>${getDisplayTime(flight, "departure")}</strong>
                                            <span>${getResultsAirportCode(searchValues.from || flight.origin)}</span>
                                        </div>
                                        <div class="flight-duration-block">
                                            <div class="flight-duration-line">
                                                <span class="flight-line"></span>
                                                <span class="flight-line-plane">✈</span>
                                                <span class="flight-line"></span>
                                            </div>
                                            <strong>${flight.duration}</strong>
                                            <span>${flight.stops}</span>
                                        </div>
                                        <div class="flight-time-block flight-time-arrival">
                                            <strong>${getDisplayTime(flight, "arrival")}</strong>
                                            <span>${getResultsAirportCode(searchValues.to || flight.destination)}</span>
                                        </div>
                                    </div>

                                    <div class="flight-card-right">
                                        <div class="flight-price-panel">
                                            <strong>${formatMoney(flight.price)}</strong>
                                            <small>per person</small>
                                        </div>
                                        <button class="view-details-btn" data-flight-action="${flight.id}">View Details</button>
                                    </div>
                                </article>
                            `).join("") : `
                                <div class="flight-empty-state">
                                    <h3>No matching flights</h3>
                                    <p>Try another date, stop count, or a higher price range.</p>
                                </div>
                            `}
                        </div>

                        <div class="load-more-wrap">
                            ${hasMoreFlights ? `<button class="load-more-btn" id="load-more-flights-btn">Load More Flights</button>` : ""}
                        </div>
                    </section>
                </section>
            </main>
        `;

        bindEvents();
    }

    function getRouteFlights() {
        const searchValues = state.values?.flights || {};
        const matchedFlights = travelerData.searchCatalog.flights.filter(item =>
            includesText(item.origin, searchValues.from || item.origin) &&
            includesText(item.destination, searchValues.to || item.destination)
        );

        return matchedFlights.length ? matchedFlights : travelerData.searchCatalog.flights;
    }

    function getFilteredFlights(routeFlights) {
        let flights = [...routeFlights];

        flights = flights.filter(item => getNumericPrice(item.price) <= priceLimit);

        if (activeStops.size) {
            flights = flights.filter(item => activeStops.has(item.stops));
        }

        flights = flights.filter(item => item.departure === selectedDate || !selectedDate);

        if (sortMode === "Cheapest") {
            flights.sort((a, b) => getNumericPrice(a.price) - getNumericPrice(b.price));
        } else if (sortMode === "Fastest") {
            flights.sort((a, b) => getDurationMinutes(a.duration) - getDurationMinutes(b.duration));
        } else if (sortMode === "Non-stop First") {
            flights.sort((a, b) => getStopsRank(a.stops) - getStopsRank(b.stops) || getNumericPrice(a.price) - getNumericPrice(b.price));
        } else if (sortMode === "Best") {
            flights.sort((a, b) => getBestScore(a) - getBestScore(b));
        }

        return flights;
    }

    function bindEvents() {
        container.querySelector("#flight-search-back-btn")?.addEventListener("click", () => {
            state.values.flights.departure = selectedDate || state.values.flights.departure;

            if (typeof localStorage !== "undefined") {
                localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(state));
            }

            visibleCount = 4;
            render();

            container.querySelector(".flight-results-main")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        container.querySelector("#load-more-flights-btn")?.addEventListener("click", () => {
            visibleCount += 2;
            render();
        });

        container.querySelector("#price-range-input")?.addEventListener("input", (event) => {
            priceLimit = Number(event.target.value);
            visibleCount = 4;
            render();
        });

        container.querySelector("#price-range-input")?.addEventListener("wheel", (event) => {
            event.preventDefault();
            const step = 25;
            const direction = event.deltaY > 0 ? -step : step;
            const nextValue = Math.max(500, Math.min(2000, priceLimit + direction));

            if (nextValue !== priceLimit) {
                priceLimit = nextValue;
                visibleCount = 4;
                render();
            }
        }, { passive: false });

        container.querySelectorAll("[data-stop-filter]").forEach(button => {
            button.addEventListener("click", () => {
                const value = button.dataset.stopFilter;
                if (activeStops.has(value)) {
                    activeStops.delete(value);
                } else {
                    activeStops.add(value);
                }
                visibleCount = 4;
                render();
            });
        });

        container.querySelectorAll("[data-sort-mode]").forEach(button => {
            button.addEventListener("click", () => {
                sortMode = button.dataset.sortMode;
                render();
            });
        });

        container.querySelectorAll("[data-date-chip]").forEach(button => {
            button.addEventListener("click", () => {
                selectedDate = button.dataset.dateChip;
                visibleCount = 4;
                render();
            });
        });

        container.querySelectorAll("[data-date-nav]").forEach(button => {
            button.addEventListener("click", () => {
                const allDates = buildDateChips(getRouteFlights(), state.values?.flights || {});
                const maxWindowStart = Math.max(0, allDates.length - VISIBLE_DATE_CHIPS);
                const direction = button.dataset.dateNav === "next" ? 1 : -1;
                dateWindowStart = Math.max(0, Math.min(maxWindowStart, dateWindowStart + direction));

                const visibleDates = allDates.slice(dateWindowStart, dateWindowStart + VISIBLE_DATE_CHIPS);
                if (!visibleDates.some(item => item.value === selectedDate)) {
                    selectedDate = visibleDates[0]?.value || selectedDate;
                }

                visibleCount = 4;
                render();
            });
        });

        container.querySelectorAll("[data-flight-action]").forEach(button => {
            button.addEventListener("click", () => {
                const flight = travelerData.searchCatalog.flights.find(item => item.id === button.dataset.flightAction);
                if (!flight) {
                    showToast("Unable to open flight details right now.");
                    return;
                }

                const payload = buildSelectedFlightPayload(flight, state);
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(SELECTED_FLIGHT_KEY, JSON.stringify(payload));
                }
                window.location.href = `${FLIGHT_DETAIL_PAGE}?flight=${encodeURIComponent(flight.id)}`;
            });
        });

        const activeDateChip = container.querySelector(`[data-date-chip="${selectedDate}"]`);
        activeDateChip?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }

    render();
}

function getStoredSearchState() {
    if (typeof localStorage === "undefined") {
        return {};
    }

    try {
        return JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
    } catch (error) {
        console.warn("Unable to read traveler dashboard search state", error);
        return {};
    }
}

function applyFlightSearchDefaults(state) {
    state.tripType = state.tripType || "One Way";
    state.values = state.values || {};
    state.values.flights = state.values.flights || {};
    state.values.flights.from = state.values.flights.from || "Chennai (MAA)";
    state.values.flights.to = state.values.flights.to || "Mumbai";
    state.values.flights.departure = state.values.flights.departure || "2026-03-21";
    state.values.flights.returnDate = state.values.flights.returnDate || "2026-03-24";
    state.values.flights.travellers = state.values.flights.travellers || "1 Traveller, Economy";
}

function getInitialSelectedDate(state) {
    const routeFlights = getRouteFlightsForState(state);
    const requestedDate = state.values?.flights?.departure;
    const routeMeta = getRouteMeta(state.values?.flights || {});

    if (requestedDate && routeFlights.some(flight => flight.departure === requestedDate)) {
        return requestedDate;
    }

    return routeMeta?.defaultDate || routeFlights[0]?.departure || getFallbackDate();
}

function getRouteFlightsForState(state) {
    const searchValues = state.values?.flights || {};
    const matchedFlights = travelerData.searchCatalog.flights.filter(item =>
        includesText(item.origin, searchValues.from || item.origin) &&
        includesText(item.destination, searchValues.to || item.destination)
    );

    return matchedFlights.length ? matchedFlights : travelerData.searchCatalog.flights;
}

function buildDateChips(routeFlights, searchValues = {}) {
    const routeMeta = getRouteMeta(searchValues);
    if (routeMeta?.dateChips?.length) {
        return routeMeta.dateChips;
    }

    const flightsByDate = new Map();

    routeFlights.forEach(flight => {
        if (!flightsByDate.has(flight.departure)) {
            flightsByDate.set(flight.departure, []);
        }
        flightsByDate.get(flight.departure).push(flight);
    });

    return [...flightsByDate.keys()].sort().map(date => {
        const cheapest = Math.min(...flightsByDate.get(date).map(flight => getNumericPrice(flight.price)));
        return {
            value: date,
            label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            price: cheapest
        };
    });
}

function getFallbackDate() {
    return travelerData.searchCatalog.flights[0]?.departure || new Date().toISOString().split("T")[0];
}

function getRangeProgress(value) {
    const min = 500;
    const max = 2000;
    const clampedValue = Math.max(min, Math.min(max, Number(value) || min));
    return ((clampedValue - min) / (max - min)) * 100;
}

function includesText(source, input) {
    return String(source || "").toLowerCase().includes(String(input || "").toLowerCase());
}

function getRouteMeta(searchValues = {}) {
    const from = String(searchValues.from || "").toLowerCase();
    const to = String(searchValues.to || "").toLowerCase();

    if (from.includes("chennai") && to.includes("mumbai")) {
        return {
            defaultDate: "2026-03-21",
            totalCount: 47,
            dateChips: [
                { value: "2026-03-18", label: "Mar 18", price: 875 },
                { value: "2026-03-19", label: "Mar 19", price: 799 },
                { value: "2026-03-20", label: "Mar 20", price: 845 },
                { value: "2026-03-21", label: "Mar 21", price: 989 },
                { value: "2026-03-22", label: "Mar 22", price: 920 },
                { value: "2026-03-23", label: "Mar 23", price: 1099 },
                { value: "2026-03-24", label: "Mar 24", price: 1145 }
            ]
        };
    }

    return null;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-GB");
}

function getSummaryLocationLabel(value) {
    const raw = String(value || "").trim();

    if (!raw) return "";
    if (raw.toLowerCase().includes("chennai")) return "Chennai (NYC)";
    if (raw.toLowerCase().includes("mumbai")) return "Mumbai (BOM)";
    return raw;
}

function getNumericPrice(price) {
    return Number(String(price).replace(/[^\d]/g, ""));
}

function formatMoney(price) {
    return `₹${getNumericPrice(price)}`;
}

function getDurationMinutes(duration) {
    const match = duration.match(/(\d+)h\s*(\d+)m/);
    if (!match) return 9999;
    return Number(match[1]) * 60 + Number(match[2]);
}

function getHourFromTime(timeString) {
    const match = timeString.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!match) return 0;
    let hour = Number(match[1]);
    if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
    if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
    return hour;
}

function getDisplayTime(flight, type) {
    return type === "departure" ? flight.departureTime : flight.arrivalTime;
}

function getAirportCode(value) {
    const match = String(value).match(/\(([A-Z]{3})\)/);
    if (match) return match[1];
    return String(value).slice(0, 3).toUpperCase();
}

function getResultsAirportCode(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("chennai")) return "NYC";
    if (raw.includes("mumbai")) return "BOM";
    return getAirportCode(value);
}

function getAirlineCode(name) {
    return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function getFlightNumber(flight) {
    return flight.flightNumber || flight.id.toUpperCase();
}

function getBestScore(flight) {
    return getNumericPrice(flight.price) + getDurationMinutes(flight.duration) * 1.2 + getStopsRank(flight.stops) * 100;
}

function getSaveLabel(flight, sortMode) {
    const price = getNumericPrice(flight.price);
    if (price <= 799) return "Cheapest";
    if (flight.stops === "Non-stop") return "Save";
    if (price <= 989) return "Best Value";
    return "Popular";
}

function getStopsRank(stops) {
    if (stops === "Non-stop") return 0;
    if (stops === "1 stop") return 1;
    return 2;
}

function showToast(message) {
    let toast = document.getElementById("wishlist-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "wishlist-toast";
        toast.className = "toast-notification";
        toast.innerHTML = `<span id="toast-message"></span>`;
        document.body.appendChild(toast);
    }

    document.getElementById("toast-message").textContent = message;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
    }, 2400);
}

function buildSelectedFlightPayload(flight, state) {
    const searchValues = state.values?.flights || {};
    const passengers = parsePassengerSummary(searchValues.travellers || "1 Traveller, Economy");
    const baseFare = getNumericPrice(flight.price);
    const taxes = Math.round(baseFare * 0.12);
    const originalFare = baseFare + 150;

    return {
        id: flight.id,
        airline: flight.airline,
        flightNumber: getFlightNumber(flight),
        routeLabel: `${searchValues.from || flight.origin} → ${searchValues.to || flight.destination}`,
        fromLabel: searchValues.from || flight.origin,
        toLabel: searchValues.to || flight.destination,
        fromCode: getAirportCode(searchValues.from || flight.origin),
        toCode: getAirportCode(searchValues.to || flight.destination),
        departureDate: searchValues.departure || flight.departure,
        returnDate: searchValues.returnDate || "",
        departureTime: getDisplayTime(flight, "departure"),
        arrivalTime: getDisplayTime(flight, "arrival"),
        duration: flight.duration,
        stops: flight.stops,
        classType: flight.classType,
        price: baseFare,
        originalFare,
        taxes,
        passengers,
        baggage: "2 pieces (23kg each)",
        cancellation: "Free cancellation up to 24 hours before departure",
        confirmation: "Instant confirmation",
        heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1600",
        type: "Flight"
    };
}


function parsePassengerSummary(summary) {
    const countMatch = String(summary).match(/(\d+)/);
    const count = countMatch ? Number(countMatch[1]) : 1;
    return `${count} ${count === 1 ? "Adult" : "Adults"}`;
}
