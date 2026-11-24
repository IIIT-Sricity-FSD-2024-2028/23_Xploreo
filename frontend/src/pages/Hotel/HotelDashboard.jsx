// Port of the hotel home from front_end/pages/guide/dashboard.html (#hotel-dashboard) +
// js/modules/hotelDashboard.js, with every block fed from the backend instead of localStorage.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listPartnerReviews } from '@/services/hotels.api.js';
import { usePartnerBookings, usePartnerHotels } from '@/store/hotel/hooks.js';
import { ui } from '@/lib/assets.js';
import HotelPage, { LoadState } from '@/components/hotel/HotelPage.jsx';
import { STATUS_CLASS, STATUS_LABEL, fmtDate, inr, useHotelData } from '@/components/hotel/hotelKit.jsx';

const ACTIVITY_TEXT = {
  CONFIRMED: (b) => `New booking from ${b.guestName}`,
  CHECKED_IN: (b) => `${b.guestName} checked in`,
  CHECKED_OUT: (b) => `${b.guestName} checked out`,
  CANCELLED: (b) => `Booking by ${b.guestName} cancelled`,
};

const timeAgo = (value) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 60) return `${mins || 1} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} days ago`;
};

export default function HotelDashboard() {
  const { data: hotels, loading: hotelsLoading, error: hotelsError, reload: reloadHotels } = usePartnerHotels();
  const { data: bookings, loading: bookingsLoading, error: bookingsError, reload: reloadBookings } = usePartnerBookings();
  const { data: reviews, loading: reviewsLoading, error: reviewsError, reload: reloadReviews } = useHotelData(listPartnerReviews);
  const loading = hotelsLoading || bookingsLoading || reviewsLoading;
  const error = hotelsError || bookingsError || reviewsError;
  const reload = () => { reloadHotels(); reloadBookings(); reloadReviews(); };

  const view = useMemo(() => {
    if (!hotels || !bookings || !reviews) return null;
    const today = new Date().toISOString().slice(0, 10);
    const monthKey = today.slice(0, 7);
    const totalRooms = hotels.reduce((s, h) => s + (h.totalRooms || 0), 0);
    const available = hotels.reduce((s, h) => s + (h.availableRooms || 0), 0);
    const monthRevenue = bookings
      .filter((b) => b.status === 'CHECKED_OUT' && String(b.checkOut || '').slice(0, 7) === monthKey)
      .reduce((s, b) => s + (b.totalAmount || 0), 0);
    const upcoming = bookings
      .filter((b) => b.status === 'CONFIRMED' && b.checkIn >= today)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    const rated = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    const activity = [...bookings]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);
    return { totalRooms, available, occupied: totalRooms - available, monthRevenue, upcoming, rated, activity, bookings, reviews };
  }, [hotels, bookings, reviews]);

  const stats = view && [
    { label: 'Total Bookings', value: view.bookings.length, icon: 'todaytours.svg', color: 'blue' },
    { label: 'Revenue This Month', value: inr(view.monthRevenue), icon: 'montlyearning.svg', color: 'dark-green' },
    { label: 'Upcoming Bookings', value: view.upcoming.length, icon: 'upcomingtours.svg', color: 'light-green' },
    { label: 'Average Rating', value: view.rated ? view.rated.toFixed(1) : '—', icon: 'avgrating.svg', color: 'orange' },
  ];

  return (
    <HotelPage title="Home">
      <div className="hotel-page-header">
        <h1>Home</h1>
        <p>Overview of your hotel performance</p>
      </div>

      <LoadState loading={loading} error={error} onRetry={reload}>
        {view && hotels.length === 0 ? (
          <div className="hotel-content-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <h2>No hotels yet</h2>
            <p className="hotel-sub-text">Add your first property under Services so travellers can find and book it.</p>
            <Link className="btn-blue" to="/hotel/rooms" style={{ display: 'inline-block', textDecoration: 'none' }}>Go to Services</Link>
          </div>
        ) : view ? (
          <>
            <div id="hotel-stats" className="stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className={`stat-card ${stat.color}`}>
                  <div className="card-icon"><img src={ui(stat.icon)} alt="icon" /></div>
                  <p className="stat-label">{stat.label}</p>
                  <h2 className="stat-value">{stat.value}</h2>
                  <p className="stat-subtext" />
                </div>
              ))}
            </div>

            <div id="rooms-section" className="hotel-content-card">
              <div className="hotel-card-header"><h2>Rooms &amp; Occupancy</h2></div>
              <div className="hotel-room-grid">
                <div className="hotel-room-box">
                  <img src={ui('system.png')} className="hotel-card-icon" alt="" />
                  <p>Total Rooms</p>
                  <h3>{view.totalRooms}</h3>
                </div>
                <div className="hotel-room-box">
                  <img src={ui('dashboard.svg')} className="hotel-card-icon" alt="" />
                  <p>Available</p>
                  <h3 className="green">{view.available}</h3>
                </div>
                <div className="hotel-room-box">
                  <img src={ui('operations.png')} className="hotel-card-icon" alt="" />
                  <p>Occupied</p>
                  <h3 className="blue">{view.occupied}</h3>
                </div>
              </div>
            </div>

            <div id="bookings-section" className="hotel-content-card">
              <div className="hotel-card-header hotel-flex-header">
                <h2>Upcoming Bookings</h2>
                <Link className="hotel-link" to="/hotel/bookings">View All Bookings</Link>
              </div>
              <div className="hotel-bookings-list">
                {view.upcoming.length === 0 ? <p className="hotel-sub-text">No upcoming bookings.</p> : null}
                {view.upcoming.slice(0, 5).map((b) => (
                  <div key={b.id} className="hotel-booking-row">
                    <div className="hotel-booking-left">
                      <p className="hotel-cust-name">{b.guestName}</p>
                      <p className="hotel-sub-text">{fmtDate(b.checkIn)} • {b.roomType}</p>
                    </div>
                    <div className="hotel-booking-right">
                      <span className={`hotel-status ${STATUS_CLASS[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hotel-split-grid">
              <div id="reviews-section-h" className="hotel-content-card">
                <div className="hotel-card-header hotel-flex-header">
                  <h2>Customer Reviews</h2>
                  <Link className="hotel-link" to="/hotel/reviews">View All Reviews</Link>
                </div>
                <div className="hotel-review-grid">
                  {view.reviews.length === 0 ? <p className="hotel-sub-text">No reviews yet.</p> : null}
                  {view.reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="hotel-review-box">
                      <div className="hotel-review-header">
                        <p className="hotel-cust-name">{r.authorName}</p>
                        <span className="hotel-sub-text">{fmtDate(r.createdAt)}</span>
                      </div>
                      <p className="hotel-review-text">{r.comment}</p>
                      <div className="hotel-stars">{'⭐'.repeat(r.rating)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="activity-section" className="hotel-content-card">
                <div className="hotel-card-header"><h2>Recent Activity</h2></div>
                <ul className="hotel-activity-list">
                  {view.activity.length === 0 ? <li className="hotel-activity-item"><p className="hotel-sub-text">No activity yet.</p></li> : null}
                  {view.activity.map((b) => (
                    <li key={`${b.id}-${b.status}`} className="hotel-activity-item">
                      <div>
                        <p>{ACTIVITY_TEXT[b.status](b)}</p>
                        <span className="hotel-sub-text">{timeAgo(b.updatedAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </LoadState>
    </HotelPage>
  );
}
