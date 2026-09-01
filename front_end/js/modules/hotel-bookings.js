import { fetchPartnerHotelBookings } from "../api/services.js";

export async function renderBookings(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const bookings = await fetchPartnerHotelBookings().catch(() => []);
        
        // Filter upcoming bookings
        const upcomingBookings = bookings.filter(b => {
            const checkIn = new Date(b.checkIn);
            return checkIn >= new Date();
        }).slice(0, 5); // Show top 5

        container.innerHTML = `
            <div class="hotel-card-header hotel-flex-header">
                <h2>Upcoming Bookings</h2>
            </div>

            <div class="hotel-bookings-list">
                ${upcomingBookings.length ? upcomingBookings.map(b => {
                    const totalAmt = Number(b.totalAmount || 0);
                    const partnerBase = totalAmt > 14 ? totalAmt - 14 : 0;
                    const superAdminCut = partnerBase * 0.04;
                    const partnerNet = partnerBase - superAdminCut;
                    return `
                    <div class="hotel-booking-row">
                        <div class="hotel-booking-left">
                            <p class="hotel-cust-name">${b.guestName || "Guest"}</p>
                            <p class="hotel-sub-text">${b.checkIn} • ${b.roomType || b.hotelId}</p>
                        </div>
                        <div class="hotel-booking-right" style="text-align: right;">
                            <p style="font-size: 14px; font-weight: 600; margin:0;">Earnings: ₹${partnerNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p style="font-size: 11px; color: #64748b; margin:0;">Super Admin Cut (4%): ₹${superAdminCut.toFixed(2)}</p>
                            <span class="hotel-status ${b.status?.toLowerCase() || 'pending'}" style="margin-top: 4px; display: inline-block;">
                                ${b.status || 'CONFIRMED'}
                            </span>
                        </div>
                    </div>
                `}).join("") : `<div class="hotel-empty-state" style="padding: 30px; text-align: center;"><p style="color: #94a3b8; margin:0;">No upcoming bookings at the moment.</p></div>`}
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="hotel-card-header"><h2>Upcoming Bookings</h2></div><p>Failed to load.</p>`;
    }
}