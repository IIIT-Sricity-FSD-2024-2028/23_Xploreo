const API = "http://localhost:3000/api";
function authHeaders() {
    return {
        "Content-Type": "application/json",
        "x-user-id":   localStorage.getItem("userID")   || "",
        "x-user-role": localStorage.getItem("userRole") || ""
    };
}

export async function renderTechAdminDashboard(containerId) {
    console.log("Rendering Tech Admin Dashboard...");

    // Show/hide dashboard panels
    const techDash  = document.getElementById("tech-admin-dashboard");
    const adminDash = document.getElementById("admin-dashboard");
    const mainDash  = document.getElementById("main");
    const hotelDash = document.getElementById("hotel-dashboard");
    if (techDash)  techDash.style.display  = "block";
    if (adminDash) adminDash.style.display = "none";
    if (mainDash)  mainDash.style.display  = "none";
    if (hotelDash) hotelDash.style.display = "none";

    // Fetch tickets from backend, fallback to localStorage
    let tickets = [];
    let users = [];
    try {
        const [tickRes, userRes] = await Promise.all([
            fetch(`${API}/tickets`, { headers: authHeaders() }),
            fetch(`${API}/auth/users`, { headers: authHeaders() })
        ]);
        if (tickRes.ok) {
            const tj = await tickRes.json();
            tickets = Array.isArray(tj.data) ? tj.data : (Array.isArray(tj) ? tj : []);
            localStorage.setItem("tickets", JSON.stringify(tickets));
        } else {
            const cached = localStorage.getItem("techAdminData");
            tickets = cached ? (JSON.parse(cached).tickets || []) : [];
        }
        if (userRes.ok) {
            const uj = await userRes.json();
            users = Array.isArray(uj.data) ? uj.data : (Array.isArray(uj) ? uj : []);
            localStorage.setItem("users", JSON.stringify(users));
        } else {
            users = JSON.parse(localStorage.getItem("users") || "[]");
        }
    } catch {
        const cached = localStorage.getItem("techAdminData");
        tickets = cached ? (JSON.parse(cached).tickets || []) : [];
        users   = JSON.parse(localStorage.getItem("users") || "[]");
    }

    const techAdminData = JSON.parse(localStorage.getItem("techAdminData")) || {};
    const logs     = techAdminData.systemLogs   || [];
    const activity = techAdminData.userActivity || [];

    const total               = tickets.length;
    const pendingTicketsCount = tickets.filter(t => t && (t.status === "pending" || t.status === "in-progress")).length;
    const resolvedTicketsCount = tickets.filter(t => t && (t.status === "resolved" || t.status === "rejected")).length;
    const activeUsersCount    = users.filter(u => u && (u.role === "guide" || u.role === "traveller") && u.status === "active").length;
    const criticalAlerts      = logs.filter(log => log && log.type === "error").length;

    // 1. Stats
    const statsContainer = document.getElementById("tech-stats");
    if (statsContainer) {
        const stats = [
            { label: "Total Tickets",    value: total,               icon: "../../components/ui/support.svg",    color: "blue",        path: "./tech_tickets.html" },
            { label: "Pending Tickets",  value: pendingTicketsCount,  icon: "../../components/ui/support.svg",    color: "orange",      path: "./tech_tickets.html?status=pending" },
            { label: "Resolved Tickets", value: resolvedTicketsCount, icon: "../../components/ui/support.svg",    color: "light-green", path: "./tech_tickets.html?status=resolved" },
            { label: "Active Users",     value: activeUsersCount,     icon: "../../components/ui/users.png",      color: "violet",      path: "./tech_activity.html" },
            { label: "System Alerts",    value: criticalAlerts,       icon: "../../components/ui/operations.png", color: "red",         path: "./tech_logs.html" }
        ];
        statsContainer.innerHTML = stats.map(stat => `
            <div class="stat-card ${stat.color}" onclick="window.location.href='${stat.path}'">
                <div class="icon-container">
                    <img src="${stat.icon}" alt="icon" class="icon-img">
                </div>
                <p class="stat-label">${stat.label}</p>
                <h2 class="stat-value">${stat.value}</h2>
            </div>
        `).join("");
    }

    // 2. Live Ticket Overview Table
    const ticketsContainer = document.getElementById("recent-tickets");
    if (ticketsContainer) {
        const latest = [...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        ticketsContainer.innerHTML = `
            <div class="card-header">
                <div>
                    <h2>Live Ticket Overview</h2>
                    <p>Recent support requests across the platform</p>
                </div>
                <button class="view-all-btn" onclick="window.location.href='./tech_tickets.html'">View All</button>
            </div>
            <table class="tour-table">
                <thead>
                    <tr>
                        <th>ID</th><th>User</th><th>Subject</th><th>Status</th><th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    ${latest.length > 0 ? latest.map(t => `
                        <tr>
                            <td style="font-weight:600;color:#2563EB;">${t.id}</td>
                            <td>${t.userName || "-"}</td>
                            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.subject || "-"}</td>
                            <td><span class="status-tag ${t.status}">${t.status}</span></td>
                            <td><span class="status-tag ${t.priority}">${t.priority}</span></td>
                        </tr>
                    `).join("") : '<tr><td colspan="5" style="text-align:center;padding:20px;">No recent tickets.</td></tr>'}
                </tbody>
            </table>
        `;
    }

    // 3. System Health
    const healthContainer = document.getElementById("system-health");
    if (healthContainer) {
        const cpuUtil = 30 + Math.floor(Math.random() * 20);
        const memUtil = 40 + Math.floor(Math.random() * 15);
        healthContainer.innerHTML = `
            <div class="card-header"><h2>System Health</h2></div>
            <div class="health-metrics" style="margin-top:15px;">
                <div class="metric" style="margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:600;">API Performance</span>
                        <span style="color:#10B981;font-weight:700;">98.4%</span>
                    </div>
                    <div class="progress-bar-container" style="background:#E5E7EB;height:8px;border-radius:4px;">
                        <div class="progress-fill" style="width:98.4%;background:#10B981;height:100%;border-radius:4px;"></div>
                    </div>
                </div>
                <div class="metric" style="margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:600;">CPU Utilization</span>
                        <span style="color:#2563EB;font-weight:700;">${cpuUtil}%</span>
                    </div>
                    <div class="progress-bar-container" style="background:#E5E7EB;height:8px;border-radius:4px;">
                        <div class="progress-fill" style="width:${cpuUtil}%;background:#2563EB;height:100%;border-radius:4px;"></div>
                    </div>
                </div>
                <div class="metric" style="margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:600;">Memory Usage</span>
                        <span style="color:#8B5CF6;font-weight:700;">${memUtil}%</span>
                    </div>
                    <div class="progress-bar-container" style="background:#E5E7EB;height:8px;border-radius:4px;">
                        <div class="progress-fill" style="width:${memUtil}%;background:#8B5CF6;height:100%;border-radius:4px;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 4. Recent Activity Feed
    const alertsContainer = document.getElementById("tech-alerts");
    if (alertsContainer) {
        const activities = activity.slice(0, 5);
        alertsContainer.innerHTML = `
            <div class="card-header"><h2>Recent Activity Feed</h2></div>
            <div class="activity-list" style="margin-top:15px;">
                ${activities.length > 0 ? activities.map(act => `
                    <div class="activity-item" style="padding:12px 0;border-bottom:1px solid #F3F4F6;display:flex;gap:12px;align-items:center;">
                        <div style="width:36px;height:36px;background:#EEF2FF;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                            <img src="../../components/ui/user.svg" style="width:18px;opacity:0.8;">
                        </div>
                        <div style="flex:1;">
                            <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${act.userName}</p>
                            <p style="margin:0;font-size:12px;color:#4B5563;">${act.action}</p>
                        </div>
                        <span style="font-size:11px;color:#9CA3AF;white-space:nowrap;">${new Date(act.timestamp).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span>
                    </div>
                `).join("") : '<p style="text-align:center;padding:20px;font-size:13px;color:#6B7280;">No recent activity.</p>'}
            </div>
            <button class="secondary-btn" style="width:100%;margin-top:20px;font-size:13px;height:40px;" onclick="window.location.href='./tech_activity.html'">View Full Activity Log</button>
        `;
    }
}



