import { apiGetAndSync } from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);
const S = (v) => (v == null || v === "") ? "#" : String(v);

// Called from finance-ui.js which is sync — so we fetch once and cache
export async function prefetchRefunds() {
    const data = await apiGetAndSync("/finance/refunds", "refunds", []);
    return Array.isArray(data) ? data : [];
}

export function getRevenueHTML(revenueItems = []) {
    if (!Array.isArray(revenueItems) || revenueItems.length === 0) {
        // Try localStorage as last resort
        try { revenueItems = JSON.parse(localStorage.getItem("refunds") || "[]"); } catch { revenueItems = []; }
    }

    const recoveryCards = revenueItems.map(item => `
        <div class="recovery-card">
            <div class="recovery-card-header">
                <span class="recovery-meta">REFUND QUEUE • ${S(item.queueId)}</span>
                <span class="status-badge ${S(item.statusClass)}">${S(item.status)}</span>
            </div>
            <h3 class="recovery-title">${S(item.title)}</h3>
            <div class="details-grid grid-3-col">
                <div class="detail-box">
                    <span class="detail-label">REASON</span>
                    <span class="detail-value">${S(item.reason)}</span>
                </div>
                <div class="detail-box">
                    <span class="detail-label">IMPACT</span>
                    <span class="detail-value ${S(item.impactClass)}">${S(item.impact)}</span>
                </div>
                <div class="detail-box">
                    <span class="detail-label">RESOLUTION ID</span>
                    <span class="detail-value">${S(item.resolutionId) === "#" ? "PENDING" : item.resolutionId}</span>
                </div>
            </div>
        </div>
    `).join("");

    return `
        <div class="revenue-header">
            <div>
                <h2>Revenue Recovery</h2>
                <p>Monitoring cancellations and handling refund automation.</p>
            </div>
            <a href="#" class="manage-link" id="open-queue-btn">MANAGE QUEUE</a>
        </div>
        <div class="revenue-cards-container">
            ${recoveryCards || "<p style='text-align:center;padding:32px;color:#9CA3AF;'>No refund data available.</p>"}
        </div>
    `;
}
