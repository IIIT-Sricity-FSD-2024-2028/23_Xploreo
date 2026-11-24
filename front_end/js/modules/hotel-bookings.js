export function renderBookings(containerId) {
    const container = document.getElementById(containerId);

    const bookings = JSON.parse(localStorage.getItem("hotelBookings")) || [];

    container.innerHTML = `
        <div class="hotel-card-header hotel-flex-header">
            <h2>Upcoming Bookings</h2>
            
        </div>

        <div class="hotel-bookings-list">
            ${bookings.map(b => `
                <div class="hotel-booking-row">

                    <div class="hotel-booking-left">
                        <p class="hotel-cust-name">${b.customer}</p>
                        <p class="hotel-sub-text">${b.checkIn} • ${b.room}</p>
                    </div>

                    <div class="hotel-booking-right">
                        <span class="hotel-status ${b.status}">
                            ${b.status}
                        </span>
                    </div>

                </div>
            `).join("")}
        </div>
    `;
}