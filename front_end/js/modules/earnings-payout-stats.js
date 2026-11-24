import { formatCurrency } from "../utils/formatCurrency.js";

export function renderPayoutStats(payouts) {
    const totalPaidOut = payouts.reduce((s, p) => s + p.amount, 0);
    const avgPayout = payouts.length > 0 ? Math.round(totalPaidOut / payouts.length) : 0;
    const lastPayDateShort = payouts.length > 0 ? payouts[0].date.split(",")[0] : "N/A";

    return `
        <!-- Payout Stats -->
        <div class="earn-stats-row">
            <div class="earn-stat-card earn-stat-blue">
                <div class="earn-stat-icon" style="background:#EFF6FF; color:#3B82F6;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                </div>
                <h2 class="earn-stat-value">${payouts.length}</h2>
                <span class="earn-stat-label">Total Payouts</span>
            </div>
            <div class="earn-stat-card earn-stat-green">
                <div class="earn-stat-icon" style="background:#ECFDF5; color:#10B981;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="10" rx="2"/><path d="M2 10h16"/></svg>
                </div>
                <h2 class="earn-stat-value">${formatCurrency(totalPaidOut)}</h2>
                <span class="earn-stat-label">Total Paid Out</span>
            </div>
            <div class="earn-stat-card earn-stat-orange">
                <div class="earn-stat-icon" style="background:#FFFBEB; color:#F59E0B;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z"/></svg>
                </div>
                <h2 class="earn-stat-value">${formatCurrency(avgPayout)}</h2>
                <span class="earn-stat-label">Avg. Payout</span>
            </div>
            <div class="earn-stat-card earn-stat-purple">
                <div class="earn-stat-icon" style="background:#F5F3FF; color:#8B5CF6;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 8.586V5z"/></svg>
                </div>
                <h2 class="earn-stat-value">${lastPayDateShort}</h2>
                <span class="earn-stat-label">Last Payout</span>
            </div>
        </div>
    `;
}
