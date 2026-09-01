import { fetchTickets, resolveTicket } from "../api/services.js";

export async function renderTechTicketDetail(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    let ticket = null;
    try {
        const allTickets = await fetchTickets();
        ticket = allTickets.find(t => t.id === id);
    } catch (err) {
        console.warn("Could not load ticket from API:", err);
    }

    if (!ticket) {
        let techAdminData = JSON.parse(localStorage.getItem("techAdminData"));
        ticket = techAdminData?.tickets?.find(t => t.id === id);
    }

    if (!ticket) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h3 style="color: #4B5563;">Ticket not found.</h3>
                <button class="primary-btn" onclick="window.history.back()" style="margin-top: 20px;">Go Back</button>
            </div>
        `;
        return;
    }

    const isResolved = ticket.status === "RESOLVED" || ticket.status === "resolved";
    const userName = ticket.userName || ticket.travellerName || ticket.userId || "User";
    const userRole = String(ticket.userRole || "TRAVELLER").toUpperCase();

    container.innerHTML = `
        <div class="ticket-detail-view" style="max-width: 1000px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 1px solid #F3F4F6; padding-bottom: 20px;">
                <div>
                    <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0;">${escapeHtml(ticket.subject)}</h2>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 5px;">ID: ${escapeHtml(ticket.id)} • Created on ${new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                <div style="text-align: right;">
                    <span class="status-tag ${isResolved ? 'resolved' : 'pending'}" style="font-size: 14px; padding: 6px 16px;">${isResolved ? 'RESOLVED' : 'OPEN'}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
                <div class="ticket-content">
                    <div style="margin-bottom: 30px;">
                        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 10px;">Issue Description</h3>
                        <div style="background: #F9FAFB; padding: 20px; border-radius: 10px; color: #4B5563; line-height: 1.6; border: 1px solid #F3F4F6;">
                            ${escapeHtml(ticket.message || ticket.description || "No description provided")}
                        </div>
                    </div>

                    ${isResolved ? `
                        <div style="margin-bottom: 30px; background: #F0FDF4; border-left: 4px solid #10B981; padding: 18px; border-radius: 10px; color: #166534;">
                            <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 6px;">✓ Technical Admin Resolution</h3>
                            <p style="margin: 0; line-height: 1.5;">${escapeHtml(ticket.resolution || "Resolved by technical admin.")}</p>
                            <div style="font-size: 12px; color: #4ADE80; margin-top: 8px;">Resolved on ${new Date(ticket.resolvedAt || ticket.createdAt).toLocaleString()} ${ticket.resolvedBy ? `by ${escapeHtml(ticket.resolvedBy)}` : ''}</div>
                        </div>
                    ` : ''}

                    <div class="action-panel" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #F3F4F6;">
                        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 15px;">Admin Resolution Action</h3>
                        ${!isResolved ? `
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <textarea id="detail-resolution-input" placeholder="Enter resolution notes / explanation for the user..." style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; min-height: 80px; resize: vertical;">Issue investigated and resolved by technical admin.</textarea>
                                <div style="display: flex; gap: 15px;">
                                    <button class="primary-btn" id="resolve-ticket-btn" style="background: #10B981; border-color: #10B981; cursor: pointer;">Resolve Ticket</button>
                                </div>
                            </div>
                        ` : `
                            <p style="color: #6B7280; font-size: 14px;">This ticket has been marked as resolved.</p>
                        `}
                    </div>
                </div>

                <div class="ticket-meta-sidebar">
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 10px; border: 1px solid #F3F4F6;">
                        <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">Author Information</h3>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                            <div style="width: 40px; height: 40px; background: #E5E7EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #4B5563;">
                                ${userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p style="margin: 0; font-weight: 600; color: #111827;">${escapeHtml(userName)}</p>
                                <p style="margin: 0; font-size: 12px; color: #6B7280; font-weight: 600;">${escapeHtml(userRole)}</p>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: #6B7280; margin: 0;">User ID: <span style="color: #374151; font-weight: 500;">${escapeHtml(ticket.userId || ticket.travellerId || "N/A")}</span></p>
                        <p style="font-size: 13px; color: #6B7280; margin-top: 5px;">Category: <span style="color: #374151; font-weight: 500;">${escapeHtml(ticket.category || "General")}</span></p>
                    </div>

                    <button class="secondary-btn" style="width: 100%; margin-top: 20px; cursor: pointer;" onclick="window.location.href='tech_tickets.html'">Back to Ticket Management</button>
                </div>
            </div>
        </div>
    `;

    const resolveBtn = document.getElementById("resolve-ticket-btn");
    if (resolveBtn) {
        resolveBtn.onclick = async () => {
            const input = document.getElementById("detail-resolution-input");
            const resolution = input?.value?.trim() || "Resolved by technical admin.";
            try {
                resolveBtn.disabled = true;
                resolveBtn.textContent = "Resolving...";
                await resolveTicket(ticket.id, { resolution });
                alert("Ticket successfully resolved!");
                renderTechTicketDetail(containerId);
            } catch (err) {
                console.error("Resolve failed:", err);
                alert(err.message || "Failed to resolve ticket.");
                resolveBtn.disabled = false;
                resolveBtn.textContent = "Resolve Ticket";
            }
        };
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
