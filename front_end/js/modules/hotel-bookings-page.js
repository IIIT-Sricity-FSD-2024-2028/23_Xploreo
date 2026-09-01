import { fetchPartnerHotelBookings } from "../api/services.js";
import { getApiBaseUrl } from "../api/session.js";

export async function renderBookingsPage(containerId = "main") {
  const root =
    document.getElementById(containerId) || document.getElementById("main");
  if (!root) return;

  root.innerHTML = `
    <div class="hotel-page-header">
      <h1>Bookings</h1>
      <p>Manage and track all traveller hotel reservations</p>
    </div>
    <div class="hotel-content-card">Loading bookings...</div>
  `;

  const bookings = await fetchPartnerHotelBookings().catch((error) => {
    console.error("Failed to load partner bookings:", error);
    return [];
  });

  root.innerHTML = `
    <div class="hotel-page-header">
      <h1>Bookings</h1>
      <p>Manage and track all traveller hotel reservations</p>
    </div>
    <section class="hotel-content-card hotel-summary-strip">
      <div><span>Total Bookings</span><strong>${bookings.length}</strong></div>
      <div><span>Confirmed</span><strong>${bookings.filter((booking) => booking.status === "CONFIRMED").length}</strong></div>
      <div><span>Revenue</span><strong>₹${bookings.filter(b => String(b.status).toUpperCase() !== "CANCELLED" && String(b.status).toUpperCase() !== "REFUNDED").reduce((sum, booking) => {
        const amt = Number(booking.totalAmount || 0);
        const base = amt > 14 ? amt - 14 : 0;
        return sum + (base * 0.96);
      }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
    </section>
    <div id="booking-list">
      ${bookings.length
      ? bookings.map(renderBookingCard).join("")
      : `<div class="hotel-empty-state"><h2>No bookings yet</h2><p>Bookings created by travellers for your hotels will appear here immediately.</p></div>`
    }
    </div>
  `;
  attachBookingActionListeners(root);
}

function renderBookingCard(booking) {
  const hotel = booking.hotel || {};
  let actionButton = '';

  if (booking.status === 'CONFIRMED') {
    actionButton = `<button class="hotel-action-btn hotel-check-in-btn" data-booking-id="${booking.id}" style="margin-top: 10px; padding: 6px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Check In</button>`;
  } else if (booking.status === 'CHECKED_IN') {
    actionButton = `<button class="hotel-action-btn hotel-check-out-btn" data-booking-id="${booking.id}" style="margin-top: 10px; padding: 6px 12px; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">Check Out</button>`;
  }

  return `
    <article class="hotel-booking-card">
      <div class="hotel-booking-left">
        <h3>${escapeHtml(booking.guestName)}</h3>
        <p>${escapeHtml(booking.email)}</p>
        <p>${escapeHtml(booking.phone)}</p>
        ${booking.guestNames && booking.guestNames.length > 0 ? `
          <div style="margin-top: 8px;">
            <small style="color: #64748b; font-weight: 600;">Additional Guests:</small>
            <ul style="margin: 4px 0 0; padding-left: 16px; font-size: 0.85em; color: #64748b; list-style-type: disc;">
              ${booking.guestNames.filter(name => name.trim() !== booking.guestName.trim()).map(name => `<li>${escapeHtml(name)}</li>`).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
      <div class="hotel-booking-middle">
        <div><small>Check-in</small><p>${escapeHtml(booking.checkIn)}</p></div>
        <div>→</div>
        <div><small>Check-out</small><p>${escapeHtml(booking.checkOut)}</p></div>
        <div class="hotel-badge">${escapeHtml(booking.status)}</div>
      </div>
      <div class="hotel-booking-right" style="text-align: right;">
        <h3 style="margin-bottom: 2px;">₹${(Number(booking.totalAmount || 0) > 14 ? Number(booking.totalAmount || 0) - 14 : 0).toLocaleString()}</h3>
        <p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 8px;">Super Admin Cut (4%): ₹${((Number(booking.totalAmount || 0) > 14 ? Number(booking.totalAmount || 0) - 14 : 0) * 0.04).toFixed(2)}</p>
        <p>${escapeHtml(hotel.name || booking.hotelId)}</p>
        <p>${escapeHtml(booking.roomType)} · ${Number(booking.guests || 1)} guests · ${Number(booking.rooms || 1)} rooms</p>
        ${actionButton}
      </div>
    </article>
  `;
}

function attachBookingActionListeners(root) {
  root.querySelectorAll('.hotel-check-in-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const bookingId = e.target.dataset.bookingId;
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userId = currentUser.id || 'partner-1';
        const location = currentUser.location || 'Goa';
        await fetch(`${getApiBaseUrl()}/bookings/${bookingId}/check-in`, {
          method: 'PATCH',
          headers: {
            'x-user-id': userId,
            'x-user-role': 'PARTNER',
            'x-user-location': location,
            'Content-Type': 'application/json'
          }
        });
        // Re-render the page to show the new status
        renderBookingsPage(root.id);
      } catch (err) {
        console.error("Failed to check-in:", err);
      }
    });
  });

  root.querySelectorAll('.hotel-check-out-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const bookingId = e.target.dataset.bookingId;
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userId = currentUser.id || 'partner-1';
        const location = currentUser.location || 'Goa';
        await fetch(`${getApiBaseUrl()}/bookings/${bookingId}/check-out`, {
          method: 'PATCH',
          headers: {
            'x-user-id': userId,
            'x-user-role': 'PARTNER',
            'x-user-location': location,
            'Content-Type': 'application/json'
          }
        });
        // Re-render the page to show the new status
        renderBookingsPage(root.id);
      } catch (err) {
        console.error("Failed to check-out:", err);
      }
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[ch],
  );
}
