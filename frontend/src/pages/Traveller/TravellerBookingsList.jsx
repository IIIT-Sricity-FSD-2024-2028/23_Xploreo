import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useInRouterContext, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar.jsx';
import { formatCurrency, formatDate } from '../../utils/checkoutUtils.js';
import { getBookingCancellationEligibility } from '../../utils/bookingValidationUtils.js';
import {
  clearBookingActionError,
  clearBookingCancellationResult,
  confirmExperienceBookingEnd,
  fetchTravellerBookings,
  selectBookingsError,
  selectBookingsList,
  selectBookingsLoading,
  selectSelectedBookingId,
  setSelectedBookingId,
} from '../../features/bookingsSlice.js';
import { selectAuthUser } from '../../features/authSlice.js';
import BookingDetailsView from './BookingDetailsView.jsx';
import ExperienceGuidePanel from './ExperienceGuidePanel.jsx';
import CancellationModal from '../../components/checkout/CancellationModal.jsx';
import './travellerBookings.css';


const DESTINATION_FALLBACK_IMAGES = {
  jaipur: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=800',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800',
  mumbai: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=800',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=800',
  delhi: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=800',
  udaipur: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
  manali: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&q=80&w=800',
  defaultHotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
  defaultExperience: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800',
};

function getBookingImage(booking) {
  if (booking.experience?.image) return booking.experience.image;
  if (booking.hotel?.image) return booking.hotel.image;
  if (booking.imageUrl) return booking.imageUrl;

  const loc = (booking.hotel?.city || booking.experience?.destination || '').toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_FALLBACK_IMAGES)) {
    if (loc.includes(key)) return url;
  }
  return booking.hotel ? DESTINATION_FALLBACK_IMAGES.defaultHotel : DESTINATION_FALLBACK_IMAGES.defaultExperience;
}

/**
 * TravellerBookingsList
 * Complete, redesigned bookings management page for travellers.
 * Matches Xploreo Traveller Dashboard & Browse visual identity:
 * - Clean white and soft-slate backgrounds, teal-to-blue gradients
 * - KPI summary cards for quick reservation metrics
 * - Compact status filters, category pills, and intuitive keyword search
 * - Rich booking cards with destination imagery, badge pills, and responsive layout
 * - Preserves all live API calls, mock hotel fallback, and auth guards.
 */
