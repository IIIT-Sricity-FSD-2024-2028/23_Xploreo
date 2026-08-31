import { filterByGuide } from "../utils/filterByGuide.js";
import { earningsByMonth } from "../utils/earningsByMonth.js";
import { formatCurrency } from "../utils/formatCurrency.js";

export function renderDashEarnings(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allTrips = JSON.parse(localStorage.getItem("tours")) || [];
    const myTrips = filterByGuide(allTrips, currentUser.id);

    // Get last 12 months earnings data
    const { months, total } = earningsByMonth(myTrips);

    // Find max amount across months for scaling bars (min 1 to avoid division by zero)
    const maxAmount = Math.max(...months.map(m => m.amount), 1);

    // Generate bar chart HTML dynamically
    const barsHTML = months.map(m => {
        const heightPct = Math.max((m.amount / maxAmount) * 100, 3); // min 3% so empty months still show a sliver
        return `
            <div class="dash-chart-bar-group">
                <div class="dash-chart-bar" style="height: ${heightPct}%;" title="${formatCurrency(m.amount)}"></div>
                <span class="chart-label">${m.label}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="dash-earnings-wrapper">
            <h2 class="dash-section-title">Earnings Overview</h2>
            <p class="dash-section-subtitle">Last 12 months performance</p>
            
            <div class="dash-chart-container">
                ${barsHTML}
            </div>
            
            <div class="dash-earnings-footer">
                <div class="dash-earnings-total-block">
                    <span class="dash-earnings-label">Total Earnings</span>
                    <h2 class="dash-earnings-value">${formatCurrency(total)}</h2>
                </div>
            </div>
        </div>
    `;
}
