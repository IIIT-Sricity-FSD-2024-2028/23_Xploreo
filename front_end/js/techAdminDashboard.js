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

    const total = tickets.length;
    const pendingTicketsCount = tickets.filter(t => t && (t.status === 'OPEN' || t.status === 'pending' || t.status === 'in-progress')).length;
    const resolvedTicketsCount = tickets.filter(t => t && (t.status === 'RESOLVED' || t.status === 'resolved')).length;
    const activeUsersCount = users ? users.filter(u => u && u.status === 'active').length : 5;

    // 1. Render Stats
    const statsContainer = document.getElementById("tech-stats");
    if (statsContainer) {
        const stats = [
            { label: "Total Tickets", value: total, icon: "../components/ui/support.svg", color: "blue", path: "tech_tickets.html" },
            { label: "Pending Tickets", value: pendingTicketsCount, icon: "../components/ui/support.svg", color: "orange", path: "tech_tickets.html?status=pending" },
            { label: "Resolved Tickets", value: resolvedTicketsCount, icon: "../components/ui/support.svg", color: "light-green", path: "tech_tickets.html?status=resolved" },
            { label: "Active Users", value: activeUsersCount || 5, icon: "../components/ui/users.png", color: "violet" }
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
                        <th style="padding: 10px 8px;">User &amp; Role</th>
                        <th style="padding: 10px 8px;">Subject</th>
                        <th style="padding: 10px 8px;">Category</th>
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




