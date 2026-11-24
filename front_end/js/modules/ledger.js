import { apiGetAndSync } from "../utils/api.js";

const N = (v) => (v == null || isNaN(Number(v))) ? -1 : Number(v);
const S = (v) => (v == null || v === "") ? "#" : String(v);

export async function prefetchLedger() {
    const data = await apiGetAndSync("/finance/ledger", "ledger", []);
    return Array.isArray(data) ? data : [];
}

export function getLedgerHTML(ledgerItems = []) {
    if (!Array.isArray(ledgerItems) || ledgerItems.length === 0) {
        try { ledgerItems = JSON.parse(localStorage.getItem("ledger") || "[]"); } catch { ledgerItems = []; }
    }

    const tableRows = ledgerItems.map(entry => `
        <tr>
            <td><a href="#" class="id-link">${S(entry.id) === "#" ? "#" : entry.id}</a></td>
            <td>
                <div class="cell-flex">
                    <div class="avatar ${S(entry.avatarColor) === "#" ? "avatar-light-blue" : entry.avatarColor}">${S(entry.initials) === "#" ? "??" : entry.initials}</div>
                    <div class="text-stack">
                        <span class="main-text">${S(entry.traveler) === "#" ? "#" : entry.traveler}</span>
                        <span class="sub-text">${S(entry.tier) === "#" ? "#" : entry.tier}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="text-stack">
                    <span class="main-text">${S(entry.service) === "#" ? "#" : entry.service}</span>
                    <span class="sub-text">${S(entry.serviceTier) === "#" ? "#" : entry.serviceTier}</span>
                </div>
            </td>
            <td class="date-text">${S(entry.date) === "#" ? "#" : entry.date}</td>
            <td>
                <div class="cell-flex">
                    <div class="avatar avatar-light-gray">${S(entry.guideInitials) === "#" ? "??" : entry.guideInitials}</div>
                    <span class="main-text">${S(entry.guide) === "#" ? "#" : entry.guide}</span>
                </div>
            </td>
            <td><span class="status-badge ${S(entry.statusClass) === "#" ? "status-pending" : entry.statusClass}">${S(entry.status) === "#" ? "#" : entry.status}</span></td>
        </tr>
    `).join("");

    return `
        <div class="section-header" style="margin-top:40px;">
            <h2>Comprehensive Ledger</h2>
            <p>Detailed transactional audit of every journey across the network.</p>
        </div>
        <div class="ledger-card">
            <table class="ledger-table">
                <thead>
                    <tr>
                        <th>ID REFERENCE</th>
                        <th>TRAVELER ACCOUNT</th>
                        <th>EXPERIENCE SERVICE</th>
                        <th>DEPLOYMENT DATE</th>
                        <th>LEAD GUIDE</th>
                        <th>LEDGER STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || "<tr><td colspan='6' style='text-align:center;padding:24px;color:#9CA3AF;'>No ledger data available.</td></tr>"}
                </tbody>
            </table>
        </div>
    `;
}
