/* ================================================================
   hotel-bookings-page.js — 100% Client-side (localStorage)
================================================================ */
export async function renderBookingsPage(containerId = "main") {
  const root =
    document.getElementById(containerId) || document.getElementById("main");
  if (!root) return;

  const bookings = fetchPartnerHotelBookings();

  root.innerHTML = `
    <div class="hotel-page-header">
      <h1>Bookings</h1>
      <p>Manage and track all traveller hotel reservations</p>
    </div>
    <section class="hotel-content-card hotel-summary-strip">
      <div><span>Total Bookings</span><strong>${bookings.length}</strong></div>
      <div><span>Confirmed</span><strong>${bookings.filter((b) => b.status === "CONFIRMED").length}</strong></div>
      <div><span>Revenue</span><strong>₹${bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0).toLocaleString()}</strong></div>
    </section>
    <div id="booking-list">
      ${
        bookings.length
          ? bookings.map(renderBookingCard).join("")
          : `<div class="hotel-empty-state"><h2>No bookings yet</h2><p>Bookings created by travellers for your hotels will appear here immediately.</p></div>`
      }
    </div>
  `;
}

function fetchPartnerHotelBookings() {
  try {
    return JSON.parse(localStorage.getItem("hotelBookings") || "[]");
  } catch {
    return [];
  }
}

function renderBookingCard(booking) {
  const hotel = booking.hotel || {};
  return `
    <article class="hotel-booking-card">
      <div class="hotel-booking-left">
        <h3>${escapeHtml(booking.guestName)}</h3>
        <p>${escapeHtml(booking.email)}</p>
        <p>${escapeHtml(booking.phone)}</p>
      </div>
      <div class="hotel-booking-middle">
        <div><small>Check-in</small><p>${escapeHtml(booking.checkIn)}</p></div>
        <div>→</div>
        <div><small>Check-out</small><p>${escapeHtml(booking.checkOut)}</p></div>
        <div class="hotel-badge">${escapeHtml(booking.status)}</div>
      </div>
      <div class="hotel-booking-right">
        <h3>₹${Number(booking.totalAmount || 0).toLocaleString()}</h3>
        <p>${escapeHtml(hotel.name || booking.hotelId)}</p>
        <p>${escapeHtml(booking.roomType)} · ${Number(booking.guests || 1)} guests</p>
      </div>
    </article>
  `;
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
