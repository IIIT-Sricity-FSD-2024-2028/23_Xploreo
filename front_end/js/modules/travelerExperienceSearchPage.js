import { attachLocationAutocomplete, getTodayDateString, extractUniqueLocations } from "../utils/locationAutocomplete.js";
import { fetchExperiences } from "../api/services.js";
import { mapExperienceToSearchCard } from "../api/adapters.js";

const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const WISHLIST_STORAGE_KEY = "traveler_wishlist";
const SELECTED_EXPERIENCE_KEY = "traveler_selected_experience";

let EXPERIENCE_RESULTS = null;

export async function renderTravelerExperienceSearchPage(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="traveler-experience-empty">Loading experiences...</div>`;
    }
    try {
        const experiences = await fetchExperiences();
        EXPERIENCE_RESULTS = experiences.map(normalizeExperience);
    } catch (error) {
        if (container) {
            container.innerHTML = `<div class="traveler-experience-empty">Unable to load experiences right now.</div>`;
        }
        return;
    }
    if (!container) return;

    const state = {
        searchValues: getSearchValues(),
        maxPrice: 100000,
        selectedCategories: new Set(),
        selectedDurations: new Set()
    };

    function render() {
        const { items, matchMode } = getFilteredExperiences(state);
        const headline = getHeadline(state.searchValues.destination, items.length, matchMode);

        container.innerHTML = `
            <main class="traveler-experience-page">
                <div class="traveler-experience-frame">
                    <section class="traveler-experience-toolbar">
                        ${renderTextField("destination", "Destination / Activity", state.searchValues.destination, "Search destination or activity")}
                        ${renderDateField("activityDate", "Date (Optional)", state.searchValues.activityDate)}
                        <button class="traveler-experience-search-btn" type="button" id="traveler-experience-search-btn">
                            ${searchIcon()}
                            <span>SEARCH</span>
                        </button>
                    </section>

                    <section class="traveler-experience-layout">
                        <aside class="traveler-experience-filters">
                            <h2>Filters</h2>

                            <div class="traveler-experience-filter-group">
                                <h3>Price Range</h3>
                                <div class="traveler-experience-slider-wrap">
                                    <input id="traveler-experience-price" type="range" min="0" max="100000" step="500" value="${state.maxPrice}">
                                </div>
                                <div class="traveler-experience-slider-labels">
                                    <span>₹0</span>
                                    <span class="active-label">${formatCurrency(state.maxPrice)}</span>
                                    <span>₹100,000</span>
                                </div>
                            </div>

                            <div class="traveler-experience-filter-group">
                                <h3>Category</h3>
                                <div class="traveler-experience-check-list">
                                    ${renderCategoryCheck("Tours", state.selectedCategories.has("Tours"))}
                                    ${renderCategoryCheck("Adventure", state.selectedCategories.has("Adventure"))}
                                    ${renderCategoryCheck("Culture", state.selectedCategories.has("Culture"))}
                                    ${renderCategoryCheck("Water Activities", state.selectedCategories.has("Water Activities"))}
                                    ${renderCategoryCheck("Attraction Tickets", state.selectedCategories.has("Attraction Tickets"))}
                                    ${renderCategoryCheck("Cruises", state.selectedCategories.has("Cruises"))}
                                </div>
                            </div>

                            <div class="traveler-experience-filter-group traveler-experience-filter-group-last">
                                <h3>Duration</h3>
                                <div class="traveler-experience-check-list">
                                    ${renderDurationCheck("short", "Short (<3 hours)", state.selectedDurations.has("short"))}
                                    ${renderDurationCheck("half", "Half Day", state.selectedDurations.has("half"))}
                                    ${renderDurationCheck("full", "Full Day", state.selectedDurations.has("full"))}
                                </div>
                            </div>
                        </aside>

                        <section class="traveler-experience-results">
                            <div class="traveler-experience-results-meta">${escapeHtml(headline)}</div>

                            ${items.length ? `
                                <div class="traveler-experience-grid">
                                    ${items.map(renderExperienceCard).join("")}
                                </div>
                            ` : `
                                <div class="traveler-experience-empty">No experiences found for the selected filters.</div>
                            `}
                        </section>
                    </section>
                </div>
            </main>
        `;

        bindEvents();
        attachExperienceSearchAutocomplete(container);
    }

    function bindEvents() {
        container.querySelectorAll("[data-experience-field]").forEach((field) => {
            field.addEventListener("input", () => {
                state.searchValues = normalizeSearchValues({
                    ...state.searchValues,
                    [field.dataset.experienceField]: field.value
                });
            });

            field.addEventListener("change", () => {
                state.searchValues = normalizeSearchValues({
                    ...state.searchValues,
                    [field.dataset.experienceField]: field.value
                });
            });
        });

        container.querySelector("#traveler-experience-search-btn")?.addEventListener("click", () => {
            state.searchValues = normalizeSearchValues(state.searchValues);
            persistSearchValues(state.searchValues);
            render();
        });

        container.querySelector("#traveler-experience-price")?.addEventListener("input", (event) => {
            state.maxPrice = Number(event.target.value);
            render();
        });

        container.querySelectorAll("[data-experience-category]").forEach((input) => {
            input.addEventListener("change", () => {
                const value = input.dataset.experienceCategory;
                if (state.selectedCategories.has(value)) {
                    state.selectedCategories.delete(value);
                } else {
                    state.selectedCategories.add(value);
                }
                render();
            });
        });

        container.querySelectorAll("[data-experience-duration]").forEach((input) => {
            input.addEventListener("change", () => {
                const value = input.dataset.experienceDuration;
                if (state.selectedDurations.has(value)) {
                    state.selectedDurations.delete(value);
                } else {
                    state.selectedDurations.add(value);
                }
                render();
            });
        });

        container.querySelectorAll("[data-experience-wishlist]").forEach((button) => {
            button.addEventListener("click", () => {
                const item = EXPERIENCE_RESULTS.find((entry) => entry.id === button.dataset.experienceWishlist);
                if (!item) return;
                toggleWishlist(item);
                render();
            });
        });

        container.querySelectorAll("[data-experience-details]").forEach((button) => {
            button.addEventListener("click", () => {
                const item = EXPERIENCE_RESULTS.find((entry) => entry.id === button.dataset.experienceDetails);
                if (!item) return;
                persistSelectedExperience(item);
                window.location.href = `./traveller_experience-detail.html?experience=${encodeURIComponent(item.id)}`;
            });
        });
    }

    render();
    attachExperienceSearchAutocomplete(container);
}

function attachExperienceSearchAutocomplete(container) {
    const experienceDests = extractUniqueLocations(EXPERIENCE_RESULTS || [], ["destination"]);

    const destInput = container?.querySelector('[data-experience-field="destination"]');
    if (!destInput) return;
    if (!destInput.id) destInput.id = "experience-dest-search";
    attachLocationAutocomplete(destInput.id, experienceDests, (val) => {
        destInput.value = val;
        destInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

function getDisplayCategory(backendCategory) {
    if (!backendCategory) return "Tours";
    const mapping = {
        'adventure': 'Adventure',
        'culture': 'Culture',
        'culinary': 'Culture',
        'wellness': 'Culture',
        'wildlife': 'Adventure',
        'photography': 'Culture'
    };
    const key = String(backendCategory).toLowerCase();
    return mapping[key] || (backendCategory.charAt(0).toUpperCase() + backendCategory.slice(1));
}

function normalizeExperience(item, index) {
    const priceValue = extractAmount(item.price);
    const title = String(item.title || "Signature Experience").trim();
    const destination = String(item.destination || "Explore").trim();
    const rawCategory = item.category || inferCategory(title, destination, index);
    const category = getDisplayCategory(rawCategory);
    const durationHours = item.durationHours ? Number(item.durationHours) : extractDurationHours(item.time);
    const originalPrice = 0;

    return {
        id: item.id || `experience-${index + 1}`,
        destination,
        title,
        image: item.image || getFallbackImage(category, destination, index),
        gallery: Array.isArray(item.gallery) && item.gallery.length ? item.gallery : [item.image || getFallbackImage(category, destination, index)],
        location: item.location || `${destination} Activity Zone`,
        durationLabel: item.time || `${durationHours} hours`,
        durationBucket: getDurationBucket(durationHours),
        durationHours,
        rating: Number(item.rating) || 0.0,
        reviews: Number(item.reviews) || 0,
        price: priceValue || 59,
        originalPrice,
        discount: 0,
        category: category,
        capacity: Number(item.capacity) || 12,
        perks: Array.isArray(item.perks) && item.perks.length ? item.perks : (item.partnerId === "experience-partner-seed" ? getPerksForCategory(category, title) : []),
        customizable: Boolean(item.customizable),
        description: item.description || [],
        audience: item.audience || [],
        expectations: item.expectations || [],
        highlights: item.highlights || [],
        options: item.options || [],
        cancellation: item.cancellation || [],
        bring: item.bring || [],
        requirements: item.requirements || []
    };
}

function normalizeWorkspaceExperience(booking, activity, bookingIndex, activityIndex) {
    const title = String(activity || "Local Experience").trim();
    const destination = String(booking.destination || booking.title || "Explore")
        .split(",")[0]
        .trim();
    const category = inferCategory(title, destination, bookingIndex + activityIndex);
    const price = estimateWorkspacePrice(category, activityIndex);
    const durationHours = estimateWorkspaceDuration(category, activityIndex);
    const originalPrice = price + (category === "Tours" ? 20 : 30);

    return {
        id: `${booking.id}-${activityIndex + 1}`,
        destination,
        title: toDisplayTitle(title),
        image: booking.coverImage || getFallbackImage(category, destination, activityIndex),
        gallery: [
            booking.coverImage || getFallbackImage(category, destination, activityIndex),
            getFallbackImage(category, destination, activityIndex + 1),
            getFallbackImage(category, destination, activityIndex + 2)
        ],
        location: booking.destination,
        durationLabel: `${durationHours} hours`,
        durationBucket: getDurationBucket(durationHours),
        durationHours,
        rating: 0.0,
        reviews: 0,
        price,
        originalPrice: price,
        discount: 0,
        category,
        perks: getPerksForCategory(category, title),
        customizable: true,
        description: [
            `Enjoy ${toDisplayTitle(title)} as part of a curated ${destination} traveler experience.`,
            "This activity is adapted from traveler workspace mock data and presented with flexible booking options."
        ],
        audience: ["Travelers looking for a curated local experience", "Couples, friends, and small groups"],
        expectations: [
            { icon: "compass", title: "Curated Experience", desc: "Well-paced activity built around the destination." },
            { icon: "check", title: "Flexible Support", desc: "Simple booking flow with clear inclusions." }
        ],
        highlights: [
            { icon: "sparkle", title: "Traveler Favorite", desc: "A popular activity from recent workspace trips." },
            { icon: "check", title: "Instant Confirmation", desc: "Quick and easy booking support." }
        ],
        options: [
            {
                id: `${booking.id}-${activityIndex + 1}-standard`,
                title: "Standard Option",
                time: `${Math.max(8, 9 + activityIndex)}:00 AM - ${Math.max(11, 12 + activityIndex)}:00 PM`,
                price,
                popular: true,
                features: getPerksForCategory(category, title)
            }
        ],
        cancellation: ["Free cancellation up to 24 hours before start time"],
        bring: ["Comfortable clothing", "Phone or camera", "Water bottle"],
        requirements: ["Please arrive 15 minutes before the start time"]
    };
}

function persistSelectedExperience(item) {
    if (typeof localStorage === "undefined") return;

    try {
        localStorage.setItem(SELECTED_EXPERIENCE_KEY, JSON.stringify(item));
    } catch (error) {
        console.warn("Unable to store selected experience", error);
    }
}

function getSearchValues() {
    const fallback = {
        destination: "",
        activityDate: ""
    };

    if (typeof localStorage === "undefined") {
        return fallback;
    }

    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
        const values = stored.values?.experiences || {};
        return normalizeSearchValues({
            destination: values.destination || fallback.destination,
            activityDate: values.activityDate || fallback.activityDate
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
        stored.values.experiences = { ...searchValues };
        localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
        console.warn("Unable to persist experience search values", error);
    }
}

function getFilteredExperiences(state) {
    const destinationTerm = normalizeText(state.searchValues.destination);

    const exactMatches = EXPERIENCE_RESULTS.filter((item) =>
        includesText(item.destination, destinationTerm) || includesText(item.title, destinationTerm)
    );

    const basePool = { items: exactMatches, matchMode: "destination" };

    const items = basePool.items
        .filter((item) => item.price <= state.maxPrice)
        .filter((item) => !state.selectedCategories.size || state.selectedCategories.has(item.category))
        .filter((item) => !state.selectedDurations.size || state.selectedDurations.has(item.durationBucket));

    return {
        items,
        matchMode: basePool.matchMode
    };
}

function getHeadline(destination, count, matchMode) {
    if (!count) {
        return `No experiences matched ${destination || "your search"} after applying filters.`;
    }

    if (matchMode === "all") {
        return `No exact matches found. Showing other popular experiences${destination ? ` near ${destination}` : ""}.`;
    }

    return `Showing activities in ${destination || "your selected destination"}`;
}

function normalizeSearchValues(values) {
    return {
        destination: String(values.destination || "").trim(),
        activityDate: values.activityDate || ""
    };
}

function renderTextField(field, label, value, placeholder) {
    return `
        <label class="traveler-experience-toolbar-field">
            <span class="traveler-experience-toolbar-label">${label}</span>
            <span class="traveler-experience-toolbar-row">
                ${locationIcon()}
                <input type="text" class="traveler-experience-toolbar-input" data-experience-field="${field}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
            </span>
        </label>
    `;
}

function renderDateField(field, label, value) {
    return `
        <label class="traveler-experience-toolbar-field">
            <span class="traveler-experience-toolbar-label">${label}</span>
            <span class="traveler-experience-toolbar-row">
                ${calendarIcon()}
                <input type="date" class="traveler-experience-toolbar-input traveler-experience-toolbar-date" data-experience-field="${field}" value="${escapeHtml(value)}" min="${getTodayDateString()}">
            </span>
        </label>
    `;
}

function renderCategoryCheck(value, checked) {
    return `
        <label class="traveler-experience-check">
            <input type="checkbox" data-experience-category="${escapeHtml(value)}" ${checked ? "checked" : ""}>
            <span>${escapeHtml(value)}</span>
        </label>
    `;
}

function renderDurationCheck(value, label, checked) {
    return `
        <label class="traveler-experience-check">
            <input type="checkbox" data-experience-duration="${value}" ${checked ? "checked" : ""}>
            <span>${escapeHtml(label)}</span>
        </label>
    `;
}

function renderExperienceCard(item) {
    const wishlisted = getWishlistItems().some((entry) => entry.title === item.title);

    return `
        <article class="traveler-experience-card">
            <div class="traveler-experience-card-media" style="background-image:url('${item.image}')">
                ${item.discount ? `<span class="traveler-experience-discount">${item.discount}% OFF</span>` : ""}
                <span class="traveler-experience-tag">${tagIcon()} ${escapeHtml(item.category)}</span>
                <button class="traveler-experience-fav ${wishlisted ? "active" : ""}" type="button" data-experience-wishlist="${item.id}" aria-label="Save experience">
                    ${heartIcon()}
                </button>
            </div>

            <div class="traveler-experience-card-body">
                <h3>${escapeHtml(item.title)}</h3>
                <p class="traveler-experience-duration">${clockIcon()} ${escapeHtml(item.durationLabel)}</p>
                <p class="traveler-experience-description" style="color: #666; font-size: 0.9em; margin: 8px 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHtml(Array.isArray(item.description) ? item.description.join(" ") : (item.description || item.title))}</p>

                <ul class="traveler-experience-perks">
                    ${item.perks.map((perk) => `<li>${checkIcon()} ${escapeHtml(perk)}</li>`).join("")}
                </ul>

                <div class="traveler-experience-rating">
                    <span>${starIcon()} ${item.rating.toFixed(1)}</span>
                    <small>(${item.reviews} reviews)</small>
                </div>

                <div class="traveler-experience-card-footer">
                    <div class="traveler-experience-pricing">
                        <small>From (per adult)</small>
                        <div class="traveler-experience-price-row">
                            <strong>${formatCurrency(item.price)}</strong>
                            ${item.originalPrice ? `<span>${formatCurrency(item.originalPrice)}</span>` : ""}
                        </div>
                    </div>

                    <button class="traveler-experience-view-btn" type="button" data-experience-details="${item.id}">View Details</button>
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
        showExperienceToast("Removed from Wishlist");
        return;
    }

    wishlist.push({
        title: item.title,
        location: `${item.destination} Experience`,
        image: item.image,
        likes: Math.max(18, item.price)
    });

    saveWishlistItems(wishlist);
    showExperienceToast("Added to Wishlist");
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

