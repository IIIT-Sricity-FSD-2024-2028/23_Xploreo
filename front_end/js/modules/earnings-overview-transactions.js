import { filterByGuide } from "../utils/filterByGuide.js";
import { formatCurrency } from "../utils/formatCurrency.js";

export function renderOverviewTransactions(completedTrips, currentUser) {
    const recentTx = completedTrips
        .sort((a, b) => new Date(b.dateTime.split(" | ")[0]) - new Date(a.dateTime.split(" | ")[0]))
        .slice(0, 4);

    const allReviews = JSON.parse(localStorage.getItem("reviews")) || [];
    const myReviews = filterByGuide(allReviews, currentUser.id);

    const txRows = recentTx.map(t => {
        const review = myReviews.find(r => r.tourName && t.title && r.tourName.includes(t.title.split(' ')[0]));
        const customerName = review ? review.customerName : t.customer;
        return `
            <div class="earn-tx-row">
                <div class="earn-tx-info">
                    <h4 class="earn-tx-title">${t.title}</h4>
                    <span class="earn-tx-sub">${customerName} • ${t.dateTime.split(" | ")[0]}</span>
                </div>
                <div class="earn-tx-right">
                    <span class="earn-tx-status">Completed</span>
                    <span class="earn-tx-amount">+${formatCurrency(t.amount)}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <!-- Recent Transactions -->
        <div class="earn-tx-section">
            <div class="earn-tx-header">
                <h3 class="earn-tx-section-title">Recent Transactions</h3>
                <button class="earn-tx-view-all" onclick="window.switchTab('payout-history')">View All</button>
            </div>
            ${txRows || '<p style="text-align:center;color:#9CA3AF;padding:20px;">No transactions yet.</p>'}
        </div>
    `;
}
