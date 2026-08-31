import { getDisputesData } from '../api/legacyData.js';

export function getDisputesHTML() {
    // 1. Fetch the dynamic list of disputes
    const disputes = getDisputesData();

    // 2. Map the data into table rows
    const tableRows = disputes.map(dispute => `
        <tr>
            <td><a href="#" class="case-link">${dispute.caseId}</a></td>
            <td><span class="ref-text">${dispute.bookingRef}</span></td>
            <td>
                <span class="issue-main">${dispute.issueMain}</span>
                <span class="issue-sub">${dispute.issueSub}</span>
            </td>
            <td><span class="${dispute.severityClass}">${dispute.severityText}</span></td>
            <td>
                <div class="flow-status">
                    <span class="dot ${dispute.dotClass}"></span> ${dispute.flowStatus}
                </div>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-resolve" 
                        data-case="${dispute.caseId}" 
                        data-ref="${dispute.bookingRef}" 
                        data-issue="${dispute.issueMain}">Resolve</button>
                    <button class="btn-escalate" 
                        data-case="${dispute.caseId}" 
                        data-ref="${dispute.bookingRef}" 
                        data-issue="${dispute.issueMain}">Escalate</button>
                </div>
            </td>
        </tr>
    `).join("");

    // 3. Return the fully assembled UI
    return `
        <div class="dispute-header">
            <h2>Dispute Resolution Center</h2>
            <p>Escalated conflicts between partners, guides, and travelers.</p>
        </div>
        
        <div class="dispute-card">
            <table class="dispute-table">
                <thead>
                    <tr>
                        <th>DISPUTE CASE</th>
                        <th>BOOKING REF</th>
                        <th>ISSUE CATEGORY</th>
                        <th>SEVERITY</th>
                        <th>RESOLUTION FLOW</th>
                        <th>SYSTEM ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}
