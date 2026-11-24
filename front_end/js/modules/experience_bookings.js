const bookingsData = (() => { try { return JSON.parse(localStorage.getItem("experienceBookings") || "[]"); } catch { return []; } })();
import {
    closeModal,
    getBookingStatusMeta,
    readStorage,
    setElementText,
    writeStorage
} from "./experience_shared.js";

export function renderExperienceBookingsPage() {
    const container = document.getElementById("bookingList");
    const filterExperience = document.getElementById("experienceFilter");
    const filterStatus = document.getElementById("statusFilter");
    const modal = document.getElementById("bookingModal");
    const modalClose = document.getElementById("bookingModalClose");
    let experienceBookings = readStorage("experienceBookings", bookingsData);

    function findBookingById(id) {
        for (const exp of experienceBookings) {
            const user = exp.users.find((item) => item.id === id);
            if (user) return { user, exp };
        }
        return null;
    }

    function populateFilters() {
        if (!filterExperience || !filterStatus) return;

        const options = ["all", ...new Set(experienceBookings.map((item) => item.title))];
        filterExperience.innerHTML = options.map((option) => `
            <option value="${option}">${option === "all" ? "All Experiences" : option}</option>
        `).join("");
        filterStatus.innerHTML = `
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked">Checked-In</option>
            <option value="cancelled">Cancelled</option>
        `;
    }

    function renderBookings() {
        if (!container) return;

        const selectedExperience = filterExperience?.value || "all";
        const selectedStatus = filterStatus?.value || "all";

        const filteredExperiences = experienceBookings
            .map((exp) => ({
                ...exp,
                users: exp.users.filter((user) => {
                    const experienceMatch = selectedExperience === "all" || exp.title === selectedExperience;
                    const statusMatch = selectedStatus === "all" || user.status === selectedStatus;
                    return experienceMatch && statusMatch;
                })
            }))
            .filter((exp) => exp.users.length);

        container.innerHTML = filteredExperiences.length ? filteredExperiences.map((exp) => {
            const totalGuests = exp.users.reduce((sum, user) => sum + user.seats, 0);

            return `
                <article class="card booking-card">
                    <header class="booking-card-header">
                        <div>
                            <h2>${exp.title}</h2>
                            <p>${exp.date} • ${exp.time}</p>
                        </div>
                        <div class="booking-card-summary">
                            <span class="section-chip">${exp.users.length} bookings</span>
                            <strong>Total Guests: ${totalGuests}</strong>
                        </div>
                    </header>
                    <div class="booking-table-header">
                        <span>Guest</span>
                        <span>Party Size</span>
                        <span>Status</span>
                        <span>Actions</span>
                    </div>
                    ${exp.users.map((user) => `
                        <div class="booking-user-row">
                            <div>
                                <strong>${user.name}</strong><br>
                                <span class="booking-subtext">${user.id}</span>
                            </div>
                            <div>${user.seats} guests</div>
                            <div><span class="status ${getBookingStatusMeta(user.status).className}">${getBookingStatusMeta(user.status).label}</span></div>
                            <div class="booking-actions">
                                <button type="button" data-action="view-booking" data-id="${user.id}">View Details</button>
                                ${user.status === "confirmed"
                                    ? `<button type="button" class="primary-btn" data-action="check-in" data-id="${user.id}">Mark Check-in</button>`
                                    : user.status === "checked"
                                        ? `<span class="booking-checked-label">Checked-in</span>`
                                        : ""}
                            </div>
                        </div>
                    `).join("")}
                </article>
            `;
        }).join("")
            : `<div class="empty-state"><h3>No bookings found</h3><p>Try changing your filters.</p></div>`;
    }

    function openBookingDetails(id) {
        const result = findBookingById(id);
        if (!result || !modal) return;

        const { user, exp } = result;
        modal.style.display = "flex";

        setElementText("modalName", user.name);
        setElementText("modalId", user.id);
        setElementText("modalExperience", exp.title);
        setElementText("modalDate", exp.date);
        setElementText("modalTime", exp.time);
        setElementText("modalGuests", `${user.seats} guests`);
        setElementText("modalCustomer", user.name);
        setElementText("modalPhone", "+1 (555) 123-4567");
        setElementText("modalEmail", `${user.name.toLowerCase().replace(/\s+/g, ".")}@email.com`);
        setElementText("modalAmount", formatAmount(user.seats * 90));
        setElementText("modalPaymentStatus", user.status === "cancelled" ? "Refunded" : "Paid");

        const statusEl = document.getElementById("modalStatus");
        if (statusEl) {
            const statusMeta = getBookingStatusMeta(user.status);
            statusEl.textContent = statusMeta.label;
            statusEl.className = `status-badge ${statusMeta.className}`;
        }
    }

    function formatAmount(value) {
        return `$${value}`;
    }

    function markCheckIn(id) {
        experienceBookings = experienceBookings.map((exp) => ({
            ...exp,
            users: exp.users.map((user) => user.id === id ? { ...user, status: "checked" } : user)
        }));

        writeStorage("experienceBookings", experienceBookings);
        renderBookings();
    }

    function handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const expFilter = params.get("experience");
        if (expFilter && filterExperience) {
            filterExperience.value = expFilter;
            renderBookings();
        }
    }

    populateFilters();
    renderBookings();
    handleUrlParams();

    if (container) {
        container.onclick = (event) => {
            const actionButton = event.target.closest("[data-action]");
            if (!actionButton) return;

            if (actionButton.dataset.action === "view-booking") {
                openBookingDetails(actionButton.dataset.id);
                return;
            }

            if (actionButton.dataset.action === "check-in") {
                markCheckIn(actionButton.dataset.id);
            }
        };
    }

    if (modalClose) {
        modalClose.onclick = () => closeModal("bookingModal");
    }

    if (modal) {
        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModal("bookingModal");
            }
        };
    }
}
