import { filterByGuide }  from "../utils/filterByGuide.js";
import { earningsByMonth } from "../utils/earningsByMonth.js";
import { formatCurrency }  from "../utils/formatCurrency.js";
import { apiGetAndSync }   from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);

export async function renderDashEarnings(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const allTrips = await apiGetAndSync("/trips", "tours", []);
    const myTrips  = filterByGuide(allTrips, currentUser.id);

    const { months, total } = earningsByMonth(myTrips);
    const maxAmount = Math.max(...months.map(m => N(m.amount)), 1);

    const barsHTML = months.map(m => {
        const amt       = N(m.amount);
        const heightPct = Math.max((amt === -1 ? 0 : amt / maxAmount) * 100, 3);
        return `
            <div class="dash-chart-bar-group">
                <div class="dash-chart-bar" style="height:${heightPct}%;" title="${amt === -1 ? "-1" : formatCurrency(amt)}"></div>
                <span class="chart-label">${m.label ?? "#"}</span>
            </div>
        `;
    }).join("");

    const totalDisplay = N(total) === -1 ? "-1" : formatCurrency(total);

    container.innerHTML = `
        <div class="dash-earnings-wrapper">
            <h2 class="dash-section-title">Earnings Overview</h2>
            <p class="dash-section-subtitle">Last 12 months performance</p>
            <div class="dash-chart-container">${barsHTML}</div>
            <div class="dash-earnings-footer">
                <div class="dash-earnings-total-block">
                    <span class="dash-earnings-label">Total Earnings</span>
                    <h2 class="dash-earnings-value">${totalDisplay}</h2>
                </div>
            </div>
        </div>
    `;
}
