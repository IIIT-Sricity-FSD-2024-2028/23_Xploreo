import { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';
import BookingDetailsView from './BookingDetailsView.jsx';
import './travellerBookings.css';

/**
 * TravellerBookingsList
 * Complete bookings view managing:
 * - Loading state
 * - Error state with retry
 * - Empty state (no bookings or no search/filter matches)
 * - Populated list with filter tabs (All, Confirmed, Cancelled) & search box
 * - Selected booking detail drill-down (reusing Day 1 components)
 * 
 * Strict authorization:
 * - Only displays records matching the authenticated traveller's id (or passed via verified props).
 * - Accepts data & callbacks via props (no raw fetch, no localStorage, no duplicate auth).
 */
export default function TravellerBookingsList({
  bookings = [],
  isLoading = false,
  error = null,
  onRetry,
  currentTravellerId,
}) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // Security & Authorization Guard:
  // If currentTravellerId is provided, filter strictly to travellerId matching currentTravellerId
  const authorizedBookings = currentTravellerId
    ? bookings.filter((b) => b.travellerId === currentTravellerId)
    : bookings;

  // Selected booking for detail view
  const selectedBooking = selectedBookingId
    ? authorizedBookings.find((b) => b.id === selectedBookingId)
    : null;

  if (selectedBooking) {
    return (
      <div className="trav-bookings-page">
        <BookingDetailsView
          booking={selectedBooking}
          onBack={() => setSelectedBookingId(null)}
        />
      </div>
    );
  }

  // Filter by status tab & search term
  const filteredBookings = authorizedBookings.filter((booking) => {
    const statusMatch =
      activeTab === 'ALL' ||
      (booking.status && booking.status.toUpperCase() === activeTab);

    const title = booking.experience?.title || booking.guestName || '';
    const dest = booking.experience?.destination || '';
    const id = booking.id || '';
    const query = searchQuery.trim().toLowerCase();

    const searchMatch =
      !query ||
      title.toLowerCase().includes(query) ||
      dest.toLowerCase().includes(query) ||
      id.toLowerCase().includes(query);

    return statusMatch && searchMatch;
  });

  return (
    <div className="trav-bookings-page" data-testid="traveller-bookings-page">
      <div className="trav-page-header">
        <p className="trav-page-eyebrow">Traveller Portal</p>
        <h1 className="trav-page-title">My Bookings</h1>
        <p className="trav-page-subtitle">
          View and manage your upcoming adventures, past experiences, and confirmed reservations.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="trav-filter-strip">
        <div className="trav-status-tabs" role="tablist" aria-label="Filter bookings by status">
          {['ALL', 'CONFIRMED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`trav-tab-btn ${activeTab === tab ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="trav-search-box">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            className="trav-search-input"
            placeholder="Search by title, destination, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search bookings"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="trav-loading-container" role="status" aria-label="Loading bookings">
          <div className="trav-skeleton-card" />
          <div className="trav-skeleton-card" />
          <div className="trav-skeleton-card" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="trav-state-error" role="alert">
          <h3>Failed to load bookings</h3>
          <p>{typeof error === 'string' ? error : error.message || 'An unexpected error occurred.'}</p>
          {onRetry && (
            <button type="button" className="trav-btn-retry" onClick={onRetry}>
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredBookings.length === 0 && (
        <div className="trav-state-empty" data-testid="traveller-empty-state">
          <div className="trav-empty-icon" aria-hidden="true">🎒</div>
          <h3>No bookings found</h3>
          <p>
            {searchQuery || activeTab !== 'ALL'
              ? 'No bookings match your current filter criteria. Try adjusting your search or tab filter.'
              : 'You have not booked any trips or experiences yet. Explore our curated destinations to get started!'}
          </p>
        </div>
      )}

      {/* Populated Bookings List */}
      {!isLoading && !error && filteredBookings.length > 0 && (
        <div className="trav-bookings-grid" data-testid="traveller-bookings-grid">
          {filteredBookings.map((booking) => {
            const exp = booking.experience || {};
            const isConfirmed = booking.status?.toUpperCase() === 'CONFIRMED';
            const isCancelled = booking.status?.toUpperCase() === 'CANCELLED';

            return (
              <article
                key={booking.id}
                className="trav-booking-item-card"
                data-testid={`booking-card-${booking.id}`}
              >
                <div className="trav-card-info-main">
                  <div className="trav-card-badge-row">
                    <span
                      className={`trav-status-badge ${
                        isConfirmed ? 'is-confirmed' : isCancelled ? 'is-cancelled' : 'is-pending'
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="trav-booking-id">#{booking.id}</span>
                  </div>

                  <h3 className="trav-card-title">
                    {exp.title || `Booking for ${booking.guestName}`}
                  </h3>

                  <div className="trav-card-meta">
                    <span>📍 {exp.destination || 'Destination'}</span>
                    <span>📅 {formatDate(booking.date)}</span>
                    <span>👥 {booking.participants} {booking.participants === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                </div>

                <div className="trav-card-price-action">
                  <span className="trav-card-price">
                    {formatCurrency(booking.totalAmount)}
                  </span>
                  <button
                    type="button"
                    className="trav-btn-view-details"
                    onClick={() => setSelectedBookingId(booking.id)}
                    aria-label={`View details for ${exp.title || booking.id}`}
                  >
                    View Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
