// Non-Technical Admin Dashboard Renderer
import { nontechAdminData } from "../api/legacyData.js";

export function renderNtaDashboard(containerId) {
    console.log("Rendering Non-Technical Admin Dashboard...");

    // Initialize data in localStorage if not present
    if (!localStorage.getItem("ntaPlans")) {
        localStorage.setItem("ntaPlans", JSON.stringify(nontechAdminData.plans));
    }
    if (!localStorage.getItem("ntaActivity")) {
        localStorage.setItem("ntaActivity", JSON.stringify(nontechAdminData.recentActivity));
    }

    // Show the correct dashboard wrapper
    const ntaDash = document.getElementById("nta-dashboard");
    const adminDash = document.getElementById("admin-dashboard");
    const mainDash = document.getElementById("main");
    const hotelDash = document.getElementById("hotel-dashboard");
    const techDash = document.getElementById("tech-admin-dash");
    const expDash = document.getElementById("experience-dashboard");

    if (ntaDash) ntaDash.style.display = "flex";
    if (adminDash) adminDash.style.display = "none";
    if (mainDash) mainDash.style.display = "none";
    if (hotelDash) hotelDash.style.display = "none";
    if (techDash) techDash.style.display = "none";
    if (expDash) expDash.style.display = "none";

    const plans = JSON.parse(localStorage.getItem("ntaPlans")) || [];
    const activity = JSON.parse(localStorage.getItem("ntaActivity")) || [];
    const ntaBookings = JSON.parse(localStorage.getItem("ntaBookings")) || [];
    const allTours = JSON.parse(localStorage.getItem("tours")) || [];

    // Consolidate bookings from ntaBookings and unified tours
    const bookingsList = [...ntaBookings];
    allTours.forEach(tour => {
        if (!bookingsList.find(b => String(b.id) === String(tour.id))) {
            bookingsList.push({
                id: tour.id,
                packageName: tour.title,
                traveller: tour.customer,
                date: tour.dateTime?.split(" | ")[0] || "Flexible",
                status: tour.status ? (tour.status.charAt(0).toUpperCase() + tour.status.slice(1)) : "Confirmed",
                amount: tour.amount
            });
        }
    });

    // --- 1. Header ---
    const header = document.getElementById("nta-header");
    if (header) {
        header.innerHTML = `
            <div class="nta-page-header">
                <h1>Travel Packages Dashboard</h1>
                <p>Overview of your travel packages and recent activity.</p>
            </div>
        `;
    }

    // --- 2. Stats Cards ---
    const totalPlans = plans.length;
    const availablePlans = plans.filter(p => p.status === "available").length;
    const unavailablePlans = plans.filter(p => p.status === "unavailable").length;
    const recentBookings = bookingsList.length || activity.filter(a => a.type === "booking").length;

    const statsContainer = document.getElementById("nta-stats");
    if (statsContainer) {
        const stats = [
            { label: "Total Packages", value: totalPlans, icon: "📋", color: "blue" },
            { label: "Available", value: availablePlans, icon: "✅", color: "light-green" },
            { label: "Unavailable", value: unavailablePlans, icon: "⏸️", color: "orange" },
            { label: "Recent Bookings", value: recentBookings, icon: "🛒", color: "violet" }
        ];

        statsContainer.innerHTML = stats.map(stat => `
            <div class="stat-card ${stat.color}">
                <div class="icon-container">
                    <span style="font-size: 20px;">${stat.icon}</span>
                </div>
                <p class="stat-label">${stat.label}</p>
                <h2 class="stat-value">${stat.value}</h2>
            </div>
        `).join('');
    }

    // --- 3. Overview Section ---
    const overviewContainer = document.getElementById("nta-overview");
    if (overviewContainer) {
        const totalDestinations = [...new Set(plans.map(p => p.destination).filter(Boolean))].length;
        const avgPrice = plans.length > 0 ? Math.round(plans.reduce((sum, p) => sum + p.price, 0) / plans.length) : 0;
        const categories = [...new Set(plans.map(p => p.category).filter(Boolean))];

        overviewContainer.innerHTML = `
            <div class="card-header">
                <div>
                    <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #111827;">Quick Overview</h2>
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">Key numbers at a glance</p>
                </div>
            </div>
            <div class="nta-overview-grid">
                <div class="nta-overview-item">
                    <div class="label">Destinations</div>
                    <div class="value">${totalDestinations}</div>
                    <div class="hint">Unique locations covered</div>
                </div>
                <div class="nta-overview-item">
                    <div class="label">Average Price</div>
                    <div class="value">₹${avgPrice.toLocaleString()}</div>
                    <div class="hint">Per package</div>
                </div>
                <div class="nta-overview-item">
                    <div class="label">Categories</div>
                    <div class="value" style="font-size: 16px;">${categories.length}</div>
                    <div class="hint">${categories.join(', ') || 'N/A'}</div>
                </div>
            </div>
        `;
    }

    // --- 4. Recent Activity ---
    const activityContainer = document.getElementById("nta-activity");
    if (activityContainer) {
        const recentItems = activity.slice(0, 6);
        const iconMap = {
            create: { icon: "➕", cls: "create" },
            update: { icon: "✏️", cls: "update" },
            status: { icon: "🔄", cls: "status" },
            booking: { icon: "🧳", cls: "purchase" }
        };

        activityContainer.innerHTML = `
            <h2>Recent Activity</h2>
            ${recentItems.length > 0 ? recentItems.map(item => {
                const meta = iconMap[item.type] || { icon: "📝", cls: "update" };
                const timeAgo = getTimeAgo(item.timestamp);
                return `
                    <div class="nta-activity-item">
                        <div class="nta-activity-icon ${meta.cls}">
                            ${meta.icon}
                        </div>
                        <div class="nta-activity-content">
                            <p class="nta-activity-action">${escapeHtml(item.action)}</p>
                            <p class="nta-activity-detail">${escapeHtml(item.detail)}</p>
                        </div>
                        <span class="nta-activity-time">${timeAgo}</span>
                    </div>
                `;
            }).join('') : '<p style="text-align: center; padding: 20px; color: #6b7280;">No recent activity.</p>'}
        `;
    }

    // --- 5. Bookings Visibility Section ---
    let bookingsContainer = document.getElementById("nta-bookings");
    if (!bookingsContainer) {
        const chartElem = document.getElementById("nta-chart");
        if (chartElem) {
            bookingsContainer = document.createElement("div");
            bookingsContainer.id = "nta-bookings";
            bookingsContainer.className = "nta-plans-card";
            bookingsContainer.style.marginTop = "20px";
            chartElem.parentNode.insertBefore(bookingsContainer, chartElem);
        }
    }

    if (bookingsContainer) {
        bookingsContainer.innerHTML = `
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #111827;">Recent Package Bookings</h2>
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">Live bookings across all travel packages</p>
                </div>
                <span class="nta-status-pill available">${bookingsList.length} Total Bookings</span>
            </div>
            ${bookingsList.length > 0 ? `
                <div style="overflow-x: auto;">
                    <table class="nta-plans-table">
                        <thead>
                            <tr>
                                <th>Package Name</th>
                                <th>Traveller</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookingsList.map(b => `
                                <tr>
                                    <td>
                                        <div class="nta-plan-name">${escapeHtml(b.packageName || "Custom Package")}</div>
                                        <div class="nta-plan-desc">Booking #${escapeHtml(String(b.id))}</div>
                                    </td>
                                    <td>
                                        <div style="font-weight: 500; color: #111827;">${escapeHtml(b.traveller || "Traveler")}</div>
                                    </td>
                                    <td>
                                        <div class="nta-plan-duration">${escapeHtml(b.date || "Flexible")}</div>
                                    </td>
                                    <td>
                                        <span class="nta-status-pill ${String(b.status).toLowerCase() === 'confirmed' || String(b.status).toLowerCase() === 'active' ? 'available' : 'unavailable'}">
                                            ${escapeHtml(b.status || "Confirmed")}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="nta-empty-state">
                    <p>No package bookings recorded yet.</p>
                </div>
            `}
        `;
    }

    // --- 6. Package Pricing Chart ---
    const chartContainer = document.getElementById("nta-chart");
    if (chartContainer) {
        const maxPrice = Math.max(...plans.map(p => p.price || 0), 1);
        const barColors = ['bar-blue', 'bar-green', 'bar-violet', 'bar-orange', 'bar-teal', 'bar-pink'];

        chartContainer.innerHTML = `
            <div class="card-header">
                <div>
                    <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #111827;">Package Pricing</h2>
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">Price comparison across travel packages</p>
                </div>
                <button class="view-all-btn" onclick="window.location.href='nta_plans.html'">View Packages</button>
            </div>
            <div class="nta-mini-bars">
                ${plans.map((plan, i) => {
                    const heightPct = Math.max(((plan.price || 0) / maxPrice) * 100, 5);
                    return `
                        <div class="nta-mini-bar-wrapper">
                            <span class="nta-mini-bar-value">₹${(plan.price || 0).toLocaleString()}</span>
                            <div class="nta-mini-bar ${barColors[i % barColors.length]}" style="height: ${heightPct}%;"></div>
                            <span class="nta-mini-bar-label" title="${plan.name}">${plan.name.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// Helper: Relative time
function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
