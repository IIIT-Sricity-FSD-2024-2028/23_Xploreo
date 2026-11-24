import { renderChart }    from "./modules/chart.js";
import { renderPartners } from "./modules/partners.js";
import { renderAlerts }   from "./modules/alerts.js";
import { renderActivity } from "./modules/activity.js";
import { apiGetAndSync }  from "./utils/api.js";

// safe fallbacks: -1 for numbers, # for strings
const num = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);

async function loadDashboardData() {
    const [users, partners] = await Promise.all([
        apiGetAndSync("/auth/users", "users", []),
        apiGetAndSync("/partners",   "partners", [])
    ]);
    return { users, partners };
}

export async function renderAdminDashboard(containerId) {
    // Show/hide wrappers
    const adminWrapper = document.getElementById("admin-dashboard");
    const guideWrapper = document.getElementById("main");
    if (adminWrapper) adminWrapper.style.display = "block";
    if (guideWrapper) guideWrapper.style.display = "none";

    // Header
    const header = document.getElementById("admin-header");
    if (header) {
        header.innerHTML = `
            <div class="dashboard-header">
                <h1 style="margin-top: 0;">Operations Dashboard</h1>
                <p>Real-time performance monitoring and ecosystem health.</p>
            </div>
        `;
    }

    // Fetch live data
    const { users, partners } = await loadDashboardData();

    const totalUsers    = Array.isArray(users)    ? users.length    : -1;
    const totalBookings = Array.isArray(partners)  ? partners.reduce((s, p) => s + num(p.bookings), 0) : -1;
    const totalRevenue  = Array.isArray(partners)  ? partners.reduce((s, p) => s + num(p.revenue),  0) : -1;
    const activePartners = Array.isArray(partners) ? partners.filter(p => num(p.bookings) > 500).length : -1;

    const revenueStr = totalRevenue === -1
        ? "#"
        : "₹" + (totalRevenue / 10000000).toFixed(3) + "Cr";

    const adminData = [
        { label: "TOTAL USERS",     value: totalUsers    === -1 ? -1 : totalUsers.toLocaleString(),    subtext: "↗ live from backend", subClass: "green",     color: "blue",       icon: "../../components/ui/users.png" },
        { label: "GROSS REVENUE",   value: revenueStr,                                                  subtext: "live revenue",        subClass: "green",     color: "dark-green", icon: "../../components/ui/finance.png" },
        { label: "TOTAL BOOKINGS",  value: totalBookings === -1 ? -1 : totalBookings.toLocaleString(), subtext: "live bookings",       subClass: "blue-text", color: "violet",     icon: "../../components/ui/operations.png" },
        { label: "ACTIVE PARTNERS", value: activePartners,                                              subtext: "bookings > 500",      subClass: "",          color: "orange",     icon: "../../components/ui/users.png" }
    ];

    const statsContainer = document.getElementById("admin-stats");
    if (statsContainer) {
        statsContainer.innerHTML = adminData.map(stat => `
            <div class="stat-card ${stat.color || "blue"}">
                ${stat.icon ? `<div class="card-icon"><img src="${stat.icon}" alt="icon"></div>` : ""}
                <p class="stat-label">${stat.label}</p>
                <h2 class="stat-value">${stat.value}</h2>
                <p class="stat-subtext ${stat.subClass || ""}">${stat.subtext || ""}</p>
            </div>
        `).join("");
    }

    renderChart("admin-chart");
    renderPartners("admin-partners");
    renderAlerts("admin-alerts");
    renderActivity("admin-activity");
}
