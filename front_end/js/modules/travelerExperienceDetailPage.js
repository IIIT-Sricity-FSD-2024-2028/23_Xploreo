import { travelerData } from "../api/legacyData.js";
import { fetchExperience } from "../api/services.js";
import { showAppAlert } from "./experience_shared.js";

const SELECTED_EXPERIENCE_KEY = "traveler_selected_experience";
const EXPERIENCE_BOOKING_DRAFT_KEY = "traveler_experience_booking_draft";

export async function renderTravelerExperienceDetailPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("experience") || params.get("id");
    let experienceId = urlId;
    if (!experienceId) {
        const stored = readStoredExperience();
        experienceId = stored?.id;
    }

    if (!experienceId) {
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

    let experience = null;
    try {
        const freshExp = await fetchExperience(experienceId);
        if (freshExp) {
            experience = normalizeExperienceDetail(freshExp);
        }
    } catch (e) {
        console.warn("Failed to fetch experience details from backend", e);
    }

    if (!experience) {
        const stored = readStoredExperience();
        if (stored && String(stored.id) === String(experienceId)) {
            experience = normalizeExperienceDetail(stored);
        }
    }

    if (!experience) {
        container.innerHTML = `
            <main class="traveler-experience-detail-page">
                <section class="traveler-experience-detail-frame traveler-experience-empty">
                    <h1>Experience not found</h1>
                    <p>The selected experience could not be loaded. It may have been deleted.</p>
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
        selectedDate: getDefaultDate(experience),
        selectedSlotId: null,
        selectedOptionId: getDefaultOptionId(experience),
        galleryOpen: false,
        wishlisted: isWishlisted(experience)
    };

    // Initialize default slot if slots exist
    const availableSlots = (state.experience.slots || []).filter(slot => slot.date === state.selectedDate && slot.available);
    const nonFullSlot = availableSlots.find(slot => slot.capacity - slot.booked > 0);
    
    if (nonFullSlot) {
        state.selectedSlotId = nonFullSlot.id;
    } else if (availableSlots.length) {
        state.selectedSlotId = null; // Don't default to a full slot
    }

    // Limit initial adults to the max available seats of the selected slot
    const initialSlot = availableSlots.find(s => String(s.id) === String(state.selectedSlotId));
    const initialMaxSeats = initialSlot ? (initialSlot.capacity - initialSlot.booked) : state.experience.capacity;
    if (state.adults > initialMaxSeats && initialMaxSeats > 0) {
        state.adults = initialMaxSeats;
    }

    function getTripStatus() {
        return new URLSearchParams(window.location.search).get("status")?.trim().toLowerCase();
    }

    function getBackendStatus() {
        return new URLSearchParams(window.location.search).get("backendStatus")?.trim().toUpperCase();
    }

    function isExperienceCompleted() {
        const status = getTripStatus();
        return status === "completed" || status === "upcoming";
    }

    function render() {
        const isCompleted = isExperienceCompleted();
        const selectedOption = getSelectedOption(state);
        const total = selectedOption.price * state.adults;

        const imgHtml = state.activeImage 
            ? `<img src="${escapeHtml(state.activeImage)}" alt="${escapeHtml(state.experience.title)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100%\\' height=\\'100%\\' viewBox=\\'0 0 800 400\\'%3E%3Crect fill=\\'%23f3f4f6\\' width=\\'800\\' height=\\'400\\'/%3E%3Ctext fill=\\'%239ca3af\\' font-family=\\'sans-serif\\' font-size=\\'20\\' dy=\\'10.5\\' font-weight=\\'bold\\' x=\\'50%\\' y=\\'50%\\' text-anchor=\\'middle\\'%3ENo Image Available%3C/text%3E%3C/svg%3E';">` 
            : `<div style="height: 100%; display: flex; align-items: center; justify-content: center; background: #eef3fb; color: #999;">No Image Available</div>`;

        container.innerHTML = `
            <main class="traveler-experience-detail-page">
                <section class="traveler-experience-detail-layout">
                    <div class="traveler-experience-main">
                        <div class="traveler-experience-detail-frame traveler-experience-detail-header" style="margin-bottom: 0px; padding: 16px 20px;">
                            <div class="traveler-experience-detail-top">
                                <div>
                                    <h1 style="font-size: 24px;">${escapeHtml(state.experience.title)}</h1>
                                    <div class="traveler-experience-meta" style="margin-top: 6px; font-size: 13px;">
                                        <strong>${starIcon()} ${Number(state.experience.rating).toFixed(1)}</strong>
                                        <span>(${state.experience.reviews} reviews)</span>
                                        <span>${locationPinIcon()} ${escapeHtml(state.experience.location || state.experience.destination)}</span>
                                        <span>${clockIcon()} ${escapeHtml(state.experience.durationLabel)}</span>
                                    </div>
                                    <div class="traveler-experience-pill-row" style="margin-top: 8px;">
                                        ${state.experience.customizable ? `<span class="traveler-experience-pill traveler-experience-pill-success" style="padding: 4px 10px; font-size:12px;">${checkCircleIcon()} Customizable</span>` : ""}
                                        <span class="traveler-experience-pill traveler-experience-pill-info" style="padding: 4px 10px; font-size:12px;">${infoCircleIcon()} Duration: ${escapeHtml(state.experience.durationLabel)}</span>
                                    </div>
                                </div>
                                <div class="traveler-experience-header-actions">
                                    <button type="button" id="traveler-experience-favorite-btn" aria-label="Save experience" style="width: 36px; height: 36px; padding: 6px;">${heartOutlineIcon()}</button>
                                </div>
                            </div>
                        </div>

                        <section class="traveler-experience-gallery-block">
                            <div class="traveler-experience-hero-media traveler-experience-detail-frame">
                                ${imgHtml}
                                ${state.experience.gallery.length > 0 ? `
                                <button class="traveler-experience-gallery-button" type="button" id="traveler-experience-gallery-btn" style="padding: 6px 12px; font-size: 12px; bottom: 12px; right: 12px;">
                                    ${galleryIcon()}
                                    <span>View Gallery</span>
                                </button>
                                ` : ''}
                            </div>
                            <div class="traveler-experience-thumb-grid">
                                ${state.experience.gallery.slice(0,3).map((image) => `
                                    <button class="traveler-experience-thumb ${image === state.activeImage ? "active" : ""}" type="button" data-gallery-image="${escapeHtml(image)}">
                                        <img src="${escapeHtml(image)}" alt="${escapeHtml(state.experience.title)} gallery image">
                                    </button>
                                `).join("")}
                            </div>
                        </section>

                        <section class="traveler-experience-sections">
                            <div class="traveler-experience-tabs" style="gap: 8px;">
                                ${renderTab("about", "About", state.activeTab)}
                                ${state.experience.highlights && state.experience.highlights.length ? renderTab("highlights", "Highlights", state.activeTab) : ""}
                                ${state.experience.options && state.experience.options.length > 1 ? renderTab("options", "Options", state.activeTab) : ""}
                                ${(state.experience.cancellation && state.experience.cancellation.length) || (state.experience.bring && state.experience.bring.length) || (state.experience.requirements && state.experience.requirements.length) ? renderTab("important", "Important Info", state.activeTab) : ""}
                            </div>
                            ${renderActiveSection(state, selectedOption)}
                        </section>
                    </div>

                    <aside class="traveler-experience-sidebar" style="top: 24px; padding: 22px;">
                        <h3 style="margin:0; font-size: 15px; color: #617084;">Starting from (per adult)</h3>
                        <div class="traveler-experience-price" style="margin-top: 6px; font-size: 28px;">${formatCurrency(selectedOption.price)}</div>
                        <div class="traveler-experience-sidebar-note" style="margin-top: 6px; font-size: 13px;">Free cancellation up to 24 hours</div>

                        <label class="traveler-experience-side-field" style="margin-top: 20px;">
                            <span class="traveler-experience-side-label" style="font-size: 14px;">${calendarIcon()} Date</span>
                            <input class="traveler-experience-side-input" type="date" id="traveler-experience-date" value="${escapeHtml(state.selectedDate)}" min="${new Date().toISOString().split('T')[0]}" ${isCompleted ? "disabled" : ""} style="height: 44px; font-size: 15px;">
                        </label>

                        <label class="traveler-experience-side-field" style="margin-top: 14px;">
                            <span class="traveler-experience-side-label" style="font-size: 14px;">${clockIcon()} Time Slot</span>
                            <select class="traveler-experience-side-input" id="traveler-experience-time-slot" ${isCompleted ? "disabled" : ""} style="height: 44px; font-size: 15px;">
                                ${sortSlots(state.experience.slots || []).filter(slot => slot.date === state.selectedDate && slot.available).length ? 
                                    sortSlots(state.experience.slots || []).filter(slot => slot.date === state.selectedDate && slot.available).map(slot => `<option value="${slot.id}" ${String(slot.id) === String(state.selectedSlotId) ? "selected" : ""} ${slot.capacity - slot.booked <= 0 ? "disabled" : ""}>${slot.time} ${slot.capacity - slot.booked <= 0 ? "(Full)" : `(${slot.capacity - slot.booked} left)`}</option>`).join("") 
                                    : `<option value="" disabled selected>No slots available</option>`
                                }
                            </select>
                        </label>

                        <div class="traveler-experience-side-field" style="margin-top: 14px;">
                            <span class="traveler-experience-side-label" style="font-size: 14px;">${usersIcon()} Adults</span>
                            <div class="traveler-experience-side-stepper" style="height: 44px;">
                                <button type="button" id="traveler-adults-decrease" ${isCompleted ? "disabled" : ""} style="height: 44px;">-</button>
                                <div style="font-size: 15px;">${state.adults}</div>
                                <button type="button" id="traveler-adults-increase" ${isCompleted ? "disabled" : ""} style="height: 44px;">+</button>
                            </div>
                        </div>

                        <div class="traveler-experience-selected-option" style="margin-top: 16px; gap: 4px;">
                            <span style="font-size: 13px;">Option: <strong>${escapeHtml(selectedOption.title)}</strong></span>
                            <p style="margin:0; font-size: 13px;">${(state.experience.slots || []).find(s => String(s.id) === String(state.selectedSlotId))?.time || escapeHtml(selectedOption.time)}</p>
                        </div>

                        <div class="traveler-experience-side-total" style="margin-top: 18px; padding-top: 14px; font-size: 16px;">
                            <span>Total Amount</span>
                            <strong>${formatCurrency(total)}</strong>
                        </div>

                        ${getBackendStatus() === "END_REQUESTED"
                            ? `<button class="primary-btn" type="button" id="traveler-experience-confirm-btn" style="background-color: #f59e0b; color: white; border: none; padding: 12px; border-radius: 12px; cursor: pointer; width: 100%; font-size: 16px; font-weight: 700; margin-bottom: 12px; margin-top: 16px;">Confirm Request End</button>`
                            : (isCompleted 
                                ? (getTripStatus() === "upcoming" 
                                    ? `<button class="traveler-experience-continue-btn" type="button" id="traveler-experience-cancel-btn" style="background: #ef4444; min-height: 48px; border-radius: 12px; font-size: 16px; margin-top: 16px;">Cancel Booking</button>`
                                    : `<div class="traveler-experience-completed-note" style="margin-top: 16px; font-size: 13px;">This experience is completed.</div>`) 
                                : `<button class="traveler-experience-continue-btn" type="button" id="traveler-experience-continue-btn" ${!state.selectedSlotId ? "disabled" : ""} style="min-height: 48px; border-radius: 12px; font-size: 16px; margin-top: 16px;">Continue</button>`)
                        }
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
            const selectedSlot = (state.experience.slots || []).find(s => String(s.id) === String(state.selectedSlotId));
            const availableSeats = selectedSlot ? (selectedSlot.capacity - selectedSlot.booked) : state.experience.capacity;
            state.adults = Math.min(availableSeats, Math.min(12, state.adults + 1));
            render();
        });

        container.querySelector("#traveler-experience-date")?.addEventListener("change", (event) => {
            state.selectedDate = event.target.value || getDefaultDate(state.experience);
            const slots = sortSlots(state.experience.slots || []).filter(slot => slot.date === state.selectedDate && slot.available);
            
            const nonFullSlot = slots.find(slot => slot.capacity - slot.booked > 0);
            state.selectedSlotId = nonFullSlot ? nonFullSlot.id : null;
            
            const newSlot = slots.find(s => String(s.id) === String(state.selectedSlotId));
            const maxSeats = newSlot ? (newSlot.capacity - newSlot.booked) : state.experience.capacity;
            if (maxSeats > 0 && state.adults > maxSeats) {
                state.adults = maxSeats;
            } else if (!newSlot) {
                state.adults = 1; // Reset to 1 if no valid slot selected
            }
            render();
        });

        container.querySelector("#traveler-experience-time-slot")?.addEventListener("change", (event) => {
            state.selectedSlotId = event.target.value || null;
            
            const newSlot = (state.experience.slots || []).find(s => String(s.id) === String(state.selectedSlotId));
            const maxSeats = newSlot ? (newSlot.capacity - newSlot.booked) : state.experience.capacity;
            if (state.adults > maxSeats && maxSeats > 0) {
                state.adults = maxSeats;
            }
            render();
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

        if (!isExperienceCompleted()) {
            container.querySelector("#traveler-experience-continue-btn")?.addEventListener("click", () => {
                try {
                    const selectedSlot = (state.experience.slots || []).find(s => String(s.id) === String(state.selectedSlotId));
                    
                    if (!state.selectedSlotId || !selectedSlot) {
                        showAppAlert("Please select an available time slot before continuing.", "Notice");
                        return;
                    }

                    if (selectedSlot.capacity - selectedSlot.booked < state.adults) {
                        showAppAlert(`Only ${selectedSlot.capacity - selectedSlot.booked} seats left for this slot. Please reduce the number of adults or select a different slot/date.`, "Notice");
                        return;
                    }

                    const currentOption = getSelectedOption(state);

                    persistBookingDraft({
                        experienceId: state.experience.id,
                        experience: state.experience,
                        option: { ...currentOption },
                        selectedDate: state.selectedDate,
                        selectedSlot: selectedSlot || null,
                        adults: state.adults,
                        totalPrice: currentOption.price * state.adults
                    });

                    window.location.href = "./traveller_experience-booking.html";
                } catch (err) {
                    console.error("Error in continue click handler:", err);
                    showAppAlert("An error occurred: " + err.message, "Error");
                }
            });
        } else {
            container.querySelector("#traveler-experience-cancel-btn")?.addEventListener("click", async () => {
                if (confirm("Are you sure you want to cancel this booking?")) {
                    const bookingId = new URLSearchParams(window.location.search).get("booking");
                    if (!bookingId) {
                        showAppAlert("Could not find booking ID to cancel.", "Error");
                        return;
                    }
                    try {
                        const { updateExperienceBookingStatus } = await import("../api/services.js");
                        await updateExperienceBookingStatus(bookingId, "CANCELLED");
                        showAppAlert("Booking cancelled successfully.", "Success");
                        window.location.href = "./traveller_mytrips.html";
                    } catch (err) {
                        console.error("Failed to cancel booking:", err);
                        showAppAlert("Failed to cancel booking. Please try again.", "Error");
                    }
                }
            });
        }

        const confirmBtn = document.getElementById("traveler-experience-confirm-btn");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", async () => {
                if (confirm("Are you sure you want to confirm the end of this experience?")) {
                    const bookingId = new URLSearchParams(window.location.search).get("booking");
                    if (!bookingId) {
                        showAppAlert("Could not find booking ID.", "Error");
                        return;
                    }
                    try {
                        const { updateExperienceBookingStatus } = await import("../api/services.js");
                        await updateExperienceBookingStatus(bookingId, "COMPLETED");
                        showAppAlert("Experience marked as completed!", "Success");
                        window.location.href = "./traveller_mytrips.html";
                    } catch (err) {
                        console.error("Failed to confirm completion:", err);
                        showAppAlert("Failed to confirm completion. Please try again.", "Error");
                    }
                }
            });
        }
    }

    render();

    // Real-time synchronization across tabs
    if (!window.__travelerExperienceStorageListenerAttached) {
        window.addEventListener("storage", (e) => {
            if (e.key === "experienceBookings" || e.key === "tours") {
                // Fetch fresh status and re-render if needed
                const bookingId = new URLSearchParams(window.location.search).get("booking");
                if (bookingId) {
                    import("../api/services.js").then(async ({ fetchExperiencePartnerBookings }) => {
                        const bookings = await fetchExperiencePartnerBookings();
                        const b = bookings.find(item => String(item.id) === String(bookingId));
                        if (b && String(b.status).toUpperCase() !== getBackendStatus()) {
                            // Update URL without refreshing page, then re-render
                            const newUrl = new URL(window.location.href);
                            newUrl.searchParams.set("backendStatus", b.status);
                            window.history.replaceState({}, '', newUrl);
                            render();
                        }
                    });
                }
            }
        });
        window.__travelerExperienceStorageListenerAttached = true;
    }
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

