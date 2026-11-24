export function renderTechTicketDetail(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    let techAdminData = JSON.parse(localStorage.getItem("techAdminData"));
    if (!techAdminData) return;

    const ticket = techAdminData.tickets.find(t => t.id === id);

    if (!ticket) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h3 style="color: #4B5563;">Ticket not found.</h3>
                <button class="primary-btn" onclick="window.history.back()" style="margin-top: 20px;">Go Back</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="ticket-detail-view">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 1px solid #F3F4F6; padding-bottom: 20px;">
                <div>
                    <span class="status-tag ${ticket.priority}" style="margin-bottom: 10px; display: inline-block;">${ticket.priority.toUpperCase()} PRIORITY</span>
                    <h2 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0;">${ticket.subject}</h2>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 5px;">ID: ${ticket.id} • Created on ${new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                <div style="text-align: right;">
                    <span class="status-tag ${ticket.status}" style="font-size: 14px; padding: 6px 16px;">${ticket.status.toUpperCase()}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
                <div class="ticket-content">
                    <div style="margin-bottom: 30px;">
                        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 10px;">Description</h3>
                        <div style="background: #F9FAFB; padding: 20px; border-radius: 10px; color: #4B5563; line-height: 1.6;">
                            ${ticket.description}
                        </div>
                    </div>

                    <div class="action-panel" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #F3F4F6;">
                        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 20px;">Admin Actions</h3>
                        <div style="display: flex; gap: 15px;">
                            ${ticket.status === 'pending' || ticket.status === 'rejected' ? `
                                <button class="primary-btn" onclick="window.updateStatus('${ticket.id}', 'resolved')" style="background: #10B981; border-color: #10B981;">Approve / Resolve</button>
                                <button class="secondary-btn" onclick="window.updateStatus('${ticket.id}', 'in-progress')">Mark In Progress</button>
                                <button class="secondary-btn" onclick="window.updateStatus('${ticket.id}', 'rejected')" style="color: #EF4444; border-color: #EF4444;">Reject</button>
                            ` : ticket.status === 'in-progress' ? `
                                <button class="primary-btn" onclick="window.updateStatus('${ticket.id}', 'resolved')" style="background: #10B981; border-color: #10B981;">Resolve Issue</button>
                                <button class="secondary-btn" onclick="window.updateStatus('${ticket.id}', 'rejected')" style="color: #EF4444; border-color: #EF4444;">Reject</button>
                            ` : `
                                <button class="secondary-btn" onclick="window.updateStatus('${ticket.id}', 'pending')">Re-open Ticket</button>
                            `}
                        </div>
                    </div>
                </div>

                <div class="ticket-meta-sidebar">
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 10px;">
                        <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">User Information</h3>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                            <div style="width: 40px; height: 40px; background: #E5E7EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #4B5563;">
                                ${ticket.userName.charAt(0)}
                            </div>
                            <div>
                                <p style="margin: 0; font-weight: 600; color: #111827;">${ticket.userName}</p>
                                <p style="margin: 0; font-size: 12px; color: #6B7280; text-transform: capitalize;">${ticket.userRole}</p>
                            </div>
                        </div>
                        <p style="font-size: 13px; color: #6B7280; margin: 0;">User ID: <span style="color: #374151; font-weight: 500;">${ticket.userId}</span></p>
                        <p style="font-size: 13px; color: #6B7280; margin-top: 5px;">Category: <span style="color: #374151; font-weight: 500;">${ticket.category}</span></p>
                    </div>

                    <button class="secondary-btn" style="width: 100%; margin-top: 20px;" onclick="window.history.back()">Back to Tickets</button>
                </div>
            </div>
        </div>
    `;

    window.updateStatus = (ticketId, newStatus) => {
        const ticketIndex = techAdminData.tickets.findIndex(t => t.id === ticketId);
        if (ticketIndex !== -1) {
            const oldStatus = techAdminData.tickets[ticketIndex].status;
            techAdminData.tickets[ticketIndex].status = newStatus;
            
            // Log Activity
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            techAdminData.userActivity.unshift({
                id: `ACT-${Date.now()}`,
                userId: currentUser.id,
                userName: currentUser.name,
                action: `Updated ticket ${ticketId} status from ${oldStatus} to ${newStatus}`,
                timestamp: new Date().toISOString()
            });

            localStorage.setItem("techAdminData", JSON.stringify(techAdminData));
            alert(`Ticket status updated to ${newStatus}`);
            renderTechTicketDetail(containerId);
        }
    };
}
