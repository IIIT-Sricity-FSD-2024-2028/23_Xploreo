import {
    ensureTravelerSession,
    getTravelerBookings,
    saveTravelerBookings,
    seedTravelerWorkspace,
    setSelectedBookingId
} from "../utils/travelerWorkspaceState.js";
import { validateBookingUpdate } from "../utils/travelerWorkspaceValidators.js";
import {
    calculateTripLength,
    createEmptyState,
    formatCurrency,
    formatDate,
    renderFieldError,
    showWorkspaceToast
} from "./travelerWorkspaceUI.js";

export function initTravelerBookingsPage(containerId) {
    const container = document.getElementById(containerId);
    const user = ensureTravelerSession();

    if (!container) {
        return;
    }

    seedTravelerWorkspace();

    const state = {
        year: "All",
        status: "All",
        search: "",
        editingBookingId: null,
        errors: {}
    };

    function getFilteredBookings() {
        let bookings = getTravelerBookings();

        if (state.year !== "All") {
            bookings = bookings.filter((booking) => booking.year === state.year);
        }

        if (state.status !== "All") {
            bookings = bookings.filter((booking) => booking.status === state.status);
        }

        if (state.search) {
            const term = state.search.toLowerCase();
            bookings = bookings.filter((booking) =>
                booking.id.toLowerCase().includes(term) ||
                booking.title.toLowerCase().includes(term) ||
                booking.destination.toLowerCase().includes(term)
            );
        }

        return bookings;
    }

    function renderEditModal(booking) {
        if (!booking || state.editingBookingId !== booking.id) {
            return "";
        }

        return `
            <div class="traveler-modal-backdrop">
                <div class="traveler-modal-card">
                    <div class="traveler-card-header">
                        <div>
                            <h3>Edit booking</h3>
                            <p>Update dates, travellers, or status without leaving the page.</p>
                        </div>
                        <button class="ghost-btn small" id="close-booking-modal">Close</button>
                    </div>
                    <form id="booking-edit-form" class="traveler-form-grid" novalidate>
                        <input type="hidden" name="bookingId" value="${booking.id}">
                        <label>
                            <span>Start date</span>
                            <input type="date" name="startDate" value="${booking.startDate}">
                            ${renderFieldError(state.errors, "startDate")}
                        </label>
                        <label>
                            <span>End date</span>
                            <input type="date" name="endDate" value="${booking.endDate}">
                            ${renderFieldError(state.errors, "endDate")}
                        </label>
                        <label>
                            <span>Travellers</span>
                            <input type="number" min="1" max="8" step="1" inputmode="numeric" name="travellers" value="${booking.travellers}">
                            ${renderFieldError(state.errors, "travellers")}
                        </label>
                        <label>
                            <span>Status</span>
                            <select name="status">
                                <option value="Confirmed" ${booking.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                                <option value="Completed" ${booking.status === "Completed" ? "selected" : ""}>Completed</option>
                                <option value="Cancelled" ${booking.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                            </select>
                            ${renderFieldError(state.errors, "status")}
                        </label>
                        <div class="traveler-form-actions traveler-form-span-full">
                            <button type="submit" class="solid-btn">Save booking</button>
                            <button type="button" class="ghost-btn" id="reset-booking-modal">Reset</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    function render() {
        const bookings = getFilteredBookings();
        const allBookings = getTravelerBookings();
        const editingBooking = allBookings.find((booking) => booking.id === state.editingBookingId);

        container.innerHTML = `
            <main class="traveler-workspace traveler-bookings-page">
                <section class="traveler-hero-panel">
                    <div>
                        <p class="traveler-eyebrow">Traveller workspace</p>
                        <h1>My Bookings</h1>
                        <p>Manage confirmed trips, open travel documents, and adjust saved booking data with instant updates.</p>
                    </div>
                    <a class="traveler-link-chip" href="./traveller_trip-planning.html">Plan another trip</a>
                </section>

                <section class="traveler-card">
                    <div class="traveler-toolbar">
                        <div class="segmented-control">
                            ${["All", "2026", "2025"].map((year) => `
                                <button type="button" class="${state.year === year ? "active" : ""}" data-year-filter="${year}">${year === "All" ? "All Bookings" : year}</button>
                            `).join("")}
                        </div>
                        <div class="traveler-toolbar-actions">
                            <select id="booking-status-filter">
                                <option value="All">All statuses</option>
                                <option value="Confirmed" ${state.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                                <option value="Completed" ${state.status === "Completed" ? "selected" : ""}>Completed</option>
                                <option value="Cancelled" ${state.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                            </select>
                            <input type="search" id="booking-search" placeholder="Search booking ID or destination" value="${state.search}">
                        </div>
                    </div>

                    <div class="booking-list">
                        ${bookings.length ? bookings.map((booking) => `
                            <article class="booking-card">
                                <img src="${booking.coverImage}" alt="${booking.title}">
                                <div class="booking-card-content">
                                    <div class="booking-card-top">
                                        <div>
                                            <span class="traveler-status-pill ${booking.status === "Confirmed" ? "success" : booking.status === "Cancelled" ? "danger" : ""}">${booking.status}</span>
                                            <h2>${booking.title}</h2>
                                            <p>${booking.destination}</p>
                                            <p>${formatDate(booking.startDate)} - ${formatDate(booking.endDate)} • ID: ${booking.id}</p>
                                        </div>
                                        <div class="booking-price-block">
                                            <span>Total paid</span>
                                            <strong>${formatCurrency(booking.amount)}</strong>
                                        </div>
                                    </div>
                                    <div class="booking-card-actions">
                                        <button type="button" class="solid-btn small" data-open-doc="${booking.id}">View Tickets</button>
                                        <button type="button" class="ghost-btn small" data-edit-booking="${booking.id}">Edit</button>
                                        <button type="button" class="ghost-btn small" data-view-booking="${booking.id}">View Booking Details</button>
                                        <button type="button" class="danger-btn small" data-delete-booking="${booking.id}">Delete</button>
                                    </div>
                                </div>
                            </article>
                        `).join("") : createEmptyState("No bookings found", "Try clearing filters or add new confirmed plans from the trip planner.", "Bookings")}
                    </div>
                </section>
                ${renderEditModal(editingBooking)}
            </main>
        `;

        bindEvents();
    }

    function bindEvents() {
        container.querySelectorAll("[data-year-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                state.year = button.dataset.yearFilter;
                render();
            });
        });

        container.querySelector("#booking-status-filter")?.addEventListener("change", (event) => {
            state.status = event.target.value;
            render();
        });

        container.querySelector("#booking-search")?.addEventListener("input", (event) => {
            state.search = event.target.value.trim();
            render();
        });

        container.querySelectorAll("[data-view-booking]").forEach((button) => {
            button.addEventListener("click", () => {
                setSelectedBookingId(button.dataset.viewBooking);
                window.location.href = "./traveller_booking-details.html";
            });
        });

        container.querySelectorAll("[data-open-doc]").forEach((button) => {
            button.addEventListener("click", () => {
                const booking = getTravelerBookings().find((item) => item.id === button.dataset.openDoc);
                if (!booking) {
                    showWorkspaceToast("The selected booking is missing.", "error");
                    return;
                }

                const readyCount = booking.documents.filter((document) => document.status === "Ready").length;
                showWorkspaceToast(`${readyCount} travel documents are ready for ${booking.title}.`);
            });
        });

        container.querySelectorAll("[data-edit-booking]").forEach((button) => {
            button.addEventListener("click", () => {
                state.editingBookingId = button.dataset.editBooking;
                state.errors = {};
                render();
            });
        });

        container.querySelectorAll("[data-delete-booking]").forEach((button) => {
            button.addEventListener("click", () => {
                const bookings = getTravelerBookings();
                const nextBookings = bookings.filter((booking) => booking.id !== button.dataset.deleteBooking);

                if (nextBookings.length === bookings.length) {
                    showWorkspaceToast("That booking was already removed.", "error");
                    return;
                }

                saveTravelerBookings(nextBookings);
                showWorkspaceToast("Booking deleted.");
                render();
            });
        });

        container.querySelector("#close-booking-modal")?.addEventListener("click", () => {
            state.editingBookingId = null;
            state.errors = {};
            render();
        });

        container.querySelector("#reset-booking-modal")?.addEventListener("click", () => {
            state.errors = {};
            render();
        });

        container.querySelector("#booking-edit-form")?.addEventListener("submit", (event) => {
            event.preventDefault();

            const form = event.currentTarget;
            const payload = {
                startDate: form.elements.startDate.value,
                endDate: form.elements.endDate.value,
                travellers: Number(form.elements.travellers.value),
                status: form.elements.status.value
            };

            const errors = validateBookingUpdate(payload);
            state.errors = errors;

            if (Object.keys(errors).length) {
                showWorkspaceToast("Please correct the booking form.", "error");
                render();
                return;
            }

            const bookingId = form.elements.bookingId.value;
            const bookings = getTravelerBookings();
            const index = bookings.findIndex((booking) => Number(booking.id) === Number(bookingId));

            if (index === -1) {
                showWorkspaceToast("That booking no longer exists.", "error");
                render();
                return;
            }

            const updatedBooking = {
                ...bookings[index],
                ...payload,
                duration: calculateTripLength(payload.startDate, payload.endDate),
                year: payload.startDate.slice(0, 4)
            };

            bookings[index] = updatedBooking;
            saveTravelerBookings(bookings);
            state.editingBookingId = null;
            state.errors = {};
            showWorkspaceToast("Booking updated.");
            render();
        });

        container.querySelector('input[name="travellers"]')?.addEventListener("input", (event) => {
            const field = event.currentTarget;
            const digitsOnly = field.value.replace(/[^\d]/g, "");

            if (!digitsOnly) {
                field.value = "";
                return;
            }

            const clampedValue = Math.min(8, Math.max(1, Number.parseInt(digitsOnly, 10)));
            field.value = String(clampedValue);
        });
    }

    render();
}