function persistBookingDraft(draft) {
    if (typeof localStorage === "undefined") return;

    // Deep clone to avoid mutating the live state
    const record = JSON.parse(JSON.stringify(draft));

    // Strip heavy fields to avoid QuotaExceededError
    if (record && record.experience) {
        delete record.experience.gallery;
        delete record.experience.description;
        delete record.experience.highlights;
        delete record.experience.expectations;
        if (record.experience.image && record.experience.image.length > 50000) {
            record.experience.image = ""; 
        }
    }

    try {
        localStorage.setItem(EXPERIENCE_BOOKING_DRAFT_KEY, JSON.stringify(record));
    } catch (e) {
        console.warn("Storage full. Failed to persist booking draft", e);
        try {
            // Attempt to clear some space and retry
            localStorage.removeItem("traveler_selected_experience");
            localStorage.setItem(EXPERIENCE_BOOKING_DRAFT_KEY, JSON.stringify(record));
        } catch (err) {
            console.error("Still failed to save booking draft", err);
            // Throw so the user gets notified
            throw new Error("Local storage is full. Please clear your browser cache and try again.");
        }
    }
}

function normalizeExperienceDetail(item) {
    const options = Array.isArray(item?.options) && item.options.length ? item.options : [{
        id: `${item?.id || "experience"}-standard`,
        title: "Standard Option",
        time: "Flexible timing",
        price: extractAmount(item?.price) || 79,
        features: Array.isArray(item?.perks) && item.perks.length > 0 ? item.perks : (item?.partnerId === "experience-partner-seed" ? ["Instant Confirmation", "Flexible Access"] : [])
    }];

    const gallery = Array.isArray(item?.gallery) && item.gallery.length
        ? item.gallery
        : [item?.image].filter(Boolean);

    return {
        ...item,
        gallery,
        options,
        location: item?.location || item?.destination || "Experience Location",
        reviews: Number(item?.reviews) || 0,
        rating: Number(item?.rating) || 0.0,
        customizable: Boolean(item?.customizable),
        durationLabel: item?.durationHours ? `${item.durationHours} hours` : (item?.time || item?.durationLabel || "3 hours"),
        description: Array.isArray(item?.description) ? item.description : (typeof item?.description === "string" ? [item.description] : [item?.title || ""]),
        audience: Array.isArray(item?.audience) ? item.audience : [],
        expectations: Array.isArray(item?.expectations) ? item.expectations : [],
        highlights: Array.isArray(item?.highlights) ? item.highlights : [],
        cancellation: Array.isArray(item?.cancellation) ? item.cancellation : [],
        bring: Array.isArray(item?.bring) ? item.bring : [],
        requirements: Array.isArray(item?.requirements) ? item.requirements : []
    };
}

