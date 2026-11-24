import { formatCurrency } from "../utils/formatCurrency.js";
import { monthlyEarnings } from "../utils/monthlyEarnings.js";

export function renderOverviewPending(myTrips, currentMonth, currentYear) {
    const thisMonthEarnings = monthlyEarnings(myTrips, currentMonth, currentYear);
    
    const pendingAmounts = {
        available: thisMonthEarnings,
        processing: Math.round(thisMonthEarnings * 0.65),
        upcoming: Math.round(thisMonthEarnings * 0.57)
    };
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return `
        <!-- Pending Payouts -->
        <div class="earn-pending-section">
            <div class="earn-pending-header">
                <div>
                    <h3 class="earn-pending-title">Pending Payouts</h3>
                    <p class="earn-pending-sub">Earnings ready to be transferred to your account</p>
                </div>
                <button class="earn-payout-btn" onclick="alert('Payout requested!')">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    Request Payout
                </button>
            </div>
            <div class="earn-pending-cards">
                <div class="earn-pending-card earn-pc-green">
                    <span class="earn-pc-label" style="color:#10B981;">Available Balance</span>
                    <h2 class="earn-pc-value">${formatCurrency(pendingAmounts.available)}</h2>
                    <span class="earn-pc-sub">From ${monthNames[currentMonth]} tours</span>
                </div>
                <div class="earn-pending-card earn-pc-blue">
                    <span class="earn-pc-label" style="color:#3B82F6;">Processing</span>
                    <h2 class="earn-pc-value">${formatCurrency(pendingAmounts.processing)}</h2>
                    <span class="earn-pc-sub">Expected in 3-5 days</span>
                </div>
                <div class="earn-pending-card earn-pc-gray">
                    <span class="earn-pc-label" style="color:#6B7280;">Upcoming</span>
                    <h2 class="earn-pc-value">${formatCurrency(pendingAmounts.upcoming)}</h2>
                    <span class="earn-pc-sub">Future tour payments</span>
                </div>
            </div>
        </div>
    `;
}
