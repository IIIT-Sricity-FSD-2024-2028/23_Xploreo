import { mapHotelToSearchCard } from "../api/adapters.js";
import { fetchHotels } from "../api/services.js";
import { getTodayDateString } from "../utils/locationAutocomplete.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=900";
const CITY_IMAGE = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=900";
const RESORT_IMAGE = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=900";

const SEARCH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
const LOCATION_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const CALENDAR_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
const HEART_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

export async function renderTravelerHotelSearchPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<main class="traveler-hotel-page"><div class="traveler-hotel-frame"><div class="traveler-hotel-empty">Loading hotels...</div></div></main>`;

    const params = new URLSearchParams(window.location.search);
    let storedState = {};
    try {
        storedState = JSON.parse(localStorage.getItem("traveler_dashboard_search_state") || "{}");
    } catch(e) {}
    const hotelVals = storedState.values?.hotels || {};

    const state = {
        query: params.get("hotel-city") || params.get("city") || hotelVals.city || "",
        checkin: params.get("hotel-checkin") || hotelVals.checkIn || "",
        checkout: params.get("hotel-checkout") || hotelVals.checkOut || "",
        guests: params.get("hotel-guests") || hotelVals.guestCount || "2",
        sort: "recommended",
        minPrice: 0,
        maxPrice: 10000,
        stars: "all"
    };
    const hotels = await loadHotels(state.query);
    state.maxPrice = getMaxPrice(hotels);

    render(container, hotels, state);
}

async function loadHotels(query = "") {
    return (await fetchHotels(query ? { location: query } : {}).catch((error) => {
        console.error("Failed to load hotels:", error);
        return [];
    })).map(mapHotelToSearchCard);
}

function render(container, hotels, state) {
    const visibleHotels = filterHotels(hotels, state);
    container.innerHTML = `
        <main class="traveler-hotel-page">
            <div class="traveler-hotel-frame">
                ${renderToolbar(state)}
                <div class="traveler-hotel-layout">
                    ${renderFilters(hotels, state)}
                    <section>
                        <div class="traveler-hotel-results-top">
                            <div class="traveler-hotel-results-heading">
                                <h1>Hotels</h1>
                                <p>${visibleHotels.length} stays${state.query ? ` near ${escapeHtml(state.query)}` : " ready for your trip"}</p>
                            </div>
                            <div class="traveler-hotel-sortbar">
                                <label for="hotel-sort">Sort by</label>
                                <div class="traveler-hotel-sort-wrap">
                                    <select id="hotel-sort" class="traveler-hotel-sort traveler-hotel-toolbar-select">
                                        <option value="recommended" ${state.sort === "recommended" ? "selected" : ""}>Recommended</option>
                                        <option value="price-low" ${state.sort === "price-low" ? "selected" : ""}>Lowest price</option>
                                        <option value="rating-high" ${state.sort === "rating-high" ? "selected" : ""}>Top rated</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        ${renderCategories(hotels)}
                        <div class="traveler-hotel-list">
                            ${visibleHotels.length ? visibleHotels.map(renderHotelCard).join("") : renderEmptyState(state)}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    `;

    bindEvents(container, hotels, state);
}

function renderToolbar(state) {
    const today = getTodayDateString();
    return `
        <form class="traveler-hotel-toolbar" id="hotel-search-form" novalidate>
            <label class="traveler-hotel-toolbar-field">
                ${LOCATION_ICON}
                <input class="traveler-hotel-toolbar-input" id="hotel-query" value="${escapeHtmlAttr(state.query)}" placeholder="City or hotel name">
            </label>
            <label class="traveler-hotel-toolbar-field">
                ${CALENDAR_ICON}
                <input class="traveler-hotel-toolbar-input traveler-hotel-toolbar-date" id="hotel-checkin-search" type="date" value="${escapeHtmlAttr(state.checkin)}" min="${today}">
            </label>
            <label class="traveler-hotel-toolbar-field">
                ${CALENDAR_ICON}
                <input class="traveler-hotel-toolbar-input traveler-hotel-toolbar-date" id="hotel-checkout-search" type="date" value="${escapeHtmlAttr(state.checkout)}" min="${today}">
            </label>
            <label class="traveler-hotel-toolbar-field">
                ${LOCATION_ICON}
                <input class="traveler-hotel-toolbar-input" id="hotel-guests-search" type="number" min="1" max="20" value="${escapeHtmlAttr(state.guests)}">
            </label>
            <button class="traveler-hotel-search-btn" type="submit">${SEARCH_ICON} Search</button>
        </form>
    `;
}

function renderFilters(hotels, state) {
    const maxPossiblePrice = getMaxPrice(hotels);
    return `
        <aside class="traveler-hotel-filters">
            <h2>Filters</h2>
            <div class="traveler-filter-group">
                <h3>Price range per night</h3>
                <div class="traveler-price-inputs" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <div style="flex:1">
                        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">Min Price</label>
                        <input id="hotel-min-price" type="number" min="0" max="${maxPossiblePrice}" value="${escapeHtmlAttr(state.minPrice)}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="flex:1">
                        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">Max Price</label>
                        <input id="hotel-max-price" type="number" min="0" max="${maxPossiblePrice}" value="${escapeHtmlAttr(state.maxPrice)}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>
            </div>
            <div class="traveler-filter-group">
                <h3>Hotel class</h3>
                <div class="traveler-filter-list" style="display:flex; flex-direction: column; gap: 8px;">
                    ${["all", "5", "4", "3", "2"].map((value) => `
                        <label class="traveler-filter-chip-new" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding: 10px; border-radius: 6px; border: 1px solid ${state.stars === value ? '#3b82f6' : '#e5e7eb'}; background: ${state.stars === value ? '#eff6ff' : '#fff'}; transition: all 0.2s;">
                            <input type="radio" name="hotel-star-filter" data-star-filter="${value}" ${state.stars === value ? "checked" : ""} style="cursor:pointer">
                            <span style="flex:1; font-weight: ${state.stars === value ? '600' : '400'}">${value === "all" ? "All stays" : `${value} Star`}</span>
                            <small style="color: #6b7280; font-size: 12px;">${countByStars(hotels, value)}</small>
                        </label>
                    `).join("")}
                </div>
            </div>
        </aside>
    `;
}

function renderCategories(hotels) {
    const cityCount = new Set(hotels.map((hotel) => hotel.city).filter(Boolean)).size;
    return `
        <div class="traveler-hotel-categories">
            <article class="traveler-hotel-category" style="background-image:url('${CITY_IMAGE}')">
                <div class="traveler-hotel-category-copy"><strong>City stays</strong><span>${cityCount} destinations</span></div>
            </article>
            <article class="traveler-hotel-category" style="background-image:url('${RESORT_IMAGE}')">
                <div class="traveler-hotel-category-copy"><strong>Resorts</strong><span>Pool, spa, nature</span></div>
            </article>
            <article class="traveler-hotel-category" style="background-image:url('${FALLBACK_IMAGE}')">
                <div class="traveler-hotel-category-copy"><strong>Top rated</strong><span>4.5+ guest score</span></div>
            </article>
            <article class="traveler-hotel-category" style="background-image:url('${CITY_IMAGE}')">
                <div class="traveler-hotel-category-copy"><strong>Flexible</strong><span>Easy cancellation</span></div>
            </article>
        </div>
    `;
}

function renderHotelCard(hotel) {
    const image = hotel.image || FALLBACK_IMAGE;
    return `
        <article class="traveler-hotel-card">
            <div class="traveler-hotel-media" style="background-image:url('${escapeHtmlAttr(image)}')">
                <span class="traveler-hotel-badge">${escapeHtml(hotel.category)}</span>
                <button class="traveler-hotel-fav" type="button" aria-label="Save hotel">${HEART_ICON}</button>
            </div>
            <div class="traveler-hotel-body">
                <h2>${escapeHtml(hotel.title)}</h2>
                <div class="traveler-hotel-rating">
                    <span class="traveler-rating-stars">${"★".repeat(Math.max(1, Math.min(5, hotel.stars || 4)))}</span>
                    <span class="traveler-rating-score">${escapeHtml(hotel.rating || "4.5")}</span>
                    <span>${Number(hotel.reviews || 0).toLocaleString()} reviews</span>
                </div>
                <div class="traveler-hotel-location">${LOCATION_ICON}<span>${escapeHtml(hotel.city || hotel.area || "Destination")}</span></div>
                <div class="traveler-hotel-tags">${(hotel.tags || []).slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
                <p class="traveler-hotel-description">${escapeHtml(hotel.description || "Comfortable stay with curated traveller support.")}</p>
                <div class="traveler-hotel-divider"></div>
                <div class="traveler-hotel-bottom">
                    <div style="font-size: 13px; color: ${hotel.availableRooms <= 5 ? '#e11d48' : '#16a34a'}; font-weight: 600; margin-bottom: 8px;">
                        ${hotel.availableRooms} rooms available
                    </div>
                    <div class="traveler-hotel-pricing">
                        <div class="traveler-hotel-old-price"><del>₹${Number(hotel.oldPrice || hotel.price).toLocaleString()}</del><span class="traveler-hotel-offer">${escapeHtml(hotel.offer)}</span></div>
                        <div class="traveler-hotel-price-line"><strong>₹${Number(hotel.price || 0).toLocaleString()}</strong><span>/ night</span></div>
                        <div class="traveler-hotel-taxes">+ ₹${Number(hotel.taxes || 0).toLocaleString()} taxes & fees</div>
                    </div>
                    <button class="traveler-hotel-cta" data-hotel-id="${escapeHtmlAttr(hotel.id)}" type="button">View rooms</button>
                </div>
            </div>
        </article>
    `;
}

function bindEvents(container, hotels, state) {
    container.querySelector("#hotel-search-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        state.query = readValue("hotel-query");
        state.checkin = readValue("hotel-checkin-search");
        state.checkout = readValue("hotel-checkout-search");
        state.guests = readValue("hotel-guests-search") || "1";
        container.querySelector(".traveler-hotel-list").innerHTML = `<div class="traveler-hotel-empty">Searching backend hotels...</div>`;
        const freshHotels = await loadHotels(state.query);
        state.maxPrice = getMaxPrice(freshHotels);
        state.stars = "all";
        render(container, freshHotels, state);
    });

    container.querySelector("#hotel-sort")?.addEventListener("change", (event) => {
        state.sort = event.target.value;
        render(container, hotels, state);
    });

    container.querySelector("#hotel-min-price")?.addEventListener("input", (event) => {
        state.minPrice = Number(event.target.value) || 0;
        render(container, hotels, state);
    });

    container.querySelector("#hotel-max-price")?.addEventListener("input", (event) => {
        state.maxPrice = Number(event.target.value) || getMaxPrice(hotels);
        render(container, hotels, state);
    });

    container.querySelectorAll("[data-star-filter]").forEach((input) => {
        input.addEventListener("change", () => {
            if (input.checked) {
                state.stars = input.dataset.starFilter;
                render(container, hotels, state);
            }
        });
    });

    container.querySelectorAll("[data-hotel-id]").forEach((button) => {
        button.addEventListener("click", () => {
            window.location.href = `./traveller_hotel-detail.html?hotel=${encodeURIComponent(button.dataset.hotelId)}`;
        });
    });

    container.querySelectorAll(".traveler-hotel-fav").forEach((button) => {
        button.addEventListener("click", () => button.classList.toggle("active"));
    });
}

function filterHotels(hotels, state) {
    const query = String(state.query || "").toLowerCase();
    return hotels
        .filter((hotel) => !query || [hotel.title, hotel.city, hotel.area].some((value) => String(value || "").toLowerCase().includes(query)))
        .filter((hotel) => {
            const price = Number(hotel.price || 0);
            return price >= Number(state.minPrice || 0) && price <= Number(state.maxPrice || Infinity);
        })
        .filter((hotel) => state.stars === "all" || Number(hotel.stars) === Number(state.stars))
        .sort((a, b) => {
            if (state.sort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
            if (state.sort === "rating-high") return Number(b.rating || 0) - Number(a.rating || 0);
            return Number(b.promoted) - Number(a.promoted) || Number(b.rating || 0) - Number(a.rating || 0);
        });
}

function renderEmptyState(state) {
    const city = state.query ? ` in ${escapeHtml(state.query)}` : "";
    return `
        <div class="traveler-hotel-empty">
            <h2>No backend hotels found${city}</h2>
            <p>Ask the hotel service partner to add an active hotel for this city, then search again. Partner-created hotels appear here from <code>GET /api/hotels</code>.</p>
        </div>
    `;
}

function countByStars(hotels, value) {
    if (value === "all") return hotels.length;
    return hotels.filter((hotel) => Number(hotel.stars) === Number(value)).length;
}

function getMaxPrice(hotels) {
    return Math.max(100, ...hotels.map((hotel) => Number(hotel.price || 0)));
}

function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeHtmlAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
}
