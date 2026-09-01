export function getDisputesHTML(allBookings = []) {
    return `
        <div class="content-card" style="margin-top: 40px;">
            <div class="card-header">
                <div>
                    <h2 class="card-title" style="margin-top: 0; font-size: 18px;">Dispute Resolution Center</h2>
                    <p class="card-subtitle" style="margin: 5px 0 0; font-size: 13px;">Manage escalations and mediate conflicts between travelers and partners.</p>
                </div>
            </div>
            
            <div class="table-container">
                <table class="dispute-table">
                    <thead>
                        <tr>
                            <th>CASE ID</th>
                            <th>BOOKING REF</th>
                            <th>REPORTED ISSUE</th>
                            <th>SEVERITY</th>
                            <th>WORKFLOW STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 20px; color: #6B7280;">No active disputes.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