function TravellerBookingsCore({
  user: propUser,
  showNavbar = true,
  bookings: initialBookings = [],
  isLoading: initialLoading = false,
  error: initialError = null,
  onRetry,
  currentTravellerId,
  useFixtures = false,
  inRouter = false,
  locationKey = null,
}) {
  const dispatch = useDispatch();
  const authUser = useSelector(selectAuthUser);
  const liveBookings = useSelector(selectBookingsList);
  const liveLoading = useSelector(selectBookingsLoading);
  const liveError = useSelector(selectBookingsError);
  const reduxSelectedBookingId = useSelector(selectSelectedBookingId);

  const user = propUser || (authUser && authUser.role !== 'default' ? authUser : null);
  const effectiveUser = user || {
    name: 'Anjali Sharma',
    username: 'Anjali Sharma',
    role: 'traveller',
    userId: currentTravellerId || 'T001',
  };

  const isPreviewMode = useFixtures || (initialBookings && initialBookings.length > 0);
  const isControlled = initialLoading || !!initialError;
  const shouldAutoFetch = !isPreviewMode && !isControlled;

  const bookings = isPreviewMode || isControlled ? initialBookings : liveBookings;
  const isLoading = isControlled ? initialLoading : (isPreviewMode ? false : liveLoading);
  const error = isControlled ? initialError : (isPreviewMode ? null : liveError);

  const [activeTab, setActiveTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'EXPERIENCE' | 'HOTEL'
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedBookingId, setLocalSelectedBookingId] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [confirmingBookingId, setConfirmingBookingId] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  const selectedBookingId = isPreviewMode ? localSelectedBookingId : reduxSelectedBookingId;
  const updateSelectedBookingId = (id) => {
    if (isPreviewMode) {
      setLocalSelectedBookingId(id);
    } else {
      dispatch(setSelectedBookingId(id));
    }
  };

  const fetchLiveBookings = useCallback(() => {
    return dispatch(fetchTravellerBookings());
  }, [dispatch]);

  const handleConfirmEnd = async (booking) => {
    setConfirmingBookingId(booking.id);
    setActionSuccessMessage(null);
    try {
      await dispatch(confirmExperienceBookingEnd(booking.id)).unwrap();
      setActionSuccessMessage(`Experience #${booking.id} has ended and is now completed for both sides.`);
      fetchLiveBookings();
    } catch (err) {
      alert((typeof err === 'string' ? err : err?.message) || 'Failed to confirm end request.');
    } finally {
      setConfirmingBookingId(null);
    }
  };

  useEffect(() => {
    if (shouldAutoFetch) {
      fetchLiveBookings();
    }
  }, [shouldAutoFetch, fetchLiveBookings]);

  // Reset selected booking detail & transient action/cancellation state on route transition
  useEffect(() => {
    if (isPreviewMode) return undefined;
    dispatch(setSelectedBookingId(null));
    dispatch(clearBookingActionError());
    dispatch(clearBookingCancellationResult());
    return () => {
      dispatch(setSelectedBookingId(null));
      dispatch(clearBookingActionError());
      dispatch(clearBookingCancellationResult());
    };
  }, [dispatch, isPreviewMode, locationKey]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (!isPreviewMode) {
      fetchLiveBookings();
    }
  };

  // Security & Authorization Guard:
  // Ensure bookings match the active traveller
  const activeTravellerId = currentTravellerId || effectiveUser?.userId || user?.userId;
  const authorizedBookings = activeTravellerId
    ? bookings.filter((b) => !b.travellerId || String(b.travellerId).toLowerCase() === String(activeTravellerId).toLowerCase())
    : bookings;

  // Selected booking for detail view
  const selectedBooking = selectedBookingId
    ? authorizedBookings.find((b) => b.id === selectedBookingId)
    : null;

  if (selectedBooking) {
    return (
      <div className="trav-bookings-page-wrapper">
        {showNavbar && inRouter && (
          <Navbar user={effectiveUser} />
        )}
        <div className="trav-bookings-page" data-testid="traveller-booking-details-container">
          <BookingDetailsView
            booking={selectedBooking}
            onBack={() => updateSelectedBookingId(null)}
            onCancelClick={(b) => setCancellingBooking(b)}
            onBookingUpdated={fetchLiveBookings}
          />
          {cancellingBooking && (
            <CancellationModal
              isOpen={!!cancellingBooking}
              booking={cancellingBooking}
              bookingType={cancellingBooking.bookingType || (cancellingBooking.hotel ? 'hotel' : 'experience')}
              onClose={() => setCancellingBooking(null)}
              onSuccess={() => {
                fetchLiveBookings();
              }}
            />
          )}
        </div>
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
      (activeTab === 'CONFIRMED' && ['CONFIRMED', 'CHECKED_IN', 'END_REQUESTED'].includes(booking.status?.toUpperCase())) ||
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


  // Stats calculation
  const confirmedCount = authorizedBookings.filter((b) => b.status?.toUpperCase() === 'CONFIRMED').length;
  const cancelledCount = authorizedBookings.filter((b) => b.status?.toUpperCase() === 'CANCELLED').length;
  const totalSpent = authorizedBookings.reduce((sum, b) => {
    if (b.status?.toUpperCase() === 'CONFIRMED') {
      return sum + (Number(b.totalAmount) || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="trav-bookings-page-wrapper">
      {showNavbar && inRouter && (
        <Navbar user={effectiveUser} />
      )}

      <div className="trav-bookings-page" data-testid="traveller-bookings-page">
        {/* ── 1. Page Header Banner ── */}
        <header className="trav-bookings-header">
          <div className="trav-bookings-header-content">
            <div className="trav-bookings-icon-badge" aria-hidden="true">
              📑
            </div>
            <div>
              <p className="trav-bookings-eyebrow">Traveller Portal</p>
              <h1 className="trav-bookings-title">My Bookings</h1>
              <p className="trav-bookings-subtitle">
                View and manage your upcoming adventures, past experiences, and confirmed reservations.
              </p>
            </div>
          </div>

          <div className="trav-bookings-user-badge">
            <div className="trav-bookings-avatar">
              {(effectiveUser.name || effectiveUser.username || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="trav-bookings-user-info">
              <span className="trav-bookings-username">{effectiveUser.name || effectiveUser.username}</span>
              <span className="trav-bookings-role-tag">Traveller</span>
            </div>
          </div>
        </header>

        {/* ── 2. KPI Summary Cards ── */}
        {authorizedBookings.length > 0 && (
          <section className="trav-bookings-kpi-row" aria-label="Bookings Overview Metrics">
            <div className="trav-bookings-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-blue">📅</div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{authorizedBookings.length}</span>
                <span className="trav-kpi-lbl">Total Bookings</span>
              </div>
            </div>

            <div className="trav-bookings-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-green">✓</div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{confirmedCount}</span>
                <span className="trav-kpi-lbl">Confirmed</span>
              </div>
            </div>

            <div className="trav-bookings-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-red">✕</div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{cancelledCount}</span>
                <span className="trav-kpi-lbl">Cancelled</span>
              </div>
            </div>

            <div className="trav-bookings-kpi-card">
              <div className="trav-kpi-icon-wrap kpi-teal">₹</div>
              <div className="trav-kpi-data">
                <span className="trav-kpi-val">{formatCurrency(totalSpent)}</span>
                <span className="trav-kpi-lbl">Total Confirmed Spend</span>
              </div>
            </div>
          </section>
        )}

        {/* ── 3. Booking Filter & Search Toolbar ── */}
        <section className="trav-bookings-controls-card" aria-label="Filter Bookings">
          <div className="trav-bookings-controls-top">
            {/* Category Filter Pills */}
            <div
              className="trav-category-selector"
              role="group"
              aria-label="Filter bookings by category"
            >
              <button
                type="button"
                className={`trav-cat-btn ${categoryFilter === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('ALL')}
              >
                All Categories ({authorizedBookings.length})
              </button>
              <button
                type="button"
                className={`trav-cat-btn ${categoryFilter === 'EXPERIENCE' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('EXPERIENCE')}
              >
                🧭 Experiences
              </button>
              <button
                type="button"
                className={`trav-cat-btn ${categoryFilter === 'HOTEL' ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter('HOTEL')}
              >
                🏨 Hotels
              </button>
            </div>

            {/* Keyword Search Box */}
            <div className="trav-search-box">
              <span className="trav-search-icon" aria-hidden="true">🔍</span>
              <input
                type="search"
                className="trav-search-input"
                placeholder="Search by title, destination, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search bookings"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="trav-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="trav-filter-strip">
            <div className="trav-status-tabs" role="tablist" aria-label="Filter bookings by status">
              {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((tab) => {
                const count = tab === 'ALL'
                  ? authorizedBookings.length
                  : tab === 'CONFIRMED'
                  ? authorizedBookings.filter((b) => ['CONFIRMED', 'CHECKED_IN', 'END_REQUESTED'].includes(b.status?.toUpperCase())).length
                  : authorizedBookings.filter((b) => b.status && b.status.toUpperCase() === tab).length;

                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={`trav-tab-btn ${activeTab === tab ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <span>{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                    <span className="trav-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="trav-filter-counter">
              Showing <strong>{filteredBookings.length}</strong> {filteredBookings.length === 1 ? 'booking' : 'bookings'}
            </div>
          </div>
        </section>

        {actionSuccessMessage && (
          <div
            style={{
              margin: '0.5rem 0 1rem',
              padding: '0.75rem 1rem',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '0.5rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            <span>✓ {actionSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── 5. Loading State ── */}
        {isLoading && (
          <div className="trav-loading-container" role="status" aria-label="Loading bookings">
            <div className="trav-skeleton-card" />
            <div className="trav-skeleton-card" />
            <div className="trav-skeleton-card" />
          </div>
        )}

        {/* ── 6. Error State ── */}
        {!isLoading && error && (
          <div className="trav-state-error" role="alert">
            <div className="trav-error-icon" aria-hidden="true">⚠️</div>
            <h3>Failed to load bookings</h3>
            <p>{typeof error === 'string' ? error : error.message || 'An unexpected error occurred.'}</p>
            <div className="trav-error-actions">
              {(onRetry || !isPreviewMode) && (
                <button type="button" className="trav-btn-retry" onClick={handleRetry}>
                  Try Again
                </button>
              )}

            </div>
          </div>
        )}

        {/* ── 7. Empty State ── */}
        {!isLoading && !error && filteredBookings.length === 0 && (
          <div className="trav-state-empty" data-testid="traveller-empty-state">
            <div className="trav-empty-icon" aria-hidden="true">🎒</div>
            <h3>No bookings found</h3>
            <p>
              {searchQuery || activeTab !== 'ALL' || categoryFilter !== 'ALL'
                ? 'No bookings match your current filter criteria. Try adjusting your search or category filter.'
                : 'You have not booked any trips or experiences yet. Explore our curated destinations to get started!'}
            </p>
            {(searchQuery || activeTab !== 'ALL' || categoryFilter !== 'ALL') && (
              <button
                type="button"
                className="trav-btn-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('ALL');
                  setCategoryFilter('ALL');
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}

        {/* ── 8. Populated Bookings List ── */}
        {!isLoading && !error && filteredBookings.length > 0 && (
          <div className="trav-bookings-grid" data-testid="traveller-bookings-grid">
            {filteredBookings.map((booking) => {
              const isHotel = !!booking.hotel || booking.bookingType === 'hotel';
              const exp = booking.experience || {};
              const hotel = booking.hotel || {};
              const isConfirmed = booking.status?.toUpperCase() === 'CONFIRMED';
              const isCancelled = booking.status?.toUpperCase() === 'CANCELLED';
              const isEndRequested = booking.status?.toUpperCase() === 'END_REQUESTED';
              const isCompleted = booking.status?.toUpperCase() === 'COMPLETED';
              const isDemo = !!booking.isDemo || booking.source === 'mock';

              const title = isHotel ? hotel.name : (exp.title || `Booking for ${booking.guestName}`);
              const location = isHotel ? hotel.city : (exp.destination || 'Destination');
              const datesDisplay = isHotel
                ? (booking.checkIn ? `${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)}` : 'Dates pending')
                : formatDate(booking.date);
              const guestCount = isHotel ? (booking.guests || 1) : (booking.participants || 1);
              const cardImage = getBookingImage(booking);

              return (
                <article
                  key={booking.id}
                  className="trav-booking-item-card"
                  data-testid={`booking-card-${booking.id}`}
                >
                  {/* Card Thumbnail */}
                  <div className="trav-booking-card-media">
                    <img
                      src={cardImage}
                      alt={title || 'Booking thumbnail'}
                      className="trav-booking-card-img"
                      loading="lazy"
                    />
                    <span className="trav-card-type-tag">
                      {isHotel ? '🏨 Hotel' : '🧭 Experience'}
                    </span>
                  </div>

                  {/* Card Main Info */}
                  <div className="trav-card-info-main">
                    <div className="trav-card-badge-row">
                      {isDemo && (
                        <span className="trav-status-badge is-demo">
                          Demo Data
                        </span>
                      )}
                      <span
                        className={`trav-status-badge ${
                          isConfirmed
                            ? 'is-confirmed'
                            : isCompleted
                            ? 'is-completed'
                            : isCancelled
                            ? 'is-cancelled'
                            : isEndRequested
                            ? 'is-end-requested'
                            : 'is-pending'
                        }`}
                      >
                        {isEndRequested ? 'End Requested' : booking.status}
                      </span>
                      <span className="trav-booking-id">#{booking.id}</span>
                      {isCancelled && booking.refundStatus && (
                        <span
                          className={`trav-refund-pill is-${booking.refundStatus.toLowerCase()}`}
                          title={`Refund Reference: ${booking.refundReference || 'N/A'}`}
                        >
                          {booking.refundStatus === 'SUCCESS' && '✓ Refunded '}
                          {booking.refundStatus === 'FAILED' && '✕ Refund Failed '}
                          {booking.refundStatus === 'NOT_ELIGIBLE' && '• Ineligible '}
                          {booking.refundStatus === 'PENDING' && '⏳ Processing '}
                          {booking.refundAmount ? `₹${booking.refundAmount}` : ''}
                        </span>
                      )}
                    </div>

                    <h3 className="trav-card-title">{title}</h3>

                    <div className="trav-card-meta">
                      <span className="trav-meta-item">
                        <span className="trav-meta-icon" aria-hidden="true">📍</span>
                        {location}
                      </span>
                      <span className="trav-meta-item">
                        <span className="trav-meta-icon" aria-hidden="true">📅</span>
                        {datesDisplay}
                      </span>
                      <span className="trav-meta-item">
                        <span className="trav-meta-icon" aria-hidden="true">👥</span>
                        {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
                      </span>
                      {isHotel && booking.roomType && (
                        <span className="trav-meta-item">
                          <span className="trav-meta-icon" aria-hidden="true">🛏️</span>
                          {booking.roomType}
                        </span>
                      )}
                    </div>

                    {booking.createdAt && (
                      <div className="trav-card-booked-date">
                        Reserved on {formatDate(booking.createdAt)}
                      </div>
                    )}

                    {isEndRequested && (
                      <div className="trav-end-request-banner">
                        <strong>Host requested end:</strong> Please accept and confirm to conclude this experience.
                      </div>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="trav-card-price-action">
                    <div className="trav-card-price-block">
                      <span className="trav-card-price-lbl">Total Rate</span>
                      <span className="trav-card-price">
                        {formatCurrency(booking.totalAmount)}
                      </span>
                      {booking.taxesAndFees ? (
                        <span className="trav-card-price-lbl">incl. {formatCurrency(booking.taxesAndFees)} taxes &amp; fees</span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="trav-btn-view-details"
                      onClick={() => updateSelectedBookingId(booking.id)}
                      aria-label={`View details for ${title || booking.id}`}
                    >
                      View Details →
                    </button>
                    {isEndRequested && (
                      <button
                        type="button"
                        className="trav-btn-confirm-end"
                        disabled={confirmingBookingId === booking.id}
                        onClick={() => handleConfirmEnd(booking)}
                        aria-label={`Accept end request for ${title || booking.id}`}
                        style={{ marginTop: '0.4rem', width: '100%' }}
                      >
                        {confirmingBookingId === booking.id ? 'Ending…' : '✓ Accept End Request'}
                      </button>
                    )}
                    {isConfirmed && (() => {
                      const cancellationEligibility = getBookingCancellationEligibility(
                        booking,
                        isHotel ? 'hotel' : 'experience'
                      );
                      return cancellationEligibility.canCancel ? (
                        <button
                          type="button"
                          className="trav-btn-cancel-trigger"
                          onClick={() => setCancellingBooking(booking)}
                          aria-label={`Cancel booking for ${title || booking.id}`}
                          style={{ marginTop: '0.4rem', width: '100%' }}
                        >
                          Cancel Booking
                        </button>
                      ) : (
                        <div style={{ marginTop: '0.4rem', width: '100%' }}>
                          <button
                            type="button"
                            className="trav-btn-cancel-trigger is-disabled"
                            disabled
                            title={cancellationEligibility.message}
                            aria-label={`Cancel booking disabled for ${title || booking.id}: ${cancellationEligibility.message}`}
                            style={{ width: '100%', opacity: 0.55, cursor: 'not-allowed' }}
                          >
                            Cancel Booking
                          </button>
                          <p className="trav-cancellation-expired-msg" style={{ margin: '0.35rem 0 0', color: '#dc2626', fontSize: '0.78rem', lineHeight: '1.3' }}>
                            {cancellationEligibility.message}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {booking.bookingType === 'experience' ? (
                    <div className="trav-booking-card-guide">
                      <ExperienceGuidePanel
                        key={`${booking.id}-${booking.guideStatus || 'none'}`}
                        booking={booking}
                        onChanged={fetchLiveBookings}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {/* Reusable Cancellation Modal */}
        {cancellingBooking && (
          <CancellationModal
            isOpen={!!cancellingBooking}
            booking={cancellingBooking}
            bookingType={cancellingBooking.bookingType || (cancellingBooking.hotel ? 'hotel' : 'experience')}
            onClose={() => setCancellingBooking(null)}
            onSuccess={() => {
              fetchLiveBookings();
            }}
          />
        )}
      </div>
    </div>

  );
}

function TravellerBookingsWithRouter(props) {
  const location = useLocation();
  return <TravellerBookingsCore {...props} inRouter locationKey={location?.key || 'router'} />;
}

export default function TravellerBookingsList(props) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <TravellerBookingsWithRouter {...props} />
  ) : (
    <TravellerBookingsCore {...props} inRouter={false} locationKey={null} />
  );
}
