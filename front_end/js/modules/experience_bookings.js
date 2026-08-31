import { bookingsData } from "../api/legacyData.js";
import { fetchExperiencePartnerBookings, updateExperienceBookingStatus } from "../api/services.js";
import {
    closeModal,
    getBookingStatusMeta,
    readStorage,
    setElementText,
    writeStorage,
    showAppAlert
} from "./experience_shared.js";

export async function renderExperienceBookingsPage() {
    const container = document.getElementById("bookingList");
    const filterExperience = document.getElementById("experienceFilter");
    const filterStatus = document.getElementById("statusFilter");
    const modal = document.getElementById("bookingModal");
    const modalClose = document.getElementById("bookingModalClose");
    
    let experienceBookings = [];
    try {
        const backendBookings = await fetchExperiencePartnerBookings();
        if (backendBookings && backendBookings.length > 0) {
            const grouped = {};
            backendBookings.forEach((b) => {
                const expTitle = b.experience?.title || "Unknown Experience";
                const date = b.date || "";
                const time = b.time || "";
                const key = `${expTitle}|${date}|${time}`;
                
                if (!grouped[key]) {
                    grouped[key] = {
                        title: expTitle,
                        date: date,
                        time: time,
                        users: []
                    };
                }
                
                grouped[key].users.push({
                    id: String(b.id),
                    name: b.guestName,
                    email: b.email,
                    phone: b.phone,
                    seats: b.participants,
                    status: b.status ? b.status.toLowerCase() : "confirmed",
                    totalAmount: b.totalAmount
                });
            });
            experienceBookings = Object.values(grouped);
        } else {
            experienceBookings = [];
        }
    } catch (error) {
        console.warn("Failed to fetch experience bookings from backend", error);
        experienceBookings = [];
    }

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
            <option value="checked_in">Checked-In</option>
            <option value="end_requested">Pending Confirm</option>
            <option value="completed">Completed</option>
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
                    
                    const uStatus = String(user.status).toLowerCase();
                    const userStatusGroup = (uStatus === "checked" || uStatus === "checked_in") ? "checked_in" :
                                            (uStatus === "end_requested") ? "end_requested" :
                                            (uStatus === "completed") ? "completed" :
                                            (uStatus === "cancelled") ? "cancelled" :
                                            "confirmed";
                                            
                    const statusMatch = selectedStatus === "all" || userStatusGroup === selectedStatus;
                    return experienceMatch && statusMatch;
                })
            }))
            .filter((exp) => exp.users.length)
            .sort((a, b) => {
                if (a.date !== b.date) {
                    return new Date(a.date) - new Date(b.date);
                }
                return a.time.localeCompare(b.time);
            });

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
                                ${user.status === "confirmed" || user.status === "CONFIRMED"
                                    ? `<button type="button" class="primary-btn" data-action="check-in" data-id="${user.id}">Mark Check-in</button>`
                                    : (user.status === "checked" || user.status === "checked_in" || user.status === "CHECKED_IN")
                                        ? `<button type="button" class="btn-outline-blue" data-action="request-end" data-id="${user.id}">Request End</button>`
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
        setElementText("modalPhone", user.phone || "+1 (555) 123-4567");
        setElementText("modalEmail", user.email || `${user.name.toLowerCase().replace(/\s+/g, ".")}@email.com`);
        setElementText("modalAmount", formatAmount(user.totalAmount || (user.seats * 90)));
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

    async function markCheckIn(id) {
        try {
            await updateExperienceBookingStatus(id, "CHECKED_IN");
            
            // Notify traveller tab of the state change
            writeStorage("experienceBookings_trigger", Date.now().toString());
            renderExperienceBookingsPage();
        } catch (error) {
            console.error("Failed to check in:", error);
            showAppAlert("Failed to mark check-in. Please try again.", "Error");
        }
    }

    async function markRequestEnd(id) {
        try {
            await updateExperienceBookingStatus(id, "END_REQUESTED");
            
            // Notify traveller tab of the state change
            writeStorage("experienceBookings_trigger", Date.now().toString());
            renderExperienceBookingsPage();
            showAppAlert("End of experience requested. Waiting for traveler confirmation.", "Success");
        } catch (error) {
            console.error("Failed to request end:", error);
            showAppAlert("Failed to request end of experience. Please try again.", "Error");
        }
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

            if (actionButton.dataset.action === "request-end") {
                markRequestEnd(actionButton.dataset.id);
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

    if (!window.__hostExperienceStorageListenerAttached) {
        window.addEventListener("storage", (e) => {
            if (e.key === "experienceBookings" || e.key === "tours" || e.key === "experienceBookings_trigger") {
                // Re-fetch backend data and re-render if the container is still present
                if (document.getElementById("bookingList")) {
                    renderExperienceBookingsPage();
                }
            }
        });
        window.__hostExperienceStorageListenerAttached = true;
    }
}
