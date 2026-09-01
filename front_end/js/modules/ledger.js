export function getLedgerHTML(allBookings = []) {
    let tableRows = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #6B7280;">No ledger data available.</td></tr>`;

    if (allBookings.length > 0) {
        // Take up to 10 latest bookings for ledger
        const ledgerItems = allBookings.slice(0, 10);
        tableRows = ledgerItems.map(entry => `
            <tr>
                <td><a href="#" class="id-link">${entry.id || entry.bookingId || "N/A"}</a></td>
                <td>
                    <div class="cell-flex">
                        <div class="avatar avatar-light-blue">${(entry.guestName || entry.user || entry.customer || "U").substring(0, 2).toUpperCase()}</div>
                        <div class="text-stack">
                            <span class="main-text">${entry.guestName || entry.user || entry.customer || "Unknown User"}</span>
                            <span class="sub-text">Traveler</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-stack">
                        <span class="main-text">${entry.hotelName || entry.experienceName || entry.service || "Booking"}</span>
                        <span class="sub-text">${entry.hotelId ? "Hotel" : "Experience"}</span>
                    </div>
                </td>
                <td class="date-text">${entry.date || entry.bookedOn || entry.createdAt || "N/A"}</td>
                <td>
                    <div class="cell-flex">
                        <div class="avatar avatar-light-gray">${(entry.hotelName || entry.partnerName || "P").substring(0, 2).toUpperCase()}</div>
                        <span class="main-text">${entry.hotelName || entry.partnerName || entry.partnerId || "Partner"}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${entry.status === 'CONFIRMED' || entry.status === 'COMPLETED' ? 'status-completed' : (entry.status === 'CANCELLED' ? 'status-refunded' : 'status-ongoing')}">
                        ${entry.status || "CONFIRMED"}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    return `
        <div class="content-card">
            <div class="card-header">
                <div>
                    <h2 class="card-title" style="margin-top: 0; font-size: 18px;">Comprehensive Ledger</h2>
                    <p class="card-subtitle" style="margin: 5px 0 0; font-size: 13px;">Detailed transactional audit of every journey across the network.</p>
                </div>
            </div>
            
            <div class="table-container">
                <table class="ledger-table">
                    <thead>
                        <tr>
                            <th>ID REFERENCE</th>
                            <th>TRAVELER ACCOUNT</th>
                            <th>EXPERIENCE SERVICE</th>
                            <th>DEPLOYMENT DATE</th>
                            <th>LEAD GUIDE / PARTNER</th>
                            <th>LEDGER STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
