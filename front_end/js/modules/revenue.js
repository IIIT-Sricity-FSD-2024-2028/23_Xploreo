export function getRevenueHTML(allBookings = []) {
    const cancelledBookings = allBookings.filter(b => b.status === "CANCELLED" || b.status === "REFUNDED");
    
    let recoveryCards = `<div style="text-align: center; padding: 20px; color: #6B7280; background: #fff; border-radius: 8px; border: 1px solid #E5E7EB;">No pending refunds or revenue recovery items.</div>`;

    if (cancelledBookings.length > 0) {
        recoveryCards = cancelledBookings.map(item => `
            <div class="recovery-card">
                <div class="recovery-card-header">
                    <span class="recovery-meta">REFUND QUEUE • ${item.id || item.bookingId || "N/A"}</span>
                    <span class="status-badge ${item.status === 'REFUNDED' ? 'status-completed' : 'status-refunded'}">${item.status}</span>
                </div>
                <h3 class="recovery-title">${item.hotelName || item.experienceName || "Booking Cancellation"}</h3>
                <div class="details-grid grid-3-col">
                    <div class="detail-box">
                        <span class="detail-label">AMOUNT</span>
                        <span class="detail-value">₹${item.amount || item.totalAmount || 0}</span>
                    </div>
                    <div class="detail-box">
                        <span class="detail-label">IMPACT</span>
                        <span class="detail-value text-red">High</span>
                    </div>
                    <div class="detail-box">
                        <span class="detail-label">RESOLUTION ID</span>
                        <span class="detail-value">PENDING</span>
                    </div>
                </div>
            </div>
        `).join("");
    }

    return `
        <div class="section-header" style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
                <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 5px;">Revenue Recovery</h2>
                <p style="margin: 0; font-size: 13px;">Monitoring cancellations and handling refund automation.</p>
            </div>
            <a href="#" style="font-size: 12px; font-weight: 700; color: #2B6CB0; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">Manage Queue</a>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
            ${recoveryCards}
        </div>
    `;
}
