import { formatCurrency } from "../utils/formatCurrency.js";

export function renderPayoutTable(payouts) {
    const payoutRows = payouts.map(p => `
        <tr class="earn-pay-row">
            <td>
                <div class="earn-pay-date-cell">
                    <svg width="14" height="14" fill="none" stroke="#9CA3AF" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    ${p.date}
                </div>
            </td>
            <td class="earn-pay-ref">${p.ref}</td>
            <td>
                <div class="earn-pay-method-cell">
                    <svg width="14" height="14" fill="none" stroke="#9CA3AF" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                    ${p.method}
                </div>
            </td>
            <td>${p.tours} tours</td>
            <td class="earn-pay-amount">${formatCurrency(p.amount)}</td>
            <td><span class="earn-pay-status-badge">${p.status}</span></td>
            <td>
                <button class="earn-receipt-btn" onclick="alert('Downloading receipt for ${p.ref}')">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Receipt
                </button>
            </td>
        </tr>
    `).join('');

    return `
        <!-- Payout History Table -->
        <div class="earn-pay-section">
            <div class="earn-pay-header">
                <h3 class="earn-pay-title">Payout History</h3>
                <button class="earn-download-all-btn" onclick="alert('Downloading all receipts...')">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download All
                </button>
            </div>
            <div class="earn-pay-table-wrapper">
                <table class="earn-pay-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th>Method</th>
                            <th>Tours</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payoutRows || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#9CA3AF;">No payouts yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