function renderTab(id, label, activeTab) {
    return `<button class="traveler-experience-tab ${id === activeTab ? "active" : ""}" type="button" data-experience-tab="${id}" style="padding: 8px 14px; font-size: 13px;">${label}</button>`;
}

function renderActiveSection(state, selectedOption) {
    if (state.activeTab === "highlights") {
        return `
            <article class="traveler-experience-detail-card">
                <div class="traveler-experience-highlight-grid" style="gap: 12px;">
                    ${state.experience.highlights.map((item) => `
                        <div class="traveler-experience-highlight-item" style="padding: 12px; grid-template-columns: 40px minmax(0, 1fr);">
                            <span class="icon" style="width: 40px; height: 40px;"><svg style="width: 20px; height: 20px;">${renderExperienceIcon(item.icon)}</svg></span>
                            <div>
                                <h3 style="font-size: 15px; margin-bottom: 4px;">${escapeHtml(item.title)}</h3>
                                <p style="font-size: 13px;">${escapeHtml(item.desc)}</p>
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
                <div class="traveler-experience-option-wrap" style="margin-top: 0; gap: 10px;">
                    ${state.experience.options.map((option) => `
                        <button class="traveler-experience-option-card ${option.id === selectedOption.id ? "selected" : ""}" type="button" data-experience-option="${option.id}" style="padding: 14px;">
                            ${option.popular ? `<span class="traveler-experience-option-badge" style="top: 10px; right: 10px; padding: 4px 8px; font-size: 10px;">Popular</span>` : ""}
                            <div class="traveler-experience-option-top">
                                <div>
                                    <h3 style="font-size: 16px; margin-bottom: 4px;">${escapeHtml(option.title)}</h3>
                                    <p class="traveler-experience-option-time" style="font-size: 12px;">${clockIcon()} ${escapeHtml(option.time)}</p>
                                </div>
                                <div class="traveler-experience-option-price" style="font-size: 20px;">${formatCurrency(option.price)}<span style="font-size: 11px;">per adult</span></div>
                            </div>
                        </button>
                    `).join("")}
                </div>
            </article>
        `;
    }

    if (state.activeTab === "important") {
        return `
            <article class="traveler-experience-info-grid" style="gap: 12px;">
                <section class="traveler-experience-detail-card" style="padding: 14px;">
                    <h3 style="font-size: 15px; margin-bottom: 8px;">Cancellation Policy</h3>
                    <ul class="traveler-experience-list" style="margin-top: 0;">
                        ${state.experience.cancellation.map((item) => `<li style="font-size: 13px;">${infoCircleIcon()} ${escapeHtml(item)}</li>`).join("")}
                    </ul>
                </section>
                <section class="traveler-experience-detail-card traveler-experience-mini-card" style="padding: 14px;">
                    <h3 style="font-size: 15px; margin-bottom: 8px;">What to Bring</h3>
                    <ul style="margin-top: 0;">
                        ${state.experience.bring.map((item) => `<li style="font-size: 13px;">${escapeHtml(item)}</li>`).join("")}
                    </ul>
                </section>
                <section class="traveler-experience-detail-card traveler-experience-mini-card" style="padding: 14px;">
                    <h3 style="font-size: 15px; margin-bottom: 8px;">Restrictions</h3>
                    <ul style="margin-top: 0;">
                        ${state.experience.requirements.map((item) => `<li style="font-size: 13px;">${escapeHtml(item)}</li>`).join("")}
                    </ul>
                </section>
            </article>
        `;
    }

    return `
        ${state.experience.description.length ? `
        <article class="traveler-experience-detail-card" style="padding: 16px;">
            ${state.experience.description.map((paragraph) => `<p style="margin: 0 0 10px; font-size: 14px; line-height: 1.5; color: #4b5563;">${escapeHtml(paragraph)}</p>`).join("")}
        </article>
        ` : ""}
        ${state.experience.audience.length ? `
        <article class="traveler-experience-detail-card" style="padding: 16px;">
            <h3 style="font-size: 15px; margin-bottom: 8px;">Who It's For</h3>
            <ul class="traveler-experience-list" style="margin-top:0;">
                ${state.experience.audience.map((item) => `<li style="font-size: 13px;">${checkCircleIcon()} ${escapeHtml(item)}</li>`).join("")}
            </ul>
        </article>
        ` : ""}
        ${state.experience.expectations.length ? `
        <article class="traveler-experience-detail-card" style="padding: 16px;">
            <h3 style="font-size: 15px; margin-bottom: 8px;">What to Expect</h3>
            <div class="traveler-experience-highlight-grid" style="gap: 12px;">
                ${state.experience.expectations.map((item) => `
                    <div class="traveler-experience-highlight-item" style="padding: 12px; grid-template-columns: 40px minmax(0, 1fr);">
                        <span class="icon" style="width: 40px; height: 40px;"><svg style="width: 20px; height: 20px;">${renderExperienceIcon(item.icon)}</svg></span>
                        <div>
                            <h3 style="font-size: 15px; margin-bottom: 4px;">${escapeHtml(item.title)}</h3>
                            <p style="font-size: 13px;">${escapeHtml(item.desc)}</p>
                        </div>
                    </div>
                `).join("")}
            </div>
        </article>
        ` : ""}
    `;
}

function getDefaultOptionId(experience) {
    return experience.options.find((option) => option.popular)?.id || experience.options[0]?.id || "";
}

function getSelectedOption(state) {
    return state.experience.options.find((option) => option.id === state.selectedOptionId)
        || state.experience.options[0];
}

function getDefaultDate(experience) {
    const availableSlots = sortSlots(experience?.slots || []).filter(slot => slot.available);
    if (availableSlots.length > 0) {
        return availableSlots[0].date;
    }
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
}


function extractAmount(value) {
    const match = String(value || "").replace(/,/g, "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function timeToMinutes(value) {
    const str = String(value || "").trim();
    const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        return Number(match24[1]) * 60 + Number(match24[2]);
    }
    const match12 = str.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match12) return Number.MAX_SAFE_INTEGER;
    let hour = Number(match12[1]) % 12;
    const minute = Number(match12[2]);
    if (match12[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + minute;
}

function sortSlots(slots) {
    return [...slots].sort((a, b) => {
        if (a.date !== b.date) return (a.date || "").localeCompare(b.date || "");
        return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
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