function showExperienceToast(message) {
    const existing = document.querySelector(".traveler-experience-toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = "traveler-experience-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("visible");
    });

    window.setTimeout(() => {
        toast.classList.remove("visible");
        window.setTimeout(() => toast.remove(), 180);
    }, 1800);
}

function inferCategory(title, destination, index) {
    const text = `${title} ${destination}`.toLowerCase();

    if (text.includes("div") || text.includes("scuba") || text.includes("snorkel")) return "Water Activities";
    if (text.includes("ticket") || text.includes("museum") || text.includes("pass")) return "Attraction Tickets";
    if (text.includes("cruise") || text.includes("sunset")) return "Cruises";
    if (text.includes("walk") || text.includes("food") || text.includes("temple") || text.includes("tea") || text.includes("culture")) return "Culture";
    if (text.includes("safari") || text.includes("hiking") || text.includes("balloon") || text.includes("zip")) return "Adventure";

    return index % 2 === 0 ? "Tours" : "Adventure";
}

function getPerksForCategory(category, title) {
    if (category === "Water Activities") return ["Equipment Included", "Professional Guide", "All Levels Welcome"];
    if (category === "Attraction Tickets") return ["Skip the Line", "Mobile Ticket", "Instant Confirmation"];
    if (category === "Cruises") return ["Buffet Dinner", "Live Music", "Complimentary Drinks"];
    if (category === "Culture") return ["Local Guide", "Storytelling Stops", "Free Cancellation"];
    if (category === "Adventure") return title.toLowerCase().includes("balloon")
        ? ["Free Cancellation", "Live Guide", "Breakfast Included"]
        : ["Hotel Pickup", "Safety Gear", "Lunch Included"];

    return ["Small Group", "Local Snacks", "Photo Stops"];
}

