import { homeTestimonials, experiences as experienceCatalog, bookingsData } from "../api/legacyData.js";
import { calculateDashboardStats, readStorage } from "./experience_shared.js";

export function renderExperienceHomePage() {
    const catalog = readStorage("experienceCatalog", experienceCatalog);
    const bookingsList = readStorage("experienceBookings", bookingsData);
    const stats = document.getElementById("stats");
    const alerts = document.getElementById("alerts");
    const schedule = document.getElementById("schedule");
    const bookings = document.getElementById("bookings");
    const reviews = document.getElementById("reviewsContainer");
    const viewAllBookingsButton = document.querySelector(".home-view-all-btn");

    // Dynamic Stats
    const dynamicStats = calculateDashboardStats(catalog, bookingsList);

    const todayRaw = new Date().toISOString().split("T")[0];
    const todayLabel = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    // Derive Today's Schedule from Catalog Slots
    const todaySchedule = catalog.flatMap(exp => 
        (exp.slots || [])
            .filter(slot => slot.date === todayRaw)
            .map(slot => ({ ...slot, title: exp.title }))
    ).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    const alertItems = todaySchedule.map((item) => {
        const percent = (item.booked / item.capacity) * 100;

        if (percent === 100) {
            return {
                ...item,
                message: `${item.title} (${item.time}) is fully booked - demand is high - add another session to maximize bookings`,
                tone: "high"
            };
        }

        if (percent > 85) {
            return {
                ...item,
                message: `${item.title} (${item.time}) is nearly full - consider adding an extra slot`,
                tone: "medium"
            };
        }

        if (percent < 40 && item.booked < 2) {
            return {
                ...item,
                message: `${item.title} (${item.time}) has low bookings - consider promotion or pricing adjustment`,
                tone: "low"
            };
        }

        return null;
    }).filter(Boolean);

    if (stats) {
        stats.innerHTML = `
            <div class="stat-card experience-stat-card blue">
                <p>Today's Bookings</p>
                <h2>${dynamicStats.today}</h2>
                <span>Guests arriving today</span>
            </div>
            <div class="stat-card experience-stat-card light-green">
                <p>Upcoming Sessions</p>
                <h2>${dynamicStats.upcoming}</h2>
                <span>Future sessions scheduled</span>
            </div>
            <div class="stat-card experience-stat-card dark-green">
                <p>Total Bookings</p>
                <h2>${dynamicStats.total}</h2>
                <span>Across all active experiences</span>
            </div>
            <div class="stat-card experience-stat-card orange">
                <p>Average Rating</p>
                <h2>${dynamicStats.rating}</h2>
                <span>Current guest sentiment</span>
            </div>
        `;
    }

    if (alerts) {
        alerts.innerHTML = alertItems.length
            ? alertItems.map((item) => `
                <article class="alert-main alert-banner alert-${item.tone}">
                    <span class="alert-icon">${item.tone === "low" ? "i" : "!"}</span>
                    <p>${item.message}</p>
                </article>
            `).join("")
            : `<div class="empty-state compact"><h3>All clear</h3><p>No operational alerts for today.</p></div>`;
    }

    if (schedule) {
        schedule.innerHTML = `
            <p class="schedule-date-label">${todayLabel}</p>
            <div class="schedule-stack">
                ${todaySchedule.length ? todaySchedule.map((item) => {
                    const percent = (item.booked / item.capacity) * 100;
                    let status = "Available";
                    let statusClass = "available";
                    let progressClass = "green";

                    if (percent > 85) {
                        status = "Nearly Full";
                        statusClass = "nearly-full";
                        progressClass = "warning";
                    }

                    if (percent === 100) {
                        status = "Full";
                        statusClass = "full";
                        progressClass = "red";
                    }

                    return `
                        <article class="tour-card experience-schedule-row">
                            <div class="schedule-row-top">
                                <h2>${item.title}</h2>
                                <button type="button" class="schedule-manage-btn" data-schedule-title="${item.title}">Manage Slots</button>
                            </div>
                            <p class="schedule-time">${item.time}</p>
                            <div class="schedule-row-bottom">
                                <p class="schedule-seat-count">${item.booked}/${item.capacity} seats</p>
                                <span class="status-pill ${statusClass}">${status}</span>
                            </div>
                            <div class="progress-bar-container schedule-progress">
                                <div class="progress-fill ${progressClass}" style="width:${percent}%"></div>
                            </div>
                        </article>
                    `;
                }).join("") : `<div class="empty-state compact"><h3>No sessions today</h3><p>Enjoy your day off or add a new slot!</p></div>`}
            </div>
        `;

        schedule.onclick = (event) => {
            const button = event.target.closest(".schedule-manage-btn");
            if (!button) return;

            const scheduleTitle = button.dataset.scheduleTitle;
            const params = new URLSearchParams();
            if (scheduleTitle) params.set("manage", scheduleTitle);
            window.location.href = `../pages/experience_experience.html${params.toString() ? `?${params.toString()}` : ""}`;
        };
    }

    if (bookings) {
        // Show only the 4 most recent upcoming bookings for the dashboard
        const flattenedBookings = bookingsList.flatMap(exp => 
            exp.users.map(u => ({
                guestName: u.name,
                experienceName: exp.title,
                date: exp.date,
                time: exp.time,
                seats: u.seats
            }))
        ).sort((a,b) => {
            if (a.date !== b.date) {
                return new Date(a.date) - new Date(b.date);
            }
            return timeToMinutes(a.time) - timeToMinutes(b.time);
        });

        bookings.innerHTML = flattenedBookings.length ? flattenedBookings.slice(0, 4).map((booking) => {
            return `
                <article class="transaction-row experience-transaction-row">
                    <div class="booking-person">
                        <strong>${booking.guestName}</strong>
                        <p>${booking.experienceName}</p>
                    </div>
                    <div class="booking-datetime">
                        <span>${booking.date}</span>
                        <span>${booking.time}</span>
                    </div>
                    <span class="section-chip booking-seat-chip">${booking.seats} seats</span>
                </article>
            `;
        }).join("") : `<div class="empty-state compact"><h3>No upcoming bookings</h3><p>Keep sharing your experience!</p></div>`;
    }

    if (viewAllBookingsButton) {
        viewAllBookingsButton.onclick = () => {
            window.location.href = "../pages/experience_bookings.html";
        };
    }

    if (reviews) {
        reviews.innerHTML = homeTestimonials.map((review) => `
            <article class="review-card">
                <img src="${review.image}" class="review-img" alt="${review.name}" />
                <div class="review-content">
                    <h3>${review.name}</h3>
                    <div class="stars">${"⭐".repeat(review.rating)}</div>
                    <p>${review.comment}</p>
                </div>
            </article>
        `).join("");
    }
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
