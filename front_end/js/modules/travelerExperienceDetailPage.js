const travelerData = (() => { try { return JSON.parse(localStorage.getItem("travelerData") || "{}"); } catch { return {}; } })();

const SELECTED_EXPERIENCE_KEY = "traveler_selected_experience";
const EXPERIENCE_BOOKING_DRAFT_KEY = "traveler_experience_booking_draft";

export function renderTravelerExperienceDetailPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const experience = getSelectedExperience();
    if (!experience) {
        container.innerHTML = `
            <main class="traveler-experience-detail-page">
                <section class="traveler-experience-detail-frame traveler-experience-empty">
                    <h1>No experience selected</h1>
                    <p>Choose an experience from the search page to view its full details.</p>
                    <a href="./traveller_experience-search.html">Go to experiences</a>
                </section>
            </main>
        `;
        return;
    }

    const state = {
        experience,
        activeImage: experience.gallery[0] || experience.image,
        activeTab: "about",
        adults: 2,
        selectedDate: getDefaultDate(),
        selectedOptionId: getDefaultOptionId(experience),
        galleryOpen: false,
        wishlisted: isWishlisted(experience)
    };

    function isExperienceCompleted() {
        const status = new URLSearchParams(window.location.search).get("status")?.trim().toLowerCase();
        return status === "completed" || status === "upcoming";
    }

    function render() {
        const isCompleted = isExperienceCompleted();
        const selectedOption = getSelectedOption(state);
        const total = selectedOption.price * state.adults;

        container.innerHTML = `
            <main class="traveler-experience-detail-page">
                <section class="traveler-experience-detail-frame traveler-experience-detail-header">
                    <div class="traveler-experience-detail-top">
                        <div>
                            <h1>${escapeHtml(state.experience.title)}</h1>
                            <div class="traveler-experience-meta">
                                <strong>${starIcon()} ${Number(state.experience.rating).toFixed(1)}</strong>
                                <span>(${state.experience.reviews} reviews)</span>
                                <span>${locationPinIcon()} ${escapeHtml(state.experience.location || state.experience.destination)}</span>
                                <span>${clockIcon()} ${escapeHtml(state.experience.durationLabel)}</span>
                            </div>
                            <div class="traveler-experience-pill-row">
                                ${state.experience.customizable ? `<span class="traveler-experience-pill traveler-experience-pill-success">${checkCircleIcon()} Customizable</span>` : ""}
                                <span class="traveler-experience-pill traveler-experience-pill-info">${infoCircleIcon()} Duration: ${escapeHtml(state.experience.durationLabel)}</span>
                            </div>
                        </div>
                        <div class="traveler-experience-header-actions">
                            <button type="button" id="traveler-experience-favorite-btn" aria-label="Save experience">${heartOutlineIcon()}</button>

                        </div>
                    </div>

                </section>

                <section class="traveler-experience-detail-layout">
                    <div class="traveler-experience-main">
                        <section class="traveler-experience-gallery-block">
                            <div class="traveler-experience-hero-media traveler-experience-detail-frame">
                                <img src="${escapeHtml(state.activeImage)}" alt="${escapeHtml(state.experience.title)}">
                                <button class="traveler-experience-gallery-button" type="button" id="traveler-experience-gallery-btn">
                                    ${galleryIcon()}
                                    <span>View Gallery</span>
                                </button>
                            </div>
                            <div class="traveler-experience-thumb-grid">
                                ${state.experience.gallery.map((image) => `
                                    <button class="traveler-experience-thumb ${image === state.activeImage ? "active" : ""}" type="button" data-gallery-image="${escapeHtml(image)}">
                                        <img src="${escapeHtml(image)}" alt="${escapeHtml(state.experience.title)} gallery image">
                                    </button>
                                `).join("")}
                            </div>
                        </section>

                        <section class="traveler-experience-sections">
                            <div class="traveler-experience-tabs">
                                ${renderTab("about", "About", state.activeTab)}
                                ${renderTab("highlights", "Highlights", state.activeTab)}
                                ${renderTab("options", "Activity Options", state.activeTab)}
                                ${renderTab("important", "Important Info", state.activeTab)}
                            </div>
                            ${renderActiveSection(state, selectedOption)}
                        </section>
                    </div>

                    <aside class="traveler-experience-sidebar">
                        <h3>Starting from (per adult)</h3>
                        <div class="traveler-experience-price">${formatCurrency(selectedOption.price)}</div>
                        <div class="traveler-experience-sidebar-note">Free cancellation up to 24 hours</div>

                        <label class="traveler-experience-side-field">
                            <span class="traveler-experience-side-label">${calendarIcon()} Select Date</span>
                            <input class="traveler-experience-side-input" type="date" id="traveler-experience-date" value="${escapeHtml(state.selectedDate)}" ${isCompleted ? "disabled" : ""}>
                        </label>

                        <div class="traveler-experience-side-field">
                            <span class="traveler-experience-side-label">${usersIcon()} Number of Adults</span>
                            <div class="traveler-experience-side-stepper">
                                <button type="button" id="traveler-adults-decrease" ${isCompleted ? "disabled" : ""}>-</button>
                                <div>${state.adults} ${state.adults === 1 ? "Adult" : "Adults"}</div>
                                <button type="button" id="traveler-adults-increase" ${isCompleted ? "disabled" : ""}>+</button>
                            </div>
                        </div>

                        <div class="traveler-experience-selected-option">
                            <span>Selected Option</span>
                            <strong>${escapeHtml(selectedOption.title)}</strong>
                            <p>${escapeHtml(selectedOption.time)}</p>
                        </div>

                        <div class="traveler-experience-side-total-row">
                            <span>${formatCurrency(selectedOption.price)} × ${state.adults} ${state.adults === 1 ? "adult" : "adults"}</span>
                            <strong>${formatCurrency(total)}</strong>
                        </div>
                        <div class="traveler-experience-side-total">
                            <span>Total Amount</span>
                            <strong>${formatCurrency(total)}</strong>
                        </div>

                        ${isCompleted ? `<div class="traveler-experience-completed-note">This experience has already been completed. The details are shown for your reference.</div>` : `<button class="traveler-experience-continue-btn" type="button" id="traveler-experience-continue-btn">Continue</button>`}

                        <ul class="traveler-experience-side-list">
                            <li>${checkCircleIcon()} Free cancellation available</li>
                            <li>${checkCircleIcon()} Instant confirmation</li>
                            <li>${checkCircleIcon()} Best price guarantee</li>
                        </ul>
                    </aside>
                </section>

                <div class="traveler-experience-gallery-modal ${state.galleryOpen ? "open" : ""}" id="traveler-experience-gallery-modal">
                    <div class="traveler-experience-gallery-modal-content">
                        <div class="traveler-experience-gallery-modal-top">
                            <h3>${escapeHtml(state.experience.title)} Gallery</h3>
                            <button class="traveler-experience-gallery-close" type="button" id="traveler-experience-gallery-close">×</button>
                        </div>
                        <div class="traveler-experience-gallery-modal-grid">
                            ${state.experience.gallery.map((image) => `<img src="${escapeHtml(image)}" alt="${escapeHtml(state.experience.title)}">`).join("")}
                        </div>
                    </div>
                </div>
            </main>
        `;

        bindEvents();
    }

    function bindEvents() {
        container.querySelectorAll("[data-experience-tab]").forEach((button) => {
            button.addEventListener("click", () => {
                state.activeTab = button.dataset.experienceTab;
                render();
            });
        });

        container.querySelectorAll("[data-gallery-image]").forEach((button) => {
            button.addEventListener("click", () => {
                state.activeImage = button.dataset.galleryImage;
                render();
            });
        });

        const isCompleted = isExperienceCompleted();

        if (!isCompleted) {
            container.querySelectorAll("[data-experience-option]").forEach((button) => {
                button.addEventListener("click", () => {
                    state.selectedOptionId = button.dataset.experienceOption;
                    render();
                });
            });
        }

        container.querySelector("#traveler-adults-decrease")?.addEventListener("click", () => {
            state.adults = Math.max(1, state.adults - 1);
            render();
        });

        container.querySelector("#traveler-adults-increase")?.addEventListener("click", () => {
            state.adults = Math.min(12, state.adults + 1);
            render();
        });

        container.querySelector("#traveler-experience-date")?.addEventListener("change", (event) => {
            state.selectedDate = event.target.value || getDefaultDate();
        });

        container.querySelector("#traveler-experience-gallery-btn")?.addEventListener("click", () => {
            state.galleryOpen = true;
            render();
        });

        container.querySelector("#traveler-experience-gallery-close")?.addEventListener("click", () => {
            state.galleryOpen = false;
            render();
        });

        container.querySelector("#traveler-experience-gallery-modal")?.addEventListener("click", (event) => {
            if (event.target.id === "traveler-experience-gallery-modal") {
                state.galleryOpen = false;
                render();
            }
        });

        container.querySelector("#traveler-experience-favorite-btn")?.addEventListener("click", () => {
            toggleWishlist(state.experience);
            state.wishlisted = isWishlisted(state.experience);
            showToast(state.wishlisted ? "Added to Wishlist" : "Removed from Wishlist");
        });

        container.querySelector("#traveler-experience-share-btn")?.addEventListener("click", async () => {
            const message = `${state.experience.title} in ${state.experience.destination}`;

            if (navigator.share) {
                try {
                    await navigator.share({ title: state.experience.title, text: message });
                } catch (error) {
                    // User cancelled share; no action needed.
                }
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(message);
                showToast("Experience details copied");
                return;
            }

            showToast("Share not supported on this device");
        });

        if (!isExperienceCompleted()) {
            container.querySelector("#traveler-experience-continue-btn")?.addEventListener("click", () => {
                const currentOption = getSelectedOption(state);

                persistBookingDraft({
                    experienceId: state.experience.id,
                    experience: state.experience,
                    option: { ...currentOption },
                    selectedDate: state.selectedDate,
                    adults: state.adults,
                    totalPrice: currentOption.price * state.adults
                });

                window.location.assign("./traveller_experience-booking.html");
            });
        }
    }

    render();
}

