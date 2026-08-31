import { fetchTickets } from "./api/services.js";

export async function renderTechAdminDashboard(containerId) {
    console.log("Rendering Tech Admin Dashboard...");
    let techAdminData = JSON.parse(localStorage.getItem("techAdminData")) || {
        tickets: [],
        systemLogs: [],
        userActivity: []
    };
    let users = JSON.parse(localStorage.getItem("users")) || [];
    
    // Explicitly show the dashboard before doing data processing
    const techDash = document.getElementById("tech-admin-dashboard") || document.getElementById("tech-admin-dash");
    const adminDash = document.getElementById("admin-dashboard");
    const mainDash = document.getElementById("main");
    const hotelDash = document.getElementById("hotel-dashboard");

    if (techDash) techDash.style.display = "block";
    if (adminDash) adminDash.style.display = "none";
    if (mainDash) mainDash.style.display = "none";
    if (hotelDash) hotelDash.style.display = "none";

    // Load real tickets from backend API
    let tickets = [];
    try {
        tickets = await fetchTickets();
    } catch (err) {
        console.warn("Using fallback local tickets for tech dashboard:", err);
        tickets = techAdminData.tickets || [];
    }

    const logs = techAdminData.systemLogs || [];
    const activity = techAdminData.userActivity || [];

    const total = tickets.length;
    const pendingTicketsCount = tickets.filter(t => t && (t.status === 'OPEN' || t.status === 'pending' || t.status === 'in-progress')).length;
    const resolvedTicketsCount = tickets.filter(t => t && (t.status === 'RESOLVED' || t.status === 'resolved')).length;
    const activeUsersCount = users ? users.filter(u => u && u.status === 'active').length : 5;
    const criticalAlerts = logs.filter(log => log && log.type === 'error').length;

    // 1. Render Stats
    const statsContainer = document.getElementById("tech-stats");
    if (statsContainer) {
        const stats = [
            { label: "Total Tickets", value: total, icon: "../components/ui/support.svg", color: "blue", path: "tech_tickets.html" },
            { label: "Pending Tickets", value: pendingTicketsCount, icon: "../components/ui/support.svg", color: "orange", path: "tech_tickets.html?status=pending" },
            { label: "Resolved Tickets", value: resolvedTicketsCount, icon: "../components/ui/support.svg", color: "light-green", path: "tech_tickets.html?status=resolved" },
            { label: "Active Users", value: activeUsersCount || 5, icon: "../components/ui/users.png", color: "violet" },
            { label: "System Health", value: "99.9%", icon: "../components/ui/operations.png", color: "light-green" }
        ];

        statsContainer.innerHTML = stats.map(stat => `
            <div class="stat-card ${stat.color}" ${stat.path ? `onclick="window.location.href='${stat.path}'" style="cursor: pointer;"` : `style="cursor: default;"`}>
                <div class="icon-container">
                    <img src="${stat.icon}" alt="icon" class="icon-img">
                </div>
                <p class="stat-label">${stat.label}</p>
                <h2 class="stat-value">${stat.value}</h2>
            </div>
        `).join('');
    }

    // 2. Render Live Ticket Overview (Table)
    const ticketsContainer = document.getElementById("recent-tickets");
    if (ticketsContainer) {
        const latestTickets = [...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        ticketsContainer.innerHTML = `
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <h2 style="margin: 0 0 4px; font-size: 18px; font-weight: 700;">Live Ticket Overview</h2>
                    <p style="margin: 0; color: #6B7280; font-size: 13px;">Recent support requests submitted across the platform</p>
                </div>
                <button class="view-all-btn" onclick="window.location.href='tech_tickets.html'" style="padding: 6px 14px; background: #2563EB; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">View All Tickets</button>
            </div>
            <table class="tour-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; border-bottom: 1px solid #E5E7EB;">
                        <th style="padding: 10px 8px;">Ticket ID</th>
                        <th style="padding: 10px 8px;">User & Role</th>
                        <th style="padding: 10px 8px;">Subject</th>
                        <th style="padding: 10px 8px;">Category</th>
                        <th style="padding: 10px 8px;">Priority</th>
                        <th style="padding: 10px 8px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${latestTickets.length > 0 ? latestTickets.map(ticket => {
                        const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'resolved';
                        const userRole = String(ticket.userRole || 'TRAVELLER').toUpperCase();
                        const userName = ticket.userName || ticket.travellerName || ticket.userId || 'User';
                        return `
                        <tr style="border-bottom: 1px solid #F3F4F6;">
                            <td style="font-weight: 700; color: #2563EB; padding: 12px 8px;">${ticket.id}</td>
                            <td style="padding: 12px 8px;">
                                <div style="font-weight: 600; color: #111827; font-size: 13px;">${escapeHtml(userName)}</div>
                                <div style="font-size: 11px; color: #6B7280; font-weight: 500;">${escapeHtml(userRole)}</div>
                            </td>
                            <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 12px 8px; font-size: 13px; color: #374151;">${escapeHtml(ticket.subject)}</td>
                            <td style="padding: 12px 8px; font-size: 13px; color: #6B7280;">${escapeHtml(ticket.category || 'General')}</td>
                            <td style="padding: 12px 8px;">
                                <span style="padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; ${
                                    ticket.priority === 'HIGH' ? 'background: #FEE2E2; color: #991B1B;' :
                                    ticket.priority === 'LOW' ? 'background: #F3F4F6; color: #374151;' :
                                    'background: #FFEDD5; color: #9A3412;'
                                }">${escapeHtml(ticket.priority || 'MEDIUM')}</span>
                            </td>
                            <td style="padding: 12px 8px;">
                                <span style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; ${
                                    isResolved ? 'background: #DCFCE7; color: #166534;' : 'background: #FEF9C3; color: #854D0E;'
                                }">${isResolved ? 'RESOLVED' : 'OPEN'}</span>
                            </td>
                        </tr>
                    `}).join('') : '<tr><td colspan="6" style="text-align: center; padding: 25px; color: #6B7280;">No recent tickets in queue.</td></tr>'}
                </tbody>
            </table>
        `;
    }

    // 3. Render System Health (Side)
    const healthContainer = document.getElementById("system-health");
    if (healthContainer) {
        const cpuUtil = 30 + Math.floor(Math.random() * 20);
        const memUtil = 40 + Math.floor(Math.random() * 15);
        healthContainer.innerHTML = `
            <div class="card-header">
                <h2>System Health</h2>
            </div>
            <div class="health-metrics" style="margin-top: 15px;">
                <div class="metric" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 14px; font-weight: 600;">API Performance</span>
                        <span style="color: #10B981; font-weight: 700;">98.4%</span>
                    </div>
                    <div class="progress-bar-container" style="background: #E5E7EB; height: 8px; border-radius: 4px;">
                        <div class="progress-fill" style="width: 98.4%; background: #10B981; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div class="metric" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 14px; font-weight: 600;">CPU Utilization</span>
                        <span style="color: #2563EB; font-weight: 700;">${cpuUtil}%</span>
                    </div>
                    <div class="progress-bar-container" style="background: #E5E7EB; height: 8px; border-radius: 4px;">
                        <div class="progress-fill" style="width: ${cpuUtil}%; background: #2563EB; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div class="metric" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 14px; font-weight: 600;">Memory Usage</span>
                        <span style="color: #8B5CF6; font-weight: 700;">${memUtil}%</span>
                    </div>
                    <div class="progress-bar-container" style="background: #E5E7EB; height: 8px; border-radius: 4px;">
                        <div class="progress-fill" style="width: ${memUtil}%; background: #8B5CF6; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 4. Render Recent Activity Feed
    const alertsContainer = document.getElementById("tech-alerts");
    if (alertsContainer) {
        const activities = activity.slice(0, 5);
        alertsContainer.innerHTML = `
            <div class="card-header">
                <h2>Recent Activity Feed</h2>
            </div>
            <div class="activity-list" style="margin-top: 15px;">
                ${activities.length > 0 ? activities.map(act => `
                    <div class="activity-item" style="padding: 12px 0; border-bottom: 1px solid #F3F4F6; display: flex; gap: 12px; align-items: center;">
                        <div style="width: 36px; height: 36px; background: #EEF2FF; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <img src="../components/ui/user.svg" style="width: 18px; opacity: 0.8; filter: brightness(0) saturate(100%) invert(30%) sepia(90%);">
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #111827;">${act.userName || 'User'}</p>
                            <p style="margin: 0; font-size: 12px; color: #4B5563;">${act.action || 'System action'}</p>
                        </div>
                        <span style="font-size: 11px; color: #9CA3AF; white-space: nowrap;">${new Date(act.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                `).join('') : '<p style="text-align: center; padding: 20px; font-size: 13px; color: #6B7280;">No recent activity.</p>'}
            </div>
        `;
    }
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };
        return entities[char];
    });
}




