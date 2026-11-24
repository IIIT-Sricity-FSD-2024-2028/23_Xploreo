// Non-Technical Admin Dashboard Renderer
import { apiGetAndSync } from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);
const S = (v) => (v == null || v === "") ? "#" : v;

export async function renderNtaDashboard(containerId) {
    console.log("Rendering Non-Technical Admin Dashboard...");

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

    const plans   = await apiGetAndSync("/plans", "ntaPlans",   []);
    const activity = (() => { try { return JSON.parse(localStorage.getItem("ntaActivity") || "[]"); } catch { return []; } })();

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
    const recentBookings = activity.filter(a => a.type === "booking").length;

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
        const totalDestinations = [...new Set(plans.map(p => S(p.destination)).filter(d => d !== "#"))].length;
        const avgPrice = plans.length > 0 ? Math.round(plans.reduce((sum, p) => sum + N(p.price), 0) / plans.length) : -1;
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
                    <div class="value">₹${avgPrice === -1 ? "-1" : avgPrice.toLocaleString()}</div>
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
                            <p class="nta-activity-action">${item.action}</p>
                            <p class="nta-activity-detail">${item.detail}</p>
                        </div>
                        <span class="nta-activity-time">${timeAgo}</span>
                    </div>
                `;
            }).join('') : '<p style="text-align: center; padding: 20px; color: #6b7280;">No recent activity.</p>'}
        `;
    }

    // --- 5. Package Pricing Chart ---
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
                <button class="view-all-btn" onclick="window.location.href='./nta_plans.html'">View Packages</button>
            </div>
            <div class="nta-mini-bars">
                ${plans.map((plan, i) => {
                    const heightPct = Math.max(((plan.price || 0) / maxPrice) * 100, 5);
                    return `
                        <div class="nta-mini-bar-wrapper">
                            <span class="nta-mini-bar-value">₹${N(plan.price) === -1 ? "-1" : N(plan.price).toLocaleString()}</span>
                            <div class="nta-mini-bar ${barColors[i % barColors.length]}" style="height: ${heightPct}%;"></div>
                            <span class="nta-mini-bar-label" title="${S(plan.name)}">${S(plan.name) === "#" ? "#" : S(plan.name).split(" ").slice(0, 2).join(" ")}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
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