function getSelectedExperience() {
    const stored = readStoredExperience();
    const catalog = travelerData?.searchCatalog?.experiences || [];

    if (stored?.id) {
        const matched = catalog.find((item) => item.id === stored.id);
        return normalizeExperienceDetail({ ...matched, ...stored });
    }

    if (catalog.length) {
        return normalizeExperienceDetail(catalog[0]);
    }

    return null;
}

function readStoredExperience() {
    if (typeof localStorage === "undefined") return null;

    try {
        return JSON.parse(localStorage.getItem(SELECTED_EXPERIENCE_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function normalizeExperienceDetail(item) {
    const options = Array.isArray(item?.options) && item.options.length ? item.options : [{
        id: `${item?.id || "experience"}-standard`,
        title: "Standard Option",
        time: "Flexible timing",
        price: extractAmount(item?.price) || 79,
        features: item?.perks || ["Instant Confirmation", "Flexible Access"]
    }];

    const gallery = Array.isArray(item?.gallery) && item.gallery.length
        ? item.gallery
        : [item?.image].filter(Boolean);

    return {
        ...item,
        gallery,
        options,
        location: item?.location || item?.destination || "Experience Location",
        reviews: Number(item?.reviews) || 120,
        rating: Number(item?.rating) || 4.7,
        customizable: Boolean(item?.customizable),
        durationLabel: item?.time || item?.durationLabel || "3 hours",
        description: Array.isArray(item?.description) ? item.description : [],
        audience: Array.isArray(item?.audience) ? item.audience : [],
        expectations: Array.isArray(item?.expectations) ? item.expectations : [],
        highlights: Array.isArray(item?.highlights) ? item.highlights : [],
        cancellation: Array.isArray(item?.cancellation) ? item.cancellation : [],
        bring: Array.isArray(item?.bring) ? item.bring : [],
        requirements: Array.isArray(item?.requirements) ? item.requirements : []
    };
}

function renderTab(id, label, activeTab) {
    return `<button class="traveler-experience-tab ${id === activeTab ? "active" : ""}" type="button" data-experience-tab="${id}">${label}</button>`;
}

function renderActiveSection(state, selectedOption) {
    if (state.activeTab === "highlights") {
        return `
            <article class="traveler-experience-detail-card">
                <h2>Experience Highlights</h2>
                <div class="traveler-experience-highlight-grid">
                    ${state.experience.highlights.map((item) => `
                        <div class="traveler-experience-highlight-item">
                            <span class="icon">${renderExperienceIcon(item.icon)}</span>
                            <div>
                                <h3>${escapeHtml(item.title)}</h3>
                                <p>${escapeHtml(item.desc)}</p>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </article>
        `;
    }

    if (state.activeTab === "options") {
        return `
            <article class="traveler-experience-detail-card">
                <h2>Choose Your Experience</h2>
                <p>Select the option that best fits your timing and preferences.</p>
                <div class="traveler-experience-option-wrap">
                    ${state.experience.options.map((option) => `
                        <button class="traveler-experience-option-card ${option.id === selectedOption.id ? "selected" : ""}" type="button" data-experience-option="${option.id}">
                            ${option.popular ? `<span class="traveler-experience-option-badge">Most Popular</span>` : ""}
                            <div class="traveler-experience-option-top">
                                <div>
                                    <h3>${escapeHtml(option.title)}</h3>
                                    <p class="traveler-experience-option-time">${clockIcon()} ${escapeHtml(option.time)}</p>
                                </div>
                                <div class="traveler-experience-option-price">${formatCurrency(option.price)}<span>per adult</span></div>
                            </div>
                            <div class="traveler-experience-feature-pills">
                                ${(option.features || []).map((feature) => `<span>${checkCircleIcon()} ${escapeHtml(feature)}</span>`).join("")}
                            </div>
                        </button>
                    `).join("")}
                </div>
            </article>
        `;
    }

    if (state.activeTab === "important") {
        return `
            <article class="traveler-experience-info-grid">
                <section class="traveler-experience-detail-card">
                    <h2>Cancellation Policy</h2>
                    <ul class="traveler-experience-list">
                        ${state.experience.cancellation.map((item) => `<li>${infoCircleIcon()} ${escapeHtml(item)}</li>`).join("")}
                    </ul>
                </section>
                <section class="traveler-experience-detail-card traveler-experience-mini-card">
                    <h2>What to Bring</h2>
                    <ul>
                        ${state.experience.bring.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                    </ul>
                </section>
                <section class="traveler-experience-detail-card traveler-experience-mini-card">
                    <h2>Restrictions & Requirements</h2>
                    <ul>
                        ${state.experience.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                    </ul>
                </section>
            </article>
        `;
    }

    return `
        <article class="traveler-experience-detail-card">
            <h2>About</h2>
            ${state.experience.description.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </article>
        <article class="traveler-experience-detail-card">
            <h2>Who It's For</h2>
            <ul class="traveler-experience-list">
                ${state.experience.audience.map((item) => `<li>${checkCircleIcon()} ${escapeHtml(item)}</li>`).join("")}
            </ul>
        </article>
        <article class="traveler-experience-detail-card">
            <h2>What to Expect</h2>
            <div class="traveler-experience-highlight-grid">
                ${state.experience.expectations.map((item) => `
                    <div class="traveler-experience-highlight-item">
                        <span class="icon">${renderExperienceIcon(item.icon)}</span>
                        <div>
                            <h3>${escapeHtml(item.title)}</h3>
                            <p>${escapeHtml(item.desc)}</p>
                        </div>
                    </div>
                `).join("")}
            </div>
        </article>
    `;
}

function getDefaultOptionId(experience) {
    return experience.options.find((option) => option.popular)?.id || experience.options[0]?.id || "";
}

function getSelectedOption(state) {
    return state.experience.options.find((option) => option.id === state.selectedOptionId)
        || state.experience.options[0];
}

function getDefaultDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
}

function persistBookingDraft(draft) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(EXPERIENCE_BOOKING_DRAFT_KEY, JSON.stringify(draft));
}

function extractAmount(value) {
    const match = String(value || "").replace(/,/g, "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function isWishlisted(experience) {
    if (typeof localStorage === "undefined") return false;
    try {
        const items = JSON.parse(localStorage.getItem("traveler_wishlist") || "[]");
        return items.some((item) => item.title === experience.title);
    } catch (error) {
        return false;
    }
}

function toggleWishlist(experience) {
    if (typeof localStorage === "undefined") return;
    const items = JSON.parse(localStorage.getItem("traveler_wishlist") || "[]");
    const index = items.findIndex((item) => item.title === experience.title);

    if (index >= 0) {
        items.splice(index, 1);
    } else {
        items.push({
            title: experience.title,
            location: `${experience.destination} Experience`,
            image: experience.image,
            likes: 100
        });
    }

    localStorage.setItem("traveler_wishlist", JSON.stringify(items));
}

function showToast(message) {
    const existing = document.querySelector(".traveler-experience-toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = "traveler-experience-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("visible"));
    window.setTimeout(() => {
        toast.classList.remove("visible");
        window.setTimeout(() => toast.remove(), 180);
    }, 1800);
}

function renderExperienceIcon(type) {
    const icons = {
        pickup: pickupIcon(),
        sunrise: sunriseIcon(),
        meal: mealIcon(),
        shield: shieldIcon(),
        camera: cameraIcon(),
        sparkle: checkCircleIcon(),
        water: wavesIcon(),
        ticket: ticketIcon(),
        compass: compassIcon(),
        check: checkCircleIcon()
    };

    return icons[type] || compassIcon();
}

function heartOutlineIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
}

function shareIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
}

function galleryIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></svg>`;
}

function starIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.93 5.93 6.55.95-4.74 4.62 1.12 6.53L12 17.47l-5.86 3.06 1.12-6.53-4.74-4.62 6.55-.95L12 2.5z"></path></svg>`;
}

function locationPinIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

function clockIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
}

function calendarIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
}

function usersIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path><circle cx="9.5" cy="7" r="4"></circle><path d="M20 8v6"></path><path d="M23 11h-6"></path></svg>`;
}

function checkCircleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.2 2.2 4.8-4.8"></path></svg>`;
}

function infoCircleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
}

function pickupIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13h3l2-5h8l2 5h3"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle><path d="M5 13v3h14v-3"></path></svg>`;
}

function sunriseIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line></svg>`;
}

function mealIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12"></path><path d="M10 3v12"></path><path d="M8 3v18"></path><path d="M18 3v8a4 4 0 0 1-4 4h0V3"></path></svg>`;
}

function shieldIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
}

function cameraIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;
}

function wavesIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9c1.5 1 3 1 4.5 0S9.5 8 11 9s3 1 4.5 0S18.5 8 20 9s2.5 1 2.5 1"></path><path d="M2 15c1.5 1 3 1 4.5 0S9.5 14 11 15s3 1 4.5 0 3-1 4.5 0 2.5 1 2.5 1"></path></svg>`;
}

function ticketIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V8z"></path><path d="M13 6v12"></path></svg>`;
}

function compassIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
