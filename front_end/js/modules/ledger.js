import { getLedgerData } from '../api/legacyData.js';

export function getLedgerHTML() {
    // 1. Get the pre-processed data from the data folder
    const ledgerItems = getLedgerData();

    // 2. Map over the data to build the rows
    const tableRows = ledgerItems.map(entry => `
        <tr>
            <td><a href="#" class="id-link">${entry.id || "N/A"}</a></td>
            <td>
                <div class="cell-flex">
                    <div class="avatar ${entry.avatarColor || "avatar-light-blue"}">${entry.initials || "??"}</div>
                    <div class="text-stack">
                        <span class="main-text">${entry.traveler || "Unknown User"}</span>
                        <span class="sub-text">${entry.tier || "Standard"}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="text-stack">
                    <span class="main-text">${entry.service || "General Booking"}</span>
                    <span class="sub-text">${entry.serviceTier || "-"}</span>
                </div>
            </td>
            <td class="date-text">${entry.date || "N/A"}</td>
            <td>
                <div class="cell-flex">
                    <div class="avatar avatar-light-gray">${entry.guideInitials || "??"}</div>
                    <span class="main-text">${entry.guide || "Unassigned"}</span>
                </div>
            </td>
            <td><span class="status-badge ${entry.statusClass || "status-pending"}">${entry.status || "PENDING"}</span></td>
        </tr>
    `).join("");

    // 3. Return the clean HTML structure
    return `
        <div class="section-header" style="margin-top: 40px;">
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
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}
