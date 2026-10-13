import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';
import { apiRequest } from '../../services/api.js';
import { fetchHotelBookings } from '../../services/mockHotelAdapter.js';
import BookingDetailsView from './BookingDetailsView.jsx';
import './travellerBookings.css';

/**
 * TravellerBookingsList
 * Complete bookings view managing:
 * - Loading state
 * - Error state with retry
 * - Empty state (no bookings or no search/filter matches)
 * - Populated list with filter tabs (All, Confirmed, Cancelled) & search box
 * - Category filter (All Bookings, Experiences [Live API], Hotels [Demo Adapter])
 * - Selected booking detail drill-down (reusing Day 1 components)
 * 
 * Strict authorization & backend contract:
 * - Live mode connects to GET /api/experience-bookings using the authenticated session.
 * - Explicit mock hotel adapter provides sample hotel booking history (GET /api/bookings pending).
 * - Accepts data & callbacks via props in preview mode.
 */
export default function TravellerBookingsList({
  bookings: initialBookings = [],
  isLoading: initialLoading = false,
  error: initialError = null,
  onRetry,
  currentTravellerId,
  useFixtures = false,
  hotelMode = 'mock',
}) {
  const isPreviewMode = useFixtures || (initialBookings && initialBookings.length > 0);
  const isControlled = initialLoading || !!initialError;
  const shouldAutoFetch = !isPreviewMode && !isControlled && !!currentTravellerId;

  const [liveBookings, setLiveBookings] = useState([]);
  const [liveLoading, setLiveLoading] = useState(shouldAutoFetch);
  const [liveError, setLiveError] = useState(null);
  const [currentHotelMode, setCurrentHotelMode] = useState(hotelMode);

  const bookings = isPreviewMode || isControlled ? initialBookings : liveBookings;
  const isLoading = isControlled ? initialLoading : (isPreviewMode ? false : liveLoading);
  const error = isControlled ? initialError : (isPreviewMode ? null : liveError);

  const [activeTab, setActiveTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'EXPERIENCE' | 'HOTEL'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const fetchLiveBookings = useCallback(async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      // 1. Fetch live experience bookings
      const expData = await apiRequest('/experience-bookings');
      const expList = Array.isArray(expData) ? expData : expData?.data || [];

      // 2. Fetch hotel bookings via explicit adapter (mock or live)
      let hotelList = [];
      try {
        hotelList = await fetchHotelBookings({
          mode: currentHotelMode,
          travellerId: currentTravellerId,
        });
      } catch (hErr) {
        if (currentHotelMode === 'live') {
          throw new Error(
            `Live hotel bookings API error: ${hErr?.message || 'GET /api/bookings unavailable'}. Switch to Demo Mode to view sample hotel bookings.`,
            { cause: hErr }
          );
        }
      }

      setLiveBookings([...expList, ...hotelList]);
    } catch (err) {
      setLiveError(err?.message || 'Failed to load bookings from server.');
      setLiveBookings([]);
    } finally {
      setLiveLoading(false);
    }
  }, [currentHotelMode, currentTravellerId]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (!isCancelled && shouldAutoFetch) {
        await fetchLiveBookings();
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, [shouldAutoFetch, fetchLiveBookings]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (!isPreviewMode) {
      fetchLiveBookings();
    }
  };

  // Security & Authorization Guard:
  // If currentTravellerId is provided, filter strictly to travellerId matching currentTravellerId
  const authorizedBookings = currentTravellerId
    ? bookings.filter((b) => !b.travellerId || b.travellerId === currentTravellerId)
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

  // Filter by category, status tab & search term
  const filteredBookings = authorizedBookings.filter((booking) => {
    const isHotel = !!booking.hotel || booking.bookingType === 'hotel';
    const isExperience = !isHotel;

    const categoryMatch =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'HOTEL' && isHotel) ||
      (categoryFilter === 'EXPERIENCE' && isExperience);

    const statusMatch =
      activeTab === 'ALL' ||
      (booking.status && booking.status.toUpperCase() === activeTab);

    const title = booking.hotel?.name || booking.experience?.title || booking.guestName || '';
    const dest = booking.hotel?.city || booking.experience?.destination || '';
    const id = booking.id || '';
    const query = searchQuery.trim().toLowerCase();

    const searchMatch =
      !query ||
      title.toLowerCase().includes(query) ||
      dest.toLowerCase().includes(query) ||
      id.toLowerCase().includes(query);

    return categoryMatch && statusMatch && searchMatch;
  });

  const hasMockHotelBookings = filteredBookings.some((b) => b.isDemo || b.source === 'mock');

  return (
    <div className="trav-bookings-page" data-testid="traveller-bookings-page">
      <div className="trav-page-header">
        <p className="trav-page-eyebrow">Traveller Portal</p>
        <h1 className="trav-page-title">My Bookings</h1>
        <p className="trav-page-subtitle">
          View and manage your upcoming adventures, past experiences, and confirmed reservations.
        </p>
      </div>

      {/* Demo Mode Notice for Hotel Bookings */}
      {hasMockHotelBookings && (
        <div
          className="trav-demo-banner"
          style={{
            background: 'rgba(217, 119, 6, 0.12)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            fontSize: '0.9rem',
            color: '#b45309',
          }}
          data-testid="mock-hotels-banner"
        >
          <div>
            <strong>ℹ️ Demo Mode:</strong> Hotel booking history is displayed via the Mock Hotel Adapter because backend hotel booking retrieval (<code>GET /api/bookings</code>) is pending. Experience bookings are loaded from the live API.
          </div>
          {currentHotelMode === 'mock' && (
            <button
              type="button"
              className="trav-btn-view-details"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
              onClick={() => {
                setCurrentHotelMode('live');
              }}
            >
              Test Live Hotel API
            </button>
          )}
        </div>
      )}

      {/* Category Filter Pills */}
      <div
        className="trav-category-selector"
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}
        role="group"
        aria-label="Filter bookings by category"
      >
        <button
          type="button"
          className={`trav-tab-btn ${categoryFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setCategoryFilter('ALL')}
        >
          All Categories
        </button>
        <button
          type="button"
          className={`trav-tab-btn ${categoryFilter === 'EXPERIENCE' ? 'is-active' : ''}`}
          onClick={() => setCategoryFilter('EXPERIENCE')}
        >
          Experiences (Live API)
        </button>
        <button
          type="button"
          className={`trav-tab-btn ${categoryFilter === 'HOTEL' ? 'is-active' : ''}`}
          onClick={() => setCategoryFilter('HOTEL')}
        >
          Hotels (Demo Adapter)
        </button>
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
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            {(onRetry || !isPreviewMode) && (
              <button type="button" className="trav-btn-retry" onClick={handleRetry}>
                Try Again
              </button>
            )}
            {currentHotelMode === 'live' && (
              <button
                type="button"
                className="trav-btn-retry"
                style={{ background: '#2563eb' }}
                onClick={() => {
                  setCurrentHotelMode('mock');
                }}
              >
                Switch to Demo Mode
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredBookings.length === 0 && (
        <div className="trav-state-empty" data-testid="traveller-empty-state">
          <div className="trav-empty-icon" aria-hidden="true">🎒</div>
          <h3>No bookings found</h3>
          <p>
            {searchQuery || activeTab !== 'ALL' || categoryFilter !== 'ALL'
              ? 'No bookings match your current filter criteria. Try adjusting your search or category filter.'
              : 'You have not booked any trips or experiences yet. Explore our curated destinations to get started!'}
          </p>
        </div>
      )}

      {/* Populated Bookings List */}
      {!isLoading && !error && filteredBookings.length > 0 && (
        <div className="trav-bookings-grid" data-testid="traveller-bookings-grid">
          {filteredBookings.map((booking) => {
            const isHotel = !!booking.hotel || booking.bookingType === 'hotel';
            const exp = booking.experience || {};
            const hotel = booking.hotel || {};
            const isConfirmed = booking.status?.toUpperCase() === 'CONFIRMED';
            const isCancelled = booking.status?.toUpperCase() === 'CANCELLED';
            const isDemo = !!booking.isDemo || booking.source === 'mock';

            const title = isHotel ? hotel.name : (exp.title || `Booking for ${booking.guestName}`);
            const location = isHotel ? hotel.city : (exp.destination || 'Destination');
            const datesDisplay = isHotel
              ? (booking.checkIn ? `${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)}` : 'Dates pending')
              : formatDate(booking.date);
            const guestCount = isHotel ? (booking.guests || 1) : (booking.participants || 1);

            return (
              <article
                key={booking.id}
                className="trav-booking-item-card"
                data-testid={`booking-card-${booking.id}`}
              >
                <div className="trav-card-info-main">
                  <div className="trav-card-badge-row">
                    {isDemo && (
                      <span
                        className="trav-status-badge"
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                      >
                        Demo Data
                      </span>
                    )}
                    <span
                      className={`trav-status-badge ${
                        isConfirmed ? 'is-confirmed' : isCancelled ? 'is-cancelled' : 'is-pending'
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="trav-booking-id">#{booking.id}</span>
                  </div>

                  <h3 className="trav-card-title">{title}</h3>

                  <div className="trav-card-meta">
                    <span>📍 {location}</span>
                    <span>📅 {datesDisplay}</span>
                    <span>👥 {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}</span>
                    {isHotel && booking.roomType && (
                      <span>🛏️ {booking.roomType}</span>
                    )}
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
                    aria-label={`View details for ${title || booking.id}`}
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
