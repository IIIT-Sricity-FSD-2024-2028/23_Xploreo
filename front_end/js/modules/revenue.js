import { getRevenueData } from '../api/legacyData.js';

export function getRevenueHTML() {
    // 1. Fetch the dynamic data
    const revenueItems = getRevenueData();

    // 2. Map over the data to create as many cards as needed
    const recoveryCards = revenueItems.map(item => `
        <div class="recovery-card">
            <div class="recovery-card-header">
                <span class="recovery-meta">REFUND QUEUE • ${item.queueId}</span>
                <span class="status-badge ${item.statusClass}">${item.status}</span>
            </div>
            <h3 class="recovery-title">${item.title}</h3>
            <div class="details-grid grid-3-col">
                <div class="detail-box">
                    <span class="detail-label">REASON</span>
                    <span class="detail-value">${item.reason}</span>
                </div>
                <div class="detail-box">
                    <span class="detail-label">IMPACT</span>
                    <span class="detail-value ${item.impactClass}">${item.impact}</span>
                </div>
                <div class="detail-box">
                    <span class="detail-label">RESOLUTION ID</span>
                    <span class="detail-value">${item.resolutionId || "PENDING"}</span>
                </div>
            </div>
        </div>
    `).join("");

    // 3. Return the assembled UI
    return `
        <div class="revenue-header">
            <div>
                <h2>Revenue Recovery</h2>
                <p>Monitoring cancellations and handling refund automation.</p>
            </div>
            <a href="#" class="manage-link" id="open-queue-btn">MANAGE QUEUE</a>
        </div>
        
        <div class="revenue-cards-container">
            ${recoveryCards}
        </div>
    `;
}