function estimateWorkspacePrice(category, index) {
    if (category === "Attraction Tickets") return 45 + index * 10;
    if (category === "Water Activities") return 89 + index * 20;
    if (category === "Cruises") return 79 + index * 16;
    if (category === "Adventure") return 129 + index * 20;
    return 35 + index * 18;
}

function estimateWorkspaceDuration(category, index) {
    if (category === "Attraction Tickets") return 2 + index;
    if (category === "Water Activities") return 4 + index;
    if (category === "Cruises") return 3 + index;
    if (category === "Adventure") return 5 + index;
    return 3 + index;
}

function getDurationBucket(hours) {
    if (hours < 3) return "short";
    if (hours <= 6) return "half";
    return "full";
}

function extractDurationHours(value) {
    const match = String(value || "").match(/(\d+)/);
    return match ? Number(match[1]) : 4;
}

function extractAmount(value) {
    const match = String(value || "").replace(/,/g, "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
}

function toDisplayTitle(value) {
    return String(value || "")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function includesText(source, query) {
    return normalizeText(source).includes(normalizeText(query));
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function getFallbackImage(category, destination, index) {
    const pools = {
        Tours: [
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200"
        ],
        Adventure: [
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=1200"
        ],
        Culture: [
            "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&q=80&w=1200"
        ],
        "Water Activities": [
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200"
        ],
        "Attraction Tickets": [
            "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1200"
        ],
        Cruises: [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&q=80&w=1200"
        ]
    };

    const options = pools[category] || pools.Tours;
    return options[index % options.length];
}

function locationIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

function calendarIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
}

function searchIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
}

function tagIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m20.59 13.41-7.17 7.18a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><path d="M7 7h.01"></path></svg>`;
}

function heartIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
}

function clockIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
}

function checkIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 4 4L19 6"></path></svg>`;
}

function starIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.93 5.93 6.55.95-4.74 4.62 1.12 6.53L12 17.47l-5.86 3.06 1.12-6.53-4.74-4.62 6.55-.95L12 2.5z"></path></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
